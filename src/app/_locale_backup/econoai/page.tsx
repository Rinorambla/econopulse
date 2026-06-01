'use client'

import React, { useEffect, useState, useCallback } from 'react'
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

  // Auto refresh market snapshot every 5 minutes
  useEffect(() => {
    const id = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  const quotes = data?.quotes || []
  const sectors = data?.sectors || []
  const top = data?.movers?.top || []
  const bottom = data?.movers?.bottom || []
  const news = data?.news || []

  // ===== Conversational AI agent =====
  type ChatMsg = { role: 'user' | 'assistant'; content: string; ts: number }
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = React.useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  // Build a compact, grounded context string from the live market snapshot.
  const buildContext = useCallback((): string => {
    if (!data) return ''
    const q = quotes.slice(0, 12).map((x) => `${x.name || x.symbol}: ${fmtPrice(x.price)} (${fmtPct(x.changePct)})`).join('; ')
    const sec = sectors.slice(0, 11).map((s: any) => `${s.name || s.sector || s.symbol}: ${fmtPct(s.changePercent ?? s.performance)}`).join('; ')
    const g = top.slice(0, 5).map((m: any) => `${m.symbol || m.ticker} ${fmtPct(m.changePercent ?? m.performance)}`).join(', ')
    const l = bottom.slice(0, 5).map((m: any) => `${m.symbol || m.ticker} ${fmtPct(m.changePercent ?? m.performance)}`).join(', ')
    const h = news.slice(0, 6).map((n: any) => `• ${n.title}${n.source ? ` (${n.source})` : ''}`).join('\n')
    return [
      `Live market snapshot as of ${data.asOf ? new Date(data.asOf).toLocaleString('en-US') : 'now'}:`,
      `Indices: ${q}`,
      `Sectors: ${sec}`,
      `Top gainers: ${g}`,
      `Top losers: ${l}`,
      `Headlines:\n${h}`,
    ].join('\n')
  }, [data, quotes, sectors, top, bottom, news])

  const send = useCallback(async (text: string) => {
    const q = text.trim()
    if (!q || sending) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: q, ts: Date.now() }])
    setSending(true)
    try {
      const r = await fetch('/api/econoai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, userId: 'econoai-web', context: buildContext() }),
      })
      const j = await r.json().catch(() => ({}))
      const answer = j?.answer || j?.error || 'Sorry, I could not generate a response right now. Please try again.'
      setMessages((m) => [...m, { role: 'assistant', content: answer, ts: Date.now() }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Network error. Please try again in a moment.', ts: Date.now() }])
    } finally {
      setSending(false)
    }
  }, [sending, buildContext])

  const suggestions = [
    'What is the market doing today and why?',
    'Compare AAPL vs MSFT performance and outlook',
    'Read the SPY chart: trend, key support and resistance',
    'Which sectors are leading and lagging right now?',
    'Summarize the most important headlines for investors',
    'Is NVDA overbought? What levels matter?',
  ]

  return (
    <RequirePlan min="premium">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white pt-16 pb-0 flex flex-col">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex-1 min-h-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between py-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-none">EconoAI</h1>
                <p className="text-gray-400 text-xs mt-0.5">Your AI market analyst — charts, comparisons, news & macro</p>
              </div>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 px-3 py-1.5 text-xs font-semibold text-sky-200 transition disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh data</span>
            </button>
          </div>

          {/* Main grid: chat (left) + live snapshot (right) */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 pb-4">
            {/* Chat column */}
            <section className="lg:col-span-2 flex flex-col min-h-0 rounded-2xl bg-slate-900/50 border border-slate-700/60 overflow-hidden">
              <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-4">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-sky-500/20">
                      <SparklesIcon className="h-7 w-7 text-white" />
                    </div>
                    <h2 className="text-lg font-bold mb-1">Ask me anything about the markets</h2>
                    <p className="text-gray-400 text-sm max-w-md mb-5">
                      Charts, technical levels, stock comparisons, sector rotation, macro, and the latest news — grounded on live data.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="text-left text-[12.5px] text-gray-200 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/80 hover:border-sky-500/40 px-3 py-2.5 transition"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mr-2 mt-0.5">
                        <SparklesIcon className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        m.role === 'user'
                          ? 'bg-sky-600 text-white rounded-br-sm'
                          : 'bg-slate-800/70 border border-slate-700/60 text-gray-100 rounded-bl-sm'
                      }`}
                    >
                      {m.role === 'assistant'
                        ? <div className="prose-invert">{renderBrief(m.content)}</div>
                        : <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>}
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="flex justify-start">
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mr-2">
                      <SparklesIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-slate-700/60 bg-slate-900/70 p-3">
                {messages.length > 0 && (
                  <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
                    {suggestions.slice(0, 4).map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        disabled={sending}
                        className="shrink-0 text-[11px] text-gray-300 rounded-full border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/80 hover:text-white px-3 py-1 transition disabled:opacity-50"
                      >
                        {s.length > 38 ? s.slice(0, 38) + '…' : s}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
                    }}
                    rows={1}
                    placeholder="Ask about a stock, a chart, a comparison, the news…"
                    className="flex-1 resize-none max-h-32 rounded-xl bg-slate-800/70 border border-slate-700/60 focus:border-sky-500/60 focus:outline-none px-3.5 py-2.5 text-sm text-white placeholder-gray-500"
                  />
                  <button
                    onClick={() => send(input)}
                    disabled={sending || !input.trim()}
                    className="shrink-0 h-10 w-10 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 flex items-center justify-center transition"
                    title="Send"
                  >
                    <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 text-center">
                  EconoAI uses live market data. For information only — not investment advice.
                </p>
              </div>
            </section>

            {/* Live snapshot column */}
            <aside className="hidden lg:flex flex-col min-h-0 gap-4">
              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-200 text-xs">
                  {error}
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
                {/* Indices */}
                <section className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <GlobeAltIcon className="h-4 w-4 text-sky-400" />
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-300">Markets at a Glance</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(loading && !data ? Array.from({ length: 8 }) : quotes.slice(0, 10)).map((q: any, i: number) => (
                      <div key={q?.symbol || i} className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-2.5 py-1.5">
                        <div className="text-[9px] text-gray-500 uppercase tracking-wider truncate">{q?.name || '—'}</div>
                        <div className="text-sm font-bold tabular-nums leading-tight">{q ? fmtPrice(q.price) : '…'}</div>
                        <div className={`text-[11px] font-semibold tabular-nums ${pctClass(q?.changePct)}`}>{fmtPct(q?.changePct)}</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Sectors */}
                <section className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <ChartBarIcon className="h-4 w-4 text-emerald-400" />
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-300">Sectors</h2>
                  </div>
                  <div className="space-y-1">
                    {(loading && !data ? Array.from({ length: 8 }) : sectors).map((s: any, i: number) => {
                      const name = s?.name || s?.sector || s?.symbol || '…'
                      const pct = s?.changePercent ?? s?.performance
                      return (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-300 truncate max-w-[60%]">{name}</span>
                          <span className={`tabular-nums font-semibold ${pctClass(pct)}`}>{fmtPct(pct)}</span>
                        </div>
                      )
                    })}
                  </div>
                </section>

                {/* Movers */}
                <section className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-400" />
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Gainers</h3>
                      </div>
                      <div className="space-y-1">
                        {(top.length ? top : Array.from({ length: 4 })).slice(0, 5).map((m: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-white">{m?.symbol || m?.ticker || '…'}</span>
                            <span className={`tabular-nums ${pctClass(m?.changePercent ?? m?.performance)}`}>{fmtPct(m?.changePercent ?? m?.performance)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <ArrowTrendingDownIcon className="h-4 w-4 text-red-400" />
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Losers</h3>
                      </div>
                      <div className="space-y-1">
                        {(bottom.length ? bottom : Array.from({ length: 4 })).slice(0, 5).map((m: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-white">{m?.symbol || m?.ticker || '…'}</span>
                            <span className={`tabular-nums ${pctClass(m?.changePercent ?? m?.performance)}`}>{fmtPct(m?.changePercent ?? m?.performance)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* News */}
                <section className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <NewspaperIcon className="h-4 w-4 text-sky-400" />
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-300">Headlines</h2>
                  </div>
                  <div className="space-y-2">
                    {(news.length ? news : Array.from({ length: 4 })).slice(0, 6).map((n: any, i: number) => (
                      <a key={n?.id || i} href={n?.url || '#'} target="_blank" rel="noreferrer noopener" className="block group">
                        <div className="text-[11.5px] text-gray-200 group-hover:text-sky-300 transition leading-snug font-medium line-clamp-2">
                          {n?.title || 'Loading…'}
                        </div>
                        {n?.source && <div className="text-[9px] text-gray-500 mt-0.5">{n.source}</div>}
                      </a>
                    ))}
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </div>
        <Footer />
      </div>
    </RequirePlan>
  )
}
