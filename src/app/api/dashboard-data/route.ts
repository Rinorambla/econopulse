export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextResponse, NextRequest } from 'next/server';
import { getTiingoMarketData } from '@/lib/tiingo';
import { getYahooQuotes, convertYahooToMarketData } from '@/lib/yahooFinance';
import { marketCache, portfolioCache, getCacheKey, formatCacheStatus } from '@/lib/cache';

interface MarketDataItem {
  ticker: string;
  name: string;
  price: string;
  change: string;
  performance: string;
  volume: string;
  rawVolume?: number;
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
  category?: string; // Core / Factor / Thematic / Commodity / International / Crypto / Forex / LargeCap
  // Added AI signal enrichment (deterministic, no randomness)
  aiSignal?: {
    momentum: number;          // 0-100 scaled intraday momentum score
    relativeStrength: number;  // 0-100 percentile vs universe
    volatility: 'Low'|'Normal'|'High'|'Extreme';
    breakout: boolean;         // basic breakout condition
    meanReversion: 'Overbought'|'Oversold'|'Neutral';
    compositeScore: number;    // 0-100 composite
    label: 'STRONG BUY'|'BUY'|'HOLD'|'SELL'|'STRONG SELL';
    rationale: string;         // short explanation string
    version: string;           // version tag for methodology tracking
  };
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

// CORE SYMBOL UNIVERSE (balanced breadth, fast response)
const CORE_SYMBOLS = [
  // === MAJOR INDICES & BROAD MARKET ETFs ===
  'SPY','QQQ','IWM','DIA','VTI','VOO','VEA','VWO','EFA','EEM','ITOT','SPLG','SPDW','SPEM','SPTM',

  // === SECTOR ETFs ===
  'XLK','XLF','XLE','XLI','XLV','XLY','XLP','XLB','XLU','XLRE','VGT','VFH','VDE','VIS','VHT','VCR','VDC','VAW','VPU','VNQ',

  // === FACTOR / STYLE ===
  'RSP','MTUM','QUAL','VLUE','USMV','SPLV','VYM','DVY','SCHD','IWF','IWD','MGK','MGV',

  // === BOND & FIXED INCOME ETFs ===
  'AGG','BND','TLT','SHY','IEF','TIP','LQD','HYG','EMB','VGIT','VGSH','VGLT','VTEB',

  // === COMMODITIES & PRECIOUS METALS ETFs ===
  'GLD','SLV','GDX','GDXJ','IAU','DBO','USO','UNG','PDBC','OIH','XME',

  // === COMMODITY / RESOURCE THEMES ===
  'DBA','WEAT','CORN','SOYB','CPER','URA','LIT','TAN','ICLN','WOOD','PHO','XOP','XRT','XHB','SIL',

  // === THEMATIC / TECH / INNOVATION ===
  'SOXX','SMH','CLOU','SKYY','HACK','CIBR','BOTZ','ROBO','ARKK','ARKW','XBI','IBB','ITA','XAR','KWEB','KRE','IHI','XPH',

  // === INTERNATIONAL & EMERGING MARKETS ETFs ===
  'IEFA','IEMG','IXUS','VXUS','FXI','EWJ','EWZ','RSX','INDA','MCHI','EWY','EWT','EWH','EWW','EZA','EWC','EWU','EWG','EWQ','EWI','EWL','EWS','EWK','EWD',

  // === GROWTH & VALUE ETFs (core duplicates kept intentionally for clarity) ===
  'VUG','VTV','IVW','IVE','VBK','VBR','SPYG','SPYV',

  // === MEGA / LARGE CAP INDIVIDUAL STOCKS ===
  'AAPL','MSFT','GOOGL','AMZN','TSLA','NVDA','META','NFLX','JPM','BAC','V','MA','JNJ','PG','UNH','HD',
  'WMT','DIS','PFE','ABBV','ORCL','CRM','ADBE','INTC','AMD','CSCO','KO','PEP','NKE','MCD','COST','T','VZ','BA','GE','CAT','MS','GS','BK','BLK','SCHW','AVGO','ASML','SAP','BHP','RIO','SHEL'
];

// EXTENDED SYMBOLS (added when scope=full) – curated large caps, additional themes, commodities, volatility
const EXTENDED_SYMBOLS = [
  // Additional Large Caps / S&P style breadth
  'ABT','ACN','ADP','AIG','ALGN','AMAT','AMGN','ANET','BKNG','BMY','C','CMCSA','COP','CSX','DE','DUK','EL','ETN','EXC','F','FDX','GD','GM','HON','IBM','LMT','LOW','MAR','MMM','MO','MRK','NEE','NOW','PANW','PYPL','QCOM','SBUX','SO','SPGI','TGT','TXN','UPS','WFC','ZTS','ABNB','PLTR','SNOW','SHOP','UBER','LYFT','TSM','BABA','JD','NIO','TCEHY',
  // Additional Thematic / Factor / Niche ETFs
  'VIXY','UVXY','SVXY','BUG','CIBR','FIVG','CLOU','CLEAN','PHO','GRID','IDRV','PAVE','DRIV','FINX','XT','XTL',
  // Additional Commodities / Agri
  'JO','SGG','NIB','CANE','GLDM','KRBN',
  // Additional International single-country ETFs
  'EPU','EIRL','EIS','ENZL','EPOL','ECH','EPI','SCHE','SCHF','SCHC',
  // REIT / Real Estate breadth
  'SCHH','IYR','REET','XLRE',
  // Additional Bonds / Yield curve
  'BIL','SHV','IEF','ZROZ','EDV','HYG','JNK','BKLN','SRLN'
];

// Remove duplicates and ensure unique symbols
function buildUniverse(scope: string, limit?: number) {
  const base = [...CORE_SYMBOLS];
  if (scope === 'full') base.push(...EXTENDED_SYMBOLS);
  const uniq = [...new Set(base)];
  const maxEnv = parseInt(process.env.MAX_SYMBOL_UNIVERSE || '',10);
  const hardCap = !isNaN(maxEnv) ? maxEnv : 600; // raised to maximize ticker breadth on dashboard
  const appliedLimit = Math.min(limit || hardCap, hardCap);
  return uniq.slice(0, appliedLimit);
}

// Parsed per-request universe (decided inside handler)
let REQUESTED_UNIVERSE: string[] = [];

// Crypto & Forex sets (kept small to avoid latency spikes); can be toggled by query later
const CRYPTO_SYMBOLS: string[] = ['BTCUSD','ETHUSD','SOLUSD','XRPUSD'];
const FOREX_PAIRS: string[] = ['EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD'];

// Cache and performance optimization

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  console.log('\n🚀 Dashboard API called');
  
  try {
    const url = new URL(req.url);
    const scope = (url.searchParams.get('scope') || 'core').toLowerCase(); // core | full
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam,10) : undefined;
    const includeCrypto = url.searchParams.get('crypto') === '1';
    const includeForex = url.searchParams.get('forex') === '1';

    REQUESTED_UNIVERSE = buildUniverse(scope, limit);
    console.log(`📦 Universe scope=${scope} size=${REQUESTED_UNIVERSE.length} (limit=${limit||'default'})`);
    (global as any).__dashboard_request_meta = { scope, size: REQUESTED_UNIVERSE.length, includeCrypto, includeForex };

    // Force garbage collection at start
    forceGarbageCollection();
    
    // Create the request promise  
    const result = await withTimeout(
      handleDashboardRequest({ scope, includeCrypto, includeForex }),
      58000,
      'Dashboard request'
    );
    
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
  }
}

interface DashboardParams { scope: string; includeCrypto: boolean; includeForex: boolean; }
async function handleDashboardRequest(params: DashboardParams) {
  const { scope, includeCrypto, includeForex } = params;
  // Check advanced cache first
  const marketCacheKey = getCacheKey('market_data', { symbols: REQUESTED_UNIVERSE.length, scope });
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

  console.log('🔄 Fetching fresh data from Tiingo (equities/etfs)... universe size', REQUESTED_UNIVERSE.length);
  if (REQUESTED_UNIVERSE.length > 400) {
    console.warn('⚠️ Requested universe too large, trimming for safety');
    REQUESTED_UNIVERSE = REQUESTED_UNIVERSE.slice(0, 400);
  }
  const tiingoData = await withTimeout(
    getTiingoMarketData(REQUESTED_UNIVERSE),
    50000,
    'Tiingo market data fetch'
  );

  // Optionally extend with crypto & forex (best-effort; failures are ignored to keep core fast)
  let cryptoData: any[] = [];
  let forexData: any[] = [];
  if (includeCrypto || includeForex) {
    try {
      const { getTiingoCrypto, getTiingoForex } = await import('@/lib/tiingo');
      if (includeCrypto) cryptoData = await withTimeout(getTiingoCrypto(CRYPTO_SYMBOLS), 12000, 'Crypto fetch');
      if (includeForex) forexData = await withTimeout(getTiingoForex(FOREX_PAIRS), 12000, 'Forex fetch');
    } catch (e) {
      console.warn('⚠️  Crypto/Forex extension failed (non-blocking):', e);
    }
  }
  
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

  console.log('🎯 First Tiingo data item:', JSON.stringify(tiingoData[0], null, 2));

  // Pre-compute volume statistics for relative-volume ranking
  const allVolumes = tiingoData.map((item: any) => item.volume || 0).sort((a: number, b: number) => a - b);

  const dashboardData: MarketDataItem[] = tiingoData.map((item: any) => {
    const perf = item.changePercent || 0; // already a percentage (e.g. 1.5 for 1.5%)
    const performanceStr = perf.toFixed(2) + '%';
    const sector = getSectorForTicker(item.symbol);
    const vol = item.volume || 0;
    const price = item.price || 0;
    const sym = item.symbol || '';
    const volPct = volPercentile(vol, allVolumes);
    
    return {
      ticker: sym,
      name: getTickerName(sym),
      price: price.toFixed(2),
      change: (item.change || 0).toFixed(2),
      performance: performanceStr,
      volume: formatVolume(vol),
      rawVolume: vol,
      trend: getTrend(perf, volPct),
      demandSupply: getDemandSupply(perf, volPct, sym),
      optionsSentiment: getOptionsSentiment(perf, volPct, sym),
      gammaRisk: getGammaRisk(perf, volPct, sym),
      unusualAtm: getUnusualActivity(perf, volPct, 'ATM', sym),
      unusualOtm: getUnusualActivity(perf, volPct, 'OTM', sym),
      otmSkew: getOTMSkew(perf, volPct, sym),
      intradayFlow: getIntradayFlow(perf, volPct, sym),
      putCallRatio: getPutCallRatio(perf, volPct, price, sym),
      sector: sector,
      direction: perf >= 0 ? 'up' : 'down',
      category: deriveCategory(sym)
    };
  });

  // Append crypto
  if (cryptoData && cryptoData.length) {
    for (const c of cryptoData) {
      if (!c) continue;
      const cPerf = (c.changePercent) || 0;
      const perfStr = cPerf.toFixed(2) + '%';
      const cVol = c.volume || 0;
      const cSym = c.symbol || '';
      dashboardData.push({
        ticker: cSym,
        name: cSym.replace('USD','').toUpperCase() + ' / USD',
        price: (c.price || 0).toFixed(2),
        change: (c.change || 0).toFixed(2),
        performance: perfStr,
        volume: formatVolume(cVol),
        rawVolume: cVol,
        trend: getTrend(cPerf, 50),
        demandSupply: getDemandSupply(cPerf, 50, cSym),
        optionsSentiment: getOptionsSentiment(cPerf, 50, cSym),
        gammaRisk: getGammaRisk(cPerf, 50, cSym),
        unusualAtm: getUnusualActivity(cPerf, 50, 'ATM', cSym),
        unusualOtm: getUnusualActivity(cPerf, 50, 'OTM', cSym),
        otmSkew: getOTMSkew(cPerf, 50, cSym),
        intradayFlow: getIntradayFlow(cPerf, 50, cSym),
        putCallRatio: getPutCallRatio(cPerf, 50, c.price || 100, cSym),
        sector: 'Cryptocurrency',
        direction: cPerf >= 0 ? 'up' : 'down',
        category: 'Crypto'
      });
    }
  }
  // Append forex (treat as low-vol instruments; some fields neutral)
  if (forexData && forexData.length) {
    for (const f of forexData) {
      if (!f) continue;
      // Forex quote lacks changePercent in our simplified object; set 0 for now (future: compute via previous mid)
      const perf = '0.00%';
      dashboardData.push({
        ticker: f.symbol,
        name: f.symbol.replace(/([A-Z]{3})([A-Z]{3})/, '$1/$2'),
        price: (f.price || 0).toFixed(5),
        change: '0.00',
        performance: perf,
        volume: '—',
        trend: 'Down',
        demandSupply: 'Moderate Supply',
        optionsSentiment: 'Neutral Flow',
        gammaRisk: 'Low',
        unusualAtm: 'Low',
        unusualOtm: 'Low',
        otmSkew: 'Neutral',
        intradayFlow: 'Delta Neutral',
        putCallRatio: '1.00',
        sector: 'Forex',
        direction: 'up',
        category: 'Forex'
      });
    }
  }

  // === AI Signal Enrichment (multi-factor with volume weighting) ===
  // Compute strength scores blending performance + relative volume
  const strengthScores = dashboardData.map(d => {
    const p = parseFloat(d.performance);
    const rv = d.rawVolume || 0;
    const vp = volPercentile(rv, allVolumes);
    // Strength = perf direction amplified by relative volume
    return p * (1 + (vp - 50) / 200);
  });
  const sortedStrength = [...strengthScores].sort((a, b) => a - b);
  const strengthPctl = (v: number) => {
    if (sortedStrength.length <= 1) return 50;
    // Binary search for approximate position (avoids indexOf tie bugs)
    let lo = 0, hi = sortedStrength.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (sortedStrength[mid] <= v) lo = mid; else hi = mid - 1; }
    return +(lo / (sortedStrength.length - 1) * 100).toFixed(1);
  };
  const versionTag = 'ai-signal-v2-2026-03';
  dashboardData.forEach((d: MarketDataItem, idx: number) => {
    const perf = parseFloat(d.performance);
    const rv = d.rawVolume || 0;
    const vp = volPercentile(rv, allVolumes);
    // Momentum: perf mapped to 0..100, volume-confirmed
    const baseMom = Math.max(0, Math.min(100, ((perf + 5) / 10) * 100));
    const volBoost = (vp - 50) / 100 * 15; // ±7.5 from volume
    const momentum = Math.max(0, Math.min(100, baseMom + (perf > 0 ? volBoost : -volBoost)));
    const relativeStrength = strengthPctl(strengthScores[idx]);
    const absPerf = Math.abs(perf);
    const volatility: 'Low'|'Normal'|'High'|'Extreme' = absPerf < 0.5 ? 'Low' : absPerf < 1.5 ? 'Normal' : absPerf < 3 ? 'High' : 'Extreme';
    const breakout = perf > 2.5 && vp > 40;
    const meanReversion: 'Overbought'|'Oversold'|'Neutral' = perf > 3 ? 'Overbought' : perf < -3 ? 'Oversold' : 'Neutral';
    // Composite: blend momentum, RS, and volume conviction
    let composite = 0.4 * momentum + 0.4 * relativeStrength + 0.2 * vp;
    if (volatility === 'Extreme') composite *= 0.9;
    composite = Math.round(composite);
    let label: 'STRONG BUY'|'BUY'|'HOLD'|'SELL'|'STRONG SELL';
    if (composite >= 80) label = 'STRONG BUY';
    else if (composite >= 60) label = 'BUY';
    else if (composite >= 40) label = 'HOLD';
    else if (composite >= 20) label = 'SELL';
    else label = 'STRONG SELL';
    const rationaleParts: string[] = [];
    rationaleParts.push(`Perf ${perf.toFixed(2)}% (RS ${relativeStrength.toFixed(0)})`);
    if (breakout) rationaleParts.push('Breakout');
    if (meanReversion === 'Overbought') rationaleParts.push('Overbought');
    if (meanReversion === 'Oversold') rationaleParts.push('Oversold');
    rationaleParts.push(`Vol ${volatility}`);
    d.aiSignal = {
      momentum: +momentum.toFixed(1),
      relativeStrength: +relativeStrength.toFixed(1),
      volatility,
      breakout,
      meanReversion,
      compositeScore: composite,
      label,
      rationale: rationaleParts.join(' | '),
      version: versionTag
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
    cacheStatus: 'MISS',
    universe: {
      scope,
      symbols: REQUESTED_UNIVERSE.length,
      crypto: includeCrypto ? CRYPTO_SYMBOLS.length : 0,
      forex: includeForex ? FOREX_PAIRS.length : 0
    }
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
    },
    'STAGFLATION': {
      name: 'Stagflation',
      description: 'High inflation with stagnant growth',
      performance: { daily: '-0.45%', weekly: '-1.8%', monthly: '-3.5%', quarterly: '-2.1%', yearly: '5.2%' },
      holdings: [
        { ticker: 'DBC', name: 'Invesco DB Commodity Index', weight: 30, price: 25.80, performance: { daily: '1.2%' }, change: 0.31 },
        { ticker: 'XLE', name: 'Energy Select Sector SPDR Fund', weight: 25, price: 78.90, performance: { daily: '2.1%' }, change: 1.66 },
        { ticker: 'TIP', name: 'iShares TIPS Bond ETF', weight: 20, price: 115.40, performance: { daily: '0.3%' }, change: 0.35 },
        { ticker: 'GLD', name: 'SPDR Gold Trust', weight: 15, price: 195.50, performance: { daily: '0.8%' }, change: 1.56 },
        { ticker: 'VTV', name: 'Vanguard Value ETF', weight: 10, price: 165.20, performance: { daily: '-0.2%' }, change: -0.33 }
      ]
    },
    'REFLATION': {
      name: 'Reflation',
      description: 'Rising inflation with economic recovery',
      performance: { daily: '1.15%', weekly: '3.2%', monthly: '6.8%', quarterly: '12.4%', yearly: '18.6%' },
      holdings: [
        { ticker: 'XLI', name: 'Industrial Select Sector SPDR Fund', weight: 25, price: 125.60, performance: { daily: '1.8%' }, change: 2.26 },
        { ticker: 'XLF', name: 'Financial Select Sector SPDR Fund', weight: 25, price: 42.30, performance: { daily: '1.5%' }, change: 0.63 },
        { ticker: 'IWM', name: 'iShares Russell 2000 ETF', weight: 20, price: 215.80, performance: { daily: '1.2%' }, change: 2.59 },
        { ticker: 'EEM', name: 'iShares MSCI Emerging Markets ETF', weight: 15, price: 41.90, performance: { daily: '0.9%' }, change: 0.38 },
        { ticker: 'DBC', name: 'Invesco DB Commodity Index', weight: 15, price: 25.80, performance: { daily: '2.1%' }, change: 0.54 }
      ]
    },
    'DEFLATION': {
      name: 'Deflation',
      description: 'Falling prices and economic contraction',
      performance: { daily: '-0.65%', weekly: '-2.1%', monthly: '-5.2%', quarterly: '-8.9%', yearly: '1.8%' },
      holdings: [
        { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', weight: 40, price: 85.20, performance: { daily: '1.2%' }, change: 1.02 },
        { ticker: 'LQD', name: 'iShares iBoxx Investment Grade Corp', weight: 25, price: 105.80, performance: { daily: '0.5%' }, change: 0.53 },
        { ticker: 'SHY', name: 'iShares 1-3 Year Treasury Bond ETF', weight: 20, price: 82.15, performance: { daily: '0.1%' }, change: 0.08 },
        { ticker: 'XLU', name: 'Utilities Select Sector SPDR Fund', weight: 10, price: 65.80, performance: { daily: '0.2%' }, change: 0.13 },
        { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', weight: 5, price: 285.70, performance: { daily: '-1.1%' }, change: -3.14 }
      ]
    },
    'DISINFLATION_SOFT_LANDING': {
      name: 'Disinflation Soft Landing',
      description: 'Controlled inflation decline with stable growth',
      performance: { daily: '0.75%', weekly: '2.8%', monthly: '5.1%', quarterly: '9.8%', yearly: '15.2%' },
      holdings: [
        { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', weight: 30, price: 285.70, performance: { daily: '0.8%' }, change: 2.29 },
        { ticker: 'QQQ', name: 'Invesco QQQ Trust', weight: 25, price: 385.50, performance: { daily: '1.1%' }, change: 4.24 },
        { ticker: 'IEF', name: 'iShares 7-10 Year Treasury Bond ETF', weight: 20, price: 95.45, performance: { daily: '0.3%' }, change: 0.29 },
        { ticker: 'FXF', name: 'Invesco CurrencyShares Swiss Franc', weight: 15, price: 92.30, performance: { daily: '0.2%' }, change: 0.18 },
        { ticker: 'IXUS', name: 'iShares Core MSCI Total International', weight: 10, price: 68.90, performance: { daily: '0.5%' }, change: 0.34 }
      ]
    },
    'DOLLAR_WEAKNESS_GLOBAL_REBALANCING': {
      name: 'Dollar Weakness & Global Rebalancing',
      description: 'Weak USD with international diversification',
      performance: { daily: '0.95%', weekly: '3.5%', monthly: '7.2%', quarterly: '14.1%', yearly: '22.3%' },
      holdings: [
        { ticker: 'EEM', name: 'iShares MSCI Emerging Markets ETF', weight: 30, price: 41.90, performance: { daily: '1.5%' }, change: 0.63 },
        { ticker: 'FXF', name: 'Invesco CurrencyShares Swiss Franc', weight: 25, price: 92.30, performance: { daily: '0.8%' }, change: 0.74 },
        { ticker: 'IXUS', name: 'iShares Core MSCI Total International', weight: 20, price: 68.90, performance: { daily: '1.2%' }, change: 0.83 },
        { ticker: 'DBC', name: 'Invesco DB Commodity Index', weight: 15, price: 25.80, performance: { daily: '1.8%' }, change: 0.46 },
        { ticker: 'BIL', name: 'SPDR Bloomberg 1-3 Month T-Bill ETF', weight: 10, price: 91.45, performance: { daily: '0.1%' }, change: 0.09 }
      ]
    }
  };
}

// Helper functions
function getTickerName(ticker: string): string {
  const names: { [key: string]: string } = {
    // === MAJOR INDICES & BROAD MARKET ETFs ===
    'SPY': 'SPDR S&P 500', 'QQQ': 'Invesco QQQ Trust', 'IWM': 'iShares Russell 2000',
    'DIA': 'SPDR Dow Jones', 'VTI': 'Vanguard Total Stock Market', 'VOO': 'Vanguard S&P 500',
    'VEA': 'Vanguard FTSE Developed', 'VWO': 'Vanguard FTSE Emerging', 'EFA': 'iShares MSCI EAFE',
    'EEM': 'iShares MSCI Emerging Markets', 'ITOT': 'iShares Core S&P Total US',
    'SPLG': 'SPDR Portfolio S&P 500', 'SPDW': 'SPDR Portfolio World ex-US',
    'SPEM': 'SPDR Portfolio Emerging Markets', 'SPTM': 'SPDR Portfolio S&P 1500',
    
    // === SECTOR ETFs ===
    'XLK': 'Technology Select Sector', 'XLF': 'Financial Select Sector', 'XLE': 'Energy Select Sector',
    'XLI': 'Industrial Select Sector', 'XLV': 'Health Care Select Sector', 'XLY': 'Consumer Discretionary Select',
    'XLP': 'Consumer Staples Select', 'XLB': 'Materials Select Sector', 'XLU': 'Utilities Select Sector',
    'XLRE': 'Real Estate Select Sector', 'VGT': 'Vanguard Information Technology', 'VFH': 'Vanguard Financials',
    'VDE': 'Vanguard Energy', 'VIS': 'Vanguard Industrials', 'VHT': 'Vanguard Health Care',
    'VCR': 'Vanguard Consumer Discretionary', 'VDC': 'Vanguard Consumer Staples', 'VAW': 'Vanguard Materials',
    'VPU': 'Vanguard Utilities', 'VNQ': 'Vanguard Real Estate',
    
    // === BOND & FIXED INCOME ETFs ===
    'AGG': 'iShares Core US Aggregate Bond', 'BND': 'Vanguard Total Bond Market',
    'TLT': 'iShares 20+ Year Treasury', 'SHY': 'iShares 1-3 Year Treasury',
    'IEF': 'iShares 7-10 Year Treasury', 'TIP': 'iShares TIPS Bond',
    'LQD': 'iShares Investment Grade Corporate', 'HYG': 'iShares High Yield Corporate',
    'EMB': 'iShares JP Morgan USD Emerging Markets', 'VGIT': 'Vanguard Intermediate-Term Treasury',
    'VGSH': 'Vanguard Short-Term Treasury', 'VGLT': 'Vanguard Long-Term Treasury',
    'VTEB': 'Vanguard Tax-Exempt Bond',
    
    // === COMMODITIES & PRECIOUS METALS ETFs ===
    'GLD': 'SPDR Gold Trust', 'SLV': 'iShares Silver Trust', 'GDX': 'VanEck Gold Miners',
    'GDXJ': 'VanEck Junior Gold Miners', 'IAU': 'iShares Gold Trust', 'DBO': 'Invesco DB Oil Fund',
    'USO': 'United States Oil Fund', 'UNG': 'United States Natural Gas', 'PDBC': 'Invesco Optimum Yield Diversified Commodity',
    'OIH': 'VanEck Oil Services', 'XME': 'SPDR S&P Metals & Mining',
    
    // === INTERNATIONAL & EMERGING MARKETS ETFs ===
    'IEFA': 'iShares Core MSCI EAFE', 'IEMG': 'iShares Core MSCI Emerging Markets',
    'IXUS': 'iShares Core MSCI Total International', 'VXUS': 'Vanguard Total International Stock',
    'FXI': 'iShares China Large-Cap', 'EWJ': 'iShares MSCI Japan', 'EWZ': 'iShares MSCI Brazil',
    'RSX': 'VanEck Russia', 'INDA': 'iShares MSCI India', 'MCHI': 'iShares MSCI China',
    
    // === GROWTH & VALUE ETFs ===
    'VUG': 'Vanguard Growth', 'VTV': 'Vanguard Value', 'IVW': 'iShares S&P 500 Growth',
    'IVE': 'iShares S&P 500 Value', 'VBK': 'Vanguard Small-Cap Growth', 'VBR': 'Vanguard Small-Cap Value',
    'IWF': 'iShares Russell 1000 Growth', 'IWD': 'iShares Russell 1000 Value',
    'MGK': 'Vanguard Mega Cap Growth', 'MGV': 'Vanguard Mega Cap Value',
    'SPYG': 'SPDR S&P 500 Growth', 'SPYV': 'SPDR S&P 500 Value',
    
    // === INDIVIDUAL STOCKS ===
    'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corp', 'GOOGL': 'Alphabet Inc.',
    'NVDA': 'NVIDIA Corp', 'TSLA': 'Tesla Inc.', 'META': 'Meta Platforms',
    'AMZN': 'Amazon.com Inc.', 'NFLX': 'Netflix Inc.',
    'JPM': 'JPMorgan Chase', 'BAC': 'Bank of America', 'V': 'Visa Inc.', 'MA': 'Mastercard Inc.',
    'JNJ': 'Johnson & Johnson', 'PG': 'Procter & Gamble', 'UNH': 'UnitedHealth Group', 'HD': 'Home Depot'
  };
  return names[ticker] || ticker;
}

function deriveCategory(symbol: string): string {
  if (symbol.endsWith('USD') || symbol.length === 6 && /[A-Z]{6}/.test(symbol)) return 'Crypto';
  if (/^EURUSD|GBPUSD|USDJPY|USDCHF|USDCAD$/.test(symbol)) return 'Forex';
  // Thematic lists
  const factor = new Set(['RSP','MTUM','QUAL','VLUE','USMV','SPLV','VYM','DVY','SCHD']);
  if (factor.has(symbol)) return 'Factor';
  const thematic = new Set(['SOXX','SMH','CLOU','SKYY','HACK','CIBR','BOTZ','ROBO','ARKK','ARKW','XBI','IBB','ITA','XAR','KWEB','KRE','IHI','XPH']);
  if (thematic.has(symbol)) return 'Thematic';
  const commodity = new Set(['GLD','SLV','GDX','GDXJ','IAU','DBO','USO','UNG','PDBC','DBA','WEAT','CORN','SOYB','CPER','URA','LIT','TAN','ICLN','WOOD','PHO','XOP','XRT','XHB','SIL','XME','OIH']);
  if (commodity.has(symbol)) return 'Commodity';
  const international = new Set(['VEA','VWO','EFA','EEM','IEFA','IEMG','IXUS','VXUS','FXI','EWJ','EWZ','RSX','INDA','MCHI','EWY','EWT','EWH','EWW','EZA','EWC','EWU','EWG','EWQ','EWI','EWL','EWS','EWK','EWD']);
  if (international.has(symbol)) return 'International';
  const largeCap = new Set(['AAPL','MSFT','GOOGL','AMZN','TSLA','NVDA','META','NFLX','JPM','BAC','V','MA','JNJ','PG','UNH','HD','WMT','DIS','PFE','ABBV','ORCL','CRM','ADBE','INTC','AMD','CSCO','KO','PEP','NKE','MCD','COST','T','VZ','BA','GE','CAT','MS','GS','BK','BLK','SCHW','AVGO','ASML','SAP','BHP','RIO','SHEL']);
  if (largeCap.has(symbol)) return 'LargeCap';
  return 'Core';
}

function getSectorForTicker(ticker: string): string {
  const sectorMap: { [key: string]: string } = {
    // === INDIVIDUAL STOCKS BY SECTOR ===
    'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'NVDA': 'Technology', 'META': 'Technology', 'NFLX': 'Technology',
    'JPM': 'Financial Services', 'BAC': 'Financial Services', 'V': 'Financial Services', 'MA': 'Financial Services',
    'JNJ': 'Health Care', 'UNH': 'Health Care',
    'AMZN': 'Consumer Discretionary', 'TSLA': 'Consumer Discretionary', 'HD': 'Consumer Discretionary',
    'PG': 'Consumer Staples',
    
    // === BROAD MARKET INDEX ETFs ===
    'SPY': 'Index Fund', 'QQQ': 'Index Fund', 'IWM': 'Index Fund', 'DIA': 'Index Fund',
    'VTI': 'Index Fund', 'VOO': 'Index Fund', 'ITOT': 'Index Fund', 'SPLG': 'Index Fund', 'SPTM': 'Index Fund',
    
    // === INTERNATIONAL ETFs ===
    'VEA': 'International', 'VWO': 'International', 'EFA': 'International', 'EEM': 'International',
    'SPDW': 'International', 'SPEM': 'International', 'IEFA': 'International', 'IEMG': 'International',
    'IXUS': 'International', 'VXUS': 'International', 'FXI': 'International', 'EWJ': 'International',
    'EWZ': 'International', 'RSX': 'International', 'INDA': 'International', 'MCHI': 'International',
    
    // === SECTOR ETFs ===
    'XLK': 'Technology', 'VGT': 'Technology',
    'XLF': 'Financial Services', 'VFH': 'Financial Services',
    'XLE': 'Energy', 'VDE': 'Energy',
    'XLI': 'Industrials', 'VIS': 'Industrials',
    'XLV': 'Health Care', 'VHT': 'Health Care',
    'XLY': 'Consumer Discretionary', 'VCR': 'Consumer Discretionary',
    'XLP': 'Consumer Staples', 'VDC': 'Consumer Staples',
    'XLB': 'Materials', 'VAW': 'Materials', 'XME': 'Materials',
    'XLU': 'Utilities', 'VPU': 'Utilities',
    'XLRE': 'Real Estate', 'VNQ': 'Real Estate',
    
    // === GROWTH & VALUE ETFs ===
    'VUG': 'Growth ETF', 'VTV': 'Value ETF', 'IVW': 'Growth ETF', 'IVE': 'Value ETF',
    'VBK': 'Growth ETF', 'VBR': 'Value ETF', 'IWF': 'Growth ETF', 'IWD': 'Value ETF',
    'MGK': 'Growth ETF', 'MGV': 'Value ETF', 'SPYG': 'Growth ETF', 'SPYV': 'Value ETF',
    
    // === BOND & FIXED INCOME ETFs ===
    'AGG': 'Fixed Income', 'BND': 'Fixed Income', 'TLT': 'Fixed Income', 'SHY': 'Fixed Income',
    'IEF': 'Fixed Income', 'TIP': 'Fixed Income', 'LQD': 'Fixed Income', 'HYG': 'Fixed Income',
    'EMB': 'Fixed Income', 'VGIT': 'Fixed Income', 'VGSH': 'Fixed Income', 'VGLT': 'Fixed Income',
    'VTEB': 'Fixed Income',
    
    // === COMMODITIES & PRECIOUS METALS ETFs ===
    'GLD': 'Commodities', 'SLV': 'Commodities', 'GDX': 'Commodities', 'GDXJ': 'Commodities',
    'IAU': 'Commodities', 'DBO': 'Commodities', 'USO': 'Commodities', 'UNG': 'Commodities',
    'PDBC': 'Commodities', 'OIH': 'Energy'
  };
  return sectorMap[ticker] || 'Other';
}

function formatVolume(volume: number): string {
  if (volume >= 1e9) return (volume / 1e9).toFixed(1) + 'B';
  if (volume >= 1e6) return (volume / 1e6).toFixed(1) + 'M';
  if (volume >= 1e3) return (volume / 1e3).toFixed(1) + 'K';
  return volume.toString();
}

// --- Multi-factor helpers: use performance, volume percentile, price, and symbol ---
// Deterministic per-symbol hash for varied but stable output
function symHash(sym: string): number {
  let h = 0;
  for (let i = 0; i < sym.length; i++) { h = ((h << 5) - h) + sym.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}
function symRand(sym: string, idx: number): number {
  const x = Math.sin(symHash(sym) + idx) * 10000;
  return x - Math.floor(x); // 0..1
}
// Volume percentile via binary search on sorted array
function volPercentile(vol: number, sorted: number[]): number {
  if (sorted.length <= 1) return 50;
  let lo = 0, hi = sorted.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (sorted[mid] <= vol) lo = mid; else hi = mid - 1; }
  return +(lo / (sorted.length - 1) * 100).toFixed(1);
}

function getTrend(perf: number, volPct: number): string {
  // Strong trend requires both move magnitude and volume conviction
  if (perf > 2 || (perf > 1.2 && volPct > 65)) return 'Strong Up';
  if (perf > 0) return 'Up';
  if (perf < -2 || (perf < -1.2 && volPct > 65)) return 'Strong Down';
  return 'Down';
}

function getDemandSupply(perf: number, volPct: number, sym: string): string {
  // Combine performance direction with volume intensity
  const base = symRand(sym, 1) * 0.4 - 0.2; // ±0.2 per symbol
  const score = perf * 0.6 + (volPct - 50) / 50 * 0.8 + base;
  if (score > 1.2) return 'High Demand';
  if (score > 0.15) return 'Moderate Demand';
  if (score < -1.2) return 'High Supply';
  if (score < -0.15) return 'Moderate Supply';
  return perf >= 0 ? 'Moderate Demand' : 'Moderate Supply';
}

function getOptionsSentiment(perf: number, volPct: number, sym: string): string {
  const base = symRand(sym, 2);
  const intensity = Math.abs(perf) * 0.5 + volPct / 100 * 0.5;
  if (perf > 0) {
    if (intensity > 0.75 && perf > 1.5) return 'FOMO Buying';
    if (intensity > 0.55) return 'Squeeze Alert';
    if (intensity > 0.35 || base > 0.7) return 'Stealth Bull';
    return 'Neutral Flow';
  } else {
    if (intensity > 0.75 && perf < -1.5) return 'Stealth Bear';
    if (intensity > 0.55) return 'Fear Selling';
    if (intensity > 0.35 || base > 0.7) return 'Put Storm';
    return 'Neutral Flow';
  }
}

function getGammaRisk(perf: number, volPct: number, sym: string): string {
  const base = symRand(sym, 3) * 0.25;
  const score = Math.abs(perf) * 0.35 + volPct / 100 * 0.40 + base;
  if (score > 0.70) return 'High';
  if (score > 0.40) return 'Medium';
  return 'Low';
}

function getUnusualActivity(perf: number, volPct: number, type: 'ATM' | 'OTM', sym: string): string {
  const base = symRand(sym, type === 'ATM' ? 4 : 5);
  let score: number;
  if (type === 'ATM') {
    // ATM unusual is mostly about volume concentration
    score = volPct / 100 * 0.55 + Math.abs(perf) * 0.15 + base * 0.30;
  } else {
    // OTM unusual is about large moves driving speculative flow
    score = Math.abs(perf) * 0.30 + volPct / 100 * 0.30 + base * 0.40;
  }
  if (score > 0.62) return 'High';
  if (score > 0.38) return 'Medium';
  return 'Low';
}

function getOTMSkew(perf: number, volPct: number, sym: string): string {
  const base = symRand(sym, 6);
  if (perf > 1.3 && volPct > 35) return 'Call Skew';
  if (perf > 0.6 && base > 0.55) return 'Call Skew';
  if (perf < -1.3 && volPct > 35) return 'Put Skew';
  if (perf < -0.6 && base > 0.55) return 'Put Skew';
  if (Math.abs(perf) < 0.4 && volPct < 50) return 'Neutral';
  return base > 0.6 ? (perf > 0 ? 'Call Skew' : 'Put Skew') : 'Neutral';
}

function getIntradayFlow(perf: number, volPct: number, sym: string): string {
  const base = symRand(sym, 7);
  const conviction = Math.abs(perf) * 0.45 + volPct / 100 * 0.55;
  if (perf > 0) {
    if (conviction > 0.70) return 'Gamma Bull';
    if (conviction > 0.50) return base > 0.4 ? 'Buy to Open' : 'Gamma Bull';
    if (conviction > 0.30) return base > 0.5 ? 'Call hedging' : 'Buy to Open';
    return 'Delta Neutral';
  } else {
    if (conviction > 0.70) return 'Put selling';
    if (conviction > 0.50) return base > 0.4 ? 'Hedge Flow' : 'Put selling';
    if (conviction > 0.30) return base > 0.5 ? 'Hedge Flow' : 'Delta Neutral';
    return 'Delta Neutral';
  }
}

function getPutCallRatio(perf: number, volPct: number, price: number, sym: string): string {
  // Continuous multi-factor P/C ratio (not bucketed)
  let ratio = 1.0;
  // Performance: bullish → lower P/C, bearish → higher
  ratio -= perf * 0.09;
  // Volume conviction amplifies the directional signal
  const volAmp = (volPct - 50) / 250;
  ratio -= perf > 0 ? volAmp : -volAmp;
  // Price tier: higher-priced stocks have more institutional hedging
  if (price > 300) ratio += 0.06;
  else if (price > 100) ratio += 0.03;
  else if (price < 20) ratio -= 0.04;
  // Per-symbol base variation (deterministic)
  ratio += (symRand(sym, 8) - 0.5) * 0.28;
  // Index ETFs have more hedging demand
  const isIdx = ['SPY','QQQ','IWM','DIA','VTI','VOO'].includes(sym);
  if (isIdx) ratio += 0.10;
  return Math.max(0.22, Math.min(1.95, ratio)).toFixed(2);
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
