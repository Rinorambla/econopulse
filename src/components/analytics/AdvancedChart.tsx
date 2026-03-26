'use client'

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type Time,
  type SeriesType,
} from 'lightweight-charts'

// ========== Types ==========
type ChartStyle = 'candle' | 'line' | 'area'
type RangeKey = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'MAX'
type IndicatorKey =
  // Trend
  | 'sma20' | 'sma50' | 'sma100' | 'sma200'
  | 'ema9' | 'ema20' | 'ema50' | 'ema200'
  | 'ichimoku'
  // Volatility
  | 'bb' | 'keltner' | 'atr' | 'donchian'
  // Volume
  | 'volume' | 'vwap' | 'obv'
  // Momentum
  | 'rsi' | 'macd' | 'stochastic' | 'cci' | 'williamsR' | 'mom'
  // Support/Resistance
  | 'pivots'

interface Bar {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface Props {
  symbol?: string
  onSymbolChange?: (sym: string) => void
  height?: number
  className?: string
}

const RANGE_OPTS: { key: RangeKey; label: string; range: string; interval: string }[] = [
  { key: '1D', label: '1D', range: '1d', interval: '5m' },
  { key: '5D', label: '5D', range: '5d', interval: '30m' },
  { key: '1M', label: '1M', range: '1mo', interval: '1d' },
  { key: '3M', label: '3M', range: '3mo', interval: '1d' },
  { key: '6M', label: '6M', range: '6mo', interval: '1d' },
  { key: 'YTD', label: 'YTD', range: 'ytd', interval: '1d' },
  { key: '1Y', label: '1Y', range: '1y', interval: '1d' },
  { key: '5Y', label: '5Y', range: '5y', interval: '1wk' },
  { key: 'MAX', label: 'MAX', range: 'max', interval: '1mo' },
]

const IND_CATEGORIES: { category: string; items: { key: IndicatorKey; label: string }[] }[] = [
  {
    category: 'Trend',
    items: [
      { key: 'sma20', label: 'SMA 20' },
      { key: 'sma50', label: 'SMA 50' },
      { key: 'sma100', label: 'SMA 100' },
      { key: 'sma200', label: 'SMA 200' },
      { key: 'ema9', label: 'EMA 9' },
      { key: 'ema20', label: 'EMA 20' },
      { key: 'ema50', label: 'EMA 50' },
      { key: 'ema200', label: 'EMA 200' },
      { key: 'ichimoku', label: 'Ichimoku' },
    ],
  },
  {
    category: 'Volatility',
    items: [
      { key: 'bb', label: 'Bollinger' },
      { key: 'keltner', label: 'Keltner Ch.' },
      { key: 'atr', label: 'ATR (14)' },
      { key: 'donchian', label: 'Donchian' },
    ],
  },
  {
    category: 'Volume',
    items: [
      { key: 'volume', label: 'Volume' },
      { key: 'vwap', label: 'VWAP' },
      { key: 'obv', label: 'OBV' },
    ],
  },
  {
    category: 'Momentum',
    items: [
      { key: 'rsi', label: 'RSI (14)' },
      { key: 'macd', label: 'MACD' },
      { key: 'stochastic', label: 'Stochastic' },
      { key: 'cci', label: 'CCI (20)' },
      { key: 'williamsR', label: 'Williams %R' },
      { key: 'mom', label: 'Momentum' },
    ],
  },
  {
    category: 'S / R',
    items: [
      { key: 'pivots', label: 'Pivot Points' },
    ],
  },
]

// ========== TA Helpers ==========
function computeSMA(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = []
  let sum = 0
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i]
    if (i >= period) sum -= closes[i - period]
    out.push(i >= period - 1 ? sum / period : null)
  }
  return out
}

function computeEMA(closes: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1)
  const out: (number | null)[] = []
  let prev: number | null = null
  for (let i = 0; i < closes.length; i++) {
    if (prev === null) {
      // Use SMA for first value
      if (i < period - 1) { out.push(null); continue }
      let s = 0; for (let j = i - period + 1; j <= i; j++) s += closes[j]
      prev = s / period
    } else {
      prev = closes[i] * k + prev * (1 - k)
    }
    out.push(prev)
  }
  return out
}

function computeBB(closes: number[], period = 20, mult = 2) {
  const basis = computeSMA(closes, period)
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 || basis[i] === null) { upper.push(null); lower.push(null); continue }
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = basis[i]!
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period
    const sd = Math.sqrt(variance)
    upper.push(mean + mult * sd)
    lower.push(mean - mult * sd)
  }
  return { basis, upper, lower }
}

function computeVWAP(bars: Bar[]): (number | null)[] {
  const out: (number | null)[] = []
  let cumTPV = 0, cumVol = 0
  let lastDay = -1
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]
    const d = new Date(b.time * 1000)
    const dayKey = d.getUTCFullYear() * 400 + d.getUTCMonth() * 32 + d.getUTCDate()
    if (dayKey !== lastDay) { cumTPV = 0; cumVol = 0; lastDay = dayKey }
    const tp = (b.high + b.low + b.close) / 3
    cumTPV += tp * b.volume
    cumVol += b.volume
    out.push(cumVol > 0 ? cumTPV / cumVol : null)
  }
  return out
}

// Additional TA helpers
function computeATR(bars: Bar[], period = 14): (number | null)[] {
  const trs: number[] = []
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]
    if (i === 0) { trs.push(b.high - b.low); continue }
    const pc = bars[i - 1].close
    trs.push(Math.max(b.high - b.low, Math.abs(b.high - pc), Math.abs(b.low - pc)))
  }
  const out: (number | null)[] = []
  let prev: number | null = null
  const k = 2 / (period + 1)
  for (let i = 0; i < trs.length; i++) {
    if (prev === null) {
      if (i < period - 1) { out.push(null); continue }
      let s = 0; for (let j = i - period + 1; j <= i; j++) s += trs[j]
      prev = s / period
    } else {
      prev = trs[i] * k + prev * (1 - k)
    }
    out.push(prev)
  }
  return out
}

function computeKeltner(bars: Bar[], emaPeriod = 20, atrPeriod = 10, mult = 1.5) {
  const closes = bars.map(b => b.close)
  const basis = computeEMA(closes, emaPeriod)
  const atrVals = computeATR(bars, atrPeriod)
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []
  for (let i = 0; i < bars.length; i++) {
    if (basis[i] === null || atrVals[i] === null) { upper.push(null); lower.push(null); continue }
    upper.push(basis[i]! + mult * atrVals[i]!)
    lower.push(basis[i]! - mult * atrVals[i]!)
  }
  return { basis, upper, lower }
}

function computeDonchian(bars: Bar[], period = 20) {
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { upper.push(null); lower.push(null); continue }
    let hi = -Infinity, lo = Infinity
    for (let j = i - period + 1; j <= i; j++) { hi = Math.max(hi, bars[j].high); lo = Math.min(lo, bars[j].low) }
    upper.push(hi); lower.push(lo)
  }
  return { upper, lower }
}

function computeRSI(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [null]
  const gains: number[] = []
  const losses: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    gains.push(d > 0 ? d : 0)
    losses.push(d < 0 ? -d : 0)
    if (i < period) { out.push(null); continue }
    if (i === period) {
      const ag = gains.reduce((s, v) => s + v, 0) / period
      const al = losses.reduce((s, v) => s + v, 0) / period
      out.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al))
    } else {
      const prevRsi = out[i - 1]
      if (prevRsi === null) { out.push(null); continue }
      // Wilder smoothing
      const prevAg = (() => { let ag = gains.slice(0, period).reduce((s, v) => s + v, 0) / period; for (let k = period; k < gains.length; k++) ag = (ag * (period - 1) + gains[k]) / period; return ag })()
      const prevAl = (() => { let al = losses.slice(0, period).reduce((s, v) => s + v, 0) / period; for (let k = period; k < losses.length; k++) al = (al * (period - 1) + losses[k]) / period; return al })()
      out.push(prevAl === 0 ? 100 : 100 - 100 / (1 + prevAg / prevAl))
    }
  }
  return out
}

function computeMACD(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = computeEMA(closes, fast)
  const emaSlow = computeEMA(closes, slow)
  const macdLine: (number | null)[] = []
  for (let i = 0; i < closes.length; i++) {
    if (emaFast[i] === null || emaSlow[i] === null) { macdLine.push(null); continue }
    macdLine.push(emaFast[i]! - emaSlow[i]!)
  }
  const nonNullMacd = macdLine.filter(v => v !== null) as number[]
  const sigLine = computeEMA(nonNullMacd, signal)
  const sigPadLen = macdLine.length - nonNullMacd.length
  const sigFull: (number | null)[] = Array(sigPadLen).fill(null).concat(sigLine)
  const histogram: (number | null)[] = []
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] === null || sigFull[i] === null) { histogram.push(null); continue }
    histogram.push(macdLine[i]! - sigFull[i]!)
  }
  return { macdLine, signal: sigFull, histogram }
}

function computeStochastic(bars: Bar[], kPeriod = 14, dPeriod = 3) {
  const kLine: (number | null)[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < kPeriod - 1) { kLine.push(null); continue }
    let hi = -Infinity, lo = Infinity
    for (let j = i - kPeriod + 1; j <= i; j++) {
      hi = Math.max(hi, bars[j].high)
      lo = Math.min(lo, bars[j].low)
    }
    const range = hi - lo
    kLine.push(range === 0 ? 50 : ((bars[i].close - lo) / range) * 100)
  }
  const nonNullK = kLine.filter(v => v !== null) as number[]
  const dRaw = computeSMA(nonNullK, dPeriod)
  const dLine: (number | null)[] = Array(kLine.length - nonNullK.length).fill(null).concat(dRaw)
  return { kLine, dLine }
}

function computeCCI(bars: Bar[], period = 20): (number | null)[] {
  const tps = bars.map(b => (b.high + b.low + b.close) / 3)
  const out: (number | null)[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { out.push(null); continue }
    const slice = tps.slice(i - period + 1, i + 1)
    const mean = slice.reduce((s, v) => s + v, 0) / period
    const md = slice.reduce((s, v) => s + Math.abs(v - mean), 0) / period
    out.push(md === 0 ? 0 : (tps[i] - mean) / (0.015 * md))
  }
  return out
}

function computeWilliamsR(bars: Bar[], period = 14): (number | null)[] {
  const out: (number | null)[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { out.push(null); continue }
    let hi = -Infinity, lo = Infinity
    for (let j = i - period + 1; j <= i; j++) {
      hi = Math.max(hi, bars[j].high)
      lo = Math.min(lo, bars[j].low)
    }
    const range = hi - lo
    out.push(range === 0 ? -50 : ((hi - bars[i].close) / range) * -100)
  }
  return out
}

function computeMomentum(closes: number[], period = 10): (number | null)[] {
  const out: (number | null)[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { out.push(null); continue }
    out.push(closes[i] - closes[i - period])
  }
  return out
}

function computeOBV(bars: Bar[]): number[] {
  const out: number[] = [0]
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].close > bars[i - 1].close) out.push(out[i - 1] + bars[i].volume)
    else if (bars[i].close < bars[i - 1].close) out.push(out[i - 1] - bars[i].volume)
    else out.push(out[i - 1])
  }
  return out
}

function computeIchimoku(bars: Bar[], tenkan = 9, kijun = 26, senkou = 52) {
  const midHL = (list: Bar[], p: number, i: number): number | null => {
    if (i < p - 1) return null
    let hi = -Infinity, lo = Infinity
    for (let j = i - p + 1; j <= i; j++) { hi = Math.max(hi, list[j].high); lo = Math.min(lo, list[j].low) }
    return (hi + lo) / 2
  }
  const tenkanSen: (number | null)[] = []
  const kijunSen: (number | null)[] = []
  const senkouA: (number | null)[] = []
  const senkouB: (number | null)[] = []
  for (let i = 0; i < bars.length; i++) {
    const t = midHL(bars, tenkan, i); tenkanSen.push(t)
    const k = midHL(bars, kijun, i); kijunSen.push(k)
    senkouA.push(t !== null && k !== null ? (t + k) / 2 : null)
    senkouB.push(midHL(bars, senkou, i))
  }
  return { tenkanSen, kijunSen, senkouA, senkouB }
}

function computePivots(bars: Bar[]): { pp: number; s1: number; s2: number; s3: number; r1: number; r2: number; r3: number } | null {
  if (bars.length < 2) return null
  const prev = bars[bars.length - 2]
  const pp = (prev.high + prev.low + prev.close) / 3
  return {
    pp,
    s1: 2 * pp - prev.high, s2: pp - (prev.high - prev.low), s3: prev.low - 2 * (prev.high - pp),
    r1: 2 * pp - prev.low, r2: pp + (prev.high - prev.low), r3: prev.high + 2 * (pp - prev.low),
  }
}

// ========== Component ==========
export default function AdvancedChart({ symbol: propSymbol = 'SPY', onSymbolChange, height = 520, className = '' }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const mainSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null)
  const overlaySeriesRef = useRef<ISeriesApi<SeriesType>[]>([])
  const tooltipRef = useRef<HTMLDivElement>(null)

  const [symbol, setSymbol] = useState(propSymbol)
  const [inputVal, setInputVal] = useState(propSymbol)
  const [rangeKey, setRangeKey] = useState<RangeKey>('3M')
  const [chartStyle, setChartStyle] = useState<ChartStyle>('candle')
  const [indicators, setIndicators] = useState<Set<IndicatorKey>>(new Set(['volume']))
  const [bars, setBars] = useState<Bar[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastPrice, setLastPrice] = useState<{ price: number; change: number; changePct: number } | null>(null)
  const [crosshairData, setCrosshairData] = useState<{ time: string; o: number; h: number; l: number; c: number; v: number } | null>(null)

  // Sync prop → state
  useEffect(() => { if (propSymbol !== symbol) { setSymbol(propSymbol); setInputVal(propSymbol) } }, [propSymbol])

  const currentRange = useMemo(() => RANGE_OPTS.find(r => r.key === rangeKey) || RANGE_OPTS[3], [rangeKey])

  // ========== Fetch Data ==========
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ symbol, range: currentRange.range, interval: currentRange.interval })
      const res = await fetch(`/api/yahoo-history?${qs}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const json = await res.json()
      const raw = json?.bars || json?.data?.bars || json?.data || []
      if (!Array.isArray(raw) || raw.length < 2) throw new Error('No data')
      const parsed: Bar[] = raw
        .filter((b: any) => b && Number.isFinite(b.close) && b.close > 0)
        .map((b: any) => ({
          time: typeof b.time === 'number' ? (b.time > 1e12 ? Math.floor(b.time / 1000) : b.time) : Math.floor(new Date(b.time).getTime() / 1000),
          open: b.open || b.close,
          high: b.high || b.close,
          low: b.low || b.close,
          close: b.close,
          volume: b.volume || 0,
        }))
        .sort((a: Bar, b: Bar) => a.time - b.time)

      // Deduplicate by time
      const seen = new Set<number>()
      const unique = parsed.filter(b => { if (seen.has(b.time)) return false; seen.add(b.time); return true })
      setBars(unique)

      // Last price info
      if (unique.length >= 2) {
        const last = unique[unique.length - 1]
        const prev = unique[unique.length - 2]
        setLastPrice({
          price: last.close,
          change: last.close - prev.close,
          changePct: prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0,
        })
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load data')
      setBars([])
      setLastPrice(null)
    } finally {
      setLoading(false)
    }
  }, [symbol, currentRange])

  useEffect(() => { fetchData() }, [fetchData])

  // ========== Chart Creation / Update ==========
  useEffect(() => {
    if (!chartContainerRef.current || bars.length < 2) return

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }
    overlaySeriesRef.current = []
    volumeSeriesRef.current = null

    const container = chartContainerRef.current
    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(148,163,184,0.08)' },
        horzLines: { color: 'rgba(148,163,184,0.08)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(148,163,184,0.4)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1e293b' },
        horzLine: { color: 'rgba(148,163,184,0.4)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1e293b' },
      },
      rightPriceScale: {
        borderColor: 'rgba(148,163,184,0.15)',
        scaleMargins: { top: 0.05, bottom: indicators.has('volume') ? 0.25 : 0.05 },
      },
      timeScale: {
        borderColor: 'rgba(148,163,184,0.15)',
        timeVisible: currentRange.interval.includes('m'),
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    })
    chartRef.current = chart

    // Format time for chart
    const formatTime = (t: number): string => {
      const d = new Date(t * 1000)
      if (currentRange.interval.includes('m')) {
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
      }
      if (currentRange.interval === '1wk' || currentRange.interval === '1mo') {
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
      }
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    }

    const candleData: CandlestickData[] = bars.map(b => ({
      time: formatTime(b.time) as Time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }))
    const timeLabels = bars.map(b => formatTime(b.time) as Time)
    const closes = bars.map(b => b.close)

    // Main series
    if (chartStyle === 'candle') {
      const cs = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#16a34a',
        borderDownColor: '#dc2626',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      })
      cs.setData(candleData)
      mainSeriesRef.current = cs
    } else if (chartStyle === 'line') {
      const ls = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
      })
      ls.setData(closes.map((c, i) => ({ time: timeLabels[i], value: c } as LineData)))
      mainSeriesRef.current = ls
    } else {
      // area
      const as_ = chart.addSeries(AreaSeries, {
        topColor: 'rgba(59,130,246,0.4)',
        bottomColor: 'rgba(59,130,246,0.02)',
        lineColor: '#3b82f6',
        lineWidth: 2,
      })
      as_.setData(closes.map((c, i) => ({ time: timeLabels[i], value: c } as LineData)))
      mainSeriesRef.current = as_
    }

    // ===== Helper to add overlay line =====
    const addOverlay = (vals: (number | null)[], color: string, style: LineStyle = LineStyle.Solid, width = 1) => {
      const ls = chart.addSeries(LineSeries, { color, lineWidth: width as 1 | 2 | 3 | 4, lineStyle: style, crosshairMarkerVisible: false })
      ls.setData(vals.map((v, i) => v !== null ? { time: timeLabels[i], value: v } as LineData : null).filter(Boolean) as LineData[])
      overlaySeriesRef.current.push(ls)
    }

    // Check how many sub-panels we need (for proper margin allocation)
    const subPanelKeys: IndicatorKey[] = ['rsi', 'macd', 'stochastic', 'cci', 'williamsR', 'mom', 'atr', 'obv']
    const activeSubPanels = subPanelKeys.filter(k => indicators.has(k))
    const hasVolume = indicators.has('volume')

    // Volume
    if (hasVolume) {
      const vs = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      })
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
      })
      vs.setData(bars.map((b, i) => ({
        time: timeLabels[i],
        value: b.volume,
        color: b.close >= b.open ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
      } as HistogramData)))
      volumeSeriesRef.current = vs
    }

    // ── Trend Overlays ──
    if (indicators.has('sma20')) addOverlay(computeSMA(closes, 20), '#f59e0b')
    if (indicators.has('sma50')) addOverlay(computeSMA(closes, 50), '#a855f7')
    if (indicators.has('sma100')) addOverlay(computeSMA(closes, 100), '#06b6d4')
    if (indicators.has('sma200')) addOverlay(computeSMA(closes, 200), '#ef4444', LineStyle.Solid, 2)
    if (indicators.has('ema9')) addOverlay(computeEMA(closes, 9), '#34d399', LineStyle.Dashed)
    if (indicators.has('ema20')) addOverlay(computeEMA(closes, 20), '#06b6d4', LineStyle.Dashed)
    if (indicators.has('ema50')) addOverlay(computeEMA(closes, 50), '#f472b6', LineStyle.Dashed)
    if (indicators.has('ema200')) addOverlay(computeEMA(closes, 200), '#fb923c', LineStyle.Dashed, 2)

    // Ichimoku Cloud
    if (indicators.has('ichimoku')) {
      const ichi = computeIchimoku(bars)
      addOverlay(ichi.tenkanSen, '#2563eb', LineStyle.Solid) // Tenkan (blue)
      addOverlay(ichi.kijunSen, '#dc2626', LineStyle.Solid)  // Kijun (red)
      addOverlay(ichi.senkouA, 'rgba(34,197,94,0.5)', LineStyle.Dotted) // Senkou A
      addOverlay(ichi.senkouB, 'rgba(239,68,68,0.5)', LineStyle.Dotted) // Senkou B
    }

    // ── Volatility Overlays ──
    if (indicators.has('bb')) {
      const { basis, upper, lower } = computeBB(closes, 20, 2)
      addOverlay(upper, 'rgba(168,85,247,0.5)')
      addOverlay(basis, 'rgba(168,85,247,0.3)', LineStyle.Dashed)
      addOverlay(lower, 'rgba(168,85,247,0.5)')
    }
    if (indicators.has('keltner')) {
      const kc = computeKeltner(bars)
      addOverlay(kc.upper, 'rgba(34,211,238,0.5)')
      addOverlay(kc.basis, 'rgba(34,211,238,0.3)', LineStyle.Dashed)
      addOverlay(kc.lower, 'rgba(34,211,238,0.5)')
    }
    if (indicators.has('donchian')) {
      const dc = computeDonchian(bars)
      addOverlay(dc.upper, 'rgba(251,191,36,0.5)')
      addOverlay(dc.lower, 'rgba(251,191,36,0.5)')
    }

    // ── Volume Overlays ──
    if (indicators.has('vwap')) addOverlay(computeVWAP(bars), '#ec4899', LineStyle.Dotted)

    // ── Pivot Points (horizontal lines) ──
    if (indicators.has('pivots') && bars.length >= 2) {
      const pv = computePivots(bars)
      if (pv) {
        const drawHLine = (val: number, color: string, style: LineStyle) => {
          const ls = chart.addSeries(LineSeries, { color, lineWidth: 1, lineStyle: style, crosshairMarkerVisible: false, lastValueVisible: true, priceLineVisible: false })
          ls.setData(timeLabels.map(t => ({ time: t, value: val } as LineData)))
          overlaySeriesRef.current.push(ls)
        }
        drawHLine(pv.pp, '#94a3b8', LineStyle.Solid)
        drawHLine(pv.r1, 'rgba(239,68,68,0.6)', LineStyle.Dashed)
        drawHLine(pv.r2, 'rgba(239,68,68,0.4)', LineStyle.Dotted)
        drawHLine(pv.s1, 'rgba(34,197,94,0.6)', LineStyle.Dashed)
        drawHLine(pv.s2, 'rgba(34,197,94,0.4)', LineStyle.Dotted)
      }
    }

    // ── Sub-panel indicators (rendered as overlays into a secondary price-scale) ──
    // Due to lightweight-charts limitations, we render sub-panel indicators in a separate scale area
    const subPanelScaleBase = 0.62 // leave room for sub-panels at the bottom
    if (activeSubPanels.length > 0) {
      chart.priceScale('right').applyOptions({
        scaleMargins: { top: 0.05, bottom: 1 - subPanelScaleBase + (hasVolume ? 0.04 : 0) },
      })
    }

    let panelIdx = 0
    const panelHeight = activeSubPanels.length > 0 ? (1 - subPanelScaleBase) / Math.min(activeSubPanels.length, 3) : 0

    const addSubLine = (vals: (number | null)[], scaleId: string, color: string, style: LineStyle = LineStyle.Solid, width = 1) => {
      const ls = chart.addSeries(LineSeries, {
        color, lineWidth: width as 1 | 2 | 3 | 4, lineStyle: style, crosshairMarkerVisible: false,
        priceScaleId: scaleId, lastValueVisible: true,
      })
      ls.setData(vals.map((v, i) => v !== null ? { time: timeLabels[i], value: v } as LineData : null).filter(Boolean) as LineData[])
      overlaySeriesRef.current.push(ls)
      return ls
    }

    const addSubHistogram = (vals: (number | null)[], scaleId: string) => {
      const hs = chart.addSeries(HistogramSeries, { priceScaleId: scaleId })
      hs.setData(vals.map((v, i) => v !== null ? ({
        time: timeLabels[i], value: v,
        color: v >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)',
      } as HistogramData) : null).filter(Boolean) as HistogramData[])
      overlaySeriesRef.current.push(hs)
    }

    const setupSubScale = (scaleId: string) => {
      const top = subPanelScaleBase + panelIdx * panelHeight
      chart.priceScale(scaleId).applyOptions({
        scaleMargins: { top, bottom: Math.max(0, 1 - top - panelHeight) },
      })
      panelIdx++
    }

    // RSI
    if (indicators.has('rsi')) {
      const rsiVals = computeRSI(closes)
      const sid = 'rsi-panel'
      setupSubScale(sid)
      addSubLine(rsiVals, sid, '#8b5cf6')
      // 30/70 reference lines
      const line30 = timeLabels.map(t => ({ time: t, value: 30 } as LineData))
      const line70 = timeLabels.map(t => ({ time: t, value: 70 } as LineData))
      const ls30 = chart.addSeries(LineSeries, { color: 'rgba(34,197,94,0.3)', lineWidth: 1, lineStyle: LineStyle.Dotted, crosshairMarkerVisible: false, priceScaleId: sid, lastValueVisible: false })
      ls30.setData(line30); overlaySeriesRef.current.push(ls30)
      const ls70 = chart.addSeries(LineSeries, { color: 'rgba(239,68,68,0.3)', lineWidth: 1, lineStyle: LineStyle.Dotted, crosshairMarkerVisible: false, priceScaleId: sid, lastValueVisible: false })
      ls70.setData(line70); overlaySeriesRef.current.push(ls70)
    }

    // MACD
    if (indicators.has('macd')) {
      const m = computeMACD(closes)
      const sid = 'macd-panel'
      setupSubScale(sid)
      addSubLine(m.macdLine, sid, '#3b82f6')
      addSubLine(m.signal, sid, '#f97316', LineStyle.Dashed)
      addSubHistogram(m.histogram, sid)
    }

    // Stochastic
    if (indicators.has('stochastic')) {
      const s = computeStochastic(bars)
      const sid = 'stoch-panel'
      setupSubScale(sid)
      addSubLine(s.kLine, sid, '#06b6d4')
      addSubLine(s.dLine, sid, '#f97316', LineStyle.Dashed)
    }

    // CCI
    if (indicators.has('cci')) {
      const cciVals = computeCCI(bars)
      const sid = 'cci-panel'
      setupSubScale(sid)
      addSubLine(cciVals, sid, '#14b8a6')
    }

    // Williams %R
    if (indicators.has('williamsR')) {
      const wrVals = computeWilliamsR(bars)
      const sid = 'wr-panel'
      setupSubScale(sid)
      addSubLine(wrVals, sid, '#f43f5e')
    }

    // Momentum
    if (indicators.has('mom')) {
      const momVals = computeMomentum(closes)
      const sid = 'mom-panel'
      setupSubScale(sid)
      addSubLine(momVals, sid, '#a78bfa')
    }

    // ATR (sub-panel)
    if (indicators.has('atr')) {
      const atrVals = computeATR(bars)
      const sid = 'atr-panel'
      setupSubScale(sid)
      addSubLine(atrVals, sid, '#fb923c')
    }

    // OBV (sub-panel)
    if (indicators.has('obv')) {
      const obvVals = computeOBV(bars)
      const sid = 'obv-panel'
      setupSubScale(sid)
      addSubLine(obvVals.map(v => v as number | null), sid, '#22d3ee')
    }

    // Fit content
    chart.timeScale().fitContent()

    // Crosshair move → tooltip
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setCrosshairData(null)
        return
      }
      const main = mainSeriesRef.current
      if (!main) return
      const data = param.seriesData.get(main) as any
      if (!data) { setCrosshairData(null); return }
      const timeStr = typeof param.time === 'string' ? param.time : ''
      if ('open' in data) {
        setCrosshairData({ time: timeStr, o: data.open, h: data.high, l: data.low, c: data.close, v: 0 })
      } else if ('value' in data) {
        setCrosshairData({ time: timeStr, o: data.value, h: data.value, l: data.value, c: data.value, v: 0 })
      }
    })

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [bars, chartStyle, indicators, height, currentRange.interval])

  // ========== Handlers ==========
  const toggleIndicator = useCallback((key: IndicatorKey) => {
    setIndicators(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }, [])

  const applySymbol = useCallback(() => {
    const v = inputVal.trim().toUpperCase()
    if (v && v !== symbol) {
      setSymbol(v)
      onSymbolChange?.(v)
    }
  }, [inputVal, symbol, onSymbolChange])

  const pctColor = lastPrice ? (lastPrice.changePct >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-400'

  return (
    <div className={`bg-slate-900/60 border border-white/10 rounded-lg overflow-hidden ${className}`}>
      {/* ===== TOP BAR ===== */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-800/50 border-b border-white/10">
        {/* Symbol input */}
        <div className="flex items-center gap-1.5">
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') applySymbol() }}
            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white font-semibold w-24 focus:outline-none focus:border-blue-500"
            placeholder="Symbol"
          />
          <button onClick={applySymbol} className="px-2 py-1 text-[10px] rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">Go</button>
        </div>

        {/* Price header */}
        {lastPrice && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white font-bold">${lastPrice.price.toFixed(2)}</span>
            <span className={pctColor}>
              {lastPrice.change >= 0 ? '+' : ''}{lastPrice.change.toFixed(2)} ({lastPrice.changePct >= 0 ? '+' : ''}{lastPrice.changePct.toFixed(2)}%)
            </span>
          </div>
        )}

        {/* Separator */}
        <div className="h-5 w-px bg-white/15 mx-1" />

        {/* Chart style buttons */}
        <div className="flex items-center gap-0.5">
          {([['candle', '🕯'], ['line', '📈'], ['area', '📊']] as [ChartStyle, string][]).map(([s, icon]) => (
            <button
              key={s}
              onClick={() => setChartStyle(s)}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${chartStyle === s ? 'bg-blue-600/80 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              title={s.charAt(0).toUpperCase() + s.slice(1)}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-white/15 mx-1" />

        {/* Range buttons */}
        <div className="flex items-center gap-0.5">
          {RANGE_OPTS.map(r => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${rangeKey === r.key ? 'bg-blue-600/80 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== INDICATOR BAR (categorized) ===== */}
      <div className="px-3 py-1.5 bg-slate-800/30 border-b border-white/5 space-y-1">
        <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
          {IND_CATEGORIES.map(cat => (
            <div key={cat.category} className="flex items-center gap-1 flex-wrap">
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mr-0.5">{cat.category}</span>
              {cat.items.map(ind => (
                <button
                  key={ind.key}
                  onClick={() => toggleIndicator(ind.key)}
                  className={`px-1.5 py-0.5 text-[10px] rounded-full transition-colors border ${
                    indicators.has(ind.key)
                      ? 'bg-blue-600/30 border-blue-500/40 text-blue-300'
                      : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {ind.label}
                </button>
              ))}
              <div className="w-px h-3 bg-white/10 mx-0.5 hidden lg:block" />
            </div>
          ))}
        </div>
        {/* Active indicator legend */}
        {indicators.size > 0 && (
          <div className="flex items-center gap-3 text-[9px] flex-wrap">
            {indicators.has('sma20') && <span className="text-amber-400">● SMA 20</span>}
            {indicators.has('sma50') && <span className="text-purple-400">● SMA 50</span>}
            {indicators.has('sma100') && <span className="text-cyan-400">● SMA 100</span>}
            {indicators.has('sma200') && <span className="text-red-400">● SMA 200</span>}
            {indicators.has('ema9') && <span className="text-emerald-400">● EMA 9</span>}
            {indicators.has('ema20') && <span className="text-cyan-400">● EMA 20</span>}
            {indicators.has('ema50') && <span className="text-pink-400">● EMA 50</span>}
            {indicators.has('ema200') && <span className="text-orange-400">● EMA 200</span>}
            {indicators.has('ichimoku') && <span className="text-blue-400">● Ichimoku</span>}
            {indicators.has('bb') && <span className="text-purple-400/70">● BB(20,2)</span>}
            {indicators.has('keltner') && <span className="text-cyan-300">● Keltner</span>}
            {indicators.has('donchian') && <span className="text-amber-300">● Donchian</span>}
            {indicators.has('vwap') && <span className="text-pink-400">● VWAP</span>}
            {indicators.has('obv') && <span className="text-cyan-400">● OBV</span>}
            {indicators.has('rsi') && <span className="text-purple-400">● RSI</span>}
            {indicators.has('macd') && <span className="text-blue-400">● MACD</span>}
            {indicators.has('stochastic') && <span className="text-cyan-400">● Stoch</span>}
            {indicators.has('cci') && <span className="text-teal-400">● CCI</span>}
            {indicators.has('williamsR') && <span className="text-rose-400">● W%R</span>}
            {indicators.has('mom') && <span className="text-violet-400">● Mom</span>}
            {indicators.has('atr') && <span className="text-orange-400">● ATR</span>}
            {indicators.has('pivots') && <span className="text-gray-400">● Pivots</span>}
          </div>
        )}
      </div>

      {/* ===== CROSSHAIR TOOLTIP ===== */}
      {crosshairData && (
        <div className="flex items-center gap-4 px-3 py-1 text-[10px] bg-slate-800/20 border-b border-white/5">
          <span className="text-gray-500">{crosshairData.time}</span>
          <span className="text-gray-400">O <span className="text-white">{crosshairData.o.toFixed(2)}</span></span>
          <span className="text-gray-400">H <span className="text-emerald-400">{crosshairData.h.toFixed(2)}</span></span>
          <span className="text-gray-400">L <span className="text-red-400">{crosshairData.l.toFixed(2)}</span></span>
          <span className="text-gray-400">C <span className={crosshairData.c >= crosshairData.o ? 'text-emerald-400' : 'text-red-400'}>{crosshairData.c.toFixed(2)}</span></span>
        </div>
      )}

      {/* ===== CHART AREA ===== */}
      <div style={{ height, position: 'relative' }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/70">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
              Loading {symbol}…
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/70">
            <div className="text-center">
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <button onClick={fetchData} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Retry</button>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
        <div ref={tooltipRef} />
      </div>

      {/* ===== BOTTOM STATUS BAR ===== */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/30 border-t border-white/10 text-[10px] text-gray-500">
        <span>EconoPulse Charts • {symbol} • {currentRange.interval} interval</span>
        <span>{bars.length} bars{lastPrice ? ` • Last: $${lastPrice.price.toFixed(2)}` : ''}</span>
      </div>
    </div>
  )
}
