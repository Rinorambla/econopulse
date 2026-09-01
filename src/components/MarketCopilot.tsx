'use client'

// EconoPulse Copilot — AI assistant embedded in the market-data terminal.
// It knows the chart you are viewing (symbol + live quant analysis) and answers
// grounded questions via the EconoAI engine (live quotes, fundamentals, news).
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send, TrendingUp, Newspaper, Target, Scale, AlertTriangle, CalendarDays } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type Msg = { role: 'user' | 'assistant'; content: string; ts: number }

const SUGGESTIONS: { icon: React.ReactNode; label: string; q: (s: string) => string }[] = [
  { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Analyze this chart', q: (s) => `Analyze the ${s} chart: trend, momentum, key technical picture and what to watch next.` },
  { icon: <Target className="w-3.5 h-3.5" />, label: 'Key levels & setup', q: (s) => `What are the key support/resistance levels for ${s} right now, and what long/short setup makes sense with entry, stop and target?` },
  { icon: <Newspaper className="w-3.5 h-3.5" />, label: 'News impact', q: (s) => `What are the latest news and catalysts affecting ${s}, and how could they move the price?` },
  { icon: <CalendarDays className="w-3.5 h-3.5" />, label: 'Earnings & dividends', q: (s) => `Show ${s} recent earnings vs estimates, next catalysts, dividend profile and valuation (P/E, forward P/E).` },
  { icon: <Scale className="w-3.5 h-3.5" />, label: 'Compare vs SPY', q: (s) => `Compare ${s} against SPY: relative performance, valuation and which is more attractive now.` },
  { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Risks right now', q: (s) => `What are the main risks for ${s} in the current macro environment (Fed, inflation, cycle)?` },
]

// Minimal safe markdown: escape HTML, then **bold** and bullet lists.
function renderAssistant(text: string): React.ReactNode {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = (s: string) => esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="text-cyan-300">$1</code>')
  const lines = text.split(/\r?\n/)
  const out: React.ReactNode[] = []
  let bullets: string[] = []
  const flush = () => {
    if (!bullets.length) return
    out.push(
      <ul key={`ul-${out.length}`} className="list-disc ml-4 space-y-0.5 mb-1.5">
        {bullets.map((b, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(b) }} />)}
      </ul>
    )
    bullets = []
  }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    if (/^[-•*]\s+/.test(line)) { bullets.push(line.replace(/^[-•*]\s+/, '')); continue }
    flush()
    if (/^#{1,4}\s+/.test(line)) {
      out.push(<div key={`h-${out.length}`} className="font-bold text-white mt-1.5 mb-0.5" dangerouslySetInnerHTML={{ __html: inline(line.replace(/^#{1,4}\s+/, '')) }} />)
    } else {
      out.push(<p key={`p-${out.length}`} className="mb-1.5" dangerouslySetInnerHTML={{ __html: inline(line) }} />)
    }
  }
  flush()
  return out
}

export default function MarketCopilot({ symbol }: { symbol: string }) {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const analysisRef = useRef<string>('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const sym = symbol.trim().toUpperCase()

  // Grounding: deterministic quant analysis for the active symbol (free, fast).
  useEffect(() => {
    analysisRef.current = ''
    if (!open || !sym || /^fred:/i.test(sym) || sym.includes('/')) return
    let cancel = false
    fetch(`/api/symbol-analysis?symbol=${encodeURIComponent(sym)}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (cancel || !j?.data) return
        const d = j.data
        analysisRef.current = [
          `Quant analysis for ${sym}: price ${d.price}, composite score ${d.composite}/100 (${d.verdict}).`,
          d.technicals ? `RSI14 ${d.technicals.rsi14}, SMA50 ${d.technicals.sma50}, SMA200 ${d.technicals.sma200}, ATR ${d.technicals.atrPct}%, vs 52w-high ${d.technicals.from52High}%.` : '',
          d.levels ? `Support: ${(d.levels.support || []).join(', ')}. Resistance: ${(d.levels.resistance || []).join(', ')}.` : '',
          d.trend ? `Trend %: 5D ${d.trend.d5}, 1M ${d.trend.m1}, 3M ${d.trend.m3}, 6M ${d.trend.m6}, 1Y ${d.trend.y1}.` : '',
        ].filter(Boolean).join(' ')
      })
      .catch(() => { /* optional grounding */ })
    return () => { cancel = true }
  }, [open, sym])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const send = useCallback(async (text: string) => {
    const q = text.trim()
    if (!q || sending) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: q, ts: Date.now() }])
    setSending(true)
    try {
      const context = [
        `The user is viewing the ${sym} chart on the EconoPulse market-data terminal.`,
        analysisRef.current,
      ].filter(Boolean).join('\n')
      const token = session?.access_token
      const r = await fetch('/api/econoai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question: q, userId: 'market-copilot', context }),
      })
      const j = await r.json().catch(() => ({}))
      const answer = r.status === 401
        ? 'Your session has expired — please log in again to use the Copilot.'
        : r.status === 403
        ? 'EconoPulse Copilot requires a Premium plan. Upgrade from the Pricing page to unlock it.'
        : (j?.answer || j?.error || 'Sorry, I could not generate a response right now. Please try again.')
      setMessages(m => [...m, { role: 'assistant', content: answer, ts: Date.now() }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Network error. Please try again in a moment.', ts: Date.now() }])
    } finally {
      setSending(false)
    }
  }, [sending, sym, session])

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen(true)}
        className="absolute right-3 bottom-14 z-30 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-400/30 bg-gradient-to-r from-blue-600/90 to-cyan-500/90 hover:from-blue-500 hover:to-cyan-400 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 backdrop-blur"
        title="EconoPulse Copilot — AI assistant for this chart"
      >
        <Sparkles className="w-4 h-4" />
        <span className="hidden sm:inline">Copilot</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[65] bg-black/50 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <div className="fixed z-[70] inset-x-0 bottom-0 h-[78dvh] sm:inset-x-auto sm:right-0 sm:inset-y-0 sm:h-auto sm:w-[430px] flex flex-col bg-[#0a0f1c] border-t sm:border-t-0 sm:border-l border-white/10 shadow-2xl rounded-t-2xl sm:rounded-none">
            {/* Header */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/10 bg-gradient-to-r from-blue-600/15 to-cyan-500/10">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white leading-tight">EconoPulse Copilot</div>
                <div className="text-[10px] text-gray-400 leading-tight">AI analyst · live data</div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-[11px] font-bold text-cyan-300">{sym}</span>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 space-y-3">
              {messages.length === 0 && (
                <div>
                  <p className="text-[13px] text-gray-300 mb-3">
                    Ask me anything about <span className="font-bold text-white">{sym}</span> or the markets — I use live quotes,
                    technicals, fundamentals, earnings and news.
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => send(s.q(sym))}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-cyan-500/10 hover:border-cyan-400/30 text-left text-[12px] text-gray-200 transition-colors"
                      >
                        <span className="text-cyan-300">{s.icon}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={`max-w-[88%] rounded-xl px-3 py-2 text-[12.5px] leading-relaxed ${m.role === 'user' ? 'bg-blue-600/80 text-white rounded-br-sm' : 'bg-white/[0.05] border border-white/[0.07] text-gray-200 rounded-bl-sm'}`}>
                    {m.role === 'assistant' ? renderAssistant(m.content) : m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.07] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '140ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '280ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-2.5 border-t border-white/10">
              <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-cyan-400/50">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
                  placeholder={`Ask about ${sym}…`}
                  className="flex-1 bg-transparent text-[13px] text-white placeholder-gray-500 outline-none py-1 min-w-0"
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || sending}
                  className="p-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white disabled:opacity-40"
                  title="Send"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-1 text-[9px] text-gray-600 text-center">AI-generated market commentary — not investment advice.</div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
