'use client';

// Self-contained Market Sentiment & Risk block — circular gauges.
// FLAME (euphoria), BOTTOM (panic), Regime (risk-on/off), Recession Index.
import { useEffect, useState } from 'react';

interface ExtremesState { flame: number; bottom: number; asOf: string }
interface RiskRegimeState { regime: string; score: number; on: number; off: number }
interface RecessionState { value: number; date: string }

// Threshold table aligned with documented FLAME/BOTTOM signal taxonomy
// (IPOs, valuation multiples, credit, retail flows, sentiment polls, etc.).
function flameLevel(score: number) {
	if (score >= 0.75) return { label: 'Extreme', color: '#ef4444', text: 'text-red-400' };
	if (score >= 0.50) return { label: 'High',    color: '#f97316', text: 'text-orange-400' };
	if (score >= 0.25) return { label: 'Moderate',color: '#eab308', text: 'text-yellow-400' };
	return                       { label: 'Low',     color: '#22c55e', text: 'text-emerald-400' };
}
function bottomLevel(score: number) {
	if (score >= 0.75) return { label: 'Extreme', color: '#ef4444', text: 'text-red-400' };
	if (score >= 0.50) return { label: 'High',    color: '#f97316', text: 'text-orange-400' };
	if (score >= 0.25) return { label: 'Moderate',color: '#eab308', text: 'text-yellow-400' };
	return                       { label: 'Low',     color: '#22c55e', text: 'text-emerald-400' };
}

function CircularGauge({
	value,         // 0..1 fraction filled
	displayValue,  // string shown in centre (top)
	label,         // small text below value
	color,         // accent color for arc + value
	size = 140,
}: {
	value: number;
	displayValue: string;
	label: string;
	color: string;
	size?: number;
}) {
	const stroke = 10;
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	const clamped = Math.max(0, Math.min(1, value));
	const dash = c * clamped;
	const cx = size / 2;
	const cy = size / 2;
	return (
		<div className="relative" style={{ width: size, height: size }}>
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
				{/* Track */}
				<circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth={stroke} />
				{/* Value arc */}
				<circle
					cx={cx}
					cy={cy}
					r={r}
					fill="none"
					stroke={color}
					strokeWidth={stroke}
					strokeLinecap="round"
					strokeDasharray={`${dash} ${c - dash}`}
					style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<div className="text-2xl font-black tabular-nums" style={{ color }}>{displayValue}</div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color }}>{label}</div>
			</div>
		</div>
	);
}

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

	const flame = extremes?.flame ?? 0;
	const bottom = extremes?.bottom ?? 0;
	const fl = flameLevel(flame);
	const bl = bottomLevel(bottom);

	const regimeLabel = riskRegime?.regime || '—';
	const regimeScore = typeof riskRegime?.score === 'number' ? riskRegime.score : null;
	// Map score (-3..+3 typical range) to 0..1 for gauge fill
	const regimeFill = regimeScore === null ? 0 : Math.min(1, Math.abs(regimeScore) / 3);
	const regimeColor =
		regimeLabel === 'Risk-On' ? '#22c55e' :
		regimeLabel === 'Risk-Off' ? '#ef4444' : '#9ca3af';
	const regimeText =
		regimeLabel === 'Risk-On' ? 'text-emerald-400' :
		regimeLabel === 'Risk-Off' ? 'text-red-400' : 'text-gray-300';

	const recVal = typeof recession?.value === 'number' ? recession.value : null;
	// Recession index: lower = higher risk (so we invert for the ring fill = "stress level")
	const recStress = recVal === null ? 0 : Math.max(0, Math.min(1, 1 - recVal));
	const recRisk = (() => {
		if (recVal === null) return { label: '—', color: '#9ca3af', text: 'text-gray-300' };
		if (recVal < 0.15) return { label: 'High',     color: '#ef4444', text: 'text-red-400' };
		if (recVal < 0.25) return { label: 'Elevated', color: '#f97316', text: 'text-orange-400' };
		if (recVal < 0.40) return { label: 'Moderate', color: '#eab308', text: 'text-yellow-400' };
		return                     { label: 'Low',      color: '#22c55e', text: 'text-emerald-400' };
	})();

	const updatedAt = extremes?.asOf || new Date().toISOString();

	return (
		<div className={`bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-xl p-4 ring-1 ring-white/10 ${className}`}>
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
					<span>📊</span> Market Sentiment & Risk Dashboard
				</h3>
				<span className="text-[9px] text-gray-500">
					Updated: {new Date(updatedAt).toLocaleTimeString()}{loading ? ' · loading…' : ''}
				</span>
			</div>

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{/* FLAME */}
				<div className="flex flex-col items-center text-center bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
					<div className="flex items-center gap-1.5 mb-2">
						<span className="text-base">🔥</span>
						<div>
							<div className="text-[11px] font-semibold text-white">FLAME</div>
							<div className="text-[9px] text-gray-500">Euphoria Level</div>
						</div>
					</div>
					<CircularGauge value={flame} displayValue={flame.toFixed(2)} label={fl.label} color={fl.color} />
					<p className="text-[9px] text-gray-400 leading-tight mt-2 min-h-[28px]">
						{flame >= 0.75 && 'Extreme bullish sentiment. IPO mania, leverage at peak, retail euphoric.'}
						{flame >= 0.50 && flame < 0.75 && 'Strong risk-on. Cyclicals leading, M&A and credit abundant.'}
						{flame >= 0.25 && flame < 0.50 && 'Moderate optimism. Balanced rotation, valuations fair.'}
						{flame < 0.25 && 'Subdued risk appetite. Defensive positioning dominant.'}
					</p>
				</div>

				{/* BOTTOM */}
				<div className="flex flex-col items-center text-center bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
					<div className="flex items-center gap-1.5 mb-2">
						<span className="text-base">⚠️</span>
						<div>
							<div className="text-[11px] font-semibold text-white">BOTTOM</div>
							<div className="text-[9px] text-gray-500">Panic Level</div>
						</div>
					</div>
					<CircularGauge value={bottom} displayValue={bottom.toFixed(2)} label={bl.label} color={bl.color} />
					<p className="text-[9px] text-gray-400 leading-tight mt-2 min-h-[28px]">
						{bottom >= 0.75 && 'Extreme fear. Flight to safety, credit frozen, capitulation.'}
						{bottom >= 0.50 && bottom < 0.75 && 'High stress. Defensives outperforming, multiples compressed.'}
						{bottom >= 0.25 && bottom < 0.50 && 'Moderate caution. Quality over growth, retail retreating.'}
						{bottom < 0.25 && 'Low fear. Market functioning normally, credit open.'}
					</p>
				</div>

				{/* REGIME */}
				<div className="flex flex-col items-center text-center bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
					<div className="flex items-center gap-1.5 mb-2">
						<span className="text-base">🎯</span>
						<div>
							<div className="text-[11px] font-semibold text-white">Regime</div>
							<div className="text-[9px] text-gray-500">Risk-on / off</div>
						</div>
					</div>
					<CircularGauge
						value={regimeFill}
						displayValue={regimeScore === null ? '—' : (regimeScore > 0 ? `+${regimeScore}` : String(regimeScore))}
						label={regimeLabel}
						color={regimeColor}
					/>
					<p className={`text-[9px] leading-tight mt-2 min-h-[28px] ${regimeText}`}>
						{regimeLabel === 'Risk-On' && 'Breadth + cyclicals supportive. Credit risk-on (HY > Treasuries).'}
						{regimeLabel === 'Risk-Off' && 'Defensives leading, credit caution, quality bid.'}
						{regimeLabel === 'Neutral' && 'Mixed signals across cyclical/defensive ratios.'}
						{regimeLabel === '—' && 'Regime data unavailable.'}
					</p>
				</div>

				{/* RECESSION */}
				<div className="flex flex-col items-center text-center bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
					<div className="flex items-center gap-1.5 mb-2">
						<span className="text-base">📉</span>
						<div>
							<div className="text-[11px] font-semibold text-white">Recession</div>
							<div className="text-[9px] text-gray-500">Signal index</div>
						</div>
					</div>
					<CircularGauge
						value={recStress}
						displayValue={recVal === null ? '—' : recVal.toFixed(3)}
						label={`${recRisk.label} risk`}
						color={recRisk.color}
					/>
					<p className="text-[9px] text-gray-400 leading-tight mt-2 min-h-[28px]">
						{recRisk.label === 'High' && 'Credit spreads + curve signaling near-term contraction.'}
						{recRisk.label === 'Elevated' && 'Leading indicators show modest macro stress.'}
						{recRisk.label === 'Moderate' && 'Neutral signals; growth still positive.'}
						{recRisk.label === 'Low' && 'Solid macro backdrop, low recession odds.'}
						{recRisk.label === '—' && 'Index unavailable.'}
					</p>
				</div>
			</div>
		</div>
	);
}
