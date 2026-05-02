import { NextRequest, NextResponse } from 'next/server';
import { getPolygonClient } from '@/lib/polygonFinance';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface StrikeLevel {
  strike: number;
  oi: number;
  volume: number;
  type: 'call' | 'put';
  expiration: string;
  iv?: number | null;
  distance: number; // % from current price
}

interface PivotPoint {
  level: number;
  label: 'R3' | 'R2' | 'R1' | 'P' | 'S1' | 'S2' | 'S3';
}

interface GammaStrike {
  strike: number;
  callOi: number;
  putOi: number;
  callGex: number;  // call gamma exposure (positive sign)
  putGex: number;   // put gamma exposure (negative sign)
  netGex: number;
}

interface InventoryStrike {
  strike: number;
  callBought: number;
  callSold: number;
  putBought: number;
  putSold: number;
  callNet: number;
  putNet: number;
  expiration: string;
}

interface MarketRegime {
  type: 'TREND_BULL' | 'TREND_BEAR' | 'RANGE' | 'VOLATILITY_EXPANSION' | 'CONSOLIDATION';
  label: string;
  confidence: number;          // 0..100
  probabilityBreakout: number; // 0..100
  probabilityMeanRev: number;  // 0..100
  rationale: string[];
}

interface PredictiveGamma {
  current: number;             // net total GEX in $/1% move
  projected1d: number;
  projected3d: number;
  trend: 'rising' | 'falling' | 'stable';
  flipDistance: number | null; // % distance of price to gamma flip
}

interface OptionLeg {
  side: 'long' | 'short';
  type: 'call' | 'put';
  strike: number;
  expiration: string;
  qty: number;
}

interface StrategyIdea {
  name: string;
  category: 'directional-bull' | 'directional-bear' | 'neutral-income' | 'volatility-long' | 'volatility-short';
  legs: OptionLeg[];
  maxProfit: number | null;     // per spread, undefined = unlimited
  maxLoss: number | null;
  breakevens: number[];
  netDebit: number | null;      // negative = credit
  rationale: string;
  score: number;                // 0..100 fit to current regime
}

interface KeyLevels {
  symbol: string;
  asOf: string;
  underlyingPrice: number;
  // Options-derived levels (from open interest + volume on chain)
  maxPain: number | null;
  callWalls: StrikeLevel[];   // top 3 by OI — likely resistance
  putWalls: StrikeLevel[];    // top 3 by OI — likely support
  callVolToday: StrikeLevel[]; // top 3 by today's volume — fresh positioning
  putVolToday: StrikeLevel[];
  // Technical levels
  high20d: number | null;
  low20d: number | null;
  high52w: number | null;
  low52w: number | null;
  pivots: PivotPoint[];
  vwap20d: number | null;
  // Full gamma exposure profile across strikes
  gammaProfile: GammaStrike[];
  gammaFlip: number | null; // strike where net GEX crosses zero
  // Options inventory (gexstream-style): bought vs sold per strike on nearest expiry
  inventory: InventoryStrike[];
  inventoryExpiration: string | null;
  // Econopulse AI 2.0
  regime: MarketRegime | null;
  predictiveGamma: PredictiveGamma | null;
  strategies: StrategyIdea[];
  // Signal interpretation
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  notes: string[];
  source: string;
}

// In-memory cache (15 min TTL)
type CacheEntry = { ts: number; data: KeyLevels };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 15 * 60 * 1000;

function cacheKey(sym: string) { return `levels:${sym.toUpperCase()}`; }

function calcMaxPain(contracts: any[]): number | null {
  // Group by strike across all expirations within nearest 60 days
  const strikes = Array.from(new Set(contracts.map(c => c.strike))).sort((a, b) => a - b);
  if (strikes.length < 3) return null;
  let bestStrike = strikes[0];
  let minPain = Infinity;
  for (const S of strikes) {
    let pain = 0;
    for (const c of contracts) {
      const oi = c.openInterest || 0;
      if (!oi) continue;
      if (c.contractType === 'call' && S > c.strike) pain += oi * (S - c.strike);
      if (c.contractType === 'put' && S < c.strike) pain += oi * (c.strike - S);
    }
    if (pain < minPain) { minPain = pain; bestStrike = S; }
  }
  return bestStrike;
}

function topByKey(
  contracts: any[],
  type: 'call' | 'put',
  key: 'openInterest' | 'volume',
  underlyingPrice: number,
  n = 3
): StrikeLevel[] {
  // Aggregate per strike (sum across expirations)
  const map = new Map<number, { oi: number; volume: number; iv: number | null; expirations: string[] }>();
  for (const c of contracts) {
    if (c.contractType !== type) continue;
    const cur = map.get(c.strike) || { oi: 0, volume: 0, iv: null, expirations: [] };
    cur.oi += c.openInterest || 0;
    cur.volume += c.volume || 0;
    if (c.impliedVolatility != null && cur.iv == null) cur.iv = c.impliedVolatility;
    if (c.expiration && !cur.expirations.includes(c.expiration)) cur.expirations.push(c.expiration);
    map.set(c.strike, cur);
  }
  const arr: StrikeLevel[] = [];
  for (const [strike, v] of map) {
    arr.push({
      strike,
      oi: v.oi,
      volume: v.volume,
      type,
      expiration: v.expirations.sort()[0] || '',
      iv: v.iv,
      distance: underlyingPrice > 0 ? ((strike - underlyingPrice) / underlyingPrice) * 100 : 0,
    });
  }
  arr.sort((a, b) => (key === 'openInterest' ? b.oi - a.oi : b.volume - a.volume));
  return arr.slice(0, n);
}

function computePivots(high: number, low: number, close: number): PivotPoint[] {
  const P = (high + low + close) / 3;
  const R1 = 2 * P - low;
  const S1 = 2 * P - high;
  const R2 = P + (high - low);
  const S2 = P - (high - low);
  const R3 = high + 2 * (P - low);
  const S3 = low - 2 * (high - P);
  return [
    { level: R3, label: 'R3' },
    { level: R2, label: 'R2' },
    { level: R1, label: 'R1' },
    { level: P,  label: 'P'  },
    { level: S1, label: 'S1' },
    { level: S2, label: 'S2' },
    { level: S3, label: 'S3' },
  ];
}

// ─── Black-Scholes gamma (per share). Used when chain provides IV but no greek.
// gamma = N'(d1) / (S * sigma * sqrt(T))
function bsGamma(S: number, K: number, T: number, sigma: number, r = 0.045): number {
  if (!(S > 0) || !(K > 0) || !(T > 0) || !(sigma > 0)) return 0;
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const phi = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
  const g = phi / (S * sigma * Math.sqrt(T));
  return isFinite(g) ? g : 0;
}

// Promise with hard timeout — used to cap external calls so Vercel's 30s limit isn't hit.
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function fetchPolygonDailyBars(symbol: string, days = 260): Promise<any[]> {
  const apiKeys = (process.env.POLYGON_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
  if (!apiKeys.length) return [];
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  const f = from.toISOString().slice(0, 10);
  const t = to.toISOString().slice(0, 10);
  // Try each key in order — first successful response wins
  for (const apiKey of apiKeys) {
    const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${f}/${t}?adjusted=true&sort=asc&limit=400&apiKey=${apiKey}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'Accept': 'application/json' } });
      if (!res.ok) continue;
      const j = await res.json();
      const rows = j?.results || [];
      if (rows.length) return rows;
    } catch { /* try next key */ }
  }
  return [];
}

// ─── Multi-source fallbacks for daily bars ───────────────────────────────────
async function fetchAlphaVantageDailyBars(symbol: string, days = 260): Promise<any[]> {
  const key = (process.env.ALPHAVANTAGE_API_KEY || '').trim();
  if (!key) return [];
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${key}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const j = await res.json();
    const series = j?.['Time Series (Daily)'];
    if (!series || typeof series !== 'object') return [];
    const rows = Object.entries(series).map(([date, v]: [string, any]) => ({
      t: new Date(date).getTime(),
      o: parseFloat(v?.['1. open']),
      h: parseFloat(v?.['2. high']),
      l: parseFloat(v?.['3. low']),
      c: parseFloat(v?.['4. close']),
      v: parseFloat(v?.['5. volume']) || 0,
    })).filter(r => isFinite(r.c) && isFinite(r.h) && isFinite(r.l));
    rows.sort((a, b) => a.t - b.t);
    return rows.slice(-days);
  } catch {
    return [];
  }
}

async function fetchAlphaVantageQuote(symbol: string): Promise<number | null> {
  const key = (process.env.ALPHAVANTAGE_API_KEY || '').trim();
  if (!key) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const j = await res.json();
    const p = parseFloat(j?.['Global Quote']?.['05. price']);
    return p && isFinite(p) && p > 0 ? p : null;
  } catch {
    return null;
  }
}

// Unified: try Polygon (with key rotation) → Alpha Vantage. Yahoo is tried later.
async function fetchDailyBarsMulti(symbol: string, days = 260): Promise<any[]> {
  const polygon = await fetchPolygonDailyBars(symbol, days);
  if (polygon.length >= 20) return polygon;
  const av = await fetchAlphaVantageDailyBars(symbol, days);
  if (av.length >= 20) return av;
  // Return whichever has the most data, even if sparse
  return [polygon, av].sort((a, b) => b.length - a.length)[0] || [];
}

// ─── Direct Yahoo options fetch (bypasses yahoo-finance2 which fails on Vercel serverless)
// Yahoo's public options endpoint: query2.finance.yahoo.com/v7/finance/options/{symbol}
// Returns a single chain per call; pass `?date=<unix>` to fetch a specific expiration.
async function fetchYahooOptionsDirect(symbol: string, date?: number): Promise<any | null> {
  const dateParam = date ? `?date=${date}` : '';
  const hosts = ['query2.finance.yahoo.com', 'query1.finance.yahoo.com'];
  for (const host of hosts) {
    const url = `https://${host}/v7/finance/options/${encodeURIComponent(symbol)}${dateParam}`;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });
      if (!res.ok) continue;
      const j = await res.json();
      const result = j?.optionChain?.result?.[0];
      if (result) return result;
    } catch { /* try next host */ }
  }
  return null;
}

// Fetch raw options snapshot with bid/ask/last_trade for bought-vs-sold classification.
// Returns one object per contract with the fields needed by the inventory builder.
async function fetchPolygonOptionsSnapshotRaw(symbol: string): Promise<any[]> {
  const apiKeys = (process.env.POLYGON_API_KEY || '').split(',').filter(Boolean);
  if (!apiKeys.length) return [];
  const apiKey = apiKeys[0];
  const url = `https://api.polygon.io/v3/snapshot/options/${encodeURIComponent(symbol)}?limit=250&apiKey=${apiKey}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const j = await res.json();
    return Array.isArray(j?.results) ? j.results : [];
  } catch {
    return [];
  }
}

function buildInventory(rawResults: any[]): { rows: InventoryStrike[]; expiration: string | null } {
  if (!rawResults.length) return { rows: [], expiration: null };
  // Group by expiration to find the nearest non-expired one
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const byExp: Record<string, any[]> = {};
  for (const r of rawResults) {
    const exp = r?.details?.expiration_date;
    if (!exp) continue;
    if (new Date(exp).getTime() < today.getTime()) continue;
    if (!byExp[exp]) byExp[exp] = [];
    byExp[exp].push(r);
  }
  const expirations = Object.keys(byExp).sort();
  if (!expirations.length) return { rows: [], expiration: null };
  const nearest = expirations[0];
  const list = byExp[nearest];

  // For each contract: classify today's volume into bought vs sold using Lee-Ready
  const map = new Map<number, InventoryStrike>();
  for (const r of list) {
    const strike = r?.details?.strike_price;
    const type = r?.details?.contract_type as 'call' | 'put' | undefined;
    if (!strike || !type) continue;
    const vol = r?.day?.volume || 0;
    if (!vol) continue;
    const bid = r?.last_quote?.bid;
    const ask = r?.last_quote?.ask;
    const last = r?.last_trade?.price ?? r?.day?.close;
    let bought = 0, sold = 0;
    if (bid != null && ask != null && last != null && ask > bid) {
      const mid = (bid + ask) / 2;
      if (last >= ask) { bought = vol; }
      else if (last <= bid) { sold = vol; }
      else if (last > mid) { bought = vol * 0.7; sold = vol * 0.3; }
      else if (last < mid) { sold = vol * 0.7; bought = vol * 0.3; }
      else { bought = vol * 0.5; sold = vol * 0.5; }
    } else {
      // No quote data: split 50/50 so the chart still shows activity
      bought = vol * 0.5;
      sold = vol * 0.5;
    }
    const cur = map.get(strike) || {
      strike, callBought: 0, callSold: 0, putBought: 0, putSold: 0, callNet: 0, putNet: 0, expiration: nearest,
    };
    if (type === 'call') { cur.callBought += bought; cur.callSold += sold; cur.callNet = cur.callBought - cur.callSold; }
    else { cur.putBought += bought; cur.putSold += sold; cur.putNet = cur.putBought - cur.putSold; }
    map.set(strike, cur);
  }
  const rows = Array.from(map.values()).sort((a, b) => a.strike - b.strike);
  return { rows, expiration: nearest };
}

function computeBias(price: number, maxPain: number | null, callWalls: StrikeLevel[], putWalls: StrikeLevel[]): { bias: 'Bullish' | 'Bearish' | 'Neutral'; notes: string[] } {
  const notes: string[] = [];
  let score = 0;
  if (maxPain != null) {
    const dist = ((maxPain - price) / price) * 100;
    if (Math.abs(dist) < 0.5) {
      notes.push(`Price pinned near max pain ($${maxPain.toFixed(2)})`);
    } else if (dist > 0) {
      score += 1;
      notes.push(`Max pain above price → magnet at $${maxPain.toFixed(2)} (+${dist.toFixed(1)}%)`);
    } else {
      score -= 1;
      notes.push(`Max pain below price → magnet at $${maxPain.toFixed(2)} (${dist.toFixed(1)}%)`);
    }
  }
  const nearestCall = callWalls.find(w => w.strike >= price);
  const nearestPut = [...putWalls].reverse().find(w => w.strike <= price);
  if (nearestCall) notes.push(`Nearest call wall: $${nearestCall.strike.toFixed(2)} (resistance, ${(nearestCall.oi / 1000).toFixed(0)}k OI)`);
  if (nearestPut) notes.push(`Nearest put wall: $${nearestPut.strike.toFixed(2)} (support, ${(nearestPut.oi / 1000).toFixed(0)}k OI)`);

  // Walls heuristic: bigger put walls below than call walls above → bullish
  const sumCall = callWalls.reduce((s, w) => s + w.oi, 0);
  const sumPut = putWalls.reduce((s, w) => s + w.oi, 0);
  if (sumPut > sumCall * 1.3) { score += 1; notes.push('Put walls dominate → support stronger than resistance'); }
  else if (sumCall > sumPut * 1.3) { score -= 1; notes.push('Call walls dominate → resistance stronger than support'); }

  const bias = score > 0 ? 'Bullish' : score < 0 ? 'Bearish' : 'Neutral';
  return { bias, notes };
}

function computeGammaProfile(contracts: any[], spot: number): { profile: GammaStrike[]; flip: number | null } {
  if (!contracts.length || !spot) return { profile: [], flip: null };
  // Aggregate per strike across the chain
  const map = new Map<number, GammaStrike>();
  for (const c of contracts) {
    const oi = c.openInterest || 0;
    if (!oi) continue;
    const gamma = typeof c.gamma === 'number' && isFinite(c.gamma) ? c.gamma : null;
    // Notional gamma exposure: gamma * OI * 100 * spot^2 * 0.01 (per 1% move).
    // If gamma is missing, fall back to OI proxy so the chart still renders.
    const gex = gamma != null ? gamma * oi * 100 * spot * spot * 0.01 : oi * 100;
    const cur = map.get(c.strike) || { strike: c.strike, callOi: 0, putOi: 0, callGex: 0, putGex: 0, netGex: 0 };
    if (c.contractType === 'call') {
      cur.callOi += oi;
      cur.callGex += gex;
    } else if (c.contractType === 'put') {
      cur.putOi += oi;
      // Dealer convention: short puts = short gamma below; we render puts as negative
      cur.putGex += -gex;
    }
    cur.netGex = cur.callGex + cur.putGex;
    map.set(c.strike, cur);
  }
  // Restrict to ±25% from spot for readability
  const lo = spot * 0.75;
  const hi = spot * 1.25;
  const profile = Array.from(map.values())
    .filter(r => r.strike >= lo && r.strike <= hi)
    .sort((a, b) => a.strike - b.strike);
  // Find gamma flip: the strike closest to spot where cumulative netGex changes sign
  let flip: number | null = null;
  for (let i = 1; i < profile.length; i++) {
    const prev = profile[i - 1].netGex;
    const cur = profile[i].netGex;
    if ((prev <= 0 && cur > 0) || (prev >= 0 && cur < 0)) {
      // linear interpolation between two strikes
      const s1 = profile[i - 1].strike;
      const s2 = profile[i].strike;
      const t = Math.abs(prev) / (Math.abs(prev) + Math.abs(cur) || 1);
      const cand = s1 + (s2 - s1) * t;
      if (flip == null || Math.abs(cand - spot) < Math.abs(flip - spot)) flip = cand;
    }
  }
  return { profile, flip };
}

// ============================================================
// AI 2.0 — Market Regime Classifier
// ============================================================
function classifyRegime(args: {
  price: number;
  bars: any[];
  vwap20d: number | null;
  netGex: number;
  flipDistPct: number | null;
  ivAvg: number | null;
  pcRatio: number | null;
}): MarketRegime | null {
  const { price, bars, vwap20d, netGex, flipDistPct, ivAvg, pcRatio } = args;
  if (!bars.length || !price) return null;
  const closes = bars.map((b: any) => b.c);
  const last20 = closes.slice(-20);
  const last5 = closes.slice(-5);
  if (last20.length < 10) return null;
  // 20-day return
  const ret20 = (last20[last20.length - 1] - last20[0]) / last20[0];
  // 5-day return
  const ret5 = last5.length >= 2 ? (last5[last5.length - 1] - last5[0]) / last5[0] : 0;
  // ATR proxy: avg high-low / close over last 14 bars
  const last14 = bars.slice(-14);
  const atr = last14.reduce((s: number, b: any) => s + (b.h - b.l), 0) / last14.length;
  const atrPct = atr / price;
  // Direction consistency: how many of last 10 closes above 10-day mean
  const ma10 = last20.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, last20.length);
  const aboveMa = last20.slice(-10).filter(c => c > ma10).length / 10;
  // VWAP alignment
  const aboveVwap = vwap20d != null && price > vwap20d;
  const belowVwap = vwap20d != null && price < vwap20d;

  const rationale: string[] = [];
  let type: MarketRegime['type'] = 'CONSOLIDATION';
  let confidence = 50;
  let probBreakout = 50;
  let probMeanRev = 50;

  // TREND BULL
  if (ret20 > 0.05 && aboveMa > 0.6 && aboveVwap) {
    type = 'TREND_BULL';
    confidence = Math.min(95, 60 + ret20 * 200);
    probBreakout = 65 + (aboveMa - 0.6) * 100;
    probMeanRev = 100 - probBreakout;
    rationale.push(`20d return +${(ret20 * 100).toFixed(1)}%, price above VWAP`);
    if (netGex > 0) rationale.push('Positive gamma reinforces trend stability');
  } else if (ret20 < -0.05 && aboveMa < 0.4 && belowVwap) {
    type = 'TREND_BEAR';
    confidence = Math.min(95, 60 + Math.abs(ret20) * 200);
    probBreakout = 65 + (0.4 - aboveMa) * 100;
    probMeanRev = 100 - probBreakout;
    rationale.push(`20d return ${(ret20 * 100).toFixed(1)}%, price below VWAP`);
    if (netGex < 0) rationale.push('Negative gamma amplifies downside moves');
  } else if (atrPct > 0.025 && (netGex < 0 || (ivAvg != null && ivAvg > 0.4))) {
    type = 'VOLATILITY_EXPANSION';
    confidence = Math.min(90, 55 + atrPct * 1000);
    probBreakout = 75;
    probMeanRev = 25;
    rationale.push(`ATR ${(atrPct * 100).toFixed(2)}% — elevated volatility`);
    if (netGex < 0) rationale.push('Dealers short gamma → large moves likely');
    if (ivAvg != null && ivAvg > 0.4) rationale.push(`IV elevated (${(ivAvg * 100).toFixed(0)}%)`);
  } else if (atrPct < 0.015 && Math.abs(ret20) < 0.03 && netGex > 0) {
    type = 'RANGE';
    confidence = 70;
    probBreakout = 25;
    probMeanRev = 75;
    rationale.push(`ATR ${(atrPct * 100).toFixed(2)}% — compressed range`);
    rationale.push('Positive gamma → dealers stabilize price');
    if (flipDistPct != null && Math.abs(flipDistPct) < 1) rationale.push('Price near gamma flip — pinning likely');
  } else {
    type = 'CONSOLIDATION';
    confidence = 60;
    probBreakout = 45;
    probMeanRev = 55;
    rationale.push('Mixed signals — no dominant regime');
    rationale.push(`5d return ${(ret5 * 100).toFixed(1)}%, ATR ${(atrPct * 100).toFixed(2)}%`);
  }

  if (pcRatio != null) {
    if (pcRatio > 1.3) rationale.push(`P/C ratio ${pcRatio.toFixed(2)} → bearish positioning`);
    else if (pcRatio < 0.7) rationale.push(`P/C ratio ${pcRatio.toFixed(2)} → bullish positioning`);
  }

  const labels: Record<MarketRegime['type'], string> = {
    TREND_BULL: 'Trending Bullish',
    TREND_BEAR: 'Trending Bearish',
    RANGE: 'Range-Bound',
    VOLATILITY_EXPANSION: 'Volatility Expansion',
    CONSOLIDATION: 'Consolidation',
  };

  return {
    type,
    label: labels[type],
    confidence: Math.round(confidence),
    probabilityBreakout: Math.round(Math.max(0, Math.min(100, probBreakout))),
    probabilityMeanRev: Math.round(Math.max(0, Math.min(100, probMeanRev))),
    rationale,
  };
}

// ============================================================
// Predictive Gamma — projects GEX 1d / 3d ahead
// Uses simple time-decay model: closer expiries lose gamma fastest.
// ============================================================
function predictGamma(profile: GammaStrike[], price: number, bars: any[], flip: number | null): PredictiveGamma | null {
  if (!profile.length) return null;
  const current = profile.reduce((s, r) => s + r.netGex, 0);
  // Recent net change in price per day
  const last5 = bars.slice(-5);
  const dailyMove = last5.length >= 2
    ? (last5[last5.length - 1].c - last5[0].c) / last5.length
    : 0;
  // Project price 1d and 3d ahead, then sum gamma of strikes still relevant.
  // Strikes within ±2.5% of projected price contribute most.
  const projectFor = (days: number): number => {
    const pProj = price + dailyMove * days;
    const band = pProj * 0.05;
    let total = 0;
    for (const r of profile) {
      const dist = Math.abs(r.strike - pProj);
      // Weight: gaussian-ish around projected price
      const w = Math.exp(-Math.pow(dist / band, 2));
      // Time decay: assume 3d ahead, 80% of gamma remains for monthly expiries
      const decay = Math.pow(0.93, days);
      total += r.netGex * w * decay;
    }
    return total;
  };
  const projected1d = projectFor(1);
  const projected3d = projectFor(3);
  const trend: PredictiveGamma['trend'] = projected3d > current * 1.05 ? 'rising'
    : projected3d < current * 0.95 ? 'falling'
    : 'stable';
  const flipDistance = flip != null && price > 0 ? ((flip - price) / price) * 100 : null;
  return { current, projected1d, projected3d, trend, flipDistance };
}

// ============================================================
// Strategy Engine — suggests options strategies fit to regime
// ============================================================
function buildStrategies(args: {
  price: number;
  contracts: any[];
  regime: MarketRegime | null;
  callWalls: StrikeLevel[];
  putWalls: StrikeLevel[];
  ivAvg: number | null;
}): StrategyIdea[] {
  const { price, contracts, regime, callWalls, putWalls, ivAvg } = args;
  if (!regime || !contracts.length) return [];
  // Find nearest expiration with sufficient strikes
  const expirations = Array.from(new Set(contracts.map(c => c.expiration).filter(Boolean))).sort();
  const exp = expirations[0];
  if (!exp) return [];
  const expContracts = contracts.filter(c => c.expiration === exp);
  // Helper to pick contract closest to a given strike
  const pick = (strike: number, type: 'call' | 'put') => {
    const arr = expContracts.filter(c => c.contractType === type);
    if (!arr.length) return null;
    return arr.reduce((best, c) => Math.abs(c.strike - strike) < Math.abs(best.strike - strike) ? c : best);
  };
  // Helper for premium estimate
  const prem = (c: any | null) => c?.lastPrice ?? 0;

  const ideas: StrategyIdea[] = [];

  // 1. Long Call — TREND BULL with low IV
  if (regime.type === 'TREND_BULL') {
    const target = callWalls[0]?.strike ?? price * 1.05;
    const longCall = pick(price, 'call');
    const shortCall = pick(target, 'call');
    if (longCall && shortCall && longCall.strike < shortCall.strike) {
      const debit = prem(longCall) - prem(shortCall);
      const width = shortCall.strike - longCall.strike;
      ideas.push({
        name: 'Bull Call Spread',
        category: 'directional-bull',
        legs: [
          { side: 'long', type: 'call', strike: longCall.strike, expiration: exp, qty: 1 },
          { side: 'short', type: 'call', strike: shortCall.strike, expiration: exp, qty: 1 },
        ],
        maxProfit: width - debit,
        maxLoss: debit,
        breakevens: [longCall.strike + debit],
        netDebit: debit,
        rationale: `Trending bull regime — capped spread reduces theta vs naked call. Target = call wall at $${shortCall.strike.toFixed(2)}.`,
        score: regime.confidence,
      });
    }
  }

  // 2. Bear Put Spread — TREND BEAR
  if (regime.type === 'TREND_BEAR') {
    const target = putWalls[0]?.strike ?? price * 0.95;
    const longPut = pick(price, 'put');
    const shortPut = pick(target, 'put');
    if (longPut && shortPut && longPut.strike > shortPut.strike) {
      const debit = prem(longPut) - prem(shortPut);
      const width = longPut.strike - shortPut.strike;
      ideas.push({
        name: 'Bear Put Spread',
        category: 'directional-bear',
        legs: [
          { side: 'long', type: 'put', strike: longPut.strike, expiration: exp, qty: 1 },
          { side: 'short', type: 'put', strike: shortPut.strike, expiration: exp, qty: 1 },
        ],
        maxProfit: width - debit,
        maxLoss: debit,
        breakevens: [longPut.strike - debit],
        netDebit: debit,
        rationale: `Trending bear regime — capped spread targets put wall at $${shortPut.strike.toFixed(2)}.`,
        score: regime.confidence,
      });
    }
  }

  // 3. Long Straddle — VOLATILITY EXPANSION (low IV preferred)
  if (regime.type === 'VOLATILITY_EXPANSION' || regime.probabilityBreakout > 65) {
    const atmCall = pick(price, 'call');
    const atmPut = pick(price, 'put');
    if (atmCall && atmPut) {
      const debit = prem(atmCall) + prem(atmPut);
      ideas.push({
        name: 'Long Straddle',
        category: 'volatility-long',
        legs: [
          { side: 'long', type: 'call', strike: atmCall.strike, expiration: exp, qty: 1 },
          { side: 'long', type: 'put',  strike: atmPut.strike,  expiration: exp, qty: 1 },
        ],
        maxProfit: null,
        maxLoss: debit,
        breakevens: [atmCall.strike + debit, atmPut.strike - debit],
        netDebit: debit,
        rationale: `Vol expansion expected. Profits on a move >${(debit / price * 100).toFixed(1)}% in either direction.`,
        score: regime.probabilityBreakout,
      });
    }
  }

  // 4. Iron Condor — RANGE (high IV preferred)
  if (regime.type === 'RANGE' || regime.probabilityMeanRev > 60) {
    const callShort = pick(price * 1.03, 'call');
    const callLong = pick(price * 1.06, 'call');
    const putShort = pick(price * 0.97, 'put');
    const putLong = pick(price * 0.94, 'put');
    if (callShort && callLong && putShort && putLong &&
        callLong.strike > callShort.strike && putLong.strike < putShort.strike) {
      const credit = prem(callShort) - prem(callLong) + prem(putShort) - prem(putLong);
      const callWidth = callLong.strike - callShort.strike;
      const putWidth = putShort.strike - putLong.strike;
      const maxLossSpread = Math.max(callWidth, putWidth) - credit;
      ideas.push({
        name: 'Iron Condor',
        category: 'neutral-income',
        legs: [
          { side: 'short', type: 'call', strike: callShort.strike, expiration: exp, qty: 1 },
          { side: 'long',  type: 'call', strike: callLong.strike,  expiration: exp, qty: 1 },
          { side: 'short', type: 'put',  strike: putShort.strike,  expiration: exp, qty: 1 },
          { side: 'long',  type: 'put',  strike: putLong.strike,   expiration: exp, qty: 1 },
        ],
        maxProfit: credit,
        maxLoss: maxLossSpread,
        breakevens: [putShort.strike - credit, callShort.strike + credit],
        netDebit: -credit,
        rationale: `Range regime — collect premium between $${putShort.strike.toFixed(2)} and $${callShort.strike.toFixed(2)}.`,
        score: regime.probabilityMeanRev,
      });
    }
  }

  // 5. Long Strangle — alternative to straddle for cheaper vol play
  if (regime.type === 'VOLATILITY_EXPANSION' && ivAvg != null && ivAvg < 0.35) {
    const otmCall = pick(price * 1.03, 'call');
    const otmPut = pick(price * 0.97, 'put');
    if (otmCall && otmPut) {
      const debit = prem(otmCall) + prem(otmPut);
      ideas.push({
        name: 'Long Strangle',
        category: 'volatility-long',
        legs: [
          { side: 'long', type: 'call', strike: otmCall.strike, expiration: exp, qty: 1 },
          { side: 'long', type: 'put',  strike: otmPut.strike,  expiration: exp, qty: 1 },
        ],
        maxProfit: null,
        maxLoss: debit,
        breakevens: [otmCall.strike + debit, otmPut.strike - debit],
        netDebit: debit,
        rationale: `Cheaper vol play vs straddle — wider breakevens but lower cost.`,
        score: Math.max(50, regime.probabilityBreakout - 5),
      });
    }
  }

  return ideas.sort((a, b) => b.score - a.score).slice(0, 4);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get('symbol') || '').toUpperCase().trim();
    if (!symbol) return NextResponse.json({ ok: false, error: 'Missing symbol' }, { status: 400 });
    const force = searchParams.get('force') === '1';
    const hintPrice = parseFloat(searchParams.get('price') || '');

    const k = cacheKey(symbol);
    const hit = CACHE.get(k);
    if (!force && hit && (Date.now() - hit.ts) < TTL_MS) {
      return NextResponse.json({ ok: true, data: hit.data, cached: true });
    }

    const polygon = getPolygonClient();
    if (!polygon) return NextResponse.json({ ok: false, error: 'Polygon client unavailable' }, { status: 503 });

    // Fetch in parallel — every external call has a hard timeout to stay well below Vercel's 30s limit
    const [contracts, bars, prev, rawSnapshot] = await Promise.all([
      withTimeout(polygon.getOptionsSnapshot(symbol).catch(() => [] as any[]), 6000, [] as any[]),
      withTimeout(fetchDailyBarsMulti(symbol, 260), 10000, [] as any[]),
      withTimeout(polygon.getPreviousDay(symbol).catch(() => null), 5000, null),
      withTimeout(fetchPolygonOptionsSnapshotRaw(symbol), 6000, [] as any[]),
    ]);

    let underlyingPrice = 0;
    if (hintPrice && isFinite(hintPrice) && hintPrice > 0) underlyingPrice = hintPrice;
    else if ((prev as any)?.price) underlyingPrice = (prev as any).price;
    else if (bars.length) underlyingPrice = bars[bars.length - 1].c;

    // Multi-source fallback for price + bars when primary sources are empty
    let workingBars = bars;
    if (!underlyingPrice) {
      const avPrice = await fetchAlphaVantageQuote(symbol);
      if (avPrice) underlyingPrice = avPrice;
    }
    if (!underlyingPrice || !workingBars.length) {
      try {
        const yf = (await import('yahoo-finance2')).default as any;
        if (!underlyingPrice) {
          const q = await withTimeout<any>(yf.quote(symbol).catch(() => null), 4000, null);
          const p = q?.regularMarketPrice ?? q?.postMarketPrice ?? q?.preMarketPrice;
          if (p && isFinite(p)) underlyingPrice = p;
        }
        if (!workingBars.length) {
          const period2 = new Date();
          const period1 = new Date(period2.getTime() - 260 * 86400000);
          const hist = await withTimeout<any>(yf.chart(symbol, { period1, period2, interval: '1d' }).catch(() => null), 6000, null);
          const quotes = hist?.quotes || [];
          if (quotes.length) {
            workingBars = quotes
              .filter((r: any) => r?.high != null && r?.low != null && r?.close != null)
              .map((r: any) => ({ h: r.high, l: r.low, c: r.close, o: r.open, v: r.volume || 0, t: new Date(r.date).getTime() }));
          }
        }
      } catch { /* ignore */ }
    }
    // Tiingo price fallback (last resort, fast — no options data but useful for price)
    if (!underlyingPrice && process.env.TIINGO_API_KEY) {
      try {
        const tk = process.env.TIINGO_API_KEY.trim();
        const r = await fetch(`https://api.tiingo.com/iex/?tickers=${encodeURIComponent(symbol)}&token=${tk}`, { signal: AbortSignal.timeout(4000) });
        if (r.ok) {
          const j = await r.json();
          const p = Array.isArray(j) ? Number(j[0]?.last ?? j[0]?.tngoLast ?? j[0]?.prevClose) : 0;
          if (p && isFinite(p)) underlyingPrice = p;
        }
      } catch { /* ignore */ }
    }
    if (!underlyingPrice && workingBars.length) underlyingPrice = workingBars[workingBars.length - 1].c;

    // Yahoo Finance options chain fallback when Polygon returns nothing OR contracts without OI
    // Uses DIRECT fetch (the yahoo-finance2 lib fails on Vercel serverless due to crumb/cookie auth).
    let workingContracts: any[] = contracts;
    let workingRawSnapshot: any[] = rawSnapshot;
    const hasMeaningfulOI = contracts.some((c: any) => (c.openInterest || 0) > 0 || (c.volume || 0) > 0);
    if (!workingContracts.length || !hasMeaningfulOI) {
      try {
        const firstChain = await fetchYahooOptionsDirect(symbol);
        if (firstChain) {
          // Use price from chain quote if we still don't have one
          if (!underlyingPrice) {
            const p = firstChain?.quote?.regularMarketPrice ?? firstChain?.quote?.postMarketPrice;
            if (p && isFinite(p)) underlyingPrice = p;
          }
          // Get next 3 expirations
          const expDates: number[] = (firstChain.expirationDates || [])
            .map((t: any) => Number(t))
            .filter((t: number) => isFinite(t) && t > Math.floor(Date.now() / 1000))
            .sort((a: number, b: number) => a - b)
            .slice(0, 3);
          const allChains: any[] = [];
          if (firstChain.options?.[0]) allChains.push(firstChain.options[0]);
          // Fetch the other 2 expirations in parallel
          const extra = await withTimeout(
            Promise.all(
              expDates.slice(1).map(t => fetchYahooOptionsDirect(symbol, t).then(r => r?.options?.[0]).catch(() => null))
            ),
            10000,
            [] as any[]
          );
          for (const ch of extra) if (ch) allChains.push(ch);

          const yContracts: any[] = [];
          const yRaw: any[] = [];
          for (const chain of allChains) {
            const expUnix = Number(chain?.expirationDate);
            if (!isFinite(expUnix) || expUnix <= 0) continue;
            const expIso = new Date(expUnix * 1000).toISOString().slice(0, 10);
            const T = Math.max((expUnix * 1000 - Date.now()) / (365 * 86400000), 1 / 365);
            for (const cType of ['calls', 'puts'] as const) {
              const arr = Array.isArray(chain?.[cType]) ? chain[cType] : [];
              for (const o of arr) {
                const strike = Number(o?.strike);
                if (!isFinite(strike) || strike <= 0) continue;
                const oi = Number(o?.openInterest) || 0;
                const vol = Number(o?.volume) || 0;
                const iv = Number(o?.impliedVolatility) || 0;
                const last = Number(o?.lastPrice) || 0;
                const bid = Number(o?.bid) || 0;
                const ask = Number(o?.ask) || 0;
                const gamma = (underlyingPrice > 0 && iv > 0 && T > 0)
                  ? bsGamma(underlyingPrice, strike, T, iv)
                  : 0;
                yContracts.push({
                  contractType: cType === 'calls' ? 'call' : 'put',
                  strike,
                  expiration: expIso,
                  openInterest: oi,
                  volume: vol,
                  impliedVolatility: iv,
                  lastPrice: last,
                  bid, ask,
                  delta: 0,
                  gamma,
                });
                yRaw.push({
                  details: {
                    contract_type: cType === 'calls' ? 'call' : 'put',
                    strike_price: strike,
                    expiration_date: expIso,
                  },
                  open_interest: oi,
                  day: { volume: vol },
                  last_quote: { bid, ask },
                  last_trade: { price: last },
                  implied_volatility: iv,
                });
              }
            }
          }
          if (yContracts.length) {
            workingContracts = yContracts;
            workingRawSnapshot = yRaw;
          }
        }
      } catch { /* ignore */ }
    }

    // Filter contracts to nearest 2-3 expirations within 60 days for cleaner walls
    let activeContracts = workingContracts;
    if (workingContracts.length) {
      const now = Date.now();
      const horizon = now + 60 * 86400000;
      const validExps = Array.from(new Set(workingContracts
        .filter(c => c.expiration)
        .map(c => c.expiration)
      )).filter(e => {
        const t = new Date(e).getTime();
        return t > now && t < horizon;
      }).sort();
      const nearest = validExps.slice(0, 3);
      if (nearest.length) {
        activeContracts = workingContracts.filter(c => nearest.includes(c.expiration));
      }
    }

    const maxPain = activeContracts.length ? calcMaxPain(activeContracts) : null;
    const callWalls = topByKey(activeContracts, 'call', 'openInterest', underlyingPrice, 3);
    const putWalls  = topByKey(activeContracts, 'put',  'openInterest', underlyingPrice, 3);
    const callVolToday = topByKey(activeContracts, 'call', 'volume', underlyingPrice, 3);
    const putVolToday  = topByKey(activeContracts, 'put',  'volume', underlyingPrice, 3);

    // Technical levels
    let high20d: number | null = null, low20d: number | null = null;
    let high52w: number | null = null, low52w: number | null = null;
    let pivots: PivotPoint[] = [];
    let vwap20d: number | null = null;
    if (workingBars.length) {
      const last20 = workingBars.slice(-20);
      high20d = Math.max(...last20.map((b: any) => b.h));
      low20d = Math.min(...last20.map((b: any) => b.l));
      const last252 = workingBars.slice(-252);
      high52w = Math.max(...last252.map((b: any) => b.h));
      low52w = Math.min(...last252.map((b: any) => b.l));
      // Pivots from yesterday's bar
      const lastBar = workingBars[workingBars.length - 1];
      pivots = computePivots(lastBar.h, lastBar.l, lastBar.c);
      // VWAP 20d
      const tpv = last20.reduce((s: number, b: any) => s + ((b.h + b.l + b.c) / 3) * (b.v || 0), 0);
      const tv = last20.reduce((s: number, b: any) => s + (b.v || 0), 0);
      if (tv > 0) vwap20d = tpv / tv;
    }

    const { profile: gammaProfile, flip: gammaFlip } = computeGammaProfile(activeContracts, underlyingPrice);
    const { rows: inventory, expiration: inventoryExpiration } = buildInventory(workingRawSnapshot);

    // Aggregate IV and P/C ratio for regime classification
    let ivSum = 0, ivCnt = 0, totalCallOi = 0, totalPutOi = 0;
    for (const c of activeContracts) {
      if (c.impliedVolatility != null && isFinite(c.impliedVolatility)) {
        ivSum += c.impliedVolatility;
        ivCnt++;
      }
      if (c.contractType === 'call') totalCallOi += c.openInterest || 0;
      else if (c.contractType === 'put') totalPutOi += c.openInterest || 0;
    }
    const ivAvg = ivCnt > 0 ? ivSum / ivCnt : null;
    const pcRatio = totalCallOi > 0 ? totalPutOi / totalCallOi : null;
    const netGex = gammaProfile.reduce((s, r) => s + r.netGex, 0);
    const flipDistPct = gammaFlip != null && underlyingPrice > 0 ? ((gammaFlip - underlyingPrice) / underlyingPrice) * 100 : null;

    const regime = classifyRegime({ price: underlyingPrice, bars: workingBars, vwap20d, netGex, flipDistPct, ivAvg, pcRatio });
    const predictiveGamma = predictGamma(gammaProfile, underlyingPrice, workingBars, gammaFlip);
    const strategies = buildStrategies({ price: underlyingPrice, contracts: activeContracts, regime, callWalls, putWalls, ivAvg });

    const { bias, notes } = computeBias(underlyingPrice, maxPain, callWalls, putWalls);
    if (gammaFlip != null) {
      const above = underlyingPrice >= gammaFlip;
      notes.push(`Gamma flip ~$${gammaFlip.toFixed(2)} → dealers ${above ? 'long gamma (stabilizing)' : 'short gamma (volatile)'}`);
    }
    if (vwap20d != null) notes.push(`20d VWAP: $${vwap20d.toFixed(2)} (${underlyingPrice >= vwap20d ? 'above' : 'below'})`);
    if (high52w != null && underlyingPrice >= high52w * 0.98) notes.push(`Near 52-week high ($${high52w.toFixed(2)})`);
    if (low52w != null && underlyingPrice <= low52w * 1.02) notes.push(`Near 52-week low ($${low52w.toFixed(2)})`);
    if (!workingContracts.length) notes.unshift('No options chain available for this ticker — showing technical levels only.');

    const data: KeyLevels = {
      symbol,
      asOf: new Date().toISOString(),
      underlyingPrice,
      maxPain,
      callWalls,
      putWalls,
      callVolToday,
      putVolToday,
      high20d,
      low20d,
      high52w,
      low52w,
      pivots,
      vwap20d,
      gammaProfile,
      gammaFlip,
      inventory,
      inventoryExpiration,
      regime,
      predictiveGamma,
      strategies,
      bias,
      notes,
      source: workingContracts.length ? (contracts.length ? 'polygon' : 'yahoo-direct') : 'technical-only',
    };

    CACHE.set(k, { ts: Date.now(), data });
    return NextResponse.json({
      ok: true,
      data,
      cached: false,
      debug: {
        polygonContracts: contracts.length,
        polygonRawSnapshot: rawSnapshot.length,
        polygonBars: bars.length,
        finalContracts: workingContracts.length,
        finalBars: workingBars.length,
        finalPrice: underlyingPrice,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Internal error' }, { status: 500 });
  }
}
