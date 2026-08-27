import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Top Assets by Market Cap — companies (Yahoo market cap) + gold, silver,
// bitcoin, ethereum (price × known supply), companiesmarketcap.com style.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Mega-cap candidates (ranked by real-time market cap after fetch).
const COMPANIES: { sym: string; country: string; flag: string }[] = [
  { sym: 'AAPL', country: 'USA', flag: '🇺🇸' }, { sym: 'MSFT', country: 'USA', flag: '🇺🇸' },
  { sym: 'NVDA', country: 'USA', flag: '🇺🇸' }, { sym: 'GOOGL', country: 'USA', flag: '🇺🇸' },
  { sym: 'AMZN', country: 'USA', flag: '🇺🇸' }, { sym: 'META', country: 'USA', flag: '🇺🇸' },
  { sym: 'AVGO', country: 'USA', flag: '🇺🇸' }, { sym: 'TSLA', country: 'USA', flag: '🇺🇸' },
  { sym: 'BRK-B', country: 'USA', flag: '🇺🇸' }, { sym: 'LLY', country: 'USA', flag: '🇺🇸' },
  { sym: 'WMT', country: 'USA', flag: '🇺🇸' }, { sym: 'JPM', country: 'USA', flag: '🇺🇸' },
  { sym: 'V', country: 'USA', flag: '🇺🇸' }, { sym: 'ORCL', country: 'USA', flag: '🇺🇸' },
  { sym: 'XOM', country: 'USA', flag: '🇺🇸' }, { sym: 'MA', country: 'USA', flag: '🇺🇸' },
  { sym: 'UNH', country: 'USA', flag: '🇺🇸' }, { sym: 'COST', country: 'USA', flag: '🇺🇸' },
  { sym: 'PG', country: 'USA', flag: '🇺🇸' }, { sym: 'NFLX', country: 'USA', flag: '🇺🇸' },
  { sym: 'HD', country: 'USA', flag: '🇺🇸' }, { sym: 'JNJ', country: 'USA', flag: '🇺🇸' },
  { sym: 'ABBV', country: 'USA', flag: '🇺🇸' }, { sym: 'BAC', country: 'USA', flag: '🇺🇸' },
  { sym: 'KO', country: 'USA', flag: '🇺🇸' }, { sym: 'CRM', country: 'USA', flag: '🇺🇸' },
  { sym: 'AMD', country: 'USA', flag: '🇺🇸' }, { sym: 'PLTR', country: 'USA', flag: '🇺🇸' },
  { sym: 'TSM', country: 'Taiwan', flag: '🇹🇼' }, { sym: 'ASML', country: 'Netherlands', flag: '🇳🇱' },
  { sym: 'SAP', country: 'Germany', flag: '🇩🇪' }, { sym: 'NVO', country: 'Denmark', flag: '🇩🇰' },
  { sym: 'TM', country: 'Japan', flag: '🇯🇵' }, { sym: 'BABA', country: 'China', flag: '🇨🇳' },
  { sym: 'TCEHY', country: 'China', flag: '🇨🇳' }, { sym: 'SHEL', country: 'UK', flag: '🇬🇧' },
  { sym: 'NVS', country: 'Switzerland', flag: '🇨🇭' }, { sym: 'HSBC', country: 'UK', flag: '🇬🇧' },
  { sym: '2222.SR', country: 'S. Arabia', flag: '🇸🇦' },
];

// Non-equity assets: market cap = live price × known supply.
const HARD_ASSETS: { sym: string; name: string; icon: string; supply: number; country: string }[] = [
  { sym: 'GC=F', name: 'Gold', icon: '🥇', supply: 6.955e9, country: '—' },      // troy oz above ground
  { sym: 'SI=F', name: 'Silver', icon: '🥈', supply: 5.63e10, country: '—' },    // troy oz above ground
  { sym: 'BTC-USD', name: 'Bitcoin', icon: '₿', supply: 1.992e7, country: '—' },
  { sym: 'ETH-USD', name: 'Ethereum', icon: 'Ξ', supply: 1.207e8, country: '—' },
];

type AssetRow = {
  rank: number; symbol: string; name: string; icon?: string;
  marketCap: number; price: number; todayPct: number | null;
  spark: number[]; country: string; flag: string; kind: 'company' | 'metal' | 'crypto';
};

let CACHE: { ts: number; rows: AssetRow[] } | null = null;
const TTL = 10 * 60 * 1000;

let crumbCache: { crumb: string; cookie: string; ts: number } | null = null;
async function getCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  if (crumbCache && Date.now() - crumbCache.ts < 30 * 60 * 1000) return crumbCache;
  try {
    const r1 = await fetch('https://fc.yahoo.com/', { signal: AbortSignal.timeout(4000), headers: { 'User-Agent': UA } }).catch(() => null);
    const cookie = (r1?.headers.get('set-cookie') || '').split(/,(?=[^ ])/g).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
    if (!cookie) return null;
    const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { signal: AbortSignal.timeout(4000), headers: { 'User-Agent': UA, Cookie: cookie } });
    if (!r2.ok) return null;
    const crumb = (await r2.text()).trim();
    if (!crumb) return null;
    crumbCache = { crumb, cookie, ts: Date.now() };
    return crumbCache;
  } catch { return null; }
}

async function fetchQuotes(symbols: string[]): Promise<Map<string, any>> {
  const out = new Map<string, any>();
  const auth = await getCrumb();
  for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
    try {
      const headers: Record<string, string> = { 'User-Agent': UA, Accept: 'application/json' };
      if (auth) headers['Cookie'] = auth.cookie;
      const crumbPart = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : '';
      const res = await fetch(`https://${host}/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}${crumbPart}`, {
        headers, cache: 'no-store', signal: AbortSignal.timeout(9000),
      });
      if (!res.ok) continue;
      const j = await res.json();
      for (const r of j?.quoteResponse?.result || []) out.set(String(r.symbol).toUpperCase(), r);
      if (out.size) return out;
    } catch { /* try next host */ }
  }
  return out;
}

async function fetchSpark(symbol: string): Promise<number[]> {
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`, {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(7000), next: { revalidate: 600 },
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter((x: any) => typeof x === 'number');
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`top-assets:${ip}`, 20, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });
  try {
    if (CACHE && Date.now() - CACHE.ts < TTL) {
      return NextResponse.json({ ok: true, data: CACHE.rows, asOf: new Date(CACHE.ts).toISOString() }, { headers: { ...rateLimitHeaders(rl), 'x-cache': 'HIT' } });
    }
    const allSyms = [...COMPANIES.map(c => c.sym), ...HARD_ASSETS.map(h => h.sym)];
    const quotes = await fetchQuotes(allSyms);

    const rows: Omit<AssetRow, 'rank' | 'spark'>[] = [];
    for (const c of COMPANIES) {
      const q = quotes.get(c.sym.toUpperCase());
      const mcap = Number(q?.marketCap);
      const price = Number(q?.regularMarketPrice);
      if (!mcap || !price) continue;
      rows.push({
        symbol: c.sym, name: q?.shortName || q?.longName || c.sym,
        marketCap: mcap, price, todayPct: q?.regularMarketChangePercent ?? null,
        country: c.country, flag: c.flag, kind: 'company',
      });
    }
    for (const h of HARD_ASSETS) {
      const q = quotes.get(h.sym.toUpperCase());
      const price = Number(q?.regularMarketPrice);
      if (!price) continue;
      rows.push({
        symbol: h.sym, name: h.name, icon: h.icon,
        marketCap: price * h.supply, price, todayPct: q?.regularMarketChangePercent ?? null,
        country: h.country, flag: '🌐', kind: h.sym.endsWith('-USD') ? 'crypto' : 'metal',
      });
    }

    rows.sort((a, b) => b.marketCap - a.marketCap);
    const top = rows.slice(0, 12);
    const sparks = await Promise.all(top.map(r => fetchSpark(r.symbol)));
    const final: AssetRow[] = top.map((r, i) => ({ ...r, rank: i + 1, spark: sparks[i].slice(-22) }));

    CACHE = { ts: Date.now(), rows: final };
    return NextResponse.json({ ok: true, data: final, asOf: new Date().toISOString() }, { headers: { ...rateLimitHeaders(rl), 'x-cache': 'MISS' } });
  } catch (e: any) {
    if (CACHE) return NextResponse.json({ ok: true, data: CACHE.rows, stale: true }, { headers: rateLimitHeaders(rl) });
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
