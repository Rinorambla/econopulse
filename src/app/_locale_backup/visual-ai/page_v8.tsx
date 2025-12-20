'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Footer from '@/components/Footer';
import RequirePlan from '@/components/RequirePlan';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const SPXChart = dynamic(() => import('@/components/SPXChart'), { ssr: false });

type MarketExtremes = { flameScore: number; bottomScore: number; asOf: string };

type RecessionResponse = { latest?: { value: number; date: string }; series?: Array<{ value: number; date: string }> };

type VixResponse = { success: boolean; data?: { price: number; volatilityLevel: string; color: string } };

type EconomicResponse = {
  data?: {
    current: { cycle: string; growth: string; inflation: string; confidence: number };
    indicators?: {
      gdp?: { value: number; date: string };
      inflation?: { value: number; date: string };
      unemployment?: { value: number; date: string };
      fedRate?: { value: number; date: string };
    };
    lastUpdated?: string;
  };
};

type TopMoversResponse = {
  success?: boolean;
  period?: string;
  top?: Array<{ symbol: string; price: number; changePercent: number }>;
  bottom?: Array<{ symbol: string; price: number; changePercent: number }>;
  timestamp?: string;
};

type FedToolsResponse = { success?: boolean; data?: Array<{ id: string; seriesId?: string; latest?: { value?: number; date?: string } }> };

type SectorResponse = {
  success?: boolean;
  sectors?: Array<{ name?: string; sector?: string; monthly?: number; quarterly?: number; sixMonth?: number; ytd?: number; fiftyTwoWeek?: number }>;
  lastUpdated?: string;
};

type WidgetState<T> = { loading: boolean; error: string | null; data: T | null };

function Sparkline({ values }: { values: number[] }) {
  const width = 240;
  const height = 48;
  const padding = 4;

  const pts = useMemo(() => {
    const v = values.filter(n => Number.isFinite(n));
    if (v.length < 2) return '';
    const min = Math.min(...v);
    const max = Math.max(...v);
    const span = max - min || 1;

    return v
      .map((y, i) => {
        const x = padding + (i * (width - padding * 2)) / (v.length - 1);
        const yn = padding + (1 - (y - min) / span) * (height - padding * 2);
        return `${x.toFixed(1)},${yn.toFixed(1)}`;
      })
      .join(' ');
  }, [values]);

  if (!pts) return <div className="h-12 bg-white/5 rounded" />;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-12">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={pts} className="text-cyan-300" />
    </svg>
  );
}

function levelFromScore(score: number) {
  if (score >= 0.75) return { label: 'Extreme', color: 'text-red-400' };
  if (score >= 0.5) return { label: 'High', color: 'text-orange-300' };
  if (score >= 0.25) return { label: 'Moderate', color: 'text-yellow-300' };
  return { label: 'Low', color: 'text-emerald-300' };
}

function recessionRiskFromValue(v: number) {
  if (v < 0.15) return { label: 'High', color: 'text-red-400' };
  if (v < 0.25) return { label: 'Elevated', color: 'text-orange-300' };
  if (v < 0.4) return { label: 'Moderate', color: 'text-yellow-300' };
  return { label: 'Low', color: 'text-emerald-300' };
}

export default function VisualAIPageV8() {
  const [asOf, setAsOf] = useState<string>('');

  const [extremes, setExtremes] = useState<WidgetState<MarketExtremes>>({ loading: true, error: null, data: null });
  const [recession, setRecession] = useState<WidgetState<RecessionResponse>>({ loading: true, error: null, data: null });
  const [vix, setVix] = useState<WidgetState<VixResponse>>({ loading: true, error: null, data: null });
  const [economic, setEconomic] = useState<WidgetState<EconomicResponse>>({ loading: true, error: null, data: null });
  const [movers, setMovers] = useState<WidgetState<TopMoversResponse>>({ loading: true, error: null, data: null });
  const [fedtools, setFedtools] = useState<WidgetState<FedToolsResponse>>({ loading: true, error: null, data: null });
  const [sectors, setSectors] = useState<WidgetState<SectorResponse>>({ loading: true, error: null, data: null });

  const fetchT = React.useCallback(async (url: string, timeoutMs = 9000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, { cache: 'no-store', signal: ctrl.signal, headers: { accept: 'application/json' } });
    } finally {
      clearTimeout(t);
    }
  }, []);

  const refreshAll = React.useCallback(async () => {
    setAsOf(new Date().toISOString());

    const jobs = [
      (async () => {
        setExtremes(s => ({ ...s, loading: true, error: null }));
        try {
          const r = await fetchT('/api/market-extremes', 9000);
          if (!r.ok) throw new Error('HTTP');
          const j = await r.json();
          if (!j?.success || !j?.data) throw new Error('invalid');
          setExtremes({ loading: false, error: null, data: { flameScore: Number(j.data.flameScore ?? 0), bottomScore: Number(j.data.bottomScore ?? 0), asOf: String(j.data.asOf ?? new Date().toISOString()) } });
        } catch {
          setExtremes({ loading: false, error: 'Unavailable', data: null });
        }
      })(),
      (async () => {
        setRecession(s => ({ ...s, loading: true, error: null }));
        try {
          const r = await fetchT('/api/recession-index?limit=180', 9000);
          if (!r.ok) throw new Error('HTTP');
          const j = (await r.json()) as RecessionResponse;
          setRecession({ loading: false, error: null, data: j });
        } catch {
          setRecession({ loading: false, error: 'Unavailable', data: null });
        }
      })(),
      (async () => {
        setVix(s => ({ ...s, loading: true, error: null }));
        try {
          const r = await fetchT('/api/vix', 8000);
          if (!r.ok) throw new Error('HTTP');
          const j = (await r.json()) as VixResponse;
          if (!j?.success || !j?.data) throw new Error('invalid');
          setVix({ loading: false, error: null, data: j });
        } catch {
          setVix({ loading: false, error: 'Unavailable', data: null });
        }
      })(),
      (async () => {
        setEconomic(s => ({ ...s, loading: true, error: null }));
        try {
          const r = await fetchT('/api/economic-data', 9000);
          if (!r.ok) throw new Error('HTTP');
          const j = (await r.json()) as EconomicResponse;
          if (!j?.data) throw new Error('invalid');
          setEconomic({ loading: false, error: null, data: j });
        } catch {
          setEconomic({ loading: false, error: 'Unavailable', data: null });
        }
      })(),
      (async () => {
        setMovers(s => ({ ...s, loading: true, error: null }));
        try {
          const r = await fetchT('/api/top-movers?limit=5&period=daily', 12000);
          if (!r.ok) throw new Error('HTTP');
          const j = (await r.json()) as TopMoversResponse;
          if (!j?.success) throw new Error('invalid');
          setMovers({ loading: false, error: null, data: j });
        } catch {
          setMovers({ loading: false, error: 'Unavailable', data: null });
        }
      })(),
      (async () => {
        setFedtools(s => ({ ...s, loading: true, error: null }));
        try {
          const r = await fetchT('/api/visual-ai/fed-tools', 9000);
          if (!r.ok) throw new Error('HTTP');
          const j = (await r.json()) as FedToolsResponse;
          if (!j?.success) throw new Error('invalid');
          setFedtools({ loading: false, error: null, data: j });
        } catch {
          setFedtools({ loading: false, error: 'Unavailable', data: null });
        }
      })(),
      (async () => {
        setSectors(s => ({ ...s, loading: true, error: null }));
        try {
          const r = await fetchT('/api/sector-performance', 12000);
          if (!r.ok) throw new Error('HTTP');
          const j = (await r.json()) as SectorResponse;
          if (!j?.success) throw new Error('invalid');
          setSectors({ loading: false, error: null, data: j });
        } catch {
          setSectors({ loading: false, error: 'Unavailable', data: null });
        }
      })(),
    ];

    await Promise.allSettled(jobs);
  }, [fetchT]);

  useEffect(() => {
    refreshAll();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refreshAll();
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [refreshAll]);

  const recessionSeries = recession.data?.series || [];
  const recessionSpark = useMemo(() => {
    const last60 = recessionSeries.slice(-60);
    return last60.map(p => Number(p.value)).filter(n => Number.isFinite(n));
  }, [recessionSeries]);

  const sectorLeaders = useMemo(() => {
    const arr = (sectors.data?.sectors || [])
      .map(s => ({
        name: String(s.name || s.sector || ''),
        monthly: Number(s.monthly ?? 0),
      }))
      .filter(s => s.name);
    arr.sort((a, b) => b.monthly - a.monthly);
    return arr.slice(0, 5);
  }, [sectors.data]);

  const sectorLaggers = useMemo(() => {
    const arr = (sectors.data?.sectors || [])
      .map(s => ({
        name: String(s.name || s.sector || ''),
        monthly: Number(s.monthly ?? 0),
      }))
      .filter(s => s.name);
    arr.sort((a, b) => a.monthly - b.monthly);
    return arr.slice(0, 5);
  }, [sectors.data]);

  const flame = extremes.data?.flameScore ?? 0;
  const bottom = extremes.data?.bottomScore ?? 0;
  const flameLevel = levelFromScore(flame);
  const bottomLevel = levelFromScore(bottom);

  const recessionLatest = recession.data?.latest?.value;
  const recessionRisk = typeof recessionLatest === 'number' ? recessionRiskFromValue(recessionLatest) : null;

  const econ = economic.data?.data;

  return (
    <RequirePlan min="premium">
      <div className="min-h-screen bg-[var(--background)] text-white">
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm">← Dashboard</Link>
              <h1 className="text-xl md:text-2xl font-bold">Visual AI (v8)</h1>
            </div>
            <div className="text-[11px] text-gray-400">Updated: {new Date(asOf || Date.now()).toLocaleTimeString()}</div>
          </div>
          <p className="mt-1 text-[12px] text-gray-400">Real-data macro + market widgets. No synthetic fallback.</p>
        </div>

        <div className="max-w-7xl mx-auto px-4 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1) Market Extremes */}
            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">📊 Market Sentiment Extremes</div>
                <div className="text-[10px] text-gray-500">{extremes.data?.asOf ? new Date(extremes.data.asOf).toLocaleTimeString() : '—'}</div>
              </div>
              {extremes.loading ? (
                <div className="h-16 bg-white/5 rounded" />
              ) : extremes.error ? (
                <div className="text-sm text-gray-400">Unavailable</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-[11px] text-gray-400">🔥 FLAME</div>
                    <div className="text-xl font-bold tabular-nums">{flame.toFixed(2)}</div>
                    <div className={`text-[11px] font-medium ${flameLevel.color}`}>{flameLevel.label}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-[11px] text-gray-400">⚠️ BOTTOM</div>
                    <div className="text-xl font-bold tabular-nums">{bottom.toFixed(2)}</div>
                    <div className={`text-[11px] font-medium ${bottomLevel.color}`}>{bottomLevel.label}</div>
                  </div>
                </div>
              )}
            </div>

            {/* 2) Recession */}
            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4">
              <div className="text-sm font-semibold mb-3">📉 Recession Signal</div>
              {recession.loading ? (
                <div className="h-24 bg-white/5 rounded" />
              ) : recession.error ? (
                <div className="text-sm text-gray-400">Unavailable</div>
              ) : (
                <>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-gray-400">Latest</div>
                      <div className="text-2xl font-bold tabular-nums">{typeof recessionLatest === 'number' ? recessionLatest.toFixed(3) : '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-gray-400">Risk</div>
                      <div className={`text-sm font-semibold ${recessionRisk?.color || 'text-gray-300'}`}>{recessionRisk ? `${recessionRisk.label}` : '—'}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-cyan-300">
                    <Sparkline values={recessionSpark} />
                  </div>
                  <div className="mt-1 text-[10px] text-gray-500">Last ~60 observations.</div>
                </>
              )}
            </div>

            {/* 3) Volatility */}
            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4">
              <div className="text-sm font-semibold mb-3">🌪️ Volatility (VIX)</div>
              {vix.loading ? (
                <div className="h-16 bg-white/5 rounded" />
              ) : vix.error || !vix.data?.data ? (
                <div className="text-sm text-gray-400">Unavailable</div>
              ) : (
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[11px] text-gray-400">VIX</div>
                    <div className="text-2xl font-bold tabular-nums">{vix.data.data.price.toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-gray-400">Level</div>
                    <div className="text-sm font-semibold text-gray-200">{vix.data.data.volatilityLevel}</div>
                  </div>
                </div>
              )}
            </div>

            {/* 4) Economic Cycle */}
            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 lg:col-span-2">
              <div className="text-sm font-semibold mb-3">🧭 Economic Cycle</div>
              {economic.loading ? (
                <div className="h-20 bg-white/5 rounded" />
              ) : economic.error || !econ ? (
                <div className="text-sm text-gray-400">Unavailable</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-[11px] text-gray-400">Cycle</div>
                    <div className="text-sm font-semibold text-gray-200">{econ.current.cycle}</div>
                    <div className="text-[10px] text-gray-500">Confidence: {Math.round(econ.current.confidence)}%</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-[11px] text-gray-400">GDP</div>
                    <div className="text-sm font-semibold tabular-nums">{econ.indicators?.gdp?.value?.toFixed?.(2) ?? '—'}</div>
                    <div className="text-[10px] text-gray-500">{econ.indicators?.gdp?.date || ''}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-[11px] text-gray-400">Inflation</div>
                    <div className="text-sm font-semibold tabular-nums">{econ.indicators?.inflation?.value?.toFixed?.(2) ?? '—'}%</div>
                    <div className="text-[10px] text-gray-500">{econ.indicators?.inflation?.date || ''}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-[11px] text-gray-400">Unemployment</div>
                    <div className="text-sm font-semibold tabular-nums">{econ.indicators?.unemployment?.value?.toFixed?.(2) ?? '—'}%</div>
                    <div className="text-[10px] text-gray-500">{econ.indicators?.unemployment?.date || ''}</div>
                  </div>
                </div>
              )}
            </div>

            {/* 5) Sector performance */}
            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4">
              <div className="text-sm font-semibold mb-3">🏁 Sector Performance (1M)</div>
              {sectors.loading ? (
                <div className="h-24 bg-white/5 rounded" />
              ) : sectors.error ? (
                <div className="text-sm text-gray-400">Unavailable</div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <div className="text-[11px] text-gray-400 mb-1">Leaders</div>
                    <ul className="space-y-1">
                      {sectorLeaders.map(s => (
                        <li key={s.name} className="flex items-center justify-between text-[12px]">
                          <span className="text-gray-200">{s.name}</span>
                          <span className={`tabular-nums font-semibold ${s.monthly >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{s.monthly.toFixed(2)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[11px] text-gray-400 mb-1">Laggers</div>
                    <ul className="space-y-1">
                      {sectorLaggers.map(s => (
                        <li key={s.name} className="flex items-center justify-between text-[12px]">
                          <span className="text-gray-200">{s.name}</span>
                          <span className={`tabular-nums font-semibold ${s.monthly >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{s.monthly.toFixed(2)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <div className="mt-2 text-[10px] text-gray-500">Source: /api/sector-performance</div>
            </div>

            {/* 6) SPX chart */}
            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 lg:col-span-2">
              <div className="text-sm font-semibold mb-3">📈 S&P 500 (SPX)</div>
              <div className="h-72">
                <SPXChart />
              </div>
            </div>

            {/* 7) Top movers */}
            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">⚡ Top Movers (Daily)</div>
                <div className="text-[10px] text-gray-500">{movers.data?.timestamp ? new Date(movers.data.timestamp).toLocaleTimeString() : '—'}</div>
              </div>
              {movers.loading ? (
                <div className="h-24 bg-white/5 rounded" />
              ) : movers.error ? (
                <div className="text-sm text-gray-400">Unavailable</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-gray-400 mb-1">Gainers</div>
                    <div className="space-y-1">
                      {(movers.data?.top || []).slice(0, 5).map(m => (
                        <div key={m.symbol} className="flex items-center justify-between text-[12px]">
                          <span className="text-gray-200">{m.symbol}</span>
                          <span className="tabular-nums font-semibold text-emerald-300">{Number(m.changePercent).toFixed(2)}%</span>
                        </div>
                      ))}
                      {!((movers.data?.top || []).length) && <div className="text-sm text-gray-400">No data</div>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400 mb-1">Losers</div>
                    <div className="space-y-1">
                      {(movers.data?.bottom || []).slice(0, 5).map(m => (
                        <div key={m.symbol} className="flex items-center justify-between text-[12px]">
                          <span className="text-gray-200">{m.symbol}</span>
                          <span className="tabular-nums font-semibold text-red-300">{Number(m.changePercent).toFixed(2)}%</span>
                        </div>
                      ))}
                      {!((movers.data?.bottom || []).length) && <div className="text-sm text-gray-400">No data</div>}
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-2 text-[10px] text-gray-500">Source: /api/top-movers</div>
            </div>

            {/* 8) Fed Tools */}
            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4">
              <div className="text-sm font-semibold mb-3">🧰 Fed Tools (FRED)</div>
              {fedtools.loading ? (
                <div className="h-20 bg-white/5 rounded" />
              ) : fedtools.error ? (
                <div className="text-sm text-gray-400">Unavailable</div>
              ) : (
                <div className="space-y-2">
                  {(fedtools.data?.data || []).slice(0, 6).map((s: any) => {
                    const id = String(s?.seriesId || s?.id || '');
                    const val = s?.latest?.value;
                    const date = s?.latest?.date;
                    return (
                      <div key={id} className="flex items-center justify-between text-[12px]">
                        <span className="text-gray-200">{id}</span>
                        <span className="text-gray-300 tabular-nums">{typeof val === 'number' ? val.toFixed(3) : '—'} {date ? <span className="text-[10px] text-gray-500 ml-2">{date}</span> : null}</span>
                      </div>
                    );
                  })}
                  {!((fedtools.data?.data || []).length) && <div className="text-sm text-gray-400">No data</div>}
                </div>
              )}
              <div className="mt-2 text-[10px] text-gray-500">Source: /api/visual-ai/fed-tools</div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </RequirePlan>
  );
}
