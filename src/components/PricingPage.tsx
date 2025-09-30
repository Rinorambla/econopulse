'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { CheckIcon, StarIcon } from '@heroicons/react/24/solid';
import { SUBSCRIPTION_TIERS } from '@/types/subscription-system';

export default function PricingPage() {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  const createCheckoutSession = async (tier: string) => {
    if (!user) {
      window.location.href = '/login?redirect=/pricing';
      return;
    }

    setLoading(tier);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          billingCycle,
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

  const currentTier = 'free'; // TODO: Get from API
  const isTrialActive = false; // TODO: Get from API

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Professional financial analysis tools for every investor
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                billingCycle === 'yearly' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <span className="text-sm text-green-600 font-medium">Save up to 17%</span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => {
            const isCurrentPlan = currentTier === key;
            const isPopular = key === 'professional';
            
            // Mock pricing since tier.pricing doesn't exist
            const mockPrices = {
              free: { monthly: 0, yearly: 0 },
              starter: { monthly: 14.99, yearly: 149.99 },
              professional: { monthly: 49.99, yearly: 499.99 },
              institutional: { monthly: 199.99, yearly: 1999.99 },
            };
            
            const prices = mockPrices[key as keyof typeof mockPrices] || { monthly: 0, yearly: 0 };
            const price = billingCycle === 'monthly' ? prices.monthly : prices.yearly;
            const monthlyPrice = billingCycle === 'yearly' ? price / 12 : price;

            return (
              <div
                key={key}
                className={`relative rounded-2xl p-8 ${
                  isPopular
                    ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white ring-4 ring-blue-200'
                    : 'bg-white text-gray-900 ring-1 ring-gray-200'
                } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      <StarIcon className="h-4 w-4" />
                      <span>Most Popular</span>
                    </div>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-4 right-4">
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Current Plan
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <h3 className={`text-xl font-semibold mb-2 ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                    {tier.name}
                  </h3>
                  
                  <div className="mb-6">
                    {key === 'free' ? (
                      <div className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                        Free
                      </div>
                    ) : (
                      <>
                        <div className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                          ${monthlyPrice.toFixed(2)}
                        </div>
                        <div className={`text-sm ${isPopular ? 'text-blue-100' : 'text-gray-500'}`}>
                          per month{billingCycle === 'yearly' && ', billed yearly'}
                        </div>
                        {billingCycle === 'yearly' && (
                          <div className={`text-xs ${isPopular ? 'text-blue-100' : 'text-gray-400'}`}>
                            Total: ${price}/year
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <p className={`text-sm mb-6 ${isPopular ? 'text-blue-100' : 'text-gray-600'}`}>
                    {key === 'free' ? 'Perfect for getting started' :
                     key === 'starter' ? 'Great for individual investors' :
                     key === 'professional' ? 'Perfect for active traders' :
                     'For institutional use'}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <CheckIcon className={`h-5 w-5 ${isPopular ? 'text-blue-200' : 'text-green-500'} mr-3 mt-0.5 flex-shrink-0`} />
                    <span className={`text-sm ${isPopular ? 'text-blue-100' : 'text-gray-600'}`}>
                      {tier.limits.articlesPerMonth === -1 ? 'Unlimited' : tier.limits.articlesPerMonth} articles per month
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className={`h-5 w-5 ${isPopular ? 'text-blue-200' : 'text-green-500'} mr-3 mt-0.5 flex-shrink-0`} />
                    <span className={`text-sm ${isPopular ? 'text-blue-100' : 'text-gray-600'}`}>
                      {tier.limits.aiQueriesPerDay === -1 ? 'Unlimited' : tier.limits.aiQueriesPerDay === 0 ? 'No' : tier.limits.aiQueriesPerDay} AI queries per day
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className={`h-5 w-5 ${isPopular ? 'text-blue-200' : 'text-green-500'} mr-3 mt-0.5 flex-shrink-0`} />
                    <span className={`text-sm ${isPopular ? 'text-blue-100' : 'text-gray-600'}`}>
                      {tier.limits.reportsPerMonth === -1 ? 'Unlimited' : tier.limits.reportsPerMonth === 0 ? 'No' : tier.limits.reportsPerMonth} reports per month
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className={`h-5 w-5 ${isPopular ? 'text-blue-200' : 'text-green-500'} mr-3 mt-0.5 flex-shrink-0`} />
                    <span className={`text-sm ${isPopular ? 'text-blue-100' : 'text-gray-600'}`}>
                      {tier.limits.apiCallsPerDay === -1 ? 'Unlimited' : tier.limits.apiCallsPerDay === 0 ? 'No' : tier.limits.apiCallsPerDay} API calls per day
                    </span>
                  </li>
                  {(key === 'free' ? ['Real-time market data', 'Basic portfolio tracking', 'Mobile app access'] :
                    key === 'starter' ? ['Advanced analytics', 'Email alerts', 'Priority support'] :
                    key === 'professional' ? ['Custom indicators', 'API access', 'Advanced reports'] :
                    ['Institutional features', 'Dedicated support', 'Custom solutions']).map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className={`h-5 w-5 ${isPopular ? 'text-blue-200' : 'text-green-500'} mr-3 mt-0.5 flex-shrink-0`} />
                      <span className={`text-sm ${isPopular ? 'text-blue-100' : 'text-gray-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <div>
                  {key === 'free' || isCurrentPlan ? (
                    <button
                      disabled
                      className={`w-full py-3 px-4 rounded-lg text-sm font-medium ${
                        isCurrentPlan
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : isPopular
                          ? 'bg-white bg-opacity-20 text-white border-white border-opacity-30'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      } border`}
                    >
                      {isCurrentPlan ? 'Current Plan' : 'Get Started'}
                    </button>
                  ) : (
                    <button
                      onClick={() => createCheckoutSession(key)}
                      disabled={loading === key}
                      className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                        isPopular
                          ? 'bg-white text-blue-600 hover:bg-gray-50'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } disabled:opacity-50`}
                    >
                      {loading === key ? 'Loading...' : `Upgrade to ${tier.name}`}
                    </button>
                  )}
                </div>

                {/* Trial Info */}
                {key !== 'free' && !isCurrentPlan && !isTrialActive && (
                  <p className={`text-xs text-center mt-3 ${isPopular ? 'text-blue-100' : 'text-gray-500'}`}>
                    14-day free trial included
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                What happens during the free trial?
              </h3>
              <p className="text-gray-600">
                You get full access to your chosen plan for 14 days with no charges. 
                Cancel anytime during the trial and you won't be billed.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. 
                Changes are prorated and take effect immediately.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, MasterCard, American Express) 
                and process payments securely through Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}