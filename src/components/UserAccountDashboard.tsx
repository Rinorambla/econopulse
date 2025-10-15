'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  CreditCardIcon, 
  ChartBarIcon, 
  BellIcon, 
  UserCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

export default function UserAccountDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [billingLoading, setBillingLoading] = useState(false);

  const openBillingPortal = async () => {
    setBillingLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          returnUrl: window.location.origin + '/dashboard/account' 
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Billing portal error:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setBillingLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg h-32"></div>
          ))}
        </div>
        <div className="bg-white rounded-lg h-64"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <UserCircleIcon className="h-12 w-12 text-gray-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user?.email || 'User'}
              </h2>
              <p className="text-gray-600">{user?.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Starter Plan
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={openBillingPortal}
            disabled={billingLoading}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <CreditCardIcon className="h-4 w-4" />
            <span>{billingLoading ? 'Loading...' : 'Manage Billing'}</span>
          </button>
        </div>
      </div>

      {/* Usage Statistics Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {['Articles Read', 'AI Queries', 'Data Exports', 'Reports'].map((title) => (
          <div key={title} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">{title}</h3>
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold text-gray-900">0</span>
                <span className="text-sm text-gray-600">/ 50</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-green-500" style={{ width: '0%' }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3 py-2">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">Account created successfully</p>
              <p className="text-xs text-gray-500">Welcome to EconoPulse!</p>
            </div>
            <div className="text-xs text-gray-500">
              Recently
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}