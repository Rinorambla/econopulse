'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { hasAccess, planRank, normalizePlan, PlanTier } from '@/lib/plan-access';
import Link from 'next/link';

interface RequirePlanProps {
  min: PlanTier; // minimum required plan
  children: React.ReactNode;
  inline?: boolean; // if true and insufficient plan, render small inline upgrade hint instead of full panel
}

/**
 * Client-side gating wrapper for premium content.
 * Assumes AuthProvider is mounted higher. Falls back gracefully to login / upgrade prompts.
 */
export function RequirePlan({ min, children, inline }: RequirePlanProps) {
  const { user, loading, plan, refreshingPlan } = useAuth();

  // DEV MODE: Bypass restrictions in development or with env flag
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_BYPASS === 'true') {
    return <>{children}</>;
  }

  if (loading || refreshingPlan) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">Checking access...</div>
    );
  }

  if (!user) {
    return (
      <div className="rounded border border-gray-700 bg-gray-900/40 p-6 text-center">
        <p className="mb-4 text-gray-200">You must be logged in to access this content.</p>
        <Link href="/en/login" className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
          Login
        </Link>
      </div>
    );
  }

  // Treat null plan as free (still loading or no subscription) - plan-access util handles unknown gracefully
  const currentPlan = normalizePlan(plan);
  if (hasAccess(currentPlan, min)) {
    return <>{children}</>;
  }

  if (inline) {
    return (
      <span className="ml-2 align-middle text-xs text-amber-400">
        Upgrade required ({currentPlan} → {min})
      </span>
    );
  }

  const upgradeNeeded = planRank(min) > planRank(currentPlan);
  return (
    <div className="rounded border border-amber-500/30 bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 p-8 text-center">
      <h3 className="mb-2 text-lg font-semibold text-amber-300">Upgrade Required</h3>
      <p className="mb-4 text-sm text-gray-300">
        This feature requires the <span className="font-medium text-amber-200">{min}</span> plan.
        {upgradeNeeded && (
          <>
            {' '}You currently have <span className="font-medium">{currentPlan}</span>.
          </>
        )}
      </p>
      <Link
        href={`/en/subscribe/${min}`}
        className="inline-block rounded bg-amber-500 px-5 py-2 text-sm font-medium text-black shadow hover:bg-amber-400"
      >
        Upgrade to {min}
      </Link>
    </div>
  );
}

export default RequirePlan;
