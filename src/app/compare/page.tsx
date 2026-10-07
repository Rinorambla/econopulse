'use client';

// Compare Stocks page — total-return (%) comparison with stock search, popular
// pre-sets and branded PNG export. Deep-linkable: /compare?symbols=NVDA,AAPL
import React, { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import TerminalShell from '@/components/TerminalShell';
import RequirePlan from '@/components/RequirePlan';
import StockSearch, { sanitizeSymbols } from '@/components/StockSearch';

const ComparePerformance = dynamic(() => import('@/components/charts/ComparePerformance'), { ssr: false });

const MAX_SYMBOLS = 4;
const SERIES_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ec4899'];

function CompareInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = sanitizeSymbols(searchParams?.get('symbols') || searchParams?.get('symbol') || 'NVDA,AAPL', MAX_SYMBOLS);
  const [symbols, setSymbols] = useState<string[]>(initial.length ? initial : ['NVDA', 'AAPL']);

  const sync = (next: string[]) => {
    if (!next.length) return;
    setSymbols(next);
    router.replace(`/compare?symbols=${encodeURIComponent(next.join(','))}`, { scroll: false });
  };

  const addSymbol = (raw: string) => {
    const parsed = sanitizeSymbols(raw, MAX_SYMBOLS);
    if (!parsed.length) return;
    sync(Array.from(new Set([...symbols, ...parsed])).slice(0, MAX_SYMBOLS));
  };

  const removeSymbol = (sym: string) => {
    const next = symbols.filter((s) => s !== sym);
    if (next.length) sync(next);
  };

  // Let the terminal topbar search open symbols on this page instead of navigating away.
  useEffect(() => {
    const onOpenQuote = (ev: Event) => {
      const detail = (ev as CustomEvent<{ symbol?: string }>).detail;
      if (!detail?.symbol) return;
      ev.preventDefault();
      addSymbol(detail.symbol);
    };
    window.addEventListener('terminal:openQuote', onOpenQuote);
    return () => window.removeEventListener('terminal:openQuote', onOpenQuote);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols]);

  return (
    <div className="p-3 sm:p-4 space-y-3">
      {/* Header + stock search */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold text-white">Compare Stocks</h1>
        <div className="ml-auto">
          <StockSearch
            onPick={addSymbol}
            disabled={symbols.length >= MAX_SYMBOLS}
            placeholder="Add stock to compare…"
            disabledPlaceholder={`Max ${MAX_SYMBOLS} tickers`}
          />
        </div>
      </div>

      {/* Active symbols */}
      <div className="flex flex-wrap items-center gap-1.5">
        {symbols.map((s, i) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-bold"
            style={{
              color: SERIES_COLORS[i % SERIES_COLORS.length],
              borderColor: `${SERIES_COLORS[i % SERIES_COLORS.length]}55`,
              backgroundColor: `${SERIES_COLORS[i % SERIES_COLORS.length]}1a`,
            }}
          >
            {s}
            {symbols.length > 1 && (
              <button
                type="button"
                onClick={() => removeSymbol(s)}
                className="opacity-60 hover:opacity-100"
                aria-label={`Remove ${s}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        <span className="text-[11px] text-white/30">up to {MAX_SYMBOLS} tickers</span>
      </div>

      <ComparePerformance symbols={symbols} onSymbolsChange={sync} />
    </div>
  );
}

export default function ComparePage() {
  return (
    <RequirePlan min="free">
      <TerminalShell title="Compare">
        <Suspense fallback={<div className="p-6 text-sm text-white/50">Loading…</div>}>
          <CompareInner />
        </Suspense>
      </TerminalShell>
    </RequirePlan>
  );
}
