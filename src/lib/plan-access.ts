export type PlanTier = 'free' | 'premium';

// Ordered list for comparison semantics (index = rank)
const PLAN_ORDER: PlanTier[] = ['free', 'premium'];

export function planRank(tier: PlanTier | string | null | undefined): number {
  if (!tier) return 0; // Default to free (rank 0)
  const idx = PLAN_ORDER.indexOf(tier as PlanTier);
  return idx >= 0 ? idx : 0;
}

export function hasAccess(userTier: PlanTier | string | null | undefined, required: PlanTier): boolean {
  return planRank(userTier) >= planRank(required);
}

export function normalizePlan(raw: string | null | undefined): PlanTier {
  if (!raw) return 'free'; // Default to free when no subscription
  const v = raw.toLowerCase();
  
  // Debug logging for Vercel
  console.log('🔍 normalizePlan input:', raw, 'lowercase:', v);
  
  if (v.startsWith('prem') || v.includes('premium')) return 'premium';
  if (v === 'trial') {
    console.log('✅ Trial detected - granting premium access');
    return 'premium'; // Trial users get premium access during 14 days
  }
  
  console.log('⚠️ Unknown plan, defaulting to free:', v);
  return 'free'; // Default fallback
}

export function nextUpgrade(from: PlanTier): PlanTier | null {
  const r = planRank(from);
  if (r < PLAN_ORDER.length - 1) return PLAN_ORDER[r+1];
  return null;
}

export const PLAN_LABEL: Record<PlanTier,string> = {
  free: 'Free',
  premium: 'Premium AI'
};
