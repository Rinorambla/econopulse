'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowRightIcon, ChartBarIcon, CpuChipIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { Navigation, NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';
import FearGreedIndex from '@/components/FearGreedIndex';

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Navigation className="flex items-center justify-between w-full" />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">{t('hero.title')}</span>{' '}
                  <span className="block text-blue-400 xl:inline">{t('hero.subtitle')}</span>
                </h1>
                <p className="mt-3 text-base text-gray-300 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  {t('hero.description')}
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <NavigationLink
                      href="/pricing"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                    >
                      {t('hero.cta_primary')}
                      <ArrowRightIcon className="ml-2 h-5 w-5" />
                    </NavigationLink>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <NavigationLink
                      href="/dashboard"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                    >
                      {t('hero.cta_secondary')}
                    </NavigationLink>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full bg-gradient-to-r from-slate-800 to-slate-900 sm:h-72 md:h-96 lg:w-full lg:h-full border border-blue-500/20">
            {/* AI-Powered Fear & Greed Index */}
            <FearGreedIndex />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-12 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-400 font-semibold tracking-wide uppercase">
              {t('features.title')}
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-white sm:text-4xl">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="mt-10">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                    <ChartBarIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-white">
                    {t('features.dashboard.title')}
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-300">
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
                <dd className="mt-2 ml-16 text-base text-gray-300">
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
                <dd className="mt-2 ml-16 text-base text-gray-300">
                  {t('features.market_analysis.description')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="bg-white/10 backdrop-blur-sm py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="sm:text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              {t('pricing.title')}
            </h2>
            <p className="mt-4 text-lg text-gray-300">
              {t('pricing.subtitle')}
            </p>
          </div>
          <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
            {/* Pro Plan */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg divide-y divide-gray-200">
              <div className="p-6">
                <h2 className="text-lg leading-6 font-medium text-white">
                  {t('pricing.pro.name')}
                </h2>
                <p className="mt-4 text-sm text-gray-300">
                  Perfect for individual investors
                </p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-white">
                    {t('pricing.pro.price')}
                  </span>
                  <span className="text-base font-medium text-gray-300">
                    /{t('pricing.pro.period')}
                  </span>
                </p>
                <NavigationLink
                  href="/subscribe/pro"
                  className="mt-8 block w-full bg-blue-600 border border-blue-600 rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-blue-700"
                >
                  Start Free Trial
                </NavigationLink>
              </div>
              <div className="pt-6 pb-8 px-6">
                <h3 className="text-xs font-medium text-gray-300 tracking-wide uppercase">
                  What's included
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {t.raw('pricing.pro.features').map((feature: string, index: number) => (
                    <li key={index} className="flex space-x-3">
                      <svg className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Premium Plan */}
            <div className="bg-blue-600/20 backdrop-blur-md rounded-lg shadow-lg divide-y divide-gray-200 border-2 border-blue-500">
              <div className="p-6">
                <h2 className="text-lg leading-6 font-medium text-white">
                  {t('pricing.premium.name')}
                </h2>
                <p className="mt-4 text-sm text-gray-300">
                  AI-powered insights and analysis
                </p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-white">
                    {t('pricing.premium.price')}
                  </span>
                  <span className="text-base font-medium text-gray-300">
                    /{t('pricing.premium.period')}
                  </span>
                </p>
                <NavigationLink
                  href="/subscribe/premium"
                  className="mt-8 block w-full bg-blue-600 border border-blue-600 rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-blue-700"
                >
                  Start Free Trial
                </NavigationLink>
              </div>
              <div className="pt-6 pb-8 px-6">
                <h3 className="text-xs font-medium text-gray-300 tracking-wide uppercase">
                  What's included
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {t.raw('pricing.premium.features').map((feature: string, index: number) => (
                    <li key={index} className="flex space-x-3">
                      <svg className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Corporate Plan */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg divide-y divide-gray-200">
              <div className="p-6">
                <h2 className="text-lg leading-6 font-medium text-white">
                  {t('pricing.corporate.name')}
                </h2>
                <p className="mt-4 text-sm text-gray-300">
                  Enterprise-grade solutions
                </p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-white">
                    {t('pricing.corporate.price')}
                  </span>
                  <span className="text-base font-medium text-gray-300">
                    /{t('pricing.corporate.period')}
                  </span>
                </p>
                <NavigationLink
                  href="/subscribe/corporate"
                  className="mt-8 block w-full bg-blue-600 border border-blue-600 rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-blue-700"
                >
                  Contact Sales
                </NavigationLink>
              </div>
              <div className="pt-6 pb-8 px-6">
                <h3 className="text-xs font-medium text-gray-300 tracking-wide uppercase">
                  What's included
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {t.raw('pricing.corporate.features').map((feature: string, index: number) => (
                    <li key={index} className="flex space-x-3">
                      <svg className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
            </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
