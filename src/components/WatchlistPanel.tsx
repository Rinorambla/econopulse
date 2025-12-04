'use client'

import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import SymbolAutocomplete from './SymbolAutocomplete'

type QuoteRow = {
  symbol: string
  name: string
  price: number
  changePercent: number
  change: number
  volume: number
}

type FundRow = {
  symbol: string
  dividendYield?: number | null
  forwardPE?: number | null
  earningsDate?: string | null
  earningsGrowth?: number | null
  holdingsCount?: number | null
}

const POPULAR_SYMBOLS = [
  'AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','AVGO','AMD','NFLX','ORCL','CRM','ADBE','INTC','CSCO','IBM',
  'SPY','QQQ','VOO','VTI','DIA','IWM','JEPI','JEPQ','VUG','VTV',
  '^GSPC','^NDX','^DJI','^VIX',
  'EURUSD=X','GBPUSD=X','USDJPY=X','XAUUSD=X','GC=F','CL=F','NG=F'
]

const sanitize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9=.^-]/g, '')

function planWatchlistLimit(plan: string | undefined) {
  const p = (plan || 'pro').toLowerCase()
  if (p === 'premium') return 50
  if (p === 'enterprise') return 200
  if (p === 'ultimate') return -1 // unlimited
  return 10 // pro/default
}

export default function WatchlistPanel() {
  const { user } = useAuth()
  const plan = (user?.user_metadata?.subscription_plan || 'pro') as string
  const limit = planWatchlistLimit(plan)
  const storageKey = React.useMemo(() => {
    const uid = user?.id || 'guest'
    return `watchlist.v1:${uid}`
  }, [user?.id])

  const [symbols, setSymbols] = React.useState<string[]>([])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [rows, setRows] = React.useState<QuoteRow[]>([])
  const [sortKey, setSortKey] = React.useState<'symbol'|'price'|'changePercent'|'volume'>('changePercent')
  const [sortDir, setSortDir] = React.useState<'asc'|'desc'>('desc')
  const [filter, setFilter] = React.useState<'all'|'gainers'|'losers'>('all')
  const [timeframe, setTimeframe] = React.useState<'1D'|'1W'|'1M'>('1D')
  const [perfMap, setPerfMap] = React.useState<Record<string, number>>({})
  const [perfLoading, setPerfLoading] = React.useState(false)
  const [funds, setFunds] = React.useState<Record<string, FundRow>>({})

  // Load from storage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const arr = JSON.parse(raw) as string[]
        if (Array.isArray(arr)) setSymbols(arr.map(sanitize).slice(0, limit < 0 ? undefined : limit))
      }
    } catch {}
  }, [storageKey, limit])

  // Persist to storage
  React.useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(symbols)) } catch {}
  }, [storageKey, symbols])

  const addSymbol = (s: string) => {
    const v = sanitize(s)
    if (!v) return
    setSymbols(prev => {
      if (prev.includes(v)) return prev
      const next = [...prev, v]
      if (limit >= 0 && next.length > limit) return prev // enforce limit
      return next
    })
    setInput('')
  }
  const removeSymbol = (s: string) => setSymbols(prev => prev.filter(x => x !== s))

  // Fetch quotes when symbols change
  React.useEffect(() => {
    const run = async () => {
      if (symbols.length === 0) { setRows([]); return }
      setLoading(true)
      try {
        const qs = new URLSearchParams({ symbols: symbols.join(',') })
        const res = await fetch(`/api/watchlist-quotes?${qs.toString()}`, { cache: 'no-store' })
        const js = await res.json()
        const data = (js?.data || []) as QuoteRow[]
        setRows(data)
        // fundamentals fetch (best-effort)
        try {
          const fRes = await fetch(`/api/watchlist-fundamentals?${qs.toString()}`, { cache: 'no-store' })
          if (fRes.ok) {
            const fj = await fRes.json()
            if (fj?.ok && fj?.data) setFunds(fj.data as Record<string, FundRow>)
          }
        } catch {}
      } catch (e) {
        console.error('watchlist fetch error', e)
        setRows([])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [symbols])

  // Compute performance for 1W/1M using yahoo-history (multi) when selected
  React.useEffect(() => {
    const run = async () => {
      if (timeframe === '1D' || symbols.length === 0) { setPerfMap({}); return }
      setPerfLoading(true)
      try {
        const chunkSize = 15
        const needBars = timeframe === '1W' ? 5 : 21
        const perf: Record<string, number> = {}
        for (let i = 0; i < symbols.length; i += chunkSize) {
          const chunk = symbols.slice(i, i + chunkSize)
          const qs = new URLSearchParams({ symbols: chunk.join(','), range: timeframe === '1W' ? '1mo' : '3mo', interval: '1d' })
          const res = await fetch(`/api/yahoo-history?${qs.toString()}`, { cache: 'no-store' })
          const js = await res.json()
          const arr: Array<{ symbol: string; bars: Array<{ time: number; close: number }> }> = js?.data || []
          for (const h of arr) {
            const bars = (h.bars || []).map(b => ({ time: b.time, close: (b as any).close ?? (b as any).c ?? 0 }))
            if (bars.length < needBars + 1) continue
            const last = bars[bars.length - 1]?.close
            const past = bars[bars.length - 1 - needBars]?.close
            if (Number.isFinite(last) && Number.isFinite(past) && past) {
              perf[h.symbol] = ((last / past) - 1) * 100
            }
          }
        }
        setPerfMap(perf)
      } catch (e) {
        console.error('perf compute error', e)
        setPerfMap({})
      } finally {
        setPerfLoading(false)
      }
    }
    run()
  }, [symbols, timeframe])

  const metric = (row: QuoteRow) => timeframe === '1D' ? row.changePercent : (perfMap[row.symbol] ?? Number.NaN)

  const sorted = React.useMemo(() => {
    const arr = [...rows]
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'changePercent') {
        const av = metric(a)
        const bv = metric(b)
        const diff = (Number.isFinite(av) ? av : -Infinity) - (Number.isFinite(bv) ? bv : -Infinity)
        return dir * diff
      }
      const av = sortKey === 'symbol' ? a.symbol.localeCompare(b.symbol) : (a as any)[sortKey] - (b as any)[sortKey]
      return dir * (typeof av === 'number' ? av : av)
    })
    return arr
  }, [rows, sortKey, sortDir, timeframe, perfMap])

  const filtered = React.useMemo(() => {
    if (filter === 'all') return sorted
    const TOP_N = 10
    const arr = [...sorted]
    if (filter === 'gainers') {
      return arr
        .filter(r => Number.isFinite(metric(r)) && metric(r) > 0)
        .slice(0, TOP_N)
    }
    // losers
    return arr
      .filter(r => Number.isFinite(metric(r)) && metric(r) < 0)
      .slice(0, TOP_N)
  }, [sorted, filter, timeframe, perfMap])

  const header = (key: typeof sortKey, label: string) => (
    <button
      onClick={() => setSortKey(k => k === key ? key : key)}
      className="px-2 py-1 text-left text-xs font-semibold text-gray-300 hover:text-white"
    >
      {label}
      {sortKey === key && (
        <button
          onClick={(e) => { e.stopPropagation(); setSortDir(d => d === 'asc' ? 'desc' : 'asc') }}
          className="ml-1 text-[10px] text-gray-400 hover:text-white"
          title="Toggle sort direction"
        >{sortDir === 'asc' ? '▲' : '▼'}</button>
      )}
    </button>
  )

  return (
    <div className="bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-black/60 rounded-xl p-6 border border-white/10 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Watchlist</h2>
        <span className="text-[10px] uppercase tracking-wide text-gray-400">{limit < 0 ? 'Unlimited' : `${symbols.length}/${limit}`}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SymbolAutocomplete
          value={input}
          onChange={setInput}
          placeholder="Add symbol (AAPL, SPY, EURUSD=X)"
          allSymbols={POPULAR_SYMBOLS}
        />
        <button
          onClick={() => addSymbol(input)}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
          disabled={!input}
        >Add</button>
        {limit >= 0 && symbols.length >= limit && (
          <span className="text-xs text-yellow-400">Limit reached for plan: {plan}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="bg-white/5 border border-white/10 rounded-md p-1">
            {(['1D','1W','1M'] as const).map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)} className={`px-2.5 py-1 text-[11px] rounded ${timeframe===tf? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}>{tf}</button>
            ))}
          </div>
          <div className="bg-white/5 border border-white/10 rounded-md p-1">
            {(['all','gainers','losers'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 text-[11px] rounded capitalize ${filter===f? 'bg-emerald-600/40 text-emerald-200' : 'text-gray-300 hover:text-white'}`}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-white/5">
            <tr className="border-b border-white/10 text-[11px] text-gray-400 uppercase tracking-wide">
              <th className="text-left py-2 px-2">{header('symbol', 'Symbol')}</th>
              <th className="text-left py-2 px-2">Name</th>
              <th className="text-right py-2 px-2">{header('price', 'Price')}</th>
              <th className="text-right py-2 px-2">{header('changePercent', '%Chg')}</th>
              <th className="text-right py-2 px-2">{header('volume', 'Vol')}</th>
              <th className="text-right py-2 px-2">Hold</th>
              <th className="text-right py-2 px-2">Div%</th>
              <th className="text-right py-2 px-2">FwdPE</th>
              <th className="text-right py-2 px-2">Earnings</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td className="py-6 px-2 text-center text-gray-400" colSpan={10}>Loading quotes…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="py-6 px-2 text-center text-gray-400" colSpan={10}>Add symbols to start your watchlist.</td></tr>
            ) : (
              filtered.map(row => (
                <tr key={row.symbol}>
                  <td className="py-2 px-2 font-semibold">{row.symbol}</td>
                  <td className="py-2 px-2 text-gray-300 max-w-[240px] truncate" title={row.name}>{row.name}</td>
                  <td className="py-2 px-2 text-right">{Number.isFinite(row.price) ? `$${row.price.toFixed(2)}` : '—'}</td>
                  {(() => {
                    const pct = metric(row)
                    const showLoading = timeframe !== '1D' && perfLoading && !Number.isFinite(pct)
                    return (
                      <td className={`py-2 px-2 text-right font-semibold ${Number.isFinite(pct) ? (pct>=0 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-400'}`}>
                        {showLoading ? '…' : Number.isFinite(pct) ? `${pct>=0?'+':''}${pct.toFixed(2)}%` : '—'}
                      </td>
                    )
                  })()}
                  <td className="py-2 px-2 text-right text-gray-300">{Number.isFinite(row.volume) ? row.volume.toLocaleString() : '—'}</td>
                  {(() => {
                    const f = funds[row.symbol] || {} as FundRow
                    const dyRaw = typeof f.dividendYield === 'number' ? f.dividendYield : null
                    const dy = dyRaw != null ? (dyRaw > 1 ? dyRaw : dyRaw * 100) : null
                    const fpe = typeof f.forwardPE === 'number' ? f.forwardPE : null
                    const hold = typeof f.holdingsCount === 'number' ? f.holdingsCount : null
                    const ed = f.earningsDate ? new Date(f.earningsDate).toLocaleDateString() : null
                    return (
                      <>
                        <td className="py-2 px-2 text-right text-gray-300">{hold ?? '—'}</td>
                        <td className="py-2 px-2 text-right text-gray-300">{dy!=null ? `${dy.toFixed(2)}%` : '—'}</td>
                        <td className="py-2 px-2 text-right text-gray-300">{fpe!=null ? fpe.toFixed(2) : '—'}</td>
                        <td className="py-2 px-2 text-right text-gray-300">{ed ?? '—'}</td>
                      </>
                    )
                  })()}
                  <td className="py-2 px-2 text-right"><button onClick={() => removeSymbol(row.symbol)} className="text-xs text-gray-400 hover:text-white">Remove</button></td>
                </tr>
              ))
            )}
            {!loading && rows.length>0 && Object.keys(funds).length===0 && (
              <tr><td colSpan={10} className="py-4 px-2 text-center text-[11px] text-gray-500">Loading fundamentals…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
