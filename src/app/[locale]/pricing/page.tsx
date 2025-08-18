'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import { getStripe } from '@/lib/stripe';
import Footer from '@/components/Footer';

const plans = [
  {
    id: 'pro',
    name: 'EconoPulse Pro',
    description: 'Perfect for individual investors',
    monthlyPrice: 9.99, // €9.99 from Stripe - price_1RjN7THBOxZDD1iJQ9UoiQvY
    yearlyPrice: 99.99, // €99.99 from Stripe - price_1RjNIVHBOxZDD1iJ7nyJ1T41
    priceId: 'price_1RjN7THBOxZDD1iJQ9UoiQvY', // Monthly price ID
    yearlyPriceId: 'price_1RjNIVHBOxZDD1iJ7nyJ1T41', // Yearly price ID
    features: [
      'Real-time market dashboard',
      'Basic portfolio insights',
      'Email support',
      'Mobile access',
      'Market alerts'
    ],
    popular: false
  },
  {
    id: 'premium',
    name: 'EconoPulse Premium AI',
    description: 'AI-powered insights and analysis',
    monthlyPrice: 29.99, // €29.99 from Stripe - price_1RjNDXHBOxZDD1iJG9RV0EMm
    yearlyPrice: 299.99, // €299.99 from Stripe - price_1RjNKuHBOxZDD1iJQ5hrI9fm
    priceId: 'price_1RjNDXHBOxZDD1iJG9RV0EMm', // Monthly price ID
    yearlyPriceId: 'price_1RjNKuHBOxZDD1iJQ5hrI9fm', // Yearly price ID
    features: [
      'Everything in Pro',
      'AI Portfolio Builder',
      'Advanced market analysis',
      'Priority support',
      'Custom alerts',
      'Economic quadrant analysis',
      'Options flow analysis'
    ],
    popular: true
  },
  {
    id: 'corporate',
    name: 'EconoPulse Corporate',
    description: 'Enterprise-grade solutions',
    monthlyPrice: 99.99, // €99.99 from Stripe - price_1RjNFcHBOxZDD1iJGhA0xRGL
    yearlyPrice: 999.99, // €999.99 from Stripe - price_1RjNMfHBOxZDD1iJUoaOP2dJ
    priceId: 'price_1RjNFcHBOxZDD1iJGhA0xRGL', // Monthly price ID
    yearlyPriceId: 'price_1RjNMfHBOxZDD1iJUoaOP2dJ', // Yearly price ID
    features: [
      'Everything in Premium',
      'Multi-user access (up to 10 users)',
      'API access',
      'Custom integrations',
      'Dedicated support',
      'White-label options',
      'Custom reporting'
    ],
    popular: false
  }
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: typeof plans[0]) => {
    setLoading(plan.id);
    
    try {
      console.log('🔍 Creating checkout session for:', {
        planId: plan.id,
        priceId: isYearly ? plan.yearlyPriceId : plan.priceId,
        isYearly
      });

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: isYearly ? plan.yearlyPriceId : plan.priceId,
          successUrl: `${window.location.origin}/en/success`,
          cancelUrl: `${window.location.origin}/en/pricing`,
        }),
      });

      console.log('🔍 API Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { sessionId, url } = await response.json();
      console.log('🔍 Session data:', { sessionId, url });

      if (url) {
        console.log('✅ Redirecting to Stripe hosted checkout');
        window.location.href = url;
      } else if (sessionId) {
        console.log('✅ Using Stripe.js redirect');
        const stripe = await getStripe();
        await stripe?.redirectToCheckout({ sessionId });
      } else {
        throw new Error('No sessionId or url returned from API');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <NavigationLink href="/" className="text-blue-400 hover:text-blue-300">
              <ArrowLeftIcon className="h-6 w-6" />
            </NavigationLink>
            <div>
              <h1 className="text-2xl font-bold">Pricing Plans</h1>
              <p className="text-gray-400">Choose the perfect plan for your needs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Billing Toggle */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-400 mb-8">
            Start with a free trial, upgrade when you're ready
          </p>
          
          <div className="flex items-center justify-center space-x-4">
            <span className={`${!isYearly ? 'text-white' : 'text-gray-400'}`}>Monthly</span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  isYearly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`${isYearly ? 'text-white' : 'text-gray-400'}`}>
              Yearly <span className="text-green-400 text-sm">(Save 17%)</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 ${
                plan.popular
                  ? 'bg-gradient-to-b from-blue-600 to-blue-700 ring-2 ring-blue-500'
                  : 'bg-slate-800 ring-1 ring-slate-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-400 text-black text-sm font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="text-gray-300 mt-2">{plan.description}</p>
                
                <div className="mt-6">
                  <span className="text-4xl font-bold">
                    €{isYearly ? Math.floor(plan.yearlyPrice / 12) : plan.monthlyPrice}
                  </span>
                  <span className="text-gray-400">/month</span>
                  {isYearly && (
                    <p className="text-sm text-green-400 mt-1">
                      Billed yearly (€{plan.yearlyPrice})
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={loading === plan.id}
                  className={`w-full mt-8 py-3 px-6 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-white text-blue-700 hover:bg-gray-100'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === plan.id ? 'Processing...' : 'Start Free Trial'}
                </button>
              </div>

              <div className="mt-8">
                <ul className="space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3">Is there a free trial?</h3>
              <p className="text-gray-400">
                Yes! All plans come with a 14-day free trial. No credit card required to start.
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3">Can I change plans anytime?</h3>
              <p className="text-gray-400">
                Absolutely. You can upgrade, downgrade, or cancel your subscription at any time.
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3">What payment methods do you accept?</h3>
              <p className="text-gray-400">
                We accept all major credit cards (Visa, MasterCard, American Express) through Stripe.
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3">Is my data secure?</h3>
              <p className="text-gray-400">
                Yes. We use industry-standard encryption and security practices to protect your data.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
