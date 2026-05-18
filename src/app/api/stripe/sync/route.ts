/**
 * POST /api/stripe/sync
 *
 * Authenticated user triggers a sync of their own subscription from Stripe.
 * Called by:
 *   - The post-checkout redirect handler (immediately after Stripe Checkout)
 *   - The "Sincronizza abbonamento" button in the account dashboard
 *
 * If the user has no stripe_customer_id in DB yet, we look it up by email.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseAnon } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';
import { stripe } from '@/lib/stripe-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { syncStripeData, statusToPlan } from '@/lib/subscription';
import type Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Auth
    let userId: string | undefined;
    let userEmail: string | undefined;
    const auth = req.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) {
      const { data, error } = await supabaseAnon.auth.getUser(auth.slice(7));
      if (!error && data.user) {
        userId = data.user.id;
        userEmail = data.user.email || undefined;
      }
    }
    if (!userId) {
      const supa = await createClient();
      const { data } = await supa.auth.getUser();
      if (data.user) {
        userId = data.user.id;
        userEmail = data.user.email || undefined;
      }
    }
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Optional checkout session id from body (passed by post-checkout handler).
    // When present, we resolve the customer DIRECTLY from Stripe (most reliable).
    let sessionId: string | undefined;
    try {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.sessionId === 'string' && body.sessionId.startsWith('cs_')) {
        sessionId = body.sessionId;
      }
    } catch { /* no body, that's fine */ }

    // Find customer ID
    const db = supabaseAdmin();
    const { data: row } = await db
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .maybeSingle();

    let customerId = row?.stripe_customer_id as string | undefined | null;
    const email = row?.email || userEmail;

    // 1) Preferred: resolve from the just-completed Checkout Session.
    // We also pull the subscription FROM THE SESSION directly — this avoids
    // the Stripe eventual-consistency race where subscriptions.list() may not
    // yet return the subscription created milliseconds ago.
    let sessionSub: Stripe.Subscription | null = null;
    if (sessionId) {
      try {
        const cs = await stripe().checkout.sessions.retrieve(sessionId, {
          expand: ['subscription', 'customer'],
        });
        const cust = cs.customer;
        if (typeof cust === 'string') customerId = customerId || cust;
        else if (cust && typeof cust === 'object' && 'id' in cust) customerId = customerId || (cust as any).id;
        const sub = cs.subscription;
        if (sub && typeof sub === 'object' && 'id' in sub) {
          sessionSub = sub as Stripe.Subscription;
        } else if (typeof sub === 'string') {
          // sub is just an id; retrieve it
          try {
            sessionSub = await stripe().subscriptions.retrieve(sub);
          } catch (e: any) {
            console.warn('[sync] subscriptions.retrieve failed:', e?.message);
          }
        }
      } catch (e: any) {
        console.warn('[sync] could not retrieve checkout session:', e?.message);
      }
    }

    // 2) Fallback: lookup by email
    if (!customerId && email) {
      const list = await stripe().customers.list({ email, limit: 1 });
      if (list.data.length > 0) {
        customerId = list.data[0].id;
      }
    }

    // 3) Last resort: search Stripe customers by metadata.supabaseUserId
    if (!customerId) {
      try {
        const search = await stripe().customers.search({
          query: `metadata['supabaseUserId']:'${userId}'`,
          limit: 1,
        });
        if (search.data.length > 0) customerId = search.data[0].id;
      } catch (e: any) {
        console.warn('[sync] customers.search failed:', e?.message);
      }
    }

    if (!customerId) {
      return NextResponse.json({ ok: false, plan: 'free', reason: 'no_customer' });
    }

    // Ensure public.users row exists for this auth user and is linked to the customer.
    // (Trigger may not have run for older accounts.)
    const linkUpsert = await db.from('users').upsert(
      {
        id: userId,
        email: email || null,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (linkUpsert.error) {
      console.error('[sync] link upsert failed:', linkUpsert.error.message);
    }

    // Build snapshot. If we have the subscription directly from the just-completed
    // Checkout Session, USE IT — this bypasses Stripe's list() eventual-consistency
    // window that otherwise causes the user to be persisted as 'free' right after
    // a successful payment.
    let snapshot = await syncStripeData(customerId);
    if (sessionSub) {
      const status = sessionSub.status;
      const plan = statusToPlan(status);
      // If list() returned nothing or an older sub, prefer the session sub if it
      // is active / trialing / past_due (i.e. the just-paid one).
      if (snapshot.plan === 'free' || snapshot.subscriptionId !== sessionSub.id) {
        if (['active', 'trialing', 'past_due'].includes(status)) {
          const periodEnd = (sessionSub as any).current_period_end as number | undefined;
          const trialEnd = (sessionSub as any).trial_end as number | null | undefined;
          snapshot = {
            customerId: customerId!,
            subscriptionId: sessionSub.id,
            status,
            priceId: sessionSub.items.data[0]?.price?.id || null,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            cancelAtPeriodEnd: !!sessionSub.cancel_at_period_end,
            trialEnd: trialEnd ? new Date(trialEnd * 1000) : null,
            plan,
          };
        }
      }
    }

    // Also persist the full snapshot keyed by user id, so even if syncStripeData
    // couldn't find a row by stripe_customer_id (e.g. race/missing row), we have
    // the authoritative state stored.
    const snapshotUpsert = await db.from('users').upsert(
      {
        id: userId,
        email: email || null,
        stripe_customer_id: snapshot.customerId,
        stripe_subscription_id: snapshot.subscriptionId,
        subscription_id: snapshot.subscriptionId,
        subscription_status: snapshot.status,
        subscription_tier: snapshot.plan,
        cancel_at_period_end: snapshot.cancelAtPeriodEnd,
        next_billing_date: snapshot.currentPeriodEnd?.toISOString() || null,
        trial_end_date: snapshot.trialEnd?.toISOString() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (snapshotUpsert.error) {
      console.error('[sync] snapshot upsert failed:', snapshotUpsert.error.message);
    }

    return NextResponse.json({
      ok: true,
      plan: snapshot.plan,
      status: snapshot.status,
      cancel_at_period_end: snapshot.cancelAtPeriodEnd,
      current_period_end: snapshot.currentPeriodEnd?.getTime() ? Math.floor(snapshot.currentPeriodEnd.getTime() / 1000) : null,
      subscription_id: snapshot.subscriptionId,
    });
  } catch (e: any) {
    console.error('[sync] error:', e?.message);
    return NextResponse.json({ error: e?.message || 'sync failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
