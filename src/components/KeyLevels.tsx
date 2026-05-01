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
    const price = data.underlyingPrice;
    if (!price) return null;
    const all: { strike: number; callOI: number; putOI: number; callVol: number; putVol: number }[] = [];
    const upsert = (s: number) => {
      let row = all.find(r => r.strike === s);
      if (!row) { row = { strike: s, callOI: 0, putOI: 0, callVol: 0, putVol: 0 }; all.push(row); }
      return row;
    };
    [...data.callWalls, ...data.callVolToday].forEach(w => {
      const r = upsert(w.strike);
      r.callOI = Math.max(r.callOI, w.oi);
      r.callVol = Math.max(r.callVol, w.volume);
    });
    [...data.putWalls, ...data.putVolToday].forEach(w => {
      const r = upsert(w.strike);
      r.putOI = Math.max(r.putOI, w.oi);
      r.putVol = Math.max(r.putVol, w.volume);
    });
    if (!all.length) return null;
    all.sort((a, b) => a.strike - b.strike);
    const maxOI = Math.max(...all.map(r => Math.max(r.callOI, r.putOI)), 1);
    return { rows: all, maxOI };
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

      {/* Ladder visualization */}
      {ladder && (
        <div className="bg-slate-800/40 rounded-lg p-3 ring-1 ring-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold text-gray-300">Open Interest by Strike</div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-emerald-500 rounded-sm" /> Call OI</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-red-500 rounded-sm" /> Put OI</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-amber-400 rounded-sm" /> Price</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {ladder.rows.map((row) => {
              const callPct = (row.callOI / ladder.maxOI) * 100;
              const putPct = (row.putOI / ladder.maxOI) * 100;
              const isCurrentBand = Math.abs(row.strike - price) / price < 0.005;
              const isMaxPain = data.maxPain != null && Math.abs(row.strike - data.maxPain) / price < 0.005;
              return (
                <div key={row.strike} className="flex items-center gap-2">
                  {/* Put bars (left) */}
                  <div className="flex-1 flex justify-end h-5 relative">
                    <div className="bg-red-500/70 rounded-l-sm flex items-center justify-end pr-1" style={{ width: `${putPct}%`, minWidth: putPct > 0 ? '3px' : 0 }}>
                      {putPct > 15 && <span className="text-[9px] text-white font-semibold">{fmtK(row.putOI)}</span>}
                    </div>
                  </div>
                  {/* Strike */}
                  <div className={`w-20 text-center text-[11px] tabular-nums font-mono ${isCurrentBand ? 'bg-amber-400/30 text-amber-200 font-bold rounded' : isMaxPain ? 'text-amber-300 font-semibold' : 'text-gray-300'}`}>
                    {row.strike.toFixed(2)}
                    {isMaxPain && !isCurrentBand && <span className="text-[8px] ml-1">MP</span>}
                  </div>
                  {/* Call bars (right) */}
                  <div className="flex-1 flex h-5 relative">
                    <div className="bg-emerald-500/70 rounded-r-sm flex items-center pl-1" style={{ width: `${callPct}%`, minWidth: callPct > 0 ? '3px' : 0 }}>
                      {callPct > 15 && <span className="text-[9px] text-white font-semibold">{fmtK(row.callOI)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
