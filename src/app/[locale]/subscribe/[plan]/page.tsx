"use client";

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState, use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Footer from '@/components/Footer';
import { normalizePlan, PlanTier } from '@/lib/plan-access';
import { useAuth } from '@/hooks/useAuth';

interface Subscription {
  id: string;
  plan: PlanTier;
  status: 'active' | 'canceled' | 'past_due';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface RemotePlanMeta {
  name: string;
  price: number; // monthly amount
  yearlyPrice: number;
  monthly: string | null; // priceId
  yearly: string | null; // yearly priceId
  features: string[];
  currency: string;
}

export default function SubscribePage({ params }: { params: Promise<{ plan: string }> }) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [subscription] = useState<Subscription | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Unwrap params using React.use()
  const { plan } = use(params);

  // Check for success/cancel parameters
  const isSuccess = searchParams.get('success') === '1';
  const isCanceled = searchParams.get('canceled') === '1';
  const sessionId = searchParams.get('session_id');

  const planType = normalizePlan(plan) as PlanTier; // PlanTier includes 'free'
  const [billingCycle, setBillingCycle] = useState<'monthly'|'yearly'>('monthly');
  const [plans, setPlans] = useState<Record<string, RemotePlanMeta>>({});
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const { plan: userPlan, session } = useAuth();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoadingPlans(true);
        const res = await fetch('/api/stripe/plans');
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Cannot load plans');
        if (active) setPlans(json.plans);
      } catch (e: any) {
        if (active) setFetchError(e.message || 'Errore caricamento piani');
      } finally {
        if (active) setLoadingPlans(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Auto-redirect to dashboard after successful payment
  useEffect(() => {
    if (isSuccess && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isSuccess && redirectCountdown === 0) {
      router.push('/en/dashboard');
    }
  }, [isSuccess, redirectCountdown, router]);

  const planInfo: RemotePlanMeta | null = plans[planType];
  const displayPrice = planInfo ? (billingCycle === 'monthly' ? planInfo.price : planInfo.yearlyPrice) : 0;
  const priceSuffix = billingCycle === 'monthly' ? '/month' : '/year';

  const handleSubscribe = async () => {
    if (!planInfo) return;
    
    if (!session?.access_token) {
      // User not authenticated - redirect to login
      router.push('/en/login');
      return;
    }
    
    setLoading(true);
    try {
      const priceId = billingCycle === 'monthly' ? planInfo.monthly : planInfo.yearly;
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          plan: planType,
          priceId,
          billingCycle
        })
      });
      const payload = await response.json();
      if (payload?.url) {
        window.location.href = payload.url;
      } else {
        console.error('No checkout URL received:', payload);
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
  const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.id
        }),
      });

      if (response.ok) {
        // Refresh subscription data without full reload
        router.refresh();
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

  if (loadingPlans) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">Loading plan...</div>;
  }

  if (fetchError || !planInfo) {
    return <div className="min-h-screen flex flex-col items-center justify-center text-white bg-slate-900 p-6">
      <p className="mb-4">Errore nel caricamento del piano richiesto.</p>
      <Link href="/pricing" className="text-blue-400 hover:text-blue-300">← Back to Pricing</Link>
    </div>;
  }

  // Success page after payment
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-slate-900">
        <nav className="bg-white/10 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Navigation provided globally */}
            </div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-6">
              <SparklesIcon className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              🎉 Pagamento Completato!
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Benvenuto nel piano <strong>{planInfo.name}</strong>! Il tuo accesso è stato attivato.
            </p>
            {sessionId && (
              <p className="text-sm text-gray-400 mb-6">
                Session ID: {sessionId}
              </p>
            )}
          </div>

          <div className="bg-green-600/20 border border-green-500 rounded-lg p-8 mb-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Cosa succede ora?</h2>
              <div className="space-y-4 text-left max-w-2xl mx-auto">
                <div className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-400 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Account Attivato</p>
                    <p className="text-gray-300">Il tuo piano {planInfo.name} è ora attivo e tutte le funzionalità sono disponibili.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-400 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Accesso Immediato</p>
                    <p className="text-gray-300">Puoi iniziare subito a utilizzare tutti gli strumenti avanzati della dashboard.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-400 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Email di Conferma</p>
                    <p className="text-gray-300">Riceverai una email di conferma con tutti i dettagli della tua subscription.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-6 mb-6">
              <p className="text-white text-lg mb-2">
                Redirect automatico alla dashboard in <strong>{redirectCountdown}</strong> secondi...
              </p>
              <button
                onClick={() => router.push('/en/dashboard')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Vai alla Dashboard Ora
              </button>
            </div>
            
            <div className="space-x-4">
              <Link
                href="/en/dashboard"
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Dashboard
              </Link>
              <span className="text-gray-500">•</span>
              <Link
                href="/pricing"
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Pricing Plans
              </Link>
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  // Cancellation page
  if (isCanceled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-slate-900 to-slate-900">
        <nav className="bg-white/10 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Navigation provided globally */}
            </div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600/20 border border-red-500 rounded-full mb-6">
              <XMarkIcon className="h-10 w-10 text-red-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Pagamento Annullato
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Non ti preoccupare, nessun addebito è stato effettuato.
            </p>
          </div>

          <div className="bg-red-600/20 border border-red-500 rounded-lg p-8 mb-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Cosa puoi fare ora?</h2>
              <div className="space-y-4 text-left max-w-2xl mx-auto">
                <div className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-blue-400 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Riprova Quando Vuoi</p>
                    <p className="text-gray-300">Puoi sempre tornare e completare la subscription quando sei pronto.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-blue-400 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Piano Gratuito</p>
                    <p className="text-gray-300">Continua a utilizzare le funzionalità gratuite della piattaforma.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-blue-400 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Supporto</p>
                    <p className="text-gray-300">Se hai domande sui piani, contattaci per assistenza personalizzata.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <button
              onClick={() => router.back()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors mr-4"
            >
              Riprova Subscription
            </button>
            
            <div className="space-x-4">
              <Link
                href="/pricing"
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                ← Torna ai Piani
              </Link>
              <span className="text-gray-500">•</span>
              <Link
                href="/en/dashboard"
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Dashboard Gratuita
              </Link>
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Navigation is provided globally by [locale]/layout.tsx */}
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
              <h2 className="text-2xl font-bold text-white mb-2">{planInfo.name} {userPlan === planType && <span className="ml-2 text-sm px-2 py-1 bg-green-600/30 border border-green-500 rounded">Current</span>}</h2>
              <div className="flex items-center justify-center gap-3 mb-4">
                <button onClick={()=>setBillingCycle('monthly')} className={`text-xs px-3 py-1 rounded-full border ${billingCycle==='monthly'?'bg-blue-600 text-white border-blue-500':'border-slate-500 text-gray-300 hover:text-white'}`}>Monthly</button>
                <button onClick={()=>setBillingCycle('yearly')} className={`text-xs px-3 py-1 rounded-full border ${billingCycle==='yearly'?'bg-blue-600 text-white border-blue-500':'border-slate-500 text-gray-300 hover:text-white'}`}>Yearly <span className="opacity-70">(save ~2 months)</span></button>
              </div>
              <div className="text-4xl font-bold text-blue-400">
                €{displayPrice}
                <span className="text-lg text-gray-300">{priceSuffix}</span>
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
                        Renews on {new Date(subscription?.currentPeriodEnd || '').toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {!subscription?.cancelAtPeriodEnd && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    {loading ? 'Processing...' : 'Cancel Subscription'}
                  </button>
                )}

                {subscription?.cancelAtPeriodEnd && (
                  <div className="bg-yellow-600/20 border border-yellow-500 rounded-lg p-4">
                    <div className="flex items-center">
                      <XMarkIcon className="h-6 w-6 text-yellow-500 mr-3" />
                      <div>
                        <p className="text-white font-semibold">Subscription Cancelled</p>
                        <p className="text-gray-300 text-sm">
                          Access until {new Date(subscription?.currentPeriodEnd || '').toLocaleDateString()}
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
                {loading ? 'Processing...' : `Subscribe to ${planInfo?.name || 'Plan'}`}
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
