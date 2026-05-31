'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import Footer from '@/components/Footer'
import RequirePlan from '@/components/RequirePlan'
import {
  ArrowPathIcon,
  StarIcon,
  TrophyIcon,
  MagnifyingGlassIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronUpDownIcon,
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
}

type LiveRating = {
  symbol: string
  firm: string
  fromGrade: string
  toGrade: string
  action: string
  date: string
}

type ApiData = {
  ok: boolean
  asOf: string
  provider: string
  sectors: string[]
  analysts: Analyst[]
  liveActivity: LiveRating[]
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

function actionClass(action: string): string {
  const a = (action || '').toLowerCase()
  if (a === 'up' || a === 'init') return 'text-emerald-400'
  if (a === 'down') return 'text-red-400'
  return 'text-gray-300'
}

export default function TopAnalystsPage() {
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState('All')
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortAsc, setSortAsc] = useState(true)

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

  const live = data?.liveActivity || []

  const totalRatings = useMemo(
    () => ranked.reduce((acc, a) => acc + a.ratings, 0),
    [ranked]
  )
  const avgSuccess = useMemo(() => {
    if (!ranked.length) return 0
    return ranked.reduce((acc, a) => acc + a.successRate, 0) / ranked.length
  }, [ranked])

  const SortHeader = ({ label, k, align = 'right' }: { label: string; k: SortKey; align?: 'left' | 'right' }) => (
    <button
      onClick={() => toggleSort(k)}
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider text-[10.5px] text-gray-400 hover:text-white transition ${
        align === 'right' ? 'justify-end w-full' : ''
      }`}
    >
      {label}
      <ChevronUpDownIcon className={`h-3.5 w-3.5 ${sortKey === k ? 'text-sky-400' : 'text-slate-600'}`} />
    </button>
  )

  return (
    <RequirePlan min="premium">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-6 gap-3">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs uppercase tracking-wider font-semibold mb-1">
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
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-3 py-1.5 text-sm font-semibold text-amber-200 transition disabled:opacity-50"
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

          {/* Stat strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl bg-slate-800/50 border border-slate-700/60 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Analysts Ranked</div>
              <div className="text-2xl font-bold tabular-nums">{ranked.length || '—'}</div>
            </div>
            <div className="rounded-xl bg-slate-800/50 border border-slate-700/60 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Avg Success Rate</div>
              <div className="text-2xl font-bold tabular-nums text-emerald-400">{fmtPct(avgSuccess)}</div>
            </div>
            <div className="rounded-xl bg-slate-800/50 border border-slate-700/60 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Total Ratings</div>
              <div className="text-2xl font-bold tabular-nums">{totalRatings.toLocaleString('en-US')}</div>
            </div>
            <div className="rounded-xl bg-slate-800/50 border border-slate-700/60 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Live Feed</div>
              <div className="text-2xl font-bold tabular-nums flex items-center gap-1.5">
                <BoltIcon className={`h-5 w-5 ${data?.provider === 'finnhub' ? 'text-amber-400' : 'text-slate-600'}`} />
                {data?.provider === 'finnhub' ? 'On' : 'Off'}
              </div>
            </div>
          </div>

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
                    className="w-full rounded-lg bg-slate-900/70 border border-slate-700/60 pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="rounded-lg bg-slate-900/70 border border-slate-700/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
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
                      : filtered.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-700/20 transition">
                            <td className="px-3 py-2.5">
                              <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-md bg-slate-900/70 border border-slate-700/60 text-[12px] font-bold tabular-nums text-gray-300">
                                {a.rank}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-white leading-tight">{a.name}</div>
                              <Stars score={a.rating} />
                              <div className="text-[10px] text-gray-500 md:hidden mt-0.5">{a.company}</div>
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
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-sky-300">
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
            </section>

            {/* Live analyst activity */}
            <section className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-4 h-fit">
              <div className="flex items-center gap-2 mb-3">
                <BoltIcon className="h-5 w-5 text-amber-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">Live Analyst Activity</h2>
              </div>
              {data?.provider !== 'finnhub' && !loading && (
                <p className="text-[12px] text-gray-500 mb-3">
                  Connect a Finnhub API key (<code className="text-amber-300">FINNHUB_API_KEY</code>) to stream real-time
                  upgrades and downgrades from major firms.
                </p>
              )}
              <div className="space-y-2">
                {loading && !data
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-10 bg-slate-700/30 rounded animate-pulse" />
                    ))
                  : live.length === 0
                  ? !loading && (
                      <p className="text-[12px] text-gray-500">No recent rating changes available.</p>
                    )
                  : live.map((r, i) => (
                      <div
                        key={`${r.symbol}-${i}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-900/50 border border-slate-700/50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm">{r.symbol}</span>
                            {r.action.toLowerCase() === 'up' ? (
                              <ArrowTrendingUpIcon className="h-3.5 w-3.5 text-emerald-400" />
                            ) : r.action.toLowerCase() === 'down' ? (
                              <ArrowTrendingDownIcon className="h-3.5 w-3.5 text-red-400" />
                            ) : null}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate">{r.firm}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-[11px] font-semibold ${actionClass(r.action)}`}>
                            {r.fromGrade ? `${r.fromGrade} → ${r.toGrade}` : r.toGrade || '—'}
                          </div>
                          <div className="text-[10px] text-gray-500">{fmtDate(r.date)}</div>
                        </div>
                      </div>
                    ))}
              </div>
            </section>
          </div>

          <p className="text-[11px] text-gray-500 text-center mt-6">
            Top Analyst AI ranks Wall Street analysts by success rate and average return. Live rating changes powered by
            Finnhub. For information only — not investment advice.
          </p>
        </div>
        <Footer />
      </div>
    </RequirePlan>
  )
}
