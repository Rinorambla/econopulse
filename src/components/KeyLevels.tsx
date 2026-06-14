'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

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

// SqueezeMetrics dark-index style palette
const SQ_BG = '#1e2131';
const SQ_YELLOW = 'hsl(45,100%,60%)';
const SQ_PURPLE = 'hsl(278,70%,50%)';
const SQ_TEAL = 'hsl(194,64%,65%)';
const SQ_INDIGO = 'hsl(235,66%,50%)';
const SQ_GREEN = '#3fb950';

function SqPill({ on, color, onClick, children }: { on: boolean; color: string; onClick: () => void; children: ReactNode }) {
  return (
    <span
      onClick={onClick}
      className="cursor-pointer select-none rounded-[10px] border-2 px-2.5 text-[11px] font-bold leading-5"
      style={{ borderColor: color, backgroundColor: on ? color : 'transparent', color: on ? SQ_BG : color, fontFamily: 'Tahoma, sans-serif' }}
    >
      {children}
    </span>
  );
}

export default function KeyLevels({ symbol, hintPrice }: { symbol: string; hintPrice?: number }) {
  const [data, setData] = useState<KeyLevels | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'realtime' | 'inventory' | 'regime' | 'levels' | 'tape' | 'strategy' | 'ai' | 'technicals'>('realtime');
  const [horizon, setHorizon] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1W');
  const [historyBars, setHistoryBars] = useState<Array<{ time: number; close: number }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showCalls, setShowCalls] = useState(true);
  const [showPuts, setShowPuts] = useState(true);
  const [invChartMode, setInvChartMode] = useState<'bars' | 'line'>('bars');
  const [gexChartMode, setGexChartMode] = useState<'bars' | 'line'>('bars');

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

  useEffect(() => {
    let cancel = false;
    const cfg: Record<'1D' | '1W' | '1M' | '3M' | '1Y', { range: string; interval: string }> = {
      '1D': { range: '1d', interval: '5m' },
      '1W': { range: '5d', interval: '30m' },
      '1M': { range: '1mo', interval: '1d' },
      '3M': { range: '3mo', interval: '1d' },
      '1Y': { range: '1y', interval: '1d' },
    };
    const { range, interval } = cfg[horizon];
    const run = async () => {
      setHistoryLoading(true);
      try {
        const qs = new URLSearchParams({ symbol, range, interval });
        const res = await fetch(`/api/yahoo-history?${qs.toString()}`, { cache: 'no-store' });
        const js = await res.json();
        if (cancel) return;
        const bars = Array.isArray(js?.data?.bars) ? js.data.bars : [];
        const cleaned = bars
          .filter((b: { time?: number; close?: number }) => typeof b?.time === 'number' && typeof b?.close === 'number')
          .map((b: { time: number; close: number }) => ({ time: b.time, close: b.close }));
        setHistoryBars(cleaned);
      } catch {
        if (!cancel) setHistoryBars([]);
      } finally {
        if (!cancel) setHistoryLoading(false);
      }
    };
    run();
    return () => { cancel = true; };
  }, [symbol, horizon]);

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
  const firstClose = historyBars[0]?.close ?? null;
  const lastClose = historyBars[historyBars.length - 1]?.close ?? null;
  const histDelta = firstClose != null && lastClose != null && firstClose !== 0
    ? ((lastClose - firstClose) / firstClose) * 100
    : null;
  const histDeltaClass = histDelta == null ? 'text-gray-300' : histDelta > 0 ? 'text-emerald-400' : histDelta < 0 ? 'text-red-400' : 'text-gray-300';

  const PriceLineChart = () => {
    if (historyBars.length < 2) {
      return (
        <div className="h-36 rounded bg-slate-900/40 ring-1 ring-white/5 flex items-center justify-center text-[11px] text-gray-500">
          No price series available for {horizon}
        </div>
      );
    }
    const W = 760;
    const H = 180;
    const padL = 10;
    const padR = 10;
    const padT = 12;
    const padB = 18;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const min = Math.min(...historyBars.map(b => b.close));
    const max = Math.max(...historyBars.map(b => b.close));
    const span = Math.max(max - min, 0.0001);
    const x = (i: number) => padL + (i / Math.max(historyBars.length - 1, 1)) * chartW;
    const y = (v: number) => padT + (1 - (v - min) / span) * chartH;
    const path = historyBars.map((b, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(b.close).toFixed(2)}`).join(' ');
    const yLast = y(historyBars[historyBars.length - 1].close);
    const yFirst = y(historyBars[0].close);
    const lineColor = (lastClose ?? 0) >= (firstClose ?? 0) ? '#22c55e' : '#ef4444';
    return (
      <div className="rounded bg-slate-900/40 ring-1 ring-white/5 p-1">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: 'auto', display: 'block' }} preserveAspectRatio="xMidYMid meet">
          <line x1={padL} y1={yFirst} x2={W - padR} y2={yFirst} stroke="rgba(148,163,184,0.22)" strokeDasharray="3 4" />
          <path d={path} fill="none" stroke={lineColor} strokeWidth={2.2} />
          <circle cx={W - padR} cy={yLast} r={2.5} fill={lineColor} />
          <text x={W - padR} y={yLast - 6} textAnchor="end" fontSize={9} fill={lineColor} fontFamily="ui-monospace, monospace">
            {lastClose?.toFixed(2)}
          </text>
          <text x={padL} y={H - 4} fontSize={9} fill="#64748b">{horizon}</text>
          <text x={W - padR} y={H - 4} textAnchor="end" fontSize={9} fill="#64748b">{historyBars.length} pts</text>
        </svg>
      </div>
    );
  };

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

      {/* Time horizon selector + line chart */}
      <div className="bg-slate-800/40 rounded-lg p-3 ring-1 ring-white/5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-semibold text-gray-300">Price Horizon</div>
          <div className="flex flex-wrap gap-1">
            {(['1D', '1W', '1M', '3M', '1Y'] as const).map(h => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${horizon === h ? 'bg-blue-600/30 text-blue-200 border-blue-500/40' : 'bg-slate-900/50 text-gray-300 border-slate-700 hover:text-white'}`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-500">{historyLoading ? 'Updating price curve…' : `Symbol ${symbol.toUpperCase()}`}</span>
          <span className={`font-semibold tabular-nums ${histDeltaClass}`}>{histDelta == null ? '—' : `${histDelta > 0 ? '+' : ''}${histDelta.toFixed(2)}%`}</span>
        </div>
        <PriceLineChart />
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
      {tab === 'regime' && !data.regime && (
        <div className="bg-slate-800/40 rounded-lg p-4 ring-1 ring-white/5 text-[11px] text-gray-400 text-center">
          Regime data temporarily unavailable for this symbol.
        </div>
      )}

      {/* Options Inventory — horizontal layout: strikes on X axis, BOUGHT up / SOLD down */}
      {(tab === 'realtime' || tab === 'inventory') && inventoryZoomed && (() => {
        const rows = inventoryZoomed.rows;
        const maxAbs = inventoryZoomed.maxAbs;
        const W = 760;
        const H = 380;
        const padTop = 28;
        const padBottom = 46;
        const padLeft = 56;
        const padRight = 16;
        const chartW = W - padLeft - padRight;
        const chartH = H - padTop - padBottom;
        const yZero = padTop + chartH / 2;
        const halfH = chartH / 2;
        // Strikes ascending left → right
        const ordered = [...rows].sort((a, b) => a.strike - b.strike);
        const n = ordered.length;
        const colW = chartW / Math.max(n, 1);
        const barW = Math.max(colW * 0.36, 1.5);
        const xCenter = (i: number) => padLeft + i * colW + colW / 2;
        const minStrike = ordered[0]?.strike ?? 0;
        const maxStrike = ordered[n - 1]?.strike ?? 1;
        const priceX = maxStrike === minStrike
          ? padLeft + chartW / 2
          : padLeft + ((price - minStrike) / (maxStrike - minStrike)) * chartW;
        const hFor = (v: number) => (v / maxAbs) * halfH;
        const ticks = [maxAbs, maxAbs / 2, 0, -maxAbs / 2, -maxAbs];
        const labelEvery = Math.max(1, Math.ceil(n / 14));
        const fmtNum = (v: number) => {
          const a = Math.abs(v);
          if (a >= 1000) return `${v >= 0 ? '' : '-'}${(a / 1000).toFixed(1)}K`;
          if (a >= 100) return `${Math.round(v)}`;
          return v.toFixed(0);
        };
        return (
          <div className="rounded-lg p-3 ring-1 ring-white/10" style={{ backgroundColor: SQ_BG }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-bold" style={{ color: 'lightgray', fontFamily: 'Tahoma, sans-serif' }}>options inventory</div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-md overflow-hidden ring-1 ring-white/15">
                  <button onClick={() => setInvChartMode('bars')} className={`px-2 py-0.5 text-[10px] font-bold ${invChartMode === 'bars' ? 'bg-blue-600/40 text-blue-100' : 'text-gray-400 hover:text-gray-200'}`}>BARS</button>
                  <button onClick={() => setInvChartMode('line')} className={`px-2 py-0.5 text-[10px] font-bold ${invChartMode === 'line' ? 'bg-blue-600/40 text-blue-100' : 'text-gray-400 hover:text-gray-200'}`}>LINE</button>
                </div>
                <SqPill on={showCalls} color={SQ_YELLOW} onClick={() => setShowCalls(v => !v)}>CALLS</SqPill>
                <SqPill on={showPuts} color={SQ_TEAL} onClick={() => setShowPuts(v => !v)}>PUTS</SqPill>
              </div>
            </div>
            <div className="text-[10px] text-gray-500 mb-2">
              {data.inventoryExpiration ? `Expiration: ${data.inventoryExpiration}` : '—'}
              {' · '}strikes {minStrike.toFixed(2)}–{maxStrike.toFixed(2)}
            </div>
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: 'auto', display: 'block' }} preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="invCallGrad" gradientUnits="userSpaceOnUse" x1="0" y1={yZero} x2="0" y2={padTop}>
                    <stop offset="0%" stopColor={SQ_YELLOW} />
                    <stop offset="100%" stopColor={SQ_PURPLE} />
                  </linearGradient>
                  <linearGradient id="invCallGradDn" gradientUnits="userSpaceOnUse" x1="0" y1={yZero} x2="0" y2={padTop + chartH}>
                    <stop offset="0%" stopColor={SQ_YELLOW} />
                    <stop offset="100%" stopColor={SQ_PURPLE} />
                  </linearGradient>
                  <linearGradient id="invPutGrad" gradientUnits="userSpaceOnUse" x1="0" y1={yZero} x2="0" y2={padTop}>
                    <stop offset="0%" stopColor={SQ_TEAL} />
                    <stop offset="100%" stopColor={SQ_INDIGO} />
                  </linearGradient>
                  <linearGradient id="invPutGradDn" gradientUnits="userSpaceOnUse" x1="0" y1={yZero} x2="0" y2={padTop + chartH}>
                    <stop offset="0%" stopColor={SQ_TEAL} />
                    <stop offset="100%" stopColor={SQ_INDIGO} />
                  </linearGradient>
                </defs>
                {/* Background */}
                <rect x={0} y={0} width={W} height={H} fill={SQ_BG} />
                {/* Watermark */}
                <text textAnchor="middle" x={padLeft + chartW / 2} y={padTop + chartH / 2 + 14} fontSize={W / 13} fontFamily="Tahoma, sans-serif" fill="rgba(96,109,130,0.16)" style={{ pointerEvents: 'none', cursor: 'default' }}>econopulse.ai</text>
                {/* BOUGHT / SOLD side labels */}
                <text x={padLeft + 6} y={padTop + 12} fontSize={10} fill="#cbd5e1" fontWeight={600} letterSpacing={1}>BOUGHT ↑</text>
                <text x={padLeft + 6} y={padTop + chartH - 5} fontSize={10} fill="#94a3b8" fontWeight={600} letterSpacing={1}>SOLD ↓</text>
                {/* Horizontal tick gridlines */}
                {ticks.map((t, i) => {
                  const y = yZero - hFor(t);
                  return (
                    <g key={i}>
                      {t !== 0 && <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} strokeDasharray="2 4" />}
                      <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#94a3b8" fontFamily="ui-monospace, monospace">{fmtNum(t)}</text>
                    </g>
                  );
                })}
                {/* Zero baseline */}
                <line x1={padLeft} y1={yZero} x2={padLeft + chartW} y2={yZero} stroke="#475569" strokeWidth={1} />
                {/* Bars per strike: call column left, put column right. BOUGHT up, SOLD down. */}
                {invChartMode === 'bars' && ordered.map((r, i) => {
                  const xc = xCenter(i);
                  const xCall = xc - barW - 0.5;
                  const xPut = xc + 0.5;
                  const cbH = hFor(r.callBought);
                  const csH = hFor(r.callSold);
                  const pbH = hFor(r.putBought);
                  const psH = hFor(r.putSold);
                  return (
                    <g key={r.strike}>
                      {showCalls && cbH > 0.5 && <rect x={xCall} y={yZero - cbH} width={barW} height={cbH} fill="url(#invCallGrad)" opacity={0.95} rx={0.5} />}
                      {showCalls && csH > 0.5 && <rect x={xCall} y={yZero} width={barW} height={csH} fill="url(#invCallGradDn)" opacity={0.95} rx={0.5} />}
                      {showPuts && pbH > 0.5 && <rect x={xPut} y={yZero - pbH} width={barW} height={pbH} fill="url(#invPutGrad)" opacity={0.95} rx={0.5} />}
                      {showPuts && psH > 0.5 && <rect x={xPut} y={yZero} width={barW} height={psH} fill="url(#invPutGradDn)" opacity={0.95} rx={0.5} />}
                    </g>
                  );
                })}
                {/* Line mode: net inventory per strike (bought − sold) as smooth lines */}
                {invChartMode === 'line' && (() => {
                  const callPts = ordered.map((r, i) => `${xCenter(i).toFixed(1)},${(yZero - hFor(r.callBought - r.callSold)).toFixed(1)}`).join(' ');
                  const putPts = ordered.map((r, i) => `${xCenter(i).toFixed(1)},${(yZero - hFor(r.putBought - r.putSold)).toFixed(1)}`).join(' ');
                  return (
                    <g>
                      {showCalls && <polyline points={callPts} fill="none" stroke={SQ_YELLOW} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
                      {showPuts && <polyline points={putPts} fill="none" stroke={SQ_TEAL} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
                      {showCalls && ordered.map((r, i) => <circle key={`ic-${r.strike}`} cx={xCenter(i)} cy={yZero - hFor(r.callBought - r.callSold)} r={1.6} fill={SQ_YELLOW} />)}
                      {showPuts && ordered.map((r, i) => <circle key={`ip-${r.strike}`} cx={xCenter(i)} cy={yZero - hFor(r.putBought - r.putSold)} r={1.6} fill={SQ_TEAL} />)}
                    </g>
                  );
                })()}
                {/* Strike labels on X axis (every Nth) */}
                {ordered.map((r, i) => {
                  if (i % labelEvery !== 0 && i !== n - 1) return null;
                  const xc = xCenter(i);
                  return (
                    <g key={`xl-${r.strike}`}>
                      <line x1={xc} y1={padTop + chartH} x2={xc} y2={padTop + chartH + 4} stroke="#475569" strokeWidth={1} />
                      <text x={xc} y={padTop + chartH + 15} textAnchor="middle" fontSize={9} fill="#94a3b8" fontFamily="ui-monospace, monospace">
                        {Number.isInteger(r.strike) ? r.strike.toFixed(0) : r.strike.toFixed(1)}
                      </text>
                    </g>
                  );
                })}
                {/* Spot price vertical line (sqzme green) */}
                <g>
                  <line x1={priceX} y1={padTop} x2={priceX} y2={padTop + chartH} stroke={SQ_GREEN} strokeWidth={1.5} strokeDasharray="6 4" />
                  <text x={priceX} y={padTop - 6} textAnchor="middle" fontSize={11} fill={SQ_GREEN} fontWeight={700} fontFamily="ui-monospace, monospace">
                    {price.toFixed(2)}
                  </text>
                </g>
                <text x={padLeft + 4} y={H - 6} fontSize={10} fill="#64748b" fontStyle="italic">
                  contract count (nearest expiry)
                </text>
                <text x={W - 6} y={H - 6} textAnchor="end" fontSize={9} fill="#6b7280" fontFamily="Tahoma, sans-serif">© EconoPulse</text>
              </svg>
            </div>
          </div>
        );
      })()}
      {tab === 'inventory' && !inventoryZoomed && (
        <div className="bg-slate-800/40 rounded-lg p-4 ring-1 ring-white/5 text-[11px] text-gray-400 text-center">
          Inventory panel unavailable (no nearby strikes or chain data missing).
        </div>
      )}

      {/* Empty-state hint when chart can't render */}
      {(tab === 'realtime' || tab === 'inventory' || tab === 'levels') && !ladder && (
        <div className="bg-slate-900/50 rounded-lg p-4 ring-1 ring-white/5 text-center">
          <div className="text-[11px] text-amber-300 mb-1">Gamma Exposure unavailable</div>
          <div className="text-[10px] text-gray-500">
            Options chain not returned for {data.symbol}. Source: <span className="font-mono">{data.source}</span>.
            {data.source === 'technical-only' && ' Try a more liquid ticker (SPY, QQQ, AAPL, NVDA, TSLA).'}
          </div>
        </div>
      )}

      {/* Gamma Exposure profile — gexstream replica (dense integer ladder, every strike row visible) */}
      {(tab === 'realtime' || tab === 'inventory' || tab === 'levels') && ladder && (() => {
        const all = ladder.rows;
        // Build a complete ladder of integer strikes from -5% to +5% around spot (gexstream default ±~3%).
        // For high-priced names use a wider dollar window so we still get ~50 rows.
        const dollarPct = price > 200 ? 0.04 : price > 50 ? 0.06 : 0.10;
        const minS = Math.floor(price * (1 - dollarPct));
        const maxS = Math.ceil(price * (1 + dollarPct));
        // Strike step: 1 for normal stocks, 5 for very high price (>$1000)
        const step = price > 1000 ? 5 : price > 500 ? 1 : 1;
        // Map our gamma data onto each integer strike (find closest within step/2)
        const dataMap = new Map<number, { callGex: number; putGex: number }>();
        for (const r of all) dataMap.set(Math.round(r.strike / step) * step, { callGex: r.callGex, putGex: r.putGex });
        const rows: { strike: number; callGex: number; putGex: number }[] = [];
        for (let s = minS; s <= maxS; s += step) {
          const d = dataMap.get(s) || { callGex: 0, putGex: 0 };
          rows.push({ strike: s, ...d });
        }
        const maxAbs = Math.max(...rows.map(r => Math.max(Math.abs(r.callGex), Math.abs(r.putGex))), 1);
        const W = 760;
        const H = 420;
        const padTop = 44;
        const padBottom = 50;
        const padLeft = 64;
        const padRight = 16;
        const chartW = W - padLeft - padRight;
        const chartH = H - padTop - padBottom;
        const yZero = padTop + chartH / 2;
        const halfH = chartH / 2;
        const n = rows.length;
        const colW = chartW / Math.max(n, 1);
        const barW = Math.max(colW * 0.72, 1.5);
        const xCenter = (i: number) => padLeft + i * colW + colW / 2;
        // Index of strike closest to spot price (green vertical line) and gamma flip (red marker)
        const closestSpotIdx = rows.reduce((best, r, i) => Math.abs(r.strike - price) < Math.abs(rows[best].strike - price) ? i : best, 0);
        const flipStrike = data.gammaFlip;
        const flipIdx = flipStrike != null
          ? rows.reduce((best, r, i) => Math.abs(r.strike - flipStrike) < Math.abs(rows[best].strike - flipStrike) ? i : best, 0)
          : -1;
        // Biggest call/put strikes get highlighted axis labels (major walls)
        const biggestCallIdx = rows.reduce((best, r, i) => r.callGex > rows[best].callGex ? i : best, 0);
        const biggestPutIdx = rows.reduce((best, r, i) => Math.abs(r.putGex) > Math.abs(rows[best].putGex) ? i : best, 0);
        const hFor = (v: number) => (Math.abs(v) / maxAbs) * halfH;
        const ticks = [maxAbs, maxAbs / 2, 0, -maxAbs / 2, -maxAbs];
        const fmtAxis = (v: number) => {
          const a = Math.abs(v);
          if (a >= 1e6) return `${v < 0 ? '-' : ''}${(a / 1e6).toFixed(1)}M`;
          if (a >= 1e3) return `${v < 0 ? '-' : ''}${(a / 1e3).toFixed(0)}K`;
          return v.toFixed(0);
        };
        const labelEvery = Math.max(1, Math.ceil(n / 14));
        const priceX = xCenter(closestSpotIdx);
        return (
          <div className="rounded-lg p-3 ring-1 ring-white/10" style={{ backgroundColor: SQ_BG }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="flex rounded-md overflow-hidden ring-1 ring-white/15">
                <button onClick={() => setGexChartMode('bars')} className={`px-2 py-0.5 text-[10px] font-bold ${gexChartMode === 'bars' ? 'bg-blue-600/40 text-blue-100' : 'text-gray-400 hover:text-gray-200'}`}>BARS</button>
                <button onClick={() => setGexChartMode('line')} className={`px-2 py-0.5 text-[10px] font-bold ${gexChartMode === 'line' ? 'bg-blue-600/40 text-blue-100' : 'text-gray-400 hover:text-gray-200'}`}>LINE</button>
              </div>
              <SqPill on={showCalls} color={SQ_YELLOW} onClick={() => setShowCalls(v => !v)}>CALL GEX</SqPill>
              <SqPill on={showPuts} color={SQ_TEAL} onClick={() => setShowPuts(v => !v)}>PUT GEX</SqPill>
            </div>
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: 'auto', display: 'block' }} preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="gexCallGrad" gradientUnits="userSpaceOnUse" x1="0" y1={yZero} x2="0" y2={padTop}>
                    <stop offset="0%" stopColor={SQ_YELLOW} />
                    <stop offset="100%" stopColor={SQ_PURPLE} />
                  </linearGradient>
                  <linearGradient id="gexPutGrad" gradientUnits="userSpaceOnUse" x1="0" y1={yZero} x2="0" y2={padTop + chartH}>
                    <stop offset="0%" stopColor={SQ_TEAL} />
                    <stop offset="100%" stopColor={SQ_INDIGO} />
                  </linearGradient>
                </defs>
                {/* Dark background for chart area */}
                <rect x={0} y={0} width={W} height={H} fill={SQ_BG} />
                {/* Watermark */}
                <text textAnchor="middle" x={padLeft + chartW / 2} y={padTop + chartH / 2 + 16} fontSize={W / 12} fontFamily="Tahoma, sans-serif" fill="rgba(96,109,130,0.14)" style={{ pointerEvents: 'none', cursor: 'default' }}>econopulse.ai</text>
                {/* Title — centered "gamma exposure" */}
                <text x={W / 2} y={20} textAnchor="middle" fontSize={13} fontWeight={700} fill="lightgray" fontFamily="Tahoma, sans-serif">
                  gamma exposure
                </text>
                {/* Horizontal tick gridlines + Y axis labels */}
                {ticks.map((t, i) => {
                  const y = yZero - (t / maxAbs) * halfH;
                  return (
                    <g key={`gl-${i}`}>
                      {t !== 0 && <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} strokeDasharray="2 4" />}
                      <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#94a3b8" fontFamily="ui-monospace, monospace">{fmtAxis(t)}</text>
                    </g>
                  );
                })}
                {/* Bars per strike: call GEX up, put GEX down */}
                {gexChartMode === 'bars' && rows.map((r, i) => {
                  const xc = xCenter(i);
                  const x = xc - barW / 2;
                  const callH = hFor(r.callGex);
                  const putH = hFor(r.putGex);
                  return (
                    <g key={r.strike}>
                      {showCalls && callH > 0.5 && (
                        <rect x={x} y={yZero - callH} width={barW} height={callH} fill="url(#gexCallGrad)" opacity={0.95} />
                      )}
                      {showPuts && putH > 0.5 && (
                        <rect x={x} y={yZero} width={barW} height={putH} fill="url(#gexPutGrad)" opacity={0.95} />
                      )}
                    </g>
                  );
                })}
                {/* Line mode: call GEX (up) and put GEX (down) as continuous lines */}
                {gexChartMode === 'line' && (() => {
                  const callPts = rows.map((r, i) => `${xCenter(i).toFixed(1)},${(yZero - hFor(r.callGex)).toFixed(1)}`).join(' ');
                  const putPts = rows.map((r, i) => `${xCenter(i).toFixed(1)},${(yZero + hFor(r.putGex)).toFixed(1)}`).join(' ');
                  return (
                    <g>
                      {showCalls && <polyline points={callPts} fill="none" stroke={SQ_YELLOW} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
                      {showPuts && <polyline points={putPts} fill="none" stroke={SQ_TEAL} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
                    </g>
                  );
                })()}
                {/* Zero baseline */}
                <line x1={padLeft} y1={yZero} x2={padLeft + chartW} y2={yZero} stroke="#475569" strokeWidth={1} />
                {/* Strike labels on X axis — every Nth, plus highlighted spot/flip/walls */}
                {rows.map((r, i) => {
                  const isSpot = i === closestSpotIdx;
                  const isFlip = i === flipIdx;
                  const isBigCall = i === biggestCallIdx && r.callGex > 0;
                  const isBigPut = i === biggestPutIdx && Math.abs(r.putGex) > 0;
                  const highlighted = isSpot || isFlip || isBigCall || isBigPut;
                  if (!highlighted && i % labelEvery !== 0 && i !== n - 1) return null;
                  let labelColor = '#94a3b8';
                  let labelWeight = 400;
                  if (isSpot) { labelColor = SQ_GREEN; labelWeight = 700; }
                  else if (isFlip) { labelColor = '#ef4444'; labelWeight = 700; }
                  else if (isBigCall) { labelColor = SQ_YELLOW; labelWeight = 700; }
                  else if (isBigPut) { labelColor = SQ_TEAL; labelWeight = 700; }
                  const xc = xCenter(i);
                  return (
                    <g key={`xl-${r.strike}`}>
                      <line x1={xc} y1={padTop + chartH} x2={xc} y2={padTop + chartH + 4} stroke="#475569" strokeWidth={1} />
                      <text x={xc} y={padTop + chartH + 15} textAnchor="middle" fontSize={9} fill={labelColor} fontWeight={labelWeight} fontFamily="ui-monospace, monospace">
                        {r.strike.toFixed(0)}
                      </text>
                    </g>
                  );
                })}
                {/* Gamma flip vertical marker (red) */}
                {flipIdx >= 0 && (
                  <line x1={xCenter(flipIdx)} y1={padTop} x2={xCenter(flipIdx)} y2={padTop + chartH} stroke="#ef4444" strokeWidth={1} strokeDasharray="3 4" opacity={0.8} />
                )}
                {/* Spot price vertical dashed line (sqzme green) */}
                <line x1={priceX} y1={padTop} x2={priceX} y2={padTop + chartH} stroke={SQ_GREEN} strokeWidth={1.4} strokeDasharray="6 4" />
                <text x={priceX} y={padTop - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={SQ_GREEN} fontFamily="ui-monospace, monospace">
                  {price.toFixed(2)}
                </text>
                {/* Caption bottom-left "shares per $ move" */}
                <text x={padLeft} y={H - 8} fontSize={10} fill="#64748b" fontFamily="ui-sans-serif, system-ui">
                  shares per $ move
                </text>
                <text x={W - 6} y={H - 8} textAnchor="end" fontSize={9} fill="#6b7280" fontFamily="Tahoma, sans-serif">© EconoPulse</text>
              </svg>
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
      {tab === 'tape' && !(data.callVolToday.length > 0 || data.putVolToday.length > 0) && (
        <div className="bg-slate-800/40 rounded-lg p-4 ring-1 ring-white/5 text-[11px] text-gray-400 text-center">
          No fresh tape flow detected today.
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
        Source: EconopulseAI
      </p>
    </div>
  );
}
