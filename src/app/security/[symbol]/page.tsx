'use client';

// Standalone quote page (deep-linkable); the same panel opens inline on the dashboard.
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import TerminalShell from '@/components/TerminalShell';
import RequirePlan from '@/components/RequirePlan';
import SecurityPanel from '@/components/SecurityPanel';

export default function SecurityPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = useMemo(() => decodeURIComponent(String(params?.symbol || 'AAPL')).toUpperCase(), [params]);

  return (
    <RequirePlan min="free">
      <TerminalShell title={symbol}>
        <div className="p-3">
          <SecurityPanel symbol={symbol} />
        </div>
      </TerminalShell>
    </RequirePlan>
  );
}
