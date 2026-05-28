'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  Search,
  Star,
  Bell,
  MousePointer2,
  Crosshair,
  Target,
  Circle,
  Square,
  Type as TypeIcon,
  Triangle,
  Spline,
  Activity,
  CalendarRange,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Zap,
  Layers,
  BookOpen,
  PenLine,
  FunctionSquare,
  Sparkles,
  Plus,
  X,
  RefreshCw,
} from 'lucide-react'

const AdvancedChart = dynamic(
  () => import('@/components/analytics/AdvancedChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

// ============================================================
// Constants
// ============================================================

const WATCHLIST_DEFAULT = [
  'SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META',
  'GOOGL', 'AMD', 'NFLX', 'JPM', 'XOM', 'GLD', 'BTC-USD', 'ETH-USD',
]

const POPULAR_GROUPS: { label: string; symbols: string[] }[] = [
  { label: 'Indices', symbols: ['SPY', 'QQQ', 'DIA', 'IWM', '^GSPC', '^IXIC', '^DJI', '^VIX'] },
  { label: 'Mega Caps', symbols: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AVGO'] },
  { label: 'Crypto', symbols: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD'] },
  { label: 'Forex', symbols: ['EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X', 'AUDUSD=X', 'USDCAD=X'] },
  { label: 'Commodities', symbols: ['GC=F', 'SI=F', 'CL=F', 'NG=F', 'HG=F', 'ZC=F'] },
  { label: 'Bonds & ETF', symbols: ['TLT', 'IEF', 'HYG', 'LQD', 'GLD', 'SLV', 'USO', 'UNG'] },
]

const DRAWING_TOOLS = [
  { id: 'cursor', label: 'Arrow', icon: MousePointer2 },
  { id: 'crosshair', label: 'Crosshairs', icon: Crosshair },
  { id: 'target', label: 'Target', icon: Target },
  { id: 'ellipse', label: 'Ellipse', icon: Circle },
  { id: 'rect', label: 'Rectangle', icon: Square },
  { id: 'text', label: 'Text', icon: TypeIcon },
  { id: 'triangle', label: 'Triangle', icon: Triangle },
  { id: 'curve', label: 'Curve', icon: Spline },
  { id: 'cycle-finder', label: 'Cycle Finder', icon: Activity },
  { id: 'cycle-lines', label: 'Cycle Lines', icon: Layers },
  { id: 'date-range', label: 'Date Range', icon: CalendarRange },
  { id: 'elliott-corr', label: 'Elliott Wave Correction', icon: PenLine },
  { id: 'elliott-imp', label: 'Elliott Wave Impulse', icon: PenLine },
  { id: 'fib-retr', label: 'Fibonacci Retracement', icon: FunctionSquare },
  { id: 'fib-ext', label: 'Fibonacci Extension', icon: FunctionSquare },
  { id: 'fib-fan', label: 'Fibonacci Fan', icon: FunctionSquare },
  { id: 'trendline', label: 'Trend Line', icon: TrendingUp },
  { id: 'channel', label: 'Channel', icon: Layers },
  { id: 'pitchfork', label: 'Pitchfork', icon: Spline },
  { id: 'gann-fan', label: 'Gann Fan', icon: Spline },
  { id: 'gann-box', label: 'Gann Box', icon: Square },
  { id: 'note', label: 'Note', icon: BookOpen },
]

const TOOL_TABS = [
  { id: 'tools', label: 'Tools', icon: PenLine },
  { id: 'fn', label: 'Functions', icon: FunctionSquare },
  { id: 'starred', label: 'Starred', icon: Star },
] as const

type ToolTab = typeof TOOL_TABS[number]['id']

// ============================================================
// Helpers
// ============================================================

interface Quote {
  ticker: string
  price: number
  change: number
  changePercent: number
  volume: number
  name?: string
}

function fmtPrice(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (Math.abs(n) >= 1) return n.toFixed(2)
  return n.toFixed(4)
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  const s = n >= 0 ? '+' : ''
  return `${s}${n.toFixed(2)}%`
}

function fmtVol(n: number | null | undefined): string {
  if (!n || !Number.isFinite(n)) return '—'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

// ============================================================
// Skeleton
// ============================================================

function ChartSkeleton() {
  return (
    <div className="w-full h-[560px] bg-slate-900/40 border border-white/10 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
        <div className="text-xs text-gray-400">Loading chart engine…</div>
      </div>
    </div>
  )
}

// ============================================================
// Page
// ============================================================

export default function MarketDataPage() {
  const [symbol, setSymbol] = useState('AAPL')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [toolTab, setToolTab] = useState<ToolTab>('tools')
  const [activeTool, setActiveTool] = useState<string>('cursor')
  const [starred, setStarred] = useState<Set<string>>(new Set(['trendline', 'fib-retr', 'rect']))
  const [watchlist, setWatchlist] = useState<string[]>(WATCHLIST_DEFAULT)
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [popularOpen, setPopularOpen] = useState<string>('Indices')
  const [notificationTab, setNotificationTab] = useState<'all' | 'system' | 'results' | 'scans' | 'alerts'>('all')

  // ===== Fetch live quotes for watchlist =====
  const fetchQuotes = useCallback(async () => {
    if (!watchlist.length) return
    setLoadingQuotes(true)
    try {
      const chunks: string[][] = []
      for (let i = 0; i < watchlist.length; i += 15) chunks.push(watchlist.slice(i, i + 15))
      const all: Quote[] = []
      for (const chunk of chunks) {
        const url = `/api/yahoo-quotes?symbols=${encodeURIComponent(chunk.join(','))}`
        const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
        if (!res.ok) continue
        const json = await res.json()
        if (Array.isArray(json?.data)) all.push(...json.data)
      }
      const map: Record<string, Quote> = {}
      for (const q of all) map[q.ticker?.toUpperCase()] = q
      setQuotes(map)
    } catch {
      /* silent */
    } finally {
      setLoadingQuotes(false)
    }
  }, [watchlist])

  useEffect(() => { fetchQuotes() }, [fetchQuotes])

  // Periodic refresh
  useEffect(() => {
    const id = setInterval(fetchQuotes, 60_000)
    return () => clearInterval(id)
  }, [fetchQuotes])

  // ===== Search submit =====
  const submitSearch = useCallback((s?: string) => {
    const v = (s ?? searchVal).trim().toUpperCase()
    if (!v) return
    setSymbol(v)
    setSearchOpen(false)
    setSearchVal('')
    setWatchlist((wl) => (wl.includes(v) ? wl : [v, ...wl].slice(0, 30)))
  }, [searchVal])

  const toggleStar = useCallback((id: string) => {
    setStarred((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const removeFromWatchlist = useCallback((sym: string) => {
    setWatchlist((wl) => wl.filter((s) => s !== sym))
  }, [])

  // ===== Current symbol quote =====
  const currentQuote = quotes[symbol.toUpperCase()]
  const filteredTools = useMemo(() => {
    if (toolTab === 'starred') return DRAWING_TOOLS.filter((t) => starred.has(t.id))
    return DRAWING_TOOLS
  }, [toolTab, starred])

  // ===== Mock notifications driven by current symbol =====
  const notifications = useMemo(() => {
    const sym = symbol.toUpperCase()
    const now = Date.now()
    return [
      {
        id: 1, type: 'system', icon: Sparkles, color: 'text-amber-400',
        title: 'New tools released', desc: 'Fibonacci Extension & Pitchfork now available',
        date: new Date(now - 6 * 60 * 1000),
      },
      {
        id: 2, type: 'scans', icon: Activity, color: 'text-blue-400',
        title: `${sym} bullish crossover`, desc: 'EMA 9 crossed above EMA 21 (1H)',
        date: new Date(now - 22 * 60 * 1000),
      },
      {
        id: 3, type: 'alerts', icon: Bell, color: 'text-rose-400',
        title: `${sym} price alert`, desc: `${sym} crossed above target level`,
        date: new Date(now - 60 * 60 * 1000),
      },
      {
        id: 4, type: 'results', icon: TrendingUp, color: 'text-emerald-400',
        title: 'Scan completed', desc: '17 results matched "Breakout > 50d high"',
        date: new Date(now - 2 * 3600 * 1000),
      },
      {
        id: 5, type: 'alerts', icon: Bell, color: 'text-yellow-400',
        title: 'SPY change > $5', desc: 'SPY moved +1.42% in the last session',
        date: new Date(now - 5 * 3600 * 1000),
      },
      {
        id: 6, type: 'scans', icon: Zap, color: 'text-purple-400',
        title: 'DeMARK Sequential 9s and 31s', desc: 'Completed: 22 results',
        date: new Date(now - 9 * 3600 * 1000),
      },
      {
        id: 7, type: 'system', icon: Sparkles, color: 'text-cyan-400',
        title: 'System update', desc: 'New customization options for charts',
        date: new Date(now - 23 * 3600 * 1000),
      },
    ]
  }, [symbol])

  const filteredNotifs = notifications.filter((n) =>
    notificationTab === 'all' ? true : n.type === notificationTab
  )

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      {/* ========================================================== */}
      {/* TOP HEADER                                                  */}
      {/* ========================================================== */}
      <div className="border-b border-white/10 bg-slate-900/60 backdrop-blur sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-black">M</div>
            <div>
              <h1 className="text-lg font-bold leading-none">Market Data</h1>
              <p className="text-[10px] text-gray-400 mt-0.5">Pro Technical Analysis Terminal · Free</p>
            </div>
          </div>

          {/* Symbol picker */}
          <div className="relative ml-2 flex-1 max-w-md">
            <div className="flex items-center bg-white/5 border border-white/10 rounded-md px-3 py-1.5 focus-within:border-blue-500">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                value={searchOpen ? searchVal : symbol}
                onFocus={() => { setSearchOpen(true); setSearchVal('') }}
                onChange={(e) => { setSearchOpen(true); setSearchVal(e.target.value.toUpperCase()) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitSearch()
                  if (e.key === 'Escape') { setSearchOpen(false); setSearchVal('') }
                }}
                placeholder="Search symbol (AAPL, BTC-USD, EURUSD=X)…"
                className="bg-transparent text-sm font-semibold flex-1 ml-2 outline-none placeholder-gray-500"
              />
              {searchOpen && searchVal && (
                <button
                  onClick={() => submitSearch()}
                  className="text-[10px] px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  Go
                </button>
              )}
            </div>

            {/* Quick picks dropdown */}
            {searchOpen && (
              <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-md shadow-xl max-h-[420px] overflow-y-auto z-40">
                <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1 flex-wrap">
                  {POPULAR_GROUPS.map((g) => (
                    <button
                      key={g.label}
                      onClick={() => setPopularOpen(g.label)}
                      className={`px-2 py-0.5 text-[10px] rounded ${popularOpen === g.label ? 'bg-blue-600/40 text-blue-200' : 'bg-white/5 text-gray-400 hover:text-gray-200'}`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                <div className="p-2 grid grid-cols-2 gap-1">
                  {(POPULAR_GROUPS.find((g) => g.label === popularOpen)?.symbols || []).map((s) => {
                    const q = quotes[s.toUpperCase()]
                    return (
                      <button
                        key={s}
                        onMouseDown={(e) => { e.preventDefault(); submitSearch(s) }}
                        className="text-left px-2 py-1.5 rounded hover:bg-white/5 flex items-center justify-between gap-2"
                      >
                        <span className="text-xs font-semibold">{s}</span>
                        {q && (
                          <span className={`text-[10px] ${q.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {fmtPct(q.changePercent)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Current symbol quick info */}
          {currentQuote && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex flex-col items-end">
                <span className="font-bold">${fmtPrice(currentQuote.price)}</span>
                <span className={`text-[10px] ${currentQuote.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {currentQuote.changePercent >= 0 ? '+' : ''}{fmtPrice(currentQuote.change)} ({fmtPct(currentQuote.changePercent)})
                </span>
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={fetchQuotes}
              disabled={loadingQuotes}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-50"
              title="Refresh quotes"
            >
              <RefreshCw className={`w-4 h-4 ${loadingQuotes ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* MAIN LAYOUT                                                 */}
      {/* ========================================================== */}
      <div className="flex flex-col lg:flex-row gap-3 p-3">
        {/* ====== LEFT: DRAWING TOOLS ====== */}
        <aside className="lg:w-56 shrink-0 bg-slate-900/60 border border-white/10 rounded-lg p-2 flex flex-col">
          <div className="flex items-center justify-between gap-1 mb-2">
            {TOOL_TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setToolTab(t.id)}
                  className={`flex-1 flex items-center justify-center py-1.5 rounded text-[10px] font-medium ${
                    toolTab === t.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={t.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-xs font-semibold text-gray-300 flex items-center gap-1">
              <PenLine className="w-3 h-3" /> Tools
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </span>
          </div>

          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
            <input
              placeholder="Search"
              className="w-full bg-white/5 border border-white/10 rounded pl-7 pr-2 py-1 text-[11px] placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 max-h-[60vh] lg:max-h-none">
            {filteredTools.map((t) => {
              const Icon = t.icon
              const isActive = activeTool === t.id
              const isStarred = starred.has(t.id)
              return (
                <div
                  key={t.id}
                  className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
                    isActive ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-white/5'
                  }`}
                  onClick={() => setActiveTool(t.id)}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] flex-1 truncate">{t.label}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStar(t.id) }}
                    className={`opacity-0 group-hover:opacity-100 transition ${isStarred ? '!opacity-100 text-amber-400' : 'text-gray-500'}`}
                  >
                    <Star className="w-3 h-3" fill={isStarred ? 'currentColor' : 'none'} />
                  </button>
                </div>
              )
            })}
            {filteredTools.length === 0 && (
              <div className="text-[10px] text-gray-500 text-center py-4">No starred tools yet</div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-gray-500 leading-snug">
            Active: <span className="text-gray-300 font-medium">{DRAWING_TOOLS.find((t) => t.id === activeTool)?.label}</span>
          </div>
        </aside>

        {/* ====== CENTER: CHART + STATS ====== */}
        <main className="flex-1 min-w-0 space-y-3">
          <AdvancedChart
            symbol={symbol}
            onSymbolChange={(s) => setSymbol(s)}
            height={580}
            className="shadow-xl shadow-black/40"
          />

          {/* Watchlist strip */}
          <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Watchlist</h3>
              <span className="text-[10px] text-gray-500">{watchlist.length} symbols · live</span>
            </div>
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-min">
                {watchlist.map((s) => {
                  const q = quotes[s.toUpperCase()]
                  const pos = q ? q.changePercent >= 0 : true
                  const active = s.toUpperCase() === symbol.toUpperCase()
                  return (
                    <div
                      key={s}
                      onClick={() => setSymbol(s)}
                      className={`group relative min-w-[120px] cursor-pointer rounded-lg border px-3 py-2 ${
                        active ? 'border-blue-500/60 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromWatchlist(s) }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="text-xs font-bold">{s}</div>
                      <div className="text-sm font-semibold mt-0.5">{q ? fmtPrice(q.price) : '—'}</div>
                      <div className={`text-[10px] flex items-center gap-1 ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pos ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {q ? fmtPct(q.changePercent) : '—'}
                      </div>
                    </div>
                  )
                })}
                <button
                  onClick={() => setSearchOpen(true)}
                  className="min-w-[60px] rounded-lg border border-dashed border-white/15 text-gray-400 hover:text-white hover:border-white/30 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick stats / education strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Symbol"
              value={symbol.toUpperCase()}
              hint={currentQuote?.name?.slice(0, 30) || 'Loading…'}
            />
            <StatCard
              label="Last"
              value={currentQuote ? `$${fmtPrice(currentQuote.price)}` : '—'}
              hint={currentQuote ? fmtPct(currentQuote.changePercent) : ''}
              tone={currentQuote ? (currentQuote.changePercent >= 0 ? 'up' : 'down') : 'neutral'}
            />
            <StatCard
              label="Volume"
              value={fmtVol(currentQuote?.volume)}
              hint="last session"
            />
            <StatCard
              label="Active Tool"
              value={DRAWING_TOOLS.find((t) => t.id === activeTool)?.label || '—'}
              hint={`${starred.size} starred`}
            />
          </div>

          {/* Help / shortcuts */}
          <div className="bg-slate-900/40 border border-white/10 rounded-lg p-4 text-xs text-gray-400">
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-amber-400 mt-0.5" />
              <div>
                <div className="text-gray-200 font-semibold mb-1">Pro tips</div>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Type any ticker — stocks (AAPL), crypto (BTC-USD), forex (EURUSD=X), futures (CL=F), indices (^GSPC).</li>
                  <li>Use the chart toolbar above the candles to switch timeframe, style (candle/line/area) and enable 25+ indicators.</li>
                  <li>Star your favourite drawing tools to keep them one click away in the <b>Starred</b> tab.</li>
                  <li>Quotes auto-refresh every minute. Click the refresh icon to force update.</li>
                </ul>
              </div>
            </div>
          </div>
        </main>

        {/* ====== RIGHT: NOTIFICATIONS ====== */}
        <aside className="lg:w-72 shrink-0 bg-slate-900/60 border border-white/10 rounded-lg flex flex-col">
          <div className="p-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Notifications</h3>
              <Bell className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-1 mt-2 text-[11px]">
              {(['all', 'system', 'results', 'scans', 'alerts'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNotificationTab(t)}
                  className={`px-2 py-0.5 rounded capitalize ${
                    notificationTab === t ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[70vh]">
            <div className="px-3 py-1.5 text-[9px] text-gray-500 uppercase tracking-wider bg-slate-900/40">Today</div>
            {filteredNotifs.map((n) => {
              const Icon = n.icon
              return (
                <div key={n.id} className="px-3 py-2.5 border-b border-white/5 hover:bg-white/5 cursor-pointer flex items-start gap-2">
                  <div className={`w-7 h-7 rounded-md bg-white/5 flex items-center justify-center ${n.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white font-medium truncate">{n.title}</div>
                    <div className="text-[10px] text-gray-400 truncate">{n.desc}</div>
                  </div>
                  <div className="text-[10px] text-gray-500 whitespace-nowrap">{timeAgo(n.date)}</div>
                </div>
              )
            })}
            {filteredNotifs.length === 0 && (
              <div className="p-6 text-center text-[11px] text-gray-500">
                <Bell className="w-5 h-5 mx-auto mb-2 opacity-30" />
                No notifications in this category
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

// ============================================================
// Subcomponents
// ============================================================

function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'up' | 'down' | 'neutral'
}) {
  const toneCls =
    tone === 'up' ? 'text-emerald-400' : tone === 'down' ? 'text-red-400' : 'text-gray-400'
  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-lg font-bold mt-1 truncate">{value}</div>
      {hint && <div className={`text-[10px] mt-0.5 truncate ${toneCls}`}>{hint}</div>}
    </div>
  )
}
