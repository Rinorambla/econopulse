'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, ChartBarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';
import RequirePlan from '@/components/RequirePlan';
import MarketSentimentBlock from '@/components/MarketSentimentBlock';
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
  riskRatios?: Record<string, number | null>;
  syntheticSeries?: { historicalSimilaritySeries?: boolean; marketRegimeSeries?: boolean; correlationMatrix?: boolean; sectorRadar?: boolean };
  _isFallback?: boolean;
  riskSummary?: {
    regime: 'Risk-On' | 'Neutral' | 'Risk-Off';
    score: number;
    votes: { on: number; off: number };
    signals: Array<{ key: string; label: string; value: number | null; dir: 'risk-on' | 'risk-off' | 'neutral'; note?: string }>;
  };
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
    // Historical similarity — 365 days
    if (!out.historicalSimilaritySeries || out.historicalSimilaritySeries.length === 0) {
      const base = Math.max(40, Math.min(95, out.topHistoricalMatch?.similarity ?? out.currentDNAScore ?? 60));
      const days = 365;
      const series = Array.from({ length: days }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (days - i));
        const trend = (i / days) * 15;
        const slow = Math.sin(i * 0.025) * 12;
        const med = Math.sin(i * 0.08) * 6;
        const fast = Math.sin(i * 0.15) * 3;
        const s1 = Math.max(15, Math.min(98, base + trend + slow + fast));
        const s2 = Math.max(8, Math.min(90, base - 14 + trend + med + Math.cos(i * 0.06) * 5));
        const s3 = Math.max(5, Math.min(85, base - 22 + trend + Math.sin(i * 0.045) * 8 + fast));
        const composite = Math.round((s1 + s2 + s3) / 3);
        return { date: d.toISOString().slice(0,10), crisis2007: Math.round(s1), bubble2000: Math.round(s2), pandemic2020: Math.round(s3), composite };
      });
      out.historicalSimilaritySeries = series;
    }
    // Market regime series — 365 days
    if (!out.marketRegimeSeries || out.marketRegimeSeries.length === 0) {
      const days = 365; const target = Math.max(40, Math.min(95, out.topHistoricalMatch?.similarity ?? out.currentDNAScore ?? 60));
      out.marketRegimeSeries = Array.from({ length: days }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (days - i));
        const progress = i / days;
        const cycleSlow = Math.sin(i * 0.02) * 8;
        const cycleMed = Math.sin(i * 0.07) * 4;
        const baseRisk = 35 + progress * (target - 35) + cycleSlow + cycleMed;
        const volatility = baseRisk * 0.75 + Math.cos(i * 0.05) * 8 + 12;
        let regime = 'Recovery';
        if (baseRisk > 80) regime = 'Crisis Formation';
        else if (baseRisk > 65) regime = 'Late Cycle';
        else if (baseRisk > 50) regime = 'Mid Cycle';
        else if (baseRisk > 40) regime = 'Expansion';
        return { date: d.toISOString().slice(0,10), riskLevel: Math.round(Math.max(10, Math.min(100, baseRisk)) * 10) / 10, volatility: Math.round(Math.max(5, Math.min(100, volatility)) * 10) / 10, regime };
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
        const response = await fetchT(`/api/market-dna?t=${Date.now()}`, 25000);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: MarketDNAData = await response.json();
      const normalized = normalizeMarketDNA(result);
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
        aiInsight: 'Live Market DNA analysis is temporarily unavailable. Showing illustrative reference data. Refresh to retry.',
        lastUpdated: new Date().toISOString()
      };
      setData(normalizeMarketDNA({ ...fallback, _isFallback: true }));
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
      <div className="min-h-screen bg-[#060a13] flex items-center justify-center overflow-hidden">
        <div className="relative text-center">
          {/* Animated DNA helix backdrop */}
          <div className="absolute -inset-32 opacity-20">
            <svg viewBox="0 0 200 200" className="w-64 h-64 mx-auto animate-spin" style={{ animationDuration: '8s' }}>
              <defs>
                <linearGradient id="dnaGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="80" fill="none" stroke="url(#dnaGrad)" strokeWidth="0.5" strokeDasharray="4 6" />
              <circle cx="100" cy="100" r="60" fill="none" stroke="url(#dnaGrad)" strokeWidth="0.3" strokeDasharray="2 8" />
              <circle cx="100" cy="100" r="40" fill="none" stroke="url(#dnaGrad)" strokeWidth="0.5" />
            </svg>
          </div>
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 animate-pulse" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-blue-400 border-r-purple-400 animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-2xl">🧬</span>
          </div>
          <p className="text-white/90 text-xl font-semibold tracking-tight">Decoding Market DNA</p>
          <p className="text-gray-500 text-sm mt-2">Analyzing patterns, correlations & regime signals...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#060a13] flex items-center justify-center">
        <div className="bg-red-500/5 backdrop-blur-md rounded-2xl p-8 border border-red-500/10 max-w-md text-center">
          <span className="text-4xl mb-4 block">⚠️</span>
          <h2 className="text-xl font-bold text-red-400 mb-2">Analysis Unavailable</h2>
          <p className="text-gray-400 text-sm">Failed to decode current market DNA patterns.</p>
          <button onClick={fetchMarketDNA} className="mt-4 px-5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg border border-red-500/20 transition-colors text-sm font-medium">
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <RequirePlan min="premium">
      <div className="min-h-screen bg-[#060a13] text-white">
        {/* ═══════ HEADER ═══════ */}
        <header className="sticky top-0 z-30 bg-[#060a13]/80 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <NavigationLink href="/dashboard" className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                <ArrowLeftIcon className="h-4 w-4" />
              </NavigationLink>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <span className="text-lg">🧬</span>
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-tight">Market DNA</h1>
                  <p className="text-[10px] text-gray-500 hidden sm:block">Historical Pattern Recognition & Risk Intelligence</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {data.marketMetrics?.spyPrice && (
                <div className="hidden sm:flex items-center gap-2 text-[11px]">
                  <span className="text-gray-500">S&P</span>
                  <span className="text-white font-semibold tabular-nums">{data.marketMetrics.spyPrice.toFixed(0)}</span>
                  {data.marketMetrics.vixLevel && (
                    <>
                      <span className="w-px h-3 bg-white/10" />
                      <span className="text-gray-500">VIX</span>
                      <span className={`font-semibold tabular-nums ${data.marketMetrics.vixLevel > 25 ? 'text-red-400' : data.marketMetrics.vixLevel > 18 ? 'text-amber-400' : 'text-emerald-400'}`}>{data.marketMetrics.vixLevel.toFixed(1)}</span>
                    </>
                  )}
                </div>
              )}
              <button onClick={fetchMarketDNA} disabled={refreshing}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-400 hover:text-white transition-all">
                <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* Market Sentiment & Risk (moved from /dashboard) */}
          <MarketSentimentBlock />

          {/* Data quality disclosures */}
          {data?._isFallback && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-200">
              ⚠️ Live Market DNA service is unavailable — showing reference/illustrative data. Use the Refresh button to retry.
            </div>
          )}
          {!data?._isFallback && (data?.syntheticSeries?.historicalSimilaritySeries || data?.syntheticSeries?.marketRegimeSeries) && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-[11px] text-blue-200">
              ℹ️ Similarity & regime time-series are <strong>pattern visualizations</strong> anchored to the live top-match score, not raw historical re-runs. Headline metrics (DNA score, sector vulnerabilities, correlations, risk ratios) are computed from live market data.
            </div>
          )}

          {/* ═══════ HERO: DNA SCORE + PATTERN MATCH ═══════ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* DNA Score Card */}
            <div className="lg:col-span-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.08] via-purple-500/[0.05] to-pink-500/[0.08] rounded-2xl" />
              <div className="relative bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 shadow-[0_0_60px_-15px_rgba(139,92,246,0.15)]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.08] flex items-center justify-center">
                      <ChartBarIcon className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className="text-sm font-semibold text-white">Market DNA Score</span>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-gray-500 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">Live</span>
                </div>

                {/* Central gauge */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative w-44 h-24">
                    <svg viewBox="0 0 200 110" className="w-full h-full">
                      <defs>
                        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="40%" stopColor="#f59e0b" />
                          <stop offset="70%" stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                      </defs>
                      {/* Background arc */}
                      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="12" strokeLinecap="round" />
                      {/* Value arc */}
                      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round"
                        strokeDasharray={`${(data.currentDNAScore / 100) * 251.2} 251.2`} />
                      {/* Needle */}
                      {(() => {
                        const angle = -180 + (data.currentDNAScore / 100) * 180
                        const rad = (angle * Math.PI) / 180
                        const nx = 100 + Math.cos(rad) * 60
                        const ny = 100 + Math.sin(rad) * 60
                        return <line x1="100" y1="100" x2={nx} y2={ny} stroke="white" strokeWidth="2" strokeLinecap="round" />
                      })()}
                      <circle cx="100" cy="100" r="4" fill="white" />
                    </svg>
                  </div>
                  <div className="text-center -mt-2">
                    <span className={`text-4xl font-black tabular-nums ${data.currentDNAScore >= 80 ? 'text-red-400' : data.currentDNAScore >= 60 ? 'text-amber-400' : data.currentDNAScore >= 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {data.currentDNAScore}%
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Pattern Strength</p>
                  </div>
                </div>

                {/* Dominant Pattern Badge */}
                <div className="text-center">
                  <span className={`inline-flex px-4 py-2 rounded-xl text-sm font-semibold border ${
                    data.dominantPattern.includes('Crisis') ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                    data.dominantPattern.includes('Bubble') ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
                    'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  }`}>
                    {data.dominantPattern}
                  </span>
                </div>
              </div>
            </div>

            {/* Historical Similarity Chart + Top Match */}
            <div className="lg:col-span-3 bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_0_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.08] flex items-center justify-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white tracking-tight">Historical Similarity</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Pattern matching against crisis events</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-5">
                  <LazyVisible minHeight={380}>
                    <HistoricalSimilarityChart data={similaritySeries as any} />
                  </LazyVisible>
                </div>
                {/* Top match callout */}
                <div className={`rounded-xl p-4 border-l-4 ${data.topHistoricalMatch.similarity >= 80 ? 'border-red-500 bg-red-500/[0.05]' : data.topHistoricalMatch.similarity >= 60 ? 'border-amber-500 bg-amber-500/[0.05]' : 'border-emerald-500 bg-emerald-500/[0.05]'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs text-gray-500">{data.topHistoricalMatch.date}</span>
                      <span className="mx-2 text-gray-600">·</span>
                      <span className={`text-sm font-semibold ${data.topHistoricalMatch.similarity >= 80 ? 'text-red-400' : data.topHistoricalMatch.similarity >= 60 ? 'text-amber-400' : 'text-emerald-400'}`}>{data.topHistoricalMatch.eventType}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSimilarityColor(data.topHistoricalMatch.similarity)}`}>
                      {data.topHistoricalMatch.similarity}% Match
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{data.topHistoricalMatch.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="text-gray-500">Next Period: <span className="text-red-400 font-semibold">{data.topHistoricalMatch.nextPeriodReturn}</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ ADDITIONAL HISTORICAL PATTERNS ═══════ */}
          <div className="bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_0_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.08] flex items-center justify-center">
                  <ChartBarIcon className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-white tracking-tight">Additional Historical Patterns</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.additionalMatches.map((match, index) => (
                  <div key={index} className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06] hover:border-white/[0.12] transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-200">{match.date}</span>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${getSimilarityColor(match.similarity)}`}>
                        {match.similarity}%
                      </span>
                    </div>
                    <p className={`text-sm font-medium mb-1 ${match.similarity >= 70 ? 'text-amber-400' : 'text-blue-400'}`}>{match.eventType}</p>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">{match.description}</p>
                    <div className="flex items-center justify-between text-xs border-t border-white/[0.04] pt-2">
                      <span className="text-gray-500">Next Period Return</span>
                      <span className="text-red-400 font-semibold">{match.nextPeriodReturn}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══════ CROSS-ASSET RISK REGIME ═══════ */}
          {data.riskSummary && (
            <div className="bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_0_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <span className="text-lg">⚡</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white tracking-tight">Cross-Asset Risk Regime</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Real-time ratio-based regime classification</p>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                  data.riskSummary.regime === 'Risk-Off' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  data.riskSummary.regime === 'Risk-On' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                  {data.riskSummary.regime} · {data.riskSummary.votes.on + data.riskSummary.votes.off} signals
                </div>
              </div>
              <div className="p-6">
                {/* Regime Score Bar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>Risk-Off</span>
                      <span className="font-mono tabular-nums">{data.riskSummary.score > 0 ? '+' : ''}{data.riskSummary.score.toFixed(2)}</span>
                      <span>Risk-On</span>
                    </div>
                    <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden relative">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
                      {data.riskSummary.score !== 0 && (
                        <div
                          className={`absolute inset-y-0 rounded-full ${data.riskSummary.score > 0 ? 'bg-emerald-500/60' : 'bg-red-500/60'}`}
                          style={data.riskSummary.score > 0
                            ? { left: '50%', width: `${Math.abs(data.riskSummary.score) * 50}%` }
                            : { right: '50%', width: `${Math.abs(data.riskSummary.score) * 50}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
                {/* Signal Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {data.riskSummary.signals.map(sig => (
                    <div key={sig.key} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 hover:border-white/[0.12] transition-all">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{sig.key}</span>
                        <span className={`w-2 h-2 rounded-full ${
                          sig.dir === 'risk-on' ? 'bg-emerald-400' : sig.dir === 'risk-off' ? 'bg-red-400' : 'bg-gray-500'
                        }`} />
                      </div>
                      <div className="text-sm font-bold tabular-nums text-white">{sig.value != null ? sig.value.toFixed(2) : '—'}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{sig.label}</div>
                      {sig.note && <div className="text-[9px] text-gray-600 mt-1">{sig.note}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ PEAK SIGNALS MATRIX ═══════ */}
          {peakSignals && (
            <div className="bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_0_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500/20 to-amber-500/10 border border-red-500/20 flex items-center justify-center">
                    <span className="text-lg">🚨</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-white tracking-tight">EconoPulse Peak Signals</h2>
                      <span className={`text-[10px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-full border ${peakSignals.current.percent > 60 ? 'text-red-300 bg-red-500/10 border-red-500/20' : peakSignals.current.percent > 30 ? 'text-amber-300 bg-amber-500/10 border-amber-500/20' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'}`}>
                        {peakSignals.current.percent}% Triggered
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Real-time market peak watchlist (real + proxy signals)</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {data.marketMetrics?.spyPrice && <span>S&P: <span className="text-blue-400 font-semibold">{data.marketMetrics.spyPrice.toFixed(0)}</span></span>}
                  {loadingPeak && <span className="text-emerald-400 animate-pulse">Updating...</span>}
                </div>
              </div>
              {/* Peak Signals Timeline Chart */}
              <div className="px-6 pt-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                  Signals Triggered Over Time
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      ...peakSignals.historical.map(h => ({ date: h.date, percent: h.percent, type: 'historical', spy: h.spy })),
                      ...peakSignals.recent.map(r => ({ date: r.date, percent: r.percent, type: 'recent', spy: r.spy })),
                      { date: 'Now', percent: peakSignals.current.percent, type: 'current', spy: peakSignals.current.spy }
                    ]} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#475569" fontSize={10} />
                      <YAxis stroke="#475569" fontSize={10} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        contentStyle={getTooltipStyle()}
                        formatter={(value: any, name: any) => [`${value}%`, 'Triggered']}
                        labelStyle={getTooltipLabelStyle()}
                      />
                      <Bar dataKey="percent" radius={[4, 4, 0, 0]} barSize={28}>
                        {[
                          ...peakSignals.historical.map(h => h.percent),
                          ...peakSignals.recent.map(r => r.percent),
                          peakSignals.current.percent
                        ].map((pct, idx) => (
                          <Cell key={`peak-${idx}`} fill={pct > 60 ? '#dc2626' : pct > 30 ? '#f59e0b' : '#16a34a'} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="p-4 overflow-x-auto">
                <table className="min-w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="text-left py-2.5 px-3 font-medium text-gray-400 uppercase tracking-wider text-[10px]">Signpost</th>
                      <th className="text-left py-2.5 px-3 font-medium text-gray-400 uppercase tracking-wider text-[10px]">Category</th>
                      {peakSignals.historical.map(h => (
                        <th key={h.date} className="py-2.5 px-2 font-medium text-center whitespace-nowrap text-gray-400 uppercase tracking-wider text-[10px]">{h.date}</th>
                      ))}
                      {peakSignals.recent.map(r => (
                        <th key={r.date} className="py-2.5 px-2 font-medium text-center whitespace-nowrap text-gray-400 uppercase tracking-wider text-[10px]">{r.date}</th>
                      ))}
                      <th className="py-2.5 px-2 font-medium text-center whitespace-nowrap text-[10px] text-blue-400 uppercase tracking-wider">Now</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {peakSignals.signals.map(sig => (
                      <tr key={sig.key} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-3 font-medium text-gray-200 max-w-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-gray-100">{sig.label}</span>
                            <span className="text-[9px] text-gray-600">{sig.source} · {sig.threshold} · {sig.status === 'proxy' ? 'Proxy' : sig.status === 'unavailable' ? 'N/A' : 'Real'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-md border text-[9px] font-semibold ${categoryColor(sig.category)}`}>{sig.category}</span></td>
                        {peakSignals.historical.map(h => <td key={h.date + sig.key} className="py-2.5 px-2 text-center">{checkMark(h.triggeredKeys.includes(sig.key), sig.status)}</td>)}
                        {peakSignals.recent.map(r => <td key={r.date + sig.key} className="py-2.5 px-2 text-center">{checkMark(r.triggeredKeys.includes(sig.key), sig.status)}</td>)}
                        <td className="py-2.5 px-2 text-center font-bold">{checkMark(peakSignals.current.triggeredKeys.includes(sig.key), sig.status)}</td>
                      </tr>
                    ))}
                    {/* Summary row */}
                    <tr className="bg-white/[0.03]">
                      <td className="py-2.5 px-3 font-semibold text-gray-200">% triggered</td>
                      <td className="py-2.5 px-3" />
                      {peakSignals.historical.map(h => <td key={h.date + 'pct'} className="py-2.5 px-2 text-center font-semibold text-amber-300">{h.percent}%</td>)}
                      {peakSignals.recent.map(r => <td key={r.date + 'pct'} className="py-2.5 px-2 text-center font-semibold text-amber-300">{r.percent}%</td>)}
                      <td className="py-2.5 px-2 text-center font-semibold text-emerald-300">{peakSignals.current.percent}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 border-t border-white/[0.04]">
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Real: raw open data · Proxy: open substitute for proprietary construct · N/A: requires licensed data (excluded). Historical peak dates sampled. Informational only – not investment advice.
                </p>
              </div>
            </div>
          )}

          {/* ═══════ ADVANCED ANALYTICS DASHBOARD ═══════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Market Regime Evolution */}
            <div className="bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_0_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <span className="text-lg">🔄</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white tracking-tight">Market Regime Evolution</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Regime classification over time</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div>
                  <LazyVisible minHeight={380}>
                    <MarketRegimeArea data={regimeSeries as any} />
                  </LazyVisible>
                </div>
              </div>
            </div>

            {/* Sector Risk Radar */}
            <div className="bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_0_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20 flex items-center justify-center">
                    <span className="text-lg">🎯</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white tracking-tight">Sector Risk Radar</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Multi-dimensional risk distribution</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div>
                  <LazyVisible minHeight={410}>
                    <SectorRiskRadar data={radarSeries as any} />
                  </LazyVisible>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ SECTOR VULNERABILITY ANALYSIS ═══════ */}
          <div className="bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_0_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.06] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center">
                  <span className="text-lg">⚠️</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white tracking-tight">Sector Vulnerability Analysis</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Risk scoring across market sectors</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-1 border border-white/[0.06]">
                  {['score','change'].map(k=> (
                    <button key={k} onClick={()=>setSectorSort(k as any)} className={`px-3 py-1.5 rounded-md font-medium transition-all ${sectorSort===k?'bg-blue-500/20 text-blue-400 border border-blue-500/30':'text-gray-400 hover:text-white border border-transparent'}`}>{k==='score'?'Sort: Risk':'Sort: Δ'}</button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-1 border border-white/[0.06]">
                  {['bars','table'].map(v => (
                    <button key={v} onClick={()=>setSectorView(v as any)} className={`px-3 py-1.5 rounded-md font-medium transition-all ${sectorView===v?'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30':'text-gray-400 hover:text-white border border-transparent'}`}>{v==='bars'?'Cards':'Table'}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sector Risk Bar Chart */}
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
                      <CartesianGrid strokeDasharray="2 4" stroke="#1e293b" horizontal={false} />
                      <XAxis type="number" stroke="#475569" fontSize={11} domain={[0,100]} tickFormatter={(v)=>`${v}`}/>
                      <YAxis dataKey="sector" type="category" stroke="#475569" width={110} tick={{fontSize:11}} />
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
                        <LabelList dataKey="score" position="right" className="fill-gray-300 text-[10px]" />
                        {data.sectorVulnerabilities.sort((a,b)=>{
                          if (sectorSort==='score') return b.score - a.score; const av=parseFloat(a.change); const bv=parseFloat(b.change); return bv-av; }).map((entry, idx)=> {
                          const grad = entry.riskLevel==='CRITICAL'?'url(#riskCrit)':entry.riskLevel==='HIGH'?'url(#riskHigh)':entry.riskLevel==='MEDIUM'?'url(#riskMed)':'url(#riskLow)';
                          return <Cell key={`cell-r-${idx}`} fill={grad} stroke="#0c1222" strokeWidth={0.5} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-gray-600 px-1">
                    <span>Gradient encodes risk severity.</span>
                    <span>Sorted by {sectorSort==='score'?'risk score':'Δ change'}.</span>
                  </div>
                </div>

                {/* Sector Cards or Table */}
                {sectorView==='bars' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {data.sectorVulnerabilities.map((sector, index) => (
                      <div key={index} className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06] hover:border-white/[0.12] transition-all group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm text-gray-200 group-hover:text-white transition-colors">{sector.sector}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border ${getRiskColor(sector.riskLevel)}`}>
                            {sector.riskLevel}
                          </span>
                        </div>
                        <div className="flex items-end gap-3 mb-2">
                          <div className="text-2xl font-bold text-white leading-none">{sector.score}</div>
                          <div className={`text-sm font-medium ${sector.change.startsWith('+') ? 'text-green-400':'text-red-400'}`}>{sector.change}</div>
                        </div>
                        <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{width:`${sector.score}%`, background: sector.riskLevel==='CRITICAL'?'linear-gradient(90deg,#7f1d1d,#dc2626)': sector.riskLevel==='HIGH'?'linear-gradient(90deg,#7c2d12,#ea580c)': sector.riskLevel==='MEDIUM'?'linear-gradient(90deg,#78350f,#f59e0b)':'linear-gradient(90deg,#065f46,#16a34a)'}}></div>
                        </div>
                        <div className="mt-2 flex justify-between text-[10px] text-gray-600">
                          <span>Exposure</span><span>{sector.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-left border-b border-white/[0.06]">
                          <th className="py-2.5 pr-4 font-medium text-gray-400 uppercase tracking-wider text-[10px]">Sector</th>
                          <th className="py-2.5 pr-4 font-medium text-gray-400 uppercase tracking-wider text-[10px]">Risk</th>
                          <th className="py-2.5 pr-4 font-medium text-gray-400 uppercase tracking-wider text-[10px]">Score</th>
                          <th className="py-2.5 pr-4 font-medium text-gray-400 uppercase tracking-wider text-[10px]">Δ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {[...data.sectorVulnerabilities].sort((a,b)=>{
                          if (sectorSort==='score') return b.score - a.score; const av=parseFloat(a.change); const bv=parseFloat(b.change); return bv-av; }).map((s,i)=>(
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-2 pr-4 font-medium text-gray-100">{s.sector}</td>
                            <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRiskColor(s.riskLevel)}`}>{s.riskLevel}</span></td>
                            <td className="py-2 pr-4 text-gray-200 font-semibold">{s.score}</td>
                            <td className={`py-2 pr-4 font-medium ${s.change.startsWith('+')?'text-green-400':'text-red-400'}`}>{s.change}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="mt-5 pt-4 border-t border-white/[0.04] flex flex-wrap gap-4 text-[10px] text-gray-600">
                <span><span className="inline-block w-2 h-2 bg-gradient-to-r from-rose-900 to-red-600 rounded-sm mr-1"></span>Critical</span>
                <span><span className="inline-block w-2 h-2 bg-gradient-to-r from-amber-900 to-orange-600 rounded-sm mr-1"></span>High</span>
                <span><span className="inline-block w-2 h-2 bg-gradient-to-r from-yellow-900 to-amber-500 rounded-sm mr-1"></span>Medium</span>
                <span><span className="inline-block w-2 h-2 bg-gradient-to-r from-emerald-900 to-green-600 rounded-sm mr-1"></span>Low</span>
              </div>
            </div>
          </div>

          {/* ═══════ MARKET CLUSTERS ═══════ */}
          <div className="bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_0_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500/20 to-emerald-500/10 border border-teal-500/20 flex items-center justify-center">
                  <span className="text-lg">🔄</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white tracking-tight">Market Clusters</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Current asset groupings and risk assessment</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.marketClusters.map((cluster, index) => (
                  <div key={index} className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06] hover:border-white/[0.12] transition-all group">
                    <h3 className="font-semibold text-base text-white mb-3 group-hover:text-blue-300 transition-colors">{cluster.clusterName}</h3>
                    <div className="space-y-2.5">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Assets</span>
                        <div className="flex flex-wrap gap-1.5">
                          {cluster.currentAssets.map((a, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-medium">{a}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Historical Comparison</span>
                        <span className="text-sm text-amber-400">{cluster.historicalComparison}</span>
                      </div>
                      <div className="pt-2 border-t border-white/[0.04]">
                        <span className="text-sm text-orange-400 leading-relaxed">{cluster.riskAssessment}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══════ CORRELATION ANOMALIES ═══════ */}
          <div className="bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_0_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/20 flex items-center justify-center">
                  <span className="text-lg">🌊</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white tracking-tight">Correlation Anomalies & Asset Relationships</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Detecting breaks in historical correlation patterns</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Correlation Scatter Plot */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-blue-400 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    Asset Correlation Scatter
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis 
                          type="number" 
                          dataKey="currentCorrelation" 
                          name="Current Correlation"
                          domain={[-1, 1]}
                          stroke="#475569"
                          fontSize={11}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="historicalAvg" 
                          name="Historical Average"
                          domain={[-1, 1]}
                          stroke="#475569"
                          fontSize={11}
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
                              stroke="rgba(255,255,255,0.15)"
                              strokeWidth={1.5}
                            />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Correlation Anomalies List */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-orange-400 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                    Current Anomalies
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                    {data.correlationAnomalies.map((anomaly, index) => (
                      <div key={index} className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06] hover:border-white/[0.10] transition-all">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-sm text-gray-100">{anomaly.asset1} <span className="text-gray-600">vs</span> {anomaly.asset2}</div>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            anomaly.anomalyLevel === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            anomaly.anomalyLevel === 'WARNING' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                            anomaly.anomalyLevel === 'ALERT' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {anomaly.anomalyLevel}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-gray-400">Current: <span className="text-gray-200 font-semibold">{anomaly.currentCorrelation.toFixed(2)}</span></span>
                          <span className="text-gray-400">Avg: <span className="text-gray-200 font-semibold">{anomaly.historicalAvg.toFixed(2)}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Correlation Heatmap */}
              <div className="mt-6 pt-6 border-t border-white/[0.04]">
                <h3 className="text-sm font-semibold mb-4 text-purple-400 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                  Asset Correlation Matrix
                </h3>
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
                  <div className="grid grid-cols-6 gap-1.5 text-xs">
                    <div></div>
                    {['SPY','TLT','GLD','VIX','DXY'].map(h => (
                      <div key={h} className="font-semibold text-center text-gray-400 text-[10px] uppercase tracking-wider py-1">{h}</div>
                    ))}
                    {correlationMatrix.map((row, rowIndex) => (
                      <React.Fragment key={`row-${rowIndex}`}>
                        <div className="font-semibold text-gray-400 text-[10px] uppercase tracking-wider flex items-center">{row.asset}</div>
                        {(['spy','tlt','gld','vix','dxy'] as const).map(key => {
                          const val = (row as any)[key];
                          const color = val > 0.6 ? 'bg-emerald-500/30 border-emerald-500/20 text-emerald-300' : val < -0.6 ? 'bg-red-500/30 border-red-500/20 text-red-300' : 'bg-amber-500/20 border-amber-500/15 text-amber-300';
                          return (
                            <div key={`${key}-${rowIndex}`} className={`text-center py-2 rounded-lg font-semibold border ${color}`}>
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
          </div>

          {/* ═══════ AI INSIGHT + RISK GAUGE ═══════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Market DNA Insight */}
            <div className="lg:col-span-2 bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_0_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-purple-500/[0.03] pointer-events-none"></div>
              <div className="relative px-6 py-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/10 border border-blue-500/20 flex items-center justify-center">
                    <span className="text-lg">🤖</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white tracking-tight">AI Market DNA Insight</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Machine learning pattern interpretation</p>
                  </div>
                </div>
              </div>
              <div className="relative p-6">
                <p className="text-gray-300 leading-relaxed text-sm mb-5">{data.aiInsight}</p>
                
                {/* Key Risk Indicators */}
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold mb-4 text-amber-400 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                    Key Risk Indicators
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Market Stress', value: `${data.currentDNAScore}%`, color: 'text-red-400' },
                      { label: 'Crisis Probability', value: `${Math.round(data.currentDNAScore * 0.75)}%`, color: 'text-orange-400' },
                      { label: 'Volatility Regime', value: data.currentDNAScore > 80 ? 'High' : data.currentDNAScore > 60 ? 'Elevated' : 'Normal', color: 'text-amber-400' },
                      { label: 'Time Horizon', value: '3-6 months', color: 'text-blue-400' },
                    ].map(kri => (
                      <div key={kri.label} className="flex items-center justify-between bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.04]">
                        <span className="text-xs text-gray-400">{kri.label}</span>
                        <span className={`text-sm font-bold ${kri.color}`}>{kri.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Gauge */}
            <div className="bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_0_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-500/20 to-red-500/10 border border-rose-500/20 flex items-center justify-center">
                    <span className="text-lg">🎯</span>
                  </div>
                  <h2 className="text-lg font-semibold text-white tracking-tight">Risk Gauge</h2>
                </div>
              </div>
              <div className="p-6">
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
                
                {/* Recommended Actions */}
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recommended Actions</h3>
                  <div className="space-y-2">
                    {data.currentDNAScore > 80 && (
                      <div className="flex items-center gap-2 text-xs bg-red-500/[0.06] border border-red-500/10 rounded-lg px-3 py-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></div>
                        <span className="text-red-400">Reduce portfolio risk exposure</span>
                      </div>
                    )}
                    {data.currentDNAScore > 70 && (
                      <div className="flex items-center gap-2 text-xs bg-orange-500/[0.06] border border-orange-500/10 rounded-lg px-3 py-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"></div>
                        <span className="text-orange-400">Increase cash allocation</span>
                      </div>
                    )}
                    {data.currentDNAScore > 60 && (
                      <div className="flex items-center gap-2 text-xs bg-amber-500/[0.06] border border-amber-500/10 rounded-lg px-3 py-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></div>
                        <span className="text-amber-400">Monitor correlations closely</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs bg-blue-500/[0.06] border border-blue-500/10 rounded-lg px-3 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
                      <span className="text-blue-400">Consider hedging strategies</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ FOOTER ═══════ */}
          <div className="bg-[#0c1222]/40 backdrop-blur rounded-xl border border-white/[0.04] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-xs text-gray-600">Last updated: {new Date(data.lastUpdated).toLocaleString()}</span>
            <span className="text-[10px] text-gray-700">EconoPulse Market DNA · Informational only · Not investment advice</span>
          </div>
        </main>

        <Footer />
      </div>
    </RequirePlan>
  );
}
