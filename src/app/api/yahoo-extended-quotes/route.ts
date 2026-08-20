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
  regularMarketChange?: number | null;
  preMarketPrice?: number | null;
  preMarketChangePercent?: number | null;
  postMarketPrice?: number | null;
  postMarketChangePercent?: number | null;
  shortName?: string | null;
  longName?: string | null;
  regularMarketVolume?: number | null;
  averageDailyVolume3Month?: number | null;
  marketCap?: number | null;
  trailingPE?: number | null;
  forwardPE?: number | null;
  epsTrailingTwelveMonths?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  fiftyDayAverage?: number | null;
  twoHundredDayAverage?: number | null;
  sector?: string | null;
  industry?: string | null;
};

// Yahoo v7 quote now requires crumb+cookie auth — cached for 30 minutes.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
let crumbCache: { crumb: string; cookie: string; ts: number } | null = null;
const CRUMB_TTL = 30 * 60 * 1000;

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  if (crumbCache && Date.now() - crumbCache.ts < CRUMB_TTL) return crumbCache;
  try {
    const r1 = await fetch('https://fc.yahoo.com/', { signal: AbortSignal.timeout(4000), headers: { 'User-Agent': UA } }).catch(() => null);
    const setCookieRaw = r1?.headers.get('set-cookie') || '';
    const cookie = setCookieRaw.split(/,(?=[^ ])/g).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
    if (!cookie) return null;
    const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      signal: AbortSignal.timeout(4000),
      headers: { 'User-Agent': UA, 'Cookie': cookie },
    });
    if (!r2.ok) return null;
    const crumb = (await r2.text()).trim();
    if (!crumb) return null;
    crumbCache = { crumb, cookie, ts: Date.now() };
    return crumbCache;
  } catch {
    return null;
  }
}

async function fetchYahooQuotes(symbols: string[]): Promise<any | null> {
  const qs = encodeURIComponent(symbols.join(','));
  for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
    const auth = await getYahooCrumb();
    const crumbPart = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : '';
    const headers: Record<string, string> = { 'User-Agent': UA, 'Accept': 'application/json' };
    if (auth) headers['Cookie'] = auth.cookie;
    try {
      const res = await fetch(`https://${host}/v7/finance/quote?symbols=${qs}${crumbPart}`, {
        headers, cache: 'no-store', signal: AbortSignal.timeout(8000),
      });
      if (res.status === 401 || res.status === 403) { crumbCache = null; continue; }
      if (!res.ok) continue;
      return await res.json();
    } catch { /* try next host */ }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`yahoo-ext:${ip}`, 80, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });
  try {
    const url = new URL(req.url);
    const csv = url.searchParams.get('symbols')?.trim() || '';
    const symbols = csv.split(',').map(s => s.trim()).filter(Boolean).slice(0, 25);
    if (!symbols.length) return NextResponse.json({ ok: false, error: 'missing symbols' }, { status: 400, headers: rateLimitHeaders(rl) });

    const js = await fetchYahooQuotes(symbols);
    if (!js) return NextResponse.json({ ok: false, error: 'upstream_failed' }, { status: 502, headers: rateLimitHeaders(rl) });
    const arr = js?.quoteResponse?.result || [];
    const out: OutRow[] = arr.map((r: any) => ({
      symbol: r.symbol,
      marketState: r.marketState,
      regularMarketPrice: r.regularMarketPrice ?? null,
      regularMarketChange: r.regularMarketChange ?? null,
      regularMarketChangePercent: r.regularMarketChangePercent ?? null,
      preMarketPrice: r.preMarketPrice ?? null,
      preMarketChangePercent: r.preMarketChangePercent ?? null,
      postMarketPrice: r.postMarketPrice ?? null,
      postMarketChangePercent: r.postMarketChangePercent ?? null,
      shortName: r.shortName ?? null,
      longName: r.longName ?? null,
      regularMarketVolume: r.regularMarketVolume ?? null,
      averageDailyVolume3Month: r.averageDailyVolume3Month ?? null,
      marketCap: r.marketCap ?? null,
      trailingPE: r.trailingPE ?? null,
      forwardPE: r.forwardPE ?? null,
      epsTrailingTwelveMonths: r.epsTrailingTwelveMonths ?? null,
      fiftyTwoWeekHigh: r.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: r.fiftyTwoWeekLow ?? null,
      fiftyDayAverage: r.fiftyDayAverage ?? null,
      twoHundredDayAverage: r.twoHundredDayAverage ?? null,
      sector: r.sector ?? null,
      industry: r.industry ?? null,
    }));
    return NextResponse.json({ ok: true, data: out, asOf: new Date().toISOString() }, { headers: rateLimitHeaders(rl) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown_error' }, { status: 500 });
  }
}
