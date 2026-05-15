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
import { getOrCreateCustomer } from '@/lib/subscription';
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
    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: rateLimitHeaders(rl) });
    }

    const body = await request.json().catch(() => ({}));
    const returnUrl: string = typeof body.returnUrl === 'string'
      ? body.returnUrl
      : `${request.nextUrl.origin}/dashboard/account`;

    const customerId = await getOrCreateCustomer({ userId, email: userEmail });

    const session = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url }, { headers: rateLimitHeaders(rl) });
  } catch (e: any) {
    console.error('[portal] error:', e?.message);
    return NextResponse.json({ error: e?.message || 'Failed to open portal' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
