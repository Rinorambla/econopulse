import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Handles the OAuth redirect from Supabase (Apple, Google, etc).
// Supabase redirects to this route with ?code=... and we exchange it
// for a session cookie that the server can read.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/ai-pulse';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('OAuth exchange error:', error.message);
      return NextResponse.redirect(`${url.origin}/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  return NextResponse.redirect(`${url.origin}${next}`);
}
