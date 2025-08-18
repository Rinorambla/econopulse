import { NextResponse } from 'next/server';
import { getTiingoMarketData } from '@/lib/tiingo';

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

// Cache for dashboard data with improved caching
let cachedData: { data: MarketDataItem[], timestamp: number } | null = null;
let cachedPortfolios: { data: any, timestamp: number } | null = null;
const CACHE_DURATION = 900000; // 15 minutes cache (increased for better performance)
const PORTFOLIO_CACHE_DURATION = 600000; // 10 minutes cache for portfolios
const TIINGO_REQUEST_DELAY = 100; // 100ms delay between Tiingo API calls to avoid rate limits

// TIINGO SUPPORTED SYMBOLS
const TIINGO_SYMBOLS = [
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO',
  'XLF', 'XLE', 'XLI', 'XLK', 'XLP', 'XLU', 'XLV', 'XLB', 'XLY', 'XLRE',
  'VDE', 'VDC', 'VIS', 'VGT', 'VNQ', 'VAW', 'VCR', 'VPU', 'VOX',
  'VEA', 'VWO', 'EFA', 'EEM', 'IEFA', 'IEMG', 'VGK',
  'AGG', 'BND', 'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'JNK', 'TIP', 'VTEB',
  'GLD', 'SLV', 'USO', 'UNG', 'DBA', 'DBC',
  'UUP', 'FXE', 'FXY', 'FXB', 'UDN', 'FXF',
  'BITO',
  // Economic Regime ETFs
  'SMH', 'BIL', 'VTV', 'IXUS',
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'NVDA', 'TSLA', 'META', 'NFLX', 'ADBE', 'CRM',
  'ORCL', 'IBM', 'INTC', 'AMD', 'QCOM', 'AVGO', 'TXN', 'MU', 'AMAT', 'LRCX',
  'KLAC', 'MRVL', 'SNPS', 'CDNS', 'FTNT', 'PANW', 'CRWD', 'NOW', 'INTU', 'WDAY',
  'VEEV', 'ZS', 'OKTA', 'SNOW', 'PLTR', 'DDOG', 'MDB', 'NET', 'TWLO', 'DOCU',
  'ZOOM', 'SHOP', 'ROKU', 'SPOT', 'RBLX', 'PYPL', 'SQ',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'COF', 'AXP',
  'V', 'MA', 'BLK', 'SCHW', 'SPGI', 'ICE', 'TFC', 'MTB', 'FITB', 'RF',
  'KEY', 'HBAN', 'CMA', 'ZION', 'CFG', 'ALLY',
  'JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'DHR', 'MRK', 'ABT', 'LLY', 'BMY',
  'MDT', 'AMGN', 'GILD', 'VRTX', 'REGN', 'BIIB', 'ZTS', 'ILMN', 'MRNA',
  'PG', 'KO', 'PEP', 'WMT', 'COST', 'CL', 'KMB', 'GIS', 'K', 'HSY',
  'MKC', 'CLX', 'CHD', 'KR', 'SYY', 'TSN',
  'AMZN', 'HD', 'MCD', 'NKE', 'SBUX', 'LOW', 'TJX', 'BKNG', 'DIS', 'CMG',
  'LULU', 'RCL', 'F', 'GM', 'UBER', 'LYFT', 'ABNB',
  'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PSX', 'VLO', 'MPC', 'KMI', 'OKE',
  'WMB', 'ENB', 'FSLR', 'ENPH',
  'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'XEL', 'SRE', 'PEG', 'ES',
  'AWK', 'ATO',
  'BA', 'CAT', 'GE', 'MMM', 'HON', 'UPS', 'RTX', 'LMT', 'DE', 'UNP',
  'FDX', 'CSX',
  'LIN', 'APD', 'SHW', 'FCX', 'NEM', 'DOW', 'DD', 'PPG', 'ECL', 'FMC',
  'LYB', 'CF',
  'CMCSA', 'VZ', 'T', 'TMUS', 'CHTR', 'DISH', 'SNAP', 'PINS',
  'AMT', 'PLD', 'CCI', 'EQIX', 'SBAC', 'PSA', 'DLR', 'O', 'WELL', 'EXR',
  'AVB', 'EQR',
  'COIN', 'MSTR', 'RIOT', 'MARA', 'HUT', 'BITF'
];

// S&P 500 Historical P/E Data (real historical averages)
const SPX_PE_HISTORICAL = {
  // Current estimated P/E for S&P 500
  current: 24.8,
  
  // Historical averages
  trailing12Months: 23.2,  // Average P/E last 12 months
  trailing5Years: 21.4,    // Average P/E last 5 years (2020-2024)
  trailing10Years: 19.8,   // Average P/E last 10 years (2015-2024)
  
  // All-time historical context
  historicalAverage: 17.5, // Long-term historical average since 1950
  
  // Market cycle context
  bullMarketAvg: 22.0,
  bearMarketAvg: 14.5,
  recessionAvg: 12.8,
  
  // Valuation thresholds
  thresholds: {
    veryUndervalued: 15,    // P/E < 15
    undervalued: 18,        // P/E < 18
    fairValue: [18, 22],    // P/E 18-22
    overvalued: 25,         // P/E > 25
    veryOvervalued: 30      // P/E > 30
  }
};

function getSPXValuationAnalysis() {
  const current = SPX_PE_HISTORICAL.current;
  const { trailing12Months, trailing5Years, trailing10Years, historicalAverage } = SPX_PE_HISTORICAL;
  const { thresholds } = SPX_PE_HISTORICAL;
  
  // Calculate deviations from historical averages
  const vs12M = ((current - trailing12Months) / trailing12Months * 100);
  const vs5Y = ((current - trailing5Years) / trailing5Years * 100);
  const vs10Y = ((current - trailing10Years) / trailing10Years * 100);
  const vsHistorical = ((current - historicalAverage) / historicalAverage * 100);
  
  // Determine valuation signal
  let signal = 'Fair Value';
  let color = 'yellow';
  let explanation = 'P/E in normal range';
  
  if (current < thresholds.veryUndervalued) {
    signal = 'Very Undervalued';
    color = 'green';
    explanation = 'Extremely attractive valuation';
  } else if (current < thresholds.undervalued) {
    signal = 'Undervalued';
    color = 'green';
    explanation = 'Below historical averages';
  } else if (current >= thresholds.fairValue[0] && current <= thresholds.fairValue[1]) {
    signal = 'Fair Value';
    color = 'yellow';
    explanation = 'Within historical normal range';
  } else if (current > thresholds.overvalued) {
    signal = current > thresholds.veryOvervalued ? 'Very Overvalued' : 'Overvalued';
    color = 'red';
    explanation = current > thresholds.veryOvervalued ? 'Extremely expensive valuation' : 'Above historical averages';
  }
  
  return {
    current,
    historical: {
      trailing12Months,
      trailing5Years,
      trailing10Years,
      historicalAverage
    },
    deviations: {
      vs12M: vs12M.toFixed(1),
      vs5Y: vs5Y.toFixed(1), 
      vs10Y: vs10Y.toFixed(1),
      vsHistorical: vsHistorical.toFixed(1)
    },
    signal,
    color,
    explanation,
    percentile: calculatePercentile(current),
    marketContext: getMarketContext(current)
  };
}

// Dummy EPS and sector PE/market PE for demo (replace with real API in prod)
const EPS_DATA: { [ticker: string]: { trailing: number, forward: number, history: number[] } } = {
  'AAPL': { trailing: 6.5, forward: 7.1, history: [5.8, 6.0, 6.2, 6.5] },
  'MSFT': { trailing: 9.2, forward: 10.0, history: [8.5, 8.8, 9.0, 9.2] },
  'GOOGL': { trailing: 5.0, forward: 5.5, history: [4.2, 4.5, 4.8, 5.0] },
  'TSLA': { trailing: 3.1, forward: 3.8, history: [2.2, 2.5, 2.8, 3.1] },
  'NVDA': { trailing: 18.5, forward: 20.0, history: [15.0, 16.5, 17.5, 18.5] },
  // ...aggiungi altri titoli chiave demo
};

function calculatePercentile(currentPE: number): number {
  // Simulate percentile calculation (in production, use real historical data)
  // Based on historical S&P 500 P/E distribution
  if (currentPE < 12) return 5;
  if (currentPE < 15) return 15;
  if (currentPE < 18) return 35;
  if (currentPE < 22) return 65;
  if (currentPE < 25) return 80;
  if (currentPE < 28) return 90;
  return 95;
}

function getMarketContext(currentPE: number): string {
  const { bullMarketAvg, bearMarketAvg, recessionAvg } = SPX_PE_HISTORICAL;
  
  if (currentPE >= bullMarketAvg) {
    return 'Bull Market Levels';
  } else if (currentPE <= recessionAvg) {
    return 'Recession Levels';
  } else if (currentPE <= bearMarketAvg) {
    return 'Bear Market Levels';
  } else {
    return 'Transitional Market';
  }
}
const SECTOR_PE: { [sector: string]: number } = {
  'Technology': 28,
  'Financial Services': 14,
  'Healthcare': 18,
  'Consumer Staples': 20,
  'Consumer Discretionary': 22,
  'Energy': 12,
  'Utilities': 16,
  'Industrials': 17,
  'Materials': 15,
  'Communication Services': 19,
  'Real Estate': 13,
  'Other': 16
};
const MARKET_PE = 20;

// Sentiment keywords for NLP analysis
const SENTIMENT_KEYWORDS = {
  positive: ['growth', 'profit', 'earnings beat', 'strong', 'bullish', 'upgrade', 'buy', 'outperform', 'revenue growth', 'expansion', 'innovation', 'breakthrough'],
  negative: ['loss', 'decline', 'weak', 'bearish', 'downgrade', 'sell', 'underperform', 'revenue drop', 'layoffs', 'risk', 'concern', 'warning'],
  neutral: ['stable', 'maintain', 'hold', 'unchanged', 'steady']
};

async function getSentimentScore(ticker: string): Promise<{ score: number, sentiment: string, confidence: number }> {
  try {
    // Simulate sentiment analysis for demo (replace with real API in production)
    // Generate simulated sentiment based on ticker characteristics
    let score = 0;
    let sentiment = 'neutral';
    let confidence = 0.7;

    // Simulate some realistic sentiment based on ticker types
    if (['AAPL', 'MSFT', 'GOOGL', 'NVDA'].includes(ticker)) {
      score = 0.3 + Math.random() * 0.4; // Generally positive for big tech
      sentiment = 'positive';
      confidence = 0.8;
    } else if (['TSLA', 'COIN', 'RIOT'].includes(ticker)) {
      score = (Math.random() - 0.5) * 1.2; // More volatile sentiment
      sentiment = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';
      confidence = 0.6;
    } else if (ticker.includes('XL') || ticker.includes('ETF')) {
      score = (Math.random() - 0.5) * 0.6; // More stable sentiment for ETFs
      sentiment = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';
      confidence = 0.5;
    } else {
      score = (Math.random() - 0.5) * 0.8;
      sentiment = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';
      confidence = 0.6;
    }

    return { 
      score: Math.max(-1, Math.min(1, score)), 
      sentiment, 
      confidence 
    };
  } catch (error) {
    console.error('Error getting sentiment:', error);
    return { score: 0, sentiment: 'neutral', confidence: 0.5 };
  }
}

function getPERatio(ticker: string, price: number, type: 'trailing' | 'forward'): { pe: number|null, eps: number|null, history: number[] } {
  const epsData = EPS_DATA[ticker];
  if (!epsData) return { pe: null, eps: null, history: [] };
  const eps = type === 'trailing' ? epsData.trailing : epsData.forward;
  if (!eps || eps === 0) return { pe: null, eps, history: epsData.history };
  return { pe: price / eps, eps, history: epsData.history };
}

function getAINormalizedPE(pe: number|null, sector: string, sentimentData?: { score: number, sentiment: string, confidence: number }): { normalized: number|null, signal: string, explanation: string, sentimentAdjusted: boolean } {
  if (!pe) return { normalized: null, signal: 'N/A', explanation: 'No PE data', sentimentAdjusted: false };
  
  const sectorPE = SECTOR_PE[sector] || MARKET_PE;
  const norm = pe / sectorPE;
  
  let signal = 'Fair Value';
  let explanation = 'PE in line with sector';
  let sentimentAdjusted = false;

  // Base PE analysis
  if (norm < 0.8) { 
    signal = 'Undervalued'; 
    explanation = 'PE well below sector average'; 
  } else if (norm > 1.2) { 
    signal = 'Overvalued'; 
    explanation = 'PE well above sector average'; 
  }

  // Sentiment adjustment
  if (sentimentData && sentimentData.confidence > 0.6) {
    sentimentAdjusted = true;
    
    if (sentimentData.sentiment === 'positive' && sentimentData.score > 0.3) {
      // Positive sentiment can justify higher PE
      if (signal === 'Overvalued' && norm < 1.4) {
        signal = 'Fair Value';
        explanation = 'PE elevated but justified by positive sentiment';
      } else if (signal === 'Fair Value') {
        signal = 'Undervalued';
        explanation = 'PE fair with strong positive sentiment';
      }
    } else if (sentimentData.sentiment === 'negative' && sentimentData.score < -0.3) {
      // Negative sentiment makes undervalued more attractive, overvalued more risky
      if (signal === 'Undervalued') {
        explanation = 'PE low, but negative sentiment creates risk';
      } else if (signal === 'Fair Value') {
        signal = 'Overvalued';
        explanation = 'PE fair but negative sentiment adds risk';
      } else if (signal === 'Overvalued') {
        explanation = 'PE high with concerning negative sentiment';
      }
    }
  }

  return { normalized: norm, signal, explanation, sentimentAdjusted };
}

// Dummy AI prediction (replace with ML in prod) - optimized version
function getAIPrediction(ticker: string, sentimentData?: { score: number, sentiment: string, confidence: number }): { pe3: number|null, pe6: number|null, pe12: number|null, probability: number, sentimentImpact: string } {
  const base = EPS_DATA[ticker]?.trailing;
  if (!base) return { pe3: null, pe6: null, pe12: null, probability: 0.5, sentimentImpact: 'none' };
  
  let sentimentMultiplier = 1;
  let sentimentImpact = 'none';
  
  if (sentimentData && sentimentData.confidence > 0.5) {
    if (sentimentData.sentiment === 'positive') {
      sentimentMultiplier = 1 + (sentimentData.score * 0.2); // Up to 20% boost
      sentimentImpact = 'positive';
    } else if (sentimentData.sentiment === 'negative') {
      sentimentMultiplier = 1 + (sentimentData.score * 0.15); // Up to 15% reduction
      sentimentImpact = 'negative';
    }
  }

  return {
    pe3: base * sentimentMultiplier * (1 + Math.random() * 0.1),
    pe6: base * sentimentMultiplier * (1 + Math.random() * 0.15),
    pe12: base * sentimentMultiplier * (1 + Math.random() * 0.2),
    probability: 0.5 + Math.random() * 0.4,
    sentimentImpact
  };
}

export async function GET() {
  try {
    console.log('\n🚀 Dashboard API called');
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      console.log('⚡ Using cached dashboard data');
      
      // Use cached portfolio data if available, otherwise calculate fresh
      let portfolioPerformances: any = {};
      if (cachedPortfolios && (Date.now() - cachedPortfolios.timestamp < PORTFOLIO_CACHE_DURATION)) {
        console.log('⚡ Using cached portfolio data');
        portfolioPerformances = cachedPortfolios.data;
      } else {
        console.log('📊 Calculating fresh portfolio data...');
        for (const key of Object.keys(ECONOMIC_PORTFOLIOS)) {
          try {
            const performance = await getPortfolioPerformance(key, cachedData!.data);
            if (performance) {
              portfolioPerformances[key] = performance;
            }
          } catch (error) {
            console.error(`❌ Error calculating portfolio performance for ${key}:`, error);
          }
        }
        
        // Cache portfolio data
        cachedPortfolios = {
          data: portfolioPerformances,
          timestamp: Date.now()
        };
      }
      
      return NextResponse.json({
        data: cachedData.data,
        economicPortfolios: portfolioPerformances,
        summary: {
          avgPerformance: calculateAveragePerformance(cachedData.data),
          totalVolume: calculateTotalVolume(cachedData.data),
          bullishCount: cachedData.data.filter(item => parseFloat(item.performance) > 0).length,
          bearishCount: cachedData.data.filter(item => parseFloat(item.performance) < 0).length,
          marketSentiment: getMarketSentiment(cachedData.data)
        },
        lastUpdated: new Date(cachedData.timestamp).toISOString()
      });
    }

    console.log('🔄 Fetching fresh data from Tiingo...');
    const tiingoData = await getTiingoMarketData(TIINGO_SYMBOLS);
    
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
        lastUpdated: new Date().toISOString()
      });
    }

    // Optimized: Reduce complex calculations for better performance
    const dashboardData: (MarketDataItem & {
      peTrailing?: number|null,
      peForward?: number|null,
      peHistory?: number[],
      peNormalized?: number|null,
      peSignal?: string,
      peExplanation?: string,
      sentimentData?: { score: number, sentiment: string, confidence: number },
      peAIPrediction?: { pe3: number|null, pe6: number|null, pe12: number|null, probability: number, sentimentImpact: string }
    })[] = tiingoData.map(item => {
      const performanceStr = (item.changePercent * 100).toFixed(2) + '%';
      const sector = getSectorForTicker(item.symbol);
      const price = item.price || 0;
      
      // Simplified PE calculation (skip AI/sentiment for performance)
      const { pe: peTrailing, eps: epsTrailing, history: peHistory } = getPERatio(item.symbol, price, 'trailing');
      const { pe: peForward } = getPERatio(item.symbol, price, 'forward');
      
      // Basic normalized PE without complex sentiment analysis
      const peNormalized = peTrailing ? Math.min(Math.max(peTrailing / 20, 0), 2) : null;
      const peSignal = peTrailing ? (peTrailing < 15 ? 'Buy' : peTrailing > 25 ? 'Sell' : 'Hold') : 'N/A';
      const peExplanation = `P/E: ${peTrailing?.toFixed(1) || 'N/A'}`;
      
      // Simplified AI prediction without sentiment
      const peAIPrediction = getAIPrediction(item.symbol);
      
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
        sector,
        direction: getDirection(performanceStr),
        peTrailing: peTrailing ? parseFloat(peTrailing.toFixed(2)) : null,
        peForward: peForward ? parseFloat(peForward.toFixed(2)) : null,
        peHistory,
        peNormalized: peNormalized ? parseFloat(peNormalized.toFixed(2)) : null,
        peSignal,
        peExplanation,
        peAIPrediction
      };
    });

    cachedData = {
      data: dashboardData,
      timestamp: Date.now()
    };

    console.log(`✅ Dashboard data complete - ${dashboardData.length} symbols`);

    // Calculate economic portfolio performances with batch processing
    const portfolioPerformances: any = {};
    console.log('📊 Calculating portfolio performances...');
    
    for (const key of Object.keys(ECONOMIC_PORTFOLIOS)) {
      try {
        const performance = await getPortfolioPerformance(key, dashboardData);
        if (performance) {
          portfolioPerformances[key] = performance;
        }
      } catch (error) {
        console.error(`❌ Error calculating portfolio performance for ${key}:`, error);
      }
    }

    // Cache the portfolio data separately
    cachedPortfolios = {
      data: portfolioPerformances,
      timestamp: Date.now()
    };

    return NextResponse.json({
      data: dashboardData,
      economicPortfolios: portfolioPerformances,
      spxValuation: getSPXValuationAnalysis(),
      summary: {
        avgPerformance: calculateAveragePerformance(dashboardData),
        totalVolume: calculateTotalVolume(dashboardData),
        bullishCount: dashboardData.filter(item => parseFloat(item.performance) > 0).length,
        bearishCount: dashboardData.filter(item => parseFloat(item.performance) < 0).length,
        marketSentiment: getMarketSentiment(dashboardData)
      },
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error(' Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

function getTickerName(ticker: string): string {
  const names: { [key: string]: string } = {
    'SPY': 'SPDR S&P 500',
    'QQQ': 'Invesco QQQ Trust',
    'IWM': 'iShares Russell 2000',
    'TLT': 'iShares 20+ Year Treasury Bond ETF',
    'SHY': 'iShares 1-3 Year Treasury Bond ETF',
    'XLU': 'Utilities Select Sector SPDR Fund',
    'XLP': 'Consumer Staples Select Sector SPDR Fund',
    'GLD': 'SPDR Gold Trust',
    'DBC': 'Invesco DB Commodity Index Tracking Fund',
    'XLE': 'Energy Select Sector SPDR Fund',
    'TIP': 'iShares TIPS Bond ETF',
    'VTV': 'Vanguard Value Index Fund ETF',
    'XLI': 'Industrial Select Sector SPDR Fund',
    'XLF': 'Financial Select Sector SPDR Fund',
    'EEM': 'iShares MSCI Emerging Markets ETF',
    'LQD': 'iShares iBoxx $ Inv Grade Corporate Bond ETF',
    'VTI': 'Vanguard Total Stock Market Index Fund ETF',
    'FXF': 'Invesco CurrencyShares Swiss Franc Trust',
    'IXUS': 'iShares Core MSCI Total International Stock ETF',
    'BIL': 'SPDR Bloomberg 1-3 Month T-Bill ETF',
    'XLK': 'Technology Select Sector SPDR Fund',
    'XLY': 'Consumer Discretionary Select Sector SPDR Fund',
    'IEF': 'iShares 7-10 Year Treasury Bond ETF',
    'SMH': 'VanEck Semiconductor ETF',
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corp',
    'GOOGL': 'Alphabet Inc.',
    'NVDA': 'NVIDIA Corp',
    'TSLA': 'Tesla Inc.',
    'META': 'Meta Platforms',
    'NFLX': 'Netflix Inc.',
    'JPM': 'JPMorgan Chase',
    'BAC': 'Bank of America',
    'V': 'Visa Inc.',
    'MA': 'Mastercard Inc.',
    'AMZN': 'Amazon.com Inc.',
    'PYPL': 'PayPal Holdings'
  };
  return names[ticker] || ticker;
}

function getSectorForTicker(ticker: string): string {
  const sectors: { [key: string]: string } = {
    'SPY': 'Index',
    'QQQ': 'Index', 
    'IWM': 'Index',
    'DIA': 'Index',
    'VTI': 'Index',
    'VOO': 'Index',
    'XLF': 'ETF',
    'XLE': 'ETF',
    'XLI': 'ETF',
    'XLK': 'ETF', 
    'XLP': 'ETF',
    'XLU': 'ETF',
    'XLV': 'ETF',
    'XLB': 'ETF',
    'XLY': 'ETF',
    'XLRE': 'ETF',
    'VDE': 'ETF',
    'VDC': 'ETF',
    'VIS': 'ETF',
    'VGT': 'ETF',
    'VNQ': 'ETF',
    'VAW': 'ETF',
    'VCR': 'ETF',
    'VPU': 'ETF',
    'VOX': 'ETF',
    'VEA': 'ETF',
    'VWO': 'ETF',
    'EFA': 'ETF',
    'EEM': 'ETF',
    'IEFA': 'ETF',
    'IEMG': 'ETF',
    'VGK': 'ETF',
    'AGG': 'Bond',
    'BND': 'Bond',
    'TLT': 'Bond',
    'IEF': 'Bond',
    'SHY': 'Bond',
    'LQD': 'Bond',
    'HYG': 'Bond',
    'JNK': 'Bond',
    'TIP': 'Bond',
    'VTEB': 'Bond',
    'GLD': 'Commodities',
    'SLV': 'Commodities',
    'USO': 'Commodities',
    'UNG': 'Commodities',
    'DBA': 'Commodities',
    'DBC': 'Commodities',
    'UUP': 'Currency',
    'FXE': 'Currency',
    'FXY': 'Currency',
    'FXB': 'Currency',
    'UDN': 'Currency',
    'FXF': 'Currency',
    'BITO': 'Crypto',
    'COIN': 'Crypto',
    'MSTR': 'Crypto',
    'RIOT': 'Crypto',
    'MARA': 'Crypto',
    'HUT': 'Crypto',
    'BITF': 'Crypto',
    'SMH': 'ETF',
    'VTV': 'ETF',
    'IXUS': 'ETF',
    'BIL': 'Bond',
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'GOOGL': 'Technology',
    'GOOG': 'Technology',
    'NVDA': 'Technology',
    'TSLA': 'Technology',
    'META': 'Technology',
    'NFLX': 'Technology',
    'ADBE': 'Technology',
    'CRM': 'Technology',
    'ORCL': 'Technology',
    'IBM': 'Technology',
    'INTC': 'Technology',
    'AMD': 'Technology',
    'QCOM': 'Technology',
    'AVGO': 'Technology',
    'TXN': 'Technology',
    'MU': 'Technology',
    'AMAT': 'Technology',
    'LRCX': 'Technology',
    'KLAC': 'Technology',
    'MRVL': 'Technology',
    'SNPS': 'Technology',
    'CDNS': 'Technology',
    'FTNT': 'Technology',
    'PANW': 'Technology',
    'CRWD': 'Technology',
    'NOW': 'Technology',
    'INTU': 'Technology',
    'WDAY': 'Technology',
    'VEEV': 'Technology',
    'ZS': 'Technology',
    'OKTA': 'Technology',
    'SNOW': 'Technology',
    'PLTR': 'Technology',
    'DDOG': 'Technology',
    'MDB': 'Technology',
    'NET': 'Technology',
    'TWLO': 'Technology',
    'DOCU': 'Technology',
    'ZOOM': 'Technology',
    'SHOP': 'Technology',
    'ROKU': 'Technology',
    'SPOT': 'Technology',
    'RBLX': 'Technology',
    'JPM': 'Financial Services',
    'BAC': 'Financial Services',
    'WFC': 'Financial Services',
    'GS': 'Financial Services',
    'MS': 'Financial Services',
    'C': 'Financial Services',
    'USB': 'Financial Services',
    'PNC': 'Financial Services',
    'COF': 'Financial Services',
    'AXP': 'Financial Services',
    'V': 'Financial Services',
    'MA': 'Financial Services',
    'PYPL': 'Financial Services',
    'SQ': 'Financial Services',
    'BLK': 'Financial Services',
    'SCHW': 'Financial Services',
    'SPGI': 'Financial Services',
    'ICE': 'Financial Services',
    'TFC': 'Financial Services',
    'MTB': 'Financial Services',
    'FITB': 'Financial Services',
    'RF': 'Financial Services',
    'KEY': 'Financial Services',
    'HBAN': 'Financial Services',
    'CMA': 'Financial Services',
    'ZION': 'Financial Services',
    'CFG': 'Financial Services',
    'ALLY': 'Financial Services',
    'JNJ': 'Healthcare',
    'UNH': 'Healthcare',
    'PFE': 'Healthcare',
    'ABBV': 'Healthcare',
    'TMO': 'Healthcare',
    'DHR': 'Healthcare',
    'MRK': 'Healthcare',
    'ABT': 'Healthcare',
    'LLY': 'Healthcare',
    'BMY': 'Healthcare',
    'MDT': 'Healthcare',
    'AMGN': 'Healthcare',
    'GILD': 'Healthcare',
    'VRTX': 'Healthcare',
    'REGN': 'Healthcare',
    'BIIB': 'Healthcare',
    'ZTS': 'Healthcare',
    'ILMN': 'Healthcare',
    'MRNA': 'Healthcare',
    'PG': 'Consumer Staples',
    'KO': 'Consumer Staples',
    'PEP': 'Consumer Staples',
    'WMT': 'Consumer Staples',
    'COST': 'Consumer Staples',
    'CL': 'Consumer Staples',
    'KMB': 'Consumer Staples',
    'GIS': 'Consumer Staples',
    'K': 'Consumer Staples',
    'HSY': 'Consumer Staples',
    'MKC': 'Consumer Staples',
    'CLX': 'Consumer Staples',
    'CHD': 'Consumer Staples',
    'KR': 'Consumer Staples',
    'SYY': 'Consumer Staples',
    'TSN': 'Consumer Staples',
    'AMZN': 'Consumer Discretionary',
    'HD': 'Consumer Discretionary',
    'MCD': 'Consumer Discretionary',
    'NKE': 'Consumer Discretionary',
    'SBUX': 'Consumer Discretionary',
    'LOW': 'Consumer Discretionary',
    'TJX': 'Consumer Discretionary',
    'BKNG': 'Consumer Discretionary',
    'DIS': 'Consumer Discretionary',
    'CMG': 'Consumer Discretionary',
    'LULU': 'Consumer Discretionary',
    'RCL': 'Consumer Discretionary',
    'F': 'Consumer Discretionary',
    'GM': 'Consumer Discretionary',
    'UBER': 'Consumer Discretionary',
    'LYFT': 'Consumer Discretionary',
    'ABNB': 'Consumer Discretionary',
    'XOM': 'Energy',
    'CVX': 'Energy',
    'COP': 'Energy',
    'EOG': 'Energy',
    'SLB': 'Energy',
    'PSX': 'Energy',
    'VLO': 'Energy',
    'MPC': 'Energy',
    'KMI': 'Energy',
    'OKE': 'Energy',
    'WMB': 'Energy',
    'ENB': 'Energy',
    'FSLR': 'Energy',
    'ENPH': 'Energy',
    'NEE': 'Utilities',
    'DUK': 'Utilities',
    'SO': 'Utilities',
    'D': 'Utilities',
    'AEP': 'Utilities',
    'EXC': 'Utilities',
    'XEL': 'Utilities',
    'SRE': 'Utilities',
    'PEG': 'Utilities',
    'ES': 'Utilities',
    'AWK': 'Utilities',
    'ATO': 'Utilities',
    'BA': 'Industrials',
    'CAT': 'Industrials',
    'GE': 'Industrials',
    'MMM': 'Industrials',
    'HON': 'Industrials',
    'UPS': 'Industrials',
    'RTX': 'Industrials',
    'LMT': 'Industrials',
    'DE': 'Industrials',
    'UNP': 'Industrials',
    'FDX': 'Industrials',
    'CSX': 'Industrials',
    'LIN': 'Materials',
    'APD': 'Materials',
    'SHW': 'Materials',
    'FCX': 'Materials',
    'NEM': 'Materials',
    'DOW': 'Materials',
    'DD': 'Materials',
    'PPG': 'Materials',
    'ECL': 'Materials',
    'FMC': 'Materials',
    'LYB': 'Materials',
    'CF': 'Materials',
    'CMCSA': 'Communication Services',
    'VZ': 'Communication Services',
    'T': 'Communication Services',
    'TMUS': 'Communication Services',
    'CHTR': 'Communication Services',
    'DISH': 'Communication Services',
    'SNAP': 'Communication Services',
    'PINS': 'Communication Services',
    'AMT': 'Real Estate',
    'PLD': 'Real Estate',
    'CCI': 'Real Estate',
    'EQIX': 'Real Estate',
    'SBAC': 'Real Estate',
    'PSA': 'Real Estate',
    'DLR': 'Real Estate',
    'O': 'Real Estate',
    'WELL': 'Real Estate',
    'EXR': 'Real Estate',
    'AVB': 'Real Estate',
    'EQR': 'Real Estate'
  };
  
  return sectors[ticker] || 'Other';
}

function formatVolume(volume: number): string {
  if (volume >= 1000000000) return (volume / 1000000000).toFixed(1) + 'B';
  if (volume >= 1000000) return (volume / 1000000).toFixed(1) + 'M';
  if (volume >= 1000) return (volume / 1000).toFixed(1) + 'K';
  return volume.toString();
}

function getTrend(performance: string): string {
  const perf = parseFloat(performance);
  if (perf > 2) return 'Strong Up';
  if (perf > 0) return 'Up';
  if (perf < -2) return 'Strong Down';
  if (perf < 0) return 'Down';
  return 'Neutral';
}

function getDemandSupply(performance: string): string {
  const perf = parseFloat(performance);
  if (perf > 1) return 'High Demand';
  if (perf > 0) return 'Moderate Demand';
  if (perf < -1) return 'High Supply';
  if (perf < 0) return 'Moderate Supply';
  return 'Balanced';
}

function getOptionsSentiment(performance: string): string {
  const perf = parseFloat(performance);
  if (perf > 1) return 'Bullish';
  if (perf < -1) return 'Bearish';
  return 'Neutral';
}

function getGammaRisk(performance: string): string {
  const perf = Math.abs(parseFloat(performance));
  if (perf > 3) return 'High';
  if (perf > 1) return 'Medium';
  return 'Low';
}

function getUnusualActivity(performance: string, type: 'ATM' | 'OTM'): string {
  const perf = Math.abs(parseFloat(performance));
  if (perf > 2) return 'High';
  if (perf > 1) return 'Medium';
  return 'Low';
}

function getOTMSkew(performance: string): string {
  const perf = parseFloat(performance);
  if (perf > 0) return 'Call Skew';
  if (perf < 0) return 'Put Skew';
  return 'Neutral';
}

function getIntradayFlow(performance: string): string {
  const perf = parseFloat(performance);
  if (perf > 1) return 'Strong Inflow';
  if (perf > 0) return 'Inflow';
  if (perf < -1) return 'Strong Outflow';
  if (perf < 0) return 'Outflow';
  return 'Neutral';
}

function getPutCallRatio(performance: string): string {
  const ratio = Math.random() * 2;
  return ratio.toFixed(2);
}

function getDirection(performance: string): string {
  const perf = parseFloat(performance);
  if (perf > 0) return '';
  if (perf < 0) return '';
  return '';
}

function calculateAveragePerformance(data: MarketDataItem[]): string {
  if (data.length === 0) return '0.00%';
  const sum = data.reduce((acc, item) => acc + parseFloat(item.performance), 0);
  const avg = sum / data.length;
  return avg.toFixed(2) + '%';
}

function calculateTotalVolume(data: MarketDataItem[]): string {
  return (data.length * 1000000).toLocaleString();
}

function getMarketSentiment(data: MarketDataItem[]): string {
  const bullish = data.filter(item => parseFloat(item.performance) > 0).length;
  const bearish = data.filter(item => parseFloat(item.performance) < 0).length;
  
  if (bullish > bearish * 1.2) return 'Bullish';
  if (bearish > bullish * 1.2) return 'Bearish';
  return 'Neutral';
}

// ECONOMIC REGIME PORTFOLIOS
const ECONOMIC_PORTFOLIOS = {
  'GOLDILOCKS_ECONOMY': {
    name: 'Goldilocks Economy',
    description: 'Moderate growth, low inflation scenario',
    etfs: [
      { ticker: 'QQQ', name: 'Invesco QQQ Trust, Series 1' },
      { ticker: 'XLK', name: 'Technology Select Sector SPDR Fund' },
      { ticker: 'XLY', name: 'Consumer Discretionary Select Sector SPDR Fund' },
      { ticker: 'IEF', name: 'iShares 7-10 Year Treasury Bond ETF' },
      { ticker: 'SMH', name: 'VanEck Semiconductor ETF' }
    ]
  },
  'RECESSION': {
    name: 'Recession',
    description: 'Economic contraction, flight to safety',
    etfs: [
      { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF' },
      { ticker: 'SHY', name: 'iShares 1-3 Year Treasury Bond ETF' },
      { ticker: 'XLU', name: 'Utilities Select Sector SPDR Fund' },
      { ticker: 'XLP', name: 'Consumer Staples Select Sector SPDR Fund' },
      { ticker: 'GLD', name: 'SPDR Gold Trust' }
    ]
  },
  'STAGFLATION': {
    name: 'Stagflation',
    description: 'High inflation, low growth',
    etfs: [
      { ticker: 'GLD', name: 'SPDR Gold Trust' },
      { ticker: 'DBC', name: 'Invesco DB Commodity Index Tracking Fund' },
      { ticker: 'XLE', name: 'Energy Select Sector SPDR Fund' },
      { ticker: 'TIP', name: 'iShares TIPS Bond ETF' },
      { ticker: 'VTV', name: 'Vanguard Value Index Fund ETF' }
    ]
  },
  'REFLATION': {
    name: 'Reflation',
    description: 'Rising inflation and growth',
    etfs: [
      { ticker: 'XLI', name: 'Industrial Select Sector SPDR Fund' },
      { ticker: 'XLF', name: 'Financial Select Sector SPDR Fund' },
      { ticker: 'IWM', name: 'iShares Russell 2000 ETF' },
      { ticker: 'EEM', name: 'iShares MSCI Emerging Markets ETF' },
      { ticker: 'DBC', name: 'Invesco DB Commodity Index Tracking Fund' }
    ]
  },
  'DISINFLATION_SOFT_LANDING': {
    name: 'Disinflation/Soft Landing',
    description: 'Declining inflation, sustained growth',
    etfs: [
      { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF' },
      { ticker: 'LQD', name: 'iShares iBoxx $ Inv Grade Corporate Bond ETF' },
      { ticker: 'QQQ', name: 'Invesco QQQ Trust, Series 1' },
      { ticker: 'VTI', name: 'Vanguard Total Stock Market Index Fund ETF' },
      { ticker: 'GLD', name: 'SPDR Gold Trust' }
    ]
  },
  'DOLLAR_WEAKNESS_GLOBAL_REBALANCING': {
    name: 'Dollar Weakness/Global Rebalancing',
    description: 'Weak USD, international outperformance',
    etfs: [
      { ticker: 'EEM', name: 'iShares MSCI Emerging Markets ETF' },
      { ticker: 'FXF', name: 'Invesco CurrencyShares Swiss Franc Trust' },
      { ticker: 'GLD', name: 'SPDR Gold Trust' },
      { ticker: 'IXUS', name: 'iShares Core MSCI Total International Stock ETF' },
      { ticker: 'DBC', name: 'Invesco DB Commodity Index Tracking Fund' }
    ]
  },
  'DEFLATION': {
    name: 'Deflation',
    description: 'Falling prices, economic weakness',
    etfs: [
      { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF' },
      { ticker: 'BIL', name: 'SPDR Bloomberg 1-3 Month T-Bill ETF' },
      { ticker: 'SHY', name: 'iShares 1-3 Year Treasury Bond ETF' },
      { ticker: 'XLP', name: 'Consumer Staples Select Sector SPDR Fund' },
      { ticker: 'XLU', name: 'Utilities Select Sector SPDR Fund' }
    ]
  }
};

// Optimized function to get portfolio performance with caching and batch processing
async function getPortfolioPerformance(portfolioKey: string, marketData: MarketDataItem[]) {
  const portfolio = ECONOMIC_PORTFOLIOS[portfolioKey as keyof typeof ECONOMIC_PORTFOLIOS];
  if (!portfolio) return null;

  // Check if we have cached portfolio data
  const cacheKey = `portfolio_${portfolioKey}`;
  const now = Date.now();
  
  if (cachedPortfolios && cachedPortfolios.data[cacheKey] && 
      (now - cachedPortfolios.timestamp < PORTFOLIO_CACHE_DURATION)) {
    console.log(`📈 Using cached portfolio data for ${portfolioKey}`);
    return cachedPortfolios.data[cacheKey];
  }

  // Get current data for each ETF
  const portfolioData: any[] = [];
  
  // Process ETFs in batches to avoid overwhelming Tiingo API
  const BATCH_SIZE = 3;
  for (let i = 0; i < portfolio.etfs.length; i += BATCH_SIZE) {
    const batch = portfolio.etfs.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (etf, index) => {
      const currentData = marketData.find(item => item.ticker === etf.ticker);
      if (!currentData) return;

      try {
        // Add delay to prevent rate limiting
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, TIINGO_REQUEST_DELAY));
        }

        // Calculate multiple timeframe performances
        const performances = await calculateMultiTimeframePerformance(etf.ticker);
        
        portfolioData.push({
          ...etf,
          price: parseFloat(currentData.price) || 0,
          performances: performances,
          currentPerformance: parseFloat(currentData.performance) || 0,
          change: currentData.change
        });
      } catch (error) {
        console.warn(`⚠️  Fallback for ${etf.ticker}:`, error);
        // Fallback to current data only
        portfolioData.push({
          ...etf,
          price: parseFloat(currentData.price) || 0,
          performances: {
            daily: parseFloat(currentData.performance) || 0,
            weekly: parseFloat(currentData.performance) || 0,
            monthly: parseFloat(currentData.performance) || 0,
            quarterly: parseFloat(currentData.performance) || 0,
            yearly: parseFloat(currentData.performance) || 0
          },
          currentPerformance: parseFloat(currentData.performance) || 0,
          change: currentData.change
        });
      }
    }));
    
    // Small delay between batches
    if (i + BATCH_SIZE < portfolio.etfs.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  if (portfolioData.length === 0) return null;

  // Calculate portfolio averages across all timeframes
  const avgPerformances = {
    daily: portfolioData.reduce((sum, item) => sum + (item.performances?.daily || 0), 0) / portfolioData.length,
    weekly: portfolioData.reduce((sum, item) => sum + (item.performances?.weekly || 0), 0) / portfolioData.length,
    monthly: portfolioData.reduce((sum, item) => sum + (item.performances?.monthly || 0), 0) / portfolioData.length,
    quarterly: portfolioData.reduce((sum, item) => sum + (item.performances?.quarterly || 0), 0) / portfolioData.length,
    yearly: portfolioData.reduce((sum, item) => sum + (item.performances?.yearly || 0), 0) / portfolioData.length
  };
  
  const result = {
    ...portfolio,
    avgPerformances,
    avgPerformance: avgPerformances.daily.toFixed(2) + '%', // Keep backward compatibility
    etfData: portfolioData
  };

  // Cache this portfolio result
  if (!cachedPortfolios) {
    cachedPortfolios = { data: {}, timestamp: Date.now() };
  }
  cachedPortfolios.data[cacheKey] = result;
  
  console.log(`✅ Portfolio ${portfolioKey} calculated and cached`);
  return result;
}

// Function to calculate performance across multiple timeframes with better error handling
async function calculateMultiTimeframePerformance(ticker: string) {
  try {
    console.log(`📊 Calculating multi-timeframe performance for ${ticker}...`);
    
    const performances = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      quarterly: 0,
      yearly: 0
    };

    // Calculate different timeframes
    const timeframes = [
      { key: 'daily', days: 2 }, // 2 days to ensure we get at least 2 data points
      { key: 'weekly', days: 8 },
      { key: 'monthly', days: 32 },
      { key: 'quarterly', days: 95 }, // ~3 months
      { key: 'yearly', days: 380 } // ~1 year
    ];

    for (const timeframe of timeframes) {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - timeframe.days);
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        console.log(`🔍 Fetching ${timeframe.key} data for ${ticker}: ${startDateStr} to ${endDateStr}`);
        
        const response = await fetch(
          `https://api.tiingo.com/tiingo/daily/${ticker}/prices?startDate=${startDateStr}&endDate=${endDateStr}&token=${process.env.TIINGO_API_KEY}`,
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Token ${process.env.TIINGO_API_KEY}`
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Retrieved ${data.length} data points for ${ticker} ${timeframe.key}`);
          
          if (data && data.length >= 2) {
            const oldPrice = data[0].adjClose;
            const newPrice = data[data.length - 1].adjClose;
            
            if (oldPrice && newPrice && oldPrice > 0) {
              const performance = ((newPrice - oldPrice) / oldPrice) * 100;
              performances[timeframe.key as keyof typeof performances] = performance;
              console.log(`📈 ${ticker} ${timeframe.key}: ${performance.toFixed(2)}%`);
            }
          }
        } else {
          console.log(`⚠️ API error for ${ticker} ${timeframe.key}: ${response.status}`);
        }
      } catch (timeframeError) {
        console.log(`⚠️ Error fetching ${timeframe.key} data for ${ticker}:`, timeframeError);
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`✅ Final performances for ${ticker}:`, performances);
    return performances;
    
  } catch (error) {
    console.error(`❌ Error calculating multi-timeframe performance for ${ticker}:`, error);
    return {
      daily: 0,
      weekly: 0,
      monthly: 0,
      quarterly: 0,
      yearly: 0
    };
  }
}
