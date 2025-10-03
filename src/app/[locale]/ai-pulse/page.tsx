'use client';

import React, { useState, useEffect } from 'react';
import Footer from '@/components/Footer';
import RequirePlan from '@/components/RequirePlan';
import Link from 'next/link';
import { TrendingUp, TrendingDown, BarChart3, Target, RefreshCw, ArrowLeft, Calendar, Clock, Activity, Globe, DollarSign, Briefcase, PieChart } from 'lucide-react';
import dynamic from 'next/dynamic';
const MarketCategoriesEmbed = dynamic(()=> import('@/components/analytics/MarketCategoriesEmbed'), { ssr:false });
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
// Calendars
const EconomicCalendar = dynamic(() => import('@/components/analytics/EconomicCalendar').then(m=>m.EconomicCalendar), { ssr:false })
const EarningsCalendar = dynamic(() => import('@/components/analytics/EarningsCalendar').then(m=>m.EarningsCalendar), { ssr:false })

// Types
interface SectorPerformance { sector:string; daily:number; weekly:number; monthly:number; quarterly:number; yearly:number; marketCap:number; volume:number; topStocks:string[] }
interface CountryIndicators { country:string; countryCode:string; gdp:{value:number;growth:number;date:string}; inflation:{value:number;date:string}; unemployment:{value:number;date:string}; interestRate:{value:number;date:string}; currency:{code:string;usdRate:number}; marketCap:number; population:number; creditRating:string }
interface CountryData { countries:CountryIndicators[]; global:{ totalGdp:number; averageGrowth:number; averageInflation:number; averageUnemployment:number; totalCountries:number }; lastUpdated:string }
interface EconomicCycle { current:{cycle:string;growth:string;inflation:string;confidence:number}; indicators:{ gdp:{value:number;date:string}; inflation:{value:number;date:string}; unemployment:{value:number;date:string}; fedRate:{value:number;date:string} }; analysis:string; lastUpdated:string }
interface AIEconomicAnalysis { currentCycle:string; direction:'bullish'|'bearish'|'neutral'|'mixed'; confidence:number; timeframe:string; keyFactors:string[]; risks:string[]; opportunities:string[]; summary:string; recommendation:string }
interface ETFData { symbol:string; name:string; category:string; price:number; change:number; volume:number; high:number; low:number; open:number; expense:number; volatility:number; trend:string; momentum:string; marketCap:number; ytdReturn:number; peRatio:number; dividend:number; beta:number; timestamp:string }

const getCountryFlag = (code:string) => ({ US:'🇺🇸', CN:'🇨🇳', DE:'🇩🇪', JP:'🇯🇵', IN:'🇮🇳', GB:'🇬🇧', FR:'🇫🇷', CA:'🇨🇦', IT:'🇮🇹', AU:'🇦🇺', BR:'🇧🇷', KR:'🇰🇷', ES:'🇪🇸', NL:'🇳🇱', CH:'🇨🇭' }[code] || '🏳️');

export default function AIPulsePage({ params }: { params: Promise<{ locale: string }> }) {
  // Data state
  const [sectorData, setSectorData] = useState<SectorPerformance[]>([]);
  const [economicData, setEconomicData] = useState<EconomicCycle | null>(null);
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIEconomicAnalysis | null>(null);
  const [aiMeta, setAiMeta] = useState<{ realtime:boolean; dataSource:string; fallback:boolean }|null>(null);
  const [etfData, setEtfData] = useState<ETFData[]>([]);
  const [selectedComparison, setSelectedComparison] = useState('');
  // ETF comparison enhancements
  const [etfCompareMode, setEtfCompareMode] = useState<'value'|'spread'>('spread');
  const [etfSpreadType, setEtfSpreadType] = useState<'percent'|'absolute'>('percent');
  const [etfRange, setEtfRange] = useState<'1mo'|'3mo'|'6mo'|'1y'|'2y'|'5y'|'10y'|'max'>('3mo');
  const [etfSeries, setEtfSeries] = useState<Array<{ time:number; a?:number; b?:number; spread?:number }>>([]);
  const [etfSeriesLoading, setEtfSeriesLoading] = useState(false);
  const [topMovers, setTopMovers] = useState<Array<{symbol:string;price:number;changePercent:number}>>([]);
  const [bottomMovers, setBottomMovers] = useState<Array<{symbol:string;price:number;changePercent:number}>>([]);
  // Risk regime & ratios (moved here from Market DNA)
  type RiskSignal = { key:string; label:string; dir:'risk-on'|'risk-off'|'neutral'; note?:string };
  const [riskRatios, setRiskRatios] = useState<Record<string, number>>({});
  const [riskSummary, setRiskSummary] = useState<null | { regime:'Risk-On'|'Risk-Off'|'Neutral'; votes:{ on:number; off:number; neutral:number }; score:number; signals:RiskSignal[] }>(null);
  const [recessionIndex, setRecessionIndex] = useState<null | { date:string; value:number }>(null);
  const [recessionSeries, setRecessionSeries] = useState<Array<{ date:string; value:number }>>([]);
  const mspredRisk = React.useMemo(()=>{
    if (!recessionIndex) return null;
    const v = recessionIndex.value;
    // Heuristic: lower ratio => higher recession risk (HY OAS spikes widen denominator)
    if (v < 0.15) return { level:'High', badge:'bg-red-900/30 text-red-300', text:'text-red-300' };
    if (v < 0.25) return { level:'Elevated', badge:'bg-orange-900/30 text-orange-300', text:'text-orange-300' };
    if (v < 0.4) return { level:'Moderate', badge:'bg-yellow-900/30 text-yellow-300', text:'text-yellow-300' };
    return { level:'Low', badge:'bg-emerald-900/30 text-emerald-300', text:'text-emerald-300' };
  }, [recessionIndex]);
  const mspredDelta = React.useMemo(()=>{
    if (!recessionIndex || recessionSeries.length < 5) return null;
    const last = recessionIndex.value;
    const len = recessionSeries.length;
    const window = Math.min(20, len);
    let sum = 0; for (let i=len-window; i<len; i++) sum += recessionSeries[i].value;
    const sma = sum / window;
    const diff = last - sma; // positive = improving (lower risk)
    return { sma, diff };
  }, [recessionIndex, recessionSeries]);
  // Sparkline state (compact history for movers)
  type SparkBar = { time:number; close:number };
  const [sparks, setSparks] = useState<Record<string, SparkBar[]>>({});
  const [sparkLoading, setSparkLoading] = useState(false);
  const [showCountryMatrix, setShowCountryMatrix] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // UX state
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily'|'weekly'|'monthly'|'quarterly'|'yearly'>('daily');
  // Nuova barra timeframe: 1D,1W,1M,3M,6M,YTD,52W (le ultime tre mappano provvisoriamente su 'yearly')
  type TimeframeKey = '1D'|'1W'|'1M'|'3M'|'6M'|'YTD'|'52W';
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeKey>('1D');
  const timeframeToPeriod: Record<TimeframeKey, typeof selectedPeriod> = {
    '1D':'daily',
    '1W':'weekly',
    '1M':'monthly',
    '3M':'quarterly',
    '6M':'yearly',
    'YTD':'yearly',
    '52W':'yearly'
  };
  useEffect(()=> { setSelectedPeriod(timeframeToPeriod[selectedTimeframe]); }, [selectedTimeframe]);
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [syncMoversWithPeriod, setSyncMoversWithPeriod] = useState(false);

  // Enhancements
  const [sectorSort, setSectorSort] = useState<'performance'|'volume'|'marketCap'>('performance');
  const [sectorView, setSectorView] = useState<'bar'|'multi'>('bar');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarketDetails, setShowMarketDetails] = useState(false);
  const [etfMetric, setEtfMetric] = useState<'price'|'change'|'volume'|'ytdReturn'|'expense'|'volatility'>('price');
  const [dataHealth, setDataHealth] = useState({ sector:false, economic:false, ai:false, etf:false, country:false });
  // Commodities placeholder removed (restored pre-tabs)


  // Fetchers
  const fetchCountryData = async () => { try { const r = await fetch('/api/country-data'); if(!r.ok) throw new Error('country'); const j = await r.json(); setCountryData(j.data); setDataHealth(h=>({...h,country:!!j.data})); } catch(e){ console.error(e);} };
  const fetchSectorData = async () => { try { setRefreshing(true); const r = await fetch('/api/sector-performance'); if(!r.ok) throw new Error('sector'); const j = await r.json(); const sectors = j.sectors||[]; setSectorData(sectors); setDataHealth(h=>({...h,sector:sectors.length>0})); setLastUpdated(j.lastUpdated || new Date().toISOString()); setError(''); } catch(e){ console.error(e); setError('Failed to load sector performance data'); } finally { setLoading(false); setRefreshing(false);} };
  const fetchEconomicData = async () => { try { const r = await fetch('/api/economic-data'); if(!r.ok) { console.warn('economic-data unavailable'); return; } const j = await r.json(); setEconomicData(j.data); setDataHealth(h=>({...h,economic:!!j.data})); } catch(e){ console.error(e);} };
  const fetchAIAnalysis = async () => { try { setAiLoading(true); const r = await fetch('/api/ai-economic-analysis'); if(!r.ok) { console.warn('ai-economic-analysis unavailable'); setAiMeta(null); setAiAnalysis(null); return; } const j = await r.json(); const analysis = j.data?.analysis || j; setAiAnalysis(analysis); setAiMeta(j ? { realtime: !!j.realtime, dataSource: j.data?.dataSource||'N/A', fallback: !!j.data?.fallback } : null); setDataHealth(h=>({...h,ai:!!analysis})); } catch(e){ console.error(e);} finally { setAiLoading(false);} };
  const fetchETFData = async () => { try { const r = await fetch('/api/etf-comparison'); if(!r.ok) throw new Error('etf'); const j = await r.json(); const etfs = j.etfs || []; setEtfData(etfs); setDataHealth(h=>({...h,etf:etfs.length>0})); } catch(e){ console.error(e);} };
  const fetchRecessionIndex = async () => {
    try {
      const r = await fetch('/api/recession-index?limit=180', { cache:'no-store' });
      if (!r.ok) throw new Error('recession-index');
      const j = await r.json();
      if (Array.isArray(j?.series)) setRecessionSeries(j.series);
      if (j?.latest && typeof j.latest.value === 'number') setRecessionIndex(j.latest);
    } catch (e) {
      console.error(e);
      setRecessionIndex(null);
      setRecessionSeries([]);
    }
  };
  // Risk ratios fetcher: compute pair ratios + MOVE/SKEW levels and derive composite regime
  const fetchRiskRatios = async () => {
    try {
      const symbols = ['^VVIX','^VIX','SPHB','SPLV','XLY','XLP','IWD','IWF','HYG','IEF','HG=F','GC=F','^MOVE','^SKEW'];
      const qs = new URLSearchParams({ symbols: symbols.join(','), range:'6mo', interval:'1d' });
      const res = await fetch(`/api/yahoo-history?${qs.toString()}`, { cache:'no-store' });
      if (!res.ok) throw new Error('risk-ratios');
      const js = await res.json();
      const arr: Array<{ symbol:string; bars:Array<{time:number; close:number}> }> = js.data || [];
      const bySym: Record<string, Array<{time:number; close:number}>> = {};
      for (const h of arr) {
        const s = String(h.symbol||'');
        const bars = (h.bars||[]).map((b:any)=>({ time:Number(b.time)||0, close:Number(b.close)||0 })).filter(b=>Number.isFinite(b.time)&&Number.isFinite(b.close));
        if (s && bars.length) bySym[s] = bars;
      }

      // Helper to align two series by time and compute ratio series
      const buildRatio = (aSym:string, bSym:string) => {
        const a = bySym[aSym]||[]; const b = bySym[bSym]||[]; if (!a.length || !b.length) return [] as number[];
        const bMap = new Map<number, number>(b.map(x=> [x.time, x.close] as const));
        const r: number[] = [];
        for (const bar of a) {
          const bv = bMap.get(bar.time);
          if (typeof bv === 'number' && bv !== 0) r.push(bar.close / bv);
        }
        return r;
      };
      const sma = (arr:number[], n:number) => {
        if (arr.length===0) return 0; const k = Math.min(n, arr.length);
        let s = 0; for(let i=arr.length-k;i<arr.length;i++) s += arr[i];
        return s / k;
      };
      const classifyRatio = (series:number[]): 'risk-on'|'risk-off'|'neutral' => {
        if (series.length < 5) return 'neutral';
        const last = series[series.length-1];
        const ma20 = sma(series, 20);
        const ma60 = sma(series, 60);
        if (last >= ma20 && ma20 >= ma60) return 'risk-on';
        if (last <= ma20 && ma20 <= ma60) return 'risk-off';
        return 'neutral';
      };

      const pairs: Array<[string,string,string,string]> = [
        ['^VVIX','^VIX','VVIX/VIX','Vol-of-Vol vs VIX'],
        ['SPHB','SPLV','SPHB/SPLV','High beta vs Low vol'],
        ['XLY','XLP','XLY/XLP','Discretionary vs Staples'],
        ['IWD','IWF','IWD/IWF','Value vs Growth'],
        ['HYG','IEF','HYG/IEF','High yield vs Treasuries'],
        ['HG=F','GC=F','HG/GC','Copper vs Gold']
      ];

      const outRatios: Record<string, number> = {};
      const signals: RiskSignal[] = [];
      for (const [a,b,label,desc] of pairs) {
        const series = buildRatio(a,b);
        const last = series.length ? series[series.length-1] : NaN;
        if (Number.isFinite(last)) outRatios[label] = last;
        const dir = classifyRatio(series);
        const ma20 = sma(series, 20); const ma60 = sma(series, 60);
        const note = Number.isFinite(ma20) && Number.isFinite(ma60) ? (`SMA20${ma20>=ma60?'>=':'<'}SMA60`) : undefined;
        signals.push({ key:label, label: `${label}`, dir, note });
      }

      // MOVE index (bond vol) and SKEW (tail risk)
      const moveSeries = bySym['^MOVE']||[]; const skewSeries = bySym['^SKEW']||[];
      const moveLast = moveSeries.length? moveSeries[moveSeries.length-1].close : NaN;
      const skewLast = skewSeries.length? skewSeries[skewSeries.length-1].close : NaN;
      if (Number.isFinite(moveLast)) outRatios['MOVE'] = moveLast;
      if (Number.isFinite(skewLast)) outRatios['SKEW'] = skewLast;
      if (Number.isFinite(moveLast)) {
        const dir = moveLast > 120 ? 'risk-off' : moveLast < 90 ? 'risk-on' : 'neutral';
        signals.push({ key:'MOVE', label:'MOVE Index', dir, note: moveLast.toFixed(0) });
      }
      if (Number.isFinite(skewLast)) {
        const dir = skewLast > 135 ? 'risk-off' : skewLast < 120 ? 'risk-on' : 'neutral';
        signals.push({ key:'SKEW', label:'CBOE SKEW', dir, note: skewLast.toFixed(0) });
      }

      const votes = signals.reduce((acc, s)=> { acc[s.dir] = (acc as any)[s.dir] + 1; return acc; }, { 'risk-on':0, 'risk-off':0, 'neutral':0 } as any);
      const score = (votes['risk-on']||0) - (votes['risk-off']||0);
      const regime: 'Risk-On'|'Risk-Off'|'Neutral' = score >= 2 ? 'Risk-On' : score <= -2 ? 'Risk-Off' : 'Neutral';

      setRiskRatios(outRatios);
      setRiskSummary({ regime, votes: { on:votes['risk-on']||0, off:votes['risk-off']||0, neutral:votes['neutral']||0 }, score, signals });
    } catch (e) {
      console.error(e);
      setRiskRatios({});
      setRiskSummary(null);
    }
  };
  // Oil seasonality fetch removed
  // Movers are strictly DAILY % change; always fetch period=daily and refresh with page data.
  const fetchTopMovers = async (sectorOverride?: string) => { try { const s = sectorOverride ?? selectedSector; const p = syncMoversWithPeriod ? selectedPeriod : 'daily'; const qs = new URLSearchParams({ limit:'10', period:p }); if (s) qs.set('sector', s); const r = await fetch(`/api/top-movers?${qs.toString()}`, { cache:'no-store' }); if(!r.ok) throw new Error('movers'); const j = await r.json(); setTopMovers((j.top||[]).map((m:any)=>({symbol:m.symbol, price:Number(m.price)||0, changePercent:Number(m.changePercent)||0}))); setBottomMovers((j.bottom||[]).map((m:any)=>({symbol:m.symbol, price:Number(m.price)||0, changePercent:Number(m.changePercent)||0}))); } catch(e){ console.error(e);} };

  // Fetch mini history for visible movers (limit 15 per route constraints)
  const fetchSparkHistory = async (symbols: string[]) => {
    try {
      const uniq: string[] = [];
      for (const s of symbols) if (s && !uniq.includes(s)) uniq.push(s);
      if (uniq.length === 0) return;
      setSparkLoading(true);
      const allMap: Record<string, SparkBar[]> = {};
      // Yahoo history API allows up to 15 symbols per request; batch if needed
      for (let i = 0; i < uniq.length; i += 15) {
        const chunk = uniq.slice(i, i + 15);
        const qs = new URLSearchParams({ symbols: chunk.join(','), range: '1mo', interval: '1d' });
        const res = await fetch(`/api/yahoo-history?${qs.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('spark');
        const json = await res.json();
        (json.data || []).forEach((h: any) => {
          const bars = (h.bars || []).map((b: any) => ({ time: Number(b.time)||0, close: Number(b.close)||0 })).filter((b:any)=> Number.isFinite(b.close));
          if (h.symbol && bars.length > 0) allMap[h.symbol] = bars;
        });
      }
      setSparks(prev => ({ ...prev, ...allMap }));
    } catch (e) {
      console.error(e);
    } finally {
      setSparkLoading(false);
    }
  };

  useEffect(()=>{ fetchSectorData(); fetchEconomicData(); fetchCountryData(); fetchAIAnalysis(); fetchETFData(); fetchTopMovers(''); }, []);
  // Auto-refresh: macro/sector/etf every 5 minutes; movers every 60s
  useEffect(()=>{
  const heavy = setInterval(()=>{ fetchSectorData(); fetchEconomicData(); fetchCountryData(); fetchAIAnalysis(); fetchETFData(); fetchRiskRatios(); fetchRecessionIndex(); }, 300000);
    const movers = setInterval(()=>{ fetchTopMovers(); }, 60000);
    return ()=>{ clearInterval(heavy); clearInterval(movers); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSector, selectedPeriod, syncMoversWithPeriod]);
  // Refetch movers on sector/period/sync changes
  useEffect(()=>{ fetchTopMovers(); }, [selectedSector, selectedPeriod, syncMoversWithPeriod]);
  // Initial load for risk ratios
  useEffect(()=>{ fetchRiskRatios(); fetchRecessionIndex(); }, []);

  // When movers change, fetch their sparklines
  useEffect(() => {
    const syms = [...topMovers.map(m=>m.symbol), ...bottomMovers.map(m=>m.symbol)];
    if (syms.length > 0) fetchSparkHistory(syms);
  }, [topMovers, bottomMovers]);
  useEffect(()=> { if(etfData.length>0 && !selectedComparison) setSelectedComparison('QQQ-SPY'); }, [etfData, selectedComparison]);
  const handleRefresh = () => { /* manual refresh removed per request; auto-refresh enabled */ };

  // Fetch ETF historical series for spread mode
  const fetchEtfComparisonSeries = async () => {
    try {
      if (!selectedComparison) return;
      const pairMap: Record<string, [string, string]> = {
        'QQQ-SPY': ['QQQ', 'SPY'],
        'VOO-VUG': ['VOO', 'VUG'],
        'QQQ-VGT': ['QQQ', 'VGT'],
        'IVV-VOO': ['IVV', 'VOO'],
        'VOO-VTI': ['VOO', 'VTI'],
        'JEPI-JEPQ': ['JEPI', 'JEPQ'],
      };
      const syms = pairMap[selectedComparison];
      if (!syms) return;
      setEtfSeriesLoading(true);
      // Choose interval based on range length
      const interval = ((): string => {
        if (etfRange === '5y' || etfRange === '10y') return '1wk'
        if (etfRange === 'max') return '1mo'
        if (etfRange === '2y') return '1d'
        return '1d'
      })()
      const qs = new URLSearchParams({ symbols: syms.join(','), range: etfRange, interval });
      const res = await fetch(`/api/yahoo-history?${qs.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('history');
      const json = await res.json();
      const arr: any[] = json.data || [];
      const bySym: Record<string, Array<{ time:number; close:number }>> = {};
      for (const h of arr) {
        const s = String(h.symbol || '');
        const bars = (h.bars || []).map((b:any)=> ({ time: Number(b.time)||0, close: Number(b.close)||0 }))
          .filter((b:any)=> Number.isFinite(b.time) && Number.isFinite(b.close));
        if (s && bars.length) bySym[s] = bars;
      }
      const aBars = bySym[syms[0]] || [];
      const bBars = bySym[syms[1]] || [];
      if (!aBars.length || !bBars.length) { setEtfSeries([]); return; }
      // Align by timestamp (intersection)
      const bMap = new Map<number, number>(bBars.map(b=> [b.time, b.close] as const));
      const merged: Array<{ time:number; a:number; b:number; spread:number }> = [];
      for (const a of aBars) {
        const bClose = bMap.get(a.time);
        if (typeof bClose === 'number') {
          const spread = etfSpreadType === 'percent' ? ((a.close / (bClose || 1)) - 1) * 100 : (a.close - bClose);
          merged.push({ time: a.time, a: a.close, b: bClose, spread });
        }
      }
      // Ensure chronological order
      merged.sort((x,y)=> x.time - y.time);
      setEtfSeries(merged);
    } catch (e) {
      console.error(e);
      setEtfSeries([]);
    } finally {
      setEtfSeriesLoading(false);
    }
  };
  useEffect(()=>{
    if (etfCompareMode === 'spread' && selectedComparison) {
      fetchEtfComparisonSeries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etfCompareMode, etfRange, etfSpreadType, selectedComparison]);

  // Helpers
  const getPerformanceValue = (s:SectorPerformance) => ({ daily:s.daily, weekly:s.weekly, monthly:s.monthly, quarterly:s.quarterly, yearly:s.yearly }[selectedPeriod]);
  const getPeriodLabel = () => ({ daily:'Today', weekly:'This Week', monthly:'This Month', quarterly:'This Quarter', yearly:'This Year' }[selectedPeriod]);
  const getEconomicCycleColor = (c:string) => { const l=c.toLowerCase(); if(l==='expansion') return 'text-green-400 bg-green-900/20 border-green-500/30'; if(l==='peak') return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30'; if(l==='contraction'||l==='recession') return 'text-red-400 bg-red-900/20 border-red-500/30'; if(l==='trough') return 'text-blue-400 bg-blue-900/20 border-blue-500/30'; return 'text-gray-400 bg-gray-900/20 border-gray-500/30'; };
  const getPerformanceColor = (v:number) => v>2?'text-emerald-400':v>1?'text-green-400':v>0?'text-lime-400':v>-1?'text-yellow-400':v>-2?'text-orange-400':'text-red-400';
  const getAIDirectionDisplay = (d:string) => { const dir=d.toLowerCase(); if(dir==='bullish') return {color:'text-green-400', icon:<TrendingUp className="w-5 h-5" />, bg:'bg-green-900/20 border-green-500/30'}; if(dir==='bearish') return {color:'text-red-400', icon:<TrendingDown className="w-5 h-5" />, bg:'bg-red-900/20 border-red-500/30'}; if(dir==='mixed') return {color:'text-yellow-400', icon:<BarChart3 className="w-5 h-5" />, bg:'bg-yellow-900/20 border-yellow-500/30'}; return {color:'text-gray-400', icon:<Target className="w-5 h-5" />, bg:'bg-gray-900/20 border-gray-500/30'}; };
  const performanceToGradient = (val:number) => { const c=Math.max(-5, Math.min(5,val)); return c>=0?`linear-gradient(135deg, rgba(16,185,129,${0.15+0.65*(c/5)}) 0%, rgba(4,47,46,0.5) 100%)`:`linear-gradient(135deg, rgba(248,113,113,${0.15+0.65*(-c/5)}) 0%, rgba(67,12,12,0.45) 100%)`; };
  const getProjectedCycleStyle = (c?: string) => {
    const l = (c||'').toLowerCase();
    if(l==='expansion') return 'bg-green-900/20 border-green-500/30 text-green-300';
    if(l==='recovery') return 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300';
    if(l==='slowdown') return 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300';
    if(l==='contraction') return 'bg-red-900/20 border-red-500/30 text-red-300';
    if(l==='transition') return 'bg-purple-900/20 border-purple-500/30 text-purple-300';
    return 'bg-gray-900/20 border-gray-500/30 text-gray-300';
  };

  // No tab gating (restored baseline layout)

  // Derived
  const currentComparison = React.useMemo(()=> { if(!selectedComparison||etfData.length===0) return null; const map:Record<string,string[]>={ 'QQQ-SPY':['QQQ','SPY'],'VOO-VUG':['VOO','VUG'],'QQQ-VGT':['QQQ','VGT'],'IVV-VOO':['IVV','VOO'],'VOO-VTI':['VOO','VTI'],'JEPI-JEPQ':['JEPI','JEPQ'] }; const symbols = map[selectedComparison]; if(!symbols) return null; return symbols.map(s=> etfData.find(e=>e.symbol===s)).filter(Boolean) as ETFData[]; }, [selectedComparison, etfData]);
  const sortedSectors = React.useMemo(()=> { const c=[...sectorData]; if(sectorSort==='performance') return c.sort((a,b)=> getPerformanceValue(b)-getPerformanceValue(a)); if(sectorSort==='volume') return c.sort((a,b)=> b.volume-a.volume); if(sectorSort==='marketCap') return c.sort((a,b)=> b.marketCap-a.marketCap); return c; }, [sectorData, sectorSort, selectedPeriod]);
  const projectedCycle = React.useMemo(()=> {
    if(!economicData || !aiAnalysis) return null;
    const current = economicData.current.cycle.toLowerCase();
    const dir = aiAnalysis.direction.toLowerCase();
    if(dir==='bullish') {
      if(/contraction|trough|stagflation/.test(current)) return 'Recovery';
      if(/recovery/.test(current)) return 'Expansion';
      return 'Expansion';
    }
    if(dir==='bearish') {
      if(/expansion|peak/.test(current)) return 'Slowdown';
      if(/recovery/.test(current)) return 'Contraction';
      return 'Contraction';
    }
    if(dir==='mixed') return 'Transition';
    return economicData.current.cycle;
  }, [economicData, aiAnalysis]);
  const riskBand = React.useMemo(()=> {
    if(!economicData) return null;
    const inf = economicData.indicators?.inflation?.value || 0;
    const unemp = economicData.indicators?.unemployment?.value || 0;
    const gdp = economicData.indicators?.gdp?.value || 0;
    const score = (inf>3.5?2:inf>2.5?1:0) + (unemp>6?2:unemp>4.5?1:0) + (gdp<1?2:gdp<2?1:0);
    if(score<=1) return {label:'Low', class:'text-emerald-400'};
    if(score===2) return {label:'Moderate', class:'text-yellow-400'};
    if(score===3) return {label:'Elevated', class:'text-orange-400'};
    return {label:'High', class:'text-red-400'};
  }, [economicData]);

  // Country cycle classification matrix (heuristic, deterministic, no randomness)
  const countryCycleMatrix = React.useMemo(()=> {
    if(!countryData) return [] as Array<{code:string;country:string;stage:string;growth:number;inflation:number;unemployment:number;rate:number;next:string;risk:string}>;
    return countryData.countries.map(c => {
      const g = c.gdp.growth;            // GDP growth %
      const inf = c.inflation.value;     // CPI %
      const u = c.unemployment.value;    // Unemployment %
      const r = c.interestRate.value;    // Policy rate %

      let stage = 'Neutral';
      // Simple macro phase heuristic
      if(g >= 3.5 && inf > 3 && u < 4) stage = 'Overheating';
      else if(g >= 2 && inf <= 3.2 && u <= 5) stage = 'Expansion';
      else if(g > 0.5 && (inf > 4 || r > 4.5)) stage = 'Slowdown';
      else if(g <= 0 && inf > 3.2 && u >= 5.5) stage = 'Stagflation';
      else if(g < 0 && u > 6) stage = 'Contraction';
      else if(g >= 0 && g < 1 && inf < 3 && u > 5) stage = 'Recovery';

      // 3M forward outlook heuristic
      let next = 'Sideways';
      if(stage === 'Overheating') next = 'Policy Tightening → Slowdown';
      else if(stage === 'Expansion') next = inf > 3 ? 'Monitor Inflation' : 'Sustained Expansion';
      else if(stage === 'Slowdown') next = inf > 4 ? 'Disinflation Path' : 'Soft Landing Risk';
      else if(stage === 'Stagflation') next = 'Disinflation Needed';
      else if(stage === 'Contraction') next = inf < 3 ? 'Recovery Setup' : 'Further Weakness';
      else if(stage === 'Recovery') next = g > 0.8 ? 'Expansion Setup' : 'Early Recovery';

      // Risk level (composite score)
      const macroScore = (inf>4?2:inf>3?1:0) + (u>7?2:u>5.5?1:0) + (g<0?2:g<1?1:0);
      const risk = macroScore <=1 ? 'Low' : macroScore===2 ? 'Moderate' : macroScore===3 ? 'Elevated' : 'High';

      return { code:c.countryCode, country:c.country, stage, growth:g, inflation:inf, unemployment:u, rate:r, next, risk };
    });
  }, [countryData]);

  const stageColor = (s:string) => {
    const l = s.toLowerCase();
    if(l==='expansion') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    if(l==='overheating') return 'bg-orange-500/10 text-orange-300 border-orange-500/30';
    if(l==='slowdown') return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30';
    if(l==='recovery') return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
    if(l==='contraction') return 'bg-red-500/10 text-red-300 border-red-500/30';
    if(l==='stagflation') return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
    return 'bg-gray-500/10 text-gray-300 border-gray-500/30';
  };
  const riskColor = (r:string) => {
    const l = r.toLowerCase();
    if(l==='low') return 'text-emerald-300';
    if(l==='moderate') return 'text-yellow-300';
    if(l==='elevated') return 'text-orange-300';
    return 'text-red-400';
  };

  // === Macro regime helpers (Deflation / Reflation / Inflation / Stagflation) ===
  function inferMacroRegime(g:number, cpi:number) {
    // Simple quadrant-style mapping inspired by the attached image
    if (g <= 0 && cpi <= 2) return 'Deflation';
    if (g > 0 && g <= 2.5 && cpi <= 3) return 'Reflation';
    if (g > 2 && cpi > 3) return 'Inflation';
    if (g <= 1 && cpi > 3.2) return 'Stagflation';
    // fallback
    return g > 1.5 ? 'Expansion' : 'Neutral';
  }
  const regimeColor = (r:string) => {
    const k = r.toLowerCase();
    if(k==='deflation') return { bg:'bg-blue-500/10', text:'text-blue-300', border:'border-blue-500/30' };
    if(k==='reflation') return { bg:'bg-emerald-500/10', text:'text-emerald-300', border:'border-emerald-500/30' };
    if(k==='inflation') return { bg:'bg-yellow-500/10', text:'text-yellow-300', border:'border-yellow-500/30' };
    if(k==='stagflation') return { bg:'bg-red-500/10', text:'text-red-300', border:'border-red-500/30' };
    return { bg:'bg-gray-500/10', text:'text-gray-300', border:'border-gray-500/30' };
  };

  // Inline MiniSparkline component for compact trend visualization
  function MiniSparkline({ bars, color }: { bars: Array<{time:number; close:number}>; color: string }) {
    const w = 80; const h = 20; const pad = 2;
    if (!bars || bars.length < 3) {
      return <div className="w-20 h-5 bg-white/5 rounded" />;
    }
    const closes = bars.map(b=> b.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;
    const points = bars.map((b, i) => {
      const x = (i/(bars.length-1)) * (w - pad*2) + pad;
      const y = h - pad - ((b.close - min) / range) * (h - pad*2);
      return `${x},${y}`;
    }).join(' ');
    const last = closes[closes.length-1];
    const first = closes[0];
    const up = last >= first;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-5 overflow-visible">
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={(w - pad)} cy={h - pad - ((last - min)/range)*(h - pad*2)} r="1.5" fill={up? color : '#94a3b8'} />
      </svg>
    );
  }

  if (loading) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mb-4 mx-auto" /><p className="text-white text-xl">Loading AI Pulse Dashboard...</p></div></div>;
  if (error) return <div className="min-h-screen bg-[var(--background)]"><div className="container mx-auto px-4 py-8"><Link href="/en" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg transition-colors border border-white/10 mb-8"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link><div className="bg-red-500/10 backdrop-blur-md rounded-xl p-8 border border-red-500/20"><h1 className="text-2xl font-bold text-red-400 mb-4">Error Loading Data</h1><p className="text-white">{error}</p></div></div></div>;

  return (
    <RequirePlan min="free">
  <div className="min-h-screen bg-[var(--background)] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/en" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg transition-colors border border-white/10"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">AI Pulse Dashboard</h1>
            </div>
            {/* Market Categories button removed per request */}
          </div>

          {/* Macro Snapshot Hero (positioned below header) */}
          {countryData && (
            <div className="bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-black/60 border border-white/10 rounded-2xl p-6 mb-8 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none opacity-20" style={{background:'radial-gradient(700px 200px at 20% -20%, rgba(59,130,246,0.25), transparent), radial-gradient(500px 150px at 80% 120%, rgba(16,185,129,0.18), transparent)'}} />
              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-lg bg-slate-700/70 border border-slate-600 flex items-center justify-center text-blue-300">🌍</div>
                    <h2 className="text-2xl font-bold">Global Macro Snapshot</h2>
                  </div>
                  <p className="text-sm text-gray-400">At-a-glance world economy status and cycle position</p>
                </div>
                {/* Stats badges removed per request */}
              </div>
              {/* Cycle curve */}
              <div className="relative z-10 mt-6">
                {(() => {
                  const g = countryData?.global?.averageGrowth ?? 0;
                  const cpi = countryData?.global?.averageInflation ?? 0;
                  const regime = inferMacroRegime(g, cpi);
                  const rc = regimeColor(regime);
                  // Draw a smooth sine-like curve with an indicator
                  return (
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] border ${rc.bg} ${rc.text} ${rc.border}`}>{regime}</span>
                          <span className="text-xs text-gray-400">G {g.toFixed(1)}% • CPI {cpi.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {selectedCountry && (
                            <button onClick={()=> setSelectedCountry(null)} className="text-[11px] text-gray-300 hover:text-white underline">Clear highlight ({selectedCountry})</button>
                          )}
                          <span className="text-[10px] uppercase tracking-wide text-gray-500">Cycle Position</span>
                        </div>
                      </div>
                      <svg viewBox="0 0 1000 180" className="w-full h-32">
                        {/* Baseline */}
                        <line x1="0" y1="90" x2="1000" y2="90" stroke="#64748B" strokeDasharray="4 6" />
                        {/* Curve (hand-tuned cubic path approximating phases) */}
                        <path d="M0,140 C 150,20 350,20 500,90 S 850,160 1000,40" fill="none" stroke="#93C5FD" strokeWidth="2" />
                        {/* Phase labels */}
                        <text x="80" y="160" fontSize="12" fill="#94A3B8">Deflation</text>
                        <text x="350" y="30" fontSize="12" fill="#86EFAC">Reflation</text>
                        <text x="700" y="30" fontSize="12" fill="#FDE68A">Inflation</text>
                        <text x="880" y="160" fontSize="12" fill="#FCA5A5">Stagflation</text>
                        {/* Marker position mapped by regime */}
                        {(() => {
                          let mx = 120; let my = 120; // Deflation default
                          if (regime==='Reflation') { mx = 420; my = 70; }
                          else if (regime==='Inflation') { mx = 730; my = 70; }
                          else if (regime==='Stagflation') { mx = 920; my = 120; }
                          return <g>
                            <circle cx={mx} cy={my} r="6" fill="#F59E0B" />
                            <circle cx={mx} cy={my} r="10" fill="transparent" stroke="#F59E0B" strokeOpacity="0.4" />
                          </g>;
                        })()}
                        {/* Country markers along the curve */}
                        {countryCycleMatrix.slice(0, 30).map((row, idx) => {
                          const fmt = (v:number, d:number=1)=> Number.isFinite(v) ? v.toFixed(d) : '—';
                          // Anchor by stage
                          const s = row.stage.toLowerCase();
                          let ax = 110, ay = 120; // deflation area
                          if (s==='recovery' || s==='neutral') { ax = 380; ay = 90; }
                          if (s==='expansion') { ax = 700; ay = 70; }
                          if (s==='overheating') { ax = 760; ay = 65; }
                          if (s==='slowdown') { ax = 860; ay = 110; }
                          if (s==='stagflation') { ax = 910; ay = 120; }
                          if (s==='contraction') { ax = 120; ay = 130; }
                          // jitter to avoid overlap
                          const col = idx % 10; const rowi = Math.floor(idx/10);
                          const x = ax + col * 22;
                          const y = ay + (rowi%2===0 ? -8 : 8);
                          const title = `${row.country} • ${row.stage} | GDP ${fmt(row.growth,1)}% | CPI ${fmt(row.inflation,1)}% | Unemp ${fmt(row.unemployment,1)}% | Rate ${fmt(row.rate,2)}% | ${row.next} | Risk ${row.risk}`;
                          const isSel = selectedCountry === row.code;
                          return (
                            <g key={row.code} onClick={()=> setSelectedCountry(isSel? null : row.code)} style={{cursor:'pointer'}}>
                              <title>{title}</title>
                              <circle cx={x} cy={y} r={isSel? '8' : '7'} fill={isSel? '#F59E0B' : '#0b1220'} stroke={isSel? '#FBBF24' : '#94A3B8'} strokeWidth={isSel? '1.5' : '1'} />
                              {isSel && (
                                <g>
                                  <circle cx={x} cy={y} r="13" fill="transparent" stroke="#F59E0B" strokeOpacity="0.5" />
                                  <circle cx={x} cy={y} r="18" fill="transparent" stroke="#F59E0B" strokeOpacity="0.25" />
                                </g>
                              )}
                              {(() => {
                                const lx = Math.min(x + 12, 954);
                                const ly = y - 9;
                                return (
                                  <g>
                                    <rect x={lx} y={ly-7} width="48" height="18" rx="4" ry="4" fill="rgba(2,6,23,0.9)" stroke={isSel? '#F59E0B' : '#475569'} />
                                    <text x={lx+6} y={ly+5} fontSize="12" textAnchor="start">{getCountryFlag(row.code)}</text>
                                    <text x={lx+24} y={ly+5} fontSize="11" fill={isSel? '#FFF7ED' : '#E2E8F0'} fontWeight="700">{row.code}</text>
                                  </g>
                                );
                              })()}
                            </g>
                          );
                        })}
                      </svg>
                      {/* Compact legend for clarity */}
                      <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-gray-300">
                        {countryCycleMatrix.slice(0, 18).map((row)=> {
                          const active = selectedCountry === row.code;
                          return (
                            <button key={`leg-${row.code}`} onClick={()=> setSelectedCountry(active? null : row.code)} className={`px-2 py-0.5 rounded-md border transition-colors ${active? 'bg-amber-500/20 border-amber-400/40 text-amber-100' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                              <span className="mr-1 align-middle">{getCountryFlag(row.code)}</span>
                              <span className="font-semibold mr-1">{row.code}</span>
                              <span className="text-gray-400">{row.country}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              {/* Global Economic Cycle Matrix - Always visible */}
              {countryCycleMatrix.length>0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">Global Economic Cycle Matrix <span className="text-[10px] uppercase tracking-wide text-gray-400">Heuristic</span></h3>
                  <div className="overflow-auto rounded-lg border border-white/10">
                    <table className="w-full text-xs min-w-[860px]">
                      <thead className="bg-white/5">
                        <tr className="border-b border-white/10 text-[11px] text-gray-400 uppercase tracking-wide">
                          <th className="text-left py-2 px-2">Country</th>
                          <th className="text-left py-2 px-2">Stage</th>
                          <th className="text-right py-2 px-2">GDP%</th>
                          <th className="text-right py-2 px-2">Infl%</th>
                          <th className="text-right py-2 px-2">Unemp%</th>
                          <th className="text-right py-2 px-2">Rate%</th>
                          <th className="text-left py-2 px-2">3M Outlook</th>
                          <th className="text-left py-2 px-2">Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {countryCycleMatrix.map(row => {
                          const active = selectedCountry === row.code;
                          return (
                          <tr key={row.code} onClick={()=> setSelectedCountry(active? null : row.code)} className={`hover:bg-white/5 transition-colors cursor-pointer ${active? 'bg-amber-500/10 ring-1 ring-amber-400/40' : ''}`}>
                            <td className="py-2 px-2 font-medium flex items-center gap-2"><span className="text-base leading-none">{getCountryFlag(row.code)}</span>{row.country}</td>
                            <td className="py-2 px-2"><span className={`px-2 py-1 rounded-md border text-[11px] font-medium ${stageColor(row.stage)}`}>{row.stage}</span></td>
                            <td className={`py-2 px-2 text-right font-mono ${row.growth>=0? 'text-green-300':'text-red-300'}`}>{row.growth.toFixed(1)}</td>
                            <td className={`py-2 px-2 text-right font-mono ${row.inflation>4? 'text-red-300':row.inflation>3? 'text-yellow-300':'text-emerald-300'}`}>{row.inflation.toFixed(1)}</td>
                            <td className={`py-2 px-2 text-right font-mono ${row.unemployment>7? 'text-red-300':row.unemployment>5.5? 'text-yellow-300':'text-emerald-300'}`}>{row.unemployment.toFixed(1)}</td>
                            <td className="py-2 px-2 text-right font-mono text-gray-300">{Number.isFinite(row.rate) ? row.rate.toFixed(2) : '—'}</td>
                            <td className="py-2 px-2 text-gray-300 max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis" title={row.next}>{row.next}</td>
                            <td className={`py-2 px-2 font-semibold ${riskColor(row.risk)}`}>{row.risk}</td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400 leading-snug">Stages & Outlook computed via deterministic macro thresholds (GDP, CPI, Unemployment, Policy Rate). No AI randomness. Forward 3M outlook is heuristic guidance, not a prediction.</p>
                </div>
              )}
            </div>
          )}

          {/* Compact Sector Performance removed: duplicated with Sector Performance Analysis */}
          

          {/* Embedded Market Categories Section (moved up for prominence) */}
          <div className="mb-8">
            <MarketCategoriesEmbed />
          </div>

          {economicData && (
            <div className="bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-black/60 rounded-xl p-6 border border-white/10 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-3"><Globe className="w-7 h-7 text-blue-400" /> Economic Cycle Analysis</h2>
                {lastUpdated && <div className="flex items-center gap-2 text-gray-400 text-sm"><Clock className="w-4 h-4" /> {new Date(lastUpdated).toLocaleTimeString()}</div>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className={`rounded-lg p-4 border ${getEconomicCycleColor(economicData.current.cycle)} relative overflow-hidden`}> 
                  <h3 className="font-semibold mb-1 flex items-center gap-2 text-sm"><Activity className="w-4 h-4" /> Current Cycle</h3>
                  <p className="text-xl font-bold tracking-wide">{economicData.current.cycle}</p>
                  <span className="absolute inset-0 pointer-events-none opacity-10 bg-gradient-to-br from-blue-400/30 to-transparent" />
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-gray-300 font-semibold mb-1 text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Growth</h3>
                  <p className="text-lg font-bold">{economicData.current.growth}</p>
                  <p className="text-[11px] text-gray-500 mt-1">Trend macro</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-gray-300 font-semibold mb-1 text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" /> Inflation</h3>
                  <p className="text-lg font-bold">{economicData.current.inflation}</p>
                  <p className="text-[11px] text-gray-500 mt-1">Pressione prezzi</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-gray-300 font-semibold mb-1 text-sm flex items-center gap-2"><Briefcase className="w-4 h-4" /> Confidence</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-700/60 h-2 rounded-full overflow-hidden"><div className="h-2 bg-gradient-to-r from-indigo-500 to-blue-400" style={{width:`${Math.min(100, Math.max(0, economicData.current.confidence))}%`}} /></div>
                    <p className="text-base font-bold">{economicData.current.confidence}/100</p>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Sentiment composito</p>
                </div>
              </div>
              {economicData.indicators && (
                <div className="mt-2">
                  <h3 className="text-lg font-semibold mb-3">Key Economic Indicators</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-gray-400 text-[11px] uppercase tracking-wide">GDP Growth</p>
                      <p className="font-semibold text-white text-lg">{economicData.indicators.gdp?.value}%</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-gray-400 text-[11px] uppercase tracking-wide">Fed Rate</p>
                      <p className="font-semibold text-white text-lg">{economicData.indicators.fedRate?.value}%</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-gray-400 text-[11px] uppercase tracking-wide">Unemployment</p>
                      <p className="font-semibold text-white text-lg">{economicData.indicators.unemployment?.value}%</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-gray-400 text-[11px] uppercase tracking-wide">Inflation Rate</p>
                      <p className="font-semibold text-white text-lg">{economicData.indicators.inflation?.value}%</p>
                    </div>
                  </div>
                </div>
              )}
              {/* Sintesi in italiano richiesta */}
              <p className="mt-4 text-[12px] text-gray-300 leading-relaxed">
                Summary: Current cycle <span className="font-semibold text-blue-300">{economicData.current.cycle}</span>. Growth <span className="text-emerald-300 font-medium">{economicData.current.growth}</span>, Inflation <span className="text-amber-300 font-medium">{economicData.current.inflation}</span>, Unemployment <span className="text-purple-300 font-medium">{economicData.indicators?.unemployment?.value}%</span>, Fed Rate <span className="text-cyan-300 font-medium">{economicData.indicators?.fedRate?.value}%</span>, Confidence <span className="font-semibold text-indigo-300">{economicData.current.confidence}/100</span>. This macro snapshot helps contextualize regime; not investment advice.
              </p>
            </div>
          )}

          {aiAnalysis && (
            <div className="bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-black/60 rounded-xl p-6 border border-white/10 mb-8">
              <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold flex items-center gap-3"><Target className="w-7 h-7 text-purple-400" /> AI Economic Analysis {aiLoading && <RefreshCw className="w-5 h-5 animate-spin" />}</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className={`rounded-lg p-4 border ${getAIDirectionDisplay(aiAnalysis.direction).bg}`}><div className="flex items-center gap-3 mb-2">{getAIDirectionDisplay(aiAnalysis.direction).icon}<h3 className="font-semibold">Market Direction</h3></div><p className={`text-lg font-bold capitalize ${getAIDirectionDisplay(aiAnalysis.direction).color}`}>{aiAnalysis.direction}</p></div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10"><div className="flex items-center gap-3 mb-2"><BarChart3 className="w-5 h-5 text-blue-400" /><h3 className="font-semibold">Confidence Level</h3></div><div className="flex items-center gap-3"><div className="flex-1 bg-gray-700 rounded-full h-2"><div className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full" style={{width:`${aiAnalysis.confidence}%`}} /></div><p className="text-lg font-bold text-blue-400">{aiAnalysis.confidence}%</p></div></div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10"><div className="flex items-center gap-3 mb-2"><Calendar className="w-5 h-5 text-green-400" /><h3 className="font-semibold">Timeframe</h3></div><p className="text-lg font-bold text-green-400">{aiAnalysis.timeframe}</p></div>
              </div>
              {/* Explicit forward regime callout as requested: Next 3–6 months */}
              <div className={`rounded-lg p-4 border ${getProjectedCycleStyle(projectedCycle || undefined)} mb-6`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5" />
                    <div>
                      <h3 className="font-semibold">Expected Regime (Next 3–6 Months)</h3>
                      <p className="text-sm opacity-80">Based on FRED snapshot + AI directional signal</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold capitalize">{projectedCycle || '—'}</p>
                    <p className="text-xs opacity-80">Confidence {aiAnalysis.confidence ?? 0}%</p>
                  </div>
                </div>
              </div>
              {aiAnalysis.summary && <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-6"><h3 className="text-lg font-semibold mb-3">AI Summary</h3><p className="text-gray-300 leading-relaxed">{aiAnalysis.summary}</p>{aiMeta?.fallback && <p className="mt-2 text-xs text-yellow-400">Displayed analysis generated from fallback template due to AI service issue.</p>}</div>}
              {(economicData || aiAnalysis) && (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-8">
                  <h3 className="text-lg font-semibold mb-4">Cycle Snapshot & 3-Month AI Outlook</h3>
                  <div className="overflow-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead>
                        <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-400">
                          <th className="text-left py-2">Metric</th>
                          <th className="text-left py-2">Current</th>
                          <th className="text-left py-2">AI (Now)</th>
                          <th className="text-left py-2">Projected 3M</th>
                          <th className="text-left py-2">Confidence</th>
                          <th className="text-left py-2">Risk Band</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr>
                          <td className="py-3 font-medium">Cycle Phase</td>
                          <td className="py-3 text-gray-200">{economicData?.current.cycle||'—'}</td>
                          <td className="py-3 text-gray-200 capitalize">{aiAnalysis?.currentCycle||economicData?.current.cycle||'—'}</td>
                          <td className={`py-3 font-semibold ${projectedCycle==='Expansion'?'text-green-400':projectedCycle==='Recovery'?'text-emerald-400':projectedCycle==='Slowdown'?'text-yellow-400':projectedCycle==='Contraction'?'text-red-400':projectedCycle==='Transition'?'text-purple-400':'text-gray-300'}`}>{projectedCycle||'—'}</td>
                          <td className="py-3 text-gray-300">{aiAnalysis?.confidence ? `${aiAnalysis.confidence}%`:'—'}</td>
                          <td className={`py-3 font-semibold ${riskBand?.class||''}`}>{riskBand?.label||'—'}</td>
                        </tr>
                        <tr>
                          <td className="py-3 font-medium">Growth Trend</td>
                          <td className="py-3 text-gray-200">{economicData?.current.growth}</td>
                          <td className="py-3 text-gray-300">{aiAnalysis?.direction}</td>
                          <td className="py-3 text-gray-300">{projectedCycle? (projectedCycle==='Expansion'?'Stronger':'Adjusted'):'—'}</td>
                          <td className="py-3 text-gray-300">{aiAnalysis?.timeframe||'—'}</td>
                          <td className="py-3 text-gray-300">GDP {economicData?.indicators?.gdp?.value?.toFixed? economicData.indicators.gdp.value.toFixed(1):'—'}%</td>
                        </tr>
                        <tr>
                          <td className="py-3 font-medium">Inflation Regime</td>
                          <td className="py-3 text-gray-200">{economicData?.current.inflation}</td>
                          <td className="py-3 text-gray-300">{(economicData?.indicators?.inflation?.value||'—')}%</td>
                          <td className="py-3 text-gray-300">{projectedCycle? (projectedCycle==='Expansion'?'Stable to Moderate':'Monitor'):'—'}</td>
                          <td className="py-3 text-gray-300">Fed {economicData?.indicators?.fedRate?.value?.toFixed? economicData.indicators.fedRate.value.toFixed(2):'—'}%</td>
                          <td className="py-3 text-gray-300">Unemp {economicData?.indicators?.unemployment?.value?.toFixed? economicData.indicators.unemployment.value.toFixed(1):'—'}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-[11px] text-gray-400">Projection logic combines current macro phase (FRED snapshot) with AI directional signal. This forward-looking view is probabilistic and not guaranteed.</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {aiAnalysis.keyFactors?.length>0 && <div className="bg-white/5 rounded-lg p-4 border border-white/10"><h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-400" /> Key Factors</h3><ul className="space-y-2">{aiAnalysis.keyFactors.slice(0,3).map((f,i)=>(<li key={i} className="text-gray-300 text-sm flex gap-2"><span className="text-blue-400">•</span><span>{f}</span></li>))}</ul></div>}
                {aiAnalysis.risks?.length>0 && <div className="bg-white/5 rounded-lg p-4 border border-white/10"><h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-400" /> Key Risks</h3><ul className="space-y-2">{aiAnalysis.risks.slice(0,3).map((r,i)=>(<li key={i} className="text-gray-300 text-sm flex gap-2"><span className="text-red-400">•</span><span>{r}</span></li>))}</ul></div>}
                {aiAnalysis.opportunities?.length>0 && <div className="bg-white/5 rounded-lg p-4 border border-white/10"><h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Target className="w-5 h-5 text-green-400" /> Opportunities</h3><ul className="space-y-2">{aiAnalysis.opportunities.slice(0,3).map((o,i)=>(<li key={i} className="text-gray-300 text-sm flex gap-2"><span className="text-green-400">•</span><span>{o}</span></li>))}</ul></div>}
              </div>
            </div>
          )}



          {/* Sector Performance Analysis moved up right after Economic Cycle/Matrix */}
          <div className="bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-black/60 rounded-xl p-6 border border-white/10 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3"><PieChart className="w-7 h-7 text-emerald-400" /> Sector Performance Analysis</h2>
              <div className="flex flex-wrap items-center gap-4">
                <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">{(['bar','multi'] as const).map(v=>
                  <button key={v} onClick={()=>setSectorView(v)} className={`px-3 py-1 text-xs rounded-md transition-colors ${sectorView===v?'bg-blue-600 text-white':'text-gray-300 hover:text-white'}`}>{v==='bar'?'Single':'Multi TF'}</button>
                )}</div>
                <button onClick={()=>setShowHeatmap(s=>!s)} className={`px-3 py-1 rounded-lg text-xs border ${showHeatmap?'bg-emerald-600/30 border-emerald-500/40 text-emerald-300':'bg-white/5 border-white/10 text-gray-300 hover:text-white'}`}>Heatmap {showHeatmap?'On':'Off'}</button>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Timeframe:</span>
                  <div className="flex flex-wrap gap-1 bg-white/5 border border-white/10 rounded-md p-1">
                    {(['1D','1W','1M','3M','6M','YTD','52W'] as TimeframeKey[]).map(tf => (
                      <button
                        key={tf}
                        onClick={()=> setSelectedTimeframe(tf)}
                        className={`px-2.5 py-1 text-[11px] rounded-md transition-colors tracking-wide ${selectedTimeframe===tf ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                      >{tf}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2"><span className="text-gray-400 text-sm">Sort:</span><select value={sectorSort} onChange={e=>setSectorSort(e.target.value as any)} className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm"><option value="performance">Performance</option><option value="volume">Volume</option><option value="marketCap">Market Cap</option></select></div>
                {lastUpdated && <div className="flex items-center gap-2 text-gray-400 text-sm"><Clock className="w-4 h-4" /> {new Date(lastUpdated).toLocaleTimeString()}</div>}
              </div>
            </div>
            <p className="-mt-3 mb-4 text-[10px] text-gray-500">6M, YTD e 52W attualmente riutilizzano l'aggregazione Yearly finché non saranno disponibili metriche dedicate.</p>
            {sectorData.length>0 && <div className="space-y-6">
              <div className="bg-white/5 rounded-lg p-4"><h4 className="text-white font-semibold mb-3 flex items-center justify-between">Sector Performance - {getPeriodLabel()} <span className="text-[10px] uppercase tracking-wide text-gray-400">Real Data</span></h4><div className="h-80"><ResponsiveContainer width="100%" height="100%">{sectorView==='bar' ? (
                <BarChart data={sortedSectors} margin={{top:20,right:30,left:20,bottom:5}}>
                  <defs><linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} /><stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.15} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="sector" tick={{fontSize:11,fill:'#f1f5f9'}} angle={-40} textAnchor="end" height={90} />
                  <YAxis tick={{fontSize:11,fill:'#f1f5f9'}} label={{value:'Performance (%)',angle:-90,position:'insideLeft',style:{textAnchor:'middle',fill:'#f1f5f9'}}} />
                  <Tooltip contentStyle={{backgroundColor:'rgba(15,23,42,0.95)',border:'1px solid rgba(148,163,184,0.3)',borderRadius:'8px',color:'#fff'}} formatter={(v:any,_n:any,p:any)=> [`${Number(v).toFixed(2)}%`, p.payload.sector]} />
                  <Bar dataKey={(e:SectorPerformance)=> getPerformanceValue(e)} fill="url(#perfGradient)" stroke="#60a5fa" strokeWidth={1} radius={[4,4,0,0]} />
                </BarChart>
              ) : (
                <LineChart data={sortedSectors} margin={{top:20,right:30,left:10,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="sector" tick={{fontSize:11,fill:'#f1f5f9'}} angle={-40} textAnchor="end" height={90} />
                  <YAxis tick={{fontSize:11,fill:'#f1f5f9'}} />
                  <Tooltip contentStyle={{backgroundColor:'rgba(15,23,42,0.95)',border:'1px solid rgba(148,163,184,0.3)',borderRadius:'8px',color:'#fff'}} />
                  <Line type="monotone" dataKey="daily" stroke="#60a5fa" strokeWidth={2} dot={false} name="Daily %" />
                  <Line type="monotone" dataKey="weekly" stroke="#34d399" strokeWidth={2} dot={false} name="Weekly %" />
                  <Line type="monotone" dataKey="monthly" stroke="#fbbf24" strokeWidth={2} dot={false} name="Monthly %" />
                  <Line type="monotone" dataKey="quarterly" stroke="#a78bfa" strokeWidth={2} dot={false} name="Quarterly %" />
                  <Line type="monotone" dataKey="yearly" stroke="#f87171" strokeWidth={2} dot={false} name="Yearly %" />
                </LineChart>
              )}</ResponsiveContainer></div></div>
              {showHeatmap && <div className="bg-white/5 rounded-lg p-4"><h4 className="text-white font-semibold mb-3 flex items-center justify-between">Performance Heatmap <span className="text-[10px] uppercase tracking-wide text-gray-400">Tap a sector to filter movers</span></h4><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">{sortedSectors.map(sec=> { const val=getPerformanceValue(sec); const active = selectedSector && selectedSector.toLowerCase()===sec.sector.toLowerCase(); return <button key={sec.sector} onClick={()=> setSelectedSector(active? '': sec.sector)} className={`rounded-lg p-3 text-center border backdrop-blur-sm hover:scale-[1.03] transition-transform w-full ${active? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900':''}`} style={{background:performanceToGradient(val), borderColor:'rgba(255,255,255,0.1)'}}><p className="text-xs font-medium truncate mb-1">{sec.sector}</p><p className={`text-sm font-bold ${getPerformanceColor(val)}`}>{val>=0?'+':''}{val.toFixed(2)}%</p></button>; })}</div></div>}
              {(topMovers.length>0 || bottomMovers.length>0) && (
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-semibold">Best/Worst Stocks {syncMoversWithPeriod ? getPeriodLabel() : 'Today'}</h4>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                        <input type="checkbox" className="form-checkbox rounded border-white/20 bg-white/10" checked={syncMoversWithPeriod} onChange={(e)=> setSyncMoversWithPeriod(e.target.checked)} />
                        Sync with period
                      </label>
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">Universe: {selectedSector? `${selectedSector} (S&P 500)`:'S&P 500'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-emerald-300 text-xs font-semibold mb-2">Top Gainers</p>
            <ul className="space-y-1">
                        {topMovers.slice(0,10).map(m => {
              const bars = sparks[m.symbol] || [];
              const color = '#34d399';
                          return (
                            <li key={m.symbol} className="flex items-center justify-between text-sm gap-3">
                              <span className="font-medium w-14 shrink-0">{m.symbol}</span>
                {sparkLoading && !bars.length ? <div className="w-20 h-5 bg-white/5 rounded animate-pulse" /> : <MiniSparkline bars={bars} color={color} />}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-gray-300 tabular-nums">${m.price.toFixed(2)}</span>
                                <span className="font-semibold text-emerald-400">+{m.changePercent.toFixed(2)}%</span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div>
                      <p className="text-red-300 text-xs font-semibold mb-2">Top Losers</p>
            <ul className="space-y-1">
                        {bottomMovers.slice(0,10).map(m => {
              const bars = sparks[m.symbol] || [];
              const color = '#f87171';
                          return (
                            <li key={m.symbol} className="flex items-center justify-between text-sm gap-3">
                              <span className="font-medium w-14 shrink-0">{m.symbol}</span>
                {sparkLoading && !bars.length ? <div className="w-20 h-5 bg-white/5 rounded animate-pulse" /> : <MiniSparkline bars={bars} color={color} />}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-gray-300 tabular-nums">${m.price.toFixed(2)}</span>
                                <span className="font-semibold text-red-400">{m.changePercent.toFixed(2)}%</span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-gray-500">{syncMoversWithPeriod ? `${getPeriodLabel()} % change.` : 'Daily % change.'}</p>
                </div>
              )}
              {/* Detailed Sector Analysis table removed per request for a cleaner UI */}
            </div>}
          </div>


          {etfData.length>0 && (
            <div className="bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-black/60 rounded-xl p-6 border border-white/10 mb-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center justify-between">ETF Comparison Tool <span className="text-[10px] uppercase tracking-wide text-gray-400">Snapshot</span></h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">{[{key:'QQQ-SPY',label:'QQQ vs SPY'},{key:'VOO-VUG',label:'VOO vs VUG'},{key:'QQQ-VGT',label:'QQQ vs VGT'},{key:'IVV-VOO',label:'IVV vs VOO'},{key:'VOO-VTI',label:'VOO vs VTI'},{key:'JEPI-JEPQ',label:'JEPI vs JEPQ'}].map(c => <button key={c.key} onClick={()=>setSelectedComparison(c.key)} className={`px-4 py-3 rounded-lg border transition-all ${selectedComparison===c.key?'bg-blue-600 border-blue-500 text-white':'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'}`}>{c.label}</button>)}</div>
              {/* Mode & metric controls */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="bg-white/5 border border-white/10 rounded-md p-1">
                  {(['spread','value'] as const).map(m => (
                    <button key={m} onClick={()=> setEtfCompareMode(m)} className={`px-3 py-1 text-xs rounded ${etfCompareMode===m? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}>{m==='spread'?'Spread':'Value'}</button>
                  ))}
                </div>
                {etfCompareMode==='value' && (
                  <div className="flex flex-wrap items-center gap-2">{(['price','change','volume','ytdReturn','expense','volatility'] as const).map(m => <button key={m} onClick={()=>setEtfMetric(m)} className={`px-3 py-1 rounded-md text-xs border transition-colors ${etfMetric===m?'bg-blue-600 border-blue-500 text-white':'bg-white/5 border-white/10 text-gray-300 hover:text-white'}`}>{m}</button>)}</div>
                )}
                {etfCompareMode==='spread' && (
                  <>
                    <div className="flex items-center gap-2">
                      {(['1mo','3mo','6mo','1y','2y','5y','10y','max'] as const).map(r => (
                        <button key={r} onClick={()=> setEtfRange(r)} className={`px-3 py-1 rounded-md text-xs border transition-colors ${etfRange===r?'bg-blue-600 border-blue-500 text-white':'bg-white/5 border-white/10 text-gray-300 hover:text-white'}`}>{r.toUpperCase()}</button>
                      ))}
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-md p-1">
                      {(['percent','absolute'] as const).map(t => (
                        <button key={t} onClick={()=> setEtfSpreadType(t)} className={`px-3 py-1 text-xs rounded ${etfSpreadType===t? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}>{t==='percent'?'% Spread':'$ Spread'}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {selectedComparison && currentComparison && currentComparison.length>=2 && (
                <div className="space-y-6">
                  {etfCompareMode==='spread' ? (
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-3">Spread over Time ({selectedComparison.replace('-', ' − ')})</h4>
                      <div className="h-80">
                        {etfSeriesLoading ? (
                          <div className="w-full h-full animate-pulse bg-white/5 rounded" />
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={etfSeries} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                              <XAxis dataKey="time" type="number" domain={["dataMin","dataMax"]} tick={{fontSize:11,fill:'#f1f5f9'}} tickFormatter={(t)=> new Date(Number(t)).toLocaleDateString()} />
                              <YAxis tick={{fontSize:11,fill:'#f1f5f9'}} label={{ value: etfSpreadType==='percent' ? 'Spread (%)' : 'Spread ($)', angle: -90, position: 'insideLeft', style:{ textAnchor:'middle', fill:'#f1f5f9' } }} />
                              <Tooltip contentStyle={{backgroundColor:'rgba(15,23,42,0.95)',border:'1px solid rgba(148,163,184,0.3)',borderRadius:'8px',color:'#ffffff'}} formatter={(v:any)=> etfSpreadType==='percent' ? [`${Number(v).toFixed(2)}%`, 'Spread'] : [`$${Number(v).toFixed(2)}`, 'Spread']} labelFormatter={(l)=> new Date(Number(l)).toLocaleDateString()} />
                              <Line type="monotone" dataKey="spread" stroke="#60a5fa" strokeWidth={2} dot={false} activeDot={{ r: 3, stroke: '#93c5fd', strokeWidth: 1 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                      <p className="mt-2 text-[10px] text-gray-500">Spread defined as {etfSpreadType==='percent'? '100 × (A / B − 1)' : 'A − B'}. Range {etfRange.toUpperCase()}, daily bars.</p>
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-3 capitalize">{etfMetric==='price'?'Price':etfMetric==='change'?'Daily Change %':etfMetric==='volume'?'Volume':etfMetric==='ytdReturn'?'YTD Return %':etfMetric==='expense'?'Expense Ratio %':'Volatility %'} Comparison</h4>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={currentComparison} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="symbol" tick={{fontSize:12,fill:'#f1f5f9'}} />
                            <YAxis tick={{fontSize:11,fill:'#f1f5f9'}} label={etfMetric==='price'?{value:'Price ($)',angle:-90,position:'insideLeft',style:{textAnchor:'middle',fill:'#f1f5f9'}}:undefined} />
                            <Tooltip contentStyle={{backgroundColor:'rgba(15,23,42,0.95)',border:'1px solid rgba(148,163,184,0.3)',borderRadius:'8px',color:'#ffffff'}} formatter={(v:any)=> etfMetric==='price'?[`$${Number(v).toFixed(2)}`,'Price']:etfMetric==='volume'?[Number(v).toLocaleString(),'Volume']:[`${Number(v).toFixed(2)}%`,'Value']} />
                            <Line type="monotone" dataKey={etfMetric} stroke="#6366f1" strokeWidth={2} dot={{ r: 3, stroke: '#818cf8', strokeWidth: 1, fill: '#818cf8' }} activeDot={{ r: 4, stroke: '#93c5fd', strokeWidth: 1 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  <div className="bg-white/5 rounded-lg p-4"><h4 className="text-white font-semibold mb-3">Detailed Comparison</h4><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/10"><th className="text-left py-2 text-gray-300">Symbol</th><th className="text-right py-2 text-gray-300">Price</th><th className="text-right py-2 text-gray-300">Change</th><th className="text-right py-2 text-gray-300">Volume</th><th className="text-right py-2 text-gray-300">High</th><th className="text-right py-2 text-gray-300">Low</th><th className="text-right py-2 text-gray-300">YTD</th><th className="text-right py-2 text-gray-300">Exp%</th><th className="text-right py-2 text-gray-300">Vol%</th></tr></thead><tbody>{currentComparison.map(etf => <tr key={etf.symbol} className="border-b border-white/5"><td className="py-3 font-medium">{etf.symbol}</td><td className="py-3 text-right">{typeof etf.price==='number'?`$${etf.price.toFixed(2)}`:'—'}</td><td className={`py-3 text-right font-medium ${getPerformanceColor(etf.change)}`}>{typeof etf.change==='number'?(etf.change>=0?'+':'')+etf.change.toFixed(2)+'%':'—'}</td><td className="py-3 text-right text-gray-300">{typeof etf.volume==='number'?etf.volume.toLocaleString():'—'}</td><td className="py-3 text-right text-gray-300">{typeof etf.high==='number'?`$${etf.high.toFixed(2)}`:'—'}</td><td className="py-3 text-right text-gray-300">{typeof etf.low==='number'?`$${etf.low.toFixed(2)}`:'—'}</td><td className={`py-3 text-right font-medium ${getPerformanceColor(etf.ytdReturn)}`}>{typeof etf.ytdReturn==='number'?(etf.ytdReturn>=0?'+':'')+etf.ytdReturn.toFixed(2)+'%':'—'}</td><td className="py-3 text-right text-gray-300">{typeof etf.expense==='number'?etf.expense.toFixed(2)+'%':'—'}</td><td className="py-3 text-right text-gray-300">{typeof etf.volatility==='number'?etf.volatility.toFixed(2)+'%':'—'}</td></tr>)}</tbody></table></div></div>
                </div>
              )}

              {/* Composite Risk Regime & Ratios (moved here) */}
              {(riskSummary || Object.keys(riskRatios).length>0 || recessionIndex) && (
                <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-1 bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold">Composite Risk Regime</h4>
                      {riskSummary && (
                        <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${riskSummary.regime==='Risk-On'?'bg-emerald-900/30 text-emerald-300': riskSummary.regime==='Risk-Off'?'bg-red-900/30 text-red-300':'bg-slate-700/60 text-slate-200'}`}>
                          {riskSummary.regime}
                        </span>
                      )}
                    </div>
                    {riskSummary ? (
                      <>
                        <div className="text-sm text-gray-300">Votes: <span className="text-emerald-300 font-semibold">ON {riskSummary.votes.on}</span> • <span className="text-red-300 font-semibold">OFF {riskSummary.votes.off}</span> • <span className="text-gray-300">NEU {riskSummary.votes.neutral}</span></div>
                        <div className="mt-3 grid grid-cols-1 gap-2">
                          {riskSummary.signals.map(s => (
                            <div key={s.key} className="flex items-center justify-between bg-slate-900/40 border border-white/10 rounded-md px-2 py-1 text-[12px]">
                              <span className="text-slate-300">{s.label}</span>
                              <span className={`font-semibold ${s.dir==='risk-on'?'text-emerald-300': s.dir==='risk-off'?'text-red-300':'text-slate-300'}`}>{s.dir.toUpperCase()}{s.note?` • ${s.note}`:''}</span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-[10px] text-gray-500">Heuristic regime from ratio trends (SMA20 vs SMA60) and MOVE/SKEW thresholds.</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">Loading regime…</p>
                    )}
                  </div>
                  <div className="xl:col-span-2 bg-white/5 rounded-lg p-4 border border-white/10">
                    <h4 className="text-white font-semibold mb-2">Risk-On / Risk-Off Ratios</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {recessionIndex && (
                        <div className="flex items-start justify-between bg-slate-800/60 rounded-md p-3 border border-white/10">
                          <div className="pr-3">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-slate-100">Recession Index (mspred)</div>
                              {mspredRisk && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${mspredRisk.badge}`}>{mspredRisk.level} risk</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">TB3MS / BAMLH0A0HYM2 • lower = higher recession risk (HY stress); higher = lower risk</div>
                          </div>
                          <div className="text-right min-w-[90px]">
                            <div className="font-bold text-slate-100">{recessionIndex.value.toFixed(3)}</div>
                            <div className="text-[10px] text-slate-500">last {new Date(recessionIndex.date).toLocaleDateString()}</div>
                            {mspredDelta && (
                              <div className={`text-[10px] ${mspredDelta.diff>=0? 'text-emerald-300':'text-red-300'}`}>
                                {mspredDelta.diff>=0? '+' : ''}{(mspredDelta.diff).toFixed(3)} vs 20M avg
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {Object.entries(riskRatios).map(([k,v])=> (
                        <div key={k} className="flex items-start justify-between bg-slate-800/60 rounded-md p-3 border border-white/10">
                          <div className="pr-3">
                            <div className="font-semibold text-slate-100">{k}</div>
                            <div className="text-[11px] text-slate-400">
                              {k==='VVIX/VIX' && 'Vol-of-vol vs VIX: options market stress.'}
                              {k==='SPHB/SPLV' && 'High beta vs low volatility: rising = risk-on, falling = risk-off.'}
                              {k==='XLY/XLP' && 'Discretionary vs Staples: confidence (XLY) vs defensive (XLP).'}
                              {k==='IWD/IWF' && 'Value vs Growth: preference for defensives vs growth.'}
                              {k==='HYG/IEF' && 'High yield vs Treasuries: risk appetite.'}
                              {k==='HG/GC' && 'Copper vs Gold: economic growth vs risk aversion.'}
                              {k==='MOVE' && 'Bond volatility (MOVE): credit/rates stress.'}
                              {k==='SKEW' && 'CBOE SKEW: tail-risk of extreme events.'}
                            </div>
                          </div>
                          <div className="text-right min-w-[90px]">
                            <div className="font-bold text-slate-100">{typeof v==='number' ? (k==='MOVE'||k==='SKEW'? v.toFixed(0) : v.toFixed(3)) : '—'}</div>
                            <div className="text-[10px] text-slate-500">{(k==='MOVE'||k==='SKEW')?'index':'ratio'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Q-CTA Position Indicator Card (optional display) */}
                </div>
              )}
              {/* New extended comparison tool (synthetic demo). Real data already powering snapshot above. */}
              {/* Extended ETFComparisonTool removed per request */}
            </div>
          )}

          {/* REAL FRED + OpenAI section removed per request */}

          {/* Economic Calendar */}
          <div className="bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-black/60 rounded-2xl p-6 border border-white/10 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Calendar className="w-7 h-7 text-cyan-400" /> Economic Calendar
              </h2>
              <span className="text-[10px] uppercase tracking-wide text-gray-400">Next 2–4 weeks</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <EconomicCalendar />
            </div>
          </div>

          {/* Earnings Calendar */}
          <div className="bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-black/60 rounded-2xl p-6 border border-white/10 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Calendar className="w-7 h-7 text-cyan-400" /> Earnings Calendar
              </h2>
              <span className="text-[10px] uppercase tracking-wide text-gray-400">Next 2–4 weeks</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <EarningsCalendar />
            </div>
          </div>

          {/* Latest News simplified to only left column (NewsWidget) */}
          <div className="bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-black/60 rounded-xl p-6 border border-white/10 mb-8 max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Latest News</h2>
              <span className="text-[10px] uppercase tracking-wide text-gray-400">Global</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              {React.createElement(dynamic(()=> import('@/components/NewsWidget'), { ssr:false }))}
            </div>
          </div>

          

        </div>

  {/* Data Sources & Integrity section removed per request */}

        <Footer />
      </div>
    </RequirePlan>
  );
}
