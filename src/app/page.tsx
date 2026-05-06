export const dynamic = 'force-dynamic';

import Footer from '@/components/Footer';
import AIBackground from '@/components/AIBackground';
import FearGreedIndex from '@/components/FearGreedIndex';
import { ChartBarIcon, CpuChipIcon, GlobeAltIcon, BoltIcon, ShieldCheckIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import SafeBoundary from '@/components/SafeBoundary';
import { NavigationLink } from '@/components/Navigation';

export default function HomePage() {

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* ───── HERO ───── */}
      <div className="relative overflow-hidden">
        <SafeBoundary>
          <AIBackground intensity="subtle" />
        </SafeBoundary>

        {/* Hero photo backdrop (right side, fades into the dark UI) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: "url('/hero-bg.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.85,
            maskImage:
              'linear-gradient(to right, transparent 0%, transparent 28%, rgba(0,0,0,0.6) 50%, #000 70%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, transparent 28%, rgba(0,0,0,0.6) 50%, #000 70%)',
          }}
        />
        {/* Left-side darkening for text readability — only covers the text column */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-[#05070d] via-[#05070d]/70 to-transparent"
          style={{
            maskImage: 'linear-gradient(to right, #000 0%, #000 45%, transparent 70%)',
            WebkitMaskImage: 'linear-gradient(to right, #000 0%, #000 45%, transparent 70%)',
          }}
        />
        {/* Subtle bottom fade into page */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 z-0 bg-gradient-to-b from-transparent to-[#05070d]"
        />
        {/* Brand color wash, gentler than before */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 mix-blend-overlay opacity-30 bg-gradient-to-tr from-blue-600/30 via-transparent to-emerald-500/20"
        />

        {/* Decorative gradient orbs */}
        <div className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 right-0 w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-[100px]" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="relative z-10 pb-10 sm:pb-20 md:pb-24 lg:max-w-3xl lg:w-full lg:pb-32 xl:pb-40">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-14 sm:px-6 md:mt-16 lg:mt-24 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold sm:text-5xl md:text-6xl lg:text-7xl leading-[1.08]">
                  <span className="block ai-gradient-text ai-float ai-delay-100">Actionable Market</span>
                  <span className="block ai-gradient-text ai-float ai-delay-300">Intelligence Layer</span>
                </h1>
                <p className="mt-5 text-base md:text-lg text-white/70 sm:max-w-xl sm:mx-auto lg:mx-0 lg:max-w-xl ai-fade-up ai-delay-400 leading-relaxed">
                  Thousands of raw macro, options, sector and cross‑asset signals compressed into a distilled <span className="text-white font-semibold">risk & opportunity map</span>. Built for speed, clarity and institutional discipline.
                </p>

                {/* Trust badges row */}
                <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-white/40 ai-fade-up ai-delay-600">
                  <span className="flex items-center gap-1.5"><ShieldCheckIcon className="h-4 w-4 text-emerald-400/70" /> Bank‑grade encryption</span>
                  <span className="flex items-center gap-1.5"><BoltIcon className="h-4 w-4 text-yellow-400/70" /> &lt;1.2s AI response</span>
                  <span className="flex items-center gap-1.5"><ArrowTrendingUpIcon className="h-4 w-4 text-blue-400/70" /> 600+ live assets</span>
                </div>

                {/* Fear & Greed Index — inline under hero text (left column) */}
                <div className="mt-10 ai-fade-up ai-delay-600">
                  <div className="inline-flex items-stretch gap-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 shadow-2xl shadow-black/40 backdrop-blur-md overflow-hidden">
                    <div className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] shrink-0">
                      <SafeBoundary fallback={<div className="flex items-center justify-center h-full w-full text-[10px] text-white/40">Widget unavailable</div>}>
                        <FearGreedIndex />
                      </SafeBoundary>
                    </div>
                    <div className="hidden sm:flex flex-col justify-center px-5 py-4 max-w-[220px] border-l border-white/5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-semibold mb-1">Live Sentiment</p>
                      <p className="text-sm text-white/80 leading-snug">EconopulseAi Fear &amp; Greed</p>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* ───── FEATURES GRID ───── */}
      <div className="relative py-20 sm:py-28">
        {/* Subtle background gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--color-backdrop)] via-[var(--background)] to-[var(--background)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-blue-400 mb-3">Platform Pillars</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Engineered for <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Institutional Clarity</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-white/50 text-base lg:text-lg">Every feature is built to eliminate noise and surface only what matters for your next decision.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Macro Risk Radar', desc: 'Real‑time regime detection & recession probability' },
              { title: 'Options Flow Engine', desc: 'Put/Call, Gamma exposure & unusual activity' },
              { title: 'Sector Momentum Map', desc: 'Multi‑timeframe rotation & relative strength' },
              { title: 'AI Economic Lens', desc: 'Cycle projection, factor analysis & forecasting' },
              { title: 'Portfolio Diagnostics', desc: 'Allocation analysis & dynamic risk bands' },
              { title: 'Global Market Matrix', desc: 'Cross‑country inflation, growth & FX' },
              { title: 'ETF Spread Analyzer', desc: 'Relative performance & vol comparisons' },
              { title: 'Adaptive Watchlist', desc: 'Live fundamentals, trends & alerts' },
            ].map((f) => (
              <div key={f.title} className="group relative p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-blue-500/30 transition-all duration-300">
                <h3 className="text-sm font-bold text-white mb-1.5">{f.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{f.desc}</p>
                {/* Hover glow */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-500/5 to-emerald-500/5" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───── THREE PILLARS ───── */}
      <div className="relative py-20 border-t border-[var(--color-border)]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { Icon: ChartBarIcon, color: 'blue', title: 'Real‑Time Dashboard', desc: 'Unified multi‑asset market pulse with sentiment, risk & structural signals – updated every cycle.' },
              { Icon: CpuChipIcon, color: 'indigo', title: 'AI Portfolio Builder', desc: 'Construct resilient allocations with scenario‑aware optimization, risk bands & factor tilts.' },
              { Icon: GlobeAltIcon, color: 'emerald', title: 'Market Analysis', desc: 'Sector momentum, macro regime detection, options flow & ETF relative strength in one view.' },
            ].map(({ Icon, color, title, desc }) => (
              <div key={title} className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-8 hover:border-white/10 transition-all duration-300">
                <div className={`inline-flex items-center justify-center h-12 w-12 rounded-xl bg-${color}-600/20 text-${color}-400 mb-5 ring-1 ring-${color}-500/20`}>
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
                <div className={`pointer-events-none absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-${color}-500/5 blur-2xl transition-opacity duration-500 opacity-0 group-hover:opacity-100`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───── STATS + CTA ───── */}
      <section className="relative py-24 border-t border-[var(--color-border)]/50">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-blue-600/[0.03] to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-semibold tracking-[0.25em] uppercase text-emerald-400 mb-3">Why EconoPulse</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-6">Precision Over Noise</h2>
              <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-xl">
                We compress thousands of raw data points — macro spreads, sector momentum, options positioning, cross‑asset ratios — into a clean decision layer you can act on instantly.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: 'Macro Coverage', value: '40+', sub: 'indicators' },
                { label: 'Options Metrics', value: 'Gamma • P/C • Skew', sub: '' },
                { label: 'Sector Frames', value: '6×', sub: 'timeframes' },
                { label: 'AI Response', value: '<1.2s', sub: 'average' },
              ].map((s) => (
                <div key={s.label} className="group p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all duration-300">
                  <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">
                    {s.value}
                    {s.sub && <span className="text-sm font-normal text-white/40 ml-1.5">{s.sub}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── FINAL CTA ───── */}
      <section className="relative py-20 border-t border-[var(--color-border)]/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">Ready to start?</h2>
          <p className="text-white/60 text-base sm:text-lg mb-8 max-w-2xl mx-auto">Access the live dashboard or begin your free trial in seconds.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <NavigationLink
              href="/dashboard"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold shadow-lg shadow-blue-600/25 transition-all duration-200 hover:shadow-blue-500/40 hover:-translate-y-0.5"
            >
              View Live Dashboard
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </NavigationLink>
            <NavigationLink
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5"
            >
              Start Free Trial
            </NavigationLink>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
