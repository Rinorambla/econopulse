// Tiingo historical fallback for chart data. Server-only.
import { env } from './env'
import type { YahooBar, YahooHistory } from './yahoo-history'

const BASE = 'https://api.tiingo.com'

function rangeToDays(range: string): number {
  switch (range) {
    case '1d': return 2
    case '5d': return 7
    case '1mo': return 35
    case '3mo': return 95
    case '6mo': return 190
    case 'ytd': {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      return Math.max(10, Math.ceil((now.getTime() - start.getTime()) / 86400000))
    }
    case '1y': return 370
    case '2y': return 740
    case '5y': return 1830
    case '10y': return 3660
    case 'max': return 7300
    default: return 95
  }
}

function intervalToResampleFreq(interval: string): string {
  switch (interval) {
    case '1m': return '1min'
    case '5m': return '5min'
    case '15m': return '15min'
    case '30m': return '30min'
    case '60m':
    case '1h': return '1hour'
    case '1d':
    case '1day':
    default: return '1day'
  }
}

function isIntraday(interval: string): boolean {
  return /m$|h$/.test(interval)
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function dateRange(range: string) {
  const end = new Date()
  const start = new Date()
  start.setUTCDate(end.getUTCDate() - rangeToDays(range))
  return { start: ymd(start), end: ymd(end) }
}

// Classify Yahoo-style symbol → tiingo endpoint variant
type Kind = 'equity' | 'crypto' | 'fx' | 'future' | 'index' | 'unsupported'
function classify(symbol: string): { kind: Kind; ticker: string } {
  const s = symbol.trim()
  if (!s) return { kind: 'unsupported', ticker: s }
  // Crypto: BTC-USD, ETH-USD
  if (/^[A-Z0-9]{2,6}-USD$/i.test(s) || /^[A-Z0-9]{2,6}-USDT$/i.test(s)) {
    return { kind: 'crypto', ticker: s.replace('-', '').toLowerCase() }
  }
  // FX: EURUSD=X
  if (/^[A-Z]{6}=X$/i.test(s)) {
    return { kind: 'fx', ticker: s.replace('=X', '').toLowerCase() }
  }
  // Futures (not supported by tiingo): GC=F, CL=F
  if (/=F$/i.test(s)) return { kind: 'future', ticker: s }
  // Indices: ^GSPC, ^IXIC, ^DJI, ^VIX (use ETF proxy)
  if (s.startsWith('^')) {
    const proxy: Record<string, string> = {
      '^GSPC': 'spy', '^IXIC': 'qqq', '^DJI': 'dia', '^RUT': 'iwm', '^VIX': 'vixy',
    }
    const t = proxy[s.toUpperCase()]
    if (t) return { kind: 'equity', ticker: t }
    return { kind: 'index', ticker: s }
  }
  // Equity
  return { kind: 'equity', ticker: s.toLowerCase() }
}

async function tFetch(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchTiingoHistory(symbol: string, range = '3mo', interval = '1d'): Promise<YahooHistory | null> {
  const key = env.TIINGO_API_KEY
  if (!key) return null
  const { kind, ticker } = classify(symbol)
  if (kind === 'future' || kind === 'unsupported' || kind === 'index') return null
  const { start, end } = dateRange(range)
  const resampleFreq = intervalToResampleFreq(interval)
  const intraday = isIntraday(interval)
  let url = ''
  let parser: ((j: any) => YahooBar[]) | null = null

  if (kind === 'crypto') {
    url = `${BASE}/tiingo/crypto/prices?tickers=${ticker}&startDate=${start}&endDate=${end}&resampleFreq=${resampleFreq}&token=${key}`
    parser = (j) => {
      const arr = Array.isArray(j) ? j[0]?.priceData : null
      if (!Array.isArray(arr)) return []
      return arr.map((b: any) => ({
        time: new Date(b.date).getTime(),
        open: Number(b.open), high: Number(b.high), low: Number(b.low), close: Number(b.close),
        volume: Number(b.volume || 0),
      })).filter((b: YahooBar) => Number.isFinite(b.close) && b.close > 0)
    }
  } else if (kind === 'fx') {
    url = `${BASE}/tiingo/fx/${ticker}/prices?startDate=${start}&endDate=${end}&resampleFreq=${resampleFreq}&token=${key}`
    parser = (j) => {
      if (!Array.isArray(j)) return []
      return j.map((b: any) => ({
        time: new Date(b.date).getTime(),
        open: Number(b.open), high: Number(b.high), low: Number(b.low), close: Number(b.close),
        volume: 0,
      })).filter((b: YahooBar) => Number.isFinite(b.close) && b.close > 0)
    }
  } else {
    // equity
    if (intraday) {
      url = `${BASE}/iex/${ticker}/prices?startDate=${start}&endDate=${end}&resampleFreq=${resampleFreq}&token=${key}`
      parser = (j) => {
        if (!Array.isArray(j)) return []
        return j.map((b: any) => ({
          time: new Date(b.date).getTime(),
          open: Number(b.open ?? b.close),
          high: Number(b.high ?? b.close),
          low: Number(b.low ?? b.close),
          close: Number(b.close),
          volume: Number(b.volume || 0),
        })).filter((b: YahooBar) => Number.isFinite(b.close) && b.close > 0)
      }
    } else {
      url = `${BASE}/tiingo/daily/${ticker}/prices?startDate=${start}&endDate=${end}&token=${key}`
      parser = (j) => {
        if (!Array.isArray(j)) return []
        return j.map((b: any) => ({
          time: new Date(b.date).getTime(),
          open: Number(b.open),
          high: Number(b.high),
          low: Number(b.low),
          close: Number(b.close ?? b.adjClose),
          volume: Number(b.volume || 0),
        })).filter((b: YahooBar) => Number.isFinite(b.close) && b.close > 0)
      }
    }
  }

  const json = await tFetch(url)
  if (!json || !parser) return null
  const bars = parser(json)
  if (bars.length < 2) return null
  bars.sort((a, b) => a.time - b.time)
  return { symbol: symbol.toUpperCase(), bars }
}
