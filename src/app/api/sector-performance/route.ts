import { NextResponse } from 'next/server';
import { getTiingoMarketData, getTiingoHistorical } from '@/lib/tiingo';
import { getYahooQuotes } from '@/lib/yahooFinance';
import { fetchMultipleHistory, YahooHistory } from '@/lib/yahoo-history';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

// Sector ETF mappings for performance analysis
const SECTOR_ETFS = {
  'Technology': 'XLK',
  'Healthcare': 'XLV', 
  'Financial': 'XLF',
  'Energy': 'XLE',
  'Consumer Discretionary': 'XLY',
  'Consumer Staples': 'XLP',
  'Industrials': 'XLI',
  'Materials': 'XLB',
  'Utilities': 'XLU',
  'Real Estate': 'XLRE',
  'Communication': 'XLC'
};

export async function GET(request: Request) {
  try {
    console.log('🔍 Sector performance: start');
    // Basic rate limit per IP (60/min)
    // Note: in-memory only; for production durability use Redis/etc.
    const ip = getClientIp(request);
    const rl = rateLimit(`sector:${ip}`, 60, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimitHeaders(rl) });
    }
    
    const symbols = Object.values(SECTOR_ETFS);
    console.log(`📊 Requesting data for ${symbols.length} sector ETFs:`, symbols);
    
    // Fetch current day data
    const sectorData = await getTiingoMarketData(symbols);
    
    if (!sectorData || sectorData.length === 0) {
      console.warn('⚠️ Tiingo returned no data (missing key or upstream issue). Falling back to Yahoo.');
      const fallback = await buildYahooFallback(symbols);
      if (fallback) {
        const res = NextResponse.json(fallback.body, { status: 200 });
        applyCacheHeaders(res, 300);
        applyRateLimitHeaders(res, rl);
        return res;
      }
      return NextResponse.json(
        { error: 'No sector data available' },
        { status: 503 }
      );
    }

    console.log(`✅ Retrieved REAL data for ${sectorData.length} sectors from Tiingo`);
    
    // Fetch historical data for each symbol to calculate multi-period performance
    const historicalPromises = symbols.map(async (symbol) => {
      try {
        const historical = await getTiingoHistorical(symbol, 365); // Get 1 year of data
        return { symbol, historical };
      } catch (error) {
        console.warn(`❌ Error getting historical data for ${symbol}:`, error);
        return { symbol, historical: null };
      }
    });
    
    const historicalResults = await Promise.all(historicalPromises);
    console.log(`✅ Retrieved historical data for multi-period analysis`);

    // Helper function to calculate performance between two prices
    const calculatePerformance = (currentPrice: number, pastPrice: number) => {
      if (!pastPrice || pastPrice === 0) return 0;
      return ((currentPrice - pastPrice) / pastPrice) * 100;
    };

    // Helper function to get historical price for specific days back
    const getHistoricalPrice = (historical: any[], daysBack: number) => {
      if (!historical || historical.length === 0) return null;
      const targetIndex = Math.min(daysBack, historical.length - 1);
      return historical[historical.length - 1 - targetIndex]?.close || null;
    };

    // Transform data for sector performance display with multi-period analysis
    const sectorPerformance = Object.entries(SECTOR_ETFS).map(([sectorName, symbol]) => {
      const currentData = sectorData.find(item => item.symbol === symbol);
      const historicalData = historicalResults.find(item => item.symbol === symbol)?.historical;
      
      if (!currentData) {
        return {
          name: sectorName,
          symbol,
          performance: 0,
          price: 0,
          change: 0,
          volume: 0,
          status: 'neutral' as const,
          daily: 0,
          weekly: 0,
          monthly: 0,
          quarterly: 0,
          yearly: 0
        };
      }

      const hasData = 'data' in currentData && currentData.data;
      const currentPrice = hasData ? (currentData as any).data.price : (currentData as any).price;
      
      // Calculate multi-period performance
      const weeklyPrice = getHistoricalPrice(historicalData, 7);
      const monthlyPrice = getHistoricalPrice(historicalData, 30);
      const quarterlyPrice = getHistoricalPrice(historicalData, 90);
      const yearlyPrice = getHistoricalPrice(historicalData, 365);

      const daily = hasData ? (currentData as any).data.changePercent : (currentData as any).changePercent;
      const weekly = calculatePerformance(currentPrice, weeklyPrice);
      const monthly = calculatePerformance(currentPrice, monthlyPrice);
      const quarterly = calculatePerformance(currentPrice, quarterlyPrice);
      const yearly = calculatePerformance(currentPrice, yearlyPrice);

      let status: 'positive' | 'negative' | 'neutral';
      if (daily > 0.5) {
        status = 'positive';
      } else if (daily < -0.5) {
        status = 'negative';
      } else {
        status = 'neutral';
      }

      return {
        sector: sectorName, // Match frontend interface
        daily: Number(daily.toFixed(2)),
        weekly: Number(weekly.toFixed(2)),
        monthly: Number(monthly.toFixed(2)),
        quarterly: Number(quarterly.toFixed(2)),
        yearly: Number(yearly.toFixed(2)),
        marketCap: 0, // Unknown from this endpoint; avoid synthetic values
        volume: hasData ? (currentData as any).data.volume : (currentData as any).volume,
        topStocks: [currentData.symbol] // Only include real symbol if needed
      };
    });

    // Sort by daily performance
    sectorPerformance.sort((a, b) => b.daily - a.daily);

    const avgPerformance = sectorPerformance.reduce((sum, sector) => sum + sector.daily, 0) / sectorPerformance.length;
    const positiveCount = sectorPerformance.filter(s => s.daily > 0).length;
    
    console.log(`✅ Sector analysis complete - Average Performance: ${avgPerformance.toFixed(2)}%`);
    console.log(`📈 Positive Sectors: ${positiveCount}/${sectorPerformance.length}`);

    const body = {
      success: true,
      sectors: sectorPerformance,
      lastUpdated: new Date().toISOString(),
      summary: {
        averagePerformance: Number(avgPerformance.toFixed(2)),
        positiveSectors: positiveCount,
        totalSectors: sectorPerformance.length,
        marketSentiment: avgPerformance > 0 ? 'Bullish' : 'Bearish'
      },
      timestamp: new Date().toISOString(),
      source: 'Tiingo API',
      dataType: 'REAL'
    };

    const res = NextResponse.json(body, { status: 200 });
    applyCacheHeaders(res, 300);
    applyRateLimitHeaders(res, rl);
    return res;

  } catch (error) {
    console.error('❌ Error fetching sector performance:', error);
    // Last-resort: try Yahoo fallback without Tiingo
    try {
      const symbols = Object.values(SECTOR_ETFS);
      const fallback = await buildYahooFallback(symbols);
      if (fallback) {
        const res = NextResponse.json(fallback.body, { status: 200 });
        applyCacheHeaders(res, 300);
        return res;
      }
    } catch {}
    return NextResponse.json({ error: 'Failed to fetch sector performance' }, { status: 500 });
  }
}

// ----------------- Helpers: Yahoo Fallback + Cache headers -----------------
type SectorPerf = {
  sector: string;
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  yearly: number;
  marketCap: number;
  volume: number;
  topStocks: string[];
};

type SectorResponse = {
  success: boolean;
  sectors: SectorPerf[];
  lastUpdated: string;
  summary: {
    averagePerformance: number;
    positiveSectors: number;
    totalSectors: number;
    marketSentiment: string;
  };
  timestamp: string;
  source: string;
  dataType: 'REAL' | 'FALLBACK';
};

const CACHE: { ts: number; data: SectorResponse } = { ts: 0, data: undefined as any };

function applyCacheHeaders(res: NextResponse, sMaxAge: number) {
  res.headers.set('Cache-Control', `s-maxage=${sMaxAge}, stale-while-revalidate=60`);
}

function applyRateLimitHeaders(res: NextResponse, rl: ReturnType<typeof rateLimit>) {
  const hdrs = rateLimitHeaders(rl);
  Object.entries(hdrs).forEach(([k, v]) => res.headers.set(k, v));
}

async function buildYahooFallback(symbols: string[]): Promise<{ body: SectorResponse } | null> {
  try {
    // Serve cached if fresh (< 5 minutes)
    if (CACHE.data && Date.now() - CACHE.ts < 5 * 60_000) {
      console.log('💾 Sector fallback cache hit');
      return { body: CACHE.data };
    }

    console.log('🔄 Building Yahoo fallback for sectors');
    const quotes = await getYahooQuotes(symbols);
    // Fetch 1y daily history for multi-period performance
    const histories: YahooHistory[] = await fetchMultipleHistory(symbols, '1y', '1d');

    const histMap = new Map(histories.map(h => [h.symbol.toUpperCase(), h]));

    const getCloseNDaysAgo = (h: YahooHistory | undefined, approxDays: number): number | null => {
      if (!h || !h.bars || h.bars.length < 2) return null;
      const bars = h.bars;
      const idx = Math.max(0, bars.length - 1 - approxDays);
      const ref = bars[idx];
      return typeof ref?.close === 'number' ? ref.close : null;
    };

    const calcPerf = (current: number, past: number | null) => {
      if (!current || !past || past === 0) return 0;
      return ((current - past) / past) * 100;
    };

    const sectors: SectorPerf[] = Object.entries(SECTOR_ETFS).map(([sectorName, symbol]) => {
      const q = quotes.find(q => q.ticker.toUpperCase() === symbol);
      const h = histMap.get(symbol);
      const current = q?.price || 0;
      const daily = q?.changePercent ?? 0;
      const weekly = calcPerf(current, getCloseNDaysAgo(h, 5));
      const monthly = calcPerf(current, getCloseNDaysAgo(h, 22));
      const quarterly = calcPerf(current, getCloseNDaysAgo(h, 66));
      const yearly = calcPerf(current, getCloseNDaysAgo(h, 252));

      return {
        sector: sectorName,
        daily: Number(daily.toFixed(2)),
        weekly: Number(weekly.toFixed(2)),
        monthly: Number(monthly.toFixed(2)),
        quarterly: Number(quarterly.toFixed(2)),
        yearly: Number(yearly.toFixed(2)),
        marketCap: 0,
        volume: q?.volume || 0,
        topStocks: [symbol]
      };
    });

    sectors.sort((a, b) => b.daily - a.daily);
    const avg = sectors.reduce((s, x) => s + x.daily, 0) / (sectors.length || 1);
    const pos = sectors.filter(s => s.daily > 0).length;

    const body: SectorResponse = {
      success: true,
      sectors,
      lastUpdated: new Date().toISOString(),
      summary: {
        averagePerformance: Number(avg.toFixed(2)),
        positiveSectors: pos,
        totalSectors: sectors.length,
        marketSentiment: avg > 0 ? 'Bullish' : 'Bearish'
      },
      timestamp: new Date().toISOString(),
      source: 'Yahoo Finance',
      dataType: 'FALLBACK'
    };

    CACHE.ts = Date.now();
    CACHE.data = body;
    return { body };
  } catch (e) {
    console.error('❌ Yahoo fallback failed:', e);
    return null;
  }
}
