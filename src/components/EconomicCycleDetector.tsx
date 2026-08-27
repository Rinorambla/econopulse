'use client';

// US Economic Cycle Detector — shows the CURRENT regime and where the economy
// is transitioning, computed from 3-month trends of official data (FRED).
import { useEffect, useState } from 'react';

type Regime = 'goldilocks' | 'reflation' | 'stagflation' | 'recession' | 'deflation' | 'disinflation';

interface CycleData {
  ok: boolean;
  regime: Regime; regimeLabel: string;
  transitioningTo: Regime | null; transitioningToLabel: string | null;
  confidence: number;
  growthScore: number; growthMomentum: number;
  inflationLevel: number; inflationMomentum: number;
  inflationYoY: number | null; inflation3mAnn: number | null; corePceYoY: number | null;
  sahm: number | null;
  drivers: string[];
  methodology: string;
  asOf: string;
}

const REGIME_STYLE: Record<Regime, { color: string; bg: string; icon: string }> = {
  goldilocks: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', icon: '🌤️' },
  reflation: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🔥' },
  stagflation: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: '🌡️' },
  recession: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: '🌧️' },
  deflation: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', icon: '❄️' },
  disinflation: { color: '#22d3ee', bg: 'rgba(34,211,238,0.12)', icon: '🍃' },
};

export default function EconomicCycleDetector({ onApply, onDetect }: { onApply?: (regime: Regime) => void; onDetect?: (regime: Regime) => void }) {
  const [data, setData] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/economic-cycle', { cache: 'no-store', signal: AbortSignal.timeout(25000) })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (alive && j?.ok) {
          setData(j);
          onDetect?.(j.regime);
        }
      })
      .catch(() => { /* card hides on failure */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.06] rounded-2xl p-5">
        <div className="h-5 w-64 bg-slate-700/40 rounded animate-pulse mb-3" />
        <div className="h-24 bg-slate-800/40 rounded animate-pulse" />
      </div>
    );
  }
  if (!data) return null;

  const style = REGIME_STYLE[data.regime];
  const nextStyle = data.transitioningTo ? REGIME_STYLE[data.transitioningTo] : null;

  // Quadrant map: x = inflation (level, -100..100), y = growth (-100..100)
  const W = 210, H = 150, pad = 12;
  const px = (v: number) => pad + ((v + 100) / 200) * (W - pad * 2);
  const py = (v: number) => pad + (1 - (v + 100) / 200) * (H - pad * 2);
  const dotX = px(data.inflationLevel), dotY = py(data.growthScore);
  const arrX = px(Math.max(-100, Math.min(100, data.inflationLevel + data.inflationMomentum * 0.75)));
  const arrY = py(Math.max(-100, Math.min(100, data.growthScore + data.growthMomentum * 1.5)));

  return (
    <div className="bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.06] rounded-2xl p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">US Economic Cycle · AI Detector</div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-2xl">{style.icon}</span>
            <span className="text-2xl font-black" style={{ color: style.color }}>{data.regimeLabel}</span>
            {data.transitioningTo && nextStyle && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm font-semibold" style={{ borderColor: `${nextStyle.color}55`, background: nextStyle.bg, color: nextStyle.color }}>
                → transitioning toward {data.transitioningToLabel}
              </span>
            )}
            {!data.transitioningTo && (
              <span className="text-xs text-gray-500 border border-white/10 rounded-full px-2 py-0.5">stable</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Confidence</div>
          <div className="text-2xl font-black text-white tabular-nums">{data.confidence}<span className="text-sm text-gray-500">%</span></div>
          {onDetect ? (
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-semibold">
              ✓ applied to portfolio ranking
            </div>
          ) : onApply ? (
            <button
              onClick={() => onApply(data.regime)}
              className="mt-1 text-[11px] px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
            >
              Apply to portfolios
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-start">
        {/* Growth × Inflation quadrant with 3-month drift arrow */}
        <div>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="rounded-lg" style={{ background: 'rgba(2,6,23,0.5)' }}>
            <line x1={px(0)} y1={pad} x2={px(0)} y2={H - pad} stroke="rgba(148,163,184,0.25)" strokeDasharray="3 3" />
            <line x1={pad} y1={py(0)} x2={W - pad} y2={py(0)} stroke="rgba(148,163,184,0.25)" strokeDasharray="3 3" />
            <text x={px(-50)} y={py(55)} textAnchor="middle" fontSize={8} fill="#34d399">GOLDILOCKS</text>
            <text x={px(55)} y={py(55)} textAnchor="middle" fontSize={8} fill="#f59e0b">REFLATION</text>
            <text x={px(-50)} y={py(-60)} textAnchor="middle" fontSize={8} fill="#a78bfa">RECESSION</text>
            <text x={px(55)} y={py(-60)} textAnchor="middle" fontSize={8} fill="#f87171">STAGFLATION</text>
            {(arrX !== dotX || arrY !== dotY) && (
              <g>
                <line x1={dotX} y1={dotY} x2={arrX} y2={arrY} stroke={style.color} strokeWidth={1.6} strokeDasharray="4 3" opacity={0.85} />
                <circle cx={arrX} cy={arrY} r={3} fill="none" stroke={style.color} strokeWidth={1.4} opacity={0.85} />
              </g>
            )}
            <circle cx={dotX} cy={dotY} r={6} fill={style.color} stroke="#fff" strokeWidth={1.4} />
            <text x={pad} y={H - 3} fontSize={7.5} fill="#64748b">← low inflation · high →</text>
            <text x={6} y={pad + 2} fontSize={7.5} fill="#64748b" transform={`rotate(-90 6 ${pad + 2})`} textAnchor="end">← weak growth · strong →</text>
          </svg>
          <div className="mt-1.5 text-[9.5px] text-gray-500">● now · ○ 3-month trajectory</div>
        </div>

        {/* Drivers */}
        <div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2">
              <div className="text-[9px] uppercase tracking-wide text-gray-500">Growth (3M composite)</div>
              <div className={`text-lg font-bold tabular-nums ${data.growthScore >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.growthScore >= 0 ? '+' : ''}{data.growthScore}
                <span className={`ml-1.5 text-[10px] ${data.growthMomentum >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{data.growthMomentum >= 0 ? '▲ improving' : '▼ slowing'}</span>
              </div>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2">
              <div className="text-[9px] uppercase tracking-wide text-gray-500">Inflation</div>
              <div className="text-lg font-bold tabular-nums text-white">
                {data.inflationYoY != null ? `${data.inflationYoY.toFixed(1)}%` : '—'}
                <span className={`ml-1.5 text-[10px] ${data.inflationMomentum > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{data.inflationMomentum > 0 ? '▲ accelerating' : '▼ cooling'}</span>
              </div>
            </div>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-300">
            {data.drivers.slice(0, 10).map((d, i) => (
              <li key={i} className="flex items-start gap-1.5"><span className="text-gray-600 mt-0.5">•</span><span>{d}</span></li>
            ))}
          </ul>
          <div className="mt-2.5 text-[9.5px] text-gray-600">{data.methodology}. Updated {new Date(data.asOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.</div>
        </div>
      </div>
    </div>
  );
}
