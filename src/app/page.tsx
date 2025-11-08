export const dynamic = 'force-dynamic';

import SafeBoundary from '@/components/SafeBoundary';
import nextDynamic from 'next/dynamic';
// Lazy heavy visuals & widgets like original rich homepage
const AIBackground = nextDynamic(() => import('@/components/AIBackground'), { ssr: false });
const FearGreedIndex = nextDynamic(() => import('@/components/FearGreedIndex'), { ssr: false });
const Footer = nextDynamic(() => import('@/components/Footer'), { ssr: false });

// Original rich marketing homepage (features + use cases) restored in simplified static English
// Removed i18n hooks and locale prefetch logic; keeping core structure.

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Hero Section (restored rich layout) */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <SafeBoundary fallback={<div className="absolute inset-0" />}> 
            <AIBackground intensity="subtle" />
          </SafeBoundary>
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="relative pb-10 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-24 xl:pb-28">
            <main className="mt-6 mx-auto max-w-7xl px-3 sm:mt-8 sm:px-6 md:mt-12 lg:mt-16 lg:px-8 xl:mt-20">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-3xl tracking-tight font-extrabold sm:text-4xl md:text-5xl lg:text-6xl">
                  <span className="block xl:inline ai-gradient-text ai-float ai-delay-100">Where Markets Meet</span>{' '}
                  <span className="block xl:inline ai-gradient-text ai-float ai-delay-300">Artificial Intelligence</span>
                </h1>
                <p className="mt-3 text-sm text-white/80 sm:mt-4 sm:text-base md:text-lg sm:max-w-xl sm:mx-auto md:mt-5 lg:mx-0 lg:max-w-lg xl:max-w-xl ai-fade-up ai-delay-400">
                  Experience the future of financial analysis. Our AI anticipates market movements and transforms complex patterns into clear investment strategies.
                </p>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-48 w-full bg-[var(--color-panel)] sm:h-64 md:h-80 lg:w-full lg:h-full border border-[var(--color-border)]">
            <SafeBoundary fallback={<div className="h-full w-full flex items-center justify-center text-[10px] text-white/40">Loading…</div>}>
              <FearGreedIndex />
            </SafeBoundary>
          </div>
        </div>
      </div>

      {/* Features Section (static English) */}
      <div id="features" className="py-8 sm:py-12 bg-[var(--color-panel)]/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-sm sm:text-base text-blue-400 font-semibold tracking-wide uppercase">Platform Pillars</h2>
            <p className="mt-2 text-2xl leading-7 font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">Clarity. Speed. Foresight.</p>
          </div>
          <div className="mt-6 sm:mt-10">
            <dl className="space-y-8 sm:space-y-10 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-6 lg:gap-x-8 md:gap-y-8 lg:gap-y-10">
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">📊</div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">Unified Dashboard</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-white/70">Macro, momentum and sentiment fused into one perspective.</dd>
              </div>
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">🤖</div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">AI Portfolio Engine</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-white/70">Scenario construction, diversification and stress heuristics.</dd>
              </div>
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">🌐</div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">Global Market Lens</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-white/70">Cross‑asset structure and capital flow early warnings.</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Use Cases (static English) */}
      <div className="bg-[var(--color-panel)]/70 backdrop-blur-sm py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-white mb-4">What You Can Do with EconoPulse</h3>
            <p className="text-white/70 text-lg">Real-world applications to supercharge your investment decisions</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'Market Timing', color: 'blue', blurb: 'Enter and exit with composite sentiment & structural momentum.' },
              { title: 'Portfolio Balance', color: 'green', blurb: 'Track allocation drift and concentration risk instantly.' },
              { title: 'Trend Spotting', color: 'purple', blurb: 'Surface emerging sectors before they become consensus.' },
              { title: 'Smart Insights', color: 'orange', blurb: 'Receive AI‑filtered context without data overload.' },
              { title: 'Global Insights', color: 'cyan', blurb: 'Monitor cross‑market signals affecting global positioning.' },
              { title: 'Performance Tracking', color: 'pink', blurb: 'Benchmark vs structural indices and adaptive regimes.' }
            ].map((c, i) => (
              <div key={c.title} className={`bg-[var(--color-panel)]/90 backdrop-blur-md rounded-lg p-6 border border-[var(--color-border)] hover:border-${c.color}-500/50 transition-all duration-300`}>
                <div className="flex items-center mb-4">
                  <div className={`h-10 w-10 bg-${c.color}-600 rounded-lg flex items-center justify-center mr-3 text-white text-sm font-semibold`}>{i+1}</div>
                  <h4 className="text-lg font-semibold text-white">{c.title}</h4>
                </div>
                <p className="text-white/70 text-sm mb-2">{c.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Value Proposition / Metrics */}
      <section className="bg-[var(--color-panel)]/70 backdrop-blur-sm py-24 border-t border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-6">Built for Focused Investors</h2>
              <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-xl">Stop drowning in noise. EconoPulse distills macro, sentiment and price structure into actionable signals so you can concentrate on execution—not data hunting.</p>
              <ul className="space-y-4 text-white/80 mb-10">
                <li className="flex items-start"><span className="w-6 h-6 mr-3 rounded-md bg-blue-600 flex items-center justify-center text-xs font-bold">1</span>AI‑curated market narrative updated daily</li>
                <li className="flex items-start"><span className="w-6 h-6 mr-3 rounded-md bg-green-600 flex items-center justify-center text-xs font-bold">2</span>Structural momentum & sentiment composite indicators</li>
                <li className="flex items-start"><span className="w-6 h-6 mr-3 rounded-md bg-purple-600 flex items-center justify-center text-xs font-bold">3</span>Portfolio stress & concentration heat analysis</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="/pricing" className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg transition">See Plans</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: 'Signal Accuracy (internal backtest)', value: '72%', note: '6m' },
                { label: 'Macro Data Points Unified', value: '+180' },
                { label: 'AI Portfolio Scenarios', value: '940+' },
                { label: 'Latency (median refresh)', value: '<1.2s' }
              ].map(m => (
                <div key={m.label} className="p-6 rounded-xl bg-[var(--color-panel)]/80 border border-[var(--color-border)]">
                  <p className="text-sm text-white/60 mb-2">{m.label}</p>
                  <p className="text-3xl font-bold text-white">{m.value}{m.note && <span className="text-sm font-normal text-white/50 ml-1">{m.note}</span>}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <SafeBoundary fallback={<div className="text-center py-8 text-white/40 text-xs">Loading footer…</div>}>
        <Footer />
      </SafeBoundary>
    </div>
  );
}
