import { NextResponse } from 'next/server';
import { getTiingoMarketData } from '../../../lib/tiingo';

// Asset mappings for each economic quadrant
const QUADRANT_ASSETS = {
  Deflation: ['TLT', 'AGG', 'IEF', 'GLD', 'JNJ', 'PG', 'AAPL', 'MSFT'],
  Reflation: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'TLT', 'AGG', 'IEF'],
  Stagflation: ['XOM', 'CVX', 'GLD', 'SLV', 'JNJ', 'PG'],
  Expansion: ['AAPL', 'MSFT', 'GOOGL', 'XOM', 'CVX', 'SPY', 'QQQ']
};

const ASSET_INFO: Record<string, { name: string; sector: string }> = {
  'TLT': { name: 'iShares 20+ Year Treasury Bond ETF', sector: 'ETF - Treasury Bonds' },
  'AGG': { name: 'iShares Core U.S. Aggregate Bond ETF', sector: 'ETF - Bonds' },
  'IEF': { name: 'iShares 7-10 Year Treasury Bond ETF', sector: 'ETF - Treasury Bonds' },
  'GLD': { name: 'SPDR Gold Shares', sector: 'ETF - Gold' },
  'SLV': { name: 'iShares Silver Trust', sector: 'ETF - Silver' },
  'JNJ': { name: 'Johnson & Johnson', sector: 'Healthcare' },
  'PG': { name: 'Procter & Gamble Co', sector: 'Consumer Staples' },
  'AAPL': { name: 'Apple Inc', sector: 'Technology' },
  'MSFT': { name: 'Microsoft Corporation', sector: 'Technology' },
  'GOOGL': { name: 'Alphabet Inc', sector: 'Technology' },
  'TSLA': { name: 'Tesla Inc', sector: 'Consumer Discretionary' },
  'XOM': { name: 'Exxon Mobil Corporation', sector: 'Energy' },
  'CVX': { name: 'Chevron Corporation', sector: 'Energy' },
  'SPY': { name: 'SPDR S&P 500 ETF Trust', sector: 'ETF - Equity' },
  'QQQ': { name: 'Invesco QQQ Trust', sector: 'ETF - Technology' }
};

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  name: string;
  sector: string;
}

interface QuadrantData {
  quadrant: string;
  avgReturn: number;
  totalValue: number;
  assetCount: number;
  assets: StockData[];
  lastUpdated: string;
  source: string;
  status: 'strong' | 'moderate' | 'weak';
}

export async function GET() {
  try {
    console.log('🔍 Fetching REAL economic quadrant data from Tiingo...');
    
    // Get all unique symbols from quadrants
    const allSymbols = [...new Set(Object.values(QUADRANT_ASSETS).flat())];
    
    console.log(`📊 Requesting REAL data for ${allSymbols.length} symbols...`);
    
    // Fetch real market data from Tiingo
    const marketData = await getTiingoMarketData(allSymbols);
    
    if (!marketData || marketData.length === 0) {
      console.error('❌ No market data received from Tiingo');
      return NextResponse.json(
        { error: 'No market data available from Tiingo' },
        { status: 503 }
      );
    }

    console.log(`✅ Retrieved REAL data for ${marketData.length} symbols from Tiingo`);

    // Transform data for economic quadrant analysis
    const quadrantData: QuadrantData[] = Object.entries(QUADRANT_ASSETS).map(([quadrant, symbols]) => {
      const quadrantAssets = marketData
        .filter(d => symbols.includes((d as any).symbol))
        .map(d => {
          const sym = (d as any).symbol;
          const base = (d as any).data ? (d as any).data : d;
          return {
            symbol: sym,
            price: base.price,
            change: base.change,
            changePercent: base.changePercent,
            volume: base.volume,
            name: ASSET_INFO[sym]?.name || sym,
            sector: ASSET_INFO[sym]?.sector || 'Unknown'
          } as StockData;
        });
      
      const avgReturn = quadrantAssets.length > 0 
        ? quadrantAssets.reduce((sum, asset) => sum + asset.changePercent, 0) / quadrantAssets.length
        : 0;

      const totalValue = quadrantAssets.reduce((sum, asset) => sum + (asset.price * asset.volume), 0);

      // Determine quadrant status based on performance
      let status: 'strong' | 'moderate' | 'weak';
      if (avgReturn > 1) {
        status = 'strong';
      } else if (avgReturn > -1) {
        status = 'moderate';
      } else {
        status = 'weak';
      }

      return {
        quadrant,
        avgReturn: Number(avgReturn.toFixed(2)),
        totalValue,
        assetCount: quadrantAssets.length,
        assets: quadrantAssets,
        lastUpdated: new Date().toISOString(),
        source: 'Tiingo API',
        status
      };
    });

    // Calculate overall market sentiment
    const overallReturn = quadrantData.reduce((sum, q) => sum + q.avgReturn, 0) / quadrantData.length;
    const strongQuadrants = quadrantData.filter(q => q.status === 'strong').length;

    console.log(`✅ Economic quadrant analysis complete - Overall Return: ${overallReturn.toFixed(2)}%`);
    console.log(`📈 Strong Quadrants: ${strongQuadrants}/4`);
    
    return NextResponse.json({
      success: true,
      data: quadrantData,
      summary: {
        overallReturn: Number(overallReturn.toFixed(2)),
        strongQuadrants,
        totalAssets: marketData.length,
        marketSentiment: overallReturn > 0 ? 'Bullish' : 'Bearish'
      },
      timestamp: new Date().toISOString(),
      source: 'Tiingo API',
      dataType: 'REAL'
    });

  } catch (error) {
    console.error('❌ Error fetching economic quadrant data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch economic quadrant data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}