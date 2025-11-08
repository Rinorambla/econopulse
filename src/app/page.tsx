export const dynamic = 'force-dynamic';

import SafeBoundary from '@/components/SafeBoundary';
import AIBackground from '@/components/AIBackground';
import FearGreedIndex from '@/components/FearGreedIndex';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] relative">
      <SafeBoundary fallback={<div className="absolute inset-0" />}> 
        <AIBackground intensity="subtle" />
      </SafeBoundary>

      {/* Hero (English-only) */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 pt-10 pb-10 sm:pt-16 sm:pb-14">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent">
            AI market intelligence you can feel
          </h1>
          <p className="mt-5 text-base sm:text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            EconoPulse distills the mood of the market into a single, intuitive signal. Explore the
            Fear & Greed Index below and sense when momentum turns—without noise, hype, or clutter.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <a href="/dashboard" className="group relative bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-5 py-3 rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-blue-700/30 hover:scale-[1.02] active:scale-95">
              <span className="relative z-10">Open the Dashboard</span>
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </a>
            <a href="/pricing" className="text-white/80 hover:text-white px-4 py-3 rounded-xl text-sm sm:text-base font-semibold border border-white/15 hover:border-white/30 transition-colors">
              Pricing
            </a>
          </div>
        </div>
      </section>

      {/* Fear & Greed only */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-14">
        <SafeBoundary fallback={<div className="h-72 rounded-xl border border-white/10 bg-slate-900/40" />}> 
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden backdrop-blur-sm">
            <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="text-sm sm:text-base font-semibold text-white/80">Fear & Greed Index</div>
              <span className="text-xs text-white/50">updated in real time</span>
            </div>
            <div className="h-[320px] sm:h-[380px]">
              <FearGreedIndex />
            </div>
          </div>
        </SafeBoundary>
      </section>

      {/* Footer */}
      <SafeBoundary>
        <Footer />
      </SafeBoundary>
    </div>
  );
}
