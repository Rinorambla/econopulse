import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'User ID and email are required' }, { status: 400 });
    }

    // Create user record in our users table with 14-day free trial
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 giorni da ora

    const { error: dbError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        subscription_status: 'trial',
        trial_end_date: trialEndDate.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'User record created successfully with 14-day free trial',
      trial_end_date: trialEndDate.toISOString(),
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
