/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for the authenticated user.
 *
 * Flow:
 *  1. Verify Supabase auth (Bearer token or cookie).
 *  2. Ensure the user has a Stripe customer (create or look up).
 *  3. Create Checkout Session in subscription mode with 14-day trial.
 *  4. Return the Checkout URL — client will redirect.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabase as supabaseAnon } from '@/lib/supabase';
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe-server';
import { getOrCreateCustomer } from '@/lib/subscription';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(`stripe-checkout:${ip}`, 5, 300_000); // 5/5min
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  try {
    // --- Auth: try Bearer token first, then cookie session
    let userId: string | undefined;
    let userEmail: string | undefined;

    const auth = request.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) {
      const token = auth.slice(7);
      const { data, error } = await supabaseAnon.auth.getUser(token);
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
    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: rateLimitHeaders(rl) });
    }

    // --- Body
    const body = await request.json().catch(() => ({}));
    const billingCycle: 'monthly' | 'yearly' = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const locale: 'en' | 'it' = body.locale === 'it' ? 'it' : 'en';
    const origin = request.nextUrl.origin;

    // Only accept same-origin redirect URLs (prevents open-redirect abuse).
    const sameOrigin = (raw: unknown): string | null => {
      if (typeof raw !== 'string') return null;
      try {
        // {CHECKOUT_SESSION_ID} is a Stripe template token, not valid URL chars — strip for validation only.
        const candidate = new URL(raw.replace('{CHECKOUT_SESSION_ID}', 'x'), origin);
        return candidate.origin === origin ? raw : null;
      } catch {
        return null;
      }
    };
    const successUrl: string = sameOrigin(body.successUrl)
      ?? `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl: string = sameOrigin(body.cancelUrl)
      ?? `${origin}/pricing?checkout=cancelled`;

    const priceId = billingCycle === 'yearly' ? STRIPE_PRICE_IDS.yearly : STRIPE_PRICE_IDS.monthly;
    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe price ID for ${billingCycle} plan is not configured` },
        { status: 500, headers: rateLimitHeaders(rl) },
      );
    }

    // --- Customer
    const customerId = await getOrCreateCustomer({ userId, email: userEmail });

    const s = stripe();

    // --- Trial abuse prevention: only grant the 14-day trial to customers who
    // have NEVER had a subscription before. Cancel + re-subscribe = no new trial.
    let trialEligible = true;
    try {
      const previous = await s.subscriptions.list({ customer: customerId, status: 'all', limit: 1 });
      trialEligible = previous.data.length === 0;
    } catch (e: any) {
      console.warn('[checkout] trial eligibility check failed (defaulting to no trial):', e?.message);
      trialEligible = false;
    }

    // --- Create session
    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_collection: 'always',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      locale,
      subscription_data: {
        ...(trialEligible ? { trial_period_days: 14 } : {}),
        metadata: { supabaseUserId: userId },
      },
      metadata: { supabaseUserId: userId },
      client_reference_id: userId,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id }, { headers: rateLimitHeaders(rl) });
  } catch (e: any) {
    console.error('[checkout] error:', e?.message, e);
    const payload: any = { error: e?.message || 'Failed to create checkout session' };
    if (e?.type === 'StripeAuthenticationError') {
      payload.hint = 'Check STRIPE_SECRET_KEY and that price IDs match the LIVE environment.';
    }
    return NextResponse.json(payload, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
