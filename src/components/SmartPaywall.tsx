'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { XMarkIcon, SparklesIcon, ArrowTrendingUpIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { SUBSCRIPTION_TIERS } from '@/types/subscription-system';

interface PaywallProps {
  type: 'soft' | 'hard' | 'metered';
  trigger: 'article_limit' | 'feature_premium' | 'time_limit' | 'query_limit';
  title?: string;
  subtitle?: string;
  feature?: string;
  usage?: {
    current: number;
    limit: number;
    type: string;
  };
  onClose?: () => void;
  allowPreview?: boolean;
  children?: React.ReactNode;
}

interface PaywallContentConfig {
  headline: string;
  subtitle: string;
  benefits: string[];
  urgency?: string;
  socialProof?: string;
  ctaPrimary: string;
  ctaSecondary?: string;
  icon: React.ComponentType<any>;
  gradient: string;
}

const PAYWALL_CONFIGS: Record<string, PaywallContentConfig> = {
  article_limit: {
    headline: "You've reached your monthly article limit",
    subtitle: "Upgrade to continue reading premium financial analysis and market insights",
    benefits: [
      "Unlimited articles and research reports",
      "Real-time market data and AI analysis", 
      "Advanced portfolio tracking and alerts",
      "Expert insights and exclusive content"
    ],
    urgency: "Join thousands of successful traders",
    socialProof: "Trusted by 10,000+ investors worldwide",
    ctaPrimary: "Start 14-day free trial",
    ctaSecondary: "View pricing plans",
    icon: ChartBarIcon,
    gradient: "from-blue-600 to-purple-600"
  },
  
  feature_premium: {
    headline: "Unlock Professional Trading Tools",
    subtitle: "This advanced feature is available to Professional and Institutional subscribers",
    benefits: [
      "AI-powered portfolio optimization",
      "Advanced backtesting and analytics",
      "Real-time alerts and notifications",
      "API access for custom integrations"
    ],
    urgency: "Limited time: 2 months free with annual plan",
    socialProof: "Preferred by professional traders",
    ctaPrimary: "Upgrade to Professional",
    ctaSecondary: "Compare all plans",
    icon: SparklesIcon,
    gradient: "from-emerald-600 to-teal-600"
  },
  
  query_limit: {
    headline: "AI Query Limit Reached",
    subtitle: "You've used all your daily AI analysis queries. Upgrade for unlimited access",
    benefits: [
      "Unlimited AI market analysis",
      "Custom investment recommendations",
      "Personalized risk assessments",
      "24/7 AI-powered insights"
    ],
    urgency: "Don't miss market opportunities",
    socialProof: "AI analysis used by 85% of our premium users",
    ctaPrimary: "Upgrade for unlimited AI",
    ctaSecondary: "Learn more",
    icon: ArrowTrendingUpIcon,
    gradient: "from-orange-600 to-red-600"
  },
  
  time_limit: {
    headline: "Continue Your Market Research",
    subtitle: "You've been exploring for a while. Get unlimited access to all features",
    benefits: [
      "Unlimited browsing and research time",
      "Save and organize your analysis",
      "Set up custom alerts and notifications",
      "Access to mobile app"
    ],
    urgency: "Special offer: 50% off first month",
    socialProof: "Join the community of serious investors",
    ctaPrimary: "Get unlimited access",
    ctaSecondary: "Maybe later",
    icon: ChartBarIcon,
    gradient: "from-violet-600 to-purple-600"
  }
};

export function SmartPaywall({ 
  type, 
  trigger, 
  title, 
  subtitle, 
  feature, 
  usage,
  onClose,
  allowPreview = false,
  children 
}: PaywallProps) {
  const { user, plan } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const config = PAYWALL_CONFIGS[trigger] || PAYWALL_CONFIGS.feature_premium;
  const IconComponent = config.icon;

  useEffect(() => {
    // Don't show paywall if user has sufficient plan
    if (plan === 'premium' || plan === 'professional' || plan === 'institutional') {
      return;
    }

    // Show paywall based on trigger type
    const timer = setTimeout(() => {
      if (!dismissed) {
        setShowPaywall(true);
      }
    }, type === 'soft' ? 2000 : 0);

    return () => clearTimeout(timer);
  }, [type, dismissed, plan]);

  const handleClose = () => {
    setShowPaywall(false);
    setDismissed(true);
    onClose?.();
  };

  const handleUpgrade = (planId: string) => {
    // Track conversion event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'paywall_upgrade_click', {
        plan_id: planId,
        trigger_type: trigger,
        user_plan: plan
      });
    }
    
    // Redirect to upgrade
    window.location.href = `/en/subscribe/${planId}?source=paywall&trigger=${trigger}`;
  };

  // Soft paywall - show content with overlay
  if (type === 'soft' && allowPreview) {
    return (
      <div className="relative">
        {children}
        {showPaywall && (
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
            <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-auto">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${config.gradient} flex items-center justify-center`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{title || config.headline}</h3>
                      <p className="text-sm text-gray-300">{subtitle || config.subtitle}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleUpgrade('starter')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    {config.ctaPrimary}
                  </button>
                  <Link
                    href="/en/pricing"
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg font-medium text-center transition-colors"
                  >
                    {config.ctaSecondary || 'View Plans'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Hard paywall - block access completely
  if (type === 'hard' || !allowPreview) {
    if (!showPaywall) return <>{children}</>;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
            {/* Header */}
            <div className={`bg-gradient-to-r ${config.gradient} p-8 text-center`}>
              <div className="w-20 h-20 rounded-full bg-white/20 mx-auto mb-4 flex items-center justify-center">
                <IconComponent className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">{title || config.headline}</h1>
              <p className="text-xl text-white/90">{subtitle || config.subtitle}</p>
              {config.urgency && (
                <div className="mt-4 inline-block bg-white/20 px-4 py-2 rounded-full">
                  <span className="text-sm font-medium text-white">{config.urgency}</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Benefits */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-6">What you'll get:</h3>
                  <ul className="space-y-4">
                    {config.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-gray-300">{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  {usage && (
                    <div className="mt-6 bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between text-sm text-gray-400 mb-2">
                        <span>{usage.type} usage</span>
                        <span>{usage.current}/{usage.limit}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${Math.min((usage.current / usage.limit) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-6">Choose your plan:</h3>
                  <div className="space-y-4">
                    {Object.entries(SUBSCRIPTION_TIERS).slice(1, 3).map(([key, tier]) => (
                      <div 
                        key={key}
                        className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                        onClick={() => handleUpgrade(tier.id)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-white">{tier.name}</h4>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">
                              ${(tier.price / 100).toFixed(0)}<span className="text-sm text-gray-400">/mo</span>
                            </div>
                            {tier.yearlyPrice && (
                              <div className="text-xs text-green-400">
                                Save ${((tier.price * 12 - tier.yearlyPrice) / 100).toFixed(0)}/year
                              </div>
                            )}
                          </div>
                        </div>
                        <ul className="text-sm text-gray-400 space-y-1">
                          {tier.billing.features.slice(0, 3).map((feature, idx) => (
                            <li key={idx}>• {feature}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-3">
                    <button
                      onClick={() => handleUpgrade('starter')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                    >
                      {config.ctaPrimary}
                    </button>
                    <Link
                      href="/en/pricing"
                      className="block w-full bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-lg font-medium text-center transition-colors"
                    >
                      {config.ctaSecondary || 'Compare All Plans'}
                    </Link>
                  </div>

                  {config.socialProof && (
                    <p className="text-center text-sm text-gray-400 mt-4">{config.socialProof}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Metered paywall - show usage indicator
  return (
    <>
      {usage && usage.current >= usage.limit * 0.8 && (
        <div className="bg-amber-600/20 border border-amber-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-amber-300 font-medium">Usage Warning</h4>
              <p className="text-amber-200 text-sm">
                You've used {usage.current} of {usage.limit} {usage.type} this month
              </p>
            </div>
            <Link
              href="/en/pricing"
              className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Upgrade
            </Link>
          </div>
        </div>
      )}
      {children}
    </>
  );
}

export default SmartPaywall;