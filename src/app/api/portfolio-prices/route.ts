import { NextResponse } from 'next/server';
import { getTiingoMarketData } from '../../../lib/tiingo';

export async function POST(request: Request) {
  try {
    const { symbols } = await request.json();
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Invalid symbols array provided' },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching portfolio prices for ${symbols.length} symbols from Tiingo...`);
    
    const marketData = await getTiingoMarketData(symbols);
    
    if (!marketData || marketData.length === 0) {
      return NextResponse.json(
        { error: 'No price data available from Tiingo' },
        { status: 503 }
      );
    }

    console.log(`✅ Retrieved prices for ${marketData.length} symbols from Tiingo`);

    // Transform data for portfolio format
    const portfolioPrices = marketData.reduce((acc, stock) => {
      const sym = (stock as any).symbol;
      const base = (stock as any).data ? (stock as any).data : stock;
      acc[sym] = {
        price: base.price,
        change: base.change,
        changePercent: base.changePercent,
        volume: base.volume,
        timestamp: base.timestamp,
        source: 'Tiingo'
      };
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      prices: portfolioPrices,
      timestamp: new Date().toISOString(),
      source: 'Tiingo API',
      dataType: 'REAL'
    });

  } catch (error) {
    console.error('❌ Portfolio prices error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio prices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Popular symbols for demo
    const popularSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
      'SPY', 'QQQ', 'VTI', 'IWM', 'GLD', 'SLV', 'TLT', 'XLF'
    ];

    console.log(`🔍 Fetching popular portfolio symbols from Tiingo...`);
    
    const marketData = await getTiingoMarketData(popularSymbols);
    
    if (!marketData || marketData.length === 0) {
      return NextResponse.json(
        { error: 'No market data available from Tiingo' },
        { status: 503 }
      );
    }

    console.log(`✅ Retrieved data for ${marketData.length} popular symbols from Tiingo`);

    // Transform data for display
    const popularStocks = marketData.map((stock: any) => {
      const sym = stock?.symbol;
      const base = stock && stock.data ? stock.data : stock;
      const cp = base?.changePercent ?? 0;
      return {
        symbol: sym,
        name: getCompanyName(sym),
        price: base?.price,
        change: base?.change,
        changePercent: cp,
        volume: base?.volume,
        trend: cp > 0 ? 'up' : cp < 0 ? 'down' : 'flat',
        timestamp: base?.timestamp,
        source: 'Tiingo'
      };
    });

    return NextResponse.json({
      success: true,
      data: popularStocks,
      timestamp: new Date().toISOString(),
      source: 'Tiingo API',
      dataType: 'REAL'
    });

  } catch (error) {
    console.error('❌ Popular stocks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular stocks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getCompanyName(symbol: string): string {
  const names: Record<string, string> = {
    'AAPL': 'Apple Inc',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc',
    'AMZN': 'Amazon.com Inc',
    'TSLA': 'Tesla Inc',
    'NVDA': 'NVIDIA Corporation',
    'META': 'Meta Platforms Inc',
    'NFLX': 'Netflix Inc',
    'SPY': 'SPDR S&P 500 ETF',
    'QQQ': 'Invesco QQQ Trust',
    'VTI': 'Vanguard Total Stock Market ETF',
    'IWM': 'iShares Russell 2000 ETF',
    'GLD': 'SPDR Gold Shares',
    'SLV': 'iShares Silver Trust',
    'TLT': 'iShares 20+ Year Treasury Bond ETF',
    'XLF': 'Financial Select Sector SPDR Fund'
  };
  
  return names[symbol] || symbol;
}
