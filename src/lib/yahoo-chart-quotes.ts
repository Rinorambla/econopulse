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
 * @param range — Yahoo chart range: '1d','5d','1mo','3mo','6mo','1y','ytd' etc.
 *   chartPreviousClose adapts to the range, giving period return automatically.
 */
export async function fetchYahooChartQuotes(
  symbols: string[],
  range = '2d',
  concurrency = 5,
  delay = 120,
): Promise<Record<string, YahooChartQuote>> {
  const result: Record<string, YahooChartQuote> = {}

  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency)
    const promises = batch.map(async (symbol) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`
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
    if (i + concurrency < symbols.length) {
      await new Promise(r => setTimeout(r, delay))
    }
  }

  return result
}
