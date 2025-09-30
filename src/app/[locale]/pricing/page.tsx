'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import { getStripe } from '@/lib/stripe';
import { useAuth } from '@/hooks/useAuth';
import Footer from '@/components/Footer';
import { normalizePlan } from '@/lib/plan-access';

interface LoadedPlan {
  id: string;
  name: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  priceId: string | null;
  yearlyPriceId: string | null;
  features: string[];
  popular?: boolean;
  currency?: string | null;
}

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<LoadedPlan[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { user, plan: userPlan, session } = useAuth();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setFetching(true);
        const res = await fetch('/api/stripe/plans');
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Impossibile caricare i piani');
        const loaded: LoadedPlan[] = Object.entries(json.plans).map(([id, p]: any) => ({
          id,
          name: p.name,
          priceMonthly: p.price ?? null,
          priceYearly: p.yearlyPrice ?? null,
          priceId: p.monthly,
          yearlyPriceId: p.yearly,
          features: p.features || [],
          popular: id === 'premium',
          currency: p.currency || 'usd'
        }));
        if (active) setPlans(loaded);
      } catch (e: any) {
        if (active) setFetchError(e.message || 'Errore caricamento piani');
      } finally {
        if (active) setFetching(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleSubscribe = async (plan: LoadedPlan) => {
    setLoading(plan.id);
    
    try {
      console.log('🔍 Creating checkout session for:', {
        planId: plan.id,
        priceId: isYearly ? plan.yearlyPriceId : plan.priceId,
        isYearly
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if user is logged in
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          priceId: isYearly ? plan.yearlyPriceId : plan.priceId,
          plan: plan.id,
          billingCycle: isYearly ? 'yearly' : 'monthly'
        }),
      });

      console.log('🔍 API Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const payload = await response.json();
      console.log('🔍 Session data:', payload);
      if (payload.url) {
        window.location.href = payload.url;
        return;
      }
      if (payload.sessionId) {
        const stripe = await getStripe();
        await stripe?.redirectToCheckout({ sessionId: payload.sessionId });
        return;
      }
      console.error('Unexpected checkout response payload', payload);
      throw new Error('Checkout response non valida');
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-gray-300">Caricamento piani...</div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-gray-300 p-6">
        <p className="mb-4">Errore nel caricamento dei piani: {fetchError}</p>
        <button onClick={() => location.reload()} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm">Riprova</button>
      </div>
    );
  }

  // Normalize user plan each render (cheap) to avoid stale memo impacting hook order changes
  const normalizedUserPlan = normalizePlan(userPlan as any);

  function formatPrice(amount: number | null | undefined, currency: string | null | undefined) {
    if (amount == null) return '—';
    if (amount === 0) return 'Free';
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format(amount);
    } catch {
      // Fallback if unsupported currency code
      return `${(currency || 'USD').toUpperCase()} ${amount}`;
    }
  }

  function planButtonLabel(plan: LoadedPlan): string {
    if (normalizedUserPlan === plan.id) return 'Current Plan';
    // If user has higher plan don't offer downgrade
    const order = ['pro','premium','corporate'];
    if (order.indexOf(normalizedUserPlan) > order.indexOf(plan.id)) return 'Downgrade Not Available';
    return 'Subscribe';
  }

  function isButtonDisabled(plan: LoadedPlan): boolean {
    if (normalizedUserPlan === plan.id) return true;
    const order = ['pro','premium','corporate'];
    // disable if would be a downgrade
    if (order.indexOf(normalizedUserPlan) > order.indexOf(plan.id)) return true;
    return false;
  }

  return (
  <div className="min-h-screen bg-[var(--background)] text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <NavigationLink href="/" className="text-blue-400 hover:text-blue-300">
              <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </NavigationLink>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Pricing Plans</h1>
              <p className="text-sm sm:text-base text-gray-400">Choose the perfect plan for your needs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12">
        {/* Billing Toggle */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">Simple, Transparent Pricing</h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-400 mb-6 sm:mb-8 px-2">
            Only pay for what you really need. Start free, upgrade anytime.
          </p>
          
          <div className="flex items-center justify-center space-x-3 sm:space-x-4">
            <span className={`text-sm sm:text-base ${!isYearly ? 'text-white' : 'text-gray-400'}`}>Monthly</span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white transition ${
                  isYearly ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm sm:text-base ${isYearly ? 'text-white' : 'text-gray-400'}`}>Yearly</span>
          </div>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500 px-2">Yearly billing shows the effective monthly price. Discount varies per plan.</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {plans.map((plan) => {
            const currency = plan.currency || 'usd';
            const monthlyEffective = plan.priceMonthly;
            const yearlyTotal = plan.priceYearly;
            let discount: number | null = null;
            if (plan.priceMonthly && plan.priceYearly && plan.priceMonthly > 0) {
              const raw = 1 - plan.priceYearly / (plan.priceMonthly * 12);
              discount = raw > 0.001 ? Math.round(raw * 100) : null;
            }
            const btnDisabled = isButtonDisabled(plan);
            const btnLabel = planButtonLabel(plan);
            const isCurrent = btnLabel === 'Current Plan';
            const isDowngrade = btnLabel === 'Downgrade Not Available';
            return (
            <div
              key={plan.id}
              className={`relative rounded-xl sm:rounded-2xl p-6 sm:p-8 ${
                plan.popular
                  ? 'bg-gradient-to-b from-blue-600 to-blue-700 ring-2 ring-blue-500'
                  : 'bg-slate-800 ring-1 ring-slate-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-400 text-black text-xs sm:text-sm font-bold px-3 sm:px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl sm:text-2xl font-bold">{plan.name}</h3>
                {normalizedUserPlan && (
                  <p className="text-xs text-gray-300 mt-1">{isCurrent ? 'This is your current plan' : ''}</p>
                )}
                {/* Diagnostics removed per revert request */}
                
                <div className="mt-6">
                  {isYearly && yearlyTotal !== null && yearlyTotal !== undefined ? (
                    <>
                      <span className="text-4xl font-bold">{formatPrice(yearlyTotal, currency)}</span>
                      <span className="text-gray-400">/year</span>
                      {monthlyEffective && monthlyEffective > 0 && (
                        <p className="text-sm text-green-400 mt-1">
                          Effective {formatPrice((yearlyTotal/12), currency)}/mo {discount ? `• Save ${discount}%` : ''}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">{formatPrice(monthlyEffective, currency)}</span>
                      {monthlyEffective !== null && monthlyEffective !== 0 && <span className="text-gray-400">/month</span>}
                    </>
                  )}
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={loading === plan.id || btnDisabled || isDowngrade || isCurrent}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                      btnDisabled || isDowngrade || isCurrent
                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                        : plan.popular
                          ? 'bg-white text-blue-700 hover:bg-gray-100'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading === plan.id ? 'Processing...' : btnLabel}
                  </button>
                </div>
              </div>

              <div className="mt-8">
                <ul className="space-y-4">
                  {(plan.features || []).map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            );
          })}
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
