'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false }) as any;

type Cycle = 'Reflation' | 'Inflation' | 'Stagflation' | 'Recession' | 'Unknown';

interface CountryCycle {
  iso3: string;
  iso2: string;
  name: string;
  region: string;
  gdpLatest: number | null;
  gdpPrior: number | null;
  cpiLatest: number | null;
  cpiPrior: number | null;
  growthDelta: number | null;
  inflationDelta: number | null;
  cycle: Cycle;
  asOf: string | null;
  source?: 'IMF' | 'WorldBank' | 'Mixed' | null;
}

interface ApiResponse {
  generatedAt: string;
  countries: CountryCycle[];
  summary: Record<Cycle, number>;
  source: string;
}

// Cycle → numeric code (for discrete choropleth color scale)
const CYCLE_CODE: Record<Cycle, number> = {
  Reflation: 0,
  Inflation: 1,
  Stagflation: 2,
  Recession: 3,
  Unknown: 4,
};

const CYCLE_COLOR: Record<Cycle, string> = {
  Reflation: '#22c55e',   // green: best regime
  Inflation: '#f59e0b',   // amber: overheating
  Stagflation: '#ef4444', // red: worst regime
  Recession: '#3b82f6',   // blue: deflation/contraction
  Unknown: '#475569',     // slate
};

const CYCLE_DESCRIPTION: Record<Cycle, string> = {
  Reflation: 'Growth ↑ • Inflation ↓ — Goldilocks recovery, equities outperform',
  Inflation: 'Growth ↑ • Inflation ↑ — Overheating, commodities & value lead',
  Stagflation: 'Growth ↓ • Inflation ↑ — Worst regime, gold & defensives outperform',
  Recession: 'Growth ↓ • Inflation ↓ — Contraction, long-duration bonds outperform',
  Unknown: 'Insufficient data',
};

export default function WorldEconomicCycleMap() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<Cycle | 'All'>('All');

  useEffect(() => {
    let cancelled = false;
    const load = async (showSpinner: boolean) => {
      try {
        if (showSpinner) setLoading(true);
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 30000);
        const r = await fetch('/api/world-economic-cycles', { cache: 'no-store', signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j: ApiResponse = await r.json();
        if (!cancelled) { setData(j); setError(''); }
      } catch (e) {
        if (!cancelled && showSpinner) setError('World cycles unavailable');
      } finally {
        if (!cancelled && showSpinner) setLoading(false);
      }
    };
    load(true);
    // Keep macro cycle data current with a periodic refresh while the tab is visible.
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load(false);
    }, 600000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(false); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const visible = useMemo(() => {
    if (!data) return [] as CountryCycle[];
    if (filter === 'All') return data.countries;
    return data.countries.filter((c) => c.cycle === filter);
  }, [data, filter]);

  const plotData = useMemo(() => {
    if (!data) return [] as any[];
    const locations = visible.map((c) => c.iso3);
    const z = visible.map((c) => CYCLE_CODE[c.cycle]);
    const text = visible.map((c) => {
      const gdp = c.gdpLatest != null ? `${c.gdpLatest.toFixed(1)}%` : 'n/a';
      const cpi = c.cpiLatest != null ? `${c.cpiLatest.toFixed(1)}%` : 'n/a';
      const gd = c.growthDelta != null ? `${c.growthDelta > 0 ? '+' : ''}${c.growthDelta.toFixed(1)}` : 'n/a';
      const id = c.inflationDelta != null ? `${c.inflationDelta > 0 ? '+' : ''}${c.inflationDelta.toFixed(1)}` : 'n/a';
      const src = c.source ? ` • ${c.source}` : '';
      return `<b>${c.name}</b><br>Cycle: <b>${c.cycle}</b><br>GDP: ${gdp} (Δ ${gd})<br>CPI: ${cpi} (Δ ${id})<br>As of: ${c.asOf || 'n/a'}${src}<extra></extra>`;
    });
    // Discrete colorscale: 5 bands
    const colorscale: any = [
      [0.0, CYCLE_COLOR.Reflation],
      [0.2, CYCLE_COLOR.Reflation],
      [0.2, CYCLE_COLOR.Inflation],
      [0.4, CYCLE_COLOR.Inflation],
      [0.4, CYCLE_COLOR.Stagflation],
      [0.6, CYCLE_COLOR.Stagflation],
      [0.6, CYCLE_COLOR.Recession],
      [0.8, CYCLE_COLOR.Recession],
      [0.8, CYCLE_COLOR.Unknown],
      [1.0, CYCLE_COLOR.Unknown],
    ];
    return [
      {
        type: 'choropleth',
        locationmode: 'ISO-3',
        locations,
        z,
        text,
        hovertemplate: '%{text}',
        colorscale,
        zmin: 0,
        zmax: 4,
        showscale: false,
        marker: { line: { color: '#0f172a', width: 0.4 } },
      },
    ];
  }, [data, visible]);

  const layout: any = {
    autosize: true,
    margin: { l: 0, r: 0, t: 0, b: 0 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    geo: {
      showframe: false,
      showcoastlines: true,
      coastlinecolor: '#334155',
      bgcolor: 'rgba(0,0,0,0)',
      projection: { type: 'natural earth' },
      landcolor: '#1e293b',
      lakecolor: '#0f172a',
      showland: true,
      showocean: true,
      oceancolor: '#0b1220',
      showcountries: true,
      countrycolor: '#1f2937',
    },
  };

  const config: any = { displayModeBar: false, responsive: true };

  return (
    <div className="w-full">
      {/* Legend / filter */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          onClick={() => setFilter('All')}
          className={`text-[11px] px-2 py-1 rounded border ${filter === 'All' ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'}`}
        >
          All ({data?.countries.length ?? 0})
        </button>
        {(['Reflation', 'Inflation', 'Stagflation', 'Recession', 'Unknown'] as Cycle[]).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            title={CYCLE_DESCRIPTION[c]}
            className={`text-[11px] px-2 py-1 rounded border flex items-center gap-1.5 ${filter === c ? 'border-white/40 text-white bg-white/10' : 'border-white/10 text-gray-300 hover:text-white'}`}
          >
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CYCLE_COLOR[c] }} />
            {c} ({data?.summary[c] ?? 0})
          </button>
        ))}
      </div>

      <div className="relative w-full h-[460px] rounded border border-white/10 bg-slate-950/40 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-300">
            <svg className="animate-spin h-5 w-5 mr-2 text-white/80" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" />
            </svg>
            Loading world economic cycles…
          </div>
        )}
        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-amber-300">{error}</div>
        )}
        {!loading && !error && (
          <Plot
            data={plotData as any}
            layout={layout}
            config={config}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>

      {/* Footnote */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
        {(['Reflation', 'Inflation', 'Stagflation', 'Recession'] as Cycle[]).map((c) => (
          <div key={c} className="rounded border border-white/10 bg-white/5 px-2 py-1.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CYCLE_COLOR[c] }} />
              <span className="font-semibold text-white">{c}</span>
              <span className="ml-auto text-gray-400">{data?.summary[c] ?? 0}</span>
            </div>
            <div className="text-gray-400 leading-snug">{CYCLE_DESCRIPTION[c]}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-gray-500">
        Source: <span className="text-gray-300">IMF WEO DataMapper</span> (primary, includes current-year nowcast) +
        <span className="text-gray-300"> World Bank WDI</span> (fallback). Cycle classified by weighted score combining GDP growth level &amp; YoY direction with CPI inflation level &amp; YoY direction.
        {data?.generatedAt && <> Updated {new Date(data.generatedAt).toLocaleString()}.</>}
      </div>
    </div>
  );
}
