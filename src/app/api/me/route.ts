import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { normalizePlan } from '@/lib/plan-access';

// Admin email configuration - hardcoded for server-side check
const ADMIN_EMAIL = 'admin@econopulse.ai';

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();
}

export async function GET(req: Request) {
  try {
    // Use the shared Supabase client which has cookie persistence configured
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    
    console.log('🔑 /api/me auth check:', {
      hasUser: !!user,
      email: user?.email,
      userId: user?.id,
      error: userErr?.message
    });
    
    if (userErr || !user) {
      return NextResponse.json({ authenticated: false, plan: 'free', requiresSubscription: true });
    }
    
    const userEmail = user.email;
    const userId = user.id;
    // Check if user is admin - grant premium immediately
    const isAdmin = isAdminEmail(userEmail);
    
    console.log('👑 Admin check:', {
      email: userEmail,
      isAdmin,
      adminEmail: ADMIN_EMAIL
    });
    
    if (isAdmin) {
      console.log('✅ Admin user detected - granting premium access');
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
    
    console.log('🔍 User subscription check:', {
      userId,
      subscription_status: currentSubscriptionStatus,
      trial_end_date: data?.trial_end_date
    });
    
    // Check if trial has expired
    if (currentSubscriptionStatus === 'trial' && data?.trial_end_date) {
      const trialEndDate = new Date(data.trial_end_date);
      const now = new Date();
      
      console.log('⏰ Trial check:', {
        trialEndDate: trialEndDate.toISOString(),
        now: now.toISOString(),
        isExpired: now > trialEndDate
      });
      
      if (now > trialEndDate) {
        // Trial expired, update to free
        currentSubscriptionStatus = 'free';
        console.log('❌ Trial expired, updating to free');
        
        // Update in database
        await supabase
          .from('users')
          .update({ 
            subscription_status: 'free',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      } else {
        console.log('✅ Trial still active');
      }
    }
    
    const plan = normalizePlan(currentSubscriptionStatus);
    const requiresSubscription = currentSubscriptionStatus === 'free';
    
    // FORCE premium access for trial users
    const finalPlan = currentSubscriptionStatus === 'trial' ? 'premium' : plan;
    const finalRequiresSubscription = currentSubscriptionStatus === 'trial' ? false : requiresSubscription;
    
    console.log('📊 Final plan mapping:', {
      subscription_status: currentSubscriptionStatus,
      normalized_plan: plan,
      final_plan: finalPlan,
      requiresSubscription: finalRequiresSubscription
    });
    
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
