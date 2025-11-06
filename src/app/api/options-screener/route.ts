export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { gamma as bsGamma, callDelta, putDelta } from '@/lib/blackScholes';

type YahooOption = {
  contractSymbol: string;
  strike: number;
  lastPrice?: number;
  change?: number;
  percentChange?: number; // e.g., +12.3
  volume?: number;
  openInterest?: number;
  impliedVolatility?: number; // decimal (0.45)
  inTheMoney?: boolean;
};

type YahooOptionChain = {
  expirationDates: number[]; // epoch seconds
  quote: { regularMarketPrice?: number };
  options: Array<{
    expirationDate: number; // epoch seconds
    calls: YahooOption[];
    puts: YahooOption[];
  }>;
};

async function fetchYahooScreenerSymbols(scrId: string, count = 20): Promise<string[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=${encodeURIComponent(scrId)}&count=${count}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconopulseBot/1.0)' }, cache: 'no-store' });
    if (!res.ok) return [];
    const js = await res.json();
    const quotes = js?.finance?.result?.[0]?.quotes || [];
    return quotes.map((q: any) => q.symbol).filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchYahooOptions(symbol: string): Promise<YahooOptionChain | null> {
  const base = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`;
  try {
    const res = await fetch(base, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconopulseBot/1.0)' }, cache: 'no-store' });
    if (!res.ok) return null;
    const js = await res.json();
    const chain = js?.optionChain?.result?.[0];
    if (!chain) return null;
    return chain as YahooOptionChain;
  } catch {
    return null;
  }
}

function toYearFraction(msToExpiry: number): number {
  return Math.max(0, msToExpiry) / (365 * 24 * 60 * 60 * 1000);
}

function safeIV(iv?: number): number {
  if (!iv || !isFinite(iv)) return 0.25; // default 25% if missing
  return Math.min(3.0, Math.max(0.01, iv));
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`options-screener:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return new NextResponse(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { ...rateLimitHeaders(rl) } });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userUniverse = (searchParams.get('universe') || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const limit = Math.min(100, Math.max(10, Number(searchParams.get('limit') || '50')));

    // Build a small but liquid universe
    const defaults = ['AAPL','MSFT','TSLA','NVDA','AMZN','META','GOOGL','AMD','SPY','QQQ'];
    const mostActives = await fetchYahooScreenerSymbols('most_actives', 20);
    const universe = Array.from(new Set([ ...defaults, ...mostActives, ...userUniverse ])).slice(0, 30);

    // Fetch nearest-expiration chains in small batches to limit load
    const rows: Array<{
      symbol: string;
      option: string;
      type: 'Call'|'Put';
      last: number | null;
      changeAbs: number | null;
      changePct: number | null; // percent
      volume: number;
      oi: number;
      ivPct: number | null;
      strike: number;
      expiry: number; // epoch seconds
      delta?: number | null;
      gamma?: number | null;
    }> = [];

    const now = Date.now();
    const r = parseFloat(process.env.OPTIONS_RF_RATE || '0.03');
    const concurrency = 4;
    for (let i = 0; i < universe.length; i += concurrency) {
      const chunk = universe.slice(i, i + concurrency);
      const chunkRes = await Promise.all(chunk.map(async (sym) => {
        const chain = await fetchYahooOptions(sym);
        if (!chain) return [] as typeof rows;
        const S = chain.quote?.regularMarketPrice || 0;
        if (!S || !isFinite(S)) return [] as typeof rows;
        // choose nearest non-expired block
        const block = (chain.options || []).find(b => b.expirationDate * 1000 > now) || chain.options?.[0];
        if (!block) return [] as typeof rows;
        const T = toYearFraction(block.expirationDate * 1000 - now);
        const out: typeof rows = [];
        for (const c of (block.calls || [])) {
          const iv = safeIV(c.impliedVolatility);
          const delta = callDelta(S, c.strike, r, iv, Math.max(1/365, T));
          const gamma = bsGamma(S, c.strike, r, iv, Math.max(1/365, T));
          out.push({
            symbol: sym,
            option: c.contractSymbol,
            type: 'Call',
            last: c.lastPrice ?? null,
            changeAbs: c.change ?? null,
            changePct: c.percentChange ?? (c.change && c.lastPrice ? (c.change / Math.max(1e-6, c.lastPrice - c.change)) * 100 : null),
            volume: c.volume || 0,
            oi: c.openInterest || 0,
            ivPct: isFinite(iv) ? iv * 100 : null,
            strike: c.strike,
            expiry: block.expirationDate,
            delta,
            gamma,
          });
        }
        for (const p of (block.puts || [])) {
          const iv = safeIV(p.impliedVolatility);
          const delta = Math.abs(putDelta(S, p.strike, r, iv, Math.max(1/365, T)));
          const gamma = bsGamma(S, p.strike, r, iv, Math.max(1/365, T));
          out.push({
            symbol: sym,
            option: p.contractSymbol,
            type: 'Put',
            last: p.lastPrice ?? null,
            changeAbs: p.change ?? null,
            changePct: p.percentChange ?? (p.change && p.lastPrice ? (p.change / Math.max(1e-6, p.lastPrice - p.change)) * 100 : null),
            volume: p.volume || 0,
            oi: p.openInterest || 0,
            ivPct: isFinite(iv) ? iv * 100 : null,
            strike: p.strike,
            expiry: block.expirationDate,
            delta: Math.abs(delta),
            gamma,
          });
        }
        return out;
      }));
      rows.push(...chunkRes.flat());
      if (i + concurrency < universe.length) await new Promise(r => setTimeout(r, 200));
    }

    // Build the 5 lists
    const byMostActive = [...rows].sort((a,b)=> (b.volume||0) - (a.volume||0)).slice(0, limit);
    const byTopGainers = [...rows].filter(r=> r.changePct != null && isFinite(r.changePct)).sort((a,b)=> (b.changePct as number) - (a.changePct as number)).slice(0, limit);
    const byTopLosers = [...rows].filter(r=> r.changePct != null && isFinite(r.changePct)).sort((a,b)=> (a.changePct as number) - (b.changePct as number)).slice(0, limit);
    const byHighestIV = [...rows].filter(r=> r.ivPct != null && isFinite(r.ivPct)).sort((a,b)=> (b.ivPct as number) - (a.ivPct as number)).slice(0, limit);
    const byHighestOI = [...rows].filter(r=> r.oi > 0).sort((a,b)=> b.oi - a.oi).slice(0, limit);

    const res = NextResponse.json({
      success: true,
      asOf: new Date().toISOString(),
      universe,
      counts: { total: rows.length },
      mostActive: byMostActive,
      topGainers: byTopGainers,
      topLosers: byTopLosers,
      highestIV: byHighestIV,
      highestOI: byHighestOI,
    });
    const headers = rateLimitHeaders(rl);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'unknown_error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
