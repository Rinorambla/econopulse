export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 15;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export interface SymbolNewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string; // ISO
  thumbnail?: string;
  relatedTickers?: string[];
}

// Live news headlines for one symbol via Yahoo's search endpoint (no API key).
export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`symbol-news:${ip}`, 60, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });

  const url = new URL(req.url);
  const symbol = (url.searchParams.get('symbol') || '').trim();
  if (!symbol) return NextResponse.json({ ok: true, data: [] as SymbolNewsItem[] }, { headers: rateLimitHeaders(rl) });

  // FRED/macro or ratio symbols have no ticker news — search by the plain part.
  const q = symbol.replace(/^FRED:/i, '').split('/')[0];

  try {
    const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
    let json: any = null;
    for (const host of hosts) {
      try {
        const yUrl = `https://${host}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=0&newsCount=12&listsCount=0`;
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

    const news: any[] = Array.isArray(json?.news) ? json.news : [];
    const data: SymbolNewsItem[] = news
      .filter((n) => n?.title && n?.link)
      .map((n) => ({
        title: String(n.title),
        publisher: String(n.publisher || ''),
        link: String(n.link),
        publishedAt: n.providerPublishTime
          ? new Date(Number(n.providerPublishTime) * 1000).toISOString()
          : new Date().toISOString(),
        thumbnail: n?.thumbnail?.resolutions?.[n.thumbnail.resolutions.length - 1]?.url || undefined,
        relatedTickers: Array.isArray(n.relatedTickers) ? n.relatedTickers.slice(0, 6) : undefined,
      }));

    return NextResponse.json(
      { ok: true, symbol: symbol.toUpperCase(), data, asOf: new Date().toISOString() },
      { headers: { ...rateLimitHeaders(rl), 'Cache-Control': 'public, max-age=120' } },
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown_error', data: [] }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
