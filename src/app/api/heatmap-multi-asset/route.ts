import { NextRequest, NextResponse } from 'next/server'
import { TiingoService } from '@/lib/tiingo'
import { FredService } from '@/lib/fred'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

// Initialize service instances
const tiingo = new TiingoService()
const fred = new FredService()

// COMPREHENSIVE Asset Categories Configuration - TUTTI I TICKER
const ASSET_CATEGORIES = {
  EQUITY: {
    name: '📈 Equity',
    icon: '📈',
    description: 'Stocks, Indices & ETFs',
    color: '#1E40AF',
    bgColor: '#EFF6FF',
    symbols: [
      // MEGA CAP STOCKS
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 'BRK-B', 'UNH',
      'XOM', 'JNJ', 'JPM', 'V', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV', 'PEP', 'KO',
      'WMT', 'BAC', 'TMO', 'CRM', 'ACN', 'MCD', 'VZ', 'ADBE', 'NFLX', 'ABT', 'WFC',
      'COST', 'NKE', 'TXN', 'DHR', 'NEE', 'ORCL', 'CVS', 'LIN', 'DIS', 'BMY', 'TMUS',
      // MAJOR INDICES & ETFS
      'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'AGG', 'BND', 'VIG', 'VYM',
      'SCHD', 'SPDW', 'ITOT', 'IXUS', 'IEFA', 'IEMG', 'IJH', 'IJR', 'IVV', 'VXUS',
      // SECTOR ETFS - COMPLETE SET
      'XLK', 'XLF', 'XLV', 'XLI', 'XLE', 'XLB', 'XLRE', 'XLU', 'XLP', 'XLY', 'XLC',
      'XBI', 'XHB', 'XME', 'XRT', 'XTN', 'XOP', 'JETS', 'HACK', 'BOTZ', 'CLOU',
      // GROWTH & VALUE
      'VUG', 'VTV', 'IWF', 'IWD', 'MTUM', 'QUAL', 'SIZE', 'USMV', 'VLUE', 'VMOT'
    ]
  },
  FOREX: {
    name: '💱 Forex',
    icon: '💱', 
    description: 'Major & Cross Currency Pairs - COMPLETE SET',
    color: '#059669',
    bgColor: '#ECFDF5',
    symbols: [
      // MAJOR PAIRS (USD vs G7)
      'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X', 'AUDUSD=X', 'USDCAD=X', 'NZDUSD=X',
      // CROSS PAIRS (EUR)
      'EURGBP=X', 'EURJPY=X', 'EURCHF=X', 'EURAUD=X', 'EURCAD=X', 'EURNZD=X', 'EURNOK=X', 'EURSEK=X',
      // CROSS PAIRS (GBP)
      'GBPJPY=X', 'GBPCHF=X', 'GBPAUD=X', 'GBPCAD=X', 'GBPNZD=X', 'GBPNOK=X', 'GBPSEK=X',
      // CROSS PAIRS (JPY)
      'CHFJPY=X', 'CADJPY=X', 'AUDJPY=X', 'NZDJPY=X',
      // EXOTIC & EMERGING
      'USDMXN=X', 'USDBRL=X', 'USDCNY=X', 'USDINR=X', 'USDKRW=X', 'USDSGD=X', 'USDHKD=X',
      'USDZAR=X', 'USDTRY=X', 'USDRUB=X', 'USDPLN=X', 'USDCZK=X', 'USDHUF=X',
      // COMMODITY CURRENCIES
      'USDNOK=X', 'USDSEK=X', 'USDDKK=X', 'USDILS=X'
    ]
  },
  CRYPTO: {
    name: '₿ Crypto',
    icon: '₿',
    description: 'Digital Assets & Cryptocurrencies - TOP 50',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    symbols: [
      // TOP 10 BY MARKET CAP
      'BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD', 'SOL-USD', 'DOGE-USD', 'TRX-USD', 'TON11419-USD', 'MATIC-USD',
      // MAJOR ALTCOINS
      'DOT-USD', 'AVAX-USD', 'SHIB-USD', 'LTC-USD', 'BCH-USD', 'LINK-USD', 'ATOM-USD', 'XLM-USD', 'UNI1-USD', 'XMR-USD',
      // DEFI TOKENS
      'AAVE-USD', 'MKR-USD', 'COMP-USD', 'YFI-USD', 'SNX-USD', 'SUSHI-USD', 'CRV-USD', '1INCH-USD', 'BAL-USD',
      // LAYER 1 & LAYER 2
      'ALGO-USD', 'VET-USD', 'ICP-USD', 'FTM-USD', 'NEAR-USD', 'FLOW-USD', 'HBAR-USD', 'EOS-USD', 'XTZ-USD',
      // MEME & SOCIAL
      'PEPE24478-USD', 'FLOKI-USD', 'BONK-USD', 'WIF-USD', 'BOME-USD',
      // WEB3 & NFT
      'ENS-USD', 'SAND-USD', 'MANA-USD', 'AXS-USD', 'CHZ-USD'
    ]
  },
  COMMODITIES: {
    name: '⚒️ Commodities',
    icon: '⚒️',
    description: 'Precious Metals, Energy, Agriculture & Industrial - COMPLETE',
    color: '#B45309',
    bgColor: '#FEF3C7',
    symbols: [
      // PRECIOUS METALS
      'GC=F', 'SI=F', 'PL=F', 'PA=F', // Gold, Silver, Platinum, Palladium
      // ENERGY
      'CL=F', 'BZ=F', 'NG=F', 'RB=F', 'HO=F', // Crude Oil WTI, Brent, Natural Gas, RBOB Gas, Heating Oil
      // BASE METALS
      'HG=F', 'ZN=F', 'ZS=F', 'ZL=F', 'ZM=F', // Copper, Zinc, Lead, Aluminum, Nickel
      // AGRICULTURAL - GRAINS
      'ZC=F', 'ZW=F', 'ZS=F', 'ZR=F', 'ZO=F', 'ZM=F', // Corn, Wheat, Soybeans, Rough Rice, Oats, Soybean Meal
      // AGRICULTURAL - SOFT COMMODITIES
      'KC=F', 'SB=F', 'CC=F', 'CT=F', 'OJ=F', 'LB=F', // Coffee, Sugar, Cocoa, Cotton, Orange Juice, Lumber
      // LIVESTOCK
      'LE=F', 'GF=F', 'HE=F', // Live Cattle, Feeder Cattle, Lean Hogs
      // ETFs per commodities
      'GLD', 'SLV', 'PDBC', 'DBA', 'USO', 'UNG', 'COPX', 'CORN', 'WEAT', 'SOYB'
    ]
  },
  BONDS: {
    name: '🏦 Bonds & Fixed Income',
    icon: '🏦',
    description: 'Government, Corporate & International Bonds - COMPLETE YIELD CURVE',
    color: '#7C3AED',
    bgColor: '#F3E8FF',
    symbols: [
      // US TREASURY YIELDS (FRED DATA)
      '^TNX', '^TYX', '^IRX', '^FVX', '^GSP10', '^GSP05', '^GSP02', '^GSP30',
      // US TREASURY ETFS
      'TLT', 'IEF', 'SHY', 'TLH', 'TIP', 'VTEB', 'VGIT', 'VGSH', 'VGLT',
      // CORPORATE BONDS
      'LQD', 'HYG', 'AGG', 'BND', 'VCIT', 'VCSH', 'VCLT', 'JNK', 'EMB',
      // INTERNATIONAL BONDS
      'BNDX', 'VWOB', 'BWX', 'WIP', 'PFXF', 'SCHZ', 'IGLB',
      // MUNICIPAL BONDS
      'MUB', 'VTEB', 'MUNI', 'PZA', 'NAN', 'PMF',
      // INFLATION PROTECTED
      'TIPS', 'SCHP', 'VTIP', 'STIP', 'LTPZ',
      // HIGH YIELD & EMERGING
      'SHYG', 'USHY', 'HYEM', 'CEMB', 'PCY'
    ],
    // FRED Series IDs for real bond data
    fredSeries: [
      'DGS10', 'DGS30', 'DGS3MO', 'DGS5', 'DGS2', 'DGS1', 'DGS7', 'DGS20',
      'BAMLH0A0HYM2', 'BAMLC0A0CM', 'DEXUSEU', 'DEXJPUS', 'DEXUSUK'
    ]
  },
  REITS: {
    name: '🏢 REITs',
    icon: '🏢',
    description: 'Real Estate Investment Trusts - ALL SECTORS',
    color: '#059669',
    bgColor: '#ECFDF5',
    symbols: [
      // BROAD REIT ETFS
      'VNQ', 'XLRE', 'IYR', 'SCHH', 'FREL', 'RWR', 'USRT', 'MORT',
      // RESIDENTIAL REITs
      'EXR', 'AVB', 'EQR', 'MAA', 'ESS', 'UDR', 'CPT', 'AMH', 'ACC',
      // COMMERCIAL REITs
      'PLD', 'AMT', 'CCI', 'EQIX', 'SPG', 'O', 'WELL', 'PSA', 'DLR',
      // HEALTHCARE REITs
      'WELL', 'PEAK', 'VTR', 'CTRE', 'OHI', 'HCP', 'HR', 'DHC',
      // RETAIL REITs
      'SPG', 'REG', 'FRT', 'KIM', 'SKT', 'BRX', 'WPG', 'MAC'
    ]
  }
}

// Cache configuration
let dataCache = new Map()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes
const BATCH_SIZE = 10

// Helper functions
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const getColorFromPerformance = (performance: number): { bg: string, text: string, border: string } => {
  if (performance >= 5) return { bg: '#006600', text: '#ffffff', border: '#008800' }
  if (performance >= 3) return { bg: '#008800', text: '#ffffff', border: '#00aa00' }
  if (performance >= 1) return { bg: '#00aa00', text: '#ffffff', border: '#00cc00' }
  if (performance >= 0.5) return { bg: '#00cc00', text: '#000000', border: '#00ee00' }
  if (performance >= 0) return { bg: '#00ee00', text: '#000000', border: '#00ff00' }
  if (performance >= -0.5) return { bg: '#ffeeee', text: '#000000', border: '#ffcccc' }
  if (performance >= -1) return { bg: '#ffcccc', text: '#000000', border: '#ffaaaa' }
  if (performance >= -3) return { bg: '#ff6666', text: '#ffffff', border: '#ff4444' }
  if (performance >= -5) return { bg: '#cc0000', text: '#ffffff', border: '#aa0000' }
  return { bg: '#990000', text: '#ffffff', border: '#770000' }
}

// Tiingo API function using TiingoService
async function fetchFromTiingo(symbols: string[]): Promise<any[]> {
  try {
    console.log(`🚀 Fetching ${symbols.length} symbols from Tiingo using getBulkQuotes...`);
    
    // Use the ultra-fast bulk method for maximum performance
    const results = await tiingo.getBulkQuotes(symbols, 12);
    
    if (!results || results.length === 0) {
      console.warn('⚠️ Bulk API failed, using fallback individual quotes...');
      // Fallback to individual requests for critical symbols
      const criticalSymbols = symbols.slice(0, 50);
      const fallbackResults = await tiingo.getMultipleQuotes(criticalSymbols);
      return fallbackResults.filter(item => item.data !== null).map(item => item.data);
    }
    
    console.log(`✅ Tiingo retrieved ${results.length} symbols successfully`);
    return results;
    
  } catch (error) {
    console.warn('❌ TiingoService failed:', error);
    return [];
  }
}

// Yahoo Finance API function - FIXED for proper data
async function fetchFromYahoo(symbols: string[]): Promise<any[]> {
  const results = []
  
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE)
    
    try {
      // Process each symbol individually for better success rate
      for (const symbol of batch) {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            signal: AbortSignal.timeout(5000)
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.chart?.result?.[0]) {
              const result = data.chart.result[0]
              const meta = result.meta
              const quote = result.indicators?.quote?.[0]
              
              if (meta && quote) {
                const current = meta.regularMarketPrice || meta.previousClose || quote.close?.[quote.close.length - 1]
                const previous = meta.previousClose || meta.chartPreviousClose
                const change = current - previous
                const changePercent = (change / previous) * 100
                
                results.push({
                  symbol: symbol,
                  price: current,
                  change: change,
                  changePercent: changePercent,
                  volume: meta.regularMarketVolume || quote.volume?.[quote.volume.length - 1],
                  high: meta.regularMarketDayHigh || quote.high?.[quote.high.length - 1],
                  low: meta.regularMarketDayLow || quote.low?.[quote.low.length - 1],
                  open: quote.open?.[0],
                  source: 'Yahoo Finance'
                })
                console.log(`✅ Yahoo: Retrieved ${symbol} - Price: ${current}`)
              }
            }
          } else {
            console.warn(`❌ Yahoo API error for ${symbol}: ${response.status}`)
          }
          
          await delay(50) // Rate limiting
        } catch (error) {
          console.warn(`❌ Yahoo failed for ${symbol}:`, error)
        }
      }
      
      await delay(100) // Batch delay
    } catch (error) {
      console.warn(`❌ Yahoo batch failed:`, error)
    }
  }
  
  return results
}

// FRED API for bonds using FredService
async function fetchBondYields(): Promise<any[]> {
  try {
    console.log('🏦 Fetching bond yields from FRED API...');
    
    const bondSeries = [
      { series: 'DGS10', symbol: '^TNX', name: '10-Year Treasury' },
      { series: 'DGS30', symbol: '^TYX', name: '30-Year Treasury' },
      { series: 'DGS3MO', symbol: '^IRX', name: '3-Month Treasury' },
      { series: 'DGS5', symbol: '^FVX', name: '5-Year Treasury' },
      { series: 'DGS2', symbol: '^GSP02', name: '2-Year Treasury' },
      { series: 'DGS7', symbol: '^GSP07', name: '7-Year Treasury' }
    ];
    
    const results = [];
    
    for (const bond of bondSeries) {
      try {
        const data = await fred.getEconomicIndicator(bond.series, 2);
        if (data && data.observations && data.observations.length > 0) {
          const latest = data.observations[0];
          const previous = data.observations[1] || latest;
          
          const currentYield = parseFloat(latest.value);
          const previousYield = parseFloat(previous.value);
          const change = currentYield - previousYield;
          const changePercent = (change / previousYield) * 100;
          
          results.push({
            symbol: bond.symbol,
            name: bond.name,
            price: currentYield,
            change: change,
            changePercent: changePercent,
            volume: undefined,
            category: 'bonds',
            source: 'FRED',
            date: latest.date
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch ${bond.name}:`, error);
      }
    }
    
    console.log(`✅ Retrieved ${results.length} bond yields from FRED`);
    return results;
    
  } catch (error) {
    console.warn('❌ FRED API failed:', error);
    return [];
  }
}

// Process and normalize data
function processAssetData(rawData: any[], category: string, categoryInfo: any): any[] {
  return rawData.map((item, index) => {
    const symbol = item.symbol || item.meta?.symbol || categoryInfo.symbols[index] || `UNKNOWN_${index}`
    const current = item.adjClose || item.close || item.price || item.yield
    const previous = item.prevClose || item.open || current
    const changePercent = ((current - previous) / previous) * 100
    
    // Calculate market cap based on category
    const marketCap = item.marketCap
    
    return {
      symbol,
      name: item.name || symbol,
      price: current,
      change: current - previous,
      changePercent,
      volume: item.volume,
      marketCap,
      category,
      categoryInfo,
      performance: changePercent,
      colors: getColorFromPerformance(changePercent),
      volatility: Math.abs(changePercent),
      strength: changePercent > 0 ? 'strong' : 'weak'
    }
  })
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request as unknown as Request)
  const rl = rateLimit(`heatmap:${ip}`, 60, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429, headers: rateLimitHeaders(rl) })
  }
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || 'all'
  const timeframe = searchParams.get('timeframe') || '1d'
  const nocache = searchParams.has('nocache')
  
  const cacheKey = `heatmap-${category}-${timeframe}`
  
  // Check cache
  if (!nocache && dataCache.has(cacheKey)) {
    const cached = dataCache.get(cacheKey)
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        timestamp: cached.timestamp,
        cached: true,
        nextUpdate: new Date(cached.timestamp + CACHE_DURATION).toISOString(),
        categories: Object.keys(ASSET_CATEGORIES)
      })
    }
  }

  console.log(`🔥 FETCHING HEATMAP DATA: ${category} (${timeframe})`)
  
  try {
    let allAssets: any[] = []
    const categoriesToFetch = category === 'all' 
      ? Object.keys(ASSET_CATEGORIES) 
      : [category.toUpperCase()]

    for (const cat of categoriesToFetch) {
      const categoryConfig = ASSET_CATEGORIES[cat as keyof typeof ASSET_CATEGORIES]
      if (!categoryConfig) continue

      console.log(`📊 Fetching ${categoryConfig.name} data...`)
      
      let categoryData: any[] = []
      
      // Use appropriate data source based on asset class
      if (cat === 'EQUITY') {
        // Stocks: Try Tiingo first (best for equity data)
        try {
          const tiingoData = await fetchFromTiingo(categoryConfig.symbols)
          if (tiingoData.length > 0) {
            categoryData = tiingoData
            console.log(`✅ Tiingo: ${tiingoData.length} assets for ${categoryConfig.name}`)
          }
        } catch (error) {
          console.warn(`Tiingo failed for ${categoryConfig.name}:`, error)
        }
        
        // Fallback to Yahoo Finance for equity
        if (categoryData.length === 0) {
          try {
            const yahooData = await fetchFromYahoo(categoryConfig.symbols)
            if (yahooData.length > 0) {
              categoryData = yahooData
              console.log(`✅ Yahoo: ${yahooData.length} assets for ${categoryConfig.name}`)
            }
          } catch (error) {
            console.warn(`Yahoo failed for ${categoryConfig.name}:`, error)
          }
        }
        
      } else if (cat === 'FOREX') {
        // Forex: Use Yahoo Finance (best for currency pairs)
        try {
          const yahooData = await fetchFromYahoo(categoryConfig.symbols)
          if (yahooData.length > 0) {
            categoryData = yahooData
            console.log(`✅ Yahoo: ${yahooData.length} forex pairs for ${categoryConfig.name}`)
          }
        } catch (error) {
          console.warn(`Yahoo failed for forex:`, error)
        }
        
      } else if (cat === 'CRYPTO') {
        // Crypto: Try Tiingo's crypto API first, then Yahoo
        try {
          const cryptoResults = []
          for (const symbol of categoryConfig.symbols.slice(0, 20)) { // Limit for API quotas
            try {
              // Convert from Yahoo format (BTC-USD) to Tiingo format (BTCUSD)
              const tiingoSymbol = symbol.replace('-USD', 'USD')
              const cryptoData = await tiingo.getCryptoQuote(tiingoSymbol)
              if (cryptoData) {
                cryptoResults.push(cryptoData)
              }
              await delay(100) // Rate limiting
            } catch (error) {
              console.warn(`Tiingo crypto failed for ${symbol}:`, error)
            }
          }
          
          if (cryptoResults.length > 0) {
            categoryData = cryptoResults
            console.log(`✅ Tiingo Crypto: ${cryptoResults.length} assets for ${categoryConfig.name}`)
          }
        } catch (error) {
          console.warn(`Tiingo crypto API failed:`, error)
        }
        
        // Fallback to Yahoo Finance for crypto
        if (categoryData.length === 0) {
          try {
            const yahooData = await fetchFromYahoo(categoryConfig.symbols)
            if (yahooData.length > 0) {
              categoryData = yahooData
              console.log(`✅ Yahoo: ${yahooData.length} crypto assets for ${categoryConfig.name}`)
            }
          } catch (error) {
            console.warn(`Yahoo failed for crypto:`, error)
          }
        }
        
      } else if (cat === 'BONDS') {
        // Bonds: Use FRED API first, then Yahoo for ETFs
        try {
          categoryData = await fetchBondYields()
          console.log(`✅ FRED: ${categoryData.length} bonds from government data`)
        } catch (error) {
          console.warn(`FRED failed for bonds:`, error)
        }
        
        // Also get bond ETFs from Yahoo
        if (categoryConfig.symbols) {
          const bondETFs = categoryConfig.symbols.filter(s => !s.startsWith('^'))
          if (bondETFs.length > 0) {
            try {
              const yahooData = await fetchFromYahoo(bondETFs)
              if (yahooData.length > 0) {
                categoryData.push(...yahooData)
                console.log(`✅ Yahoo: Added ${yahooData.length} bond ETFs`)
              }
            } catch (error) {
              console.warn(`Yahoo failed for bond ETFs:`, error)
            }
          }
        }
        
      } else {
        // Commodities and REITs: Try Tiingo first, then Yahoo
        try {
          const tiingoData = await fetchFromTiingo(categoryConfig.symbols)
          if (tiingoData.length > 0) {
            categoryData = tiingoData
            console.log(`✅ Tiingo: ${tiingoData.length} assets for ${categoryConfig.name}`)
          }
        } catch (error) {
          console.warn(`Tiingo failed for ${categoryConfig.name}:`, error)
        }
        
        // Fallback to Yahoo Finance
        if (categoryData.length === 0) {
          try {
            const yahooData = await fetchFromYahoo(categoryConfig.symbols)
            if (yahooData.length > 0) {
              categoryData = yahooData
              console.log(`✅ Yahoo: ${yahooData.length} assets for ${categoryConfig.name}`)
            }
          } catch (error) {
            console.warn(`Yahoo failed for ${categoryConfig.name}:`, error)
          }
        }
      }
      
      // Process and add to results
      if (categoryData.length > 0) {
        const processedData = processAssetData(categoryData, cat.toLowerCase(), categoryConfig)
        allAssets.push(...processedData)
      } else {
        console.warn(`No data available for ${categoryConfig.name}; skipping synthetic fallback`)
      }
      
      await delay(200) // Prevent rate limiting between categories
    }

    // Sort by performance and add ranking
    allAssets.sort((a, b) => b.performance - a.performance)
    allAssets.forEach((asset, index) => {
      asset.rank = index + 1
      asset.percentile = ((allAssets.length - index) / allAssets.length) * 100
    })

    // Cache results
    dataCache.set(cacheKey, {
      data: allAssets,
      timestamp: Date.now()
    })

    console.log(`🚀 HEATMAP COMPLETE: ${allAssets.length} assets loaded`)

  return NextResponse.json({
      success: true,
      data: allAssets,
      timestamp: Date.now(),
      cached: false,
      nextUpdate: new Date(Date.now() + CACHE_DURATION).toISOString(),
      categories: Object.keys(ASSET_CATEGORIES),
      summary: {
        totalAssets: allAssets.length,
        byCategory: Object.keys(ASSET_CATEGORIES).reduce((acc, cat) => {
          acc[cat] = allAssets.filter(a => a.category === cat.toLowerCase()).length
          return acc
        }, {} as Record<string, number>),
        performance: {
          gainers: allAssets.filter(a => a.performance > 0).length,
          losers: allAssets.filter(a => a.performance < 0).length,
          avgPerformance: allAssets.reduce((sum, a) => sum + a.performance, 0) / allAssets.length
        }
      }
  }, { headers: rateLimitHeaders(rl) })

  } catch (error) {
    console.error('❌ HEATMAP API ERROR:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch heatmap data',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 })
  }
}
