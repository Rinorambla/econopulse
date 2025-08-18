import { NextResponse } from 'next/server';

const TIINGO_API_KEY = process.env.TIINGO_API_KEY;

export async function GET() {
  try {
    if (!TIINGO_API_KEY) {
      throw new Error('TIINGO_API_KEY not configured');
    }

    // Fetch latest financial news from Tiingo
    const response = await fetch(
      `https://api.tiingo.com/tiingo/news?token=${TIINGO_API_KEY}&limit=10&sortBy=publishedDate`,
      {
        headers: {
          'User-Agent': 'EconoPulse/1.0',
        },
        next: { revalidate: 1800 } // Cache for 30 minutes
      }
    );

    if (!response.ok) {
      throw new Error(`Tiingo API error: ${response.status}`);
    }

    const newsData = await response.json();

    // Filter and format news data
    const formattedNews = newsData.map((article: any) => ({
      id: article.id,
      title: article.title,
      description: article.description?.substring(0, 150) + '...' || '',
      url: article.url,
      source: article.source,
      publishedDate: article.publishedDate,
      tickers: article.tickers || [],
      tags: article.tags || []
    }));

    return NextResponse.json({
      success: true,
      data: formattedNews,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching news:', error);
    
    // Fallback news data
    const fallbackNews = [
      {
        id: 'fallback-1',
        title: 'Market Analysis: AI Stocks Continue to Show Strength',
        description: 'Technology sector maintains momentum as artificial intelligence companies report strong earnings...',
        url: '#',
        source: 'EconoPulse',
        publishedDate: new Date().toISOString(),
        tickers: ['NVDA', 'MSFT', 'GOOGL'],
        tags: ['Technology', 'AI']
      },
      {
        id: 'fallback-2', 
        title: 'Federal Reserve Signals Cautious Approach to Interest Rates',
        description: 'Central bank officials indicate measured response to economic indicators in upcoming policy decisions...',
        url: '#',
        source: 'EconoPulse',
        publishedDate: new Date().toISOString(),
        tickers: ['SPY', 'QQQ'],
        tags: ['Fed', 'Interest Rates']
      },
      {
        id: 'fallback-3',
        title: 'Energy Sector Sees Mixed Performance Amid Global Developments',
        description: 'Oil and gas companies navigate changing market conditions and regulatory landscape...',
        url: '#',
        source: 'EconoPulse', 
        publishedDate: new Date().toISOString(),
        tickers: ['XOM', 'CVX'],
        tags: ['Energy', 'Oil']
      }
    ];

    return NextResponse.json({
      success: false,
      data: fallbackNews,
      lastUpdated: new Date().toISOString(),
      error: 'Using fallback data'
    });
  }
}
