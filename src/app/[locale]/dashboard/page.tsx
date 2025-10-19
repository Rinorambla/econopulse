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

	const toggleSort = (key:string) => {
		if (sortKey === key) setSortDir(d=> d==='asc'?'desc':'asc'); else { setSortKey(key); setSortDir('desc'); }
	};

	// export CSV removed per request

	if (loading) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="text-white text-xl">Loading dashboard...</div></div>;

	return (
		<RequirePlan min="premium">
			<div className="min-h-screen bg-[var(--background)] text-white">
				<div className="bg-slate-800 border-b border-slate-700"><div className="max-w-7xl mx-auto px-3 py-1 flex items-center space-x-2"><NavigationLink href="/" className="text-blue-400 hover:text-blue-300"><ArrowLeftIcon className="h-4 w-4" /></NavigationLink><h1 className="text-sm font-bold">Market Dashboard</h1></div></div>
						{/* Toolbar */}
						<div className="bg-slate-800 border-b border-slate-700">
							<div className="max-w-7xl mx-auto px-3 py-3 flex flex-wrap items-center gap-3 text-xs">
								{/* toolbar actions removed per request (Symbols Compact / Export CSV) */}
								<div className="ml-auto" />
							</div>
						</div>
				{summary && (<div className="max-w-7xl mx-auto px-3 py-1 grid grid-cols-5 gap-1 mb-2">{[['Avg Performance',summary.avgPerformance, summary.avgPerformance.startsWith('+')?'text-green-500':'text-red-500'],['Volume',summary.totalVolume,'text-white'],['Bull/Bear',`${summary.bullishCount}/${summary.bearishCount}`,'text-white'],['Sentiment',summary.marketSentiment, summary.marketSentiment==='Bullish'?'text-green-500':summary.marketSentiment==='Bearish'?'text-red-500':'text-yellow-500'],['Status','LIVE','text-green-500']].map(([l,v,c],i)=>(<div key={i} className="bg-slate-800 rounded p-1"><div className="text-xs text-gray-400">{l}</div><div className={`text-xs font-bold ${c}`}>{v}</div></div>))}</div>)}

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
													{filteredData.map(item => (
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
															<td className="px-2 py-1 text-gray-300">{item.optionsSentiment}</td>
															<td className="px-2 py-1 text-gray-300">{item.gammaRisk}</td>
															<td className="px-2 py-1 text-gray-300">{item.putCallRatio}</td>
															<td className="px-2 py-1 text-gray-300">{item.unusualOtm}</td>
															<td className="px-2 py-1 text-gray-300">{item.otmSkew}</td>
															<td className="px-2 py-1 text-gray-300">{item.intradayFlow}</td>
															<td className="px-2 py-1 text-gray-300">{item.unusualAtm}</td>
															{/* RS% column removed */}
															<td className="px-2 py-1 text-center"><AIScoreBadge item={item} /></td>
															<td className="px-2 py-1"><AISignalBadge item={item} /></td>
															<td className="px-2 py-1 text-gray-300">{item.category || '—'}</td>
														</tr>
													))}
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
