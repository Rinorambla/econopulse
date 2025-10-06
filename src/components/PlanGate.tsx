'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface PlanGateProps {
  children: React.ReactNode;
  requiredPlan: 'free' | 'premium';
  redirectTo?: string;
  showMessage?: boolean;
}

export default function PlanGate({ 
  children, 
  requiredPlan, 
  redirectTo = '/pricing',
  showMessage = true 
}: PlanGateProps) {
  const { user, loading, plan } = useAuth();
  const router = useRouter();

  // Get user's actual subscription tier from auth hook
  const userTier: 'free' | 'premium' = (plan === 'premium' || plan === 'trial') ? 'premium' : 'free';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // If user needs premium but only has free, don't redirect automatically
    // We'll show the upgrade message instead
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check plan access
  const hasAccess = (): boolean => {
    if (requiredPlan === 'free') return true; // Free tier can access free content
    if (requiredPlan === 'premium') return (userTier as 'free' | 'premium') === 'premium'; // Only premium users can access premium content
    return false;
  };

  if (!hasAccess()) {
    if (!showMessage) {
      router.push(redirectTo);
      return null;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Premium Feature
            </h2>
            
            <p className="text-gray-600 mb-6">
              This feature is available with our Premium AI plan. 
              Upgrade now to unlock the full power of our platform.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="text-left bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What you'll get:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ Full platform access</li>
                <li>✓ AI Portfolio Builder</li>
                <li>✓ Advanced market analysis</li>
                <li>✓ Unlimited AI queries</li>
                <li>✓ Real-time alerts</li>
                <li>✓ API access</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <Link 
              href="/pricing"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block"
            >
              Upgrade to Premium AI
            </Link>
            
            <Link 
              href="/ai-pulse"
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors inline-block"
            >
              Back to AI Pulse
            </Link>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            14-day free trial included • Cancel anytime
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Helper component for inline premium features
export function PremiumFeature({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { plan } = useAuth();
  const userTier: 'free' | 'premium' = (plan === 'premium' || plan === 'trial') ? 'premium' : 'free';
  
  if ((userTier as 'free' | 'premium') === 'premium') {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Link 
          href="/pricing"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Upgrade for Access
        </Link>
      </div>
    </div>
  );
}