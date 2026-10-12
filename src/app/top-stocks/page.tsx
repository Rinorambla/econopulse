'use client';

// Top Stocks — Medium/Long Term: 12-criteria value & quality screen.
import dynamic from 'next/dynamic';
import TerminalShell from '@/components/TerminalShell';
import RequirePlan from '@/components/RequirePlan';

const ValuePortfolioScreener = dynamic(() => import('@/components/ValuePortfolioScreener'), { ssr: false });

export default function TopStocksPage() {
  return (
    <RequirePlan min="free">
      <TerminalShell title="Top Stocks">
        <div className="p-3 sm:p-4">
          <ValuePortfolioScreener />
        </div>
      </TerminalShell>
    </RequirePlan>
  );
}
