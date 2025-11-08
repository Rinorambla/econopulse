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
  try {
    if (!raw) return 'free';
    const v = raw.toLowerCase();
    if (v.startsWith('prem') || v.includes('premium')) return 'premium';
    if (v === 'trial') return 'premium';
    // Only allow 'free' explicitly; anything else is treated as free without logging spam
    return 'free';
  } catch {
    return 'free';
  }
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
