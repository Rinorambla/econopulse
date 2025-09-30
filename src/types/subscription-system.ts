/**
 * EconoPulse Subscription System Architecture
 * Modeled after best practices from Bloomberg, Morningstar, Seeking Alpha
 */

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number; // monthly in cents
  yearlyPrice?: number; // yearly discount
  features: FeatureAccess;
  limits: UsageLimits;
  billing: BillingConfig;
}

export interface FeatureAccess {
  // Data Access
  realTimeData: boolean;
  historicalData: boolean; // how many years back
  earningsCalendar: boolean;
  economicIndicators: boolean;
  
  // AI Features  
  aiAnalysis: boolean;
  aiPortfolio: boolean;
  aiAlerts: boolean;
  customAiQueries: boolean;
  
  // Advanced Features
  portfolioTracking: boolean;
  backtesting: boolean;
  screeningTools: boolean;
  advancedCharts: boolean;
  
  // Content
  researchReports: boolean;
  premiumNews: boolean;
  expertInsights: boolean;
  
  // API & Export
  apiAccess: boolean;
  dataExport: boolean;
  webhooks: boolean;
}

export interface UsageLimits {
  // Article/Content Limits
  articlesPerMonth: number;
  reportsPerMonth: number;
  
  // Data Limits  
  apiCallsPerDay: number;
  stocksWatchlist: number;
  portfolios: number;
  alerts: number;
  
  // AI Limits
  aiQueriesPerDay: number;
  customAnalysisPerMonth: number;
  
  // Export Limits
  csvExportsPerMonth: number;
}

export interface BillingConfig {
  trialDays: number;
  gracePeriodDays: number;
  cancellationPolicy: 'immediate' | 'end_of_period';
  upgradePolicy: 'immediate' | 'next_cycle';
  features: string[];
}

// ===============================
// SUBSCRIPTION TIERS DEFINITION
// ===============================

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Free Explorer',
    price: 0,
    features: {
      realTimeData: false, // 15-min delayed
      historicalData: true, // 1 year back
      earningsCalendar: true,
      economicIndicators: true,
      
      aiAnalysis: false, // basic sentiment only
      aiPortfolio: false,
      aiAlerts: false,
      customAiQueries: false,
      
      portfolioTracking: true, // 1 portfolio
      backtesting: false,
      screeningTools: false, // basic screener only  
      advancedCharts: false,
      
      researchReports: false,
      premiumNews: false,
      expertInsights: false,
      
      apiAccess: false,
      dataExport: false,
      webhooks: false,
    },
    limits: {
      articlesPerMonth: 5,
      reportsPerMonth: 0,
      apiCallsPerDay: 0,
      stocksWatchlist: 10,
      portfolios: 1,
      alerts: 3,
      aiQueriesPerDay: 0,
      customAnalysisPerMonth: 0,
      csvExportsPerMonth: 0,
    },
    billing: {
      trialDays: 0,
      gracePeriodDays: 0,
      cancellationPolicy: 'immediate',
      upgradePolicy: 'immediate',
      features: ['Basic market data', 'Simple portfolio tracking', 'Limited news access']
    }
  },

  starter: {
    id: 'starter',
    name: 'Market Starter',
    price: 1499, // $14.99/month
    yearlyPrice: 14999, // $149.99/year (2 months free)
    features: {
      realTimeData: true,
      historicalData: true, // 3 years back
      earningsCalendar: true,
      economicIndicators: true,
      
      aiAnalysis: true, // basic AI insights
      aiPortfolio: false,
      aiAlerts: true, // basic alerts
      customAiQueries: false,
      
      portfolioTracking: true,
      backtesting: false,
      screeningTools: true, // basic screener
      advancedCharts: true,
      
      researchReports: false,
      premiumNews: true,
      expertInsights: false,
      
      apiAccess: false,
      dataExport: true, // limited
      webhooks: false,
    },
    limits: {
      articlesPerMonth: 50,
      reportsPerMonth: 0,
      apiCallsPerDay: 0,
      stocksWatchlist: 50,
      portfolios: 3,
      alerts: 20,
      aiQueriesPerDay: 10,
      customAnalysisPerMonth: 0,
      csvExportsPerMonth: 10,
    },
    billing: {
      trialDays: 14,
      gracePeriodDays: 3,
      cancellationPolicy: 'end_of_period',
      upgradePolicy: 'immediate',
      features: ['Real-time data', 'AI market insights', 'Advanced charting', 'Premium news']
    }
  },

  professional: {
    id: 'professional', 
    name: 'Professional Trader',
    price: 4999, // $49.99/month
    yearlyPrice: 49999, // $499.99/year (2 months free)
    features: {
      realTimeData: true,
      historicalData: true, // 10 years back
      earningsCalendar: true,
      economicIndicators: true,
      
      aiAnalysis: true,
      aiPortfolio: true, // full AI portfolio management
      aiAlerts: true,
      customAiQueries: true,
      
      portfolioTracking: true,
      backtesting: true,
      screeningTools: true, // advanced screener
      advancedCharts: true,
      
      researchReports: true,
      premiumNews: true,
      expertInsights: true,
      
      apiAccess: true, // basic API
      dataExport: true,
      webhooks: false,
    },
    limits: {
      articlesPerMonth: 500,
      reportsPerMonth: 50,
      apiCallsPerDay: 1000,
      stocksWatchlist: 200,
      portfolios: 10,
      alerts: 100,
      aiQueriesPerDay: 50,
      customAnalysisPerMonth: 20,
      csvExportsPerMonth: 100,
    },
    billing: {
      trialDays: 14,
      gracePeriodDays: 5,
      cancellationPolicy: 'end_of_period',
      upgradePolicy: 'immediate',
      features: ['AI Portfolio Management', 'Backtesting', 'Research Reports', 'API Access', 'Expert Insights']
    }
  },

  institutional: {
    id: 'institutional',
    name: 'Institutional',
    price: 19999, // $199.99/month
    yearlyPrice: 199999, // $1999.99/year (2 months free)
    features: {
      realTimeData: true,
      historicalData: true, // unlimited
      earningsCalendar: true,
      economicIndicators: true,
      
      aiAnalysis: true,
      aiPortfolio: true,
      aiAlerts: true,
      customAiQueries: true,
      
      portfolioTracking: true,
      backtesting: true,
      screeningTools: true,
      advancedCharts: true,
      
      researchReports: true,
      premiumNews: true,
      expertInsights: true,
      
      apiAccess: true, // full API access
      dataExport: true,
      webhooks: true,
    },
    limits: {
      articlesPerMonth: -1, // unlimited
      reportsPerMonth: -1, // unlimited
      apiCallsPerDay: 10000,
      stocksWatchlist: -1, // unlimited
      portfolios: -1, // unlimited
      alerts: -1, // unlimited
      aiQueriesPerDay: -1, // unlimited
      customAnalysisPerMonth: -1, // unlimited
      csvExportsPerMonth: -1, // unlimited
    },
    billing: {
      trialDays: 30,
      gracePeriodDays: 7,
      cancellationPolicy: 'end_of_period',
      upgradePolicy: 'immediate',
      features: ['Unlimited Access', 'Premium API', 'Webhooks', 'Priority Support', 'Custom Integrations']
    }
  }
};

// ===============================
// PAYWALL STRATEGIES
// ===============================

export interface PaywallConfig {
  type: 'soft' | 'hard' | 'metered' | 'freemium';
  trigger: PaywallTrigger;
  content: PaywallContent;
  behavior: PaywallBehavior;
}

export interface PaywallTrigger {
  // Usage-based triggers
  articleLimit?: number;
  queryLimit?: number;
  timeLimit?: number; // minutes on site
  
  // Feature-based triggers  
  premiumFeatures?: string[];
  realTimeData?: boolean;
  advancedCharts?: boolean;
  
  // User behavior triggers
  engagementScore?: number; // high engagement = show upgrade
  pageViews?: number;
  returnVisits?: number;
}

export interface PaywallContent {
  headline: string;
  subtitle: string;
  benefits: string[];
  urgency?: string; // "Limited time offer", "14 days left"
  social_proof?: string; // "Join 10,000+ traders"
  cta_primary: string;
  cta_secondary?: string;
}

export interface PaywallBehavior {
  showPreview: boolean; // show first paragraph
  gracefulDegradation: boolean; // show basic version
  redirectToLogin: boolean;
  exitIntent: boolean; // show on exit intent
  scrollPercentage?: number; // show after X% scroll
}

// ===============================
// USAGE TRACKING SYSTEM
// ===============================

export interface UserUsage {
  userId: string;
  period: string; // YYYY-MM format
  
  // Content consumption
  articlesRead: number;
  reportsDownloaded: number;
  timeOnSite: number; // minutes
  
  // Data usage
  apiCalls: number;
  dataExports: number;
  
  // AI usage
  aiQueries: number;
  customAnalysisRequests: number;
  
  // Feature usage
  portfoliosCreated: number;
  alertsSet: number;
  backtestsRun: number;
  
  // Engagement metrics
  sessionsCount: number;
  avgSessionDuration: number;
  featuresUsed: string[];
  
  // Timestamps
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ===============================
// BUSINESS INTELLIGENCE
// ===============================

export interface SubscriptionMetrics {
  // Revenue metrics
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churn: number; // monthly churn rate
  ltv: number; // Lifetime Value
  
  // User metrics
  totalUsers: number;
  activeUsers: number;
  trialUsers: number;
  paidUsers: number;
  
  // Conversion metrics
  trialToPayedConversion: number;
  upgradeRate: number;
  downgradeRate: number;
  
  // Feature adoption
  featureUsage: Record<string, number>;
  mostPopularPlan: string;
  
  // Geographic/demographic
  usersByRegion: Record<string, number>;
  usersByPlan: Record<string, number>;
}

export default {
  SUBSCRIPTION_TIERS
};