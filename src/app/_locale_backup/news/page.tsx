'use client';

// EconoPulse Newsroom — Bloomberg-terminal-inspired design.
// Black masthead + live market tape, dense typographic headline lists,
// amber category kickers, mono timestamps, sticky "Latest" timeline sidebar.
import { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeftIcon, ArrowPathIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';
import RequirePlan from '@/components/RequirePlan';

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedDate: string;
  tickers: string[];
  tags: string[];
}

type Category = {
  key: string;
  label: string;
  accent: string; // kicker text color
};

const CATEGORIES: Category[] = [
  { key: 'markets', label: 'Markets', accent: 'text-amber-400' },
  { key: 'fed', label: 'Economics', accent: 'text-sky-400' },
  { key: 'tech', label: 'Technology', accent: 'text-violet-400' },
  { key: 'crypto', label: 'Crypto', accent: 'text-orange-400' },
  { key: 'energy', label: 'Energy', accent: 'text-rose-400' },
  { key: 'commodities', label: 'Commodities', accent: 'text-yellow-400' },
  { key: 'banks', label: 'Finance', accent: 'text-emerald-400' },
];

const DEFAULT_CATEGORY = CATEGORIES[0]; // Markets

function classify(article: NewsArticle): Category {
  const text = `${article.title} ${article.description} ${(article.tags || []).join(' ')} ${(article.tickers || []).join(' ')}`.toLowerCase();
  const has = (...kw: string[]) => kw.some((k) => text.includes(k));
  if (has('bitcoin', 'crypto', 'ethereum', 'btc', 'eth', 'blockchain', 'token', 'coinbase')) return CATEGORIES.find((c) => c.key === 'crypto')!;
  if (has('oil', 'gas', 'energy', 'crude', 'opec', 'solar', 'renewable', 'barrel')) return CATEGORIES.find((c) => c.key === 'energy')!;
  if (has('fed', 'federal reserve', 'interest rate', 'inflation', 'powell', 'fomc', 'treasury', 'yield', 'cpi', 'gdp', 'recession')) return CATEGORIES.find((c) => c.key === 'fed')!;
  if (has('ai', 'artificial intelligence', 'chip', 'semiconductor', 'nvidia', 'software', 'cloud', 'tech', 'apple', 'microsoft', 'google')) return CATEGORIES.find((c) => c.key === 'tech')!;
  if (has('gold', 'silver', 'copper', 'commodit', 'metal', 'wheat', 'corn')) return CATEGORIES.find((c) => c.key === 'commodities')!;
  if (has('bank', 'jpmorgan', 'goldman', 'wells fargo', 'lending', 'deposit', 'credit')) return CATEGORIES.find((c) => c.key === 'banks')!;
  return DEFAULT_CATEGORY;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function relativeTime(dateString: string): string {
  const d = new Date(dateString).getTime();
  if (!d) return '';
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// "5m ago" / "3h ago" for fresh items, plain "Jul 21" for older ones.
function timeAgoLabel(dateString: string): string {
  const rel = relativeTime(dateString);
  return /^(now|\d+[mhd])$/.test(rel) ? (rel === 'now' ? 'now' : `${rel} ago`) : rel;
}

function clockTime(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ===== Live market tape (Bloomberg-style scrolling strip) =====
const TAPE_SYMBOLS = 'SPY,QQQ,DIA,IWM,^VIX,^TNX,GC=F,CL=F,BTC-USD,EURUSD=X';
const TAPE_LABELS: Record<string, string> = {
  SPY: 'S&P 500', QQQ: 'NASDAQ', DIA: 'DOW', IWM: 'RUSSELL 2K', '^VIX': 'VIX',
  '^TNX': 'US 10Y', 'GC=F': 'GOLD', 'CL=F': 'WTI CRUDE', 'BTC-USD': 'BITCOIN', 'EURUSD=X': 'EUR/USD',
};
interface TapeQuote { ticker: string; price: number; changePercent: number }

function MarketTape() {
  const [quotes, setQuotes] = useState<TapeQuote[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/yahoo-quotes?symbols=${encodeURIComponent(TAPE_SYMBOLS)}`, {
          cache: 'no-store', signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return;
        const json = await res.json();
        const list: TapeQuote[] = (json.data || json.quotes || [])
          .filter((q: any) => q && typeof q.price === 'number')
          .map((q: any) => ({ ticker: q.ticker || q.symbol, price: q.price, changePercent: q.changePercent ?? q.changesPercentage ?? 0 }));
        if (alive && list.length) setQuotes(list);
      } catch { /* tape is decorative — fail silently */ }
    };
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!quotes.length) return <div className="h-8 border-b border-white/10 bg-black" />;

  const items = quotes.map((q) => {
    const up = (q.changePercent ?? 0) >= 0;
    return (
      <span key={q.ticker} className="inline-flex items-center gap-2 px-4 whitespace-nowrap">
        <span className="text-[10px] font-bold tracking-wider text-gray-400">{TAPE_LABELS[q.ticker] || q.ticker}</span>
        <span className="text-[11px] font-mono font-semibold text-white">
          {q.price >= 1000 ? q.price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : q.price.toFixed(2)}
        </span>
        <span className={`text-[11px] font-mono font-bold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
          {up ? '▲' : '▼'} {Math.abs(q.changePercent ?? 0).toFixed(2)}%
        </span>
      </span>
    );
  });

  return (
    <div className="relative h-8 overflow-hidden border-b border-white/10 bg-black">
      <style>{`@keyframes np-tape { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      <div className="absolute inset-y-0 flex items-center" style={{ animation: 'np-tape 45s linear infinite', width: 'max-content' }}>
        {items}
        {items.map((el) => <span key={`dup-${(el as any).key}`} className="contents">{el}</span>)}
      </div>
    </div>
  );
}

function SourceMeta({ article }: { article: NewsArticle }) {
  const domain = domainOf(article.url);
  return (
    <div className="flex items-center gap-2 text-[11px] text-gray-500">
      <span className="font-semibold text-gray-400 truncate max-w-[150px]">{article.source || domain}</span>
      <span className="text-gray-700">|</span>
      <span className="font-mono">{timeAgoLabel(article.publishedDate)}</span>
    </div>
  );
}

function TickerChips({ article, max = 3 }: { article: NewsArticle; max?: number }) {
  const list = (article.tickers || []).filter((t) => typeof t === 'string' && t.trim()).slice(0, max);
  if (!list.length) return null;
  return (
    <span className="inline-flex gap-1.5 ml-2 align-middle">
      {list.map((tk) => (
        <span key={`${article.id}-${tk}`} className="px-1 py-px rounded-sm text-[9px] font-mono font-bold bg-white/5 text-amber-300 border border-amber-500/20">
          {String(tk).toUpperCase()}
        </span>
      ))}
    </span>
  );
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [nowStr, setNowStr] = useState('');
  const mountedRef = useRef(true);

  const fetchNews = async (silent = false) => {
    try {
      if (silent) setRefreshing(true); else setLoading(true);
      const response = await fetch('/api/news', { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (!mountedRef.current) return;
      setNews(result.data || []);
      setLastUpdated(result.lastUpdated || new Date().toISOString());
    } catch (error) {
      console.error('Error fetching news:', error);
      if (!silent && mountedRef.current) setNews([]);
    } finally {
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchNews();
    const refreshInterval = setInterval(() => fetchNews(true), 300000);
    return () => { mountedRef.current = false; clearInterval(refreshInterval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live masthead clock (New York time — the market's clock)
  useEffect(() => {
    const tick = () => setNowStr(new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/New_York',
    }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const enriched = useMemo(() => news.map((a) => ({ article: a, cat: classify(a) })), [news]);
  const filtered = useMemo(
    () => (activeCat === 'all' ? enriched : enriched.filter((e) => e.cat.key === activeCat)),
    [enriched, activeCat]
  );

  const lead = filtered[0];
  const secondary = filtered.slice(1, 4);
  const rest = filtered.slice(4);

  // Sidebar: newest 14 headlines with mono clock times (across ALL categories).
  const latest = useMemo(
    () => [...enriched].sort((a, b) => new Date(b.article.publishedDate).getTime() - new Date(a.article.publishedDate).getTime()).slice(0, 14),
    [enriched]
  );

  // Sidebar: most-mentioned tickers across today's coverage.
  const hotTickers = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const { article } of enriched) {
      for (const t of article.tickers || []) {
        const k = String(t || '').trim().toUpperCase();
        if (k && /^[A-Z.\-=^]{1,10}$/.test(k)) counts[k] = (counts[k] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [enriched]);

  const availableCats = useMemo(() => {
    const present = new Set(enriched.map((e) => e.cat.key));
    return CATEGORIES.filter((c) => present.has(c.key));
  }, [enriched]);

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <RequirePlan min="premium">
      <div className="min-h-screen bg-black text-white">
        {/* ===== MASTHEAD ===== */}
        <div className="sticky top-0 z-20 bg-black/95 backdrop-blur border-b border-white/10">
          {/* Row 1: brand + clock + refresh */}
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <NavigationLink
                href="/ai-pulse"
                className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </NavigationLink>
              <h1 className="text-lg sm:text-xl font-black tracking-tight uppercase whitespace-nowrap">
                EconoPulse<span className="text-amber-400"> News</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-rose-400 border border-rose-500/30 rounded px-1.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Live
              </span>
              <span className="hidden lg:block text-[11px] text-gray-500 truncate">{todayStr}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="hidden md:block text-[12px] font-mono text-amber-300 tabular-nums" title="New York time">{nowStr} ET</span>
              <button
                onClick={() => fetchNews(true)}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/15 hover:bg-white/10 disabled:opacity-50 text-gray-300 text-xs font-semibold transition-colors"
                title="Refresh headlines"
              >
                <ArrowPathIcon className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Row 2: live market tape */}
          <MarketTape />

          {/* Row 3: section nav (underline tabs) */}
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center gap-5 overflow-x-auto no-scrollbar">
            {[{ key: 'all', label: 'Top News' }, ...availableCats].map((c) => (
              <button
                key={c.key}
                onClick={() => setActiveCat(c.key)}
                className={`py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] whitespace-nowrap border-b-2 transition-colors ${
                  activeCat === c.key
                    ? 'text-white border-amber-400'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== CONTENT ===== */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
              <div className="lg:col-span-8 space-y-4">
                <div className="h-8 w-40 bg-white/5 rounded" />
                <div className="h-24 bg-white/5 rounded" />
                {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded" />)}
              </div>
              <div className="lg:col-span-4 space-y-3">
                {[...Array(10)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded" />)}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-white/10 rounded">
              <p className="text-gray-500 text-sm">No headlines available right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* ===== MAIN COLUMN ===== */}
              <div className="lg:col-span-8">
                {/* Lead story — big typographic hero */}
                {lead && (
                  <a href={lead.article.url} target="_blank" rel="noopener noreferrer" className="group block">
                    <div className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${lead.cat.accent}`}>{lead.cat.label}</div>
                    <h2 className="text-2xl sm:text-4xl font-black leading-[1.08] tracking-tight group-hover:text-amber-200 transition-colors">
                      {lead.article.title}
                    </h2>
                    {lead.article.description && (
                      <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-gray-400 max-w-3xl line-clamp-3">{lead.article.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <SourceMeta article={lead.article} />
                      <TickerChips article={lead.article} max={4} />
                    </div>
                  </a>
                )}

                {/* Secondary stories — 3-up medium headlines */}
                {secondary.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {secondary.map(({ article, cat }) => (
                      <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer" className="group block">
                        <div className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5 ${cat.accent}`}>{cat.label}</div>
                        <h3 className="text-[15px] font-bold leading-snug group-hover:text-amber-200 transition-colors line-clamp-3">{article.title}</h3>
                        <div className="mt-2"><SourceMeta article={article} /></div>
                      </a>
                    ))}
                  </div>
                )}

                {/* Dense headline list */}
                {rest.length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">More Headlines</h2>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                    <div>
                      {rest.map(({ article, cat }) => (
                        <a
                          key={article.id}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-baseline gap-4 py-3.5 border-b border-white/[0.07] hover:bg-white/[0.03] transition-colors -mx-2 px-2"
                        >
                          <span className={`hidden sm:block w-24 shrink-0 text-[9px] font-bold uppercase tracking-[0.15em] ${cat.accent}`}>{cat.label}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[15px] font-semibold leading-snug group-hover:text-amber-200 transition-colors">
                              {article.title}
                              <TickerChips article={article} />
                            </span>
                            {article.description && (
                              <span className="mt-1 hidden sm:block text-[12px] text-gray-500 truncate">{article.description}</span>
                            )}
                          </span>
                          <span className="shrink-0 flex items-center gap-2 text-[11px] text-gray-500">
                            <span className="hidden md:inline font-semibold text-gray-500 truncate max-w-[110px]">{article.source}</span>
                            <span className="font-mono text-gray-600">{relativeTime(article.publishedDate)}</span>
                            <ArrowTopRightOnSquareIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ===== SIDEBAR ===== */}
              <aside className="lg:col-span-4">
                <div className="lg:sticky lg:top-32 space-y-8">
                  {/* Latest — terminal-style timeline */}
                  <section className="border border-white/10 rounded bg-white/[0.02]">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/[0.03]">
                      <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">Latest</h2>
                      {lastUpdated && <span className="text-[10px] font-mono text-gray-600">upd {timeAgoLabel(lastUpdated)}</span>}
                    </div>
                    <div className="divide-y divide-white/[0.06] max-h-[520px] overflow-y-auto">
                      {latest.map(({ article, cat }) => (
                        <a
                          key={`latest-${article.id}`}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors"
                        >
                          <span className="shrink-0 w-11 text-[11px] font-mono text-amber-300/80 tabular-nums pt-0.5">{clockTime(article.publishedDate)}</span>
                          <span className="min-w-0">
                            <span className="block text-[12.5px] font-medium leading-snug text-gray-200 group-hover:text-white transition-colors line-clamp-2">{article.title}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-[0.15em] ${cat.accent}`}>{cat.label}</span>
                          </span>
                        </a>
                      ))}
                    </div>
                  </section>

                  {/* In focus — most-mentioned tickers */}
                  {hotTickers.length > 0 && (
                    <section className="border border-white/10 rounded bg-white/[0.02]">
                      <div className="px-3 py-2 border-b border-white/10 bg-white/[0.03]">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">In Focus</h2>
                      </div>
                      <div className="p-3 flex flex-wrap gap-2">
                        {hotTickers.map(([tk, n]) => (
                          <NavigationLink
                            key={tk}
                            href={`/market-data?symbol=${encodeURIComponent(tk)}`}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border border-white/10 bg-white/[0.03] hover:border-amber-400/40 hover:bg-amber-500/10 transition-colors"
                          >
                            <span className="text-[11px] font-mono font-bold text-white">{tk}</span>
                            <span className="text-[10px] font-mono text-gray-500">{n}</span>
                          </NavigationLink>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </RequirePlan>
  );
}
