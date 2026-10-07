'use client';

// Compare page — total-return (%) comparison for any instrument: stocks, ETFs,
// indices, FX, crypto, futures. Starts empty; add symbols via search.
// Deep-linkable: /compare?symbols=NVDA,SPY,^GSPC,BTC-USD
import React, { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import TerminalShell from '@/components/TerminalShell';
import RequirePlan from '@/components/RequirePlan';
import StockSearch, { sanitizeSymbols } from '@/components/StockSearch';

const ComparePerformance = dynamic(() => import('@/components/charts/ComparePerformance'), { ssr: false });

const MAX_SYMBOLS = 13;
const SERIES_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444',
  '#84cc16', '#f97316', '#14b8a6', '#e879f9', '#eab308', '#60a5fa',
];

// Quick-add presets covering every asset class.
const QUICK_ADD: Array<{ label: string; symbols: string[] }> = [
  { label: 'Stocks', symbols: ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN'] },
  { label: 'ETFs', symbols: ['SPY', 'QQQ', 'IWM', 'VTI', 'GLD'] },
  { label: 'Indices', symbols: ['^GSPC', '^NDX', '^DJI', '^VIX', '^STOXX50E'] },
  { label: 'Macro', symbols: ['GC=F', 'CL=F', 'EURUSD=X', '^TNX', 'DX-Y.NYB'] },
  { label: 'Crypto', symbols: ['BTC-USD', 'ETH-USD', 'SOL-USD'] },
];

function CompareInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = sanitizeSymbols(searchParams?.get('symbols') || searchParams?.get('symbol') || '', MAX_SYMBOLS);
  const [symbols, setSymbols] = useState<string[]>(initial);

  const sync = (next: string[]) => {
    const clean = Array.from(new Set(next)).slice(0, MAX_SYMBOLS);
    setSymbols(clean);
    router.replace(clean.length ? `/compare?symbols=${encodeURIComponent(clean.join(','))}` : '/compare', {
      scroll: false,
    });
  };

  const addSymbol = (raw: string) => {
    const parsed = sanitizeSymbols(raw, MAX_SYMBOLS);
    if (!parsed.length) return;
    sync([...symbols, ...parsed]);
  };

  const removeSymbol = (sym: string) => {
    sync(symbols.filter((s) => s !== sym));
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
      {/* Header + search */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold text-white">Compare</h1>
        <div className="ml-auto">
          <StockSearch
            onPick={addSymbol}
            disabled={symbols.length >= MAX_SYMBOLS}
            placeholder="Add stock, ETF, index, FX, crypto…"
            disabledPlaceholder="List is full — remove a symbol"
            allTypes
          />
        </div>
      </div>

      {/* Active symbols */}
      {symbols.length > 0 && (
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
              <button
                type="button"
                onClick={() => removeSymbol(s)}
                className="opacity-60 hover:opacity-100"
                aria-label={`Remove ${s}`}
              >
                ×
              </button>
            </span>
          ))}
          {symbols.length > 1 && (
            <button
              type="button"
              onClick={() => sync([])}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-white/40 hover:bg-white/10 hover:text-white"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Quick-add presets (shown when list is empty) */}
      {symbols.length === 0 && (
        <div className="space-y-2">
          {QUICK_ADD.map((g) => (
            <div key={g.label} className="flex flex-wrap items-center gap-1.5">
              <span className="w-14 text-[10px] font-semibold uppercase tracking-wide text-white/40">{g.label}</span>
              {g.symbols.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSymbol(s)}
                  className="rounded-md bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

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
