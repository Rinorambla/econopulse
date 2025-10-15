import { RawInstrument } from './global-heatmap-types'
import { getYahooQuotes } from './yahooFinance'

// Placeholder Tiingo fetch (to be implemented with real API key usage)
export async function fetchTiingoEquities(symbols: string[]): Promise<RawInstrument[]> {
  // TODO: integrate Tiingo realtime or snapshot
  return []
}

// Minimal static enrichment tables (replace with real fundamental fetch)
const STATIC_SECTORS: Record<string,string> = {
  AAPL:'Technology', MSFT:'Technology', NVDA:'Technology', AMZN:'Consumer', GOOGL:'Technology', META:'Communication', TSLA:'Consumer', AVGO:'Technology',
  ASML:'Technology', SAP:'Technology', 'SIE.DE':'Industrials', 'AIR.PA':'Industrials', 'OR.PA':'Consumer', 'NESN.SW':'Consumer', 'NOVN.SW':'Healthcare',
  SONY:'Technology', TM:'Consumer', TCS:'Technology', 'TCS.NS':'Technology', INFY:'Technology', BABA:'Consumer', TCEHY:'Technology', TSM:'Technology',
  VALE:'Materials', PBR:'Energy', ITUB:'Financials', BBD:'Financials', MELI:'Consumer'
}

const STATIC_MARKET_CAP_USD: Record<string, number> = {
  AAPL: 3e12, MSFT: 3.1e12, NVDA: 2.9e12, AMZN: 1.9e12, GOOGL: 2.2e12, META: 1.1e12, TSLA: 800e9, AVGO: 650e9,
  ASML: 380e9, SAP: 220e9, 'SIE.DE': 120e9, 'AIR.PA': 140e9, 'OR.PA': 250e9, 'NESN.SW': 300e9, 'NOVN.SW': 200e9,
  SONY: 110e9, TM: 270e9, 'TCS.NS': 170e9, INFY: 95e9, BABA: 190e9, TCEHY: 400e9, TSM: 850e9,
  VALE: 55e9, PBR: 90e9, ITUB: 50e9, BBD: 30e9, MELI: 70e9
}

export async function fetchYahooGlobal(symbols: string[]): Promise<RawInstrument[]> {
  const quotes = await getYahooQuotes(symbols)
  return quotes.map(q => {
    const baseSym = q.ticker
    return ({
      source: 'yahoo',
      symbol: baseSym,
      name: q.name,
      price: q.price,
      changePercent: q.changePercent,
      marketCap: STATIC_MARKET_CAP_USD[baseSym],
      sector: STATIC_SECTORS[baseSym],
      currency: guessCurrency(q.ticker),
      type: inferType(q.ticker)
    })
  })
}

function inferType(t: string): string {
  if (t.startsWith('^')) return 'index'
  if (t.includes('-USD')) return 'crypto'
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
  return 'USD'
}

// MVP symbol sets
export const MVP_SYMBOLS = {
  US_MEGA: ['AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','AVGO'],
  GLOBAL_INDICES: ['^GSPC','^NDX','^DJI','^RUT','^FTSE','^DAX','^FCHI','^N225','^HSI','^SSEC','^BSESN'],
  EUROPE_EQ: ['ASML','SAP','SIE.DE','AIR.PA','OR.PA','NESN.SW','NOVN.SW'],
  ASIA_EQ: ['SONY','TM','TCS.NS','INFY','BABA','TCEHY','TSM'],
  EM_EQ: ['VALE','PBR','ITUB','BBD','MELI']
}

export function buildMvpUniverse(): string[] {
  return Array.from(new Set(Object.values(MVP_SYMBOLS).flat()))
}
