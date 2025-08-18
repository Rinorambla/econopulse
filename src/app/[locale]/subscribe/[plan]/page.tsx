'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState, use } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Navigation } from '@/components/Navigation';
import Footer from '@/components/Footer';

interface Subscription {
  id: string;
  plan: string;
  status: 'active' | 'canceled' | 'past_due';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export default function SubscribePage({ params }: { params: Promise<{ plan: string }> }) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [subscription] = useState<Subscription | null>(null);
  
  // Unwrap params using React.use()
  const { plan } = use(params);

  const planDetails = {
    pro: {
      name: 'Pro Plan',
      price: '$19',
      period: 'month',
      features: [
        'Real-time market data',
        'Basic portfolio tracking',
        'Email alerts',
        'Standard support'
      ]
    },
    premium: {
      name: 'Premium Plan',
      price: '$49',
      period: 'month',
      features: [
        'Everything in Pro',
        'AI portfolio recommendations',
        'Advanced analytics',
        'Priority support',
        'Custom alerts',
        'API access'
      ]
    },
    corporate: {
      name: 'Corporate Plan',
      price: '$199',
      period: 'month',
      features: [
        'Everything in Premium',
        'Multi-user access',
        'White-label options',
        'Dedicated support',
        'Custom integrations',
        'SLA guarantee'
      ]
    }
  };

  const planType = plan; // Use the unwrapped plan parameter
  const planInfo = planDetails[planType as keyof typeof planDetails];

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: planType === 'pro' ? process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID :
                   planType === 'premium' ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID :
                   process.env.NEXT_PUBLIC_STRIPE_CORPORATE_PRICE_ID,
          plan: planType
        }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.id
        }),
      });

      if (response.ok) {
        // Refresh subscription data
        window.location.reload();
      }
    } catch (error) {
      console.error('Cancellation error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Plan Not Found</h1>
          <Link href="/pricing" className="text-blue-400 hover:text-blue-300">
            Back to Pricing
          </Link>
        </div>
      </div>
    );
  }

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

      {/* Subscription Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Subscribe to {planInfo.name}
          </h1>
          <p className="text-xl text-gray-300">
            Get started with advanced financial analysis tools
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Plan Details */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">{planInfo.name}</h2>
              <div className="text-4xl font-bold text-blue-400">
                {planInfo.price}
                <span className="text-lg text-gray-300">/{planInfo.period}</span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-semibold text-white">What's included:</h3>
              <ul className="space-y-3">
                {planInfo.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-center text-gray-300">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {subscription ? (
              <div className="space-y-4">
                <div className="bg-green-600/20 border border-green-500 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckIcon className="h-6 w-6 text-green-500 mr-3" />
                    <div>
                      <p className="text-white font-semibold">Active Subscription</p>
                      <p className="text-gray-300 text-sm">
                        Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {!subscription.cancelAtPeriodEnd && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    {loading ? 'Processing...' : 'Cancel Subscription'}
                  </button>
                )}

                {subscription.cancelAtPeriodEnd && (
                  <div className="bg-yellow-600/20 border border-yellow-500 rounded-lg p-4">
                    <div className="flex items-center">
                      <XMarkIcon className="h-6 w-6 text-yellow-500 mr-3" />
                      <div>
                        <p className="text-white font-semibold">Subscription Cancelled</p>
                        <p className="text-gray-300 text-sm">
                          Access until {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-4 px-6 rounded-lg text-lg transition-colors"
              >
                {loading ? 'Processing...' : `Subscribe to ${planInfo.name}`}
              </button>
            )}
          </div>

          {/* Benefits */}
          <div className="bg-white/5 backdrop-blur-md rounded-lg p-8">
            <h3 className="text-2xl font-bold text-white mb-6">Why Choose EconoPulse?</h3>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                  <CheckIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Real-time Data</h4>
                  <p className="text-gray-300">
                    Get up-to-the-minute market data and financial insights to make informed decisions.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                  <CheckIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">AI-Powered Analysis</h4>
                  <p className="text-gray-300">
                    Leverage artificial intelligence to discover investment opportunities and optimize your portfolio.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                  <CheckIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Professional Support</h4>
                  <p className="text-gray-300">
                    Get expert help when you need it with our dedicated support team.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-600/20 rounded-lg">
              <p className="text-center text-white">
                <strong>30-day money-back guarantee</strong>
              </p>
              <p className="text-center text-gray-300 text-sm mt-1">
                Cancel anytime within 30 days for a full refund
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link
            href="/pricing"
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            ← Back to Pricing Plans
          </Link>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
