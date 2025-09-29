// Yahoo Unified Market API - Live data via public Yahoo Finance endpoints
// NOTE: Non-official API, subject to rate limits. Add caching to reduce calls.
import { getYahooQuotes, YahooQuote } from './yahooFinance'

export interface UnifiedYahooAsset {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  category: string
  assetClass: string
  performance: number
  timestamp: string
  source: string
}

interface CacheEntry { ts: number; data: UnifiedYahooAsset[] }
const CACHE: Record<string, CacheEntry> = {}
const TTL = 1000 * 60 * 2 // 2 minuti

function getSymbolSets() {
  return {
  EQUITY: [ 'AAPL','MSFT','GOOGL','AMZN','NVDA','META','TSLA','NFLX','ORCL','AMD','INTC','IBM','CRM','ADBE','PYPL','UBER' ],
  ETF: [ 'SPY','QQQ','VOO','VTI','IVV','GLD','SLV','TLT','IEF','HYG','LQD','XLK','XLV','XLF','XLE','XLY','XLP','XLI','XLB','XLU','XLRE','XLC' ],
  CRYPTO: [ 'BTC-USD','ETH-USD','SOL-USD','ADA-USD','XRP-USD','DOGE-USD','LINK-USD','MATIC-USD','DOT-USD','LTC-USD','AVAX-USD','BCH-USD' ],
  FOREX: [ 'EURUSD=X','GBPUSD=X','USDJPY=X','USDCHF=X','AUDUSD=X','USDCAD=X','NZDUSD=X','EURGBP=X','EURJPY=X','GBPJPY=X' ],
  BONDS: [ 'TLT','IEF','SHY','TIP','HYG','LQD','AGG','BND' ],
  // Include core commodity futures + ETF proxies so macro table (futures) always populated
  COMMODITIES: [ 'GC=F','SI=F','HG=F','CL=F','BZ=F','NG=F','ZW=F','ZC=F','ZS=F','KC=F','CT=F','LE=F','HE=F','GLD','SLV','USO','UNG','DBA','CORN','WEAT','SOYB' ],
  REITS: [ 'VNQ','IYR','XLRE','PLD','AMT','EQIX','PSA','O' ],
  INDICES: [ '^GSPC','^NDX','^DJI','^RUT','^VIX','^FTSE','^GDAXI','^FCHI','^STOXX50E','^N225','^HSI','^SSEC' ],
  SECTOR_ETF: [ 'XLK','XLV','XLF','XLE','XLY','XLP','XLI','XLB','XLU','XLRE','XLC','SMH','SOXX','XME','IYT' ],
  // International Exposure via Country / Broad ETFs
  INTL_EQ: [ 'EWJ','EWG','EWU','EWC','EWY','EWT','EWA','EWL','EWH','EWS','EWI','EWQ','EWN','EWP','EWD','EZA','EWW','EEM','VEA','VWO' ]
  }
}

export function mapQuote(q: YahooQuote, category: string): UnifiedYahooAsset {
  // Override category for certain tickers that appear in multiple lists so that
  // filtering is semantically correct (e.g. GLD should be Commodities, not ETF)
  const overrides: Record<string,string> = {
    // Commodities ETFs / trackers
  'GLD':'Commodities','SLV':'Commodities','USO':'Commodities','UNG':'Commodities','DBA':'Commodities','CORN':'Commodities','WEAT':'Commodities','SOYB':'Commodities',
  // Core futures ensure classification
  'GC=F':'Commodities','SI=F':'Commodities','HG=F':'Commodities','CL=F':'Commodities','BZ=F':'Commodities','NG=F':'Commodities','ZW=F':'Commodities','ZC=F':'Commodities','ZS=F':'Commodities','KC=F':'Commodities','CT=F':'Commodities','LE=F':'Commodities','HE=F':'Commodities',
    // Bond ETFs
    'TLT':'Bonds','IEF':'Bonds','HYG':'Bonds','LQD':'Bonds','AGG':'Bonds','BND':'Bonds','SHY':'Bonds','TIP':'Bonds',
    // REIT sector ETF
    'XLRE':'REITs'
  }
  const finalCategory = overrides[q.ticker] || category
  return {
    symbol: q.ticker,
    name: q.name,
    price: q.price,
    change: q.change,
    changePercent: q.changePercent,
    volume: q.volume,
    category: finalCategory,
    assetClass: finalCategory,
    performance: q.changePercent,
    timestamp: new Date().toISOString(),
    source: 'Yahoo Finance'
  }
}

export async function fetchYahooMarket(category: string = 'all', limit?: number): Promise<UnifiedYahooAsset[]> {
  const key = category.toLowerCase()
  const cached = CACHE[key]
  if (cached && Date.now() - cached.ts < TTL) return cached.data

  const sets = getSymbolSets()
  const tasks: { cat: string; symbols: string[] }[] = []
  // Precedence order so that symbols appearing in multiple lists (e.g. TLT in BONDS & ETF)
  // take the category we consider primary (first wins because we dedupe later)
  const precedence = ['BONDS','COMMODITIES','CRYPTO','FOREX','INDICES','SECTOR_ETF','INTL_EQ','EQUITY','ETF','REITS']

  if (key === 'all') {
    precedence.forEach(cat => {
      const symbols = (sets as any)[cat]
      if (symbols) tasks.push({ cat, symbols })
    })
  } else {
    // map normalized names & many synonyms (includes UI labels with spaces)
    const normMap: Record<string,string> = {
      equity:'EQUITY', equities:'EQUITY', stock:'EQUITY', stocks:'EQUITY',
      etf:'ETF', etfs:'ETF',
      crypto:'CRYPTO', cryptocurrency:'CRYPTO', cryptocurrencies:'CRYPTO',
      forex:'FOREX', fx:'FOREX', currency:'FOREX', currencies:'FOREX',
      bonds:'BONDS', bond:'BONDS', fixedincome:'BONDS', 'fixed-income':'BONDS', fixed_income:'BONDS',
      commodities:'COMMODITIES', commodity:'COMMODITIES',
      reits:'REITS', reit:'REITS',
      indices:'INDICES', index:'INDICES', benchmarks:'INDICES',
      sector:'SECTOR_ETF', 'sector etf':'SECTOR_ETF', 'sector etfs':'SECTOR_ETF', sector_etf:'SECTOR_ETF', sector_etfs:'SECTOR_ETF',
      intl_eq:'INTL_EQ', international:'INTL_EQ', 'international equity':'INTL_EQ', 'international equities':'INTL_EQ'
  ,'international etf':'INTL_EQ','international etfs':'INTL_EQ'
    }
    const internal = normMap[key] || key.toUpperCase()
    if ((sets as any)[internal]) tasks.push({ cat: internal, symbols: (sets as any)[internal] })
  }

  const results: UnifiedYahooAsset[] = []
  const seen = new Set<string>()
  for (const task of tasks) {
    try {
      const quotes = await getYahooQuotes(task.symbols)
      quotes.forEach(q => {
        if (seen.has(q.ticker)) return
        seen.add(q.ticker)
        results.push(mapQuote(q, friendlyCategory(task.cat)))
      })
    } catch (e) {
      console.warn('⚠️ Yahoo batch error', task.cat, e)
    }
  }

  // Commodities completeness check: ensure at least some futures (symbols containing =F) present
  if ((category === 'commodities' || category === 'all') && !results.some(r=>r.category==='Commodities' && r.symbol.includes('=F'))) {
    try {
      const futures = ['GC=F','SI=F','HG=F','CL=F','BZ=F','NG=F','ZW=F','ZC=F','ZS=F']
      const missing = futures.filter(f=>!seen.has(f))
      if (missing.length) {
        console.log('🔄 Fetching missing commodity futures individually', missing)
        const futQuotes = await getYahooQuotes(missing)
        futQuotes.forEach(q=>{
          if (seen.has(q.ticker)) return
          seen.add(q.ticker)
          results.push(mapQuote(q,'Commodities'))
        })
      }
    } catch (e) {
      console.warn('⚠️ Commodity futures backfill failed', e)
    }
  }

  const final = typeof limit === 'number' && limit > 0 ? results.slice(0, limit) : results
  CACHE[key] = { ts: Date.now(), data: final }
  return final
}

function friendlyCategory(raw: string) {
  switch(raw) {
    case 'EQUITY': return 'Equity'
    case 'ETF': return 'ETF'
    case 'CRYPTO': return 'Crypto'
    case 'FOREX': return 'Forex'
    case 'BONDS': return 'Bonds'
    case 'COMMODITIES': return 'Commodities'
    case 'REITS': return 'REITs'
  case 'INDICES': return 'Indices'
  case 'SECTOR_ETF': return 'Sector ETFs'
  case 'INTL_EQ': return 'International ETFs'
    default: return raw
  }
}

export async function getYahooSummary() {
  const data = await fetchYahooMarket('all')
  const byCat = data.reduce<Record<string, number>>((acc,a)=>{acc[a.category]=(acc[a.category]||0)+1;return acc}, {})
  return {
    total: data.length,
    categories: byCat,
    avgPerformance: data.reduce((s,a)=>s+a.performance,0)/(data.length||1),
    gainers: data.filter(a=>a.performance>0).length,
    losers: data.filter(a=>a.performance<0).length,
    lastUpdate: new Date().toISOString()
  }
}
