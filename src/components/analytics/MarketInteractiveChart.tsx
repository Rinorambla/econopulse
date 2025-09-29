'use client'

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Palette } from '@/styles/palette'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

type ChartType = 'line' | 'candlestick' | 'area' | 'heikin' | 'ohlc'
// Economic regime keys used for AI Entry/Exit probabilities
export type RegimeKey = 'goldilocks' | 'recession' | 'stagflation' | 'reflation' | 'deflation' | 'disinflation' | 'dollarWeakness'

interface YahooBar { time: number; open: number; high: number; low: number; close: number; volume: number }
interface YahooHistory { symbol: string; bars: YahooBar[] }

interface Props {
  initialSymbol?: string
  initialType?: ChartType
  className?: string
  rangeKeyOverride?: '1D'|'5D'|'1M'|'3M'|'6M'|'YTD'|'1Y'|'5Y'|'MAX'
  initialRegime?: RegimeKey
  hideRangeToolbar?: boolean
  onRangeChange?: (key: '1D'|'5D'|'1M'|'3M'|'6M'|'YTD'|'1Y'|'5Y'|'MAX') => void
}

const PRESET_SYMBOLS = [
  { label: 'S&P 500', symbol: '^GSPC' },
  { label: 'SPY (ETF)', symbol: 'SPY' },
  { label: 'Gold (Futures)', symbol: 'GC=F' },
  { label: 'GLD (ETF)', symbol: 'GLD' },
  { label: 'EUR/USD', symbol: 'EURUSD=X' },
  { label: 'BTC-USD', symbol: 'BTC-USD' },
  { label: 'AAPL', symbol: 'AAPL' },
  { label: 'TSLA', symbol: 'TSLA' },
]

const RANGE_PRESETS = [
  { key: '1D', range: '1d', interval: '5m' },
  { key: '5D', range: '5d', interval: '30m' },
  { key: '1M', range: '1mo', interval: '1d' },
  { key: '3M', range: '3mo', interval: '1d' },
  { key: '6M', range: '6mo', interval: '1d' },
  { key: 'YTD', range: 'ytd', interval: '1d' },
  { key: '1Y', range: '1y', interval: '1d' },
  { key: '5Y', range: '5y', interval: '1wk' },
  { key: 'MAX', range: 'max', interval: '1mo' },
]

const COMPARE_COLORS = [Palette.focus, Palette.accentAlt, Palette.accent, '#10B981', '#E11D48', '#F472B6', '#22D3EE']

export default function MarketInteractiveChart({ initialSymbol = '^GSPC', initialType = 'candlestick', className = '', rangeKeyOverride, initialRegime, hideRangeToolbar = false, onRangeChange }: Props) {
  const PlotAny = (Plot as unknown) as any
  const sp = useSearchParams()
  // Stable plot container id (do not depend on symbol to avoid TDZ and unnecessary re-ids)
  const plotId = useMemo(() => `mic-plot-${Math.random().toString(36).slice(2)}`, [])

  // URL / storage hydration
  const urlSymbol = sp?.get('s') || undefined
  const urlRange = sp?.get('r') || undefined
  const urlType = (sp?.get('t') as ChartType) || undefined
  const urlCmp = sp?.get('cmp') || ''
  const urlReg = (sp?.get('reg') as RegimeKey) || undefined

  const [symbol, setSymbol] = useState(urlSymbol || initialSymbol)
  const [inputValue, setInputValue] = useState(symbol)
  const [chartType, setChartType] = useState<ChartType>(urlType || initialType)
  const [rangeKey, setRangeKey] = useState(urlRange || '3M')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bars, setBars] = useState<YahooBar[]>([])
  
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggest, setShowSuggest] = useState(false)
  const suggestIndex = useRef(-1)

  // Indicator toggles
  const [showSMA20, setShowSMA20] = useState(false)
  const [showSMA50, setShowSMA50] = useState(false)
  const [showEMA20, setShowEMA20] = useState(false)
  const [showBB, setShowBB] = useState(false)
  const [showRSI, setShowRSI] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [logScale, setLogScale] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [showCrosshair, setShowCrosshair] = useState(true)
  const [showEarnings, setShowEarnings] = useState(false)
  // Candle color themes
  type CandleThemeKey = 'greenRed' | 'whiteBlack' | 'blueRed'
  const [candleTheme, setCandleTheme] = useState<CandleThemeKey>('greenRed')
  const themeColors = useMemo(() => {
    if (candleTheme === 'whiteBlack') {
      return { upLine: '#e5e7eb', upFill: '#ffffff', downLine: '#0b1220', downFill: '#0b1220' }
    }
    if (candleTheme === 'blueRed') {
      return { upLine: '#22d3ee', upFill: '#22d3ee', downLine: '#ef4444', downFill: '#ef4444' }
    }
    return { upLine: '#16a34a', upFill: '#22c55e', downLine: '#ef4444', downFill: '#ef4444' }
  }, [candleTheme])

  // Indicator params
  const [pSMA20, setPSMA20] = useState(20)
  const [pSMA50, setPSMA50] = useState(50)
  const [pEMA20, setPEMA20] = useState(20)
  const [pRSI, setPRSI] = useState(14)
  const [pBBLen, setPBBLen] = useState(20)
  const [pBBMult, setPBBMult] = useState(2)
  const [showMACD, setShowMACD] = useState(false)
  const [pMACDfast, setPMACDFast] = useState(12)
  const [pMACDslow, setPMACDSlow] = useState(26)
  const [pMACDsig, setPMACDSig] = useState(9)
  const [showATR, setShowATR] = useState(false)
  const [pATR, setPATR] = useState(14)
  const [showVWAP, setShowVWAP] = useState(false)
  const [showSupertrend, setShowSupertrend] = useState(false)
  const [pSTLen, setPSTLen] = useState(10)
  const [pSTMult, setPSTMult] = useState(3)

  // Compare mode
  const [compareSymbols, setCompareSymbols] = useState<string[]>(urlCmp ? urlCmp.split(',').filter(Boolean) : [])
  const [compareData, setCompareData] = useState<YahooHistory[]>([])
  const [compareInput, setCompareInput] = useState('')

  const prefsKey = 'mic_prefs_v2'

  // Layout presets (TradingView-style panes)
  const [tvLayout, setTvLayout] = useState(true)
  const [separateVolume, setSeparateVolume] = useState(true)
  // pane heights as fraction of total (price takes remaining)
  const [macdH, setMacdH] = useState(0.18)
  const [rsiH, setRsiH] = useState(0.16)
  const [volH, setVolH] = useState(0.12)

  // Drawing tools
  type DrawMode = 'none' | 'trend' | 'fib'
  const [drawMode, setDrawMode] = useState<DrawMode>('none')
  const [drawAnchor, setDrawAnchor] = useState<{ x: number, y: number } | null>(null)
  const [customShapes, setCustomShapes] = useState<any[]>([])
  const [customAnnotations, setCustomAnnotations] = useState<any[]>([])
  const [undoStack, setUndoStack] = useState<{ shapes: any[]; annotations: any[] }[]>([])
  // simple context menu state
  const [showVolProfile, setShowVolProfile] = useState(false)
  // AI Entry/Exit module
  const REGIME_LABEL: Record<RegimeKey, string> = {
    goldilocks: 'Goldilocks',
    recession: 'Recession',
    stagflation: 'Stagflation',
    reflation: 'Reflation',
    deflation: 'Deflation',
    disinflation: 'Disinflation (Soft Landing)',
    dollarWeakness: 'Dollar Weakness / Global Rebalancing',
  }
  const [regime, setRegime] = useState<RegimeKey>(urlReg || initialRegime || 'goldilocks')
  const [showAIEntryExit, setShowAIEntryExit] = useState(true)

  // Persist/load drawings per symbol
  useEffect(() => {
    // Load drawings for current symbol
    try {
      const raw = localStorage.getItem(drawingsKeyFor(symbol))
      if (raw) {
        const saved = JSON.parse(raw)
        setCustomShapes(Array.isArray(saved?.shapes) ? saved.shapes : [])
        setCustomAnnotations(Array.isArray(saved?.annotations) ? saved.annotations : [])
      } else {
        setCustomShapes([])
        setCustomAnnotations([])
      }
    } catch {}
  }, [symbol])

  useEffect(() => {
    // Auto-save after any change
    try { localStorage.setItem(drawingsKeyFor(symbol), JSON.stringify({ shapes: customShapes, annotations: customAnnotations })) } catch {}
  }, [symbol, customShapes, customAnnotations])
  
  const drawingsKeyFor = (sym: string) => `mic_drawings_v1_${sym}`
  const pushUndo = () => {
    setUndoStack(prev => [...prev, { shapes: JSON.parse(JSON.stringify(customShapes)), annotations: JSON.parse(JSON.stringify(customAnnotations)) }])
  }
  const clearDrawings = () => {
    if (customShapes.length || customAnnotations.length) pushUndo()
    setCustomShapes([])
    setCustomAnnotations([])
    try { localStorage.removeItem(drawingsKeyFor(symbol)) } catch {}
  }
  const undo = () => {
    setUndoStack(prev => {
      if (!prev.length) return prev
      const last = prev[prev.length - 1]
      setCustomShapes(last.shapes)
      setCustomAnnotations(last.annotations)
      return prev.slice(0, -1)
    })
  }

  const { range, interval } = useMemo(() => {
    const found = RANGE_PRESETS.find(r => r.key === rangeKey) || RANGE_PRESETS[2]
    return { range: found.range, interval: found.interval }
  }, [rangeKey])

  // Bars override: Auto vs Daily
  type BarsMode = 'auto' | 'daily'
  const [barsMode, setBarsMode] = useState<BarsMode>('auto')
  const effectiveInterval = useMemo(() => {
    if (barsMode === 'daily') {
      // Force daily bars except for pure intraday short ranges where 1d makes no sense
      if (range === '1d' || range === '5d') return '30m'
      return '1d'
    }
    return interval
  }, [barsMode, range, interval])

  // Keyboard shortcuts: 'd' -> daily bars, 'a' -> auto bars
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip when typing in inputs/textareas/contentEditable
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || (t as any).isContentEditable)) return
      const k = (e.key || '').toLowerCase()
      if (k === 'd') { setBarsMode('daily'); e.preventDefault(); }
      else if (k === 'a') { setBarsMode('auto'); e.preventDefault(); }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Apply external range override from parent (e.g., dashboard timeframe)
  useEffect(() => {
    if (!rangeKeyOverride) return
    const valid = RANGE_PRESETS.some(r => r.key === rangeKeyOverride)
    if (valid) setRangeKey(rangeKeyOverride)
  }, [rangeKeyOverride])

  // Persist preferences
  useEffect(() => {
    const p = {
      symbol, rangeKey, chartType, compareSymbols, showSMA20, showSMA50, showEMA20, showBB, showRSI, showVolume, logScale,
      pSMA20, pSMA50, pEMA20, pRSI, pBBLen, pBBMult, showMACD, pMACDfast, pMACDslow, pMACDsig, showATR, pATR,
      tvLayout, separateVolume, macdH, rsiH, volH, candleTheme, showGrid, showCrosshair,
    }
    try { localStorage.setItem(prefsKey, JSON.stringify(p)) } catch {}
  }, [symbol, rangeKey, chartType, compareSymbols, showSMA20, showSMA50, showEMA20, showBB, showRSI, showVolume, logScale, pSMA20, pSMA50, pEMA20, pRSI, pBBLen, pBBMult, showMACD, pMACDfast, pMACDslow, pMACDsig, showATR, pATR, tvLayout, separateVolume, macdH, rsiH, volH, candleTheme, showGrid, showCrosshair])

  // Suggestions list from presets and current state
  useEffect(() => {
    const q = (inputValue || '').trim().toUpperCase()
    const list = Array.from(new Set([symbol, ...compareSymbols, ...PRESET_SYMBOLS.map(s => s.symbol)].filter(Boolean)))
    const filtered = q ? list.filter(s => s.includes(q)) : list
    setSuggestions(filtered.slice(0, 20))
  }, [inputValue, symbol, compareSymbols])

  // Hydrate from localStorage once (if no URL override)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(prefsKey)
      if (!raw) return
      const p = JSON.parse(raw)
      if (p.symbol) { setSymbol(p.symbol); setInputValue(p.symbol) }
      if (p.rangeKey) setRangeKey(p.rangeKey)
      if (p.chartType) setChartType(p.chartType)
      if (Array.isArray(p.compareSymbols)) setCompareSymbols(p.compareSymbols)
      if (typeof p.showSMA20 === 'boolean') setShowSMA20(p.showSMA20)
      if (typeof p.showSMA50 === 'boolean') setShowSMA50(p.showSMA50)
      if (typeof p.showEMA20 === 'boolean') setShowEMA20(p.showEMA20)
      if (typeof p.showBB === 'boolean') setShowBB(p.showBB)
      if (typeof p.showRSI === 'boolean') setShowRSI(p.showRSI)
      if (typeof p.showMACD === 'boolean') setShowMACD(p.showMACD)
      if (typeof p.showATR === 'boolean') setShowATR(p.showATR)
      if (typeof p.showVWAP === 'boolean') setShowVWAP(p.showVWAP)
      if (typeof p.showSupertrend === 'boolean') setShowSupertrend(p.showSupertrend)
      if (typeof p.showVolume === 'boolean') setShowVolume(p.showVolume)
      if (typeof p.logScale === 'boolean') setLogScale(p.logScale)
      if (typeof p.showGrid === 'boolean') setShowGrid(p.showGrid)
      if (typeof p.showCrosshair === 'boolean') setShowCrosshair(p.showCrosshair)
      if (typeof p.pSMA20 === 'number') setPSMA20(p.pSMA20)
      if (typeof p.pSMA50 === 'number') setPSMA50(p.pSMA50)
      if (typeof p.pEMA20 === 'number') setPEMA20(p.pEMA20)
      if (typeof p.pRSI === 'number') setPRSI(p.pRSI)
      if (typeof p.pBBLen === 'number') setPBBLen(p.pBBLen)
      if (typeof p.pBBMult === 'number') setPBBMult(p.pBBMult)
      if (typeof p.pMACDfast === 'number') setPMACDFast(p.pMACDfast)
      if (typeof p.pMACDslow === 'number') setPMACDSlow(p.pMACDslow)
      if (typeof p.pMACDsig === 'number') setPMACDSig(p.pMACDsig)
      if (typeof p.pATR === 'number') setPATR(p.pATR)
      if (typeof p.tvLayout === 'boolean') setTvLayout(p.tvLayout)
      if (typeof p.separateVolume === 'boolean') setSeparateVolume(p.separateVolume)
      if (typeof p.macdH === 'number') setMacdH(p.macdH)
      if (typeof p.rsiH === 'number') setRsiH(p.rsiH)
      if (typeof p.volH === 'number') setVolH(p.volH)
      if (p.candleTheme) setCandleTheme(p.candleTheme)
    } catch {}
  }, [])

  // Simple SMA helper
  const sma = (values: number[], period: number) => {
    const out: (number | null)[] = []
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) { out.push(null); continue }
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) sum += values[j]
      out.push(sum / period)
    }
    return out
  }
  const ema = (values: number[], period: number) => {
    const out: (number | null)[] = []
    const k = 2 / (period + 1)
    let prev: number | undefined
    for (let i = 0; i < values.length; i++) {
      const v = values[i]
      if (i === 0) { out.push(null); prev = v; continue }
      if (i < period) { out.push(null); prev = v * k + (prev as number) * (1 - k); continue }
      prev = v * k + (prev as number) * (1 - k)
      out.push(prev)
    }
    return out
  }
  const bb = (values: number[], period = 20, mult = 2) => {
    const basis = sma(values, period)
    const upper: (number | null)[] = []
    const lower: (number | null)[] = []
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) { upper.push(null); lower.push(null); continue }
      const slice = values.slice(i - period + 1, i + 1)
      const mean = basis[i] as number
      const variance = slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period
      const sd = Math.sqrt(variance)
      upper.push(mean + mult * sd)
      lower.push(mean - mult * sd)
    }
    return { basis, upper, lower }
  }
  const rsi = (values: number[], period = 14) => {
    if (values.length < period + 1) return Array(values.length).fill(null)
    const out: (number | null)[] = []
    let gains = 0, losses = 0
    for (let i = 1; i <= period; i++) {
      const diff = values[i] - values[i - 1]
      if (diff >= 0) gains += diff; else losses -= diff
    }
    let avgGain = gains / period, avgLoss = losses / period
    out.push(...Array(period).fill(null))
    for (let i = period; i < values.length; i++) {
      if (i > period) {
        const diff = values[i] - values[i - 1]
        avgGain = ((avgGain * (period - 1)) + (diff > 0 ? diff : 0)) / period
        avgLoss = ((avgLoss * (period - 1)) + (diff < 0 ? -diff : 0)) / period
      }
      if (avgLoss === 0) { out.push(100); continue }
      const rs = avgGain / avgLoss
      out.push(100 - (100 / (1 + rs)))
    }
    return out
  }
  const macd = (values: number[], fast = 12, slow = 26, signal = 9) => {
    const emaFast = ema(values, fast)
    const emaSlow = ema(values, slow)
    const macdLine: (number | null)[] = values.map((_, i) => (emaFast[i] != null && emaSlow[i] != null) ? ((emaFast[i] as number) - (emaSlow[i] as number)) : null)
    const signalLine = ema(macdLine.map(v => v == null ? 0 : v), signal)
    const hist: (number | null)[] = macdLine.map((v, i) => (v != null && signalLine[i] != null) ? (v - (signalLine[i] as number)) : null)
    return { macdLine, signalLine, hist }
  }
  const atr = (bars: YahooBar[], period = 14) => {
    const trs: number[] = []
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i]
      if (i === 0) { trs.push(b.high - b.low); continue }
      const prevClose = bars[i-1].close
      const tr = Math.max(b.high - b.low, Math.abs(b.high - prevClose), Math.abs(b.low - prevClose))
      trs.push(tr)
    }
    return ema(trs, period)
  }
  const vwap = (bars: YahooBar[]) => {
    const out: (number | null)[] = []
    let cumPV = 0, cumV = 0
    for (let i = 0; i < bars.length; i++) {
      const tp = (bars[i].high + bars[i].low + bars[i].close) / 3
      const v = bars[i].volume
      cumPV += tp * v; cumV += v
      out.push(cumV ? cumPV / cumV : null)
    }
    return out
  }
  const supertrend = (bars: YahooBar[], period = 10, mult = 3) => {
    if (bars.length === 0) return { line: [] as (number | null)[], dir: [] as (1 | -1 | null)[] }
    const atrVals = atr(bars, period)
    const hl2 = bars.map(b => (b.high + b.low) / 2)
    const upperBand = hl2.map((m, i) => (atrVals[i] != null ? m + (atrVals[i] as number) * mult : null))
    const lowerBand = hl2.map((m, i) => (atrVals[i] != null ? m - (atrVals[i] as number) * mult : null))
    const st: (number | null)[] = []
    const dir: (1 | -1 | null)[] = []
    for (let i = 0; i < bars.length; i++) {
      if (i === 0 || atrVals[i] == null) { st.push(null); dir.push(null); continue }
      if (st[i-1] == null || dir[i-1] == null) { st.push(upperBand[i]); dir.push(1); continue }
      let currDir = dir[i-1]
      let currST = st[i-1]
      const prevST = st[i-1] as number
      const prevDir = dir[i-1] as 1 | -1
      // adjust bands
      const ub = Math.min(upperBand[i] as number, prevST)
      const lb = Math.max(lowerBand[i] as number, prevST)
      // trend flips
      if (prevDir === 1) {
        if (bars[i].close < lb) { currDir = -1; currST = ub }
        else { currDir = 1; currST = Math.max(lb, prevST) }
      } else {
        if (bars[i].close > ub) { currDir = 1; currST = lb }
        else { currDir = -1; currST = Math.min(ub, prevST) }
      }
      st.push(currST)
      dir.push(currDir)
    }
    return { line: st, dir }
  }

  // Fetch bars for current symbol/range (use yahoo-history endpoint that returns bars)
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true); setError(null)
      try {
        const qs = new URLSearchParams({ symbol, range, interval: effectiveInterval })
        const res = await fetch(`/api/yahoo-history?${qs.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const b: YahooBar[] = json?.bars || json?.data?.bars || json?.data || []
        if (alive) setBars(Array.isArray(b) ? b : [])
      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to load data')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [symbol, range, effectiveInterval])

  // Fetch compare histories when compareSymbols change
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (!compareSymbols.length) { if (alive) setCompareData([]); return }
        const qs = new URLSearchParams({ symbols: compareSymbols.join(','), range, interval: effectiveInterval })
        const res = await fetch(`/api/yahoo-history?${qs.toString()}`)
        if (!res.ok) throw new Error('compare http')
        const js = await res.json()
        const arr: YahooHistory[] = js?.data || []
        if (alive) setCompareData(Array.isArray(arr) ? arr : [])
      } catch {
        if (alive) setCompareData([])
      }
    })()
    return () => { alive = false }
  }, [compareSymbols, range, effectiveInterval])

  // Derived arrays for plotting
  const x = useMemo(() => bars.map(b => new Date(b.time)), [bars])
  const opens = useMemo(() => bars.map(b => b.open), [bars])
  const highs = useMemo(() => bars.map(b => b.high), [bars])
  const lows = useMemo(() => bars.map(b => b.low), [bars])
  const closes = useMemo(() => bars.map(b => b.close), [bars])
  const volumes = useMemo(() => bars.map(b => b.volume), [bars])

  // Heikin-Ashi transform
  const heikin = useMemo(() => {
    if (!bars.length) return null as null | { haOpen: number[]; haHigh: number[]; haLow: number[]; haClose: number[] }
    const haOpen: number[] = []
    const haClose: number[] = []
    const haHigh: number[] = []
    const haLow: number[] = []
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i]
      const c = (b.open + b.high + b.low + b.close) / 4
      const o = i === 0 ? (b.open + b.close) / 2 : (haOpen[i-1] + haClose[i-1]) / 2
      const h = Math.max(b.high, o, c)
      const l = Math.min(b.low, o, c)
      haOpen.push(o); haClose.push(c); haHigh.push(h); haLow.push(l)
    }
    return { haOpen, haHigh, haLow, haClose }
  }, [bars])

  // Compute indicators
  const sma20 = useMemo(() => showSMA20 ? sma(closes, pSMA20) : [], [closes, showSMA20, pSMA20])
  const sma50 = useMemo(() => showSMA50 ? sma(closes, pSMA50) : [], [closes, showSMA50, pSMA50])
  const ema20 = useMemo(() => showEMA20 ? ema(closes, pEMA20) : [], [closes, showEMA20, pEMA20])
  // Bollinger Bands (upper/lower) already via bb(); extend with middle (basis) for plotting & signals.
  const bb20 = useMemo(() => showBB ? bb(closes, pBBLen, pBBMult) : null, [closes, showBB, pBBLen, pBBMult])
  const bbMiddle = useMemo(() => {
    if (!showBB) return [] as (number|null)[]
    // middle = SMA(length) matching Pine basis; reuse sma helper
    return sma(closes, pBBLen)
  }, [closes, showBB, pBBLen])
  // Buy/Sell signals translated from Pine logic:
  // buy when lower band crosses over price => previous lower < prevClose AND current lower > currentClose? Actually Pine: ta.crossover(lower, src)
  // ta.crossover(a,b) => a[1] < b[1] and a >= b. For lower vs price, we detect band moving up through price. Provide markers at bar index where condition holds.
  // Translate Pine logic:
  //   buyCondition = ta.crossover(lower, close)
  //   sellCondition = ta.crossover(close, upper)
  // We replicate crossover(a,b) => a[1] < b[1] && a >= b using previous vs current band/price.
  const bbSignals = useMemo(() => {
    if (!showBB || !bb20) return { buyIdx: [] as number[], sellIdx: [] as number[] }
    const buyIdx: number[] = []
    const sellIdx: number[] = []
    for (let i = 1; i < closes.length; i++) {
      const prevLower = bb20.lower[i-1]
      const currLower = bb20.lower[i]
      const prevClose = closes[i-1]
      const currClose = closes[i]
      const prevUpper = bb20.upper[i-1]
      const currUpper = bb20.upper[i]
      // crossover(lower, close)
      if (prevLower != null && currLower != null && prevClose != null && currClose != null) {
        if ((prevLower < prevClose) && (currLower >= currClose)) buyIdx.push(i)
      }
      // crossover(close, upper)
      if (prevUpper != null && currUpper != null && prevClose != null && currClose != null) {
        if ((prevClose < prevUpper) && (currClose >= currUpper)) sellIdx.push(i)
      }
    }
    return { buyIdx, sellIdx }
  }, [showBB, bb20, closes])
  const rsi14 = useMemo(() => showRSI ? rsi(closes, pRSI) : [], [closes, showRSI, pRSI])
  const macdVals = useMemo(() => showMACD ? macd(closes, pMACDfast, pMACDslow, pMACDsig) : null, [closes, showMACD, pMACDfast, pMACDslow, pMACDsig])
  const atrVals = useMemo(() => showATR ? atr(bars, pATR) : [], [bars, showATR, pATR])
  const vwapVals = useMemo(() => showVWAP ? vwap(bars) : [], [bars, showVWAP])
  const stVals = useMemo(() => showSupertrend ? supertrend(bars, pSTLen, pSTMult) : null, [bars, showSupertrend, pSTLen, pSTMult])
  // Hydrate/sync regime from localStorage and cross-window events
  useEffect(() => {
    try {
      const ls = localStorage.getItem('mic_regime') as RegimeKey | null
      if (ls && ls !== regime) setRegime(ls as RegimeKey)
    } catch {}
    const onSet = (e: any) => {
      const val = e?.detail as RegimeKey
      if (!val) return
      const valid = Object.prototype.hasOwnProperty.call(REGIME_LABEL, val)
      if (valid && val !== regime) setRegime(val)
    }
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'mic_regime' && ev.newValue) {
        const v = ev.newValue as RegimeKey
        const valid = Object.prototype.hasOwnProperty.call(REGIME_LABEL, v)
        if (valid && v !== regime) setRegime(v)
      }
    }
    window.addEventListener('mic:setRegime', onSet as any)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('mic:setRegime', onSet as any)
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  useEffect(() => {
    try { localStorage.setItem('mic_regime', regime) } catch {}
  }, [regime])

  // AI Entry/Exit probability engine (heuristic, offline)
  const aiSignal = useMemo(() => {
    if (!bars.length) return null as null | { entry: number; exit: number; reasons: string[] }
    const n = bars.length
    const c = closes[n-1]
    const cPrev = n>1 ? closes[n-2] : c
    const s20Arr = sma(closes, 20)
    const s50Arr = sma(closes, 50)
    const s200Arr = sma(closes, 200)
    const s20 = (s20Arr[n-1] as number) || c
    const s50 = (s50Arr[n-1] as number) || c
    const s200 = (s200Arr[n-1] as number) || c
    const rsiArr = rsi(closes, 14)
    const r = (rsiArr[n-1] as number) || 50
    const atrArr = atr(bars, 14)
    const atrVal = (atrArr[n-1] as number) || Math.max(1e-6, Math.abs(c - cPrev))
    const atrPct = atrVal / Math.max(1e-6, c)
    const roc10 = n>10 ? (c / closes[n-11] - 1) : 0
    const max20 = Math.max(...closes.slice(Math.max(0, n-20)))
    const max50 = Math.max(...closes.slice(Math.max(0, n-50)))
    const breakout20 = (c - max20) / Math.max(1e-6, max20)
    const drawdown50 = (c - max50) / Math.max(1e-6, max50) // negative when below highs

    const clamp = (v:number, a= -1, b= 1)=> Math.max(a, Math.min(b, v))
    const tanh = (v:number)=> Math.tanh(v)
    // Features mapped to [-1,1]
    const fTrend = clamp(tanh(((c - s50) / Math.max(1e-6, 0.02 * c))))
    const fMom = clamp(tanh(roc10 / 0.05))
    const pref = (val:number, center:number, halfWidth:number) => clamp(1 - Math.min(1, Math.abs((val - center) / Math.max(1e-6, halfWidth))) ) * 2 - 1
    const fRSITrend = pref(r, 55, 20)  // prefer RSI near 55 for trend continuation
    const fRSIRev = pref(r, 30, 20)    // prefer RSI near 30 for mean-reversion longs
    const fVolModerate = pref(atrPct, 0.02, 0.02)
    const fBreakout = clamp(tanh(breakout20 / 0.01))
    const fDD = clamp(tanh((-drawdown50) / 0.12)) // deeper DD -> higher score for bounce
    const fATRRising = clamp(tanh(((atrArr[n-1] || 0) - (atrArr[Math.max(0,n-6)] || 0)) / Math.max(1e-6, 0.005 * c)))

    // Regime weights
    const W: Record<RegimeKey, [number, number, number, number, number, number, number]> = {
      //            trend  mom   rsiT  rsiR  volMod brkOut  dd
      goldilocks:    [0.40, 0.30, 0.20, 0.05, 0.05, 0.10, 0.00],
      disinflation:  [0.35, 0.25, 0.20, 0.10, 0.10, 0.05, 0.00],
      reflation:     [0.20, 0.30, 0.10, 0.05, 0.05, 0.25, 0.05],
      recession:     [0.05, 0.05, 0.05, 0.45, 0.10, 0.00, 0.30],
      stagflation:   [-0.10,0.05, -0.05,0.40, 0.20, 0.05, 0.20],
      deflation:     [-0.05,0.00, -0.10,0.35, 0.15, 0.00, 0.30],
      dollarWeakness:[0.20, 0.25, 0.10, 0.10, 0.10, 0.20, 0.05],
    }
    const w = W[regime]
    const entryScore = clamp(
      w[0]*fTrend + w[1]*fMom + w[2]*fRSITrend + w[3]*fRSIRev + w[4]*fVolModerate + w[5]*fBreakout + w[6]*fDD + 0.1*fATRRising
    )
    const toProb = (s:number)=> Math.round(((s + 1) / 2) * 100)
    // Exit score emphasizes overbought/extension and trend exhaustion
    const fOverbought = pref(r, 75, 15)
    const devFromS20 = (c - s20) / Math.max(1e-6, atrVal * 2)
    const fExtension = clamp(tanh(devFromS20))
    const fTrendExhaust = clamp(-fTrend)
    const exitScore = clamp(0.5*fOverbought + 0.3*fExtension + 0.2*fTrendExhaust)
    const entry = Math.max(1, Math.min(99, toProb(entryScore)))
    const exit = Math.max(1, Math.min(99, toProb(exitScore)))

    const reasons: string[] = []
    if (fTrend > 0.3) reasons.push('Trend above 50-day')
    if (fMom > 0.3) reasons.push('Momentum positive')
    if (fRSIRev > 0.3) reasons.push('RSI near oversold bounce zone')
    if (fBreakout > 0.3) reasons.push('Near 20-day high (breakout)')
    if (fDD > 0.3) reasons.push('Deep pullback vs 50-day high')
    if (fOverbought > 0.4) reasons.push('RSI elevated (exit risk)')
    if (fExtension > 0.4) reasons.push('Price extended vs 20-day')

    return { entry, exit, reasons }
  }, [bars, closes, regime])

  // Persist AI signal for other pages (e.g., AI Portfolio) and broadcast
  useEffect(() => {
    try {
      if (aiSignal) {
        const payload = { symbol, regime, entry: aiSignal.entry, exit: aiSignal.exit, ts: Date.now() }
        localStorage.setItem('mic_ai', JSON.stringify(payload))
        window.dispatchEvent(new CustomEvent('mic:aiSignal', { detail: payload }))
      }
    } catch {}
  }, [aiSignal, regime, symbol])

  // Volume Profile (horizontal histogram along price axis)
  const volProfile = useMemo(() => {
    if (!showVolProfile || !bars.length) return null as null | { centers: number[]; counts: number[] }
    const minP = Math.min(...lows)
    const maxP = Math.max(...highs)
    if (!isFinite(minP) || !isFinite(maxP) || maxP <= minP) return null
    const bins = 24
    const step = (maxP - minP) / bins
    const counts = new Array(bins).fill(0)
    const centers = new Array(bins).fill(0).map((_, i) => minP + (i + 0.5) * step)
    for (let i = 0; i < bars.length; i++) {
      const tp = (bars[i].high + bars[i].low + bars[i].close) / 3
      let idx = Math.floor((tp - minP) / step)
      if (idx < 0) idx = 0
      if (idx >= bins) idx = bins - 1
      counts[idx] += bars[i].volume
    }
    return { centers, counts }
  }, [showVolProfile, bars, highs, lows])

  const volProfileTrace = useMemo(() => {
    if (!volProfile) return null
    return {
      type: 'bar',
      orientation: 'h',
      x: volProfile.counts,
      y: volProfile.centers,
      xaxis: 'x2',
      yaxis: 'y',
      marker: { color: 'rgba(148,163,184,0.35)' },
      hovertemplate: 'Price: %{y:.2f}<br>Vol: %{x:,}<extra></extra>',
      cliponaxis: false,
      showlegend: false,
    } as any
  }, [volProfile])

  // Price trace
  const priceTrace = useMemo(() => {
    if (chartType === 'line') {
      return {
        type: 'scatter',
        mode: 'lines',
        x,
        y: closes,
        line: { color: Palette.bullAlt, width: 2 },
        hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>Close: %{y:.2f}<extra></extra>',
      }
    }
    if (chartType === 'area') {
      return {
        type: 'scatter',
        mode: 'lines',
        x,
        y: closes,
        line: { color: '#60a5fa', width: 1.6 },
        fill: 'tozeroy',
        fillcolor: 'rgba(96,165,250,0.15)',
        hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>Close: %{y:.2f}<extra></extra>',
      }
    }
    if (chartType === 'ohlc') {
      return {
        type: 'ohlc',
        x,
        open: opens,
        high: highs,
        low: lows,
        close: closes,
        increasing: { line: { color: themeColors.upLine } },
        decreasing: { line: { color: themeColors.downLine } },
        hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>O:%{open:.2f} H:%{high:.2f} L:%{low:.2f} C:%{close:.2f}<extra></extra>',
      }
    }
    const o = chartType === 'heikin' && heikin ? heikin.haOpen : opens
    const h = chartType === 'heikin' && heikin ? heikin.haHigh : highs
    const l = chartType === 'heikin' && heikin ? heikin.haLow : lows
    const c = chartType === 'heikin' && heikin ? heikin.haClose : closes
    return {
      type: 'candlestick',
      x,
      open: o,
      high: h,
      low: l,
      close: c,
      increasing: { line: { color: themeColors.upLine }, fillcolor: themeColors.upFill },
      decreasing: { line: { color: themeColors.downLine }, fillcolor: themeColors.downFill },
      hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>O:%{open:.2f} H:%{high:.2f} L:%{low:.2f} C:%{close:.2f}<extra></extra>',
    }
  }, [chartType, x, closes, opens, highs, lows, heikin, themeColors])

  // Compare traces (normalized to 100)
  const compareTraces: any[] = useMemo(() => {
    if (!compareData.length) return []
    const t: any[] = []
    compareData.forEach((h, idx) => {
      if (!h.bars?.length) return
      // align by time with main bars if possible
      const baseT = x.length ? +x[0] : (h.bars[0]?.time || 0)
      const series = h.bars.filter(b => (!x.length) || (b.time >= baseT))
      if (!series.length) return
      const first = series[0].close
      const xs = series.map(b => new Date(b.time))
      const ys = series.map(b => (b.close / first) * 100)
      t.push({ type: 'scatter', mode: 'lines', x: xs, y: ys, name: h.symbol, yaxis: 'y', line: { width: 1.6, color: COMPARE_COLORS[idx % COMPARE_COLORS.length] } })
    })
    return t
  }, [compareData, x])

  // Volume colored by up/down
  const volTrace = useMemo(() => {
    if (!showVolume) return null
    const colors = bars.map((b) => (b.close >= b.open) ? 'rgba(22,163,74,0.45)' : 'rgba(239,68,68,0.45)')
  return { type: 'bar', x, y: volumes, name: 'Volume', yaxis: separateVolume ? 'y5' : 'y2', marker: { color: colors }, hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>Vol: %{y:,}<extra></extra>' }
  }, [showVolume, separateVolume, bars, x, volumes])

  // Aggregate traces
  const traces: any[] = useMemo(() => {
    const t: any[] = []
    if (volProfileTrace) t.push(volProfileTrace)
    t.push(priceTrace, ...compareTraces)
    if (volTrace) t.push(volTrace)
    if (showSMA20) t.push({ type: 'scatter', mode: 'lines', x, y: sma20, line: { color: '#60a5fa', width: 1.8 }, name: `SMA ${pSMA20}`, yaxis: 'y' })
    if (showSMA50) t.push({ type: 'scatter', mode: 'lines', x, y: sma50, line: { color: '#a78bfa', width: 1.8 }, name: `SMA ${pSMA50}`, yaxis: 'y' })
    if (showEMA20) t.push({ type: 'scatter', mode: 'lines', x, y: ema20, line: { color: Palette.warning, width: 1.6, dash: 'dot' }, name: `EMA ${pEMA20}`, yaxis: 'y' })
    if (showBB && bb20) {
      // Upper & Lower with shaded fill plus middle line
      t.push({ type: 'scatter', mode: 'lines', x, y: bb20.upper, line: { color: Palette.neutral, width: 1 }, name: 'BB Upper', yaxis: 'y', hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>BB Upper: %{y:.2f}<extra></extra>' })
      t.push({ type: 'scatter', mode: 'lines', x, y: bb20.lower, line: { color: Palette.neutral, width: 1 }, name: 'BB Lower', yaxis: 'y', fill: 'tonexty', fillcolor: 'rgba(148,163,184,0.08)', hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>BB Lower: %{y:.2f}<extra></extra>' })
      t.push({ type: 'scatter', mode: 'lines', x, y: bbMiddle, line: { color: '#2962FF', width: 1, dash: 'dot' }, name: 'BB Middle', yaxis: 'y', hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>BB Mid: %{y:.2f}<extra></extra>' })
      // Buy/Sell markers (labels) akin to Pine plotshape labelup/labeldown
      if (bbSignals.buyIdx.length) {
        const xs = bbSignals.buyIdx.map(i => x[i])
        const ys = bbSignals.buyIdx.map(i => closes[i])
        t.push({ type: 'scatter', mode: 'markers+text', x: xs, y: ys, text: bbSignals.buyIdx.map(()=> 'BUY'), textposition: 'bottom center', marker: { symbol: 'triangle-up', size: 10, color: 'rgba(34,197,94,0.9)', line: { color: '#064e3b', width: 1 } }, name: 'BB Buy', yaxis: 'y', hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>Buy %{y:.2f}<extra></extra>' })
      }
      if (bbSignals.sellIdx.length) {
        const xs = bbSignals.sellIdx.map(i => x[i])
        const ys = bbSignals.sellIdx.map(i => closes[i])
        t.push({ type: 'scatter', mode: 'markers+text', x: xs, y: ys, text: bbSignals.sellIdx.map(()=> 'SELL'), textposition: 'top center', marker: { symbol: 'triangle-down', size: 10, color: 'rgba(239,68,68,0.9)', line: { color: '#7f1d1d', width: 1 } }, name: 'BB Sell', yaxis: 'y', hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>Sell %{y:.2f}<extra></extra>' })
      }
    }
    if (showRSI) t.push({ type: 'scatter', mode: 'lines', x, y: rsi14, line: { color: Palette.bullAlt, width: 1.6 }, name: `RSI ${pRSI}`, yaxis: 'y3', hovertemplate: '%{x|%Y-%m-%d %H:%M}<br>RSI: %{y:.1f}<extra></extra>' })
    if (showSupertrend && stVals) {
      const lineColors = stVals.dir?.map(d => d === 1 ? Palette.bull : d === -1 ? Palette.bearAlt : Palette.neutral)
      t.push({ type: 'scatter', mode: 'lines', x, y: stVals.line, line: { color: Palette.neutral, width: 1.4 }, marker: { color: lineColors }, name: `Supertrend ${pSTLen}x${pSTMult}`, yaxis: 'y' })
    }
    if (showMACD && macdVals) {
      t.push({ type: 'scatter', mode: 'lines', x, y: macdVals.macdLine, line: { color: Palette.primary, width: 1.5 }, name: 'MACD', yaxis: 'y4' })
      t.push({ type: 'scatter', mode: 'lines', x, y: macdVals.signalLine, line: { color: Palette.caution, width: 1.2 }, name: 'Signal', yaxis: 'y4' })
      t.push({ type: 'bar', x, y: macdVals.hist, marker: { color: macdVals.hist.map(h => (h||0) >= 0 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)') }, name: 'Hist', yaxis: 'y4' })
    }
    if (showATR) t.push({ type: 'scatter', mode: 'lines', x, y: atrVals, line: { color: '#f97316', width: 1.2 }, name: `ATR ${pATR}`, yaxis: showMACD || showRSI ? 'y4' : 'y3' })
    if (showVWAP) t.push({ type: 'scatter', mode: 'lines', x, y: vwapVals, line: { color: '#22d3ee', width: 1.4, dash: 'dash' }, name: 'VWAP', yaxis: 'y' })
    return t
  }, [volProfileTrace, priceTrace, compareTraces, volTrace, showSMA20, x, sma20, pSMA20, showSMA50, sma50, pSMA50, showEMA20, ema20, pEMA20, showBB, bb20, bbMiddle, bbSignals, showRSI, rsi14, pRSI, showMACD, macdVals, showATR, atrVals, pATR, showVWAP, vwapVals, showSupertrend, stVals, pSTLen, pSTMult])

  // Layout
  const anyLower = showRSI || showMACD || showATR || (showVolume && separateVolume)
  const layout: any = useMemo(() => {
    // Compute domains (TV-style when enabled)
    const leftDomain = showVolProfile ? 0.12 : 0
    let priceTop = 1
    let macdTop = 0
    let rsiTop = 0
    let volTop = 0
    if (tvLayout) {
      const mH = (showMACD || showATR) ? macdH : 0
      const rH = showRSI ? rsiH : 0
      const vH = (showVolume && separateVolume) ? volH : 0
      const totalLower = Math.min(0.9, mH + rH + vH)
      const base = 1 - totalLower
      priceTop = 1
      // stack from bottom: volume, rsi, macd
      volTop = vH > 0 ? (vH) : 0
      rsiTop = volTop + rH
      macdTop = rsiTop + mH
      // convert to domains [start,end]
      // yaxis: [base,1], y4 (MACD): [base + rsiTop, base + macdTop]
      // y3 (RSI): [base + volTop, base + rsiTop]
      // y5 (VOL): [base, base + volTop]
      const yDomain: [number, number] = [base, 1]
      const y4Domain: [number, number] = mH > 0 ? [base + rsiTop, base + macdTop] : [0, 0]
      const y3Domain: [number, number] = rH > 0 ? [base + volTop, base + rsiTop] : [0, 0]
      const y5Domain: [number, number] = vH > 0 ? [base, base + volTop] : [0, 0]
      const baseShapes = showRSI ? [
        { type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y3', y0: 70, y1: 70, line: { color: Palette.bearAlt, width: 1, dash: 'dot' } },
        { type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y3', y0: 30, y1: 30, line: { color: Palette.bull, width: 1, dash: 'dot' } }
      ] : []
      return {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 55, r: 30, t: 10, b: 30 },
        showlegend: false,
        xaxis: { gridcolor: 'rgba(148,163,184,0.2)', color: '#cbd5e1', domain: [leftDomain, 1], anchor: 'y', showspikes: showCrosshair, spikemode: 'across', spikesnap: 'cursor', spikedash: 'dot', spikethickness: 1, spikecolor: '#94a3b8' },
        ...(showVolProfile ? { xaxis2: { domain: [0, Math.max(0.01, leftDomain - 0.01)], anchor: 'y', showgrid: false, zeroline: false, showticklabels: false, fixedrange: true, color: '#94a3b8' } } : {}),
        yaxis: { gridcolor: 'rgba(148,163,184,0.2)', color: '#cbd5e1', domain: yDomain, type: logScale ? 'log' : 'linear', side: 'right' },
        yaxis2: { overlaying: 'y', side: 'left', showgrid: false, color: '#94a3b8', title: '', visible: showVolume && !separateVolume },
        yaxis3: { domain: y3Domain, color: '#cbd5e1', range: [0, 100], showgrid: showRSI, gridcolor: 'rgba(148,163,184,0.2)', visible: showRSI },
        yaxis4: { domain: y4Domain, color: '#cbd5e1', showgrid: showMACD || showATR, gridcolor: 'rgba(148,163,184,0.2)', visible: showMACD || showATR },
  yaxis5: { domain: y5Domain, color: '#94a3b8', showgrid: true, gridcolor: 'rgba(148,163,184,0.2)', visible: showVolume && separateVolume },
  hovermode: 'x',
  uirevision: 'mic',
  dragmode: 'pan',
        shapes: [...baseShapes, ...customShapes],
        annotations: customAnnotations
      }
    }
    // compact layout (existing behavior with small adjustments)
    const baseShapes = showRSI ? [
      { type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y3', y0: 70, y1: 70, line: { color: Palette.bearAlt, width: 1, dash: 'dot' } },
      { type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y3', y0: 30, y1: 30, line: { color: Palette.bull, width: 1, dash: 'dot' } }
    ] : []
    return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { l: 55, r: 30, t: 10, b: 30 },
    showlegend: false,
      xaxis: { gridcolor: showGrid ? 'rgba(148,163,184,0.2)' : 'rgba(0,0,0,0)', color: '#cbd5e1', domain: [leftDomain, 1], anchor: 'y', showspikes: showCrosshair, spikemode: 'across', spikesnap: 'cursor', spikedash: 'dot', spikethickness: 1, spikecolor: '#94a3b8' },
      ...(showVolProfile ? { xaxis2: { domain: [0, Math.max(0.01, leftDomain - 0.01)], anchor: 'y', showgrid: false, zeroline: false, showticklabels: false, fixedrange: true, color: '#94a3b8' } } : {}),
      yaxis: { gridcolor: showGrid ? 'rgba(148,163,184,0.2)' : 'rgba(0,0,0,0)', color: '#cbd5e1', domain: anyLower ? [0.46, 1] : [0, 1], type: logScale ? 'log' : 'linear', side: 'right' },
      yaxis2: { overlaying: 'y', side: 'left', showgrid: false, color: '#94a3b8', title: '', visible: showVolume && !separateVolume },
      yaxis3: { domain: anyLower ? [0, 0.2] : [0, 0], color: '#cbd5e1', range: [0, 100], showgrid: showRSI && showGrid, gridcolor: showGrid ? 'rgba(148,163,184,0.2)' : 'rgba(0,0,0,0)', visible: showRSI },
      yaxis4: { domain: anyLower ? [0.22, 0.44] : [0, 0], color: '#cbd5e1', showgrid: (showMACD || showATR) && showGrid, gridcolor: showGrid ? 'rgba(148,163,184,0.2)' : 'rgba(0,0,0,0)', visible: showMACD || showATR },
      yaxis5: { domain: [0, 0], visible: false },
      hovermode: 'x',
      uirevision: 'mic',
      dragmode: 'pan',
      shapes: [...baseShapes, ...customShapes],
      annotations: customAnnotations
    }
  }, [tvLayout, anyLower, logScale, showRSI, showMACD, showATR, showVolume, separateVolume, macdH, rsiH, volH, customShapes, customAnnotations, showGrid, showCrosshair, showVolProfile])

  // Update custom shapes after user drags them (Plotly relayout)
  const handleRelayout = useCallback((e: any) => {
    if (!e) return
    const keys = Object.keys(e)
    if (!keys.some(k => k.startsWith('shapes['))) return
    const baseCount = showRSI ? 2 : 0 // we add 2 RSI guide lines when RSI is visible
    const updates: Array<{ gid: string; lvl: number; y: number }> = []
    setCustomShapes(prev => {
      const next = prev.map(s => ({ ...s }))
      keys.forEach(k => {
        const m = k.match(/^shapes\[(\d+)\]\.(x0|x1|y0|y1)$/)
        if (!m) return
        const idx = parseInt(m[1], 10)
        const field = m[2] as 'x0' | 'x1' | 'y0' | 'y1'
        const ci = idx - baseCount
        if (ci >= 0 && ci < next.length) {
          ;(next[ci] as any)[field] = e[k]
          // If this is a fib line, also prepare annotation update
          const sh: any = next[ci]
          if (field.startsWith('y') && sh?.micFib && sh?.micFibGroupId != null && sh?.micLevel != null) {
            updates.push({ gid: String(sh.micFibGroupId), lvl: Number(sh.micLevel), y: Number(e[k]) })
          }
        }
      })
      return next
    })
    if (updates.length) {
      const latest: Record<string, number> = {}
      updates.forEach(u => { latest[`${u.gid}:${u.lvl}`] = u.y })
      setCustomAnnotations(prev => prev.map((a: any) => {
        if (a?.micFib && a?.micFibGroupId != null && a?.micLevel != null) {
          const key = `${a.micFibGroupId}:${a.micLevel}`
          const y = latest[key]
          if (y != null) {
            return { ...a, y, text: `${(Number(a.micLevel)*100).toFixed(1)}%  ${y.toFixed(2)}` }
          }
        }
        return a
      }))
    }
  }, [showRSI])

  // Simple technical score (-5..+5) for quick sentiment
  const techScore = useMemo(() => {
    if (!bars.length) return 0
    const i = closes.length - 1
    let s = 0
    const sm20 = sma(closes, pSMA20)
    const sm50 = sma(closes, pSMA50)
    const c = closes[i]
    const s20 = (sm20[i] as number) || null
    const s50 = (sm50[i] as number) || null
    if (s20 && c > s20) s += 1
    if (s50 && c > s50) s += 1
    const rArr = rsi(closes, pRSI)
    const r = (rArr[i] as number) || null
    if (r != null) {
      if (r >= 70) s += 2
      else if (r >= 60) s += 1
      else if (r <= 30) s -= 2
      else if (r <= 40) s -= 1
    }
    const m = macd(closes, pMACDfast, pMACDslow, pMACDsig)
    if (m.macdLine[i] != null && m.signalLine[i] != null) {
      if ((m.macdLine[i] as number) > (m.signalLine[i] as number)) s += 1
      if ((m.hist[i] || 0) > 0) s += 1
    }
    if (stVals && stVals.dir[i] === 1) s += 1
    else if (stVals && stVals.dir[i] === -1) s -= 1
    return Math.max(-5, Math.min(5, s))
  }, [bars, closes, pSMA20, pSMA50, pRSI, pMACDfast, pMACDslow, pMACDsig, stVals])

  // Handlers
  const applySymbol = (v: string) => {
    if (!v) return
  // Save drawings for current symbol before switching
  try { localStorage.setItem(drawingsKeyFor(symbol), JSON.stringify({ shapes: customShapes, annotations: customAnnotations })) } catch {}
    setSymbol(v.toUpperCase())
    setInputValue(v.toUpperCase())
    setShowSuggest(false)
  }
  const onKeyDownInput: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); suggestIndex.current = Math.min(suggestIndex.current + 1, suggestions.length - 1); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); suggestIndex.current = Math.max(suggestIndex.current - 1, 0); return }
    if (e.key === 'Enter') {
      const v = (e.target as HTMLInputElement).value.trim() || suggestions[suggestIndex.current]
      if (v) applySymbol(v)
    }
  }

  const addCompare = () => {
    const v = compareInput.trim().toUpperCase()
    if (!v) return
    if (v === symbol) { setCompareInput(''); return }
    if (compareSymbols.includes(v)) { setCompareInput(''); return }
    setCompareSymbols(prev => [...prev, v])
    setCompareInput('')
  }
  const removeCompare = (s: string) => setCompareSymbols(prev => prev.filter(x => x !== s))

  return (
  <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-4 ${className}`}>
      {/* Top bar: symbol, toolbar menus */}
  <div className="flex flex-wrap items-center gap-3 mb-3">
        {/* Search / Symbol */}
        <div className="relative flex-1 min-w-[280px]">
          <input
            aria-label="Asset symbol"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setShowSuggest(true); suggestIndex.current = -1 }}
            onKeyDown={onKeyDownInput}
            onBlur={() => setTimeout(() => setShowSuggest(false), 120)}
            placeholder="Company or stock symbol…"
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-4 py-2 pr-10"
          />
          {showSuggest && suggestions.length > 0 && (
            <div className="absolute left-0 top-10 z-10 bg-gray-800 border border-gray-700 rounded w-full shadow-xl max-h-64 overflow-auto">
              {suggestions.map((s, i) => (
                <button key={s} onMouseDown={(e)=>{ e.preventDefault(); applySymbol(s) }} className={`w-full text-left px-3 py-1.5 text-sm ${i===suggestIndex.current ? 'bg-gray-700' : 'hover:bg-gray-700'}`}>
                  <span className="text-gray-100">{s}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Views */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md overflow-hidden border border-gray-600">
            {(['line','area','candlestick','heikin','ohlc'] as ChartType[]).map(t=> (
              <button
                key={t}
                onClick={()=>setChartType(t)}
                className={`px-2 py-1.5 text-xs ${chartType===t? 'bg-blue-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                aria-pressed={chartType===t}
                aria-label={`Set chart type ${t}`}
              >
                {t==='candlestick' ? 'Candle' : t==='heikin' ? 'Heikin' : t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {/* Timeframe */}
        {!hideRangeToolbar && (
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md overflow-hidden border border-gray-600">
              {RANGE_PRESETS.map(r => (
                <button
                  key={r.key}
                  onClick={()=>{ setRangeKey(r.key as any); if (onRangeChange) onRangeChange(r.key as any) }}
                  className={`px-2 py-1.5 text-xs ${rangeKey===r.key?'bg-blue-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  {r.key}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Studies (consolidated controls) */}
        <div className="relative">
          <details className="group">
            <summary className="list-none cursor-pointer px-3 py-2 rounded-md border border-gray-600 bg-gray-700/70 text-gray-200 hover:bg-gray-600">Studies</summary>
            <div className="absolute right-0 mt-2 bg-gray-800 border border-gray-700 rounded shadow-2xl p-3 z-20 w-[640px] max-h-[70vh] overflow-auto">
              {/* Layout */}
              <div className="mb-3">
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Layout</div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-200">
                  <label className="inline-flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-blue-500" checked={tvLayout} onChange={(e)=>{ setTvLayout(e.target.checked); if (e.target.checked) setSeparateVolume(true) }} /> Layout a pannelli</label>
                  <label className={`inline-flex items-center gap-2 cursor-pointer ${tvLayout ? '' : 'opacity-50'}`} title={tvLayout ? '' : 'Abilita layout a pannelli'}>
                    <input type="checkbox" className="accent-blue-500" disabled={!tvLayout} checked={separateVolume} onChange={(e)=>setSeparateVolume(e.target.checked)} /> Volume in panel
                  </label>
                  {tvLayout && (
                    <div className="flex flex-wrap items-center gap-4 text-[12px]">
                      <div className="flex items-center gap-1">MACD/ATR <input type="range" min={0} max={0.4} step={0.02} value={macdH} onChange={(e)=>setMacdH(Number(e.target.value))} /> <span className="w-8 text-right">{Math.round(macdH*100)}%</span></div>
                      <div className="flex items-center gap-1">RSI <input type="range" min={0} max={0.4} step={0.02} value={rsiH} onChange={(e)=>setRsiH(Number(e.target.value))} /> <span className="w-8 text-right">{Math.round(rsiH*100)}%</span></div>
                      <div className="flex items-center gap-1">VOL <input type="range" min={0} max={0.4} step={0.02} value={volH} onChange={(e)=>setVolH(Number(e.target.value))} /> <span className="w-8 text-right">{Math.round(volH*100)}%</span></div>
                    </div>
                  )}
                </div>
              </div>

              <hr className="border-gray-700 my-2" />

              {/* Indicators */}
              <div className="mb-2">
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Indicators</div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-200">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showSMA20} onChange={e=>setShowSMA20(e.target.checked)} className="accent-blue-500" /> SMA {pSMA20}</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showSMA50} onChange={e=>setShowSMA50(e.target.checked)} className="accent-violet-500" /> SMA {pSMA50}</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showEMA20} onChange={e=>setShowEMA20(e.target.checked)} className="accent-amber-500" /> EMA {pEMA20}</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showBB} onChange={e=>setShowBB(e.target.checked)} className="accent-slate-400" /> Bollinger ({pBBLen},{pBBMult})</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showRSI} onChange={e=>setShowRSI(e.target.checked)} className="accent-green-500" /> RSI {pRSI}</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showMACD} onChange={e=>setShowMACD(e.target.checked)} className="accent-indigo-500" /> MACD</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showATR} onChange={e=>setShowATR(e.target.checked)} className="accent-orange-500" /> ATR {pATR}</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showVWAP} onChange={e=>setShowVWAP(e.target.checked)} className="accent-cyan-500" /> VWAP</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showVolume} onChange={e=>setShowVolume(e.target.checked)} className="accent-slate-400" /> Volume</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showSupertrend} onChange={e=>setShowSupertrend(e.target.checked)} className="accent-emerald-500" /> Supertrend</label>
                </div>
              </div>

              {/* Params */}
              <div className="mt-2">
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Params</div>
                <div className="flex flex-wrap items-center gap-3 text-[12px] text-gray-200">
                  <div className="flex items-center gap-1">SMA <input value={pSMA20} onChange={e=>setPSMA20(Math.max(2, Number(e.target.value)||20))} className="w-12 bg-gray-700 border border-gray-600 rounded px-1 py-0.5" /> / <input value={pSMA50} onChange={e=>setPSMA50(Math.max(2, Number(e.target.value)||50))} className="w-12 bg-gray-700 border border-gray-600 rounded px-1 py-0.5" /></div>
                  <div className="flex items-center gap-1">EMA <input value={pEMA20} onChange={e=>setPEMA20(Math.max(2, Number(e.target.value)||20))} className="w-12 bg-gray-700 border border-gray-600 rounded px-1 py-0.5" /></div>
                  <div className="flex items-center gap-1">BB <input value={pBBLen} onChange={e=>setPBBLen(Math.max(2, Number(e.target.value)||20))} className="w-12 bg-gray-700 border border-gray-600 rounded px-1 py-0.5" /> x <input value={pBBMult} onChange={e=>setPBBMult(Math.max(0.5, Number(e.target.value)||2))} className="w-12 bg-gray-700 border border-gray-600 rounded px-1 py-0.5" /></div>
                  <div className="flex items-center gap-1">RSI <input value={pRSI} onChange={e=>setPRSI(Math.max(2, Number(e.target.value)||14))} className="w-12 bg-gray-700 border border-gray-600 rounded px-1 py-0.5" /></div>
                  <div className="flex items-center gap-1">MACD <input value={pMACDfast} onChange={e=>setPMACDFast(Math.max(2, Number(e.target.value)||12))} className="w-12 bg-gray-700 border border-gray-600 rounded px-1 py-0.5" /> / <input value={pMACDslow} onChange={e=>setPMACDSlow(Math.max(3, Number(e.target.value)||26))} className="w-12 bg-gray-700 border border-gray-600 rounded px-1 py-0.5" /> / <input value={pMACDsig} onChange={e=>setPMACDSig(Math.max(2, Number(e.target.value)||9))} className="w-12 bg-gray-700 border border-gray-600 rounded px-1 py-0.5" /></div>
                  <div className="flex items-center gap-1">ATR <input value={pATR} onChange={e=>setPATR(Math.max(2, Number(e.target.value)||14))} className="w-12 bg-gray-700 border border-gray-600 rounded px-1 py-0.5" /></div>
                  <div className="flex items-center gap-1">ST <input value={pSTLen} onChange={e=>setPSTLen(Math.max(2, Number(e.target.value)||10))} className="w-12 bg-gray-700 border border-gray-600 rounded px-1 py-0.5" /> x <input value={pSTMult} onChange={e=>setPSTMult(Math.max(0.5, Number(e.target.value)||3))} className="w-12 bg-gray-700 border border-gray-600 rounded px-1 py-0.5" /></div>
                </div>
              </div>

              <hr className="border-gray-700 my-3" />

              {/* Analysis */}
              <div className="mb-2">
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Analysis</div>
                <div className="inline-flex rounded-md overflow-hidden border border-gray-600">
                  <button onClick={()=>{ setDrawMode('none'); setDrawAnchor(null) }} className={`px-2 py-1 text-sm ${drawMode==='none' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>None</button>
                  <button onClick={()=>{ setDrawMode('trend'); setDrawAnchor(null) }} className={`px-2 py-1 text-sm ${drawMode==='trend' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Trendline</button>
                  <button onClick={()=>{ setDrawMode('fib'); setDrawAnchor(null) }} className={`px-2 py-1 text-sm ${drawMode==='fib' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Fibonacci</button>
                </div>
                <button onClick={clearDrawings} className="ml-2 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-sm">Clear</button>
                <button onClick={undo} disabled={!undoStack.length} className={`ml-2 px-2 py-1 rounded border text-sm ${undoStack.length ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'}`}>Undo</button>
                <div className="mt-3 flex items-center gap-3 text-sm text-gray-200">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" className="accent-slate-400" checked={showVolProfile} onChange={e=>setShowVolProfile(e.target.checked)} /> Volume Profile</label>
                  <span className="text-xs text-gray-400">Score:</span>
                  <span className={`${techScore>=2?'bg-emerald-600/20 border-emerald-500/40 text-emerald-300': techScore<=-2?'bg-red-600/20 border-red-500/40 text-red-300':'bg-gray-700/40 border-gray-600 text-gray-200'} px-2 py-0.5 rounded text-xs border`}>{techScore > 0 ? `+${techScore}` : `${techScore}`}</span>
                </div>
                {/* AI Entry/Exit */}
                <div className="mt-3 p-3 rounded border border-gray-700 bg-gray-800/70">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs text-gray-400">Economic Regime</label>
                    <select value={regime} onChange={(e)=>setRegime(e.target.value as any)} className="bg-gray-700 border border-gray-600 text-white rounded-md px-2 py-1 text-sm">
                      {Object.entries(REGIME_LABEL).map(([k,lab])=> (
                        <option key={k} value={k}>{lab}</option>
                      ))}
                    </select>
                    <label className="inline-flex items-center gap-2 text-xs text-gray-300 ml-auto"><input type="checkbox" className="accent-blue-500" checked={showAIEntryExit} onChange={e=>setShowAIEntryExit(e.target.checked)} /> Show on chart</label>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="text-gray-300">Entry:</span>
                    <span className="px-2 py-0.5 rounded border text-xs" style={{borderColor:'#16a34a', color:'#86efac', background:'rgba(22,163,74,0.12)'}}>{aiSignal ? `${aiSignal.entry}%` : '-'}</span>
                    <span className="text-gray-300 ml-2">Exit:</span>
                    <span className="px-2 py-0.5 rounded border text-xs" style={{borderColor:'#ef4444', color:'#fca5a5', background:'rgba(239,68,68,0.12)'}}>{aiSignal ? `${aiSignal.exit}%` : '-'}</span>
                  </div>
                  {aiSignal?.reasons?.length ? (
                    <div className="mt-2 text-[11px] text-gray-400">
                      <div className="uppercase tracking-wide text-[10px] text-gray-500">Why</div>
                      <ul className="list-disc ml-4">
                        {aiSignal.reasons.slice(0,3).map((r,i)=> <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>

              <hr className="border-gray-700 my-3" />

              {/* Compare */}
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Compare</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                  {compareSymbols.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-700 border border-gray-600">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COMPARE_COLORS[compareSymbols.indexOf(s) % COMPARE_COLORS.length] }} />
                      {s}
                      <button aria-label={`Remove ${s}`} className="ml-1 text-gray-400 hover:text-gray-200" onClick={() => removeCompare(s)}>×</button>
                    </span>
                  ))}
                  <input value={compareInput} onChange={(e)=>setCompareInput(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') addCompare() }} placeholder="Add symbol…" className="bg-gray-700 border border-gray-600 text-white rounded-md px-2 py-1" />
                  <button onClick={addCompare} className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600">Add</button>
                </div>
              </div>
            </div>
          </details>
        </div>
  {/* Events removed per request */}
  {/* Download removed per request */}
        {/* Settings */}
        <div className="relative">
          <details className="group">
            <summary className="list-none cursor-pointer px-3 py-2 rounded-md border border-gray-600 bg-gray-700/70 text-gray-200 hover:bg-gray-600">Settings</summary>
            <div className="absolute right-0 mt-2 bg-gray-800 border border-gray-700 rounded shadow-lg p-3 z-20 w-60 space-y-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-200"><input type="checkbox" checked={logScale} onChange={e=>setLogScale(e.target.checked)} className="accent-blue-500" /> Log scale</label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-200"><input type="checkbox" checked={showGrid} onChange={e=>setShowGrid(e.target.checked)} className="accent-blue-500" /> Grid</label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-200"><input type="checkbox" checked={showCrosshair} onChange={e=>setShowCrosshair(e.target.checked)} className="accent-blue-500" /> Crosshair</label>
              {chartType!=='line' && chartType!=='area' && (
                <div className="flex items-center gap-2 text-sm text-gray-200"><span>Candle theme</span>
                  <select value={candleTheme} onChange={(e)=>setCandleTheme(e.target.value as CandleThemeKey)} className="bg-gray-700 border border-gray-600 text-white rounded-md px-2 py-1 text-sm">
                    <option value="greenRed">Green/Red</option>
                    <option value="whiteBlack">White/Black</option>
                    <option value="blueRed">Blue/Red</option>
                  </select>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>
  {/* centralized controls moved into Studies menu above; duplicate toolbar removed */}

  <div className="h-[520px] bg-gray-900/60 rounded-md border border-gray-700 relative plot-left">
  {/* Status tape (symbol, last, change, O/H/L/C, VOL) */}
  {bars.length>0 && (
    <div className="absolute top-1 left-12 right-2 z-10 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-200/90">
      {(()=>{ const last = bars[bars.length-1]; const prev = bars[bars.length-2]; const ch = last && prev ? (last.close - prev.close) : 0; const chp = prev? (ch/prev.close*100):0; const pos = ch>=0; return (
        <>
          <span className="text-white text-sm font-semibold">{symbol}</span>
          <span className={`font-semibold ${pos?'text-emerald-300':'text-red-300'}`}>{last.close?.toFixed?.(2)??'-'} {pos?'+':''}{ch.toFixed?.(2)??''} ({isFinite(chp)?(pos?'+':'')+chp.toFixed(2)+'%':''})</span>
          <span>OPEN: <b className="text-gray-100">{last.open?.toFixed?.(2)??'-'}</b></span>
          <span>HIGH: <b className="text-gray-100">{last.high?.toFixed?.(2)??'-'}</b></span>
          <span>LOW: <b className="text-gray-100">{last.low?.toFixed?.(2)??'-'}</b></span>
          <span>CLOSE: <b className="text-gray-100">{last.close?.toFixed?.(2)??'-'}</b></span>
          <span>VOL: <b className="text-gray-100">{(last.volume||0).toLocaleString?.()||'-'}</b></span>
        </>
      )})()}
    </div>
  )}
  {showAIEntryExit && aiSignal && (
    <div className="absolute top-1 right-2 z-10 text-[11px] flex items-center gap-2">
      <span className="px-2 py-0.5 rounded border" style={{borderColor:'#16a34a', color:'#86efac', background:'rgba(22,163,74,0.12)'}}>Entry {aiSignal.entry}%</span>
      <span className="px-2 py-0.5 rounded border" style={{borderColor:'#ef4444', color:'#fca5a5', background:'rgba(239,68,68,0.12)'}}>Exit {aiSignal.exit}%</span>
      <span className="text-gray-400">• {REGIME_LABEL[regime]}</span>
    </div>
  )}
  {/* Drawing toolbar removed for Yahoo-like simplicity */}
  <PlotAny
          divId={plotId}
          data={traces}
          layout={{ ...layout, autosize: true }}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false, displaylogo: false, responsive: true, edits: { shapePosition: true } as any, scrollZoom: true, doubleClick: 'reset' as any }}
          onRelayout={handleRelayout}
          onClick={(e:any) => {
            if (drawMode === 'none' || !e?.points?.length) return
            const p = e.points[0]
            const xVal = p.x instanceof Date ? +p.x : (typeof p.x === 'string' ? new Date(p.x).getTime() : p.x)
            const yVal = typeof p.y === 'number' ? p.y : Number(p.y)
            if (!xVal || !yVal) return
            if (!drawAnchor) { setDrawAnchor({ x: xVal, y: yVal }); return }
            // have anchor and second point
            if (drawMode === 'trend') {
      pushUndo()
      setCustomShapes(prev => [...prev, { type: 'line', xref: 'x', yref: 'y', x0: drawAnchor.x, y0: drawAnchor.y, x1: xVal, y1: yVal, line: { color: '#60a5fa', width: 2 } }])
              setDrawAnchor(null)
            } else if (drawMode === 'fib') {
              const x0 = Math.min(drawAnchor.x, xVal)
              const x1 = Math.max(drawAnchor.x, xVal)
              const y0 = drawAnchor.y
              const y1 = yVal
              const high = Math.max(y0, y1)
              const low = Math.min(y0, y1)
              const diff = high - low
              const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
              const color = '#cbd5e1'
              const groupId = `fib-${Date.now()}-${Math.random().toString(36).slice(2)}`
              const newShapes = levels.map(l => ({
                type: 'line', xref: 'x', yref: 'y', x0, x1,
                y0: low + diff * l, y1: low + diff * l,
                line: { color, width: 1, dash: l===0.5 ? 'dot' : 'solid' },
                micFib: true, micFibGroupId: groupId, micLevel: l
              }))
              const newAnns = levels.map(l => ({
                xref: 'paper', x: 1, yref: 'y', y: low + diff * l,
                xanchor: 'left', yanchor: 'middle', align: 'left', showarrow: false,
                font: { size: 10, color: '#cbd5e1' },
                text: `${(l*100).toFixed(1)}%  ${(low + diff*l).toFixed(2)}`,
                micFib: true, micFibGroupId: groupId, micLevel: l
              }))
      pushUndo()
              setCustomShapes(prev => [...prev, ...newShapes])
              setCustomAnnotations(prev => [...prev, ...newAnns])
              setDrawAnchor(null)
            }
          }}
  />
  {/* Context menu removed from UI for simplicity */}
      </div>
      <style jsx>{`
        :global(.plot-left .modebar) {
          left: 8px !important;
          right: auto !important;
        }
        @media (max-width: 640px) {
          :global(.plot-left .modebar){ left: 4px !important; }
        }
      `}</style>
      <div className="mt-2 text-xs text-gray-400" aria-live="polite">
        {loading ? 'Loading data…' : error ? `Error: ${error}` : (
          <>
            {`${symbol} • ${chartType} • ${rangeKey}${compareSymbols.length ? ' • cmp: '+compareSymbols.join(',') : ''}`}
            {aiSignal ? ` • AI Entry ${aiSignal.entry}% • Exit ${aiSignal.exit}% • ${REGIME_LABEL[regime]}` : ''}
          </>
        )}
      </div>
    </div>
  )
}

//
