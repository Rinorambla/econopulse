'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  TrendingUp, TrendingDown, Activity, BarChart3, Globe, 
  Zap, Target, Building2, Coins, Banknote, Home,
  RefreshCw, ArrowLeft, Play, Pause, Clock,
  ChevronUp, ChevronDown, AlertCircle, CheckCircle,
  DollarSign, Euro, PoundSterling, Bitcoin,
  LineChart, PieChart, AreaChart, Flame, Star
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Footer from '@/components/Footer'
import GlobalMacroTable from '@/components/analytics/GlobalMacroTable'
const MarketInteractiveChart = dynamic(() => import('@/components/analytics/MarketInteractiveChart'), { ssr: false })
import BullBearSentimentMini from '@/components/analytics/BullBearSentimentMini'
// Heatmap removed per user request (macro only)
// import GlobalMarketHeatmap from '@/components/analytics/GlobalMarketHeatmap' // removed per user request
// import GlobalTreemap from '@/components/analytics/GlobalTreemap' // removed per user request
import { useExtendedMarketData } from '@/hooks/useExtendedMarketData'

const MarketBreadthChart = dynamic(() => import('@/components/analytics/MarketBreadthChart').then(m=>m.MarketBreadthChart), { ssr:false })
const SectorBarChart = dynamic(() => import('@/components/analytics/SectorBarChart').then(m=>m.SectorBarChart), { ssr:false })
const PerformanceHistogram = dynamic(() => import('@/components/analytics/PerformanceHistogram').then(m=>m.PerformanceHistogram), { ssr:false })
import { useRouter, useSearchParams } from 'next/navigation'
const EconomicCalendar = dynamic(() => import('@/components/analytics/EconomicCalendar').then(m=>m.EconomicCalendar), { ssr:false })
const EarningsCalendar = dynamic(() => import('@/components/analytics/EarningsCalendar').then(m=>m.EarningsCalendar), { ssr:false })
const NewsWidget = dynamic(()=> import('@/components/NewsWidget'), { ssr:false })
const NewsInsight = dynamic(()=> import('@/components/analytics/NewsInsight').then(m=>m.NewsInsight), { ssr:false })

interface MarketAsset {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  category: string
  performance: number
  volatility?: number
  rsi?: number
  trend?: 'up' | 'down' | 'sideways'
}

interface MarketSummary {
  totalAssets: number
  gainers: number
  losers: number
  unchanged: number
  totalVolume: number
  marketMomentum: number
  fearGreedIndex: number
}

const CATEGORY_CONFIG = {
  'Equity': { 
    icon: BarChart3, 
    color: '#3B82F6', 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/20',
    emoji: '📈'
  },
  'International Equity': {
    icon: Globe,
    color: '#1D4ED8',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    emoji: '🌍'
  },
  'Forex': { 
    icon: Globe, 
    color: '#10B981', 
    bg: 'bg-emerald-500/10', 
    border: 'border-emerald-500/20',
    emoji: '💱'
  },
  'Crypto': { 
    icon: Bitcoin, 
    color: '#F59E0B', 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/20',
    emoji: '₿'
  },
  'Commodities': { 
    icon: Zap, 
    color: '#EF4444', 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/20',
    emoji: '⚒️'
  },
  'Bonds': { 
    icon: Banknote, 
    color: '#8B5CF6', 
    bg: 'bg-violet-500/10', 
    border: 'border-violet-500/20',
    emoji: '🏦'
  },
  'REITs': { 
    icon: Building2, 
    color: '#06B6D4', 
    bg: 'bg-cyan-500/10', 
    border: 'border-cyan-500/20',
    emoji: '🏢'
  },
  'Indices': {
    icon: LineChart,
    color: '#F97316',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    emoji: '📊'
  },
  'Sector ETFs': {
    icon: PieChart,
    color: '#0EA5E9',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    emoji: '🧬'
  }
}

export default function BloombergDashboard() {
  const router = useRouter()
  const sp = useSearchParams()
  const [assets, setAssets] = useState<MarketAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchError, setLastFetchError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'performance' | 'volume' | 'marketCap'>('performance')
  // Single macro view (heatmap removed)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [marketSummary, setMarketSummary] = useState<MarketSummary | null>(null)
  const [lastFetchFail, setLastFetchFail] = useState<number>(0)
  // Multi-timeframe performance removed
  const [dataQuality, setDataQuality] = useState<{ total:number; byField:Record<string,number> }|null>(null)
  // Multi-timeframe performance state
  const [timeframePerf, setTimeframePerf] = useState<Record<string, any>>({})
  const [perfLoading, setPerfLoading] = useState(false)
  const [perfError, setPerfError] = useState<string|null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'d1'|'w1'|'m1'|'m3'|'m6'|'ytd'|'w52'>('d1')
  const [lastPerfUpdate, setLastPerfUpdate] = useState<string>('')
  // Hydration guard for client-only sections prone to DOM placement diffs
  const [mounted, setMounted] = useState(false)
  // Analyst Speak state
  const [analystItems, setAnalystItems] = useState<Array<{title:string;source:string;url:string;publishedDate:string;tickers:string[];snippet:string;sentiment:'bullish'|'bearish'|'neutral';action?:string;priceTarget?:number}>>([])
  const [analystLoading, setAnalystLoading] = useState(false)
  const fetchAnalystSpeak = useCallback(async () => {
    try {
      setAnalystLoading(true)
      const r = await fetch(`/api/analyst-speak?limit=18`, { cache:'no-store' })
      if (r.ok) {
        const j = await r.json()
        setAnalystItems(j.data || [])
      } else {
        setAnalystItems([])
      }
    } catch {
      setAnalystItems([])
    } finally { setAnalystLoading(false) }
  }, [])
  // Heatmap state removed
  // Global heatmap removed

  // Heatmap logic removed
  // Load global hierarchical market data (MVP)
  // loadGlobal removed
  // Removed mega extended universe hook

  // Generate demo data fallback
  const generateDemoData = useCallback(() => {
    const symbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'SPY', 'QQQ',
      'BTC-USD', 'ETH-USD', 'GLD', 'SLV', 'OIL', 'EUR-USD', 'GBP-USD', 'JPY-USD'
    ]
    
    const categories = ['Equity', 'Crypto', 'Commodities', 'Forex', 'REITs', 'Bonds']
    
    const demoAssets = symbols.map(symbol => {
      const performance = (Math.random() - 0.5) * 20 // -10% to +10%
      const price = Math.random() * 1000 + 10
      
      return {
        symbol,
        name: `${symbol} Corporation`,
        price,
        change: (price * performance) / 100,
        changePercent: performance,
        volume: Math.floor(Math.random() * 10000000) + 100000,
        marketCap: Math.floor(Math.random() * 1000000000000) + 1000000000,
        category: categories[Math.floor(Math.random() * categories.length)],
        performance,
        volatility: Math.random() * 50,
        rsi: Math.random() * 100,
        trend: performance > 2 ? 'up' : performance < -2 ? 'down' : 'sideways'
      } as MarketAsset
    })
    
    setAssets(demoAssets)
    setLastUpdate(new Date().toISOString())
    console.log('✅ Generated demo data with', demoAssets.length, 'assets')
  }, [])

  // Process market data from API
  const processMarketData = useCallback((data: any[]) => {
    const normalizeCategory = (raw: string) => {
      if (!raw) return 'Other'
      const r = raw.toLowerCase()
      if (r === 'currency' || r === 'forex') return 'Forex'
      if (r === 'cryptocurrency' || r === 'crypto') return 'Crypto'
      if (r === 'bonds') return 'Bonds'
      if (r === 'commodities') return 'Commodities'
      if (r === 'reits') return 'REITs'
      if (r === 'etf' || r === 'technology') return 'Equity'
      if (r === 'equity') return 'Equity'
  if (r === 'indices' || r === 'index') return 'Indices'
  if (r === 'sector_etf' || r === 'sector_etfs' || r === 'sector') return 'Sector ETFs'
  // Normalizza tutte le varianti internazionali in una singola categoria coerente
	if (r === 'intl_eq' || r === 'international' || r === 'international equity' || r==='international etfs' || r==='international etf' || r==='international equities') return 'International Equity'
      return raw
    }

    const processedAssets = data.map(item => {
      const category = normalizeCategory(item.category || item.assetClass || 'Other')
      let perf = item.changePercent
      if (perf === undefined || perf === null) perf = item.performance
      // Derive from change & price if still undefined / zero-like and change provided
      if ((perf === undefined || perf === null) && item.change != null && (item.price || item.close)) {
        const base = item.price || item.close
        if (base) perf = (item.change / base) * 100
      }
      // Final fallback
      if (perf === undefined || perf === null || !isFinite(perf)) perf = 0
      const changeVal = item.change != null ? item.change : (perf && (item.price||item.close) ? ((item.price||item.close) * perf)/100 : 0)
      return {
        symbol: item.symbol || item.ticker || 'N/A',
        name: item.name || item.symbol || 'Unknown',
        price: item.price || item.close || 0,
        change: changeVal,
        changePercent: perf,
        volume: item.volume || 0,
        marketCap: item.marketCap || 0,
        category,
        performance: perf,
        volatility: item.volatility || Math.random() * 50,
        rsi: item.rsi || Math.random() * 100,
        trend: perf > 2 ? 'up' : perf < -2 ? 'down' : 'sideways'
      } as MarketAsset
    })
    setAssets(processedAssets)
  }, [])

  // Merge Tiingo commodities if Yahoo missing futures
  const ensureCommoditiesCompleteness = useCallback(async (current: any[]) => {
    const hasFutures = current.some(a=>a.category==='Commodities' && a.symbol.includes('=F'))
    if (hasFutures) return current
    try {
      console.log('🛢️  Commodities futures missing, attempting Tiingo backfill...')
      const resp = await fetch('/api/tiingo-unified?category=commodities')
      if (resp.ok) {
        const tj = await resp.json()
        if (tj.data) {
          const merged = [...current, ...tj.data.filter((x:any)=>x.category==='Commodities')]
          return merged
        }
      }
    } catch (e) {
      console.warn('⚠️ Tiingo commodities backfill failed', e)
    }
    return current
  }, [])

  // Fetch market data: Yahoo primary, Tiingo snapshot fallback, then unified, then demo
  const fetchMarketData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('🎯 Fetching market data from Yahoo unified API...')
      // Try Yahoo unified (isolated)
      try {
        const yahooResp = await fetch(`/api/yahoo-unified?category=${selectedCategory}`)
        if (yahooResp.ok) {
          const yj = await yahooResp.json()
          if (yj.ok && yj.data) {
            let dataset = yj.data
            if (selectedCategory === 'commodities' || selectedCategory === 'all') {
              dataset = await ensureCommoditiesCompleteness(dataset)
            }
            console.log(`✅ Yahoo API: ${dataset.length} assets (category=${selectedCategory})`)
            processMarketData(dataset)
            if (yj.issues) setDataQuality(yj.issues)
            if (yj.summary) setMarketSummary({
              totalAssets: yj.summary.total,
              gainers: yj.summary.gainers,
              losers: yj.summary.losers,
              unchanged: yj.summary.total - (yj.summary.gainers + yj.summary.losers),
              totalVolume: yj.data.reduce((s: number, a: any) => s + (a.volume || 0), 0),
              marketMomentum: Math.round((yj.summary.avgPerformance || 0) * 10) / 10,
              fearGreedIndex: 50
            })
            setLastUpdate(new Date().toISOString())
            return
          }
        }
      } catch (e) {
        console.warn('Yahoo unified fetch failed:', e)
      }

      // Tiingo snapshot fallback
      console.log('⚠️ Yahoo failed, trying Tiingo snapshot fallback...')
      try {
        const snapshot = await fetch(`/api/tiingo-snapshot?category=${selectedCategory}`)
        if (snapshot.ok) {
          const sj = await snapshot.json()
          if (sj.status === 'success' && sj.data) {
            console.log(`✅ Tiingo snapshot fallback: ${sj.data.length} assets`)
            processMarketData(sj.data)
            if (sj.summary) setMarketSummary(sj.summary)
            setLastUpdate(sj.timestamp || new Date().toISOString())
            return
          }
        }
      } catch (e) {
        console.warn('Tiingo snapshot fetch failed:', e)
      }

      // Tiingo unified live fallback
      console.log('⚠️ Tiingo snapshot failed, trying Tiingo unified live API...')
      try {
        const live = await fetch(`/api/tiingo-unified?category=${selectedCategory}`)
        if (live.ok) {
          const lj = await live.json()
          if (lj.status === 'success' && lj.data) {
            console.log(`✅ Tiingo live unified: ${lj.data.length} assets`)
            processMarketData(lj.data)
            setLastUpdate(lj.timestamp || new Date().toISOString())
            return
          }
        }
      } catch (e) {
        console.warn('Tiingo unified fetch failed:', e)
      }

      // Final: local demo data without extra failing calls
      console.log('⚠️ All APIs failed, generating local demo data...')
      generateDemoData()
    } catch (fetchError) {
      console.warn('Fetch chain error (handled):', fetchError)
      setError('Failed to fetch market data. Using demo data.')
      setLastFetchError(fetchError instanceof Error ? fetchError.message : 'Fetch error')
      setLastFetchFail(Date.now())
      generateDemoData()
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, generateDemoData, processMarketData, ensureCommoditiesCompleteness])

  // Multi-timeframe performance fetch removed
  // Fetch multi-timeframe performance for current visible symbols (limit to 120 for coverage)
  const fetchPerformance = useCallback(async () => {
    try {
      setPerfLoading(true); setPerfError(null)
      // Use currently relevant symbols (filtered if category selected)
      const baseList = selectedCategory==='all' ? assets : assets.filter(a=> a.category.toLowerCase()===selectedCategory.toLowerCase())
      const symbols = baseList.slice(0,120).map(a=>a.symbol)
      if (!symbols.length) { setTimeframePerf({}); return }
      const resp = await fetch(`/api/performance?symbols=${encodeURIComponent(symbols.join(','))}`)
      if (!resp.ok) throw new Error('perf api')
      const js = await resp.json()
      if (js.ok && js.data) {
        const map: Record<string, any> = {}
        js.data.forEach((row: any) => { map[row.symbol] = row })
        setTimeframePerf(map)
        setLastPerfUpdate(new Date().toISOString())
      } else {
        setPerfError(js.error||'Perf error')
      }
    } catch (e:any) {
      setPerfError(e.message)
    } finally {
      setPerfLoading(false)
    }
  }, [assets, selectedCategory])

  // Refresh performance when assets change significantly
  useEffect(()=>{ if(assets.length) fetchPerformance() }, [assets, fetchPerformance])

  // Initialize data on component mount
  useEffect(() => {
    // Sync selected timeframe with URL param `r` (e.g., 3M, 6M, 1Y)
    try {
      const r = sp?.get('r') || ''
      const mapRangeToTf: Record<string, typeof selectedTimeframe> = {
        '1D':'d1', '5D':'w1', '1M':'m1', '3M':'m3', '6M':'m6', '1Y':'w52', '5Y':'w52'
      }
      if (r && mapRangeToTf[r]) setSelectedTimeframe(mapRangeToTf[r])
    } catch {}

    // Evita refetch immediato se appena fallito (<5s)
    if (Date.now() - lastFetchFail < 5000) {
      console.warn('⏳ Delay fetch dopo errore recente')
    } else {
      fetchMarketData()
    }
    
    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(fetchMarketData, 30000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [fetchMarketData, autoRefresh, lastFetchFail])

  // Mark client-mounted to avoid insertBefore issues in React 19 during hydration
  useEffect(()=>{ setMounted(true) }, [])

  // Fetch Analyst Speak on mount and when s param changes
  useEffect(() => { fetchAnalystSpeak() }, [fetchAnalystSpeak])

  const momentumGauge = useMemo(() => {
    if (!assets.length) return 0
    const total = assets.reduce((sum,a)=>{
      const tf = timeframePerf[a.symbol]?.[selectedTimeframe]
      const val = (typeof tf==='number' && isFinite(tf)) ? tf : a.performance
      return sum + val
    },0)
    return Math.round(total / assets.length)
  }, [assets, timeframePerf, selectedTimeframe])

  const topPerformers = useMemo(() => {
    return [...assets]
      .map(a=>{
        const tf = timeframePerf[a.symbol]?.[selectedTimeframe]
        return { asset:a, perf: (typeof tf==='number'&&isFinite(tf))?tf:a.performance }
      })
      .sort((a,b)=> b.perf - a.perf)
      .slice(0,5)
      .map(x=>({...x.asset, performance:x.perf}))
  }, [assets, timeframePerf, selectedTimeframe])

  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets
    if (selectedCategory !== 'all') {
      const sel = selectedCategory.toLowerCase()
      filtered = assets.filter(asset => asset.category.toLowerCase() === sel)
    }
    return [...filtered]
      .map(a=>{ const tf=timeframePerf[a.symbol]?.[selectedTimeframe]; return { ...a, performance:(typeof tf==='number'&&isFinite(tf))?tf:a.performance } })
      .sort((a,b)=> b.performance - a.performance)
  }, [assets, selectedCategory, timeframePerf, selectedTimeframe])

  // Group assets by category
  const groupedAssets = useMemo(() => {
    return assets.reduce((groups, asset) => {
      const category = asset.category || 'Other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(asset)
      return groups
    }, {} as Record<string, MarketAsset[]>)
  }, [assets])

  // Ensure selected category remains valid
  useEffect(()=>{
    if(selectedCategory!=='all' && !Object.keys(groupedAssets).some(c=>c.toLowerCase()===selectedCategory.toLowerCase())) {
      setSelectedCategory('all')
    }
  },[groupedAssets, selectedCategory])

  const categories = useMemo(() => {
    const cats = Object.keys(groupedAssets)
      .map(c=>({ raw:c, norm:c.toLowerCase() }))
      .reduce<Record<string,string>>((acc,{raw,norm})=>{ if(!acc[norm]) acc[norm]=raw; return acc }, {})
    const ordered = Object.values(cats).sort()
    return [{ value: 'all', label: 'All Categories' }, ...ordered.map(cat => ({ value: cat, label: cat }))]
  }, [groupedAssets])

  // Performance distribution
  const performanceDistribution = useMemo(() => {
    const vals = assets.map(a=>{
      const tf=timeframePerf[a.symbol]?.[selectedTimeframe]
      return (typeof tf==='number'&&isFinite(tf))?tf:a.performance
    })
    const positive = vals.filter(v=>v>1).length
    const negative = vals.filter(v=>v<-1).length
    const neutral = vals.length - positive - negative
    return { positive, negative, neutral }
  }, [assets, timeframePerf, selectedTimeframe])

  // Sector breakdown: prefer Sector ETFs mapping when available, fallback to category groups
  const sectorBreakdown = useMemo(() => {
    const sectorEtfMap: Record<string, string> = {
      XLB:'Materials', XLE:'Energy', XLF:'Financials', XLI:'Industrials', XLK:'Technology',
      XLP:'Consumer Staples', XLU:'Utilities', XLV:'Healthcare', XLY:'Consumer Discretionary',
      XLC:'Communication Services', XLRE:'Real Estate'
    }
    const bySector: Record<string,{ sum:number; n:number }> = {}
    assets.forEach(a => {
      const sector = sectorEtfMap[a.symbol?.toUpperCase?.()||'']
      if (!sector) return
      const tf = timeframePerf[a.symbol]?.[selectedTimeframe]
      const val = (typeof tf==='number'&&isFinite(tf))?tf:a.performance
      const rec = bySector[sector] || (bySector[sector] = { sum:0, n:0 })
      rec.sum += val; rec.n += 1
    })
    let out = Object.entries(bySector).map(([name, v]) => ({ name, count:v.n, avgPerformance: v.n? v.sum/v.n : 0 }))
    if (!out.length) {
      out = Object.entries(groupedAssets).map(([name, list]) => {
        const avg = list.reduce((sum,a)=>{
          const tf=timeframePerf[a.symbol]?.[selectedTimeframe]
          const val=(typeof tf==='number'&&isFinite(tf))?tf:a.performance
          return sum+val
        },0)/ (list.length||1)
        return { name, count:list.length, avgPerformance: avg }
      })
    }
    return out.sort((a,b)=> b.avgPerformance - a.avgPerformance)
  }, [assets, groupedAssets, timeframePerf, selectedTimeframe])

  const getPerformanceColor = useCallback((performance: number) => {
    if (performance > 5) return 'bg-green-500 text-white border-green-600'
    if (performance > 2) return 'bg-green-400 text-white border-green-500'
    if (performance > 0) return 'bg-green-300 text-green-900 border-green-400'
    if (performance > -2) return 'bg-red-300 text-red-900 border-red-400'
    if (performance > -5) return 'bg-red-400 text-white border-red-500'
    return 'bg-red-500 text-white border-red-600'
  }, [])

  if (loading && !assets.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <RefreshCw className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Loading Market Data</h2>
            <p className="text-gray-400">Fetching real-time financial data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
  <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header con freccia indietro */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
              >
                <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
                <span>Back</span>
              </button>
              
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Multi-Asset Macro Dashboard
                </h1>
                <p className="text-gray-400 text-lg">
                  Real-time performance across all asset classes
                </p>
                {lastUpdate && (
                  <p className="text-sm text-gray-500 mt-2">
                    Last updated: {new Date(lastUpdate).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {dataQuality && (
                <div className="text-xs text-gray-400 bg-gray-700/40 px-3 py-1 rounded-md border border-gray-600 flex flex-col">
                  <span>Data Quality: issues {dataQuality.total}</span>
                  <span className="opacity-70">{Object.keys(dataQuality.byField).map(k=>`${k}:${dataQuality.byField[k]}`).join(' • ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bull/Bear Mini Sentiment (based on current timeframe performances) */}
        <div className="w-full">
          {assets.length > 0 && (
            <BullBearSentimentMini performances={assets.map(a=>{ const tf=timeframePerf[a.symbol]?.[selectedTimeframe]; return (typeof tf==='number'&&isFinite(tf))?tf:a.performance })} />
          )}
        </div>

        {/* Interactive Market Chart */}
        <div className="w-full">
          <MarketInteractiveChart
            className="mt-2"
            rangeKeyOverride={(() => { const map: Record<string,string> = { d1:'1D', w1:'5D', m1:'1M', m3:'3M', m6:'6M', ytd:'1Y', w52:'1Y' }; return (map[selectedTimeframe] || '3M') as any })()}
          />
        </div>

        {/* Stats Cards (deferred until mounted to avoid hydration placement issues) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" suppressHydrationWarning>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="h-5 w-5 text-white" />
              <h3 className="text-white font-semibold">Performance Distribution</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-200 font-medium">Positive (&gt;1%)</span>
                <span className="bg-green-500 text-white px-2 py-1 rounded text-sm">{performanceDistribution.positive}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-200 font-medium">Negative (&lt;-1%)</span>
                <span className="bg-red-500 text-white px-2 py-1 rounded text-sm">{performanceDistribution.negative}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-200 font-medium">Neutral</span>
                <span className="bg-gray-500 text-white px-2 py-1 rounded text-sm">{performanceDistribution.neutral}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-white" />
              <h3 className="text-white font-semibold">Sector Performance</h3>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {sectorBreakdown.slice(0, 4).map((sector) => (
                <div key={sector.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-200 font-medium truncate flex-1">{sector.name}</span>
                  <span className={`font-bold ${sector.avgPerformance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {sector.avgPerformance.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-white" />
              <h3 className="text-white font-semibold">Market Momentum</h3>
            </div>
            {mounted ? (
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${momentumGauge >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {momentumGauge > 0 ? '+' : ''}{momentumGauge}
                </div>
                <div className="text-sm text-gray-300">
                  {momentumGauge > 2 ? 'Strong Bullish' : 
                   momentumGauge > 0 ? 'Bullish' :
                   momentumGauge > -2 ? 'Bearish' : 'Strong Bearish'}
                </div>
              </div>
            ) : (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-700/50 rounded mb-2" />
                <div className="h-4 bg-gray-700/40 rounded" />
              </div>
            )}
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-white" />
              <h3 className="text-white font-semibold">Top Performers</h3>
            </div>
            <div className="space-y-2">
              {topPerformers.slice(0, 3).map((asset) => (
                <div key={asset.symbol} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 font-medium">{asset.symbol}</span>
                  <span className="text-green-400 font-bold">+{asset.performance.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Analytics */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div>
            <MarketBreadthChart data={performanceDistribution} />
          </div>
          <div>
            <SectorBarChart data={sectorBreakdown} />
          </div>
          <div>
            <PerformanceHistogram values={assets.map(a=>{ const tf=timeframePerf[a.symbol]?.[selectedTimeframe]; return (typeof tf==='number'&&isFinite(tf))?tf:a.performance })} />
          </div>
        </div>

        


        {/* Filtro Categoria */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 text-gray-300 font-medium">View: <span className="px-2 py-1 bg-blue-600/20 rounded text-blue-300">macro</span></div>
            <div className="flex items-center gap-2">
              <span className="text-gray-300 font-medium">Filter by Asset Class:</span>
              <select value={selectedCategory} onChange={(e)=>setSelectedCategory(e.target.value)} className="w-48 bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2">
                {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
            </div>
            {/* Timeframe Buttons */}
      <div className="flex flex-wrap gap-2 ml-auto items-center">
              {[
                {k:'d1',lbl:'1D'},{k:'w1',lbl:'1W'},{k:'m1',lbl:'1M'},{k:'m3',lbl:'3M'},{k:'m6',lbl:'6M'},{k:'ytd',lbl:'YTD'},{k:'w52',lbl:'52W'}
              ].map(b=> (
                <button key={b.k}
          onClick={()=>{
            setSelectedTimeframe(b.k as any)
            // propagate to URL so MarketInteractiveChart stays in sync
            try {
              const tfToRange: Record<string,string> = { d1:'1D', w1:'5D', m1:'1M', m3:'3M', m6:'6M', ytd:'1Y', w52:'1Y' }
              const current = new URLSearchParams(sp?.toString()||'')
              current.set('r', tfToRange[b.k] || '3M')
              router.replace(`?${current.toString()}`, { scroll: false })
            } catch {}
          }}
          disabled={perfLoading}
          className={`text-xs px-2 py-1 rounded border transition-colors ${selectedTimeframe===b.k ? 'bg-blue-600 border-blue-500 text-white':'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'} ${perfLoading?'opacity-60 cursor-wait':''}`}>{b.lbl}</button>
              ))}
              {/* hide visible refresh/update text per UX policy */}
            </div>
            <div className="flex items-center gap-2"><span className="text-gray-300">Total Assets:</span><span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">{filteredAndSortedAssets.length}</span></div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 backdrop-blur-sm rounded-lg border border-red-700 p-4">
      <p className="text-red-400 text-center">⚠️ {error}{lastFetchError?` (${lastFetchError})`:''}</p>
          </div>
        )}

  {/* Heatmap Grid (uses selected timeframe performance) */}

  {selectedCategory === 'all' ? (
    <GlobalMacroTable assets={filteredAndSortedAssets.map(a=>({
      symbol:a.symbol,
      name:a.symbol,
      price:a.price,
      changePercent:(()=>{ const p=timeframePerf[a.symbol]?.[selectedTimeframe]; return (typeof p==='number' && isFinite(p))?p:a.performance })(),
      category:a.category
    }))} />
  ) : (
    <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-lg">{selectedCategory} Assets</h3>
        <span className="text-xs text-gray-400">{filteredAndSortedAssets.length} items</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-2 py-1">Symbol</th>
              <th className="text-left px-2 py-1">Name</th>
              <th className="text-right px-2 py-1">Price</th>
              <th className="text-right px-2 py-1">Change%</th>
              <th className="text-right px-2 py-1">Change</th>
              <th className="text-right px-2 py-1">Volume</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedAssets.map(a=>{
                  const ch = (()=>{ const p=timeframePerf[a.symbol]?.[selectedTimeframe]; return (typeof p==='number'&&isFinite(p))?p:a.performance })()
              const color = ch>0?'text-green-400':ch<0?'text-red-400':'text-gray-300'
              return (
                <tr key={a.symbol} className="border-t border-gray-700 hover:bg-gray-700/30">
                  <td className="px-2 py-1 font-medium text-gray-200" title={(()=>{const p=timeframePerf[a.symbol];return p?`1D:${p.d1?.toFixed?.(2)||'-'} 1W:${p.w1?.toFixed?.(2)||'-'} 1M:${p.m1?.toFixed?.(2)||'-'} 3M:${p.m3?.toFixed?.(2)||'-'} 6M:${p.m6?.toFixed?.(2)||'-'} YTD:${p.ytd?.toFixed?.(2)||'-'} 52W:${p.w52?.toFixed?.(2)||'-'}`:'No perf data'})()}>{a.symbol}</td>
                  <td className="px-2 py-1 text-gray-400 truncate max-w-[180px]">{a.name||a.symbol}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-gray-200">{a.price? a.price.toFixed(2):'-'}</td>
                  <td className={`px-2 py-1 text-right tabular-nums font-semibold ${color}`}>{isFinite(ch)? (ch>0?'+':'')+ch.toFixed(2)+'%':'-'}</td>
                  <td className={`px-2 py-1 text-right tabular-nums ${color}`}>{a.change? (a.change>0?'+':'')+a.change.toFixed(2):'-'}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-gray-400">{a.volume? a.volume.toLocaleString(): '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredAndSortedAssets.length===0 && (
          <div className="text-center text-sm text-gray-400 py-6">No data for {selectedCategory}</div>
        )}
      </div>
    </div>
  )}

  {/* Calendars moved below macro / assets table */}
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
    <EconomicCalendar />
    <EarningsCalendar />
  </div>

  {/* News */}
  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
    <div className="xl:col-span-1 bg-gray-800/50 border border-gray-700 rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
  <h3 className="text-white font-semibold text-lg">Latest News</h3>
      </div>
      <NewsWidget />
    </div>
    <div className="xl:col-span-2 flex flex-col gap-6">
      <NewsInsight />
    </div>
  </div>

  {/* Global Market Map removed */}

  {/* Multi-timeframe table removed; using buttons to drive displayed performance */}

  {/* Analyst Speak - bottom section */}
  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <h3 className="text-white font-semibold text-lg">Analyst Speak</h3>
      </div>
      <div className="flex items-center gap-2">
  {/* Removed symbols badge to make section global */}
  <div className="text-xs text-gray-400">{analystLoading ? 'Loading…' : `${analystItems.length} items`}</div>
      </div>
    </div>
    {analystItems.length === 0 && !analystLoading && (
      <div className="text-sm text-gray-400">No analyst items found for current symbols.</div>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {analystItems.slice(0, 12).map((it, idx) => (
        <a
          key={idx}
          href={it.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gray-900/40 border border-gray-700 rounded-md p-3 hover:bg-gray-900/60 transition-colors"
          title={(it.tickers||[]).join(', ')}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] text-gray-400 truncate">{new Date(it.publishedDate).toLocaleString()}</span>
            <span
              className={
                `text-[10px] px-2 py-0.5 rounded border ${
                  it.sentiment==='bullish'
                    ? 'text-emerald-300 border-emerald-500/40 bg-emerald-600/10'
                    : it.sentiment==='bearish'
                    ? 'text-red-300 border-red-500/40 bg-red-600/10'
                    : 'text-gray-300 border-gray-500/40 bg-gray-600/10'
                }`
              }
            >
              {it.sentiment}
            </span>
          </div>
          <div className="text-white font-medium line-clamp-2 mb-1">{it.title}</div>
          {it.snippet && (
            <div className="text-gray-400 text-sm line-clamp-3">{it.snippet}</div>
          )}
          <div className="flex items-center gap-2 mt-2">
            {it.action && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border border-blue-500/40 text-blue-300 bg-blue-600/10">
                {it.action}
              </span>
            )}
            {typeof it.priceTarget === 'number' && (
              <span className="text-[10px] px-2 py-0.5 rounded border border-yellow-500/40 text-yellow-300 bg-yellow-600/10">
                PT ${it.priceTarget}
              </span>
            )}
            <span className="text-[10px] text-gray-400 ml-auto truncate">{it.source}</span>
          </div>
        </a>
      ))}
    </div>
  </div>

  {filteredAndSortedAssets.length === 0 && !loading && (
          <div className="text-center py-20">
            <Target className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Data Available</h3>
            <p className="text-gray-400">Unable to load market data at this time.</p>
          </div>
        )}

  </div>
  <Footer />
    </div>
  )
}