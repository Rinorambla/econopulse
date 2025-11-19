export const dynamic = 'force-dynamic';

import Footer from '@/components/Footer';
import AIBackground from '@/components/AIBackground';
import FearGreedIndex from '@/components/FearGreedIndex';
import { ChartBarIcon, CpuChipIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import SafeBoundary from '@/components/SafeBoundary';
import { NavigationLink } from '@/components/Navigation';

export default function HomePage() {

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="relative overflow-hidden">
        <SafeBoundary>
          <AIBackground intensity="subtle" />
        </SafeBoundary>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-6 mx-auto max-w-7xl px-3 sm:mt-8 sm:px-6 md:mt-12 lg:mt-16 lg:px-8 xl:mt-20">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-3xl tracking-tight font-extrabold sm:text-5xl lg:text-6xl">
                  <span className="block xl:inline ai-gradient-text ai-float ai-delay-100">Actionable Market</span>{' '}
                  <span className="block xl:inline ai-gradient-text ai-float ai-delay-300">Intelligence Layer</span>
                </h1>
                <p className="mt-4 text-base md:text-lg text-white/80 sm:max-w-xl sm:mx-auto lg:mx-0 lg:max-w-xl ai-fade-up ai-delay-400 leading-relaxed">
                  One platform compressing thousands of raw macro, options, sector and cross‑asset signals into a distilled <span className="text-white font-semibold">risk & opportunity map</span>. Built for speed, clarity and institutional discipline – not noise.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 text-xs sm:text-sm ai-fade-up ai-delay-500">
                  {[
                    ['Macro Risk Radar','Realtime regime + recession risk'],
                    ['Options Flow Engine','Put/Call, Gamma, Unusual flow'],
                    ['Sector Momentum Map','Multi-timeframe performance'],
                    ['AI Economic Lens','Cycle projection & factors'],
                    ['Portfolio Diagnostics','Allocation & risk bands'],
                    ['Global Market Matrix','Countries vs inflation & growth'],
                    ['ETF Spread Analyzer','Relative performance & volatility'],
                    ['Adaptive Watchlist','Live fundamentals & trends']
                  ].map(([title,desc]) => (
                    <div key={title} className="flex items-start gap-2 bg-white/5 rounded-lg p-3 border border-white/10 hover:border-blue-500/40 transition-colors">
                      <div className="w-2 h-2 mt-1 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400" />
                      <div>
                        <p className="font-semibold text-white leading-tight">{title}</p>
                        <p className="text-[11px] text-white/60 leading-snug">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-4 ai-fade-up ai-delay-600">
                  <NavigationLink
                    href="/dashboard"
                    className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg transition"
                  >
                    View Live Dashboard
                  </NavigationLink>
                  <NavigationLink
                    href="/pricing"
                    className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg transition"
                  >
                    Start Free Trial
                  </NavigationLink>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-48 w-full bg-[var(--color-panel)] sm:h-64 md:h-80 lg:w-full lg:h-full border border-[var(--color-border)]">
            <SafeBoundary fallback={<div className="flex items-center justify-center h-full w-full text-[10px] text-white/40">Widget unavailable</div>}>
              <FearGreedIndex />
            </SafeBoundary>
          </div>
        </div>
      </div>

  {/* Indices widget removed per request */}
  {/* Scrolling ticker ribbon removed per request */}

  <div id="features" className="py-8 sm:py-12 bg-[var(--color-panel)]/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-sm sm:text-base text-blue-400 font-semibold tracking-wide uppercase">Platform Pillars</h2>
            <p className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">Engineered for Institutional Clarity</p>
          </div>

          <div className="mt-6 sm:mt-10">
            <dl className="space-y-8 sm:space-y-10 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-6 lg:gap-x-8 md:gap-y-8 lg:gap-y-10">
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                    <ChartBarIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">Real-Time Dashboard</p>
                </dt>
                <dd className="mt-2 ml-16 text-sm text-white/70">Unified multi-asset market pulse with sentiment, risk & structural signals.</dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                    <CpuChipIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">AI Portfolio Builder</p>
                </dt>
                <dd className="mt-2 ml-16 text-sm text-white/70">Construct resilient allocations with scenario-aware optimization & risk bands.</dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                    <GlobeAltIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">Market Analysis</p>
                </dt>
                <dd className="mt-2 ml-16 text-sm text-white/70">Sector momentum, macro regime detection, options flow & ETF relative strength.</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <section className="bg-[var(--color-panel)]/70 backdrop-blur-sm py-24 border-t border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-6">Precision Over Noise</h2>
              <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-xl">We compress thousands of raw data points (macro spreads, sector momentum, options positioning, global cross-asset ratios) into a clean decision layer you can act on instantly.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <NavigationLink
                  href="/pricing"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg transition"
                >
                  See Plans
                </NavigationLink>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 rounded-xl bg-[var(--color-panel)]/80 border border-[var(--color-border)]">
                <p className="text-sm text-white/60 mb-2">Macro Coverage</p>
                <p className="text-3xl font-bold text-white">40+<span className="text-sm font-normal text-white/50 ml-1">indicators</span></p>
              </div>
              <div className="p-6 rounded-xl bg-[var(--color-panel)]/80 border border-[var(--color-border)]">
                <p className="text-sm text-white/60 mb-2">Options Metrics</p>
                <p className="text-3xl font-bold text-white">Gamma • P/C • Skew</p>
              </div>
              <div className="p-6 rounded-xl bg-[var(--color-panel)]/80 border border-[var(--color-border)]">
                <p className="text-sm text-white/60 mb-2">Sector Frames</p>
                <p className="text-3xl font-bold text-white">6× TF</p>
              </div>
              <div className="p-6 rounded-xl bg-[var(--color-panel)]/80 border border-[var(--color-border)]">
                <p className="text-sm text-white/60 mb-2">AI Response</p>
                <p className="text-3xl font-bold text-white">&lt;1.2s</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
