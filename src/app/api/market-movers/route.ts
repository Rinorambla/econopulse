export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

type QuoteRow = {
  symbol: string;
  name?: string;
  price?: number;
  changePercent?: number;
  volume?: number;
};


async function fetchYahooScreener(scrId: string, count = 30): Promise<QuoteRow[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=${encodeURIComponent(scrId)}&count=${count}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconopulseBot/1.0)' }, cache: 'no-store', signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const js = await res.json();
    const quotes = js?.finance?.result?.[0]?.quotes || [];
    return quotes.map((q: any) => ({
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice,
      changePercent: q.regularMarketChangePercent,
      volume: typeof q.regularMarketVolume === 'object' ? q.regularMarketVolume?.raw : q.regularMarketVolume
    }));
  } catch {
    return [];
  }
}

// Simple in-memory cache to avoid heavy bursts; reset on server reloads
type CacheShape = { at: number; payload: any } | null;
let lastCache: CacheShape = null;
const CACHE_TTL_MS = 120_000; // 2 minutes

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(v => { clearTimeout(id); resolve(v); }).catch(e => { clearTimeout(id); reject(e); });
  });
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`market-movers:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return new NextResponse(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { ...rateLimitHeaders(rl) } });
  }

  try {
    // Serve from cache when fresh
    if (lastCache && (Date.now() - lastCache.at) < CACHE_TTL_MS) {
      const res = NextResponse.json(lastCache.payload);
      const headers = rateLimitHeaders(rl);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      res.headers.set('Cache-Control', 'no-store');
      res.headers.set('X-Cache', 'HIT');
      return res;
    }
    // Fetch predefined screeners for Most Active / Gainers / Losers
    const t0 = Date.now();
    const [mostActive, topGainers, topLosers] = await Promise.all([
      fetchYahooScreener('most_actives', 30),
      fetchYahooScreener('day_gainers', 30),
      fetchYahooScreener('day_losers', 30)
    ]);

    // Build a candidate universe for options metrics (unique, limited)
    const universe = Array.from(new Set([
      ...mostActive.map(x => x.symbol),
      ...topGainers.map(x => x.symbol),
      ...topLosers.map(x => x.symbol)
    ])).slice(0, 40);

    // Compute lightweight options metrics for IV/OI rankings on a small subset
    // Limit concurrency to avoid hammering Yahoo
    const res = NextResponse.json({
      success: true,
      asOf: new Date().toISOString(),
      mostActive,
      topGainers,
      topLosers
    });
    const t1 = Date.now();
    const headers = rateLimitHeaders(rl);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Diagnostics', JSON.stringify({
      universe: universe.length,
      ms: t1 - t0
    }));
    return res;
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'unknown_error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
