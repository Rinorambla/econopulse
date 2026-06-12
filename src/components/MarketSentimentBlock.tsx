'use client';

// Unified Market Temperature gauge — combines FLAME (euphoria), BOTTOM (panic),
// Risk regime and Recession index into ONE composite reading on the
// market-extremes scale (0 = capitulation/bottom … 100 = euphoria/top risk).
// All inputs are live: /api/market-extremes + /api/recession-index.
import { useEffect, useState } from 'react';

interface ExtremesState { flame: number; bottom: number; asOf: string }
interface RiskRegimeState { regime: string; score: number; on: number; off: number }
interface RecessionState { value: number; date: string }

interface Zone {
	label: string;
	tone: string;       // tailwind text color
	color: string;      // hex accent
	chip: string;       // chip classes
	desc: string;
	action: string;
}

function zoneFor(temp: number): Zone {
	if (temp >= 75) return {
		label: 'EUPHORIA — TOP RISK', tone: 'text-red-400', color: '#ef4444',
		chip: 'bg-red-500/15 border-red-500/30 text-red-300',
		desc: 'Excess signals dominate: euphoric sentiment, abundant credit, complacent volatility. Historically a high-risk zone for forward returns.',
		action: 'Consider de-risking and hedging.',
	};
	if (temp >= 60) return {
		label: 'LATE-CYCLE — CAUTION', tone: 'text-amber-400', color: '#f59e0b',
		chip: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
		desc: 'Froth is building: cyclicals leading, M&A and credit abundant, risk appetite strong but not extreme.',
		action: 'Stay invested but tighten risk management.',
	};
	if (temp > 40) return {
		label: 'NEUTRAL — MID-CYCLE', tone: 'text-gray-300', color: '#9ca3af',
		chip: 'bg-white/10 border-white/20 text-gray-300',
		desc: 'No strong extreme reading. Balanced rotation across cyclical/defensive ratios, valuations fair.',
		action: 'Let trend and fundamentals lead.',
	};
	if (temp > 25) return {
		label: 'FEAR — VALUE EMERGING', tone: 'text-sky-400', color: '#38bdf8',
		chip: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
		desc: 'Depression signals building: defensives outperforming, quality bid, multiples compressing.',
		action: 'Quality is getting cheap — build watchlists.',
	};
	return {
		label: 'CAPITULATION — BOTTOMING', tone: 'text-emerald-400', color: '#22c55e',
		chip: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
		desc: 'Panic dominates: flight to safety, credit frozen, capitulation. Historically among the best long-term entry zones.',
		action: 'Accumulate quality.',
	};
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function MarketSentimentBlock({ className = '' }: { className?: string }) {
	const [extremes, setExtremes] = useState<ExtremesState | null>(null);
	const [riskRegime, setRiskRegime] = useState<RiskRegimeState | null>(null);
	const [recession, setRecession] = useState<RecessionState | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const ctrl = new AbortController();
		const fetchExtremes = async () => {
			try {
				const res = await fetch('/api/market-extremes', { cache: 'no-store', signal: ctrl.signal });
				if (!res.ok) return;
				const json = await res.json();
				if (json.success && json.data) {
					setExtremes({
						flame: Number(json.data.flameScore) || 0,
						bottom: Number(json.data.bottomScore) || 0,
						asOf: json.data.asOf ?? new Date().toISOString(),
					});
					if (Array.isArray(json.data.pairs)) {
						const pairs = json.data.pairs.filter((p: any) => p.value != null);
						let on = 0, off = 0;
						pairs.forEach((p: any) => {
							// Risk-on / risk-off ratios (high-beta vs low-vol, cyclical vs defensive, credit risk).
							if (p.label === 'SPHB/SPLV' && p.value > 1.05) on++;
							else if (p.label === 'SPHB/SPLV' && p.value < 0.95) off++;
							if (p.label === 'XLY/XLP' && p.value > 1.15) on++;
							else if (p.label === 'XLY/XLP' && p.value < 1.0) off++;
							if (p.label === 'HYG/IEF' && p.value > 0.90) on++;
							else if (p.label === 'HYG/IEF' && p.value < 0.75) off++;
						});
						const score = on - off;
						const regime = score >= 2 ? 'Risk-On' : score <= -2 ? 'Risk-Off' : 'Neutral';
						setRiskRegime({ regime, score, on, off });
					}
				}
			} catch { /* ignore */ }
		};
		const fetchRecession = async () => {
			try {
				const res = await fetch('/api/recession-index?limit=1', { cache: 'no-store', signal: ctrl.signal });
				if (!res.ok) return;
				const json = await res.json();
				if (json.latest && typeof json.latest.value === 'number') {
					setRecession({ value: json.latest.value, date: json.latest.date });
				}
			} catch { /* ignore */ }
		};
		const run = async () => {
			setLoading(true);
			await Promise.all([fetchExtremes(), fetchRecession()]);
			setLoading(false);
		};
		run();
		const id = setInterval(run, 5 * 60 * 1000);
		return () => { ctrl.abort(); clearInterval(id); };
	}, []);

	const flame = extremes?.flame ?? null;
	const bottom = extremes?.bottom ?? null;
	const regimeScore = typeof riskRegime?.score === 'number' ? riskRegime.score : null;
	const regimeLabel = riskRegime?.regime || '—';
	const recVal = typeof recession?.value === 'number' ? recession.value : null;

	// ── Composite Market Temperature (0..100) ──────────────────────────
	// Each component maps to -1 (deep bottom/panic) … +1 (peak euphoria),
	// then blended with weights and projected onto the 0..100 thermometer.
	const parts: { w: number; v: number }[] = [];
	if (flame !== null && bottom !== null) parts.push({ w: 0.45, v: clamp(flame - bottom, -1, 1) });          // sentiment extremes (euphoria net of panic)
	if (regimeScore !== null) parts.push({ w: 0.30, v: clamp(regimeScore / 3, -1, 1) });                      // risk-on/off breadth
	if (recVal !== null) parts.push({ w: 0.25, v: clamp((recVal - 0.275) / 0.225, -1, 1) });                  // macro: low recession risk supports risk-on
	const wSum = parts.reduce((a, p) => a + p.w, 0);
	const composite = wSum > 0 ? parts.reduce((a, p) => a + p.w * p.v, 0) / wSum : null;   // -1..+1
	const temp = composite === null ? null : Math.round((composite + 1) * 50);             // 0..100
	const zone = zoneFor(temp ?? 50);

	// Needle angle: -90° (temp 0) … +90° (temp 100)
	const angle = ((temp ?? 50) / 100) * 180 - 90;

	const recRiskLabel = recVal === null ? '—'
		: recVal < 0.15 ? 'High' : recVal < 0.25 ? 'Elevated' : recVal < 0.40 ? 'Moderate' : 'Low';
	const updatedAt = extremes?.asOf || null;

	return (
		<div className={`bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-xl p-4 ring-1 ring-white/10 ${className}`}>
			<div className="flex items-center justify-between mb-3">
				<h3 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
					<span>🌡️</span> Market Temperature — Unified Sentiment & Risk
				</h3>
				<span className="text-[9px] text-gray-500">
					{updatedAt ? `Updated: ${new Date(updatedAt).toLocaleTimeString()}` : ''}{loading ? 'loading…' : ''}
				</span>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
				{/* ── Single composite gauge ── */}
				<div className="lg:col-span-2 flex flex-col items-center">
					<svg viewBox="0 0 200 120" className="w-full max-w-[300px]">
						<defs>
							<linearGradient id="mtempGrad" x1="0" y1="0" x2="1" y2="0">
								<stop offset="0%" stopColor="#22c55e" />
								<stop offset="30%" stopColor="#38bdf8" />
								<stop offset="50%" stopColor="#9ca3af" />
								<stop offset="70%" stopColor="#f59e0b" />
								<stop offset="100%" stopColor="#ef4444" />
							</linearGradient>
						</defs>
						{/* Track */}
						<path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="14" strokeLinecap="round" />
						{/* Gradient arc */}
						<path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#mtempGrad)" strokeWidth="14" strokeLinecap="round" opacity="0.9" />
						{/* Zone boundaries at 25 / 40 / 60 / 75 */}
						{[25, 40, 60, 75].map((t) => {
							const a = ((t / 100) * 180 - 180) * (Math.PI / 180);
							const x1 = 100 + 70 * Math.cos(a), y1 = 100 + 70 * Math.sin(a);
							const x2 = 100 + 90 * Math.cos(a), y2 = 100 + 90 * Math.sin(a);
							return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0f172a" strokeWidth="2" opacity="0.7" />;
						})}
						{/* Needle */}
						<g transform={`rotate(${angle} 100 100)`} style={{ transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
							<line x1="100" y1="100" x2="100" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
							<circle cx="100" cy="100" r="5" fill="white" />
						</g>
						{/* End labels */}
						<text x="20" y="115" textAnchor="middle" fontSize="8" fill="#22c55e" fontWeight="700">BOTTOM</text>
						<text x="180" y="115" textAnchor="middle" fontSize="8" fill="#ef4444" fontWeight="700">EUPHORIA</text>
					</svg>
					<div className="text-center -mt-2">
						<div className="text-3xl font-black tabular-nums" style={{ color: zone.color }}>
							{temp === null ? '—' : temp}
						</div>
						<div className="text-[9px] uppercase tracking-widest text-gray-500 font-medium">Temperature · 0–100</div>
					</div>
				</div>

				{/* ── Reading + components ── */}
				<div className="lg:col-span-3 space-y-3">
					<div>
						<span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border ${zone.chip}`}>{zone.label}</span>
						<p className="text-[11px] text-gray-400 leading-relaxed mt-2">
							{zone.desc} <span className={`font-semibold ${zone.tone}`}>{zone.action}</span>
						</p>
					</div>

					{/* Component chips — the data behind the composite */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						<div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-2">
							<div className="text-[9px] text-gray-500">🔥 Euphoria</div>
							<div className="text-sm font-bold tabular-nums text-orange-400">{flame === null ? '—' : flame.toFixed(2)}</div>
							<div className="text-[8px] text-gray-600">weight 45% (net of panic)</div>
						</div>
						<div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-2">
							<div className="text-[9px] text-gray-500">⚠️ Panic</div>
							<div className="text-sm font-bold tabular-nums text-yellow-400">{bottom === null ? '—' : bottom.toFixed(2)}</div>
							<div className="text-[8px] text-gray-600">pulls temperature down</div>
						</div>
						<div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-2">
							<div className="text-[9px] text-gray-500">🎯 Regime</div>
							<div className={`text-sm font-bold tabular-nums ${regimeLabel === 'Risk-On' ? 'text-emerald-400' : regimeLabel === 'Risk-Off' ? 'text-red-400' : 'text-gray-300'}`}>
								{regimeScore === null ? '—' : (regimeScore > 0 ? `+${regimeScore}` : regimeScore)} {regimeLabel !== '—' && <span className="text-[9px] font-semibold">{regimeLabel}</span>}
							</div>
							<div className="text-[8px] text-gray-600">weight 30%</div>
						</div>
						<div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-2">
							<div className="text-[9px] text-gray-500">📉 Recession</div>
							<div className={`text-sm font-bold tabular-nums ${recRiskLabel === 'High' ? 'text-red-400' : recRiskLabel === 'Elevated' ? 'text-orange-400' : recRiskLabel === 'Moderate' ? 'text-yellow-400' : 'text-emerald-400'}`}>
								{recVal === null ? '—' : recVal.toFixed(3)} <span className="text-[9px] font-semibold">{recRiskLabel} risk</span>
							</div>
							<div className="text-[8px] text-gray-600">weight 25%</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
