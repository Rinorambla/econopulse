import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizePlan } from '@/lib/plan-access';

// NOTE: This assumes RLS allows service key operations OR supabase client is service-role on server.
// If not, adapt to use auth cookies + getUser.

export async function GET(req: Request) {
  try {
    // Get auth token from Authorization header or cookies
    const authHeader = req.headers.get('authorization');
    const cookieHeader = req.headers.get('cookie');
    
    // Extract Supabase auth token from cookies
    let accessToken: string | null = null;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const authCookie = cookies.find(c => c.startsWith('sb-') && c.includes('-auth-token'));
      if (authCookie) {
        try {
          const [, value] = authCookie.split('=');
          const decoded = JSON.parse(decodeURIComponent(value));
          accessToken = decoded.access_token || decoded[0]?.access_token;
        } catch (e) {
          console.error('Error parsing auth cookie:', e);
        }
      }
    }
    
    console.log('🔑 /api/me auth check:', {
      hasAuthHeader: !!authHeader,
      hasCookieHeader: !!cookieHeader,
      hasAccessToken: !!accessToken
    });
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
        }
      }
    );
    
    // Extract auth token from cookies (Supabase JS client manages on server if configured)
    // Fallback: return minimal anon structure - now requires Pro minimum
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    
    console.log('🔑 /api/me session check:', {
      hasSession: !!session,
      email: session?.user?.email,
      userId: session?.user?.id,
      error: sessionErr?.message
    });
    
    if (sessionErr || !session?.user) {
      return NextResponse.json({ authenticated: false, plan: 'pro', requiresSubscription: true });
    }
    const userId = session.user.id;
    // Fetch extended user data
    const { data, error } = await supabase
      .from('users')
      .select('email, subscription_status, stripe_customer_id, subscription_id, trial_end_date')
      .eq('id', userId)
      .single();
    if (error) {
      return NextResponse.json({ authenticated: true, email: session.user.email, plan: 'pro', warning: 'profile_missing', requiresSubscription: true });
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
      email: data?.email || session.user.email,
      plan: finalPlan,
      subscription_status: currentSubscriptionStatus,
      trial_end_date: data?.trial_end_date || null,
      requiresSubscription: finalRequiresSubscription,
      stripe_customer_id: data?.stripe_customer_id || null,
      subscription_id: data?.subscription_id || null
    });
  } catch (e) {
    console.error('GET /api/me error', e);
    return NextResponse.json({ authenticated: false, plan: 'free' }, { status: 500 });
  }
}
