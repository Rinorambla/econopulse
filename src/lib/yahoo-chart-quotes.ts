/**
 * Fetch real-time quotes via Yahoo v8/finance/chart endpoint.
 * The v7/finance/quote endpoint is blocked, but v8/chart still works.
 * Returns price, previous close, and daily change for each symbol.
 */

export interface YahooChartQuote {
  symbol: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  currency?: string
}

/**
 * Fetch quotes for multiple symbols via Yahoo v8/chart (one call per symbol, batched with small delay).
 * Limit concurrency to avoid rate-limiting.
 */
export async function fetchYahooChartQuotes(symbols: string[]): Promise<Record<string, YahooChartQuote>> {
  const result: Record<string, YahooChartQuote> = {}
  const CONCURRENCY = 5
  const DELAY = 120 // ms between batches

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY)
    const promises = batch.map(async (symbol) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2d&interval=1d`
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) return null
        const json = await res.json()
        const meta = json?.chart?.result?.[0]?.meta
        if (!meta || !meta.regularMarketPrice) return null

        const price = meta.regularMarketPrice
        const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price
        const change = price - previousClose
        const changePercent = previousClose ? ((change / previousClose) * 100) : 0

        result[symbol] = {
          symbol,
          price,
          previousClose,
          change,
          changePercent,
          currency: meta.currency,
        }
      } catch {
        // skip failed symbols
      }
    })
    await Promise.all(promises)
    if (i + CONCURRENCY < symbols.length) {
      await new Promise(r => setTimeout(r, DELAY))
    }
  }

  return result
}
