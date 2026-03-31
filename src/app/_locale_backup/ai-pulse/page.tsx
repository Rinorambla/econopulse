'use client';

import React, { useState, useEffect } from 'react';
import LocalErrorBoundary from '@/components/LocalErrorBoundary';
import Footer from '@/components/Footer';
import RequirePlan from '@/components/RequirePlan';
import Link from 'next/link';
import { TrendingUp, TrendingDown, BarChart3, Target, RefreshCw, ArrowLeft, Calendar, Clock, Activity, Globe, DollarSign, Briefcase, PieChart, ChevronDown, ChevronUp, Zap, Shield, AlertTriangle, Eye, Radio } from 'lucide-react';
import dynamic from 'next/dynamic';

const AdvancedChart = dynamic(() => import('@/components/analytics/AdvancedChart'), { ssr: false, loading: () => <div className="h-[600px] bg-[#0c1222]/80 rounded-2xl border border-white/[0.06] flex items-center justify-center text-gray-400 text-sm">Loading chart…</div> });
const MarketCategoriesEmbed = dynamic(() => import('@/components/analytics/MarketCategoriesEmbed'), { ssr: false });
const WatchlistPanel = dynamic(() => import('@/components/WatchlistPanel'), { ssr: false });
const SectorPerformanceLazy = dynamic(() => import('@/components/charts/SectorPerformanceLazy'), { ssr: false });
const ETFLineChartLazy = dynamic(() => import('@/components/charts/ETFLineChartLazy'), { ssr: false });
const EconomicCalendar = dynamic(() => import('@/components/analytics/EconomicCalendar').then(m => m.EconomicCalendar), { ssr: false });
const EarningsCalendar = dynamic(() => import('@/components/analytics/EarningsCalendar').then(m => m.EarningsCalendar), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────
interface SectorPerformance { sector: string; daily: number; weekly: number; monthly: number; quarterly: number; sixMonth?: number; ytd?: number; fiftyTwoWeek?: number; yearly: number; marketCap: number; volume: number; topStocks: string[] }
interface CountryIndicators { country: string; countryCode: string; gdp: { value: number; growth: number; date: string }; inflation: { value: number; date: string }; unemployment: { value: number; date: string }; interestRate: { value: number; date: string }; currency: { code: string; usdRate: number }; marketCap: number; population: number; creditRating: string }
interface CountryData { countries: CountryIndicators[]; global: { totalGdp: number; averageGrowth: number; averageInflation: number; averageUnemployment: number; totalCountries: number }; lastUpdated: string }
interface EconomicCycle { current: { cycle: string; growth: string; inflation: string; confidence: number }; indicators: { gdp: { value: number; date: string }; inflation: { value: number; date: string }; unemployment: { value: number; date: string }; fedRate: { value: number; date: string } }; analysis: string; lastUpdated: string }
interface AIEconomicAnalysis { currentCycle: string; direction: 'bullish' | 'bearish' | 'neutral' | 'mixed'; confidence: number; timeframe: string; keyFactors: string[]; risks: string[]; opportunities: string[]; summary: string; recommendation: string }
interface ETFData { symbol: string; name: string; category: string; price: number; change: number; volume: number; high: number; low: number; open: number; expense: number; volatility: number; trend: string; momentum: string; marketCap: number; ytdReturn: number; peRatio: number; dividend: number; beta: number; timestamp: string }

const getCountryFlag = (code: string) => ({ US: '🇺🇸', CN: '🇨🇳', DE: '🇩🇪', JP: '🇯🇵', IN: '🇮🇳', GB: '🇬🇧', FR: '🇫🇷', CA: '🇨🇦', IT: '🇮🇹', AU: '🇦🇺', BR: '🇧🇷', KR: '🇰🇷', ES: '🇪🇸', NL: '🇳🇱', CH: '🇨🇭' }[code] || '🏳️');

// ─── Section Wrapper ─────────────────────────────────────────────────
function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_0_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden ${className}`}>
      {children}
    </section>
  );
}
function SectionHeader({ icon, title, badge, actions, subtitle }: { icon: React.ReactNode; title: string; badge?: string; actions?: React.ReactNode; subtitle?: string }) {
  return (
    <div className="px-6 py-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.08] flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
            {badge && <span className="text-[10px] font-medium uppercase tracking-widest text-gray-500 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">{badge}</span>}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Stat Pill ───────────────────────────────────────────────────────
function StatPill({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 min-w-[130px]">
      <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AIPulsePage({ params }: { params: Promise<{ locale: string }> }) {
  // Client-side fetch with timeout
  const fetchT = React.useCallback(async (input: RequestInfo | URL, timeoutMs = 10000, init?: RequestInit) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(input, { ...(init || {}), signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  }, []);

  // ─── State ───────────────────────────────────────────────────────
  const [sectorData, setSectorData] = useState<SectorPerformance[]>([]);
  const [economicData, setEconomicData] = useState<EconomicCycle | null>(null);
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIEconomicAnalysis | null>(null);
  const [aiMeta, setAiMeta] = useState<{ realtime: boolean; dataSource: string; fallback: boolean } | null>(null);
  const [etfData, setEtfData] = useState<ETFData[]>([]);
  const [selectedComparison, setSelectedComparison] = useState('');
  const [etfSpreadType, setEtfSpreadType] = useState<'percent' | 'absolute'>('percent');
  const [etfRange, setEtfRange] = useState<'1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'max'>('3mo');
  const [etfSeries, setEtfSeries] = useState<Array<{ time: number; a?: number; b?: number; spread?: number }>>([]);
  const [etfSeriesLoading, setEtfSeriesLoading] = useState(false);
  const [topMovers, setTopMovers] = useState<Array<{ symbol: string; price: number; changePercent: number }>>([]);
  const [bottomMovers, setBottomMovers] = useState<Array<{ symbol: string; price: number; changePercent: number }>>([]);
  type SparkBar = { time: number; close: number };
  const [sparks, setSparks] = useState<Record<string, SparkBar[]>>({});
  const [sparkLoading, setSparkLoading] = useState(false);
  const [showCountryMatrix, setShowCountryMatrix] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // UX state
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'sixMonth' | 'ytd' | 'fiftyTwoWeek' | 'yearly'>('daily');
  type TimeframeKey = '1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '52W';
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeKey>('1D');
  const timeframeToPeriod: Record<TimeframeKey, typeof selectedPeriod> = {
    '1D': 'daily', '1W': 'weekly', '1M': 'monthly', '3M': 'quarterly',
    '6M': 'sixMonth', 'YTD': 'ytd', '52W': 'fiftyTwoWeek'
  };
  useEffect(() => { setSelectedPeriod(timeframeToPeriod[selectedTimeframe]); }, [selectedTimeframe]);
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [syncMoversWithPeriod, setSyncMoversWithPeriod] = useState(false);
  const [sectorSort, setSectorSort] = useState<'performance' | 'volume' | 'marketCap'>('performance');
  const [sectorView, setSectorView] = useState<'bar' | 'multi'>('bar');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarketDetails, setShowMarketDetails] = useState(false);
  const [dataHealth, setDataHealth] = useState({ sector: false, economic: false, ai: false, etf: false, country: false });

  // ─── Fetchers (same data logic) ────────────────────────────────
  const fetchCountryData = async () => { try { const r = await fetchT('/api/country-data', 12000); if (!r.ok) throw new Error('country'); const j = await r.json(); setCountryData(j.data); setDataHealth(h => ({ ...h, country: !!j.data })); } catch (e) { console.error(e); } };
  const fetchSectorData = async () => { try { setRefreshing(true); const r = await fetchT(`/api/sector-performance`, 12000, { cache: 'no-store' }); if (!r.ok) throw new Error('sector'); const j = await r.json(); const sectors = j.sectors || []; setSectorData(sectors); setDataHealth(h => ({ ...h, sector: sectors.length > 0 })); setLastUpdated(j.lastUpdated || new Date().toISOString()); setError(''); } catch (e) { console.error(e); setError('Failed to load sector performance data'); } finally { setLoading(false); setRefreshing(false); } };
  const fetchEconomicData = async () => { try { const r = await fetchT('/api/economic-data', 10000); if (!r.ok) { console.warn('economic-data unavailable'); return; } const j = await r.json(); setEconomicData(j.data); setDataHealth(h => ({ ...h, economic: !!j.data })); } catch (e) { console.error(e); } };
  const fetchAIAnalysis = async () => { try { setAiLoading(true); const r = await fetchT('/api/ai-economic-analysis', 12000); if (!r.ok) { console.warn('ai-economic-analysis unavailable'); setAiMeta(null); setAiAnalysis(null); return; } const j = await r.json(); const analysis = j.data?.analysis || j; setAiAnalysis(analysis); setAiMeta(j ? { realtime: !!j.realtime, dataSource: j.data?.dataSource || 'N/A', fallback: !!j.data?.fallback } : null); setDataHealth(h => ({ ...h, ai: !!analysis })); } catch (e) { console.error(e); } finally { setAiLoading(false); } };
  const fetchETFData = async () => { try { const r = await fetchT('/api/etf-comparison', 10000); if (!r.ok) throw new Error('etf'); const j = await r.json(); const etfs = j.etfs || []; setEtfData(etfs); setDataHealth(h => ({ ...h, etf: etfs.length > 0 })); } catch (e) { console.error(e); } };
  const fetchTopMovers = async (sectorOverride?: string) => { try { const s = sectorOverride ?? selectedSector; const p = syncMoversWithPeriod ? selectedPeriod : 'daily'; const qs = new URLSearchParams({ limit: '10', period: p }); if (s) qs.set('sector', s); const r = await fetchT(`/api/top-movers?${qs.toString()}`, 8000, { cache: 'no-store' }); if (!r.ok) throw new Error('movers'); const j = await r.json(); setTopMovers((j.top || []).map((m: any) => ({ symbol: m.symbol, price: Number(m.price) || 0, changePercent: Number(m.changePercent) || 0 }))); setBottomMovers((j.bottom || []).map((m: any) => ({ symbol: m.symbol, price: Number(m.price) || 0, changePercent: Number(m.changePercent) || 0 }))); } catch (e) { console.error(e); } };

  const fetchSparkHistory = async (symbols: string[]) => {
    try {
      const uniq: string[] = [];
      for (const s of symbols) if (s && !uniq.includes(s)) uniq.push(s);
      if (uniq.length === 0) return;
      setSparkLoading(true);
      const allMap: Record<string, SparkBar[]> = {};
      for (let i = 0; i < uniq.length; i += 15) {
        const chunk = uniq.slice(i, i + 15);
        const qs = new URLSearchParams({ symbols: chunk.join(','), range: '1mo', interval: '1d' });
        const res = await fetchT(`/api/yahoo-history?${qs.toString()}`, 9000, { cache: 'no-store' });
        if (!res.ok) throw new Error('spark');
        const json = await res.json();
        (json.data || []).forEach((h: any) => {
          const bars = (h.bars || []).map((b: any) => ({ time: Number(b.time) || 0, close: Number(b.close) || 0 })).filter((b: any) => Number.isFinite(b.close));
          if (h.symbol && bars.length > 0) allMap[h.symbol] = bars;
        });
      }
      setSparks(prev => ({ ...prev, ...allMap }));
    } catch (e) { console.error(e); } finally { setSparkLoading(false); }
  };

  useEffect(() => { fetchSectorData(); fetchEconomicData(); fetchCountryData(); fetchAIAnalysis(); fetchETFData(); fetchTopMovers(''); }, []);
  useEffect(() => {
    let stopped = false;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      fetchSectorData(); fetchEconomicData(); fetchCountryData(); fetchAIAnalysis(); fetchETFData(); fetchTopMovers();
    };
    const heavy = setInterval(() => { if (!stopped) tick(); }, 600000);
    const movers = setInterval(() => { if (document.visibilityState === 'visible') fetchTopMovers(); }, 180000);
    const onVis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { stopped = true; clearInterval(heavy); clearInterval(movers); document.removeEventListener('visibilitychange', onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSector, selectedPeriod, syncMoversWithPeriod]);
  useEffect(() => { fetchTopMovers(); }, [selectedSector, selectedPeriod, syncMoversWithPeriod]);

  // ETF historical series for spread mode
  const fetchEtfComparisonSeries = async () => {
    try {
      if (!selectedComparison) return;
      const pairMap: Record<string, [string, string]> = {
        'QQQ-SPY': ['QQQ', 'SPY'], 'VOO-VUG': ['VOO', 'VUG'], 'QQQ-VGT': ['QQQ', 'VGT'],
        'IVV-VOO': ['IVV', 'VOO'], 'VOO-VTI': ['VOO', 'VTI'], 'JEPI-JEPQ': ['JEPI', 'JEPQ'],
      };
      const syms = pairMap[selectedComparison];
      if (!syms) return;
      setEtfSeriesLoading(true);
      const interval = (() => {
        if (etfRange === '5y' || etfRange === '10y') return '1wk';
        if (etfRange === 'max') return '1mo';
        return '1d';
      })();
      const qs = new URLSearchParams({ symbols: syms.join(','), range: etfRange, interval });
      const res = await fetchT(`/api/yahoo-history?${qs.toString()}`, 10000, { cache: 'no-store' });
      if (!res.ok) throw new Error('history');
      const json = await res.json();
      const arr: any[] = json.data || [];
      const bySym: Record<string, Array<{ time: number; close: number }>> = {};
      for (const h of arr) {
        const s = String(h.symbol || '');
        const bars = (h.bars || []).map((b: any) => ({ time: Number(b.time) || 0, close: Number(b.close) || 0 }))
          .filter((b: any) => Number.isFinite(b.time) && Number.isFinite(b.close));
        if (s && bars.length) bySym[s] = bars;
      }
      const aBars = bySym[syms[0]] || [];
      const bBars = bySym[syms[1]] || [];
      if (!aBars.length || !bBars.length) { setEtfSeries([]); return; }
      const bMap = new Map<number, number>(bBars.map(b => [b.time, b.close] as const));
      const merged: Array<{ time: number; a: number; b: number; spread: number }> = [];
      for (const a of aBars) {
        const bClose = bMap.get(a.time);
        if (typeof bClose === 'number') {
          const spread = etfSpreadType === 'percent' ? ((a.close / (bClose || 1)) - 1) * 100 : (a.close - bClose);
          merged.push({ time: a.time, a: a.close, b: bClose, spread });
        }
      }
      merged.sort((x, y) => x.time - y.time);
      setEtfSeries(merged);
    } catch (e) { console.error(e); setEtfSeries([]); } finally { setEtfSeriesLoading(false); }
  };
  useEffect(() => { if (selectedComparison) fetchEtfComparisonSeries(); }, [etfRange, etfSpreadType, selectedComparison]);

  // ─── Helpers ────────────────────────────────────────────────────
  const getPerformanceValue = (s: SectorPerformance) => ({
    daily: s.daily, weekly: s.weekly, monthly: s.monthly, quarterly: s.quarterly,
    sixMonth: s.sixMonth ?? 0, ytd: s.ytd ?? 0, fiftyTwoWeek: s.fiftyTwoWeek ?? s.yearly, yearly: s.yearly,
  } as any)[selectedPeriod] as number;

  const getPeriodLabel = () => ({
    daily: 'Today', weekly: 'This Week', monthly: 'This Month', quarterly: 'This Quarter',
    sixMonth: 'Last 6 Months', ytd: 'Year-To-Date', fiftyTwoWeek: 'Last 52 Weeks', yearly: 'Last 52 Weeks'
  } as const)[selectedPeriod];

  const getPerformanceColor = (v: number) => v > 2 ? 'text-emerald-400' : v > 1 ? 'text-green-400' : v > 0 ? 'text-lime-400' : v > -1 ? 'text-yellow-400' : v > -2 ? 'text-orange-400' : 'text-red-400';

  const getAIDirectionDisplay = (d: string) => {
    const dir = d.toLowerCase();
    if (dir === 'bullish') return { color: 'text-emerald-400', icon: <TrendingUp className="w-5 h-5" />, bg: 'bg-emerald-500/10 border-emerald-500/20', pill: 'bg-emerald-500/20 text-emerald-300' };
    if (dir === 'bearish') return { color: 'text-red-400', icon: <TrendingDown className="w-5 h-5" />, bg: 'bg-red-500/10 border-red-500/20', pill: 'bg-red-500/20 text-red-300' };
    if (dir === 'mixed') return { color: 'text-amber-400', icon: <BarChart3 className="w-5 h-5" />, bg: 'bg-amber-500/10 border-amber-500/20', pill: 'bg-amber-500/20 text-amber-300' };
    return { color: 'text-gray-400', icon: <Target className="w-5 h-5" />, bg: 'bg-gray-500/10 border-gray-500/20', pill: 'bg-gray-500/20 text-gray-300' };
  };

  const getProjectedCycleStyle = (c?: string) => {
    const l = (c || '').toLowerCase();
    if (l === 'expansion') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
    if (l === 'recovery') return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300';
    if (l === 'slowdown') return 'bg-amber-500/10 border-amber-500/20 text-amber-300';
    if (l === 'contraction') return 'bg-red-500/10 border-red-500/20 text-red-300';
    if (l === 'transition') return 'bg-purple-500/10 border-purple-500/20 text-purple-300';
    return 'bg-gray-500/10 border-gray-500/20 text-gray-300';
  };

  // ─── Derived data ──────────────────────────────────────────────
  const currentComparison = React.useMemo(() => {
    if (!selectedComparison || etfData.length === 0) return null;
    const map: Record<string, string[]> = { 'QQQ-SPY': ['QQQ', 'SPY'], 'VOO-VUG': ['VOO', 'VUG'], 'QQQ-VGT': ['QQQ', 'VGT'], 'IVV-VOO': ['IVV', 'VOO'], 'VOO-VTI': ['VOO', 'VTI'], 'JEPI-JEPQ': ['JEPI', 'JEPQ'] };
    const symbols = map[selectedComparison];
    if (!symbols) return null;
    return symbols.map(s => etfData.find(e => e.symbol === s)).filter(Boolean) as ETFData[];
  }, [selectedComparison, etfData]);

  const sortedSectors = React.useMemo(() => {
    const c = [...sectorData];
    if (sectorSort === 'performance') return c.sort((a, b) => getPerformanceValue(b) - getPerformanceValue(a));
    if (sectorSort === 'volume') return c.sort((a, b) => b.volume - a.volume);
    if (sectorSort === 'marketCap') return c.sort((a, b) => b.marketCap - a.marketCap);
    return c;
  }, [sectorData, sectorSort, selectedPeriod]);

  const projectedCycle = React.useMemo(() => {
    if (!economicData || !aiAnalysis) return null;
    const current = economicData.current.cycle.toLowerCase();
    const dir = aiAnalysis.direction.toLowerCase();
    if (dir === 'bullish') {
      if (/contraction|trough|stagflation/.test(current)) return 'Recovery';
      if (/recovery/.test(current)) return 'Expansion';
      return 'Expansion';
    }
    if (dir === 'bearish') {
      if (/expansion|peak/.test(current)) return 'Slowdown';
      if (/recovery/.test(current)) return 'Contraction';
      return 'Contraction';
    }
    if (dir === 'mixed') return 'Transition';
    return economicData.current.cycle;
  }, [economicData, aiAnalysis]);

  const riskBand = React.useMemo(() => {
    if (!economicData) return null;
    const inf = economicData.indicators?.inflation?.value || 0;
    const unemp = economicData.indicators?.unemployment?.value || 0;
    const gdp = economicData.indicators?.gdp?.value || 0;
    const score = (inf > 3.5 ? 2 : inf > 2.5 ? 1 : 0) + (unemp > 6 ? 2 : unemp > 4.5 ? 1 : 0) + (gdp < 1 ? 2 : gdp < 2 ? 1 : 0);
    if (score <= 1) return { label: 'Low', class: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    if (score === 2) return { label: 'Moderate', class: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    if (score === 3) return { label: 'Elevated', class: 'text-orange-400', bg: 'bg-orange-500/10' };
    return { label: 'High', class: 'text-red-400', bg: 'bg-red-500/10' };
  }, [economicData]);

  // Country cycle classification matrix
  const countryCycleMatrix = React.useMemo(() => {
    if (!countryData) return [] as Array<{ code: string; country: string; stage: string; growth: number; inflation: number; unemployment: number; rate: number; next: string; risk: string }>;
    return countryData.countries.map(c => {
      const g = c.gdp.growth;
      const inf = c.inflation.value;
      const u = c.unemployment.value;
      const r = c.interestRate.value;
      let stage = 'Neutral';
      if (g >= 3.5 && inf > 3 && u < 4) stage = 'Overheating';
      else if (g >= 2 && inf <= 3.2 && u <= 5) stage = 'Expansion';
      else if (g > 0.5 && (inf > 4 || r > 4.5)) stage = 'Slowdown';
      else if (g <= 0 && inf > 3.2 && u >= 5.5) stage = 'Stagflation';
      else if (g < 0 && u > 6) stage = 'Contraction';
      else if (g >= 0 && g < 1 && inf < 3 && u > 5) stage = 'Recovery';
      let next = 'Sideways';
      if (stage === 'Overheating') next = 'Policy Tightening → Slowdown';
      else if (stage === 'Expansion') next = inf > 3 ? 'Monitor Inflation' : 'Sustained Expansion';
      else if (stage === 'Slowdown') next = inf > 4 ? 'Disinflation Path' : 'Soft Landing Risk';
      else if (stage === 'Stagflation') next = 'Disinflation Needed';
      else if (stage === 'Contraction') next = inf < 3 ? 'Recovery Setup' : 'Further Weakness';
      else if (stage === 'Recovery') next = g > 0.8 ? 'Expansion Setup' : 'Early Recovery';
      const macroScore = (inf > 4 ? 2 : inf > 3 ? 1 : 0) + (u > 7 ? 2 : u > 5.5 ? 1 : 0) + (g < 0 ? 2 : g < 1 ? 1 : 0);
      const risk = macroScore <= 1 ? 'Low' : macroScore === 2 ? 'Moderate' : macroScore === 3 ? 'Elevated' : 'High';
      return { code: c.countryCode, country: c.country, stage, growth: g, inflation: inf, unemployment: u, rate: r, next, risk };
    });
  }, [countryData]);

  const stageColor = (s: string) => {
    const l = s.toLowerCase();
    if (l === 'expansion') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    if (l === 'overheating') return 'bg-orange-500/10 text-orange-300 border-orange-500/20';
    if (l === 'slowdown') return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    if (l === 'recovery') return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20';
    if (l === 'contraction') return 'bg-red-500/10 text-red-300 border-red-500/20';
    if (l === 'stagflation') return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
    return 'bg-gray-500/10 text-gray-300 border-gray-500/20';
  };
  const riskColor = (r: string) => {
    const l = r.toLowerCase();
    if (l === 'low') return 'text-emerald-300';
    if (l === 'moderate') return 'text-yellow-300';
    if (l === 'elevated') return 'text-orange-300';
    return 'text-red-400';
  };

  // Macro regime helpers
  function inferMacroRegime(g: number, cpi: number) {
    if (g <= 0 && cpi <= 2) return 'Deflation';
    if (g > 0 && g <= 2.5 && cpi <= 3) return 'Reflation';
    if (g > 2 && cpi > 3) return 'Inflation';
    if (g <= 1 && cpi > 3.2) return 'Stagflation';
    return g > 1.5 ? 'Expansion' : 'Neutral';
  }
  const regimeColor = (r: string) => {
    const k = r.toLowerCase();
    if (k === 'deflation') return { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/20' };
    if (k === 'reflation') return { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20' };
    if (k === 'inflation') return { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/20' };
    if (k === 'stagflation') return { bg: 'bg-red-500/10', text: 'text-red-300', border: 'border-red-500/20' };
    return { bg: 'bg-gray-500/10', text: 'text-gray-300', border: 'border-gray-500/20' };
  };

  // Inline MiniSparkline
  function MiniSparkline({ bars, color }: { bars: Array<{ time: number; close: number }>; color: string }) {
    const w = 80; const h = 20; const pad = 2;
    if (!bars || bars.length < 3) return <div className="w-20 h-5 bg-white/5 rounded" />;
    const closes = bars.map(b => b.close);
    const min = Math.min(...closes); const max = Math.max(...closes); const range = max - min || 1;
    const points = bars.map((b, i) => {
      const x = (i / (bars.length - 1)) * (w - pad * 2) + pad;
      const y = h - pad - ((b.close - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    }).join(' ');
    const last = closes[closes.length - 1];
    const first = closes[0];
    const up = last >= first;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-5 overflow-visible">
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={(w - pad)} cy={h - pad - ((last - min) / range) * (h - pad * 2)} r="1.5" fill={up ? color : '#94a3b8'} />
      </svg>
    );
  }

  // ─── Data Health Badge ─────────────────────────────────────────
  const healthCount = Object.values(dataHealth).filter(Boolean).length;
  const healthTotal = Object.keys(dataHealth).length;

  // ─── Loading / Error states ────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#060a13] flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 animate-spin" />
          <Zap className="absolute inset-0 m-auto w-6 h-6 text-blue-400" />
        </div>
        <p className="text-white/80 text-lg font-medium">Initializing AI Pulse</p>
        <p className="text-gray-500 text-sm mt-1">Loading market intelligence...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#060a13]">
      <div className="container mx-auto px-4 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors border border-white/[0.06] mb-8">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="bg-red-500/5 backdrop-blur-md rounded-2xl p-8 border border-red-500/10">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Unable to Load Data</h1>
          <p className="text-gray-400">{error}</p>
          <button onClick={() => { setError(''); setLoading(true); fetchSectorData(); }} className="mt-4 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg border border-red-500/20 transition-colors">
            Retry
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <LocalErrorBoundary fallbackTitle="AI Pulse section error">
      <RequirePlan min="free">
        <div className="min-h-screen bg-[#060a13] text-white">
          {/* ═══════ HEADER ═══════ */}
          <header className="sticky top-0 z-30 bg-[#060a13]/80 backdrop-blur-xl border-b border-white/[0.04]">
            <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors" title="Back to Dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold tracking-tight">AI Pulse</h1>
                    <p className="text-[10px] text-gray-500 hidden sm:block">Real-Time Market Intelligence Platform</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Data Health Indicator */}
                <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
                  {Object.entries(dataHealth).map(([key, ok]) => (
                    <div key={key} className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-gray-600'}`} title={`${key}: ${ok ? 'connected' : 'pending'}`} />
                  ))}
                  <span className="text-gray-500 ml-1">{healthCount}/{healthTotal}</span>
                </div>
                {/* Last Updated */}
                {lastUpdated && (
                  <span className="text-[11px] text-gray-500 hidden md:block">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {/* Refresh */}
                <button onClick={() => { fetchSectorData(); fetchEconomicData(); fetchCountryData(); fetchAIAnalysis(); fetchETFData(); fetchTopMovers(); }}
                  className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-400 hover:text-white transition-all"
                  disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 sm:px-6 py-6 space-y-6">

            {/* ═══════ GLOBAL MACRO SNAPSHOT ═══════ */}
            {countryData && (
              <Section>
                <SectionHeader
                  icon={<Globe className="w-5 h-5 text-blue-400" />}
                  title="Global Macro Snapshot"
                  badge="Live"
                  subtitle="World economy status and cycle position"
                />
                <div className="p-6">
                  {/* ── World Map ── */}
                  {countryCycleMatrix.length > 0 && (() => {
                    // Geographic coordinates (lon, lat) → SVG viewBox (0-1000, 0-500) using Mercator-like projection
                    const geoToSvg = (lon: number, lat: number): [number, number] => {
                      const x = ((lon + 180) / 360) * 1000;
                      const latRad = (lat * Math.PI) / 180;
                      const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
                      const y = 250 - (mercN / Math.PI) * 250;
                      return [Math.round(x), Math.round(Math.max(20, Math.min(480, y)))];
                    };
                    const countryCoords: Record<string, [number, number]> = {
                      US: [-98, 38], CA: [-106, 56], BR: [-51, -14], GB: [-1, 53], FR: [2, 47], DE: [10, 51],
                      IT: [12, 43], ES: [-4, 40], NL: [5, 52], CH: [8, 47], JP: [138, 36], CN: [104, 35],
                      IN: [79, 21], KR: [128, 36], AU: [134, -25],
                    };
                    const stageToColor = (s: string) => {
                      const l = s.toLowerCase();
                      if (l === 'expansion') return '#34d399';
                      if (l === 'overheating') return '#fb923c';
                      if (l === 'slowdown') return '#fbbf24';
                      if (l === 'recovery') return '#22d3ee';
                      if (l === 'contraction') return '#f87171';
                      if (l === 'stagflation') return '#c084fc';
                      return '#94a3b8';
                    };
                    return (
                      <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06] mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-semibold text-white">World Economic Map</span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            {[['Expansion', '#34d399'], ['Overheating', '#fb923c'], ['Slowdown', '#fbbf24'], ['Recovery', '#22d3ee'], ['Contraction', '#f87171'], ['Stagflation', '#c084fc'], ['Neutral', '#94a3b8']].map(([label, color]) => (
                              <div key={label} className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color as string }} />
                                <span className="text-[10px] text-gray-500">{label}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <svg viewBox="0 0 1000 500" className="w-full" style={{ aspectRatio: '2/1' }}>
                          <defs>
                            <radialGradient id="mapGlow">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                            </radialGradient>
                          </defs>
                          {/* Ocean background */}
                          <rect x="0" y="0" width="1000" height="500" fill="#060a13" rx="8" />
                          {/* Simplified continent outlines */}
                          {/* North America */}
                          <path d="M120,60 L180,55 L220,80 L260,90 L280,100 L290,120 L285,140 L270,160 L250,180 L240,200 L230,220 L220,230 L195,240 L170,255 L160,260 L150,240 L140,210 L135,190 L130,170 L128,150 L125,130 L120,105 Z" fill="#1e293b" fillOpacity="0.5" stroke="#334155" strokeWidth="0.8" />
                          {/* South America */}
                          <path d="M230,275 L260,265 L290,270 L310,280 L320,300 L325,330 L320,360 L310,385 L295,400 L280,410 L265,430 L255,445 L250,440 L240,420 L235,395 L230,370 L228,340 L225,310 L225,290 Z" fill="#1e293b" fillOpacity="0.5" stroke="#334155" strokeWidth="0.8" />
                          {/* Europe */}
                          <path d="M450,70 L475,65 L500,60 L530,65 L545,80 L550,95 L545,110 L540,125 L530,135 L515,145 L505,155 L490,160 L475,155 L460,145 L450,135 L445,120 L440,105 L442,85 Z" fill="#1e293b" fillOpacity="0.5" stroke="#334155" strokeWidth="0.8" />
                          {/* Africa */}
                          <path d="M460,175 L490,170 L530,175 L560,185 L575,210 L580,240 L575,270 L565,300 L555,330 L540,355 L520,370 L500,375 L480,365 L465,345 L455,320 L450,290 L448,260 L450,230 L452,200 Z" fill="#1e293b" fillOpacity="0.5" stroke="#334155" strokeWidth="0.8" />
                          {/* Asia */}
                          <path d="M560,55 L610,50 L660,55 L710,60 L760,70 L800,85 L820,100 L830,120 L825,150 L810,170 L790,185 L760,190 L730,200 L700,210 L670,215 L640,210 L615,200 L595,185 L580,170 L570,150 L565,130 L560,105 L558,80 Z" fill="#1e293b" fillOpacity="0.5" stroke="#334155" strokeWidth="0.8" />
                          {/* India subcontinent */}
                          <path d="M640,210 L665,200 L685,210 L690,235 L680,260 L665,275 L650,265 L640,245 L636,225 Z" fill="#1e293b" fillOpacity="0.5" stroke="#334155" strokeWidth="0.8" />
                          {/* Japan */}
                          <path d="M840,110 L848,100 L855,115 L850,130 L842,125 Z" fill="#1e293b" fillOpacity="0.5" stroke="#334155" strokeWidth="0.8" />
                          {/* Korea */}
                          <path d="M825,115 L832,108 L838,118 L833,126 L827,122 Z" fill="#1e293b" fillOpacity="0.5" stroke="#334155" strokeWidth="0.8" />
                          {/* Australia */}
                          <path d="M780,340 L830,330 L870,335 L890,350 L885,375 L870,395 L845,405 L820,400 L800,390 L785,375 L778,355 Z" fill="#1e293b" fillOpacity="0.5" stroke="#334155" strokeWidth="0.8" />
                          {/* Grid lines */}
                          {[100, 200, 300, 400].map(y => (
                            <line key={`h${y}`} x1="0" y1={y} x2="1000" y2={y} stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
                          ))}
                          {[200, 400, 600, 800].map(x => (
                            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="500" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
                          ))}
                          {/* Equator */}
                          <line x1="0" y1="250" x2="1000" y2="250" stroke="#334155" strokeWidth="0.4" strokeDasharray="6 4" strokeOpacity="0.3" />
                          {/* Country markers */}
                          {countryCycleMatrix.map((row) => {
                            const coord = countryCoords[row.code];
                            if (!coord) return null;
                            const [cx, cy] = geoToSvg(coord[0], coord[1]);
                            const fill = stageToColor(row.stage);
                            const isSel = selectedCountry === row.code;
                            const fmt = (v: number, d = 1) => Number.isFinite(v) ? v.toFixed(d) : '—';
                            return (
                              <g key={`map-${row.code}`} onClick={() => setSelectedCountry(isSel ? null : row.code)} style={{ cursor: 'pointer' }}>
                                <title>{`${row.country} · ${row.stage}\nGDP ${fmt(row.growth)}% · CPI ${fmt(row.inflation)}% · Unemp ${fmt(row.unemployment)}%\nRate ${fmt(row.rate, 2)}% · Risk: ${row.risk}`}</title>
                                {/* Glow ring */}
                                <circle cx={cx} cy={cy} r={isSel ? 22 : 16} fill={fill} fillOpacity={isSel ? 0.12 : 0.06} />
                                {isSel && <circle cx={cx} cy={cy} r="28" fill="none" stroke={fill} strokeOpacity="0.3" strokeWidth="1" />}
                                {/* Marker */}
                                <circle cx={cx} cy={cy} r={isSel ? 8 : 6} fill={fill} fillOpacity="0.9" stroke={isSel ? '#fff' : fill} strokeWidth={isSel ? 2 : 1} strokeOpacity={isSel ? 0.8 : 0.4} />
                                {/* Label */}
                                <text x={cx} y={cy - (isSel ? 14 : 11)} textAnchor="middle" fontSize={isSel ? '11' : '9'} fill={isSel ? '#fff' : '#94a3b8'} fontWeight={isSel ? '700' : '600'}>
                                  {row.code}
                                </text>
                                {/* Selected detail badge */}
                                {isSel && (
                                  <g>
                                    <rect x={cx + 12} y={cy - 20} width="90" height="38" rx="6" fill="rgba(2,6,23,0.95)" stroke={fill} strokeWidth="0.8" />
                                    <text x={cx + 17} y={cy - 6} fontSize="9" fill="#e2e8f0" fontWeight="600">{row.stage}</text>
                                    <text x={cx + 17} y={cy + 7} fontSize="8" fill="#94a3b8">GDP {fmt(row.growth)}% · CPI {fmt(row.inflation)}%</text>
                                  </g>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })()}

                  {/* Cycle Curve */}
                  {(() => {
                    const g = countryData?.global?.averageGrowth ?? 0;
                    const cpi = countryData?.global?.averageInflation ?? 0;
                    const regime = inferMacroRegime(g, cpi);
                    const rc = regimeColor(regime);

                    return (
                      <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${rc.bg} ${rc.text} ${rc.border}`}>{regime}</span>
                            <span className="text-xs text-gray-500">GDP {g.toFixed(1)}% · CPI {cpi.toFixed(1)}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {selectedCountry && (
                              <button onClick={() => setSelectedCountry(null)} className="text-[11px] text-gray-400 hover:text-white transition-colors">Clear ({selectedCountry})</button>
                            )}
                            <span className="text-[10px] uppercase tracking-widest text-gray-600">Cycle Position</span>
                          </div>
                        </div>

                        <svg viewBox="0 0 1000 180" className="w-full h-36">
                          {/* Grid lines */}
                          <line x1="0" y1="90" x2="1000" y2="90" stroke="#1e293b" strokeDasharray="4 6" />
                          <line x1="250" y1="10" x2="250" y2="170" stroke="#1e293b" strokeDasharray="2 8" strokeOpacity="0.3" />
                          <line x1="500" y1="10" x2="500" y2="170" stroke="#1e293b" strokeDasharray="2 8" strokeOpacity="0.3" />
                          <line x1="750" y1="10" x2="750" y2="170" stroke="#1e293b" strokeDasharray="2 8" strokeOpacity="0.3" />
                          {/* Curve */}
                          <path d="M0,140 C 150,20 350,20 500,90 S 850,160 1000,40" fill="none" stroke="url(#curveGrad)" strokeWidth="2.5" strokeLinecap="round" />
                          <defs>
                            <linearGradient id="curveGrad" x1="0" y1="0" x2="1000" y2="0" gradientUnits="userSpaceOnUse">
                              <stop offset="0%" stopColor="#60A5FA" />
                              <stop offset="35%" stopColor="#34D399" />
                              <stop offset="65%" stopColor="#FBBF24" />
                              <stop offset="100%" stopColor="#F87171" />
                            </linearGradient>
                          </defs>
                          {/* Phase labels */}
                          <text x="80" y="172" fontSize="11" fill="#475569" fontWeight="500">Deflation</text>
                          <text x="345" y="22" fontSize="11" fill="#475569" fontWeight="500">Reflation</text>
                          <text x="680" y="22" fontSize="11" fill="#475569" fontWeight="500">Inflation</text>
                          <text x="880" y="172" fontSize="11" fill="#475569" fontWeight="500">Stagflation</text>
                          {/* Current regime marker */}
                          {(() => {
                            let mx = 120, my = 120;
                            if (regime === 'Reflation') { mx = 420; my = 70; }
                            else if (regime === 'Inflation') { mx = 730; my = 70; }
                            else if (regime === 'Stagflation') { mx = 920; my = 120; }
                            else if (regime === 'Expansion') { mx = 550; my = 85; }
                            return (
                              <g>
                                <circle cx={mx} cy={my} r="18" fill="transparent" stroke="#F59E0B" strokeOpacity="0.15" />
                                <circle cx={mx} cy={my} r="12" fill="transparent" stroke="#F59E0B" strokeOpacity="0.25" />
                                <circle cx={mx} cy={my} r="5" fill="#F59E0B" />
                              </g>
                            );
                          })()}
                          {/* Country markers */}
                          {countryCycleMatrix.slice(0, 30).map((row, idx) => {
                            const fmt = (v: number, d: number = 1) => Number.isFinite(v) ? v.toFixed(d) : '—';
                            const s = row.stage.toLowerCase();
                            let ax = 110, ay = 120;
                            if (s === 'recovery' || s === 'neutral') { ax = 380; ay = 90; }
                            if (s === 'expansion') { ax = 700; ay = 70; }
                            if (s === 'overheating') { ax = 760; ay = 65; }
                            if (s === 'slowdown') { ax = 860; ay = 110; }
                            if (s === 'stagflation') { ax = 910; ay = 120; }
                            if (s === 'contraction') { ax = 120; ay = 130; }
                            const col = idx % 10; const rowi = Math.floor(idx / 10);
                            const x = ax + col * 22;
                            const y = ay + (rowi % 2 === 0 ? -8 : 8);
                            const title = `${row.country} · ${row.stage} | GDP ${fmt(row.growth, 1)}% | CPI ${fmt(row.inflation, 1)}% | Unemp ${fmt(row.unemployment, 1)}% | Rate ${fmt(row.rate, 2)}% | ${row.next} | Risk ${row.risk}`;
                            const isSel = selectedCountry === row.code;
                            return (
                              <g key={row.code} onClick={() => setSelectedCountry(isSel ? null : row.code)} style={{ cursor: 'pointer' }}>
                                <title>{title}</title>
                                <circle cx={x} cy={y} r={isSel ? '8' : '6'} fill={isSel ? '#F59E0B' : '#0f172a'} stroke={isSel ? '#FBBF24' : '#334155'} strokeWidth={isSel ? '1.5' : '1'} />
                                {isSel && (
                                  <g>
                                    <circle cx={x} cy={y} r="13" fill="transparent" stroke="#F59E0B" strokeOpacity="0.4" />
                                    <circle cx={x} cy={y} r="18" fill="transparent" stroke="#F59E0B" strokeOpacity="0.2" />
                                  </g>
                                )}
                                {(() => {
                                  const lx = Math.min(x + 12, 954);
                                  const ly = y - 9;
                                  return (
                                    <g>
                                      <rect x={lx} y={ly - 7} width="48" height="18" rx="6" ry="6" fill="rgba(2,6,23,0.95)" stroke={isSel ? '#F59E0B' : '#1e293b'} />
                                      <text x={lx + 6} y={ly + 5} fontSize="12" textAnchor="start">{getCountryFlag(row.code)}</text>
                                      <text x={lx + 24} y={ly + 5} fontSize="10" fill={isSel ? '#FFF7ED' : '#94a3b8'} fontWeight="600">{row.code}</text>
                                    </g>
                                  );
                                })()}
                              </g>
                            );
                          })}
                        </svg>

                        {/* Country pills */}
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {countryCycleMatrix.slice(0, 18).map((row) => {
                            const active = selectedCountry === row.code;
                            return (
                              <button key={`leg-${row.code}`} onClick={() => setSelectedCountry(active ? null : row.code)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] border transition-all duration-200 ${active ? 'bg-amber-500/15 border-amber-400/30 text-amber-100 shadow-sm shadow-amber-500/10' : 'bg-white/[0.02] border-white/[0.06] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'}`}>
                                <span className="mr-1">{getCountryFlag(row.code)}</span>
                                <span className="font-semibold">{row.code}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Global Economic Cycle Matrix Table */}
                  {countryCycleMatrix.length > 0 && (
                    <div className="mt-6">
                      <button onClick={() => setShowCountryMatrix(!showCountryMatrix)}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors mb-3">
                        {showCountryMatrix ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Global Economic Cycle Matrix
                        <span className="text-[10px] font-normal uppercase tracking-widest text-gray-600 ml-1">Heuristic</span>
                      </button>

                      {showCountryMatrix && (
                        <div className="overflow-auto rounded-xl border border-white/[0.06]">
                          <table className="w-full text-xs min-w-[860px]">
                            <thead>
                              <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[10px] text-gray-500 uppercase tracking-wider">
                                <th className="text-left py-3 px-3 font-medium">Country</th>
                                <th className="text-left py-3 px-3 font-medium">Stage</th>
                                <th className="text-right py-3 px-3 font-medium">GDP %</th>
                                <th className="text-right py-3 px-3 font-medium">Inflation %</th>
                                <th className="text-right py-3 px-3 font-medium">Unemp %</th>
                                <th className="text-right py-3 px-3 font-medium">Rate %</th>
                                <th className="text-left py-3 px-3 font-medium">3M Outlook</th>
                                <th className="text-left py-3 px-3 font-medium">Risk</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                              {countryCycleMatrix.map(row => {
                                const active = selectedCountry === row.code;
                                return (
                                  <tr key={row.code} onClick={() => setSelectedCountry(active ? null : row.code)}
                                    className={`hover:bg-white/[0.03] transition-colors cursor-pointer ${active ? 'bg-amber-500/5 ring-1 ring-amber-400/20' : ''}`}>
                                    <td className="py-2.5 px-3 font-medium">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm leading-none">{getCountryFlag(row.code)}</span>
                                        <span className="text-gray-200">{row.country}</span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-md border text-[10px] font-medium ${stageColor(row.stage)}`}>{row.stage}</span></td>
                                    <td className={`py-2.5 px-3 text-right font-mono tabular-nums ${row.growth >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{row.growth.toFixed(1)}</td>
                                    <td className={`py-2.5 px-3 text-right font-mono tabular-nums ${row.inflation > 4 ? 'text-red-300' : row.inflation > 3 ? 'text-amber-300' : 'text-emerald-300'}`}>{row.inflation.toFixed(1)}</td>
                                    <td className={`py-2.5 px-3 text-right font-mono tabular-nums ${row.unemployment > 7 ? 'text-red-300' : row.unemployment > 5.5 ? 'text-amber-300' : 'text-emerald-300'}`}>{row.unemployment.toFixed(1)}</td>
                                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-gray-400">{Number.isFinite(row.rate) ? row.rate.toFixed(2) : '—'}</td>
                                    <td className="py-2.5 px-3 text-gray-400 max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis" title={row.next}>{row.next}</td>
                                    <td className={`py-2.5 px-3 font-semibold ${riskColor(row.risk)}`}>{row.risk}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <p className="mt-2 text-[10px] text-gray-600 leading-snug">Stages & outlook computed via deterministic macro thresholds (GDP, CPI, Unemployment, Policy Rate). Forward 3M outlook is heuristic guidance.</p>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* ═══════ ADVANCED CHART (Yahoo Finance Style) ═══════ */}
            <Section>
              <div className="px-3 pt-3 pb-1">
                <AdvancedChart symbol="SPY" height={600} />
              </div>
            </Section>

            {/* ═══════ MARKET CATEGORIES ═══════ */}
            <Section>
              <div className="p-1">
                <MarketCategoriesEmbed />
              </div>
            </Section>

            {/* ═══════ WATCHLIST ═══════ */}
            <WatchlistPanel />

            {/* ═══════ AI ECONOMIC ANALYSIS ═══════ */}
            {aiAnalysis && (
              <Section>
                <SectionHeader
                  icon={<Target className="w-5 h-5 text-purple-400" />}
                  title="AI Economic Analysis"
                  badge={aiMeta?.fallback ? 'Fallback' : 'AI'}
                  subtitle="Machine learning-driven market outlook and cycle projection"
                  actions={aiLoading ? <RefreshCw className="w-4 h-4 animate-spin text-gray-500" /> : undefined}
                />
                <div className="p-6 space-y-6">
                  {/* Direction / Confidence / Timeframe cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`rounded-xl p-5 border ${getAIDirectionDisplay(aiAnalysis.direction).bg}`}>
                      <div className="flex items-center gap-3 mb-3">
                        {getAIDirectionDisplay(aiAnalysis.direction).icon}
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Market Direction</span>
                      </div>
                      <p className={`text-2xl font-bold capitalize ${getAIDirectionDisplay(aiAnalysis.direction).color}`}>{aiAnalysis.direction}</p>
                    </div>
                    <div className="rounded-xl p-5 border border-white/[0.06] bg-white/[0.02]">
                      <div className="flex items-center gap-3 mb-3">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Confidence</span>
                      </div>
                      <div className="flex items-end gap-3">
                        <p className="text-2xl font-bold text-blue-400 tabular-nums">{aiAnalysis.confidence}%</p>
                        <div className="flex-1 mb-2">
                          <div className="bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-full transition-all duration-700" style={{ width: `${aiAnalysis.confidence}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl p-5 border border-white/[0.06] bg-white/[0.02]">
                      <div className="flex items-center gap-3 mb-3">
                        <Calendar className="w-5 h-5 text-emerald-400" />
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Timeframe</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-400">{aiAnalysis.timeframe}</p>
                    </div>
                  </div>

                  {/* Expected Regime Callout */}
                  <div className={`rounded-xl p-5 border ${getProjectedCycleStyle(projectedCycle || undefined)}`}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5" />
                        <div>
                          <h3 className="font-semibold text-sm">Expected Regime — Next 3–6 Months</h3>
                          <p className="text-xs opacity-70 mt-0.5">Based on FRED snapshot + AI directional signal</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold capitalize">{projectedCycle || '—'}</p>
                        <p className="text-xs opacity-70">Confidence {aiAnalysis.confidence ?? 0}%</p>
                      </div>
                    </div>
                  </div>

                  {/* AI Summary */}
                  {aiAnalysis.summary && (
                    <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">AI Summary</h3>
                      <p className="text-gray-300 leading-relaxed text-sm">{aiAnalysis.summary}</p>
                      {aiMeta?.fallback && <p className="mt-3 text-xs text-amber-400/80">Analysis generated from fallback template due to AI service issue.</p>}
                    </div>
                  )}

                  {/* Cycle Snapshot Table */}
                  {(economicData || aiAnalysis) && (
                    <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
                      <div className="px-5 py-4 border-b border-white/[0.04]">
                        <h3 className="text-sm font-semibold text-gray-300">Cycle Snapshot & 3-Month AI Outlook</h3>
                      </div>
                      <div className="overflow-auto">
                        <table className="w-full text-sm min-w-[640px]">
                          <thead>
                            <tr className="border-b border-white/[0.04] text-[10px] uppercase tracking-wider text-gray-500">
                              <th className="text-left py-3 px-5 font-medium">Metric</th>
                              <th className="text-left py-3 px-3 font-medium">Current</th>
                              <th className="text-left py-3 px-3 font-medium">AI (Now)</th>
                              <th className="text-left py-3 px-3 font-medium">Projected 3M</th>
                              <th className="text-left py-3 px-3 font-medium">Confidence</th>
                              <th className="text-left py-3 px-3 font-medium">Risk Band</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            <tr className="hover:bg-white/[0.02]">
                              <td className="py-3 px-5 font-medium text-gray-200">Cycle Phase</td>
                              <td className="py-3 px-3 text-gray-300">{economicData?.current.cycle || '—'}</td>
                              <td className="py-3 px-3 text-gray-300 capitalize">{aiAnalysis?.currentCycle || economicData?.current.cycle || '—'}</td>
                              <td className={`py-3 px-3 font-semibold ${projectedCycle === 'Expansion' ? 'text-emerald-400' : projectedCycle === 'Recovery' ? 'text-cyan-400' : projectedCycle === 'Slowdown' ? 'text-amber-400' : projectedCycle === 'Contraction' ? 'text-red-400' : projectedCycle === 'Transition' ? 'text-purple-400' : 'text-gray-400'}`}>{projectedCycle || '—'}</td>
                              <td className="py-3 px-3 text-gray-400 tabular-nums">{aiAnalysis?.confidence ? `${aiAnalysis.confidence}%` : '—'}</td>
                              <td className={`py-3 px-3 font-semibold ${riskBand?.class || ''}`}>{riskBand?.label || '—'}</td>
                            </tr>
                            <tr className="hover:bg-white/[0.02]">
                              <td className="py-3 px-5 font-medium text-gray-200">Growth Trend</td>
                              <td className="py-3 px-3 text-gray-300">{economicData?.current.growth}</td>
                              <td className="py-3 px-3 text-gray-400">{aiAnalysis?.direction}</td>
                              <td className="py-3 px-3 text-gray-400">{projectedCycle ? (projectedCycle === 'Expansion' ? 'Stronger' : 'Adjusted') : '—'}</td>
                              <td className="py-3 px-3 text-gray-400">{aiAnalysis?.timeframe || '—'}</td>
                              <td className="py-3 px-3 text-gray-400 tabular-nums">GDP {economicData?.indicators?.gdp?.value?.toFixed ? economicData.indicators.gdp.value.toFixed(1) : '—'}%</td>
                            </tr>
                            <tr className="hover:bg-white/[0.02]">
                              <td className="py-3 px-5 font-medium text-gray-200">Inflation Regime</td>
                              <td className="py-3 px-3 text-gray-300">{economicData?.current.inflation}</td>
                              <td className="py-3 px-3 text-gray-400 tabular-nums">{(economicData?.indicators?.inflation?.value || '—')}%</td>
                              <td className="py-3 px-3 text-gray-400">{projectedCycle ? (projectedCycle === 'Expansion' ? 'Stable to Moderate' : 'Monitor') : '—'}</td>
                              <td className="py-3 px-3 text-gray-400 tabular-nums">Fed {economicData?.indicators?.fedRate?.value?.toFixed ? economicData.indicators.fedRate.value.toFixed(2) : '—'}%</td>
                              <td className="py-3 px-3 text-gray-400 tabular-nums">Unemp {economicData?.indicators?.unemployment?.value?.toFixed ? economicData.indicators.unemployment.value.toFixed(1) : '—'}%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="px-5 py-3 border-t border-white/[0.04]">
                        <p className="text-[10px] text-gray-600">Projection combines current macro phase (FRED snapshot) with AI directional signal. Forward-looking view is probabilistic.</p>
                      </div>
                    </div>
                  )}

                  {/* Key Factors / Risks / Opportunities */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {aiAnalysis.keyFactors?.length > 0 && (
                      <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-400" /> Key Factors
                        </h3>
                        <ul className="space-y-2.5">
                          {aiAnalysis.keyFactors.slice(0, 3).map((f, i) => (
                            <li key={i} className="text-gray-300 text-sm flex gap-2 leading-relaxed">
                              <span className="w-1 h-1 rounded-full bg-blue-400 mt-2 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiAnalysis.risks?.length > 0 && (
                      <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" /> Key Risks
                        </h3>
                        <ul className="space-y-2.5">
                          {aiAnalysis.risks.slice(0, 3).map((r, i) => (
                            <li key={i} className="text-gray-300 text-sm flex gap-2 leading-relaxed">
                              <span className="w-1 h-1 rounded-full bg-red-400 mt-2 shrink-0" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiAnalysis.opportunities?.length > 0 && (
                      <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4 text-emerald-400" /> Opportunities
                        </h3>
                        <ul className="space-y-2.5">
                          {aiAnalysis.opportunities.slice(0, 3).map((o, i) => (
                            <li key={i} className="text-gray-300 text-sm flex gap-2 leading-relaxed">
                              <span className="w-1 h-1 rounded-full bg-emerald-400 mt-2 shrink-0" />
                              <span>{o}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            )}

            {/* ═══════ ETF COMPARISON TOOL ═══════ */}
            {etfData.length > 0 && (
              <Section>
                <SectionHeader
                  icon={<PieChart className="w-5 h-5 text-cyan-400" />}
                  title="ETF Comparison Tool"
                  badge="Snapshot"
                  subtitle="Compare performance, spread, and fundamentals across major ETFs"
                />
                <div className="p-6 space-y-6">
                  {/* Pair Selection */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {[
                      { key: 'QQQ-SPY', label: 'QQQ vs SPY' },
                      { key: 'VOO-VUG', label: 'VOO vs VUG' },
                      { key: 'QQQ-VGT', label: 'QQQ vs VGT' },
                      { key: 'IVV-VOO', label: 'IVV vs VOO' },
                      { key: 'VOO-VTI', label: 'VOO vs VTI' },
                      { key: 'JEPI-JEPQ', label: 'JEPI vs JEPQ' },
                    ].map(c => (
                      <button key={c.key} onClick={() => setSelectedComparison(c.key)}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${selectedComparison === c.key
                          ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-200 shadow-sm shadow-cyan-500/10'
                          : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                          }`}>
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {/* Range & Spread Type Controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded-lg p-0.5">
                      {(['1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'max'] as const).map(r => (
                        <button key={r} onClick={() => setEtfRange(r)}
                          className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${etfRange === r ? 'bg-cyan-500/20 text-cyan-200' : 'text-gray-500 hover:text-gray-300'}`}>
                          {r.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded-lg p-0.5">
                      {(['percent', 'absolute'] as const).map(t => (
                        <button key={t} onClick={() => setEtfSpreadType(t)}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${etfSpreadType === t ? 'bg-cyan-500/20 text-cyan-200' : 'text-gray-500 hover:text-gray-300'}`}>
                          {t === 'percent' ? '% Spread' : '$ Spread'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Spread Chart + Detail Table */}
                  {selectedComparison && currentComparison && currentComparison.length >= 2 && (
                    <div className="space-y-4">
                      <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-gray-200">Spread over Time <span className="text-gray-500 font-normal">({selectedComparison.replace('-', ' − ')})</span></h4>
                        </div>
                        <div className="h-80">
                          {etfSeriesLoading ? (
                            <div className="w-full h-full animate-pulse bg-white/[0.03] rounded-lg" />
                          ) : (
                            <ETFLineChartLazy mode="spread" data={etfSeries as any} spreadType={etfSpreadType} />
                          )}
                        </div>
                        <p className="mt-3 text-[10px] text-gray-600">Spread = {etfSpreadType === 'percent' ? '100 × (A / B − 1)' : 'A − B'}. Range {etfRange.toUpperCase()}, daily bars.</p>
                      </div>

                      <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/[0.04]">
                          <h4 className="text-sm font-semibold text-gray-300">Detailed Comparison</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/[0.04] text-[10px] uppercase tracking-wider text-gray-500">
                                <th className="text-left py-3 px-4 font-medium">Symbol</th>
                                <th className="text-right py-3 px-3 font-medium">Price</th>
                                <th className="text-right py-3 px-3 font-medium">Change</th>
                                <th className="text-right py-3 px-3 font-medium">Volume</th>
                                <th className="text-right py-3 px-3 font-medium">High</th>
                                <th className="text-right py-3 px-3 font-medium">Low</th>
                                <th className="text-right py-3 px-3 font-medium">YTD</th>
                                <th className="text-right py-3 px-3 font-medium">Expense</th>
                                <th className="text-right py-3 px-3 font-medium">Volatility</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                              {currentComparison.map(etf => (
                                <tr key={etf.symbol} className="hover:bg-white/[0.02]">
                                  <td className="py-3 px-4 font-semibold text-white">{etf.symbol}</td>
                                  <td className="py-3 px-3 text-right font-mono tabular-nums text-gray-200">{typeof etf.price === 'number' ? `$${etf.price.toFixed(2)}` : '—'}</td>
                                  <td className={`py-3 px-3 text-right font-mono tabular-nums font-medium ${getPerformanceColor(etf.change)}`}>{typeof etf.change === 'number' ? (etf.change >= 0 ? '+' : '') + etf.change.toFixed(2) + '%' : '—'}</td>
                                  <td className="py-3 px-3 text-right font-mono tabular-nums text-gray-400">{typeof etf.volume === 'number' ? etf.volume.toLocaleString() : '—'}</td>
                                  <td className="py-3 px-3 text-right font-mono tabular-nums text-gray-400">{typeof etf.high === 'number' ? `$${etf.high.toFixed(2)}` : '—'}</td>
                                  <td className="py-3 px-3 text-right font-mono tabular-nums text-gray-400">{typeof etf.low === 'number' ? `$${etf.low.toFixed(2)}` : '—'}</td>
                                  <td className={`py-3 px-3 text-right font-mono tabular-nums font-medium ${getPerformanceColor(etf.ytdReturn)}`}>{typeof etf.ytdReturn === 'number' ? (etf.ytdReturn >= 0 ? '+' : '') + etf.ytdReturn.toFixed(2) + '%' : '—'}</td>
                                  <td className="py-3 px-3 text-right font-mono tabular-nums text-gray-400">{typeof etf.expense === 'number' ? etf.expense.toFixed(2) + '%' : '—'}</td>
                                  <td className="py-3 px-3 text-right font-mono tabular-nums text-gray-400">{typeof etf.volatility === 'number' ? etf.volatility.toFixed(2) + '%' : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* ═══════ ECONOMIC CALENDAR ═══════ */}
            <Section>
              <SectionHeader
                icon={<Calendar className="w-5 h-5 text-cyan-400" />}
                title="Economic Calendar"
                badge="Next 2–4 Weeks"
                subtitle="Upcoming macro events and announcements"
              />
              <div className="p-4">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                  <EconomicCalendar />
                </div>
              </div>
            </Section>

            {/* ═══════ LATEST NEWS ═══════ */}
            <Section className="max-w-3xl">
              <SectionHeader
                icon={<Radio className="w-5 h-5 text-indigo-400" />}
                title="Latest News"
                badge="Global"
                subtitle="Real-time financial headlines"
              />
              <div className="p-5">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  {React.createElement(dynamic(() => import('@/components/NewsWidget'), { ssr: false }))}
                </div>
              </div>
            </Section>

          </main>

          <Footer />
        </div>
      </RequirePlan>
    </LocalErrorBoundary>
  );
}
