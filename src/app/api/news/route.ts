import { NextResponse } from 'next/server';

const TIINGO_API_KEY = process.env.TIINGO_API_KEY;

// Financial-only keywords to filter news
const FINANCIAL_KEYWORDS = [
  'stock', 'market', 'trading', 'investor', 'earnings', 'revenue', 'profit', 'loss',
  'fed', 'federal reserve', 'interest rate', 'inflation', 'gdp', 'economy', 'economic',
  'nasdaq', 's&p', 'dow', 'bitcoin', 'crypto', 'etf', 'bond', 'treasury', 'yield',
  'ipo', 'merger', 'acquisition', 'dividend', 'buyback', 'hedge fund', 'wall street',
  'bull', 'bear', 'rally', 'correction', 'volatility', 'options', 'futures',
  'oil', 'gold', 'commodities', 'forex', 'currency', 'dollar', 'euro', 'yen',
  'bank', 'finance', 'investment', 'portfolio', 'asset', 'equity', 'share',
  'sec', 'regulation', 'fintech', 'ai stocks', 'semiconductor', 'tech stocks'
];

// Non-financial topics to exclude
const EXCLUDED_KEYWORDS = [
  'soccer', 'football', 'basketball', 'baseball', 'hockey', 'tennis', 'golf',
  'nfl', 'nba', 'mlb', 'nhl', 'fifa', 'uefa', 'premier league', 'champions league',
  'celebrity', 'entertainment', 'movie', 'music', 'concert', 'album', 'actor',
  'kardashian', 'taylor swift', 'beyonce', 'sports', 'game score', 'touchdown',
  'goal scored', 'match result', 'playoff', 'championship game', 'super bowl',
  'world cup', 'olympics', 'athlete', 'coach', 'roster', 'draft pick',
  // crime / general news that sometimes leaks into finance feeds
  'knife attack', 'stabbing', 'shooting', 'murder', 'homicide', 'assault',
  'church service', 'seriously injured', 'police said', 'arrested', 'kidnap',
  'earthquake', 'hurricane', 'wildfire', 'storm damage', 'car crash', 'plane crash',
];

function isFinancialNews(article: any): boolean {
  const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
  
  // Exclude if contains non-financial keywords
  for (const keyword of EXCLUDED_KEYWORDS) {
    if (text.includes(keyword)) return false;
  }
  
  // Include if has stock tickers AND at least looks market-related; a bare
  // ticker list from an aggregator is not enough for crime/general stories,
  // which are already excluded above.
  if (article.tickers && article.tickers.length > 0) return true;
  
  // Include if contains financial keywords
  for (const keyword of FINANCIAL_KEYWORDS) {
    if (text.includes(keyword)) return true;
  }
  
  // Include if tagged with financial topics
  const financialTags = ['markets', 'economy', 'finance', 'investing', 'stocks', 'crypto', 'commodities'];
  if (article.tags?.some((tag: string) => financialTags.includes(tag.toLowerCase()))) {
    return true;
  }
  
  return false;
}

function truncate(text: string | undefined, max = 150): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…'; // avoid cutting mid-word
}

// ── Yahoo live headlines (same engine as the market-data terminal) ───────────
// A handful of market-wide queries gives broad, always-fresh coverage with no
// API key. Results are deduped by link and merged with Tiingo.
const YAHOO_QUERIES = ['stock market', 'federal reserve', 'earnings', 'nasdaq', 'bitcoin crypto', 'oil prices'];

interface RawArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedDate: string;
  tickers: string[];
  tags: string[];
  thumbnail?: string;
}

async function fetchYahooNews(query: string): Promise<RawArticle[]> {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  for (const host of hosts) {
    try {
      const url = `https://${host}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=0&newsCount=10&listsCount=0`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 300 },
      });
      if (!res.ok) continue;
      const json: any = await res.json();
      const news: any[] = Array.isArray(json?.news) ? json.news : [];
      return news
        .filter((n) => n?.title && n?.link)
        .map((n) => ({
          id: String(n.uuid || n.link),
          title: String(n.title),
          description: '',
          url: String(n.link),
          source: String(n.publisher || 'Yahoo Finance'),
          publishedDate: n.providerPublishTime
            ? new Date(Number(n.providerPublishTime) * 1000).toISOString()
            : new Date().toISOString(),
          tickers: Array.isArray(n.relatedTickers) ? n.relatedTickers.slice(0, 6) : [],
          // No forced tags: the finance-only filter (tickers OR keywords)
          // decides, keeping non-financial stories out of the feed.
          tags: [],
          thumbnail: n?.thumbnail?.resolutions?.[n.thumbnail.resolutions.length - 1]?.url || undefined,
        }));
    } catch {
      /* try next host */
    }
  }
  return [];
}

async function fetchAllYahooNews(): Promise<RawArticle[]> {
  const results = await Promise.all(YAHOO_QUERIES.map((q) => fetchYahooNews(q)));
  const seen = new Set<string>();
  const out: RawArticle[] = [];
  for (const list of results) {
    for (const a of list) {
      const key = a.url || a.title;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(a);
    }
  }
  return out;
}

async function fetchTiingoNews(): Promise<RawArticle[]> {
  if (!TIINGO_API_KEY) return [];
  try {
    const majorTickers = 'SPY,QQQ,AAPL,MSFT,GOOGL,AMZN,NVDA,TSLA,META,JPM,GS,XOM';
    const url = `https://api.tiingo.com/tiingo/news?token=${TIINGO_API_KEY}&limit=50&tickers=${majorTickers}&sortBy=publishedDate`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'EconoPulse/1.0' },
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 600 },
    });
    if (!response.ok) return [];
    const newsData = await response.json();
    return (Array.isArray(newsData) ? newsData : []).map((article: any) => ({
      id: String(article.id ?? article.url),
      title: article.title,
      description: truncate(article.description),
      url: article.url,
      source: article.source || 'Tiingo',
      publishedDate: article.publishedDate,
      tickers: article.tickers || [],
      tags: article.tags || [],
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    // Fetch both sources in parallel: Yahoo (live, no key) + Tiingo (if key).
    const [yahoo, tiingo] = await Promise.all([fetchAllYahooNews(), fetchTiingoNews()]);

    // Merge, dedupe by URL/title, filter to finance-only, newest first.
    const seen = new Set<string>();
    const merged: RawArticle[] = [];
    for (const a of [...yahoo, ...tiingo]) {
      const key = (a.url || a.title).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(a);
    }

    const formattedNews = merged
      .filter(isFinancialNews)
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
      .slice(0, 30);

    if (formattedNews.length === 0) throw new Error('no news from any provider');

    return NextResponse.json({
      success: true,
      provider: tiingo.length && yahoo.length ? 'yahoo+tiingo' : yahoo.length ? 'yahoo' : 'tiingo',
      count: formattedNews.length,
      data: formattedNews,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching news:', error);

    const now = new Date().toISOString();
    const fallbackNews = [
      {
        id: 'fallback-1',
        title: 'Market Analysis: AI Stocks Continue to Show Strength',
        description: 'Technology sector maintains momentum as artificial intelligence companies report strong earnings…',
        url: '#',
        source: 'EconoPulse',
        publishedDate: now,
        tickers: ['NVDA', 'MSFT', 'GOOGL'],
        tags: ['Technology', 'AI']
      },
      {
        id: 'fallback-2',
        title: 'Federal Reserve Signals Cautious Approach to Interest Rates',
        description: 'Central bank officials indicate measured response to economic indicators in upcoming policy decisions…',
        url: '#',
        source: 'EconoPulse',
        publishedDate: now,
        tickers: ['SPY', 'QQQ'],
        tags: ['Fed', 'Interest Rates']
      },
      {
        id: 'fallback-3',
        title: 'Energy Sector Sees Mixed Performance Amid Global Developments',
        description: 'Oil and gas companies navigate changing market conditions and regulatory landscape…',
        url: '#',
        source: 'EconoPulse',
        publishedDate: now,
        tickers: ['XOM', 'CVX'],
        tags: ['Energy', 'Oil']
      }
    ];

    return NextResponse.json({
      success: false,
      provider: 'fallback',
      count: fallbackNews.length,
      data: fallbackNews,
      lastUpdated: new Date().toISOString(),
      error: 'Using fallback data'
    });
  }
}
