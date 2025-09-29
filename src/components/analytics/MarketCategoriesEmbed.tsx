'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { ArrowLeft, Building2, PieChart, Activity, Target } from 'lucide-react'

// Reuse existing analytics widgets
const MarketInteractiveChart = dynamic(() => import('@/components/analytics/MarketInteractiveChart'), { ssr: false })
const TradingViewWidget = dynamic(() => import('@/components/analytics/TradingViewWidget'), { ssr: false })
const MarketBreadthChart = dynamic(() => import('@/components/analytics/MarketBreadthChart').then(m=>m.MarketBreadthChart), { ssr:false })
const SectorBarChart = dynamic(() => import('@/components/analytics/SectorBarChart').then(m=>m.SectorBarChart), { ssr:false })
const PerformanceHistogram = dynamic(() => import('@/components/analytics/PerformanceHistogram').then(m=>m.PerformanceHistogram), { ssr:false })
import GlobalMacroTable from '@/components/analytics/GlobalMacroTable'

type TimeframeKey = 'd1'|'w1'|'m1'|'m3'|'m6'|'ytd'|'w52'

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
}

export function MarketCategoriesEmbed() {
  const [assets, setAssets] = useState<MarketAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeKey>('d1')
  const [timeframePerf, setTimeframePerf] = useState<Record<string, any>>({})
  // Symbol used for chart analytics (TradingView shows AMEX:SPY; use SPY for Yahoo history)
  const [selectedSymbol, setSelectedSymbol] = useState<string>('SPY')
  const [symbolInput, setSymbolInput] = useState<string>('SPY')
  const tvSymbol = useMemo(() => {
    const s = (selectedSymbol || '').toUpperCase().trim()
    // Crypto
    if (/^[A-Z]+-USD$/.test(s)) return `CRYPTO:${s.replace('-USD','USD')}`
    // FX pairs (Yahoo '=X')
    if (/^[A-Z]{6}=X$/.test(s)) {
      const p = s.replace('=X','')
      return `FX:${p}` // e.g., FX:EURUSD
    }
    // Commodity futures (Yahoo '=F') → map to TradingView continuous contracts
    const futMap: Record<string,string> = {
      'CL=F':'NYMEX:CL1!','BZ=F':'TVC:UKOIL','GC=F':'COMEX:GC1!','SI=F':'COMEX:SI1!','NG=F':'NYMEX:NG1!','HG=F':'COMEX:HG1!',
      'ZC=F':'CBOT:ZC1!','ZW=F':'CBOT:ZW1!','ZS=F':'CBOT:ZS1!'
    }
    if (s in futMap) return futMap[s]
    // Indices / Dollar index
    if (s === '^GSPC') return 'TVC:SPX'
    if (s === '^NDX') return 'TVC:NDX'
    if (s === '^DJI') return 'TVC:DJI'
    if (s === '^VIX') return 'CBOE:VIX'
    if (s === 'DX-Y.NYB') return 'TVC:DXY'
    // Common equities/ETFs
    const map: Record<string,string> = {
      'SPY': 'AMEX:SPY','IVV':'AMEX:IVV','VOO':'AMEX:VOO','QQQ':'NASDAQ:QQQ','VTI':'AMEX:VTI',
      'AAPL':'NASDAQ:AAPL','MSFT':'NASDAQ:MSFT','TSLA':'NASDAQ:TSLA','NVDA':'NASDAQ:NVDA',
      'GLD':'AMEX:GLD','SLV':'AMEX:SLV'
    }
    return map[s] || `NASDAQ:${s}`
  }, [selectedSymbol])

  // Alias resolver for user-friendly inputs (e.g., 'crude oil' -> 'CL=F')
  const resolveUserSymbol = useCallback((input: string): string => {
    const t = (input || '').trim()
    if (!t) return 'SPY'
    const s = t.toUpperCase()
    const l = t.toLowerCase()
    const alias: Record<string,string> = {
      'CRUDE OIL':'CL=F','OIL':'CL=F','WTI':'CL=F',
      'BRENT':'BZ=F','UKOIL':'BZ=F',
      'GOLD':'GC=F','SILVER':'SI=F','NATURAL GAS':'NG=F','GAS':'NG=F','COPPER':'HG=F',
      'DOLLAR INDEX':'DX-Y.NYB','DXY':'DX-Y.NYB',
      'BITCOIN':'BTC-USD','ETHEREUM':'ETH-USD','ETH':'ETH-USD','BTC':'BTC-USD',
      'EURO':'EURUSD=X','EURUSD':'EURUSD=X','USDJPY':'USDJPY=X','USD/JPY':'USDJPY=X',
      'SP500':'SPY','S&P 500':'SPY','S&P':'SPY'
    }
    if (alias[s]) return alias[s]
    // lowercase variants
    const lAlias: Record<string,string> = {
      'crude oil':'CL=F','oil':'CL=F','wti':'CL=F','brent':'BZ=F','gold':'GC=F','silver':'SI=F','natural gas':'NG=F','gas':'NG=F','copper':'HG=F',
      'dollar index':'DX-Y.NYB','dxy':'DX-Y.NYB','bitcoin':'BTC-USD','ethereum':'ETH-USD','euro':'EURUSD=X','eurusd':'EURUSD=X','usdjpy':'USDJPY=X',
      'sp500':'SPY','s&p 500':'SPY','s&p':'SPY'
    }
    if (lAlias[l]) return lAlias[l]
    // If user already typed a valid Yahoo/crypto symbol, pass-through
    return s
  }, [])
  // BB/Vol/Volume analytics snapshot
  const [bbInfo, setBbInfo] = useState<null | {
    percentB: number
    bandwidth: number
    pos: 'below'|'lower'|'middle'|'upper'|'above'
    atrPct: number
    volVsAvg: number
    squeeze: boolean
  }>(null)
  const [econ, setEcon] = useState<null | { cycle?: string; aiDir?: string; aiConf?: number }>(null)
  const [priceInfo, setPriceInfo] = useState<null | { price: number; prevClose?: number; change?: number; changePct?: number; asOf?: number }>(null)
  // Derived Overbought/Oversold from BB %B
  const obos = useMemo(() => {
    if (!bbInfo) return null
    const pb = bbInfo.percentB
    // Strong signals when price beyond bands, otherwise near-threshold signals
    if (bbInfo.pos === 'above' || pb >= 1) return { label: 'Overbought', color: 'text-amber-300' as const }
    if (bbInfo.pos === 'below' || pb <= 0) return { label: 'Oversold', color: 'text-red-300' as const }
    if (pb >= 0.9) return { label: 'Overbought', color: 'text-amber-300' as const }
    if (pb <= 0.1) return { label: 'Oversold', color: 'text-red-300' as const }
    return { label: 'Neutral', color: 'text-gray-300' as const }
  }, [bbInfo])

  // Simple AI Buy/Sell signal based on BB position, %B, volume vs avg, and daily direction
  const aiSignal = useMemo(() => {
    if (!bbInfo || !priceInfo) return null
    const reasons: string[] = []
    const pb = bbInfo.percentB // 0..1
    const pos = bbInfo.pos
    const volX = bbInfo.volVsAvg
    const chPct = Number(priceInfo.changePct ?? 0)

    // Determine bias
    let action: 'Buy' | 'Sell' | 'Neutral' = 'Neutral'
    // Extremes first
    if (pb >= 0.9 || pos === 'above') { action = 'Sell'; reasons.push('%B near/above upper band') }
    else if (pb <= 0.1 || pos === 'below') { action = 'Buy'; reasons.push('%B near/below lower band') }
    else {
      // Continuation bias with confirmation by direction + volume
      if (pos === 'upper' && chPct > 0 && volX >= 1.2) { action = 'Buy'; reasons.push('Price in upper band with positive day and strong volume') }
      else if (pos === 'lower' && chPct < 0 && volX >= 1.2) { action = 'Sell'; reasons.push('Price in lower band with negative day and strong volume') }
      else { reasons.push('Mid-range BB; mixed signals') }
    }

    // Confidence scoring
    let conf = 0.5
    if (action === 'Buy') {
      const extreme = Math.max(0, 0.12 - Math.min(pb, 0.12)) / 0.12 // closeness to lower extreme
      const volFactor = Math.max(0, Math.min(volX - 1, 1.2)) / 1.2
      const dir = chPct > 0 ? 0.25 : 0
      conf = 0.35 + 0.4 * extreme + 0.2 * volFactor + dir
    } else if (action === 'Sell') {
      const extreme = Math.max(0, Math.min(1, (pb - 0.88) / 0.12)) // closeness to upper extreme
      const volFactor = Math.max(0, Math.min(volX - 1, 1.2)) / 1.2
      const dir = chPct < 0 ? 0.25 : 0
      conf = 0.35 + 0.4 * extreme + 0.2 * volFactor + dir
    } else {
      const centrality = 1 - Math.abs(pb - 0.5) * 2
      conf = 0.25 + 0.3 * centrality
    }
    const confidence = Math.round(Math.max(0.15, Math.min(0.92, conf)) * 100)

    // Additional notes
    if (bbInfo.squeeze) reasons.push('Low-volatility squeeze regime')
    if (volX >= 1.4) reasons.push('Volume > 1.4× 20d avg (conviction)')

    return { action, confidence, reasons }
  }, [bbInfo, priceInfo])

  // Fetch market data (uses unified API in existing app)
  const fetchMarketData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/yahoo-unified?category=${selectedCategory}`)
      if (!r.ok) throw new Error('unified api')
      const j = await r.json()
      const data = j?.data || []
      const normalized: MarketAsset[] = data.map((item: any) => {
        let perf = item.changePercent
        if (perf == null) perf = item.performance
        if ((perf == null) && item.change != null && (item.price || item.close)) {
          const base = item.price || item.close
          perf = base ? (item.change / base) * 100 : 0
        }
        if (!Number.isFinite(perf)) perf = 0
        const changeVal = item.change != null ? item.change : (perf && (item.price||item.close) ? ((item.price||item.close) * perf)/100 : 0)
        return {
          symbol: item.symbol || item.ticker || 'N/A',
          name: item.name || item.symbol || 'Unknown',
          price: item.price || item.close || 0,
          change: changeVal,
          changePercent: perf,
          volume: item.volume || 0,
          marketCap: item.marketCap || 0,
          category: item.category || item.assetClass || 'Other',
          performance: perf,
        }
      })
      setAssets(normalized)
    } catch (e: any) {
      setError(e?.message || 'fetch error')
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

  // Fetch multi-timeframe perf for visible assets
  const fetchPerformance = useCallback(async () => {
    try {
      const list = selectedCategory==='all' ? assets : assets.filter(a=>a.category.toLowerCase()===selectedCategory.toLowerCase())
      const symbols = list.slice(0,120).map(a=>a.symbol)
      if (!symbols.length) { setTimeframePerf({}); return }
      const resp = await fetch(`/api/performance?symbols=${encodeURIComponent(symbols.join(','))}`)
      if (!resp.ok) return
      const js = await resp.json()
      if (js.ok && js.data) {
        const map: Record<string, any> = {}
        js.data.forEach((row: any) => { map[row.symbol] = row })
        setTimeframePerf(map)
      }
    } catch {}
  }, [assets, selectedCategory])

  useEffect(()=>{ fetchMarketData() }, [fetchMarketData])
  useEffect(()=>{ if(assets.length) fetchPerformance() }, [assets, fetchPerformance])

  // Lightweight TA helpers
  const sma = useCallback((arr:number[], p:number)=>{
    const out:(number|null)[]=[]; let sum=0; for(let i=0;i<arr.length;i++){ sum+=arr[i]; if(i>=p) sum-=arr[i-p]; out.push(i>=p-1? sum/p : null) } return out
  },[])
  const bb = useCallback((cl:number[], p=20, mult=2)=>{
    const basis = sma(cl,p)
    const upper:(number|null)[]=[]; const lower:(number|null)[]=[]
    for(let i=0;i<cl.length;i++){
      if(i<p-1){ upper.push(null); lower.push(null); continue }
      const slice = cl.slice(i-p+1, i+1)
      const mean = basis[i] as number
      const variance = slice.reduce((s,v)=> s+Math.pow(v-mean,2),0)/p
      const sd = Math.sqrt(variance)
      upper.push(mean + mult*sd); lower.push(mean - mult*sd)
    }
    return { basis, upper, lower }
  },[sma])
  const atr = useCallback((bars:{high:number;low:number;close:number}[], p=14)=>{
    const trs:number[]=[]
    for(let i=0;i<bars.length;i++){
      const b=bars[i]
      if(i===0){ trs.push(b.high-b.low); continue }
      const pc=bars[i-1].close
      trs.push(Math.max(b.high-b.low, Math.abs(b.high-pc), Math.abs(b.low-pc)))
    }
    // EMA for ATR
    const out:(number|null)[]=[]; const k=2/(p+1); let prev: number | null = null
    for(let i=0;i<trs.length;i++){
      const v = trs[i]
      if(prev==null){ prev=v; out.push(null); continue }
      prev = v*k + (prev as number)*(1-k)
      out.push(prev)
    }
    return out
  },[])

  // Fetch history for Price + BB/Vol/Volume snapshot + economic context
  useEffect(()=>{
    let alive = true
    ;(async()=>{
      try{
        // Price history
        const qs = new URLSearchParams({ symbol: selectedSymbol, range: '3mo', interval: '1d' })
        const r = await fetch(`/api/yahoo-history?${qs.toString()}`, { cache:'no-store' })
        if(r.ok){
          const j = await r.json()
          const bars = (j?.bars || j?.data?.bars || j?.data || []) as Array<{time:number;open:number;high:number;low:number;close:number;volume:number}>
          if(Array.isArray(bars) && bars.length>25){
            const closes = bars.map(b=> Number(b.close)||0)
            // Price card: last close, prev close, daily change
            const i = closes.length-1
            const lastClose = closes[i]
            let prevIdx = i-1
            while(prevIdx>=0 && !Number.isFinite(closes[prevIdx])) prevIdx--
            const prevClose = prevIdx>=0 ? closes[prevIdx] : undefined
            const change = (prevClose!=null && Number.isFinite(prevClose)) ? (lastClose - prevClose) : undefined
            const changePct = (prevClose!=null && Number.isFinite(prevClose) && prevClose!==0) ? ((lastClose - prevClose)/prevClose)*100 : undefined
            if(alive) setPriceInfo({ price:lastClose, prevClose, change, changePct, asOf: bars[i]?.time })
            const bb20 = bb(closes,20,2)
            const up = bb20.upper[i] as number | null
            const lo = bb20.lower[i] as number | null
            const mid = bb20.basis[i] as number | null
            const c = closes[i]
            let pos: 'below'|'lower'|'middle'|'upper'|'above' = 'middle'
            if(up!=null && c>up) pos='above'; else if(lo!=null && c<lo) pos='below'; else if(mid!=null && c>=mid) pos='upper'; else pos='lower'
            const bandwidth = (up!=null && lo!=null && mid!=null && mid!==0) ? ( (up-lo)/mid ) : 0
            const percentB = (up!=null && lo!=null) ? ((c - lo) / Math.max(1e-9, (up - lo))) : 0.5
            const atrVals = atr(bars,14)
            const atrLast = atrVals[i] as number | null
            const atrPct = (atrLast!=null && c) ? (atrLast / c) : 0
            const vols = bars.map(b=> Number(b.volume)||0)
            const vSMA = sma(vols,20)
            const volVsAvg = (vols[i] && vSMA[i]) ? (vols[i] / (vSMA[i] as number)) : 1
            // Squeeze: bandwidth in bottom 20% of last 90 days
            const bws:number[] = []
            for(let k=Math.max(20, bws.length); k<closes.length; k++){
              const u = bb20.upper[k] as number | null
              const l = bb20.lower[k] as number | null
              const m = bb20.basis[k] as number | null
              if(u!=null && l!=null && m!=null && m!==0) bws.push((u-l)/m)
            }
            const thresh = (()=>{ const s=[...bws].sort((a,b)=>a-b); const idx=Math.floor(s.length*0.2); return s[idx] || 0 })()
            const squeeze = bandwidth>0 && bandwidth<=thresh
            if(alive) setBbInfo({ percentB, bandwidth, pos, atrPct, volVsAvg, squeeze })
          } else if(alive){ setBbInfo(null); setPriceInfo(null) }
        }
        // Economic context (best-effort)
        const [ea, ed] = await Promise.allSettled([
          fetch('/api/ai-economic-analysis').then(r=> r.ok? r.json(): null).catch(()=>null),
          fetch('/api/economic-data').then(r=> r.ok? r.json(): null).catch(()=>null),
        ])
        const ai = (ea as any)?.value
        const ec = (ed as any)?.value
        const payload: { cycle?: string; aiDir?: string; aiConf?: number } = {}
        if(ai){ payload.aiDir = ai?.data?.direction || ai?.direction; payload.aiConf = ai?.data?.confidence || ai?.confidence }
        if(ec){ payload.cycle = ec?.data?.current?.cycle || ec?.current?.cycle }
        if(alive) setEcon(payload)
      }catch{
        if(alive){ setBbInfo(null); setEcon(null); setPriceInfo(null) }
      }
    })()
    return ()=>{ alive=false }
  }, [selectedSymbol, bb, atr, sma])

  const groupedAssets = useMemo(() => {
    return assets.reduce((groups, asset) => {
      const c = asset.category || 'Other'
      if (!groups[c]) groups[c] = []
      groups[c].push(asset)
      return groups
    }, {} as Record<string, MarketAsset[]>)
  }, [assets])

  const categories = useMemo(() => {
    const cats = Object.keys(groupedAssets)
      .map(c=>({ raw:c, norm:c.toLowerCase() }))
      .reduce<Record<string,string>>((acc,{raw,norm})=>{ if(!acc[norm]) acc[norm]=raw; return acc }, {})
    const ordered = Object.values(cats).sort()
    return [{ value: 'all', label: 'All Categories' }, ...ordered.map(cat => ({ value: cat, label: cat }))]
  }, [groupedAssets])

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

  // Sector breakdown similar to standalone page
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

  if (loading && !assets.length) {
    return (
      <div className="bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-black/60 border border-white/10 rounded-xl p-6">
        <div className="text-center py-10 text-gray-300">Loading Market Categories…</div>
      </div>
    )
  }

  return (
  <section id="market-categories" className="bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-black/60 rounded-xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-3"><PieChart className="w-6 h-6 text-emerald-400" /> Market Categories</h2>
      </div>

      {/* Symbol selector synced with TradingView + analysis */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Symbol:</span>
          <input
            value={symbolInput}
            onChange={(e)=> setSymbolInput(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==='Enter'){ const v=resolveUserSymbol(symbolInput); if(v) { setSelectedSymbol(v); setSymbolInput(v) } } }}
            placeholder="SPY, QQQ, AAPL, BTC-USD…"
            className="bg-white/10 border border-white/20 rounded-md px-3 py-1 text-sm text-white"
            aria-label="Symbol"
          />
          <button onClick={()=>{ const v=resolveUserSymbol(symbolInput); if(v) { setSelectedSymbol(v); setSymbolInput(v) } }} className="px-2 py-1 text-xs rounded bg-blue-600 text-white">Apply</button>
        </div>
        {/* Removed TV debug mapping display as requested */}
      </div>

      <div className="w-full mb-3 h-[520px]">
        <TradingViewWidget symbol={tvSymbol} theme="dark" interval="D" showRSI={false} showStochastic={false} />
      </div>
      {/* BB • Volume • Volatility • Economic Conditions snapshot */}
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Bollinger Bands</div>
          {bbInfo ? (
            <div className="text-sm text-gray-200">
              <div><span className="text-gray-400">Position:</span> <b className="text-white capitalize">{bbInfo.pos}</b></div>
              <div><span className="text-gray-400">%B:</span> <b className="text-white">{(bbInfo.percentB*100).toFixed(1)}%</b></div>
              <div><span className="text-gray-400">Bandwidth:</span> <b className="text-white">{(bbInfo.bandwidth*100).toFixed(2)}%</b></div>
              {bbInfo.squeeze && <div className="mt-1 text-amber-300 text-xs">Squeeze: Low volatility regime</div>}
            </div>
          ) : <div className="text-gray-400 text-sm">Loading…</div>}
        </div>
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Volume</div>
          {bbInfo ? (
            <div className="text-sm text-gray-200">
              <div><span className="text-gray-400">vs 20d avg:</span> <b className={bbInfo.volVsAvg>=1? 'text-emerald-300':'text-gray-200'}>{bbInfo.volVsAvg.toFixed(2)}×</b></div>
              <div className="text-xs text-gray-400">Higher than average suggests conviction on moves</div>
            </div>
          ) : <div className="text-gray-400 text-sm">Loading…</div>}
        </div>
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Volatility</div>
          {bbInfo ? (
            <div className="text-sm text-gray-200">
              <div><span className="text-gray-400">ATR%:</span> <b className="text-white">{(bbInfo.atrPct*100).toFixed(2)}%</b></div>
              <div className="text-xs text-gray-400">ATR normalized by price</div>
            </div>
          ) : <div className="text-gray-400 text-sm">Loading…</div>}
        </div>
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Price</div>
          {priceInfo ? (
            <div className="text-sm text-gray-200">
              <div className="flex items-baseline gap-2">
                <span className="text-white text-lg font-semibold tabular-nums">{priceInfo.price?.toFixed(2)}</span>
                {typeof priceInfo.change==='number' && typeof priceInfo.changePct==='number' && (
                  <span className={`text-xs font-medium tabular-nums ${priceInfo.change>0?'text-emerald-400':priceInfo.change<0?'text-red-400':'text-gray-300'}`}>
                    {(priceInfo.change>0?'+':'')+priceInfo.change.toFixed(2)} ({(priceInfo.changePct).toFixed(2)}%)
                  </span>
                )}
              </div>
              {obos && (
                <div className="mt-1 text-xs">
                  <span className="text-gray-400">Status:</span> <span className={`${obos.color} font-medium`}>{obos.label}</span>
                </div>
              )}
              {priceInfo.asOf && (
                <div className="text-[10px] text-gray-500 mt-1">As of {new Date(priceInfo.asOf).toLocaleDateString()}</div>
              )}
            </div>
          ) : <div className="text-gray-400 text-sm">Loading…</div>}
        </div>
        {/* AI Signal */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">AI Signal</div>
          {aiSignal ? (
            <div className="text-sm text-gray-200">
              <div className="flex items-baseline gap-2">
                <span className={`text-lg font-semibold ${aiSignal.action==='Buy'?'text-emerald-400':aiSignal.action==='Sell'?'text-red-400':'text-gray-200'}`}>{aiSignal.action}</span>
                <span className="text-xs text-gray-400">Confidence {aiSignal.confidence}%</span>
              </div>
              {aiSignal.reasons.length>0 && (
                <ul className="mt-1 text-[11px] text-gray-300 list-disc list-inside space-y-0.5">
                  {aiSignal.reasons.slice(0,3).map((r,i)=>(<li key={i}>{r}</li>))}
                </ul>
              )}
            </div>
          ) : <div className="text-gray-400 text-sm">Waiting for data…</div>}
        </div>
      </div>

      {/* Controls under the chart as requested */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Filter:</span>
          <select value={selectedCategory} onChange={(e)=>setSelectedCategory(e.target.value)} className="bg-white/10 border border-white/20 rounded-md px-3 py-1 text-sm">
            {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {[{k:'d1',lbl:'1D'},{k:'w1',lbl:'1W'},{k:'m1',lbl:'1M'},{k:'m3',lbl:'3M'},{k:'m6',lbl:'6M'},{k:'ytd',lbl:'YTD'},{k:'w52',lbl:'52W'}].map(b=> (
            <button key={b.k} onClick={()=>setSelectedTimeframe(b.k as TimeframeKey)} className={`text-xs px-2 py-1 rounded border transition-colors ${selectedTimeframe===b.k ? 'bg-blue-600 border-blue-500 text-white':'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}>{b.lbl}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <MarketBreadthChart data={performanceDistribution} />
        <SectorBarChart data={sectorBreakdown as any} />
        <PerformanceHistogram values={assets.map(a=>{ const tf=timeframePerf[a.symbol]?.[selectedTimeframe]; return (typeof tf==='number'&&isFinite(tf))?tf:a.performance })} />
      </div>

      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        {selectedCategory === 'all' ? (
          <GlobalMacroTable assets={filteredAndSortedAssets.map(a=>({ symbol:a.symbol, name:a.symbol, price:a.price, changePercent:(()=>{ const p=timeframePerf[a.symbol]?.[selectedTimeframe]; return (typeof p==='number' && isFinite(p))?p:a.performance })(), category:a.category }))} />
        ) : (
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
                  const color = ch>0?'text-emerald-400':ch<0?'text-red-400':'text-gray-300'
                  return (
                    <tr key={a.symbol} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-2 py-1 font-medium text-gray-200">{a.symbol}</td>
                      <td className="px-2 py-1 text-gray-400 truncate max-w-[180px]">{a.name||a.symbol}</td>
                      <td className="px-2 py-1 text-right tabular-nums text-gray-200">{a.price? a.price.toFixed(2):'-'}</td>
                      <td className={`px-2 py-1 text-right tabular-nums font-semibold ${color}`}>{Number.isFinite(ch)? (ch>0?'+':'')+ch.toFixed(2)+'%':'-'}</td>
                      <td className={`px-2 py-1 text-right tabular-nums ${color}`}>{a.change? (a.change>0?'+':'')+a.change.toFixed(2):'-'}</td>
                      <td className="px-2 py-1 text-right tabular-nums text-gray-400">{a.volume? a.volume.toLocaleString(): '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
    </section>
  )
}

export default MarketCategoriesEmbed
