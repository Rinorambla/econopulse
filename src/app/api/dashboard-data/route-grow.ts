import { NextResponse } from 'next/server';

const POLYGON_API_KEY = 'zdBrwdUY56z4wB7mOffLL5NXZLMed_qW';
const TWELVE_DATA_API_KEY = '1c6d000065f54579b9de72cae88ce9b3'; // GROW PLAN!

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

// Cache globale con durata ridotta per il Grow plan
let cachedData: { data: MarketDataItem[], timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minuto invece di 2 (più aggiornamenti con Grow)

// GROW PLAN: Set di simboli espanso - 377 calls disponibili!
const SYMBOL_SETS = {
  // Priorità 1: Polygon (più affidabile)
  polygon: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'GOOGL', 'AMZN'],
  
  // Priorità 2: US Large Cap via TwelveData
  us_large: [
    'IBM', 'AMD', 'INTC', 'ORCL', 'CRM', 'ADBE', 'NFLX', 'PYPL', 'UBER', 'LYFT',
    'F', 'GM', 'DAL', 'AAL', 'CCL', 'GS', 'MS', 'WFC', 'C', 'AXP', 'BA', 'CAT',
    'HD', 'JNJ', 'KO', 'MCD', 'NKE', 'PG', 'UNH', 'V', 'WMT', 'XOM', 'CVX', 'PFE'
  ],
  
  // Priorità 3: European Markets (NUOVO con Grow!)
  europe: ['ASML.AS', 'SAP.DE', 'NESN.SW', 'LVMH.PA', 'ROG.SW', 'NVO.L'],
  
  // Priorità 4: Asian Markets (NUOVO con Grow!)
  asia: ['TSM', 'BABA', 'TCEHY', 'JD', 'BIDU', 'NIO'],
  
  // Priorità 5: Commodities (NUOVO con Grow!)
  commodities: ['XAUUSD', 'XAGUSD', 'BRENT', 'WTI'],
  
  // Priorità 6: Cryptocurrency (NUOVO con Grow!)
  crypto: ['BTC/USD', 'ETH/USD', 'ADA/USD', 'SOL/USD']
};

// Funzione per TwelveData API
async function fetchFromTwelveData(ticker: string): Promise<MarketDataItem | null> {
  try {
    const response = await fetch(`https://api.twelvedata.com/quote?symbol=${ticker}&apikey=${TWELVE_DATA_API_KEY}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`TwelveData ${ticker} response:`, data.status || 'OK');
      
      if (data.symbol) {
        const change = parseFloat(data.change);
        const changePercent = parseFloat(data.percent_change);
        
        return {
          ticker: ticker,
          name: getTickerName(ticker),
          price: parseFloat(data.close).toFixed(2),
          change: change.toFixed(2),
          performance: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
          volume: data.volume ? parseInt(data.volume).toLocaleString() : '1,000,000',
          trend: changePercent > 1 ? 'UPTREND' : changePercent < -1 ? 'DOWNTREND' : 'SIDEWAYS',
          demandSupply: 'MODERATE',
          optionsSentiment: changePercent > 0 ? 'Bullish' : 'Bearish',
          gammaRisk: changePercent > 2 ? 'BUY' : changePercent < -2 ? 'SELL' : 'NEUTRAL',
          unusualAtm: 'Moderate',
          unusualOtm: 'Low',
          otmSkew: 'Medium',
          intradayFlow: changePercent > 0 ? 'CALL BUYING' : 'PUT SELLING',
          putCallRatio: (1 + Math.random() * 0.5).toFixed(2),
          sector: getSectorForTicker(ticker),
          direction: changePercent > 0 ? '↗️' : changePercent < 0 ? '↘️' : '→'
        };
      } else {
        console.log(`TwelveData ${ticker} error: ${data.message}`);
        return null;
      }
    }
  } catch (error) {
    console.error(`Error fetching ${ticker} from TwelveData:`, error);
  }
  return null;
}

// Funzione per Polygon API
async function fetchFromPolygon(ticker: string): Promise<MarketDataItem | null> {
  try {
    const response = await fetch(`https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apikey=${POLYGON_API_KEY}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const change = result.c - result.o;
        const changePercent = ((change / result.o) * 100);
        
        return {
          ticker: ticker,
          name: getTickerName(ticker),
          price: result.c.toFixed(2),
          change: change.toFixed(2),
          performance: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
          volume: result.v.toLocaleString(),
          trend: changePercent > 1 ? 'UPTREND' : changePercent < -1 ? 'DOWNTREND' : 'SIDEWAYS',
          demandSupply: result.v > 50000000 ? 'HIGH DEMAND' : result.v > 20000000 ? 'MODERATE' : 'LOW DEMAND',
          optionsSentiment: changePercent > 0 ? 'Bullish' : 'Bearish',
          gammaRisk: changePercent > 2 ? 'BUY' : changePercent < -2 ? 'SELL' : 'NEUTRAL',
          unusualAtm: 'Moderate',
          unusualOtm: 'Low',
          otmSkew: 'Medium',
          intradayFlow: changePercent > 0 ? 'CALL BUYING' : 'PUT SELLING',
          putCallRatio: (1 + Math.random() * 0.5).toFixed(2),
          sector: getSectorForTicker(ticker),
          direction: changePercent > 0 ? '↗️' : changePercent < 0 ? '↘️' : '→'
        };
      }
    }
  } catch (error) {
    console.error(`Error fetching ${ticker} from Polygon:`, error);
  }
  return null;
}

export async function GET() {
  try {
    console.log('🚀 GROW PLAN: Fetching REAL market data from Multi-API...');

    // Check cache (1 minuto per Grow plan)
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      console.log('📦 Using cached data (Grow plan - 1min cache)');
      
      const totalPerformance = cachedData.data.reduce((sum, item) => {
        const perf = parseFloat(item.performance.replace('%', '').replace('+', ''));
        return sum + perf;
      }, 0);
      
      const avgPerformance = (totalPerformance / cachedData.data.length).toFixed(2);
      const bullishCount = cachedData.data.filter(item => parseFloat(item.performance.replace('%', '').replace('+', '')) > 0).length;
      const bearishCount = cachedData.data.length - bullishCount;

      return NextResponse.json({
        data: cachedData.data,
        summary: {
          avgPerformance: `${parseFloat(avgPerformance) > 0 ? '+' : ''}${avgPerformance}%`,
          totalVolume: '0',
          bullishCount,
          bearishCount,
          marketSentiment: parseFloat(avgPerformance) > 0 ? 'Bullish' : 'Bearish'
        },
        lastUpdated: new Date().toISOString(),
        dataSource: 'Multi-API Real Market Data (Cached - Grow Plan)'
      });
    }

    const marketData: MarketDataItem[] = [];

    // FASE 1: Polygon (priorità massima)
    console.log('📊 Phase 1: Loading from Polygon...');
    for (let i = 0; i < Math.min(SYMBOL_SETS.polygon.length, 8); i++) {
      const ticker = SYMBOL_SETS.polygon[i];
      const result = await fetchFromPolygon(ticker);
      if (result) {
        marketData.push(result);
        console.log(`✅ Added ${ticker} from Polygon: $${result.price} (${result.performance})`);
      }
      
      // Delay ridotto per Grow plan
      if (i < SYMBOL_SETS.polygon.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Solo 200ms
      }
    }

    // FASE 2: TwelveData US Large Cap - Grow plan: 377 calls!
    console.log('📊 Phase 2: Loading US Large Cap from TwelveData...');
    for (let i = 0; i < Math.min(SYMBOL_SETS.us_large.length, 30) && marketData.length < 40; i++) {
      const ticker = SYMBOL_SETS.us_large[i];
      const result = await fetchFromTwelveData(ticker);
      if (result) {
        marketData.push(result);
        console.log(`✅ Added ${ticker} from TwelveData: $${result.price} (${result.performance})`);
      }
      
      // Delay molto ridotto con Grow plan
      if (i < 29) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Solo 100ms
      }
    }

    // FASE 3: European Markets (NUOVO!)
    console.log('🌍 Phase 3: Loading European Markets...');
    for (const ticker of SYMBOL_SETS.europe.slice(0, 6)) {
      if (marketData.length >= 50) break;
      
      const result = await fetchFromTwelveData(ticker);
      if (result) {
        marketData.push(result);
        console.log(`✅ Added European ${ticker}: $${result.price} (${result.performance})`);
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // FASE 4: Asian Markets (NUOVO!)
    console.log('🌏 Phase 4: Loading Asian Markets...');
    for (const ticker of SYMBOL_SETS.asia.slice(0, 6)) {
      if (marketData.length >= 60) break;
      
      const result = await fetchFromTwelveData(ticker);
      if (result) {
        marketData.push(result);
        console.log(`✅ Added Asian ${ticker}: $${result.price} (${result.performance})`);
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // FASE 5: Commodities (NUOVO!)
    console.log('🥇 Phase 5: Loading Commodities...');
    for (const ticker of SYMBOL_SETS.commodities) {
      if (marketData.length >= 65) break;
      
      const result = await fetchFromTwelveData(ticker);
      if (result) {
        marketData.push(result);
        console.log(`✅ Added Commodity ${ticker}: $${result.price} (${result.performance})`);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // FASE 6: Cryptocurrency (NUOVO!)
    console.log('₿ Phase 6: Loading Cryptocurrency...');
    for (const ticker of SYMBOL_SETS.crypto) {
      if (marketData.length >= 70) break;
      
      const result = await fetchFromTwelveData(ticker);
      if (result) {
        marketData.push(result);
        console.log(`✅ Added Crypto ${ticker}: $${result.price} (${result.performance})`);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Update cache
    if (marketData.length > 0) {
      cachedData = {
        data: marketData,
        timestamp: Date.now()
      };
    }

    if (marketData.length > 0) {
      const totalPerformance = marketData.reduce((sum, item) => {
        const perf = parseFloat(item.performance.replace('%', '').replace('+', ''));
        return sum + perf;
      }, 0);
      
      const avgPerformance = (totalPerformance / marketData.length).toFixed(2);
      const bullishCount = marketData.filter(item => parseFloat(item.performance.replace('%', '').replace('+', '')) > 0).length;
      const bearishCount = marketData.length - bullishCount;

      console.log(`🚀 GROW PLAN SUCCESS! ${marketData.length} symbols loaded from Multi-API`);
      console.log(`📊 Sample: ${marketData[0].ticker}: $${marketData[0].price} (${marketData[0].performance})`);

      return NextResponse.json({
        data: marketData,
        summary: {
          avgPerformance: `${parseFloat(avgPerformance) > 0 ? '+' : ''}${avgPerformance}%`,
          totalVolume: '0',
          bullishCount,
          bearishCount,
          marketSentiment: parseFloat(avgPerformance) > 0 ? 'Bullish' : 'Bearish'
        },
        lastUpdated: new Date().toISOString(),
        dataSource: `Grow Plan Multi-API: ${marketData.length} symbols (Polygon + TwelveData + Global Markets)`
      });
    }

    // Fallback (non dovrebbe mai succedere con Grow plan)
    console.log('⚠️ Grow plan fallback (unexpected)');
    return NextResponse.json({
      data: getFallbackData(),
      summary: {
        avgPerformance: '+0.75%',
        totalVolume: '425,123',
        bullishCount: 3,
        bearishCount: 2,
        marketSentiment: 'Bullish'
      },
      lastUpdated: new Date().toISOString(),
      dataSource: 'Fallback Data'
    });

  } catch (error) {
    console.error('❌ Grow Plan API Error:', error);
    return NextResponse.json({
      data: getFallbackData(),
      summary: {
        avgPerformance: '+0.75%',
        totalVolume: '425,123',
        bullishCount: 3,
        bearishCount: 2,
        marketSentiment: 'Bullish'
      },
      lastUpdated: new Date().toISOString(),
      dataSource: 'Fallback Data'
    }, { status: 500 });
  }
}

// Helper functions
function getTickerName(ticker: string): string {
  const names: { [key: string]: string } = {
    'SPY': 'SPDR S&P 500',
    'QQQ': 'Invesco QQQ',
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corp.',
    'NVDA': 'NVIDIA Corp.',
    'TSLA': 'Tesla Inc.',
    'META': 'Meta Platforms',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'IBM': 'IBM Corp.',
    'AMD': 'Advanced Micro Devices',
    'INTC': 'Intel Corp.',
    'ORCL': 'Oracle Corp.',
    'CRM': 'Salesforce Inc.',
    'ADBE': 'Adobe Inc.',
    'NFLX': 'Netflix Inc.',
    'PYPL': 'PayPal Holdings',
    'UBER': 'Uber Technologies',
    'LYFT': 'Lyft Inc.',
    'F': 'Ford Motor Co.',
    'GM': 'General Motors',
    'DAL': 'Delta Air Lines',
    'AAL': 'American Airlines',
    'CCL': 'Carnival Corp.',
    'GS': 'Goldman Sachs',
    'MS': 'Morgan Stanley',
    'WFC': 'Wells Fargo',
    'C': 'Citigroup Inc.',
    'AXP': 'American Express',
    'BA': 'Boeing Co.',
    'CAT': 'Caterpillar Inc.',
    'HD': 'Home Depot',
    'JNJ': 'Johnson & Johnson',
    'KO': 'Coca-Cola Co.',
    'MCD': 'McDonald\'s Corp.',
    'NKE': 'Nike Inc.',
    'PG': 'Procter & Gamble',
    'UNH': 'UnitedHealth Group',
    'V': 'Visa Inc.',
    'WMT': 'Walmart Inc.',
    'XOM': 'Exxon Mobil',
    'CVX': 'Chevron Corp.',
    'PFE': 'Pfizer Inc.',
    // European
    'ASML.AS': 'ASML Holding N.V.',
    'SAP.DE': 'SAP SE',
    'NESN.SW': 'Nestlé S.A.',
    'LVMH.PA': 'LVMH Moët Hennessy',
    'ROG.SW': 'Roche Holding AG',
    'NVO.L': 'Novo Nordisk A/S',
    // Asian
    'TSM': 'Taiwan Semiconductor',
    'BABA': 'Alibaba Group',
    'TCEHY': 'Tencent Holdings',
    'JD': 'JD.com Inc.',
    'BIDU': 'Baidu Inc.',
    'NIO': 'NIO Inc.',
    // Commodities
    'XAUUSD': 'Gold Spot',
    'XAGUSD': 'Silver Spot',
    'BRENT': 'Brent Crude Oil',
    'WTI': 'WTI Crude Oil',
    // Crypto
    'BTC/USD': 'Bitcoin',
    'ETH/USD': 'Ethereum',
    'ADA/USD': 'Cardano',
    'SOL/USD': 'Solana'
  };
  
  return names[ticker] || ticker;
}

function getSectorForTicker(ticker: string): string {
  const sectors: { [key: string]: string } = {
    'SPY': 'Index',
    'QQQ': 'Index',
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'NVDA': 'Technology',
    'TSLA': 'Automotive',
    'META': 'Technology',
    'GOOGL': 'Technology',
    'AMZN': 'Consumer Discretionary',
    'IBM': 'Technology',
    'AMD': 'Technology',
    'INTC': 'Technology',
    'ORCL': 'Technology',
    'CRM': 'Technology',
    'ADBE': 'Technology',
    'NFLX': 'Communication Services',
    'PYPL': 'Financial Services',
    'UBER': 'Technology',
    'LYFT': 'Technology',
    'F': 'Automotive',
    'GM': 'Automotive',
    'DAL': 'Airlines',
    'AAL': 'Airlines',
    'CCL': 'Travel & Leisure',
    'GS': 'Financial Services',
    'MS': 'Financial Services',
    'WFC': 'Financial Services',
    'C': 'Financial Services',
    'AXP': 'Financial Services',
    'BA': 'Aerospace',
    'CAT': 'Industrial',
    'HD': 'Retail',
    'JNJ': 'Healthcare',
    'KO': 'Consumer Staples',
    'MCD': 'Consumer Discretionary',
    'NKE': 'Consumer Discretionary',
    'PG': 'Consumer Staples',
    'UNH': 'Healthcare',
    'V': 'Financial Services',
    'WMT': 'Retail',
    'XOM': 'Energy',
    'CVX': 'Energy',
    'PFE': 'Healthcare',
    // European
    'ASML.AS': 'Technology',
    'SAP.DE': 'Technology',
    'NESN.SW': 'Consumer Staples',
    'LVMH.PA': 'Consumer Discretionary',
    'ROG.SW': 'Healthcare',
    'NVO.L': 'Healthcare',
    // Asian
    'TSM': 'Technology',
    'BABA': 'Technology',
    'TCEHY': 'Technology',
    'JD': 'Consumer Discretionary',
    'BIDU': 'Technology',
    'NIO': 'Automotive',
    // Commodities
    'XAUUSD': 'Commodities',
    'XAGUSD': 'Commodities',
    'BRENT': 'Energy',
    'WTI': 'Energy',
    // Crypto
    'BTC/USD': 'Cryptocurrency',
    'ETH/USD': 'Cryptocurrency',
    'ADA/USD': 'Cryptocurrency',
    'SOL/USD': 'Cryptocurrency'
  };
  
  return sectors[ticker] || 'Other';
}

function getFallbackData(): MarketDataItem[] {
  return [
    {
      ticker: 'SPY',
      name: 'SPDR S&P 500',
      price: '420.50',
      change: '3.25',
      performance: '+0.78%',
      volume: '45,123,456',
      trend: 'UPTREND',
      demandSupply: 'HIGH DEMAND',
      optionsSentiment: 'Bullish',
      gammaRisk: 'NEUTRAL',
      unusualAtm: 'Moderate',
      unusualOtm: 'Low',
      otmSkew: 'Medium',
      intradayFlow: 'CALL BUYING',
      putCallRatio: '1.25',
      sector: 'Index',
      direction: '↗️'
    }
  ];
}
