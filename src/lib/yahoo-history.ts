// Yahoo historical / intraday price fetcher (lightweight)
export interface YahooBar { time: number; open: number; high: number; low: number; close: number; volume: number }
export interface YahooHistory { symbol: string; bars: YahooBar[] }

interface ChartResultMeta {
  regularMarketPrice?: number
  previousClose?: number
  currency?: string
}

export async function fetchYahooHistory(symbol: string, range: string = '5d', interval: string = '1d'): Promise<YahooHistory | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return null
    const json = await res.json()
    const r = json?.chart?.result?.[0]
    if (!r?.timestamp || !r?.indicators?.quote?.[0]) return null
    const quote = r.indicators.quote[0]
    const opens = quote.open || []
    const highs = quote.high || []
    const lows = quote.low || []
    const closes = quote.close || []
    const volumes = quote.volume || []
    const bars: YahooBar[] = r.timestamp.map((t: number, idx: number) => {
      const o = opens[idx]; const h = highs[idx]; const l = lows[idx]; const c = closes[idx]; const v = volumes[idx]
      if ([o,h,l,c].some(vv => typeof vv !== 'number')) return null
      return { time: t * 1000, open: o, high: h, low: l, close: c, volume: typeof v === 'number' ? v : 0 }
    }).filter(Boolean) as YahooBar[]
    return { symbol: symbol.toUpperCase(), bars }
  } catch (e) {
    return null
  }
}

export async function fetchMultipleHistory(symbols: string[], range='5d', interval='1d'): Promise<YahooHistory[]> {
  const out: YahooHistory[] = []
  // small concurrency control
  for (const sym of symbols) {
    const h = await fetchYahooHistory(sym, range, interval)
    if (h) out.push(h)
    await new Promise(r=>setTimeout(r,80))
  }
  return out
}
