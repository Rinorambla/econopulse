'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import Footer from '@/components/Footer'
import RequirePlan from '@/components/RequirePlan'
import {
  ArrowPathIcon,
  StarIcon,
  TrophyIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ChevronUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'

type Analyst = {
  id: string
  name: string
  rating: number
  company: string
  sector: string
  successRate: number
  avgReturn: number
  ratings: number
  lastRating: string
  coverage?: Coverage[]
}

type RatingAction = 'Buy' | 'Hold' | 'Sell'

type Coverage = {
  ticker: string
  company: string
  action: RatingAction
  expectedReturn: number
  priceTarget: number
  date: string
}

type ApiData = {
  ok: boolean
  asOf: string
  provider: string
  sectors: string[]
  analysts: Analyst[]
}

type SortKey = 'rank' | 'successRate' | 'avgReturn' | 'ratings' | 'lastRating'

function fmtPct(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  return `${n.toFixed(2)}%`
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function Stars({ score }: { score: number }) {
  const filled = Math.round(score)
  return (
    <span className="inline-flex items-center gap-0.5" title={`${score.toFixed(2)} / 5`}>
      {Array.from({ length: 5 }).map((_, i) =>
        i < filled ? (
          <StarSolid key={i} className="h-3 w-3 text-amber-400" />
        ) : (
          <StarIcon key={i} className="h-3 w-3 text-slate-600" />
        )
      )}
      <span className="ml-1 text-[11px] font-semibold text-amber-300 tabular-nums">{score.toFixed(2)}</span>
    </span>
  )
}

export default function TopAnalystsPage() {
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState('All')
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortAsc, setSortAsc] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/top-analysts', { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = (await r.json()) as ApiData
      setData(j)
    } catch (e: any) {
      setError(e?.message || 'Failed to load analyst rankings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Auto refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  const sectors = useMemo(() => ['All', ...(data?.sectors || [])], [data])

  // Ranked analysts (rank = position in the original sorted list)
  const ranked = useMemo(() => {
    const list = data?.analysts || []
    return list.map((a, i) => ({ ...a, rank: i + 1 }))
  }, [data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = ranked.filter((a) => {
      const matchesSector = sector === 'All' || a.sector === sector
      const matchesQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.company.toLowerCase().includes(q) ||
        a.sector.toLowerCase().includes(q)
      return matchesSector && matchesQuery
    })

    rows = [...rows].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'successRate':
          cmp = a.successRate - b.successRate
          break
        case 'avgReturn':
          cmp = a.avgReturn - b.avgReturn
          break
        case 'ratings':
          cmp = a.ratings - b.ratings
          break
        case 'lastRating':
          cmp = new Date(a.lastRating).getTime() - new Date(b.lastRating).getTime()
          break
        case 'rank':
        default:
          cmp = a.rank - b.rank
          break
      }
      return sortAsc ? cmp : -cmp
    })
    return rows
  }, [ranked, query, sector, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v)
    } else {
      setSortKey(key)
      // Rank ascending by default, metrics descending by default
      setSortAsc(key === 'rank')
    }
  }

  // Sector conviction: which sectors analysts are buying the most (by avg expected return)
  const sectorStats = useMemo(() => {
    const map = new Map<string, { count: number; ratings: number; sumReturn: number; sumSuccess: number }>()
    for (const a of ranked) {
      const cur = map.get(a.sector) || { count: 0, ratings: 0, sumReturn: 0, sumSuccess: 0 }
      cur.count++
      cur.ratings += a.ratings
      cur.sumReturn += a.avgReturn
      cur.sumSuccess += a.successRate
      map.set(a.sector, cur)
    }
    return Array.from(map.entries())
      .map(([sector, s]) => ({
        sector,
        count: s.count,
        ratings: s.ratings,
        avgReturn: s.sumReturn / s.count,
        avgSuccess: s.sumSuccess / s.count,
      }))
      .sort((a, b) => b.avgReturn - a.avgReturn)
  }, [ranked])

  // Most-covered companies: aggregate every analyst's coverage into Buy/Hold/Sell tallies.
  const companyStats = useMemo(() => {
    const map = new Map<string, { ticker: string; company: string; buy: number; hold: number; sell: number; total: number; sumTarget: number; sumExpected: number }>()
    for (const a of ranked) {
      for (const c of a.coverage || []) {
        const cur = map.get(c.ticker) || { ticker: c.ticker, company: c.company, buy: 0, hold: 0, sell: 0, total: 0, sumTarget: 0, sumExpected: 0 }
        if (c.action === 'Buy') cur.buy++
        else if (c.action === 'Sell') cur.sell++
        else cur.hold++
        cur.total++
        cur.sumTarget += c.priceTarget
        cur.sumExpected += c.expectedReturn
        map.set(c.ticker, cur)
      }
    }
    return Array.from(map.values())
      .map((s) => ({ ...s, avgTarget: s.sumTarget / s.total, avgExpected: s.sumExpected / s.total }))
      .sort((a, b) => b.total - a.total)
  }, [ranked])

  // Selected analyst for the detail modal (their buy/sell calls)
  const [selected, setSelected] = useState<Analyst | null>(null)

  // Collapse the long list by default; show all when expanded or while searching/filtering
  const COLLAPSE_LIMIT = 15
  const isFiltering = query.trim() !== '' || sector !== 'All'
  const showAll = expanded || isFiltering
  const visibleRows = showAll ? filtered : filtered.slice(0, COLLAPSE_LIMIT)

  const SortHeader = ({ label, k, align = 'right' }: { label: string; k: SortKey; align?: 'left' | 'right' }) => (
    <button
      onClick={() => toggleSort(k)}
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider text-[10.5px] text-gray-400 hover:text-white transition ${
        align === 'right' ? 'justify-end w-full' : ''
      }`}
    >
      {label}
      <ChevronUpDownIcon className={`h-3.5 w-3.5 ${sortKey === k ? 'text-blue-400' : 'text-slate-600'}`} />
    </button>
  )

  return (
    <RequirePlan min="premium">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-6 gap-3">
            <div>
              <div className="flex items-center gap-2 text-blue-400 text-xs uppercase tracking-wider font-semibold mb-1">
                <TrophyIcon className="h-4 w-4" />
                <span>Top Analyst AI · Wall Street Leaderboard</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Top Wall Street Analysts</h1>
              <p className="text-gray-400 text-sm mt-1">
                A list of Wall Street analysts, ranked by their performance.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {data?.asOf && (
                <span className="text-[11px] text-gray-500">
                  Updated{' '}
                  {new Date(data.asOf).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 px-3 py-1.5 text-sm font-semibold text-blue-200 transition disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
              Failed to load analyst rankings: {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Leaderboard */}
            <section className="lg:col-span-2 rounded-xl bg-slate-800/40 border border-slate-700/60 overflow-hidden">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-700/60">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search analyst, firm or sector…"
                    className="w-full rounded-lg bg-slate-900/70 border border-slate-700/60 pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="rounded-lg bg-slate-900/70 border border-slate-700/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  {sectors.map((s) => (
                    <option key={s} value={s}>
                      {s === 'All' ? 'All sectors' : s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/60 bg-slate-900/40">
                      <th className="px-3 py-2.5 text-left">
                        <SortHeader label="#" k="rank" align="left" />
                      </th>
                      <th className="px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                        Analyst
                      </th>
                      <th className="px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 hidden md:table-cell">
                        Company
                      </th>
                      <th className="px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 hidden lg:table-cell">
                        Sector
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        <SortHeader label="Success" k="successRate" />
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        <SortHeader label="Avg Return" k="avgReturn" />
                      </th>
                      <th className="px-3 py-2.5 text-right hidden sm:table-cell">
                        <SortHeader label="Ratings" k="ratings" />
                      </th>
                      <th className="px-3 py-2.5 text-right hidden lg:table-cell">
                        <SortHeader label="Last Rating" k="lastRating" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading && !data
                      ? Array.from({ length: 10 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-3 py-3" colSpan={8}>
                              <div className="h-3 bg-slate-700/40 rounded w-full" />
                            </td>
                          </tr>
                        ))
                      : visibleRows.map((a) => (
                          <tr
                            key={a.id}
                            onClick={() => setSelected(a)}
                            className="hover:bg-blue-500/10 transition cursor-pointer group"
                            title={`See ${a.name}'s buy/sell calls`}
                          >
                            <td className="px-3 py-2.5">
                              <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-md bg-slate-900/70 border border-slate-700/60 text-[12px] font-bold tabular-nums text-gray-300">
                                {a.rank}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-white leading-tight group-hover:text-blue-300 transition">{a.name}</div>
                              <Stars score={a.rating} />
                              <div className="text-[10px] text-gray-500 md:hidden mt-0.5">{a.company}</div>
                              {a.coverage && a.coverage.length > 0 && (
                                <div className="text-[10px] text-blue-400/80 mt-0.5">
                                  Covers {a.coverage.length}: {a.coverage.slice(0, 4).map((c) => c.ticker).join(', ')}{a.coverage.length > 4 ? '…' : ''}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-gray-300 hidden md:table-cell">{a.company}</td>
                            <td className="px-3 py-2.5 hidden lg:table-cell">
                              <span className="inline-block rounded-md bg-slate-700/40 border border-slate-600/40 px-2 py-0.5 text-[11px] text-gray-300">
                                {a.sector}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-400">
                              {fmtPct(a.successRate)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-blue-300">
                              {fmtPct(a.avgReturn)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-300 hidden sm:table-cell">
                              {a.ratings.toLocaleString('en-US')}
                            </td>
                            <td className="px-3 py-2.5 text-right text-gray-400 text-[12px] hidden lg:table-cell">
                              {fmtDate(a.lastRating)}
                            </td>
                          </tr>
                        ))}
                    {!loading && filtered.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-gray-500 text-sm">
                          No analysts match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Expand / collapse */}
              {!loading && !isFiltering && filtered.length > COLLAPSE_LIMIT && (
                <div className="border-t border-slate-700/60">
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-blue-300 hover:text-white hover:bg-blue-500/10 transition"
                  >
                    {expanded ? (
                      <>
                        Show less
                        <ChevronUpIcon className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Show all {filtered.length} analysts
                        <ChevronDownIcon className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </section>

            {/* Sector conviction chart */}
            <section className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-4 h-fit">
              <div className="flex items-center gap-2 mb-1">
                <ChartBarIcon className="h-5 w-5 text-blue-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">Sectors Analysts Are Buying</h2>
              </div>
              <p className="text-[11px] text-gray-500 mb-4">Average expected return by sector across ranked analysts</p>
              <div className="space-y-2.5">
                {loading && !data
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-8 bg-slate-700/30 rounded animate-pulse" />
                    ))
                  : sectorStats.map((s, i) => {
                      const max = sectorStats[0]?.avgReturn || 1
                      const w = Math.max(6, (s.avgReturn / max) * 100)
                      return (
                        <div key={s.sector}>
                          <div className="flex items-center justify-between text-[11px] mb-0.5">
                            <span className="font-semibold text-gray-200">{s.sector}</span>
                            <span className="tabular-nums">
                              <span className="text-blue-300 font-semibold">{fmtPct(s.avgReturn)}</span>
                              <span className="text-gray-600"> · {s.count} analysts</span>
                            </span>
                          </div>
                          <div className="h-2.5 rounded bg-slate-900/60 overflow-hidden">
                            <div
                              className={`h-full rounded ${i === 0 ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gradient-to-r from-blue-600/80 to-blue-400/80'}`}
                              style={{ width: `${w}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
              </div>

              {/* Most-covered sectors by total ratings */}
              <div className="mt-5 pt-4 border-t border-slate-700/50">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2.5">Most Covered Sectors</h3>
                <div className="space-y-2">
                  {[...sectorStats]
                    .sort((a, b) => b.ratings - a.ratings)
                    .slice(0, 5)
                    .map((s) => {
                      const maxR = Math.max(...sectorStats.map((x) => x.ratings), 1)
                      const w = Math.max(6, (s.ratings / maxR) * 100)
                      return (
                        <div key={s.sector} className="flex items-center gap-2 text-[11px]">
                          <span className="w-24 truncate text-gray-300">{s.sector}</span>
                          <div className="flex-1 h-2 rounded bg-slate-900/60 overflow-hidden">
                            <div className="h-full rounded bg-purple-500/70" style={{ width: `${w}%` }} />
                          </div>
                          <span className="w-14 text-right tabular-nums text-gray-400">
                            {s.ratings.toLocaleString('en-US')}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Most-covered companies (what analysts are buying / selling) */}
              <div className="mt-5 pt-4 border-t border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Most Covered Companies</h3>
                  <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-sm bg-emerald-500" />Buy</span>
                    <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-sm bg-slate-500" />Hold</span>
                    <span className="flex items-center gap-1 text-rose-400"><span className="w-2 h-2 rounded-sm bg-rose-500" />Sell</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mb-3">Total analyst calls per stock — buy/hold/sell split</p>
                <div className="space-y-2">
                  {loading && !data
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-7 bg-slate-700/30 rounded animate-pulse" />
                      ))
                    : companyStats.slice(0, 10).map((s) => {
                        const maxT = companyStats[0]?.total || 1
                        const w = Math.max(8, (s.total / maxT) * 100)
                        const buyW = (s.buy / s.total) * 100
                        const holdW = (s.hold / s.total) * 100
                        const sellW = (s.sell / s.total) * 100
                        return (
                          <div key={s.ticker}>
                            <div className="flex items-center justify-between text-[11px] mb-0.5">
                              <span className="font-semibold text-gray-200">
                                {s.ticker}
                                <span className="text-gray-500 font-normal"> · {s.company}</span>
                              </span>
                              <span className="tabular-nums text-gray-400">
                                {s.total} calls · <span className="text-blue-300">{fmtPct(s.avgExpected)}</span>
                              </span>
                            </div>
                            <div className="h-2.5 rounded bg-slate-900/60 overflow-hidden flex" style={{ width: `${w}%` }} title={`${s.buy} Buy · ${s.hold} Hold · ${s.sell} Sell`}>
                              <div className="h-full bg-emerald-500" style={{ width: `${buyW}%` }} />
                              <div className="h-full bg-slate-500" style={{ width: `${holdW}%` }} />
                              <div className="h-full bg-rose-500" style={{ width: `${sellW}%` }} />
                            </div>
                          </div>
                        )
                      })}
                </div>
              </div>
            </section>
          </div>

          <p className="text-[11px] text-gray-500 text-center mt-6">
            Top Analyst AI ranks Wall Street analysts by success rate and average return, auto-refreshed every 5 minutes.
            For information only — not investment advice.
          </p>
        </div>
        <Footer />
      </div>

      {/* ===== Analyst detail modal: what they bought / sold ===== */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full sm:max-w-2xl max-h-[88vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-700/60 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-slate-700/60">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                  <Stars score={selected.rating} />
                </div>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  {selected.company} · <span className="text-gray-300">{selected.sector}</span>
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
                  <span className="text-gray-400">Success: <span className="text-emerald-400 font-semibold">{fmtPct(selected.successRate)}</span></span>
                  <span className="text-gray-400">Avg return: <span className="text-blue-300 font-semibold">{fmtPct(selected.avgReturn)}</span></span>
                  <span className="text-gray-400">Ratings: <span className="text-gray-200 font-semibold">{selected.ratings.toLocaleString('en-US')}</span></span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="shrink-0 h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white flex items-center justify-center transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Summary chips */}
            {(() => {
              const cov = selected.coverage || []
              const buy = cov.filter((c) => c.action === 'Buy').length
              const hold = cov.filter((c) => c.action === 'Hold').length
              const sell = cov.filter((c) => c.action === 'Sell').length
              return (
                <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-slate-700/60 text-[12px]">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">{buy} Buy</span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-600/20 border border-slate-500/30 text-gray-300 font-semibold">{hold} Hold</span>
                  <span className="px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold">{sell} Sell</span>
                  <span className="ml-auto text-gray-500">{cov.length} stocks covered</span>
                </div>
              )
            })()}

            {/* Coverage list */}
            <div className="overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="border-b border-slate-700/60 text-[10px] uppercase tracking-wider text-gray-500">
                    <th className="px-4 sm:px-5 py-2 text-left">Stock</th>
                    <th className="px-3 py-2 text-center">Action</th>
                    <th className="px-3 py-2 text-right">Price Target</th>
                    <th className="px-3 py-2 text-right">Implied</th>
                    <th className="px-4 sm:px-5 py-2 text-right hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(selected.coverage || []).map((c) => {
                    const badge =
                      c.action === 'Buy' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : c.action === 'Sell' ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                      : 'bg-slate-600/20 border-slate-500/30 text-gray-300'
                    return (
                      <tr key={c.ticker} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 sm:px-5 py-2.5">
                          <div className="font-bold text-white">{c.ticker}</div>
                          <div className="text-[11px] text-gray-500">{c.company}</div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-semibold ${badge}`}>{c.action}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-200">${c.priceTarget.toLocaleString('en-US')}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${c.expectedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {c.expectedReturn >= 0 ? '+' : ''}{c.expectedReturn.toFixed(1)}%
                        </td>
                        <td className="px-4 sm:px-5 py-2.5 text-right text-[12px] text-gray-400 hidden sm:table-cell">{fmtDate(c.date)}</td>
                      </tr>
                    )
                  })}
                  {(!selected.coverage || selected.coverage.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-gray-500 text-sm">No coverage data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 sm:px-5 py-2.5 border-t border-slate-700/60 text-[10px] text-gray-600 text-center">
              Price targets and calls are illustrative — for information only, not investment advice.
            </div>
          </div>
        </div>
      )}
    </RequirePlan>
  )
}
