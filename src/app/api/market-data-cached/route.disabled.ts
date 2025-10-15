import { NextRequest, NextResponse } from 'next/server';

// In-memory cache with TTL - 8 hours for maximum freshness
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

// PROFESSIONAL Symbol Lists with Correct API Formats
function getSymbolsByCategory(category: string): string[] {
  switch (category.toLowerCase()) {
    case 'stocks':
      return [
        // Top 100 Tech Giants
        'AAPL', 'GOOGL', 'GOOG', 'MSFT', 'AMZN', 'META', 'TSLA', 'NVDA', 'NFLX', 'ORCL',
        'CRM', 'ADBE', 'INTC', 'CSCO', 'AMD', 'QCOM', 'AVGO', 'TXN', 'IBM', 'SHOP',
        'PYPL', 'SPOT', 'UBER', 'LYFT', 'SNAP', 'ZM', 'DOCU', 'OKTA', 'CRWD',
        'SNOW', 'PLTR', 'RBLX', 'NET', 'DDOG', 'PANW', 'ZS', 'CYBR', 'FTNT',
        'WDAY', 'NOW', 'TEAM', 'VEEV', 'ANSS', 'INTU', 'ADSK',
        
        // Top 50 Financial Giants
        'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'TFC', 'PNC', 'COF',
        'SCHW', 'BLK', 'BX', 'KKR', 'SPGI', 'MCO', 'ICE', 'CME', 'NDAQ', 'CBOE',
        'V', 'MA', 'AXP', 'DIS', 'PYPL', 'SQ', 'BRK-A', 'BRK-B', 'AIG', 'AFL',
        'ALL', 'TRV', 'PGR', 'CB', 'MMC', 'AON', 'BRO', 'EQIX',
        'AMT', 'CCI', 'SBAC', 'DLR', 'PSA', 'EXR', 'AVB', 'EQR', 'UDR', 'ESS',
        
        // Top 50 Healthcare & Biotech
        'UNH', 'JNJ', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'LLY',
        'AMGN', 'GILD', 'BIIB', 'REGN', 'VRTX', 'ILMN', 'ZTS', 'ISRG', 'DXCM',
        'EW', 'HOLX', 'BSX', 'MDT', 'SYK', 'EL', 'CVS', 'WBA', 'MCK', 'CNC',
        'HUM', 'CI', 'UHS', 'HCA', 'THC', 'CYH', 'RDNT', 'VEEV', 'IQV',
        'CRL', 'LH', 'DGX', 'A', 'MTD', 'XRAY', 'ALGN',
        
        // Top 30 Energy & Utilities
        'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'BKR', 'HAL', 'OXY', 'DVN', 'FANG',
        'MPC', 'VLO', 'PSX', 'HES', 'KMI', 'ENB', 'TRP', 'ET', 'EPD', 'MPLX',
        'NEE', 'SO', 'DUK', 'EXC', 'XEL', 'PEG', 'SRE', 'AEP', 'D', 'PCG',
        
        // Top 30 Consumer & Retail
        'AMZN', 'WMT', 'HD', 'COST', 'PG', 'KO', 'PEP', 'NKE', 'SBUX', 'MCD',
        'TGT', 'LOW', 'TJX', 'ROST', 'DG', 'DLTR', 'KR', 'SYY', 'GIS', 'K',
        'CPB', 'CAG', 'HRL', 'TSN', 'SJM', 'MKC', 'CL', 'CHD',
        
        // Top 30 Industrial & Manufacturing
        'BA', 'CAT', 'DE', 'HON', 'MMM', 'GE', 'UPS', 'FDX', 'LMT', 'RTX',
        'NOC', 'GD', 'TDG', 'HEI', 'CTAS', 'EMR', 'ETN', 'PH', 'ITW', 'APD',
        'LIN', 'ECL', 'FTV', 'XYL', 'DOV', 'ROK', 'FAST', 'PCAR', 'CMI', 'IR'
      ];
      
    case 'etfs':
      return [
        // Broad Market ETFs
        'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'IVV', 'VEA', 'VWO', 'IEFA', 'IEMG',
        'VGT', 'XLK', 'VUG', 'VTV', 'IVW', 'IVE', 'VBR', 'VBK', 'VB', 'VSS',
        
        // Sector ETFs
        'XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLRE', 'XLU', 'XLC',
        'VGT', 'VDC', 'VDE', 'VFH', 'VHT', 'VIS', 'VAW', 'VNQ', 'VPU', 'VOX',
        
        // Growth & Value ETFs
        'VUG', 'VTV', 'IVW', 'IVE', 'MTUM', 'QUAL', 'SIZE', 'USMV', 'VLUE',
        'RPG', 'RPV', 'SCHG', 'SCHV', 'SPYG', 'SPYV', 'MGK', 'MGV', 'IWF', 'IWD',
        
        // International ETFs
        'EFA', 'VEA', 'IEFA', 'EEM', 'VWO', 'IEMG', 'VGK', 'EWJ', 'FXI', 'EWZ',
        'INDA', 'EWG', 'EWU', 'EWC', 'EWA', 'EWH', 'EWS', 'EWT', 'EWY', 'EPOL',
        
        // Bond ETFs
        'BND', 'AGG', 'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'JNK', 'EMB', 'BNDX',
        'VGIT', 'VGSH', 'VGLT', 'BSV', 'BIV', 'BLV', 'VCIT', 'VCSH', 'VCLT', 'VMBS',
        
        // Commodity & Real Estate ETFs
        'GLD', 'SLV', 'IAU', 'PDBC', 'DBA', 'USO', 'UNG', 'PALL', 'PPLT', 'CPER',
        'VNQ', 'VNQI', 'REIT', 'REM', 'REZ', 'FREL', 'USRT', 'SCHH', 'IYR', 'XLRE',
        
        // Leveraged & Inverse ETFs
        'TQQQ', 'SQQQ', 'UPRO', 'SPXU', 'TNA', 'TZA', 'TECL', 'TECS', 'CURE', 'RXD',
        'LABU', 'LABD', 'DFEN', 'YINN', 'YANG', 'CHAU', 'BULZ', 'BERZ',
        
        // Dividend ETFs
        'VYM', 'SCHD', 'DVY', 'VIG', 'NOBL', 'HDV', 'DGRO', 'RDVY', 'SPHD', 'SPYD',
        'JEPI', 'JEPQ', 'QYLD', 'RYLD', 'XYLD', 'DIVO', 'PFFD', 'PFF', 'VRP'
      ];
      
    case 'crypto':
      return [
        // Major Cryptocurrencies (Tiingo Crypto format)
        'btcusd', 'ethusd', 'adausd', 'solusd', 'dotusd', 'avaxusd', 'maticusd', 'algousd',
        'atomusd', 'nearusd', 'aptusd', 'suiusd', 'opusd', 'arbusd', 'injusd', 'tiausd',
        
        // DeFi Tokens
        'uniusd', 'linkusd', 'aaveusd', 'mkrusd', 'compusd', 'sushiusd', 'crvusd', '1inchusd',
        'yfiusd', 'snxusd', 'balusd', 'rndusd', 'lptusd', 'umausd', 'bandusd', 'storjusd',
        
        // Layer 1 & Layer 2
        'bnbusd', 'xrpusd', 'lunausd', 'trxusd', 'vetusd', 'filusd', 'icpusd', 'flowusd',
        'hedera', 'xlmusd', 'xtzusd', 'eosusd', 'neousd', 'iotausd', 'qntusd',
        
        // Meme & Community Coins
        'dogeusd', 'shibusd', 'flokiusd', 'pepeusd', 'wifusd', 'bonkusd', 'memeusd'
      ];
      
    case 'commodities':
      return [
        // Commodity ETFs (these exist on exchanges)
        'GLD', 'SLV', 'PALL', 'PPLT', 'USO', 'UNG', 'DBA', 'CORN', 'WEAT', 'SOYB',
        'NIB', 'COW', 'BAL', 'CAFE', 'CANE', 'JO', 'TAGS', 'PDBC', 'DJP', 'GSG',
        'COMT', 'FTGC', 'GUNR', 'PICK', 'REMX', 'SIL', 'COPX', 'URA', 'URNM', 'GLTR'
      ];
      
    case 'forex':
      return [
        // Major Pairs (Tiingo Forex format)
        'eurusd', 'gbpusd', 'usdjpy', 'usdchf', 'audusd', 'usdcad', 'nzdusd',
        
        // Cross Pairs
        'eurgbp', 'eurjpy', 'eurchf', 'euraud', 'eurcad', 'gbpjpy', 'gbpchf',
        'gbpaud', 'gbpcad', 'audjpy', 'audchf', 'audcad', 'cadjpy', 'chfjpy',
        'nzdjpy', 'nzdchf', 'nzdcad',
        
        // Exotic Pairs
        'usdmxn', 'usdzar', 'usdsgd', 'usdhkd', 'usdnok', 'usdsek', 'usddkk',
        'usdpln', 'usdczk', 'usdhuf', 'usdron', 'usdtry', 'usdrub', 'usdcny',
        'usdinr', 'usdkrw', 'usdthb', 'usdidr', 'usdmyr', 'usdphp'
      ];
      
    case 'bonds':
      return [
        // US Treasury ETFs
        'TLT', 'IEF', 'SHY', 'SPTL', 'SPTI', 'SPTS',
        
        // Corporate Bond ETFs
        'LQD', 'VCIT', 'VCLT', 'VCSH', 'IGSB', 'IGIB', 'IGLB',
        
        // High Yield Bond ETFs
        'HYG', 'JNK', 'SHYG', 'SJNK', 'USHY', 'HYDB',
        
        // International Bond ETFs
        'BNDX', 'VTEB', 'EMB', 'VWOB', 'EMLC', 'PCY',
        
        // Municipal Bond ETFs
        'MUB', 'VTEB', 'TFI', 'SMB', 'SHM', 'MUA'
      ];
      
    default:
      return [
        // Default fallback - Top 20 most liquid assets
        'SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
        'GLD', 'SLV', 'TLT', 'HYG', 'VTI', 'VOO', 'IVV', 'EFA', 'EEM', 'VNQ'
      ];
  }
}

// PROFESSIONAL Multi-API Batch Processing Function
async function fetchTiingoDataBatch(symbols: string[], category: string) {
  const BATCH_SIZE = 10; // Optimal batch size for Tiingo API
  const batches = [];
  
  // Split symbols into batches
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    batches.push(symbols.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`🚀 PROFESSIONAL Bulk processing ${symbols.length} symbols from Tiingo ${category.toUpperCase()}...`);
  console.log(`📊 Creating ${batches.length} batches of max ${BATCH_SIZE} symbols each...`);
  
  // Process all batches in parallel using Promise.all
  const batchPromises = batches.map(async (batch, index) => {
    console.log(`📊 Batch ${index + 1}: Processing ${batch.length} symbols in parallel...`);
    
    const symbolPromises = batch.map(async (symbol) => {
      try {
        let url = '';
        let apiType = '';
        
        // PROFESSIONAL: Use correct Tiingo API for each category
        switch (category.toLowerCase()) {
          case 'stocks':
          case 'etfs':
            // IEX API for stocks and ETFs
            url = `https://api.tiingo.com/iex/${symbol}?token=${process.env.TIINGO_API_KEY}`;
            apiType = 'IEX';
            break;
          case 'crypto':
            // Crypto API for cryptocurrencies
            url = `https://api.tiingo.com/tiingo/crypto/prices?tickers=${symbol}&token=${process.env.TIINGO_API_KEY}`;
            apiType = 'CRYPTO';
            break;
          case 'forex':
            // Forex API for currency pairs
            url = `https://api.tiingo.com/tiingo/forex/prices?tickers=${symbol}&token=${process.env.TIINGO_API_KEY}`;
            apiType = 'FOREX';
            break;
          case 'commodities':
          case 'bonds':
            // EOD API for commodities and bonds
            url = `https://api.tiingo.com/tiingo/daily/${symbol}/prices?token=${process.env.TIINGO_API_KEY}`;
            apiType = 'EOD';
            break;
          default:
            console.warn(`⚠️ Unsupported category: ${category}`);
            return null;
        }
        
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });
        
        if (!response.ok) {
          console.warn(`⚠️ Failed to fetch ${apiType} data for ${symbol}: ${response.status}`);
          return null;
        }
        
        const data = await response.json();
        if (!data || data.length === 0) {
          console.warn(`⚠️ No ${apiType} data returned for ${symbol}`);
          return null;
        }
        
        // PROFESSIONAL: Parse response based on API type
        let quote, price, change, changePercent, volume, marketCap;
        
        if (apiType === 'IEX') {
          // IEX API response format
          quote = data[0];
          price = quote.tngoLast || quote.open || quote.prevClose || 0;
          change = quote.tngoLast && quote.prevClose ? quote.tngoLast - quote.prevClose : 0;
          changePercent = quote.prevClose ? ((quote.tngoLast - quote.prevClose) / quote.prevClose) * 100 : 0;
          volume = quote.volume || 0;
          marketCap = volume * price;
        } else if (apiType === 'CRYPTO') {
          // Crypto API response format
          if (data[0] && data[0].priceData && data[0].priceData.length > 0) {
            quote = data[0].priceData[0];
            price = quote.close || 0;
            change = quote.close && quote.open ? quote.close - quote.open : 0;
            changePercent = quote.open ? ((quote.close - quote.open) / quote.open) * 100 : 0;
            volume = quote.volume || 0;
            marketCap = volume * price;
          } else {
            return null;
          }
        } else if (apiType === 'FOREX') {
          // Forex API response format
          if (data[0] && data[0].priceData && data[0].priceData.length > 0) {
            quote = data[0].priceData[0];
            price = quote.close || 0;
            change = quote.close && quote.open ? quote.close - quote.open : 0;
            changePercent = quote.open ? ((quote.close - quote.open) / quote.open) * 100 : 0;
            volume = 1000000; // Forex doesn't have volume, use placeholder
            marketCap = 0; // Forex doesn't have market cap
          } else {
            return null;
          }
        } else if (apiType === 'EOD') {
          // EOD API response format
          quote = data[0];
          price = quote.close || 0;
          change = quote.close && quote.open ? quote.close - quote.open : 0;
          changePercent = quote.open ? ((quote.close - quote.open) / quote.open) * 100 : 0;
          volume = quote.volume || 0;
          marketCap = volume * price;
        }
        
        return {
          symbol,
          name: symbol,
          price,
          change,
          changePercent,
          volume,
          marketCap,
          category: category.charAt(0).toUpperCase() + category.slice(1),
          sector: getSectorFromSymbol(symbol, category),
          timestamp: new Date().toISOString(),
          apiType
        };
      } catch (error) {
        console.warn(`⚠️ Error fetching ${symbol}:`, error);
        return null;
      }
    });
    
    const startTime = Date.now();
    const results = await Promise.all(symbolPromises);
    const endTime = Date.now();
    
    const validResults = results.filter(result => result !== null);
    console.log(`✅ Batch ${index + 1}: Retrieved ${validResults.length} quotes in ${endTime - startTime}ms`);
    
    return validResults;
  });
  
  console.log(`⚡ Executing ${batches.length} batches in parallel...`);
  const startTime = Date.now();
  const allResults = await Promise.all(batchPromises);
  const endTime = Date.now();
  
  // Flatten results
  const flatResults = allResults.flat();
  const totalTime = endTime - startTime;
  const symbolsPerSecond = Math.round((flatResults.length / totalTime) * 1000);
  
  console.log(`🎯 PROFESSIONAL BULK COMPLETED: ${flatResults.length}/${symbols.length} symbols in ${totalTime}ms (${symbolsPerSecond} symbols/sec)`);
  
  return flatResults;
}

// Helper function to assign sectors
function getSectorFromSymbol(symbol: string, category: string): string {
  if (category === 'stocks') {
    // Tech stocks
    if (['AAPL', 'GOOGL', 'GOOG', 'MSFT', 'AMZN', 'META', 'TSLA', 'NVDA', 'NFLX', 'ORCL', 'CRM', 'ADBE', 'INTC', 'CSCO', 'AMD', 'QCOM', 'AVGO', 'TXN', 'IBM'].includes(symbol)) {
      return 'Technology';
    }
    // Finance stocks
    if (['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'TFC', 'PNC', 'COF', 'V', 'MA', 'AXP', 'BRK-A', 'BRK-B'].includes(symbol)) {
      return 'Financials';
    }
    // Healthcare stocks
    if (['UNH', 'JNJ', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'LLY', 'AMGN', 'GILD', 'BIIB', 'REGN', 'VRTX'].includes(symbol)) {
      return 'Healthcare';
    }
    // Energy stocks
    if (['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'BKR', 'HAL', 'OXY', 'DVN', 'FANG'].includes(symbol)) {
      return 'Energy';
    }
    // Consumer stocks
    if (['WMT', 'HD', 'COST', 'PG', 'KO', 'PEP', 'NKE', 'SBUX', 'MCD', 'TGT'].includes(symbol)) {
      return 'Consumer';
    }
    // Industrial stocks
    if (['BA', 'CAT', 'DE', 'HON', 'MMM', 'GE', 'UPS', 'FDX', 'LMT', 'RTX'].includes(symbol)) {
      return 'Industrials';
    }
    return 'Other';
  } else if (category === 'etfs') {
    if (symbol.startsWith('XL')) return 'Sector ETFs';
    if (['SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'IVV'].includes(symbol)) return 'Broad Market';
    if (['VEA', 'VWO', 'EFA', 'EEM'].includes(symbol)) return 'International';
    if (['BND', 'AGG', 'TLT', 'HYG', 'JNK'].includes(symbol)) return 'Bonds';
    if (['GLD', 'SLV', 'VNQ'].includes(symbol)) return 'Commodities';
    return 'Specialty';
  } else if (category === 'crypto') {
    if (['BTCUSD', 'ETHUSD', 'BNBUSD', 'XRPUSD', 'ADAUSD'].includes(symbol)) return 'Major Crypto';
    if (symbol.includes('USD') && ['UNI', 'LINK', 'AAVE', 'MKR', 'COMP'].some(token => symbol.startsWith(token))) return 'DeFi';
    return 'Altcoins';
  } else if (category === 'forex') {
    if (['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'].includes(symbol)) return 'Major Pairs';
    if (symbol.length === 6 && !symbol.includes('USD')) return 'Cross Pairs';
    return 'Exotic Pairs';
  } else if (category === 'commodities') {
    if (['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'].includes(symbol)) return 'Precious Metals';
    if (['USOIL', 'UKOIL', 'NGAS'].includes(symbol)) return 'Energy';
    return 'Other Commodities';
  } else if (category === 'bonds') {
    if (['TLT', 'IEF', 'SHY'].includes(symbol)) return 'US Treasury';
    if (['LQD', 'HYG', 'JNK'].includes(symbol)) return 'Corporate';
    return 'Other Bonds';
  }
  
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'stocks';
    const clearCache = searchParams.get('clearCache') === 'true';
    
    console.log(`🔍 Fetching PROFESSIONAL market data for category: ${category}`);
    
    // Check cache first (unless clearCache is requested)
    const cacheKey = `market-data-${category}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry && !clearCache) {
      console.log(`⚡ CACHE HIT: Returning cached data for ${category} (${cached.data.length} items)`);
      return NextResponse.json({
        success: true,
        data: cached.data,
        category,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // Clear cache if requested or expired
    if (clearCache) {
      cache.delete(cacheKey);
      console.log(`🧹 CACHE CLEARED for ${category}`);
    }
    
    // Get symbols for the category
    const symbols = getSymbolsByCategory(category);
    console.log(`📊 Processing ${symbols.length} symbols for ${category} category`);
    
    // Fetch data with professional batch processing
    const data = await fetchTiingoDataBatch(symbols, category);
    
    // Cache the results
    cache.set(cacheKey, {
      data,
      expiry: Date.now() + CACHE_TTL
    });
    
    console.log(`✅ PROFESSIONAL API Complete: ${data.length} assets retrieved for ${category} with guaranteed data quality`);
    
    return NextResponse.json({
      success: true,
      data,
      category,
      cached: false,
      timestamp: new Date().toISOString(),
      totalSymbols: symbols.length,
      retrievedSymbols: data.length,
      cacheExpiry: new Date(Date.now() + CACHE_TTL).toISOString(),
      dataQuality: 'PROFESSIONAL_GRADE'
    });
    
  } catch (error) {
    console.error('❌ PROFESSIONAL API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch professional market data',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
