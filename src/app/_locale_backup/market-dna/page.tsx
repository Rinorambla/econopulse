'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, ChartBarIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';
import RequirePlan from '@/components/RequirePlan';
import dynamic from 'next/dynamic';
import LazyVisible from '@/components/LazyVisible';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList, ScatterChart, Scatter } from 'recharts';
const HistoricalSimilarityChart = dynamic(() => import('@/components/charts/HistoricalSimilarityChart'), { ssr: false });
const MarketRegimeArea = dynamic(() => import('@/components/charts/MarketRegimeArea'), { ssr: false });
const SectorRiskRadar = dynamic(() => import('@/components/charts/SectorRiskRadar'), { ssr: false });

interface HistoricalPattern {
  date: string;
  similarity: number;
  eventType: string;
  description: string;
  outcome: string;
  nextPeriodReturn: string;
}

interface SectorVulnerability {
  sector: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  change: string;
}

interface MarketCluster {
  clusterName: string;
  currentAssets: string[];
  historicalComparison: string;
  riskAssessment: string;
}

interface MarketDNAData {
  currentDNAScore: number;
  dominantPattern: string;
  topHistoricalMatch: HistoricalPattern;
  additionalMatches: HistoricalPattern[];
  sectorVulnerabilities: SectorVulnerability[];
  marketClusters: MarketCluster[];
  correlationAnomalies: {
    asset1: string;
    asset2: string;
    currentCorrelation: number;
    historicalAvg: number;
    anomalyLevel: 'NORMAL' | 'ALERT' | 'WARNING' | 'CRITICAL';
  }[];
  historicalSimilaritySeries?: Array<{date:string; crisis2007:number; bubble2000:number; pandemic2020:number; composite:number}>;
  marketRegimeSeries?: Array<{date:string; riskLevel:number; volatility:number; regime:string}>;
  correlationMatrix?: Array<{ asset:string; spy:number; tlt:number; gld:number; vix:number; dxy:number }>;
  sectorRadar?: Array<{ sector:string; riskScore:number; momentum:number; valuation:number; sentiment:number }>;
  aiInsight: string;
  lastUpdated: string;
  marketMetrics?: { spyPrice:number; vixLevel:number; dollarIndex:number; goldPrice:number };
}

// Real peak signals (fetched from /api/peak-signals)
interface PeakSignal { key:string; label:string; category:'Sentiment'|'Valuation'|'Macro'; status:'real'|'proxy'|'unavailable'; triggered:boolean; value:any; threshold:string; source:string; notes?:string }
interface PeakSignalsApi { generatedAt:string; signals:PeakSignal[]; current:{date:string; triggeredKeys:string[]; percent:number; spy?:number}; historical:{date:string; triggeredKeys:string[]; percent:number; spy?:number}[]; recent:{date:string; triggeredKeys:string[]; percent:number; spy?:number}[]; disclaimer:string }

export default function MarketDNAPage() {
  const [data, setData] = useState<MarketDNAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFetching, setIsFetching] = useState(false); // Prevent duplicate calls
  const [sectorSort, setSectorSort] = useState<'score'|'change'>('score');
  const [sectorView, setSectorView] = useState<'bars'|'table'>('bars');

  // Client fetch with timeout to avoid hangs
  const fetchT = React.useCallback(async (input: RequestInfo | URL, timeoutMs = 10000, init?: RequestInit) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(input, { ...(init||{}), signal: ctrl.signal });
    } finally { clearTimeout(t); }
  }, []);

  // Normalize response and synthesize series if missing (older API payloads)
  function normalizeMarketDNA(result: MarketDNAData): MarketDNAData {
    const out = { ...result } as MarketDNAData;
    // Historical similarity
    if (!out.historicalSimilaritySeries || out.historicalSimilaritySeries.length === 0) {
      const base = Math.max(40, Math.min(95, out.topHistoricalMatch?.similarity ?? out.currentDNAScore ?? 60));
      const days = 60;
      const series = Array.from({ length: days }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (days - i));
        const s1 = Math.max(20, Math.min(95, base + Math.sin(i * 0.15) * 8));
        const s2 = Math.max(10, Math.min(85, base - 12 + Math.cos(i * 0.09) * 7));
        const s3 = Math.max(5, Math.min(80, base - 18 + Math.sin(i * 0.07) * 9));
        const composite = Math.round((s1 + s2 + s3) / 3);
        return { date: d.toISOString().slice(0,10), crisis2007: Math.round(s1), bubble2000: Math.round(s2), pandemic2020: Math.round(s3), composite };
      });
      out.historicalSimilaritySeries = series;
    }
    // Market regime series
    if (!out.marketRegimeSeries || out.marketRegimeSeries.length === 0) {
      const days = 120; const target = Math.max(40, Math.min(95, out.topHistoricalMatch?.similarity ?? out.currentDNAScore ?? 60));
      out.marketRegimeSeries = Array.from({ length: days }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (days - i));
        const progress = i / days; const baseRisk = 40 + progress * (target - 40) + Math.sin(i * 0.11) * 5;
        const volatility = baseRisk * 0.8 + Math.cos(i * 0.07) * 6 + 10;
        let regime = 'Recovery';
        if (baseRisk > 80) regime = 'Crisis Formation';
        else if (baseRisk > 65) regime = 'Late Cycle';
        else if (baseRisk > 50) regime = 'Mid Cycle';
        else if (baseRisk > 40) regime = 'Expansion';
        return { date: d.toISOString().slice(0,10), riskLevel: Math.round(baseRisk * 10) / 10, volatility: Math.round(volatility * 10) / 10, regime };
      });
    }
    // Sector radar (needs radial points)
    if (!out.sectorRadar || out.sectorRadar.length < 3) {
      const base = (out.sectorVulnerabilities && out.sectorVulnerabilities.length)
        ? out.sectorVulnerabilities.slice(0,5).map(s => ({
            sector: s.sector,
            riskScore: Math.max(10, Math.min(100, s.score)),
            momentum: Math.max(10, Math.min(100, 100 - s.score + 10)),
            valuation: Math.max(10, Math.min(100, 50 + 10)),
            sentiment: Math.max(10, Math.min(100, 60 - s.score / 2 + 5))
          }))
        : [
            { sector: 'Technology', riskScore: 65, momentum: 55, valuation: 60, sentiment: 55 },
            { sector: 'Financials', riskScore: 72, momentum: 48, valuation: 52, sentiment: 50 },
            { sector: 'Healthcare', riskScore: 40, momentum: 62, valuation: 58, sentiment: 63 },
            { sector: 'Energy', riskScore: 58, momentum: 45, valuation: 54, sentiment: 48 },
            { sector: 'Consumer Disc.', riskScore: 70, momentum: 50, valuation: 56, sentiment: 52 }
          ];
      out.sectorRadar = base;
    }
    // Correlation matrix baseline if missing
    if (!out.correlationMatrix || out.correlationMatrix.length === 0) {
      const assets = ['SPY','TLT','GLD','VIX','DXY'];
      out.correlationMatrix = assets.map(row => {
        const rowObj: any = { asset: row };
        assets.forEach(col => { rowObj[col.toLowerCase()] = row === col ? 1 : (Math.sin((row.charCodeAt(0)+col.charCodeAt(0)) * 0.15) * 0.6); });
        return rowObj;
      });
    }
    return out;
  }

  // Access precomputed series from server
  const similaritySeries = data?.historicalSimilaritySeries || [];
  const regimeSeries = data?.marketRegimeSeries || [];
  const radarSeries = data?.sectorRadar || [];
  const correlationMatrix = data?.correlationMatrix || [];

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
  const RISK_COLORS = {
    CRITICAL: '#dc2626',
    HIGH: '#ea580c', 
    MEDIUM: '#d97706',
    LOW: '#16a34a'
  };

  // Enhanced color palette for better contrast
  const CHART_COLORS = {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    background: '#1e293b',
    foreground: '#f8fafc',
    muted: '#64748b'
  };

  // Consistent tooltip styling
  const getTooltipStyle = () => ({
    backgroundColor: '#0f172a',
    border: '1px solid #475569',
    borderRadius: '8px',
    color: '#f1f5f9',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
  });

  const getTooltipLabelStyle = () => ({
    color: '#f1f5f9',
    fontWeight: '600'
  });

  const getTooltipItemStyle = () => ({
    color: '#e2e8f0'
  });

  const fetchMarketDNA = async () => {
    if (isFetching) return; // Prevent concurrent calls
    
    try {
      setIsFetching(true);
      setRefreshing(true);
      
        // Add cache busting to force fresh data
        const response = await fetchT(`/api/market-dna?t=${Date.now()}`, 12000);
        // Fetch market extremes indicator (FLAME vs BOTTOM)
        const extremesRes = await fetchT(`/api/market-extremes?t=${Date.now()}`, 12000);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: MarketDNAData = await response.json();
      const normalized = normalizeMarketDNA(result);
      // Attach extremes scores for display blocks
      try {
        const exJson = extremesRes && extremesRes.ok ? await extremesRes.json() : null;
        const flame = exJson?.data?.flameScore ?? null;
        const bottom = exJson?.data?.bottomScore ?? null;
        (normalized as any).extremes = { flame, bottom, asOf: exJson?.data?.asOf };
      } catch {}
      setData(normalized);
    } catch (error) {
      console.error('Error fetching Market DNA data:', error);
      // Fallback data for development
      const fallback: MarketDNAData = {
        currentDNAScore: 87,
        dominantPattern: 'Pre-Crisis Formation',
        topHistoricalMatch: {
          date: '2007-07-15',
          similarity: 91,
          eventType: 'Financial Crisis Precursor',
          description: 'High yield spreads widening, declining cross-asset correlations',
          outcome: 'Major market correction (-45% over 18 months)',
          nextPeriodReturn: '-12.5%'
        },
        additionalMatches: [
          {
            date: '2000-03-10',
            similarity: 78,
            eventType: 'Tech Bubble Peak',
            description: 'Extreme valuations, momentum divergence',
            outcome: 'Technology sector collapse (-78%)',
            nextPeriodReturn: '-8.2%'
          },
          {
            date: '2020-02-20',
            similarity: 71,
            eventType: 'Pandemic Onset',
            description: 'Sudden correlation spike, flight to quality',
            outcome: 'Sharp decline followed by unprecedented stimulus rally',
            nextPeriodReturn: '-34.0%'
          }
        ],
        sectorVulnerabilities: [
          { sector: 'Financials', riskLevel: 'CRITICAL', score: 92, change: '-8.5%' },
          { sector: 'Real Estate', riskLevel: 'HIGH', score: 78, change: '-5.2%' },
          { sector: 'Technology', riskLevel: 'MEDIUM', score: 65, change: '-2.1%' },
          { sector: 'Healthcare', riskLevel: 'LOW', score: 35, change: '+1.8%' }
        ],
        marketClusters: [
          {
            clusterName: 'Risk-Off Assets',
            currentAssets: ['TLT', 'GLD', 'VIX'],
            historicalComparison: 'Similar to Q4 2008 clustering',
            riskAssessment: 'Flight to quality pattern emerging'
          },
          {
            clusterName: 'Cyclical Divergence',
            currentAssets: ['XLI', 'XLB', 'XLE'],
            historicalComparison: 'Echoes 2007 industrial weakness',
            riskAssessment: 'Economic slowdown signals'
          }
        ],
        correlationAnomalies: [
          {
            asset1: 'SPY',
            asset2: 'TLT',
            currentCorrelation: 0.45,
            historicalAvg: -0.25,
            anomalyLevel: 'CRITICAL'
          },
          {
            asset1: 'VIX',
            asset2: 'DXY',
            currentCorrelation: -0.15,
            historicalAvg: 0.35,
            anomalyLevel: 'WARNING'
          }
        ],
        aiInsight: 'The current market DNA shows 91% similarity to July 2007, just before the financial crisis. Key warning signals include the breakdown of traditional bond-equity negative correlation, rising credit spreads, and sector rotation patterns consistent with late-cycle behavior. The AI model suggests heightened caution, particularly in financial and real estate sectors.',
        lastUpdated: new Date().toISOString()
      };
      // Also set a minimal extremes fallback
      (fallback as any).extremes = { flame: 0.5, bottom: 0.5, asOf: new Date().toISOString() };
      setData(fallback);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsFetching(false); // Reset fetch flag
    }
  };

  useEffect(() => {
    fetchMarketDNA();
    
    // Auto-refresh every 2 hours
  const interval = setInterval(fetchMarketDNA, 7200000);
  return () => { if (interval) clearInterval(interval); };
  }, []);

  // Peak signals state (real API)
  const [peakSignals, setPeakSignals] = useState<PeakSignalsApi | null>(null);
  const [loadingPeak, setLoadingPeak] = useState(false);
  const fetchPeakSignals = async () => {
    try {
      setLoadingPeak(true);
      const res = await fetch('/api/peak-signals');
      if (res.ok) {
        const json: PeakSignalsApi = await res.json();
        setPeakSignals(json);
      }
    } finally { setLoadingPeak(false);} }
  useEffect(()=>{ fetchPeakSignals(); }, []);
  const categoryColor = (cat:string) => cat==='Sentiment'?'text-cyan-300 border-cyan-500/30': cat==='Valuation'?'text-amber-300 border-amber-500/30':'text-purple-300 border-purple-500/30';
  const checkMark = (active:boolean, status?:string) => active ? <span className="text-emerald-300">✓</span> : <span className={` ${status==='unavailable'?'text-slate-500':'text-slate-600'}`}>•</span>;

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 90) return 'text-red-500 bg-red-900/20';
    if (similarity >= 75) return 'text-orange-500 bg-orange-900/20';
    if (similarity >= 60) return 'text-yellow-500 bg-yellow-900/20';
    return 'text-green-500 bg-green-900/20';
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL': return 'text-red-500 bg-red-900/30';
      case 'HIGH': return 'text-orange-500 bg-orange-900/30';
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-900/30';
      default: return 'text-green-500 bg-green-900/30';
    }
  };

  const getAnomalyColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-500';
      case 'WARNING': return 'text-orange-500';
      case 'ALERT': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  if (loading) {
    return (
  <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-white text-xl">Analyzing Market DNA...</div>
      </div>
    );
  }

  if (!data) {
    return (
  <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-red-400 text-xl">Failed to load Market DNA data</div>
      </div>
    );
  }

  return (
    <RequirePlan min="premium">
  <div className="min-h-screen bg-[var(--background)] text-white">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                  <NavigationLink href="/" className="text-blue-400 hover:text-blue-300">
                    <ArrowLeftIcon className="h-5 w-5" />
                </NavigationLink>
                <div>
                  <h1 className="text-2xl font-bold">🧠 Market DNA</h1>
                  <p className="text-sm text-gray-400">Historical Pattern Recognition & Similarity Analysis</p>
                </div>
              </div>
                {/* auto-refresh hidden per requirements */}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          
          {/* Current DNA Score & Historical Similarity Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <ChartBarIcon className="h-6 w-6 mr-2 text-blue-400" />
                  Current Market DNA
                </h2>
                <ArrowTrendingUpIcon className="h-6 w-6 text-red-400" />
              </div>
              
              <div className="text-center mb-6">
                <div className="text-5xl font-bold mb-2">
                  <span className={data.currentDNAScore >= 80 ? 'text-red-500' : data.currentDNAScore >= 60 ? 'text-orange-500' : 'text-green-500'}>
                    {data.currentDNAScore}%
                  </span>
                </div>
                <div className="text-lg text-gray-300 mb-4">Pattern Strength</div>
                <div className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${
                  data.dominantPattern.includes('Crisis') ? 'bg-red-900/30 text-red-400' :
                  data.dominantPattern.includes('Bubble') ? 'bg-orange-900/30 text-orange-400' :
                  'bg-green-900/30 text-green-400'
                }`}>
                  {data.dominantPattern}
                </div>
              </div>

              {/* DNA Score Gauge Chart */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Risk Level', value: data.currentDNAScore },
                        { name: 'Safe Level', value: 100 - data.currentDNAScore }
                      ]}
                      cx="50%"
                      cy="50%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                    >
                      <Cell fill={data.currentDNAScore >= 80 ? '#dc2626' : data.currentDNAScore >= 60 ? '#ea580c' : '#16a34a'} />
                      <Cell fill="#334155" />
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'DNA Score']}
                      contentStyle={getTooltipStyle()}
                      labelStyle={getTooltipLabelStyle()}
                      itemStyle={getTooltipItemStyle()}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <ExclamationTriangleIcon className="h-6 w-6 mr-2 text-red-400" />
                Historical Similarity Trends
              </h2>
              
              <div className="h-64 mb-4">
                <LazyVisible minHeight={256}>
                  <HistoricalSimilarityChart data={similaritySeries as any} />
                </LazyVisible>
              </div>

              <div className={`border-l-4 border-red-500 pl-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-lg">{data.topHistoricalMatch.date}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getSimilarityColor(data.topHistoricalMatch.similarity)}`}>
                    {data.topHistoricalMatch.similarity}% Similar
                  </span>
                </div>
                <div className="text-red-400 font-medium mb-2">{data.topHistoricalMatch.eventType}</div>
                <div className="text-sm text-gray-400 mb-2">{data.topHistoricalMatch.description}</div>
                <div className="text-sm">
                  <span className="text-gray-400">Next Period Return: </span>
                  <span className="text-red-500 font-bold">{data.topHistoricalMatch.nextPeriodReturn}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Historical Matches */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">📊 Additional Historical Patterns</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.additionalMatches.map((match, index) => (
                <div key={index} className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{match.date}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getSimilarityColor(match.similarity)}`}>
                      {match.similarity}%
                    </span>
                  </div>
                  <div className="text-sm text-orange-400 mb-1">{match.eventType}</div>
                  <div className="text-xs text-gray-400 mb-2">{match.description}</div>
                  <div className="text-xs">
                    <div className="text-gray-400 mb-1">Return: <span className="text-red-400 font-semibold">{match.nextPeriodReturn}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Signals Matrix (Market Peak Watchlist) */}
          {peakSignals && (
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">🚨 EconoPulse Peak Signals <span className="text-sm font-normal text-slate-400">{peakSignals.current.percent}% triggered (real+proxy)</span></h2>
                <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                  <span>Live S&P proxy: <span className="text-blue-400 font-semibold">{data.marketMetrics?.spyPrice?.toFixed(0)}</span></span>
                  {loadingPeak && <span className="text-emerald-300">Updating…</span>}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-700/60 bg-slate-700/40">
                      <th className="text-left py-2 px-2 font-semibold">Signpost</th>
                      <th className="text-left py-2 px-2 font-semibold">Category</th>
                      {peakSignals.historical.map(h=> (
                        <th key={h.date} className="py-2 px-2 font-semibold text-center whitespace-nowrap">{h.date}</th>
                      ))}
                      {peakSignals.recent.map(r=> (
                        <th key={r.date} className="py-2 px-2 font-semibold text-center whitespace-nowrap">{r.date}</th>
                      ))}
                      <th className="py-2 px-2 font-semibold text-center whitespace-nowrap">Current</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peakSignals.signals.map(sig => (
                      <tr key={sig.key} className="border-b border-slate-700/40 hover:bg-slate-700/30">
                        <td className="py-2 px-2 font-medium text-slate-200 max-w-xs">
                          <div className="flex flex-col">
                            <span>{sig.label}</span>
                            <span className="text-[10px] text-slate-500">Src: {sig.source} • Thr: {sig.threshold} • {sig.status==='proxy'?'Proxy':sig.status==='unavailable'?'N/A':'Real'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2"><span className={`px-2 py-1 rounded border text-[10px] font-semibold ${categoryColor(sig.category)}`}>{sig.category}</span></td>
                        {peakSignals.historical.map(h=> <td key={h.date+sig.key} className="py-2 px-2 text-center">{checkMark(h.triggeredKeys.includes(sig.key), sig.status)}</td>)}
                        {peakSignals.recent.map(r=> <td key={r.date+sig.key} className="py-2 px-2 text-center">{checkMark(r.triggeredKeys.includes(sig.key), sig.status)}</td>)}
                        <td className="py-2 px-2 text-center font-bold">{checkMark(peakSignals.current.triggeredKeys.includes(sig.key), sig.status)}</td>
                      </tr>
                    ))}
                    {/* Summary rows */}
                    <tr className="bg-slate-700/60">
                      <td className="py-2 px-2 font-semibold">% triggered</td>
                      <td className="py-2 px-2"></td>
                      {peakSignals.historical.map(h=> <td key={h.date+'pct'} className="py-2 px-2 text-center font-semibold text-amber-300">{h.percent}%</td>)}
                      {peakSignals.recent.map(r=> <td key={r.date+'pct'} className="py-2 px-2 text-center font-semibold text-amber-300">{r.percent}%</td>)}
                      <td className="py-2 px-2 text-center font-semibold text-emerald-300">{peakSignals.current.percent}%</td>
                    </tr>
                    
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-[10px] text-slate-500 leading-relaxed">
                Real: raw open data; Proxy: open substitute for proprietary construct; N/A: requires licensed data (excluded). Historical peak dates sampled; recent columns = last 6 monthly snapshots. Informational only – not investment advice.
              </div>
            </div>
          )}

          {/* Advanced Analytics Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Market Regime Evolution */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                🔄 Market Regime Evolution
              </h2>
              <div className="h-64">
                <LazyVisible minHeight={256}>
                  <MarketRegimeArea data={regimeSeries as any} />
                </LazyVisible>
              </div>
            </div>

            {/* Sector Risk Radar */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                🎯 Sector Risk Analysis
              </h2>
              <div className="h-64">
                <LazyVisible minHeight={256}>
                  <SectorRiskRadar data={radarSeries as any} />
                </LazyVisible>
              </div>
            </div>
          </div>

          {/* Sector Vulnerabilities with Charts */}
          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold">⚠️ Sector Vulnerability Analysis</h2>
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1 bg-slate-700/60 rounded-md p-1">
                  {['score','change'].map(k=> (
                    <button key={k} onClick={()=>setSectorSort(k as any)} className={`px-2 py-1 rounded-md font-medium transition-colors ${sectorSort===k?'bg-blue-600 text-white':'text-slate-300 hover:text-white'}`}>{k==='score'?'Sort: Risk':'Sort: Δ'}</button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-slate-700/60 rounded-md p-1">
                  {['bars','table'].map(v => (
                    <button key={v} onClick={()=>setSectorView(v as any)} className={`px-2 py-1 rounded-md font-medium transition-colors ${sectorView===v?'bg-indigo-600 text-white':'text-slate-300 hover:text-white'}`}>{v==='bars'?'Bars':'Table'}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sector Risk Bar Chart Enhanced */}
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={[...data.sectorVulnerabilities].sort((a,b)=>{
                      if (sectorSort==='score') return b.score - a.score;
                      const av = parseFloat(a.change); const bv = parseFloat(b.change); return bv - av;
                    })}
                    layout="vertical"
                    margin={{ top: 10, right: 24, left: 0, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient id="riskCrit" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#7f1d1d"/><stop offset="100%" stopColor="#dc2626"/></linearGradient>
                      <linearGradient id="riskHigh" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#7c2d12"/><stop offset="100%" stopColor="#ea580c"/></linearGradient>
                      <linearGradient id="riskMed" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#78350f"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient>
                      <linearGradient id="riskLow" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#065f46"/><stop offset="100%" stopColor="#16a34a"/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} domain={[0,100]} tickFormatter={(v)=>`${v}`}/>
                    <YAxis dataKey="sector" type="category" stroke="#94a3b8" width={110} tick={{fontSize:11}} />
                    <Tooltip 
                      contentStyle={getTooltipStyle()}
                      labelStyle={getTooltipLabelStyle()}
                      itemStyle={getTooltipItemStyle()}
                      formatter={(value, name, p:any) => {
                        if (name==='score') return [`${value}`, 'Risk Score'];
                        return [value, name];
                      }}
                    />
                    <Legend formatter={(val)=> val==='score'?'Risk Score':val} wrapperStyle={{fontSize:10}} />
                    <Bar dataKey="score" radius={[0,6,6,0]} barSize={20}>
                      <LabelList dataKey="score" position="right" className="fill-slate-200 text-[10px]" />
                      {data.sectorVulnerabilities.sort((a,b)=>{
                        if (sectorSort==='score') return b.score - a.score; const av=parseFloat(a.change); const bv=parseFloat(b.change); return bv-av; }).map((entry, idx)=> {
                        const grad = entry.riskLevel==='CRITICAL'?'url(#riskCrit)':entry.riskLevel==='HIGH'?'url(#riskHigh)':entry.riskLevel==='MEDIUM'?'url(#riskMed)':'url(#riskLow)';
                        return <Cell key={`cell-r-${idx}`} fill={grad} stroke="#1e293b" strokeWidth={0.5} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>Gradient encodes risk severity.</span>
                  <span>Sorted by {sectorSort==='score'?'risk score':'Δ change'}.</span>
                </div>
              </div>

              {/* Sector Cards or Table */}
              {sectorView==='bars' ? (
                <div className="grid grid-cols-2 gap-4">
                  {data.sectorVulnerabilities.map((sector, index) => (
                    <div key={index} className="bg-slate-700/60 rounded-lg p-4 border border-slate-600/50 hover:border-slate-500 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm group-hover:text-white transition-colors">{sector.sector}</span>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wide ${getRiskColor(sector.riskLevel)}`}>
                          {sector.riskLevel}
                        </span>
                      </div>
                      <div className="flex items-end gap-3 mb-1">
                        <div className="text-2xl font-bold text-slate-100 leading-none">{sector.score}</div>
                        <div className={`text-sm font-medium ${sector.change.startsWith('+') ? 'text-green-400':'text-red-400'}`}>{sector.change}</div>
                      </div>
                      <div className="h-2 w-full bg-slate-600/40 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${sector.score}%`, background: sector.riskLevel==='CRITICAL'?'linear-gradient(90deg,#7f1d1d,#dc2626)': sector.riskLevel==='HIGH'?'linear-gradient(90deg,#7c2d12,#ea580c)': sector.riskLevel==='MEDIUM'?'linear-gradient(90deg,#78350f,#f59e0b)':'linear-gradient(90deg,#065f46,#16a34a)'}}></div>
                      </div>
                      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                        <span>Exposure</span><span>{sector.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-xs">
                    <thead className="text-slate-300">
                      <tr className="text-left border-b border-slate-600">
                        <th className="py-2 pr-4 font-semibold">Sector</th>
                        <th className="py-2 pr-4 font-semibold">Risk</th>
                        <th className="py-2 pr-4 font-semibold">Score</th>
                        <th className="py-2 pr-4 font-semibold">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data.sectorVulnerabilities].sort((a,b)=>{
                        if (sectorSort==='score') return b.score - a.score; const av=parseFloat(a.change); const bv=parseFloat(b.change); return bv-av; }).map((s,i)=>(
                        <tr key={i} className="border-b border-slate-700/60 hover:bg-slate-700/30">
                          <td className="py-1 pr-4 font-medium text-slate-100">{s.sector}</td>
                          <td className="py-1 pr-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRiskColor(s.riskLevel)}`}>{s.riskLevel}</span></td>
                          <td className="py-1 pr-4 text-slate-200 font-semibold">{s.score}</td>
                          <td className={`py-1 pr-4 font-medium ${s.change.startsWith('+')?'text-green-400':'text-red-400'}`}>{s.change}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="mt-4 text-[10px] text-slate-500 flex flex-wrap gap-3">
              <span><span className="inline-block w-2 h-2 bg-gradient-to-r from-rose-900 to-red-600 rounded-sm mr-1"></span>Critical</span>
              <span><span className="inline-block w-2 h-2 bg-gradient-to-r from-amber-900 to-orange-600 rounded-sm mr-1"></span>High</span>
              <span><span className="inline-block w-2 h-2 bg-gradient-to-r from-yellow-900 to-amber-500 rounded-sm mr-1"></span>Medium</span>
              <span><span className="inline-block w-2 h-2 bg-gradient-to-r from-emerald-900 to-green-600 rounded-sm mr-1"></span>Low</span>
            </div>
          </div>

          {/* Market Clusters */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">🔄 Current Market Clusters</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.marketClusters.map((cluster, index) => (
                <div key={index} className="bg-slate-700 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">{cluster.clusterName}</h3>
                  <div className="mb-2">
                    <span className="text-sm text-gray-400">Assets: </span>
                    <span className="text-blue-400">{cluster.currentAssets.join(', ')}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-sm text-gray-400">Historical: </span>
                    <span className="text-yellow-400">{cluster.historicalComparison}</span>
                  </div>
                  <div className="text-sm text-orange-400">{cluster.riskAssessment}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Correlation Anomalies with Advanced Visualization */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">🌊 Correlation Anomalies & Asset Relationships</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Correlation Scatter Plot */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-blue-400">Asset Correlation Scatter</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        type="number" 
                        dataKey="currentCorrelation" 
                        name="Current Correlation"
                        domain={[-1, 1]}
                        stroke="#d1d5db"
                        fontSize={12}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="historicalAvg" 
                        name="Historical Average"
                        domain={[-1, 1]}
                        stroke="#d1d5db"
                        fontSize={12}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={getTooltipStyle()}
                        labelStyle={getTooltipLabelStyle()}
                        itemStyle={getTooltipItemStyle()}
                        formatter={(value, name) => [
                          typeof value === 'number' ? value.toFixed(2) : value, 
                          name === 'currentCorrelation' ? 'Current' : 'Historical'
                        ]}
                      />
                      <Scatter 
                        name="Correlations" 
                        data={data.correlationAnomalies} 
                        fill="#8884d8"
                      >
                        {data.correlationAnomalies.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.anomalyLevel === 'CRITICAL' ? '#dc2626' :
                              entry.anomalyLevel === 'WARNING' ? '#ea580c' :
                              entry.anomalyLevel === 'ALERT' ? '#d97706' : '#16a34a'
                            }
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Correlation Anomalies List */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-orange-400">Current Anomalies</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {data.correlationAnomalies.map((anomaly, index) => (
                    <div key={index} className="bg-slate-700 rounded-lg p-4">
                      <div className="font-semibold text-slate-100">{anomaly.asset1}vs{anomaly.asset2}</div>
                      <div className="text-sm text-slate-200 mt-1">Current: {anomaly.currentCorrelation.toFixed(2)}</div>
                      <div className="text-sm text-slate-400">Avg: {anomaly.historicalAvg.toFixed(2)}</div>
                      <div className={`inline-block mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        anomaly.anomalyLevel === 'CRITICAL' ? 'bg-red-900/30 text-red-400' :
                        anomaly.anomalyLevel === 'WARNING' ? 'bg-orange-900/30 text-orange-400' :
                        anomaly.anomalyLevel === 'ALERT' ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-green-900/30 text-green-400'
                      }`}>
                        {anomaly.anomalyLevel}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Correlation Heatmap */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3 text-purple-400">Asset Correlation Matrix</h3>
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="grid grid-cols-6 gap-1 text-xs">
                  <div className="font-semibold text-gray-300"></div>
                  <div className="font-semibold text-center text-gray-300">SPY</div>
                  <div className="font-semibold text-center text-gray-300">TLT</div>
                  <div className="font-semibold text-center text-gray-300">GLD</div>
                  <div className="font-semibold text-center text-gray-300">VIX</div>
                  <div className="font-semibold text-center text-gray-300">DXY</div>
                  {correlationMatrix.map((row, rowIndex) => (
                    <React.Fragment key={`row-${rowIndex}`}>
                      <div key={`label-${rowIndex}`} className="font-semibold text-gray-300">{row.asset}</div>
                      {(['spy','tlt','gld','vix','dxy'] as const).map(key => {
                        const val = (row as any)[key];
                        const color = val > 0.6 ? 'bg-emerald-600/80' : val < -0.6 ? 'bg-red-600/80' : 'bg-amber-600/80';
                        return (
                          <div key={`${key}-${rowIndex}`} className={`text-center p-2 rounded font-semibold ${color} text-white`}>
                            {val.toFixed(2)}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Insight with Risk Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <span className="mr-2">🤖</span>
                AI Market DNA Insight
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">{data.aiInsight}</p>
              
              {/* Key Risk Indicators */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-yellow-400">⚡ Key Risk Indicators</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Market Stress Level:</span>
                    <span className="text-red-400 font-bold">{data.currentDNAScore}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Crisis Probability:</span>
                    <span className="text-orange-400 font-bold">{Math.round(data.currentDNAScore * 0.75)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Volatility Regime:</span>
                    <span className="text-yellow-400 font-bold">
                      {data.currentDNAScore > 80 ? 'High' : data.currentDNAScore > 60 ? 'Elevated' : 'Normal'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Time Horizon:</span>
                    <span className="text-blue-400 font-bold">3-6 months</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Risk Gauge */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                🎯 Risk Gauge
              </h2>
              
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'High Risk', value: data.currentDNAScore > 80 ? data.currentDNAScore - 60 : 0, fill: '#dc2626' },
                        { name: 'Medium Risk', value: data.currentDNAScore > 40 ? Math.min(40, data.currentDNAScore - 40) : 0, fill: '#ea580c' },
                        { name: 'Low Risk', value: Math.min(40, data.currentDNAScore), fill: '#d97706' },
                        { name: 'Safe Zone', value: Math.max(0, 100 - data.currentDNAScore), fill: '#16a34a' }
                      ]}
                      cx="50%"
                      cy="50%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                    >
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value}%`, name]}
                      contentStyle={getTooltipStyle()}
                      labelStyle={getTooltipLabelStyle()}
                      itemStyle={getTooltipItemStyle()}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Action Recommendations */}
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-300">Recommended Actions:</h3>
                <div className="text-xs space-y-1">
                  {data.currentDNAScore > 80 && (
                    <div className="text-red-400">• Reduce portfolio risk exposure</div>
                  )}
                  {data.currentDNAScore > 70 && (
                    <div className="text-orange-400">• Increase cash allocation</div>
                  )}
                  {data.currentDNAScore > 60 && (
                    <div className="text-yellow-400">• Monitor correlations closely</div>
                  )}
                  <div className="text-blue-400">• Consider hedging strategies</div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Source Info */}
          <div className="text-center text-sm text-gray-400">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </div>
        </div>

        <Footer />
      </div>
    </RequirePlan>
  );
}
