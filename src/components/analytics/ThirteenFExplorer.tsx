'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Download, Search, TrendingUp } from 'lucide-react'

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

function fmt(n?: number, digits = 0) {
  if (!Number.isFinite(n as number)) return '-'
  return (n as number).toLocaleString(undefined, { maximumFractionDigits: digits })
}

const PRESETS: Array<{ label: string; cik: string }> = [
  { label: 'Berkshire Hathaway (Buffett)', cik: '0001067983' },
  { label: 'Bridgewater (Dalio)', cik: '0001350694' },
  { label: 'ARK Investment (Wood)', cik: '0001697740' },
  { label: 'Soros Fund', cik: '0001029160' },
]

export function ThirteenFExplorer() {
  const [cik, setCik] = useState('0001067983')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [data, setData] = useState<ApiOut | null>(null)
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<'value'|'issuer'|'shares'>('value')
  const [sortDir, setSortDir] = useState<'desc'|'asc'>('desc')

  async function fetch13f(targetCik: string) {
    try {
      setLoading(true)
      setError('')
      const r = await fetch(`/api/13f?cik=${encodeURIComponent(targetCik)}`, { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = await r.json()
      setData(j)
    } catch (e: any) {
      setError(`Failed to load: ${e?.message || e}`)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch13f(cik)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const rows = data?.holdings || []
    const term = q.trim().toLowerCase()
    let out = term
      ? rows.filter(h =>
          (h.nameOfIssuer || '').toLowerCase().includes(term) ||
          (h.titleOfClass || '').toLowerCase().includes(term) ||
          (h.cusip || '').toLowerCase().includes(term)
        )
      : rows.slice()
    out.sort((a, b) => {
      let va = 0, vb = 0
      if (sortKey === 'value') { va = a.value || 0; vb = b.value || 0 }
      if (sortKey === 'shares') { va = a.sshPrnamt || 0; vb = b.sshPrnamt || 0 }
      if (sortKey === 'issuer') {
        return (sortDir === 'asc' ? 1 : -1) * String(a.nameOfIssuer||'').localeCompare(String(b.nameOfIssuer||''))
      }
      return sortDir === 'desc' ? (vb - va) : (va - vb)
    })
    return out
  }, [data, q, sortKey, sortDir])

  const downloadCsv = () => {
    const cik10 = data?.filer?.cik || cik
    const acc = data?.filing?.accessionNumber?.replace(/-/g, '') || 'latest'
    const url = `/api/13f?cik=${encodeURIComponent(cik10)}&format=csv`
    window.open(url, '_blank')
  }

  return (
    <section className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
        <div className="flex-1">
          <label className="text-xs text-gray-400">Manager CIK</label>
          <input value={cik} onChange={e=>setCik(e.target.value)} placeholder="e.g. 0001067983" className="w-full bg-slate-800 text-white border border-white/10 rounded px-3 py-2" />
        </div>
        <div>
          <label className="text-xs text-gray-400">Presets</label>
          <select onChange={e=>{ const v = e.target.value; if (v) { setCik(v); fetch13f(v) } }} className="bg-slate-800 text-white border border-white/10 rounded px-3 py-2 w-64">
            <option value="">Select a famous manager…</option>
            {PRESETS.map(p => <option key={p.cik} value={p.cik}>{p.label}</option>)}
          </select>
        </div>
        <button onClick={()=>fetch13f(cik)} disabled={loading || !cik} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded px-4 py-2 disabled:opacity-50">
          <Search className="w-4 h-4" /> Load 13F
        </button>
        <button onClick={downloadCsv} disabled={!data} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded px-4 py-2 disabled:opacity-50">
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {error && <div className="text-red-300 text-sm mb-3">{error}</div>}
      {loading && <div className="text-gray-300">Loading 13F…</div>}

      {data && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
            <span>CIK: <strong className="text-white">{data.filer.cik}</strong></span>
            {data.filing.filingDate && <span>Filing date: <strong className="text-white">{data.filing.filingDate}</strong></span>}
            {data.filing.reportCalendarOrQuarter && <span>Period: <strong className="text-white">{data.filing.reportCalendarOrQuarter}</strong></span>}
            <span>Positions: <strong className="text-white">{fmt(data.totals.positions)}</strong></span>
            <span>Market value: <strong className="text-white">${fmt(data.totals.marketValueUsdThousands)}k</strong></span>
            {data.filing.infoTableUrl && <a className="text-blue-300 hover:underline" href={data.filing.infoTableUrl} target="_blank">Original XML</a>}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Filter by issuer / class / CUSIP…" className="w-full bg-slate-800 text-white border border-white/10 rounded px-3 py-2" />
              <Search className="w-4 h-4 text-gray-400 absolute right-2 top-2.5" />
            </div>
            <select value={sortKey} onChange={e=>setSortKey(e.target.value as any)} className="bg-slate-800 text-white border border-white/10 rounded px-3 py-2">
              <option value="value">Sort: Value</option>
              <option value="shares">Sort: Shares</option>
              <option value="issuer">Sort: Issuer</option>
            </select>
            <select value={sortDir} onChange={e=>setSortDir(e.target.value as any)} className="bg-slate-800 text-white border border-white/10 rounded px-3 py-2">
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-400">
                <tr>
                  <th className="text-left p-2">Issuer</th>
                  <th className="text-left p-2">Class</th>
                  <th className="text-left p-2">CUSIP</th>
                  <th className="text-right p-2">Value ($k)</th>
                  <th className="text-right p-2">Shares</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Put/Call</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h, i) => (
                  <tr key={i} className="border-t border-white/10 hover:bg-white/5">
                    <td className="p-2 text-white">{h.nameOfIssuer}</td>
                    <td className="p-2">{h.titleOfClass}</td>
                    <td className="p-2">{h.cusip}</td>
                    <td className="p-2 text-right">{fmt(h.value)}</td>
                    <td className="p-2 text-right">{fmt(h.sshPrnamt)}</td>
                    <td className="p-2">{h.sshPrnamtType}</td>
                    <td className="p-2">{h.putCall || '-'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-3 text-center text-gray-400">No holdings match the filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-gray-400 flex items-center gap-2">
            <TrendingUp className="w-3 h-3" />
            Values are reported in thousands of USD as per Form 13F. This view shows the most recent available filing.
          </div>
        </div>
      )}
    </section>
  )
}

export default ThirteenFExplorer
