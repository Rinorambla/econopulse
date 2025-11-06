'use client'

import React, { useEffect, useMemo, useState } from 'react'

type QuoteRow = {
  symbol: string
  name?: string
  price?: number
  changePercent?: number
  volume?: number
}

type MoversResponse = {
  success: boolean
  asOf: string
  mostActive: QuoteRow[]
  topGainers: QuoteRow[]
  topLosers: QuoteRow[]
  highIV: Array<{ symbol: string; name?: string; price?: number|null; ivPercent: number|null; openInterest: number }>
  highOI: Array<{ symbol: string; name?: string; price?: number|null; openInterest: number; ivPercent: number|null }>
}

const tabs = [
  { key: 'mostActive', label: 'Most Active' },
  { key: 'topGainers', label: 'Top Gainers' },
  { key: 'topLosers', label: 'Top Losers' },
  { key: 'highIV', label: 'Highest IV' },
  { key: 'highOI', label: 'Highest OI' },
 ] as const

type TabKey = typeof tabs[number]['key']

export default function MarketMovers() {
  const [data, setData] = useState<MoversResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabKey>('mostActive')
  const [error, setError] = useState<string|undefined>()

  useEffect(() => {
    let abort = false
    const run = async () => {
      try {
        setLoading(true); setError(undefined)
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 15000)
        const res = await fetch('/api/market-movers', { cache: 'no-store', signal: ctrl.signal })
        clearTimeout(t)
        if (!res.ok) throw new Error('fetch_failed')
        const js = await res.json()
        if (!abort) setData(js)
      } catch (e:any) {
        if (!abort) setError('Unable to load market movers. Showing nothing for now.')
      } finally { if (!abort) setLoading(false) }
    }
    run()
    const id = setInterval(run, 5 * 60 * 1000) // refresh every 5 minutes
    return () => { abort = true; clearInterval(id) }
  }, [])

  const rows: Array<any> = useMemo(() => {
    if (!data) return []
    switch (tab) {
      case 'mostActive': return data.mostActive
      case 'topGainers': return data.topGainers
      case 'topLosers': return data.topLosers
      case 'highIV': return data.highIV
      case 'highOI': return data.highOI
    }
  }, [data, tab])

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
        <div className="text-[12px] font-bold text-white/90">Market Movers</div>
        <div className="ml-2 flex flex-wrap gap-1">
          {tabs.map(t => (
            <button key={t.key} onClick={()=>setTab(t.key)} className={`px-2 py-1 rounded text-[11px] border ${tab===t.key? 'bg-blue-600/30 text-blue-200 border-blue-500/40':'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'}`}>{t.label}</button>
          ))}
        </div>
        <div className="ml-auto text-[10px] text-slate-400">{data?.asOf ? new Date(data.asOf).toLocaleTimeString() : ''}</div>
      </div>
      {loading && (
        <div className="px-3 py-2 text-[12px] text-slate-300">Loading…</div>
      )}
      {error && (
        <div className="px-3 py-2 text-[12px] text-amber-300">{error}</div>
      )}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[12px]">
            <thead className="bg-slate-900/60">
              <tr>
                <th className="px-3 py-2 text-slate-300 font-semibold">Ticker</th>
                <th className="px-3 py-2 text-slate-300 font-semibold">Name</th>
                <th className="px-3 py-2 text-slate-300 font-semibold">Price</th>
                {tab==='highIV' || tab==='highOI' ? (
                  <>
                    <th className="px-3 py-2 text-slate-300 font-semibold">IV</th>
                    <th className="px-3 py-2 text-slate-300 font-semibold">Open Interest</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2 text-slate-300 font-semibold">% Chg</th>
                    <th className="px-3 py-2 text-slate-300 font-semibold">Volume</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const sym = r.symbol
                const name = r.name || ''
                const price = r.price ?? null
                if (tab==='highIV' || tab==='highOI') {
                  const iv = r.ivPercent
                  const oi = r.openInterest
                  return (
                    <tr key={sym+idx} className={idx%2===0? 'bg-slate-800':'bg-slate-800/70'}>
                      <td className="px-3 py-1.5 font-bold text-white">{sym}</td>
                      <td className="px-3 py-1.5 text-slate-300 truncate max-w-[280px]">{name}</td>
                      <td className="px-3 py-1.5 text-slate-200">{price!=null? price.toFixed(2): '—'}</td>
                      <td className="px-3 py-1.5 text-slate-200">{iv!=null? iv.toFixed(1)+'%':'—'}</td>
                      <td className="px-3 py-1.5 text-slate-200">{oi?.toLocaleString?.() || '—'}</td>
                    </tr>
                  )
                }
                const chg = r.changePercent
                const vol = r.volume
                const chgCls = typeof chg === 'number' ? (chg>0?'text-green-400': chg<0? 'text-red-400':'text-slate-200') : 'text-slate-200'
                return (
                  <tr key={sym+idx} className={idx%2===0? 'bg-slate-800':'bg-slate-800/70'}>
                    <td className="px-3 py-1.5 font-bold text-white">{sym}</td>
                    <td className="px-3 py-1.5 text-slate-300 truncate max-w-[280px]">{name}</td>
                    <td className="px-3 py-1.5 text-slate-200">{price!=null? price.toFixed(2): '—'}</td>
                    <td className={"px-3 py-1.5 "+chgCls}>{typeof chg==='number'? chg.toFixed(2)+'%':'—'}</td>
                    <td className="px-3 py-1.5 text-slate-200">{vol?.toLocaleString?.() || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
