'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Search,
  Star,
  Bell,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Plus,
  X,
  RefreshCw,
  Activity,
  List,
  Pencil,
  Trash2,
  Check,
  Save,
  Share2,
} from 'lucide-react'
import Logo from '@/components/Logo'
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface SearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
}

const AdvancedChart = dynamic(
  () => import('@/components/analytics/AdvancedChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

const DEFAULT_WATCHLISTS: Record<string, string[]> = {
  Main: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'AMD', 'NFLX', 'JPM', 'XOM', 'GLD', 'BTC-USD', 'ETH-USD'],
  Tech: ['AAPL', 'MSFT', 'NVDA', 'AMD', 'GOOGL', 'META', 'AMZN', 'TSLA', 'AVGO', 'CRM', 'ORCL', 'ADBE'],
  Crypto: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD', 'DOGE-USD', 'AVAX-USD'],
}

// Smart sector mapping — used to auto-file a saved symbol into the right watchlist.
const SECTOR_SYMBOLS: Record<string, string[]> = {
  Technology: ['AAPL', 'MSFT', 'NVDA', 'AMD', 'INTC', 'GOOGL', 'GOOG', 'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'AVGO', 'CSCO', 'QCOM', 'TXN', 'NOW', 'IBM', 'PLTR', 'SHOP', 'UBER', 'ASML', 'SAP', 'TSM', 'MU', 'AMAT', 'LRCX', 'SNOW', 'DELL', 'HPQ'],
  Financials: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW', 'AXP', 'V', 'MA', 'PYPL', 'COIN', 'SQ', 'BRK-B', 'BRK-A', 'USB', 'PNC', 'TFC', 'COF'],
  Energy: ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'MPC', 'OXY', 'HES', 'PSX', 'VLO', 'WMB', 'KMI', 'DVN'],
  Healthcare: ['UNH', 'LLY', 'JNJ', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'AMGN', 'GILD', 'NVO', 'CVS', 'MDT'],
  Consumer: ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'LOW', 'TGT', 'DIS', 'KO', 'PEP', 'PG', 'WMT', 'COST', 'BKNG', 'CMG'],
  Industrials: ['CAT', 'BA', 'HON', 'GE', 'UPS', 'RTX', 'LMT', 'DE', 'MMM', 'UNP', 'FDX', 'EMR', 'ETN'],
}

const SYMBOL_TO_SECTOR: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  for (const [sector, syms] of Object.entries(SECTOR_SYMBOLS)) {
    for (const s of syms) m[s] = sector
  }
  return m
})()

function detectSector(sym: string): string {
  const s = sym.toUpperCase().trim()
  if (s.endsWith('-USD') || s.endsWith('-USDT')) return 'Crypto'
  if (s.endsWith('=X')) return 'Forex'
  if (s.endsWith('=F')) return 'Commodities'
  if (s.startsWith('^')) return 'Indices'
  if (['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO', 'IVV', 'EFA', 'EEM', 'VEA', 'VWO', 'ACWI', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC', 'SMH', 'SOXX', 'GLD', 'SLV', 'TLT', 'HYG', 'GDX'].includes(s)) return 'ETFs'
  return SYMBOL_TO_SECTOR[s] || 'Other'
}

const POPULAR_GROUPS: { label: string; symbols: string[] }[] = [
  { label: 'US Indices', symbols: ['^GSPC', '^IXIC', '^DJI', '^RUT', '^VIX', '^NDX'] },
  { label: 'World Indices', symbols: ['^FTSE', '^GDAXI', '^FCHI', '^STOXX50E', '^N225', '^HSI', '^FTSEMIB.MI', '^IBEX', '^AEX', '^BVSP', '^MXX', '^GSPTSE'] },
  { label: 'Index ETFs', symbols: ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO', 'IVV', 'EFA', 'EEM', 'VEA', 'VWO', 'ACWI'] },
  { label: 'Sector ETFs', symbols: ['XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC', 'SMH', 'SOXX', 'KRE', 'XBI', 'ITA'] },
  { label: 'Mega Caps', symbols: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AVGO', 'BRK-B', 'LLY', 'JPM', 'V', 'UNH', 'XOM', 'MA', 'COST'] },
  { label: 'Tech', symbols: ['AAPL', 'MSFT', 'NVDA', 'AMD', 'INTC', 'GOOGL', 'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'AVGO', 'CSCO', 'QCOM', 'TXN', 'NOW', 'IBM', 'PLTR', 'SHOP', 'UBER'] },
  { label: 'Finance', symbols: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW', 'AXP', 'V', 'MA', 'PYPL', 'COIN', 'SQ'] },
  { label: 'Energy', symbols: ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'MPC', 'OXY', 'HES', 'PSX'] },
  { label: 'Healthcare', symbols: ['UNH', 'LLY', 'JNJ', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'AMGN', 'GILD'] },
  { label: 'Consumer', symbols: ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'LOW', 'TGT', 'DIS', 'KO', 'PEP', 'PG', 'WMT', 'COST'] },
  { label: 'EU Stocks', symbols: ['ASML', 'SAP', 'NVO', 'MC.PA', 'OR.PA', 'AIR.PA', 'SAN.PA', 'NESN.SW', 'NOVN.SW', 'ROG.SW', 'SHEL.L', 'ULVR.L', 'AZN.L', 'HSBA.L', 'BP.L', 'RIO.L', 'ISP.MI', 'UCG.MI', 'ENI.MI', 'STLAM.MI'] },
  { label: 'Asia Stocks', symbols: ['7203.T', '6758.T', '9984.T', '6861.T', '0700.HK', '9988.HK', '3690.HK', 'TSM', 'BABA', 'BIDU', 'JD', 'PDD', 'NIO'] },
  { label: 'Crypto', symbols: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD', 'DOGE-USD', 'AVAX-USD', 'DOT-USD', 'MATIC-USD', 'LINK-USD', 'LTC-USD', 'TRX-USD', 'SHIB-USD', 'ATOM-USD', 'UNI-USD'] },
  { label: 'Forex', symbols: ['EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X', 'AUDUSD=X', 'USDCAD=X', 'NZDUSD=X', 'EURGBP=X', 'EURJPY=X', 'GBPJPY=X', 'USDCNY=X', 'USDMXN=X', 'USDBRL=X', 'DX-Y.NYB'] },
  { label: 'Commodities', symbols: ['GC=F', 'SI=F', 'CL=F', 'BZ=F', 'NG=F', 'HG=F', 'PL=F', 'PA=F', 'ZC=F', 'ZW=F', 'ZS=F', 'KC=F', 'CC=F', 'SB=F', 'CT=F', 'LE=F'] },
  { label: 'Bonds & Rates', symbols: ['^TNX', '^TYX', '^FVX', '^IRX', 'TLT', 'IEF', 'SHY', 'BND', 'AGG', 'HYG', 'LQD', 'TIP', 'MBB', 'EMB', 'BNDX'] },
]

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

// Deterministic brand-ish color for a symbol avatar (TradingView-style logo fallback).
function symbolColor(sym: string): string {
  let h = 0
  for (let i = 0; i < sym.length; i++) h = (h * 31 + sym.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h} 70% 45%), hsl(${(h + 40) % 360} 70% 35%))`
}

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

export default function MarketDataPage() {
  // Persisted state
  const [symbol, setSymbol] = useLocalStorage<string>('mkt:symbol', 'AAPL')
  const [watchlists, setWatchlists] = useLocalStorage<Record<string, string[]>>('mkt:watchlists', DEFAULT_WATCHLISTS)
  const [activeListName, setActiveListName] = useLocalStorage<string>('mkt:activeList', 'Main')
  const [readSet, setReadSet] = useLocalStorage<number[]>('mkt:notifRead', [])
  const [dismissedSet, setDismissedSet] = useLocalStorage<number[]>('mkt:notifDismissed', [])

  // Ephemeral state
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [popularOpen, setPopularOpen] = useState<string>('US Indices')
  const [watchlistMenuOpen, setWatchlistMenuOpen] = useState(false)
  const [notifMenuOpen, setNotifMenuOpen] = useState(false)
  const [notificationTab, setNotificationTab] = useState<'all' | 'system' | 'results' | 'scans' | 'alerts'>('all')
  const [renamingList, setRenamingList] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [newListName, setNewListName] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [chartHeight, setChartHeight] = useState(620)
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelInput, setPanelInput] = useState('')
  const mainRef = useRef<HTMLDivElement | null>(null)
  const headerRef = useRef<HTMLDivElement | null>(null)

  // Responsive chart height — adapts the terminal to phones, tablets and desktops.
  useEffect(() => {
    const compute = () => {
      const top = mainRef.current?.getBoundingClientRect().top ?? 110
      const pad = 16 // bottom padding
      // AdvancedChart renders a toolbar + status bar around the chart canvas;
      // subtract that chrome so the whole terminal fits the viewport without scroll.
      const chartChrome = 96
      const h = window.innerHeight - top - pad - chartChrome
      setChartHeight(Math.max(300, Math.min(900, Math.round(h))))
    }
    // run after layout is ready
    const raf = requestAnimationFrame(compute)
    window.addEventListener('resize', compute)
    // Recompute whenever the header height changes (price badge appearing,
    // toolbar buttons wrapping to a new line, etc.) so we never need to scroll.
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined' && headerRef.current) {
      ro = new ResizeObserver(() => requestAnimationFrame(compute))
      ro.observe(headerRef.current)
    }
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', compute); ro?.disconnect() }
  }, [panelOpen])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2600)
  }, [])

  const watchlist = useMemo(() => watchlists[activeListName] || [], [watchlists, activeListName])

  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const readSetMem = useMemo(() => new Set(readSet), [readSet])
  const dismissedSetMem = useMemo(() => new Set(dismissedSet), [dismissedSet])

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
  useEffect(() => {
    const id = setInterval(fetchQuotes, 60_000)
    return () => clearInterval(id)
  }, [fetchQuotes])

  // Live Yahoo symbol search — finds ANY instrument across all global exchanges.
  useEffect(() => {
    const q = searchVal.trim()
    if (!searchOpen || q.length < 1) { setSearchResults([]); setSearchLoading(false); return }
    let aborted = false
    setSearchLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/yahoo-search?q=${encodeURIComponent(q)}`, { cache: 'no-store', signal: AbortSignal.timeout(9000) })
        const json = await res.json()
        if (!aborted) setSearchResults(Array.isArray(json?.data) ? json.data : [])
      } catch {
        if (!aborted) setSearchResults([])
      } finally {
        if (!aborted) setSearchLoading(false)
      }
    }, 220)
    return () => { aborted = true; clearTimeout(t) }
  }, [searchVal, searchOpen])

  const submitSearch = useCallback((s?: string) => {
    const v = (s ?? searchVal).trim().toUpperCase()
    if (!v) return
    setSymbol(v)
    setSearchOpen(false)
    setSearchVal('')
    setWatchlists((wls) => {
      const cur = wls[activeListName] || []
      if (cur.includes(v)) return wls
      return { ...wls, [activeListName]: [v, ...cur].slice(0, 50) }
    })
  }, [searchVal, activeListName, setSymbol, setWatchlists])

  // Remove a symbol from the currently active watchlist.
  const removeFromWatchlist = useCallback((sym: string) => {
    setWatchlists((wls) => {
      const cur = wls[activeListName] || []
      return { ...wls, [activeListName]: cur.filter((s) => s.toUpperCase() !== sym.toUpperCase()) }
    })
  }, [activeListName, setWatchlists])

  // Add a symbol directly into the active watchlist (from the side panel input).
  const addToWatchlist = useCallback((raw?: string) => {
    const v = (raw ?? panelInput).trim().toUpperCase()
    if (!v) return
    setWatchlists((wls) => {
      const cur = wls[activeListName] || []
      if (cur.some((s) => s.toUpperCase() === v)) return wls
      return { ...wls, [activeListName]: [...cur, v] }
    })
    setPanelInput('')
    showToast(`Added ${v} → ${activeListName}`)
  }, [panelInput, activeListName, setWatchlists, showToast])

  // Smart save files the current symbol into its sector watchlist (creating it if needed).
  const saveToSector = useCallback(() => {
    const v = symbol.trim().toUpperCase()
    if (!v) return
    const sector = detectSector(v)
    setWatchlists((wls) => {
      const cur = wls[sector] || []
      if (cur.includes(v)) return wls
      return { ...wls, [sector]: [v, ...cur].slice(0, 100) }
    })
    setActiveListName(sector)
    showToast(`Saved ${v} → ${sector}`)
  }, [symbol, setWatchlists, setActiveListName, showToast])

  // Share — copies a deep link to the current symbol to the clipboard.
  const shareCurrent = useCallback(async () => {
    const v = symbol.trim().toUpperCase()
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('symbol', v)
      const link = url.toString()
      if (navigator.share) {
        await navigator.share({ title: `${v} • Econopulse.ai`, text: `Check ${v} on Econopulse.ai`, url: link })
        return
      }
      await navigator.clipboard.writeText(link)
      showToast('Link copied to clipboard')
    } catch {
      showToast('Unable to share')
    }
  }, [symbol, showToast])

  const addNewList = useCallback(() => {
    const name = newListName.trim()
    if (!name || watchlists[name]) return
    setWatchlists((wls) => ({ ...wls, [name]: [] }))
    setActiveListName(name)
    setNewListName('')
  }, [newListName, watchlists, setWatchlists, setActiveListName])

  const deleteList = useCallback((name: string) => {
    if (Object.keys(watchlists).length <= 1) return
    setWatchlists((wls) => {
      const next = { ...wls }
      delete next[name]
      return next
    })
    if (activeListName === name) {
      const remaining = Object.keys(watchlists).filter((k) => k !== name)
      if (remaining[0]) setActiveListName(remaining[0])
    }
  }, [watchlists, activeListName, setWatchlists, setActiveListName])

  const startRename = useCallback((name: string) => {
    setRenamingList(name)
    setRenameVal(name)
  }, [])

  const commitRename = useCallback(() => {
    const next = renameVal.trim()
    if (!renamingList || !next || next === renamingList || watchlists[next]) {
      setRenamingList(null); return
    }
    setWatchlists((wls) => {
      const out: Record<string, string[]> = {}
      for (const [k, v] of Object.entries(wls)) {
        out[k === renamingList ? next : k] = v
      }
      return out
    })
    if (activeListName === renamingList) setActiveListName(next)
    setRenamingList(null)
  }, [renamingList, renameVal, watchlists, activeListName, setWatchlists, setActiveListName])

  // Notifications
  type Notif = { id: number; type: 'system' | 'results' | 'scans' | 'alerts'; icon: React.ComponentType<{ className?: string }>; color: string; title: string; desc: string; date: Date }

  const notifications = useMemo<Notif[]>(() => {
    const now = Date.now()
    const sym = symbol.toUpperCase()
    const q = quotes[sym]
    const list: Notif[] = []

    if (q && Number.isFinite(q.price)) {
      const up = q.changePercent >= 0
      list.push({
        id: 1001, type: 'alerts', icon: up ? TrendingUp : TrendingDown,
        color: up ? 'text-emerald-400' : 'text-rose-400',
        title: `${sym} ${up ? '+' : ''}${q.changePercent.toFixed(2)}%`,
        desc: `Last: $${fmtPrice(q.price)} • Vol ${fmtVol(q.volume)}`,
        date: new Date(now - 2 * 60 * 1000),
      })
      if (Math.abs(q.changePercent) >= 2) {
        list.push({
          id: 1002, type: 'alerts', icon: Bell, color: 'text-amber-400',
          title: `${sym} large move`,
          desc: `Move ≥ 2% triggered (${up ? '+' : ''}${q.changePercent.toFixed(2)}%)`,
          date: new Date(now - 60 * 1000),
        })
      }
    }

    Object.values(quotes)
      .filter((x) => Number.isFinite(x.changePercent))
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 3)
      .forEach((x, i) => {
        list.push({
          id: 2000 + i, type: 'scans', icon: Activity,
          color: x.changePercent >= 0 ? 'text-blue-400' : 'text-purple-400',
          title: `Top mover: ${x.ticker}`,
          desc: `${x.changePercent >= 0 ? '+' : ''}${x.changePercent.toFixed(2)}% • $${fmtPrice(x.price)}`,
          date: new Date(now - (10 + i * 5) * 60 * 1000),
        })
      })

    list.push({
      id: 3001, type: 'results', icon: TrendingUp, color: 'text-emerald-400',
      title: 'Watchlist scan complete',
      desc: `${Object.keys(quotes).length} symbols evaluated in "${activeListName}"`,
      date: new Date(now - 30 * 60 * 1000),
    })
    list.push({
      id: 4001, type: 'system', icon: Sparkles, color: 'text-cyan-400',
      title: 'Pro tip',
      desc: 'Use Compare (vs) in the chart toolbar to overlay ratios like QQQ/SPY',
      date: new Date(now - 60 * 60 * 1000),
    })

    return list.filter((n) => !dismissedSetMem.has(n.id))
  }, [symbol, quotes, dismissedSetMem, activeListName])

  const tabCounts = useMemo(() => {
    const c: Record<string, number> = { all: notifications.length, system: 0, results: 0, scans: 0, alerts: 0 }
    for (const n of notifications) c[n.type] = (c[n.type] || 0) + 1
    return c
  }, [notifications])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readSetMem.has(n.id)).length,
    [notifications, readSetMem]
  )

  const filteredNotifs = notifications.filter((n) =>
    notificationTab === 'all' ? true : n.type === notificationTab
  )

  const markAllRead = useCallback(() => {
    setReadSet(notifications.map((n) => n.id))
  }, [notifications, setReadSet])

  const clearAll = useCallback(() => {
    setDismissedSet([...dismissedSet, ...notifications.map((n) => n.id)])
  }, [notifications, dismissedSet, setDismissedSet])

  const toggleRead = useCallback((id: number) => {
    setReadSet((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }, [setReadSet])

  const dismissOne = useCallback((id: number) => {
    setDismissedSet((prev) => prev.includes(id) ? prev : [...prev, id])
  }, [setDismissedSet])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false); setWatchlistMenuOpen(false); setNotifMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Deep-link: ?symbol=XYZ overrides the persisted symbol on first load.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const s = sp.get('symbol')
    if (s) setSymbol(s.toUpperCase())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentQuote = quotes[symbol.toUpperCase()]

  return (
    <div className="bg-[#05070d] text-white lg:overflow-hidden lg:h-[calc(100dvh-3rem)]">
      {/* HEADER */}
      <div ref={headerRef} className="border-b border-white/10 bg-slate-900/60 backdrop-blur sticky top-0 z-30">
        <div className="px-3 sm:px-4 py-2 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <Logo size={26} showText={false} layout="inline" />
            <p className="hidden xl:block text-[10px] text-gray-400 leading-tight">Pro Technical<br />Analysis Terminal</p>
          </div>

          {/* Single search bar */}
          <div className="relative order-last w-full sm:order-none sm:w-auto sm:ml-2 sm:flex-1 sm:max-w-md">
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
                placeholder="Search any symbol (AAPL, Tesla, BTC-USD, EURUSD=X)…"
                className="bg-transparent text-sm font-semibold flex-1 ml-2 outline-none placeholder-gray-500 min-w-0"
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

            {searchOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setSearchOpen(false)} />
                <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-md shadow-xl max-h-[60vh] sm:max-h-[420px] overflow-y-auto z-40">
                  {searchVal.trim() ? (
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 flex items-center gap-2">
                        Yahoo Finance results
                        {searchLoading && <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />}
                      </div>
                      {!searchLoading && searchResults.length === 0 && (
                        <div className="px-3 py-3 text-xs text-gray-500">No matches. Press Go to use “{searchVal}” directly.</div>
                      )}
                      {searchResults.map((r) => {
                        const q = quotes[r.symbol.toUpperCase()]
                        return (
                          <button
                            key={`${r.symbol}-${r.exchange}`}
                            onMouseDown={(e) => { e.preventDefault(); submitSearch(r.symbol) }}
                            className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center justify-between gap-2"
                          >
                            <span className="min-w-0">
                              <span className="text-xs font-bold text-white">{r.symbol}</span>
                              {r.name && <span className="block text-[11px] text-gray-400 truncate">{r.name}</span>}
                            </span>
                            <span className="shrink-0 text-right">
                              {r.exchange && <span className="block text-[9px] uppercase tracking-wide text-gray-500">{r.exchange}{r.type ? ` · ${r.type}` : ''}</span>}
                              {q && (
                                <span className={`text-[10px] ${q.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {fmtPct(q.changePercent)}
                                </span>
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <>
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
                      <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
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
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {currentQuote && (
            <div className="hidden md:flex items-center gap-3 text-sm">
              <div className="flex flex-col items-end">
                <span className="font-bold">${fmtPrice(currentQuote.price)}</span>
                <span className={`text-[10px] ${currentQuote.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {currentQuote.changePercent >= 0 ? '+' : ''}{fmtPrice(currentQuote.change)} ({fmtPct(currentQuote.changePercent)})
                </span>
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Watchlist dropdown */}
            <div className="relative">
              <button
                onClick={() => { setWatchlistMenuOpen((o) => !o); setNotifMenuOpen(false) }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
              >
                <List className="w-3.5 h-3.5 text-blue-300" />
                <span className="font-semibold">{activeListName}</span>
                <span className="text-gray-400">({watchlist.length})</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${watchlistMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {watchlistMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setWatchlistMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 w-80 bg-slate-900 border border-white/15 rounded-md shadow-xl p-2">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1 px-1">Your Watchlists</div>
                    <div className="space-y-0.5 max-h-64 overflow-y-auto">
                      {Object.keys(watchlists).map((name) => {
                        const isActive = name === activeListName
                        const isRenaming = renamingList === name
                        return (
                          <div
                            key={name}
                            className={`flex items-center gap-1 px-2 py-1.5 rounded ${isActive ? 'bg-blue-600/20' : 'hover:bg-white/5'}`}
                          >
                            {isRenaming ? (
                              <>
                                <input
                                  autoFocus
                                  value={renameVal}
                                  onChange={(e) => setRenameVal(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitRename()
                                    if (e.key === 'Escape') setRenamingList(null)
                                  }}
                                  className="flex-1 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-xs outline-none focus:border-blue-500"
                                />
                                <button onClick={commitRename} className="text-emerald-400 hover:text-emerald-300" title="Save">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setRenamingList(null)} className="text-gray-400 hover:text-white">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => { setActiveListName(name); setWatchlistMenuOpen(false) }}
                                  className="flex-1 flex items-center gap-2 text-left text-xs"
                                >
                                  <Star className={`w-3 h-3 ${isActive ? 'text-amber-400' : 'text-gray-500'}`} fill={isActive ? 'currentColor' : 'none'} />
                                  <span className={isActive ? 'font-semibold text-white' : 'text-gray-200'}>{name}</span>
                                  <span className="text-[10px] text-gray-500 ml-auto">{(watchlists[name] || []).length}</span>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); startRename(name) }}
                                  className="opacity-60 hover:opacity-100 text-gray-300 hover:text-white"
                                  title="Rename"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteList(name) }}
                                  disabled={Object.keys(watchlists).length <= 1}
                                  className="opacity-60 hover:opacity-100 text-gray-300 hover:text-rose-400 disabled:opacity-20 disabled:cursor-not-allowed"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1">
                      <input
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addNewList() }}
                        placeholder="New watchlist…"
                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 placeholder-gray-500"
                      />
                      <button
                        onClick={addNewList}
                        disabled={!newListName.trim() || !!watchlists[newListName.trim()]}
                        className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Notifications dropdown */}
            <div className="relative">
              <button
                onClick={() => { setNotifMenuOpen((o) => !o); setWatchlistMenuOpen(false) }}
                className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
              >
                <Bell className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-semibold">Alerts</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-500/40 text-blue-100 text-[9px] font-bold leading-none">
                    {unreadCount}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform ${notifMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {notifMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 w-96 bg-slate-900 border border-white/15 rounded-md shadow-xl flex flex-col">
                    <div className="p-3 border-b border-white/5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                          Notifications
                          {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-semibold">{unreadCount}</span>
                          )}
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={markAllRead}
                            disabled={unreadCount === 0}
                            className="text-[10px] text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Mark read
                          </button>
                          <button
                            onClick={clearAll}
                            disabled={notifications.length === 0}
                            className="text-[10px] text-gray-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-[10px] overflow-x-auto">
                        {(['all', 'system', 'results', 'scans', 'alerts'] as const).map((t) => {
                          const active = notificationTab === t
                          const count = tabCounts[t] || 0
                          return (
                            <button
                              key={t}
                              onClick={() => setNotificationTab(t)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded capitalize whitespace-nowrap transition-colors ${
                                active
                                  ? 'bg-blue-600/30 text-white border border-blue-500/40'
                                  : 'text-gray-400 hover:text-white border border-transparent hover:bg-white/5'
                              }`}
                            >
                              <span>{t}</span>
                              {count > 0 && (
                                <span className={`px-1 rounded text-[9px] ${active ? 'bg-blue-500/40 text-blue-100' : 'bg-white/10 text-gray-300'}`}>
                                  {count}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[60vh]">
                      {filteredNotifs.map((n) => {
                        const Icon = n.icon
                        const isRead = readSetMem.has(n.id)
                        return (
                          <div
                            key={n.id}
                            onClick={() => toggleRead(n.id)}
                            className={`group px-3 py-2.5 border-b border-white/5 hover:bg-white/5 cursor-pointer flex items-start gap-2 ${isRead ? 'opacity-60' : ''}`}
                          >
                            <div className={`relative w-7 h-7 rounded-md bg-white/5 flex items-center justify-center ${n.color}`}>
                              <Icon className="w-3.5 h-3.5" />
                              {!isRead && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-slate-900" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs truncate ${isRead ? 'text-gray-300' : 'text-white font-medium'}`}>{n.title}</div>
                              <div className="text-[10px] text-gray-400 truncate">{n.desc}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="text-[10px] text-gray-500 whitespace-nowrap">{timeAgo(n.date)}</div>
                              <button
                                onClick={(e) => { e.stopPropagation(); dismissOne(n.id) }}
                                className="opacity-0 group-hover:opacity-100 transition text-gray-500 hover:text-rose-400"
                                title="Dismiss"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
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
                  </div>
                </>
              )}
            </div>

            <button
              onClick={saveToSector}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-emerald-500/15 hover:border-emerald-500/40 text-xs text-emerald-200"
              title="Smart save: file this symbol into its sector watchlist"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-semibold">Save</span>
            </button>
            <button
              onClick={shareCurrent}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-blue-500/15 hover:border-blue-500/40 text-xs text-blue-200"
              title="Share a link to this symbol"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-semibold">Share</span>
            </button>

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

      {/* MAIN */}
      <div ref={mainRef} className="flex flex-col lg:flex-row gap-3 p-2 sm:p-3 overflow-hidden">
        <div className="flex-1 min-w-0">
          <AdvancedChart
            symbol={symbol}
            onSymbolChange={(s) => setSymbol(s)}
            height={chartHeight}
            className="shadow-xl shadow-black/40"
          />
        </div>

        {/* Watchlist side panel (TradingView-style) */}
        {panelOpen ? (
        <aside className="lg:w-80 xl:w-96 shrink-0 rounded-lg border border-white/10 bg-slate-900/60 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" />
              <span className="text-sm font-bold truncate">{activeListName}</span>
              <span className="text-[10px] text-gray-500">({watchlist.length})</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setWatchlistMenuOpen((o) => !o); setNotifMenuOpen(false) }}
                className="p-1 rounded hover:bg-white/10 text-gray-300"
                title="Manage watchlists"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1 rounded hover:bg-white/10 text-gray-300"
                title="Hide watchlist"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Add-symbol input */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10">
            <div className="flex items-center flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 focus-within:border-blue-500">
              <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                value={panelInput}
                onChange={(e) => setPanelInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') addToWatchlist() }}
                placeholder="Add symbol (AAPL, BTC-USD)…"
                className="bg-transparent text-xs font-semibold flex-1 ml-1.5 outline-none placeholder-gray-500 min-w-0"
              />
            </div>
            <button
              onClick={() => addToWatchlist()}
              disabled={!panelInput.trim()}
              className="px-2.5 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* Column header */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 border-b border-white/5">
            <span>Symbol</span>
            <span className="text-right w-20">Last</span>
            <span className="text-right w-16">Chg%</span>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: chartHeight - 16 }}>
            {watchlist.length === 0 && (
              <div className="p-6 text-center text-[11px] text-gray-500">
                Empty list — type a symbol above and press Add.
              </div>
            )}
            {watchlist.map((sym) => {
              const q = quotes[sym.toUpperCase()]
              const active = sym.toUpperCase() === symbol.toUpperCase()
              const up = (q?.changePercent ?? 0) >= 0
              return (
                <div
                  key={sym}
                  onClick={() => setSymbol(sym.toUpperCase())}
                  className={`group grid grid-cols-[1fr_auto_auto] gap-2 items-center px-3 py-2 border-b border-white/5 cursor-pointer ${active ? 'bg-blue-600/15' : 'hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black text-white"
                      style={{ background: symbolColor(sym) }}
                    >
                      {sym.replace(/[-=^.].*$/, '').slice(0, 2)}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-xs font-bold truncate ${active ? 'text-white' : 'text-gray-100'}`}>{sym}</span>
                      {q?.name && <span className="block text-[10px] text-gray-500 truncate">{q.name}</span>}
                    </span>
                  </div>
                  <span className="text-right w-20 text-xs font-semibold tabular-nums">{q ? fmtPrice(q.price) : '—'}</span>
                  <span className="text-right w-16 flex items-center justify-end gap-1">
                    <span className={`text-[11px] font-semibold tabular-nums ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                      {q ? fmtPct(q.changePercent) : '—'}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromWatchlist(sym) }}
                      className="opacity-0 group-hover:opacity-100 transition text-gray-500 hover:text-rose-400"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              )
            })}
          </div>
        </aside>
        ) : (
          <button
            onClick={() => setPanelOpen(true)}
            className="lg:self-start flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-slate-900/60 hover:bg-white/10 text-xs font-semibold text-gray-200"
            title="Show watchlist"
          >
            <List className="w-4 h-4 text-blue-300" />
            <span>Watchlist ({watchlist.length})</span>
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-slate-800 border border-white/15 text-sm text-white shadow-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
