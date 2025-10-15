import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// Lazy init (build-safe). Do NOT force non-null ! at module scope.
let stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null; // guard so build doesn't throw
  stripe = new Stripe(key, { apiVersion: '2025-06-30.basil' });
  return stripe;
}

export async function POST(req: NextRequest) {
  try {
    const client = getStripe();
    if (!client) {
      return NextResponse.json({ error: 'Stripe not configured', demo: true }, { status: 503 });
    }

    const { subscriptionId } = await req.json();
    if (!subscriptionId) return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 });

    // Extract bearer token (mirroring pattern from create-checkout-session)
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Ensure subscription belongs to this user (if metadata present)
    const subscription = await client.subscriptions.retrieve(subscriptionId);
    const subUserId = (subscription.metadata as any)?.supabase_user_id;
    if (subUserId && subUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await client.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    return NextResponse.json({
      ok: true,
      subscription: {
        id: updated.id,
        status: updated.status,
        cancel_at_period_end: updated.cancel_at_period_end,
        current_period_end: (updated as any).current_period_end
      }
    });
  } catch (e: any) {
    console.error('cancel-subscription error', e);
    return NextResponse.json({ ok: false, error: e.message || 'failed' }, { status: 500 });
  }
}