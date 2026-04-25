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
	const [showInfo, setShowInfo] = useState(false);
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
		dataSource?: string;
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
			const response = await fetch('/api/dashboard-data?scope=full&limit=900&crypto=1&forex=1', { cache: 'no-store', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal });
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
		// Compute relative strength using composite of perf + volume
		const perfValues = data.map(d => parsePerf(d.performance));
		const sorted = [...perfValues].sort((a,b)=>a-b);
		// Binary search percentile (avoids indexOf tie bug)
		const percentile = (val:number) => {
			if (sorted.length <= 1) return 50;
			let lo = 0, hi = sorted.length - 1;
			while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (sorted[mid] <= val) lo = mid; else hi = mid - 1; }
			return lo / (sorted.length - 1) * 100;
		};
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

	// (Market Sentiment & Risk block moved to /market-dna)

	// Selected ticker for DEX/GEX modal
	const [selectedRow, setSelectedRow] = useState<null | { item: MarketData; opt: any; dex: number }>(null);

	if (loading) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="text-white text-xl">Loading dashboard...</div></div>;

	return (
		<RequirePlan min="premium">
			<div className="min-h-screen bg-[var(--background)] text-white">
				<div className="bg-slate-800 border-b border-slate-700"><div className="max-w-7xl mx-auto px-3 py-1 flex items-center space-x-2"><NavigationLink href="/" className="text-blue-400 hover:text-blue-300"><ArrowLeftIcon className="h-4 w-4" /></NavigationLink><h1 className="text-sm font-bold">Market Dashboard</h1><span className="ml-3 text-[10px] text-gray-400">Sentiment &amp; Risk panel moved to <NavigationLink href="/market-dna" className="text-blue-400 hover:underline">Market DNA</NavigationLink></span></div></div>

				{/* Market Sentiment & Risk block moved to /market-dna */}
						{/* Toolbar */}
						<div className="bg-slate-800 border-b border-slate-700">
							<div className="max-w-7xl mx-auto px-3 py-3 flex flex-wrap items-center gap-3 text-xs">
								{/* toolbar actions removed per request (Symbols Compact / Export CSV) */}
								<div className="ml-auto" />
								<button onClick={() => setShowInfo(true)} className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-white hover:bg-slate-700 rounded transition-colors" title="Column guide">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5"/><text x="10" y="14.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">i</text></svg>
									<span className="text-[10px]">Guide</span>
								</button>
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
										<div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '300px' }}>
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
														{k:'dex', l:'DEX'},
														{k:'optionsSentiment', l:'Opt Sent'},
														{k:'gammaRisk', l:'GEX'},
															{k:'putCallRatio', l:'P/C'},
															{k:'unusualCombo', l:'Unusual'},
															{k:'unusualOtm', l:'OTM'},
															{k:'otmSkew', l:'Skew'},
															{k:'intradayFlow', l:'Intra'},
															{k:'unusualAtm', l:'ATM'},
															// RS% removed per request
															{k:'aiScore', l:'AI Score'}
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
																	const computeDex = () => {
																		const perf = parsePerf(item.performance);
																		const volStr = item.volume || '0';
																		const volNum = parseFloat(volStr) * (volStr.includes('B') ? 1e9 : volStr.includes('M') ? 1e6 : volStr.includes('K') ? 1e3 : 1);
																		const trendW = item.trend === 'Strong Up' ? 1 : item.trend === 'Strong Down' ? -1 : item.trend === 'Up' ? 0.4 : item.trend === 'Down' ? -0.4 : 0;
																		const dsW = item.demandSupply === 'High Demand' ? 1 : item.demandSupply === 'Moderate Demand' ? 0.4 : item.demandSupply === 'High Supply' ? -1 : item.demandSupply === 'Moderate Supply' ? -0.4 : 0;
																		const volW = volNum > 50e6 ? 8 : volNum > 10e6 ? 5 : volNum > 1e6 ? 2 : 0;
																		const raw = (perf * 8) + (trendW * 18) + (dsW * 14) + (perf > 0 ? volW : -volW);
																		return Math.max(-100, Math.min(100, Math.round(raw)));
																	};
																	return (
														<tr key={item.ticker} onClick={() => setSelectedRow({ item, opt, dex: computeDex() })} className="hover:bg-slate-700/40 cursor-pointer">
															<td className="px-2 py-1 min-w-[110px]">
																<div className="flex items-center gap-1.5">
																	<img
																		src={`https://assets.parqet.com/logos/symbol/${item.ticker}?format=jpg`}
																		alt=""
																		className="w-5 h-5 rounded-full bg-slate-700 object-cover flex-shrink-0"
																		onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
																		loading="lazy"
																	/>
																	<span className="font-bold text-white tracking-tight" title={item.name}>{item.ticker}</span>
																	{item.direction && <span className="text-[9px] text-gray-500">{item.direction}</span>}
																</div>
																{item.sector && <span className="text-[9px] text-blue-400/70">{item.sector}</span>}
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
															<td className="px-2 py-1 text-center">{(() => {
																const perf = parsePerf(item.performance);
															const volStr = item.volume || '0';
															const volNum = parseFloat(volStr) * (volStr.includes('B') ? 1e9 : volStr.includes('M') ? 1e6 : volStr.includes('K') ? 1e3 : 1);
															const trendW = item.trend === 'Strong Up' ? 1 : item.trend === 'Strong Down' ? -1 : item.trend === 'Up' ? 0.4 : item.trend === 'Down' ? -0.4 : 0;
															const dsW = item.demandSupply === 'High Demand' ? 1 : item.demandSupply === 'Moderate Demand' ? 0.4 : item.demandSupply === 'High Supply' ? -1 : item.demandSupply === 'Moderate Supply' ? -0.4 : 0;
															const volW = volNum > 50e6 ? 8 : volNum > 10e6 ? 5 : volNum > 1e6 ? 2 : 0;
															const raw = (perf * 8) + (trendW * 18) + (dsW * 14) + (perf > 0 ? volW : -volW);
																const dex = Math.max(-100, Math.min(100, Math.round(raw)));
																const cls = dex > 20 ? 'text-emerald-400 font-semibold' : dex < -20 ? 'text-red-400 font-semibold' : 'text-gray-300';
																return <span className={cls}>{dex > 0 ? '+' : ''}{dex}</span>;
															})()}</td>
																			<td className="px-2 py-1 text-gray-300">
																				<span className="relative group inline-flex items-center gap-1">
																					{opt?.optionsSentiment || item.optionsSentiment}
																			{opt && (opt.dataSource === 'polygon' || opt.dataSource === 'tradier') && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-600/30 text-emerald-200 border border-emerald-500/30">LIVE</span>}
																			{opt && opt.dataSource === 'estimated' && <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-600/20 text-yellow-300 border border-yellow-500/20">EST</span>}
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
																			<td className="px-2 py-1">
																				<span className="relative group inline-flex items-center gap-1">
																					{(() => {
																						const gex = opt?.gammaExposure;
																						if (gex != null && isFinite(gex)) {
																							const abs = Math.abs(gex);
																							const fmt = abs >= 1e9 ? `${(gex / 1e9).toFixed(1)}B` : abs >= 1e6 ? `${(gex / 1e6).toFixed(0)}M` : `${(gex / 1e3).toFixed(0)}K`;
																							const cls = gex > 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold';
																							return <span className={cls}>{gex > 0 ? '+' : ''}{fmt}</span>;
																						}
																						const label = opt?.gammaLabel || item.gammaRisk;
																						const cls = label === 'High' || label === 'Extreme' ? 'text-amber-400' : 'text-gray-300';
																						return <span className={cls}>{label}</span>;
																					})()}
																					{opt?.gammaExposure != null && (
																						<div className="absolute z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 -bottom-1 left-1/2 -translate-x-1/2 translate-y-full">
																							<SmallTooltip lines={[
																								`GEX: ${opt.gammaExposure > 0 ? '+' : ''}${(opt.gammaExposure / 1e9).toFixed(2)}B`,
																								`${opt.gammaExposure > 0 ? 'Dealers long gamma (stabilizing)' : 'Dealers short gamma (volatile)'}`
																							]} />
																						</div>
																					)}
																				</span>
																			</td>
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
																			<td className="px-2 py-1 text-gray-300">{(() => {
																				if (opt && typeof opt.gammaExposure === 'number' && isFinite(opt.gammaExposure)) {
																					return opt.gammaExposure > 0 ? 'Gamma Bull' : 'Gamma Bear';
																				}
																				return item.intradayFlow;
																			})()}</td>
																			<td className="px-2 py-1 text-gray-300">{opt?.unusualAtm || item.unusualAtm}</td>
															{/* RS% column removed */}
															<td className="px-2 py-1 text-center"><AIScoreBadge item={item} /></td>
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

				{/* Info Guide Modal */}
				{showInfo && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowInfo(false)}>
						<div className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
							<div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
								<h3 className="text-sm font-bold text-white">Column Guide</h3>
								<button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
							</div>
							<div className="px-4 py-3 space-y-3 text-[11px] text-gray-300">
								<div>
									<span className="text-blue-400 font-bold">GEX</span> — <span className="text-white font-semibold">Gamma Exposure</span><br/>
									Net gamma dealers hold. <span className="text-emerald-400">+GEX</span> = dealers are long gamma → they sell into rallies &amp; buy dips → <span className="text-emerald-400">stabilizing, low-vol</span>. <span className="text-red-400">−GEX</span> = dealers short gamma → they chase moves → <span className="text-red-400">volatile, big swings</span>.
								</div>
								<div>
									<span className="text-blue-400 font-bold">DEX</span> — <span className="text-white font-semibold">Directional Exposure Index</span><br/>
									Composite score (−100 to +100) combining trend, demand/supply, volume, and performance. <span className="text-emerald-400">&gt;+20</span> = strong bullish pressure. <span className="text-red-400">&lt;−20</span> = strong bearish pressure. Near 0 = neutral.
								</div>
								<div>
									<span className="text-blue-400 font-bold">P/C</span> — <span className="text-white font-semibold">Put/Call Ratio</span><br/>
									Ratio of put volume to call volume. <span className="text-emerald-400">&lt;0.7</span> = bullish (more calls). <span className="text-red-400">&gt;1.0</span> = bearish (more puts). Between = neutral.
								</div>
								<div>
									<span className="text-blue-400 font-bold">Opt Sent</span> — <span className="text-white font-semibold">Options Sentiment</span><br/>
									Classified from P/C ratio + GEX: FOMO Buying, Stealth Bull, Hedging, Panic Selling, etc.
								</div>
								<div>
									<span className="text-blue-400 font-bold">Skew</span> — <span className="text-white font-semibold">OTM Skew</span><br/>
									Call Skew = OTM calls costlier (bullish bets). Put Skew = OTM puts costlier (downside hedging).
								</div>
								<div>
									<span className="text-blue-400 font-bold">Intra</span> — <span className="text-white font-semibold">Intraday Flow</span><br/>
									Gamma Bull = positive GEX (dealers stabilize). Gamma Bear = negative GEX (dealers amplify moves).
								</div>
								<div>
									<span className="text-blue-400 font-bold">D/S</span> — <span className="text-white font-semibold">Demand / Supply</span><br/>
									Order flow imbalance. High Demand = buyers dominate. High Supply = sellers dominate.
								</div>
								<div>
									<span className="text-blue-400 font-bold">Unusual</span> — <span className="text-white font-semibold">Unusual Activity</span><br/>
									ATM / OTM unusual volume levels (Low/Medium/High). High = potential institutional positioning.
								</div>
								<div>
									<span className="text-blue-400 font-bold">AI Score</span> — <span className="text-white font-semibold">Composite AI Score</span><br/>
									0-100 score combining momentum, relative strength, volatility, and mean reversion signals.
								</div>
							</div>
						</div>
					</div>
				)}

				{/* DEX / GEX detail modal */}
				{selectedRow && (() => {
					const { item, opt, dex } = selectedRow;
					const perf = parsePerf(item.performance);
					const volStr = item.volume || '0';
					const volNum = parseFloat(volStr) * (volStr.includes('B') ? 1e9 : volStr.includes('M') ? 1e6 : volStr.includes('K') ? 1e3 : 1);
					const trendW = item.trend === 'Strong Up' ? 1 : item.trend === 'Strong Down' ? -1 : item.trend === 'Up' ? 0.4 : item.trend === 'Down' ? -0.4 : 0;
					const dsW = item.demandSupply === 'High Demand' ? 1 : item.demandSupply === 'Moderate Demand' ? 0.4 : item.demandSupply === 'High Supply' ? -1 : item.demandSupply === 'Moderate Supply' ? -0.4 : 0;
					const volW = volNum > 50e6 ? 8 : volNum > 10e6 ? 5 : volNum > 1e6 ? 2 : 0;
					const components = [
						{ label: 'Performance', value: perf * 8, raw: `${perf.toFixed(2)}%` },
						{ label: 'Trend', value: trendW * 18, raw: item.trend },
						{ label: 'Demand/Supply', value: dsW * 14, raw: item.demandSupply },
						{ label: 'Volume', value: perf > 0 ? volW : -volW, raw: item.volume || '—' },
					];
					const maxAbs = Math.max(...components.map(c => Math.abs(c.value)), 1);
					const gex = opt?.gammaExposure;
					const gexAbs = gex != null && isFinite(gex) ? Math.abs(gex) : 0;
					const gexFmt = gex != null && isFinite(gex)
						? (gexAbs >= 1e9 ? `${(gex / 1e9).toFixed(2)}B` : gexAbs >= 1e6 ? `${(gex / 1e6).toFixed(1)}M` : `${(gex / 1e3).toFixed(0)}K`)
						: null;
					return (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelectedRow(null)}>
							<div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-2xl w-[92%] max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
								<div className="flex items-start justify-between mb-4">
									<div>
										<div className="flex items-center gap-2">
											<img src={`https://assets.parqet.com/logos/symbol/${item.ticker}?format=jpg`} alt="" className="w-7 h-7 rounded-full bg-slate-700" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
											<h3 className="text-lg font-bold text-white">{item.ticker}</h3>
											{item.sector && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30">{item.sector}</span>}
										</div>
										<p className="text-[11px] text-gray-400 mt-1">{item.name}</p>
									</div>
									<button onClick={() => setSelectedRow(null)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
								</div>

								<div className="grid grid-cols-2 gap-3 mb-4">
									<div className="bg-slate-800/60 rounded-lg p-3 ring-1 ring-white/5">
										<div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">DEX (Demand Exposure)</div>
										<div className={`text-3xl font-bold tabular-nums ${dex > 20 ? 'text-emerald-400' : dex < -20 ? 'text-red-400' : 'text-gray-300'}`}>{dex > 0 ? '+' : ''}{dex}</div>
										<div className="text-[10px] text-gray-500 mt-1">
											{dex > 50 ? 'Strong demand pressure' : dex > 20 ? 'Net buying' : dex < -50 ? 'Strong supply pressure' : dex < -20 ? 'Net selling' : 'Balanced'}
										</div>
									</div>
									<div className="bg-slate-800/60 rounded-lg p-3 ring-1 ring-white/5">
										<div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">GEX (Gamma Exposure)</div>
										{gexFmt ? (
											<>
												<div className={`text-3xl font-bold tabular-nums ${gex! > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{gex! > 0 ? '+' : '−'}{gexFmt}</div>
												<div className="text-[10px] text-gray-500 mt-1">{gex! > 0 ? 'Dealers long gamma → stabilizing' : 'Dealers short gamma → volatile'}</div>
											</>
										) : (
											<>
												<div className="text-2xl font-bold text-gray-400">{opt?.gammaLabel || item.gammaRisk || '—'}</div>
												<div className="text-[10px] text-gray-500 mt-1">No live exposure value</div>
											</>
										)}
									</div>
								</div>

								<div className="bg-slate-800/40 rounded-lg p-3 ring-1 ring-white/5 mb-3">
									<div className="text-[11px] font-semibold text-gray-300 mb-2">DEX components</div>
									<div className="space-y-2">
										{components.map(c => {
											const pct = (Math.abs(c.value) / maxAbs) * 100;
											const positive = c.value >= 0;
											return (
												<div key={c.label}>
													<div className="flex justify-between text-[10px] mb-1">
														<span className="text-gray-400">{c.label} <span className="text-gray-500">({c.raw})</span></span>
														<span className={`tabular-nums ${positive ? 'text-emerald-400' : 'text-red-400'}`}>{positive ? '+' : ''}{c.value.toFixed(1)}</span>
													</div>
													<div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
														<div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-600" />
														<div className={`absolute top-0 bottom-0 ${positive ? 'left-1/2 bg-emerald-500' : 'right-1/2 bg-red-500'} rounded-full`} style={{ width: `${pct / 2}%` }} />
													</div>
												</div>
											);
										})}
									</div>
								</div>

								{opt && (
									<div className="grid grid-cols-3 gap-2 text-[10px]">
										<div className="bg-slate-800/40 rounded p-2"><div className="text-gray-500">Vol P/C</div><div className="text-white font-semibold">{opt.putCallRatioVol ?? '—'}</div></div>
										<div className="bg-slate-800/40 rounded p-2"><div className="text-gray-500">OI P/C</div><div className="text-white font-semibold">{opt.putCallRatioOI ?? '—'}</div></div>
										<div className="bg-slate-800/40 rounded p-2"><div className="text-gray-500">Source</div><div className="text-white font-semibold uppercase">{opt.dataSource || '—'}</div></div>
									</div>
								)}

								<p className="text-[10px] text-gray-500 mt-3 leading-relaxed">
									DEX combines short-term performance, trend strength, demand/supply pressure, and signed volume into a −100…+100 score of net buying/selling pressure.
									GEX (when available) reflects dealer gamma positioning: positive values dampen volatility (dealers buy dips/sell rips), negative values amplify it.
								</p>
							</div>
						</div>
					);
				})()}

				<Footer />
			</div>
		</RequirePlan>
	);
}
