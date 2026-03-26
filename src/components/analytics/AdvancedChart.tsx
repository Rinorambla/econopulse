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
type IndicatorKey = 'sma20' | 'sma50' | 'ema20' | 'bb' | 'volume' | 'vwap'

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

const IND_OPTIONS: { key: IndicatorKey; label: string }[] = [
  { key: 'sma20', label: 'SMA 20' },
  { key: 'sma50', label: 'SMA 50' },
  { key: 'ema20', label: 'EMA 20' },
  { key: 'bb', label: 'Bollinger' },
  { key: 'volume', label: 'Volume' },
  { key: 'vwap', label: 'VWAP' },
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

    // Volume
    if (indicators.has('volume')) {
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

    // SMA 20
    if (indicators.has('sma20')) {
      const vals = computeSMA(closes, 20)
      const ls = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, lineStyle: LineStyle.Solid, crosshairMarkerVisible: false })
      ls.setData(vals.map((v, i) => v !== null ? { time: timeLabels[i], value: v } as LineData : null).filter(Boolean) as LineData[])
      overlaySeriesRef.current.push(ls)
    }

    // SMA 50
    if (indicators.has('sma50')) {
      const vals = computeSMA(closes, 50)
      const ls = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 1, lineStyle: LineStyle.Solid, crosshairMarkerVisible: false })
      ls.setData(vals.map((v, i) => v !== null ? { time: timeLabels[i], value: v } as LineData : null).filter(Boolean) as LineData[])
      overlaySeriesRef.current.push(ls)
    }

    // EMA 20
    if (indicators.has('ema20')) {
      const vals = computeEMA(closes, 20)
      const ls = chart.addSeries(LineSeries, { color: '#06b6d4', lineWidth: 1, lineStyle: LineStyle.Dashed, crosshairMarkerVisible: false })
      ls.setData(vals.map((v, i) => v !== null ? { time: timeLabels[i], value: v } as LineData : null).filter(Boolean) as LineData[])
      overlaySeriesRef.current.push(ls)
    }

    // Bollinger Bands
    if (indicators.has('bb')) {
      const { basis, upper, lower } = computeBB(closes, 20, 2)
      const addBBLine = (vals: (number | null)[], color: string, style: LineStyle) => {
        const ls = chart.addSeries(LineSeries, { color, lineWidth: 1, lineStyle: style, crosshairMarkerVisible: false })
        ls.setData(vals.map((v, i) => v !== null ? { time: timeLabels[i], value: v } as LineData : null).filter(Boolean) as LineData[])
        overlaySeriesRef.current.push(ls)
      }
      addBBLine(upper, 'rgba(168,85,247,0.5)', LineStyle.Solid)
      addBBLine(basis, 'rgba(168,85,247,0.3)', LineStyle.Dashed)
      addBBLine(lower, 'rgba(168,85,247,0.5)', LineStyle.Solid)
    }

    // VWAP
    if (indicators.has('vwap')) {
      const vals = computeVWAP(bars)
      const ls = chart.addSeries(LineSeries, { color: '#ec4899', lineWidth: 1, lineStyle: LineStyle.Dotted, crosshairMarkerVisible: false })
      ls.setData(vals.map((v, i) => v !== null ? { time: timeLabels[i], value: v } as LineData : null).filter(Boolean) as LineData[])
      overlaySeriesRef.current.push(ls)
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

      {/* ===== INDICATOR BAR ===== */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-slate-800/30 border-b border-white/5">
        <span className="text-[10px] text-gray-500 mr-1">Indicators:</span>
        {IND_OPTIONS.map(ind => (
          <button
            key={ind.key}
            onClick={() => toggleIndicator(ind.key)}
            className={`px-2 py-0.5 text-[10px] rounded-full transition-colors border ${
              indicators.has(ind.key)
                ? 'bg-blue-600/30 border-blue-500/40 text-blue-300'
                : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
            }`}
          >
            {ind.label}
          </button>
        ))}
        {/* Indicator legend */}
        <div className="ml-auto flex items-center gap-3 text-[9px]">
          {indicators.has('sma20') && <span className="text-amber-400">● SMA 20</span>}
          {indicators.has('sma50') && <span className="text-purple-400">● SMA 50</span>}
          {indicators.has('ema20') && <span className="text-cyan-400">● EMA 20</span>}
          {indicators.has('bb') && <span className="text-purple-400/70">● BB(20,2)</span>}
          {indicators.has('vwap') && <span className="text-pink-400">● VWAP</span>}
        </div>
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
