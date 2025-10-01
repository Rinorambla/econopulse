'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { CheckIcon, StarIcon, SparklesIcon } from '@heroicons/react/24/solid';

export default function PricingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const createCheckoutSession = async () => {
    if (!user) {
      window.location.href = '/login?redirect=/pricing';
      return;
    }

    setLoading('premium');
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: 'premium',
          billingCycle: 'monthly',
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/pricing?checkout=cancelled`,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const currentTier: 'free' | 'premium' = 'free'; // TODO: Get from API

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Market Intelligence Made Simple
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Start free with AI Pulse insights, then unlock the full power of our platform
          </p>
          <p className="text-lg text-gray-500">
            Professional market analysis accessible to everyone
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* FREE Plan */}
          <div className="relative rounded-2xl p-8 bg-white text-gray-900 ring-1 ring-gray-200">
            <div className="text-center">
              <h3 className="text-2xl font-semibold mb-4 text-gray-900">
                Free Plan
              </h3>
              
              <div className="mb-6">
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  €0
                </div>
                <div className="text-sm text-gray-500">
                  Forever free
                </div>
              </div>

              <p className="text-sm mb-8 text-gray-600">
                Perfect for getting started with AI-powered market insights
              </p>
            </div>

            {/* Features */}
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  Full access to <strong>AI Pulse</strong> page
                </span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  AI-powered market sentiment analysis
                </span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  Daily market insights and signals
                </span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  Basic portfolio tracking
                </span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  Mobile and desktop access
                </span>
              </li>
            </ul>

            {/* CTA Button */}
            <div>
              {(currentTier as 'free' | 'premium') === 'free' ? (
                <button
                  disabled
                  className="w-full py-3 px-4 rounded-lg text-sm font-medium bg-green-100 text-green-800 border border-green-200"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => window.location.href = '/ai-pulse'}
                  className="w-full py-3 px-4 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                >
                  Get Started Free
                </button>
              )}
            </div>
          </div>

          {/* PREMIUM Plan */}
          <div className="relative rounded-2xl p-8 bg-gradient-to-b from-blue-600 to-blue-700 text-white ring-4 ring-blue-200">
            {/* Most Popular Badge */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                <StarIcon className="h-4 w-4" />
                <span>Most Popular</span>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-semibold mb-4 text-white flex items-center justify-center">
                <SparklesIcon className="h-6 w-6 mr-2" />
                Premium AI
              </h3>
              
              <div className="mb-6">
                <div className="text-5xl font-bold text-white mb-2">
                  €29.99
                </div>
                <div className="text-sm text-blue-100">
                  per month
                </div>
              </div>

              <p className="text-sm mb-8 text-blue-100">
                Complete access to all professional features and tools
              </p>
            </div>

            {/* Features */}
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <CheckIcon className="h-5 w-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-100">
                  <strong>Everything in Free</strong> +
                </span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="h-5 w-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-100">
                  <strong>Full platform access</strong> - All pages and features
                </span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="h-5 w-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-100">
                  AI Portfolio Builder & optimization
                </span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="h-5 w-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-100">
                  Advanced market analysis & screeners
                </span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="h-5 w-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-100">
                  Unlimited AI queries and reports
                </span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="h-5 w-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-100">
                  Real-time alerts & notifications
                </span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="h-5 w-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-100">
                  API access for integrations
                </span>
              </li>
              <li className="flex items-start">
                <CheckIcon className="h-5 w-5 text-blue-200 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-100">
                  Priority support
                </span>
              </li>
            </ul>

            {/* CTA Button */}
            <div>
              {(currentTier as 'free' | 'premium') === 'premium' ? (
                <button
                  disabled
                  className="w-full py-3 px-4 rounded-lg text-sm font-medium bg-white bg-opacity-20 text-white border border-white border-opacity-30"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={createCheckoutSession}
                  disabled={loading === 'premium'}
                  className="w-full py-3 px-4 rounded-lg text-sm font-medium bg-white text-blue-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {loading === 'premium' ? 'Loading...' : 'Upgrade to Premium'}
                </button>
              )}
            </div>

            {/* Trial Info */}
            {(currentTier as 'free' | 'premium') !== 'premium' && (
              <p className="text-xs text-center mt-3 text-blue-100">
                14-day free trial included • Cancel anytime
              </p>
            )}
          </div>
        </div>

        {/* Value Proposition */}
        <div className="max-w-4xl mx-auto mt-16 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Why Choose EconoPulse Premium?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="font-semibold text-gray-900 mb-2">AI-Powered</h3>
                <p className="text-sm text-gray-600">
                  Advanced artificial intelligence analyzes markets 24/7 for you
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl mb-2">💡</div>
                <h3 className="font-semibold text-gray-900 mb-2">Professional Tools</h3>
                <p className="text-sm text-gray-600">
                  Institutional-grade insights for individual investors
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl mb-2">⚡</div>
                <h3 className="font-semibold text-gray-900 mb-2">Real-Time</h3>
                <p className="text-sm text-gray-600">
                  Live market data and instant alerts when it matters
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                What can I access with the Free plan?
              </h3>
              <p className="text-gray-600">
                The Free plan gives you full access to our AI Pulse page with market sentiment analysis, 
                daily insights, and basic portfolio tracking. Perfect to get started!
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                What's included in Premium AI?
              </h3>
              <p className="text-gray-600">
                Premium AI unlocks the entire platform: advanced portfolio builder, market screeners, 
                unlimited AI queries, real-time alerts, API access, and priority support.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can cancel your Premium subscription at any time. 
                You'll continue to have access until the end of your billing period, 
                then automatically return to the Free plan.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Do you offer a free trial?
              </h3>
              <p className="text-gray-600">
                Yes! Premium AI comes with a 14-day free trial. 
                No credit card required to start with the Free plan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}