// API Route: /api/stripe/sync-mine
// Recovery endpoint: re-syncs the authenticated user's subscription state
// from Stripe (latest subscription of their customer record) into Supabase.
// Useful when the webhook didn't fire or was misconfigured.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  _stripe = new Stripe(key, { apiVersion: '2025-06-30.basil' });
  return _stripe;
}

function mapStatus(status: string): string {
  if (status === 'trialing') return 'trial';
  if (status === 'active' || status === 'past_due') return 'premium';
  if (['canceled', 'cancelled', 'incomplete_expired', 'unpaid'].includes(status)) return 'free';
  return status;
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find user's Stripe customer ID. Prefer DB record; fallback to lookup by email.
    const { data: profile } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id as string | null | undefined;
    const email = profile?.email || user.email;

    if (!customerId && email) {
      const list = await stripe.customers.list({ email, limit: 1 });
      if (list.data.length > 0) customerId = list.data[0].id;
    }

    if (!customerId) {
      return NextResponse.json({ ok: false, error: 'No Stripe customer found for this user' }, { status: 404 });
    }

    // Get the most recent subscription for this customer (any status)
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 1,
    });

    if (subs.data.length === 0) {
      return NextResponse.json({ ok: false, error: 'No subscription found on Stripe for this customer' }, { status: 404 });
    }

    const subscription = subs.data[0];
    const mappedStatus = mapStatus(subscription.status);
    const periodEndIso = (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000).toISOString()
      : null;
    const trialEndIso = (subscription as any).trial_end
      ? new Date((subscription as any).trial_end * 1000).toISOString()
      : null;

    const { error: updErr } = await supabase
      .from('users')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_id: subscription.id,
        subscription_status: mappedStatus,
        subscription_tier: mappedStatus === 'free' ? 'free' : 'premium',
        cancel_at_period_end: !!subscription.cancel_at_period_end,
        next_billing_date: periodEndIso,
        trial_end_date: trialEndIso,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updErr) {
      console.error('sync-mine DB update failed:', updErr);
      return NextResponse.json({ ok: false, error: 'DB update failed', details: updErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      plan: mappedStatus === 'free' ? 'free' : 'premium',
      subscription_status: mappedStatus,
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      current_period_end: (subscription as any).current_period_end || null,
      stripe_subscription_id: subscription.id,
    });
  } catch (e: any) {
    console.error('sync-mine error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 });
  }
}
