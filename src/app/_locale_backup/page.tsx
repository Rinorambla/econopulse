"use client";
import { useTranslations, useLocale } from 'next-intl';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChartBarIcon, CpuChipIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
const Footer = dynamic(() => import('@/components/Footer'), {
  loading: () => <div className="text-center py-8 text-white/40 text-xs">Loading footer…</div>,
  ssr: false
});

// Lazy heavy visuals
const AIBackground = dynamic(() => import('@/components/AIBackground'), { ssr: false });
const FearGreedIndex = dynamic(() => import('@/components/FearGreedIndex'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full w-full text-[10px] text-white/40">Loading…</div>
});

export default function HomePage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  // Prefetch critical authenticated pages after idle
  useEffect(() => {
    const id = setTimeout(() => {
      ['/dashboard','/ai-portfolio','/ai-pulse','/pricing'].forEach(p=>{
        try { router.prefetch(`/${locale}${p}`);} catch {}
      });
    }, 500);
    return () => clearTimeout(id);
  }, [router, locale]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Navigation is injected globally by [locale]/layout.tsx */}

      {/* Hero Section */}
      <div className="relative overflow-hidden">
  <AIBackground intensity="subtle" />

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
              </div>
            </main>
          </div>
        </div>
  <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-48 w-full bg-[var(--color-panel)] sm:h-64 md:h-80 lg:w-full lg:h-full border border-[var(--color-border)]">
            <FearGreedIndex />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-8 sm:py-12 bg-[var(--color-panel)]/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-sm sm:text-base text-blue-400 font-semibold tracking-wide uppercase">
              {t('features.title')}
            </h2>
            <p className="mt-2 text-2xl leading-7 font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {t('features.subtitle')}
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
                    {t('features.dashboard.title')}
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-white/70">
                  {t('features.dashboard.description')}
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                    <CpuChipIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">
                    {t('features.ai_portfolio.title')}
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-white/70">
                  {t('features.ai_portfolio.description')}
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                    <GlobeAltIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">
                    {t('features.market_analysis.title')}
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-white/70">
                  {t('features.market_analysis.description')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="bg-[var(--color-panel)]/70 backdrop-blur-sm py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-white mb-4">
              What You Can Do with EconoPulse
            </h3>
            <p className="text-white/70 text-lg">
              Real-world applications to supercharge your investment decisions
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Use Case 1 */}
            <div className="bg-[var(--color-panel)]/90 backdrop-blur-md rounded-lg p-6 border border-[var(--color-border)] hover:border-blue-500/50 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white">Market Timing</h4>
              </div>
              <p className="text-white/70 text-sm mb-3">
                Know when to enter or exit positions with our Fear & Greed Index and sentiment analysis
              </p>
              <div className="text-blue-400 text-xs">
                → Avoid buying at market peaks
              </div>
            </div>

            {/* Use Case 2 */}
            <div className="bg-[var(--color-panel)]/90 backdrop-blur-md rounded-lg p-6 border border-[var(--color-border)] hover:border-green-500/50 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white">Portfolio Balance</h4>
              </div>
              <p className="text-white/70 text-sm mb-3">
                Track your asset allocation across different sectors and geographies in real-time
              </p>
              <div className="text-green-400 text-xs">
                → Optimize risk-return ratio
              </div>
            </div>

            {/* Use Case 3 */}
            <div className="bg-[var(--color-panel)]/90 backdrop-blur-md rounded-lg p-6 border border-[var(--color-border)] hover:border-purple-500/50 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 7H4l5-5v5zm0 0L4 12m5-5l5 5" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white">Trend Spotting</h4>
              </div>
              <p className="text-white/70 text-sm mb-3">
                Identify emerging opportunities before they become mainstream with AI pattern recognition
              </p>
              <div className="text-purple-400 text-xs">
                → Get ahead of the curve
              </div>
            </div>

            {/* Use Case 4 */}
            <div className="bg-[var(--color-panel)]/90 backdrop-blur-md rounded-lg p-6 border border-[var(--color-border)] hover:border-orange-500/50 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-orange-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white">Smart Insights</h4>
              </div>
              <p className="text-white/70 text-sm mb-3">
                Get personalized investment recommendations based on your portfolio and market conditions
              </p>
              <div className="text-orange-400 text-xs">
                → Make informed decisions
              </div>
            </div>

            {/* Use Case 5 */}
            <div className="bg-[var(--color-panel)]/90 backdrop-blur-md rounded-lg p-6 border border-[var(--color-border)] hover:border-cyan-500/50 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-cyan-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white">Global Insights</h4>
              </div>
              <p className="text-white/70 text-sm mb-3">
                Monitor international markets and currency movements that affect your investments
              </p>
              <div className="text-cyan-400 text-xs">
                → Think globally, invest smartly
              </div>
            </div>

            {/* Use Case 6 */}
            <div className="bg-[var(--color-panel)]/90 backdrop-blur-md rounded-lg p-6 border border-[var(--color-border)] hover:border-pink-500/50 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-pink-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white">Performance Tracking</h4>
              </div>
              <p className="text-white/70 text-sm mb-3">
                Compare your portfolio performance against benchmarks and optimize your strategy
              </p>
              <div className="text-pink-400 text-xs">
                → Measure what matters
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Value Proposition / Social Proof Section (replaces old CTA) */}
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
              <ul className="space-y-4 text-white/80 mb-10">
                <li className="flex items-start">
                  <span className="w-6 h-6 mr-3 rounded-md bg-blue-600 flex items-center justify-center text-xs font-bold">1</span>
                  AI-curated market narrative updated daily
                </li>
                <li className="flex items-start">
                  <span className="w-6 h-6 mr-3 rounded-md bg-green-600 flex items-center justify-center text-xs font-bold">2</span>
                  Structural momentum & sentiment composite indicators
                </li>
                <li className="flex items-start">
                  <span className="w-6 h-6 mr-3 rounded-md bg-purple-600 flex items-center justify-center text-xs font-bold">3</span>
                  Portfolio stress & concentration heat analysis
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-4">
                <NavigationLink
                  href="/pricing"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg transition"
                >
                  See Plans
                </NavigationLink>
              </div>
              {/* Audience tagline removed per request */}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 rounded-xl bg-[var(--color-panel)]/80 border border-[var(--color-border)]">
                <p className="text-sm text-white/60 mb-2">Signal Accuracy (internal backtest)</p>
                <p className="text-3xl font-bold text-white">72%<span className="text-sm font-normal text-white/50 ml-1">6m</span></p>
              </div>
              <div className="p-6 rounded-xl bg-[var(--color-panel)]/80 border border-[var(--color-border)]">
                <p className="text-sm text-white/60 mb-2">Macro Data Points Unified</p>
                <p className="text-3xl font-bold text-white">+180</p>
              </div>
              <div className="p-6 rounded-xl bg-[var(--color-panel)]/80 border border-[var(--color-border)]">
                <p className="text-sm text-white/60 mb-2">AI Portfolio Scenarios</p>
                <p className="text-3xl font-bold text-white">940+</p>
              </div>
              <div className="p-6 rounded-xl bg-[var(--color-panel)]/80 border border-[var(--color-border)]">
                <p className="text-sm text-white/60 mb-2">Latency (median refresh)</p>
                <p className="text-3xl font-bold text-white">&lt;1.2s</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
