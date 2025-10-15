import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { normalizePlan } from '@/lib/plan-access';

let stripe: Stripe | null = null;
function getStripe() {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null; // build-safe guard
  stripe = new Stripe(key, { apiVersion: '2025-06-30.basil' });
  return stripe;
}

export async function POST(req: NextRequest) {
  try {
    const client = getStripe();
    if (!client) {
      return NextResponse.json({ error: 'Stripe not configured', demo: true }, { status: 503 });
    }

    const { plan, priceId, billingCycle } = await req.json();
    if (!plan || !priceId) {
      return NextResponse.json({ error: 'Missing plan or priceId' }, { status: 400 });
    }

    // Get authorization header and extract token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Get current authenticated user using the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.log('Auth error:', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tier = normalizePlan(plan);
    const planMeta = (SUBSCRIPTION_PLANS as any)[tier];
    if (!planMeta) {
      return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
    }
    // Validate priceId belongs to selected tier
    if (![planMeta.priceId, planMeta.yearlyPriceId].includes(priceId)) {
      return NextResponse.json({ error: 'Price mismatch' }, { status: 400 });
    }

    // Upsert user row to ensure stripe_customer_id placeholder
    let stripeCustomerId: string | null = null;
    const { data: profile } = await supabase
      .from('users')
      .select('id, stripe_customer_id, email')
      .eq('id', user.id)
      .single();
    stripeCustomerId = (profile as any)?.stripe_customer_id || null;

    // If user doesn't yet have Stripe customer, create one
    if (!stripeCustomerId) {
      const customer = await client.customers.create({
        email: user.email || undefined,
        metadata: { supabase_user_id: user.id }
      });
      stripeCustomerId = customer.id;
      await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString()
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const sessionRes = await client.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/en/subscribe/${tier}?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/en/subscribe/${tier}?canceled=1`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        metadata: { plan: tier, supabase_user_id: user.id, billing_cycle: billingCycle || 'monthly' }
      },
      metadata: { plan: tier, supabase_user_id: user.id }
    });

    return NextResponse.json({ ok: true, url: sessionRes.url });
  } catch (e:any) {
    console.error('create-checkout-session error', e);
    return NextResponse.json({ ok: false, error: e.message || 'failed' }, { status: 500 });
  }
}
