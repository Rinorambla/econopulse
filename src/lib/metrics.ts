import { YahooHistory, YahooBar } from './yahoo-history'

export interface ComputedMetrics {
  symbol: string
  atr14: number | null
  avgVolume20: number | null
  gapPercent: number | null
  range52w: { low: number; high: number; percentFromHigh: number | null } | null
  rsi14: number | null
  breakout20d: boolean | null
}

function trueRange(cur: YahooBar, prev: YahooBar | null): number {
  if (!prev) return cur.high - cur.low
  return Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close))
}

export function computeMetrics(hist: YahooHistory): ComputedMetrics {
  const bars = hist.bars
  if (!bars.length) return { symbol: hist.symbol, atr14:null, avgVolume20:null, gapPercent:null, range52w:null, rsi14:null, breakout20d:null }
  // ATR 14
  const trs: number[] = []
  for (let i=0;i<bars.length;i++) trs.push(trueRange(bars[i], i>0?bars[i-1]:null))
  const atr14 = trs.length >= 14 ? average(trs.slice(-14)) : null
  // Avg vol 20
  const avgVolume20 = bars.length >= 20 ? average(bars.slice(-20).map(b=>b.volume)) : null
  // Gap % (last open vs prev close)
  let gapPercent: number | null = null
  if (bars.length >= 2) {
    const prevClose = bars[bars.length-2].close
    const lastOpen = bars[bars.length-1].open
    if (prevClose) gapPercent = ( (lastOpen - prevClose) / prevClose ) * 100
  }
  // 52w range (assume bars cover <=1y; else require longer fetch)
  const highs = bars.map(b=>b.high)
  const lows = bars.map(b=>b.low)
  const hi = Math.max(...highs)
  const lo = Math.min(...lows)
  const lastClose = bars[bars.length-1].close
  const percentFromHigh = hi ? ((hi - lastClose)/hi)*100 : null
  // RSI 14
  const rsi14 = computeRSI(bars.map(b=>b.close), 14)
  // Breakout 20d (close > max previous 20 highs excluding today)
  let breakout20d: boolean | null = null
  if (bars.length > 20) {
    const prevHigh = Math.max(...bars.slice(-21,-1).map(b=>b.high))
    breakout20d = lastClose > prevHigh
  }
  return { symbol: hist.symbol, atr14, avgVolume20, gapPercent, range52w: { low: lo, high: hi, percentFromHigh }, rsi14, breakout20d }
}

function average(arr: number[]): number { return arr.reduce((s,v)=>s+v,0)/arr.length }

function computeRSI(closes: number[], period: number): number | null {
  if (closes.length <= period) return null
  let gains = 0, losses = 0
  for (let i=1;i<=period;i++) {
    const diff = closes[i]-closes[i-1]
    if (diff>=0) gains += diff; else losses -= diff
  }
  let avgGain = gains/period
  let avgLoss = losses/period
  for (let i=period+1;i<closes.length;i++) {
    const diff = closes[i]-closes[i-1]
    if (diff>=0) {
      avgGain = ( (avgGain*(period-1)) + diff ) / period
      avgLoss = ( (avgLoss*(period-1)) + 0 ) / period
    } else {
      avgGain = ( (avgGain*(period-1)) + 0 ) / period
      avgLoss = ( (avgLoss*(period-1)) + (-diff) ) / period
    }
  }
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}
