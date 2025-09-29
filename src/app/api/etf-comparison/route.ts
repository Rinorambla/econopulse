import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

// Popular ETF symbols and their details
const POPULAR_ETFS = {
  'SPY': { name: 'SPDR S&P 500 ETF Trust', category: 'Large Cap', expense: 0.0945 },
  'QQQ': { name: 'Invesco QQQ Trust', category: 'Technology', expense: 0.20 },
  'VOO': { name: 'Vanguard S&P 500 ETF', category: 'Large Cap', expense: 0.03 },
  'VTI': { name: 'Vanguard Total Stock Market ETF', category: 'Total Market', expense: 0.03 },
  'IVV': { name: 'iShares Core S&P 500 ETF', category: 'Large Cap', expense: 0.03 },
  'VUG': { name: 'Vanguard Growth ETF', category: 'Growth', expense: 0.04 },
  'VGT': { name: 'Vanguard Information Technology ETF', category: 'Technology', expense: 0.10 },
  'VOOG': { name: 'Vanguard S&P 500 Growth ETF', category: 'Growth', expense: 0.10 },
  'QQQM': { name: 'Invesco NASDAQ 100 ETF', category: 'Technology', expense: 0.15 },
  'VT': { name: 'Vanguard Total World Stock ETF', category: 'Global', expense: 0.08 },
  'TQQQ': { name: 'ProShares UltraPro QQQ', category: 'Leveraged', expense: 0.95 },
  'ITOT': { name: 'iShares Core S&P Total U.S. Stock Market ETF', category: 'Total Market', expense: 0.03 },
  'JEPI': { name: 'JPMorgan Equity Premium Income ETF', category: 'Income', expense: 0.35 },
  'JEPQ': { name: 'JPMorgan Nasdaq Equity Premium Income ETF', category: 'Income', expense: 0.35 },
  'QYLD': { name: 'Global X NASDAQ 100 Covered Call ETF', category: 'Income', expense: 0.60 }
};

// Popular ETF comparison pairs
const POPULAR_COMPARISONS = [
  ['QQQ', 'SPY'],
  ['VOO', 'VUG'], 
  ['QQQ', 'VGT'],
  ['IVV', 'VOO'],
  ['VOO', 'VTI'],
  ['QQQ', 'VOOG'],
  ['IVV', 'VTI'],
  ['IVV', 'SPY'],
  ['SPY', 'VOO'],
  ['QQQ', 'VOO'],
  ['QQQ', 'QQQM'],
  ['VT', 'VTI'],
  ['QQQ', 'TQQQ'],
  ['ITOT', 'VTI'],
  ['JEPI', 'JEPQ'],
  ['JEPI', 'QYLD']
];

type ETFQuote = {
  symbol: string;
  name: string;
  category: string;
  price: number;
  change: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  expense: number;
  timestamp: string;
};

async function fetchETFData(symbols: string[], token: string): Promise<ETFQuote[]> {
  try {
    console.log(`Fetching ETF data for ${symbols.length} symbols from Tiingo...`);
    
    const promises = symbols.map(async (symbol): Promise<ETFQuote | null> => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 1);

        const response = await fetch(
          `https://api.tiingo.com/tiingo/daily/${symbol}/prices?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&token=${token}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            next: { revalidate: 300 } // Cache for 5 minutes
          }
        );

        if (!response.ok) {
          console.warn(`❌ Tiingo API error for ${symbol}: ${response.status}`);
          return null;
        }

  const data = await response.json();
        
        if (!data || data.length === 0) {
          console.warn(`⚠️ No data returned for ${symbol}`);
          return null;
        }

  const latestData = data[0];
        const etfInfo = POPULAR_ETFS[symbol as keyof typeof POPULAR_ETFS];
        
        // Calculate performance metrics
        const dailyChange = ((latestData.adjClose - latestData.adjOpen) / latestData.adjOpen) * 100;
        const volume = latestData.adjVolume;

  return {
          symbol,
          name: etfInfo?.name || symbol,
          category: etfInfo?.category || 'ETF',
          price: latestData.adjClose,
          change: dailyChange,
          volume: volume,
          high: latestData.adjHigh,
          low: latestData.adjLow,
          open: latestData.adjOpen,
          expense: etfInfo?.expense || 0,
          timestamp: latestData.date
        };
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        return null;
      }
    });

  const results = await Promise.all(promises);
  return results.filter(Boolean) as ETFQuote[];
    
  } catch (error) {
    console.error('Error fetching ETF data from Tiingo:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request as unknown as Request);
    const rl = rateLimit(`etf:${ip}`, 60, 60_000); // 60 req/min per IP
    if (!rl.ok) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols')?.split(',') || [];
    const comparison = searchParams.get('comparison');

    console.log(`📊 ETF API request - Symbols: ${symbols.join(',')}, Comparison: ${comparison}`);

    let etfsToFetch: string[] = [];

    if (comparison && POPULAR_COMPARISONS.find(pair => pair.join('vs') === comparison)) {
      // Get specific comparison pair
      const pair = POPULAR_COMPARISONS.find(p => p.join('vs') === comparison);
      etfsToFetch = pair || [];
    } else if (symbols.length > 0) {
      // Get specific symbols
      etfsToFetch = symbols.filter(s => s in POPULAR_ETFS);
    } else {
      // Get all popular ETFs
      etfsToFetch = Object.keys(POPULAR_ETFS);
    }

    console.log(`Fetching data for ETFs: ${etfsToFetch.join(', ')}`);

    const token = process.env.TIINGO_API_KEY;
    if (!token) {
      return NextResponse.json({ error: 'TIINGO_API_KEY not configured' }, { status: 500 });
    }

    // Fetch real-time data
    const etfData = await fetchETFData(etfsToFetch, token);

    // Calculate additional metrics
    const processedData = etfData.map((etf) => {
      const volatility = etf.open > 0 ? ((etf.high - etf.low) / etf.open) * 100 : 0;
      const trend = etf.change > 0 ? 'up' : etf.change < 0 ? 'down' : 'flat';
      const momentum = Math.abs(etf.change) >= 1 ? 'strong' : Math.abs(etf.change) >= 0.5 ? 'moderate' : 'neutral';

      return {
        ...etf,
        volatility,
        trend,
        momentum
      };
    });

    const response = {
      etfs: processedData,
      comparisons: POPULAR_COMPARISONS,
      timestamp: new Date().toISOString(),
      totalCount: processedData.length
    };

  console.log(`Retrieved ETF data for ${processedData.length} ETFs`);

  return NextResponse.json(response, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', ...rateLimitHeaders(rl) } });

  } catch (error) {
    console.error('ETF Comparison API error:', error);
    
  return NextResponse.json({ error: 'ETF data unavailable right now' }, { status: 502 });
  }
}
