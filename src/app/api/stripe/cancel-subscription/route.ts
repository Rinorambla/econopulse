import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-06-30.basil' });

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId } = await req.json();
    if (!subscriptionId) return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Optionally ensure subscription belongs to this customer (fetch sub & compare metadata supabase_user_id)
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subUserId = (subscription.metadata as any)?.supabase_user_id;
    if (subUserId && subUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    return NextResponse.json({ ok: true, subscription: { id: updated.id, status: updated.status, cancel_at_period_end: updated.cancel_at_period_end, current_period_end: (updated as any).current_period_end } });
  } catch (e:any) {
    console.error('cancel-subscription error', e);
    return NextResponse.json({ ok: false, error: e.message || 'failed' }, { status: 500 });
  }
}