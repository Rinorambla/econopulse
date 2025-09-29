export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { getTiingoMarketData } from '../../../lib/tiingo';
import { getYahooQuotes, convertYahooToMarketData } from '../../../lib/yahooFinance';
import { marketCache, portfolioCache, getCacheKey, formatCacheStatus } from '../../../lib/cache';

interface MarketDataItem {
  ticker: string;
  name: string;
  price: string;
  change: string;
  performance: string;
  volume: string;
  trend: string;
  demandSupply: string;
  optionsSentiment: string;
  gammaRisk: string;
  unusualAtm: string;
  unusualOtm: string;
  otmSkew: string;
  intradayFlow: string;
  putCallRatio: string;
  sector: string;
  direction?: string;
}

// Memory cleanup utility
function forceGarbageCollection() {
  if (global.gc) {
    global.gc();
  }
}

// Request timeout wrapper
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);
    return result;
  } catch (error) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    throw error;
  }
}

// ESSENTIAL SYMBOLS - Optimized for fast loading (~100 symbols)
const TIINGO_SYMBOLS = [
  // === MAJOR INDICES & ETFs ===
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'VEA', 'VWO', 'EFA', 'EEM',
  
  // === MEGA CAP TECH ===
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'ADBE',
  'CRM', 'ORCL', 'INTC', 'AMD', 'QCOM', 'AVGO', 'CSCO', 'IBM',
  
  // === SECTORS ETFs ===
  'XLK', 'XLF', 'XLE', 'XLI', 'XLV', 'XLY', 'XLP', 'XLU', 'XLRE',
  'SMH', 'XBI', 'KRE', 'IYR', 'ITB', 'XME',
  
  // === MAJOR FINANCIALS ===
  'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'BLK', 'V', 'MA', 'AXP',
  
  // === CONSUMER & RETAIL ===
  'WMT', 'TGT', 'COST', 'HD', 'LOW', 'MCD', 'SBUX', 'DIS', 'PG', 'KO',
  
  // === HEALTHCARE ===
  'JNJ', 'PFE', 'UNH', 'ABT', 'TMO', 'MRNA', 'LLY', 'MRK', 'GILD', 'AMGN',
  
  // === ENERGY ===
  'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'OXY',
  
  // === INDUSTRIALS ===
  'BA', 'CAT', 'MMM', 'GE', 'UPS', 'FDX', 'LMT', 'RTX',
  
  // === BONDS & TREASURY ===
  'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'TIP', 'BIL',
  
  // === COMMODITIES ===
  'GLD', 'SLV', 'DBC', 'USO', 'UNG',
  
  // === INTERNATIONAL ===
  'TSM', 'BABA', 'ASML'
];

// Request deduplication
let activeRequest: Promise<NextResponse> | null = null;
let requestStartTime = 0;

export async function GET() {
  const startTime = Date.now();
  
  // Prevent multiple simultaneous requests
  if (activeRequest && (startTime - requestStartTime) < 50000) {
    console.log('⏳ Request already in progress, waiting...');
    try {
      return await activeRequest;
    } catch (error) {
      console.warn('⚠️  Active request failed, proceeding with new request');
    }
  }
  
  console.log('\n🚀 Dashboard API called');
  requestStartTime = startTime;
  
  try {
    // Force garbage collection at start
    forceGarbageCollection();
    
    // Create the request promise
    const requestPromise = withTimeout(
      handleDashboardRequest(),
      58000,
      'Dashboard request'
    );
    
    // Store as active request
    activeRequest = requestPromise;
    
    const result = await requestPromise;
    
    const duration = Date.now() - startTime;
    console.log(`✅ Dashboard API completed in ${duration}ms`);
    
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Dashboard API failed after ${duration}ms:`, error);
    
    // Force cleanup on error
    forceGarbageCollection();
    
    // Try to return cached data as fallback
    const fallbackCacheKey = getCacheKey('market_data_fallback');
    const fallbackData = marketCache.get(fallbackCacheKey) || [];
    
    return NextResponse.json({
      data: Array.isArray(fallbackData) ? fallbackData.slice(0, 50) : [],
      economicPortfolios: {},
      summary: {
        avgPerformance: '0.00%',
        totalVolume: '0',
        bullishCount: 0,
        bearishCount: 0,
        marketSentiment: 'Unknown'
      },
      lastUpdated: new Date().toISOString(),
      cacheStatus: 'ERROR_FALLBACK',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, must-revalidate',
        'X-Error': 'server-error',
        'X-Duration': duration.toString()
      }
    });
  } finally {
    // Always clear the active request when done
    activeRequest = null;
    requestStartTime = 0;
  }
}

async function handleDashboardRequest() {
  // Check advanced cache first
  const marketCacheKey = getCacheKey('market_data', { symbols: TIINGO_SYMBOLS.length });
  const cachedMarketData = marketCache.get(marketCacheKey);
  
  if (cachedMarketData) {
    console.log('⚡ Using cached market data');
    console.log(formatCacheStatus(marketCache, 'Market Cache'));
    
    return NextResponse.json({
      data: cachedMarketData,
      economicPortfolios: getEconomicPortfolios(),
      summary: {
        avgPerformance: calculateAveragePerformance(cachedMarketData),
        totalVolume: calculateTotalVolume(cachedMarketData),
        bullishCount: cachedMarketData.filter((item: any) => parseFloat(item.performance) > 0).length,
        bearishCount: cachedMarketData.filter((item: any) => parseFloat(item.performance) < 0).length,
        marketSentiment: getMarketSentiment(cachedMarketData)
      },
      lastUpdated: new Date().toISOString(),
      cacheStatus: 'HIT'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
        'X-Cache-Status': 'HIT',
        'CDN-Cache-Control': 'public, s-maxage=3600'
      }
    });
  }

  console.log('🔄 Fetching fresh data from Tiingo...');
  const tiingoData = await withTimeout(
    getTiingoMarketData(TIINGO_SYMBOLS),
    50000,
    'Tiingo market data fetch'
  );
  
  if (!tiingoData || tiingoData.length === 0) {
    console.warn('⚠️  No data received from Tiingo');
    return NextResponse.json({ 
      data: [], 
      economicPortfolios: {},
      summary: {
        avgPerformance: '0.00%',
        totalVolume: '0',
        bullishCount: 0,
        bearishCount: 0,
        marketSentiment: 'Neutral'
      },
      lastUpdated: new Date().toISOString(),
      cacheStatus: 'MISS'
    });
  }

  const dashboardData = tiingoData.map((item: any) => {
    const performanceStr = (item.changePercent * 100).toFixed(2) + '%';
    const sector = getSectorForTicker(item.symbol);
    
    return {
      ticker: item.symbol,
      name: getTickerName(item.symbol),
      price: item.price?.toFixed(2) || '0.00',
      change: item.change?.toFixed(2) || '0.00',
      performance: performanceStr,
      volume: formatVolume(item.volume || 0),
      trend: getTrend(performanceStr),
      demandSupply: getDemandSupply(performanceStr),
      optionsSentiment: getOptionsSentiment(performanceStr),
      gammaRisk: getGammaRisk(performanceStr),
      unusualAtm: getUnusualActivity(performanceStr, 'ATM'),
      unusualOtm: getUnusualActivity(performanceStr, 'OTM'),
      otmSkew: getOTMSkew(performanceStr),
      intradayFlow: getIntradayFlow(performanceStr),
      putCallRatio: getPutCallRatio(performanceStr),
      sector: sector,
      direction: item.changePercent >= 0 ? 'up' : 'down'
    };
  });

  // Store in cache
  marketCache.set(marketCacheKey, dashboardData);
  
  // Also store as fallback cache
  const fallbackData = dashboardData.slice(0, 100);
  const fallbackCacheKey = getCacheKey('market_data_fallback');
  marketCache.set(fallbackCacheKey, fallbackData);
  
  // Force cleanup after successful processing
  forceGarbageCollection();
  
  return NextResponse.json({
    data: dashboardData,
    economicPortfolios: getEconomicPortfolios(),
    summary: {
      avgPerformance: calculateAveragePerformance(dashboardData),
      totalVolume: calculateTotalVolume(dashboardData),
      bullishCount: dashboardData.filter(item => parseFloat(item.performance) > 0).length,
      bearishCount: dashboardData.filter(item => parseFloat(item.performance) < 0).length,
      marketSentiment: getMarketSentiment(dashboardData)
    },
    lastUpdated: new Date().toISOString(),
    cacheStatus: 'MISS'
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      'CDN-Cache-Control': 'public, s-maxage=3600',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=3600'
    }
  });
}

// Economic portfolios (simplified)
function getEconomicPortfolios() {
  return {
    'GOLDILOCKS_ECONOMY': {
      name: 'Goldilocks Economy',
      description: 'Moderate growth, low inflation scenario',
      performance: { daily: '0.85%', weekly: '2.1%', monthly: '4.2%', quarterly: '8.5%', yearly: '12.8%' },
      holdings: [
        { ticker: 'QQQ', name: 'Invesco QQQ Trust', weight: 25, price: 385.50, performance: { daily: '1.2%' }, change: 4.62 },
        { ticker: 'XLK', name: 'Technology Select Sector SPDR Fund', weight: 20, price: 185.25, performance: { daily: '0.9%' }, change: 1.67 },
        { ticker: 'XLY', name: 'Consumer Discretionary SPDR', weight: 20, price: 155.80, performance: { daily: '0.7%' }, change: 1.09 },
        { ticker: 'IEF', name: 'iShares 7-10 Year Treasury Bond ETF', weight: 20, price: 95.45, performance: { daily: '0.2%' }, change: 0.19 },
        { ticker: 'SMH', name: 'VanEck Semiconductor ETF', weight: 15, price: 225.30, performance: { daily: '1.5%' }, change: 3.38 }
      ]
    },
    'RECESSION': {
      name: 'Recession',
      description: 'Economic contraction with defensive positioning',
      performance: { daily: '-0.25%', weekly: '-1.2%', monthly: '-2.8%', quarterly: '-4.5%', yearly: '2.1%' },
      holdings: [
        { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', weight: 30, price: 85.20, performance: { daily: '0.8%' }, change: 0.68 },
        { ticker: 'SHY', name: 'iShares 1-3 Year Treasury Bond ETF', weight: 25, price: 82.15, performance: { daily: '0.1%' }, change: 0.08 },
        { ticker: 'XLU', name: 'Utilities Select Sector SPDR Fund', weight: 20, price: 65.80, performance: { daily: '0.3%' }, change: 0.20 },
        { ticker: 'XLP', name: 'Consumer Staples SPDR', weight: 15, price: 75.90, performance: { daily: '0.2%' }, change: 0.15 },
        { ticker: 'GLD', name: 'SPDR Gold Trust', weight: 10, price: 195.50, performance: { daily: '-0.5%' }, change: -0.98 }
      ]
    }
  };
}

// Helper functions
function getTickerName(ticker: string): string {
  const names: { [key: string]: string } = {
    'SPY': 'SPDR S&P 500', 'QQQ': 'Invesco QQQ Trust', 'IWM': 'iShares Russell 2000',
    'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corp', 'GOOGL': 'Alphabet Inc.',
    'NVDA': 'NVIDIA Corp', 'TSLA': 'Tesla Inc.', 'META': 'Meta Platforms',
    'XLK': 'Technology Select Sector SPDR Fund', 'XLF': 'Financial Select Sector SPDR Fund',
    'JPM': 'JPMorgan Chase', 'BAC': 'Bank of America', 'V': 'Visa Inc.',
    'GLD': 'SPDR Gold Trust', 'TLT': 'iShares 20+ Year Treasury Bond ETF'
  };
  return names[ticker] || ticker;
}

function getSectorForTicker(ticker: string): string {
  const sectorMap: { [key: string]: string } = {
    'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'NVDA': 'Technology',
    'JPM': 'Financial Services', 'BAC': 'Financial Services', 'V': 'Financial Services',
    'JNJ': 'Health Care', 'PFE': 'Health Care', 'UNH': 'Health Care',
    'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy',
    'SPY': 'Index Fund', 'QQQ': 'Index Fund', 'IWM': 'Index Fund',
    'TLT': 'Fixed Income', 'GLD': 'Commodities'
  };
  return sectorMap[ticker] || 'Other';
}

function formatVolume(volume: number): string {
  if (volume >= 1e9) return (volume / 1e9).toFixed(1) + 'B';
  if (volume >= 1e6) return (volume / 1e6).toFixed(1) + 'M';
  if (volume >= 1e3) return (volume / 1e3).toFixed(1) + 'K';
  return volume.toString();
}

function getTrend(performance: string): string {
  const perf = parseFloat(performance);
  if (perf > 2) return 'Strong Up';
  if (perf > 0) return 'Up';
  if (perf < -2) return 'Strong Down';
  return 'Down';
}

function getDemandSupply(performance: string): string {
  const perf = parseFloat(performance);
  if (perf > 1) return 'High Demand';
  if (perf > 0) return 'Moderate Demand';
  if (perf < -1) return 'High Supply';
  return 'Moderate Supply';
}

function getOptionsSentiment(performance: string): string {
  const perf = parseFloat(performance);
  if (perf > 1.5) return 'Very Bullish';
  if (perf > 0) return 'Bullish';
  if (perf < -1.5) return 'Very Bearish';
  return 'Bearish';
}

function getGammaRisk(performance: string): string {
  const perf = parseFloat(performance);
  const absPerf = Math.abs(perf);
  if (absPerf > 3) return 'High';
  if (absPerf > 1) return 'Medium';
  return 'Low';
}

function getUnusualActivity(performance: string, type: 'ATM' | 'OTM'): string {
  const perf = parseFloat(performance);
  const absPerf = Math.abs(perf);
  if (absPerf > 2) return 'High';
  if (absPerf > 1) return 'Medium';
  return 'Low';
}

function getOTMSkew(performance: string): string {
  const perf = parseFloat(performance);
  if (perf > 1) return 'Call Skew';
  if (perf < -1) return 'Put Skew';
  return 'Neutral';
}

function getIntradayFlow(performance: string): string {
  const perf = parseFloat(performance);
  if (perf > 0.5) return 'Strong Inflow';
  if (perf > 0) return 'Inflow';
  if (perf < -0.5) return 'Strong Outflow';
  return 'Outflow';
}

function getPutCallRatio(performance: string): string {
  const perf = parseFloat(performance);
  if (perf > 1) return 'Low (Bullish)';
  if (perf > 0) return 'Moderate';
  if (perf < -1) return 'High (Bearish)';
  return 'Elevated';
}

function calculateAveragePerformance(data: any[]): string {
  const sum = data.reduce((acc, item) => acc + parseFloat(item.performance), 0);
  return (sum / data.length).toFixed(2) + '%';
}

function calculateTotalVolume(data: any[]): string {
  const total = data.reduce((acc, item) => {
    const volume = parseInt(item.volume.replace(/[BMK]/g, '')) || 0;
    const multiplier = item.volume.includes('B') ? 1e9 : item.volume.includes('M') ? 1e6 : item.volume.includes('K') ? 1e3 : 1;
    return acc + (volume * multiplier);
  }, 0);
  return formatVolume(total);
}

function getMarketSentiment(data: any[]): string {
  const bullish = data.filter(item => parseFloat(item.performance) > 0).length;
  const bearish = data.filter(item => parseFloat(item.performance) < 0).length;
  
  if (bullish > bearish * 1.2) return 'Bullish';
  if (bearish > bullish * 1.2) return 'Bearish';
  return 'Neutral';
}
