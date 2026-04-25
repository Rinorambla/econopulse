'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import Footer from '@/components/Footer'
import RequirePlan from '@/components/RequirePlan'
import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  NewspaperIcon,
  ChartBarIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'

type IndexQuote = { symbol: string; name: string; price: number | null; changePct: number | null }
type Mover = { symbol?: string; ticker?: string; changePercent?: number; performance?: number; name?: string }
type Sector = { name?: string; sector?: string; symbol?: string; changePercent?: number; performance?: number }
type NewsItem = { id?: string; title: string; description?: string; url?: string; source?: string; publishedDate?: string }

type WrapData = {
  ok: boolean
  asOf: string
  provider: string
  quotes: IndexQuote[]
  movers: { top: Mover[]; bottom: Mover[] }
  sectors: Sector[]
  news: NewsItem[]
  brief: string
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  const s = n > 0 ? '+' : ''
  return `${s}${n.toFixed(2)}%`
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(4)
}

function pctClass(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return 'text-gray-400'
  if (n > 0) return 'text-emerald-400'
  if (n < 0) return 'text-red-400'
  return 'text-gray-300'
}

// Render brief markdown (## headings, **bold**, bullets) without external deps
function renderBrief(text: string): React.ReactNode {
  if (!text) return null
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let bullets: string[] = []

  const flushBullets = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1.5 text-gray-200 text-[13.5px] leading-relaxed">
          {bullets.map((b, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(b) }} />)}
        </ul>
      )
      bullets = []
    }
  }

  function inline(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em class="text-gray-300">$1</em>')
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { flushBullets(); continue }
    if (line.startsWith('## ')) {
      flushBullets()
      blocks.push(
        <h3 key={`h-${blocks.length}`} className="text-base font-bold text-white mt-5 mb-2 flex items-center gap-2">
          <span dangerouslySetInnerHTML={{ __html: inline(line.replace(/^##\s+/, '')) }} />
        </h3>
      )
      continue
    }
    if (line.startsWith('# ')) {
      flushBullets()
      blocks.push(<h2 key={`h2-${blocks.length}`} className="text-lg font-bold text-white mt-4 mb-2" dangerouslySetInnerHTML={{ __html: inline(line.replace(/^#\s+/, '')) }} />)
      continue
    }
    if (/^[-*]\s+/.test(line)) {
      bullets.push(line.replace(/^[-*]\s+/, ''))
      continue
    }
    flushBullets()
    blocks.push(<p key={`p-${blocks.length}`} className="text-gray-200 text-[13.5px] leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: inline(line) }} />)
  }
  flushBullets()
  return blocks
}

export default function UpdateAIPage() {
  const [data, setData] = useState<WrapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshedAt, setRefreshedAt] = useState<number>(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/updateai/wrap', { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = await r.json()
      setData(j)
      setRefreshedAt(Date.now())
    } catch (e: any) {
      setError(e?.message || 'Failed to load market wrap')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }, [refreshedAt])

  const quotes = data?.quotes || []
  const sectors = data?.sectors || []
  const top = data?.movers?.top || []
  const bottom = data?.movers?.bottom || []
  const news = data?.news || []
  const aiAvailable = (data?.provider && data.provider !== 'none')

  return (
    <RequirePlan min="free">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-6 gap-3">
            <div>
              <div className="flex items-center gap-2 text-sky-400 text-xs uppercase tracking-wider font-semibold mb-1">
                <SparklesIcon className="h-4 w-4" />
                <span>UpdateAI · Daily Market Wrap</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Today's Market Update</h1>
              <p className="text-gray-400 text-sm mt-1">{dateLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              {data?.asOf && (
                <span className="text-[11px] text-gray-500">
                  Updated {new Date(data.asOf).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 px-3 py-1.5 text-sm font-semibold text-sky-200 transition disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* AI provider status */}
          {!loading && data && !aiAvailable && (
            <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm">
              <strong className="text-amber-100">⚠️ AI brief unavailable:</strong> No AI provider detected on this deployment. Add <code className="px-1 rounded bg-amber-500/20 text-amber-100">GROQ_API_KEY</code> (free, get one at console.groq.com) or <code className="px-1 rounded bg-amber-500/20 text-amber-100">OPENAI_API_KEY</code> in Vercel → Settings → Environment Variables (Production scope) and redeploy. Live market data still works below.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
              Failed to load market wrap: {error}
            </div>
          )}

          {/* Top: Indices grid */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <GlobeAltIcon className="h-5 w-5 text-sky-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">At a Glance</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {(loading && !data ? Array.from({ length: 12 }) : quotes).map((q: any, i: number) => (
                <div key={q?.symbol || i} className="rounded-lg bg-slate-800/60 border border-slate-700/60 px-3 py-2.5 hover:border-sky-500/40 transition">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{q?.name || '—'}</div>
                  <div className="text-base font-bold tabular-nums">{q ? fmtPrice(q.price) : <span className="text-gray-600">…</span>}</div>
                  <div className={`text-xs font-semibold tabular-nums ${pctClass(q?.changePct)}`}>{fmtPct(q?.changePct)}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Two-column: AI Brief + Sectors/Movers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            {/* AI Brief */}
            <section className="lg:col-span-2 rounded-xl bg-gradient-to-br from-slate-800/70 to-slate-900/70 border border-slate-700/60 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-sky-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">AI Daily Brief</h2>
                </div>
                {data?.provider && data.provider !== 'none' && (
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">via {data.provider}</span>
                )}
              </div>
              {loading && !data?.brief && (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 bg-slate-700/50 rounded w-1/3" />
                  <div className="h-3 bg-slate-700/50 rounded w-full" />
                  <div className="h-3 bg-slate-700/50 rounded w-11/12" />
                  <div className="h-3 bg-slate-700/50 rounded w-3/4" />
                  <div className="h-3 bg-slate-700/50 rounded w-1/4 mt-3" />
                  <div className="h-3 bg-slate-700/50 rounded w-full" />
                  <div className="h-3 bg-slate-700/50 rounded w-10/12" />
                </div>
              )}
              {!loading && data?.brief && <div className="prose-invert">{renderBrief(data.brief)}</div>}
              {!loading && data && !data.brief && (
                <p className="text-gray-400 text-sm">AI brief unavailable. Live numbers, sectors, movers, and headlines are still updated below.</p>
              )}
            </section>

            {/* Sectors */}
            <section className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ChartBarIcon className="h-5 w-5 text-emerald-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">Sector Performance</h2>
              </div>
              <div className="space-y-1.5">
                {(loading && !data ? Array.from({ length: 11 }) : sectors).map((s: any, i: number) => {
                  const name = s?.name || s?.sector || s?.symbol || `…`
                  const pct = s?.changePercent ?? s?.performance
                  const wPct = pct == null ? 0 : Math.min(100, Math.abs(pct) * 12)
                  const positive = (pct || 0) >= 0
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-24 truncate text-gray-300">{name}</div>
                      <div className="relative flex-1 h-2 bg-slate-700/40 rounded">
                        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-600/80" />
                        {pct != null && isFinite(pct) && (
                          <div
                            className={`absolute top-0 bottom-0 ${positive ? 'left-1/2 bg-emerald-500/70' : 'right-1/2 bg-red-500/70'} rounded`}
                            style={{ width: `${wPct / 2}%` }}
                          />
                        )}
                      </div>
                      <div className={`w-14 text-right tabular-nums font-semibold ${pctClass(pct)}`}>{fmtPct(pct)}</div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          {/* Movers + News */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            <section className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">Top Gainers</h2>
              </div>
              <div className="divide-y divide-slate-700/40">
                {(top.length ? top : Array.from({ length: 5 })).map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{m?.symbol || m?.ticker || '…'}</span>
                      {m?.name && <span className="text-[10px] text-gray-500 truncate max-w-[140px]">{m.name}</span>}
                    </div>
                    <span className={`font-semibold tabular-nums ${pctClass(m?.changePercent ?? m?.performance)}`}>{fmtPct(m?.changePercent ?? m?.performance)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowTrendingDownIcon className="h-5 w-5 text-red-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">Top Losers</h2>
              </div>
              <div className="divide-y divide-slate-700/40">
                {(bottom.length ? bottom : Array.from({ length: 5 })).map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{m?.symbol || m?.ticker || '…'}</span>
                      {m?.name && <span className="text-[10px] text-gray-500 truncate max-w-[140px]">{m.name}</span>}
                    </div>
                    <span className={`font-semibold tabular-nums ${pctClass(m?.changePercent ?? m?.performance)}`}>{fmtPct(m?.changePercent ?? m?.performance)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <NewspaperIcon className="h-5 w-5 text-sky-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">Headlines</h2>
              </div>
              <div className="space-y-2">
                {(news.length ? news : Array.from({ length: 5 })).slice(0, 6).map((n: any, i: number) => (
                  <a
                    key={n?.id || i}
                    href={n?.url || '#'}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block group"
                  >
                    <div className="text-[12.5px] text-gray-200 group-hover:text-sky-300 transition leading-snug font-medium line-clamp-2">
                      {n?.title || <span className="text-gray-600">Loading headline…</span>}
                    </div>
                    {n?.source && <div className="text-[10px] text-gray-500 mt-0.5">{n.source}</div>}
                  </a>
                ))}
              </div>
            </section>
          </div>

          <p className="text-[11px] text-gray-500 text-center">
            UpdateAI summarizes live market data with AI. Auto-refreshes every 5 minutes. For information only — not investment advice.
          </p>
        </div>
        <Footer />
      </div>
    </RequirePlan>
  )
}
