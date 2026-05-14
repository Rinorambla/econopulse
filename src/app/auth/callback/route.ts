import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Handles the OAuth redirect from Supabase (Apple, Google, etc).
// Supabase redirects to this route with ?code=... and we exchange it
// for a session cookie that the server can read.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');
  const errorDesc = url.searchParams.get('error_description');
  const next = url.searchParams.get('next') || '/ai-pulse';

  if (errorParam) {
    console.error('[auth/callback] provider error:', errorParam, errorDesc);
    return NextResponse.redirect(
      `${url.origin}/login?error=${encodeURIComponent(errorDesc || errorParam)}`
    );
  }

  if (!code) {
    console.error('[auth/callback] no code in callback URL:', url.toString());
    return NextResponse.redirect(`${url.origin}/login?error=missing_code`);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/callback] exchange error:', error.message);
      return NextResponse.redirect(
        `${url.origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
    console.log('[auth/callback] success, user:', data.user?.email);
    return NextResponse.redirect(`${url.origin}${next}`);
  } catch (e: any) {
    console.error('[auth/callback] exception:', e?.message || e);
    return NextResponse.redirect(
      `${url.origin}/login?error=${encodeURIComponent(e?.message || 'callback_failed')}`
    );
  }
}
