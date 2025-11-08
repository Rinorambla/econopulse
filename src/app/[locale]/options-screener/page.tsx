"use client";

import { redirect } from '@/i18n/routing';

export default function OptionsScreenerRemovedRedirect() {
  redirect('/');
}
"use client";

import dynamic from 'next/dynamic';

const OptionsScreener = dynamic(() => import('@/components/OptionsScreener'), { ssr: false });

export default function OptionsScreenerPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-white">
      <div className="max-w-7xl mx-auto px-3 py-3">
        <h1 className="text-sm font-bold mb-2">Options Screener</h1>
        <p className="text-[12px] text-gray-400 mb-3">Interactive options screener with Most Active, Top Gainers, Top Losers, Highest IV, and Highest OI.</p>
        <OptionsScreener />
      </div>
    </div>
  );
}
