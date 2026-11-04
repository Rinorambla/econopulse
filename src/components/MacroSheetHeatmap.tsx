'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EventHistory } from '@/components/MacroCalendarPanel';
import { matchIndicator } from '@/components/ReleaseTape';
import type { TeCountry, TeIndicator } from '@/lib/te-catalog';

// WECO — World Economic Matrix as a data-sheet heat map: pick a country, rows
// are its macro indicators (GDP, rates, payrolls, CPI, PMIs, housing, …),
// columns the last 26 months, cells the figure released that month. Colour =
// where the print sits within that indicator's own range (cold → hot), so
// turning points jump out row by row. Built on /api/country-history and
// refilled automatically as releases come out; click a row for its history.

type Cell = { a: string; v: number | null; f: string; p: string; period: string; tone: 'green' | 'red' | '' };
type Row = { path: string; name: string; frequency: string; values: Record<string, Cell> };
type Matrix = { months: string[]; rows: Row[]; updatedAt: string; stale?: boolean };

export const SHEET_COUNTRIES: Array<{ code: string; name: string }> = [
  { code: 'US', name: 'United States' }, { code: 'EU', name: 'Euro Area' }, { code: 'CN', name: 'China' },
  { code: 'DE', name: 'Germany' }, { code: 'JP', name: 'Japan' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }, { code: 'IT', name: 'Italy' }, { code: 'CA', name: 'Canada' },
  { code: 'IN', name: 'India' }, { code: 'BR', name: 'Brazil' }, { code: 'KR', name: 'South Korea' },
  { code: 'AU', name: 'Australia' }, { code: 'MX', name: 'Mexico' }, { code: 'ES', name: 'Spain' },
  { code: 'CH', name: 'Switzerland' }, { code: 'SE', name: 'Sweden' }, { code: 'NO', name: 'Norway' },
  { code: 'SG', name: 'Singapore' }, { code: 'HK', name: 'Hong Kong' }, { code: 'NZ', name: 'New Zealand' },
  { code: 'ZA', name: 'South Africa' },
];

type Mode = 'range' | 'forecast' | 'change';

const fmtMonth = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
};

// Diverging colour for a 0..1 position: blue (cold) → neutral → amber/red (hot).
function heat(pos: number, strength = 1): string {
  const t = (pos - 0.5) * 2; // -1..1
  const a = Math.min(0.75, Math.abs(t) * 0.8 * strength);
  return t >= 0 ? `rgba(245,158,11,${a})` : `rgba(56,189,248,${a})`;
}

export default function MacroSheetHeatmap({ fill, onChart }: { fill: boolean; onChart?: (c: TeCountry, i: TeIndicator) => void }) {
  const [country, setCountry] = useState('US');
  const [data, setData] = useState<Record<string, Matrix | 'loading' | 'error'>>({});
  const [mode, setMode] = useState<Mode>('range');
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [hover, setHover] = useState<{ r: Row; m: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async (c: string) => {
      setData((d) => (typeof d[c] === 'object' ? d : { ...d, [c]: 'loading' }));
      try {
        const r = await fetch(`/api/country-history?country=${c}`, { cache: 'no-store', signal: AbortSignal.timeout(58000) });
        const j = await r.json();
        if (!alive) return;
        if (j?.ok && Array.isArray(j.months) && Array.isArray(j.rows)) setData((d) => ({ ...d, [c]: { months: j.months, rows: j.rows, updatedAt: j.updatedAt, stale: !!j.stale } }));
        else setData((d) => (typeof d[c] === 'object' ? d : { ...d, [c]: 'error' }));
      } catch { if (alive) setData((d) => (typeof d[c] === 'object' ? d : { ...d, [c]: 'error' })); }
    };
    load(country);
    const id = setInterval(() => { if (!document.hidden) load(country); }, 10 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, [country]);

  const matrix = data[country];

  // Newest months on the right: scroll there once the sheet is ready.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof matrix === 'object') el.scrollLeft = el.scrollWidth;
  }, [matrix]);

  // Per-row stats for colouring (numeric cells only).
  const stats = useMemo(() => {
    const out = new Map<string, { min: number; max: number }>();
    if (typeof matrix !== 'object') return out;
    for (const r of matrix.rows) {
      const vals = Object.values(r.values).map((c) => c.v).filter((v): v is number => v != null);
      if (vals.length >= 2) out.set(r.path, { min: Math.min(...vals), max: Math.max(...vals) });
    }
    return out;
  }, [matrix]);

  const rows = useMemo(() => {
    if (typeof matrix !== 'object') return [];
    const q = filter.trim().toLowerCase();
    return q ? matrix.rows.filter((r) => r.name.toLowerCase().includes(q)) : matrix.rows;
  }, [matrix, filter]);

  const cellStyle = (r: Row, mo: string, idx: number, months: string[]): React.CSSProperties | undefined => {
    const c = r.values[mo];
    if (!c) return undefined;
    if (mode === 'forecast') {
      if (c.tone === 'green') return { backgroundColor: 'rgba(52,211,153,0.35)' };
      if (c.tone === 'red') return { backgroundColor: 'rgba(248,113,113,0.35)' };
      return undefined;
    }
    if (c.v == null) return undefined;
    if (mode === 'change') {
      // vs the previous filled month of the same row
      let prev: number | null = null;
      for (let i = idx - 1; i >= 0; i--) { const p = r.values[months[i]]; if (p?.v != null) { prev = p.v; break; } }
      if (prev == null || prev === c.v) return undefined;
      const s = stats.get(r.path);
      const span = s ? s.max - s.min || 1 : Math.abs(prev) || 1;
      const t = Math.max(-1, Math.min(1, (c.v - prev) / (span * 0.5)));
      const a = Math.min(0.7, Math.abs(t) * 0.8);
      return { backgroundColor: t > 0 ? `rgba(52,211,153,${a})` : `rgba(248,113,113,${a})` };
    }
    const s = stats.get(r.path);
    if (!s || s.max === s.min) return undefined;
    return { backgroundColor: heat((c.v - s.min) / (s.max - s.min)) };
  };

  const btn = (active: boolean) =>
    `rounded-md border px-2 py-1 text-[11px] transition-colors ${active ? 'border-amber-500/50 bg-amber-500/15 text-amber-200' : 'border-slate-800 bg-slate-900 text-gray-400 hover:border-slate-600 hover:text-gray-200'}`;
  const cname = SHEET_COUNTRIES.find((c) => c.code === country)?.name || country;

  return (
    <div className={`flex flex-col ${fill ? 'min-h-0 flex-1' : ''}`}>
      {/* Country picker */}
      <div className="flex flex-wrap gap-1 border-b border-slate-800 bg-slate-950/60 px-3 py-2">
        {SHEET_COUNTRIES.map((c) => (
          <button
            key={c.code}
            onClick={() => { setCountry(c.code); setOpen(null); }}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition-colors ${country === c.code ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40' : 'text-gray-500 hover:bg-slate-800 hover:text-gray-200'}`}
            title={c.name}
          >
            <span className={`font-mono text-[10px] font-bold ${country === c.code ? 'text-amber-300' : 'text-gray-600'}`}>{c.code}</span>
            <span className="hidden 2xl:inline">{c.name}</span>
          </button>
        ))}
      </div>
      {/* Mode + filter */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-800 bg-slate-950/40 px-3 py-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-gray-500">Colour</span>
        <div className="flex gap-1">
          <button onClick={() => setMode('range')} className={btn(mode === 'range')} title="Where each print sits within its own 26-month range">Hot / cold</button>
          <button onClick={() => setMode('change')} className={btn(mode === 'change')} title="Up or down vs the previous print">Δ vs previous</button>
          <button onClick={() => setMode('forecast')} className={btn(mode === 'forecast')} title="Beat or miss vs consensus">Beat / miss</button>
        </div>
        <span className="hidden h-4 w-px bg-slate-700 sm:block" />
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter indicators… (cpi, pmi, payrolls)" className="w-56 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[12px] text-gray-100 outline-none placeholder:text-gray-600 focus:border-amber-500/60" spellCheck={false} />
        <div className="ml-auto flex items-center gap-3 font-mono text-[9px] text-gray-500">
          {mode === 'range' && <><span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-400/70" /> low in range</span><span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500/70" /> high in range</span></>}
          {mode === 'change' && <><span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400/70" /> rising</span><span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/70" /> falling</span></>}
          {mode === 'forecast' && <><span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400/70" /> beat consensus</span><span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/70" /> missed</span></>}
          {typeof matrix === 'object' && matrix.stale && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-bold text-amber-300">LAST SAVED</span>}
        </div>
      </div>

      {/* Sheet */}
      <div ref={scrollRef} className={`relative overflow-auto ${fill ? 'min-h-0 flex-1' : 'max-h-[70vh]'}`}>
        {(matrix === undefined || matrix === 'loading') && (
          <div className="p-12 text-center text-sm text-gray-500">
            <div className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            Building {cname} data sheet — first load reads every indicator&apos;s history (~15s), then it&apos;s instant.
          </div>
        )}
        {matrix === 'error' && <div className="p-12 text-center text-sm text-gray-500">Data sheet unavailable for {cname} right now. Retrying automatically.</div>}
        {typeof matrix === 'object' && (
          <table className="border-separate border-spacing-0 text-[11px]">
            <thead>
              <tr className="font-mono text-[9px] uppercase tracking-wider text-gray-500">
                <th className="sticky left-0 top-0 z-30 min-w-[240px] border-b border-r border-slate-800 bg-slate-900 py-2 pl-3 pr-3 text-left font-semibold">
                  <span className="text-amber-300">{country}</span> {cname} — indicator
                </th>
                {matrix.months.map((mo, i) => (
                  <th key={mo} className={`sticky top-0 z-20 whitespace-nowrap border-b border-slate-800 bg-slate-900 px-1.5 py-2 text-right font-semibold ${i === matrix.months.length - 1 ? 'text-amber-300' : ''}`}>{fmtMonth(mo)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isOpen = open === r.path;
                return (
                  <FragmentRow key={r.path}>
                    <tr onClick={() => setOpen(isOpen ? null : r.path)} className={`cursor-pointer ${isOpen ? 'bg-slate-800/40' : 'hover:bg-slate-800/25'}`} title="Click for chart + full history">
                      <td className={`sticky left-0 z-10 whitespace-nowrap border-b border-r border-slate-800/70 py-1 pl-3 pr-3 ${isOpen ? 'bg-slate-800' : 'bg-slate-900'}`}>
                        <span className={`mr-1.5 inline-block font-mono text-[9px] transition-transform ${isOpen ? 'rotate-90 text-sky-300' : 'text-gray-600'}`}>▶</span>
                        <span className="text-gray-200">{r.name}</span>
                        <span className="ml-1.5 font-mono text-[9px] text-gray-600">{r.frequency.slice(0, 1)}</span>
                        {onChart && (() => { const m = matchIndicator(country, r.name); return m ? (
                          <button
                            onClick={(ev) => { ev.stopPropagation(); onChart(m.country, m.indicator); }}
                            className="ml-2 rounded border border-slate-700 px-1 py-px font-mono text-[8px] uppercase tracking-wider text-gray-600 transition-colors hover:border-amber-500/50 hover:text-amber-300"
                            title={`Open ${m.indicator.name} chart`}
                          >chart</button>
                        ) : null; })()}
                      </td>
                      {matrix.months.map((mo, i) => {
                        const c = r.values[mo];
                        return (
                          <td
                            key={mo}
                            style={cellStyle(r, mo, i, matrix.months)}
                            onMouseEnter={() => c && setHover({ r, m: mo })}
                            onMouseLeave={() => setHover(null)}
                            className={`whitespace-nowrap border-b border-slate-800/40 px-1.5 py-1 text-right font-mono tabular-nums ${c ? 'text-gray-100' : 'text-slate-700'}`}
                          >
                            {c ? c.a : '·'}
                          </td>
                        );
                      })}
                    </tr>
                    {isOpen && (
                      <tr className="bg-slate-950/70">
                        <td colSpan={matrix.months.length + 1} className="px-0 py-2.5">
                          <div className="sticky left-0 max-w-[960px] px-4"><EventHistory eventPath={r.path} /></div>
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Status line */}
      <div className="flex min-h-[26px] flex-wrap items-center gap-x-3 border-t border-slate-800 bg-slate-900/80 px-3 py-1 font-mono text-[9px] text-gray-500">
        {hover && hover.r.values[hover.m] ? (
          <>
            <span className="font-bold text-amber-300">{country}</span>
            <span className="text-gray-300">{hover.r.name}</span>
            <span>·</span>
            <span className="text-gray-300">{fmtMonth(hover.m)}{hover.r.values[hover.m].period ? ` (${hover.r.values[hover.m].period})` : ''}</span>
            <span className="font-bold text-gray-100">{hover.r.values[hover.m].a}</span>
            {hover.r.values[hover.m].f && <span>consensus {hover.r.values[hover.m].f}</span>}
            {hover.r.values[hover.m].p && <span>previous {hover.r.values[hover.m].p}</span>}
          </>
        ) : (
          <>
            <span>{rows.length} indicators × {typeof matrix === 'object' ? matrix.months.length : 0} months · each figure lands in the month it was released</span>
            <span>· M/Q/W = monthly / quarterly / weekly · click a row for chart + history</span>
            {typeof matrix === 'object' && <span className="ml-auto">updated {new Date(matrix.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · auto-refresh 10 min</span>}
          </>
        )}
      </div>
    </div>
  );
}

// Keyed fragment wrapper for row pairs.
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
