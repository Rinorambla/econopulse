// Batch quote fetch via Yahoo Finance quote endpoint (unofficial)
// Provides marketCap, sector, industry when available.

export interface YahooBatchQuote {
  symbol: string
  shortName?: string
  longName?: string
  regularMarketPrice?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  regularMarketVolume?: number
  marketCap?: number
  sector?: string
  industry?: string
}

export async function fetchYahooBatchQuotes(symbols: string[]): Promise<YahooBatchQuote[]> {
  const out: YahooBatchQuote[] = []
  const CHUNK = 40
  for (let i=0;i<symbols.length;i+=CHUNK) {
    const chunk = symbols.slice(i,i+CHUNK)
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(chunk.join(','))}`
    try {
      const res = await fetch(url, { headers: { 'User-Agent':'Mozilla/5.0' } })
      if (!res.ok) {
        // If we start getting 4xx after some success, break (avoid hammer)
        if (res.status === 429) break
        continue
      }
      const js = await res.json()
  const results = js?.quoteResponse?.result || []
      results.forEach((r: any) => {
        const sector = r.sector || (r.quoteType === 'ETF' ? 'ETF' : (r.quoteType === 'INDEX' ? 'Index' : 'Other'))
        out.push({
          symbol: r.symbol,
          shortName: r.shortName,
          longName: r.longName,
          regularMarketPrice: r.regularMarketPrice,
          regularMarketChange: r.regularMarketChange,
          regularMarketChangePercent: r.regularMarketChangePercent,
          regularMarketVolume: r.regularMarketVolume,
          marketCap: (typeof r.marketCap === 'object' && r.marketCap ? r.marketCap.raw : r.marketCap) || 0,
          sector,
          industry: r.industry
        })
      })
  await new Promise(r=>setTimeout(r,150))
    } catch(e) {
      // ignore single chunk errors
    }
  }
  return out
}
