"use client"
import React, { useEffect, useState, useCallback, useMemo } from 'react'

interface EarningEvent {
  date: string
  time: string
  symbol: string
  company: string
  epsEstimate?: string
  estimate?: string
  actual?: string
  period: string
  marketCap: string
  significance: 'High'|'Medium'|'Low'
  sector: string
}

interface ApiResponse {
  data: EarningEvent[]
  earningsCalendar?: EarningEvent[]
  error?: string
  lastUpdated?: string
  summary?: any
}

export const EarningsCalendar: React.FC = () => {
  const [events, setEvents] = useState<EarningEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [expanded, setExpanded] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [significanceFilter, setSignificanceFilter] = useState<'All'|'High'|'Medium'|'Low'>('All')
  // source nascosto per privacy
  const [symbolQuery, setSymbolQuery] = useState('')
  const [sectorQuery, setSectorQuery] = useState('')
  const [live, setLive] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setError(null)
  const resp = await fetch('/api/earnings-calendar?days=30')
      const js: ApiResponse = await resp.json()
      if(!resp.ok) throw new Error(js.error||'API error')
  const rows = js.earningsCalendar || js.data || []
      setEvents(rows)
      setLastUpdate(js.lastUpdated || new Date().toISOString())
    } catch(e:any) { setError(e.message) } finally { setLoading(false) }
  },[])

  useEffect(()=>{ 
    fetchData();
    const slow = setInterval(fetchData, 600000); // 10m auto-refresh
    let fast: any = null
    if (live) fast = setInterval(fetchData, 60000) // 60s when live
    return ()=> { clearInterval(slow); if (fast) clearInterval(fast) }
  }, [fetchData, live])

  const filtered = useMemo(()=> {
    let list = significanceFilter==='All' ? events : events.filter(e=> e.significance===significanceFilter)
    if (symbolQuery.trim()) {
      const q = symbolQuery.trim().toLowerCase()
      list = list.filter(e=> e.symbol.toLowerCase().includes(q) || (e.company||'').toLowerCase().includes(q))
    }
    if (sectorQuery.trim()) {
      const q = sectorQuery.trim().toLowerCase()
      list = list.filter(e=> (e.sector||'').toLowerCase().includes(q))
    }
    return list
  }, [events, significanceFilter, symbolQuery, sectorQuery])
  const shown = expanded ? filtered : filtered.slice(0,12)

  const sigColor = (s:string) => s==='High' ? 'text-red-400' : s==='Medium' ? 'text-amber-300' : 'text-gray-400'

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-lg">Earnings Calendar</h3>
  <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1 text-[11px] text-gray-300 mr-2">
            <input type="checkbox" className="accent-green-500" checked={live} onChange={e=>setLive(e.target.checked)} /> Live
          </label>
          <select value={significanceFilter} onChange={e=>setSignificanceFilter(e.target.value as any)} className="bg-gray-700 border border-gray-600 text-gray-200 text-[11px] rounded px-1 py-1">
            {['All','High','Medium','Low'].map(x=> <option key={x}>{x}</option>)}
          </select>
          {lastUpdate && <span className="text-[10px] text-gray-500">{new Date(lastUpdate).toLocaleTimeString()}</span>}
          {/* auto-refresh hidden per requirements */}
        </div>
      </div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-[11px] text-gray-300">
        <div className="flex items-center gap-1">
          <span>Symbol/Company</span>
          <input value={symbolQuery} onChange={e=>setSymbolQuery(e.target.value)} placeholder="AAPL, Microsoft" className="w-[220px] bg-gray-700 border border-gray-600 text-white rounded px-2 py-1"/>
        </div>
        <div className="flex items-center gap-1">
          <span>Sector</span>
          <input value={sectorQuery} onChange={e=>setSectorQuery(e.target.value)} placeholder="Technology, Financials" className="w-[200px] bg-gray-700 border border-gray-600 text-white rounded px-2 py-1"/>
        </div>
        {(symbolQuery||sectorQuery) && (
          <button onClick={()=>{ setSymbolQuery(''); setSectorQuery('') }} className="px-2 py-1 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700">Reset</button>
        )}
      </div>
      {error && <div className="text-xs text-red-400 mb-2">{error}</div>}
      <div className="overflow-x-auto -mx-2 px-2 flex-1">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-gray-400 uppercase tracking-wide text-[10px]">
              <th className="text-left py-1 pr-2">Date</th>
              <th className="text-left py-1 pr-2">Time</th>
              <th className="text-left py-1 pr-2">Symbol</th>
              <th className="text-left py-1 pr-2">Est EPS</th>
              <th className="text-left py-1 pr-2">Actual</th>
              <th className="text-left py-1 pr-2">Period</th>
              <th className="text-left py-1 pr-2">Sig</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((ev, i)=>(
              <tr key={i} className="border-t border-gray-700/60 hover:bg-gray-700/30">
                <td className="py-1 pr-2 text-gray-300 whitespace-nowrap">{ev.date}</td>
                <td className="py-1 pr-2 text-gray-400">{ev.time}</td>
                <td className="py-1 pr-2 text-blue-300 font-medium" title={ev.company}>
                  <div className="flex items-center gap-2">
                    <a href={`https://finance.yahoo.com/quote/${encodeURIComponent(ev.symbol)}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">{ev.symbol}</a>
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(ev.company || ev.symbol)}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-gray-300">Info</a>
                  </div>
                </td>
                <td className="py-1 pr-2 text-gray-200">{ev.epsEstimate || ev.estimate || '-'}</td>
                <td className={`py-1 pr-2 ${ev.actual? 'text-gray-100':'text-gray-500'}`}>{ev.actual||'-'}</td>
                <td className="py-1 pr-2 text-gray-400">{ev.period}</td>
                <td className={`py-1 pr-2 font-semibold ${sigColor(ev.significance)}`}>{ev.significance[0]}</td>
              </tr>
            ))}
            {!shown.length && !loading && <tr><td colSpan={7} className="py-4 text-center text-gray-500">No earnings</td></tr>}
          </tbody>
        </table>
        {loading && <div className="py-3 text-center text-gray-400 text-xs">Loading...</div>}
      </div>
      {filtered.length>12 && (
        <button onClick={()=>setExpanded(v=>!v)} className="mt-3 text-[11px] text-blue-300 hover:text-blue-200 self-start">{expanded? 'Show less':'Show more'} ({filtered.length})</button>
      )}
    </div>
  )
}

export default EarningsCalendar
