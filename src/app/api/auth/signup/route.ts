import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'User ID and email are required' }, { status: 400 });
    }

    // Upsert profile row. We set status='free'; an actual subscription/trial
    // starts only when the user goes through Stripe Checkout, after which
    // syncStripeData() writes the correct status ('trialing' or 'active').
    const db = supabaseAdmin();
    const { error: dbError } = await db
      .from('users')
      .upsert(
        {
          id: userId,
          email,
          full_name: fullName || null,
          subscription_status: 'free',
          subscription_tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

    if (dbError) {
      console.error('[signup] DB error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'User profile created' });
  } catch (error: any) {
    console.error('[signup] error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
