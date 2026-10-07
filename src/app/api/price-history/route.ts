export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

// Total-return price history (dividend/split-adjusted closes, % change from range
// start) for the Compare Stocks chart. Backed by Yahoo v8/chart.

interface SeriesPoint {
  ts: number; // ms epoch
  pct: number; // total return % since the start of the range
}

interface SymbolSeries {
  symbol: string;
  points: SeriesPoint[];
}

const RANGES: Record<string, { range: string; interval: string }> = {
  '1M': { range: '1mo', interval: '1d' },
  '6M': { range: '6mo', interval: '1d' },
  YTD: { range: 'ytd', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
  '5Y': { range: '5y', interval: '1wk' },
  '10Y': { range: '10y', interval: '1mo' },
  MAX: { range: 'max', interval: '1mo' },
};

// Small in-memory cache: intraday freshness is not needed for a comparison chart.
const cache = new Map<string, { at: number; data: SymbolSeries | null }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function fetchSeries(symbol: string, rangeKey: string): Promise<SymbolSeries | null> {
  const key = `${symbol}:${rangeKey}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const cfg = RANGES[rangeKey];
  let data: SymbolSeries | null = null;
  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?range=${cfg.range}&interval=${cfg.interval}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconopulseBot/1.0)' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const js = await res.json();
      const result = js?.chart?.result?.[0];
      const timestamps: number[] = result?.timestamp || [];
      const adj: Array<number | null> =
        result?.indicators?.adjclose?.[0]?.adjclose || result?.indicators?.quote?.[0]?.close || [];
      const points: SeriesPoint[] = [];
      let base: number | null = null;
      for (let i = 0; i < timestamps.length; i++) {
        const v = adj[i];
        if (typeof v !== 'number' || !Number.isFinite(v)) continue;
        if (base == null) base = v;
        if (base === 0) continue;
        points.push({ ts: timestamps[i] * 1000, pct: (v / base - 1) * 100 });
      }
      if (points.length >= 2) data = { symbol, points };
    }
  } catch {
    /* data stays null */
  }
  cache.set(key, { at: Date.now(), data });
  return data;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`price-history:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const url = new URL(req.url);
  const rangeKey = (url.searchParams.get('range') || '1Y').toUpperCase();
  if (!RANGES[rangeKey]) {
    return NextResponse.json({ ok: false, error: 'invalid_range' }, { status: 400, headers: rateLimitHeaders(rl) });
  }
  const symbols = (url.searchParams.get('symbols') || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z0-9.^=-]{1,12}$/.test(s))
    .slice(0, 3);
  if (!symbols.length) {
    return NextResponse.json({ ok: false, error: 'missing_symbols' }, { status: 400, headers: rateLimitHeaders(rl) });
  }

  try {
    const series = (await Promise.all(symbols.map((s) => fetchSeries(s, rangeKey)))).filter(
      (s): s is SymbolSeries => s != null
    );
    if (!series.length) {
      return NextResponse.json({ ok: false, error: 'no_data' }, { status: 404, headers: rateLimitHeaders(rl) });
    }
    return NextResponse.json(
      { ok: true, range: rangeKey, series },
      { headers: { ...rateLimitHeaders(rl), 'Cache-Control': 'public, max-age=0, s-maxage=600' } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
