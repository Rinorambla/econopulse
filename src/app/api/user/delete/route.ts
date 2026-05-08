import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

/**
 * DELETE /api/user/delete
 *
 * GDPR / Apple App Store compliant account deletion.
 * Required by Apple App Store Review Guideline 5.1.1(v) (since June 30, 2022).
 *
 * Behavior:
 *  1. Authenticates the caller via Supabase session cookie OR Bearer token.
 *  2. Cancels any active Stripe subscription (best-effort).
 *  3. Deletes user-owned rows in `portfolios` (and any other user-scoped tables).
 *  4. Deletes the row in `public.users`.
 *  5. Deletes the auth user via Supabase admin API.
 *
 * Body (optional): { confirm: "DELETE" } — UI sends this to prevent accidental calls.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const authHeader = request.headers.get('authorization');
    let bearerToken: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      bearerToken = authHeader.slice(7);
    }

    const supabase = await createServerClient();
    let { data: { user }, error: userErr } = await supabase.auth.getUser();

    if ((!user || userErr) && bearerToken) {
      try {
        const profileRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
          cache: 'no-store',
        });
        if (profileRes.ok) {
          user = (await profileRes.json()) as any;
          userErr = undefined as any;
        }
      } catch {
        // ignore
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Optional confirmation token
    let body: any = {};
    try { body = await request.json(); } catch { /* no body */ }
    if (body?.confirm && body.confirm !== 'DELETE') {
      return NextResponse.json({ error: 'Invalid confirmation' }, { status: 400 });
    }

    const userId = user.id;
    const userEmail = user.email;

    // 3. Service-role admin client
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: 'Server not configured for account deletion' },
        { status: 500 }
      );
    }
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 4. Cancel Stripe subscription (best-effort)
    try {
      const { data: profile } = await admin
        .from('users')
        .select('subscription_id, stripe_customer_id')
        .eq('id', userId)
        .single();

      if (profile?.subscription_id && process.env.STRIPE_SECRET_KEY) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2025-06-30.basil',
        });
        try {
          await stripe.subscriptions.cancel(profile.subscription_id);
        } catch (e) {
          console.warn('[delete-account] Stripe cancel failed:', (e as Error).message);
        }
      }
    } catch (e) {
      console.warn('[delete-account] Profile lookup failed:', (e as Error).message);
    }

    // 5. Delete user-scoped rows (best-effort, do not block on errors)
    const userTables = ['portfolios', 'watchlists', 'user_preferences', 'user_alerts'];
    for (const table of userTables) {
      try {
        await admin.from(table).delete().eq('user_id', userId);
      } catch {
        // table may not exist — ignore
      }
    }

    // 6. Delete profile row
    try {
      await admin.from('users').delete().eq('id', userId);
    } catch (e) {
      console.warn('[delete-account] users row delete failed:', (e as Error).message);
    }

    // 7. Delete auth user
    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      console.error('[delete-account] auth.admin.deleteUser failed:', deleteErr);
      return NextResponse.json(
        { error: 'Failed to delete account', details: deleteErr.message },
        { status: 500 }
      );
    }

    // 8. Sign out current session
    try { await supabase.auth.signOut(); } catch { /* ignore */ }

    console.log(`[delete-account] Account deleted: ${userEmail} (${userId})`);

    const response = NextResponse.json({
      success: true,
      message: 'Account and all associated data have been permanently deleted.',
    });
    // Clear common auth cookies defensively
    response.cookies.set('sb-access-token', '', { maxAge: 0, path: '/' });
    response.cookies.set('sb-refresh-token', '', { maxAge: 0, path: '/' });
    return response;
  } catch (error: any) {
    console.error('[delete-account] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}

// GET returns metadata so clients can show what will be deleted
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/user/delete',
    method: 'POST',
    requires: 'Authenticated session (cookie or Bearer token)',
    deletes: [
      'Authentication identity (email, password)',
      'User profile (users table)',
      'Portfolios, watchlists, preferences, alerts',
      'Active Stripe subscription (cancelled)',
    ],
    irreversible: true,
  });
}
