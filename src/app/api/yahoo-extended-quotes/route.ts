export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

type OutRow = {
  symbol: string;
  marketState?: string;
  regularMarketPrice?: number | null;
  regularMarketChangePercent?: number | null;
  preMarketPrice?: number | null;
  preMarketChangePercent?: number | null;
  postMarketPrice?: number | null;
  postMarketChangePercent?: number | null;
  shortName?: string | null;
};

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`yahoo-ext:${ip}`, 80, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });
  try {
    const url = new URL(req.url);
    const csv = url.searchParams.get('symbols')?.trim() || '';
    const symbols = csv.split(',').map(s => s.trim()).filter(Boolean).slice(0, 25);
    if (!symbols.length) return NextResponse.json({ ok: false, error: 'missing symbols' }, { status: 400, headers: rateLimitHeaders(rl) });

    const qUrl = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`;
    const res = await fetch(qUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconopulseBot/1.0)' }, cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ ok: false, error: `upstream:${res.status}` }, { status: 502, headers: rateLimitHeaders(rl) });
    const js = await res.json();
    const arr = js?.quoteResponse?.result || [];
    const out: OutRow[] = arr.map((r: any) => ({
      symbol: r.symbol,
      marketState: r.marketState,
      regularMarketPrice: r.regularMarketPrice ?? null,
      regularMarketChangePercent: r.regularMarketChangePercent ?? null,
      preMarketPrice: r.preMarketPrice ?? null,
      preMarketChangePercent: r.preMarketChangePercent ?? null,
      postMarketPrice: r.postMarketPrice ?? null,
      postMarketChangePercent: r.postMarketChangePercent ?? null,
      shortName: r.shortName ?? r.longName ?? null,
    }));
    return NextResponse.json({ ok: true, data: out, asOf: new Date().toISOString() }, { headers: rateLimitHeaders(rl) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown_error' }, { status: 500 });
  }
}
