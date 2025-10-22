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
      } catch (e) {
        console.error('watchlist fetch error', e)
        setRows([])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [symbols])

  const sorted = React.useMemo(() => {
    const arr = [...rows]
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const av = sortKey === 'symbol' ? a.symbol.localeCompare(b.symbol) : (a as any)[sortKey] - (b as any)[sortKey]
      return dir * (typeof av === 'number' ? av : av)
    })
    return arr
  }, [rows, sortKey, sortDir])

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

      <div className="flex items-center gap-2 mb-4">
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
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-white/5">
            <tr className="border-b border-white/10 text-[11px] text-gray-400 uppercase tracking-wide">
              <th className="text-left py-2 px-2">{header('symbol', 'Symbol')}</th>
              <th className="text-left py-2 px-2">Name</th>
              <th className="text-right py-2 px-2">{header('price', 'Price')}</th>
              <th className="text-right py-2 px-2">{header('changePercent', '%Chg')}</th>
              <th className="text-right py-2 px-2">{header('volume', 'Vol')}</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td className="py-6 px-2 text-center text-gray-400" colSpan={6}>Loading quotes…</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td className="py-6 px-2 text-center text-gray-400" colSpan={6}>Add symbols to start your watchlist.</td></tr>
            ) : (
              sorted.map(row => (
                <tr key={row.symbol}>
                  <td className="py-2 px-2 font-semibold">{row.symbol}</td>
                  <td className="py-2 px-2 text-gray-300 max-w-[240px] truncate" title={row.name}>{row.name}</td>
                  <td className="py-2 px-2 text-right">{Number.isFinite(row.price) ? `$${row.price.toFixed(2)}` : '—'}</td>
                  <td className={`py-2 px-2 text-right font-semibold ${row.changePercent>=0 ? 'text-emerald-400' : 'text-red-400'}`}>{Number.isFinite(row.changePercent) ? `${row.changePercent>=0?'+':''}${row.changePercent.toFixed(2)}%` : '—'}</td>
                  <td className="py-2 px-2 text-right text-gray-300">{Number.isFinite(row.volume) ? row.volume.toLocaleString() : '—'}</td>
                  <td className="py-2 px-2 text-right"><button onClick={() => removeSymbol(row.symbol)} className="text-xs text-gray-400 hover:text-white">Remove</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[10px] text-gray-500">Data via Yahoo Finance; refreshed on changes. Use official symbols (e.g., futures like GC=F, FX pairs like EURUSD=X).</p>
    </div>
  )
}
