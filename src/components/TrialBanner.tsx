'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { ClockIcon, StarIcon } from '@heroicons/react/24/outline';

interface TrialBannerProps {
  className?: string;
}

export function TrialBanner({ className = '' }: TrialBannerProps) {
  const { user, loading, refreshPlan } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/me', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          console.warn('TrialBanner: /api/me returned', response.status);
          return;
        }
        
        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error('TrialBanner: Error fetching user data:', error);
        // Don't crash the app, just hide the banner
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // Refresh plan data if user changes
  useEffect(() => {
    if (user) {
      refreshPlan();
    }
  }, [user, refreshPlan]);

  if (loading || isLoading || !user || !userData) {
    return null;
  }

  const { subscription_status, trial_end_date, requiresSubscription, isAdmin } = userData;

  // Don't show any banners for admin users
  if (isAdmin) {
    return null;
  }

  // Show trial banner only for trial users
  if (subscription_status === 'trial' && trial_end_date) {
    const trialEndDate = new Date(trial_end_date);
    const now = new Date();
    const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft > 0) {
      return (
        <div className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 ${className}`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <StarIcon className="h-5 w-5" />
              <span className="font-medium">
                Free Trial: {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
              </span>
              <span className="text-blue-100 text-sm">
                (expires {trialEndDate.toLocaleDateString()})
              </span>
            </div>
            <Link
              href="/en/pricing"
              className="bg-white/20 hover:bg-white/30 px-4 py-1 rounded-md text-sm font-medium transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      );
    }
  }

  // Show expired trial message for free users who need subscription
  if (requiresSubscription && subscription_status === 'free') {
    return (
      <div className={`bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-3 ${className}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-5 w-5" />
            <span className="font-medium">
              Your free trial has expired
            </span>
            <span className="text-red-100 text-sm">
              Subscribe to continue accessing premium features
            </span>
          </div>
          <Link
            href="/en/pricing"
            className="bg-white/20 hover:bg-white/30 px-4 py-1 rounded-md text-sm font-medium transition-colors"
          >
            Subscribe Now
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

export default TrialBanner;