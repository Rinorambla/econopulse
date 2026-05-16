import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`auth-resend:${ip}`, 3, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400, headers: rateLimitHeaders(rl) },
      );
    }

    const origin = req.nextUrl.origin;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: rateLimitHeaders(rl) },
      );
    }

    return NextResponse.json(
      { ok: true, message: 'Confirmation email re-sent.' },
      { headers: rateLimitHeaders(rl) },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to resend confirmation' },
      { status: 500, headers: rateLimitHeaders(rl) },
    );
  }
}
