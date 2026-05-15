// API Route: /api/stripe/sync-session
// Called after Stripe Checkout redirect to immediately sync the user's
// subscription state from Stripe into Supabase, without waiting for the webhook.

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
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { sessionId } = await req.json().catch(() => ({}));
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Retrieve the Checkout Session + expanded subscription
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (!session.subscription) {
      return NextResponse.json({ ok: false, error: 'No subscription on session' }, { status: 400 });
    }

    const subscription = typeof session.subscription === 'string'
      ? await stripe.subscriptions.retrieve(session.subscription)
      : (session.subscription as Stripe.Subscription);

    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : (subscription.customer as Stripe.Customer).id;

    // Verify the customer belongs to this Supabase user
    const sessionUserId = (session.metadata as any)?.userId
      || (session.metadata as any)?.supabase_user_id
      || (subscription.metadata as any)?.supabase_user_id
      || (subscription.metadata as any)?.userId;
    if (sessionUserId && sessionUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
        subscription_tier: 'premium',
        cancel_at_period_end: !!subscription.cancel_at_period_end,
        next_billing_date: periodEndIso,
        trial_end_date: trialEndIso,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updErr) {
      console.error('sync-session DB update failed:', updErr);
      return NextResponse.json({ ok: false, error: 'DB update failed', details: updErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      plan: mappedStatus === 'free' ? 'free' : 'premium',
      subscription_status: mappedStatus,
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      current_period_end: (subscription as any).current_period_end || null,
    });
  } catch (e: any) {
    console.error('sync-session error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 });
  }
}
