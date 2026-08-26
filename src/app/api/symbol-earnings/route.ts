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
type DivRow = { date: string; amount: number | null };

const CACHE = new Map<string, { ts: number; rows: EarnRow[]; dividends: DivRow[] }>();
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

// Dividend history via Yahoo v8 chart events (no crumb required).
async function fetchDividends(symbol: string): Promise<DivRow[]> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=10y&interval=1mo&events=div`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 21600 },
      },
    );
    if (!res.ok) return [];
    const j = await res.json();
    const divs = j?.chart?.result?.[0]?.events?.dividends || {};
    return Object.values(divs)
      .map((d: any) => {
        const ts = Number(d?.date);
        if (!Number.isFinite(ts) || ts <= 0) return null;
        return { date: new Date(ts * 1000).toISOString().slice(0, 10), amount: Number(d?.amount) || null };
      })
      .filter(Boolean) as DivRow[];
  } catch {
    return [];
  }
}

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
      return NextResponse.json({ ok: true, data: hit.rows, dividends: hit.dividends }, { headers: { ...rateLimitHeaders(rl), 'x-cache': 'HIT' } });
    }
    const [res, dividends] = await Promise.all([
      fetch(`https://api.nasdaq.com/api/company/${encodeURIComponent(symbol)}/earnings-surprise`, {
        headers: NASDAQ_HEADERS,
        signal: AbortSignal.timeout(9000),
        next: { revalidate: 21600 },
      }).catch(() => null),
      fetchDividends(symbol),
    ]);
    if (!res || !res.ok) {
      return NextResponse.json({ ok: true, data: hit?.rows || [], dividends }, { headers: rateLimitHeaders(rl) });
    }
    const j = await res.json();
    const raw: any[] = j?.data?.earningsSurpriseTable?.rows || [];
    const rows: EarnRow[] = raw
      .map(r => {
        const date = parseUsDate(r?.dateReported);
        if (!date) return null;
        return { date, eps: num(r?.eps), estimate: num(r?.consensusForecast), surprisePct: num(r?.percentageSurprise) };
      })
      .filter(Boolean) as EarnRow[];
    CACHE.set(symbol, { ts: Date.now(), rows, dividends });
    return NextResponse.json({ ok: true, data: rows, dividends }, { headers: { ...rateLimitHeaders(rl), 'x-cache': 'MISS' } });
  } catch {
    return NextResponse.json({ ok: true, data: [], dividends: [] }, { headers: rateLimitHeaders(rl) });
  }
}
