/**
 * Server-side plan gating for API routes.
 *
 * Client-side gates (RequirePlan / PlanGate) only hide UI — anyone can call
 * the API directly. Premium API routes MUST call `requirePremium(req)` first.
 *
 * Auth resolution mirrors /api/me: Bearer token first, then cookie session.
 * Plan is read from the public.users cache (written by webhook + sync), so
 * this adds a single fast DB lookup and zero Stripe calls.
 */
import { NextResponse } from 'next/server';
import { supabase as supabaseAnon } from './supabase';
import { createClient } from './supabase-server';
import { supabaseAdmin } from './supabase-admin';
import { statusToPlan } from './subscription';

const ADMIN_EMAIL = 'info@econopulse.ai';

export type PremiumGate =
  | { ok: true; userId: string; email: string | null; isAdmin: boolean }
  | { ok: false; response: NextResponse };

export async function requirePremium(req: Request): Promise<PremiumGate> {
  let userId: string | undefined;
  let userEmail: string | undefined;

  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    try {
      const { data, error } = await supabaseAnon.auth.getUser(auth.slice(7));
      if (!error && data.user) {
        userId = data.user.id;
        userEmail = data.user.email || undefined;
      }
    } catch { /* fall through to cookie auth */ }
  }
  if (!userId) {
    try {
      const supa = await createClient();
      const { data } = await supa.auth.getUser();
      if (data.user) {
        userId = data.user.id;
        userEmail = data.user.email || undefined;
      }
    } catch { /* not authenticated */ }
  }

  if (!userId) {
    const res = NextResponse.json(
      { error: 'Authentication required', login: '/login' },
      { status: 401 },
    );
    res.headers.set('Cache-Control', 'no-store');
    return { ok: false, response: res };
  }

  if (userEmail && userEmail.toLowerCase().trim() === ADMIN_EMAIL) {
    return { ok: true, userId, email: userEmail, isAdmin: true };
  }

  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from('users')
      .select('subscription_status')
      .eq('id', userId)
      .maybeSingle();

    if (statusToPlan(data?.subscription_status) === 'premium') {
      return { ok: true, userId, email: userEmail || null, isAdmin: false };
    }
  } catch (e: any) {
    console.error('[requirePremium] DB lookup failed:', e?.message);
    // Fail closed: no verified premium state = no access.
  }

  const res = NextResponse.json(
    { error: 'Premium subscription required', upgrade: '/pricing' },
    { status: 403 },
  );
  res.headers.set('Cache-Control', 'no-store');
  return { ok: false, response: res };
}
