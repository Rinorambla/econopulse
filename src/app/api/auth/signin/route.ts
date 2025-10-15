import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Sign in the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Supabase auth signin error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user || !authData.session) {
      return NextResponse.json({ error: 'Failed to sign in' }, { status: 400 });
    }

    // Get user profile from our custom users table
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // Auth successful but no profile - create one
      const { error: createError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          full_name: authData.user.user_metadata?.full_name || null,
          subscription_status: 'free',
        });

      if (createError) {
        console.error('Profile creation error:', createError);
      }
    }

    return NextResponse.json({
      message: 'Signed in successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName: profileData?.full_name || authData.user.user_metadata?.full_name,
        subscriptionStatus: profileData?.subscription_status || 'free',
      },
      session: {
        access_token: authData.session.access_token,
        expires_at: authData.session.expires_at,
      },
    });

  } catch (error: any) {
    console.error('Signin API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
