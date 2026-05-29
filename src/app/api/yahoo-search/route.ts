export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 15;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

// Proxy for Yahoo Finance's symbol search so users can find ANY instrument
// (equities, ETFs, indices, FX, crypto, futures) across all global exchanges.
export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`yahoo-search:${ip}`, 60, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ ok: true, data: [] as SymbolSearchResult[] }, { headers: rateLimitHeaders(rl) });

  try {
    const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
    let json: any = null;
    for (const host of hosts) {
      try {
        const yUrl = `https://${host}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=20&newsCount=0&listsCount=0&enableFuzzyQuery=true`;
        const res = await fetch(yUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(8000),
          cache: 'no-store',
        });
        if (!res.ok) continue;
        json = await res.json();
        break;
      } catch {
        /* try next host */
      }
    }

    const quotes: any[] = Array.isArray(json?.quotes) ? json.quotes : [];
    const data: SymbolSearchResult[] = quotes
      .filter((it) => it?.symbol)
      .map((it) => ({
        symbol: String(it.symbol).toUpperCase(),
        name: String(it.shortname || it.longname || it.name || ''),
        exchange: String(it.exchDisp || it.exchange || ''),
        type: String(it.quoteType || it.typeDisp || ''),
      }));

    return NextResponse.json(
      { ok: true, data, asOf: new Date().toISOString() },
      { headers: { ...rateLimitHeaders(rl), 'Cache-Control': 'public, max-age=60' } },
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown_error', data: [] }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
