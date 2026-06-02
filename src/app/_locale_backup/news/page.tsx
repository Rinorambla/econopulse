'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeftIcon, ClockIcon, ArrowPathIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
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
  accent: string; // tailwind text accent
  badge: string; // tailwind badge classes
  images: string[]; // curated cover photos
};

// Curated, high-quality finance photography per topic (Unsplash CDN, stable URLs).
// If any image fails to load we fall back to a branded gradient cover (onError),
// so the layout never shows a broken image.
const CATEGORIES: Category[] = [
  {
    key: 'crypto',
    label: 'Crypto',
    accent: 'text-amber-300',
    badge: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    images: [
      'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=800&q=80&auto=format&fit=crop',
    ],
  },
  {
    key: 'energy',
    label: 'Energy',
    accent: 'text-orange-300',
    badge: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
    images: [
      'https://images.unsplash.com/photo-1605379399642-870262d3d051?w=800&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&q=80&auto=format&fit=crop',
    ],
  },
  {
    key: 'fed',
    label: 'Fed & Rates',
    accent: 'text-sky-300',
    badge: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
    images: [
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80&auto=format&fit=crop',
    ],
  },
  {
    key: 'tech',
    label: 'Tech & AI',
    accent: 'text-violet-300',
    badge: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
    images: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80&auto=format&fit=crop',
    ],
  },
  {
    key: 'commodities',
    label: 'Commodities',
    accent: 'text-yellow-300',
    badge: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300',
    images: [
      'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1624365168968-f283e0b3a3b6?w=800&q=80&auto=format&fit=crop',
    ],
  },
  {
    key: 'banks',
    label: 'Banks',
    accent: 'text-emerald-300',
    badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    images: [
      'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=800&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80&auto=format&fit=crop',
    ],
  },
  {
    key: 'markets',
    label: 'Markets',
    accent: 'text-blue-300',
    badge: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
    images: [
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80&auto=format&fit=crop',
    ],
  },
];

const DEFAULT_CATEGORY = CATEGORIES[CATEGORIES.length - 1]; // Markets

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function classify(article: NewsArticle): Category {
  const text = `${article.title} ${article.description} ${(article.tags || []).join(' ')} ${(article.tickers || []).join(' ')}`.toLowerCase();
  const has = (...kw: string[]) => kw.some((k) => text.includes(k));
  if (has('bitcoin', 'crypto', 'ethereum', 'btc', 'eth', 'blockchain', 'token', 'coinbase')) return CATEGORIES.find((c) => c.key === 'crypto')!;
  if (has('oil', 'gas', 'energy', 'crude', 'opec', 'solar', 'renewable', 'barrel')) return CATEGORIES.find((c) => c.key === 'energy')!;
  if (has('fed', 'federal reserve', 'interest rate', 'inflation', 'powell', 'fomc', 'treasury', 'yield', 'cpi', 'gdp', 'recession')) return CATEGORIES.find((c) => c.key === 'fed')!;
  if (has('ai', 'artificial intelligence', 'chip', 'semiconductor', 'nvidia', 'software', 'cloud', 'tech', 'apple', 'microsoft', 'google')) return CATEGORIES.find((c) => c.key === 'tech')!;
  if (has('gold', 'silver', 'copper', 'commodit', 'metal', 'wheat', 'corn')) return CATEGORIES.find((c) => c.key === 'commodities')!;
  if (has('bank', 'jpmorgan', 'goldman', 'wells fargo', 'lending', 'deposit', 'credit')) return CATEGORIES.find((c) => c.key === 'banks')!;
  return CATEGORIES.find((c) => c.key === 'markets')!;
}

function coverFor(article: NewsArticle, cat: Category): string {
  const imgs = cat.images.length ? cat.images : DEFAULT_CATEGORY.images;
  return imgs[hashStr(article.id || article.title) % imgs.length];
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
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CoverImage({ src, alt, cat, className }: { src: string; alt: string; cat: Category; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div className={`relative flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-black ${className || ''}`}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.5),transparent_60%)]" />
        <span className={`relative text-sm font-bold uppercase tracking-widest ${cat.accent}`}>{cat.label}</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />;
}

function SourceBadge({ source, url }: { source: string; url: string }) {
  const domain = domainOf(url);
  const [failed, setFailed] = useState(false);
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-200">
      {domain && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          alt=""
          className="w-4 h-4 rounded-sm"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="w-4 h-4 rounded-sm bg-blue-500/40 inline-block" />
      )}
      <span className="truncate max-w-[160px]">{source}</span>
    </span>
  );
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [activeCat, setActiveCat] = useState<string>('all');

  const fetchNews = async (silent = false) => {
    try {
      if (silent) setRefreshing(true); else setLoading(true);
      const response = await fetch('/api/news');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      setNews(result.data || []);
      setLastUpdated(result.lastUpdated || new Date().toISOString());
    } catch (error) {
      console.error('Error fetching news:', error);
      if (!silent) setNews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const refreshInterval = setInterval(() => fetchNews(true), 300000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Attach a category to every article once.
  const enriched = useMemo(
    () => news.map((a) => ({ article: a, cat: classify(a) })),
    [news]
  );

  const filtered = useMemo(
    () => (activeCat === 'all' ? enriched : enriched.filter((e) => e.cat.key === activeCat)),
    [enriched, activeCat]
  );

  const lead = filtered[0];
  const secondary = filtered.slice(1, 3);
  const rest = filtered.slice(3);

  // Only show category chips that actually have articles.
  const availableCats = useMemo(() => {
    const present = new Set(enriched.map((e) => e.cat.key));
    return CATEGORIES.filter((c) => present.has(c.key));
  }, [enriched]);

  return (
    <RequirePlan min="premium">
      <div className="min-h-screen bg-[var(--background)] text-white">
        {/* Header */}
        <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* Use locale-agnostic path so NavigationLink adds the current locale only once */}
              <NavigationLink href="/ai-pulse" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors shrink-0">
                <ArrowLeftIcon className="h-5 w-5" />
                <span className="text-sm font-medium hidden sm:inline">Back</span>
              </NavigationLink>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Live
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight">EconoPulse <span className="text-blue-400">Newsroom</span></h1>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 hidden sm:block">Real-time global markets, macro &amp; business headlines</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {lastUpdated && (
                <span className="text-[11px] text-gray-400 hidden md:flex items-center gap-1.5">
                  <ClockIcon className="h-4 w-4" /> {relativeTime(lastUpdated)}
                </span>
              )}
              <button
                onClick={() => fetchNews(true)}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/90 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Category filter bar */}
          {!loading && availableCats.length > 0 && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveCat('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${activeCat === 'all' ? 'bg-white text-slate-900 border-white' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}
              >
                All news
              </button>
              {availableCats.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setActiveCat(c.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${activeCat === c.key ? c.badge : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-80 rounded-2xl bg-white/5 animate-pulse" />
              <div className="space-y-6">
                <div className="h-36 rounded-2xl bg-white/5 animate-pulse" />
                <div className="h-36 rounded-2xl bg-white/5 animate-pulse" />
              </div>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-72 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl bg-white/5">
              <p className="text-gray-400 text-sm">No news articles available right now.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Top: lead + secondary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lead story */}
                {lead && (
                  <a
                    href={lead.article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lg:col-span-2 group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 min-h-[20rem]"
                  >
                    <CoverImage
                      src={coverFor(lead.article, lead.cat)}
                      alt={lead.article.title}
                      cat={lead.cat}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                    <div className="relative h-full flex flex-col justify-end p-6 sm:p-8">
                      <span className={`self-start mb-3 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${lead.cat.badge}`}>
                        {lead.cat.label}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight group-hover:text-blue-200 transition-colors line-clamp-3">
                        {lead.article.title}
                      </h2>
                      {lead.article.description && (
                        <p className="mt-3 text-sm sm:text-base text-gray-300 line-clamp-2 max-w-2xl">{lead.article.description}</p>
                      )}
                      <div className="mt-4 flex items-center gap-3 text-gray-300">
                        <SourceBadge source={lead.article.source} url={lead.article.url} />
                        <span className="text-gray-500">•</span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1"><ClockIcon className="h-3.5 w-3.5" />{relativeTime(lead.article.publishedDate)}</span>
                      </div>
                    </div>
                  </a>
                )}

                {/* Secondary stories */}
                <div className="space-y-6">
                  {secondary.map(({ article, cat }) => (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 block h-36 sm:h-[8.5rem]"
                    >
                      <CoverImage
                        src={coverFor(article, cat)}
                        alt={article.title}
                        cat={cat}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
                      <div className="relative h-full flex flex-col justify-end p-4">
                        <span className={`self-start mb-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cat.badge}`}>{cat.label}</span>
                        <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-blue-200 transition-colors">{article.title}</h3>
                        <div className="mt-1.5 text-[10px] text-gray-400 flex items-center gap-2">
                          <span className="truncate max-w-[120px]">{article.source}</span>
                          <span>•</span>
                          <span>{relativeTime(article.publishedDate)}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Grid of remaining stories */}
              {rest.length > 0 && (
                <>
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Latest headlines</h2>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rest.map(({ article, cat }) => (
                      <article key={article.id} className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800/50 to-slate-900/60 hover:border-blue-500/40 transition-colors">
                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="relative block h-44 overflow-hidden">
                          <CoverImage
                            src={coverFor(article, cat)}
                            alt={article.title}
                            cat={cat}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <span className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${cat.badge}`}>{cat.label}</span>
                        </a>
                        <div className="flex flex-col flex-1 p-4">
                          <a href={article.url} target="_blank" rel="noopener noreferrer">
                            <h3 className="text-[15px] font-bold leading-snug line-clamp-3 group-hover:text-blue-300 transition-colors">{article.title}</h3>
                          </a>
                          {article.description && (
                            <p className="mt-2 text-[13px] text-gray-400 line-clamp-2 flex-1">{article.description}</p>
                          )}
                          {Array.isArray(article.tickers) && article.tickers.filter((t) => typeof t === 'string' && t.trim()).length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {article.tickers.filter((t) => typeof t === 'string' && t.trim()).slice(0, 3).map((tk) => (
                                <span key={`${article.id}-${tk}`} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">{String(tk).toUpperCase()}</span>
                              ))}
                            </div>
                          )}
                          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                            <SourceBadge source={article.source} url={article.url} />
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                              {relativeTime(article.publishedDate)}
                              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <Footer />
      </div>
    </RequirePlan>
  );
}
