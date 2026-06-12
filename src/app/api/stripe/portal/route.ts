/**
 * POST /api/stripe/portal
 * Opens the Stripe Customer Portal for the authenticated user, where they can:
 *   - Update payment method
 *   - Cancel subscription
 *   - View invoices
 *   - Change plan (if portal is configured to allow it)
 *
 * This is the SaaS-standard way to handle subscription management. We do NOT
 * build custom cancel/update endpoints — Stripe Portal is more secure, more
 * complete, and updates flow back via webhook.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseAnon } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';
import { stripe } from '@/lib/stripe-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(`stripe-portal:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  try {
    let userId: string | undefined;
    let userEmail: string | undefined;
    const auth = request.headers.get('authorization');
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
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: rateLimitHeaders(rl) });
    }

    // The Customer Portal only makes sense when the user already has a Stripe
    // customer record (created during checkout). If they don't, send them to
    // /pricing instead of silently creating an empty customer.
    const db = supabaseAdmin();
    const { data: row } = await db
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    let customerId = row?.stripe_customer_id as string | undefined | null;

    // Last-chance lookup by email (covers cases where DB link is missing)
    if (!customerId && userEmail) {
      try {
        const list = await stripe().customers.list({ email: userEmail, limit: 1 });
        if (list.data.length > 0) customerId = list.data[0].id;
      } catch { /* ignore */ }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'You do not have an active subscription yet.', redirect: '/pricing' },
        { status: 400, headers: rateLimitHeaders(rl) },
      );
    }

    const body = await request.json().catch(() => ({}));
    const origin = request.nextUrl.origin;
    let returnUrl = `${origin}/dashboard/account`;
    if (typeof body.returnUrl === 'string') {
      try {
        const candidate = new URL(body.returnUrl, origin);
        if (candidate.origin === origin) returnUrl = body.returnUrl;
      } catch { /* keep default */ }
    }
    const locale: 'en' | 'it' = body.locale === 'it' ? 'it' : 'en';

    const session = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
      locale,
    });

    return NextResponse.json({ url: session.url }, { headers: rateLimitHeaders(rl) });
  } catch (e: any) {
    console.error('[portal] error:', e?.message);
    const msg = e?.message || 'Failed to open portal';
    const hint = /No configuration provided/i.test(msg)
      ? 'Stripe Customer Portal is not configured. Go to Stripe Dashboard → Settings → Billing → Customer Portal and click Save.'
      : undefined;
    return NextResponse.json(
      { error: msg, hint },
      { status: 500, headers: rateLimitHeaders(rl) },
    );
  }
}
