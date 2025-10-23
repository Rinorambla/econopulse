'use client'

import { useEffect, useMemo, useState } from 'react'

type CountryItem = {
  code: string
  name: string
  group: 'G7' | 'Developed' | 'Emerging'
  proxy: string
  price: number | null
  changePercent: number
  sentiment: 'Bullish'|'Bearish'|'Neutral'
  sentimentScore: number
  retailStrength: number
  hedgeFundFlow: number
  driver: string
  outlook: string
}

export default function WorldDriversMap() {
  const [countries, setCountries] = useState<CountryItem[]>([])
  const [updatedAt, setUpdatedAt] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [activeGroup, setActiveGroup] = useState<'G7'|'Developed'|'Emerging'>('G7')
  const [symbolOpen, setSymbolOpen] = useState<string | null>(null)
  const [bars, setBars] = useState<Array<{ time:number; close:number; high:number; low:number; volume:number }>>([])
  const [barsLoading, setBarsLoading] = useState(false)
  const [barsError, setBarsError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const ctrl = new AbortController()
      const t = setTimeout(()=>ctrl.abort(), 12000)
      const res = await fetch('/api/global-drivers-world', { cache: 'no-store', signal: ctrl.signal })
      clearTimeout(t)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setCountries(Array.isArray(json.countries) ? json.countries : [])
      setUpdatedAt(json.updatedAt || new Date().toISOString())
    } catch (e:any) {
      setError('World drivers unavailable; showing nothing for now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 10*60*1000)
    return () => clearInterval(id)
  }, [])

  const groups = useMemo(() => {
    const g: Record<string, CountryItem[]> = { G7: [], Developed: [], Emerging: [] }
    for (const c of countries) { (g[c.group] ||= []).push(c) }
    for (const k of Object.keys(g)) { g[k].sort((a,b)=> a.name.localeCompare(b.name)) }
    return g as { G7: CountryItem[]; Developed: CountryItem[]; Emerging: CountryItem[] }
  }, [countries])

  const sentimentColor = (s: CountryItem['sentiment']) => s==='Bullish' ? 'text-green-400' : s==='Bearish' ? 'text-red-400' : 'text-yellow-300'

  // Fetch bars when a symbol modal is opened
  useEffect(() => {
    const run = async () => {
      if (!symbolOpen) { setBars([]); setBarsError(''); return }
      setBarsLoading(true); setBarsError('')
      try {
        const qs = new URLSearchParams({ symbol: symbolOpen, range: '3mo', interval: '1d' })
        const res = await fetch(`/api/yahoo-history?${qs.toString()}`, { cache: 'no-store' })
        const js = await res.json()
        const arr = js?.data?.bars || js?.data?.bars === undefined ? js?.data?.bars : js?.data?.bars
        const bars = (js?.data?.bars || js?.data || js?.bars || []) as Array<any>
        const norm = Array.isArray(bars) ? bars.map((b:any) => ({ time:b.time, close:b.close, high:b.high ?? b.close, low:b.low ?? b.close, volume:b.volume ?? 0 })) : []
        setBars(norm)
      } catch (e:any) {
        setBarsError('Failed to load chart')
        setBars([])
      } finally {
        setBarsLoading(false)
      }
    }
    run()
  }, [symbolOpen])

  // Heuristic analytics
  const analytics = useMemo(() => {
    if (!bars || bars.length < 22) return null
    const closes = bars.map(b=>b.close)
    const last = closes[closes.length-1]
    const prev = closes[closes.length-2]
    const change1d = ((last/prev)-1)*100
    const past5 = closes[closes.length-6]
    const past21 = closes[closes.length-22]
    const perf1w = past5 ? ((last/past5)-1)*100 : NaN
    const perf1m = past21 ? ((last/past21)-1)*100 : NaN
    // RSI(14)
    const rsi = (()=>{
      let gains=0, losses=0
      for (let i=closes.length-14;i<closes.length;i++){
        const diff = closes[i]-closes[i-1]
        if (diff>0) gains+=diff; else losses+=-diff
      }
      const rs = losses===0? 100 : gains/losses
      const val = 100 - (100/(1+rs))
      return Math.max(0, Math.min(100, val))
    })()
    // ATR(14) as volatility proxy
    const atr = (()=>{
      let sum=0, n=0
      for(let i=bars.length-14;i<bars.length;i++){
        const b = bars[i]; const prev = bars[i-1]||b
        const tr = Math.max(b.high-b.low, Math.abs(b.high-prev.close), Math.abs(b.low-prev.close))
        sum += tr; n++
      }
      return n? sum/n : 0
    })()
    const atrPct = last? (atr/last)*100 : 0
    const volLabel = atrPct>4? 'Extreme' : atrPct>2.5? 'High' : atrPct>1.5? 'Medium' : 'Low'
    // Breakout if last > 20d high
    const high20 = Math.max(...closes.slice(-20))
    const breakout = last >= high20
    // Momentum score (0-100) from 1m perf clipped to [-20,20]
    const momScore = Number.isFinite(perf1m) ? Math.round(Math.max(0, Math.min(100, ((perf1m+20)/40)*100 ))) : 50
    // RS score using 1w vs 1m combo
    const rsScore = Number.isFinite(perf1w) && Number.isFinite(perf1m) ? Math.round(Math.max(0, Math.min(100, ((perf1w+perf1m+40)/80)*100 ))) : 50
    // Mean reversion
    const mr = rsi>70? 'Overbought' : rsi<30? 'Oversold' : 'Neutral'
    // Direction labels
    const dir = last>prev? 'Up' : 'Down'
    const dirStrong = (perf1w>2 && rsi>60) || (breakout && perf1m>5)
    const dirLabel = dirStrong? 'Strong Up' : dir
    // Rating
    const strongBuy = dirStrong && rsi>=60 && volLabel!=='Extreme'
    const rating = strongBuy? 'STRONG BUY' : dir==='Up'? 'BUY' : 'HOLD'
    // Volumes
    const vol = bars[bars.length-1]?.volume || 0
    const volHuman = vol>=1e9? `${(vol/1e9).toFixed(1)}B` : vol>=1e6? `${(vol/1e6).toFixed(1)}M` : vol>=1e3? `${(vol/1e3).toFixed(1)}K` : String(vol)
    return { change1d, perf1w, perf1m, rsi, atrPct, volLabel, breakout, momScore, rsScore, mr, dirLabel, rating, volHuman, last }
  }, [bars])

  function MiniLine({ data, color='#60a5fa' }: { data: Array<{time:number; close:number}>; color?: string }){
    const w=380, h=120, pad=10
    if (!data || data.length<2) return <div className="w-full h-[120px] bg-slate-800" />
    const xs = data.map(d=>d.close); const min=Math.min(...xs), max=Math.max(...xs); const rng = (max-min)||1
    const pts = data.map((d,i)=>{
      const x = pad + (i/(data.length-1))*(w-2*pad)
      const y = h-pad - ((d.close-min)/rng)*(h-2*pad)
      return `${x},${y}`
    }).join(' ')
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[120px]">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    )
  }

  return (
    <section className="max-w-7xl mx-auto px-3 py-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-white">World Drivers</h2>
        <div className="flex items-center gap-2">
          <div className="bg-white/5 border border-white/10 rounded p-0.5 text-[11px]">
            {(['G7','Developed','Emerging'] as const).map(g => (
              <button key={g} onClick={()=> setActiveGroup(g)} className={`px-2 py-1 rounded ${activeGroup===g? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}>{g}</button>
            ))}
          </div>
          <div className="text-[11px] text-gray-400">Updated {updatedAt ? new Date(updatedAt).toLocaleString() : '—'}</div>
        </div>
      </div>

      {/* Placeholder for map (future choropleth). For now, grouped country cards. */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_,i)=> (<div key={i} className="h-[140px] bg-slate-800 border border-slate-700 rounded animate-pulse" />))}
        </div>
      )}
      {!loading && error && (<div className="text-[12px] text-amber-300 mb-2">{error}</div>)}

      {!loading && (
        <div className="space-y-4">
          <div className="text-[12px] text-gray-300 font-semibold mb-1">{activeGroup}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups[activeGroup].map(c => (
              <article key={c.code} className="bg-slate-800 border border-slate-700 rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] text-white font-semibold">{c.name}</div>
                    <button onClick={()=> setSymbolOpen(c.proxy)} className="text-[11px] text-blue-400 hover:text-blue-300 underline decoration-dotted">{c.proxy}</button>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] text-white">{c.price!=null?`$${c.price.toFixed(2)}`:'—'}</div>
                    <div className={`text-[11px] ${c.changePercent>0? 'text-green-400' : c.changePercent<0 ? 'text-red-400' : 'text-gray-300'}`}>{c.changePercent>0?'+':''}{c.changePercent.toFixed(2)}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[11px] font-semibold ${sentimentColor(c.sentiment)}`}>{c.sentiment}</span>
                  <span className="text-[10px] px-1 py-0.5 rounded border bg-slate-700/40 border-slate-500/40 text-slate-200">{c.driver}</span>
                </div>
                <div className="text-[11px] text-gray-200 mt-1 italic">{c.outlook}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-gray-300">
                  <div>
                    <div className="flex items-center justify-between"><span>Retail</span><span>{c.retailStrength}%</span></div>
                    <div className="h-1.5 bg-slate-700 rounded overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${c.retailStrength}%` }} /></div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between"><span>Hedge</span><span>{c.hedgeFundFlow}%</span></div>
                    <div className="h-1.5 bg-slate-700 rounded overflow-hidden"><div className="h-full bg-fuchsia-500" style={{ width: `${c.hedgeFundFlow}%` }} /></div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Modal for symbol details */}
      {symbolOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={()=> setSymbolOpen(null)} />
          <div className="absolute left-1/2 top-20 -translate-x-1/2 w-[92vw] max-w-3xl bg-slate-950 border border-slate-700 rounded-xl shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="text-white font-semibold">{symbolOpen} Analysis</div>
              <button onClick={()=> setSymbolOpen(null)} className="text-gray-300 hover:text-white">Close</button>
            </div>
            <div className="p-4">
              {barsLoading ? (
                <div className="h-[140px] bg-slate-800 animate-pulse rounded" />
              ) : barsError ? (
                <div className="text-sm text-amber-300">{barsError}</div>
              ) : (
                <MiniLine data={bars.map(b=>({ time:b.time, close:b.close }))} />
              )}

              {analytics && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-[12px] text-gray-200">
                  <div className="bg-white/5 rounded p-2 border border-white/10"><div className="text-gray-400 text-[10px]">Direction</div><div className="font-semibold">{analytics.dirLabel}</div></div>
                  <div className="bg-white/5 rounded p-2 border border-white/10"><div className="text-gray-400 text-[10px]">Volume</div><div>{analytics.volHuman}</div></div>
                  <div className="bg-white/5 rounded p-2 border border-white/10"><div className="text-gray-400 text-[10px]">Momentum</div><div>{analytics.momScore}</div></div>
                  <div className="bg-white/5 rounded p-2 border border-white/10"><div className="text-gray-400 text-[10px]">RS</div><div>{analytics.rsScore}</div></div>
                  <div className="bg-white/5 rounded p-2 border border-white/10"><div className="text-gray-400 text-[10px]">Volatility</div><div>{analytics.volLabel}</div></div>
                  <div className="bg-white/5 rounded p-2 border border-white/10"><div className="text-gray-400 text-[10px]">Mean Reversion</div><div>{analytics.mr}</div></div>
                  <div className="bg-white/5 rounded p-2 border border-white/10"><div className="text-gray-400 text-[10px]">Breakout</div><div>{analytics.breakout? 'Yes' : 'No'}</div></div>
                  <div className="bg-white/5 rounded p-2 border border-white/10"><div className="text-gray-400 text-[10px]">Rating</div><div className={`font-bold ${analytics.rating==='STRONG BUY'?'text-emerald-300':''}`}>{analytics.rating}</div></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
