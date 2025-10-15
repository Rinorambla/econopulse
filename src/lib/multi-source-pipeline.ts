import { RawInstrument, NormalizedInstrument } from './global-heatmap-types'
import { normalizeInstrument } from './global-heatmap-normalize'
import { getYahooQuotes } from './yahooFinance'

// Basic universe item definition
export interface UniverseItem {
  symbol: string
  name?: string
  type: 'equity'|'index'|'etf'|'commodity'|'fx'|'crypto'|'bond'
  country?: string
  sector?: string
  currency?: string
  preferredSources?: ('yahoo'|'stooq'|'alphavantage')[]
}

// Static enrichment (placeholder until fundamentals service implemented)
const STATIC_SECTORS: Record<string,string> = {
  AAPL:'Technology', MSFT:'Technology', NVDA:'Technology', AMZN:'Consumer', GOOGL:'Technology', META:'Communication', TSLA:'Consumer', AVGO:'Technology',
  ASML:'Technology', SAP:'Technology', 'SIE.DE':'Industrials', 'AIR.PA':'Industrials', 'OR.PA':'Consumer', 'NESN.SW':'Consumer', 'NOVN.SW':'Healthcare',
  SONY:'Technology', TM:'Consumer', 'TCS.NS':'Technology', INFY:'Technology', BABA:'Consumer', TCEHY:'Technology', TSM:'Technology',
  VALE:'Materials', PBR:'Energy', ITUB:'Financials', BBD:'Financials', MELI:'Consumer'
}
const STATIC_MARKET_CAP_USD: Record<string, number> = {
  AAPL: 3e12, MSFT: 3.1e12, NVDA: 2.9e12, AMZN: 1.9e12, GOOGL: 2.2e12, META: 1.1e12, TSLA: 800e9, AVGO: 650e9,
  ASML: 380e9, SAP: 220e9, 'SIE.DE': 120e9, 'AIR.PA': 140e9, 'OR.PA': 250e9, 'NESN.SW': 300e9, 'NOVN.SW': 200e9,
  SONY: 110e9, TM: 270e9, 'TCS.NS': 170e9, INFY: 95e9, BABA: 190e9, TCEHY: 400e9, TSM: 850e9,
  VALE: 55e9, PBR: 90e9, ITUB: 50e9, BBD: 30e9, MELI: 70e9
}

// Stooq index code mapping (Yahoo style -> Stooq code)
const STOOQ_INDEX_MAP: Record<string,string> = {
  '^DAX':'dax','^FTSE':'ukx','^FCHI':'cac','^N225':'nkx','^HSI':'hsi','^BVSP':'bvsp','^GSPTSE':'ptsx','^AEX':'aex','^OMX':'omxs30','^BSESN':'sensex'
}

// Commodities / Futures via Yahoo (these tickers end with =F)
const COMMODITY_TICKERS = ['GC=F','SI=F','CL=F','BZ=F','NG=F','ZC=F','ZS=F','KE=F']

// FX pairs via Yahoo ("=X") limited set; AlphaVantage fallback only if missing
const FX_TICKERS = ['EURUSD=X','GBPUSD=X','JPYUSD=X','CHFUSD=X','AUDUSD=X','CADUSD=X']

export function buildDefaultUniverse(): UniverseItem[] {
  const equities = ['AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','AVGO','ASML','SAP','SIE.DE','AIR.PA','OR.PA','NESN.SW','NOVN.SW','SONY','TM','TCS.NS','INFY','BABA','TCEHY','TSM','VALE','PBR','ITUB','BBD','MELI']
  const indices = ['^GSPC','^NDX','^DJI','^RUT','^FTSE','^DAX','^FCHI','^N225','^HSI','^BVSP','^BSESN']
  const universe: UniverseItem[] = []
  equities.forEach(s=>universe.push({ symbol:s, type:'equity' }))
  indices.forEach(s=>universe.push({ symbol:s, type:'index', preferredSources: STOOQ_INDEX_MAP[s]? ['stooq','yahoo'] : ['yahoo'] }))
  COMMODITY_TICKERS.forEach(s=>universe.push({ symbol:s, type:'commodity' }))
  FX_TICKERS.forEach(s=>universe.push({ symbol:s, type:'fx' }))
  return universe
}

// Yahoo fetcher (quotes only)
async function fetchYahoo(symbols: string[]): Promise<RawInstrument[]> {
  if (!symbols.length) return []
  const quotes = await getYahooQuotes(symbols)
  return quotes.map(q=>({
    source:'yahoo', symbol:q.ticker, name:q.name, price:q.price, changePercent:q.changePercent,
    marketCap: STATIC_MARKET_CAP_USD[q.ticker], sector: STATIC_SECTORS[q.ticker], type: inferType(q.ticker), currency: guessCurrency(q.ticker)
  }))
}

// Stooq fetch (CSV). Only indices. Returns price & change % (approx from previous close in CSV row)
async function fetchStooq(symbols: string[]): Promise<RawInstrument[]> {
  const results: RawInstrument[] = []
  for (const sym of symbols) {
    const code = STOOQ_INDEX_MAP[sym]
    if (!code) continue
    try {
      const url = `https://stooq.com/q/l/?s=${code}&f=sd2t2ohlcv&h&e=csv`
      const resp = await fetch(url, { cache:'no-store' })
      if (!resp.ok) continue
      const text = await resp.text()
      const lines = text.trim().split(/\r?\n/)
      if (lines.length < 2) continue
      const parts = lines[1].split(',') // Symbol,Date,Time,Open,High,Low,Close,Volume
      const close = parseFloat(parts[6])
      const open = parseFloat(parts[3])
      const changePercent = (isFinite(close) && isFinite(open) && open!==0)? ((close-open)/open)*100 : 0
      results.push({ source:'stooq', symbol:sym, name:sym, price:close, changePercent, type:'index', currency:'USD' })
    } catch { /* ignore */ }
  }
  return results
}

// Merge logic: prefer primary (stooq for mapped indices), fallback to yahoo
export async function fetchMultiSourceUniverse(universe: UniverseItem[]): Promise<NormalizedInstrument[]> {
  const stooqCandidates = universe.filter(u=>u.type==='index' && STOOQ_INDEX_MAP[u.symbol]).map(u=>u.symbol)
  const stooqData = await fetchStooq(stooqCandidates)
  const have = new Set(stooqData.map(r=>r.symbol))
  const yahooSymbols = universe.map(u=>u.symbol).filter(s=>!have.has(s))
  const yahooData = await fetchYahoo(yahooSymbols)
  const all: RawInstrument[] = [...stooqData, ...yahooData]
  return all.map(normalizeInstrument)
}

function inferType(t: string): string {
  if (t.startsWith('^')) return 'index'
  if (t.endsWith('=F')) return 'commodity'
  if (t.includes('-USD')) return 'crypto'
  if (t.endsWith('=X')) return 'fx'
  return 'equity'
}
function guessCurrency(t: string): string | undefined {
  if (t.endsWith('.L')) return 'GBP'
  if (t.endsWith('.DE')) return 'EUR'
  if (t.endsWith('.PA')) return 'EUR'
  if (t.endsWith('.SW')) return 'CHF'
  if (t.endsWith('.HK')) return 'HKD'
  if (t.endsWith('.NS')) return 'INR'
  if (t.endsWith('.AX')) return 'AUD'
  if (t.endsWith('=X')) return t.substring(0,3).toUpperCase() // first currency of pair
  return 'USD'
}
