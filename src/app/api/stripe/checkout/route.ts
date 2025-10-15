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
    // Enhanced authentication: support both Authorization header and session
    let userId: string | undefined;
    let userEmail: string | undefined;

    // Try Authorization header first (token-based auth)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: tokenError } = await supabase.auth.getUser(token);
      if (!tokenError && user) {
        userId = user.id;
        userEmail = user.email;
        console.log('✅ User authenticated via token:', userId);
      }
    }

    // Fallback to session-based authentication
    if (!userId) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        console.log('❌ No valid session found');
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      userId = session.user.id;
      userEmail = session.user.email;
      console.log('✅ User authenticated via session:', userId);
    }

    if (!userId || !userEmail) {
      console.log('❌ Missing user ID or email');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('✅ User authenticated in checkout:', userId);

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

    // Try to get user profile, but don't fail if table doesn't exist
    let stripeCustomerId: string | null = null;
    let subscriptionTier = 'free';
    let userName = '';
    
    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('email, name, stripe_customer_id, subscription_tier, trial_end_date')
        .eq('id', userId)
        .single();

      if (!profileError && profile) {
        stripeCustomerId = profile.stripe_customer_id;
        subscriptionTier = profile.subscription_tier || 'free';
        userName = profile.name || '';
        userEmail = profile.email || userEmail;
      } else {
        console.log('⚠️ User profile not found, using auth data only');
      }
    } catch (dbError) {
      console.log('⚠️ Database table not available, using auth data only:', dbError);
    }

    // Check if user already has a paid subscription
    if (subscriptionTier && ['premium'].includes(subscriptionTier)) {
      return NextResponse.json(
        { error: 'You already have an active subscription. Use the billing portal to make changes.' },
        { status: 400, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    // Create or get Stripe customer
    const customer = await StripeSubscriptionManager.createOrGetCustomer({
      userId: userId,
      email: userEmail || '',
      name: userName || '',
      metadata: {
        supabaseUserId: userId,
        currentTier: subscriptionTier || 'free',
      },
    });

    // Update customer ID in database if not exists (only if table exists)
    if (!stripeCustomerId) {
      try {
        await supabase
          .from('users')
          .update({ stripe_customer_id: customer.id })
          .eq('id', userId);
      } catch (updateError) {
        console.log('⚠️ Could not update stripe_customer_id in database:', updateError);
      }
    }

    // Determine trial days - only for first-time subscribers
    const isFirstTimeSubscriber = !subscriptionTier || subscriptionTier === 'free';
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
        userId: userId,
        isUpgrade: subscriptionTier !== 'free' ? 'true' : 'false',
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
    // Improve observability without leaking secrets
    let publicError: any = { error: 'Failed to create checkout session' };
    if (error && typeof error === 'object') {
      const stripeType = error.type;
      if (stripeType) {
        publicError.stripeError = {
          type: error.type,
          code: error.code || null,
          statusCode: error.statusCode || null,
        };
        // Specific guidance for common misconfiguration
        if (error.type === 'StripeAuthenticationError') {
          publicError.hint = 'Invalid Stripe API key. If you intend to use LIVE mode, set STRIPE_SECRET_KEY to your sk_live_ key and update price IDs to live prices.';
        }
      }
    }
    console.error('Stripe checkout error (sanitized):', publicError, 'Raw:', error);
    return NextResponse.json(publicError, { 
      status: 500,
      headers: rateLimitHeaders(rateLimitResult)
    });
  }
}