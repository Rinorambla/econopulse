// User Dashboard with Usage Analytics and Billing Management
// /dashboard/account
'use client';

import UserAccountDashboard from '@/components/UserAccountDashboard';

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account &amp; Billing</h1>
          <p className="text-gray-600">
            Manage your subscription, usage, and billing settings.
          </p>
        </div>

        <UserAccountDashboard />
      </div>
    </div>
  );
}
