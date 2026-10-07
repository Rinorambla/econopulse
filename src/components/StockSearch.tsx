'use client';

// Debounced stock search (ticker or company name) backed by /api/yahoo-search.
// Shared by the Fundamentals and Compare pages.
import React, { useEffect, useRef, useState } from 'react';

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export function sanitizeSymbols(raw: string, max: number): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z0-9.^=-]{1,12}$/.test(s))
    )
  ).slice(0, max);
}

export default function StockSearch({
  onPick,
  disabled,
  placeholder = 'Search stock (e.g. Apple, NVDA)…',
  disabledPlaceholder = 'Max tickers reached',
}: {
  onPick: (symbol: string) => void;
  disabled?: boolean;
  placeholder?: string;
  disabledPlaceholder?: string;
}) {
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
              const parsed = sanitizeSymbols(query, 1);
              if (parsed.length) pick(parsed[0]);
            }
          }
        }}
        placeholder={disabled ? disabledPlaceholder : placeholder}
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
