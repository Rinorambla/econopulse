/**
 * Subscription core — Stripe is the single source of truth.
 *
 * The DB is a CACHE. Every webhook event and every post-redirect sync ends up
 * calling `syncStripeData(customerId)`. This function:
 *   1. Reads the latest subscription state from Stripe for that customer.
 *   2. Writes it to public.users.
 *
 * That's it. One function. Everything calls it. No drift possible.
 *
 * Reference: Theo / "How I Stay Sane Implementing Stripe" pattern.
 */
import Stripe from 'stripe';
import { stripe } from './stripe-server';
import { supabaseAdmin } from './supabase-admin';

export type Plan = 'free' | 'premium';

/**
 * Derive the simple Plan tier from a Stripe subscription status.
 * Active, trialing, and past_due all keep premium access (past_due gives users
 * a grace period to update their card).
 */
export function statusToPlan(status: string | null | undefined): Plan {
  if (!status) return 'free';
  return ['active', 'trialing', 'past_due'].includes(status) ? 'premium' : 'free';
}

export interface SubscriptionSnapshot {
  customerId: string;
  subscriptionId: string | null;
  status: Stripe.Subscription.Status | 'free';
  priceId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
  plan: Plan;
}

/**
 * Pull the latest subscription state from Stripe for a customer and persist
 * it to public.users. Returns the resolved snapshot.
 *
 * Looks up the user row by stripe_customer_id. If no matching row exists,
 * does nothing (the row is created by the checkout endpoint before redirect).
 */
export async function syncStripeData(customerId: string): Promise<SubscriptionSnapshot> {
  const s = stripe();

  // List ALL subscriptions for the customer (any status) and pick the most
  // relevant one. We prefer active/trialing/past_due > others; among those,
  // pick the most recently created.
  const subs = await s.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 5,
    expand: ['data.default_payment_method'],
  });

  const ranked = [...subs.data].sort((a, b) => {
    const rank = (sub: Stripe.Subscription) => {
      if (['active', 'trialing'].includes(sub.status)) return 3;
      if (sub.status === 'past_due') return 2;
      if (['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status)) return 0;
      return 1;
    };
    const dr = rank(b) - rank(a);
    if (dr !== 0) return dr;
    return (b.created || 0) - (a.created || 0);
  });

  const sub: Stripe.Subscription | undefined = ranked[0];

  let snapshot: SubscriptionSnapshot;
  if (!sub) {
    snapshot = {
      customerId,
      subscriptionId: null,
      status: 'free',
      priceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      trialEnd: null,
      plan: 'free',
    };
  } else {
    const periodEnd = (sub as any).current_period_end as number | undefined;
    const trialEnd = (sub as any).trial_end as number | null | undefined;
    snapshot = {
      customerId,
      subscriptionId: sub.id,
      status: sub.status,
      priceId: sub.items.data[0]?.price?.id || null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      trialEnd: trialEnd ? new Date(trialEnd * 1000) : null,
      plan: statusToPlan(sub.status),
    };
  }

  // Persist to DB. We use stripe_customer_id as the lookup key.
  const db = supabaseAdmin();
  const updatePayload: Record<string, any> = {
    stripe_customer_id: snapshot.customerId,
    stripe_subscription_id: snapshot.subscriptionId,
    subscription_id: snapshot.subscriptionId, // legacy column
    subscription_status: snapshot.status,
    subscription_tier: snapshot.plan,
    cancel_at_period_end: snapshot.cancelAtPeriodEnd,
    next_billing_date: snapshot.currentPeriodEnd?.toISOString() || null,
    trial_end_date: snapshot.trialEnd?.toISOString() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db
    .from('users')
    .update(updatePayload)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('[syncStripeData] DB update failed for customer', customerId, error.message);
  }

  return snapshot;
}

/**
 * Find or create the Stripe customer that corresponds to a Supabase user.
 *
 * Resolution order:
 *   1. If users.stripe_customer_id is set, use it.
 *   2. Otherwise, search Stripe for a customer with the same email.
 *   3. Otherwise, create a new Stripe customer.
 * In all cases, persist the resulting customer ID to users.stripe_customer_id.
 */
export async function getOrCreateCustomer(params: {
  userId: string;
  email: string;
}): Promise<string> {
  const { userId, email } = params;
  const s = stripe();
  const db = supabaseAdmin();

  const { data: existing } = await db
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  // Search by email (handles users who created accounts before this code)
  const search = await s.customers.list({ email, limit: 1 });
  let customerId: string;
  if (search.data.length > 0) {
    customerId = search.data[0].id;
    // Make sure the customer carries our user id in metadata
    if (!search.data[0].metadata?.supabaseUserId) {
      await s.customers.update(customerId, {
        metadata: { ...search.data[0].metadata, supabaseUserId: userId },
      });
    }
  } else {
    const created = await s.customers.create({
      email,
      metadata: { supabaseUserId: userId },
    });
    customerId = created.id;
  }

  // Upsert so missing rows (no profile trigger) get created.
  await db
    .from('users')
    .upsert(
      {
        id: userId,
        email,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

  return customerId;
}

/**
 * Resolve a user's current subscription snapshot, syncing from Stripe if we
 * have a customer ID. Useful for /api/me when we want fresh data.
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionSnapshot | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('users')
    .select('stripe_customer_id, stripe_subscription_id, subscription_status, subscription_tier, cancel_at_period_end, next_billing_date, trial_end_date')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  if (!data.stripe_customer_id) {
    return {
      customerId: '',
      subscriptionId: null,
      status: 'free',
      priceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      trialEnd: null,
      plan: 'free',
    };
  }

  return {
    customerId: data.stripe_customer_id,
    subscriptionId: data.stripe_subscription_id || null,
    status: (data.subscription_status as any) || 'free',
    priceId: null,
    currentPeriodEnd: data.next_billing_date ? new Date(data.next_billing_date) : null,
    cancelAtPeriodEnd: !!data.cancel_at_period_end,
    trialEnd: data.trial_end_date ? new Date(data.trial_end_date) : null,
    plan: statusToPlan(data.subscription_status),
  };
}
