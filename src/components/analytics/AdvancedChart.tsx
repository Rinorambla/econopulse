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
  PriceScaleMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type Time,
  type SeriesType,
  type IPriceLine,
} from 'lightweight-charts'

// ========== Types ==========
type ChartStyle = 'candle' | 'line' | 'area'
type RangeKey = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'MAX'
type IndicatorKey =
  // Trend
  | 'sma20' | 'sma50' | 'sma100' | 'sma200'
  | 'ema9' | 'ema20' | 'ema50' | 'ema200'
  | 'wma20' | 'wma50' | 'hma' | 'dema' | 'tema' | 'vwma'
  | 'psar' | 'supertrend'
  | 'ichimoku'
  // Volatility
  | 'bb' | 'keltner' | 'atr' | 'donchian' | 'envelopes' | 'stddev'
  // Volume
  | 'volume' | 'vwap' | 'obv' | 'volprofile' | 'vpvr' | 'vpfr'
  | 'mfi' | 'cmf' | 'adl' | 'chaikinosc' | 'forceindex'
  // Momentum
  | 'rsi' | 'macd' | 'stochastic' | 'cci' | 'williamsR' | 'mom'
  | 'adx' | 'stochrsi' | 'roc' | 'trix' | 'uo' | 'ao' | 'ppo' | 'aroon' | 'vortex'
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
  | 'text' | 'alert'

interface DrawPoint { logical: number; price: number }
interface Drawing {
  id: number
  tool: DrawingTool
  pts: DrawPoint[]
  color: string
  text?: string
  width?: number
}

// Shortest distance from point (px,py) to the segment (x1,y1)-(x2,y2). Used for
// click hit-testing so the user can select a drawing by clicking near its line.
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

// Editable colors offered in the drawing context menu (TradingView-style).
const DRAW_COLORS = ['#3b82f6', '#60a5fa', '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#ffffff']
const DRAW_WIDTHS = [1, 2, 3]


const TOOL_STEPS: Record<DrawingTool, number> = {
  cursor: 0, crosshair: 0,
  trendline: 2, horizontal: 1, vertical: 1,
  rect: 2, ellipse: 2, triangle: 3,
  'fib-retr': 2, 'fib-ext': 2,
  text: 1, alert: 1,
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

// To draw long moving averages (e.g. SMA/EMA 200) across the WHOLE visible window
// instead of only the right half, we fetch extra "warm-up" history before the
// requested window, compute indicators over the full set, then zoom the view back
// to the requested window. Maps a range key → the larger range to actually fetch.
// (Intraday 1D/5D and full-history MAX need no warm-up.)
const WARMUP_FETCH: Partial<Record<RangeKey, string>> = {
  '1M': '1y',
  '3M': '2y',
  '6M': '2y',
  'YTD': '2y',
  '1Y': '2y',
  '5Y': '10y',
}

// Approx seconds covered by the requested window, used to zoom back after warm-up.
const WINDOW_SECONDS: Partial<Record<RangeKey, number>> = {
  '1M': 31 * 86400,
  '3M': 93 * 86400,
  '6M': 186 * 86400,
  '1Y': 372 * 86400,
  '5Y': 5 * 372 * 86400,
}


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
  { id: 'alert', label: '⏰ Price Alert' },
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
      { key: 'wma20', label: 'WMA 20' },
      { key: 'wma50', label: 'WMA 50' },
      { key: 'hma', label: 'Hull MA (16)' },
      { key: 'dema', label: 'DEMA 20' },
      { key: 'tema', label: 'TEMA 20' },
      { key: 'vwma', label: 'VWMA 20' },
      { key: 'psar', label: 'Parabolic SAR' },
      { key: 'supertrend', label: 'SuperTrend' },
      { key: 'ichimoku', label: 'Ichimoku' },
    ],
  },
  {
    category: 'Volatility',
    items: [
      { key: 'bb', label: 'Bollinger' },
      { key: 'keltner', label: 'Keltner Ch.' },
      { key: 'donchian', label: 'Donchian' },
      { key: 'envelopes', label: 'MA Envelopes' },
      { key: 'atr', label: 'ATR (14)' },
      { key: 'stddev', label: 'Std Dev (20)' },
    ],
  },
  {
    category: 'Volume',
    items: [
      { key: 'volume', label: 'Volume' },
      { key: 'vwap', label: 'VWAP' },
      { key: 'obv', label: 'OBV' },
      { key: 'volprofile', label: 'Volume Profile' },
      { key: 'vpvr', label: 'Vol Profile · Visible Range' },
      { key: 'vpfr', label: 'Vol Profile · Fixed Range' },
      { key: 'mfi', label: 'Money Flow (MFI)' },
      { key: 'cmf', label: 'Chaikin MF' },
      { key: 'adl', label: 'Accum/Dist' },
      { key: 'chaikinosc', label: 'Chaikin Osc.' },
      { key: 'forceindex', label: 'Force Index' },
    ],
  },
  {
    category: 'Momentum',
    items: [
      { key: 'rsi', label: 'RSI (14)' },
      { key: 'macd', label: 'MACD' },
      { key: 'stochastic', label: 'Stochastic' },
      { key: 'stochrsi', label: 'Stoch RSI' },
      { key: 'cci', label: 'CCI (20)' },
      { key: 'williamsR', label: 'Williams %R' },
      { key: 'mom', label: 'Momentum' },
      { key: 'roc', label: 'ROC (12)' },
      { key: 'adx', label: 'ADX / DMI' },
      { key: 'aroon', label: 'Aroon (25)' },
      { key: 'ao', label: 'Awesome Osc.' },
      { key: 'ppo', label: 'PPO' },
      { key: 'trix', label: 'TRIX' },
      { key: 'uo', label: 'Ultimate Osc.' },
      { key: 'vortex', label: 'Vortex' },
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

// ===== Extended TA helpers (extra moving averages, trend, momentum, volume) =====
function computeWMA(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = []
  const denom = (period * (period + 1)) / 2
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { out.push(null); continue }
    let sum = 0
    for (let j = 0; j < period; j++) sum += closes[i - period + 1 + j] * (j + 1)
    out.push(sum / denom)
  }
  return out
}

// EMA over a sparse series that may contain nulls (skips leading nulls).
function emaOfNullable(vals: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = []
  const k = 2 / (period + 1)
  let prev: number | null = null
  let seeded = false
  const buf: number[] = []
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i]
    if (v === null) { out.push(null); continue }
    if (!seeded) {
      buf.push(v)
      if (buf.length < period) { out.push(null); continue }
      prev = buf.reduce((s, x) => s + x, 0) / period
      seeded = true
      out.push(prev)
    } else {
      prev = v * k + (prev as number) * (1 - k)
      out.push(prev)
    }
  }
  return out
}

function computeHMA(closes: number[], period = 16): (number | null)[] {
  const half = Math.max(1, Math.round(period / 2))
  const sqrtP = Math.max(1, Math.round(Math.sqrt(period)))
  const wmaHalf = computeWMA(closes, half)
  const wmaFull = computeWMA(closes, period)
  const diff = closes.map((_, i) =>
    wmaHalf[i] !== null && wmaFull[i] !== null ? 2 * (wmaHalf[i] as number) - (wmaFull[i] as number) : null
  )
  // WMA of a nullable series → compute only over the valid tail.
  const out: (number | null)[] = new Array(closes.length).fill(null)
  const validStart = diff.findIndex(v => v !== null)
  if (validStart === -1) return out
  const tail = diff.slice(validStart).map(v => v as number)
  const wmaTail = computeWMA(tail, sqrtP)
  for (let i = 0; i < wmaTail.length; i++) out[validStart + i] = wmaTail[i]
  return out
}

function computeDEMA(closes: number[], period = 20): (number | null)[] {
  const ema = computeEMA(closes, period)
  const emaOfEma = emaOfNullable(ema, period)
  return closes.map((_, i) =>
    ema[i] !== null && emaOfEma[i] !== null ? 2 * (ema[i] as number) - (emaOfEma[i] as number) : null
  )
}

function computeTEMA(closes: number[], period = 20): (number | null)[] {
  const e1 = computeEMA(closes, period)
  const e2 = emaOfNullable(e1, period)
  const e3 = emaOfNullable(e2, period)
  return closes.map((_, i) =>
    e1[i] !== null && e2[i] !== null && e3[i] !== null
      ? 3 * (e1[i] as number) - 3 * (e2[i] as number) + (e3[i] as number)
      : null
  )
}

function computeVWMA(bars: Bar[], period = 20): (number | null)[] {
  const out: (number | null)[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { out.push(null); continue }
    let pv = 0, vv = 0
    for (let j = i - period + 1; j <= i; j++) { pv += bars[j].close * bars[j].volume; vv += bars[j].volume }
    out.push(vv > 0 ? pv / vv : null)
  }
  return out
}

// Parabolic SAR (Wilder). Returns the stop-and-reverse dots per bar.
function computePSAR(bars: Bar[], step = 0.02, maxStep = 0.2): (number | null)[] {
  if (bars.length < 2) return bars.map(() => null)
  const out: (number | null)[] = [null]
  let uptrend = bars[1].close >= bars[0].close
  let af = step
  let ep = uptrend ? bars[0].high : bars[0].low
  let sar = uptrend ? bars[0].low : bars[0].high
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i]
    sar = sar + af * (ep - sar)
    if (uptrend) {
      sar = Math.min(sar, bars[i - 1].low, i >= 2 ? bars[i - 2].low : bars[i - 1].low)
      if (b.high > ep) { ep = b.high; af = Math.min(af + step, maxStep) }
      if (b.low < sar) { uptrend = false; sar = ep; ep = b.low; af = step }
    } else {
      sar = Math.max(sar, bars[i - 1].high, i >= 2 ? bars[i - 2].high : bars[i - 1].high)
      if (b.low < ep) { ep = b.low; af = Math.min(af + step, maxStep) }
      if (b.high > sar) { uptrend = true; sar = ep; ep = b.high; af = step }
    }
    out.push(sar)
  }
  return out
}

// SuperTrend (ATR-based). Returns the trailing line plus its trend direction.
function computeSuperTrend(bars: Bar[], period = 10, mult = 3): { line: (number | null)[]; up: boolean[] } {
  const atr = computeATR(bars, period)
  const line: (number | null)[] = []
  const up: boolean[] = []
  let prevUpper = NaN, prevLower = NaN, prevSt = NaN, trendUp = true
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]
    const a = atr[i]
    if (a === null) { line.push(null); up.push(true); prevSt = NaN; continue }
    const mid = (b.high + b.low) / 2
    let upper = mid + mult * a
    let lower = mid - mult * a
    if (!Number.isNaN(prevUpper)) upper = upper < prevUpper || bars[i - 1].close > prevUpper ? upper : prevUpper
    if (!Number.isNaN(prevLower)) lower = lower > prevLower || bars[i - 1].close < prevLower ? lower : prevLower
    if (Number.isNaN(prevSt)) {
      trendUp = b.close >= mid
    } else if (prevSt === prevUpper) {
      trendUp = b.close > upper ? true : false
    } else {
      trendUp = b.close < lower ? false : true
    }
    const st = trendUp ? lower : upper
    line.push(st)
    up.push(trendUp)
    prevUpper = upper; prevLower = lower; prevSt = st
  }
  return { line, up }
}

// Moving-average envelopes (% bands around an SMA).
function computeEnvelopes(closes: number[], period = 20, pct = 2.5): { basis: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const basis = computeSMA(closes, period)
  const upper = basis.map(v => v === null ? null : v * (1 + pct / 100))
  const lower = basis.map(v => v === null ? null : v * (1 - pct / 100))
  return { basis, upper, lower }
}

// Rolling standard deviation (sub-panel).
function computeStdDev(closes: number[], period = 20): (number | null)[] {
  const out: (number | null)[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { out.push(null); continue }
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = slice.reduce((s, v) => s + v, 0) / period
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period
    out.push(Math.sqrt(variance))
  }
  return out
}

// ADX with directional indicators (+DI / -DI).
function computeADX(bars: Bar[], period = 14): { adx: (number | null)[]; plusDI: (number | null)[]; minusDI: (number | null)[] } {
  const n = bars.length
  const tr: number[] = new Array(n).fill(0)
  const plusDM: number[] = new Array(n).fill(0)
  const minusDM: number[] = new Array(n).fill(0)
  for (let i = 1; i < n; i++) {
    const up = bars[i].high - bars[i - 1].high
    const down = bars[i - 1].low - bars[i].low
    plusDM[i] = up > down && up > 0 ? up : 0
    minusDM[i] = down > up && down > 0 ? down : 0
    const pc = bars[i - 1].close
    tr[i] = Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - pc), Math.abs(bars[i].low - pc))
  }
  const wilder = (arr: number[]) => {
    const sm: (number | null)[] = new Array(n).fill(null)
    if (n <= period) return sm
    let seed = 0
    for (let i = 1; i <= period; i++) seed += arr[i]
    sm[period] = seed
    for (let i = period + 1; i < n; i++) {
      sm[i] = (sm[i - 1] as number) - (sm[i - 1] as number) / period + arr[i]
    }
    return sm
  }
  const trS = wilder(tr)
  const plusS = wilder(plusDM)
  const minusS = wilder(minusDM)
  const plusDI: (number | null)[] = new Array(n).fill(null)
  const minusDI: (number | null)[] = new Array(n).fill(null)
  const dx: (number | null)[] = new Array(n).fill(null)
  for (let i = 0; i < n; i++) {
    if (trS[i] === null || (trS[i] as number) === 0) continue
    const pdi = 100 * (plusS[i] as number) / (trS[i] as number)
    const mdi = 100 * (minusS[i] as number) / (trS[i] as number)
    plusDI[i] = pdi; minusDI[i] = mdi
    const sum = pdi + mdi
    dx[i] = sum === 0 ? 0 : 100 * Math.abs(pdi - mdi) / sum
  }
  const adx: (number | null)[] = new Array(n).fill(null)
  let started = false, prevAdx = 0, count = 0, acc = 0
  for (let i = 0; i < n; i++) {
    if (dx[i] === null) continue
    if (!started) {
      acc += dx[i] as number; count++
      if (count === period) { prevAdx = acc / period; adx[i] = prevAdx; started = true }
    } else {
      prevAdx = (prevAdx * (period - 1) + (dx[i] as number)) / period
      adx[i] = prevAdx
    }
  }
  return { adx, plusDI, minusDI }
}

// Stochastic RSI (0-100).
function computeStochRSI(closes: number[], rsiPeriod = 14, stochPeriod = 14, kSmooth = 3, dSmooth = 3): { k: (number | null)[]; d: (number | null)[] } {
  const rsi = computeRSI(closes, rsiPeriod)
  const raw: (number | null)[] = []
  for (let i = 0; i < rsi.length; i++) {
    if (i < stochPeriod - 1 || rsi[i] === null) { raw.push(null); continue }
    let hi = -Infinity, lo = Infinity, valid = true
    for (let j = i - stochPeriod + 1; j <= i; j++) {
      const r = rsi[j]
      if (r === null) { valid = false; break }
      hi = Math.max(hi, r); lo = Math.min(lo, r)
    }
    if (!valid) { raw.push(null); continue }
    const range = hi - lo
    raw.push(range === 0 ? 0 : ((rsi[i] as number) - lo) / range * 100)
  }
  const k = smaOfNullable(raw, kSmooth)
  const d = smaOfNullable(k, dSmooth)
  return { k, d }
}

function smaOfNullable(vals: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = []
  for (let i = 0; i < vals.length; i++) {
    if (i < period - 1) { out.push(null); continue }
    let sum = 0, ok = true
    for (let j = i - period + 1; j <= i; j++) { if (vals[j] === null) { ok = false; break } sum += vals[j] as number }
    out.push(ok ? sum / period : null)
  }
  return out
}

// Rate of Change (%).
function computeROC(closes: number[], period = 12): (number | null)[] {
  return closes.map((c, i) => i < period || closes[i - period] === 0 ? null : (c - closes[i - period]) / closes[i - period] * 100)
}

// TRIX: 1-bar % change of a triple-smoothed EMA.
function computeTRIX(closes: number[], period = 15): (number | null)[] {
  const e1 = computeEMA(closes, period)
  const e2 = emaOfNullable(e1, period)
  const e3 = emaOfNullable(e2, period)
  return e3.map((v, i) => v === null || e3[i - 1] === null || (e3[i - 1] as number) === 0 ? null : (v - (e3[i - 1] as number)) / (e3[i - 1] as number) * 10000)
}

// Awesome Oscillator: SMA(median,5) − SMA(median,34).
function computeAO(bars: Bar[]): (number | null)[] {
  const med = bars.map(b => (b.high + b.low) / 2)
  const fast = computeSMA(med, 5)
  const slow = computeSMA(med, 34)
  return med.map((_, i) => fast[i] !== null && slow[i] !== null ? (fast[i] as number) - (slow[i] as number) : null)
}

// Percentage Price Oscillator.
function computePPO(closes: number[], fast = 12, slow = 26): (number | null)[] {
  const ef = computeEMA(closes, fast)
  const es = computeEMA(closes, slow)
  return closes.map((_, i) => ef[i] !== null && es[i] !== null && (es[i] as number) !== 0 ? ((ef[i] as number) - (es[i] as number)) / (es[i] as number) * 100 : null)
}

// Ultimate Oscillator.
function computeUO(bars: Bar[], s1 = 7, s2 = 14, s3 = 28): (number | null)[] {
  const n = bars.length
  const bp: number[] = new Array(n).fill(0)
  const tr: number[] = new Array(n).fill(0)
  for (let i = 1; i < n; i++) {
    const pc = bars[i - 1].close
    const low = Math.min(bars[i].low, pc)
    const high = Math.max(bars[i].high, pc)
    bp[i] = bars[i].close - low
    tr[i] = high - low
  }
  const out: (number | null)[] = new Array(n).fill(null)
  const sumRange = (arr: number[], i: number, p: number) => { let s = 0; for (let j = i - p + 1; j <= i; j++) s += arr[j]; return s }
  for (let i = 0; i < n; i++) {
    if (i < s3) continue
    const avg1 = sumRange(bp, i, s1) / (sumRange(tr, i, s1) || 1)
    const avg2 = sumRange(bp, i, s2) / (sumRange(tr, i, s2) || 1)
    const avg3 = sumRange(bp, i, s3) / (sumRange(tr, i, s3) || 1)
    out[i] = 100 * (4 * avg1 + 2 * avg2 + avg3) / 7
  }
  return out
}

// Aroon Up / Aroon Down (0-100).
function computeAroon(bars: Bar[], period = 25): { up: (number | null)[]; down: (number | null)[] } {
  const up: (number | null)[] = []
  const down: (number | null)[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < period) { up.push(null); down.push(null); continue }
    let hiIdx = i, loIdx = i
    for (let j = i - period; j <= i; j++) {
      if (bars[j].high >= bars[hiIdx].high) hiIdx = j
      if (bars[j].low <= bars[loIdx].low) loIdx = j
    }
    up.push(100 * (period - (i - hiIdx)) / period)
    down.push(100 * (period - (i - loIdx)) / period)
  }
  return { up, down }
}

// Vortex Indicator (VI+ / VI−).
function computeVortex(bars: Bar[], period = 14): { plus: (number | null)[]; minus: (number | null)[] } {
  const n = bars.length
  const vmPlus: number[] = new Array(n).fill(0)
  const vmMinus: number[] = new Array(n).fill(0)
  const tr: number[] = new Array(n).fill(0)
  for (let i = 1; i < n; i++) {
    vmPlus[i] = Math.abs(bars[i].high - bars[i - 1].low)
    vmMinus[i] = Math.abs(bars[i].low - bars[i - 1].high)
    const pc = bars[i - 1].close
    tr[i] = Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - pc), Math.abs(bars[i].low - pc))
  }
  const plus: (number | null)[] = new Array(n).fill(null)
  const minus: (number | null)[] = new Array(n).fill(null)
  for (let i = period; i < n; i++) {
    let sp = 0, sm = 0, st = 0
    for (let j = i - period + 1; j <= i; j++) { sp += vmPlus[j]; sm += vmMinus[j]; st += tr[j] }
    if (st === 0) continue
    plus[i] = sp / st
    minus[i] = sm / st
  }
  return { plus, minus }
}

// Money Flow Index (volume-weighted RSI).
function computeMFI(bars: Bar[], period = 14): (number | null)[] {
  const n = bars.length
  const tp = bars.map(b => (b.high + b.low + b.close) / 3)
  const posFlow: number[] = new Array(n).fill(0)
  const negFlow: number[] = new Array(n).fill(0)
  for (let i = 1; i < n; i++) {
    const raw = tp[i] * bars[i].volume
    if (tp[i] > tp[i - 1]) posFlow[i] = raw
    else if (tp[i] < tp[i - 1]) negFlow[i] = raw
  }
  const out: (number | null)[] = new Array(n).fill(null)
  for (let i = period; i < n; i++) {
    let pos = 0, neg = 0
    for (let j = i - period + 1; j <= i; j++) { pos += posFlow[j]; neg += negFlow[j] }
    out[i] = neg === 0 ? 100 : 100 - 100 / (1 + pos / neg)
  }
  return out
}

// Accumulation / Distribution Line.
function computeADL(bars: Bar[]): number[] {
  const out: number[] = []
  let acc = 0
  for (const b of bars) {
    const range = b.high - b.low
    const mfm = range === 0 ? 0 : ((b.close - b.low) - (b.high - b.close)) / range
    acc += mfm * b.volume
    out.push(acc)
  }
  return out
}

// Chaikin Money Flow.
function computeCMF(bars: Bar[], period = 20): (number | null)[] {
  const n = bars.length
  const mfv: number[] = bars.map(b => {
    const range = b.high - b.low
    const mfm = range === 0 ? 0 : ((b.close - b.low) - (b.high - b.close)) / range
    return mfm * b.volume
  })
  const out: (number | null)[] = new Array(n).fill(null)
  for (let i = period - 1; i < n; i++) {
    let sv = 0, sVol = 0
    for (let j = i - period + 1; j <= i; j++) { sv += mfv[j]; sVol += bars[j].volume }
    out[i] = sVol === 0 ? 0 : sv / sVol
  }
  return out
}

// Chaikin Oscillator: EMA3(ADL) − EMA10(ADL).
function computeChaikinOsc(bars: Bar[]): (number | null)[] {
  const adl = computeADL(bars)
  const e3 = computeEMA(adl, 3)
  const e10 = computeEMA(adl, 10)
  return adl.map((_, i) => e3[i] !== null && e10[i] !== null ? (e3[i] as number) - (e10[i] as number) : null)
}

// Force Index (EMA-smoothed).
function computeForceIndex(bars: Bar[], period = 13): (number | null)[] {
  const raw: number[] = [0]
  for (let i = 1; i < bars.length; i++) raw.push((bars[i].close - bars[i - 1].close) * bars[i].volume)
  return computeEMA(raw, period)
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
  // Compare-symbol autocomplete (live Yahoo search dropdown)
  const [compareResults, setCompareResults] = useState<{ symbol: string; name: string; exchange?: string; type?: string }[]>([])
  const [compareSearchOpen, setCompareSearchOpen] = useState(false)
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
    setSelectedDrawingId(null)
    setDrawMenu(null)
  }
  const [drawings, setDrawings] = useLocalStorage<Drawing[]>('mkt:drawings', [])
  const [pendingPts, setPendingPts] = useState<DrawPoint[]>([])
  const [hoverPt, setHoverPt] = useState<DrawPoint | null>(null)
  // Selected drawing + floating edit menu (click a drawing with the cursor tool)
  const [selectedDrawingId, setSelectedDrawingId] = useState<number | null>(null)
  const [drawMenu, setDrawMenu] = useState<{ x: number; y: number; id: number; flipX: boolean; flipY: boolean } | null>(null)

  // ===== Price alerts (TradingView-style) =====
  type PriceAlert = { id: number; price: number }
  const [alertsMap, setAlertsMap] = useLocalStorage<Record<string, PriceAlert[]>>('mkt:priceAlerts', {})
  const [alertInput, setAlertInput] = useState('')
  const [triggeredAlert, setTriggeredAlert] = useState<{ price: number } | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])
  const prevPriceRef = useRef<number | null>(null)
  const symKey = symbol.toUpperCase()
  const currentAlerts = useMemo(() => alertsMap[symKey] || [], [alertsMap, symKey])
  const addAlert = useCallback((price: number) => {
    if (!Number.isFinite(price) || price <= 0) return
    setAlertsMap((m) => {
      const list = m[symKey] || []
      if (list.some((a) => Math.abs(a.price - price) < price * 1e-6)) return m
      return { ...m, [symKey]: [...list, { id: Date.now(), price }].sort((a, b) => b.price - a.price) }
    })
  }, [setAlertsMap, symKey])
  const removeAlert = useCallback((id: number) => {
    setAlertsMap((m) => ({ ...m, [symKey]: (m[symKey] || []).filter((a) => a.id !== id) }))
  }, [setAlertsMap, symKey])

  // Detect when the live price crosses an alert level and notify the user.
  useEffect(() => {
    const cur = lastPrice?.price
    if (cur == null) return
    const prev = prevPriceRef.current
    prevPriceRef.current = cur
    if (prev == null) return
    for (const a of currentAlerts) {
      const crossed = (prev < a.price && cur >= a.price) || (prev > a.price && cur <= a.price)
      if (crossed) {
        setTriggeredAlert({ price: a.price })
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`${symKey} hit ${a.price}`, { body: `Price alert triggered at ${cur.toFixed(2)}` })
          }
        } catch { /* ignore */ }
        window.setTimeout(() => setTriggeredAlert(null), 6000)
        removeAlert(a.id)
      }
    }
  }, [lastPrice, currentAlerts, removeAlert, symKey])

  // Refs for handlers (avoid stale closures)
  const activeToolRef = useRef(activeTool); useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
  const drawingsRef = useRef(drawings); useEffect(() => { drawingsRef.current = drawings }, [drawings])
  const pendingPtsRef = useRef(pendingPts); useEffect(() => { pendingPtsRef.current = pendingPts }, [pendingPts])
  const hoverPtRef = useRef(hoverPt); useEffect(() => { hoverPtRef.current = hoverPt }, [hoverPt])
  const selectedDrawingIdRef = useRef(selectedDrawingId); useEffect(() => { selectedDrawingIdRef.current = selectedDrawingId }, [selectedDrawingId])
  // Bars + active indicators exposed to the canvas overlay renderer (volume profiles).
  const barsRef = useRef(bars); useEffect(() => { barsRef.current = bars }, [bars])
  const indicatorsRef = useRef(indicators); useEffect(() => { indicatorsRef.current = indicators }, [indicators])

  // Sync prop → state
  useEffect(() => { if (propSymbol !== symbol) { setSymbol(propSymbol) } }, [propSymbol])

  const currentRange = useMemo(() => RANGE_OPTS.find(r => r.key === rangeKey) || RANGE_OPTS[3], [rangeKey])

  // ========== Fetch Data ==========
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Macro / economic series (CPI, PPI, Fed Funds, etc.) are served from FRED.
      const isFred = /^fred:/i.test(symbol)
      // Relative-strength ratio chart: "SPY/QQQ" → one line of SPY ÷ QQQ.
      const isRatio = !isFred && /^[^/]+\/[^/]+$/.test(symbol.trim())
      // Fetch a larger range when warm-up is configured so long MAs cover the full window.
      const fetchRange = WARMUP_FETCH[rangeKey] || currentRange.range

      // Helper: fetch + normalize bars for a single Yahoo symbol.
      const fetchYahooBars = async (sym: string, range: string): Promise<Bar[]> => {
        const q = new URLSearchParams({ symbol: sym, range, interval: currentRange.interval })
        const r = await fetch(`/api/yahoo-history?${q}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) })
        if (!r.ok) throw new Error(`API ${r.status}`)
        const j = await r.json()
        const rw = j?.bars || j?.data?.bars || j?.data || []
        if (!Array.isArray(rw)) return []
        return rw
          .filter((b: any) => b && Number.isFinite(b.close) && b.close > 0)
          .map((b: any) => ({
            time: typeof b.time === 'number' ? (b.time > 1e12 ? Math.floor(b.time / 1000) : b.time) : Math.floor(new Date(b.time).getTime() / 1000),
            open: b.open || b.close, high: b.high || b.close, low: b.low || b.close, close: b.close, volume: b.volume || 0,
          }))
          .sort((a: Bar, b: Bar) => a.time - b.time)
      }

      if (isRatio) {
        const [numSym, denSym] = symbol.split('/').map((s) => s.trim())
        const [numBars, denBars] = await Promise.all([
          fetchYahooBars(numSym, fetchRange),
          fetchYahooBars(denSym, fetchRange),
        ])
        if (numBars.length < 2 || denBars.length < 2) throw new Error(`No data for ${symbol}`)
        // Align by timestamp and divide to build the relative-strength series.
        const denMap = new Map<number, Bar>()
        for (const b of denBars) denMap.set(b.time, b)
        const ratio: Bar[] = []
        for (const n of numBars) {
          const d = denMap.get(n.time)
          if (!d || d.close <= 0) continue
          ratio.push({
            time: n.time,
            open: (n.open) / (d.open || d.close),
            high: (n.high) / (d.high || d.close),
            low: (n.low) / (d.low || d.close),
            close: n.close / d.close,
            volume: 0,
          })
        }
        if (ratio.length < 2) throw new Error(`No overlapping data for ${symbol}`)
        const seenR = new Set<number>()
        const uniqueR = ratio.filter((b) => { if (seenR.has(b.time)) return false; seenR.add(b.time); return true })
        setBars(uniqueR)
        const lastR = uniqueR[uniqueR.length - 1]
        const prevR = uniqueR[uniqueR.length - 2]
        setLastPrice({
          price: lastR.close,
          change: lastR.close - prevR.close,
          changePct: prevR.close ? ((lastR.close - prevR.close) / prevR.close) * 100 : 0,
        })
        return
      }

      const qs = new URLSearchParams({ symbol, range: fetchRange, interval: currentRange.interval })
      const endpoint = isFred
        ? `/api/fred-history?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(currentRange.range)}`
        : `/api/yahoo-history?${qs}`
      const res = await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(12000) })
      if (!res.ok) {
        if (isFred && res.status === 503) throw new Error('Macro data unavailable (FRED API key not configured)')
        throw new Error(`API ${res.status}`)
      }
      const json = await res.json()
      const raw = json?.bars || json?.data?.bars || json?.data || []
      if (!Array.isArray(raw) || raw.length < 2) throw new Error('No data for this symbol')
      const parsed: Bar[] = raw
        .filter((b: any) => b && Number.isFinite(b.close) && (isFred || b.close > 0))
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
  }, [symbol, currentRange, rangeKey])

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

  // Debounced autocomplete for the compare input (live Yahoo symbol search).
  useEffect(() => {
    const q = compareInput.trim()
    if (q.length < 1) { setCompareResults([]); return }
    let aborted = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/yahoo-search?q=${encodeURIComponent(q)}`, { cache: 'no-store', signal: AbortSignal.timeout(9000) })
        const json = await res.json()
        if (!aborted) setCompareResults(Array.isArray(json?.data) ? json.data.slice(0, 8) : [])
      } catch {
        if (!aborted) setCompareResults([])
      }
    }, 220)
    return () => { aborted = true; clearTimeout(t) }
  }, [compareInput])

  // Add a symbol to the compare overlays (used by Enter key + dropdown click).
  const addCompareSymbol = useCallback((raw: string) => {
    const v = raw.trim().toUpperCase()
    if (!v) return
    if (!compareSyms.includes(v) && v !== symbol.toUpperCase() && compareSyms.length < COMPARE_COLORS.length) {
      setCompareSyms([...compareSyms, v])
    }
    setCompareInput('')
    setCompareResults([])
    setCompareSearchOpen(false)
  }, [compareSyms, symbol, setCompareSyms])

  // ===== Chart navigation (zoom / scroll / reset) =====
  // Zoom by shrinking/expanding the visible logical range around its center.
  const zoomChart = useCallback((factor: number) => {
    const chart = chartRef.current
    if (!chart) return
    const ts = chart.timeScale()
    const r = ts.getVisibleLogicalRange()
    if (!r) return
    const center = (r.from + r.to) / 2
    const half = ((r.to - r.from) / 2) * factor
    try { ts.setVisibleLogicalRange({ from: center - half, to: center + half }) } catch { /* ignore */ }
  }, [])
  // Scroll left/right by a fraction of the current window width.
  const scrollChart = useCallback((dir: -1 | 1) => {
    const chart = chartRef.current
    if (!chart) return
    const ts = chart.timeScale()
    const r = ts.getVisibleLogicalRange()
    if (!r) return
    const shift = (r.to - r.from) * 0.25 * dir
    try { ts.setVisibleLogicalRange({ from: r.from + shift, to: r.to + shift }) } catch { /* ignore */ }
  }, [])
  const resetChartView = useCallback(() => {
    const chart = chartRef.current
    if (!chart) return
    try { chart.timeScale().fitContent() } catch { /* ignore */ }
  }, [])


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
        // Long ranges span huge relative price moves (e.g. AAPL $0.11 → $200). A linear
        // axis squashes the early years into a flat line at the bottom, making the chart
        // look "cut in half". A logarithmic axis shows proportional moves across decades.
        mode: (rangeKey === 'MAX' || rangeKey === '5Y') ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
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

    // Macro / FRED series carry a single value per date — render them as a line
    // (candles would just show flat crosses). Ratio (relative-strength) charts
    // also read best as a single line.
    const isFredSeries = /^fred:/i.test(symbol)
    const isRatioSeries = !isFredSeries && /^[^/]+\/[^/]+$/.test(symbol.trim())
    const effStyle: ChartStyle = (isFredSeries || isRatioSeries) && chartStyle === 'candle' ? 'line' : chartStyle

    // Main series
    if (effStyle === 'candle') {
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
    } else if (effStyle === 'line') {
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

    // ===== Price alert lines (TradingView-style horizontal markers) =====
    priceLinesRef.current = []
    if (mainSeriesRef.current && currentAlerts.length) {
      for (const a of currentAlerts) {
        try {
          const pl = mainSeriesRef.current.createPriceLine({
            price: a.price,
            color: '#f59e0b',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `⏰ ${a.price}`,
          })
          priceLinesRef.current.push(pl)
        } catch { /* ignore */ }
      }
    }

    // ===== Helper to add overlay line =====
    const addOverlay = (vals: (number | null)[], color: string, style: LineStyle = LineStyle.Solid, width = 1) => {
      const ls = chart.addSeries(LineSeries, { color, lineWidth: width as 1 | 2 | 3 | 4, lineStyle: style, crosshairMarkerVisible: false })
      ls.setData(vals.map((v, i) => v !== null ? { time: timeLabels[i], value: v } as LineData : null).filter(Boolean) as LineData[])
      overlaySeriesRef.current.push(ls)
    }

    // Check how many sub-panels we need (for proper margin allocation)
    const subPanelKeys: IndicatorKey[] = ['rsi', 'macd', 'stochastic', 'cci', 'williamsR', 'mom', 'atr', 'obv', 'stddev', 'mfi', 'cmf', 'adl', 'chaikinosc', 'forceindex', 'adx', 'stochrsi', 'roc', 'trix', 'uo', 'ao', 'ppo', 'aroon', 'vortex']
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
    if (indicators.has('wma20')) addOverlay(computeWMA(closes, 20), '#eab308')
    if (indicators.has('wma50')) addOverlay(computeWMA(closes, 50), '#84cc16')
    if (indicators.has('hma')) addOverlay(computeHMA(closes, 16), '#22d3ee', LineStyle.Solid, 2)
    if (indicators.has('dema')) addOverlay(computeDEMA(closes, 20), '#c084fc')
    if (indicators.has('tema')) addOverlay(computeTEMA(closes, 20), '#fb7185')
    if (indicators.has('vwma')) addOverlay(computeVWMA(bars, 20), '#38bdf8')

    // Parabolic SAR (plotted as a thin dotted line tracing the stops)
    if (indicators.has('psar')) addOverlay(computePSAR(bars), '#e879f9', LineStyle.Dotted, 2)

    // SuperTrend (trailing ATR line)
    if (indicators.has('supertrend')) {
      const st = computeSuperTrend(bars)
      // Split into up/down colored segments by inserting nulls on direction flips.
      const upLine = st.line.map((v, i) => st.up[i] ? v : null)
      const downLine = st.line.map((v, i) => !st.up[i] ? v : null)
      addOverlay(upLine, '#22c55e', LineStyle.Solid, 2)
      addOverlay(downLine, '#ef4444', LineStyle.Solid, 2)
    }

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
    if (indicators.has('envelopes')) {
      const env = computeEnvelopes(closes, 20, 2.5)
      addOverlay(env.upper, 'rgba(96,165,250,0.55)')
      addOverlay(env.basis, 'rgba(96,165,250,0.3)', LineStyle.Dashed)
      addOverlay(env.lower, 'rgba(96,165,250,0.55)')
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

    // Std Dev (sub-panel)
    if (indicators.has('stddev')) {
      addSubLine(computeStdDev(closes, 20), 'stddev-panel', '#94a3b8')
    }

    // Money Flow Index (0-100, with 20/80 guides)
    if (indicators.has('mfi')) {
      const sid = 'mfi-panel'
      addSubLine(computeMFI(bars), sid, '#10b981')
      const pane = getPane(sid)
      const g20 = chart.addSeries(LineSeries, { color: 'rgba(34,197,94,0.3)', lineWidth: 1, lineStyle: LineStyle.Dotted, crosshairMarkerVisible: false, lastValueVisible: false }, pane)
      g20.setData(timeLabels.map(t => ({ time: t, value: 20 } as LineData))); overlaySeriesRef.current.push(g20)
      const g80 = chart.addSeries(LineSeries, { color: 'rgba(239,68,68,0.3)', lineWidth: 1, lineStyle: LineStyle.Dotted, crosshairMarkerVisible: false, lastValueVisible: false }, pane)
      g80.setData(timeLabels.map(t => ({ time: t, value: 80 } as LineData))); overlaySeriesRef.current.push(g80)
    }

    // Chaikin Money Flow (oscillates around 0)
    if (indicators.has('cmf')) {
      addSubHistogram(computeCMF(bars, 20), 'cmf-panel')
    }

    // Accumulation / Distribution Line
    if (indicators.has('adl')) {
      addSubLine(computeADL(bars).map(v => v as number | null), 'adl-panel', '#60a5fa')
    }

    // Chaikin Oscillator
    if (indicators.has('chaikinosc')) {
      addSubHistogram(computeChaikinOsc(bars), 'chaikinosc-panel')
    }

    // Force Index
    if (indicators.has('forceindex')) {
      addSubHistogram(computeForceIndex(bars, 13), 'forceindex-panel')
    }

    // ADX with +DI / -DI
    if (indicators.has('adx')) {
      const a = computeADX(bars)
      const sid = 'adx-panel'
      addSubLine(a.adx, sid, '#eab308', LineStyle.Solid, 2)
      addSubLine(a.plusDI, sid, '#22c55e')
      addSubLine(a.minusDI, sid, '#ef4444')
    }

    // Stochastic RSI
    if (indicators.has('stochrsi')) {
      const s = computeStochRSI(closes)
      const sid = 'stochrsi-panel'
      addSubLine(s.k, sid, '#06b6d4')
      addSubLine(s.d, sid, '#f97316', LineStyle.Dashed)
    }

    // Rate of Change
    if (indicators.has('roc')) {
      addSubLine(computeROC(closes, 12), 'roc-panel', '#a78bfa')
    }

    // TRIX
    if (indicators.has('trix')) {
      addSubLine(computeTRIX(closes, 15), 'trix-panel', '#f472b6')
    }

    // Ultimate Oscillator
    if (indicators.has('uo')) {
      addSubLine(computeUO(bars), 'uo-panel', '#14b8a6')
    }

    // Awesome Oscillator (histogram)
    if (indicators.has('ao')) {
      addSubHistogram(computeAO(bars), 'ao-panel')
    }

    // PPO
    if (indicators.has('ppo')) {
      addSubLine(computePPO(closes), 'ppo-panel', '#3b82f6')
    }

    // Aroon Up / Down
    if (indicators.has('aroon')) {
      const ar = computeAroon(bars, 25)
      const sid = 'aroon-panel'
      addSubLine(ar.up, sid, '#22c55e')
      addSubLine(ar.down, sid, '#ef4444')
    }

    // Vortex VI+ / VI-
    if (indicators.has('vortex')) {
      const v = computeVortex(bars, 14)
      const sid = 'vortex-panel'
      addSubLine(v.plus, sid, '#22c55e')
      addSubLine(v.minus, sid, '#ef4444')
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

    // Fit content — but when warm-up history was fetched, zoom to the requested
    // window so long moving averages span the entire visible chart (not half).
    // Macro/FRED series are sparse (monthly/weekly) so we always fit their full range.
    const warmupActive = !/^fred:/i.test(symbol) && !/^[^/]+\/[^/]+$/.test(symbol.trim()) && !!WARMUP_FETCH[rangeKey]
    if (warmupActive && bars.length > 2) {
      const lastSec = bars[bars.length - 1].time
      let startSec: number
      if (rangeKey === 'YTD') {
        startSec = Math.floor(Date.UTC(new Date(lastSec * 1000).getUTCFullYear(), 0, 1) / 1000)
      } else {
        startSec = lastSec - (WINDOW_SECONDS[rangeKey] || 372 * 86400)
      }
      let fromIdx = bars.findIndex(b => b.time >= startSec)
      if (fromIdx < 0) fromIdx = 0
      const N = bars.length
      // Only zoom if there is real warm-up data to hide on the left.
      if (fromIdx > 1) {
        const rightMargin = Math.max(1, Math.round((N - fromIdx) * 0.04))
        try {
          chart.timeScale().setVisibleLogicalRange({ from: fromIdx - 0.5, to: (N - 1) + rightMargin })
        } catch {
          chart.timeScale().fitContent()
        }
      } else {
        chart.timeScale().fitContent()
      }
    } else {
      chart.timeScale().fitContent()
    }

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
      if (!param.point || !mainSeriesRef.current) return

      // Cursor tool: clicking a drawing selects it and opens the edit menu.
      if (tool === 'cursor') {
        const id = hitTestDrawings(param.point.x, param.point.y)
        if (id != null) {
          const cw = chartContainerRef.current?.clientWidth ?? 0
          const ch = chartContainerRef.current?.clientHeight ?? 0
          setSelectedDrawingId(id)
          setDrawMenu({ x: param.point.x, y: param.point.y, id, flipX: param.point.x > cw - 210, flipY: param.point.y > ch - 130 })
        } else {
          setSelectedDrawingId(null)
          setDrawMenu(null)
        }
        return
      }
      if (tool === 'crosshair') return

      const logical = chart.timeScale().coordinateToLogical(param.point.x)
      const price = mainSeriesRef.current.coordinateToPrice(param.point.y)
      if (logical == null || price == null) return
      const pt: DrawPoint = { logical, price }

      if (tool === 'alert') {
        addAlert(Math.round(price * 100) / 100)
        setActiveTool('cursor')
        return
      }

      if (tool === 'text') {
        const txt = window.prompt('Note text:')
        if (txt && txt.trim()) {
          setDrawings(d => [...d, { id: Date.now(), tool, pts: [pt], color: '#fbbf24', text: txt.trim() }])
        }
        // Apply the tool once, then return to the cursor.
        setActiveTool('cursor')
        return
      }

      const need = TOOL_STEPS[tool] || 2
      const next = [...pendingPtsRef.current, pt]
      if (next.length >= need) {
        setDrawings(d => [...d, { id: Date.now(), tool, pts: next, color: '#3b82f6' }])
        setPendingPts([])
        // Drawing finished — switch back to the cursor so it isn't redrawn on every click.
        setActiveTool('cursor')
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
  }, [bars, chartStyle, indicators, height, currentRange.interval, layoutTick, compareSyms, compareData, symbol, currentAlerts, rangeKey])

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

    // ===== Volume Profile histograms (VPVR = visible range, VPFR = fixed/full range) =====
    // Drawn directly on the overlay canvas as horizontal volume bars anchored to the
    // right edge, with the POC (point of control) and the 70% value area highlighted.
    const inds = indicatorsRef.current
    const allBars = barsRef.current
    const drawVolumeProfile = (profileBars: Bar[], accent: string, label: string) => {
      const vp = computeVolumeProfile(profileBars, 30)
      if (!vp) return
      const maxV = vp.maxVolume || 1
      const maxBarW = Math.min(180, W * 0.28)
      // Value-area band edges in price → y for shading.
      const yVAH = main.priceToCoordinate(vp.vah)
      const yVAL = main.priceToCoordinate(vp.val)
      ctx.save()
      // Each level becomes a horizontal bar growing leftwards from the right edge.
      const levelH = vp.levels.length > 1
        ? Math.abs((main.priceToCoordinate(vp.levels[1].price) ?? 0) - (main.priceToCoordinate(vp.levels[0].price) ?? 0))
        : 6
      const barH = Math.max(1, levelH - 1)
      for (const lv of vp.levels) {
        const y = main.priceToCoordinate(lv.price)
        if (y == null) continue
        const w = (lv.volume / maxV) * maxBarW
        if (w < 0.5) continue
        const inVA = yVAH != null && yVAL != null && y >= Math.min(yVAH, yVAL) && y <= Math.max(yVAH, yVAL)
        ctx.fillStyle = inVA ? `${accent}55` : `${accent}26`
        ctx.fillRect(W - w, y - barH / 2, w, barH)
      }
      // POC line (brightest).
      const yPoc = main.priceToCoordinate(vp.poc)
      if (yPoc != null) {
        const wPoc = maxBarW
        ctx.fillStyle = `${accent}aa`
        ctx.fillRect(W - wPoc, yPoc - barH / 2, wPoc, barH)
        ctx.strokeStyle = accent
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(W - maxBarW, yPoc); ctx.lineTo(W, yPoc); ctx.stroke()
      }
      // Label.
      ctx.fillStyle = accent
      ctx.font = '9px ui-sans-serif, system-ui'
      ctx.textAlign = 'right'
      ctx.fillText(label, W - maxBarW - 4, 12)
      ctx.textAlign = 'left'
      ctx.restore()
    }

    if (inds.has('vpfr') && allBars.length > 4) {
      drawVolumeProfile(allBars, '#38bdf8', 'VPFR')
    }
    if (inds.has('vpvr') && allBars.length > 4) {
      // Slice bars to the currently visible logical range so the profile updates on pan/zoom.
      const lr = chart.timeScale().getVisibleLogicalRange()
      let slice = allBars
      if (lr) {
        const from = Math.max(0, Math.floor(lr.from))
        const to = Math.min(allBars.length - 1, Math.ceil(lr.to))
        if (to - from >= 4) slice = allBars.slice(from, to + 1)
      }
      drawVolumeProfile(slice, '#a78bfa', 'VPVR')
    }

    const drawShape = (d: Drawing | { tool: DrawingTool; pts: DrawPoint[]; color: string; text?: string; width?: number }, isPreview = false, selected = false) => {
      const pts = d.pts.map(toXY).filter(Boolean) as { x: number; y: number }[]
      if (pts.length === 0) return
      ctx.save()
      ctx.strokeStyle = d.color
      ctx.fillStyle = d.color
      const baseW = (d as Drawing).width || 1.5
      ctx.lineWidth = isPreview ? 1 : (selected ? baseW + 1 : baseW)
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
      // Selection handles: small squares at each anchor of the selected drawing.
      if (selected && !isPreview) {
        ctx.setLineDash([])
        ctx.lineWidth = 1
        for (const p of pts) {
          ctx.fillStyle = '#0ea5e9'
          ctx.strokeStyle = '#ffffff'
          ctx.fillRect(p.x - 3.5, p.y - 3.5, 7, 7)
          ctx.strokeRect(p.x - 3.5, p.y - 3.5, 7, 7)
        }
      }
      ctx.restore()
    }

    drawingsRef.current.forEach(d => drawShape(d, false, d.id === selectedDrawingIdRef.current))

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
  useEffect(() => { requestAnimationFrame(redrawOverlay) }, [drawings, pendingPts, hoverPt, activeTool, selectedDrawingId, indicators, redrawOverlay, bars])

  const clearDrawings = useCallback(() => { setDrawings([]); setPendingPts([]); setSelectedDrawingId(null); setDrawMenu(null) }, [setDrawings])
  const undoDrawing = useCallback(() => { setDrawings(d => d.slice(0, -1)); setSelectedDrawingId(null); setDrawMenu(null) }, [setDrawings])

  // Map a drawing point to pixel coords using the live chart/series scales.
  const ptToXY = useCallback((p: DrawPoint): { x: number; y: number } | null => {
    const chart = chartRef.current, main = mainSeriesRef.current
    if (!chart || !main) return null
    const x = chart.timeScale().logicalToCoordinate(p.logical as any)
    const y = main.priceToCoordinate(p.price)
    if (x == null || y == null) return null
    return { x, y }
  }, [])

  // Return the id of the drawing closest to a pixel click (or null). Iterates in
  // reverse so the topmost (last-drawn) shape wins. Tolerance ≈ 7px.
  const hitTestDrawings = useCallback((px: number, py: number): number | null => {
    const container = chartContainerRef.current
    const W = container?.clientWidth ?? 0
    const H = container?.clientHeight ?? 0
    const TOL = 7
    const list = drawingsRef.current
    for (let i = list.length - 1; i >= 0; i--) {
      const d = list[i]
      const xy = d.pts.map(ptToXY)
      if (xy.some(p => !p)) continue
      const [a, b, c] = xy as { x: number; y: number }[]
      let hit = false
      switch (d.tool) {
        case 'trendline':
          if (a && b) hit = distToSegment(px, py, a.x, a.y, b.x, b.y) <= TOL
          break
        case 'horizontal':
          if (a) hit = Math.abs(py - a.y) <= TOL
          break
        case 'vertical':
          if (a) hit = Math.abs(px - a.x) <= TOL
          break
        case 'rect':
          if (a && b) {
            const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x)
            const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y)
            hit = (
              distToSegment(px, py, x0, y0, x1, y0) <= TOL ||
              distToSegment(px, py, x1, y0, x1, y1) <= TOL ||
              distToSegment(px, py, x1, y1, x0, y1) <= TOL ||
              distToSegment(px, py, x0, y1, x0, y0) <= TOL
            )
          }
          break
        case 'ellipse':
          if (a && b) {
            const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
            const rx = Math.abs(b.x - a.x) / 2 || 1, ry = Math.abs(b.y - a.y) / 2 || 1
            const norm = ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2
            hit = norm > 0.8 && norm < 1.25
          }
          break
        case 'triangle':
          if (a && b && c) {
            hit = (
              distToSegment(px, py, a.x, a.y, b.x, b.y) <= TOL ||
              distToSegment(px, py, b.x, b.y, c.x, c.y) <= TOL ||
              distToSegment(px, py, c.x, c.y, a.x, a.y) <= TOL
            )
          }
          break
        case 'fib-retr':
        case 'fib-ext':
          if (a && b) {
            if (distToSegment(px, py, a.x, a.y, b.x, b.y) <= TOL) { hit = true; break }
            const levels = d.tool === 'fib-retr' ? FIB_LEVELS : FIB_EXT_LEVELS
            hit = levels.some(lv => Math.abs(py - (a.y + (b.y - a.y) * lv)) <= TOL && px >= 0 && px <= W)
          }
          break
        case 'text':
          if (a) hit = Math.abs(px - a.x) <= 70 && Math.abs(py - a.y) <= 14
          break
      }
      if (hit) return d.id
    }
    void H
    return null
  }, [ptToXY])

  const updateSelectedColor = useCallback((color: string) => {
    const id = selectedDrawingIdRef.current
    if (id == null) return
    setDrawings(list => list.map(d => d.id === id ? { ...d, color } : d))
  }, [setDrawings])

  const updateSelectedWidth = useCallback((width: number) => {
    const id = selectedDrawingIdRef.current
    if (id == null) return
    setDrawings(list => list.map(d => d.id === id ? { ...d, width } : d))
  }, [setDrawings])

  const deleteSelected = useCallback(() => {
    const id = selectedDrawingIdRef.current
    if (id == null) return
    setDrawings(list => list.filter(d => d.id !== id))
    setSelectedDrawingId(null)
    setDrawMenu(null)
  }, [setDrawings])

  // Keyboard: Delete removes the selected drawing, Escape deselects / cancels.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Delete' && selectedDrawingIdRef.current != null) {
        e.preventDefault(); deleteSelected()
      } else if (e.key === 'Escape') {
        setSelectedDrawingId(null); setDrawMenu(null); setPendingPts([])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteSelected])

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
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">vs</span>
          <div className="relative">
            <input
              value={compareInput}
              onChange={(e) => { setCompareInput(e.target.value.toUpperCase()); setCompareSearchOpen(true) }}
              onFocus={() => setCompareSearchOpen(true)}
              onBlur={() => setTimeout(() => setCompareSearchOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCompareSymbol(compareInput)
                if (e.key === 'Escape') { setCompareInput(''); setCompareSearchOpen(false) }
              }}
              placeholder="Compare (SPY, QQQ…)"
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white w-24 sm:w-28 focus:outline-none focus:border-pink-500 placeholder-gray-500"
            />
            {compareSearchOpen && compareResults.length > 0 && (
              <div className="absolute z-40 mt-1 right-0 w-[min(15rem,calc(100vw-2rem))] max-h-64 overflow-y-auto bg-slate-900/98 border border-white/15 rounded-lg shadow-xl backdrop-blur">
                {compareResults.map((r) => (
                  <button
                    key={`${r.symbol}-${r.exchange ?? ''}`}
                    onMouseDown={(e) => { e.preventDefault(); addCompareSymbol(r.symbol) }}
                    className="w-full text-left px-2 py-1.5 hover:bg-white/10 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-white">{r.symbol}</span>
                      {r.type && <span className="text-[9px] uppercase text-gray-500">{r.type}</span>}
                    </div>
                    {r.name && <div className="text-[10px] text-gray-400 truncate">{r.name}{r.exchange ? ` · ${r.exchange}` : ''}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
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
          {compareSyms.length === 1 && !symbol.includes('/') && (
            <button
              onClick={() => {
                const ratio = `${symbol}/${compareSyms[0]}`
                setCompareSyms([])
                setSymbol(ratio)
                onSymbolChange?.(ratio)
              }}
              className="px-1.5 py-0.5 text-[10px] rounded border border-pink-500/40 text-pink-300 hover:bg-pink-500/15"
              title={`Show relative strength ${symbol} / ${compareSyms[0]} as a single line`}
            >
              ⇄ RS
            </button>
          )}
        </div>

        {/* Price alerts */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => {
              try { if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission() } catch {}
              setActiveTool(activeTool === 'alert' ? 'cursor' : 'alert')
            }}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded border transition-colors ${
              activeTool === 'alert' ? 'bg-amber-600/30 border-amber-500/50 text-amber-200' : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:border-amber-400/40'
            }`}
            title="Add a price alert — then click on the chart at the desired price"
          >
            <span className="text-amber-300">＋</span>
            <span className="font-semibold uppercase tracking-wider text-[10px]">Alert</span>
          </button>
          <input
            value={alertInput}
            onChange={(e) => setAlertInput(e.target.value.replace(/[^0-9.]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const p = parseFloat(alertInput)
                if (Number.isFinite(p)) { addAlert(p); setAlertInput('') }
              }
              if (e.key === 'Escape') setAlertInput('')
            }}
            placeholder={lastPrice ? `${lastPrice.price.toFixed(2)}` : 'price'}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white w-20 focus:outline-none focus:border-amber-500 placeholder-gray-500"
          />
          {currentAlerts.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-amber-500/40 text-amber-200"
            >
              ⏰ {a.price}
              <button onClick={() => removeAlert(a.id)} className="text-gray-400 hover:text-rose-300" title="Remove alert">✕</button>
            </span>
          ))}
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
        {/* Active indicator legend — click any chip to remove that indicator */}
        {indicators.size > 0 && (() => {
          const LEGEND: { key: IndicatorKey; label: string; cls: string }[] = [
            { key: 'sma20', label: 'SMA 20', cls: 'text-amber-400' },
            { key: 'sma50', label: 'SMA 50', cls: 'text-purple-400' },
            { key: 'sma100', label: 'SMA 100', cls: 'text-cyan-400' },
            { key: 'sma200', label: 'SMA 200', cls: 'text-red-400' },
            { key: 'ema9', label: 'EMA 9', cls: 'text-emerald-400' },
            { key: 'ema20', label: 'EMA 20', cls: 'text-cyan-400' },
            { key: 'ema50', label: 'EMA 50', cls: 'text-pink-400' },
            { key: 'ema200', label: 'EMA 200', cls: 'text-orange-400' },
            { key: 'ichimoku', label: 'Ichimoku', cls: 'text-blue-400' },
            { key: 'bb', label: 'BB(20,2)', cls: 'text-purple-400/70' },
            { key: 'keltner', label: 'Keltner', cls: 'text-cyan-300' },
            { key: 'donchian', label: 'Donchian', cls: 'text-amber-300' },
            { key: 'vwap', label: 'VWAP', cls: 'text-pink-400' },
            { key: 'vpvr', label: 'VPVR', cls: 'text-violet-400' },
            { key: 'vpfr', label: 'VPFR', cls: 'text-sky-400' },
            { key: 'obv', label: 'OBV', cls: 'text-cyan-400' },
            { key: 'rsi', label: 'RSI', cls: 'text-purple-400' },
            { key: 'macd', label: 'MACD', cls: 'text-blue-400' },
            { key: 'stochastic', label: 'Stoch', cls: 'text-cyan-400' },
            { key: 'cci', label: 'CCI', cls: 'text-teal-400' },
            { key: 'williamsR', label: 'W%R', cls: 'text-rose-400' },
            { key: 'mom', label: 'Mom', cls: 'text-violet-400' },
            { key: 'atr', label: 'ATR', cls: 'text-orange-400' },
            { key: 'pivots', label: 'Pivots', cls: 'text-gray-400' },
          ]
          return (
            <div className="hidden sm:flex items-center gap-2 text-[9px] flex-wrap">
              {LEGEND.filter(l => indicators.has(l.key)).map(l => (
                <button
                  key={l.key}
                  onClick={() => toggleIndicator(l.key)}
                  className={`group inline-flex items-center gap-1 ${l.cls} hover:opacity-100 opacity-90`}
                  title="Click to remove"
                >
                  <span>● {l.label}</span>
                  <span className="text-gray-500 group-hover:text-red-300">✕</span>
                </button>
              ))}
            </div>
          )
        })()}
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
      <div style={{ position: 'relative' }} className="group flex-1 min-h-0 [&_a[href*='tradingview']]:!hidden">
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
        {triggeredAlert && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-100 text-xs font-semibold shadow-lg">
            ⏰ {symbol} reached {triggeredAlert.price}
            <button onClick={() => setTriggeredAlert(null)} className="text-amber-300 hover:text-white">✕</button>
          </div>
        )}
        {activeTool === 'alert' && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-2 px-2 py-1 rounded bg-slate-900/90 border border-amber-500/50 text-[10px] text-amber-200">
            <span className="font-semibold uppercase tracking-wider">Alert</span>
            <span className="text-gray-400">click on the chart at the target price</span>
            <button onClick={() => setActiveTool('cursor')} className="text-gray-400 hover:text-white">✕</button>
          </div>
        )}
        {activeTool !== 'cursor' && activeTool !== 'crosshair' && activeTool !== 'alert' && (
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

        {/* Selected-drawing edit menu (TradingView-style): color, thickness, delete */}
        {drawMenu && (() => {
          const sel = drawings.find(d => d.id === drawMenu.id)
          if (!sel) return null
          return (
            <div
              className="absolute z-30 rounded-lg bg-slate-900/95 border border-white/15 shadow-xl p-2 backdrop-blur"
              style={{
                left: drawMenu.x,
                top: drawMenu.y,
                transform: `translate(${drawMenu.flipX ? '-100%' : '8px'}, ${drawMenu.flipY ? '-100%' : '8px'})`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-gray-400">{sel.tool.replace('-', ' ')}</span>
                <button onClick={() => { setDrawMenu(null); setSelectedDrawingId(null) }} className="text-gray-400 hover:text-white text-[11px] leading-none">✕</button>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {DRAW_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => updateSelectedColor(c)}
                    className={`w-4 h-4 rounded-full border ${sel.color === c ? 'border-white ring-1 ring-white' : 'border-white/20'}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {DRAW_WIDTHS.map(w => (
                    <button
                      key={w}
                      onClick={() => updateSelectedWidth(w)}
                      className={`px-1.5 py-1 rounded border text-[10px] ${(sel.width || 1.5) === w ? 'border-blue-400 bg-blue-500/20 text-white' : 'border-white/15 text-gray-300 hover:bg-white/10'}`}
                      title={`Thickness ${w}`}
                    >
                      <span className="block bg-current rounded-full" style={{ width: 14, height: w }} />
                    </button>
                  ))}
                </div>
                <button
                  onClick={deleteSelected}
                  className="ml-auto px-2 py-1 rounded text-[10px] bg-red-500/15 border border-red-400/40 text-red-300 hover:bg-red-500/25"
                  title="Delete drawing (Del)"
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          )
        })()}

        {/* Chart navigation — appears on hover at the bottom-center of the chart */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-1.5 py-1 rounded-lg bg-slate-900/90 border border-white/15 shadow-lg backdrop-blur opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          <button onClick={() => scrollChart(-1)} title="Scroll left" className="p-1.5 rounded hover:bg-white/10 text-gray-300 hover:text-white">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.5 5l-5 5 5 5"/></svg>
          </button>
          <button onClick={() => zoomChart(0.7)} title="Zoom in" className="p-1.5 rounded hover:bg-white/10 text-gray-300 hover:text-white">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="6"/><path d="M13.5 13.5l3 3M6.5 9h5M9 6.5v5"/></svg>
          </button>
          <button onClick={() => zoomChart(1.4)} title="Zoom out" className="p-1.5 rounded hover:bg-white/10 text-gray-300 hover:text-white">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="6"/><path d="M13.5 13.5l3 3M6.5 9h5"/></svg>
          </button>
          <button onClick={resetChartView} title="Reset chart view" className="p-1.5 rounded hover:bg-white/10 text-gray-300 hover:text-white">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8a6.5 6.5 0 1 1-.5 2.5"/><path d="M3 5v3h3"/></svg>
          </button>
          <button onClick={() => scrollChart(1)} title="Scroll right" className="p-1.5 rounded hover:bg-white/10 text-gray-300 hover:text-white">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 5l5 5-5 5"/></svg>
          </button>
        </div>
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
