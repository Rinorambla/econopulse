// API Route: /api/stripe/checkout
// Handles Stripe Checkout session creation for subscriptions

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import StripeSubscriptionManager, { type SubscriptionTier, type BillingCycle } from '@/lib/stripe-enhanced';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimit(`stripe-checkout:${clientIp}`, 5, 300000); // 5 requests per 5 minutes
  
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please try again later.' },
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
    const { tier, billingCycle, successUrl, cancelUrl } = body;

    // Validation
    if (!tier || !billingCycle) {
      return NextResponse.json(
        { error: 'Missing required fields: tier, billingCycle' },
        { status: 400, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    if (!['premium'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle' },
        { status: 400, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('email, name, stripe_customer_id, subscription_tier, trial_end_date')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    // Check if user already has a paid subscription
    if (profile.subscription_tier && ['premium'].includes(profile.subscription_tier)) {
      return NextResponse.json(
        { error: 'You already have an active subscription. Use the billing portal to make changes.' },
        { status: 400, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    // Create or get Stripe customer
    const customer = await StripeSubscriptionManager.createOrGetCustomer({
      userId: user.id,
      email: profile.email || user.email || '',
      name: profile.name || '',
      metadata: {
        supabaseUserId: user.id,
        currentTier: profile.subscription_tier || 'free',
      },
    });

    // Update customer ID in database if not exists
    if (!profile.stripe_customer_id) {
      await supabase
        .from('users')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id);
    }

    // Determine trial days - only for first-time subscribers
    const isFirstTimeSubscriber = !profile.subscription_tier || profile.subscription_tier === 'free';
    const trialDays = isFirstTimeSubscriber ? 14 : 0;

    // Create checkout session
    const session = await StripeSubscriptionManager.createCheckoutSession({
      customerId: customer.id,
      tier: tier as SubscriptionTier,
      billingCycle: billingCycle as BillingCycle,
      successUrl: successUrl || `${request.nextUrl.origin}/dashboard?checkout=success`,
      cancelUrl: cancelUrl || `${request.nextUrl.origin}/pricing?checkout=cancelled`,
      trialDays,
      metadata: {
        userId: user.id,
        isUpgrade: profile.subscription_tier !== 'free' ? 'true' : 'false',
      },
    });

    return NextResponse.json(
      { 
        sessionId: session.id,
        url: session.url,
        trialDays 
      },
      { headers: rateLimitHeaders(rateLimitResult) }
    );

  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { 
        status: 500,
        headers: rateLimitHeaders(rateLimitResult)
      }
    );
  }
}