import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 15;

// Past earnings report dates for ONE symbol (Nasdaq earnings-surprise, no key).
// Powers the TradingView-style "E" markers under the price chart.

const NASDAQ_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://www.nasdaq.com',
  'Referer': 'https://www.nasdaq.com/',
};

type EarnRow = { date: string; eps: number | null; estimate: number | null; surprisePct: number | null };

const CACHE = new Map<string, { ts: number; rows: EarnRow[] }>();
const TTL = 6 * 60 * 60 * 1000;

function parseUsDate(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

const num = (v: unknown): number | null => {
  const n = parseFloat(String(v ?? '').replace(/[$,()]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`sym-earn:${ip}`, 30, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });
  try {
    const symbol = (new URL(req.url).searchParams.get('symbol') || '').trim().toUpperCase();
    if (!symbol || /[/^=:]/.test(symbol)) {
      return NextResponse.json({ ok: true, data: [] }, { headers: rateLimitHeaders(rl) });
    }
    const hit = CACHE.get(symbol);
    if (hit && Date.now() - hit.ts < TTL) {
      return NextResponse.json({ ok: true, data: hit.rows }, { headers: { ...rateLimitHeaders(rl), 'x-cache': 'HIT' } });
    }
    const res = await fetch(`https://api.nasdaq.com/api/company/${encodeURIComponent(symbol)}/earnings-surprise`, {
      headers: NASDAQ_HEADERS,
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 21600 },
    });
    if (!res.ok) return NextResponse.json({ ok: true, data: hit?.rows || [] }, { headers: rateLimitHeaders(rl) });
    const j = await res.json();
    const raw: any[] = j?.data?.earningsSurpriseTable?.rows || [];
    const rows: EarnRow[] = raw
      .map(r => {
        const date = parseUsDate(r?.dateReported);
        if (!date) return null;
        return { date, eps: num(r?.eps), estimate: num(r?.consensusForecast), surprisePct: num(r?.percentageSurprise) };
      })
      .filter(Boolean) as EarnRow[];
    CACHE.set(symbol, { ts: Date.now(), rows });
    return NextResponse.json({ ok: true, data: rows }, { headers: { ...rateLimitHeaders(rl), 'x-cache': 'MISS' } });
  } catch {
    return NextResponse.json({ ok: true, data: [] }, { headers: rateLimitHeaders(rl) });
  }
}
