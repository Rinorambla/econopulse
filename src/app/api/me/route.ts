import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { normalizePlan } from '@/lib/plan-access';

// Admin email configuration - hardcoded for server-side check
const ADMIN_EMAIL = 'econopulse.info@econopulse.ai';

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();
}

export async function GET(req: Request) {
  try {
    // Try to extract bearer token (client will send if available)
    const authHeader = req.headers.get('authorization');
    let bearerToken: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      bearerToken = authHeader.slice(7);
    }

    // Create Supabase client with proper cookie handling for API routes
    const supabase = await createClient();
    let { data: { user }, error: userErr } = await supabase.auth.getUser();

    // If no user via cookie, attempt manual fetch via token
    if ((!user || userErr) && bearerToken) {
      try {
        const profileRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
          },
          cache: 'no-store'
        });
        if (profileRes.ok) {
          const json = await profileRes.json();
          user = json as any;
          userErr = undefined as any;
        }
      } catch (e) {
        console.warn('Manual token user fetch failed');
      }
    }
    
    if (userErr || !user) {
      return NextResponse.json({ authenticated: false, plan: 'free', requiresSubscription: true });
    }
    
    const userEmail = user.email;
    const userId = user.id;
    // Check if user is admin - grant premium immediately
    const isAdmin = isAdminEmail(userEmail);
    
    if (isAdmin) {
      return NextResponse.json({
        authenticated: true,
        email: userEmail,
        plan: 'premium',
        subscription_status: 'premium',
        trial_end_date: null,
        requiresSubscription: false,
        stripe_customer_id: null,
        subscription_id: null,
        isAdmin: true
      });
    }
    
    // Fetch extended user data for regular users
    const { data, error } = await supabase
      .from('users')
      .select('email, subscription_status, stripe_customer_id, subscription_id, trial_end_date')
      .eq('id', userId)
      .single();
    if (error) {
      return NextResponse.json({ authenticated: true, email: userEmail, plan: 'free', warning: 'profile_missing', requiresSubscription: true });
    }

    let currentSubscriptionStatus = data?.subscription_status || 'free';
    
    // Check if trial has expired
    if (currentSubscriptionStatus === 'trial' && data?.trial_end_date) {
      const trialEndDate = new Date(data.trial_end_date);
      const now = new Date();
      
      if (now > trialEndDate) {
        // Trial expired, update to free
        currentSubscriptionStatus = 'free';
        
        // Update in database
        await supabase
          .from('users')
          .update({ 
            subscription_status: 'free',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }
    }
    
    const plan = normalizePlan(currentSubscriptionStatus);
    const requiresSubscription = currentSubscriptionStatus === 'free';
    
    // FORCE premium access for trial users
    const finalPlan = currentSubscriptionStatus === 'trial' ? 'premium' : plan;
    const finalRequiresSubscription = currentSubscriptionStatus === 'trial' ? false : requiresSubscription;
    
    return NextResponse.json({
      authenticated: true,
      email: data?.email || userEmail,
      plan: finalPlan,
      subscription_status: currentSubscriptionStatus,
      trial_end_date: data?.trial_end_date || null,
      requiresSubscription: finalRequiresSubscription,
      stripe_customer_id: data?.stripe_customer_id || null,
      subscription_id: data?.subscription_id || null,
      isAdmin: false
    });
  } catch (e) {
    console.error('GET /api/me error', e);
    return NextResponse.json({ authenticated: false, plan: 'free' }, { status: 500 });
  }
}
