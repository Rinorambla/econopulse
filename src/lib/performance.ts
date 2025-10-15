import { fetchMultipleHistory } from './yahoo-history'

// Extended performance periods
export interface TimeframePerf {
  symbol: string
  d1: number|null
  w1: number|null
  m1: number|null
  m3: number|null
  m6: number|null
  ytd: number|null
  w52: number|null // 52 week performance
}

// Helper to compute percent change safely
function pctChange(curr: number, prev: number): number|null {
  if (prev === 0 || prev == null || curr == null) return null
  return ((curr - prev) / prev) * 100
}

export async function computeTimeframePerformance(symbols: string[]): Promise<TimeframePerf[]> {
  // Need 1 year of history for 52W & YTD
  // We'll fetch 1y daily bars; this is enough for all periods (d1, w1, m1, 3M, 6M, YTD, 52W)
  const histories = await fetchMultipleHistory(symbols, '1y', '1d')
  const now = new Date()
  const currentYear = now.getUTCFullYear()

  return histories.map(h => {
    const bars = h.bars
    if (bars.length < 2) return { symbol: h.symbol, d1:null, w1:null, m1:null, m3:null, m6:null, ytd:null, w52:null }
    const lastIdx = bars.length - 1
    const last = bars[lastIdx]
    const lastClose = last.close

    // Index lookup by approximate trading-day offsets
    const getByOffset = (tradingDaysAgo: number): number|null => {
      const idx = lastIdx - tradingDaysAgo
      if (idx < 0) return null
      return bars[idx].close
    }

    const d1Ref = getByOffset(1)
    const w1Ref = getByOffset(5)
    const m1Ref = getByOffset(21)
    const m3Ref = getByOffset(63) // ~21 * 3
    const m6Ref = getByOffset(126) // ~21 * 6

    // YTD: find first bar of current year
    let ytdRef: number|null = null
    for (let i = 0; i < bars.length; i++) {
      const d = new Date(bars[i].time)
      if (d.getUTCFullYear() === currentYear) { ytdRef = bars[i].close; break }
    }

    // 52W: first bar in this fetched range is ~1y ago; use first close
    const w52Ref = bars[0]?.close ?? null

    return {
      symbol: h.symbol,
      d1: d1Ref!=null ? pctChange(lastClose, d1Ref) : null,
      w1: w1Ref!=null ? pctChange(lastClose, w1Ref) : null,
      m1: m1Ref!=null ? pctChange(lastClose, m1Ref) : null,
      m3: m3Ref!=null ? pctChange(lastClose, m3Ref) : null,
      m6: m6Ref!=null ? pctChange(lastClose, m6Ref) : null,
      ytd: ytdRef!=null ? pctChange(lastClose, ytdRef) : null,
      w52: w52Ref!=null ? pctChange(lastClose, w52Ref) : null
    }
  })
}
