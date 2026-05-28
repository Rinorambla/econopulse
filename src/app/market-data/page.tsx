'use client';

import PlanGate from '@/components/PlanGate';
import MarketDataInner from '../[locale]/market-data/page';

export default function MarketDataPage() {
  return (
    <PlanGate requiredPlan="free">
      <MarketDataInner />
    </PlanGate>
  );
}
