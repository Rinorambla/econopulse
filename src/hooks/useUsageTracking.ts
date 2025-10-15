'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface UsageData {
  monthly: {
    article_read: number;
    ai_query: number;
    data_export: number;
    api_call: number;
    report_download: number;
    feature_access: number;
  };
  daily: {
    article_read: number;
    ai_query: number;
    data_export: number;
    api_call: number;
    report_download: number;
    feature_access: number;
  };
  lastUpdated: string;
}

interface UsageLimits {
  articlesPerMonth: number;
  aiQueriesPerDay: number;
  dataExportsPerMonth: number;
  apiCallsPerDay: number;
  reportsPerMonth: number;
}

interface UsageViolation {
  type: 'monthly' | 'daily';
  resource: string;
  current: number;
  limit: number;
}

interface UsageHookReturn {
  usage: UsageData | null;
  limits: UsageLimits | null;
  violations: UsageViolation[];
  warnings: Array<{ resource: string; percentage: number }>;
  loading: boolean;
  error: string | null;
  trackUsage: (event: string, metadata?: any) => Promise<boolean>;
  canAccess: (resource: string) => boolean;
  getUsagePercentage: (resource: string, period: 'daily' | 'monthly') => number;
  refreshUsage: () => Promise<void>;
}

export function useUsageTracking(): UsageHookReturn {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [violations, setViolations] = useState<UsageViolation[]>([]);
  const [warnings, setWarnings] = useState<Array<{ resource: string; percentage: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/usage-tracking?userId=${user.id}&period=current`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch usage data');
      }

      setUsage(data.usage);
      setLimits(data.limits);
      setViolations(data.violations || []);
      setWarnings(data.warningThreshold || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage');
      console.error('Usage tracking error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const trackUsage = useCallback(async (event: string, metadata: any = {}) => {
    if (!user?.id) return false;

    try {
      const response = await fetch('/api/usage-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          event,
          metadata
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to track usage');
      }

      // Update local state with new usage data
      if (data.usage) {
        setUsage(data.usage);
        setLimits(data.limits);
        setViolations(data.violations || []);
        setWarnings(data.warningThreshold || []);
      }

      return true;
    } catch (err) {
      console.error('Usage tracking error:', err);
      return false;
    }
  }, [user?.id]);

  const canAccess = useCallback((resource: string) => {
    if (!usage || !limits) return true; // Allow access while loading

    // Check for violations
    const hasViolation = violations.some(v => 
      v.resource === resource || 
      (resource === 'articles' && v.resource === 'articles') ||
      (resource === 'ai' && v.resource === 'ai_queries') ||
      (resource === 'exports' && v.resource === 'data_exports') ||
      (resource === 'reports' && v.resource === 'reports') ||
      (resource === 'api' && v.resource === 'api_calls')
    );

    return !hasViolation;
  }, [usage, limits, violations]);

  const getUsagePercentage = useCallback((resource: string, period: 'daily' | 'monthly') => {
    if (!usage || !limits) return 0;

    const usageData = period === 'daily' ? usage.daily : usage.monthly;
    
    let currentUsage = 0;
    let limit = 0;

    switch (resource) {
      case 'articles':
        currentUsage = usageData.article_read;
        limit = limits.articlesPerMonth;
        break;
      case 'ai':
        currentUsage = period === 'daily' ? usageData.ai_query : usageData.ai_query;
        limit = period === 'daily' ? limits.aiQueriesPerDay : limits.aiQueriesPerDay * 30;
        break;
      case 'exports':
        currentUsage = usageData.data_export;
        limit = limits.dataExportsPerMonth;
        break;
      case 'reports':
        currentUsage = usageData.report_download;
        limit = limits.reportsPerMonth;
        break;
      case 'api':
        currentUsage = period === 'daily' ? usageData.api_call : usageData.api_call;
        limit = period === 'daily' ? limits.apiCallsPerDay : limits.apiCallsPerDay * 30;
        break;
    }

    if (limit <= 0) return 0; // Unlimited or not applicable
    return Math.min((currentUsage / limit) * 100, 100);
  }, [usage, limits]);

  const refreshUsage = useCallback(async () => {
    await fetchUsage();
  }, [fetchUsage]);

  // Fetch usage data on mount and when user changes
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Refresh usage data every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchUsage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  return {
    usage,
    limits,
    violations,
    warnings,
    loading,
    error,
    trackUsage,
    canAccess,
    getUsagePercentage,
    refreshUsage
  };
}

// Helper functions for common usage patterns
export const useArticleAccess = () => {
  const { canAccess, trackUsage, violations, getUsagePercentage } = useUsageTracking();
  
  const canReadArticle = () => canAccess('articles');
  const trackArticleRead = (articleId: string) => trackUsage('article_read', { articleId });
  const getArticleUsage = () => getUsagePercentage('articles', 'monthly');
  const hasArticleLimit = () => violations.some(v => v.resource === 'articles');
  
  return {
    canReadArticle,
    trackArticleRead,
    getArticleUsage,
    hasArticleLimit
  };
};

export const useAIAccess = () => {
  const { canAccess, trackUsage, violations, getUsagePercentage } = useUsageTracking();
  
  const canUseAI = () => canAccess('ai');
  const trackAIQuery = (queryType: string, query?: string) => 
    trackUsage('ai_query', { queryType, query });
  const getAIUsage = () => getUsagePercentage('ai', 'daily');
  const hasAILimit = () => violations.some(v => v.resource === 'ai_queries');
  
  return {
    canUseAI,
    trackAIQuery,
    getAIUsage,
    hasAILimit
  };
};

export const useDataExportAccess = () => {
  const { canAccess, trackUsage, violations, getUsagePercentage } = useUsageTracking();
  
  const canExportData = () => canAccess('exports');
  const trackDataExport = (format: string, dataType: string) => 
    trackUsage('data_export', { format, dataType });
  const getExportUsage = () => getUsagePercentage('exports', 'monthly');
  const hasExportLimit = () => violations.some(v => v.resource === 'data_exports');
  
  return {
    canExportData,
    trackDataExport,
    getExportUsage,
    hasExportLimit
  };
};

export default useUsageTracking;