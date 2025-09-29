import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { EmailService } from '@/services/EmailService';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    try {
      // Generate reauthentication link using Supabase
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/en/auth/callback?type=recovery`,
      });

      if (error) {
        console.error('Supabase reauth error:', error);
        return NextResponse.json({ error: 'Failed to send reauthentication email' }, { status: 500 });
      }

      // Note: Supabase handles sending the email automatically, but we can also send our custom one
      // For now, we'll rely on Supabase's built-in email system
      // If you want to use custom email templates, you'd need to handle the token generation differently

      console.log(`🔐 Reauthentication email requested for: ${email}`);

      return NextResponse.json({
        success: true,
        message: 'Reauthentication email sent successfully',
      });

    } catch (authError) {
      console.error('Authentication service error:', authError);
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
    }

  } catch (error) {
    console.error('Reauth API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check reauth status
export async function GET() {
  return NextResponse.json({
    service: 'reauthentication',
    status: 'active',
    message: 'Reauthentication service is operational',
  });
}