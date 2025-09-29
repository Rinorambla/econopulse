// Restored original custom dashboard implementation (recovered from commit 20e02f9)
// If you need to revert to the Visual AI dashboard, reintroduce the export to '../visual-ai/page'.
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
	BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
	PieChart, Pie, Cell, ScatterChart, Scatter, Legend
} from 'recharts';
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
	const [autoRefreshSec, setAutoRefreshSec] = useState<number>(300); // 5 min default
	const [showCharts, setShowCharts] = useState<boolean>(true);
	const [chartMode, setChartMode] = useState<'sectors'|'categories'|'ai'|'scatter'>('sectors');

// ============================================================================
// Data Fetch
// ============================================================================

	const fetchLiveData = async () => {
		try {
			setLoading(true);
			// Request a larger universe of symbols for richer coverage
			const response = await fetch('/api/dashboard-data?scope=full&limit=600&crypto=1&forex=1', { cache: 'no-store', headers: { 'Content-Type': 'application/json' } });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const result: DashboardResponse = await response.json();
			setData(result.data || []);
			setSummary(result.summary || null);
			setLastUpdated(result.lastUpdated || new Date().toISOString());
		} catch (e) {
			setData([]); setSummary(null);
		} finally { setLoading(false); }
	};

	const fetchVixData = async () => { try { const r = await fetch('/api/vix'); if (r.ok) { const j = await r.json(); if (j.success && j.data) setVixData({ price: j.data.price, volatilityLevel: j.data.volatilityLevel, color: j.data.color }); } } catch {} };

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
	const getPerformanceColor = (p: string) => p.startsWith('+') ? 'text-green-500' : 'text-red-500';
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

	// ===================== Derived datasets for charts =====================
	const sectorPerfData = useMemo(() => {
		const m: Record<string,{sum:number;count:number}> = {};
		enrichedData.forEach(d => { if(!d.sector) return; const p = parseFloat(d.performance); if(!m[d.sector]) m[d.sector]={sum:0,count:0}; m[d.sector].sum+=p; m[d.sector].count++; });
		return Object.entries(m).map(([sector,v])=>({ sector, avg:+(v.sum/v.count).toFixed(2) }))
			.sort((a,b)=> b.avg - a.avg).slice(0,15);
	}, [enrichedData]);

	const categoryDistribution = useMemo(() => {
		const m: Record<string,number> = {};
		enrichedData.forEach(d => { if(!d.category) return; m[d.category]=(m[d.category]||0)+1; });
		return Object.entries(m).map(([category,value])=>({ category, value }));
	}, [enrichedData]);

	const topAISignals = useMemo(() => {
		return [...enrichedData]
			.filter(d=> d.aiSignal)
			.sort((a,b)=> (b.aiSignal!.compositeScore - a.aiSignal!.compositeScore))
			.slice(0,12)
			.map(d=>({ ticker:d.ticker, score:d.aiSignal!.compositeScore, label:d.aiSignal!.label }));
	}, [enrichedData]);

	const momentumVsRS = useMemo(() => {
		return enrichedData.filter(d=> d.aiSignal)
			.map(d=>({
				ticker:d.ticker,
				momentum:d.aiSignal!.momentum,
				rs:d.aiSignal!.relativeStrength,
				category:d.category||'Other',
				label:d.aiSignal!.label
			}));
	}, [enrichedData]);

	// Parsing intraday flow – map qualitative labels to deterministic numeric intensities
	// Labels from backend getIntradayFlow(): 'Gamma Bull','Buy to Open','Call hedging','Put selling','Hedge Flow','unusual activity','Delta Neutral'
	const parseFlow = (f?: string) => {
		if(!f) return 0;
		const key = f.toLowerCase();
		if (key.includes('gamma bull')) return 3;       // very strong positive flow
		if (key.includes('buy to open')) return 2;      // bullish opening call buying
		if (key.includes('call hedging')) return 1;     // mild positive (institutional hedging)
		if (key.includes('put selling')) return -2;     // negative / defensive pressure
		if (key.includes('hedge flow')) return -1;      // mild negative hedging
		if (key.includes('unusual activity')) return 0; // treat as neutral directionally (could split later)
		if (key.includes('delta neutral')) return 0;    // neutral
		return 0;
	};

	const flowDirectionData = useMemo(()=>{
		const map: Record<string,{sum:number;count:number}> = {};
		enrichedData.forEach(d=>{
			if(!d.intradayFlow) return;
			const v = parseFlow(d.intradayFlow);
			// include zeros to allow neutrality weighting if needed (kept in sum has no effect)
			const sector = d.sector || 'Other';
			if(!map[sector]) map[sector]={sum:0,count:0};
			map[sector].sum += v;
			map[sector].count += 1;
		});
		return Object.entries(map)
			.map(([sector,val])=>({ sector, netFlow:+val.sum.toFixed(2) }))
			.sort((a,b)=> Math.abs(b.netFlow) - Math.abs(a.netFlow))
			.slice(0,12);
	}, [enrichedData]);

	const totalNetFlow = useMemo(()=> flowDirectionData.reduce((a,b)=> a + b.netFlow, 0), [flowDirectionData]);

	const categoryColor = (cat:string) => {
		switch(cat){
			case 'Factor': return '#6366f1';
			case 'Thematic': return '#f59e0b';
			case 'Commodity': return '#d97706';
			case 'International': return '#0ea5e9';
			case 'Crypto': return '#84cc16';
			case 'Forex': return '#14b8a6';
			case 'LargeCap': return '#22d3ee';
			default: return '#64748b';
		}
	};

	const aiLabelColor = (lbl:string) => {
		switch(lbl){
			case 'STRONG BUY': return '#16a34a';
			case 'BUY': return '#4ade80';
			case 'HOLD': return '#64748b';
			case 'SELL': return '#fb923c';
			case 'STRONG SELL': return '#dc2626';
			default: return '#94a3b8';
		}
	};

	// ======= Generic small tooltip components (avoid native title for multiline & styling) =======
	const SmallTooltip: React.FC<{ lines: string[]; className?: string; }> = ({ lines, className='' }) => (
		<div className={`pointer-events-none whitespace-pre text-[10px] leading-tight bg-slate-900/95 border border-slate-600 shadow-xl rounded px-2 py-1 text-slate-200 max-w-[220px] ${className}`}>
			{lines.map((l,i)=>(<div key={i}>{l}</div>))}
		</div>
	);

	const AISignalBadge: React.FC<{ item: MarketData & { rs:number } }> = ({ item }) => {
		if(!item.aiSignal) return <span>—</span>;
		const sig = item.aiSignal;
		return (
			<span className="relative group inline-flex">
				<span
					className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight transition-colors
					${sig.label==='STRONG BUY' ? 'bg-green-600/30 text-green-300 border border-green-500/40' : ''}
					${sig.label==='BUY' ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30' : ''}
					${sig.label==='HOLD' ? 'bg-slate-600/30 text-slate-200 border border-slate-500/30' : ''}
					${sig.label==='SELL' ? 'bg-orange-600/30 text-orange-300 border border-orange-500/30' : ''}
					${sig.label==='STRONG SELL' ? 'bg-red-700/30 text-red-300 border border-red-600/40' : ''}`}
					aria-label={`AI Signal ${sig.label}`}
				>
					{sig.label}
				</span>
				{/* Hover tooltip */}
				<div className="absolute z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 -bottom-1 left-1/2 -translate-x-1/2 translate-y-full">
					<SmallTooltip lines={[
						`AI v${sig.version}`,
						`Composite: ${sig.compositeScore}`,
						`Momentum: ${sig.momentum}  RS: ${sig.relativeStrength}`,
						`Volatility: ${sig.volatility}  MR: ${sig.meanReversion}`,
						sig.rationale
					]} />
				</div>
			</span>
		);
	};

	const AIScoreBadge: React.FC<{ item: MarketData & { rs:number } }> = ({ item }) => {
		if(!item.aiSignal) return <span>—</span>;
		const sig = item.aiSignal;
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
						`Breakout: ${sig.breakout ? 'Yes':'No'}`
					]} />
				</div>
			</span>
		);
	};

	// Custom tooltip for Recharts
	const ChartTooltip = ({ active, payload, label }: any) => {
		if (!active || !payload || !payload.length) return null;
		const lines = payload.map((p:any) => `${p.name||p.dataKey}: ${p.value}`);
		return <SmallTooltip lines={[label, ...lines]} />;
	};

				// Sector diagnostics (coverage + missing fields) with normalization + extended fields
				const coreRequired: (keyof MarketData)[] = ['price','volume','trend','demandSupply','optionsSentiment','gammaRisk','putCallRatio'];
				const extendedRequired: (keyof MarketData)[] = ['unusualAtm','unusualOtm','otmSkew','intradayFlow'];
				const requiredFields: (keyof MarketData)[] = [...coreRequired, ...extendedRequired];
				// Fields where a literal zero / 0% is highly unlikely and usually means "no data"
				const improbableZeroFields: (keyof MarketData)[] = ['unusualAtm','unusualOtm','otmSkew','intradayFlow','optionsSentiment','gammaRisk','demandSupply'];
			const normalizeSector = (s?: string) => {
				if (!s) return 'Unclassified';
				const t = s.trim().toLowerCase();
				if (t === 'health care' || t === 'healthcare') return 'Healthcare';
				if (t === 'financial' || t === 'financial services') return 'Financial Services';
				if (t === 'consumer discretionary') return 'Consumer Discretionary';
				if (t === 'consumer staples') return 'Consumer Staples';
				if (t.includes('growth etf')) return 'Growth ETF';
				if (t.includes('value etf')) return 'Value ETF';
				if (t.includes('index')) return 'Index Fund';
				return s; // keep original casing for others
			};
				const isMissing = (_field: keyof MarketData, val: any) => {
					if (val === undefined || val === null) return true;
					if (typeof val === 'string') {
						const t = val.trim();
						if (!t) return true; // empty string
						if (['n/a','na','-','--','null'].includes(t.toLowerCase())) return true;
					}
					return false; // keep zeros / flat / neutral as real values
				};
				const sectorStats = useMemo(() => {
				const map: Record<string, { count:number; missing: Record<string, number>; sumPerf:number; values: Record<string, Set<string>>;}> = {};
				enrichedData.forEach(item => {
					const sector = normalizeSector(item.sector);
					if (!map[sector]) map[sector] = { count:0, missing: Object.fromEntries(requiredFields.map(f=>[f,0])) as Record<string, number>, sumPerf:0, values: Object.fromEntries(requiredFields.map(f=>[f,new Set<string>()])) as Record<string, Set<string>> };
					map[sector].count += 1;
					map[sector].sumPerf += parsePerf(item.performance);
					requiredFields.forEach(f => {
						const v: any = (item as any)[f];
						if (isMissing(f, v)) map[sector].missing[f] += 1; else if (v !== undefined && v !== null) map[sector].values[f].add(String(v).trim());
					});
				});
				const total = enrichedData.length || 1;
				const rows = Object.entries(map)
					.map(([sector, info]) => {
						const totalCells = info.count * requiredFields.length || 1;
						const missingTotal = requiredFields.reduce((acc,f)=> acc + info.missing[f],0);
						const completeness = +(100 - (missingTotal / totalCells * 100)).toFixed(1);
						const avgPerf = info.count ? +(info.sumPerf / info.count).toFixed(2) : 0;
						const missingPct = +(missingTotal / totalCells * 100).toFixed(1);
						// Detect uniform (no variance) fields (>=2 rows & all same non-missing value)
						const uniform: Record<string, boolean> = Object.fromEntries(requiredFields.map(f=> [f, info.count > 1 && info.values[f].size === 1]));
						return { sector, count: info.count, weight: +(100 * info.count / total).toFixed(1), completeness, missingPct, avgPerf, missing: info.missing, uniform };
					})
					.sort((a,b)=> b.count - a.count);
				const totalMissing: Record<string, number> = Object.fromEntries(requiredFields.map(f=> [f, rows.reduce((acc,r)=> acc + r.missing[f],0)]));
				const totalRow = {
					sector: 'TOTAL',
					count: rows.reduce((a,r)=> a + r.count, 0),
					weight: 100,
					completeness: +(rows.reduce((a,r)=> a + (r.completeness * r.count),0) / (rows.reduce((a,r)=> a + r.count,0) || 1)).toFixed(1),
					missingPct: +(rows.reduce((a,r)=> a + (r.missingPct * r.count),0) / (rows.reduce((a,r)=> a + r.count,0) || 1)).toFixed(1),
					avgPerf: +(rows.reduce((a,r)=> a + (r.avgPerf * r.count),0) / (rows.reduce((a,r)=> a + r.count,0) || 1)).toFixed(2),
					missing: totalMissing,
					uniform: Object.fromEntries(requiredFields.map(f=> [f,false])) as Record<string, boolean>
				};
				return { rows, totalRow };
			}, [enrichedData]);
		const [showDiagnostics, setShowDiagnostics] = useState(false);

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
		<RequirePlan min="pro">
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
															{k:'performance', l:'Perf %'},
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
															{k:'rs', l:'RS%'},
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
																	<span className={`text-[10px] ${getPerformanceColor(item.change||'+0')}`}>{item.change?`$${item.change}`:'—'}</span>
																</div>
															</td>
															<td className="px-2 py-1 font-semibold whitespace-nowrap">
																<span className={`${getPerformanceColor(item.performance)}`}>{item.performance}</span>
															</td>
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
															<td className="px-2 py-1 font-medium text-blue-300">{item.rs}</td>
															<td className="px-2 py-1 text-center"><AIScoreBadge item={item} /></td>
															<td className="px-2 py-1"><AISignalBadge item={item} /></td>
															<td className="px-2 py-1 text-gray-300">{item.category || '—'}</td>
														</tr>
													))}
													{!filteredData.length && (
														<tr><td colSpan={14} className="px-4 py-6 text-center text-gray-500">No results match current filters.</td></tr>
													)}
												</tbody>
											</table>
										</div>
									</div>
									<div className="text-[10px] text-gray-500 mt-2 flex flex-wrap gap-4">
										<span>RS%: Relative Strength percentile (100 = strongest perf in set)</span>
										<span>Data refreshed {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'} (UTC)</span>
										<span>VIX {vixData.price} ({vixData.volatilityLevel})</span>
									</div>
								{/* Charts Section */}
								<div className="mt-6 bg-slate-800 border border-slate-700 rounded p-4">
									<div className="flex items-center gap-2 mb-3 text-xs">
										<button onClick={()=>setShowCharts(s=>!s)} className="px-2 py-1 rounded border border-slate-600 bg-slate-700 hover:bg-slate-600 font-medium">{showCharts?'Hide Charts':'Show Charts'}</button>
										{['sectors','categories','ai','scatter'].map(m=> (
											<button key={m} onClick={()=>setChartMode(m as any)} className={`px-2 py-1 rounded border text-[11px] ${chartMode===m?'bg-blue-600 border-blue-500':'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>{m}</button>
										))}
										<span className="ml-auto text-[10px] text-gray-400">Experimental analytical charts</span>
									</div>
									{showCharts && (
										<div className="grid gap-6 md:grid-cols-2">
											{chartMode==='sectors' && (
												<div className="h-72">
													<h3 className="text-xs font-semibold mb-2 text-gray-300">Top Sector Avg Performance (%)</h3>
													<ResponsiveContainer width="100%" height="100%">
														<BarChart data={sectorPerfData}>
															<CartesianGrid strokeDasharray="3 3" stroke="#334155" />
															<XAxis dataKey="sector" hide={false} tick={{fontSize:10, fill:'#94a3b8'}} interval={0} angle={-35} textAnchor='end' height={70} />
															<YAxis tick={{fontSize:10, fill:'#94a3b8'}} width={35} />
															<RTooltip content={<ChartTooltip />} />
															<Bar dataKey="avg" radius={[2,2,0,0]}>
																{sectorPerfData.map((d,i)=>(<Cell key={i} fill={d.avg>=0?'#16a34a':'#dc2626'} />))}
															</Bar>
														</BarChart>
													</ResponsiveContainer>
												</div>
											)}
											{chartMode==='categories' && (
												<div className="h-72">
													<h3 className="text-xs font-semibold mb-2 text-gray-300">Category Distribution (Count)</h3>
													<ResponsiveContainer width="100%" height="100%">
														<PieChart>
															<Pie data={categoryDistribution} dataKey="value" nameKey="category" outerRadius={90} innerRadius={40} paddingAngle={2}>
																{categoryDistribution.map((d,i)=>(<Cell key={i} fill={categoryColor(d.category)} />))}
															</Pie>
															<RTooltip content={<ChartTooltip />} />
															<Legend wrapperStyle={{fontSize:'9px'}}/>
														</PieChart>
													</ResponsiveContainer>
												</div>
											)}
											{chartMode==='ai' && (
												<div className="h-72">
													<h3 className="text-xs font-semibold mb-2 text-gray-300">Top AI Composite Scores</h3>
													<ResponsiveContainer width="100%" height="100%">
														<BarChart data={topAISignals}>
															<CartesianGrid strokeDasharray="3 3" stroke="#334155" />
															<XAxis dataKey="ticker" tick={{fontSize:10, fill:'#94a3b8'}} interval={0} angle={-25} textAnchor='end' height={60} />
															<YAxis tick={{fontSize:10, fill:'#94a3b8'}} width={30} domain={[0,100]} />
															<RTooltip content={<ChartTooltip />} />
															<Bar dataKey="score" radius={[2,2,0,0]}>
																{topAISignals.map((d,i)=>(<Cell key={i} fill={aiLabelColor(d.label)} />))}
															</Bar>
														</BarChart>
													</ResponsiveContainer>
												</div>
											)}
											{chartMode==='scatter' && (
												<>
												<div className="h-72 md:col-span-2">
													<h3 className="text-xs font-semibold mb-2 text-gray-300">Momentum vs Relative Strength</h3>
													<ResponsiveContainer width="100%" height="100%">
														<ScatterChart>
															<CartesianGrid stroke="#334155" />
															<XAxis type="number" dataKey="momentum" name="Momentum" domain={[0,100]} tick={{fontSize:10, fill:'#94a3b8'}} label={{ value:'Momentum', position:'insideBottomRight', offset:-2, fill:'#94a3b8', fontSize:10 }} />
															<YAxis type="number" dataKey="rs" name="RS" domain={[0,100]} tick={{fontSize:10, fill:'#94a3b8'}} label={{ value:'RS', angle:-90, position:'insideLeft', fill:'#94a3b8', fontSize:10 }}/>
															<RTooltip content={<ChartTooltip />} cursor={{stroke:'#475569'}}/>
															<Scatter data={momentumVsRS} fill="#3b82f6" shape="circle">
																{momentumVsRS.map((d,i)=>(<Cell key={i} fill={categoryColor(d.category)} />))}
															</Scatter>
															<Legend wrapperStyle={{fontSize:'9px'}}/>
														</ScatterChart>
													</ResponsiveContainer>
												</div>
												<div className="h-72 md:col-span-2">
													<h3 className="text-xs font-semibold mb-2 text-gray-300">Flow Direction (Intraday Net Flow by Sector)</h3>
													<ResponsiveContainer width="100%" height="100%">
														<BarChart data={flowDirectionData}>
															<CartesianGrid strokeDasharray="3 3" stroke="#334155" />
															<XAxis dataKey="sector" tick={{fontSize:10, fill:'#94a3b8'}} interval={0} angle={-35} textAnchor='end' height={70} />
															<YAxis tick={{fontSize:10, fill:'#94a3b8'}} width={40} />
															<RTooltip content={<ChartTooltip />} />
															<Bar dataKey="netFlow" radius={[2,2,0,0]}>
																{flowDirectionData.map((d,i)=>(<Cell key={i} fill={d.netFlow>=0?'#16a34a':'#dc2626'} />))}
															</Bar>
														</BarChart>
													</ResponsiveContainer>
													<div className="mt-1 text-[10px] text-gray-400">Total Net Flow: <span className={totalNetFlow>=0?'text-green-400':'text-red-400'}>{totalNetFlow.toFixed(2)}</span></div>
												</div>
												</>
											)}
										</div>
									)}
									<div className="mt-3 text-[10px] text-gray-500">
										<span>Methodology: Sector avg = mean of current % changes. AI Top = composite (momentum/RS). Scatter axes scaled 0-100. No synthetic smoothing.</span>
									</div>
								</div>
								</div>
				<Footer />
			</div>
		</RequirePlan>
	);
}
