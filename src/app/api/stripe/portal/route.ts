// API Route: /api/stripe/portal
// Creates Stripe Customer Portal session for subscription management

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import StripeSubscriptionManager from '@/lib/stripe-enhanced';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimit(`stripe-portal:${clientIp}`, 10, 600000); // 10 requests per 10 minutes
  
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { error: 'Too many portal requests. Please try again later.' },
      { 
        status: 429,
        headers: rateLimitHeaders(rateLimitResult)
      }
    );
  }

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json();
    const { returnUrl } = body;

    // Get user profile with Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('stripe_customer_id, subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    // Check if user has a Stripe customer ID
    if (!profile.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe first.' },
        { status: 400, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    // Check if user has an active subscription
    if (!profile.subscription_tier || profile.subscription_tier === 'free') {
      return NextResponse.json(
        { error: 'No active subscription found. Please subscribe first.' },
        { status: 400, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    // Create portal session
    const portalSession = await StripeSubscriptionManager.createPortalSession({
      customerId: profile.stripe_customer_id,
      returnUrl: returnUrl || `${request.nextUrl.origin}/dashboard/billing`,
    });

    return NextResponse.json(
      { 
        url: portalSession.url 
      },
      { headers: rateLimitHeaders(rateLimitResult) }
    );

  } catch (error: any) {
    console.error('Stripe portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { 
        status: 500,
        headers: rateLimitHeaders(rateLimitResult)
      }
    );
  }
}