'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Search, TrendingUp, ChevronDown, ChevronRight, Loader2, X } from 'lucide-react'

type Holding = {
  nameOfIssuer?: string
  titleOfClass?: string
  cusip?: string
  value?: number // thousands USD
  sshPrnamt?: number
  sshPrnamtType?: string
  putCall?: string
  investmentDiscretion?: string
  votingAuthority?: { Sole?: number; Shared?: number; None?: number }
}

type ApiOut = {
  ok: boolean
  filer: { cik: string }
  filing: { accessionNumber: string; reportCalendarOrQuarter?: string; filingDate?: string; infoTableUrl?: string }
  totals: { positions: number; marketValueUsdThousands: number }
  holdings: Holding[]
  source: 'sec' | 'snapshot'
}

type FilingMeta = {
  accessionNumber: string
  reportCalendarOrQuarter?: string
  filingDate?: string
}

type Manager = { cik: string; name: string }

type Action = 'NEW' | 'ADD' | 'TRIM' | 'SOLD' | 'HOLD'

type EnrichedHolding = Holding & {
  action: Action
  deltaShares: number
  deltaValue: number
  prevShares: number
}

function fmt(n?: number, digits = 0) {
  if (!Number.isFinite(n as number)) return '-'
  return (n as number).toLocaleString(undefined, { maximumFractionDigits: digits })
}

function signedFmt(n: number, digits = 0) {
  if (!Number.isFinite(n)) return '-'
  const s = n.toLocaleString(undefined, { maximumFractionDigits: digits })
  return n > 0 ? `+${s}` : s
}

// Turn a report date (e.g. "2024-09-30") into a readable quarter label ("Q3 2024").
function quarterLabel(f: FilingMeta): string {
  const raw = (f.reportCalendarOrQuarter || '').trim()
  const m = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const year = m[1]
    const month = parseInt(m[2], 10)
    const q = Math.min(4, Math.max(1, Math.ceil(month / 3)))
    return `Q${q} ${year}`
  }
  if (raw) return raw
  return f.filingDate ? `Filed ${f.filingDate}` : f.accessionNumber
}

// Key a holding so the same position can be matched across quarters.
function holdingKey(h: Holding): string {
  return `${(h.cusip || '').toUpperCase()}|${(h.putCall || '').toUpperCase()}|${(h.titleOfClass || '').toUpperCase()}`
}

const ACTION_STYLE: Record<Action, { label: string; cls: string }> = {
  NEW: { label: 'New buy', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  ADD: { label: 'Added', cls: 'bg-green-500/15 text-green-300 border-green-500/25' },
  TRIM: { label: 'Reduced', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  SOLD: { label: 'Sold out', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  HOLD: { label: 'Unchanged', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/25' },
}

// A broad set of well-known institutional investors & hedge funds. Anything not
// listed here can be found with the search box (which queries SEC EDGAR live).
const PRESETS: Array<{ label: string; cik: string }> = [
  { label: 'Berkshire · Buffett', cik: '0001067983' },
  { label: 'Bridgewater · Dalio', cik: '0001350694' },
  { label: 'ARK Invest · Wood', cik: '0001697740' },
  { label: 'Tiger Global', cik: '0001167483' },
  { label: 'Pershing Square · Ackman', cik: '0001336528' },
  { label: 'Renaissance Tech', cik: '0001037389' },
  { label: 'Citadel Advisors', cik: '0001423053' },
  { label: 'Scion · Burry', cik: '0001649339' },
  { label: 'Third Point · Loeb', cik: '0001040273' },
  { label: 'Greenlight · Einhorn', cik: '0001079114' },
  { label: 'Duquesne · Druckenmiller', cik: '0001536411' },
  { label: 'Soros Fund', cik: '0001029160' },
]

export function ThirteenFExplorer() {
  const [cik, setCik] = useState('0001067983')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [data, setData] = useState<ApiOut | null>(null)
  const [prevData, setPrevData] = useState<ApiOut | null>(null)
  const [filings, setFilings] = useState<FilingMeta[]>([])
  const [accession, setAccession] = useState<string>('')
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<'value'|'issuer'|'shares'|'change'>('value')
  const [sortDir, setSortDir] = useState<'desc'|'asc'>('desc')
  const [actionFilter, setActionFilter] = useState<Action | 'ALL'>('ALL')
  const [collapsed, setCollapsed] = useState(false)

  // Manager name search
  const [managerQuery, setManagerQuery] = useState('')
  const [managerResults, setManagerResults] = useState<Manager[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchHoldings(targetCik: string, targetAccession?: string): Promise<ApiOut | null> {
    const accParam = targetAccession ? `&accession=${encodeURIComponent(targetAccession)}` : ''
    const r = await fetch(`/api/13f?cik=${encodeURIComponent(targetCik)}${accParam}`, { cache: 'no-store' })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  }

  // Load a specific quarter plus the immediately prior quarter so we can show
  // what was bought / sold.
  async function loadQuarter(targetCik: string, targetAccession: string, filingList: FilingMeta[]) {
    try {
      setLoading(true)
      setError('')
      const current = await fetchHoldings(targetCik, targetAccession || undefined)
      setData(current)
      const idx = filingList.findIndex(f => f.accessionNumber === (targetAccession || current?.filing?.accessionNumber))
      const prior = idx >= 0 ? filingList[idx + 1] : filingList[1]
      if (prior?.accessionNumber) {
        try { setPrevData(await fetchHoldings(targetCik, prior.accessionNumber)) }
        catch { setPrevData(null) }
      } else {
        setPrevData(null)
      }
    } catch (e: any) {
      setError(`Failed to load: ${e?.message || e}`)
      setData(null)
      setPrevData(null)
    } finally {
      setLoading(false)
    }
  }

  // Load the list of available quarters for a manager, then load the latest one.
  async function loadManager(targetCik: string) {
    setFilings([])
    setAccession('')
    setPrevData(null)
    try {
      const r = await fetch(`/api/13f?cik=${encodeURIComponent(targetCik)}&list=1`, { cache: 'no-store' })
      if (r.ok) {
        const j = await r.json()
        const list: FilingMeta[] = Array.isArray(j?.filings) ? j.filings : []
        setFilings(list)
        const first = list[0]?.accessionNumber || ''
        setAccession(first)
        await loadQuarter(targetCik, first, list)
        return
      }
    } catch { /* fall back to latest */ }
    await loadQuarter(targetCik, '', [])
  }

  useEffect(() => {
    loadManager(cik)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced manager search against SEC EDGAR.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    const term = managerQuery.trim()
    if (term.length < 2) { setManagerResults([]); setSearching(false); return }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/13f?find=${encodeURIComponent(term)}`, { cache: 'no-store' })
        const j = await r.json()
        setManagerResults(Array.isArray(j?.managers) ? j.managers : [])
        setShowResults(true)
      } catch {
        setManagerResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [managerQuery])

  function selectManager(m: Manager) {
    setCik(m.cik)
    setManagerQuery(m.name)
    setShowResults(false)
    setActionFilter('ALL')
    setQ('')
    loadManager(m.cik)
  }

  // Merge current + prior holdings into one enriched list with buy/sell deltas.
  const enriched = useMemo<EnrichedHolding[]>(() => {
    const cur = data?.holdings || []
    const prevMap = new Map<string, Holding>()
    for (const h of (prevData?.holdings || [])) {
      const k = holdingKey(h)
      const ex = prevMap.get(k)
      if (ex) { ex.value = (ex.value || 0) + (h.value || 0); ex.sshPrnamt = (ex.sshPrnamt || 0) + (h.sshPrnamt || 0) }
      else prevMap.set(k, { ...h })
    }
    const curKeys = new Set<string>()
    const out: EnrichedHolding[] = []
    for (const h of cur) {
      const k = holdingKey(h)
      curKeys.add(k)
      const prev = prevMap.get(k)
      const shares = h.sshPrnamt || 0
      const value = h.value || 0
      const prevShares = prev?.sshPrnamt || 0
      let action: Action
      let deltaShares = 0
      let deltaValue = 0
      if (!prevData) {
        action = 'HOLD'
      } else if (!prev) {
        action = 'NEW'; deltaShares = shares; deltaValue = value
      } else {
        deltaShares = shares - prevShares
        deltaValue = value - (prev.value || 0)
        const pct = prevShares ? deltaShares / prevShares : 0
        if (Math.abs(pct) < 0.005) action = 'HOLD'
        else if (deltaShares > 0) action = 'ADD'
        else action = 'TRIM'
      }
      out.push({ ...h, action, deltaShares, deltaValue, prevShares })
    }
    if (prevData) {
      for (const [k, p] of prevMap) {
        if (curKeys.has(k)) continue
        out.push({
          ...p,
          value: 0,
          sshPrnamt: 0,
          action: 'SOLD',
          deltaShares: -(p.sshPrnamt || 0),
          deltaValue: -(p.value || 0),
          prevShares: p.sshPrnamt || 0,
        })
      }
    }
    return out
  }, [data, prevData])

  const summary = useMemo(() => {
    const s: Record<Action, number> = { NEW: 0, ADD: 0, TRIM: 0, SOLD: 0, HOLD: 0 }
    for (const h of enriched) s[h.action]++
    return s
  }, [enriched])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let out = enriched.filter(h => {
      if (actionFilter !== 'ALL' && h.action !== actionFilter) return false
      if (!term) return true
      return (h.nameOfIssuer || '').toLowerCase().includes(term) ||
        (h.titleOfClass || '').toLowerCase().includes(term) ||
        (h.cusip || '').toLowerCase().includes(term)
    })
    out.sort((a, b) => {
      let va = 0, vb = 0
      if (sortKey === 'value') { va = a.value || 0; vb = b.value || 0 }
      if (sortKey === 'shares') { va = a.sshPrnamt || 0; vb = b.sshPrnamt || 0 }
      if (sortKey === 'change') { va = a.deltaValue; vb = b.deltaValue }
      if (sortKey === 'issuer') {
        return (sortDir === 'asc' ? 1 : -1) * String(a.nameOfIssuer||'').localeCompare(String(b.nameOfIssuer||''))
      }
      return sortDir === 'desc' ? (vb - va) : (va - vb)
    })
    return out
  }, [enriched, q, sortKey, sortDir, actionFilter])

  const downloadCsv = () => {
    const cik10 = data?.filer?.cik || cik
    const url = `/api/13f?cik=${encodeURIComponent(cik10)}&format=csv`
    window.open(url, '_blank')
  }

  const ACTION_CHIPS: Array<{ key: Action | 'ALL'; label: string }> = [
    { key: 'ALL', label: 'All' },
    { key: 'NEW', label: `New ${summary.NEW}` },
    { key: 'ADD', label: `Added ${summary.ADD}` },
    { key: 'TRIM', label: `Reduced ${summary.TRIM}` },
    { key: 'SOLD', label: `Sold ${summary.SOLD}` },
  ]

  return (
    <section className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
      {/* Manager search — find ANY investor / hedge fund */}
      <div className="relative mb-4">
        <label className="text-xs text-gray-400">Search investor / hedge fund</label>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={managerQuery}
            onChange={e=>setManagerQuery(e.target.value)}
            onFocus={()=>{ if (managerResults.length) setShowResults(true) }}
            placeholder="e.g. Millennium, Two Sigma, Appaloosa…"
            className="w-full bg-slate-800 text-white border border-white/10 rounded pl-9 pr-9 py-2"
          />
          {managerQuery && (
            <button onClick={()=>{ setManagerQuery(''); setManagerResults([]); setShowResults(false) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
          {searching && <Loader2 className="w-4 h-4 text-gray-400 absolute right-8 top-1/2 -translate-y-1/2 animate-spin" />}
        </div>
        {showResults && managerResults.length > 0 && (
          <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto bg-slate-900 border border-white/15 rounded-lg shadow-xl">
            {managerResults.map(m => (
              <button
                key={m.cik}
                onClick={()=>selectManager(m)}
                className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm text-white border-b border-white/5 last:border-0"
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-gray-500 ml-2 text-xs">CIK {m.cik}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESETS.map(p => (
          <button
            key={p.cik}
            onClick={()=>{ setCik(p.cik); setManagerQuery(''); setActionFilter('ALL'); setQ(''); loadManager(p.cik) }}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${cik === p.cik ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
        <div className="flex-1">
          <label className="text-xs text-gray-400">Manager CIK</label>
          <input value={cik} onChange={e=>setCik(e.target.value)} placeholder="e.g. 0001067983" className="w-full bg-slate-800 text-white border border-white/10 rounded px-3 py-2" />
        </div>
        {filings.length > 0 && (
          <div>
            <label className="text-xs text-gray-400">Quarter</label>
            <select
              value={accession}
              onChange={e=>{ const v = e.target.value; setAccession(v); loadQuarter(cik, v, filings) }}
              className="bg-slate-800 text-white border border-white/10 rounded px-3 py-2 w-full sm:w-44"
            >
              {filings.map(f => (
                <option key={f.accessionNumber} value={f.accessionNumber}>{quarterLabel(f)}</option>
              ))}
            </select>
          </div>
        )}
        <button onClick={()=>loadManager(cik)} disabled={loading || !cik} className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded px-4 py-2 disabled:opacity-50">
          <Search className="w-4 h-4" /> Load 13F
        </button>
        <button onClick={downloadCsv} disabled={!data} className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded px-4 py-2 disabled:opacity-50">
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {error && <div className="text-red-300 text-sm mb-3">{error}</div>}
      {loading && <div className="flex items-center gap-2 text-gray-300"><Loader2 className="w-4 h-4 animate-spin" /> Loading 13F…</div>}

      {data && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-300">
            <span>CIK: <strong className="text-white">{data.filer.cik}</strong></span>
            {data.filing.filingDate && <span>Filing date: <strong className="text-white">{data.filing.filingDate}</strong></span>}
            {data.filing.reportCalendarOrQuarter && <span>Period: <strong className="text-white">{data.filing.reportCalendarOrQuarter}</strong></span>}
            <span>Positions: <strong className="text-white">{fmt(data.totals.positions)}</strong></span>
            <span>Market value: <strong className="text-white">${fmt(data.totals.marketValueUsdThousands)}k</strong></span>
            {data.filing.infoTableUrl && <a className="text-blue-300 hover:underline" href={data.filing.infoTableUrl} target="_blank">Original XML</a>}
          </div>

          {/* Activity summary chips — also act as quick filters */}
          <div className="flex flex-wrap gap-2">
            {ACTION_CHIPS.map(c => (
              <button
                key={c.key}
                onClick={()=>setActionFilter(c.key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${actionFilter === c.key ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
              >
                {c.label}
              </button>
            ))}
            {!prevData && <span className="text-[11px] text-amber-300/80 self-center">Prior quarter unavailable — buy/sell changes hidden.</span>}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1">
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Filter by issuer / class / CUSIP…" className="w-full bg-slate-800 text-white border border-white/10 rounded px-3 py-2" />
              <Search className="w-4 h-4 text-gray-400 absolute right-2 top-2.5" />
            </div>
            <div className="flex gap-2">
              <select value={sortKey} onChange={e=>setSortKey(e.target.value as any)} className="flex-1 bg-slate-800 text-white border border-white/10 rounded px-3 py-2">
                <option value="value">Sort: Value</option>
                <option value="change">Sort: Change</option>
                <option value="shares">Sort: Shares</option>
                <option value="issuer">Sort: Issuer</option>
              </select>
              <select value={sortDir} onChange={e=>setSortDir(e.target.value as any)} className="bg-slate-800 text-white border border-white/10 rounded px-3 py-2">
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>

          {/* Collapsible holdings table */}
          <div>
            <button
              onClick={()=>setCollapsed(c=>!c)}
              className="w-full flex items-center justify-between gap-2 text-left text-sm text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2"
            >
              <span className="flex items-center gap-2 font-medium">
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Holdings &amp; activity ({filtered.length})
              </span>
              <span className="text-xs text-gray-400">{collapsed ? 'Show' : 'Hide'} table</span>
            </button>

            {!collapsed && (
              <div className="overflow-x-auto mt-2 -mx-3 sm:mx-0 px-3 sm:px-0">
                <table className="min-w-full text-sm">
                  <thead className="text-gray-400">
                    <tr>
                      <th className="text-left p-2">Issuer</th>
                      <th className="text-left p-2">Action</th>
                      <th className="text-right p-2">Value ($k)</th>
                      <th className="text-right p-2">Shares</th>
                      <th className="text-right p-2 whitespace-nowrap">Δ Shares</th>
                      <th className="text-right p-2 whitespace-nowrap hidden md:table-cell">Δ Value ($k)</th>
                      <th className="text-left p-2 hidden sm:table-cell">Class</th>
                      <th className="text-left p-2 hidden lg:table-cell">CUSIP</th>
                      <th className="text-left p-2 hidden lg:table-cell">Put/Call</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((h, i) => {
                      const st = ACTION_STYLE[h.action]
                      const up = h.deltaShares > 0
                      const down = h.deltaShares < 0
                      return (
                        <tr key={i} className="border-t border-white/10 hover:bg-white/5">
                          <td className="p-2 text-white max-w-[180px] truncate" title={h.nameOfIssuer}>{h.nameOfIssuer}</td>
                          <td className="p-2">
                            <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="p-2 text-right">{fmt(h.value)}</td>
                          <td className="p-2 text-right">{fmt(h.sshPrnamt)}</td>
                          <td className={`p-2 text-right whitespace-nowrap ${up ? 'text-emerald-300' : down ? 'text-red-300' : 'text-gray-400'}`}>
                            {prevData ? signedFmt(h.deltaShares) : '-'}
                          </td>
                          <td className={`p-2 text-right whitespace-nowrap hidden md:table-cell ${h.deltaValue > 0 ? 'text-emerald-300' : h.deltaValue < 0 ? 'text-red-300' : 'text-gray-400'}`}>
                            {prevData ? signedFmt(h.deltaValue) : '-'}
                          </td>
                          <td className="p-2 hidden sm:table-cell">{h.titleOfClass}</td>
                          <td className="p-2 hidden lg:table-cell">{h.cusip}</td>
                          <td className="p-2 hidden lg:table-cell">{h.putCall || '-'}</td>
                        </tr>
                      )
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-3 text-center text-gray-400">No holdings match the filter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="text-[11px] text-gray-400 flex items-start gap-2">
            <TrendingUp className="w-3 h-3 mt-0.5 shrink-0" />
            <span>Values in thousands of USD per Form 13F. &ldquo;Action&rdquo; compares the selected quarter to the prior 13F filing (New / Added / Reduced / Sold out).</span>
          </div>
        </div>
      )}
    </section>
  )
}

export default ThirteenFExplorer
