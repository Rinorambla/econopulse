'use client';

import { useEffect, useMemo, useState } from 'react'

type RegionItem = {
  id: string
  name: string
  flag: string
  ticker: string
  price: number | null
  changePercent: number
  sentiment: 'bullish'|'bearish'|'neutral'
  driver: string
  retailStrength: number
  hedgeFundStrength: number
  catalysts: Array<{ date: string; event: string; importance: string }>
  headlines: Array<{ title: string; url: string; source: string }>
  outlook: string
}

export default function GlobalDrivers() {
  const [regions, setRegions] = useState<RegionItem[]>([])
  const [updatedAt, setUpdatedAt] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const ctrl = new AbortController()
      const t = setTimeout(()=>ctrl.abort(), 12000)
      const res = await fetch('/api/global-drivers', { cache: 'no-store', signal: ctrl.signal })
      clearTimeout(t)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json && Array.isArray(json.regions)) {
        setRegions(json.regions)
        setUpdatedAt(json.updatedAt || new Date().toISOString())
      } else {
        setRegions([])
      }
    } catch (e:any) {
      setError('Failed to load global drivers. Showing last known data if available.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 10 * 60 * 1000) // refresh every 10 minutes
    return () => clearInterval(id)
  }, [])

  const sentimentColor = (s: RegionItem['sentiment']) => s === 'bullish' ? 'text-green-400' : s === 'bearish' ? 'text-red-400' : 'text-yellow-300'
  const driverColor = (d: string) => d.includes('Macro') ? 'bg-indigo-700/30 border-indigo-500/40 text-indigo-200' : d.includes('Earnings') ? 'bg-emerald-700/30 border-emerald-500/40 text-emerald-200' : d.includes('Commodities') ? 'bg-amber-700/30 border-amber-500/40 text-amber-100' : 'bg-slate-700/40 border-slate-500/40 text-slate-200'

  return (
    <section className="max-w-7xl mx-auto px-3 py-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-white">Global Market Drivers</h2>
        <div className="text-[11px] text-gray-400">Updated {updatedAt ? new Date(updatedAt).toLocaleString() : '—'}</div>
      </div>
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_,i)=> (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded p-3 animate-pulse h-[160px]" />
          ))}
        </div>
      )}
      {!loading && error && (
        <div className="text-[12px] text-amber-300 mb-2">{error}</div>
      )}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {regions.map(r => (
            <article key={r.id} className="bg-slate-800 border border-slate-700 rounded p-3">
              <header className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden>{r.flag}</span>
                  <div>
                    <div className="text-[12px] text-white font-semibold">{r.name}</div>
                    <div className="text-[11px] text-gray-400">{r.ticker}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] text-white">{r.price ? `$${r.price.toFixed(2)}` : '—'}</div>
                  <div className={`text-[11px] ${r.changePercent>0? 'text-green-400' : r.changePercent<0 ? 'text-red-400' : 'text-gray-300'}`}>{r.changePercent>0?'+':''}{r.changePercent.toFixed(2)}%</div>
                </div>
              </header>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[11px] font-semibold ${sentimentColor(r.sentiment)}`}>{r.sentiment.toUpperCase()}</span>
                <span className={`text-[10px] px-1 py-0.5 rounded border ${driverColor(r.driver)}`}>{r.driver}</span>
              </div>
              <div className="mb-2">
                <div className="flex items-center justify-between text-[10px] text-gray-300">
                  <span>Retail</span><span>{r.retailStrength}%</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${r.retailStrength}%` }} /></div>
                <div className="flex items-center justify-between text-[10px] text-gray-300 mt-1">
                  <span>Hedge Funds</span><span>{r.hedgeFundStrength}%</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded overflow-hidden"><div className="h-full bg-fuchsia-500" style={{ width: `${r.hedgeFundStrength}%` }} /></div>
              </div>
              {r.catalysts?.length > 0 && (
                <div className="text-[11px] text-gray-300 mb-2">
                  <div className="text-gray-400">Catalysts</div>
                  <ul className="list-disc list-inside">
                    {r.catalysts.slice(0,3).map((c,i)=> (
                      <li key={i}><span className="text-gray-400">{c.date}</span> · {c.event} <span className="text-xs text-amber-300">{c.importance}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {r.headlines?.length > 0 && (
                <div className="text-[11px] text-gray-300 mb-2">
                  <div className="text-gray-400">Top headline</div>
                  <a href={r.headlines[0].url} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200">{r.headlines[0].title}</a>
                </div>
              )}
              <div className="text-[11px] text-gray-200 italic">{r.outlook}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
