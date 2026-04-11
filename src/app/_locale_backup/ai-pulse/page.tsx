'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import LocalErrorBoundary from '@/components/LocalErrorBoundary';
import Footer from '@/components/Footer';
import RequirePlan from '@/components/RequirePlan';
import Link from 'next/link';
import { RefreshCw, ArrowLeft, Clock, Zap, TrendingUp, TrendingDown, BarChart3, Activity, AlertTriangle, Target, Radio } from 'lucide-react';
import dynamic from 'next/dynamic';

const NewsWidget = dynamic(() => import('@/components/NewsWidget'), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────
interface SectorPerformance {
  sector: string; daily: number; weekly: number; monthly: number; quarterly: number;
  sixMonth?: number; ytd?: number; fiftyTwoWeek?: number; yearly: number;
  marketCap: number; volume: number; topStocks: string[];
}
interface Mover { symbol: string; price: number; changePercent: number; change?: number; }
interface StockQuote {
  symbol: string; shortName?: string; longName?: string; regularMarketPrice?: number;
  regularMarketChange?: number; regularMarketChangePercent?: number; regularMarketVolume?: number;
  averageDailyVolume3Month?: number; marketCap?: number; trailingPE?: number; forwardPE?: number;
  epsTrailingTwelveMonths?: number; fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number;
  fiftyDayAverage?: number; twoHundredDayAverage?: number; sector?: string; industry?: string;
  sharesOutstanding?: number; revenueGrowth?: number; earningsGrowth?: number;
  [k: string]: unknown;
}
interface AIEconomicAnalysis {
  currentCycle: string; direction: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  confidence: number; timeframe: string; keyFactors: string[]; risks: string[];
  opportunities: string[]; summary: string; recommendation: string;
}

// ─── S&P 500 Sector → Top Stocks Map ────────────────────────────────
const SECTOR_STOCKS: Record<string, string[]> = {
  'Information Technology': ['AAPL', 'MSFT', 'NVDA', 'AVGO', 'CRM', 'ADBE', 'CSCO', 'ACN', 'ORCL', 'INTC', 'AMD', 'QCOM'],
  'Health Care': ['UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'PFE', 'TMO', 'ABT', 'DHR', 'BMY'],
  'Financials': ['BRK-B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'SPGI', 'BLK'],
  'Consumer Discretionary': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'LOW', 'SBUX', 'TJX', 'BKNG', 'CMG'],
  'Communication Services': ['GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS'],
  'Industrials': ['GE', 'CAT', 'UNP', 'HON', 'UPS', 'BA', 'RTX', 'DE', 'LMT'],
  'Consumer Staples': ['PG', 'KO', 'PEP', 'COST', 'WMT', 'PM', 'MO', 'MDLZ'],
  'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PXD', 'VLO'],
  'Utilities': ['NEE', 'DUK', 'SO', 'D', 'AEP', 'SRE', 'EXC'],
  'Real Estate': ['PLD', 'AMT', 'CCI', 'EQIX', 'PSA', 'SPG', 'O'],
  'Materials': ['LIN', 'APD', 'SHW', 'FCX', 'NEM', 'ECL', 'DD'],
};

const STOCK_WEIGHTS: Record<string, number> = {
  AAPL: 30, MSFT: 28, NVDA: 26, AMZN: 18, GOOGL: 18, META: 14, TSLA: 10, 'BRK-B': 9,
  UNH: 8, JNJ: 7, LLY: 8, JPM: 7, V: 6, XOM: 6, PG: 5, MA: 5, HD: 5, CVX: 5,
  MRK: 5, ABBV: 5, KO: 4, PEP: 4, AVGO: 7, CRM: 4, COST: 4, WMT: 4, NFLX: 4,
  ADBE: 4, CSCO: 4, ACN: 4, MCD: 4, ABT: 4, DHR: 4, TXN: 3, NEE: 3, PM: 3,
  UNP: 3, HON: 3, LOW: 3, NKE: 3, CAT: 3, BA: 3, GE: 3, LMT: 3, GS: 3,
  INTC: 2, AMD: 4, QCOM: 3, IBM: 2, PLD: 2, AMT: 2, SPG: 2, LIN: 3, BLK: 3,
  SPGI: 3, ORCL: 4, DIS: 2, CMCSA: 2, T: 2, VZ: 2, SLB: 2, COP: 3, EOG: 2,
  FCX: 2, NEM: 2, DUK: 2, SO: 2, D: 2, AEP: 2, SRE: 2,
};

// ─── Panel (terminal style) ─────────────────────────────────────────
function Panel({ children, className = '', title, badge, actions }: {
  children: React.ReactNode; className?: string; title?: string; badge?: string; actions?: React.ReactNode;
}) {
  return (
    <div className={`bg-[#0b1120] border border-[#1e293b] rounded-lg overflow-hidden flex flex-col ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e293b] bg-[#0f172a]/60 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide">{title}</span>
            {badge && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/20">{badge}</span>}
          </div>
          {actions && <div className="flex items-center gap-1.5">{actions}</div>}
        </div>
      )}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AIPulsePage({ params }: { params: Promise<{ locale: string }> }) {
  const fetchT = useCallback(async (input: RequestInfo | URL, timeoutMs = 10000, init?: RequestInit) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try { return await fetch(input, { ...(init || {}), signal: ctrl.signal }); } finally { clearTimeout(t); }
  }, []);

  // ─── State ─────────────────────────────────────────────────────
  const [sectorData, setSectorData] = useState<SectorPerformance[]>([]);
  const [allMovers, setAllMovers] = useState<Mover[]>([]);
  const [topMovers, setTopMovers] = useState<Mover[]>([]);
  const [bottomMovers, setBottomMovers] = useState<Mover[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [stockDetail, setStockDetail] = useState<StockQuote | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIEconomicAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [error, setError] = useState('');
  const [screenerSort, setScreenerSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'changePercent', dir: 'desc' });
  const [dataHealth, setDataHealth] = useState({ sector: false, movers: false, ai: false });

  // ─── Fetchers ──────────────────────────────────────────────────
  const fetchSectorData = useCallback(async () => {
    try {
      setRefreshing(true);
      const r = await fetchT('/api/sector-performance', 12000, { cache: 'no-store' });
      if (!r.ok) throw new Error('sector');
      const j = await r.json();
      const sectors = j.sectors || [];
      setSectorData(sectors);
      setDataHealth(h => ({ ...h, sector: sectors.length > 0 }));
      setLastUpdated(j.lastUpdated || new Date().toISOString());
      setError('');
    } catch (e) { console.error(e); setError('Failed to load sector data'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [fetchT]);

  const fetchTopMovers = useCallback(async () => {
    try {
      const r = await fetchT('/api/top-movers?limit=25&period=daily', 8000, { cache: 'no-store' });
      if (!r.ok) throw new Error('movers');
      const j = await r.json();
      const top = (j.top || []).map((m: Record<string, unknown>) => ({
        symbol: String(m.symbol || ''), price: Number(m.price) || 0,
        changePercent: Number(m.changePercent) || 0, change: Number(m.change) || 0,
      }));
      const bottom = (j.bottom || []).map((m: Record<string, unknown>) => ({
        symbol: String(m.symbol || ''), price: Number(m.price) || 0,
        changePercent: Number(m.changePercent) || 0, change: Number(m.change) || 0,
      }));
      setTopMovers(top); setBottomMovers(bottom);
      setAllMovers([...top, ...bottom]);
      setDataHealth(h => ({ ...h, movers: top.length > 0 }));
    } catch (e) { console.error(e); }
  }, [fetchT]);

  const fetchAIAnalysis = useCallback(async () => {
    try {
      const r = await fetchT('/api/ai-economic-analysis', 12000);
      if (!r.ok) return;
      const j = await r.json();
      const analysis = j.data?.analysis || j;
      setAiAnalysis(analysis);
      setDataHealth(h => ({ ...h, ai: !!analysis }));
    } catch (e) { console.error(e); }
  }, [fetchT]);

  const fetchStockDetail = useCallback(async (symbol: string) => {
    try {
      const r = await fetchT(`/api/yahoo-quotes?symbols=${encodeURIComponent(symbol)}`, 8000);
      if (!r.ok) return;
      const j = await r.json();
      const quotes = j.data || [];
      if (quotes.length > 0) setStockDetail(quotes[0]);
    } catch (e) { console.error(e); }
  }, [fetchT]);

  // ─── Effects ───────────────────────────────────────────────────
  useEffect(() => { fetchSectorData(); fetchTopMovers(); fetchAIAnalysis(); }, [fetchSectorData, fetchTopMovers, fetchAIAnalysis]);

  useEffect(() => {
    const heavy = setInterval(() => {
      if (document.visibilityState === 'visible') { fetchSectorData(); fetchTopMovers(); fetchAIAnalysis(); }
    }, 600000);
    const movers = setInterval(() => {
      if (document.visibilityState === 'visible') fetchTopMovers();
    }, 180000);
    return () => { clearInterval(heavy); clearInterval(movers); };
  }, [fetchSectorData, fetchTopMovers, fetchAIAnalysis]);

  useEffect(() => { if (selectedSymbol) fetchStockDetail(selectedSymbol); }, [selectedSymbol, fetchStockDetail]);

  // ─── Derived data ─────────────────────────────────────────────
  const stockMap = useMemo(() => {
    const m: Record<string, Mover> = {};
    for (const s of allMovers) m[s.symbol] = s;
    return m;
  }, [allMovers]);

  const screenerData = useMemo(() => {
    const arr = [...allMovers];
    arr.sort((a, b) => {
      const col = screenerSort.col as keyof Mover;
      const va = (a[col] ?? 0) as number;
      const vb = (b[col] ?? 0) as number;
      return screenerSort.dir === 'desc' ? vb - va : va - vb;
    });
    return arr;
  }, [allMovers, screenerSort]);

  const industryRanks = useMemo(() => [...sectorData].sort((a, b) => b.daily - a.daily), [sectorData]);

  const breadth = useMemo(() => {
    const up = allMovers.filter(m => m.changePercent > 0).length;
    const down = allMovers.filter(m => m.changePercent < 0).length;
    const total = allMovers.length || 1;
    return { up, down, unchanged: total - up - down, total, upPct: Math.round((up / total) * 100), downPct: Math.round((down / total) * 100) };
  }, [allMovers]);

  const stageData = useMemo(() => {
    let s1 = 0, s2 = 0, s3 = 0, s4 = 0;
    for (const s of sectorData) {
      if (s.daily > 1 && s.weekly > 0) s2++;
      else if (s.daily > 0 && s.weekly <= 0) s3++;
      else if (s.daily <= -1) s4++;
      else s1++;
    }
    const total = s1 + s2 + s3 + s4 || 1;
    return { s1, s2, s3, s4, total, s1p: Math.round((s1 / total) * 100), s2p: Math.round((s2 / total) * 100), s3p: Math.round((s3 / total) * 100), s4p: Math.round((s4 / total) * 100) };
  }, [sectorData]);

  const rrg = useMemo(() => {
    return sectorData.map(s => {
      const rs = 50 + (s.daily * 10) + (s.weekly * 3);
      const mom = 50 + (s.daily * 8);
      let quadrant: 'Leading' | 'Weakening' | 'Lagging' | 'Improving';
      if (rs >= 50 && mom >= 50) quadrant = 'Leading';
      else if (rs >= 50 && mom < 50) quadrant = 'Weakening';
      else if (rs < 50 && mom < 50) quadrant = 'Lagging';
      else quadrant = 'Improving';
      return { sector: s.sector, rs: Math.max(10, Math.min(90, rs)), mom: Math.max(10, Math.min(90, mom)), daily: s.daily, quadrant };
    });
  }, [sectorData]);

  // ─── Helpers ───────────────────────────────────────────────────
  const pctColor = (v: number) => v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-gray-400';
  const pctBgAlpha = (v: number) => v > 1.5 ? 'bg-emerald-500/30' : v > 0 ? 'bg-emerald-500/15' : v > -1.5 ? 'bg-red-500/15' : 'bg-red-500/30';
  const fmt = (v: number, d = 2) => Number.isFinite(v) ? v.toFixed(d) : '—';
  const fmtPct = (v: number) => (v >= 0 ? '+' : '') + fmt(v);
  const fmtNum = (v: number) => {
    if (!Number.isFinite(v)) return '—';
    if (v >= 1e12) return (v / 1e12).toFixed(1) + 'T';
    if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return v.toLocaleString();
  };

  const handleScreenerSort = (col: string) => {
    setScreenerSort(prev => prev.col === col ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' });
  };

  const healthCount = Object.values(dataHealth).filter(Boolean).length;
  const healthTotal = Object.keys(dataHealth).length;

  // ─── Loading ──────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#060a13] flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 animate-spin" />
          <Zap className="absolute inset-0 m-auto w-6 h-6 text-blue-400" />
        </div>
        <p className="text-white/80 text-lg font-medium">Initializing AI Pulse</p>
        <p className="text-gray-500 text-sm mt-1">Loading terminal...</p>
      </div>
    </div>
  );

  if (error && sectorData.length === 0) return (
    <div className="min-h-screen bg-[#060a13]">
      <div className="container mx-auto px-4 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors border border-white/[0.06] mb-8">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="bg-red-500/5 backdrop-blur-md rounded-2xl p-8 border border-red-500/10">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Unable to Load Data</h1>
          <p className="text-gray-400">{error}</p>
          <button onClick={() => { setError(''); setLoading(true); fetchSectorData(); }} className="mt-4 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg border border-red-500/20 transition-colors">Retry</button>
        </div>
      </div>
    </div>
  );

  // ─── RENDER ────────────────────────────────────────────────────
  return (
    <LocalErrorBoundary fallbackTitle="AI Pulse section error">
      <RequirePlan min="free">
        <div className="min-h-screen bg-[#060a13] text-white font-sans">

          {/* ═══ HEADER ═══ */}
          <header className="sticky top-0 z-30 bg-[#060a13]/95 backdrop-blur-md border-b border-[#1e293b]">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <Link href="/dashboard" className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors" title="Dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div className="w-7 h-7 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-tight leading-none">AI Pulse Terminal</h1>
                  <p className="text-[9px] text-gray-500 hidden sm:block">Real-Time Market Intelligence</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1 text-[10px]">
                  {Object.entries(dataHealth).map(([key, ok]) => (
                    <div key={key} className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-gray-600'}`} title={`${key}: ${ok ? 'connected' : 'pending'}`} />
                  ))}
                  <span className="text-gray-500 ml-0.5">{healthCount}/{healthTotal}</span>
                </div>
                {lastUpdated && (
                  <span className="text-[10px] text-gray-500 hidden md:flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <button onClick={() => { fetchSectorData(); fetchTopMovers(); fetchAIAnalysis(); }}
                  className="p-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-[#1e293b] text-gray-400 hover:text-white transition-all"
                  disabled={refreshing}>
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </header>

          {/* ═══ MAIN GRID ═══ */}
          <main className="p-2 space-y-2">

            {/* ─── ROW 1: Heatmap | Screener | Company + Industry ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">

              {/* 1. SECTOR HEATMAP */}
              <Panel title="S&P 500 Sector Heatmap" badge="LIVE" className="lg:col-span-4 min-h-[340px]">
                <div className="p-2">
                  <div className="grid gap-1">
                    {sectorData.slice(0, 11).map(sector => {
                      const stocks = SECTOR_STOCKS[sector.sector] || [];
                      return (
                        <div key={sector.sector}>
                          <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider px-1 py-0.5">{sector.sector}</div>
                          <div className="flex flex-wrap gap-0.5">
                            {stocks.slice(0, 8).map(sym => {
                              const mover = stockMap[sym];
                              const pct = mover?.changePercent ?? sector.daily;
                              const weight = STOCK_WEIGHTS[sym] || 2;
                              const w = Math.max(32, Math.min(80, weight * 3));
                              return (
                                <button key={sym} onClick={() => setSelectedSymbol(sym)}
                                  className={`rounded text-center transition-all hover:ring-1 hover:ring-white/30 ${selectedSymbol === sym ? 'ring-1 ring-blue-400' : ''}`}
                                  style={{ width: `${w}px`, minHeight: '28px' }}
                                  title={`${sym}: ${fmtPct(pct)}%`}>
                                  <div className={`rounded px-1 py-1 h-full flex flex-col items-center justify-center ${pctBgAlpha(pct)}`}>
                                    <span className="text-[9px] font-bold text-white leading-none">{sym}</span>
                                    <span className={`text-[8px] font-mono ${pctColor(pct)}`}>{fmtPct(pct)}%</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Panel>

              {/* 2. STOCK SCREENER + PRICE BARS */}
              <Panel title="Stock Screener" badge={`${allMovers.length} stocks`} className="lg:col-span-4 min-h-[340px]"
                actions={<span className="text-[9px] text-gray-500">S&P 500</span>}>
                <div className="divide-y divide-[#1e293b]/50">
                  <div className="overflow-auto max-h-[180px]">
                    <table className="w-full text-[10px]">
                      <thead className="sticky top-0 bg-[#0f172a] z-10">
                        <tr className="text-gray-500 uppercase tracking-wider">
                          <th className="text-left py-1.5 px-2 font-medium cursor-pointer hover:text-gray-300" onClick={() => handleScreenerSort('symbol')}>Symbol</th>
                          <th className="text-right py-1.5 px-2 font-medium cursor-pointer hover:text-gray-300" onClick={() => handleScreenerSort('price')}>Last</th>
                          <th className="text-right py-1.5 px-2 font-medium cursor-pointer hover:text-gray-300" onClick={() => handleScreenerSort('changePercent')}>% Chg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {screenerData.slice(0, 20).map(m => (
                          <tr key={m.symbol}
                            className={`hover:bg-white/[0.03] cursor-pointer transition-colors ${selectedSymbol === m.symbol ? 'bg-blue-500/10' : ''}`}
                            onClick={() => setSelectedSymbol(m.symbol)}>
                            <td className="py-1 px-2 font-semibold text-white">{m.symbol}</td>
                            <td className="py-1 px-2 text-right font-mono tabular-nums text-gray-300">${fmt(m.price)}</td>
                            <td className={`py-1 px-2 text-right font-mono tabular-nums font-semibold ${pctColor(m.changePercent)}`}>{fmtPct(m.changePercent)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Price Change Bars */}
                  <div className="p-2">
                    <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Price % Change Today</div>
                    <div className="space-y-0.5">
                      {[...topMovers.slice(0, 5), ...bottomMovers.slice(0, 5)]
                        .sort((a, b) => b.changePercent - a.changePercent)
                        .map(m => {
                          const maxAbs = Math.max(
                            ...topMovers.map(t => Math.abs(t.changePercent)),
                            ...bottomMovers.map(t => Math.abs(t.changePercent)), 1
                          );
                          const barW = Math.abs(m.changePercent) / maxAbs * 100;
                          return (
                            <div key={m.symbol} className="flex items-center gap-1 h-4 cursor-pointer hover:bg-white/[0.03] rounded"
                              onClick={() => setSelectedSymbol(m.symbol)}>
                              <span className="text-[9px] font-semibold text-gray-300 w-10 text-right shrink-0">{m.symbol}</span>
                              <div className="flex-1 h-3 relative">
                                <div className={`h-full rounded-sm ${m.changePercent >= 0 ? 'bg-emerald-500/60' : 'bg-red-500/60'}`}
                                  style={{ width: `${Math.max(2, barW)}%` }} />
                              </div>
                              <span className={`text-[9px] font-mono w-12 text-right ${pctColor(m.changePercent)}`}>{fmtPct(m.changePercent)}%</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </Panel>

              {/* 3+4. COMPANY DETAIL + INDUSTRY RANKS */}
              <div className="lg:col-span-4 flex flex-col gap-2">
                {/* Company Detail */}
                <Panel title={selectedSymbol ? `Company: ${selectedSymbol}` : 'Company Info'} badge={stockDetail ? 'LIVE' : undefined} className="flex-1 min-h-[160px]">
                  {stockDetail ? (
                    <div className="p-3 space-y-2 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-white">{stockDetail.symbol}</span>
                        <span className={`text-sm font-bold ${pctColor(stockDetail.regularMarketChangePercent ?? 0)}`}>
                          ${fmt(stockDetail.regularMarketPrice ?? 0)}
                        </span>
                      </div>
                      <p className="text-gray-400 text-[10px] truncate">{stockDetail.shortName || stockDetail.longName || ''}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                        {([
                          ['Market Cap', fmtNum(stockDetail.marketCap ?? 0)],
                          ['% Change', `${fmtPct(stockDetail.regularMarketChangePercent ?? 0)}%`],
                          ['Sector', String(stockDetail.sector || 'N/A')],
                          ['Industry', String(stockDetail.industry || 'N/A')],
                          ['Volume', fmtNum(stockDetail.regularMarketVolume ?? 0)],
                          ['Avg Vol', fmtNum(stockDetail.averageDailyVolume3Month ?? 0)],
                          ['PE Ratio', fmt(stockDetail.trailingPE ?? 0, 1)],
                          ['Forward PE', fmt(stockDetail.forwardPE ?? 0, 1)],
                          ['EPS', fmt(stockDetail.epsTrailingTwelveMonths ?? 0)],
                          ['52W High', `$${fmt(stockDetail.fiftyTwoWeekHigh ?? 0)}`],
                          ['52W Low', `$${fmt(stockDetail.fiftyTwoWeekLow ?? 0)}`],
                          ['50D Avg', `$${fmt(stockDetail.fiftyDayAverage ?? 0)}`],
                        ] as [string, string][]).map(([label, val]) => (
                          <div key={label} className="flex justify-between">
                            <span className="text-gray-500">{label}</span>
                            <span className="text-gray-200 font-mono truncate ml-1">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-xs">
                      <Activity className="w-6 h-6 mx-auto mb-2 opacity-30" />
                      Click a stock to view details
                    </div>
                  )}
                </Panel>

                {/* Industry Ranking */}
                <Panel title="Industry Performance" badge="TODAY" className="min-h-[160px]">
                  <div className="p-2 space-y-0.5">
                    {industryRanks.slice(0, 11).map((s, i) => {
                      const maxAbs = Math.max(...industryRanks.map(x => Math.abs(x.daily)), 1);
                      const barW = Math.abs(s.daily) / maxAbs * 100;
                      return (
                        <div key={s.sector} className="flex items-center gap-1.5 h-5">
                          <span className="text-[8px] text-gray-500 w-3 text-right">{i + 1}</span>
                          <span className="text-[9px] text-gray-300 w-20 truncate">{s.sector.replace('Consumer ', 'Cons. ').replace('Information ', '')}</span>
                          <div className="flex-1 h-3 bg-white/[0.02] rounded-sm overflow-hidden">
                            <div className={`h-full rounded-sm transition-all ${s.daily >= 0 ? 'bg-emerald-500/50' : 'bg-red-500/50'}`}
                              style={{ width: `${Math.max(2, barW)}%` }} />
                          </div>
                          <span className={`text-[9px] font-mono w-10 text-right ${pctColor(s.daily)}`}>{fmtPct(s.daily)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </div>
            </div>

            {/* ─── ROW 2: Breadth + Stages | AI Insight ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">

              {/* 5. MARKET BREADTH + STAGE ANALYSIS */}
              <div className="lg:col-span-4 flex flex-col gap-2">
                <Panel title="Market Breadth" className="min-h-[120px]">
                  <div className="p-3 space-y-3">
                    {[
                      { label: 'Advance vs Decline', up: breadth.up, down: breadth.down, upL: `${breadth.up} Adv`, downL: `${breadth.down} Dec` },
                      { label: 'Up % vs Down %', up: breadth.upPct, down: breadth.downPct, upL: `${breadth.upPct}%`, downL: `${breadth.downPct}%` },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-[9px] text-gray-500 mb-1">
                          <span>{item.label}</span>
                          <span>{item.upL} / {item.downL}</span>
                        </div>
                        <div className="flex h-3 rounded overflow-hidden bg-white/[0.03]">
                          <div className="bg-emerald-500/60 h-full transition-all" style={{ width: `${item.up / (item.up + item.down || 1) * 100}%` }} />
                          <div className="bg-red-500/60 h-full transition-all" style={{ width: `${item.down / (item.up + item.down || 1) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-emerald-500/10 rounded p-1.5">
                        <p className="text-lg font-bold text-emerald-400">{breadth.up}</p>
                        <p className="text-[8px] text-emerald-300/60 uppercase">Advancing</p>
                      </div>
                      <div className="bg-gray-500/10 rounded p-1.5">
                        <p className="text-lg font-bold text-gray-400">{breadth.unchanged}</p>
                        <p className="text-[8px] text-gray-500 uppercase">Unchanged</p>
                      </div>
                      <div className="bg-red-500/10 rounded p-1.5">
                        <p className="text-lg font-bold text-red-400">{breadth.down}</p>
                        <p className="text-[8px] text-red-300/60 uppercase">Declining</p>
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Stage Analysis" badge="Weinstein">
                  <div className="p-3">
                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                      {[
                        { label: 'Stage 1', sub: 'Accumulation', pct: stageData.s1p, color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/20' },
                        { label: 'Stage 2', sub: 'Uptrend', pct: stageData.s2p, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20' },
                        { label: 'Stage 3', sub: 'Distribution', pct: stageData.s3p, color: 'bg-amber-500/20 text-amber-300 border-amber-500/20' },
                        { label: 'Stage 4', sub: 'Downtrend', pct: stageData.s4p, color: 'bg-red-500/20 text-red-300 border-red-500/20' },
                      ].map(s => (
                        <div key={s.label} className={`rounded-lg p-2 border text-center ${s.color}`}>
                          <p className="text-[10px] font-semibold">{s.label}</p>
                          <p className="text-lg font-bold">{s.pct}%</p>
                          <p className="text-[8px] opacity-70">{s.sub}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex h-4 rounded overflow-hidden">
                      <div className="bg-cyan-500/40 transition-all" style={{ width: `${stageData.s1p}%` }} />
                      <div className="bg-emerald-500/40 transition-all" style={{ width: `${stageData.s2p}%` }} />
                      <div className="bg-amber-500/40 transition-all" style={{ width: `${stageData.s3p}%` }} />
                      <div className="bg-red-500/40 transition-all" style={{ width: `${stageData.s4p}%` }} />
                    </div>
                  </div>
                </Panel>
              </div>

              {/* 6. AI INSIGHT PANEL */}
              <Panel title="AI Market Intelligence" badge={aiAnalysis ? 'AI LIVE' : 'WAITING'} className="lg:col-span-8 min-h-[280px]">
                {aiAnalysis ? (
                  <div className="p-4 space-y-4">
                    <div className="flex items-start gap-4 flex-wrap">
                      <div className={`rounded-lg px-4 py-3 border ${
                        aiAnalysis.direction === 'bullish' ? 'bg-emerald-500/10 border-emerald-500/20' :
                        aiAnalysis.direction === 'bearish' ? 'bg-red-500/10 border-red-500/20' :
                        'bg-amber-500/10 border-amber-500/20'
                      }`}>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider">Direction</p>
                        <div className="flex items-center gap-2 mt-1">
                          {aiAnalysis.direction === 'bullish' ? <TrendingUp className="w-5 h-5 text-emerald-400" /> :
                           aiAnalysis.direction === 'bearish' ? <TrendingDown className="w-5 h-5 text-red-400" /> :
                           <BarChart3 className="w-5 h-5 text-amber-400" />}
                          <span className={`text-xl font-bold capitalize ${
                            aiAnalysis.direction === 'bullish' ? 'text-emerald-400' :
                            aiAnalysis.direction === 'bearish' ? 'text-red-400' : 'text-amber-400'
                          }`}>{aiAnalysis.direction}</span>
                        </div>
                      </div>
                      <div className="rounded-lg px-4 py-3 border border-[#1e293b] bg-white/[0.02]">
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider">Confidence</p>
                        <p className="text-xl font-bold text-blue-400 tabular-nums mt-1">{aiAnalysis.confidence}%</p>
                      </div>
                      <div className="rounded-lg px-4 py-3 border border-[#1e293b] bg-white/[0.02]">
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider">Timeframe</p>
                        <p className="text-xl font-bold text-purple-400 mt-1">{aiAnalysis.timeframe}</p>
                      </div>
                    </div>

                    {aiAnalysis.summary && (
                      <div className="bg-white/[0.02] rounded-lg p-3 border border-[#1e293b]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Quick Take</p>
                        <p className="text-xs text-gray-300 leading-relaxed">{aiAnalysis.summary}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {aiAnalysis.keyFactors?.length > 0 && (
                        <div className="bg-white/[0.02] rounded-lg p-3 border border-[#1e293b]">
                          <div className="flex items-center gap-1.5 mb-2">
                            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Key Factors</span>
                          </div>
                          <ul className="space-y-1.5">
                            {aiAnalysis.keyFactors.slice(0, 4).map((f, i) => (
                              <li key={i} className="flex gap-1.5 text-[10px] text-gray-300 leading-snug">
                                <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />{f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiAnalysis.risks?.length > 0 && (
                        <div className="bg-white/[0.02] rounded-lg p-3 border border-[#1e293b]">
                          <div className="flex items-center gap-1.5 mb-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Risks</span>
                          </div>
                          <ul className="space-y-1.5">
                            {aiAnalysis.risks.slice(0, 4).map((r, i) => (
                              <li key={i} className="flex gap-1.5 text-[10px] text-gray-300 leading-snug">
                                <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />{r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiAnalysis.opportunities?.length > 0 && (
                        <div className="bg-white/[0.02] rounded-lg p-3 border border-[#1e293b]">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Target className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Opportunities</span>
                          </div>
                          <ul className="space-y-1.5">
                            {aiAnalysis.opportunities.slice(0, 4).map((o, i) => (
                              <li key={i} className="flex gap-1.5 text-[10px] text-gray-300 leading-snug">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{o}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <Zap className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Loading AI analysis...</p>
                  </div>
                )}
              </Panel>
            </div>

            {/* ─── ROW 3: RRG Quadrant | Market Brief ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">

              {/* 7. RRG QUADRANT */}
              <Panel title="Relative Rotation Graph" badge="Sectors" className="lg:col-span-5 min-h-[300px]">
                <div className="p-3">
                  <svg viewBox="0 0 400 300" className="w-full" style={{ maxHeight: '280px' }}>
                    <rect x="200" y="0" width="200" height="150" fill="#065f4615" />
                    <rect x="0" y="0" width="200" height="150" fill="#f5930815" />
                    <rect x="0" y="150" width="200" height="150" fill="#ef444415" />
                    <rect x="200" y="150" width="200" height="150" fill="#3b82f615" />
                    <line x1="0" y1="150" x2="400" y2="150" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="200" y1="0" x2="200" y2="300" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                    <text x="300" y="20" textAnchor="middle" fontSize="10" fill="#34d399" fontWeight="600">Leading</text>
                    <text x="100" y="20" textAnchor="middle" fontSize="10" fill="#f59e0b" fontWeight="600">Weakening</text>
                    <text x="100" y="290" textAnchor="middle" fontSize="10" fill="#ef4444" fontWeight="600">Lagging</text>
                    <text x="300" y="290" textAnchor="middle" fontSize="10" fill="#3b82f6" fontWeight="600">Improving</text>
                    <text x="200" y="298" textAnchor="middle" fontSize="8" fill="#475569">RS Rating</text>
                    <text x="6" y="150" fontSize="8" fill="#475569" transform="rotate(-90,6,150)">Momentum</text>
                    {rrg.map(pt => {
                      const x = (pt.rs / 100) * 400;
                      const y = 300 - (pt.mom / 100) * 300;
                      const color = pt.quadrant === 'Leading' ? '#34d399' : pt.quadrant === 'Weakening' ? '#f59e0b' : pt.quadrant === 'Lagging' ? '#ef4444' : '#3b82f6';
                      const short = pt.sector
                        .replace('Information Technology', 'Tech')
                        .replace('Consumer Discretionary', 'Cons.Disc')
                        .replace('Consumer Staples', 'Cons.Stap')
                        .replace('Communication Services', 'Comm')
                        .replace('Health Care', 'Health')
                        .replace('Real Estate', 'RE');
                      return (
                        <g key={pt.sector}>
                          <circle cx={x} cy={y} r="5" fill={color} fillOpacity="0.7" stroke={color} strokeWidth="1" />
                          <text x={x} y={y - 8} textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">{short}</text>
                          <title>{`${pt.sector}: RS ${pt.rs.toFixed(0)}, Mom ${pt.mom.toFixed(0)}, Daily ${fmtPct(pt.daily)}%`}</title>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="flex items-center justify-center gap-4 mt-1.5">
                    {[['Leading', '#34d399'], ['Weakening', '#f59e0b'], ['Lagging', '#ef4444'], ['Improving', '#3b82f6']].map(([label, color]) => (
                      <div key={String(label)} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: String(color) }} />
                        <span className="text-[8px] text-gray-500">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              {/* 8. MARKET BRIEF + NEWS */}
              <Panel title="Market Brief" badge="NEWS" className="lg:col-span-7 min-h-[300px]">
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/[0.02] border border-[#1e293b] rounded-lg p-2.5 text-center">
                      <p className="text-[8px] text-gray-500 uppercase tracking-wider mb-0.5">S&P 500 Sectors</p>
                      <p className="text-sm font-bold text-white">{sectorData.length}</p>
                      <p className="text-[8px] text-gray-500">{sectorData.filter(s => s.daily > 0).length} positive</p>
                    </div>
                    <div className="bg-white/[0.02] border border-[#1e293b] rounded-lg p-2.5 text-center">
                      <p className="text-[8px] text-gray-500 uppercase tracking-wider mb-0.5">Best Sector</p>
                      <p className="text-sm font-bold text-emerald-400 truncate">{industryRanks[0]?.sector?.replace('Information Technology', 'Tech').replace('Consumer ', '') || '—'}</p>
                      <p className="text-[8px] text-emerald-400/70">{fmtPct(industryRanks[0]?.daily || 0)}%</p>
                    </div>
                    <div className="bg-white/[0.02] border border-[#1e293b] rounded-lg p-2.5 text-center">
                      <p className="text-[8px] text-gray-500 uppercase tracking-wider mb-0.5">Worst Sector</p>
                      <p className="text-sm font-bold text-red-400 truncate">{industryRanks[industryRanks.length - 1]?.sector?.replace('Information Technology', 'Tech').replace('Consumer ', '') || '—'}</p>
                      <p className="text-[8px] text-red-400/70">{fmtPct(industryRanks[industryRanks.length - 1]?.daily || 0)}%</p>
                    </div>
                  </div>

                  {aiAnalysis && (
                    <div className="bg-white/[0.02] border border-[#1e293b] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Radio className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Market Regime</span>
                      </div>
                      <div className="text-xs text-gray-300 leading-relaxed space-y-2">
                        <p>
                          <span className="font-semibold text-white">Sector Shift:</span>{' '}
                          {industryRanks.slice(0, 3).map(s => s.sector.replace('Information Technology', 'Tech').replace('Consumer ', '')).join(', ')}{' '}
                          lead the session, while{' '}
                          {industryRanks.slice(-2).map(s => s.sector.replace('Information Technology', 'Tech').replace('Consumer ', '')).join(' and ')}{' '}
                          lag behind.
                        </p>
                        <p>
                          <span className="font-semibold text-white">Breadth:</span>{' '}
                          {breadth.upPct > 60 ? 'Broad participation with strong breadth. Risk-on environment favoring equities.' :
                           breadth.upPct > 40 ? 'Mixed breadth signals. Sector rotation drives selective positioning.' :
                           'Weak breadth indicates caution. Defensive positioning recommended.'}
                        </p>
                        {aiAnalysis.recommendation && (
                          <p>
                            <span className="font-semibold text-white">AI View:</span>{' '}
                            {aiAnalysis.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-white/[0.02] border border-[#1e293b] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Radio className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Latest Headlines</span>
                    </div>
                    <NewsWidget />
                  </div>
                </div>
              </Panel>
            </div>

          </main>
          <Footer />
        </div>
      </RequirePlan>
    </LocalErrorBoundary>
  );
}
