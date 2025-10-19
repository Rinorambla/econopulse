'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Footer from '@/components/Footer'
import { NavigationLink } from '@/components/Navigation'
import RequirePlan from '@/components/RequirePlan'
import { useAuth } from '@/hooks/useAuth'
import { 
  SparklesIcon, 
  ChartBarIcon, 
  NewspaperIcon, 
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

export default function EconoAIPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { user } = useAuth()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [typing, setTyping] = useState(false)
  const [userQuestion, setUserQuestion] = useState('')
  const [userAnswer, setUserAnswer] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [error, setError] = useState('')

  // Demo questions that cycle
  const demoQuestions = [
    "What's the outlook for AAPL next quarter?",
    "Should I buy NVDA at current levels?",
    "Which sectors are rotating into strength?",
    "Analyze my portfolio: MSFT 30%, GOOGL 25%, AMZN 20%, META 15%, TSLA 10%",
    "What are the best dividend stocks in Europe?",
    "Compare BABA vs JD fundamentals"
  ]

  const demoAnswers = [
    "Based on recent earnings momentum, supply chain improvements, and Services growth trajectory, AAPL shows strong fundamentals. Key levels: support at $165, resistance at $178. Analyst consensus: 65% buy ratings. Consider entry on pullback to $168-170 range. Risk/reward favorable for 6-12 month horizon.",
    "NVDA trades at 28x forward sales, premium valuation reflects AI leadership. Technical: consolidating after 240% YTD gain. Wait for confirmation above $495 or accumulate on dips to $450 support. Strong institutional accumulation continues. AI demand cycle intact.",
    "Current rotation favors Financials (+2.3% rel. strength) and Energy (+1.8%) as rates stabilize. Technology (-1.2% rel.) and Consumer Discretionary (-0.9%) underperforming. Defensive posture suggests late-cycle dynamics. Consider adding XLF, XLE exposure.",
    "Portfolio Analysis: Tech-heavy (85%) with excellent quality names but concentrated risk. Sharpe ratio: 1.42. Volatility: 24% annualized. Suggestions: 1) Reduce to 60-65% tech 2) Add defensive: healthcare (XLV), staples (XLP) 3) International diversification (VEA, EEM) 4) Rebalance TSLA to 5-7%.",
    "Top European dividend plays: TotalEnergies (TTE.PA) 5.2% yield, strong FCF | Shell (SHEL.L) 4.8%, buyback program | Unilever (ULVR.L) 3.9%, stable consumer | ASML (ASML.AS) 1.2% + growth | Novo Nordisk (NOVO-B.CO) 1.1% + innovation premium. Consider diversifying via VEUR or IEUR ETFs.",
    "BABA vs JD: Valuation edge to BABA (P/E 9.2 vs 14.3), but regulatory overhang persists. JD shows stronger profitability (ROE 18% vs 12%) and logistics moat. E-commerce growth normalizing for both. Prefer JD for stability, BABA for contrarian value play. Allocation suggestion: 60/40 JD/BABA if entering China exposure."
  ]

  useEffect(() => {
    // Only cycle demo questions if user hasn't asked anything
    if (userQuestion || userAnswer) return

    const interval = setInterval(() => {
      setTyping(true)
      setTimeout(() => {
        setCurrentQuestion((prev) => (prev + 1) % demoQuestions.length)
        setTyping(false)
      }, 800)
    }, 8000)
    return () => clearInterval(interval)
  }, [userQuestion, userAnswer])

  const handleAsk = async () => {
    if (!userQuestion.trim() || isAsking) return

    setIsAsking(true)
    setError('')
    setUserAnswer('')
    setTyping(true)

    try {
      console.log('🚀 Sending question to EconoAI:', userQuestion)
      
      // Small helper with abort timeout to avoid hangs
      const fetchT = async (input: RequestInfo | URL, init?: RequestInit & { timeoutMs?: number }) => {
        const ms = init?.timeoutMs ?? 12000
        const ctrl = new AbortController()
        const id = setTimeout(() => ctrl.abort(), ms)
        try {
          const res = await fetch(input, { ...init, signal: ctrl.signal })
          return res
        } finally {
          clearTimeout(id)
        }
      }

      // Build lightweight context: market snapshot, macro, and top news
      const [marketRes, recessionRes, newsRes] = await Promise.all([
        fetchT('/api/yahoo-unified?category=all&limit=20', { cache:'no-store', timeoutMs: 8000 }).catch(()=>null),
        fetchT('/api/recession-index?limit=60', { cache:'no-store', timeoutMs: 8000 }).catch(()=>null),
        fetchT('/api/news/top?limit=6', { cache:'no-store', timeoutMs: 8000 }).catch(()=>null)
      ])
      const context: any = {}
      try {
        const js = marketRes && marketRes.ok ? await marketRes.json() : null
        if (js?.ok && Array.isArray(js.data)) {
          context.market = {
            summary: js.summary || null,
            sample: js.data.slice(0, 10).map((a: any)=>({ symbol:a.symbol, name:a.name, price:a.price, change:a.changePercent }))
          }
        }
      } catch {}
      try { const rj = recessionRes && recessionRes.ok ? await recessionRes.json() : null; if (rj?.latest) context.macro = { recession: rj.latest, seriesLen: (rj.series||[]).length } } catch {}
      try { const nj = newsRes && newsRes.ok ? await newsRes.json() : null; if (nj?.data) context.news = nj.data } catch {}

      const response = await fetchT('/api/econoai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userQuestion,
          userId: user?.id || 'anonymous',
          context
        }),
        cache: 'no-store',
        timeoutMs: 12000,
      })

      if (!response) {
        // Network-level failure (aborted or unreachable)
        setUserAnswer('Network is busy right now. Quick take: focus on primary trend, major support/resistance, and risk limits. Try again in a few seconds for a full AI answer.')
        setTyping(false)
        return
      }

      console.log('📡 Response status:', response.status)
      
      let data: any = null
      try {
        data = await response.json()
      } catch {}
      console.log('📦 Response data:', data)

      // Accept both normal and fallback answers
      if (data?.answer) {
        setUserAnswer(data.answer)
      } else if (!response.ok) {
        // Friendly fallback when server returns error without answer
        setUserAnswer('Temporary issue retrieving the AI response. Quick framework: assess earnings momentum, breadth, and macro (10Y yield, USD). Re-try for detailed guidance.')
      } else {
        throw new Error('No answer received from AI')
      }
      setTyping(false)
    } catch (err: any) {
      console.error('❌ EconoAI error:', err)
      // Show a soft inline answer instead of only an error banner
      setUserAnswer('Quick guidance while we reconnect: define your time horizon, outline bull/bear scenarios with catalysts, and pick 2–3 levels to manage risk. Try again for the full AI view.')
      setError('')
      setTyping(false)
    } finally {
      setIsAsking(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  const capabilities = [
    {
      icon: ChartBarIcon,
      title: 'Stock Picks & Analysis',
      description: 'AI-powered screening across 5,000+ global equities. Get actionable buy/sell signals with multi-factor scoring, technical setups, and risk-adjusted entries.',
      examples: ['Best breakout stocks today', 'Undervalued tech names', 'High-momentum small caps']
    },
    {
      icon: ArrowTrendingUpIcon,
      title: 'Market Trends & Flows',
      description: 'Real-time tracking of institutional flows, sector rotation, options positioning, and momentum shifts. Identify regime changes before the crowd.',
      examples: ['Smart money flows this week', 'Which sectors are rotating?', 'Unusual options activity']
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Earnings & Fundamentals',
      description: 'Deep-dive into financial statements, earnings quality, valuation multiples, and growth trajectories. Compare peers and spot mispricing.',
      examples: ['AAPL earnings analysis', 'Compare GOOGL vs META', 'Best P/E ratios in tech']
    },
    {
      icon: MagnifyingGlassIcon,
      title: 'Technical Suggestions',
      description: 'Chart pattern recognition, support/resistance levels, momentum indicators, and breakout alerts. Combine fundamentals with technicals for precision timing.',
      examples: ['TSLA key support levels', 'Bullish chart patterns', 'Oversold bounce candidates']
    },
    {
      icon: NewspaperIcon,
      title: 'News & Catalysts',
      description: 'AI-curated headlines with sentiment scoring and impact analysis. Never miss a catalyst—earnings, upgrades, regulatory changes, macro events.',
      examples: ['Latest NVDA news', 'Fed policy impact', 'Sector-moving headlines']
    },
    {
      icon: SparklesIcon,
      title: 'Watchlist & Portfolio Review',
      description: 'Upload your holdings for instant AI critique: risk concentration, diversification gaps, rebalancing suggestions, and correlation analysis.',
      examples: ['Analyze my portfolio', 'Is my allocation optimal?', 'Reduce portfolio risk']
    }
  ]

  const stats = [
    { value: '5,000+', label: 'Stocks Covered' },
    { value: '24/7', label: 'Real-Time Data' },
    { value: '<2s', label: 'Response Time' },
    { value: '95%', label: 'Accuracy Rate' }
  ]

  return (
    <RequirePlan min="premium">
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero with Live Demo */}
      <section className="relative overflow-hidden pt-20 pb-24 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900/0 to-slate-900/0"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
              Your Personal Market Analyst,<br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Powered by AI
              </span>
            </h1>
            
            <p className="text-xl text-white/70">
              Ask anything about stocks, sectors, earnings, technicals, or your portfolio. 
              Get instant, data-backed answers from EconoAI.
            </p>
          </div>

          {/* Live Chat Demo */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl bg-slate-900/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden shadow-2xl">
              {/* Chat Header */}
              <div className="bg-slate-800/50 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">EconoAI Assistant</h3>
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Online • Real-time data
                    </p>
                  </div>
                </div>
                <div className="text-xs text-white/50">Try it now ↓</div>
              </div>

              {/* Chat Messages */}
              <div className="p-6 space-y-4 min-h-[320px] max-h-[400px] overflow-y-auto">
                {/* Welcome message when no conversation started */}
                {!userQuestion && !userAnswer && !error && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                      <SparklesIcon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Ask me anything about markets!</h3>
                    <p className="text-white/60 text-sm max-w-md mx-auto">
                      Get instant AI-powered analysis on stocks, sectors, portfolio strategy, risks, earnings, and more.
                    </p>
                  </div>
                )}

                {/* Show error if any */}
                {error && (
                  <div className="bg-red-900/30 border border-red-500/50 rounded-xl px-4 py-3 flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <p className="text-red-200 font-semibold text-sm mb-1">Error</p>
                      <p className="text-red-300/80 text-sm">{error}</p>
                      <button 
                        onClick={() => {
                          setError('')
                          setIsAsking(false)
                        }}
                        className="text-xs text-red-400 hover:text-red-300 mt-2 underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {/* User Question - Real or Demo */}
                {(userQuestion || (!error && !userAnswer)) && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3">
                      <p className={`text-white text-sm transition-opacity ${typing ? 'opacity-50' : 'opacity-100'}`}>
                        {userQuestion || demoQuestions[currentQuestion]}
                      </p>
                    </div>
                  </div>
                )}

                {/* AI Response - Real or Demo */}
                {!typing && (userAnswer || !userQuestion) && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex-shrink-0 flex items-center justify-center">
                      <SparklesIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-sm bg-slate-800/80 px-4 py-3 ring-1 ring-white/5">
                      <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
                        {userAnswer || demoAnswers[currentQuestion]}
                      </p>
                      {!userAnswer && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                          <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">📊 View Chart</button>
                          <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">📈 Full Analysis</button>
                          <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">💾 Save</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {typing && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex-shrink-0 flex items-center justify-center">
                      <SparklesIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-sm bg-slate-800/80 px-4 py-3 ring-1 ring-white/5">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="bg-slate-800/30 px-6 py-4 border-t border-white/10">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about any stock, sector, or market trend..."
                    className="flex-1 bg-slate-800 text-white placeholder:text-white/40 px-4 py-3 rounded-xl ring-1 ring-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    disabled={isAsking}
                  />
                  <button 
                    onClick={handleAsk}
                    disabled={isAsking || !userQuestion.trim()}
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                    {isAsking ? 'Asking...' : 'Ask'}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-white/50">
                    {isAsking ? '🤔 EconoAI is analyzing...' : '💡 Ask about any market topic • Press Enter to send'}
                  </p>
                  {user && (
                    <p className="text-xs text-green-400">✓ Logged in as {user.email?.split('@')[0]}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-white/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need for smarter investing
            </h2>
            <p className="text-lg text-white/60">
              From screening to portfolio analysis, EconoAI covers your complete research workflow
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((capability, idx) => (
              <div 
                key={capability.title}
                className="group rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-6 ring-1 ring-white/5 hover:ring-white/10 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <capability.icon className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-white text-lg font-semibold mb-2">{capability.title}</h3>
                <p className="text-white/60 text-sm mb-4 leading-relaxed">{capability.description}</p>
                
                <div className="space-y-2">
                  <p className="text-xs text-white/40 font-medium">Try asking:</p>
                  {capability.examples.map((ex) => (
                    <div key={ex} className="text-xs text-blue-400 bg-blue-500/5 px-3 py-1.5 rounded-lg ring-1 ring-blue-500/10">
                      "{ex}"
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA removed per request */}

      <Footer />
    </div>
    </RequirePlan>
  )
}
