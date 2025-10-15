import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// PROFESSIONAL In-Memory Cache with TTL
interface CacheEntry {
  data: any[];
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

// Clear cache entry
function clearCache(key?: string) {
  if (key) {
    cache.delete(key);
    console.log(`🔄 PROFESSIONAL: Cache cleared for ${key}`);
  } else {
    cache.clear();
    console.log('🔄 PROFESSIONAL: All cache cleared');
  }
}

// Get cached data or return null
function getCachedData(key: string): any[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

// Set cache data
function setCacheData(key: string, data: any[], ttl = CACHE_TTL) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

// PROFESSIONAL Symbol Lists by Category
function getSymbolsByCategory(category: string): string[] {
  switch (category.toLowerCase()) {
    case 'stocks':
      return [
        // MEGA CAP (>$200B)
        'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'TSM',
        'LLY', 'V', 'AVGO', 'JPM', 'WMT', 'UNH', 'XOM', 'MA', 'ORCL', 'HD',
        
        // LARGE CAP ($10B-$200B)
        'PG', 'JNJ', 'COST', 'ABBV', 'NFLX', 'BAC', 'KO', 'ADBE', 'CVX', 'CRM',
        'AMD', 'TMUS', 'MRK', 'TMO', 'PEP', 'ACN', 'CSCO', 'ABT', 'LIN', 'WFC',
        'DHR', 'TXN', 'VZ', 'PMT', 'QCOM', 'INTU', 'IBM', 'CAT', 'GE', 'RTX',
        
        // HIGH-GROWTH TECH
        'NOW', 'CRM', 'SHOP', 'SNAP', 'UBER', 'LYFT', 'ROKU', 'ZM', 'PTON', 'RBLX',
        'RIVN', 'LCID', 'AI', 'PLTR', 'SNOW', 'CRWD', 'ZS', 'OKTA', 'NET', 'DDOG',
        
        // FINANCIAL SERVICES
        'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'AXP', 'USB', 'PNC', 'BLK',
        'SPG', 'AMT', 'PLD', 'EQIX', 'PSA', 'WELL', 'AVB', 'EXR', 'VICI', 'O',
        
        // HEALTHCARE & BIOTECH
        'JNJ', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'GILD', 'AMGN',
        'MRNA', 'BNTX', 'REGN', 'VRTX', 'BIIB', 'ILMN', 'ISRG', 'ZBH', 'SYK', 'BSX',
        
        // ENERGY & UTILITIES
        'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC', 'PSX', 'VLO', 'OXY', 'BKR',
        'NEE', 'SO', 'DUK', 'AEP', 'EXC', 'XEL', 'PEG', 'ED', 'ETR', 'WEC',
        
        // CONSUMER & RETAIL
        'AMZN', 'WMT', 'COST', 'HD', 'TGT', 'LOW', 'SBUX', 'MCD', 'NKE', 'TJX',
        'PG', 'KO', 'PEP', 'CL', 'KMB', 'GIS', 'K', 'CPB', 'CAG', 'SJM',
        
        // INDUSTRIAL & MATERIALS
        'CAT', 'BA', 'RTX', 'HON', 'UPS', 'UNP', 'DE', 'MMM', 'GD', 'LMT',
        'APD', 'LIN', 'ECL', 'SHW', 'FCX', 'NEM', 'FreeportMcM', 'AA', 'X', 'CLF'
      ];
      
    case 'etfs':
      return [
        // BROAD MARKET
        'SPY', 'QQQ', 'VTI', 'VOO', 'VUG', 'VTV', 'IWM', 'VEA', 'EEM', 'VWO',
        
        // SECTOR SPECIFIC
        'XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLP', 'XLY', 'XLU', 'XLRE', 'XLC',
        'VGT', 'VHT', 'VFH', 'VDE', 'VIS', 'VDC', 'VCR', 'VPU', 'VNQI', 'VAW',
        
        // GROWTH & VALUE
        'IVW', 'IVE', 'VUG', 'VTV', 'MTUM', 'QUAL', 'SIZE', 'USMV', 'VLUE', 'MIN',
        
        // INTERNATIONAL
        'EFA', 'VEA', 'IEFA', 'EEM', 'VWO', 'IEMG', 'VGK', 'EWJ', 'FXI', 'EWZ',
        
        // BONDS
        'BND', 'AGG', 'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'JNK', 'EMB', 'BNDX',
        
        // COMMODITIES
        'GLD', 'SLV', 'IAU', 'PDBC', 'DBA', 'USO', 'UNG', 'VNQ', 'VNQI', 'REIT',
        
        // DIVIDEND FOCUSED
        'VYM', 'SCHD', 'DVY', 'VIG', 'NOBL', 'HDV', 'DGRO', 'SPHD', 'SPYD', 'JEPI'
      ];
      
    case 'crypto':
      return [
        'BTC-USD', 'ETH-USD', 'ADA-USD', 'SOL-USD', 'DOT-USD', 'AVAX-USD', 'MATIC-USD', 'ALGO-USD',
        'ATOM-USD', 'NEAR-USD', 'APT-USD', 'SUI-USD', 'OP-USD', 'ARB-USD', 'INJ-USD', 'TIA-USD',
        'UNI-USD', 'LINK-USD', 'AAVE-USD', 'MKR-USD', 'COMP-USD', 'SUSHI-USD', 'CRV-USD',
        'YFI-USD', 'SNX-USD', 'BAL-USD', 'REN-USD', 'LPT-USD', 'UMA-USD', 'STORJ-USD',
        'BNB-USD', 'XRP-USD', 'LUNA-USD', 'TRX-USD', 'VET-USD', 'FIL-USD', 'ICP-USD',
        'DOGE-USD', 'SHIB-USD', 'FLOKI-USD', 'PEPE-USD', 'WIF-USD', 'BONK-USD'
      ];
      
    case 'forex':
      return [
        'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'AUDUSD=X', 'USDCHF=X', 'USDCAD=X', 'NZDUSD=X',
        'EURGBP=X', 'EURJPY=X', 'GBPJPY=X', 'AUDJPY=X', 'CHFJPY=X', 'CADJPY=X', 'NZDJPY=X',
        'EURCHF=X', 'GBPCHF=X', 'AUDCHF=X', 'NZDCHF=X', 'EURCAD=X', 'GBPCAD=X', 'AUDCAD=X',
        'EURAUD=X', 'GBPAUD=X', 'USDCNY=X', 'USDHKD=X', 'USDSGD=X', 'USDKRW=X', 'USDINR=X',
        'USDMXN=X', 'USDBRL=X', 'USDRUB=X', 'USDTRY=X', 'USDZAR=X', 'USDPLN=X', 'USDCZK=X',
        'USDSEK=X', 'USDNOK=X', 'USDDKK=X', 'USDHUF=X', 'USDRON=X', 'USDPHP=X', 'USDTHB=X'
      ];
      
    case 'commodities':
      return [
        // PRECIOUS METALS
        'GC=F', 'SI=F', 'PA=F', 'PL=F', 'HG=F',
        
        // ENERGY
        'CL=F', 'NG=F', 'BZ=F', 'RB=F', 'HO=F',
        
        // AGRICULTURE
        'ZC=F', 'ZS=F', 'ZW=F', 'KC=F', 'CT=F', 'CC=F', 'SB=F', 'OJ=F',
        
        // LIVESTOCK
        'LE=F', 'HE=F', 'GF=F',
        
        // INDUSTRIAL METALS
        'ALI=F', 'ZN=F', 'NI=F'
      ];
      
    case 'bonds':
      return [
        // US TREASURY
        '^TNX', '^TYX', '^FVX', '^IRX',
        
        // TREASURY ETFS
        'TLT', 'TLH', 'IEF', 'IEI', 'SHY', 'SHV', 'BIL', 'SCHO', 'SCHR', 'SPTS',
        
        // CORPORATE BONDS
        'LQD', 'VCIT', 'VCSH', 'VCLT', 'IGSB', 'IGIB', 'IGLB', 'AGG', 'BND', 'VTEB',
        
        // HIGH YIELD
        'HYG', 'JNK', 'SHYG', 'SJNK', 'USHY', 'HYEM', 'EMHY'
      ];
      
    default:
      return [
        'SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'BTC-USD',
        'ETH-USD', 'GLD', 'TLT', 'EURUSD=X', 'GC=F', 'CL=F', 'NG=F', 'VTI', 'EFA', 'EEM'
      ];
  }
}

// PROFESSIONAL Multi-API Hybrid Data Fetcher
async function fetchHybridData(symbols: string[], category: string) {
  const results: any[] = [];
  const BATCH_SIZE = 10;
  
  console.log(`🚀 PROFESSIONAL Hybrid processing ${symbols.length} symbols for ${category.toUpperCase()}...`);
  
  // Split symbols into batches
  const batches = [];
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    batches.push(symbols.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`📊 Creating ${batches.length} batches of max ${BATCH_SIZE} symbols each...`);
  
  // Process all batches in parallel
  const batchPromises = batches.map(async (batch, index) => {
    console.log(`📊 Batch ${index + 1}: Processing ${batch.length} symbols in parallel...`);
    
    const batchResults: any[] = [];
    
    // Use different strategies based on category
    if (category === 'stocks' || category === 'etfs') {
      // Primary: Tiingo IEX for stocks/ETFs
      try {
        if (process.env.TIINGO_API_KEY) {
          const tiingoUrl = `https://api.tiingo.com/iex?tickers=${batch.join(',')}&token=${process.env.TIINGO_API_KEY}`;
          const response = await fetch(tiingoUrl);
          
          if (response.ok) {
            const tiingoData = await response.json();
            batchResults.push(...tiingoData.map((item: any) => ({
              symbol: item.ticker,
              name: item.ticker,
              price: item.last,
              previousClose: item.prevClose || item.last,
              change: item.last - (item.prevClose || item.last),
              changePercent: ((item.last - (item.prevClose || item.last)) / (item.prevClose || item.last)) * 100,
              volume: item.volume || 0,
              marketCap: item.marketCap || 0,
              sector: getSectorForSymbol(item.ticker),
              source: 'Tiingo'
            })));
          }
        }
      } catch (error) {
        console.warn(`⚠️ Tiingo failed for batch ${index + 1}, falling back to Yahoo Finance`);
      }
      
      // Fallback or complement: Yahoo Finance
      if (batchResults.length < batch.length * 0.8) {
        try {
          const yahooPromises = batch.map(async (symbol) => {
            try {
              const quote = await yahooFinance.quote(symbol);
              return {
                symbol: quote.symbol,
                name: quote.shortName || quote.symbol,
                price: quote.regularMarketPrice || 0,
                previousClose: quote.regularMarketPreviousClose || 0,
                change: quote.regularMarketChange || 0,
                changePercent: quote.regularMarketChangePercent || 0,
                volume: quote.regularMarketVolume || 0,
                marketCap: quote.marketCap || 0,
                sector: getSectorForSymbol(quote.symbol),
                source: 'Yahoo'
              };
            } catch (err) {
              console.warn(`⚠️ Yahoo failed for ${symbol}`);
              return null;
            }
          });
          
          const yahooResults = await Promise.all(yahooPromises);
          const validResults = yahooResults.filter(r => r !== null);
          batchResults.push(...validResults);
        } catch (error) {
          console.warn(`⚠️ Yahoo Finance batch failed for ${index + 1}`);
        }
      }
    } else {
      // For crypto, forex, commodities, bonds: Use Yahoo Finance primarily
      try {
        const yahooPromises = batch.map(async (symbol) => {
          try {
            const quote = await yahooFinance.quote(symbol);
            return {
              symbol: quote.symbol,
              name: quote.shortName || quote.symbol,
              price: quote.regularMarketPrice || 0,
              previousClose: quote.regularMarketPreviousClose || 0,
              change: quote.regularMarketChange || 0,
              changePercent: quote.regularMarketChangePercent || 0,
              volume: quote.regularMarketVolume || 0,
              marketCap: quote.marketCap || 0,
              sector: getCategoryForSymbol(quote.symbol, category),
              source: 'Yahoo'
            };
          } catch (err) {
            console.warn(`⚠️ Yahoo failed for ${symbol}`);
            return null;
          }
        });
        
        const yahooResults = await Promise.all(yahooPromises);
        const validResults = yahooResults.filter(r => r !== null);
        batchResults.push(...validResults);
      } catch (error) {
        console.warn(`⚠️ Yahoo Finance batch failed for ${category} batch ${index + 1}`);
      }
    }
    
    console.log(`✅ Batch ${index + 1}: Retrieved ${batchResults.length} quotes`);
    return batchResults;
  });
  
  // Wait for all batches to complete
  const allBatchResults = await Promise.all(batchPromises);
  const finalResults = allBatchResults.flat();
  
  console.log(`🎯 PROFESSIONAL HYBRID COMPLETED: ${finalResults.length}/${symbols.length} symbols retrieved`);
  console.log(`✅ PROFESSIONAL API Complete: ${finalResults.length} assets retrieved for ${category} with hybrid data quality`);
  
  return finalResults;
}

// Helper function to determine sector
function getSectorForSymbol(symbol: string): string {
  const techSymbols = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NVDA', 'ORCL', 'CRM', 'AMD', 'INTC'];
  const financeSymbols = ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'AXP', 'USB', 'PNC', 'BLK'];
  const healthSymbols = ['JNJ', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'GILD', 'AMGN'];
  const energySymbols = ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC', 'PSX', 'VLO', 'OXY', 'BKR'];
  
  if (techSymbols.includes(symbol)) return 'Technology';
  if (financeSymbols.includes(symbol)) return 'Financial Services';
  if (healthSymbols.includes(symbol)) return 'Healthcare';
  if (energySymbols.includes(symbol)) return 'Energy';
  
  return 'Mixed';
}

// Helper function to determine category for non-stock assets
function getCategoryForSymbol(symbol: string, category: string): string {
  switch (category.toLowerCase()) {
    case 'crypto':
      if (symbol.includes('BTC')) return 'Bitcoin';
      if (symbol.includes('ETH')) return 'Ethereum';
      if (symbol.includes('USD')) return 'Cryptocurrency';
      return 'Digital Assets';
    case 'forex':
      if (symbol.includes('USD')) return 'USD Pairs';
      if (symbol.includes('EUR')) return 'EUR Pairs';
      if (symbol.includes('GBP')) return 'GBP Pairs';
      if (symbol.includes('JPY')) return 'JPY Pairs';
      return 'Currency Exchange';
    case 'commodities':
      if (symbol.includes('GC') || symbol.includes('SI')) return 'Precious Metals';
      if (symbol.includes('CL') || symbol.includes('NG')) return 'Energy';
      if (symbol.includes('ZC') || symbol.includes('ZS')) return 'Agriculture';
      return 'Raw Materials';
    case 'bonds':
      if (symbol.includes('TLT') || symbol.includes('IEF')) return 'Treasury';
      if (symbol.includes('LQD') || symbol.includes('HYG')) return 'Corporate';
      return 'Fixed Income';
    default:
      return 'Mixed';
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'stocks';
    const clearCacheParam = searchParams.get('clearCache');
    
    // Clear cache if requested
    if (clearCacheParam === '1' || clearCacheParam === 'true') {
      clearCache(category);
    }
    
    console.log(`🔍 Fetching PROFESSIONAL HYBRID market data for category: ${category}`);
    
    // Check cache first
    const cachedData = getCachedData(category);
    if (cachedData) {
      console.log(`⚡ CACHE HIT: Returning cached data for ${category} (${cachedData.length} items)`);
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + CACHE_TTL).toISOString(),
        stale: false
      });
    }
    
    // Get symbols for category
    const symbols = getSymbolsByCategory(category);
    console.log(`📊 Processing ${symbols.length} symbols for ${category} category`);
    
    // Fetch data using hybrid approach
    const marketData = await fetchHybridData(symbols, category);
    
    // Cache the results
    setCacheData(category, marketData);
    
    return NextResponse.json({
      success: true,
      data: marketData,
      cached: false,
      timestamp: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + CACHE_TTL).toISOString(),
      stale: false
    });
    
  } catch (error) {
    console.error('❌ PROFESSIONAL API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch professional market data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
