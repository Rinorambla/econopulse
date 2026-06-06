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
  Download,
  MoreHorizontal,
} from 'lucide-react'
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

// Composites the EconoPulse logo + brand text as a watermark on the bottom-right
// of a chart screenshot, plus the ticker symbol on the top-left, so shared
// images always show both what they are and where they came from.
async function addWatermark(src: HTMLCanvasElement, symbol?: string): Promise<HTMLCanvasElement> {
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height
  const ctx = out.getContext('2d')
  if (!ctx) return src
  ctx.drawImage(src, 0, 0)

  const scale = Math.max(1, src.width / 900)
  const pad = Math.round(12 * scale)
  const fontSize = Math.round(15 * scale)
  const logoSize = Math.round(18 * scale)

  // ===== Ticker symbol (top-left) =====
  const sym = (symbol || '').trim().toUpperCase()
  if (sym) {
    const symFont = Math.round(26 * scale)
    ctx.save()
    ctx.font = `800 ${symFont}px Inter, system-ui, -apple-system, sans-serif`
    ctx.textBaseline = 'top'
    const symW = ctx.measureText(sym).width
    // subtle dark plate behind the text for readability on any background
    const plateH = symFont + Math.round(10 * scale)
    const plateW = symW + Math.round(18 * scale)
    ctx.globalAlpha = 0.38
    ctx.fillStyle = '#0f172a'
    const r = Math.round(6 * scale)
    const px = pad, py = pad
    ctx.beginPath()
    ctx.moveTo(px + r, py)
    ctx.arcTo(px + plateW, py, px + plateW, py + plateH, r)
    ctx.arcTo(px + plateW, py + plateH, px, py + plateH, r)
    ctx.arcTo(px, py + plateH, px, py, r)
    ctx.arcTo(px, py, px + plateW, py, r)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffffff'
    ctx.fillText(sym, px + Math.round(9 * scale), py + Math.round(5 * scale))
    ctx.restore()
  }

  // Brand text with cyan→blue gradient (matches the in-app status bar).
  ctx.font = `700 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`
  ctx.textBaseline = 'middle'
  const text = 'ECONOPULSE.AI'
  const textW = ctx.measureText(text).width
  // Bottom-LEFT placement (TradingView style), lifted ABOVE the date axis so the
  // brand sits inside the plot area and never covers the date labels at the bottom.
  const dateAxisGap = Math.round(46 * scale)
  const baseX = pad
  const baseY = src.height - dateAxisGap - logoSize / 2

  // Try to draw the wave logo; fall back to text-only if it fails to load.
  const logo = new Image()
  logo.crossOrigin = 'anonymous'
  const loaded = await new Promise<boolean>((resolve) => {
    logo.onload = () => resolve(true)
    logo.onerror = () => resolve(false)
    logo.src = '/logo-econopulse-wave.svg'
  })

  // Dark rounded plate behind the brand for readability over candles / grid lines.
  const brandW = (loaded ? logoSize + Math.round(6 * scale) : 0) + textW
  ctx.save()
  ctx.globalAlpha = 0.38
  ctx.fillStyle = '#0f172a'
  const br = Math.round(6 * scale)
  const bx = baseX - Math.round(7 * scale)
  const bh = Math.max(logoSize, fontSize) + Math.round(10 * scale)
  const by = baseY - bh / 2
  const bw = brandW + Math.round(14 * scale)
  ctx.beginPath()
  ctx.moveTo(bx + br, by)
  ctx.arcTo(bx + bw, by, bx + bw, by + bh, br)
  ctx.arcTo(bx + bw, by + bh, bx, by + bh, br)
  ctx.arcTo(bx, by + bh, bx, by, br)
  ctx.arcTo(bx, by, bx + bw, by, br)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = 0.92
  let textX = baseX
  if (loaded) {
    ctx.drawImage(logo, baseX, baseY - logoSize / 2, logoSize, logoSize)
    textX = baseX + logoSize + Math.round(6 * scale)
  }
  const grad = ctx.createLinearGradient(textX, 0, textX + textW, 0)
  grad.addColorStop(0, '#67e8f9')
  grad.addColorStop(0.5, '#0ea5e9')
  grad.addColorStop(1, '#2563eb')
  ctx.fillStyle = grad
  ctx.fillText(text, textX, baseY)
  ctx.restore()

  return out
}
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [watchlistMenuOpen, setWatchlistMenuOpen] = useState(false)
  const [notifMenuOpen, setNotifMenuOpen] = useState(false)
  const [notificationTab, setNotificationTab] = useState<'all' | 'system' | 'results' | 'scans' | 'alerts'>('all')
  const [renamingList, setRenamingList] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [newListName, setNewListName] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [chartHeight, setChartHeight] = useState(620)
  const [containerH, setContainerH] = useState<number | undefined>(undefined)
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelInput, setPanelInput] = useState('')
  // Watchlist add-symbol autocomplete (live Yahoo search dropdown)
  const [panelResults, setPanelResults] = useState<SearchResult[]>([])
  const [panelSearchOpen, setPanelSearchOpen] = useState(false)
  const mainRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartApiRef = useRef<{ screenshot: () => HTMLCanvasElement | null } | null>(null)

  // Responsive chart height — adapts the terminal to phones, tablets and desktops.
  // We measure the REAL distance from the top of the viewport to the terminal
  // container (the actual sticky header height) so the page fits the viewport
  // exactly on every device with no page scroll. A threshold guard + debounce
  // absorb the tiny viewport changes a phone's address bar / keyboard cause, so
  // the chart stays steady instead of jumping while you work on mobile.
  useEffect(() => {
    let lastContainerH = -1
    let lastChartH = -1
    const compute = () => {
      const cTop = containerRef.current?.getBoundingClientRect().top ?? 56
      // Use innerHeight (stable) rather than visualViewport.height (which shrinks
      // when the on-screen keyboard opens) so focusing an input never resizes the chart.
      const vh = window.innerHeight
      const nextContainer = Math.max(360, Math.round(vh - cTop))
      if (Math.abs(nextContainer - lastContainerH) >= 24) {
        lastContainerH = nextContainer
        setContainerH(nextContainer)
      }
      const top = mainRef.current?.getBoundingClientRect().top ?? 110
      const pad = 24 // bottom padding + safety margin so nothing overflows
      // AdvancedChart renders a toolbar + indicators bar + crosshair row + status
      // bar around the chart canvas; subtract that chrome plus a small buffer so the
      // whole terminal always fits the viewport without any vertical scroll.
      const chartChrome = 132
      const nextChart = Math.max(280, Math.min(820, Math.round(vh - top - pad - chartChrome)))
      if (Math.abs(nextChart - lastChartH) >= 24) {
        lastChartH = nextChart
        setChartHeight(nextChart)
      }
    }
    const raf = requestAnimationFrame(compute)
    let t: ReturnType<typeof setTimeout> | undefined
    const schedule = () => { if (t) clearTimeout(t); t = setTimeout(compute, 120) }
    window.addEventListener('resize', schedule)
    window.addEventListener('orientationchange', schedule)
    // Recompute when the header height changes (price badge, toolbar wrapping),
    // observing the container itself so we never feed the chart's own size back in.
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(schedule)
      ro.observe(containerRef.current)
    }
    return () => { cancelAnimationFrame(raf); if (t) clearTimeout(t); window.removeEventListener('resize', schedule); window.removeEventListener('orientationchange', schedule); ro?.disconnect() }
  }, [panelOpen])

  // On phones/tablets the watchlist would push the chart off-screen, so collapse
  // it by default there; it stays open on desktop where there is room beside the chart.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(max-width: 1023px)').matches) setPanelOpen(false)
  }, [])

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
    // Only load the symbol on the chart. Do NOT auto-save it to a watchlist —
    // the user decides what to save via the explicit "Save" action / side panel.
    setSymbol(v)
    setSearchOpen(false)
    setSearchVal('')
  }, [searchVal, setSymbol])

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

  // Debounced autocomplete for the watchlist add-symbol input.
  useEffect(() => {
    const q = panelInput.trim()
    if (q.length < 1) { setPanelResults([]); return }
    let aborted = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/yahoo-search?q=${encodeURIComponent(q)}`, { cache: 'no-store', signal: AbortSignal.timeout(9000) })
        const json = await res.json()
        if (!aborted) setPanelResults(Array.isArray(json?.data) ? json.data.slice(0, 8) : [])
      } catch {
        if (!aborted) setPanelResults([])
      }
    }, 220)
    return () => { aborted = true; clearTimeout(t) }
  }, [panelInput])

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

  // Share — exports the current chart as a PNG image. On mobile it offers the
  // native share sheet (Save to Photos / gallery); on desktop it downloads the file.
  const shareCurrent = useCallback(async () => {
    const v = symbol.trim().toUpperCase()
    const baseCanvas = chartApiRef.current?.screenshot?.() || null
    const canvas = baseCanvas ? await addWatermark(baseCanvas, v) : null
    if (canvas) {
      try {
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
        if (blob) {
          const fileName = `${v}-econopulse-${new Date().toISOString().slice(0, 10)}.png`
          const file = new File([blob], fileName, { type: 'image/png' })
          const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
          if (nav.canShare && nav.canShare({ files: [file] }) && navigator.share) {
            await navigator.share({ files: [file], title: `${v} • Econopulse.ai`, text: `${v} chart` })
            return
          }
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          a.remove()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
          showToast('Chart image saved')
          return
        }
      } catch {
        // fall through to link sharing
      }
    }
    // Fallback: share/copy a deep link to the current symbol.
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

  const searchSlot = (
          <div className="relative w-40 sm:w-52 md:w-64 shrink-0">
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
                <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
                <div className="fixed left-2 right-2 top-24 sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-1 sm:w-96 max-w-[calc(100vw-1rem)] bg-slate-900 border border-white/10 rounded-md shadow-xl max-h-[60vh] sm:max-h-[420px] overflow-y-auto z-50">
                  {searchVal.trim() ? (
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 flex items-center gap-2">
                        Search results
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
                            <span className="min-w-0 flex items-center gap-2">
                              <img
                                src={`https://assets.parqet.com/logos/symbol/${r.symbol}?format=jpg`}
                                alt=""
                                loading="lazy"
                                className="w-5 h-5 rounded-full bg-slate-700 object-cover shrink-0"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
                              />
                              <span className="min-w-0">
                                <span className="text-xs font-bold text-white">{r.symbol}</span>
                                {r.name && <span className="block text-[11px] text-gray-400 truncate">{r.name}</span>}
                              </span>
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
                              <span className="flex items-center gap-1.5 min-w-0">
                                <img
                                  src={`https://assets.parqet.com/logos/symbol/${s}?format=jpg`}
                                  alt=""
                                  loading="lazy"
                                  className="w-4 h-4 rounded-full bg-slate-700 object-cover shrink-0"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
                                />
                                <span className="text-xs font-semibold truncate">{s}</span>
                              </span>
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
  )

  const actionsSlot = (
          <div className="relative">
            <button
              onClick={() => { setMenuOpen((o) => !o); setWatchlistMenuOpen(false); setNotifMenuOpen(false) }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
              title="Menu"
            >
              <MoreHorizontal className="w-4 h-4 text-blue-300" />
              <span className="font-semibold hidden sm:inline">{activeListName}</span>
              <span className="text-gray-400">({watchlist.length})</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/40 text-blue-100 text-[9px] font-bold leading-none">{unreadCount}</span>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="fixed left-2 right-2 top-24 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1 sm:w-60 max-w-[calc(100vw-1rem)] z-50 bg-slate-900 border border-white/15 rounded-md shadow-xl p-1">
                  <button onClick={() => { setWatchlistMenuOpen(true); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded hover:bg-white/5 text-xs text-gray-200">
                    <List className="w-4 h-4 text-blue-300 shrink-0" />
                    <span className="font-semibold">Watchlists</span>
                    <span className="ml-auto text-gray-500 truncate">{activeListName} ({watchlist.length})</span>
                  </button>
                  <button onClick={() => { setNotifMenuOpen(true); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded hover:bg-white/5 text-xs text-gray-200">
                    <Bell className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="font-semibold">Alerts</span>
                    {unreadCount > 0 && <span className="ml-auto px-1.5 py-0.5 rounded-full bg-blue-500/40 text-blue-100 text-[9px] font-bold">{unreadCount}</span>}
                  </button>
                  <div className="my-1 border-t border-white/10" />
                  <button onClick={() => { saveToSector(); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded hover:bg-emerald-500/15 text-xs text-emerald-200">
                    <Save className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">Save to watchlist</span>
                  </button>
                  <button onClick={() => { shareCurrent(); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded hover:bg-blue-500/15 text-xs text-blue-200">
                    <Download className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">Save / Share chart image</span>
                  </button>
                  <div className="my-1 border-t border-white/10" />
                  <button onClick={() => { fetchQuotes(); setMenuOpen(false) }} disabled={loadingQuotes} className="w-full flex items-center gap-2 px-2.5 py-2 rounded hover:bg-white/5 text-xs text-gray-300 disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 shrink-0 ${loadingQuotes ? 'animate-spin' : ''}`} />
                    <span className="font-semibold">Refresh quotes</span>
                  </button>
                </div>
              </>
            )}
            {watchlistMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setWatchlistMenuOpen(false)} />
                  <div className="fixed left-2 right-2 top-24 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1 sm:w-80 max-w-[calc(100vw-1rem)] z-50 bg-slate-900 border border-white/15 rounded-md shadow-xl p-2">
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
            {notifMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifMenuOpen(false)} />
                  <div className="fixed left-2 right-2 top-24 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1 sm:w-96 max-w-[calc(100vw-1rem)] max-h-[70vh] z-50 bg-slate-900 border border-white/15 rounded-md shadow-xl flex flex-col">
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
  )

  return (
    <div
      ref={containerRef}
      style={containerH ? { height: containerH } : undefined}
      className="bg-[#05070d] text-white overflow-hidden flex flex-col h-[calc(100dvh-3.5rem)]"
    >
      {/* MAIN */}
      <div ref={mainRef} className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-2 sm:p-3 overflow-hidden">
        <div className="flex-1 min-w-0 min-h-0">
          <AdvancedChart
            symbol={symbol}
            onSymbolChange={(s) => setSymbol(s)}
            height={chartHeight}
            className="shadow-xl shadow-black/40"
            leftSlot={searchSlot}
            rightSlot={actionsSlot}
            onChartApi={(api) => { chartApiRef.current = api }}
          />
        </div>

        {/* Watchlist side panel (TradingView-style) */}
        {panelOpen ? (
        <>
        {/* Mobile backdrop */}
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setPanelOpen(false)} />
        <aside className="fixed inset-x-3 bottom-3 top-16 z-50 lg:static lg:inset-auto lg:top-auto lg:z-auto lg:w-80 xl:w-96 shrink-0 rounded-lg border border-white/10 bg-slate-900/95 lg:bg-slate-900/60 backdrop-blur overflow-hidden flex flex-col">
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
          <div className="relative flex items-center gap-1.5 px-3 py-2 border-b border-white/10">
            <div className="flex items-center flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 focus-within:border-blue-500">
              <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                value={panelInput}
                onChange={(e) => { setPanelInput(e.target.value.toUpperCase()); setPanelSearchOpen(true) }}
                onFocus={() => setPanelSearchOpen(true)}
                onBlur={() => setTimeout(() => setPanelSearchOpen(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { addToWatchlist(); setPanelSearchOpen(false) }
                  if (e.key === 'Escape') { setPanelInput(''); setPanelSearchOpen(false) }
                }}
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
            {panelSearchOpen && panelResults.length > 0 && (
              <div className="absolute z-50 top-full left-3 right-3 mt-1 max-h-64 overflow-y-auto bg-slate-900/98 border border-white/15 rounded-lg shadow-xl backdrop-blur">
                {panelResults.map((r) => (
                  <button
                    key={`${r.symbol}-${r.exchange ?? ''}`}
                    onMouseDown={(e) => { e.preventDefault(); addToWatchlist(r.symbol); setPanelInput(''); setPanelSearchOpen(false) }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">{r.symbol}</span>
                      {r.type && <span className="text-[9px] uppercase text-gray-500">{r.type}</span>}
                    </div>
                    {r.name && <div className="text-[10px] text-gray-400 truncate">{r.name}{r.exchange ? ` · ${r.exchange}` : ''}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Column header */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 border-b border-white/5">
            <span>Symbol</span>
            <span className="text-right w-20">Last</span>
            <span className="text-right w-16">Chg%</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
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
                    <span className="relative w-6 h-6 rounded-full shrink-0 overflow-hidden">
                      <span
                        className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white"
                        style={{ background: symbolColor(sym) }}
                      >
                        {sym.replace(/[-=^.].*$/, '').slice(0, 2)}
                      </span>
                      <img
                        src={`https://assets.parqet.com/logos/symbol/${sym}?format=jpg`}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
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
        </>
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
