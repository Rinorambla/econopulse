// Tiingo Unified Market API - Single source for all market data
// Comprehensive coverage: Equity, Forex, Crypto, ETFs, Indices

interface TiingoQuote {
  ticker: string
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  adjClose?: number
  adjOpen?: number
  adjHigh?: number
  adjLow?: number
  adjVolume?: number
  divCash?: number
  splitFactor?: number
}

interface TiingoIEXQuote {
  ticker: string
  timestamp: string
  lastSaleTimestamp?: string
  quoteTimestamp?: string
  open: number
  high: number
  low: number
  tngoLast: number
  last?: number
  lastSize?: number
  bidSize?: number
  bidPrice?: number
  askPrice?: number
  askSize?: number
  volume: number
  prevClose: number
}

interface UnifiedAsset {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap?: number
  category: string
  assetClass: string
  performance: number
  volatility?: number
  high: number
  low: number
  open: number
  timestamp: string
  source: string
}

// In-memory cache per runtime (reset ad ogni restart dev)
interface CacheEntry { ts: number; data: UnifiedAsset[] }
const CACHE: Record<string, CacheEntry> = {}
const CACHE_TTL = 1000 * 60 * 3 // 3 minuti

export class TiingoUnifiedAPI {
  private apiKey: string
  private baseUrl = 'https://api.tiingo.com/tiingo'
  private iexUrl = 'https://api.tiingo.com/iex'
  private cryptoUrl = 'https://api.tiingo.com/tiingo/crypto'
  private forexUrl = 'https://api.tiingo.com/tiingo/fx'

  constructor(apiKey: string) {
    this.apiKey = apiKey
    console.log('🔥 Tiingo Unified API initialized - Single source for ALL markets')
  }

  // Comprehensive symbol lists for all asset classes
  private getSymbolsByCategory() {
    return {
      // Large Cap US Stocks
      'US_LARGE_CAP': [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B',
        'UNH', 'XOM', 'JNJ', 'JPM', 'PG', 'V', 'HD', 'CVX', 'MA', 'PFE',
        'ABBV', 'BAC', 'KO', 'AVGO', 'PEP', 'TMO', 'COST', 'WMT', 'DIS', 'ABT'
      ],

      // Technology Stocks
      'TECHNOLOGY': [
        'AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'TSLA', 'NFLX', 'ADBE',
        'CRM', 'ORCL', 'INTC', 'AMD', 'PYPL', 'UBER', 'SNOW', 'PLTR'
      ],

      // ETFs - Broad Market
      'ETF_BROAD': [
        'SPY', 'QQQ', 'VOO', 'VTI', 'IVV', 'VEA', 'VWO', 'IEFA',
        'EEM', 'GLD', 'SLV', 'TLT', 'IEF', 'SHY', 'HYG', 'LQD'
      ],

      // ETFs - Sectors
      'ETF_SECTORS': [
        'XLK', 'XLV', 'XLF', 'XLE', 'XLY', 'XLP', 'XLI', 'XLB',
        'XLU', 'XLRE', 'XLC', 'VGT', 'VUG', 'VTV', 'VYM', 'VOOG'
      ],

      // Cryptocurrencies (Tiingo format: symbol + 'usd')
      'CRYPTO': [
        'btcusd', 'ethusd', 'adausd', 'solusd', 'dotusd', 'avaxusd',
        'linkusd', 'uniusd', 'ltcusd', 'bchusd', 'xlmusd', 'xrpusd',
        'maticusd', 'algousd', 'atomusd', 'filusd', 'vetusd', 'trxusd'
      ],

      // Forex (Tiingo format)
      'FOREX': [
        'eurusd', 'gbpusd', 'usdjpy', 'usdchf', 'audusd', 'usdcad',
        'nzdusd', 'eurgbp', 'eurjpy', 'gbpjpy', 'audjpy', 'chfjpy'
      ],

      // Commodities ETFs
      'COMMODITIES': [
        'GLD', 'SLV', 'USO', 'UNG', 'DBA', 'CORN', 'WEAT', 'SOYB',
        'UGA', 'USL', 'PDBC', 'GSG', 'DJP', 'COPX', 'SIL', 'PALL'
      ],

      // International Indices
      'INTERNATIONAL': [
        'EWJ', 'EWG', 'EWU', 'EWC', 'EWY', 'EWT', 'EWA', 'EWZ',
        'EWH', 'EWI', 'EWP', 'EWS', 'EWL', 'EWQ', 'EWN', 'EWW'
      ],

      // REITs
      'REITS': [
        'VNQ', 'IYR', 'SCHH', 'RWR', 'XLRE', 'FREL', 'USRT', 'MORT',
        'PLD', 'AMT', 'CCI', 'EQIX', 'PSA', 'SPG', 'O', 'WELL'
      ],

      // Bonds
      'BONDS': [
        'TLT', 'IEF', 'SHY', 'TIP', 'HYG', 'LQD', 'AGG', 'BND',
        'VCIT', 'VCLT', 'VGIT', 'VGLT', 'EMB', 'JNK', 'SJNK', 'BKLN'
      ]
    }
  }

  // Get all symbols for a specific category or all
  private getSymbols(category?: string): string[] {
    const symbolMap = this.getSymbolsByCategory()
    
    if (category && category !== 'all') {
      const upperCategory = category.toUpperCase()
      return symbolMap[upperCategory as keyof typeof symbolMap] || []
    }

    // Return all symbols from all categories
    return Object.values(symbolMap).flat()
  }

  // Fetch IEX data (real-time quotes)
  private async fetchIEXData(symbols: string[]): Promise<TiingoIEXQuote[]> {
    const unique = [...new Set(symbols)]
    const batchSize = 8
    const out: TiingoIEXQuote[] = []
    for (let i = 0; i < unique.length; i += batchSize) {
      const batch = unique.slice(i, i + batchSize)
      const url = `${this.iexUrl}/?tickers=${encodeURIComponent(batch.join(','))}&token=${this.apiKey}`
      console.log(`🔍 IEX batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(unique.length / batchSize)} (${batch.length})`)
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
        if (!res.ok) { console.warn(`⚠️ IEX batch status ${res.status}`); continue }
        const data = await res.json()
        if (Array.isArray(data)) out.push(...data as TiingoIEXQuote[])
      } catch (e) {
        console.warn('⚠️ IEX batch error', e)
      }
      await new Promise(r => setTimeout(r, 120))
    }
    console.log(`✅ IEX fetched ${out.length} quotes (requested ${unique.length})`)
    return out
  }

  // Fetch historical/end-of-day data
  private async fetchEODData(symbols: string[]): Promise<TiingoQuote[]> {
    try {
      const results: TiingoQuote[] = []
      
      for (const symbol of symbols.slice(0, 10)) { // Limit to prevent timeout
        try {
          const url = `${this.baseUrl}/daily/${symbol}/prices?token=${this.apiKey}&startDate=2025-08-26`
          
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })

          if (response.ok) {
            const data = await response.json()
            if (Array.isArray(data) && data.length > 0) {
              const latest = data[data.length - 1]
              results.push({
                ticker: symbol,
                ...latest
              })
            }
          }
        } catch (symbolError) {
          console.warn(`⚠️ Failed to fetch ${symbol}:`, symbolError)
        }
      }

      console.log(`✅ Retrieved ${results.length} EOD quotes`)
      return results
    } catch (error) {
      console.error('❌ Tiingo EOD fetch error:', error)
      return []
    }
  }

  // Fetch crypto data
  private async fetchCryptoData(symbols: string[]): Promise<UnifiedAsset[]> {
    try {
      const results: UnifiedAsset[] = []
      
      for (const symbol of symbols) {
        try {
          const url = `${this.cryptoUrl}/prices?tickers=${symbol}&token=${this.apiKey}&includeToday=true`
          
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })

          if (response.ok) {
            const data = await response.json()
            if (Array.isArray(data) && data.length > 0) {
              const quote = data[0]
              const priceData = quote.priceData && quote.priceData.length > 0 ? quote.priceData[0] : null
              
              if (priceData) {
                const change = priceData.close - priceData.open
                const changePercent = ((change / priceData.open) * 100)
                
                results.push({
                  symbol: quote.ticker.replace('usd', '').toUpperCase(),
                  name: `${quote.ticker.replace('usd', '').toUpperCase()} Cryptocurrency`,
                  price: priceData.close,
                  change,
                  changePercent,
                  volume: priceData.volume || 0,
                  category: 'Crypto',
                  assetClass: 'Cryptocurrency',
                  performance: changePercent,
                  high: priceData.high,
                  low: priceData.low,
                  open: priceData.open,
                  timestamp: priceData.date,
                  source: 'Tiingo Crypto'
                })
              }
            }
          }
        } catch (symbolError) {
          console.warn(`⚠️ Failed to fetch crypto ${symbol}:`, symbolError)
        }
      }

      console.log(`✅ Retrieved ${results.length} crypto quotes`)
      return results
    } catch (error) {
      console.error('❌ Tiingo crypto fetch error:', error)
      return []
    }
  }

  // Fetch forex data
  private async fetchForexData(symbols: string[]): Promise<UnifiedAsset[]> {
    try {
      const results: UnifiedAsset[] = []
      
      for (const symbol of symbols) {
        try {
          const url = `${this.forexUrl}/${symbol}/prices?token=${this.apiKey}&startDate=2025-08-26`
          
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })

          if (response.ok) {
            const data = await response.json()
            if (Array.isArray(data) && data.length > 0) {
              const latest = data[data.length - 1]
              const change = latest.close - latest.open
              const changePercent = ((change / latest.open) * 100)
              
              results.push({
                symbol: symbol.toUpperCase(),
                name: `${symbol.toUpperCase()} Currency Pair`,
                price: latest.close,
                change,
                changePercent,
                volume: 0, // Forex doesn't have traditional volume
                category: 'Forex',
                assetClass: 'Currency',
                performance: changePercent,
                high: latest.high,
                low: latest.low,
                open: latest.open,
                timestamp: latest.date,
                source: 'Tiingo Forex'
              })
            }
          }
        } catch (symbolError) {
          console.warn(`⚠️ Failed to fetch forex ${symbol}:`, symbolError)
        }
      }

      console.log(`✅ Retrieved ${results.length} forex quotes`)
      return results
    } catch (error) {
      console.error('❌ Tiingo forex fetch error:', error)
      return []
    }
  }

  // Main method to fetch all market data
  async fetchAllMarketData(category: string = 'all'): Promise<UnifiedAsset[]> {
    console.log('🚀 Tiingo Unified: Starting comprehensive market data fetch...')
    const symbolMap = this.getSymbolsByCategory()
    const catNorm = (category || 'all').toLowerCase()
    const cacheKey = catNorm
    const cached = CACHE[cacheKey]
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      console.log(`💾 Cache hit (${cacheKey}) -> ${cached.data.length} assets`)
      return cached.data
    }

    const allResults: UnifiedAsset[] = []

    try {
      // Fetch Equity data (IEX real-time)
  if (catNorm === 'all' || catNorm === 'equity') {
        const equitySymbols = [
          ...symbolMap.US_LARGE_CAP.slice(0, 15),
          ...symbolMap.TECHNOLOGY.slice(0, 10),
          ...symbolMap.ETF_BROAD.slice(0, 8),
          ...symbolMap.ETF_SECTORS.slice(0, 12)
        ]

        const iexData = await this.fetchIEXData([...new Set(equitySymbols)])
        
        iexData.forEach(quote => {
          const change = quote.tngoLast - quote.prevClose
          const changePercent = ((change / quote.prevClose) * 100)
          
          // Determine category
          let assetCategory = 'Equity'
          if (symbolMap.ETF_BROAD.includes(quote.ticker) || symbolMap.ETF_SECTORS.includes(quote.ticker)) {
            assetCategory = 'ETF'
          } else if (symbolMap.TECHNOLOGY.includes(quote.ticker)) {
            assetCategory = 'Technology'
          }

          allResults.push({
            symbol: quote.ticker,
            name: `${quote.ticker} Stock`,
            price: quote.tngoLast,
            change,
            changePercent,
            volume: quote.volume,
            category: assetCategory,
            assetClass: 'Equity',
            performance: changePercent,
            high: quote.high,
            low: quote.low,
            open: quote.open,
            timestamp: quote.timestamp,
            source: 'Tiingo IEX'
          })
        })
      }

      // Fetch Cryptocurrency data
  if (catNorm === 'all' || catNorm === 'crypto') {
        const cryptoData = await this.fetchCryptoData(symbolMap.CRYPTO.slice(0, 12))
        allResults.push(...cryptoData)
      }

      // Fetch Forex data
      if (catNorm === 'all' || catNorm === 'forex') {
        const forexData = await this.fetchForexData(symbolMap.FOREX.slice(0, 8))
        allResults.push(...forexData)
      }

      // Bonds (EOD proxies)
      if (catNorm === 'all' || catNorm === 'bonds') {
        const bonds = await this.fetchEODData(symbolMap.BONDS.slice(0, 10))
        bonds.forEach(q => {
          const ch = q.close - q.open
          const pct = (ch / q.open) * 100
          allResults.push({
            symbol: q.ticker,
            name: `${q.ticker} Bond ETF`,
            price: q.close,
            change: ch,
            changePercent: pct,
            volume: q.volume || 0,
            category: 'Bonds',
            assetClass: 'Bonds',
            performance: pct,
            high: q.high,
            low: q.low,
            open: q.open,
            timestamp: q.timestamp || new Date().toISOString(),
            source: 'Tiingo EOD'
          })
        })
      }

      // Commodities (ETF proxies)
      if (catNorm === 'all' || catNorm === 'commodities') {
        const comm = await this.fetchEODData(symbolMap.COMMODITIES.slice(0, 10))
        comm.forEach(q => {
          const ch = q.close - q.open
          const pct = (ch / q.open) * 100
          allResults.push({
            symbol: q.ticker,
            name: `${q.ticker} Commodity ETF`,
            price: q.close,
            change: ch,
            changePercent: pct,
            volume: q.volume || 0,
            category: 'Commodities',
            assetClass: 'Commodities',
            performance: pct,
            high: q.high,
            low: q.low,
            open: q.open,
            timestamp: q.timestamp || new Date().toISOString(),
            source: 'Tiingo EOD'
          })
        })
      }

      // REITs
      if (catNorm === 'all' || catNorm === 'reits') {
        const reits = await this.fetchEODData(symbolMap.REITS.slice(0, 10))
        reits.forEach(q => {
          const ch = q.close - q.open
          const pct = (ch / q.open) * 100
          allResults.push({
            symbol: q.ticker,
            name: `${q.ticker} REIT`,
            price: q.close,
            change: ch,
            changePercent: pct,
            volume: q.volume || 0,
            category: 'REITs',
            assetClass: 'REITs',
            performance: pct,
            high: q.high,
            low: q.low,
            open: q.open,
            timestamp: q.timestamp || new Date().toISOString(),
            source: 'Tiingo EOD'
          })
        })
      }

      console.log(`🎯 Tiingo Unified Complete:`)
      console.log(`    📊 Total Assets: ${allResults.length}`)
      console.log(`    📈 Equity: ${allResults.filter(a => a.assetClass === 'Equity').length}`)
      console.log(`    ₿ Crypto: ${allResults.filter(a => a.assetClass === 'Cryptocurrency').length}`)
      console.log(`    💱 Forex: ${allResults.filter(a => a.assetClass === 'Currency').length}`)
      console.log(`    ⏰ Timestamp: ${new Date().toISOString()}`)

  CACHE[cacheKey] = { ts: Date.now(), data: allResults }
  return allResults

    } catch (error) {
      console.error('❌ Tiingo Unified fetch error:', error)
      return []
    }
  }

  // Get market summary statistics
  async getMarketSummary(): Promise<any> {
    try {
      const data = await this.fetchAllMarketData()
      
      const summary = {
        totalAssets: data.length,
        gainers: data.filter(asset => asset.performance > 0).length,
        losers: data.filter(asset => asset.performance < 0).length,
        unchanged: data.filter(asset => Math.abs(asset.performance) < 0.1).length,
        totalVolume: data.reduce((sum, asset) => sum + (asset.volume || 0), 0),
        averagePerformance: data.reduce((sum, asset) => sum + asset.performance, 0) / data.length,
        topGainer: data.sort((a, b) => b.performance - a.performance)[0],
        topLoser: data.sort((a, b) => a.performance - b.performance)[0],
        lastUpdate: new Date().toISOString()
      }

      return summary
    } catch (error) {
      console.error('❌ Market summary error:', error)
      return null
    }
  }
}
