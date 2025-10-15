import { NextResponse } from 'next/server';

const TIINGO_API_KEY = process.env.TIINGO_API_KEY;

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

    const url = `https://api.tiingo.com/tiingo/news?token=${TIINGO_API_KEY}&limit=10&sortBy=publishedDate`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'EconoPulse/1.0' },
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      throw new Error(`Tiingo API error: ${response.status}`);
    }

    const newsData = await response.json();

    const formattedNews = (Array.isArray(newsData) ? newsData : []).map((article: any) => ({
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
