"use client";
import SafeBoundary from '@/components/SafeBoundary';
import AIBackground from '@/components/AIBackground';
import AIPromptBar from '@/components/AIPromptBar';
import FearGreedIndex from '@/components/FearGreedIndex';
import MarketMovers from '@/components/MarketMovers';
import AISignalsWidget from '@/components/AISignalsWidget';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] relative">
      <SafeBoundary fallback={<div className="absolute inset-0" />}> 
        <AIBackground intensity="subtle" />
      </SafeBoundary>

      {/* Hero + Prompt */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pt-10 pb-6 sm:pt-16 sm:pb-10">
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">EconoPulse</h1>
          <p className="mt-3 text-sm sm:text-base text-white/70 max-w-2xl mx-auto">
            Real-time market insights and AI portfolio tools. Ask the AI or jump to analytics.
          </p>
          <SafeBoundary fallback={<div className="mt-4 text-white/60 text-sm">Prompt unavailable</div>}> 
            <div className="max-w-2xl mx-auto">
              <AIPromptBar />
            </div>
          </SafeBoundary>
        </div>
      </section>

      {/* Widgets Row */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SafeBoundary fallback={<div className="h-64 rounded-lg border border-white/10" />}> 
            <div className="col-span-1 lg:col-span-1 rounded-xl border border-white/10 bg-slate-900/50 overflow-hidden">
              <div className="p-3 border-b border-white/10 text-xs text-white/70">Fear & Greed</div>
              <div className="h-64">
                <FearGreedIndex />
              </div>
            </div>
          </SafeBoundary>
          <SafeBoundary fallback={<div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 min-h-64 text-white/60">Movers unavailable</div>}> 
            <div className="rounded-xl border border-white/10 bg-slate-900/50 overflow-hidden">
              <div className="p-3 border-b border-white/10 text-xs text-white/70">Market Movers</div>
              <MarketMovers />
            </div>
          </SafeBoundary>
          <SafeBoundary fallback={<div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 min-h-64 text-white/60">AI Signals unavailable</div>}>
            <div className="rounded-xl border border-white/10 bg-slate-900/50 overflow-hidden">
              <div className="p-3 border-b border-white/10 text-xs text-white/70">AI Signals</div>
              <div className="min-h-64">
                <AISignalsWidget />
              </div>
            </div>
          </SafeBoundary>
        </div>
      </section>

      {/* Footer */}
      <SafeBoundary>
        <Footer />
      </SafeBoundary>
    </div>
  );
}
