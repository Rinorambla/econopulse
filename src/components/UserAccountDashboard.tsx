'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  CreditCardIcon, 
  ChartBarIcon, 
  BellIcon, 
  UserCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

export default function UserAccountDashboard() {
  const { user, loading: authLoading, session } = useAuth();
  const [billingLoading, setBillingLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Stato abbonamento
  const [subscriptionStatus, setSubscriptionStatus] = useState<'free'|'premium'|'canceled'|'canceling'|'trial'|null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string|null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string|null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Recupera stato abbonamento dal profilo utente
  useEffect(() => {
    async function fetchSub() {
      if (!session) return;
      try {
        const res = await fetch('/api/me');
        const data = await res.json();
        setSubscriptionStatus(data.plan || 'free');
        if (data.subscription_status === 'canceled' || data.subscription_status === 'canceling') {
          setSubscriptionStatus('canceling');
        }
        if (data.current_period_end) {
          setSubscriptionEnd(new Date(data.current_period_end * 1000).toLocaleDateString());
        } else {
          setSubscriptionEnd(null);
        }
      } catch (e) {
        setSubscriptionStatus(null);
      }
    }
    fetchSub();
  }, [session]);

  // Annulla abbonamento
  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setCancelError(null);
    setCancelSuccess(false);
    try {
      // Recupera subscriptionId dal profilo
      const resMe = await fetch('/api/me');
      const dataMe = await resMe.json();
      if (!dataMe.subscription_id) throw new Error('Subscription ID not found');
      const token = session?.access_token;
      const res = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscriptionId: dataMe.subscription_id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel');
      setCancelSuccess(true);
      setSubscriptionStatus('canceling');
      if (data.subscription?.current_period_end) {
        setSubscriptionEnd(new Date(data.subscription.current_period_end * 1000).toLocaleDateString());
      }
    } catch (e: any) {
      setCancelError(e.message || 'Errore annullamento');
    } finally {
      setCancelLoading(false);
    }
  };

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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE exactly to confirm.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/user/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to delete account');
      window.location.href = '/?accountDeleted=1';
    } catch (e: any) {
      setDeleteError(e?.message || 'Unexpected error. Please contact support@econopulse.ai.');
      setDeleting(false);
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
                {subscriptionStatus === 'premium' && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Premium</span>
                )}
                {subscriptionStatus === 'canceling' && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Annullato (attivo fino al {subscriptionEnd || '-'})</span>
                )}
                {subscriptionStatus === 'free' && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Free</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            <button
              onClick={openBillingPortal}
              disabled={billingLoading}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <CreditCardIcon className="h-4 w-4" />
              <span>{billingLoading ? 'Loading...' : 'Manage Billing'}</span>
            </button>
            {subscriptionStatus === 'premium' && (
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading || cancelSuccess || subscriptionStatus === 'canceling'}
                className="flex items-center space-x-2 px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
              >
                {cancelLoading ? 'Annullamento...' : cancelSuccess ? 'Annullato' : 'Annulla abbonamento'}
              </button>
            )}
            {cancelError && <div className="text-xs text-red-600 mt-1">{cancelError}</div>}
            {cancelSuccess && <div className="text-xs text-green-600 mt-1">Abbonamento annullato. Resterà attivo fino al termine del periodo.</div>}
          </div>
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

      {/* Danger Zone — Account Deletion (required by Apple App Store guideline 5.1.1(v)) */}
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-700">Delete Account</h3>
            <p className="text-sm text-gray-600 mt-1">
              Permanently delete your EconoPulse account and all associated data
              (profile, portfolios, watchlists, preferences). Active subscriptions
              will be cancelled. <strong>This action cannot be undone.</strong>
            </p>
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteError(null); setDeleteConfirmText(''); }}
              className="mt-4 inline-flex items-center space-x-2 px-4 py-2 border border-red-600 text-red-600 rounded-md text-sm font-medium hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Delete my account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm account deletion</h3>
            </div>
            <p className="text-sm text-gray-700">
              You are about to permanently delete the account associated with{' '}
              <strong>{user?.email}</strong>. All your data will be erased and any active
              subscription will be cancelled.
            </p>
            <p className="text-sm text-gray-700">
              Type <code className="px-1 py-0.5 bg-gray-100 rounded font-mono">DELETE</code> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={deleting}
            />
            {deleteError && (
              <p className="text-sm text-red-600">{deleteError}</p>
            )}
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting…' : 'Delete account permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}