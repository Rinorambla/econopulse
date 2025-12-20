// Restored original custom dashboard implementation (recovered from commit 20e02f9)
// If you need to revert to the Visual AI dashboard, reintroduce the export to '../visual-ai/page'.
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeftIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';
import RequirePlan from '@/components/RequirePlan';

interface MarketData {
	ticker: string;
	name: string;
	performance: string;
	price?: string;
	change?: string;
	volume?: string;
	trend: string;
	demandSupply: string;
	optionsSentiment: string;
	gammaRisk: string;
	unusualAtm: string;
	unusualOtm: string;
			unusualCombo?: string|null;
	otmSkew: string;
	intradayFlow: string;
	putCallRatio: string;
	sector?: string;
	category?: string;
	lastUpdated?: number;
	direction?: string;
	peTrailing?: number|null;
	peForward?: number|null;
	peHistory?: number[];
	peNormalized?: number|null;
	peSignal?: string;
	peExplanation?: string;
	aiSignal?: {
		momentum: number;
		relativeStrength: number;
		volatility: 'Low'|'Normal'|'High'|'Extreme';
		breakout: boolean;
		meanReversion: 'Overbought'|'Oversold'|'Neutral';
		compositeScore: number;
		label: 'STRONG BUY'|'BUY'|'HOLD'|'SELL'|'STRONG SELL';
		rationale: string;
		version: string;
	};
	sentimentData?: {
		score: number;
		sentiment: string;
		confidence: number;
	};
	peAIPrediction?: {
		pe3: number|null;
		pe6: number|null;
		pe12: number|null;
		probability: number;
		sentimentImpact: string;
	};
}

interface DashboardResponse {
	data: MarketData[];
	economicPortfolios?: any;
	spxValuation?: any;
	summary: {
		avgPerformance: string;
		totalVolume: string;
		bullishCount: number;
		bearishCount: number;
		marketSentiment: string;
	};
	lastUpdated: string;
}

export default function DashboardPage() {
	const [data, setData] = useState<MarketData[]>([]);
	const [summary, setSummary] = useState<DashboardResponse['summary'] | null>(null);
	// Removed multi-view states (portfolios/news/fedwatch/etc.) to focus on a single, high-signal professional dashboard
	const [loading, setLoading] = useState(true);
	const [lastUpdated, setLastUpdated] = useState<string>('');
	const [vixData, setVixData] = useState<{ price: number; volatilityLevel: string; color: string; }>({ price: 18.5, volatilityLevel: 'Moderate', color: 'yellow' });
	const [selectedSector, setSelectedSector] = useState<string>('All');
	const [searchTerm, setSearchTerm] = useState<string>('');
	const [selectedMarket, setSelectedMarket] = useState<string>('All');
	const [selectedCategory, setSelectedCategory] = useState<string>('All');
	const [wideSymbols] = useState<boolean>(false);

	// Analyst-grade enhancements
	const [minVolume, setMinVolume] = useState<string>('');
	const [perfMin, setPerfMin] = useState<string>('');
	const [perfMax, setPerfMax] = useState<string>('');
	const [sortKey, setSortKey] = useState<string>('performance');
	const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
	const [autoRefreshSec, setAutoRefreshSec] = useState<number>(420); // 7 min default to reduce load
	// Lazy charts (dynamic import + intersection observer)
	const [chartsReady, setChartsReady] = useState(false);
	const chartsRef = useRef<HTMLDivElement | null>(null);
	const DashboardCharts = useMemo(() => dynamic(() => import('@/components/DashboardCharts'), {
		ssr: false,
		loading: () => <div className="mt-6 bg-slate-800 border border-slate-700 rounded p-6 text-center text-[11px] text-gray-400">Loading analytics…</div>
	}), []);
	const ImportantNewsPopup = useMemo(() => dynamic(() => import('@/components/ImportantNewsPopup'), { ssr: false }), [])
	const SentimentPanel = useMemo(() => dynamic(() => import('@/components/SentimentPanel'), { ssr: false, loading: () => <div className="bg-slate-800 border border-slate-700 rounded p-3 text-[11px] text-gray-400">Loading sentiment…</div> }), [])


	// Options metrics enrichment (precise OI / P-C / GEX / Skew)
	const [optsByTicker, setOptsByTicker] = useState<Record<string, {
		putCallRatioVol?: string|null;
		putCallRatioOI?: string|null;
		gammaExposure?: number|null;
		gammaLabel?: 'Low'|'Medium'|'High'|'Extreme'|'Unknown';
		callSkew?: 'Call Skew'|'Put Skew'|'Neutral';
		optionsSentiment?: string;
		unusualAtm?: 'Low'|'Medium'|'High';
		unusualOtm?: 'Low'|'Medium'|'High';
		unusualCombo?: string|null;
	}>>({});
	useEffect(() => {
		if (chartsReady) return;
		const el = chartsRef.current;
		if (!el) return;
		if ('IntersectionObserver' in window) {
			const obs = new IntersectionObserver(entries => {
				entries.forEach(e => {
					if (e.isIntersecting) { setChartsReady(true); obs.disconnect(); }
				});
			}, { rootMargin: '250px' });
			obs.observe(el);
			return () => obs.disconnect();
		} else {
			const id = setTimeout(()=>setChartsReady(true), 800);
			return () => clearTimeout(id);
		}
	}, [chartsReady]);

// ============================================================================
// Data Fetch
// ============================================================================

	const fetchLiveData = async () => {
		try {
			setLoading(true);
			// Request a larger universe of symbols for richer coverage
			const ctrl = new AbortController();
			const t = setTimeout(() => ctrl.abort(), 15000);
			const response = await fetch('/api/dashboard-data?scope=full&limit=600&crypto=1&forex=1', { cache: 'no-store', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal });
			// Also refresh sector snapshots for weekly/monthly panels
			await Promise.all([
				fetch('/api/sector-performance?period=weekly', { cache:'no-store' }),
				fetch('/api/sector-performance?period=monthly', { cache:'no-store' })
			]);
			clearTimeout(t);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const result: DashboardResponse = await response.json();
			setData(result.data || []);
			setSummary(result.summary || null);
			setLastUpdated(result.lastUpdated || new Date().toISOString());
		} catch (e) {
			setData([]); setSummary(null);
		} finally { setLoading(false); }
	};

	const fetchVixData = async () => { try { const c = new AbortController(); const t = setTimeout(()=>c.abort(), 8000); const r = await fetch('/api/vix', { signal: c.signal }); clearTimeout(t); if (r.ok) { const j = await r.json(); if (j.success && j.data) setVixData({ price: j.data.price, volatilityLevel: j.data.volatilityLevel, color: j.data.color }); } } catch {} };

// Initial + interval refresh
	useEffect(() => {
		fetchLiveData();
		fetchVixData();
		const refreshInterval = setInterval(() => {
			fetchLiveData();
			fetchVixData();
		}, autoRefreshSec * 1000);
		return () => clearInterval(refreshInterval);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoRefreshSec]);

// No visible countdown per requirements; silent background refresh only

	const getTrendColor = (t: string) => t === 'UPTREND' ? 'text-green-500 bg-green-100' : t === 'DOWNTREND' ? 'text-red-500 bg-red-100' : 'text-yellow-500 bg-yellow-100';
	// Robust color helper: parse numeric value from strings like "+1.2%", "-0.3", "0%", "—" etc.
	const getPerformanceColor = (val: string | number | undefined | null) => {
		if (val === undefined || val === null) return 'text-gray-300';
		let n: number;
		if (typeof val === 'number') {
			n = val;
		} else {
			const t = val.trim();
			if (!t || t === '—' || t.toLowerCase() === 'na' || t.toLowerCase() === 'n/a') return 'text-gray-300';
			// Remove currency symbols, percent and commas, keep sign and decimal
			const cleaned = t.replace(/[$€£,%\s]/g, '');
			n = Number(cleaned);
		}
		if (Number.isNaN(n)) return 'text-gray-300';
		if (n > 0) return 'text-green-500';
		if (n < 0) return 'text-red-500';
		return 'text-gray-300';
	};
	const getUniqueSectors = () => [...new Set(data.map(d => d.sector).filter(Boolean))].sort();
	const getUniqueMarkets = () => { const m = new Set<string>(); data.forEach(item => { if (/[.](AS|DE|SW|PA|L)$/.test(item.ticker)) m.add('European'); else if (['TSM','BABA','TCEHY','JD','BIDU','NIO'].includes(item.ticker)) m.add('Asian'); else if (item.sector === 'Commodities' || /(XAU|XAG|BRENT|WTI)/.test(item.ticker)) m.add('Commodities'); else if (item.ticker.includes('/')) m.add('Cryptocurrency'); else m.add('US'); }); return Array.from(m).sort(); };
	const getUniqueCategories = () => [...new Set(data.map(d=> d.category).filter(Boolean))].sort();
// Parsing helpers
	const parsePerf = (p?: string) => {
		if (!p) return 0;
		const n = parseFloat(p.replace(/[%+]/g,'').trim());
		return p.startsWith('-') ? -Math.abs(n) : n;
	};
	const parseVolume = (v?: string) => {
		if (!v) return 0; return parseFloat(v.replace(/[,\s]/g,''));
	};

	const enrichedData = useMemo(() => {
		if (!data.length) return [] as (MarketData & { rs:number })[];
		// Compute relative strength percentile based on performance
		const perfValues = data.map(d => parsePerf(d.performance));
		const sorted = [...perfValues].sort((a,b)=>a-b);
		const percentile = (val:number) => (sorted.indexOf(val) / (sorted.length - 1)) * 100;
		return data.map(d => ({ ...d, rs: Math.round(percentile(parsePerf(d.performance))) }));
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]);



	// (Chart datasets + helpers moved to lazy component)

	// ======= Generic small tooltip components (avoid native title for multiline & styling) =======
	const SmallTooltip: React.FC<{ lines: string[]; className?: string; }> = ({ lines, className='' }) => (
		<div className={`pointer-events-none whitespace-pre text-[10px] leading-tight bg-slate-900/95 border border-slate-600 shadow-xl rounded px-2 py-1 text-slate-200 max-w-[220px] ${className}`}>
			{lines.map((l,i)=>(<div key={i}>{l}</div>))}
		</div>
	);

	const AIScoreBadge: React.FC<{ item: MarketData & { rs: number } }> = ({ item }) => {
		const sig = item.aiSignal;
		if (!sig) return <span>—</span>;
		return (
			<span className="relative group inline-flex">
				<span className="inline-flex items-center justify-center px-1 py-0.5 rounded bg-indigo-700/40 text-indigo-300 font-semibold min-w-[28px] text-[10px]" aria-label="AI Composite Score">
					{sig.compositeScore}
				</span>
				<div className="absolute z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 -bottom-1 left-1/2 -translate-x-1/2 translate-y-full">
					<SmallTooltip lines={[
						`Momentum: ${sig.momentum}`,
						`RS: ${sig.relativeStrength}`,
						`Vol: ${sig.volatility}  MR: ${sig.meanReversion}`,
						`Breakout: ${sig.breakout ? 'Yes' : 'No'}`
					]} />
				</div>
			</span>
		);
	};

	const AISignalBadge: React.FC<{ item: MarketData & { rs: number } }> = ({ item }) => {
		const sig = item.aiSignal;
		if (!sig) return <span>—</span>;
		const base = 'inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight border';
		const cls = sig.label === 'STRONG BUY'
			? 'bg-green-600/30 text-green-300 border-green-500/40'
			: sig.label === 'BUY'
			? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
			: sig.label === 'HOLD'
			? 'bg-slate-600/30 text-slate-200 border-slate-500/30'
			: sig.label === 'SELL'
			? 'bg-orange-600/30 text-orange-300 border-orange-500/30'
			: 'bg-red-700/30 text-red-300 border-red-600/40';
		return <span className={`${base} ${cls}`} aria-label={`AI Signal ${sig.label}`}>{sig.label}</span>;
	};

		// (Chart tooltip moved)

	const filteredData = useMemo(() => {
		return enrichedData.filter(item => {
			if (selectedSector !== 'All' && item.sector !== selectedSector) return false;
			if (selectedMarket !== 'All') {
				const isEuropean = /[.](AS|DE|SW|PA|L)$/.test(item.ticker);
				const isAsian = ['TSM','BABA','TCEHY','JD','BIDU','NIO'].includes(item.ticker);
				const isCommodity = item.sector === 'Commodities' || /(XAU|XAG|BRENT|WTI)/.test(item.ticker);
				const isCrypto = item.ticker.includes('/');
				if (selectedMarket === 'European' && !isEuropean) return false;
				if (selectedMarket === 'Asian' && !isAsian) return false;
				if (selectedMarket === 'Commodities' && !isCommodity) return false;
				if (selectedMarket === 'Cryptocurrency' && !isCrypto) return false;
				if (selectedMarket === 'US' && (isEuropean||isAsian||isCommodity||isCrypto)) return false;
			}
			if (searchTerm && !item.ticker.toLowerCase().includes(searchTerm.toLowerCase()) && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
			if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
			if (minVolume) { const vol = parseVolume(item.volume); if (vol < parseFloat(minVolume)) return false; }
			const perf = parsePerf(item.performance);
			if (perfMin && perf < parseFloat(perfMin)) return false;
			if (perfMax && perf > parseFloat(perfMax)) return false;
			return true;
		}).sort((a,b)=> {
			const dir = sortDir === 'asc' ? 1 : -1;
			const map: Record<string, (x: typeof a) => number|string> = {
				performance: (x)=>parsePerf(x.performance),
				volume: (x)=>parseVolume(x.volume),
				price: (x)=>parseFloat(x.price||'0'),
				rs: (x)=>x.rs,
				ticker: (x)=>x.ticker
			};
			const getter = map[sortKey] || map.performance;
			const av = getter(a); const bv = getter(b);
			if (typeof av === 'number' && typeof bv === 'number') return (av - bv)*dir;
			return String(av).localeCompare(String(bv))*dir;
		});
	}, [enrichedData, selectedSector, selectedMarket, searchTerm, minVolume, perfMin, perfMax, sortKey, sortDir]);

	// Fetch precise options metrics for the first slice of filtered rows
	useEffect(() => {
		let abort = false;
		const sleep = (ms:number)=> new Promise(r=> setTimeout(r, ms));
		const run = async () => {
			try {
				const firstSlice = filteredData.slice(0, 80).map(x => x.ticker);
				let missing = firstSlice.filter(t => !optsByTicker[t]);
				if (!missing.length) return;
				// Batch in chunks of 20 to respect server safety cap
				for (let i=0; i<missing.length && !abort; i+=20) {
					const chunk = missing.slice(i, i+20);
					const qs = new URLSearchParams({ symbols: chunk.join(',') });
					const ctrl = new AbortController();
					const t = setTimeout(() => ctrl.abort(), 12000);
					const res = await fetch(`/api/options-metrics?${qs.toString()}`, { cache: 'no-store', signal: ctrl.signal });
					clearTimeout(t);
					if (!res.ok) continue;
					const js = await res.json();
					if (abort) return;
					const out: Record<string, any> = {};
					const m = js?.data || {};
					Object.keys(m).forEach(k => {
						const v = m[k];
						// Build combined unusual options indicator if both ATM/OTM present
						let combo: string | null = null;
						const atm = v?.unusualAtm; const otm = v?.unusualOtm;
						if (atm || otm) {
							combo = `${atm || '—'} / ${otm || '—'}`;
						}
						out[k] = { ...v, unusualCombo: combo };
					});
					setOptsByTicker(prev => ({ ...prev, ...out }));
					// gentle pacing to avoid bursts
					if (i + 20 < missing.length) await sleep(300);
				}
			} catch {}
		};
		run();
		return () => { abort = true; };
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filteredData]);

	const toggleSort = (key:string) => {
		if (sortKey === key) setSortDir(d=> d==='asc'?'desc':'asc'); else { setSortKey(key); setSortDir('desc'); }
	};

	const getPCRClass = (val: string | null | undefined) => {
		if (!val) return 'text-gray-300';
		const num = parseFloat(val);
		if (!isFinite(num)) return 'text-gray-300';
		if (num < 0.8) return 'text-emerald-400';
		if (num > 1.3) return 'text-red-400';
		return 'text-yellow-300';
	};

	// export CSV removed per request

	// Market Extremes state
	const [extremes, setExtremes] = useState<{ flame: number; bottom: number; asOf: string } | null>(null);
	const [riskRegime, setRiskRegime] = useState<{ regime: string; score: number } | null>(null);
	const [recessionIndex, setRecessionIndex] = useState<{ value: number; date: string } | null>(null);

	// Fetch market extremes on mount
	useEffect(() => {
		const fetchExtremes = async () => {
			try {
				const res = await fetch('/api/market-extremes', { cache: 'no-store' });
				if (res.ok) {
					const json = await res.json();
					if (json.success && json.data) {
						setExtremes({
							flame: json.data.flameScore ?? 0,
							bottom: json.data.bottomScore ?? 0,
							asOf: json.data.asOf ?? new Date().toISOString()
						});
						// Calculate simple regime from pairs
						if (json.data.pairs && Array.isArray(json.data.pairs)) {
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
				}
			} catch (e) {
				console.error('Failed to fetch market extremes:', e);
			}
		};
		const fetchRecession = async () => {
			try {
				const res = await fetch('/api/recession-index?limit=1', { cache: 'no-store' });
				if (res.ok) {
					const json = await res.json();
					if (json.latest) setRecessionIndex(json.latest);
				}
			} catch (e) {
				console.error('Failed to fetch recession index:', e);
			}
		};
		fetchExtremes();
		fetchRecession();
		// Refresh these metrics periodically (independent from dashboard universe refresh)
		const id = setInterval(() => {
			fetchExtremes();
			fetchRecession();
		}, 5 * 60 * 1000);
		return () => clearInterval(id);
	}, []);

	// Helper functions for FLAME/BOTTOM interpretation
	const getFlameLevel = (score: number) => {
		if (score >= 0.75) return { label: 'Extreme', color: 'text-red-400', bg: 'bg-red-500' };
		if (score >= 0.50) return { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500' };
		if (score >= 0.25) return { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500' };
		return { label: 'Low', color: 'text-green-400', bg: 'bg-green-500' };
	};

	const getBottomLevel = (score: number) => {
		if (score >= 0.75) return { label: 'Extreme', color: 'text-red-400', bg: 'bg-red-500' };
		if (score >= 0.50) return { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500' };
		if (score >= 0.25) return { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500' };
		return { label: 'Low', color: 'text-green-400', bg: 'bg-green-500' };
	};

	if (loading) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="text-white text-xl">Loading dashboard...</div></div>;

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
		// Keep same heuristic used in AI Pulse for consistency
		if (recessionValue < 0.15) return { label: 'High', color: 'text-red-400' };
		if (recessionValue < 0.25) return { label: 'Elevated', color: 'text-orange-300' };
		if (recessionValue < 0.4) return { label: 'Moderate', color: 'text-yellow-300' };
		return { label: 'Low', color: 'text-emerald-400' };
	})();

	return (
		<RequirePlan min="premium">
			<div className="min-h-screen bg-[var(--background)] text-white">
				<div className="bg-slate-800 border-b border-slate-700"><div className="max-w-7xl mx-auto px-3 py-1 flex items-center space-x-2"><NavigationLink href="/" className="text-blue-400 hover:text-blue-300"><ArrowLeftIcon className="h-4 w-4" /></NavigationLink><h1 className="text-sm font-bold">Market Dashboard</h1></div></div>
				
				{/* Market Sentiment & Risk Metrics (Top) */}
				{(extremes || riskRegime || recessionIndex) && (
					<div className="max-w-7xl mx-auto px-3 pt-3 pb-2">
						<div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-xl p-4 ring-1 ring-white/10">
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-xs font-bold text-gray-300 flex items-center gap-1">
									<span>📊</span> Market Sentiment & Risk Dashboard
								</h3>
								<span className="text-[9px] text-gray-500">Updated: {new Date((extremes?.asOf || new Date().toISOString())).toLocaleTimeString()}</span>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
								{/* FLAME - Euphoria */}
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
										{flameScore >= 0.75 && "Extreme bullish sentiment. High-beta outperforming."}
										{flameScore >= 0.50 && flameScore < 0.75 && "Strong risk-on. Cyclicals leading."}
										{flameScore >= 0.25 && flameScore < 0.50 && "Moderate optimism. Balanced rotation."}
										{flameScore < 0.25 && "Subdued risk appetite. Defensive positioning."}
									</p>
								</div>
								{/* BOTTOM - Panic */}
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
										{bottomScore >= 0.75 && "Extreme fear. Flight to safety, credit frozen."}
										{bottomScore >= 0.50 && bottomScore < 0.75 && "High stress. Defensives outperforming."}
										{bottomScore >= 0.25 && bottomScore < 0.50 && "Moderate caution. Quality over growth."}
										{bottomScore < 0.25 && "Low fear. Market functioning normally."}
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
										{/* Center-based gradient bar: on=green right, off=red left */}
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
					</div>
				)}
						{/* Toolbar */}
						<div className="bg-slate-800 border-b border-slate-700">
							<div className="max-w-7xl mx-auto px-3 py-3 flex flex-wrap items-center gap-3 text-xs">
								{/* toolbar actions removed per request (Symbols Compact / Export CSV) */}
								<div className="ml-auto" />
							</div>
						</div>
				{summary && (
					<div className="max-w-7xl mx-auto px-3 py-1 grid grid-cols-5 gap-1 mb-2">
						{(() => {
							const parseNum = (s: string) => {
								const cleaned = s.replace(/[%+,\s]/g, '')
								const n = Number(cleaned)
								return Number.isFinite(n) ? n : 0
							}
							const avgPerfNum = parseNum(summary.avgPerformance)
							const avgPerfColor = avgPerfNum > 0 ? 'text-green-500' : avgPerfNum < 0 ? 'text-red-500' : 'text-white'
							const items: Array<[string, string, string]> = [
								['Avg Performance', summary.avgPerformance, avgPerfColor],
								['Volume', summary.totalVolume, 'text-white'],
								['Bull/Bear', `${summary.bullishCount}/${summary.bearishCount}`, 'text-white'],
								['Sentiment', summary.marketSentiment, summary.marketSentiment === 'Bullish' ? 'text-green-500' : summary.marketSentiment === 'Bearish' ? 'text-red-500' : 'text-yellow-500'],
								['Status','LIVE','text-green-500']
							]
							return items.map(([l,v,c],i)=> (
								<div key={i} className="bg-slate-800 rounded p-1">
									<div className="text-xs text-gray-400">{l}</div>
									<div className={`text-xs font-bold ${c}`}>{v}</div>
								</div>
							))
						})()}
					</div>
				)}

				{/* Real-time Sentiment block (Composite + Put/Call) removed per request */}

				{/* Global Market Drivers module removed in favor of WorldDriversMap */}

			{/* Important News popup (impactful headlines) */}
			<ImportantNewsPopup />

			{/* Advanced Filters */}
								<div className="max-w-7xl mx-auto px-3 pb-4">
												{/* Sector diagnostics removed */}
									<div className="bg-slate-800 rounded p-3 mb-3 grid gap-3 md:grid-cols-6 lg:grid-cols-8 text-[11px]">
										<input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search Ticker / Name" className="px-2 py-1 bg-slate-700 border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
										<select value={selectedSector} onChange={e=>setSelectedSector(e.target.value)} className="px-2 py-1 bg-slate-700 border border-slate-600 rounded"><option value="All">Sector: All</option>{getUniqueSectors().map(s=> <option key={s}>{s}</option>)}</select>
										{/* Market and Category filters removed per request */}
										<input value={minVolume} onChange={e=>setMinVolume(e.target.value)} placeholder="Min Vol" className="px-2 py-1 bg-slate-700 border border-slate-600 rounded" />
										<input value={perfMin} onChange={e=>setPerfMin(e.target.value)} placeholder="Perf ≥%" className="px-2 py-1 bg-slate-700 border border-slate-600 rounded" />
										<input value={perfMax} onChange={e=>setPerfMax(e.target.value)} placeholder="Perf ≤%" className="px-2 py-1 bg-slate-700 border border-slate-600 rounded" />
										<div className="flex items-center gap-2">
											<button onClick={()=>{setSelectedSector('All');setSelectedMarket('All');setSearchTerm('');setMinVolume('');setPerfMin('');setPerfMax('');}} className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded px-2 py-1">Reset</button>
										</div>
										<div className="flex items-center justify-end text-gray-400">{filteredData.length} / {data.length}</div>
									</div>
									{/* Data Table */}
									<div className="bg-slate-800 rounded border border-slate-700 overflow-hidden">
										<div className="overflow-auto max-h-[70vh]">
											<table className="w-full text-[11px] leading-tight">
												<thead className="bg-slate-700 sticky top-0 z-10 shadow">
													<tr>
														{[
															{k:'ticker', l:'Ticker / Name'},
															{k:'price', l:'Price / Δ'},
															// performance removed per request
															{k:'volume', l:'Volume'},
															{k:'trend', l:'Trend'},
															{k:'demandSupply', l:'D/S'},
															{k:'optionsSentiment', l:'Opt Sent'},
															{k:'gammaRisk', l:'Gamma'},
															{k:'putCallRatio', l:'P/C'},
															{k:'unusualCombo', l:'Unusual'},
															{k:'unusualOtm', l:'OTM'},
															{k:'otmSkew', l:'Skew'},
															{k:'intradayFlow', l:'Intra'},
															{k:'unusualAtm', l:'ATM'},
															// RS% removed per request
															{k:'aiScore', l:'AI Score'},
															{k:'aiLabel', l:'AI Signal'},
															{k:'category', l:'Cat'}
														].map(col => (
															<th key={col.k} onClick={()=> toggleSort(col.k)} className="px-2 py-1 text-left font-semibold text-gray-300 cursor-pointer select-none whitespace-nowrap">
																<div className="flex items-center gap-1">
																	<span>{col.l}</span>
																	{sortKey === col.k && (sortDir === 'asc' ? <ArrowUpIcon className="h-3 w-3"/> : <ArrowDownIcon className="h-3 w-3"/>)}
																</div>
															</th>
														))}
													</tr>
												</thead>
												<tbody className="divide-y divide-slate-700">
																{filteredData.map(item => {
																	const opt = optsByTicker[item.ticker];
																	return (
														<tr key={item.ticker} className="hover:bg-slate-700/40">
															<td className={`px-2 py-1 ${wideSymbols ? 'min-w-[220px]' : 'min-w-[140px]'}`}>
																<div className="flex flex-col">
																	<span className="font-medium text-white">{item.ticker} {item.direction && <span className="text-[10px] text-gray-400">{item.direction}</span>}</span>
																	<span title={item.name} className={`text-[10px] text-gray-400 ${wideSymbols ? 'whitespace-normal' : 'truncate max-w-[160px]'}`}>{item.name}</span>
																	{item.sector && <span className="text-[10px] text-blue-400">{item.sector}</span>}
																</div>
															</td>
															<td className="px-2 py-1">
																<div className="flex flex-col">
																	<span className="text-white font-medium">{item.price ? `$${item.price}` : '—'}</span>
																	<span className={`text-[10px] ${getPerformanceColor(item.change)}`}>{item.change?`${item.change.startsWith('$')? '': '$'}${item.change}`:'—'}</span>
																</div>
															</td>
															{/* Performance column removed */}
															<td className="px-2 py-1 tabular-nums">{item.volume || '—'}</td>
															<td className="px-2 py-1"><span className={`inline-flex px-1 py-0.5 rounded ${getTrendColor(item.trend)} font-semibold`}>{item.trend}</span></td>
																			<td className="px-2 py-1 text-gray-300">{item.demandSupply}</td>
																			<td className="px-2 py-1 text-gray-300">
																				<span className="relative group inline-flex items-center gap-1">
																					{opt?.optionsSentiment || item.optionsSentiment}
																			{opt && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-600/30 text-emerald-200 border border-emerald-500/30">LIVE</span>}
																			{opt && (
																				<div className="absolute z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 -bottom-1 left-1/2 -translate-x-1/2 translate-y-full">
																					<SmallTooltip lines={[
																						`Vol P/C: ${opt.putCallRatioVol ?? '—'}`,
																						`OI P/C: ${opt.putCallRatioOI ?? '—'}`
																					]} />
																				</div>
																			)}
																		</span>
																			</td>
																			<td className="px-2 py-1 text-gray-300">{opt?.gammaLabel || item.gammaRisk}</td>
																			<td className="px-2 py-1">
																				<span className="relative group inline-flex font-semibold tabular-nums">
																					{(() => {
																						if (!opt) return <span className="text-gray-300">{item.putCallRatio && item.putCallRatio !== '—' ? item.putCallRatio : '—'}</span>;
																						const display = opt.putCallRatioVol || opt.putCallRatioOI || '—';
																						return <span className={getPCRClass(display)}>{display}</span>;
																					})()}
																					{opt && (
																						<div className="absolute z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 -bottom-1 left-1/2 -translate-x-1/2 translate-y-full">
																							<SmallTooltip lines={[
																								`Vol P/C: ${opt.putCallRatioVol ?? '—'}`,
																								`OI P/C: ${opt.putCallRatioOI ?? '—'}`
																							]} />
																						</div>
																					)}
																				</span>
																			</td>
																			<td className="px-2 py-1 text-gray-300">
																				{(() => {
																					const combo = opt?.unusualCombo;
																					if (combo) return combo;
																					const a = opt?.unusualAtm || item.unusualAtm;
																					const b = opt?.unusualOtm || item.unusualOtm;
																					return (a || b) ? `${a || '—'} / ${b || '—'}` : '—';
																				})()}
																			</td>
																			<td className="px-2 py-1 text-gray-300">{opt?.unusualOtm || item.unusualOtm}</td>
																			<td className="px-2 py-1 text-gray-300">{opt?.callSkew || item.otmSkew}</td>
																			<td className="px-2 py-1 text-gray-300">{(opt && typeof opt.gammaExposure === 'number' && opt.gammaExposure > 0) ? 'Gamma Bull' : item.intradayFlow}</td>
																			<td className="px-2 py-1 text-gray-300">{opt?.unusualAtm || item.unusualAtm}</td>
															{/* RS% column removed */}
															<td className="px-2 py-1 text-center"><AIScoreBadge item={item} /></td>
															<td className="px-2 py-1"><AISignalBadge item={item} /></td>
															<td className="px-2 py-1 text-gray-300">{item.category || '—'}</td>
														</tr>
																	);
																})}
													{!filteredData.length && (
														<tr><td colSpan={15} className="px-4 py-6 text-center text-gray-500">No results match current filters.</td></tr>
													)}
												</tbody>
											</table>
										</div>
									</div>
									{/* Footnotes removed per request */}
								{/* Lazy charts mount */}
								<div ref={chartsRef} className="mt-6" />
								{chartsReady && (
									<DashboardCharts enrichedData={enrichedData as any} />
								)}
								</div>
				<Footer />
			</div>
		</RequirePlan>
	);
}
