import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface UsageTrackingEvent {
  userId: string;
  event: 'article_read' | 'ai_query' | 'data_export' | 'api_call' | 'report_download' | 'feature_access';
  metadata?: {
    articleId?: string;
    feature?: string;
    queryType?: string;
    exportFormat?: string;
    endpoint?: string;
    [key: string]: any;
  };
}

interface UserUsageLimits {
  articlesPerMonth: number;
  aiQueriesPerDay: number;
  dataExportsPerMonth: number;
  apiCallsPerDay: number;
  reportsPerMonth: number;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, event, metadata = {} }: UsageTrackingEvent = await request.json();

    if (!userId || !event) {
      return NextResponse.json({ error: 'UserId and event are required' }, { status: 400 });
    }

    // Get current date info
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentDate = now.toISOString().split('T')[0];

    // Track the event
    const { error: trackingError } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        event_type: event,
        event_date: currentDate,
        event_month: currentMonth,
        metadata: metadata,
        created_at: now.toISOString()
      });

    if (trackingError) {
      console.error('Usage tracking error:', trackingError);
      return NextResponse.json({ error: 'Failed to track usage' }, { status: 500 });
    }

    // Get user's current subscription to check limits
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_status, trial_end_date')
      .eq('id', userId)
      .single();

    if (userError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine user's limits based on subscription
    const limits = getUserLimits(userData.subscription_status, userData.trial_end_date);

    // Get current usage for this period
    const usage = await getCurrentUsage(userId, currentMonth, currentDate);

    // Check if user has exceeded limits
    const violations = checkLimitViolations(usage, limits);

    return NextResponse.json({
      success: true,
      event: event,
      usage: usage,
      limits: limits,
      violations: violations,
      warningThreshold: checkWarningThreshold(usage, limits)
    });

  } catch (error) {
    console.error('Usage tracking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || 'current'; // current, last_month, year

    if (!userId) {
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    const now = new Date();
    let targetMonth: string;
    let targetDate: string;

    switch (period) {
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        targetMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        targetDate = lastMonth.toISOString().split('T')[0];
        break;
      case 'year':
        targetMonth = `${now.getFullYear()}-%`;
        targetDate = `${now.getFullYear()}-%`;
        break;
      default:
        targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        targetDate = now.toISOString().split('T')[0];
    }

    // Get user subscription info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_status, trial_end_date')
      .eq('id', userId)
      .single();

    if (userError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const limits = getUserLimits(userData.subscription_status, userData.trial_end_date);
    const usage = await getCurrentUsage(userId, targetMonth, targetDate);

    return NextResponse.json({
      period: period,
      usage: usage,
      limits: limits,
      subscription: userData.subscription_status,
      violations: checkLimitViolations(usage, limits),
      recommendations: generateUpgradeRecommendations(usage, limits, userData.subscription_status)
    });

  } catch (error) {
    console.error('Usage retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getCurrentUsage(userId: string, month: string, date: string) {
  // Get monthly usage
  const { data: monthlyData, error: monthlyError } = await supabase
    .from('usage_tracking')
    .select('event_type')
    .eq('user_id', userId)
    .like('event_month', month.includes('%') ? month : month);

  // Get daily usage  
  const { data: dailyData, error: dailyError } = await supabase
    .from('usage_tracking')
    .select('event_type')
    .eq('user_id', userId)
    .like('event_date', date.includes('%') ? date : date);

  if (monthlyError || dailyError) {
    throw new Error('Failed to fetch usage data');
  }

  // Count events by type
  const monthlyUsage = countEventsByType(monthlyData || []);
  const dailyUsage = countEventsByType(dailyData || []);

  return {
    monthly: monthlyUsage,
    daily: dailyUsage,
    lastUpdated: new Date().toISOString()
  };
}

function countEventsByType(events: any[]) {
  return events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {
    article_read: 0,
    ai_query: 0,
    data_export: 0,
    api_call: 0,
    report_download: 0,
    feature_access: 0
  });
}

function getUserLimits(subscriptionStatus: string, trialEndDate?: string): UserUsageLimits {
  // Check if trial is still active
  const isTrialActive = trialEndDate && new Date() < new Date(trialEndDate);
  const effectiveStatus = isTrialActive ? 'trial' : subscriptionStatus;

  switch (effectiveStatus) {
    case 'trial':
    case 'starter':
      return {
        articlesPerMonth: 50,
        aiQueriesPerDay: 10,
        dataExportsPerMonth: 10,
        apiCallsPerDay: 0,
        reportsPerMonth: 0
      };
    
    case 'professional':
      return {
        articlesPerMonth: 500,
        aiQueriesPerDay: 50,
        dataExportsPerMonth: 100,
        apiCallsPerDay: 1000,
        reportsPerMonth: 50
      };
    
    case 'institutional':
      return {
        articlesPerMonth: -1, // unlimited
        aiQueriesPerDay: -1,
        dataExportsPerMonth: -1,
        apiCallsPerDay: 10000,
        reportsPerMonth: -1
      };
    
    default: // free
      return {
        articlesPerMonth: 5,
        aiQueriesPerDay: 0,
        dataExportsPerMonth: 0,
        apiCallsPerDay: 0,
        reportsPerMonth: 0
      };
  }
}

function checkLimitViolations(usage: any, limits: UserUsageLimits) {
  const violations = [];

  // Check monthly limits
  if (limits.articlesPerMonth > 0 && usage.monthly.article_read >= limits.articlesPerMonth) {
    violations.push({
      type: 'monthly',
      resource: 'articles',
      current: usage.monthly.article_read,
      limit: limits.articlesPerMonth
    });
  }

  if (limits.dataExportsPerMonth > 0 && usage.monthly.data_export >= limits.dataExportsPerMonth) {
    violations.push({
      type: 'monthly',
      resource: 'data_exports',
      current: usage.monthly.data_export,
      limit: limits.dataExportsPerMonth
    });
  }

  if (limits.reportsPerMonth > 0 && usage.monthly.report_download >= limits.reportsPerMonth) {
    violations.push({
      type: 'monthly',
      resource: 'reports',
      current: usage.monthly.report_download,
      limit: limits.reportsPerMonth
    });
  }

  // Check daily limits
  if (limits.aiQueriesPerDay > 0 && usage.daily.ai_query >= limits.aiQueriesPerDay) {
    violations.push({
      type: 'daily',
      resource: 'ai_queries',
      current: usage.daily.ai_query,
      limit: limits.aiQueriesPerDay
    });
  }

  if (limits.apiCallsPerDay > 0 && usage.daily.api_call >= limits.apiCallsPerDay) {
    violations.push({
      type: 'daily',
      resource: 'api_calls',
      current: usage.daily.api_call,
      limit: limits.apiCallsPerDay
    });
  }

  return violations;
}

function checkWarningThreshold(usage: any, limits: UserUsageLimits) {
  const warnings = [];
  const threshold = 0.8; // 80% threshold

  // Check monthly warnings
  if (limits.articlesPerMonth > 0 && usage.monthly.article_read >= limits.articlesPerMonth * threshold) {
    warnings.push({
      resource: 'articles',
      percentage: Math.round((usage.monthly.article_read / limits.articlesPerMonth) * 100)
    });
  }

  if (limits.aiQueriesPerDay > 0 && usage.daily.ai_query >= limits.aiQueriesPerDay * threshold) {
    warnings.push({
      resource: 'ai_queries',
      percentage: Math.round((usage.daily.ai_query / limits.aiQueriesPerDay) * 100)
    });
  }

  return warnings;
}

function generateUpgradeRecommendations(usage: any, limits: UserUsageLimits, currentPlan: string) {
  const recommendations = [];

  // Analyze usage patterns
  if (usage.monthly.article_read > limits.articlesPerMonth * 0.9) {
    recommendations.push({
      reason: 'High article consumption',
      suggestion: 'Upgrade to get unlimited articles and premium content',
      targetPlan: currentPlan === 'free' ? 'starter' : 'professional'
    });
  }

  if (usage.daily.ai_query > 0 && limits.aiQueriesPerDay === 0) {
    recommendations.push({
      reason: 'AI feature interest',
      suggestion: 'Upgrade to access AI-powered market analysis',
      targetPlan: 'starter'
    });
  }

  if (usage.daily.ai_query >= limits.aiQueriesPerDay * 0.9 && limits.aiQueriesPerDay > 0) {
    recommendations.push({
      reason: 'Heavy AI usage',
      suggestion: 'Upgrade for unlimited AI queries and advanced features',
      targetPlan: 'professional'
    });
  }

  return recommendations;
}