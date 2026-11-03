'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// Compact searchable picker (terminal style): type to filter, ↑/↓ to move,
// Enter to select, Esc to close.

export type SearchItem = { slug: string; name: string; code?: string; group?: string };

interface Props<T extends SearchItem> {
  items: T[];
  value: T;
  onChange: (item: T) => void;
  placeholder: string;
  label: string;
  className?: string;
}

export default function SearchSelect<T extends SearchItem>({ items, value, onChange, placeholder, label, className = '' }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 60);
    const terms = q.split(/\s+/);
    const score = (it: T) => {
      const hay = `${it.name} ${it.code || ''} ${it.group || ''} ${it.slug.replace(/-/g, ' ')}`.toLowerCase();
      if (!terms.every((t) => hay.includes(t))) return -1;
      if (it.name.toLowerCase().startsWith(q)) return 3;
      if ((it.code || '').toLowerCase() === q) return 4;
      if (it.name.toLowerCase().includes(q)) return 2;
      return 1;
    };
    return items
      .map((it) => ({ it, s: score(it) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s || a.it.name.localeCompare(b.it.name))
      .slice(0, 60)
      .map((x) => x.it);
  }, [items, query]);

  useEffect(() => setActive(0), [query, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const pick = (it: T) => { onChange(it); setOpen(false); setQuery(''); };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <label className="pointer-events-none absolute left-2 top-1 font-mono text-[8px] font-bold uppercase tracking-widest text-gray-500">{label}</label>
      <input
        value={open ? query : value.name}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); if (open && results[active]) pick(results[active]); }
          else if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur(); }
        }}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 pb-1 pt-4 text-[12px] font-semibold text-gray-100 outline-none placeholder:font-normal placeholder:text-gray-600 focus:border-amber-500/60"
        spellCheck={false}
        autoComplete="off"
      />
      {value.code && !open && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-slate-800 px-1 font-mono text-[9px] font-bold text-amber-300">{value.code}</span>
      )}
      {open && (
        <ul ref={listRef} className="absolute left-0 z-50 mt-1 max-h-72 w-full min-w-[260px] overflow-auto rounded-md border border-slate-700 bg-slate-950 py-1 shadow-2xl">
          {results.length === 0 && <li className="px-3 py-2 text-[11px] text-gray-500">No match</li>}
          {results.map((it, i) => (
            <li
              key={it.slug}
              onMouseDown={(e) => { e.preventDefault(); pick(it); }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] ${i === active ? 'bg-amber-500/15 text-amber-100' : 'text-gray-300'} ${it.slug === value.slug ? 'font-bold' : ''}`}
            >
              {it.code && <span className="w-7 shrink-0 font-mono text-[10px] font-bold text-gray-500">{it.code}</span>}
              <span className="truncate">{it.name}</span>
              {it.group && <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-wider text-gray-600">{it.group}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
