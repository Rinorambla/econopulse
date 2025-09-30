// API Route: /api/usage-tracking/reset
// Monthly cron job to reset usage counters

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// This endpoint should only be called by Vercel Cron
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().substring(0, 7); // YYYY-MM format

    console.log(`🔄 Starting monthly usage reset for ${currentMonth}`);

    // Update all users' usage_reset_date to start of current month
    const { data: updatedUsers, error: updateError } = await supabase
      .from('users')
      .update({
        usage_reset_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all real users

    if (updateError) {
      console.error('Error updating usage reset dates:', updateError);
      throw updateError;
    }

    // Archive old usage data (optional - keep last 12 months)
    const archiveDate = new Date();
    archiveDate.setMonth(archiveDate.getMonth() - 12);
    const archiveMonth = archiveDate.toISOString().substring(0, 7);

    const { error: archiveError } = await supabase
      .from('usage_tracking')
      .delete()
      .lt('event_month', archiveMonth);

    if (archiveError) {
      console.warn('Warning: Could not archive old usage data:', archiveError);
      // Don't fail the entire operation for this
    }

    // Generate monthly analytics snapshot
    try {
      await generateMonthlyAnalytics(currentMonth);
    } catch (analyticsError) {
      console.warn('Warning: Could not generate monthly analytics:', analyticsError);
    }

    console.log(`✅ Monthly usage reset completed for ${currentMonth}`);

    return NextResponse.json({
      success: true,
      message: `Usage reset completed for ${currentMonth}`,
      timestamp: currentDate.toISOString(),
      usersUpdated: updatedUsers?.length || 0,
    });

  } catch (error) {
    console.error('Monthly usage reset error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reset monthly usage',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function generateMonthlyAnalytics(month: string) {
  // Calculate MRR for the month
  const { data: paidUsers, error: mrrError } = await supabase
    .from('users')
    .select('subscription_tier, billing_cycle')
    .in('subscription_tier', ['starter', 'professional', 'institutional'])
    .eq('subscription_status', 'active');

  if (mrrError) throw mrrError;

  let mrr = 0;
  const usersByPlan = { free: 0, starter: 0, professional: 0, institutional: 0 };
  const revenueByPlan = { starter: 0, professional: 0, institutional: 0 };

  paidUsers?.forEach(user => {
    const tierPrices = {
      starter: { monthly: 14.99, yearly: 149.99 },
      professional: { monthly: 49.99, yearly: 499.99 },
      institutional: { monthly: 199.99, yearly: 1999.99 },
    };

    const tier = user.subscription_tier as keyof typeof tierPrices;
    const cycle = user.billing_cycle || 'monthly';
    
    if (tierPrices[tier]) {
      const monthlyRevenue = cycle === 'yearly' 
        ? tierPrices[tier].yearly / 12 
        : tierPrices[tier].monthly;
      
      mrr += monthlyRevenue;
      usersByPlan[tier]++;
      revenueByPlan[tier] += monthlyRevenue;
    }
  });

  // Get total user counts
  const { data: allUsers, error: countError } = await supabase
    .from('users')
    .select('subscription_tier')
    .not('subscription_tier', 'is', null);

  if (!countError && allUsers) {
    allUsers.forEach(user => {
      const tier = user.subscription_tier || 'free';
      if (tier in usersByPlan) {
        usersByPlan[tier as keyof typeof usersByPlan]++;
      }
    });
  }

  // Insert analytics record
  const { error: insertError } = await supabase
    .from('subscription_analytics')
    .insert({
      period_date: `${month}-01`,
      period_type: 'monthly',
      mrr,
      arr: mrr * 12,
      total_revenue: mrr,
      total_users: Object.values(usersByPlan).reduce((a, b) => a + b, 0),
      free_users: usersByPlan.free,
      paid_users: usersByPlan.starter + usersByPlan.professional + usersByPlan.institutional,
      users_by_plan: usersByPlan,
      revenue_by_plan: revenueByPlan,
    });

  if (insertError) throw insertError;

  console.log(`📊 Generated analytics for ${month}: MRR $${mrr.toFixed(2)}`);
}

// For manual testing (GET request)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Usage reset endpoint',
    note: 'This endpoint is called monthly by Vercel Cron',
    nextReset: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
  });
}