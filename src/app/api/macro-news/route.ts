export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

// Macro news stream aggregated from open feeds: central banks and statistical
// agencies first (primary sources), then economic-news desks. Served as plain
// text so the page — including the news — can be translated by the browser.

export type NewsKind = 'central-bank' | 'data' | 'markets';
export interface MacroNewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  kind: NewsKind;
  region: string; // ISO2 or 'WORLD'
  publishedAt: string; // ISO
  summary?: string;
}

const FEEDS: Array<{ url: string; source: string; kind: NewsKind; region: string; cap?: number }> = [
  // Central banks
  { url: 'https://www.federalreserve.gov/feeds/press_all.xml', source: 'Federal Reserve', kind: 'central-bank', region: 'US' },
  { url: 'https://www.ecb.europa.eu/rss/press.html', source: 'ECB', kind: 'central-bank', region: 'EU' },
  { url: 'https://www.bankofengland.co.uk/rss/news', source: 'Bank of England', kind: 'central-bank', region: 'GB' },
  { url: 'https://www.boj.or.jp/en/rss/whatsnew.xml', source: 'Bank of Japan', kind: 'central-bank', region: 'JP' },
  { url: 'https://www.bundesbank.de/service/rss/en/633306/feed.rss', source: 'Bundesbank', kind: 'central-bank', region: 'DE' },
  { url: 'https://www.snb.ch/public/rss/en/pressrel', source: 'SNB', kind: 'central-bank', region: 'CH' },
  { url: 'https://www.bankofcanada.ca/content_type/press-releases/feed/', source: 'Bank of Canada', kind: 'central-bank', region: 'CA' },
  { url: 'https://www.bis.org/doclist/cbspeeches.rss', source: 'BIS', kind: 'central-bank', region: 'WORLD', cap: 8 },
  // Statistical agencies
  { url: 'https://apps.bea.gov/rss/rss.xml', source: 'BEA', kind: 'data', region: 'US' },
  { url: 'https://www.census.gov/economic-indicators/indicator.xml', source: 'Census Bureau', kind: 'data', region: 'US' },
  { url: 'https://www.bls.gov/feed/bls_latest.rss', source: 'BLS', kind: 'data', region: 'US' },
  { url: 'https://www.istat.it/en/feed/', source: 'Istat', kind: 'data', region: 'IT' },
  { url: 'https://www.ons.gov.uk/releasecalendar?rss&view=published', source: 'ONS', kind: 'data', region: 'GB' },
  { url: 'https://www.investing.com/rss/news_14.rss', source: 'Investing.com', kind: 'data', region: 'WORLD' },
  // News desks (English + Italian)
  { url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html', source: 'CNBC Economy', kind: 'markets', region: 'WORLD' },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', source: 'MarketWatch', kind: 'markets', region: 'WORLD' },
  { url: 'https://www.fxstreet.com/rss/news', source: 'FXStreet', kind: 'markets', region: 'WORLD', cap: 8 },
  { url: 'https://www.ilsole24ore.com/rss/economia.xml', source: 'Il Sole 24 Ore', kind: 'markets', region: 'IT' },
  { url: 'https://www.ansa.it/sito/notizie/economia/economia_rss.xml', source: 'ANSA Economia', kind: 'markets', region: 'IT' },
];

const UA = 'Mozilla/5.0 (compatible; EconoPulse/1.0; +https://www.econopulse.ai)';
const TTL_MS = 3 * 60 * 1000;
let memo: { at: number; items: MacroNewsItem[] } | null = null;

const decode = (s: string): string =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tag = (block: string, name: string): string => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? m[1] : '';
};

function parseFeed(xml: string, meta: (typeof FEEDS)[number]): MacroNewsItem[] {
  const out: MacroNewsItem[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    const title = decode(tag(b, 'title'));
    if (!title) continue;
    let url = decode(tag(b, 'link'));
    if (!url) {
      const href = b.match(/<link[^>]*href="([^"]+)"/i);
      url = href ? decode(href[1]) : '';
    }
    const dateRaw = tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'a10:updated');
    const d = new Date(decode(dateRaw));
    const publishedAt = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    const summary = decode(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')).slice(0, 240);
    const id = `${meta.source}:${url || title}`.replace(/\s+/g, '').slice(0, 200);
    out.push({ id, title, url, source: meta.source, kind: meta.kind, region: meta.region, publishedAt, summary: summary || undefined });
  }
  return out;
}

const feedErrors = new Map<string, string>();

async function collect(): Promise<MacroNewsItem[]> {
  const results = await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const res = await fetch(f.url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml,application/atom+xml,application/xml,text/xml,*/*' }, cache: 'no-store', signal: AbortSignal.timeout(8000) });
        if (!res.ok) { feedErrors.set(f.source, `http ${res.status}`); return []; }
        feedErrors.delete(f.source);
        // Keep the stream balanced: primary sources in full, news desks capped.
        return parseFeed(await res.text(), f).slice(0, f.cap ?? (f.kind === 'markets' ? 12 : 25));
      } catch (e: unknown) { feedErrors.set(f.source, e instanceof Error ? e.name : 'error'); return []; }
    })
  );
  const seen = new Set<string>();
  const items: MacroNewsItem[] = [];
  const cutoff = Date.now() - 10 * 86400000;
  for (const it of results.flat()) {
    const key = it.title.toLowerCase().slice(0, 80);
    if (seen.has(key) || new Date(it.publishedAt).getTime() < cutoff) continue;
    seen.add(key);
    items.push(it);
  }
  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return items.slice(0, 160);
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(`macro-news:${getClientIp(req)}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: rateLimitHeaders(rl) });
  const headers = { ...rateLimitHeaders(rl), 'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600' };
  if (memo && Date.now() - memo.at < TTL_MS && req.nextUrl.searchParams.get('debug') !== '1') {
    return NextResponse.json({ ok: true, items: memo.items, updatedAt: new Date(memo.at).toISOString() }, { headers });
  }
  const items = await collect();
  if (items.length) memo = { at: Date.now(), items };
  const data = items.length ? items : memo?.items || [];
  const debug = req.nextUrl.searchParams.get('debug') === '1' ? { feedErrors: Object.fromEntries(feedErrors) } : {};
  return NextResponse.json({ ok: data.length > 0, items: data, updatedAt: new Date().toISOString(), ...debug }, { status: data.length ? 200 : 502, headers });
}
