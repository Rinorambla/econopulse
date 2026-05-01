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
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  notes: string[];
  source: string;
}

const fmt$ = (n: number | null | undefined, dec = 2) =>
  n != null && isFinite(n) ? `$${n.toFixed(dec)}` : '—';
const fmtK = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : String(n);

export default function KeyLevels({ symbol }: { symbol: string }) {
  const [data, setData] = useState<KeyLevels | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/options-levels?symbol=${encodeURIComponent(symbol)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((j) => {
        if (cancel) return;
        if (j?.ok && j.data) setData(j.data);
        else setError(j?.error || 'Unable to compute levels');
      })
      .catch((e) => { if (!cancel) setError(e?.message || 'Network error'); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [symbol]);

  // Build a unified ladder of strikes around current price for visual chart
  const ladder = useMemo(() => {
    if (!data) return null;
    if (!data.gammaProfile || !data.gammaProfile.length) return null;
    const maxAbs = Math.max(...data.gammaProfile.map(r => Math.max(Math.abs(r.callGex), Math.abs(r.putGex))), 1);
    return { rows: data.gammaProfile, maxAbs };
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

      {/* Gamma Exposure profile (vertical histogram, SpotGamma-style) */}
      {ladder && (() => {
        const rows = ladder.rows;
        const maxAbs = ladder.maxAbs;
        const W = 560;
        const H = Math.max(360, rows.length * 14);
        const padTop = 18;
        const padBottom = 30;
        const padLeft = 60;
        const padRight = 16;
        const chartW = W - padLeft - padRight;
        const chartH = H - padTop - padBottom;
        const minStrike = rows[0].strike;
        const maxStrike = rows[rows.length - 1].strike;
        const strikeRange = maxStrike - minStrike || 1;
        const yFor = (s: number) => padTop + chartH - ((s - minStrike) / strikeRange) * chartH;
        const xZero = padLeft + chartW / 2;
        const halfW = chartW / 2;
        const barH = Math.max(3, Math.min(11, chartH / rows.length - 1));
        const priceY = yFor(price);
        const flipY = data.gammaFlip != null && data.gammaFlip >= minStrike && data.gammaFlip <= maxStrike ? yFor(data.gammaFlip) : null;
        // Strike labels: every Nth row to avoid clutter
        const labelStep = Math.max(1, Math.ceil(rows.length / 22));
        return (
          <div className="bg-slate-800/40 rounded-lg p-3 ring-1 ring-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold text-gray-300">Gamma Exposure by Strike</div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-emerald-500 rounded-sm" /> Calls (+γ)</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-red-500 rounded-sm" /> Puts (−γ)</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-px bg-amber-300" style={{ borderTop: '1px dashed #fcd34d' }} /> Spot</span>
                {data.gammaFlip != null && <span className="flex items-center gap-1"><span className="inline-block w-3 h-px bg-fuchsia-400" /> γ Flip</span>}
              </div>
            </div>
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ maxHeight: 480 }} preserveAspectRatio="xMidYMid meet">
                {/* Background grid */}
                <rect x={padLeft} y={padTop} width={chartW} height={chartH} fill="#0f172a" rx={4} />
                {/* Center axis */}
                <line x1={xZero} y1={padTop} x2={xZero} y2={padTop + chartH} stroke="#475569" strokeWidth={1} />
                {/* Bars */}
                {rows.map((r, i) => {
                  const yBase = yFor(r.strike) - barH / 2;
                  const callW = (Math.abs(r.callGex) / maxAbs) * halfW;
                  const putW = (Math.abs(r.putGex) / maxAbs) * halfW;
                  return (
                    <g key={r.strike}>
                      {putW > 0 && (
                        <rect x={xZero - putW} y={yBase} width={putW} height={barH} fill="#ef4444" opacity={0.85} />
                      )}
                      {callW > 0 && (
                        <rect x={xZero} y={yBase} width={callW} height={barH} fill="#10b981" opacity={0.85} />
                      )}
                      {/* Strike labels every Nth */}
                      {i % labelStep === 0 && (
                        <text x={padLeft - 6} y={yFor(r.strike) + 3} textAnchor="end" fontSize={9} fill="#94a3b8" fontFamily="ui-monospace, monospace">
                          {r.strike.toFixed(r.strike >= 1000 ? 0 : 2)}
                        </text>
                      )}
                    </g>
                  );
                })}
                {/* Gamma flip line */}
                {flipY != null && (
                  <g>
                    <line x1={padLeft} y1={flipY} x2={padLeft + chartW} y2={flipY} stroke="#e879f9" strokeWidth={1} strokeDasharray="2 3" opacity={0.7} />
                  </g>
                )}
                {/* Spot price line */}
                <g>
                  <line x1={padLeft} y1={priceY} x2={padLeft + chartW} y2={priceY} stroke="#fcd34d" strokeWidth={1.4} strokeDasharray="4 3" />
                  <rect x={padLeft + chartW - 70} y={priceY - 9} width={66} height={16} rx={3} fill="#fcd34d" />
                  <text x={padLeft + chartW - 4} y={priceY + 3} textAnchor="end" fontSize={10} fontWeight={700} fill="#1f2937" fontFamily="ui-monospace, monospace">
                    {price.toFixed(2)}
                  </text>
                </g>
                {/* Max pain marker */}
                {data.maxPain != null && data.maxPain >= minStrike && data.maxPain <= maxStrike && (
                  <g>
                    <line x1={padLeft} y1={yFor(data.maxPain)} x2={padLeft + chartW} y2={yFor(data.maxPain)} stroke="#f59e0b" strokeWidth={1} strokeDasharray="1 4" opacity={0.6} />
                    <text x={padLeft + 4} y={yFor(data.maxPain) - 3} fontSize={9} fill="#fbbf24" fontFamily="ui-monospace, monospace">
                      MP {data.maxPain.toFixed(2)}
                    </text>
                  </g>
                )}
                {/* Axis title */}
                <text x={padLeft + chartW / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="ui-monospace, monospace">
                  ← Put gamma · 0 · Call gamma →
                </text>
              </svg>
            </div>
            <div className="mt-1 text-[10px] text-gray-500 flex flex-wrap gap-3">
              <span>Range: ${minStrike.toFixed(2)} – ${maxStrike.toFixed(2)}</span>
              <span>Strikes: {rows.length}</span>
              {data.gammaFlip != null && <span className="text-fuchsia-300">γ flip: ${data.gammaFlip.toFixed(2)}</span>}
            </div>
          </div>
        );
      })()}

      {/* Walls / fresh flow tables */}
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

      {/* Fresh flow today */}
      {(data.callVolToday.length > 0 || data.putVolToday.length > 0) && (
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

      {/* Technical levels */}
      <div className="bg-slate-800/40 rounded-lg p-3 ring-1 ring-white/5">
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

      {/* Notes */}
      {data.notes.length > 0 && (
        <div className="bg-slate-800/30 rounded-lg p-3 ring-1 ring-white/5">
          <div className="text-[11px] font-semibold text-gray-300 mb-2">📝 Interpretation</div>
          <ul className="text-[11px] text-gray-300 space-y-1 list-disc list-inside">
            {data.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}

      <p className="text-[10px] text-gray-500 leading-relaxed">
        <strong>Call walls</strong> = strikes with high call OI → likely resistance (dealers selling against). <strong>Put walls</strong> = high put OI → likely support.
        <strong>Max Pain</strong> is the strike where total option holder loss is minimized (price magnet at expiration).
        <strong>Pivots</strong> are classic floor-trader pivot levels from yesterday's range.
        Source: Polygon options chain (nearest 3 expirations within 60 days).
      </p>
    </div>
  );
}
