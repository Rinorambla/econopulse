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

  return (
    <section className="max-w-7xl mx-auto px-3 py-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-white">World Drivers</h2>
        <div className="text-[11px] text-gray-400">Updated {updatedAt ? new Date(updatedAt).toLocaleString() : '—'}</div>
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
          {(['G7','Developed','Emerging'] as const).map(group => (
            <div key={group}>
              <div className="text-[12px] text-gray-300 font-semibold mb-1">{group}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {groups[group].map(c => (
                  <article key={c.code} className="bg-slate-800 border border-slate-700 rounded p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[12px] text-white font-semibold">{c.name}</div>
                        <div className="text-[11px] text-gray-400">{c.proxy}</div>
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
          ))}
        </div>
      )}
    </section>
  )
}
