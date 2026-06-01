'use client'

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
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
  | 'volume' | 'vwap' | 'obv' | 'volprofile'
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
  activeTool?: DrawingTool
  onToolChange?: (t: DrawingTool) => void
  /** Custom node rendered at the far left of the toolbar (e.g. the symbol search bar). */
  leftSlot?: React.ReactNode
  /** Custom node rendered after the timeframe buttons (e.g. grouped actions menu). */
  rightSlot?: React.ReactNode
  /** Receives an imperative API to capture the chart as an image. */
  onChartApi?: (api: { screenshot: () => HTMLCanvasElement | null }) => void
}

export type DrawingTool =
  | 'cursor' | 'crosshair'
  | 'trendline' | 'horizontal' | 'vertical'
  | 'rect' | 'ellipse' | 'triangle'
  | 'fib-retr' | 'fib-ext'
  | 'text'

interface DrawPoint { logical: number; price: number }
interface Drawing {
  id: number
  tool: DrawingTool
  pts: DrawPoint[]
  color: string
  text?: string
}

const TOOL_STEPS: Record<DrawingTool, number> = {
  cursor: 0, crosshair: 0,
  trendline: 2, horizontal: 1, vertical: 1,
  rect: 2, ellipse: 2, triangle: 3,
  'fib-retr': 2, 'fib-ext': 2,
  text: 1,
}
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
const FIB_EXT_LEVELS = [0, 0.382, 0.618, 1, 1.272, 1.618, 2, 2.618]

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

// Drawing tools surfaced inside the chart toolbar dropdown
const CHART_TOOLS: { id: DrawingTool; label: string }[] = [
  { id: 'cursor', label: 'Cursor' },
  { id: 'crosshair', label: 'Crosshair' },
  { id: 'trendline', label: 'Trend Line' },
  { id: 'horizontal', label: 'Horizontal Line' },
  { id: 'vertical', label: 'Vertical Line' },
  { id: 'rect', label: 'Rectangle' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'fib-retr', label: 'Fib Retracement' },
  { id: 'fib-ext', label: 'Fib Extension' },
  { id: 'text', label: 'Text / Note' },
]

// Distinct colors for multi-symbol compare overlays
const COMPARE_COLORS = ['#f472b6', '#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb7185']

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
      { key: 'volprofile', label: 'Volume Profile' },
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

// Volume Profile: bin volume by price level, return POC (point of control) and the
// value area (price band containing ~70% of traded volume).
function computeVolumeProfile(bars: Bar[], bins = 24): {
  poc: number; vah: number; val: number;
  levels: { price: number; volume: number }[]; maxVolume: number;
} | null {
  if (bars.length < 5) return null
  let lo = Infinity, hi = -Infinity
  for (const b of bars) { if (b.low < lo) lo = b.low; if (b.high > hi) hi = b.high }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return null
  const step = (hi - lo) / bins
  const vol = new Array(bins).fill(0)
  for (const b of bars) {
    const tp = (b.high + b.low + b.close) / 3
    let idx = Math.floor((tp - lo) / step)
    if (idx < 0) idx = 0
    if (idx >= bins) idx = bins - 1
    vol[idx] += b.volume
  }
  const levels = vol.map((v, i) => ({ price: lo + (i + 0.5) * step, volume: v }))
  let pocIdx = 0
  for (let i = 1; i < bins; i++) if (vol[i] > vol[pocIdx]) pocIdx = i
  const totalVol = vol.reduce((s, v) => s + v, 0)
  // Expand from POC until 70% of volume is captured → value area.
  let lower = pocIdx, upper = pocIdx, acc = vol[pocIdx]
  const target = totalVol * 0.7
  while (acc < target && (lower > 0 || upper < bins - 1)) {
    const below = lower > 0 ? vol[lower - 1] : -1
    const above = upper < bins - 1 ? vol[upper + 1] : -1
    if (above >= below) { upper++; acc += vol[upper] }
    else { lower--; acc += vol[lower] }
  }
  return {
    poc: lo + (pocIdx + 0.5) * step,
    vah: lo + (upper + 1) * step,
    val: lo + lower * step,
    levels,
    maxVolume: vol[pocIdx] || 1,
  }
}

// ========== Component ==========
export default function AdvancedChart({ symbol: propSymbol = 'SPY', onSymbolChange, height = 520, className = '', activeTool: activeToolProp, onToolChange, leftSlot, rightSlot, onChartApi }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const mainSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null)
  const overlaySeriesRef = useRef<ISeriesApi<SeriesType>[]>([])
  const tooltipRef = useRef<HTMLDivElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

  // Expose an imperative screenshot API to the parent (reads chartRef at call time).
  const onChartApiRef = useRef(onChartApi)
  onChartApiRef.current = onChartApi
  useEffect(() => {
    onChartApiRef.current?.({
      screenshot: () => {
        try { return chartRef.current?.takeScreenshot() ?? null } catch { return null }
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [symbol, setSymbol] = useState(propSymbol)
  const [rangeKey, setRangeKey] = useLocalStorage<RangeKey>('mkt:rangeKey', '1Y')
  const [chartStyle, setChartStyle] = useLocalStorage<ChartStyle>('mkt:chartStyle', 'candle')
  const [indicatorList, setIndicatorList] = useLocalStorage<IndicatorKey[]>('mkt:indicators', ['volume'])
  const indicators = useMemo(() => new Set(indicatorList), [indicatorList])
  const setIndicators = useCallback((updater: Set<IndicatorKey> | ((prev: Set<IndicatorKey>) => Set<IndicatorKey>)) => {
    setIndicatorList((prev) => {
      const prevSet = new Set(prev)
      const nextSet = typeof updater === 'function' ? updater(prevSet) : updater
      return Array.from(nextSet)
    })
  }, [setIndicatorList])
  const [indicatorsOpen, setIndicatorsOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [compareSyms, setCompareSyms] = useLocalStorage<string[]>('mkt:compareSyms', [])
  const [compareInput, setCompareInput] = useState('')
  const [compareData, setCompareData] = useState<Record<string, Bar[]>>({})
  const [bars, setBars] = useState<Bar[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastPrice, setLastPrice] = useState<{ price: number; change: number; changePct: number } | null>(null)
  const [crosshairData, setCrosshairData] = useState<{ time: string; o: number; h: number; l: number; c: number; v: number } | null>(null)

  // Drawing state
  const [activeToolLocal, setActiveToolLocal] = useState<DrawingTool>('cursor')
  const activeTool = activeToolProp ?? activeToolLocal
  const setActiveTool = (t: DrawingTool) => {
    setActiveToolLocal(t)
    onToolChange?.(t)
    setPendingPts([])
  }
  const [drawings, setDrawings] = useLocalStorage<Drawing[]>('mkt:drawings', [])
  const [pendingPts, setPendingPts] = useState<DrawPoint[]>([])
  const [hoverPt, setHoverPt] = useState<DrawPoint | null>(null)

  // Refs for handlers (avoid stale closures)
  const activeToolRef = useRef(activeTool); useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
  const drawingsRef = useRef(drawings); useEffect(() => { drawingsRef.current = drawings }, [drawings])
  const pendingPtsRef = useRef(pendingPts); useEffect(() => { pendingPtsRef.current = pendingPts }, [pendingPts])
  const hoverPtRef = useRef(hoverPt); useEffect(() => { hoverPtRef.current = hoverPt }, [hoverPt])

  // Sync prop → state
  useEffect(() => { if (propSymbol !== symbol) { setSymbol(propSymbol) } }, [propSymbol])

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

  // Fetch compare symbols bars (normalized performance overlays)
  useEffect(() => {
    if (!compareSyms.length) { setCompareData({}); return }
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(
        compareSyms.map(async (sym): Promise<[string, Bar[]]> => {
          try {
            const qs = new URLSearchParams({ symbol: sym, range: currentRange.range, interval: currentRange.interval })
            const res = await fetch(`/api/yahoo-history?${qs}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) })
            if (!res.ok) throw new Error()
            const json = await res.json()
            const raw = json?.bars || json?.data?.bars || json?.data || []
            if (!Array.isArray(raw)) throw new Error()
            const parsed: Bar[] = raw
              .filter((b: any) => b && Number.isFinite(b.close) && b.close > 0)
              .map((b: any) => ({
                time: typeof b.time === 'number' ? (b.time > 1e12 ? Math.floor(b.time / 1000) : b.time) : Math.floor(new Date(b.time).getTime() / 1000),
                open: b.open || b.close, high: b.high || b.close, low: b.low || b.close, close: b.close, volume: b.volume || 0,
              }))
              .sort((a: Bar, b: Bar) => a.time - b.time)
            return [sym, parsed]
          } catch {
            return [sym, []]
          }
        })
      )
      if (!cancelled) {
        const next: Record<string, Bar[]> = {}
        for (const [sym, b] of entries) next[sym] = b
        setCompareData(next)
      }
    })()
    return () => { cancelled = true }
  }, [compareSyms, currentRange])

  // ========== Chart Creation / Update ==========
  // Tick used to safely re-trigger the effect once when the container width is 0
  // on first paint (flex layouts). Bumped at most once per mount cycle.
  const [layoutTick, setLayoutTick] = useState(0)
  useEffect(() => {
    if (!chartContainerRef.current || bars.length < 2) return
    if (chartContainerRef.current.clientWidth === 0) {
      const id = window.setTimeout(() => setLayoutTick(t => t + 1), 50)
      return () => window.clearTimeout(id)
    }
    let didCreate = false
    try {

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
      height: container.clientHeight || height,
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

    // Format time for chart.
    // lightweight-charts v5 accepts either UTCTimestamp (seconds, number) OR 'YYYY-MM-DD' string.
    // Intraday intervals MUST use a numeric timestamp, otherwise multiple bars per day
    // collapse to the same key and setData() throws "data must be asc ordered by time".
    const isIntraday = /m$|h$/.test(currentRange.interval)
    const formatTime = (t: number): Time => {
      if (isIntraday) return t as Time // t is already in seconds
      const d = new Date(t * 1000)
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}` as Time
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

    // ── Volume Profile (POC + Value Area as horizontal bands) ──
    if (indicators.has('volprofile')) {
      const vp = computeVolumeProfile(bars)
      if (vp) {
        const drawVPLine = (val: number, color: string, style: LineStyle, width = 1, title?: string) => {
          const ls = chart.addSeries(LineSeries, {
            color, lineWidth: width as 1 | 2 | 3 | 4, lineStyle: style,
            crosshairMarkerVisible: false, lastValueVisible: true, priceLineVisible: false,
            ...(title ? { title } : {}),
          })
          ls.setData(timeLabels.map(t => ({ time: t, value: val } as LineData)))
          overlaySeriesRef.current.push(ls)
        }
        drawVPLine(vp.poc, '#facc15', LineStyle.Solid, 2, 'POC')
        drawVPLine(vp.vah, 'rgba(250,204,21,0.5)', LineStyle.Dashed, 1, 'VAH')
        drawVPLine(vp.val, 'rgba(250,204,21,0.5)', LineStyle.Dashed, 1, 'VAL')
      }
    }

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

    // ── Sub-panel indicators (each rendered in its OWN pane below the price chart) ──
    // lightweight-charts v5 supports real panes via the third arg of addSeries.
    // Pane 0 = main price + volume overlay. Pane 1, 2, … = sub-indicators.
    let nextPaneIdx = 1
    const paneMap = new Map<string, number>()
    const getPane = (key: string) => {
      if (!paneMap.has(key)) paneMap.set(key, nextPaneIdx++)
      return paneMap.get(key)!
    }

    const addSubLine = (vals: (number | null)[], key: string, color: string, style: LineStyle = LineStyle.Solid, width = 1) => {
      const pane = getPane(key)
      const ls = chart.addSeries(LineSeries, {
        color, lineWidth: width as 1 | 2 | 3 | 4, lineStyle: style, crosshairMarkerVisible: false,
        lastValueVisible: true,
      }, pane)
      ls.setData(vals.map((v, i) => v !== null ? { time: timeLabels[i], value: v } as LineData : null).filter(Boolean) as LineData[])
      overlaySeriesRef.current.push(ls)
      return ls
    }

    const addSubHistogram = (vals: (number | null)[], key: string) => {
      const pane = getPane(key)
      const hs = chart.addSeries(HistogramSeries, {}, pane)
      hs.setData(vals.map((v, i) => v !== null ? ({
        time: timeLabels[i], value: v,
        color: v >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)',
      } as HistogramData) : null).filter(Boolean) as HistogramData[])
      overlaySeriesRef.current.push(hs)
    }

    // No-op kept for backwards compatibility with the previous signature; panes handle layout now.
    const setupSubScale = (_key: string) => { /* handled by pane assignment */ }

    // RSI
    if (indicators.has('rsi')) {
      const rsiVals = computeRSI(closes)
      const sid = 'rsi-panel'
      addSubLine(rsiVals, sid, '#8b5cf6')
      // 30/70 reference lines (same pane as RSI line)
      const rsiPane = getPane(sid)
      const line30 = timeLabels.map(t => ({ time: t, value: 30 } as LineData))
      const line70 = timeLabels.map(t => ({ time: t, value: 70 } as LineData))
      const ls30 = chart.addSeries(LineSeries, { color: 'rgba(34,197,94,0.3)', lineWidth: 1, lineStyle: LineStyle.Dotted, crosshairMarkerVisible: false, lastValueVisible: false }, rsiPane)
      ls30.setData(line30); overlaySeriesRef.current.push(ls30)
      const ls70 = chart.addSeries(LineSeries, { color: 'rgba(239,68,68,0.3)', lineWidth: 1, lineStyle: LineStyle.Dotted, crosshairMarkerVisible: false, lastValueVisible: false }, rsiPane)
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

    // ===== COMPARE OVERLAY (normalized % performance lines on their own scale) =====
    const activeCompare = compareSyms.filter((s) => (compareData[s]?.length || 0) > 1)
    if (activeCompare.length > 0) {
      try {
        let scaleUsed = false
        activeCompare.forEach((sym, idx) => {
          const cbars = compareData[sym]
          if (!cbars || cbars.length < 2) return
          const base = cbars[0].close
          if (!base || base <= 0) return
          const line: LineData[] = cbars.map((b) => ({
            time: formatTime(b.time) as Time,
            value: (b.close / base - 1) * 100,
          }))
          if (line.length < 2) return
          const color = COMPARE_COLORS[idx % COMPARE_COLORS.length]
          const cmpSeries = chart.addSeries(LineSeries, {
            color, lineWidth: 2, priceScaleId: 'compare',
            crosshairMarkerVisible: false, lastValueVisible: true,
            title: sym,
          })
          cmpSeries.setData(line)
          overlaySeriesRef.current.push(cmpSeries)
          scaleUsed = true
        })
        if (scaleUsed) {
          chart.priceScale('compare').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.3 }, visible: true })
        }
      } catch { /* ignore */ }
    }

    // Fit content
    chart.timeScale().fitContent()

    // Crosshair move → tooltip + drawing preview
    chart.subscribeCrosshairMove((param) => {
      // Drawing preview point (only when a drawing tool is active)
      const tool = activeToolRef.current
      const main = mainSeriesRef.current
      if (tool !== 'cursor' && tool !== 'crosshair' && param.point && main) {
        const logical = chart.timeScale().coordinateToLogical(param.point.x)
        const price = main.coordinateToPrice(param.point.y)
        if (logical != null && price != null) setHoverPt({ logical, price })
      } else if (hoverPtRef.current) {
        setHoverPt(null)
      }
      if (!param.time || !param.seriesData) {
        setCrosshairData(null)
        return
      }
      if (!main) return
      const data = param.seriesData.get(main) as any
      if (!data) { setCrosshairData(null); return }
      let timeStr = ''
      if (typeof param.time === 'string') timeStr = param.time
      else if (typeof param.time === 'number') {
        const d = new Date(param.time * 1000)
        timeStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
      }
      if ('open' in data) {
        setCrosshairData({ time: timeStr, o: data.open, h: data.high, l: data.low, c: data.close, v: 0 })
      } else if ('value' in data) {
        setCrosshairData({ time: timeStr, o: data.value, h: data.value, l: data.value, c: data.value, v: 0 })
      }
    })

    // ===== Drawing: click handler =====
    chart.subscribeClick((param) => {
      const tool = activeToolRef.current
      if (tool === 'cursor' || tool === 'crosshair') return
      if (!param.point || !mainSeriesRef.current) return
      const logical = chart.timeScale().coordinateToLogical(param.point.x)
      const price = mainSeriesRef.current.coordinateToPrice(param.point.y)
      if (logical == null || price == null) return
      const pt: DrawPoint = { logical, price }

      if (tool === 'text') {
        const txt = window.prompt('Note text:')
        if (txt && txt.trim()) {
          setDrawings(d => [...d, { id: Date.now(), tool, pts: [pt], color: '#fbbf24', text: txt.trim() }])
        }
        return
      }

      const need = TOOL_STEPS[tool] || 2
      const next = [...pendingPtsRef.current, pt]
      if (next.length >= need) {
        setDrawings(d => [...d, { id: Date.now(), tool, pts: next, color: '#3b82f6' }])
        setPendingPts([])
      } else {
        setPendingPts(next)
      }
    })

    // Redraw overlay on visible range changes
    const redrawOnRange = () => requestAnimationFrame(redrawOverlay)
    chart.timeScale().subscribeVisibleLogicalRangeChange(redrawOnRange)

    // Resize observer (debounced via RAF to avoid layout-thrash flicker)
    let roRaf = 0
    const ro = new ResizeObserver(() => {
      if (roRaf) return
      roRaf = requestAnimationFrame(() => {
        roRaf = 0
        if (chartContainerRef.current && chartRef.current) {
          const w = chartContainerRef.current.clientWidth
          const h2 = chartContainerRef.current.clientHeight
          if (w > 0) {
            chartRef.current.applyOptions({ width: w, ...(h2 > 0 ? { height: h2 } : {}) })
            redrawOverlay()
          }
        }
      })
    })
    ro.observe(container)

    // Initial overlay redraw
    requestAnimationFrame(redrawOverlay)
    didCreate = true

    return () => {
      if (roRaf) cancelAnimationFrame(roRaf)
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
    } catch (err: any) {
      console.error('[AdvancedChart] creation failed:', err)
      setError(`Chart render error: ${err?.message || 'unknown'}`)
      if (!didCreate && chartRef.current) {
        try { chartRef.current.remove() } catch {}
        chartRef.current = null
      }
    }
  }, [bars, chartStyle, indicators, height, currentRange.interval, layoutTick, compareSyms, compareData, symbol])

  // ========== Handlers ==========
  const toggleIndicator = useCallback((key: IndicatorKey) => {
    setIndicators(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }, [])

  // (Symbol changes are now driven exclusively by the parent page search bar.)

  // ========== Drawing overlay renderer ==========
  const redrawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    const chart = chartRef.current
    const main = mainSeriesRef.current
    const container = chartContainerRef.current
    if (!canvas || !chart || !main || !container) return
    const W = container.clientWidth
    const H = container.clientHeight
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr; canvas.height = H * dpr
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
    }
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    const toXY = (p: DrawPoint): { x: number; y: number } | null => {
      const x = chart.timeScale().logicalToCoordinate(p.logical as any)
      const y = main.priceToCoordinate(p.price)
      if (x == null || y == null) return null
      return { x, y }
    }

    const drawShape = (d: Drawing | { tool: DrawingTool; pts: DrawPoint[]; color: string; text?: string }, isPreview = false) => {
      const pts = d.pts.map(toXY).filter(Boolean) as { x: number; y: number }[]
      if (pts.length === 0) return
      ctx.save()
      ctx.strokeStyle = d.color
      ctx.fillStyle = d.color
      ctx.lineWidth = isPreview ? 1 : 1.5
      if (isPreview) ctx.setLineDash([5, 4])
      const [a, b, c] = pts

      switch (d.tool) {
        case 'trendline':
          if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke() }
          break
        case 'horizontal':
          if (a) { ctx.beginPath(); ctx.moveTo(0, a.y); ctx.lineTo(W, a.y); ctx.stroke() }
          break
        case 'vertical':
          if (a) { ctx.beginPath(); ctx.moveTo(a.x, 0); ctx.lineTo(a.x, H); ctx.stroke() }
          break
        case 'rect':
          if (a && b) {
            const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y)
            const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y)
            ctx.globalAlpha = 0.15; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1
            ctx.strokeRect(x, y, w, h)
          }
          break
        case 'ellipse':
          if (a && b) {
            const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
            const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2
            ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
            ctx.globalAlpha = 0.15; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke()
          }
          break
        case 'triangle':
          if (a && b && c) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath()
            ctx.globalAlpha = 0.15; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke()
          }
          break
        case 'fib-retr':
        case 'fib-ext': {
          if (!(a && b)) break
          const levels = d.tool === 'fib-retr' ? FIB_LEVELS : FIB_EXT_LEVELS
          const colors = ['#94a3b8', '#22c55e', '#10b981', '#eab308', '#f97316', '#ef4444', '#a855f7', '#ec4899']
          const y0 = a.y, y1 = b.y
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
          ctx.setLineDash([])
          levels.forEach((lv, i) => {
            const y = y0 + (y1 - y0) * lv
            ctx.strokeStyle = colors[i % colors.length]
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
            ctx.fillStyle = colors[i % colors.length]
            ctx.font = '10px ui-sans-serif, system-ui'
            ctx.fillText(`${(lv * 100).toFixed(1)}%`, 4, y - 2)
          })
          break
        }
        case 'text':
          if (a && d.text) {
            ctx.font = '12px ui-sans-serif, system-ui'
            const w = ctx.measureText(d.text).width + 8
            ctx.globalAlpha = 0.85; ctx.fillStyle = '#1e293b'; ctx.fillRect(a.x, a.y - 14, w, 18); ctx.globalAlpha = 1
            ctx.fillStyle = d.color; ctx.fillText(d.text, a.x + 4, a.y)
            ctx.beginPath(); ctx.arc(a.x, a.y, 3, 0, Math.PI * 2); ctx.fill()
          }
          break
      }
      ctx.restore()
    }

    drawingsRef.current.forEach(d => drawShape(d))

    // Preview pending drawing with current hover
    const tool = activeToolRef.current
    const pend = pendingPtsRef.current
    if (tool && tool !== 'cursor' && tool !== 'crosshair' && pend.length > 0 && hoverPtRef.current) {
      drawShape({ tool, pts: [...pend, hoverPtRef.current], color: '#60a5fa' }, true)
      // Mark placed points
      pend.forEach(p => {
        const xy = toXY(p); if (!xy) return
        ctx.save(); ctx.fillStyle = '#60a5fa'
        ctx.beginPath(); ctx.arc(xy.x, xy.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      })
    }
  }, [])

  // Trigger redraw on drawings/pending/hover/tool changes
  useEffect(() => { requestAnimationFrame(redrawOverlay) }, [drawings, pendingPts, hoverPt, activeTool, redrawOverlay, bars])

  const clearDrawings = useCallback(() => { setDrawings([]); setPendingPts([]) }, [])
  const undoDrawing = useCallback(() => { setDrawings(d => d.slice(0, -1)) }, [])

  const pctColor = lastPrice ? (lastPrice.changePct >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-400'

  return (
    <div className={`flex flex-col h-full bg-slate-900/60 border border-white/10 rounded-lg overflow-hidden ${className}`}>
      {/* ===== TOP BAR ===== */}
      <div className="flex flex-wrap items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-800/50 border-b border-white/10">
        {/* Custom left slot (symbol search bar injected by the page) */}
        {leftSlot}

        {/* Active symbol pill (read-only — search is in page header) */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white font-bold tracking-wide">{symbol}</span>
          {lastPrice && (
            <>
              <span className="text-white font-bold">${lastPrice.price.toFixed(2)}</span>
              <span className={pctColor}>
                {lastPrice.change >= 0 ? '+' : ''}{lastPrice.change.toFixed(2)} ({lastPrice.changePct >= 0 ? '+' : ''}{lastPrice.changePct.toFixed(2)}%)
              </span>
            </>
          )}
        </div>

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
        <div className="flex items-center gap-0.5 flex-wrap">
          {RANGE_OPTS.map(r => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${rangeKey === r.key ? 'bg-blue-600/80 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              title={r.key === 'MAX' ? 'Max history available from Yahoo' : r.label}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Custom right slot (grouped actions menu injected by the page) */}
        {rightSlot && (
          <>
            <div className="h-5 w-px bg-white/15 mx-1" />
            {rightSlot}
          </>
        )}

        {/* Separator */}
        <div className="h-5 w-px bg-white/15 mx-1" />

        {/* Tools dropdown */}
        <div className="relative">
          <button
            onClick={() => { setToolsOpen(o => !o); setIndicatorsOpen(false) }}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded border transition-colors ${
              activeTool !== 'cursor' && activeTool !== 'crosshair'
                ? 'bg-amber-600/20 border-amber-500/40 text-amber-200'
                : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:border-white/20'
            }`}
          >
            <span className="font-semibold uppercase tracking-wider text-[10px]">Tools</span>
            <span className="text-[10px] opacity-70">{CHART_TOOLS.find(t => t.id === activeTool)?.label}</span>
            <svg className={`w-3 h-3 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
          </button>
          {toolsOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setToolsOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-30 min-w-[180px] p-1.5 rounded-md border border-white/15 bg-slate-900/95 backdrop-blur shadow-xl">
                {CHART_TOOLS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setActiveTool(t.id); setToolsOpen(false) }}
                    className={`w-full text-left px-2 py-1 text-[11px] rounded transition-colors ${
                      activeTool === t.id ? 'bg-amber-600/30 text-amber-200' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
                {drawings.length > 0 && (
                  <div className="border-t border-white/10 mt-1 pt-1 flex gap-1">
                    <button onClick={() => { undoDrawing(); setToolsOpen(false) }} className="flex-1 px-2 py-1 text-[10px] rounded bg-white/5 hover:bg-white/10 text-gray-300">↶ Undo</button>
                    <button onClick={() => { clearDrawings(); setToolsOpen(false) }} className="flex-1 px-2 py-1 text-[10px] rounded bg-white/5 hover:bg-rose-500/20 text-rose-300">Clear</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Compare input (multi-symbol) */}
        <div className="hidden sm:flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">vs</span>
          <input
            value={compareInput}
            onChange={(e) => setCompareInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = compareInput.trim().toUpperCase()
                if (v && !compareSyms.includes(v) && v !== symbol.toUpperCase() && compareSyms.length < COMPARE_COLORS.length) {
                  setCompareSyms([...compareSyms, v])
                }
                setCompareInput('')
              }
              if (e.key === 'Escape') setCompareInput('')
            }}
            placeholder="Compare (SPY, QQQ…)"
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white w-28 focus:outline-none focus:border-pink-500 placeholder-gray-500"
          />
          {compareSyms.map((s, idx) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border"
              style={{ color: COMPARE_COLORS[idx % COMPARE_COLORS.length], borderColor: `${COMPARE_COLORS[idx % COMPARE_COLORS.length]}66` }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: COMPARE_COLORS[idx % COMPARE_COLORS.length] }} />
              {s}
              <button
                onClick={() => setCompareSyms(compareSyms.filter((x) => x !== s))}
                className="text-gray-400 hover:text-rose-300"
                title={`Remove ${s}`}
              >
                ✕
              </button>
            </span>
          ))}
          {compareSyms.length > 1 && (
            <button
              onClick={() => setCompareSyms([])}
              className="text-[10px] text-gray-500 hover:text-rose-300"
              title="Clear all"
            >
              clear
            </button>
          )}
        </div>
      </div>

      {/* ===== INDICATORS BAR (single dropdown) ===== */}
      <div className="px-2 sm:px-3 py-1.5 bg-slate-800/30 border-b border-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              onClick={() => { setIndicatorsOpen(o => !o); setToolsOpen(false) }}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded border transition-colors ${
                indicators.size > 0
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-200'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:border-white/20'
              }`}
            >
              <span className="font-semibold uppercase tracking-wider text-[10px]">Indicators</span>
              {indicators.size > 0 && (
                <span className="px-1 rounded bg-blue-500/30 text-blue-100 text-[9px]">{indicators.size}</span>
              )}
              <svg className={`w-3 h-3 transition-transform ${indicatorsOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
            </button>
            {indicatorsOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIndicatorsOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-30 w-[520px] max-w-[90vw] p-2 rounded-md border border-white/15 bg-slate-900/95 backdrop-blur shadow-xl max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {IND_CATEGORIES.map(cat => {
                      const activeCount = cat.items.filter(i => indicators.has(i.key)).length
                      return (
                        <div key={cat.category} className="bg-white/5 rounded p-1.5">
                          <div className="flex items-center justify-between mb-1 px-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{cat.category}</span>
                            {activeCount > 0 && <span className="px-1 rounded bg-blue-500/30 text-blue-100 text-[9px]">{activeCount}</span>}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {cat.items.map(ind => (
                              <button
                                key={ind.key}
                                onClick={() => toggleIndicator(ind.key)}
                                className={`flex items-center justify-between px-2 py-1 text-[11px] rounded transition-colors ${
                                  indicators.has(ind.key)
                                    ? 'bg-blue-600/30 text-blue-200'
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <span>{ind.label}</span>
                                {indicators.has(ind.key) && <span className="text-blue-400">✓</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          {indicators.size > 0 && (
            <button
              onClick={() => setIndicators(new Set())}
              className="ml-auto px-2 py-1 text-[10px] rounded border border-white/10 text-gray-400 hover:text-red-300 hover:border-red-400/40"
            >
              Clear indicators
            </button>
          )}
        </div>
        {/* Active indicator legend */}
        {indicators.size > 0 && (
          <div className="hidden sm:flex items-center gap-3 text-[9px] flex-wrap">
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

      {/* ===== CROSSHAIR TOOLTIP (always rendered, fixed height to prevent layout shift) ===== */}
      <div
        className="flex items-center gap-4 px-3 text-[10px] bg-slate-800/20 border-b border-white/5 tabular-nums"
        style={{ height: 22, visibility: crosshairData ? 'visible' : 'hidden' }}
      >
        {crosshairData && (
          <>
            <span className="text-gray-500">{crosshairData.time}</span>
            <span className="text-gray-400">O <span className="text-white">{crosshairData.o.toFixed(2)}</span></span>
            <span className="text-gray-400">H <span className="text-emerald-400">{crosshairData.h.toFixed(2)}</span></span>
            <span className="text-gray-400">L <span className="text-red-400">{crosshairData.l.toFixed(2)}</span></span>
            <span className="text-gray-400">C <span className={crosshairData.c >= crosshairData.o ? 'text-emerald-400' : 'text-red-400'}>{crosshairData.c.toFixed(2)}</span></span>
          </>
        )}
      </div>

      {/* ===== CHART AREA ===== */}
      <div style={{ position: 'relative' }} className="flex-1 min-h-0 [&_a[href*='tradingview']]:!hidden">
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
        <div ref={chartContainerRef} className="[&>a]:!hidden [&_a[target='_blank']]:!hidden" style={{ width: '100%', height: '100%' }} />
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0"
          style={{ pointerEvents: 'none', zIndex: 5 }}
        />
        <div ref={tooltipRef} />
        {activeTool !== 'cursor' && activeTool !== 'crosshair' && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-2 px-2 py-1 rounded bg-slate-900/90 border border-blue-500/40 text-[10px] text-blue-200">
            <span className="font-semibold uppercase tracking-wider">{activeTool}</span>
            <span className="text-gray-400">click {TOOL_STEPS[activeTool] - pendingPts.length} more</span>
            <button onClick={() => { setPendingPts([]); setActiveTool('cursor') }} className="text-gray-400 hover:text-white">✕</button>
          </div>
        )}
        {drawings.length > 0 && (
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <button onClick={undoDrawing} className="px-2 py-1 text-[10px] rounded bg-slate-900/90 border border-white/15 text-gray-300 hover:text-white" title="Undo last drawing">↶ Undo</button>
            <button onClick={clearDrawings} className="px-2 py-1 text-[10px] rounded bg-slate-900/90 border border-red-400/40 text-red-300 hover:text-red-200" title="Clear all drawings">Clear</button>
          </div>
        )}
      </div>

      {/* ===== BOTTOM STATUS BAR ===== */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/30 border-t border-white/10 text-[10px] text-gray-500">
        <span>{symbol} · {currentRange.interval}</span>
        <span className="flex items-center gap-1.5 select-none">
          <img src="/logo-econopulse-wave.svg" alt="" width={14} height={14} className="shrink-0" />
          <span className="font-extrabold tracking-wide bg-gradient-to-r from-cyan-300 via-sky-500 to-blue-600 bg-clip-text text-transparent">ECONOPULSE.AI</span>
        </span>
      </div>
    </div>
  )
}
