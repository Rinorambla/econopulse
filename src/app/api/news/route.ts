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
  'world cup', 'olympics', 'athlete', 'coach', 'roster', 'draft pick'
];

function isFinancialNews(article: any): boolean {
  const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
  
  // Exclude if contains non-financial keywords
  for (const keyword of EXCLUDED_KEYWORDS) {
    if (text.includes(keyword)) return false;
  }
  
  // Include if has stock tickers
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

export async function GET() {
  try {
    if (!TIINGO_API_KEY) {
      throw new Error('TIINGO_API_KEY not configured');
    }

    // Request more articles to have enough after filtering
    // Add tickers parameter to focus on financial news
    const majorTickers = 'SPY,QQQ,AAPL,MSFT,GOOGL,AMZN,NVDA,TSLA,META,JPM,GS,XOM';
    const url = `https://api.tiingo.com/tiingo/news?token=${TIINGO_API_KEY}&limit=50&tickers=${majorTickers}&sortBy=publishedDate`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'EconoPulse/1.0' },
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      throw new Error(`Tiingo API error: ${response.status}`);
    }

    const newsData = await response.json();

    // Filter and format financial news only
    const formattedNews = (Array.isArray(newsData) ? newsData : [])
      .filter(isFinancialNews)
      .slice(0, 15) // Return top 15 financial articles
      .map((article: any) => ({
        id: article.id,
        title: article.title,
        description: truncate(article.description),
        url: article.url,
        source: article.source || 'Tiingo',
        publishedDate: article.publishedDate,
        tickers: article.tickers || [],
        tags: article.tags || []
      }));

    return NextResponse.json({
      success: true,
      provider: 'tiingo',
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
