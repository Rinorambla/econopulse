'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false }) as any;

interface ConflictZone {
  id: string; name: string; lat: number; lon: number;
  intensity: number; type: string; parties: string; since: string;
  note: string; marketImpact: string;
}
interface Hotspot {
  id: string; name: string; lat: number; lon: number;
  riskLevel: 'elevated' | 'high' | 'severe'; note: string; watchFor: string;
}
interface Chokepoint {
  id: string; name: string; lat: number; lon: number;
  tradeShare: string; oilShare?: string;
  status: 'normal' | 'elevated' | 'disrupted'; note: string;
}
interface CentralBank {
  id: string; name: string; country: string; lat: number; lon: number;
  rate: number | null; rateName: string;
  stance: 'easing' | 'on-hold' | 'tightening'; note: string; live: boolean;
}
interface ApiResponse {
  ok: boolean;
  generatedAt: string;
  riskGauge: { score: number; label: string; inputs: { vix: number | null; gold1m: number | null; oil1m: number | null; defense1m: number | null; dollar1m: number | null } };
  conflicts: ConflictZone[];
  hotspots: Hotspot[];
  chokepoints: Chokepoint[];
  centralBanks: CentralBank[];
  macro: {
    gdp: Record<string, number>;
    debt: Record<string, number>;
    inflation: Record<string, number>;
    populationGrowth: Record<string, number>;
    liquidity: Record<string, number>;
    tradeBalance: Record<string, number>;
    bond10y: Record<string, number>;
    pmi: Record<string, number>;
    aiCapex: Record<string, number>;
    epsGrowth: Record<string, number>;
  };
}

type LayerKey = 'conflicts' | 'hotspots' | 'chokepoints' | 'centralBanks';

type MacroKey = 'none' | 'gdp' | 'debt' | 'inflation' | 'liquidity' | 'populationGrowth' | 'bond10y' | 'tradeBalance' | 'pmi' | 'aiCapex' | 'epsGrowth';

const MACRO_META: Record<Exclude<MacroKey, 'none'>, { label: string; unit: string; scale: any; reverse?: boolean; zmin?: number; zmax?: number }> = {
  gdp: { label: 'GDP Growth', unit: '%', scale: 'RdYlGn', zmin: -4, zmax: 8 },
  debt: { label: 'Debt %GDP', unit: '%', scale: 'RdYlGn', reverse: true, zmin: 0, zmax: 160 },
  inflation: { label: 'Inflation', unit: '%', scale: 'RdYlGn', reverse: true, zmin: 0, zmax: 12 },
  liquidity: { label: 'Liquidity (M2 gr.)', unit: '%', scale: 'RdYlGn', zmin: -5, zmax: 20 },
  populationGrowth: { label: 'Population Gr.', unit: '%', scale: 'RdYlGn', zmin: -1, zmax: 3 },
  bond10y: { label: '10Y Yield', unit: '%', scale: 'RdYlGn', reverse: true, zmin: 0, zmax: 12 },
  tradeBalance: { label: 'Trade Balance %GDP', unit: '%', scale: 'RdYlGn', zmin: -15, zmax: 15 },
  pmi: { label: 'PMI', unit: '', scale: 'RdYlGn', zmin: 42, zmax: 58 },
  aiCapex: { label: 'AI Capex', unit: '$B', scale: 'Blues', zmin: 0, zmax: 50 },
  epsGrowth: { label: 'EPS Growth', unit: '%', scale: 'RdYlGn', zmin: 0, zmax: 22 },
};

const LAYER_META: Record<LayerKey, { label: string; color: string; icon: string }> = {
  conflicts: { label: 'Wars & Conflicts', color: '#ef4444', icon: '⚔' },
  hotspots: { label: 'Geopolitical Hotspots', color: '#f59e0b', icon: '⚠' },
  chokepoints: { label: 'Naval Chokepoints', color: '#38bdf8', icon: '⚓' },
  centralBanks: { label: 'Central Banks', color: '#a78bfa', icon: '🏦' },
};

const CHOKE_COLOR: Record<Chokepoint['status'], string> = {
  normal: '#34d399',
  elevated: '#f59e0b',
  disrupted: '#ef4444',
};

const STANCE_ARROW: Record<CentralBank['stance'], string> = {
  easing: '↓ easing',
  'on-hold': '→ on hold',
  tightening: '↑ tightening',
};

export default function GlobalRiskMap() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    conflicts: true, hotspots: true, chokepoints: true, centralBanks: true,
  });
  const [macroKey, setMacroKey] = useState<MacroKey>('gdp');

  useEffect(() => {
    let cancelled = false;
    const load = async (spinner: boolean) => {
      try {
        if (spinner) setLoading(true);
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 30000);
        const r = await fetch('/api/global-risk-map', { cache: 'no-store', signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j: ApiResponse = await r.json();
        if (!cancelled && j.ok) { setData(j); setError(''); }
      } catch {
        if (!cancelled && spinner) setError('Global risk map unavailable');
      } finally {
        if (!cancelled && spinner) setLoading(false);
      }
    };
    load(true);
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(false); }, 600000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const plotData = useMemo(() => {
    if (!data) return [] as any[];
    const traces: any[] = [];

    // Country macro choropleth (bottom layer)
    if (macroKey !== 'none' && data.macro?.[macroKey]) {
      const meta = MACRO_META[macroKey];
      const entries = Object.entries(data.macro[macroKey]);
      if (entries.length) {
        traces.push({
          type: 'choropleth',
          locationmode: 'ISO-3',
          locations: entries.map(([iso3]) => iso3),
          z: entries.map(([, v]) => v),
          zmin: meta.zmin,
          zmax: meta.zmax,
          colorscale: meta.scale,
          reversescale: !!meta.reverse,
          marker: { line: { color: '#0f172a', width: 0.3 } },
          colorbar: {
            title: { text: `${meta.label}${meta.unit ? ` (${meta.unit})` : ''}`, font: { color: '#94a3b8', size: 10 } },
            tickfont: { color: '#94a3b8', size: 9 },
            thickness: 10, len: 0.7, x: 0.99, outlinewidth: 0,
            bgcolor: 'rgba(0,0,0,0)',
          },
          hovertemplate: `%{location}: <b>%{z}${meta.unit}</b> · ${meta.label}<extra></extra>`,
          name: meta.label,
        });
      }
    }

    if (layers.conflicts) {
      traces.push({
        type: 'scattergeo', mode: 'markers+text',
        lat: data.conflicts.map((c) => c.lat),
        lon: data.conflicts.map((c) => c.lon),
        text: data.conflicts.map((c) => c.name.split(' ')[0]),
        textposition: 'top center',
        textfont: { size: 9, color: '#fca5a5' },
        marker: {
          size: data.conflicts.map((c) => 10 + c.intensity * 4),
          color: '#ef4444', opacity: 0.85,
          line: { color: '#7f1d1d', width: 1.5 },
          symbol: 'circle',
        },
        hovertemplate: data.conflicts.map((c) =>
          `<b>⚔ ${c.name}</b><br>${c.parties}<br>Since ${c.since} · Intensity ${c.intensity}/5<br><i>${c.note}</i><br>📈 ${c.marketImpact}<extra></extra>`
        ),
        name: 'Conflicts',
      });
    }

    if (layers.hotspots) {
      const col = (r: Hotspot['riskLevel']) => (r === 'severe' ? '#f97316' : r === 'high' ? '#f59e0b' : '#fbbf24');
      traces.push({
        type: 'scattergeo', mode: 'markers',
        lat: data.hotspots.map((h) => h.lat),
        lon: data.hotspots.map((h) => h.lon),
        marker: {
          size: 13, symbol: 'triangle-up',
          color: data.hotspots.map((h) => col(h.riskLevel)),
          opacity: 0.9, line: { color: '#78350f', width: 1 },
        },
        hovertemplate: data.hotspots.map((h) =>
          `<b>⚠ ${h.name}</b> · ${h.riskLevel.toUpperCase()}<br><i>${h.note}</i><br>👁 Watch: ${h.watchFor}<extra></extra>`
        ),
        name: 'Hotspots',
      });
    }

    if (layers.chokepoints) {
      traces.push({
        type: 'scattergeo', mode: 'markers',
        lat: data.chokepoints.map((c) => c.lat),
        lon: data.chokepoints.map((c) => c.lon),
        marker: {
          size: 12, symbol: 'diamond',
          color: data.chokepoints.map((c) => CHOKE_COLOR[c.status]),
          opacity: 0.95, line: { color: '#0c4a6e', width: 1.2 },
        },
        hovertemplate: data.chokepoints.map((c) =>
          `<b>⚓ ${c.name}</b> · ${c.status.toUpperCase()}<br>Trade: ${c.tradeShare}${c.oilShare ? `<br>Oil: ${c.oilShare}` : ''}<br><i>${c.note}</i><extra></extra>`
        ),
        name: 'Chokepoints',
      });
    }

    if (layers.centralBanks) {
      traces.push({
        type: 'scattergeo', mode: 'markers',
        lat: data.centralBanks.map((b) => b.lat),
        lon: data.centralBanks.map((b) => b.lon),
        marker: {
          size: 11, symbol: 'square',
          color: data.centralBanks.map((b) => (b.stance === 'easing' ? '#34d399' : b.stance === 'tightening' ? '#f87171' : '#a78bfa')),
          opacity: 0.9, line: { color: '#312e81', width: 1.2 },
        },
        hovertemplate: data.centralBanks.map((b) =>
          `<b>🏦 ${b.name}</b> (${b.country})<br>${b.rateName}: <b>${b.rate != null ? b.rate + '%' : 'n/a'}</b>${b.live ? ' · LIVE' : ''}<br>Stance: ${STANCE_ARROW[b.stance]}<br><i>${b.note}</i><extra></extra>`
        ),
        name: 'Central Banks',
      });
    }
    return traces;
  }, [data, layers, macroKey]);

  const layout: any = {
    autosize: true,
    margin: { l: 0, r: 0, t: 0, b: 0 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    showlegend: false,
    geo: {
      showframe: false,
      showcoastlines: true,
      coastlinecolor: '#334155',
      bgcolor: 'rgba(0,0,0,0)',
      projection: { type: 'natural earth' },
      landcolor: '#111a2e',
      lakecolor: '#0b1220',
      showland: true,
      showocean: true,
      oceancolor: '#0b1220',
      showcountries: true,
      countrycolor: '#1f2937',
    },
    hoverlabel: { bgcolor: '#0f172a', bordercolor: '#475569', font: { color: '#f1f5f9', size: 12 } },
  };

  const g = data?.riskGauge;
  const gaugeColor = g == null ? '#64748b' : g.score >= 70 ? '#ef4444' : g.score >= 55 ? '#f97316' : g.score >= 40 ? '#f59e0b' : '#34d399';

  return (
    <div className="w-full">
      {/* Header: live risk gauge + layer toggles */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {g && (
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-gray-500">Global Risk Index</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black" style={{ color: gaugeColor }}>{g.score}</span>
                <span className="text-xs font-bold" style={{ color: gaugeColor }}>{g.label}</span>
              </div>
            </div>
            <div className="hidden sm:block h-8 w-px bg-white/10" />
            <div className="hidden sm:grid grid-cols-5 gap-3 text-center">
              {[['VIX', g.inputs.vix, ''], ['Gold 1M', g.inputs.gold1m, '%'], ['Brent 1M', g.inputs.oil1m, '%'], ['Defense 1M', g.inputs.defense1m, '%'], ['USD 1M', g.inputs.dollar1m, '%']].map(([lbl, v, suffix]) => (
                <div key={String(lbl)}>
                  <div className="text-[8px] uppercase text-gray-500">{lbl}</div>
                  <div className={`text-[11px] font-bold tabular-nums ${v == null ? 'text-gray-500' : Number(v) >= 0 && suffix === '%' ? 'text-emerald-300' : suffix === '%' ? 'text-red-300' : 'text-gray-200'}`}>
                    {v == null ? '—' : `${suffix === '%' && Number(v) > 0 ? '+' : ''}${v}${suffix}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          {(Object.keys(LAYER_META) as LayerKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}
              className={`text-[11px] px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
                layers[k] ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 text-gray-500 hover:text-gray-300'
              }`}
            >
              <span style={{ color: LAYER_META[k].color }}>{LAYER_META[k].icon}</span>
              {LAYER_META[k].label}
            </button>
          ))}
        </div>
      </div>

      {/* Country macro layer selector */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-[9px] uppercase tracking-wider text-gray-500 mr-1">Country layer:</span>
        {([['none', 'None'], ['gdp', 'GDP'], ['debt', 'Debt'], ['inflation', 'Inflation'], ['liquidity', 'Liquidity'], ['populationGrowth', 'Population'], ['bond10y', '10Y Yield'], ['tradeBalance', 'Trade'], ['pmi', 'PMI'], ['aiCapex', 'AI Capex'], ['epsGrowth', 'EPS']] as [MacroKey, string][]).map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setMacroKey(k)}
            className={`text-[10px] px-2 py-1 rounded border transition-colors ${
              macroKey === k ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200 font-semibold' : 'border-white/10 text-gray-500 hover:text-gray-300'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="relative w-full h-[520px] rounded-lg border border-white/10 bg-slate-950/40 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-300">
            <svg className="animate-spin h-5 w-5 mr-2 text-white/80" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" />
            </svg>
            Loading global risk map…
          </div>
        )}
        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-amber-300">{error}</div>
        )}
        {!loading && !error && (
          <Plot data={plotData} layout={layout} config={{ displayModeBar: false, responsive: true }} useResizeHandler style={{ width: '100%', height: '100%' }} />
        )}
      </div>

      {/* Detail cards under the map */}
      {data && (
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Conflicts list */}
          {layers.conflicts && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-wider text-red-300 mb-2 flex items-center gap-1.5">⚔ Active Wars & Conflicts ({data.conflicts.length})</div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {[...data.conflicts].sort((a, b) => b.intensity - a.intensity).map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <span className="mt-1 flex gap-0.5 shrink-0" title={`Intensity ${c.intensity}/5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`w-1.5 h-3 rounded-sm ${i < c.intensity ? 'bg-red-500' : 'bg-white/10'}`} />
                      ))}
                    </span>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-gray-100">{c.name}</span>
                      <span className="text-[10px] text-gray-500"> · since {c.since}</span>
                      <div className="text-[10px] text-gray-400 leading-snug">{c.note}</div>
                      <div className="text-[9px] text-amber-300/80">📈 {c.marketImpact}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chokepoints + central banks side */}
          <div className="space-y-3">
            {layers.chokepoints && (
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-wider text-sky-300 mb-2 flex items-center gap-1.5">⚓ Shipping Chokepoints</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {data.chokepoints.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHOKE_COLOR[c.status] }} />
                      <span className="text-[11px] font-semibold text-gray-200 truncate flex-1">{c.name}</span>
                      <span className="text-[9px] text-gray-500 shrink-0">{c.tradeShare}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-2 text-[9px] text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Normal</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Elevated</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Disrupted</span>
                </div>
              </div>
            )}
            {layers.centralBanks && (
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-wider text-violet-300 mb-2 flex items-center gap-1.5">🏦 Central Banks</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {data.centralBanks.map((b) => (
                    <div key={b.id} className="flex items-center gap-2">
                      <span className={`text-[10px] shrink-0 ${b.stance === 'easing' ? 'text-emerald-400' : b.stance === 'tightening' ? 'text-red-400' : 'text-violet-300'}`}>
                        {b.stance === 'easing' ? '↓' : b.stance === 'tightening' ? '↑' : '→'}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-200 truncate flex-1">{b.name}</span>
                      <span className="text-[10px] font-bold tabular-nums text-gray-300 shrink-0">
                        {b.rate != null ? `${b.rate}%` : '—'}{b.live && <span className="text-emerald-400 text-[8px] ml-0.5">●</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
