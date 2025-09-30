export type PlanTier = 'pro' | 'premium' | 'corporate';

// Ordered list for comparison semantics (index = rank)
const PLAN_ORDER: PlanTier[] = ['pro','premium','corporate'];

export function planRank(tier: PlanTier | string | null | undefined): number {
  if (!tier) return 0;
  const idx = PLAN_ORDER.indexOf(tier as PlanTier);
  return idx >= 0 ? idx : 0;
}

export function hasAccess(userTier: PlanTier | string | null | undefined, required: PlanTier): boolean {
  return planRank(userTier) >= planRank(required);
}

export function normalizePlan(raw: string | null | undefined): PlanTier {
  if (!raw) return 'pro'; // Default to pro when no subscription
  const v = raw.toLowerCase();
  if (v.startsWith('corp')) return 'corporate';
  if (v.startsWith('prem')) return 'premium';
  if (v.startsWith('pro')) return 'pro';
  if (v === 'trial') return 'premium'; // Trial users get premium access durante i 14 giorni
  return 'pro'; // Default fallback
}

export function nextUpgrade(from: PlanTier): PlanTier | null {
  const r = planRank(from);
  if (r < PLAN_ORDER.length - 1) return PLAN_ORDER[r+1];
  return null;
}

export const PLAN_LABEL: Record<PlanTier,string> = {
  pro: 'Pro',
  premium: 'Premium',
  corporate: 'Corporate'
};
