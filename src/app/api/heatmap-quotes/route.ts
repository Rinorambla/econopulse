export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 55;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getTiingoMarketData } from '@/lib/tiingo';
import { getYahooQuotes } from '@/lib/yahooFinance';
import { fetchYahooChartQuotes } from '@/lib/yahoo-chart-quotes';
import { SP500_ALL_SYMBOLS } from '@/lib/sp500-stocks';

// Period → Yahoo chart range mapping
const PERIOD_RANGE: Record<string, string> = {
  daily: '2d',
  weekly: '5d',
  monthly: '1mo',
  '3month': '3mo',
  '6month': '6mo',
  ytd: 'ytd',
  yearly: '1y',
};

// Cache: keyed by period, stores data + timestamp
const cache: Record<string, { ts: number; data: any[] }> = {};
const CACHE_MS: Record<string, number> = {
  daily: 3 * 60_000,       // 3 min
  weekly: 15 * 60_000,     // 15 min
  monthly: 30 * 60_000,    // 30 min
  '3month': 60 * 60_000,   // 1 h
  '6month': 60 * 60_000,
  ytd: 60 * 60_000,
  yearly: 60 * 60_000,
};

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`heatmap-quotes:${ip}`, 20, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });

  const period = req.nextUrl.searchParams.get('period') || 'daily';
  const validPeriod = PERIOD_RANGE[period] ? period : 'daily';

  // Check cache
  const cached = cache[validPeriod];
  if (cached && Date.now() - cached.ts < (CACHE_MS[validPeriod] || 180_000)) {
    return NextResponse.json({
      ok: true, data: cached.data, count: cached.data.length,
      period: validPeriod, source: 'cache',
      asOf: new Date(cached.ts).toISOString(),
    }, { headers: rateLimitHeaders(rl) });
  }

  try {
    let quotes: { symbol: string; price: number; change: number; changePercent: number; volume: number }[];

    if (validPeriod === 'daily') {
      // ── DAILY: Use Tiingo IEX bulk (fastest) + Yahoo fallback ──
      const tiingoQuotes = await getTiingoMarketData(SP500_ALL_SYMBOLS).catch(() => []);
      quotes = tiingoQuotes.map((q: any) => ({
        symbol: (q.symbol || q.ticker || '').toUpperCase(),
        price: q.price ?? 0,
        change: q.change ?? 0,
        changePercent: q.changePercent ?? 0,
        volume: q.volume ?? 0,
      }));
      const got = new Set(quotes.map(q => q.symbol));
      const missing = SP500_ALL_SYMBOLS.filter(s => !got.has(s.toUpperCase().replace('.', '-')));

      // Fill missing from Yahoo (cap at reasonable batch)
      if (missing.length > 0) {
        try {
          const yahooQ = await getYahooQuotes(missing.slice(0, 80));
          for (const yq of yahooQ) {
            if (yq && yq.ticker) {
              quotes.push({
                symbol: yq.ticker.toUpperCase(),
                price: yq.price ?? 0,
                change: yq.change ?? 0,
                changePercent: yq.changePercent ?? 0,
                volume: yq.volume ?? 0,
              });
            }
          }
        } catch (e) { console.warn('Yahoo fallback failed:', e); }
      }
    } else {
      // ── NON-DAILY: Use Yahoo v8/chart with period range ──
      const range = PERIOD_RANGE[validPeriod];
      const chartQuotes = await fetchYahooChartQuotes(SP500_ALL_SYMBOLS, range, 12, 80);
      quotes = Object.values(chartQuotes).map(q => ({
        symbol: q.symbol,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        volume: 0,
      }));
    }

    // Update cache
    cache[validPeriod] = { ts: Date.now(), data: quotes };

    return NextResponse.json({
      ok: true, data: quotes, count: quotes.length,
      period: validPeriod,
      asOf: new Date().toISOString(),
    }, { headers: rateLimitHeaders(rl) });
  } catch (e: any) {
    console.error('heatmap-quotes error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
