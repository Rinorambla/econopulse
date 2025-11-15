// Options data provider and metrics computation (default: Yahoo Options Chain)
// This module computes precise Put/Call ratios (volume & OI), approximate Gamma Exposure (GEX)
// using Black-Scholes gamma and chain open interest, and a simple IV skew between ~25d OTM call/put.
//
// IMPORTANT: Yahoo option chains provide impliedVolatility but no Greeks; we compute Greeks here.
// GEX formula used: Sum[ sign(call:+1, put:-1) * OI * 100 * S^2 * gamma ] over contracts in selected expirations.
// Units are $-gamma-exposure per 1% move scaled by S^2; sign indicates dealer positioning regime.

import { gamma as bsGamma, callDelta, putDelta } from './blackScholes';

// Simple in-memory cache to reduce upstream load and improve reliability
type CacheEntry = { ts: number; data: OptionsMetrics | null }
const CACHE = new Map<string, CacheEntry>()
const TTL_MS = 2 * 60 * 1000 // 2 minutes

async function withRetry<T>(fn: () => Promise<T>, attempts = 2, backoffMs = 300): Promise<T> {
  let lastErr: any
  for (let i=0; i<attempts; i++) {
    try { return await fn() } catch (e) { lastErr = e; if (i+1<attempts) await new Promise(r=>setTimeout(r, backoffMs)) }
  }
  throw lastErr
}

export type OptionsMetrics = {
  symbol: string;
  asOf: string;
  underlyingPrice: number;
  totalCallVolume: number;
  totalPutVolume: number;
  totalCallOI: number;
  totalPutOI: number;
  putCallVolumeRatio: number | null;
  putCallOIRatio: number | null;
  gex: number | null; // signed gamma exposure (see note)
  gexLabel: 'Low' | 'Medium' | 'High' | 'Extreme' | 'Unknown';
  ivCall25d?: number | null;
  ivPut25d?: number | null;
  callSkew?: 'Call Skew' | 'Put Skew' | 'Neutral';
  atmVolumeShare?: number | null; // ATM vol share of total
  otmVolumeShare?: number | null; // OTM vol share of total (|moneyness-1|>~5%)
};

type YahooOption = {
  contractSymbol: string;
  strike: number;
  currency?: string;
  lastPrice?: number;
  change?: number;
  percentChange?: number;
  volume?: number;
  openInterest?: number;
  bid?: number;
  ask?: number;
  contractSize?: string; // 'REGULAR'
  expiration?: number; // epoch seconds
  lastTradeDate?: number; // epoch seconds
  impliedVolatility?: number; // e.g., 0.4532
  inTheMoney?: boolean;
};

type YahooOptionChain = {
  expirationDates: number[]; // epoch seconds
  strikes: number[];
  hasMiniOptions: boolean;
  quote: { regularMarketPrice?: number };
  options: Array<{
    expirationDate: number;
    hasMiniOptions: boolean;
    calls: YahooOption[];
    puts: YahooOption[];
  }>;
};

async function fetchYahooOptions(symbol: string, date?: number): Promise<YahooOptionChain | null> {
  const base = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`;
  const url = date ? `${base}?date=${date}` : base;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 9000); // hard timeout 9s
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconopulseBot/1.0)' },
      cache: 'no-store',
      signal: ctrl.signal
    });
    if (!res.ok) return null;
    const js = await res.json();
    const chain = js?.optionChain?.result?.[0];
    if (!chain) return null;
    return chain as YahooOptionChain;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(to);
  }
}

function toYearFraction(msToExpiry: number): number {
  return Math.max(0, msToExpiry) / (365 * 24 * 60 * 60 * 1000);
}

function safeIV(iv?: number): number {
  if (!iv || !isFinite(iv)) return 0.25; // default 25% if missing
  // Yahoo IV is decimal (e.g., 0.45). Clamp to [1%, 300%]
  return Math.min(3.0, Math.max(0.01, iv));
}

function classifyGEXMagnitude(gexAbs: number): 'Low'|'Medium'|'High'|'Extreme' {
  // Heuristic thresholds (in dollar gamma exposure terms)
  if (gexAbs > 5e10) return 'Extreme';
  if (gexAbs > 1e10) return 'High';
  if (gexAbs > 1e9) return 'Medium';
  return 'Low';
}

export async function getOptionsMetrics(symbol: string, expirationsToUse = 2): Promise<OptionsMetrics | null> {
  try {
    const cacheKey = `${symbol}:${expirationsToUse}`
    const nowTs = Date.now()
    const cached = CACHE.get(cacheKey)
    if (cached && nowTs - cached.ts < TTL_MS) return cached.data

    // First attempt without date; if insufficient volume (rare empty), attempt dated fallback on first future expiry
    const chain = await withRetry(() => fetchYahooOptions(symbol))
    if (!chain) return null;
    const S = chain.quote?.regularMarketPrice || 0;
    if (!S || !isFinite(S)) return null;
    const now = Date.now();
    const contractMultiplier = 100;
    const r = parseFloat(process.env.OPTIONS_RF_RATE || '0.03'); // 3% default

    // Select nearest expirations (non-expired)
    const expiriesAll = (chain.expirationDates || []).filter(ts => ts * 1000 > now);
    const expiries = expiriesAll.slice(0, Math.max(1, expirationsToUse));
    // If no future expiry chosen, fallback to first available option block
    const blocks = (chain.options || []).filter(b => expiries.includes(b.expirationDate) || expiries.length === 0).slice(0, Math.max(1, expirationsToUse));

    let totalCallVolume = 0, totalPutVolume = 0, totalCallOI = 0, totalPutOI = 0;
    let gex = 0;
    let atmVolume = 0, otmVolume = 0, totVolume = 0;

    let bestCall25: { iv:number; delta:number } | null = null;
    let bestPut25: { iv:number; delta:number } | null = null;

    for (const blk of blocks) {
      const T = toYearFraction(blk.expirationDate * 1000 - now);
      // Calls
      for (const c of blk.calls || []) {
        const vol = c.volume || 0; const oi = c.openInterest || 0; const K = c.strike || 0;
        totalCallVolume += vol; totalCallOI += oi; totVolume += vol;
        // Greeks
        const iv = safeIV(c.impliedVolatility);
        const g = bsGamma(S, K, r, iv, Math.max(T, 1/365));
        gex += (oi * contractMultiplier) * (S*S) * g; // positive for calls
        const delta = callDelta(S, K, r, iv, Math.max(T, 1/365));
        // Track ~25-delta call IV
        if (!isNaN(delta)) {
          const score = Math.abs(delta - 0.25);
          if (!bestCall25 || score < Math.abs(bestCall25.delta - 0.25)) bestCall25 = { iv, delta };
        }
        // ATM/OTM volume split
        const moneyness = K / S;
        if (Math.abs(moneyness - 1) < 0.02) atmVolume += vol; // within ~2% of ATM
        else if (Math.abs(moneyness - 1) > 0.05) otmVolume += vol; // outside ~5% OTM/ITM bucket
      }
      // Puts
      for (const p of blk.puts || []) {
        const vol = p.volume || 0; const oi = p.openInterest || 0; const K = p.strike || 0;
        totalPutVolume += vol; totalPutOI += oi; totVolume += vol;
        const iv = safeIV(p.impliedVolatility);
        const g = bsGamma(S, K, r, iv, Math.max(T, 1/365));
        gex -= (oi * contractMultiplier) * (S*S) * g; // subtract put gamma
        const delta = Math.abs(putDelta(S, K, r, iv, Math.max(T, 1/365)));
        // Track ~25-delta put IV (abs delta near 0.25)
        if (!isNaN(delta)) {
          const score = Math.abs(delta - 0.25);
          if (!bestPut25 || score < Math.abs(bestPut25.delta - 0.25)) bestPut25 = { iv, delta };
        }
        const moneyness = K / S;
        if (Math.abs(moneyness - 1) < 0.02) atmVolume += vol;
        else if (Math.abs(moneyness - 1) > 0.05) otmVolume += vol;
      }
    }

    // Determine after first pass if fallback needed
    const needFallback = totalCallVolume===0 && totalPutVolume===0 && expiriesAll.length>1;
    // Fallback: if no volume collected, try second expiry index if available
    if (needFallback) {
      const secondExpiry = expiriesAll[1];
      if (secondExpiry) {
        const fallbackChain = await fetchYahooOptions(symbol, secondExpiry);
        if (fallbackChain) {
          const blocksFb = (fallbackChain.options||[]).filter(b=> b.expirationDate===secondExpiry);
          for (const blk of blocksFb) {
            const T = toYearFraction(blk.expirationDate * 1000 - now);
            for (const c of blk.calls||[]) {
              const vol = c.volume||0; const oi = c.openInterest||0; const K = c.strike||0;
              totalCallVolume += vol; totalCallOI += oi; totVolume += vol;
              const iv = safeIV(c.impliedVolatility);
              const g = bsGamma(S, K, r, iv, Math.max(T, 1/365));
              gex += (oi * contractMultiplier) * (S*S) * g;
              const delta = callDelta(S, K, r, iv, Math.max(T, 1/365));
              if (!isNaN(delta)) {
                const score = Math.abs(delta - 0.25);
                if (!bestCall25 || score < Math.abs(bestCall25.delta - 0.25)) bestCall25 = { iv, delta };
              }
              const moneyness = K / S;
              if (Math.abs(moneyness - 1) < 0.02) atmVolume += vol; else if (Math.abs(moneyness - 1) > 0.05) otmVolume += vol;
            }
            for (const p of blk.puts||[]) {
              const vol = p.volume||0; const oi = p.openInterest||0; const K = p.strike||0;
              totalPutVolume += vol; totalPutOI += oi; totVolume += vol;
              const iv = safeIV(p.impliedVolatility);
              const g = bsGamma(S, K, r, iv, Math.max(T, 1/365));
              gex -= (oi * contractMultiplier) * (S*S) * g;
              const delta = Math.abs(putDelta(S, K, r, iv, Math.max(T, 1/365)));
              if (!isNaN(delta)) {
                const score = Math.abs(delta - 0.25);
                if (!bestPut25 || score < Math.abs(bestPut25.delta - 0.25)) bestPut25 = { iv, delta };
              }
              const moneyness = K / S;
              if (Math.abs(moneyness - 1) < 0.02) atmVolume += vol; else if (Math.abs(moneyness - 1) > 0.05) otmVolume += vol;
            }
          }
        }
      }
    }

    // Primary ratios
    let putCallVolumeRatio = (totalCallVolume + totalPutVolume) > 0 ? totalPutVolume / Math.max(1, totalCallVolume) : null;
    let putCallOIRatio = (totalCallOI + totalPutOI) > 0 ? totalPutOI / Math.max(1, totalCallOI) : null;

    // Fallback recomputation: if upstream chain misses volume or OI for one side causing null, attempt a second pass using raw arrays
    if (putCallVolumeRatio === null || putCallOIRatio === null) {
      try {
        let altCallVol = 0, altPutVol = 0, altCallOI = 0, altPutOI = 0;
        for (const blk of blocks) {
          for (const c of blk.calls || []) { altCallVol += c.volume || 0; altCallOI += c.openInterest || 0; }
          for (const p of blk.puts || []) { altPutVol += p.volume || 0; altPutOI += p.openInterest || 0; }
        }
        if ((altCallVol + altPutVol) > 0 && putCallVolumeRatio === null) {
          putCallVolumeRatio = altPutVol / Math.max(1, altCallVol);
        }
        if ((altCallOI + altPutOI) > 0 && putCallOIRatio === null) {
          putCallOIRatio = altPutOI / Math.max(1, altCallOI);
        }
      } catch {}
    }
    const gexLabel = (gex === null || !isFinite(gex)) ? 'Unknown' : classifyGEXMagnitude(Math.abs(gex));
    const ivCall25d = bestCall25?.iv ?? null;
    const ivPut25d = bestPut25?.iv ?? null;
    let callSkew: OptionsMetrics['callSkew'] = 'Neutral';
    if (ivCall25d != null && ivPut25d != null) {
      const diff = ivCall25d - ivPut25d;
      if (diff > 0.02) callSkew = 'Call Skew';
      else if (diff < -0.02) callSkew = 'Put Skew';
      else callSkew = 'Neutral';
    }

    const atmVolumeShare = totVolume ? atmVolume / totVolume : null;
    const otmVolumeShare = totVolume ? otmVolume / totVolume : null;

    const result: OptionsMetrics = {
      symbol,
      asOf: new Date().toISOString(),
      underlyingPrice: S,
      totalCallVolume,
      totalPutVolume,
      totalCallOI,
      totalPutOI,
      putCallVolumeRatio,
      putCallOIRatio,
      gex: isFinite(gex) ? gex : null,
      gexLabel: gex === null || !isFinite(gex) ? 'Unknown' : gexLabel,
      ivCall25d,
      ivPut25d,
      callSkew,
      atmVolumeShare,
      otmVolumeShare,
    };
    CACHE.set(cacheKey, { ts: Date.now(), data: result })
    return result
  } catch (e) {
    console.warn('Options metrics error for', symbol, e);
    return null;
  }
}
