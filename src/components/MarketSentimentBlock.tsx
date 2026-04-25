'use client';

// Self-contained Market Sentiment & Risk block.
// Renders FLAME (euphoria), BOTTOM (panic), Regime (risk-on/off) and Recession Index.
// Used by /market-dna (and previously /dashboard).
import { useEffect, useState } from 'react';

interface ExtremesState { flame: number; bottom: number; asOf: string }
interface RiskRegimeState { regime: string; score: number }
interface RecessionState { value: number; date: string }

const getFlameLevel = (score: number) => {
	if (score >= 0.75) return { label: 'Extreme', color: 'text-red-400', bg: 'bg-red-500' };
	if (score >= 0.50) return { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500' };
	if (score >= 0.25) return { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500' };
	return { label: 'Low', color: 'text-green-400', bg: 'bg-green-500' };
};
const getBottomLevel = getFlameLevel;

export default function MarketSentimentBlock({ className = '' }: { className?: string }) {
	const [extremes, setExtremes] = useState<ExtremesState | null>(null);
	const [riskRegime, setRiskRegime] = useState<RiskRegimeState | null>(null);
	const [recessionIndex, setRecessionIndex] = useState<RecessionState | null>(null);

	useEffect(() => {
		const ctrl = new AbortController();
		const fetchExtremes = async () => {
			try {
				const res = await fetch('/api/market-extremes', { cache: 'no-store', signal: ctrl.signal });
				if (!res.ok) return;
				const json = await res.json();
				if (json.success && json.data) {
					setExtremes({
						flame: json.data.flameScore ?? 0,
						bottom: json.data.bottomScore ?? 0,
						asOf: json.data.asOf ?? new Date().toISOString()
					});
					if (Array.isArray(json.data.pairs)) {
						const pairs = json.data.pairs.filter((p: any) => p.value != null);
						let onCount = 0, offCount = 0;
						pairs.forEach((p: any) => {
							if (p.label === 'SPHB/SPLV' && p.value > 1.05) onCount++;
							else if (p.label === 'SPHB/SPLV' && p.value < 0.95) offCount++;
							if (p.label === 'XLY/XLP' && p.value > 1.15) onCount++;
							else if (p.label === 'XLY/XLP' && p.value < 1.0) offCount++;
							if (p.label === 'HYG/IEF' && p.value > 0.90) onCount++;
							else if (p.label === 'HYG/IEF' && p.value < 0.75) offCount++;
						});
						const score = onCount - offCount;
						const regime = score >= 2 ? 'Risk-On' : score <= -2 ? 'Risk-Off' : 'Neutral';
						setRiskRegime({ regime, score });
					}
				}
			} catch { /* ignore */ }
		};
		const fetchRecession = async () => {
			try {
				const res = await fetch('/api/recession-index?limit=1', { cache: 'no-store', signal: ctrl.signal });
				if (res.ok) {
					const json = await res.json();
					if (json.latest) setRecessionIndex(json.latest);
				}
			} catch { /* ignore */ }
		};
		fetchExtremes();
		fetchRecession();
		const id = setInterval(() => { fetchExtremes(); fetchRecession(); }, 5 * 60 * 1000);
		return () => { ctrl.abort(); clearInterval(id); };
	}, []);

	if (!extremes && !riskRegime && !recessionIndex) return null;

	const flameScore = extremes?.flame ?? 0;
	const bottomScore = extremes?.bottom ?? 0;
	const flameLevel = getFlameLevel(flameScore);
	const bottomLevel = getBottomLevel(bottomScore);
	const regimeLabel = riskRegime?.regime || '—';
	const regimeScore = typeof riskRegime?.score === 'number' ? riskRegime.score : null;
	const regimeColor = regimeLabel === 'Risk-On' ? 'text-emerald-400' : regimeLabel === 'Risk-Off' ? 'text-red-400' : 'text-gray-300';
	const recessionValue = typeof recessionIndex?.value === 'number' ? recessionIndex.value : null;
	const recessionRisk = (() => {
		if (recessionValue === null) return { label: '—', color: 'text-gray-300' };
		if (recessionValue < 0.15) return { label: 'High', color: 'text-red-400' };
		if (recessionValue < 0.25) return { label: 'Elevated', color: 'text-orange-300' };
		if (recessionValue < 0.4) return { label: 'Moderate', color: 'text-yellow-300' };
		return { label: 'Low', color: 'text-emerald-400' };
	})();

	return (
		<div className={`bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-xl p-4 ring-1 ring-white/10 ${className}`}>
			<div className="flex items-center justify-between mb-3">
				<h3 className="text-xs font-bold text-gray-300 flex items-center gap-1">
					<span>📊</span> Market Sentiment & Risk Dashboard
				</h3>
				<span className="text-[9px] text-gray-500">
					Updated: {new Date(extremes?.asOf || new Date().toISOString()).toLocaleTimeString()}
				</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				{/* FLAME */}
				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-1.5">
							<span className="text-base">🔥</span>
							<div>
								<div className="text-[11px] font-semibold text-white">FLAME</div>
								<div className="text-[9px] text-gray-500">Euphoria Level</div>
							</div>
						</div>
						<div className="text-right">
							<div className="text-sm font-bold font-mono text-gray-200">{flameScore.toFixed(2)}</div>
							<div className={`text-[10px] font-medium ${flameLevel.color}`}>{flameLevel.label}</div>
						</div>
					</div>
					<div className="relative h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
						<div className={`absolute inset-y-0 left-0 ${flameLevel.bg} rounded-full transition-all duration-500`} style={{ width: `${Math.min(flameScore * 100, 100)}%` }} />
					</div>
					<p className="text-[9px] text-gray-400 leading-tight">
						{flameScore >= 0.75 && 'Extreme bullish sentiment. High-beta outperforming.'}
						{flameScore >= 0.50 && flameScore < 0.75 && 'Strong risk-on. Cyclicals leading.'}
						{flameScore >= 0.25 && flameScore < 0.50 && 'Moderate optimism. Balanced rotation.'}
						{flameScore < 0.25 && 'Subdued risk appetite. Defensive positioning.'}
					</p>
				</div>
				{/* BOTTOM */}
				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-1.5">
							<span className="text-base">⚠️</span>
							<div>
								<div className="text-[11px] font-semibold text-white">BOTTOM</div>
								<div className="text-[9px] text-gray-500">Panic Level</div>
							</div>
						</div>
						<div className="text-right">
							<div className="text-sm font-bold font-mono text-gray-200">{bottomScore.toFixed(2)}</div>
							<div className={`text-[10px] font-medium ${bottomLevel.color}`}>{bottomLevel.label}</div>
						</div>
					</div>
					<div className="relative h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
						<div className={`absolute inset-y-0 left-0 ${bottomLevel.bg} rounded-full transition-all duration-500`} style={{ width: `${Math.min(bottomScore * 100, 100)}%` }} />
					</div>
					<p className="text-[9px] text-gray-400 leading-tight">
						{bottomScore >= 0.75 && 'Extreme fear. Flight to safety, credit frozen.'}
						{bottomScore >= 0.50 && bottomScore < 0.75 && 'High stress. Defensives outperforming.'}
						{bottomScore >= 0.25 && bottomScore < 0.50 && 'Moderate caution. Quality over growth.'}
						{bottomScore < 0.25 && 'Low fear. Market functioning normally.'}
					</p>
				</div>
				{/* REGIME */}
				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-1.5">
							<span className="text-base">🎯</span>
							<div>
								<div className="text-[11px] font-semibold text-white">Regime</div>
								<div className="text-[9px] text-gray-500">Risk-on / off</div>
							</div>
						</div>
						<div className="text-right">
							<div className="text-sm font-bold font-mono text-gray-200">{regimeScore === null ? '—' : regimeScore}</div>
							<div className={`text-[10px] font-medium ${regimeColor}`}>{regimeLabel}</div>
						</div>
					</div>
					<div className="relative h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
						{regimeScore !== null && (
							<div
								className={`absolute inset-y-0 ${regimeLabel === 'Risk-On' ? 'bg-emerald-500' : regimeLabel === 'Risk-Off' ? 'bg-red-500' : 'bg-gray-500'} rounded-full transition-all duration-500`}
								style={{
									left: '50%',
									width: `${Math.min(Math.abs(regimeScore) * 20, 50)}%`,
									transform: `translateX(${regimeScore >= 0 ? '0%' : '-100%'})`
								}}
							/>
						)}
					</div>
					<p className="text-[9px] text-gray-400 leading-tight">
						{regimeLabel === 'Risk-On' && 'Breadth + cyclicals supportive.'}
						{regimeLabel === 'Risk-Off' && 'Defensives + credit caution.'}
						{regimeLabel === 'Neutral' && 'Mixed signals. Wait for confirmation.'}
						{regimeLabel === '—' && 'Regime data unavailable.'}
					</p>
				</div>
				{/* RECESSION */}
				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-1.5">
							<span className="text-base">📉</span>
							<div>
								<div className="text-[11px] font-semibold text-white">Recession</div>
								<div className="text-[9px] text-gray-500">Signal index</div>
							</div>
						</div>
						<div className="text-right">
							<div className="text-sm font-bold font-mono text-gray-200">{recessionValue === null ? '—' : recessionValue.toFixed(3)}</div>
							<div className={`text-[10px] font-medium ${recessionRisk.color}`}>{recessionRisk.label} risk</div>
						</div>
					</div>
					<div className="relative h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
						<div
							className={`absolute inset-y-0 left-0 ${recessionRisk.label === 'Low' ? 'bg-emerald-500' : recessionRisk.label === 'Moderate' ? 'bg-yellow-500' : recessionRisk.label === 'Elevated' ? 'bg-orange-500' : recessionRisk.label === 'High' ? 'bg-red-500' : 'bg-slate-600'} rounded-full transition-all duration-500`}
							style={{ width: `${recessionValue === null ? 0 : Math.min((1 - recessionValue) * 100, 100)}%` }}
						/>
					</div>
					<p className="text-[9px] text-gray-400 leading-tight">
						{recessionRisk.label === 'High' && 'Credit/rates signaling near-term contraction risk.'}
						{recessionRisk.label === 'Elevated' && 'Leading indicators show modest stress.'}
						{recessionRisk.label === 'Moderate' && 'Neutral signals; growth still positive.'}
						{recessionRisk.label === 'Low' && 'Solid macro backdrop, low recession odds.'}
						{recessionRisk.label === '—' && 'Index unavailable.'}
					</p>
				</div>
			</div>
		</div>
	);
}
