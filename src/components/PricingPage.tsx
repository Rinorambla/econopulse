'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIsIOSApp } from '@/hooks/useIsIOSApp';
import {
  CheckIcon,
  StarIcon,
  SparklesIcon,
  BoltIcon,
  ChartBarIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  BellAlertIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/solid';
import { supabase } from '@/lib/supabase';

export default function PricingPage() {
  const { user } = useAuth();
  const isIOSApp = useIsIOSApp();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const createCheckoutSession = async () => {
    if (!user?.id) {
      window.location.href = '/login?redirect=/pricing';
      return;
    }

    setLoading('premium');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tier: 'premium',
          billingCycle,
          successUrl: `${window.location.origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing?checkout=cancelled`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
        return;
      }

      let message = data.error || 'Failed to create checkout session';
      if (data.stripeError?.type === 'StripeAuthenticationError') {
        message = 'Stripe configuration invalid (API key or Price IDs do not match LIVE environment).';
        if (data.hint) message += `\nHint: ${data.hint}`;
      } else if (data.stripeError?.type) {
        message += `\nStripe: ${data.stripeError.type}${data.stripeError.code ? ' (' + data.stripeError.code + ')' : ''}`;
      }
      throw new Error(message);
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(`Failed to start checkout: ${error?.message || error}`);
    } finally {
      setLoading(null);
    }
  };

  // App Store guideline 3.1.1 — no in-app paid checkout on iOS
  if (isIOSApp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 py-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
            <SparklesIcon className="h-12 w-12 text-cyan-400 mx-auto" />
            <h1 className="text-3xl font-bold text-white">EconoPulse Free</h1>
            <p className="text-gray-300">
              You are using the free version of EconoPulse, which includes
              real-time market quotes, sector heatmaps, and basic AI insights.
            </p>
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 text-left">
              <h2 className="text-base font-semibold text-blue-200 mb-2">
                Want more features?
              </h2>
              <p className="text-sm text-blue-100">
                Premium plans (advanced AI, full options analytics, alerts) are
                available on our website. Once you subscribe there, your account
                will automatically be upgraded inside the app.
              </p>
              <p className="text-sm text-blue-100 mt-2">
                Visit <strong>www.econopulse.ai</strong> from any browser to learn more.
              </p>
            </div>
            <p className="text-xs text-gray-500">
              No purchases are processed inside this app.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const premiumFeatures = [
    {
      icon: CpuChipIcon,
      title: 'Unlimited AI Analysis',
      desc: 'GPT-4 powered insights, daily macro summaries, technical & fundamental analysis on any ticker — no usage caps.',
    },
    {
      icon: ChartBarIcon,
      title: 'Full Dashboard',
      desc: 'S&P 500 sector heatmap, top movers, gamma exposure, options flow, FedWatch, VIX, Treasury curve.',
    },
    {
      icon: RocketLaunchIcon,
      title: 'AI Portfolio Builder',
      desc: 'Smart portfolio construction (conservative / balanced / aggressive) with risk-adjusted optimization.',
    },
    {
      icon: ArrowTrendingUpIcon,
      title: 'Advanced Screeners',
      desc: 'Filter 5,000+ equities, ETFs and crypto by AI score, momentum, valuation and quality factors.',
    },
    {
      icon: BellAlertIcon,
      title: 'Real-Time Alerts',
      desc: 'Price triggers, options unusual activity, earnings surprises and macro releases delivered instantly.',
    },
    {
      icon: GlobeAltIcon,
      title: 'Global Coverage',
      desc: 'US, EU, Asia equities, FX majors, top 100 crypto, commodities — one unified intelligence layer.',
    },
    {
      icon: BoltIcon,
      title: 'API Access',
      desc: 'Programmatic access to AI insights and market data for your own dashboards and bots.',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Priority Support',
      desc: 'Direct line to the team. Feature requests prioritized. SLA on critical issues.',
    },
  ];

  const monthlyPrice = billingCycle === 'monthly' ? '29.99' : '299.99';
  const yearlyEquivalent = '25.00';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-32 w-[28rem] h-[28rem] bg-blue-600/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 w-[32rem] h-[32rem] -translate-x-1/2 bg-indigo-600/10 rounded-full blur-3xl" />

      <div className="relative container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold tracking-wide uppercase mb-6">
            <SparklesIcon className="h-4 w-4" />
            AI-Powered Market Intelligence
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
            Trade smarter with
            <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              institutional-grade AI
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-2">
            Start free, upgrade when you&apos;re ready. One subscription, every market.
          </p>
          <p className="text-sm text-gray-400">
            Stocks · ETFs · Crypto · Forex · Commodities · Options · Macro
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-14">
          <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 sm:px-7 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-5 sm:px-7 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="text-[10px] uppercase tracking-wide bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {/* FREE */}
          <div className="relative rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-1">Free</h3>
              <p className="text-sm text-gray-400">For curious investors getting started</p>
            </div>
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-white">€0</span>
                <span className="text-gray-400 text-sm">/forever</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                'AI Pulse — daily market sentiment & signals',
                'Real-time quotes (stocks, ETFs, crypto, FX)',
                'S&P 500 sector heatmap',
                'Basic portfolio tracking',
                'Macro & earnings calendar',
                'Mobile + desktop access',
              ].map((feat) => (
                <li key={feat} className="flex items-start gap-3">
                  <CheckIcon className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">{feat}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => (window.location.href = user ? '/dashboard' : '/signup')}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-white/10 text-white hover:bg-white/15 border border-white/10 transition-colors"
            >
              {user ? 'Go to Dashboard' : 'Get Started Free'}
            </button>
          </div>

          {/* PREMIUM */}
          <div className="relative rounded-2xl p-[2px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-2xl shadow-blue-900/40">
            {/* Popular badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                <StarIcon className="h-3.5 w-3.5" />
                MOST POPULAR
              </div>
            </div>

            <div className="rounded-[14px] bg-slate-950/95 backdrop-blur-xl p-8 flex flex-col h-full">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-cyan-400" />
                  Premium AI
                </h3>
                <p className="text-sm text-gray-400">
                  Everything you need to invest like a pro
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                    €{monthlyPrice}
                  </span>
                  <span className="text-gray-400 text-sm">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {billingCycle === 'yearly' ? (
                  <p className="text-xs text-emerald-300 mt-1.5 font-medium">
                    €{yearlyEquivalent}/month equivalent · 2 months free
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1.5">
                    Or €299.99/year (save 17%)
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-3">
                  <CheckIcon className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-200">
                    <strong className="text-white">Everything in Free</strong>, plus full platform unlock
                  </span>
                </li>
                {premiumFeatures.slice(0, 6).map(({ icon: Icon, title }) => (
                  <li key={title} className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-200">{title}</span>
                  </li>
                ))}
                <li className="flex items-start gap-3">
                  <BoltIcon className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-200">API access for integrations</span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheckIcon className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-200">Priority email support</span>
                </li>
              </ul>

              <button
                onClick={createCheckoutSession}
                disabled={loading === 'premium'}
                className="group relative w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/50 transition-all hover:shadow-cyan-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading === 'premium' ? (
                    'Loading…'
                  ) : (
                    <>
                      <RocketLaunchIcon className="h-4 w-4" />
                      Start 14-day free trial
                    </>
                  )}
                </span>
              </button>
              <p className="text-xs text-center mt-3 text-gray-500">
                Cancel anytime · No commitment
              </p>
            </div>
          </div>
        </div>

        {/* What you get — detailed grid */}
        <div className="max-w-6xl mx-auto mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              What&apos;s inside <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Premium</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Eight core capabilities, one subscription — designed to give individual investors the same edge that institutional desks have.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {premiumFeatures.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-cyan-400/40 hover:bg-white/[0.07] transition-all"
              >
                <div className="inline-flex p-2.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/20 mb-3 group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5 text-cyan-300" />
                </div>
                <h3 className="text-white font-semibold mb-1.5 text-sm">{title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-5xl mx-auto mt-20">
          <div className="rounded-2xl bg-gradient-to-r from-cyan-500/10 via-blue-600/10 to-indigo-600/10 border border-white/10 backdrop-blur-md p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">5,000+</div>
              <div className="text-xs text-gray-400 mt-1">Tickers covered</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">24/7</div>
              <div className="text-xs text-gray-400 mt-1">AI monitoring</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">&lt;500ms</div>
              <div className="text-xs text-gray-400 mt-1">Quote latency</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">14 days</div>
              <div className="text-xs text-gray-400 mt-1">Free trial</div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mt-24">
          <h2 className="text-3xl font-bold text-center text-white mb-10">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {[
              {
                q: 'What does the Free plan include?',
                a: 'Full access to AI Pulse with daily sentiment, real-time quotes for stocks, ETFs, crypto and FX, the S&P 500 sector heatmap, basic portfolio tracking, and the macro/earnings calendar. No credit card required.',
              },
              {
                q: 'What unlocks with Premium AI?',
                a: 'Everything: unlimited GPT-4 powered analysis, AI Portfolio Builder, advanced screeners, options gamma exposure, real-time alerts, API access and priority support. The full platform — every page, every feature.',
              },
              {
                q: 'How does the 14-day free trial work?',
                a: 'You can start the trial right after signup. Full Premium access for 14 days, no charge until the trial ends. Cancel any time inside your account dashboard and you keep Premium until the period ends, then drop back to Free automatically.',
              },
              {
                q: 'Can I switch between monthly and yearly?',
                a: 'Yes. Upgrade or downgrade your billing cycle from the Stripe billing portal. Yearly saves you 17% — about 2 months free.',
              },
              {
                q: 'Is my data safe?',
                a: 'Yes. We use Supabase auth, encrypted storage, Stripe-only payment handling and never sell or share personal data. Read our Privacy Policy for the full breakdown of sub-processors.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'All major credit/debit cards, Apple Pay and Google Pay via Stripe — secure, PCI-compliant, fraud-protected.',
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-cyan-400/30 transition-colors"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                  <span className="font-semibold text-white text-sm sm:text-base">{item.q}</span>
                  <span className="text-cyan-400 text-xl leading-none group-open:rotate-45 transition-transform flex-shrink-0">+</span>
                </summary>
                <p className="text-sm text-gray-300 mt-3 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="max-w-3xl mx-auto mt-20 mb-8 text-center">
          <div className="rounded-2xl bg-gradient-to-r from-cyan-500/15 via-blue-600/15 to-indigo-600/15 border border-cyan-400/20 backdrop-blur-md p-8 sm:p-10">
            <AcademicCapIcon className="h-10 w-10 text-cyan-400 mx-auto mb-4" />
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Ready to invest with an edge?
            </h3>
            <p className="text-gray-300 mb-6 max-w-xl mx-auto">
              Join investors using AI to make sense of every market move. 14 days free, full access, cancel anytime.
            </p>
            <button
              onClick={createCheckoutSession}
              disabled={loading === 'premium'}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/50 hover:shadow-cyan-500/40 hover:scale-105 transition-all disabled:opacity-50"
            >
              <RocketLaunchIcon className="h-5 w-5" />
              {loading === 'premium' ? 'Loading…' : 'Start free trial'}
            </button>
            <p className="text-xs text-gray-500 mt-4">
              No credit card required for Free · Premium trial cancellable anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
