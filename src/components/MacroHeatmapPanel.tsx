'use client';

import { useEffect, useMemo, useState } from 'react';
import type { HeatCountry, HeatKpi, HeatmapPayload } from '@/lib/macro-heatmap';

// Country × indicator heat map on EconoPulse's own macro snapshot
// (/api/macro-heatmap). Cells are coloured per column: percentile rank across
// countries, oriented by the indicator's "healthy" direction. Click a header
// to sort, a cell to open that series in the chart panel.

type Sort = { key: string; desc: boolean };

const fmt = (v: number, unit: string) => {
  if (!Number.isFinite(v)) return '—';
  if (unit === '%') return `${v.toFixed(Math.abs(v) < 10 ? 2 : 1)}`;
  // Absolute USD figures arrive in raw dollars regardless of the declared unit.
  if (unit === 'USD bn' || unit === 'USD') {
    const a = Math.abs(v);
    if (a >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
    if (a >= 1e9) return `${(v / 1e9).toFixed(0)}B`;
    if (a >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
    if (a >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
    return v.toFixed(0);
  }
  return v.toFixed(1);
};

// Percentile 0..1 of v within arr (ties share rank).
const pct = (v: number, sorted: number[]) => {
  if (sorted.length < 2) return 0.5;
  let lo = 0;
  while (lo < sorted.length && sorted[lo] < v) lo++;
  let hi = lo;
  while (hi < sorted.length && sorted[hi] <= v) hi++;
  return ((lo + hi) / 2) / sorted.length;
};

// 0 = worst → red, 0.5 → neutral slate, 1 = best → emerald. For 'none' KPIs
// the scale runs cold blue (low) → warm amber (high) instead of good/bad.
function cellStyle(p: number, good: HeatKpi['good']): React.CSSProperties {
  if (good === 'none') {
    const t = p * 2 - 1; // -1..1
    const a = Math.min(0.55, Math.abs(t) * 0.6);
    return { backgroundColor: t >= 0 ? `rgba(251,191,36,${a})` : `rgba(56,189,248,${a})` };
  }
  const score = good === 'up' ? p : 1 - p;
  const t = score * 2 - 1;
  const a = Math.min(0.6, Math.abs(t) * 0.7);
  return { backgroundColor: t >= 0 ? `rgba(52,211,153,${a})` : `rgba(248,113,113,${a})` };
}

export default function MacroHeatmapPanel({
  fill,
  onPick,
}: {
  fill: boolean;
  /** Called with (iso2, kpiId) when a cell is clicked. */
  onPick?: (iso2: string, kpi: HeatKpi) => void;
}) {
  const [data, setData] = useState<HeatmapPayload | null>(null);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<Sort>({ key: 'NA.GDP.CUR.USD', desc: true });
  const [query, setQuery] = useState('');
  const [hover, setHover] = useState<{ c: HeatCountry; k: HeatKpi } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/macro-heatmap', { cache: 'no-store', signal: AbortSignal.timeout(25000) });
        const j = await r.json();
        if (alive && j?.ok) setData(j);
        else if (alive) setError(true);
      } catch { if (alive) setError(true); }
    })();
    return () => { alive = false; };
  }, []);

  const columns = useMemo(() => {
    if (!data) return {} as Record<string, number[]>;
    const out: Record<string, number[]> = {};
    for (const k of data.kpis) {
      out[k.id] = data.countries.map((c) => c.values[k.id]?.v).filter((v): v is number => Number.isFinite(v as number)).sort((a, b) => a - b);
    }
    return out;
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const list = data.countries.filter((c) => !q || c.name.toLowerCase().includes(q) || c.iso2.toLowerCase() === q || c.iso3.toLowerCase() === q);
    const val = (c: HeatCountry) => (sort.key === 'name' ? c.name : c.values[sort.key]?.v ?? (sort.desc ? -Infinity : Infinity));
    return list.sort((a, b) => {
      const va = val(a), vb = val(b);
      if (typeof va === 'string' && typeof vb === 'string') return sort.desc ? vb.localeCompare(va) : va.localeCompare(vb);
      return sort.desc ? (vb as number) - (va as number) : (va as number) - (vb as number);
    });
  }, [data, query, sort]);

  const clickSort = (key: string) => setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== 'name' }));

  return (
    <div className={`flex flex-col ${fill ? 'min-h-0 flex-1' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-800 bg-slate-950/60 px-3 py-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter country…"
          className="w-44 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[12px] text-gray-100 outline-none placeholder:text-gray-600 focus:border-amber-500/60"
          spellCheck={false}
        />
        <span className="font-mono text-[10px] text-gray-500">
          sorted by <span className="text-amber-300">{sort.key === 'name' ? 'COUNTRY' : data?.kpis.find((k) => k.id === sort.key)?.short}</span> {sort.desc ? '↓' : '↑'}
        </span>
        <div className="ml-auto flex items-center gap-3 font-mono text-[9px] text-gray-500">
          <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400/70" /> healthier</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/70" /> weaker</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-400/60" /> low · <i className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400/60" /> high</span>
          <span>rank vs peers</span>
        </div>
      </div>

      <div className={`relative overflow-auto ${fill ? 'min-h-0 flex-1' : 'max-h-[620px]'}`}>
        {!data && !error && <div className="p-10 text-center text-sm text-gray-500">Building macro heat map…</div>}
        {error && <div className="p-10 text-center text-sm text-gray-500">Heat map unavailable right now.</div>}
        {data && (
          <table className="w-full border-separate border-spacing-0 text-[11px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-900 font-mono text-[9px] uppercase tracking-wider text-gray-500">
                <th onClick={() => clickSort('name')} className="sticky left-0 z-30 cursor-pointer bg-slate-900 border-b border-r border-slate-800 pl-3 pr-2 py-2 text-left font-semibold hover:text-gray-200">
                  Country {sort.key === 'name' ? (sort.desc ? '↓' : '↑') : ''}
                </th>
                {data.kpis.map((k) => (
                  <th
                    key={k.id}
                    onClick={() => clickSort(k.id)}
                    title={`${k.label} (${k.unit}) — click to sort`}
                    className={`cursor-pointer border-b border-slate-800 px-1.5 py-2 text-right font-semibold whitespace-nowrap hover:text-gray-200 ${sort.key === k.id ? 'text-amber-300' : ''}`}
                  >
                    {k.short}{sort.key === k.id ? (sort.desc ? ' ↓' : ' ↑') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.iso3} className="group">
                  <td className="sticky left-0 z-10 border-b border-r border-slate-800/70 bg-slate-900 pl-3 pr-2 py-1 whitespace-nowrap group-hover:bg-slate-800">
                    <span className="mr-2 font-mono text-[10px] font-bold text-gray-500">{c.iso2}</span>
                    <span className="text-gray-200">{c.name}</span>
                  </td>
                  {data.kpis.map((k) => {
                    const cell = c.values[k.id];
                    if (!cell) return <td key={k.id} className="border-b border-slate-800/40 px-1.5 py-1 text-right text-slate-700">·</td>;
                    const p = pct(cell.v, columns[k.id]);
                    const delta = cell.prev != null ? cell.v - cell.prev : null;
                    return (
                      <td
                        key={k.id}
                        style={cellStyle(p, k.good)}
                        onClick={() => onPick?.(c.iso2, k)}
                        onMouseEnter={() => setHover({ c, k })}
                        onMouseLeave={() => setHover(null)}
                        className={`border-b border-slate-800/40 px-1.5 py-1 text-right font-mono tabular-nums text-gray-100 transition-[filter] ${onPick ? 'cursor-pointer hover:brightness-150' : ''}`}
                        title={`${c.name} — ${k.label}: ${fmt(cell.v, k.unit)} ${k.unit}${delta != null ? ` (prev ${fmt(cell.prev as number, k.unit)})` : ''} · ${cell.date}`}
                      >
                        {fmt(cell.v, k.unit)}
                        {delta != null && Math.abs(delta) > 1e-9 && (
                          <span className={`ml-0.5 text-[8px] ${delta > 0 ? 'text-emerald-200' : 'text-red-200'}`}>{delta > 0 ? '▲' : '▼'}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex min-h-[26px] flex-wrap items-center gap-x-3 border-t border-slate-800 bg-slate-900/80 px-3 py-1 font-mono text-[9px] text-gray-500">
        {hover ? (
          <>
            <span className="font-bold text-amber-300">{hover.c.iso2}</span>
            <span className="text-gray-300">{hover.c.name}</span>
            <span>·</span>
            <span className="text-gray-300">{hover.k.label}</span>
            <span className="font-bold text-gray-100">{fmt(hover.c.values[hover.k.id]!.v, hover.k.unit)} {hover.k.unit}</span>
            {hover.c.values[hover.k.id]!.prev != null && <span>prev {fmt(hover.c.values[hover.k.id]!.prev as number, hover.k.unit)}</span>}
            <span>as of {hover.c.values[hover.k.id]!.date}</span>
            {onPick && <span className="ml-auto text-gray-600">click → open chart</span>}
          </>
        ) : (
          <>
            <span>{rows.length} countries × {data?.kpis.length ?? 0} indicators</span>
            <span>· ▲▼ vs previous reading · hover a cell for details · click to chart</span>
            {data && <span className="ml-auto">IMF / BIS / World Bank · updated {new Date(data.updatedAt).toLocaleDateString('en-GB')}</span>}
          </>
        )}
      </div>
    </div>
  );
}
