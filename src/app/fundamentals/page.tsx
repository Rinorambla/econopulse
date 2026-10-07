'use client';

// Fundamental Chart page — stockanalysis.com-style fundamental charts with 50+
// indicators, saved charts and multi-ticker comparison (up to 3 symbols).
// Deep-linkable: /fundamentals?symbol=NVDA or /fundamentals?symbol=NVDA,AAPL
import React, { Suspense, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import TerminalShell from '@/components/TerminalShell';
import RequirePlan from '@/components/RequirePlan';

const FundamentalChart = dynamic(() => import('@/components/charts/FundamentalChart'), { ssr: false });

const POPULAR = ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AVGO', 'AMD', 'NFLX'];
const MAX_SYMBOLS = 3;

function parseSymbols(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z0-9.^=-]{1,12}$/.test(s))
    )
  ).slice(0, MAX_SYMBOLS);
}

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

// Debounced stock search (ticker or company name) backed by /api/yahoo-search.
function StockSearch({ onPick, disabled }: { onPick: (symbol: string) => void; disabled?: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/yahoo-search?q=${encodeURIComponent(q)}`, {
          signal: AbortSignal.timeout(8000),
        });
        const js = await res.json();
        const list: SearchResult[] = (js?.data || [])
          .filter((r: SearchResult) => r.type === 'EQUITY')
          .slice(0, 8);
        setResults(list);
        setOpen(true);
        setHover(-1);
      } catch {
        /* keep previous results */
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const pick = (symbol: string) => {
    onPick(symbol);
    setQuery('');
    setResults([]);
    setOpen(false);
    setHover(-1);
  };

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { setHover((h) => Math.min(results.length - 1, h + 1)); e.preventDefault(); }
          else if (e.key === 'ArrowUp') { setHover((h) => Math.max(-1, h - 1)); e.preventDefault(); }
          else if (e.key === 'Escape') setOpen(false);
          else if (e.key === 'Enter') {
            e.preventDefault();
            if (hover >= 0 && hover < results.length) pick(results[hover].symbol);
            else if (results.length) pick(results[0].symbol);
            else {
              const parsed = parseSymbols(query);
              if (parsed.length) pick(parsed[0]);
            }
          }
        }}
        placeholder={disabled ? 'Max 3 tickers' : 'Search stock (e.g. Apple, NVDA)…'}
        disabled={disabled}
        className="w-56 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500 disabled:opacity-50"
        spellCheck={false}
      />
      {open && results.length > 0 && !disabled && (
        <div className="absolute right-0 z-30 mt-1 w-80 overflow-hidden rounded-lg border border-white/15 bg-slate-900/95 shadow-2xl backdrop-blur-sm">
          <ul className="max-h-72 overflow-auto py-1 text-sm">
            {results.map((r, i) => (
              <li
                key={`${r.symbol}-${r.exchange}`}
                onMouseEnter={() => setHover(i)}
                onMouseDown={(e) => { e.preventDefault(); pick(r.symbol); }}
                className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 ${
                  i === hover ? 'bg-blue-600/30 text-white' : 'text-gray-200 hover:bg-white/10'
                }`}
              >
                <span className="font-bold text-blue-300">{r.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-white/60">{r.name}</span>
                <span className="text-[10px] text-white/30">{r.exchange}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FundamentalsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = parseSymbols(searchParams?.get('symbol') || 'NVDA');
  const [symbols, setSymbols] = useState<string[]>(initial.length ? initial : ['NVDA']);

  const sync = (next: string[]) => {
    if (!next.length) return;
    setSymbols(next);
    router.replace(`/fundamentals?symbol=${encodeURIComponent(next.join(','))}`, { scroll: false });
  };

  const addSymbol = (raw: string) => {
    const parsed = parseSymbols(raw);
    if (!parsed.length) return;
    sync(Array.from(new Set([...symbols, ...parsed])).slice(0, MAX_SYMBOLS));
  };

  const removeSymbol = (sym: string) => {
    const next = symbols.filter((s) => s !== sym);
    if (next.length) sync(next);
  };

  const toggleSymbol = (sym: string) => {
    if (symbols.includes(sym)) removeSymbol(sym);
    else addSymbol(sym);
  };

  // Let the terminal topbar search open symbols on this page instead of navigating away.
  useEffect(() => {
    const onOpenQuote = (ev: Event) => {
      const detail = (ev as CustomEvent<{ symbol?: string }>).detail;
      if (!detail?.symbol) return;
      ev.preventDefault();
      sync(parseSymbols(detail.symbol));
    };
    window.addEventListener('terminal:openQuote', onOpenQuote);
    return () => window.removeEventListener('terminal:openQuote', onOpenQuote);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols]);

  return (
    <div className="p-3 sm:p-4 space-y-3">
      {/* Header + stock search */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">Fundamental Chart</h1>
          <p className="text-xs text-white/50">
            65 indicators — valuation, income statement, cash flow, balance sheet, margins,
            per-share & ratios. Up to 20 years of history. Add a 2nd/3rd ticker to compare.
          </p>
        </div>
        <div className="ml-auto">
          <StockSearch onPick={addSymbol} disabled={symbols.length >= MAX_SYMBOLS} />
        </div>
      </div>

      {/* Active symbols */}
      <div className="flex flex-wrap items-center gap-1.5">
        {symbols.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600/20 border border-blue-500/40 px-2.5 py-1 text-[12px] font-bold text-blue-200"
          >
            {s}
            {symbols.length > 1 && (
              <button
                type="button"
                onClick={() => removeSymbol(s)}
                className="text-blue-300/70 hover:text-white"
                aria-label={`Remove ${s}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        <span className="mx-1 h-4 w-px bg-white/10" />
        {POPULAR.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleSymbol(s)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              symbols.includes(s)
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <FundamentalChart symbols={symbols} onSymbolsChange={sync} />
    </div>
  );
}

export default function FundamentalsPage() {
  return (
    <RequirePlan min="free">
      <TerminalShell title="Fundamentals" search>
        <Suspense fallback={<div className="p-6 text-sm text-white/50">Loading…</div>}>
          <FundamentalsInner />
        </Suspense>
      </TerminalShell>
    </RequirePlan>
  );
}
