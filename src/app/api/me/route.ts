/**
 * GET /api/me
 * Returns the authenticated user's profile + subscription plan.
 *
 * Strategy:
 *  - Always no-store (no HTTP cache). Auth state must be fresh.
 *  - Reads cached subscription state from public.users (written by webhook + sync).
 *  - Admin email = unconditional premium.
 *  - Returns: { authenticated, id, email, plan: 'free'|'premium', subscription_status, current_period_end, cancel_at_period_end, subscription_id, isAdmin }
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabase as supabaseAnon } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { statusToPlan } from '@/lib/subscription';

const ADMIN_EMAIL = 'info@econopulse.ai';

function isAdmin(email?: string | null): boolean {
  return !!email && email.toLowerCase().trim() === ADMIN_EMAIL;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    // Resolve user (Bearer or cookie)
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
      const res = NextResponse.json({ authenticated: false, plan: 'free' });
      res.headers.set('Cache-Control', 'no-store');
      // Do NOT overwrite ep_plan cookie when unauthenticated. A transient
      // missing-token call (during hydration / navigation) would otherwise
      // stomp a valid 'premium' cookie to 'free' and cause UI flicker.
      return res;
    }

    if (isAdmin(userEmail)) {
      const res = NextResponse.json({
        authenticated: true,
        id: userId,
        email: userEmail,
        plan: 'premium',
        subscription_status: 'active',
        cancel_at_period_end: false,
        current_period_end: null,
        subscription_id: null,
        isAdmin: true,
      });
      res.headers.set('Cache-Control', 'no-store');
      res.cookies.set('ep_plan', 'premium', { path: '/', maxAge: 60, sameSite: 'lax', secure: true });
      res.cookies.set('ep_admin', '1', { path: '/', maxAge: 60, sameSite: 'lax', secure: true });
      return res;
    }

    // Fetch DB cache
    const db = supabaseAdmin();
    const { data } = await db
      .from('users')
      .select('email, subscription_status, stripe_customer_id, stripe_subscription_id, cancel_at_period_end, next_billing_date, trial_end_date')
      .eq('id', userId)
      .maybeSingle();

    const status = (data?.subscription_status as string | null) || 'free';
    const plan = statusToPlan(status);
    const periodEnd = data?.next_billing_date ? Math.floor(new Date(data.next_billing_date).getTime() / 1000) : null;

    const res = NextResponse.json({
      authenticated: true,
      id: userId,
      email: data?.email || userEmail,
      plan,
      subscription_status: status,
      cancel_at_period_end: !!data?.cancel_at_period_end,
      current_period_end: periodEnd,
      trial_end_date: data?.trial_end_date || null,
      stripe_customer_id: data?.stripe_customer_id || null,
      subscription_id: data?.stripe_subscription_id || null,
      isAdmin: false,
    });
    res.headers.set('Cache-Control', 'no-store');
    res.cookies.set('ep_plan', plan, { path: '/', maxAge: 60, sameSite: 'lax', secure: true });
    res.cookies.set('ep_admin', '0', { path: '/', maxAge: 60, sameSite: 'lax', secure: true });
    return res;
  } catch (e: any) {
    console.error('[/api/me] error:', e?.message);
    const res = NextResponse.json({ authenticated: false, plan: 'free', error: 'internal' }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}
