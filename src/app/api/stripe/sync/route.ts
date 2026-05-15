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

    // Find customer ID
    const db = supabaseAdmin();
    const { data: row } = await db
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .maybeSingle();

    let customerId = row?.stripe_customer_id as string | undefined | null;
    const email = row?.email || userEmail;

    if (!customerId && email) {
      const list = await stripe().customers.list({ email, limit: 1 });
      if (list.data.length > 0) {
        customerId = list.data[0].id;
      }
    }

    if (!customerId) {
      return NextResponse.json({ ok: false, plan: 'free', reason: 'no_customer' });
    }

    // Ensure public.users row exists for this auth user and is linked to the customer.
    // (Trigger may not have run for older accounts.)
    await db.from('users').upsert(
      {
        id: userId,
        email: email || null,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    const snapshot = await syncStripeData(customerId);
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
