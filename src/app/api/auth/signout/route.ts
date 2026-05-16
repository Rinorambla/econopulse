import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Supabase signout error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const res = NextResponse.json({ message: 'Signed out successfully' });
    // Wipe plan-hydration cookies so the next page render starts clean
    res.cookies.set('ep_plan', '', { path: '/', maxAge: 0, sameSite: 'lax' });
    res.cookies.set('ep_admin', '', { path: '/', maxAge: 0, sameSite: 'lax' });
    return res;
  } catch (error: any) {
    console.error('Signout API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
