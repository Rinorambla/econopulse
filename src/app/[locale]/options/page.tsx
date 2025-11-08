"use client";

import { redirect } from '@/i18n/routing';

export default function OptionsRemovedRedirect() {
  redirect('/');
}
"use client";

import dynamic from 'next/dynamic';

const OptionsScreener = dynamic(() => import('@/components/OptionsScreener'), { ssr: false });

export default function OptionsFlowPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-white">
      <div className="max-w-7xl mx-auto px-3 py-3">
        <h1 className="text-sm font-bold mb-2">Options Flow</h1>
        <p className="text-[12px] text-gray-400 mb-3">Live options flow with contract-level tabs: Most Active, Top Gainers, Top Losers, Highest IV, Highest OI.</p>
        <OptionsScreener />
      </div>
    </div>
  );
}
