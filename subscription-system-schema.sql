-- EconoPulse Subscription & Usage Tracking System
-- Execute these queries in your Supabase SQL Editor

-- 1. Usage Tracking Table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'article_read', 
        'ai_query', 
        'data_export', 
        'api_call', 
        'report_download', 
        'feature_access'
    )),
    event_date DATE NOT NULL,
    event_month TEXT NOT NULL, -- Format: YYYY-MM
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_event_date ON public.usage_tracking(event_date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_event_month ON public.usage_tracking(event_month);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_event_type ON public.usage_tracking(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month ON public.usage_tracking(user_id, event_month);

-- 2. Update Users Table for Subscription Management
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN (
    'free', 
    'trial', 
    'starter', 
    'professional', 
    'institutional'
)),
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS last_billing_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS usage_reset_date TIMESTAMP WITH TIME ZONE;

-- Update existing subscription_status to subscription_tier if needed
UPDATE public.users 
SET subscription_tier = subscription_status 
WHERE subscription_tier = 'free' AND subscription_status IS NOT NULL;

-- 3. Subscription Analytics Table
CREATE TABLE IF NOT EXISTS public.subscription_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    period_date DATE NOT NULL, -- Daily snapshot
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Revenue Metrics
    mrr DECIMAL(10,2) DEFAULT 0, -- Monthly Recurring Revenue
    arr DECIMAL(10,2) DEFAULT 0, -- Annual Recurring Revenue
    total_revenue DECIMAL(10,2) DEFAULT 0,
    
    -- User Metrics
    total_users INTEGER DEFAULT 0,
    free_users INTEGER DEFAULT 0,
    trial_users INTEGER DEFAULT 0,
    paid_users INTEGER DEFAULT 0,
    
    -- Conversion Metrics
    new_signups INTEGER DEFAULT 0,
    trial_conversions INTEGER DEFAULT 0,
    upgrades INTEGER DEFAULT 0,
    downgrades INTEGER DEFAULT 0,
    cancellations INTEGER DEFAULT 0,
    
    -- Churn Metrics
    monthly_churn_rate DECIMAL(5,4) DEFAULT 0,
    revenue_churn_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Plan Distribution
    users_by_plan JSONB DEFAULT '{}',
    revenue_by_plan JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_subscription_analytics_period ON public.subscription_analytics(period_date, period_type);

-- 4. Feature Usage Analytics
CREATE TABLE IF NOT EXISTS public.feature_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feature_name TEXT NOT NULL,
    plan_tier TEXT NOT NULL,
    usage_date DATE NOT NULL,
    
    -- Usage Metrics
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_usage_count INTEGER DEFAULT 0,
    avg_usage_per_user DECIMAL(8,2) DEFAULT 0,
    
    -- Engagement Metrics  
    engagement_score DECIMAL(5,2) DEFAULT 0,
    retention_rate DECIMAL(5,4) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for feature analytics
CREATE INDEX IF NOT EXISTS idx_feature_analytics_date_feature ON public.feature_analytics(usage_date, feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_analytics_plan ON public.feature_analytics(plan_tier);

-- 5. Paywall Events Table (for conversion tracking)
CREATE TABLE IF NOT EXISTS public.paywall_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT, -- For anonymous users
    
    -- Event Details
    event_type TEXT NOT NULL CHECK (event_type IN (
        'paywall_shown',
        'paywall_dismissed', 
        'upgrade_clicked',
        'trial_started',
        'subscription_completed'
    )),
    
    -- Context
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'article_limit',
        'feature_premium', 
        'query_limit',
        'time_limit',
        'exit_intent'
    )),
    page_url TEXT,
    referrer TEXT,
    
    -- Conversion Data
    target_plan TEXT,
    conversion_value DECIMAL(8,2),
    
    -- A/B Testing
    experiment_id TEXT,
    variant TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for paywall events
CREATE INDEX IF NOT EXISTS idx_paywall_events_user_id ON public.paywall_events(user_id);
CREATE INDEX IF NOT EXISTS idx_paywall_events_event_type ON public.paywall_events(event_type);
CREATE INDEX IF NOT EXISTS idx_paywall_events_trigger ON public.paywall_events(trigger_type);
CREATE INDEX IF NOT EXISTS idx_paywall_events_created_at ON public.paywall_events(created_at);

-- 6. RLS (Row Level Security) Policies

-- Usage tracking - users can only see their own data
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage tracking" ON public.usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage tracking" ON public.usage_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Paywall events - users can only see their own data  
ALTER TABLE public.paywall_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own paywall events" ON public.paywall_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own paywall events" ON public.paywall_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Analytics tables - only service role can access
ALTER TABLE public.subscription_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_analytics ENABLE ROW LEVEL SECURITY;

-- 7. Functions for Analytics

-- Function to calculate MRR
CREATE OR REPLACE FUNCTION calculate_mrr(target_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    mrr_value DECIMAL(10,2) := 0;
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN billing_cycle = 'yearly' THEN 
                (CASE subscription_tier
                    WHEN 'starter' THEN 149.99
                    WHEN 'professional' THEN 499.99  
                    WHEN 'institutional' THEN 1999.99
                    ELSE 0
                END) / 12
            ELSE 
                CASE subscription_tier
                    WHEN 'starter' THEN 14.99
                    WHEN 'professional' THEN 49.99
                    WHEN 'institutional' THEN 199.99
                    ELSE 0
                END
        END
    ), 0) INTO mrr_value
    FROM public.users 
    WHERE subscription_tier IN ('starter', 'professional', 'institutional')
    AND (subscription_status = 'active' OR subscription_tier = 'trial')
    AND created_at <= target_date;
    
    RETURN mrr_value;
END;
$$ LANGUAGE plpgsql;

-- Function to get user plan limits
CREATE OR REPLACE FUNCTION get_user_limits(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    user_data RECORD;
    is_trial_active BOOLEAN := FALSE;
    effective_tier TEXT;
    limits JSONB;
BEGIN
    -- Get user subscription info
    SELECT subscription_tier, trial_end_date 
    INTO user_data
    FROM public.users 
    WHERE id = user_uuid;
    
    -- Check if trial is active
    IF user_data.trial_end_date IS NOT NULL AND user_data.trial_end_date > NOW() THEN
        is_trial_active := TRUE;
    END IF;
    
    -- Determine effective tier
    effective_tier := CASE 
        WHEN is_trial_active THEN 'starter'
        ELSE COALESCE(user_data.subscription_tier, 'free')
    END;
    
    -- Return limits based on tier
    limits := CASE effective_tier
        WHEN 'starter' THEN 
            '{"articlesPerMonth": 50, "aiQueriesPerDay": 10, "dataExportsPerMonth": 10, "apiCallsPerDay": 0, "reportsPerMonth": 0}'::jsonb
        WHEN 'professional' THEN 
            '{"articlesPerMonth": 500, "aiQueriesPerDay": 50, "dataExportsPerMonth": 100, "apiCallsPerDay": 1000, "reportsPerMonth": 50}'::jsonb
        WHEN 'institutional' THEN 
            '{"articlesPerMonth": -1, "aiQueriesPerDay": -1, "dataExportsPerMonth": -1, "apiCallsPerDay": 10000, "reportsPerMonth": -1}'::jsonb
        ELSE 
            '{"articlesPerMonth": 5, "aiQueriesPerDay": 0, "dataExportsPerMonth": 0, "apiCallsPerDay": 0, "reportsPerMonth": 0}'::jsonb
    END;
    
    RETURN limits;
END;
$$ LANGUAGE plpgsql;

-- 8. Triggers for automatic analytics

-- Trigger to update analytics on user changes
CREATE OR REPLACE FUNCTION update_subscription_analytics() 
RETURNS TRIGGER AS $$
BEGIN
    -- This would insert into subscription_analytics table
    -- Implementation depends on your specific analytics needs
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CREATE TRIGGER subscription_analytics_trigger
--     AFTER INSERT OR UPDATE ON public.users
--     FOR EACH ROW EXECUTE FUNCTION update_subscription_analytics();

-- 9. Sample Data for Testing (Optional)

-- Insert sample usage tracking data
-- INSERT INTO public.usage_tracking (user_id, event_type, event_date, event_month, metadata)
-- SELECT 
--     auth.uid(),
--     'article_read',
--     CURRENT_DATE - (random() * 30)::int,
--     TO_CHAR(CURRENT_DATE - (random() * 30)::int, 'YYYY-MM'),
--     '{"articleId": "sample-article-' || generate_random_uuid() || '"}'::jsonb
-- FROM generate_series(1, 10);

-- 10. Views for Easy Analytics

-- Monthly usage summary view
CREATE OR REPLACE VIEW monthly_usage_summary AS
SELECT 
    u.email,
    u.subscription_tier,
    ut.event_month,
    ut.event_type,
    COUNT(*) as usage_count,
    get_user_limits(u.id) as limits
FROM public.users u
JOIN public.usage_tracking ut ON u.id = ut.user_id
GROUP BY u.id, u.email, u.subscription_tier, ut.event_month, ut.event_type
ORDER BY ut.event_month DESC, u.email;

-- Conversion funnel view
CREATE OR REPLACE VIEW conversion_funnel AS
SELECT 
    DATE_TRUNC('week', created_at) as week,
    trigger_type,
    COUNT(CASE WHEN event_type = 'paywall_shown' THEN 1 END) as paywall_shown,
    COUNT(CASE WHEN event_type = 'upgrade_clicked' THEN 1 END) as upgrade_clicked,
    COUNT(CASE WHEN event_type = 'trial_started' THEN 1 END) as trial_started,
    COUNT(CASE WHEN event_type = 'subscription_completed' THEN 1 END) as subscriptions,
    ROUND(
        COUNT(CASE WHEN event_type = 'upgrade_clicked' THEN 1 END)::numeric / 
        NULLIF(COUNT(CASE WHEN event_type = 'paywall_shown' THEN 1 END), 0) * 100, 2
    ) as click_through_rate,
    ROUND(
        COUNT(CASE WHEN event_type = 'subscription_completed' THEN 1 END)::numeric / 
        NULLIF(COUNT(CASE WHEN event_type = 'paywall_shown' THEN 1 END), 0) * 100, 2
    ) as conversion_rate
FROM public.paywall_events
GROUP BY DATE_TRUNC('week', created_at), trigger_type
ORDER BY week DESC;