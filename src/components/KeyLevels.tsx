'use client';

import { useEffect, useMemo, useState } from 'react';

interface StrikeLevel {
  strike: number;
  oi: number;
  volume: number;
  type: 'call' | 'put';
  expiration: string;
  iv?: number | null;
  distance: number;
}

interface PivotPoint {
  level: number;
  label: 'R3' | 'R2' | 'R1' | 'P' | 'S1' | 'S2' | 'S3';
}

interface GammaStrike {
  strike: number;
  callOi: number;
  putOi: number;
  callGex: number;
  putGex: number;
  netGex: number;
}

interface InventoryStrike {
  strike: number;
  callBought: number;
  callSold: number;
  putBought: number;
  putSold: number;
  callNet: number;
  putNet: number;
  expiration: string;
}

interface MarketRegime {
  type: 'TREND_BULL' | 'TREND_BEAR' | 'RANGE' | 'VOLATILITY_EXPANSION' | 'CONSOLIDATION';
  label: string;
  confidence: number;
  probabilityBreakout: number;
  probabilityMeanRev: number;
  rationale: string[];
}

interface PredictiveGamma {
  current: number;
  projected1d: number;
  projected3d: number;
  trend: 'rising' | 'falling' | 'stable';
  flipDistance: number | null;
}

interface OptionLeg {
  side: 'long' | 'short';
  type: 'call' | 'put';
  strike: number;
  expiration: string;
  qty: number;
}

interface StrategyIdea {
  name: string;
  category: 'directional-bull' | 'directional-bear' | 'neutral-income' | 'volatility-long' | 'volatility-short';
  legs: OptionLeg[];
  maxProfit: number | null;
  maxLoss: number | null;
  breakevens: number[];
  netDebit: number | null;
  rationale: string;
  score: number;
}

interface KeyLevels {
  symbol: string;
  asOf: string;
  underlyingPrice: number;
  maxPain: number | null;
  callWalls: StrikeLevel[];
  putWalls: StrikeLevel[];
  callVolToday: StrikeLevel[];
  putVolToday: StrikeLevel[];
  high20d: number | null;
  low20d: number | null;
  high52w: number | null;
  low52w: number | null;
  pivots: PivotPoint[];
  vwap20d: number | null;
  gammaProfile: GammaStrike[];
  gammaFlip: number | null;
  inventory: InventoryStrike[];
  inventoryExpiration: string | null;
  regime: MarketRegime | null;
  predictiveGamma: PredictiveGamma | null;
  strategies: StrategyIdea[];
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  notes: string[];
  source: string;
}

const fmt$ = (n: number | null | undefined, dec = 2) =>
  n != null && isFinite(n) ? `$${n.toFixed(dec)}` : '—';
const fmtK = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : String(n);

export default function KeyLevels({ symbol, hintPrice }: { symbol: string; hintPrice?: number }) {
  const [data, setData] = useState<KeyLevels | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'realtime' | 'inventory' | 'regime' | 'levels' | 'tape' | 'strategy' | 'ai' | 'technicals'>('realtime');

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    setData(null);
    const url = hintPrice && isFinite(hintPrice) && hintPrice > 0
      ? `/api/options-levels?symbol=${encodeURIComponent(symbol)}&price=${hintPrice}`
      : `/api/options-levels?symbol=${encodeURIComponent(symbol)}`;
    fetch(url, { cache: 'no-store' })
      .then(async r => {
        // Read as text first so we can handle Vercel timeout/HTML error pages gracefully
        const txt = await r.text();
        try { return JSON.parse(txt); }
        catch {
          throw new Error(r.ok ? 'Server returned an invalid response. Try again.' : `Server error (${r.status}). Try again in a moment.`);
        }
      })
      .then((j) => {
        if (cancel) return;
        if (j?.ok && j.data) setData(j.data);
        else setError(j?.error || 'Unable to compute levels');
      })
      .catch((e) => { if (!cancel) setError(e?.message || 'Network error'); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [symbol, hintPrice]);

  // Build a unified ladder of strikes around current price for visual chart
  const ladder = useMemo(() => {
    if (!data) return null;
    if (!data.gammaProfile || !data.gammaProfile.length) return null;
    const maxAbs = Math.max(...data.gammaProfile.map(r => Math.max(Math.abs(r.callGex), Math.abs(r.putGex))), 1);
    return { rows: data.gammaProfile, maxAbs };
  }, [data]);

  // Filter inventory to ~±3% around spot for the gexstream-style chart (matches their default zoom)
  const inventoryZoomed = useMemo(() => {
    if (!data || !data.inventory?.length) return null;
    const price = data.underlyingPrice;
    if (!price) return null;
    const lo = price * 0.97;
    const hi = price * 1.03;
    let rows = data.inventory.filter(r => r.strike >= lo && r.strike <= hi);
    // If too few strikes in tight band, widen to ±8%
    if (rows.length < 8) {
      const lo2 = price * 0.92;
      const hi2 = price * 1.08;
      rows = data.inventory.filter(r => r.strike >= lo2 && r.strike <= hi2);
    }
    if (!rows.length) return null;
    const maxAbs = Math.max(
      ...rows.map(r => Math.max(r.callBought, r.callSold, r.putBought, r.putSold)),
      1
    );
    return { rows, maxAbs };
  }, [data]);

  if (loading) {
    return (
      <div className="bg-slate-800/40 rounded-lg p-4 ring-1 ring-white/5">
        <div className="text-[11px] font-semibold text-gray-300 mb-2 flex items-center gap-2">
          <span>Key Levels</span>
          <span className="inline-block w-3 h-3 border-2 border-blue-400/60 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-slate-700/50 rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/40 rounded-lg p-4 ring-1 ring-white/5">
        <div className="text-[11px] font-semibold text-gray-300 mb-1">Key Levels</div>
        <div className="text-[11px] text-amber-300">{error}</div>
      </div>
    );
  }
  if (!data) return null;

  const price = data.underlyingPrice;
  const biasColor = data.bias === 'Bullish' ? 'text-emerald-400' : data.bias === 'Bearish' ? 'text-red-400' : 'text-gray-300';

  return (
    <div className="space-y-3">
      {/* Header KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-800/60 rounded-lg p-2.5 ring-1 ring-white/5">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">Price</div>
          <div className="text-lg font-bold text-white tabular-nums">{fmt$(price)}</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2.5 ring-1 ring-white/5">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">Max Pain</div>
          <div className="text-lg font-bold text-amber-300 tabular-nums">
            {fmt$(data.maxPain)}
            {data.maxPain != null && (
              <span className={`ml-1 text-[10px] ${data.maxPain > price ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.maxPain > price ? '+' : ''}{(((data.maxPain - price) / price) * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2.5 ring-1 ring-white/5">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">Bias</div>
          <div className={`text-lg font-bold ${biasColor}`}>{data.bias}</div>
        </div>
      </div>

      {/* Tab navigation (gexstream-style multi-panel) */}
      <div className="flex flex-wrap gap-1 bg-slate-900/60 rounded-lg p-1 ring-1 ring-white/5">
        {[
          { k: 'realtime',   label: 'Real-Time',   icon: '⚡' },
          { k: 'regime',     label: 'Regime',      icon: '🌡️' },
          { k: 'inventory',  label: 'Inventory',   icon: '📊' },
          { k: 'levels',     label: 'Walls',       icon: '🧱' },
          { k: 'tape',       label: 'Tape',        icon: '📜' },
          { k: 'strategy',   label: 'Strategies',  icon: '🎯' },
          { k: 'ai',         label: 'AI Pulse',    icon: '🧠' },
          { k: 'technicals', label: 'Technicals',  icon: '📏' },
        ].map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as any)}
            className={`flex-1 min-w-[90px] text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-colors ${tab === t.k ? 'bg-blue-600/30 text-blue-200 ring-1 ring-blue-500/40' : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/60'}`}
          >
            <span className="mr-1">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Market Regime Panel — AI 2.0 classifier */}
      {(tab === 'realtime' || tab === 'regime') && data.regime && (() => {
        const r = data.regime!;
        const colorMap: Record<string, string> = {
          TREND_BULL: 'from-emerald-500/30 to-emerald-500/5 border-emerald-500/40 text-emerald-300',
          TREND_BEAR: 'from-red-500/30 to-red-500/5 border-red-500/40 text-red-300',
          RANGE: 'from-blue-500/30 to-blue-500/5 border-blue-500/40 text-blue-300',
          VOLATILITY_EXPANSION: 'from-amber-500/30 to-amber-500/5 border-amber-500/40 text-amber-300',
          CONSOLIDATION: 'from-slate-500/30 to-slate-500/5 border-slate-500/40 text-slate-300',
        };
        const pg = data.predictiveGamma;
        const fmtGex = (v: number) => {
          const a = Math.abs(v);
          if (a >= 1e9) return `${v >= 0 ? '+' : '−'}${(a / 1e9).toFixed(2)}B`;
          if (a >= 1e6) return `${v >= 0 ? '+' : '−'}${(a / 1e6).toFixed(1)}M`;
          if (a >= 1e3) return `${v >= 0 ? '+' : '−'}${(a / 1e3).toFixed(0)}K`;
          return `${v.toFixed(0)}`;
        };
        return (
          <div className={`bg-gradient-to-br ${colorMap[r.type]} border rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider opacity-80">Market Regime</div>
                <div className="text-xl font-bold">{r.label}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider opacity-80">Confidence</div>
                <div className="text-2xl font-bold tabular-nums">{r.confidence}<span className="text-sm opacity-70">%</span></div>
              </div>
            </div>
            {/* Probability bars */}
            <div className="space-y-2 mb-3">
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="opacity-80">Breakout probability</span>
                  <span className="font-mono">{r.probabilityBreakout}%</span>
                </div>
                <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-red-500" style={{ width: `${r.probabilityBreakout}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="opacity-80">Mean reversion probability</span>
                  <span className="font-mono">{r.probabilityMeanRev}%</span>
                </div>
                <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${r.probabilityMeanRev}%` }} />
                </div>
              </div>
            </div>
            {/* Predictive gamma row */}
            {pg && (
              <div className="grid grid-cols-3 gap-2 mb-3 text-[11px]">
                <div className="bg-black/25 rounded p-2">
                  <div className="text-[9px] opacity-70 uppercase">Current GEX</div>
                  <div className="font-mono font-bold">{fmtGex(pg.current)}</div>
                </div>
                <div className="bg-black/25 rounded p-2">
                  <div className="text-[9px] opacity-70 uppercase">+1 Day</div>
                  <div className="font-mono font-bold">{fmtGex(pg.projected1d)}</div>
                </div>
                <div className="bg-black/25 rounded p-2">
                  <div className="text-[9px] opacity-70 uppercase">+3 Day</div>
                  <div className="font-mono font-bold">
                    {fmtGex(pg.projected3d)}
                    <span className={`ml-1 text-[9px] ${pg.trend === 'rising' ? 'text-emerald-400' : pg.trend === 'falling' ? 'text-red-400' : 'text-gray-400'}`}>
                      {pg.trend === 'rising' ? '↑' : pg.trend === 'falling' ? '↓' : '→'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Rationale */}
            <ul className="text-[11px] space-y-1 list-disc list-inside opacity-90">
              {r.rationale.map((line, i) => <li key={i}>{line}</li>)}
            </ul>
          </div>
        );
      })()}

      {/* Options Inventory (gexstream.com-style: BOUGHT vs SOLD per strike, nearest expiry) */}
      {(tab === 'realtime' || tab === 'inventory') && inventoryZoomed && (() => {
        const rows = inventoryZoomed.rows;
        const maxAbs = inventoryZoomed.maxAbs;
        const W = 760;
        const padTop = 36;
        const padBottom = 36;
        const padLeft = 64;
        const padRight = 16;
        const barH = 7;
        const rowH = 22;
        const H = padTop + padBottom + rows.length * rowH;
        const chartW = W - padLeft - padRight;
        const chartH = H - padTop - padBottom;
        const xZero = padLeft + chartW / 2;
        const halfW = chartW / 2;
        // Strikes ordered descending top → ascending bottom (matches gexstream)
        const ordered = [...rows].sort((a, b) => b.strike - a.strike);
        const strikes = ordered.map(r => r.strike);
        const minStrike = Math.min(...strikes);
        const maxStrike = Math.max(...strikes);
        const yFor = (s: number) => {
          if (maxStrike === minStrike) return padTop + chartH / 2;
          return padTop + ((maxStrike - s) / (maxStrike - minStrike)) * chartH;
        };
        const priceY = yFor(price);
        const xFor = (v: number) => xZero + (v / maxAbs) * halfW;
        // Tick marks on bottom axis: -max, -max/2, 0, +max/2, +max
        const ticks = [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs];
        const fmtNum = (v: number) => {
          const a = Math.abs(v);
          if (a >= 1000) return `${v >= 0 ? '' : '-'}${(a / 1000).toFixed(1)}K`;
          if (a >= 100) return `${Math.round(v)}`;
          return v.toFixed(0);
        };
        return (
          <div className="bg-slate-900 rounded-lg p-3 ring-1 ring-white/5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[12px] font-semibold text-white">options inventory</div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-emerald-400 font-semibold">CALLS</span>
                <span className="text-red-400 font-semibold">PUTS</span>
              </div>
            </div>
            <div className="text-[10px] text-gray-500 mb-2">
              {data.inventoryExpiration ? `Expiration: ${data.inventoryExpiration}` : '—'}
              {' · '}strikes {minStrike.toFixed(2)}–{maxStrike.toFixed(2)}
            </div>
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ maxHeight: 600 }} preserveAspectRatio="xMidYMid meet">
                {/* Background */}
                <rect x={padLeft} y={padTop} width={chartW} height={chartH} fill="#0b1220" rx={3} />
                {/* SOLD / BOUGHT headers */}
                <text x={xZero - chartW / 4} y={padTop - 12} textAnchor="middle" fontSize={11} fill="#94a3b8" fontWeight={600} letterSpacing={1}>SOLD</text>
                <text x={xZero + chartW / 4} y={padTop - 12} textAnchor="middle" fontSize={11} fill="#cbd5e1" fontWeight={600} letterSpacing={1}>BOUGHT</text>
                {/* Center axis */}
                <line x1={xZero} y1={padTop} x2={xZero} y2={padTop + chartH} stroke="#475569" strokeWidth={1} />
                {/* Tick gridlines */}
                {ticks.map((t, i) => {
                  if (t === 0) return null;
                  const x = xFor(t);
                  return <line key={i} x1={x} y1={padTop} x2={x} y2={padTop + chartH} stroke="#1e293b" strokeWidth={1} strokeDasharray="2 4" />;
                })}
                {/* Bars per strike: calls on top half of row (green), puts on bottom (red).
                    BOUGHT goes right (positive x), SOLD goes left (negative x). */}
                {ordered.map((r) => {
                  const yMid = yFor(r.strike);
                  const yCall = yMid - barH - 1;
                  const yPut  = yMid + 1;
                  const callBoughtW = (r.callBought / maxAbs) * halfW;
                  const callSoldW  = (r.callSold  / maxAbs) * halfW;
                  const putBoughtW  = (r.putBought  / maxAbs) * halfW;
                  const putSoldW   = (r.putSold   / maxAbs) * halfW;
                  const isPriceRow = Math.abs(r.strike - price) / Math.max(price, 1) < 0.0008;
                  return (
                    <g key={r.strike}>
                      {/* CALLS (green) */}
                      {callBoughtW > 0.5 && (
                        <rect x={xZero} y={yCall} width={callBoughtW} height={barH} fill="#22c55e" opacity={0.95} rx={1} />
                      )}
                      {callSoldW > 0.5 && (
                        <rect x={xZero - callSoldW} y={yCall} width={callSoldW} height={barH} fill="#22c55e" opacity={0.95} rx={1} />
                      )}
                      {/* PUTS (red) */}
                      {putBoughtW > 0.5 && (
                        <rect x={xZero} y={yPut} width={putBoughtW} height={barH} fill="#ef4444" opacity={0.95} rx={1} />
                      )}
                      {putSoldW > 0.5 && (
                        <rect x={xZero - putSoldW} y={yPut} width={putSoldW} height={barH} fill="#ef4444" opacity={0.95} rx={1} />
                      )}
                      {/* Strike label */}
                      <text
                        x={padLeft - 8}
                        y={yMid + 4}
                        textAnchor="end"
                        fontSize={11}
                        fill={isPriceRow ? '#fbbf24' : '#94a3b8'}
                        fontFamily="ui-monospace, monospace"
                        fontWeight={isPriceRow ? 700 : 400}
                      >
                        {r.strike.toFixed(2)}
                      </text>
                    </g>
                  );
                })}
                {/* Spot price line */}
                <g>
                  <line x1={padLeft} y1={priceY} x2={padLeft + chartW} y2={priceY} stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="6 4" />
                  <text x={padLeft + chartW - 4} y={priceY - 4} textAnchor="end" fontSize={11} fill="#fbbf24" fontWeight={700} fontFamily="ui-monospace, monospace">
                    {price.toFixed(2)}
                  </text>
                </g>
                {/* Bottom axis ticks */}
                {ticks.map((t, i) => {
                  const x = xFor(t);
                  const y = padTop + chartH + 4;
                  return (
                    <g key={`tk-${i}`}>
                      <line x1={x} y1={padTop + chartH} x2={x} y2={padTop + chartH + 4} stroke="#475569" strokeWidth={1} />
                      <text x={x} y={y + 11} textAnchor="middle" fontSize={10} fill="#94a3b8" fontFamily="ui-monospace, monospace">
                        {fmtNum(t)}
                      </text>
                    </g>
                  );
                })}
                <text x={padLeft + 4} y={H - 6} fontSize={10} fill="#64748b" fontStyle="italic">
                  contract count (nearest expiry)
                </text>
              </svg>
            </div>
          </div>
        );
      })()}

      {/* Gamma Exposure profile — gexstream-style ladder (every strike labeled, dense bars) */}
      {(tab === 'realtime' || tab === 'inventory' || tab === 'levels') && ladder && (() => {
        // Zoom around spot: ±5% (gexstream default), fall back to wider if too few strikes
        const all = ladder.rows;
        let rows = all.filter(r => r.strike >= price * 0.95 && r.strike <= price * 1.05);
        if (rows.length < 15) rows = all.filter(r => r.strike >= price * 0.90 && r.strike <= price * 1.10);
        if (rows.length < 10) rows = all;
        // Sort descending so highest strike is at top (gexstream layout)
        rows = [...rows].sort((a, b) => b.strike - a.strike);
        const maxAbs = Math.max(...rows.map(r => Math.max(Math.abs(r.callGex), Math.abs(r.putGex))), 1);
        const W = 700;
        const rowH = 14;
        const padTop = 30;
        const padBottom = 36;
        const padLeft = 60;
        const padRight = 70;
        const chartH = rows.length * rowH;
        const H = padTop + chartH + padBottom;
        const chartW = W - padLeft - padRight;
        const xZero = padLeft + chartW / 2;
        const halfW = chartW / 2;
        const barH = rowH - 3;
        // Find the row closest to spot and the row closest to gamma flip
        const closestSpotIdx = rows.reduce((best, r, i) => Math.abs(r.strike - price) < Math.abs(rows[best].strike - price) ? i : best, 0);
        const flipIdx = data.gammaFlip != null
          ? rows.reduce((best, r, i) => Math.abs(r.strike - data.gammaFlip!) < Math.abs(rows[best].strike - data.gammaFlip!) ? i : best, 0)
          : -1;
        const yFor = (i: number) => padTop + i * rowH + rowH / 2;
        // X-axis ticks: 5 evenly spaced values
        const tickStep = maxAbs / 2;
        const ticks = [-maxAbs, -tickStep, 0, tickStep, maxAbs];
        const fmtAxis = (v: number) => {
          const a = Math.abs(v);
          if (a >= 1e6) return `${v < 0 ? '-' : ''}${(a / 1e6).toFixed(1)}M`;
          if (a >= 1e3) return `${v < 0 ? '-' : ''}${(a / 1e3).toFixed(0)}K`;
          return v.toFixed(0);
        };
        const priceY = yFor(closestSpotIdx);
        return (
          <div className="bg-slate-900/70 rounded-lg p-3 ring-1 ring-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold text-gray-200 uppercase tracking-wider">gamma exposure</div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-emerald-500 rounded-sm" /> Calls</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-red-500 rounded-sm" /> Puts</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-px" style={{ borderTop: '1.5px dashed #fcd34d' }} /> Spot</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ maxHeight: 720 }} preserveAspectRatio="xMidYMid meet">
                {/* Background */}
                <rect x={padLeft} y={padTop} width={chartW} height={chartH} fill="#0b1220" />
                {/* Vertical grid for axis ticks */}
                {ticks.map((t, i) => {
                  const x = xZero + (t / maxAbs) * halfW;
                  return (
                    <line key={`grid-${i}`} x1={x} y1={padTop} x2={x} y2={padTop + chartH} stroke="#1e293b" strokeWidth={1} strokeDasharray={t === 0 ? undefined : '2 3'} />
                  );
                })}
                {/* Bars + strike labels for every row */}
                {rows.map((r, i) => {
                  const y = yFor(i);
                  const yBar = y - barH / 2;
                  const callW = (Math.abs(r.callGex) / maxAbs) * halfW;
                  const putW = (Math.abs(r.putGex) / maxAbs) * halfW;
                  const isSpot = i === closestSpotIdx;
                  const isFlip = i === flipIdx;
                  const labelColor = isSpot ? '#fcd34d' : isFlip ? '#ef4444' : '#94a3b8';
                  const labelWeight = (isSpot || isFlip) ? 700 : 400;
                  return (
                    <g key={r.strike}>
                      <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize={9.5} fill={labelColor} fontWeight={labelWeight} fontFamily="ui-monospace, monospace">
                        {r.strike.toFixed(2)}
                      </text>
                      {putW > 0.5 && (
                        <rect x={xZero - putW} y={yBar} width={putW} height={barH} fill="#ef4444" opacity={0.9} />
                      )}
                      {callW > 0.5 && (
                        <rect x={xZero} y={yBar} width={callW} height={barH} fill="#10b981" opacity={0.9} />
                      )}
                    </g>
                  );
                })}
                {/* Center zero axis */}
                <line x1={xZero} y1={padTop} x2={xZero} y2={padTop + chartH} stroke="#475569" strokeWidth={1} />
                {/* Spot price line (yellow dashed) with floating label on right */}
                <g>
                  <line x1={padLeft} y1={priceY} x2={padLeft + chartW} y2={priceY} stroke="#fcd34d" strokeWidth={1.5} strokeDasharray="5 3" />
                  <text x={padLeft + chartW + 4} y={priceY + 3} fontSize={11} fontWeight={700} fill="#fcd34d" fontFamily="ui-monospace, monospace">
                    {price.toFixed(2)}
                  </text>
                </g>
                {/* X-axis tick labels */}
                {ticks.map((t, i) => {
                  const x = xZero + (t / maxAbs) * halfW;
                  return (
                    <text key={`tk-${i}`} x={x} y={padTop + chartH + 14} textAnchor="middle" fontSize={9.5} fill="#94a3b8" fontFamily="ui-monospace, monospace">
                      {fmtAxis(t)}
                    </text>
                  );
                })}
                {/* X-axis title */}
                <text x={padLeft} y={padTop + chartH + 30} fontSize={9.5} fill="#64748b" fontFamily="ui-monospace, monospace">
                  shares per $ move
                </text>
              </svg>
            </div>
            <div className="mt-1 text-[10px] text-gray-500 flex flex-wrap gap-3">
              <span>Strikes: {rows.length}</span>
              <span>Range: ${rows[rows.length - 1].strike.toFixed(2)} – ${rows[0].strike.toFixed(2)}</span>
              {data.gammaFlip != null && <span className="text-red-400">γ flip: ${data.gammaFlip.toFixed(2)}</span>}
              {data.maxPain != null && <span className="text-amber-300">Max pain: ${data.maxPain.toFixed(2)}</span>}
            </div>
          </div>
        );
      })()}

      {/* Walls / fresh flow tables */}
      {tab === 'levels' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="bg-emerald-950/30 rounded-lg p-3 ring-1 ring-emerald-500/20">
          <div className="text-[11px] font-semibold text-emerald-300 mb-2 flex items-center gap-1">
            <span>📈 Resistance (Call walls)</span>
          </div>
          <table className="w-full text-[11px]">
            <thead className="text-[9px] text-gray-500 uppercase">
              <tr><th className="text-left">Strike</th><th className="text-right">OI</th><th className="text-right">Vol</th><th className="text-right">Δ%</th></tr>
            </thead>
            <tbody>
              {data.callWalls.length === 0 && <tr><td colSpan={4} className="text-gray-500 text-center py-1">—</td></tr>}
              {data.callWalls.map((w, i) => (
                <tr key={`cw-${i}`} className="border-t border-emerald-500/10">
                  <td className="py-1 text-emerald-300 font-mono font-semibold">${w.strike.toFixed(2)}</td>
                  <td className="text-right tabular-nums text-gray-200">{fmtK(w.oi)}</td>
                  <td className="text-right tabular-nums text-gray-400">{fmtK(w.volume)}</td>
                  <td className={`text-right tabular-nums ${w.distance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{w.distance >= 0 ? '+' : ''}{w.distance.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-red-950/30 rounded-lg p-3 ring-1 ring-red-500/20">
          <div className="text-[11px] font-semibold text-red-300 mb-2 flex items-center gap-1">
            <span>📉 Support (Put walls)</span>
          </div>
          <table className="w-full text-[11px]">
            <thead className="text-[9px] text-gray-500 uppercase">
              <tr><th className="text-left">Strike</th><th className="text-right">OI</th><th className="text-right">Vol</th><th className="text-right">Δ%</th></tr>
            </thead>
            <tbody>
              {data.putWalls.length === 0 && <tr><td colSpan={4} className="text-gray-500 text-center py-1">—</td></tr>}
              {data.putWalls.map((w, i) => (
                <tr key={`pw-${i}`} className="border-t border-red-500/10">
                  <td className="py-1 text-red-300 font-mono font-semibold">${w.strike.toFixed(2)}</td>
                  <td className="text-right tabular-nums text-gray-200">{fmtK(w.oi)}</td>
                  <td className="text-right tabular-nums text-gray-400">{fmtK(w.volume)}</td>
                  <td className={`text-right tabular-nums ${w.distance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{w.distance >= 0 ? '+' : ''}{w.distance.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Fresh flow today */}
      {tab === 'tape' && (data.callVolToday.length > 0 || data.putVolToday.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="bg-slate-800/40 rounded-lg p-3 ring-1 ring-white/5">
            <div className="text-[11px] font-semibold text-cyan-300 mb-2">⚡ Fresh Call Flow (today)</div>
            <table className="w-full text-[11px]">
              <thead className="text-[9px] text-gray-500 uppercase">
                <tr><th className="text-left">Strike</th><th className="text-right">Vol</th><th className="text-right">Exp</th></tr>
              </thead>
              <tbody>
                {data.callVolToday.map((w, i) => (
                  <tr key={`cv-${i}`} className="border-t border-white/5">
                    <td className="py-1 text-cyan-300 font-mono">${w.strike.toFixed(2)}</td>
                    <td className="text-right tabular-nums text-gray-200">{fmtK(w.volume)}</td>
                    <td className="text-right tabular-nums text-gray-400">{w.expiration?.slice(5) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3 ring-1 ring-white/5">
            <div className="text-[11px] font-semibold text-pink-300 mb-2">⚡ Fresh Put Flow (today)</div>
            <table className="w-full text-[11px]">
              <thead className="text-[9px] text-gray-500 uppercase">
                <tr><th className="text-left">Strike</th><th className="text-right">Vol</th><th className="text-right">Exp</th></tr>
              </thead>
              <tbody>
                {data.putVolToday.map((w, i) => (
                  <tr key={`pv-${i}`} className="border-t border-white/5">
                    <td className="py-1 text-pink-300 font-mono">${w.strike.toFixed(2)}</td>
                    <td className="text-right tabular-nums text-gray-200">{fmtK(w.volume)}</td>
                    <td className="text-right tabular-nums text-gray-400">{w.expiration?.slice(5) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Strategy Engine — AI 2.0 trade ideas */}
      {tab === 'strategy' && (
        <div className="space-y-3">
          {(!data.strategies || data.strategies.length === 0) && (
            <div className="bg-slate-800/40 rounded-lg p-4 ring-1 ring-white/5 text-[12px] text-gray-400 text-center">
              No strategy ideas — options chain unavailable or no clear regime.
            </div>
          )}
          {data.strategies.map((s, idx) => {
            const catColor: Record<string, string> = {
              'directional-bull': 'border-emerald-500/40 bg-emerald-500/5',
              'directional-bear': 'border-red-500/40 bg-red-500/5',
              'neutral-income': 'border-blue-500/40 bg-blue-500/5',
              'volatility-long': 'border-amber-500/40 bg-amber-500/5',
              'volatility-short': 'border-purple-500/40 bg-purple-500/5',
            };
            // Build payoff diagram across price range
            const allStrikes = s.legs.map(l => l.strike);
            const lo = Math.min(...allStrikes, price) * 0.85;
            const hi = Math.max(...allStrikes, price) * 1.15;
            const steps = 80;
            const points: { x: number; y: number }[] = [];
            for (let i = 0; i <= steps; i++) {
              const x = lo + ((hi - lo) * i) / steps;
              let y = 0;
              for (const leg of s.legs) {
                const intrinsic = leg.type === 'call' ? Math.max(0, x - leg.strike) : Math.max(0, leg.strike - x);
                const sign = leg.side === 'long' ? 1 : -1;
                y += sign * intrinsic * leg.qty;
              }
              if (s.netDebit != null) y -= s.netDebit;
              points.push({ x, y });
            }
            const minY = Math.min(...points.map(p => p.y));
            const maxY = Math.max(...points.map(p => p.y));
            const padY = (maxY - minY) * 0.15 || 1;
            const yMin = minY - padY;
            const yMax = maxY + padY;
            const W = 600, H = 140, pad = 30;
            const xScale = (x: number) => pad + ((x - lo) / (hi - lo)) * (W - 2 * pad);
            const yScale = (y: number) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad);
            const zeroY = yScale(0);
            const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x).toFixed(1)} ${yScale(p.y).toFixed(1)}`).join(' ');
            // Profitable area
            const positivePath: string[] = [];
            for (const p of points) {
              if (p.y >= 0) positivePath.push(`${xScale(p.x).toFixed(1)},${yScale(p.y).toFixed(1)}`);
            }
            return (
              <div key={idx} className={`border rounded-lg p-3 ${catColor[s.category] || 'border-white/10 bg-slate-800/40'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold text-white">{s.name}</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">{s.category.replace('-', ' / ')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-400">Fit Score</div>
                    <div className="text-lg font-bold tabular-nums text-white">{s.score}<span className="text-xs opacity-70">/100</span></div>
                  </div>
                </div>
                {/* Legs */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {s.legs.map((leg, li) => (
                    <span key={li} className={`text-[10px] px-2 py-0.5 rounded font-mono ${leg.side === 'long' ? 'bg-emerald-600/30 text-emerald-200' : 'bg-red-600/30 text-red-200'}`}>
                      {leg.side === 'long' ? '+' : '−'}{leg.qty} {leg.type.toUpperCase()} ${leg.strike.toFixed(2)} {leg.expiration}
                    </span>
                  ))}
                </div>
                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 text-[11px] mb-2">
                  <div className="bg-black/25 rounded p-2">
                    <div className="text-[9px] text-gray-400 uppercase">Max Profit</div>
                    <div className="text-emerald-300 font-mono font-bold">{s.maxProfit == null ? '∞' : `$${s.maxProfit.toFixed(2)}`}</div>
                  </div>
                  <div className="bg-black/25 rounded p-2">
                    <div className="text-[9px] text-gray-400 uppercase">Max Loss</div>
                    <div className="text-red-300 font-mono font-bold">{s.maxLoss == null ? '∞' : `$${s.maxLoss.toFixed(2)}`}</div>
                  </div>
                  <div className="bg-black/25 rounded p-2">
                    <div className="text-[9px] text-gray-400 uppercase">{s.netDebit != null && s.netDebit < 0 ? 'Net Credit' : 'Net Debit'}</div>
                    <div className="text-white font-mono font-bold">{s.netDebit == null ? '—' : `$${Math.abs(s.netDebit).toFixed(2)}`}</div>
                  </div>
                  <div className="bg-black/25 rounded p-2">
                    <div className="text-[9px] text-gray-400 uppercase">Breakeven{s.breakevens.length > 1 ? 's' : ''}</div>
                    <div className="text-amber-300 font-mono font-bold text-[10px]">{s.breakevens.map(b => `$${b.toFixed(2)}`).join(' / ')}</div>
                  </div>
                </div>
                {/* Payoff diagram */}
                <div className="bg-black/40 rounded p-1">
                  <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="xMidYMid meet">
                    {/* zero line */}
                    <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="#475569" strokeWidth={1} strokeDasharray="3 3" />
                    {/* profit shading: payoff line clipped to y>=0 */}
                    <path d={path + ` L ${W - pad} ${zeroY} L ${pad} ${zeroY} Z`} fill="rgba(34,197,94,0.1)" stroke="none" />
                    {/* payoff line */}
                    <path d={path} fill="none" stroke="#fbbf24" strokeWidth={2} />
                    {/* current price marker */}
                    <line x1={xScale(price)} y1={pad} x2={xScale(price)} y2={H - pad} stroke="#60a5fa" strokeWidth={1} strokeDasharray="4 3" />
                    <text x={xScale(price)} y={pad - 4} textAnchor="middle" fontSize={9} fill="#60a5fa" fontFamily="ui-monospace, monospace">${price.toFixed(2)}</text>
                    {/* breakeven markers */}
                    {s.breakevens.map((be, bi) => (
                      <g key={bi}>
                        <line x1={xScale(be)} y1={pad} x2={xScale(be)} y2={H - pad} stroke="#fbbf24" strokeWidth={0.8} strokeDasharray="2 2" opacity={0.6} />
                        <text x={xScale(be)} y={H - pad + 11} textAnchor="middle" fontSize={9} fill="#fbbf24" fontFamily="ui-monospace, monospace">${be.toFixed(2)}</text>
                      </g>
                    ))}
                    {/* axes labels */}
                    <text x={pad} y={H - 4} fontSize={9} fill="#64748b" fontFamily="ui-monospace, monospace">${lo.toFixed(0)}</text>
                    <text x={W - pad} y={H - 4} textAnchor="end" fontSize={9} fill="#64748b" fontFamily="ui-monospace, monospace">${hi.toFixed(0)}</text>
                  </svg>
                </div>
                <div className="text-[11px] text-gray-300 mt-2">{s.rationale}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Technical levels */}
      {tab === 'technicals' && (      <div className="bg-slate-800/40 rounded-lg p-3 ring-1 ring-white/5">
        <div className="text-[11px] font-semibold text-gray-300 mb-2">📐 Technical Levels</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div><div className="text-gray-500 text-[10px]">52w High</div><div className="text-emerald-300 font-mono">{fmt$(data.high52w)}</div></div>
          <div><div className="text-gray-500 text-[10px]">52w Low</div><div className="text-red-300 font-mono">{fmt$(data.low52w)}</div></div>
          <div><div className="text-gray-500 text-[10px]">20d High</div><div className="text-emerald-300 font-mono">{fmt$(data.high20d)}</div></div>
          <div><div className="text-gray-500 text-[10px]">20d Low</div><div className="text-red-300 font-mono">{fmt$(data.low20d)}</div></div>
          <div><div className="text-gray-500 text-[10px]">VWAP 20d</div><div className="text-blue-300 font-mono">{fmt$(data.vwap20d)}</div></div>
          {data.pivots.slice(0, 7).map(p => (
            <div key={p.label}>
              <div className="text-gray-500 text-[10px]">{p.label} (Pivot)</div>
              <div className={`font-mono ${p.label.startsWith('R') ? 'text-emerald-300' : p.label.startsWith('S') ? 'text-red-300' : 'text-amber-300'}`}>{fmt$(p.level)}</div>
            </div>
          )).slice(0, 3)}
        </div>
      </div>
      )}

      {/* AI Pulse: actionable interpretation */}
      {tab === 'ai' && (() => {
        const nearestCall = data.callWalls.find(w => w.strike >= price);
        const nearestPut = [...data.putWalls].reverse().find(w => w.strike <= price);
        const target = nearestCall?.strike ?? data.high20d ?? null;
        const stop = nearestPut?.strike ?? data.low20d ?? null;
        const upPct = target != null ? ((target - price) / price) * 100 : null;
        const dnPct = stop != null ? ((stop - price) / price) * 100 : null;
        const rr = upPct != null && dnPct != null && dnPct < 0 ? Math.abs(upPct / dnPct) : null;
        const biasClass = data.bias === 'Bullish' ? 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-300'
          : data.bias === 'Bearish' ? 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-300'
          : 'from-slate-500/20 to-slate-500/5 border-slate-500/30 text-slate-300';
        return (
          <div className="space-y-3">
            <div className={`bg-gradient-to-br ${biasClass} border rounded-lg p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">AI Market Interpretation</div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 ring-1 ring-white/10">Sentiment: {data.bias}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-[12px]">
                <div>
                  <div className="text-[10px] text-gray-400">Target (R)</div>
                  <div className="font-mono font-bold">{fmt$(target)}</div>
                  {upPct != null && <div className="text-[10px] text-emerald-400">+{upPct.toFixed(2)}%</div>}
                </div>
                <div>
                  <div className="text-[10px] text-gray-400">Stop (S)</div>
                  <div className="font-mono font-bold">{fmt$(stop)}</div>
                  {dnPct != null && <div className="text-[10px] text-red-400">{dnPct.toFixed(2)}%</div>}
                </div>
                <div>
                  <div className="text-[10px] text-gray-400">R/R</div>
                  <div className="font-mono font-bold">{rr != null ? `${rr.toFixed(2)}×` : '—'}</div>
                  <div className="text-[10px] text-gray-400">{rr != null && rr >= 1.5 ? 'Favorable' : rr != null ? 'Marginal' : '—'}</div>
                </div>
              </div>
            </div>

            {data.notes.length > 0 && (
              <div className="bg-slate-800/40 rounded-lg p-3 ring-1 ring-white/5">
                <div className="text-[11px] font-semibold text-gray-300 mb-2">📝 Signals</div>
                <ul className="text-[11px] text-gray-300 space-y-1 list-disc list-inside">
                  {data.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            )}
          </div>
        );
      })()}

      <p className="text-[10px] text-gray-500 leading-relaxed">
        <strong>Real-Time</strong>: live gamma exposure + options inventory (bought/sold).
        <strong>Walls</strong>: strikes with concentrated OI acting as support/resistance.
        <strong>Tape</strong>: today's largest volume strikes by side.
        <strong>AI Pulse</strong>: actionable target/stop derived from nearest walls, with risk/reward.
        Source: Polygon options chain (nearest expirations) · Yahoo bars · Lee-Ready trade classification.
      </p>
    </div>
  );
}
