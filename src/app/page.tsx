export const dynamic = 'force-dynamic';

import Footer from '@/components/Footer';
import AIBackground from '@/components/AIBackground';
import NeuralTickerRibbon from '@/components/NeuralTickerRibbon';
import AIPromptBar from '@/components/AIPromptBar';
import PremarketIndexes from '@/components/PremarketIndexes';
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
                <h1 className="text-3xl tracking-tight font-extrabold sm:text-4xl md:text-5xl lg:text-6xl">
                  <span className="block xl:inline ai-gradient-text ai-float ai-delay-100">Where Markets Meet</span>{' '}
                  <span className="block xl:inline ai-gradient-text ai-float ai-delay-300">Artificial Intelligence</span>
                </h1>
                <p className="mt-3 text-sm text-white/80 sm:mt-4 sm:text-base md:text-lg sm:max-w-xl sm:mx-auto md:mt-5 lg:mx-0 lg:max-w-lg xl:max-w-xl ai-fade-up ai-delay-400">
                  Experience the future of financial analysis. Our AI anticipates market movements and transforms complex patterns into clear investment strategies.
                </p>
                <AIPromptBar />
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

  <SafeBoundary fallback={<div className="bg-[var(--color-panel)]/70 backdrop-blur-sm border-y border-[var(--color-border)] text-center text-xs text-white/40 py-2">Premarket unavailable</div>}>
    <PremarketIndexes />
  </SafeBoundary>
  <SafeBoundary>
    <NeuralTickerRibbon />
  </SafeBoundary>

  <div id="features" className="py-8 sm:py-12 bg-[var(--color-panel)]/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-sm sm:text-base text-blue-400 font-semibold tracking-wide uppercase">
              Features
            </h2>
            <p className="mt-2 text-2xl leading-7 font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Everything you need for market analysis
            </p>
          </div>

          <div className="mt-6 sm:mt-10">
            <dl className="space-y-8 sm:space-y-10 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-6 lg:gap-x-8 md:gap-y-8 lg:gap-y-10">
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                    <ChartBarIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">
                    Real-Time Dashboard
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-white/70">
                  Monitor markets in real-time with comprehensive analytics and AI-powered insights.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                    <CpuChipIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">
                    AI Portfolio Builder
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-white/70">
                  Generate optimized portfolios using advanced machine learning algorithms.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                    <GlobeAltIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">
                    Market Analysis
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-white/70">
                  Deep dive into market trends with professional-grade analytical tools.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <section className="bg-[var(--color-panel)]/70 backdrop-blur-sm py-24 border-t border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-6">
                Built for Focused Investors
              </h2>
              <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-xl">
                Stop drowning in noise. EconoPulse distills macro, sentiment and price structure into actionable signals so you can concentrate on execution—not data hunting.
              </p>
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
                <p className="text-sm text-white/60 mb-2">Signal Accuracy</p>
                <p className="text-3xl font-bold text-white">72%<span className="text-sm font-normal text-white/50 ml-1">6m</span></p>
              </div>
              <div className="p-6 rounded-xl bg-[var(--color-panel)]/80 border border-[var(--color-border)]">
                <p className="text-sm text-white/60 mb-2">Data Points</p>
                <p className="text-3xl font-bold text-white">+180</p>
              </div>
              <div className="p-6 rounded-xl bg-[var(--color-panel)]/80 border border-[var(--color-border)]">
                <p className="text-sm text-white/60 mb-2">AI Scenarios</p>
                <p className="text-3xl font-bold text-white">940+</p>
              </div>
              <div className="p-6 rounded-xl bg-[var(--color-panel)]/80 border border-[var(--color-border)]">
                <p className="text-sm text-white/60 mb-2">Latency</p>
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
