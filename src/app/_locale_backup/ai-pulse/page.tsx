'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import LocalErrorBoundary from '@/components/LocalErrorBoundary';
import Footer from '@/components/Footer';
import RequirePlan from '@/components/RequirePlan';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw, ArrowLeft, Clock, Zap, TrendingUp, TrendingDown, BarChart3, Activity, AlertTriangle, Target, Radio } from 'lucide-react';
import dynamic from 'next/dynamic';

import { SP500_SECTORS, SECTOR_SHORT as SECTOR_SHORT_MAP, getStockWeight } from '@/lib/sp500-stocks';

const NewsWidget = dynamic(() => import('@/components/NewsWidget'), { ssr: false });
const CrossAssetTiles = dynamic(() => import('@/components/CrossAssetTiles'), { ssr: false });
const IndicesPanel = dynamic(() => import('@/components/IndicesPanel'), { ssr: false });
const TradaysCalendarWidget = dynamic(() => import('@/components/TradaysCalendarWidget'), { ssr: false });
const WorldEconomicCycleMap = dynamic(() => import('@/components/WorldEconomicCycleMap'), { ssr: false });

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
interface SentimentData {
  fearGreedIndex: number; sentiment: string; trend: string; volatility: number; aiPrediction: string;
}
interface RegimeData {
  regime: string; score: number; level: number; description: string;
  signals: Record<string, string>;
}
interface FlameData {
  level: number; intensity: string; description: string;
  components: Record<string, number>;
}
interface EarningsEvent {
  date: string; time: string; symbol: string; company: string;
  epsEstimate?: string; estimate?: string; actual?: string;
  period?: string; significance?: 'High' | 'Medium' | 'Low'; sector?: string;
}
interface EarningsResult {
  symbol: string; company: string; sector: string; date: string;
  epsActual: number; epsEstimate: number | null; surprisePct: number | null;
  outcome: 'beat' | 'miss' | 'inline';
}
interface EarningsSectorStat {
  sector: string; total: number; beats: number; misses: number; inline: number;
  beatRate: number; avgSurprise: number | null;
}

// ─── S&P 500 Sector → Stocks (from centralized config) ──────────────
const SECTOR_STOCKS = SP500_SECTORS;

// ─── Treemap layout (squarified) ────────────────────────────────────
interface TRect { x: number; y: number; w: number; h: number; }
interface TreemapItem { symbol: string; sector: string; pct: number; weight: number; }
interface TreemapCell extends TRect { symbol: string; sector: string; pct: number; weight: number; }

function squarify(items: TreemapItem[], rect: TRect): TreemapCell[] {
  if (items.length === 0) return [];
  const totalArea = rect.w * rect.h;
  const totalWeight = items.reduce((s, i) => s + i.weight, 0) || 1;
  const sorted = [...items].sort((a, b) => b.weight - a.weight);

  const cells: TreemapCell[] = [];
  let remaining = [...sorted];
  let { x, y, w, h } = rect;

  while (remaining.length > 0) {
    const isHorizontal = w >= h;
    const side = isHorizontal ? h : w;
    const totalRemaining = remaining.reduce((s, i) => s + i.weight, 0) || 1;
    const areaRemaining = w * h;

    // Find how many items to pack in this row/column
    let row: TreemapItem[] = [remaining[0]];
    let rowWeight = remaining[0].weight;
    let bestAspect = Infinity;

    for (let i = 1; i < remaining.length; i++) {
      const testRow = [...row, remaining[i]];
      const testWeight = rowWeight + remaining[i].weight;
      const rowArea = (testWeight / totalRemaining) * areaRemaining;
      const rowSide = rowArea / side;
      // Worst aspect ratio in this row
      let worst = 0;
      for (const item of testRow) {
        const itemArea = (item.weight / testWeight) * rowArea;
        const itemSide = itemArea / rowSide;
        const aspect = Math.max(itemSide / rowSide, rowSide / itemSide);
        worst = Math.max(worst, aspect);
      }
      if (worst < bestAspect) {
        bestAspect = worst;
        row = testRow;
        rowWeight = testWeight;
      } else {
        break;
      }
    }

    // Lay out this row/column
    const rowArea = (rowWeight / totalRemaining) * areaRemaining;
    const rowSize = rowArea / side;

    let offset = 0;
    for (const item of row) {
      const itemFrac = item.weight / rowWeight;
      const itemLen = itemFrac * side;
      if (isHorizontal) {
        cells.push({ ...item, x: x, y: y + offset, w: rowSize, h: itemLen });
      } else {
        cells.push({ ...item, x: x + offset, y: y, w: itemLen, h: rowSize });
      }
      offset += itemLen;
    }

    // Shrink remaining rect
    if (isHorizontal) {
      x += rowSize; w -= rowSize;
    } else {
      y += rowSize; h -= rowSize;
    }
    remaining = remaining.filter(i => !row.includes(i));
  }
  return cells;
}

function layoutSectorTreemap(
  sectors: { sector: string; stocks: TreemapItem[] }[],
  containerW: number, containerH: number
): { sectorRects: (TRect & { sector: string })[]; cells: TreemapCell[] } {
  // First level: lay out sector rectangles
  const sectorItems = sectors.map(s => ({
    symbol: s.sector, sector: s.sector, pct: 0,
    weight: s.stocks.reduce((sum, st) => sum + st.weight, 0),
  }));
  const sectorCells = squarify(sectorItems, { x: 0, y: 0, w: containerW, h: containerH });

  // Second level: within each sector rect, lay out individual stocks
  const allCells: TreemapCell[] = [];
  const sectorRects: (TRect & { sector: string })[] = [];
  for (const sc of sectorCells) {
    const sectorDef = sectors.find(s => s.sector === sc.symbol);
    if (!sectorDef) continue;
    sectorRects.push({ x: sc.x, y: sc.y, w: sc.w, h: sc.h, sector: sc.sector });
    const inner = squarify(sectorDef.stocks, { x: sc.x, y: sc.y, w: sc.w, h: sc.h });
    allCells.push(...inner);
  }
  return { sectorRects, cells: allCells };
}

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
  const router = useRouter();
  // Open any ticker straight on the full chart (market-data terminal). Used by
  // the heatmap cells, screener rows and movers lists — one click = chart.
  const goToChart = useCallback((sym: string) => {
    const s = (sym || '').trim().toUpperCase();
    if (!s) return;
    setSelectedSymbol(s);
    router.push(`/market-data?symbol=${encodeURIComponent(s)}`);
  }, [router]);
  const [aiAnalysis, setAiAnalysis] = useState<AIEconomicAnalysis | null>(null);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [regimeData, setRegimeData] = useState<RegimeData | null>(null);
  const [flameData, setFlameData] = useState<FlameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [error, setError] = useState('');
  const [screenerSort, setScreenerSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'changePercent', dir: 'desc' });
  const [dataHealth, setDataHealth] = useState({ sector: false, movers: false, ai: false, heatmap: false });
  const [aiError, setAiError] = useState(false);
  const [perfPeriod, setPerfPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'ytd' | 'yearly'>('daily');
  const [rrgPeriod, setRrgPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'ytd' | 'yearly'>('daily');
  const [detailLoading, setDetailLoading] = useState(false);
  const [heatmapQuotes, setHeatmapQuotes] = useState<Mover[]>([]);
  const [heatmapPeriod, setHeatmapPeriod] = useState<'daily' | 'weekly' | 'monthly' | '3month' | '6month' | 'ytd' | 'yearly'>('daily');
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [earningsData, setEarningsData] = useState<EarningsEvent[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [earningsResults, setEarningsResults] = useState<EarningsResult[]>([]);
  const [earningsSectors, setEarningsSectors] = useState<EarningsSectorStat[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  // In-memory cache of already-fetched heatmap periods so switching between
  // timeframes (1D↔1W↔1M…) is instant and never shows an empty screen.
  const heatmapCacheRef = useRef<Record<string, Mover[]>>({});
  const heatmapPeriodRef = useRef(heatmapPeriod);
  useEffect(() => { heatmapPeriodRef.current = heatmapPeriod; }, [heatmapPeriod]);

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
      setAiError(false);
      // Fetch 3 Tiingo-based APIs in parallel (no OpenAI needed)
      const [sentR, regimeR, flameR, aiR] = await Promise.all([
        fetchT('/api/market-sentiment-new', 10000).catch(() => null),
        fetchT('/api/market-regime', 10000).catch(() => null),
        fetchT('/api/flame-detector', 10000).catch(() => null),
        fetchT('/api/ai-economic-analysis', 15000).catch(() => null),
      ]);

      let gotData = false;

      if (sentR?.ok) {
        const sj = await sentR.json();
        if (sj.fearGreedIndex != null) { setSentimentData(sj); gotData = true; }
      }
      if (regimeR?.ok) {
        const rj = await regimeR.json();
        if (rj.regime) { setRegimeData(rj); gotData = true; }
      }
      if (flameR?.ok) {
        const fj = await flameR.json();
        if (fj.level != null) { setFlameData(fj); gotData = true; }
      }
      if (aiR?.ok) {
        const aj = await aiR.json();
        const analysis = aj.data?.analysis || aj.analysis || aj;
        if (analysis && (analysis.direction || analysis.summary)) {
          setAiAnalysis(analysis);
          gotData = true;
        }
      }

      if (gotData) {
        setDataHealth(h => ({ ...h, ai: true }));
      } else {
        setAiError(true);
      }
    } catch (e) { console.error(e); setAiError(true); }
  }, [fetchT]);

  const fetchStockDetail = useCallback(async (symbol: string) => {
    try {
      setDetailLoading(true);
      setStockDetail(null);
      const r = await fetchT(`/api/stock-detail?symbol=${encodeURIComponent(symbol)}`, 12000);
      if (!r.ok) return;
      const j = await r.json();
      if (j.ok && j.data) {
        const q = j.data;
        setStockDetail({
          symbol: q.symbol,
          shortName: q.shortName,
          regularMarketPrice: q.regularMarketPrice,
          regularMarketChange: q.regularMarketChange,
          regularMarketChangePercent: q.regularMarketChangePercent,
          regularMarketVolume: q.regularMarketVolume,
          averageDailyVolume3Month: q.averageDailyVolume3Month,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow,
          fiftyDayAverage: q.fiftyDayAverage,
          twoHundredDayAverage: q.twoHundredDayAverage,
          sector: q.sector,
        });
      }
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  }, [fetchT]);

  const fetchHeatmapQuotes = useCallback(async (period = 'daily') => {
    // Show cached data for this period immediately (instant timeframe switch,
    // never an empty screen). Keep the previous period's data on screen while
    // the new one loads if we have nothing cached yet.
    const cached = heatmapCacheRef.current[period];
    if (cached && cached.length) {
      setHeatmapQuotes(cached);
      setDataHealth(h => ({ ...h, heatmap: true }));
    }
    try {
      // Only surface the spinner when we have nothing to show for this period.
      if (!cached || !cached.length) setHeatmapLoading(true);
      // Allow browser/CDN to short-circuit repeated period switches; server has its own 3-60min cache
      const r = await fetchT(`/api/heatmap-quotes?period=${period}`, 55000);
      if (!r.ok) return;
      const j = await r.json();
      if (j.ok && j.data && j.data.length) {
        heatmapCacheRef.current[period] = j.data;
        // Only apply if the user is still viewing this period (avoids a late
        // response for an old period overwriting the current one).
        if (heatmapPeriodRef.current === period) {
          setHeatmapQuotes(j.data);
          setDataHealth(h => ({ ...h, heatmap: j.data.length > 0 }));
        }
      }
    } catch (e) { console.error(e); }
    finally { setHeatmapLoading(false); }
  }, [fetchT]);

  // Upcoming earnings calendar (next 14 days) — FMP with Yahoo/snapshot fallback server-side.
  const fetchEarnings = useCallback(async () => {
    try {
      setEarningsLoading(true);
      const r = await fetchT('/api/earnings-calendar?days=14', 20000, { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      const list: EarningsEvent[] = Array.isArray(j?.data) ? j.data : Array.isArray(j?.earningsCalendar) ? j.earningsCalendar : [];
      // Keep only today-onwards, sorted by date then significance.
      const today = new Date().toISOString().slice(0, 10);
      const rank = { High: 0, Medium: 1, Low: 2 } as Record<string, number>;
      setEarningsData(
        list
          .filter((e) => e?.symbol && e?.date && e.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date) || (rank[a.significance || 'Low'] - rank[b.significance || 'Low']))
          .slice(0, 60)
      );
    } catch (e) { console.error(e); }
    finally { setEarningsLoading(false); }
  }, [fetchT]);

  // Recent earnings RESULTS: who beat/missed estimates in the past week + sector stats.
  const fetchEarningsResults = useCallback(async () => {
    try {
      setResultsLoading(true);
      const r = await fetchT('/api/earnings-results?days=7', 45000, { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      if (j?.ok) {
        setEarningsResults(Array.isArray(j.results) ? j.results : []);
        setEarningsSectors(Array.isArray(j.sectors) ? j.sectors : []);
      }
    } catch (e) { console.error(e); }
    finally { setResultsLoading(false); }
  }, [fetchT]);

  // ─── Effects ───────────────────────────────────────────────────
  // Initial mount: kick off non-heatmap fetches. The heatmap fetch is handled by the
  // period-change effect below (which runs on mount with the initial 'daily' value),
  // avoiding a duplicate /api/heatmap-quotes call on first render.
  useEffect(() => { fetchSectorData(); fetchTopMovers(); fetchAIAnalysis(); fetchEarnings(); fetchEarningsResults(); }, [fetchSectorData, fetchTopMovers, fetchAIAnalysis, fetchEarnings, fetchEarningsResults]);

  // Re-fetch heatmap when period changes (also runs once on mount)
  useEffect(() => { fetchHeatmapQuotes(heatmapPeriod); }, [heatmapPeriod, fetchHeatmapQuotes]);

  useEffect(() => {
    const heavy = setInterval(() => {
      if (document.visibilityState === 'visible') { fetchSectorData(); fetchTopMovers(); fetchAIAnalysis(); fetchHeatmapQuotes(heatmapPeriod); }
    }, 600000);
    const movers = setInterval(() => {
      if (document.visibilityState === 'visible') fetchTopMovers();
    }, 180000);
    // Earnings: fast self-updating cycle (3 min) — new reports appear on their own.
    const earn = setInterval(() => {
      if (document.visibilityState === 'visible') { fetchEarnings(); fetchEarningsResults(); }
    }, 180000);
    return () => { clearInterval(heavy); clearInterval(movers); clearInterval(earn); };
  }, [fetchSectorData, fetchTopMovers, fetchAIAnalysis, heatmapPeriod, fetchEarnings, fetchEarningsResults]);

  useEffect(() => { if (selectedSymbol) fetchStockDetail(selectedSymbol); }, [selectedSymbol, fetchStockDetail]);

  // ─── Derived data ─────────────────────────────────────────────
  const stockMap = useMemo(() => {
    const m: Record<string, Mover> = {};
    // Heatmap quotes (Tiingo IEX bulk) are the primary source
    for (const s of heatmapQuotes) m[s.symbol] = s;
    // Overlay with top-movers data (may have additional symbols)
    for (const s of allMovers) m[s.symbol] = s;
    return m;
  }, [heatmapQuotes, allMovers]);

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
    // Use heatmapQuotes (90+ stocks) for more accurate breadth, fallback to allMovers
    const source = heatmapQuotes.length > 0 ? heatmapQuotes : allMovers;
    const up = source.filter(m => m.changePercent > 0).length;
    const down = source.filter(m => m.changePercent < 0).length;
    const total = source.length || 1;
    return { up, down, unchanged: total - up - down, total, upPct: Math.round((up / total) * 100), downPct: Math.round((down / total) * 100) };
  }, [heatmapQuotes, allMovers]);

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
    // RRG axes: X = relative strength (longer-term trend), Y = momentum (selected period).
    // Pair each selectable period with a longer reference period for the strength axis.
    const PERIOD_PAIR: Record<typeof rrgPeriod, [keyof SectorPerformance, keyof SectorPerformance]> = {
      daily: ['daily', 'weekly'],
      weekly: ['weekly', 'monthly'],
      monthly: ['monthly', 'quarterly'],
      quarterly: ['quarterly', 'yearly'],
      ytd: ['ytd', 'yearly'],
      yearly: ['yearly', 'ytd'],
    };
    const [primKey, secKey] = PERIOD_PAIR[rrgPeriod];
    const valOf = (s: SectorPerformance, k: keyof SectorPerformance) => {
      const v = s[k];
      return typeof v === 'number' && Number.isFinite(v) ? v : 0;
    };
    const maxPrim = Math.max(...sectorData.map(s => Math.abs(valOf(s, primKey))), 1);
    const maxSec = Math.max(...sectorData.map(s => Math.abs(valOf(s, secKey))), 1);
    return sectorData.map(s => {
      const prim = valOf(s, primKey);
      const sec = valOf(s, secKey);
      // Normalize each axis to ~[15,85] so points spread regardless of timeframe magnitude.
      const rs = 50 + (sec / maxSec) * 35;   // X: longer-term relative strength
      const mom = 50 + (prim / maxPrim) * 35; // Y: recent momentum (selected period)
      let quadrant: 'Leading' | 'Weakening' | 'Lagging' | 'Improving';
      if (rs >= 50 && mom >= 50) quadrant = 'Leading';
      else if (rs >= 50 && mom < 50) quadrant = 'Weakening';
      else if (rs < 50 && mom < 50) quadrant = 'Lagging';
      else quadrant = 'Improving';
      return { sector: s.sector, rs: Math.max(10, Math.min(90, rs)), mom: Math.max(10, Math.min(90, mom)), chg: prim, quadrant };
    });
  }, [sectorData, rrgPeriod]);

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
      <RequirePlan min="free">  {/* Solo AI Pulse resta free, tutto il resto premium */}
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

            {/* ─── ROW 0: Full-width Treemap Heatmap ─── */}
            <Panel title="S&P 500 Heatmap" className="min-h-[480px] relative"
              actions={
                <div className="flex items-center gap-1">
                  {heatmapLoading && <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin mr-1" />}
                  {(['daily','weekly','monthly','3month','6month','ytd','yearly'] as const).map(p => (
                    <button key={p}
                      onClick={() => setHeatmapPeriod(p)}
                      disabled={heatmapLoading && heatmapPeriod === p}
                      className={`px-1.5 py-0.5 text-[9px] font-semibold rounded transition-colors disabled:opacity-60 ${heatmapPeriod === p ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'}`}>
                      {{ daily:'1D', weekly:'1W', monthly:'1M', '3month':'3M', '6month':'6M', ytd:'YTD', yearly:'1Y' }[p]}
                    </button>
                  ))}
                </div>
              }>
              {/* Loading overlay so users see immediate feedback when switching period */}
              {heatmapLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none rounded-md">
                  <div className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg bg-slate-900/80 border border-blue-500/30">
                    <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <div className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">
                      Updating {{ daily:'1 Day', weekly:'1 Week', monthly:'1 Month', '3month':'3 Months', '6month':'6 Months', ytd:'YTD', yearly:'1 Year' }[heatmapPeriod]}…
                    </div>
                  </div>
                </div>
              )}
              {(() => {
                const W = 1200, H = 600;
                const SECTOR_HEADER = 20; // px height for sector label bar
                // Build sector groups with live data
                const sectorGroups = Object.entries(SECTOR_STOCKS).map(([sector, syms]) => ({
                  sector,
                  stocks: syms.map(sym => {
                    const mover = stockMap[sym];
                    const pct = mover?.changePercent ?? 0;
                    const weight = getStockWeight(sym);
                    return { symbol: sym, sector, pct, weight };
                  }),
                })).filter(g => g.stocks.length > 0).sort((a, b) =>
                  b.stocks.reduce((s, st) => s + st.weight, 0) - a.stocks.reduce((s, st) => s + st.weight, 0)
                );
                const { sectorRects, cells } = layoutSectorTreemap(sectorGroups, W, H);
                // Sector tint colors for background differentiation
                const SECTOR_TINTS: Record<string, string> = {
                  'Technology': 'rgba(59,130,246,0.06)', 'Healthcare': 'rgba(168,85,247,0.06)',
                  'Financial': 'rgba(234,179,8,0.06)', 'Consumer Discretionary': 'rgba(249,115,22,0.06)',
                  'Communication': 'rgba(236,72,153,0.06)', 'Industrials': 'rgba(107,114,128,0.06)',
                  'Consumer Staples': 'rgba(34,197,94,0.06)', 'Energy': 'rgba(239,68,68,0.06)',
                  'Utilities': 'rgba(14,165,233,0.06)', 'Real Estate': 'rgba(168,162,158,0.06)',
                  'Materials': 'rgba(180,83,9,0.06)',
                };
                const SECTOR_BORDER: Record<string, string> = {
                  'Technology': '#3b82f6', 'Healthcare': '#a855f7',
                  'Financial': '#eab308', 'Consumer Discretionary': '#f97316',
                  'Communication': '#ec4899', 'Industrials': '#6b7280',
                  'Consumer Staples': '#22c55e', 'Energy': '#ef4444',
                  'Utilities': '#0ea5e9', 'Real Estate': '#a8a29e',
                  'Materials': '#b45309',
                };
                const colorForPct = (p: number) =>
                  p > 3 ? '#16a34a' : p > 2 ? '#22c55e' : p > 1 ? '#15803d' : p > 0.5 ? '#166534' :
                  p > 0 ? '#14532d' : p > -0.5 ? '#7f1d1d' : p > -1 ? '#991b1b' :
                  p > -2 ? '#dc2626' : p > -3 ? '#ef4444' : '#f87171';
                return (
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: '620px' }} preserveAspectRatio="xMidYMid meet">
                    <rect width={W} height={H} fill="#0b1120" />
                    {/* Sector regions: tinted background + header bar + border */}
                    {sectorRects.map(sr => {
                      const borderColor = SECTOR_BORDER[sr.sector] || '#334155';
                      const tint = SECTOR_TINTS[sr.sector] || 'rgba(255,255,255,0.03)';
                      const showLabel = sr.w > 50 && sr.h > 24;
                      const avgPct = (() => {
                        const sectorCells = cells.filter(c => c.sector === sr.sector);
                        if (!sectorCells.length) return 0;
                        return sectorCells.reduce((s, c) => s + c.pct, 0) / sectorCells.length;
                      })();
                      return (
                        <g key={sr.sector}>
                          {/* Sector background tint */}
                          <rect x={sr.x} y={sr.y} width={sr.w} height={sr.h} fill={tint} />
                          {/* Sector border */}
                          <rect x={sr.x} y={sr.y} width={sr.w} height={sr.h} fill="none" stroke={borderColor} strokeWidth="3" strokeOpacity="0.7" />
                          {/* Sector header bar */}
                          {showLabel && (
                            <>
                              <rect x={sr.x + 1} y={sr.y + 1} width={sr.w - 2} height={SECTOR_HEADER} fill="rgba(0,0,0,0.8)" rx="1" />
                              <circle cx={sr.x + 10} cy={sr.y + SECTOR_HEADER / 2 + 1} r="3.5" fill={borderColor} />
                              <text x={sr.x + 18} y={sr.y + SECTOR_HEADER / 2 + 1} fontSize="11" fill="white" fontWeight="800" dominantBaseline="central" letterSpacing="0.5">
                                {SECTOR_SHORT_MAP[sr.sector] || sr.sector.toUpperCase()}
                              </text>
                              {sr.w > 140 && (
                                <text x={sr.x + sr.w - 6} y={sr.y + SECTOR_HEADER / 2 + 1} fontSize="10" fill={avgPct >= 0 ? '#4ade80' : '#f87171'} fontWeight="700" textAnchor="end" dominantBaseline="central">
                                  {avgPct >= 0 ? '+' : ''}{avgPct.toFixed(2)}%
                                </text>
                              )}
                            </>
                          )}
                        </g>
                      );
                    })}
                    {/* Individual stock cells */}
                    {cells.map(cell => {
                      const minDim = Math.min(cell.w, cell.h);
                      const showSymbol = cell.w > 18 && cell.h > 12;
                      const showPct = cell.w > 28 && cell.h > 22;
                      const symbolSize = minDim > 60 ? 14 : minDim > 40 ? 11 : minDim > 25 ? 9 : minDim > 15 ? 7 : 5;
                      const pctSize = minDim > 60 ? 11 : minDim > 40 ? 9 : 7;
                      return (
                        <g key={cell.symbol} className="cursor-pointer" onClick={() => setSelectedSymbol(cell.symbol)}>
                          <rect x={cell.x + 0.5} y={cell.y + 0.5} width={Math.max(0, cell.w - 1)} height={Math.max(0, cell.h - 1)}
                            fill={colorForPct(cell.pct)} rx="1" stroke="#0b1120" strokeWidth="0.5"
                            className="hover:brightness-125 transition-all"
                            opacity={selectedSymbol === cell.symbol ? 1 : 0.85} />
                          {showSymbol && (
                            <text x={cell.x + cell.w / 2} y={cell.y + cell.h / 2 - (showPct ? pctSize * 0.4 : 0)}
                              textAnchor="middle" dominantBaseline="central"
                              fontSize={symbolSize} fill="white" fontWeight="700"
                              className="hover:underline"
                              onClick={(e) => { e.stopPropagation(); goToChart(cell.symbol); }}>
                              {cell.symbol}
                            </text>
                          )}
                          {showPct && (
                            <text x={cell.x + cell.w / 2} y={cell.y + cell.h / 2 + symbolSize * 0.6}
                              textAnchor="middle" dominantBaseline="central"
                              fontSize={pctSize} fill="rgba(255,255,255,0.8)" fontWeight="500">
                              {cell.pct >= 0 ? '+' : ''}{cell.pct.toFixed(2)}%
                            </text>
                          )}
                          <title>{`${cell.symbol} (${cell.sector}): ${cell.pct >= 0 ? '+' : ''}${cell.pct.toFixed(2)}%`}</title>
                        </g>
                      );
                    })}
                    {selectedSymbol && (() => {
                      const sel = cells.find(c => c.symbol === selectedSymbol);
                      return sel ? (
                        <rect x={sel.x} y={sel.y} width={sel.w} height={sel.h} fill="none" stroke="#3b82f6" strokeWidth="2" rx="1" />
                      ) : null;
                    })()}
                  </svg>
                );
              })()}
            </Panel>

            {/* ─── WORLD ECONOMIC CYCLE MAP ─── */}
            <Panel
              title="World Economic Cycles"
              badge="Macro"
              className="min-h-[640px]"
              actions={<span className="text-[9px] text-gray-500">Reflation • Inflation • Stagflation • Recession</span>}
            >
              <WorldEconomicCycleMap />
            </Panel>

            {/* ─── ROW 1: Screener | Company + Industry ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">

              {/* 2. STOCK SCREENER + PRICE BARS */}
              <Panel title="Stock Screener" badge={`${allMovers.length} stocks`} className="lg:col-span-6 min-h-[340px]"
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
                            title={`${m.symbol} — click row for company info, click ticker for chart`}
                            onClick={() => setSelectedSymbol(m.symbol)}>
                            <td className="py-1 px-2 font-semibold text-white">
                              <span className="flex items-center gap-1.5">
                                <img
                                  src={`https://assets.parqet.com/logos/symbol/${m.symbol}?format=jpg`}
                                  alt=""
                                  loading="lazy"
                                  className="w-4 h-4 rounded-full bg-slate-700 object-cover shrink-0"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
                                />
                                <span className="hover:underline cursor-pointer" title={`Open ${m.symbol} chart`}
                                  onClick={(e) => { e.stopPropagation(); goToChart(m.symbol); }}>
                                  {m.symbol}
                                </span>
                              </span>
                            </td>
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
                              title={`${m.symbol} — click for company info, click ticker for chart`}
                              onClick={() => setSelectedSymbol(m.symbol)}>
                              <span className="text-[9px] font-semibold text-gray-300 w-10 text-right shrink-0 hover:underline"
                                title={`Open ${m.symbol} chart`}
                                onClick={(e) => { e.stopPropagation(); goToChart(m.symbol); }}>{m.symbol}</span>
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
              <div className="lg:col-span-6 flex flex-col gap-2">
                {/* Company Detail */}
                <Panel title={selectedSymbol ? `Company: ${selectedSymbol}` : 'Company Info'} badge={stockDetail ? 'LIVE' : undefined} className="flex-1 min-h-[160px]">
                  {detailLoading ? (
                    <div className="p-4 text-center text-gray-500 text-xs">
                      <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin opacity-40" />
                      Loading {selectedSymbol}...
                    </div>
                  ) : stockDetail ? (
                    <div className="p-3 space-y-2 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <img
                            src={`https://assets.parqet.com/logos/symbol/${stockDetail.symbol}?format=jpg`}
                            alt=""
                            loading="lazy"
                            className="w-6 h-6 rounded-full bg-slate-700 object-cover shrink-0"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
                          />
                          <span className="text-base font-bold text-white">{stockDetail.symbol}</span>
                        </span>
                        <span className={`text-sm font-bold ${pctColor(stockDetail.regularMarketChangePercent ?? 0)}`}>
                          {stockDetail.regularMarketPrice ? `$${fmt(stockDetail.regularMarketPrice)}` : '—'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-[10px] truncate">{stockDetail.shortName || stockDetail.longName || ''}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                        {([
                          ['% Change', stockDetail.regularMarketChangePercent != null ? `${fmtPct(stockDetail.regularMarketChangePercent)}%` : '—'],
                          ['Sector', stockDetail.sector || '—'],
                          ['Volume', stockDetail.regularMarketVolume ? fmtNum(stockDetail.regularMarketVolume) : '—'],
                          ['Avg Vol (3M)', stockDetail.averageDailyVolume3Month ? fmtNum(stockDetail.averageDailyVolume3Month) : '—'],
                          ['52W High', stockDetail.fiftyTwoWeekHigh ? `$${fmt(stockDetail.fiftyTwoWeekHigh)}` : '—'],
                          ['52W Low', stockDetail.fiftyTwoWeekLow ? `$${fmt(stockDetail.fiftyTwoWeekLow)}` : '—'],
                          ['50D Avg', stockDetail.fiftyDayAverage ? `$${fmt(stockDetail.fiftyDayAverage)}` : '—'],
                          ['200D Avg', stockDetail.twoHundredDayAverage ? `$${fmt(stockDetail.twoHundredDayAverage)}` : '—'],
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
                <Panel title="Industry Performance" className="min-h-[160px]"
                  actions={
                    <div className="flex gap-0.5">
                      {(['daily', 'weekly', 'monthly', 'quarterly', 'ytd', 'yearly'] as const).map(p => (
                        <button key={p} onClick={() => setPerfPeriod(p)}
                          className={`px-1.5 py-0.5 text-[8px] rounded transition-colors ${perfPeriod === p ? 'bg-blue-500/30 text-blue-300' : 'text-gray-500 hover:text-gray-300'}`}>
                          {p === 'daily' ? '1D' : p === 'weekly' ? '1W' : p === 'monthly' ? '1M' : p === 'quarterly' ? '3M' : p === 'ytd' ? 'YTD' : '1Y'}
                        </button>
                      ))}
                    </div>
                  }>
                  <div className="p-2 space-y-0.5">
                    {[...sectorData].sort((a, b) => (b[perfPeriod] ?? 0) - (a[perfPeriod] ?? 0)).slice(0, 11).map((s, i) => {
                      const val = (s as unknown as Record<string, number>)[perfPeriod] ?? 0;
                      const maxAbs = Math.max(...sectorData.map(x => Math.abs((x as unknown as Record<string, number>)[perfPeriod] ?? 0)), 1);
                      const barW = Math.abs(val) / maxAbs * 100;
                      return (
                        <div key={s.sector} className="flex items-center gap-1.5 h-5">
                          <span className="text-[8px] text-gray-500 w-3 text-right">{i + 1}</span>
                          <span className="text-[9px] text-gray-300 w-20 truncate">{s.sector.replace('Consumer ', '')}</span>
                          <div className="flex-1 h-3 bg-white/[0.02] rounded-sm overflow-hidden">
                            <div className={`h-full rounded-sm transition-all ${val >= 0 ? 'bg-emerald-500/50' : 'bg-red-500/50'}`}
                              style={{ width: `${Math.max(2, barW)}%` }} />
                          </div>
                          <span className={`text-[9px] font-mono w-12 text-right ${pctColor(val)}`}>{fmtPct(val)}%</span>
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

              {/* 6. AI INSIGHT PANEL — Composite: Sentiment + Regime + Flame + OpenAI fallback */}
              <Panel title="AI Market Intelligence" badge={(sentimentData || regimeData || flameData) ? 'LIVE' : aiAnalysis ? 'AI LIVE' : 'WAITING'} className="lg:col-span-8 min-h-[280px]">
                {(sentimentData || regimeData || flameData) ? (
                  <div className="p-4 space-y-4">
                    {/* Top row: Fear & Greed + Regime + Flame */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Fear & Greed */}
                      {sentimentData && (
                        <div className={`rounded-lg px-4 py-3 border ${
                          sentimentData.fearGreedIndex >= 70 ? 'bg-emerald-500/10 border-emerald-500/20' :
                          sentimentData.fearGreedIndex <= 30 ? 'bg-red-500/10 border-red-500/20' :
                          'bg-amber-500/10 border-amber-500/20'
                        }`}>
                          <p className="text-[9px] text-gray-500 uppercase tracking-wider">Fear & Greed</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-2xl font-bold tabular-nums ${
                              sentimentData.fearGreedIndex >= 70 ? 'text-emerald-400' :
                              sentimentData.fearGreedIndex <= 30 ? 'text-red-400' : 'text-amber-400'
                            }`}>{sentimentData.fearGreedIndex}</span>
                            <span className="text-[10px] text-gray-400">/100</span>
                          </div>
                          <p className={`text-[10px] mt-0.5 ${
                            sentimentData.fearGreedIndex >= 70 ? 'text-emerald-400' :
                            sentimentData.fearGreedIndex <= 30 ? 'text-red-400' : 'text-amber-400'
                          }`}>{sentimentData.sentiment}</p>
                        </div>
                      )}
                      {/* Regime */}
                      {regimeData && (
                        <div className={`rounded-lg px-4 py-3 border ${
                          regimeData.regime === 'Risk-On' ? 'bg-emerald-500/10 border-emerald-500/20' :
                          regimeData.regime === 'Risk-Off' ? 'bg-red-500/10 border-red-500/20' :
                          'bg-blue-500/10 border-blue-500/20'
                        }`}>
                          <p className="text-[9px] text-gray-500 uppercase tracking-wider">Market Regime</p>
                          <div className="flex items-center gap-2 mt-1">
                            {regimeData.regime === 'Risk-On' ? <TrendingUp className="w-5 h-5 text-emerald-400" /> :
                             regimeData.regime === 'Risk-Off' ? <TrendingDown className="w-5 h-5 text-red-400" /> :
                             <BarChart3 className="w-5 h-5 text-blue-400" />}
                            <span className={`text-lg font-bold ${
                              regimeData.regime === 'Risk-On' ? 'text-emerald-400' :
                              regimeData.regime === 'Risk-Off' ? 'text-red-400' : 'text-blue-400'
                            }`}>{regimeData.regime}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5">Score: {regimeData.score > 0 ? '+' : ''}{regimeData.score}</p>
                        </div>
                      )}
                      {/* Overheating */}
                      {flameData && (
                        <div className={`rounded-lg px-4 py-3 border ${
                          flameData.level >= 0.7 ? 'bg-red-500/10 border-red-500/20' :
                          flameData.level >= 0.4 ? 'bg-amber-500/10 border-amber-500/20' :
                          'bg-emerald-500/10 border-emerald-500/20'
                        }`}>
                          <p className="text-[9px] text-gray-500 uppercase tracking-wider">Overheating</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-2xl font-bold tabular-nums ${
                              flameData.level >= 0.7 ? 'text-red-400' :
                              flameData.level >= 0.4 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>{(flameData.level * 100).toFixed(0)}%</span>
                          </div>
                          <p className={`text-[10px] mt-0.5 ${
                            flameData.level >= 0.7 ? 'text-red-400' :
                            flameData.level >= 0.4 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>{flameData.intensity}</p>
                        </div>
                      )}
                    </div>

                    {/* Signals Row */}
                    {regimeData?.signals && (
                      <div className="bg-white/[0.02] rounded-lg p-3 border border-[#1e293b]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Regime Signals</p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {Object.entries(regimeData.signals).map(([key, val]) => (
                            <div key={key} className="text-center">
                              <p className="text-[8px] text-gray-500 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                              <p className={`text-[10px] font-semibold ${
                                String(val).toLowerCase().includes('bull') || String(val).toLowerCase().includes('positive') || String(val).toLowerCase().includes('strong') ? 'text-emerald-400' :
                                String(val).toLowerCase().includes('bear') || String(val).toLowerCase().includes('negative') || String(val).toLowerCase().includes('weak') ? 'text-red-400' : 'text-amber-400'
                              }`}>{String(val)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Flame components */}
                    {flameData?.components && (
                      <div className="bg-white/[0.02] rounded-lg p-3 border border-[#1e293b]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Overheating Components</p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {Object.entries(flameData.components).map(([key, val]) => (
                            <div key={key} className="text-center">
                              <p className="text-[8px] text-gray-500 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                              <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
                                <div className={`h-1.5 rounded-full ${Number(val) >= 0.7 ? 'bg-red-500' : Number(val) >= 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(Number(val) * 100, 100)}%` }} />
                              </div>
                              <p className="text-[9px] text-gray-400 mt-0.5 tabular-nums">{(Number(val) * 100).toFixed(0)}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Optional AI summary from OpenAI if available */}
                    {aiAnalysis?.summary && (
                      <div className="bg-white/[0.02] rounded-lg p-3 border border-[#1e293b]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">AI Quick Take</p>
                        <p className="text-xs text-gray-300 leading-relaxed">{aiAnalysis.summary}</p>
                      </div>
                    )}

                    {/* Sentiment trend + prediction */}
                    {sentimentData && (
                      <div className="flex items-center gap-4 text-[10px] text-gray-500">
                        <span>Trend: <span className={sentimentData.trend === 'up' ? 'text-emerald-400' : sentimentData.trend === 'down' ? 'text-red-400' : 'text-amber-400'}>{sentimentData.trend}</span></span>
                        <span>Volatility: <span className="text-gray-300">{typeof sentimentData.volatility === 'number' ? sentimentData.volatility.toFixed(1) : sentimentData.volatility}</span></span>
                        {sentimentData.aiPrediction && <span className="text-gray-400 italic truncate max-w-[300px]">{sentimentData.aiPrediction}</span>}
                      </div>
                    )}
                  </div>
                ) : aiAnalysis ? (
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
                    </div>
                    {aiAnalysis.summary && (
                      <div className="bg-white/[0.02] rounded-lg p-3 border border-[#1e293b]">
                        <p className="text-xs text-gray-300 leading-relaxed">{aiAnalysis.summary}</p>
                      </div>
                    )}
                  </div>
                ) : aiError ? (
                  <div className="p-6 text-center">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-500/40" />
                    <p className="text-sm text-gray-400 mb-1">AI analysis temporarily unavailable</p>
                    <p className="text-[10px] text-gray-600 mb-3">Check back shortly — data services may be initializing.</p>
                    <button onClick={fetchAIAnalysis}
                      className="px-3 py-1.5 text-[10px] rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-colors">
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <div className="relative w-8 h-8 mx-auto mb-3">
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 animate-spin" />
                      <Zap className="absolute inset-0 m-auto w-4 h-4 text-blue-400/40" />
                    </div>
                    <p className="text-sm">Loading market intelligence...</p>
                  </div>
                )}
              </Panel>
            </div>

            {/* ─── ROW 2.5: Global Indices (US + International) with logos ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
              <Panel title="Global Indices" badge="LIVE" className="lg:col-span-12 min-h-[260px]">
                <IndicesPanel />
              </Panel>
            </div>

            {/* ─── ROW 3: Cross-Asset Markets, then RRG (compact) ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">

              {/* CROSS-ASSET TILES — commodities, bonds, crypto, forex (with timeframe selector) */}
              <Panel title="Cross-Asset Markets" badge="LIVE" className="lg:col-span-12 min-h-[280px]">
                <div className="p-3">
                  <CrossAssetTiles />
                </div>
              </Panel>
            </div>

            {/* ─── ROW 3.5: Economic Calendar + Earnings Calendar ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
              <Panel title="Economic Calendar" badge="LIVE" className="lg:col-span-7 min-h-[440px]">
                <div className="p-2">
                  <TradaysCalendarWidget height={400} mode="2" theme={1} />
                </div>
              </Panel>
              <Panel title="Earnings Calendar" badge="14 DAYS" className="lg:col-span-5 min-h-[440px]">
                <div className="p-2 max-h-[420px] overflow-y-auto">
                  {earningsLoading && earningsData.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-xs text-gray-500 gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading earnings…
                    </div>
                  ) : earningsData.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-xs text-gray-500">
                      No earnings scheduled in the next 14 days
                    </div>
                  ) : (
                    (() => {
                      const byDate: Record<string, EarningsEvent[]> = {};
                      for (const ev of earningsData) (byDate[ev.date] ||= []).push(ev);
                      const todayStr = new Date().toISOString().slice(0, 10);
                      return Object.entries(byDate).map(([date, evs]) => (
                        <div key={date} className="mb-2">
                          <div className={`text-[9px] uppercase tracking-wider px-1 py-1 sticky top-0 bg-[#0b1120] ${date === todayStr ? 'text-amber-300' : 'text-gray-500'}`}>
                            {date === todayStr ? 'Today · ' : ''}{new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </div>
                          {evs.map((ev, i) => (
                            <div
                              key={`${ev.symbol}-${i}`}
                              className="flex items-center justify-between gap-2 px-1.5 py-1 rounded hover:bg-white/5 cursor-pointer"
                              onClick={() => goToChart(ev.symbol)}
                              title={`Open ${ev.symbol} chart`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.significance === 'High' ? 'bg-amber-400' : ev.significance === 'Medium' ? 'bg-blue-400' : 'bg-gray-600'}`} />
                                <span className="text-[11px] font-bold text-blue-300 hover:underline shrink-0">{ev.symbol}</span>
                                <span className="text-[10px] text-gray-400 truncate">{ev.company}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 text-right">
                                <span className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-gray-400">{ev.time === 'AMC' ? 'After close' : ev.time === 'BMO' ? 'Pre-market' : ev.time || '—'}</span>
                                <span className="text-[10px] text-gray-300 w-16 truncate">{ev.actual || ev.epsEstimate || ev.estimate || '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ));
                    })()
                  )}
                </div>
              </Panel>
            </div>

            {/* ─── ROW 3.6: Earnings Results — beats & misses + sector comparison ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
              <Panel title="Earnings Results · Last 7 Days" badge={`${earningsResults.length} REPORTED`} className="lg:col-span-7 min-h-[300px]">
                <div className="p-2">
                  {resultsLoading && earningsResults.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-xs text-gray-500 gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading recent results…
                    </div>
                  ) : earningsResults.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-xs text-gray-500">No recent earnings results</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {/* Beats */}
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-emerald-300 px-1 py-1 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Beat estimates ({earningsResults.filter(r => r.outcome === 'beat').length})
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {earningsResults.filter(r => r.outcome === 'beat').slice(0, 15).map((r) => (
                            <div key={`b-${r.symbol}`} onClick={() => goToChart(r.symbol)}
                              className="flex items-center justify-between gap-2 px-1.5 py-1 rounded hover:bg-white/5 cursor-pointer" title={`Open ${r.symbol} chart`}>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[11px] font-bold text-emerald-300 hover:underline shrink-0">{r.symbol}</span>
                                <span className="text-[9px] text-gray-500 truncate">{r.sector}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 text-right tabular-nums">
                                <span className="text-[10px] text-gray-400">${r.epsActual.toFixed(2)}{r.epsEstimate != null ? ` vs $${r.epsEstimate.toFixed(2)}` : ''}</span>
                                <span className="text-[10px] font-bold text-emerald-400 w-14">{r.surprisePct != null ? `+${r.surprisePct.toFixed(1)}%` : '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Misses */}
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-red-300 px-1 py-1 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" /> Missed estimates ({earningsResults.filter(r => r.outcome === 'miss').length})
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {earningsResults.filter(r => r.outcome === 'miss').sort((a, b) => (a.surprisePct ?? 0) - (b.surprisePct ?? 0)).slice(0, 15).map((r) => (
                            <div key={`m-${r.symbol}`} onClick={() => goToChart(r.symbol)}
                              className="flex items-center justify-between gap-2 px-1.5 py-1 rounded hover:bg-white/5 cursor-pointer" title={`Open ${r.symbol} chart`}>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[11px] font-bold text-red-300 hover:underline shrink-0">{r.symbol}</span>
                                <span className="text-[9px] text-gray-500 truncate">{r.sector}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 text-right tabular-nums">
                                <span className="text-[10px] text-gray-400">${r.epsActual.toFixed(2)}{r.epsEstimate != null ? ` vs $${r.epsEstimate.toFixed(2)}` : ''}</span>
                                <span className="text-[10px] font-bold text-red-400 w-14">{r.surprisePct != null ? `${r.surprisePct.toFixed(1)}%` : '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>

              <Panel title="Earnings by Sector" badge="BEAT RATE" className="lg:col-span-5 min-h-[300px]">
                <div className="p-2">
                  {resultsLoading && earningsSectors.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-xs text-gray-500 gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading sector stats…
                    </div>
                  ) : earningsSectors.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-xs text-gray-500">No sector data</div>
                  ) : (
                    <div className="space-y-2">
                      {earningsSectors.slice(0, 10).map((s) => (
                        <div key={s.sector}>
                          <div className="flex items-center justify-between text-[10px] mb-0.5">
                            <span className="font-semibold text-gray-300 truncate">{s.sector}</span>
                            <span className="text-gray-500 tabular-nums shrink-0">
                              {s.beats}✓ {s.misses}✗ · {s.total} rep.
                              {s.avgSurprise != null && (
                                <span className={`ml-1.5 font-bold ${s.avgSurprise >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {s.avgSurprise > 0 ? '+' : ''}{s.avgSurprise}% avg
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="relative h-2 rounded-full bg-red-500/20 overflow-hidden">
                            <div className="absolute inset-y-0 left-0 bg-emerald-500/70 rounded-full" style={{ width: `${s.beatRate}%` }} />
                          </div>
                          <div className="flex justify-between text-[8px] text-gray-600 mt-0.5">
                            <span>{s.beatRate}% beat</span>
                            <span>{100 - s.beatRate}% miss/inline</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">

              <Panel title="Relative Rotation Graph" badge="Sectors" className="lg:col-span-6 min-h-[360px]"
                actions={
                  <div className="flex gap-0.5">
                    {(['daily', 'weekly', 'monthly', 'quarterly', 'ytd', 'yearly'] as const).map(p => (
                      <button key={p} onClick={() => setRrgPeriod(p)}
                        className={`px-1.5 py-0.5 text-[8px] rounded transition-colors ${rrgPeriod === p ? 'bg-blue-500/30 text-blue-300' : 'text-gray-500 hover:text-gray-300'}`}>
                        {p === 'daily' ? '1D' : p === 'weekly' ? '1W' : p === 'monthly' ? '1M' : p === 'quarterly' ? '3M' : p === 'ytd' ? 'YTD' : '1Y'}
                      </button>
                    ))}
                  </div>
                }>
                <div className="p-3">
                  <svg viewBox="0 0 900 600" className="w-full" style={{ maxHeight: '420px' }} preserveAspectRatio="xMidYMid meet">
                    {/* Quadrant backgrounds */}
                    <rect x="450" y="0" width="450" height="300" fill="#10b981" fillOpacity="0.16" />
                    <rect x="0" y="0" width="450" height="300" fill="#f59e0b" fillOpacity="0.16" />
                    <rect x="0" y="300" width="450" height="300" fill="#ef4444" fillOpacity="0.16" />
                    <rect x="450" y="300" width="450" height="300" fill="#3b82f6" fillOpacity="0.16" />
                    {/* Grid lines */}
                    <line x1="0" y1="300" x2="900" y2="300" stroke="#1e293b" strokeWidth="1" strokeDasharray="6 4" />
                    <line x1="450" y1="0" x2="450" y2="600" stroke="#1e293b" strokeWidth="1" strokeDasharray="6 4" />
                    {/* Sub-grid */}
                    <line x1="225" y1="0" x2="225" y2="600" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 6" opacity="0.4" />
                    <line x1="675" y1="0" x2="675" y2="600" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 6" opacity="0.4" />
                    <line x1="0" y1="150" x2="900" y2="150" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 6" opacity="0.4" />
                    <line x1="0" y1="450" x2="900" y2="450" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 6" opacity="0.4" />
                    {/* Quadrant labels */}
                    <text x="675" y="32" textAnchor="middle" fontSize="18" fill="#34d399" fontWeight="700" opacity="0.9">Leading</text>
                    <text x="225" y="32" textAnchor="middle" fontSize="18" fill="#f59e0b" fontWeight="700" opacity="0.9">Weakening</text>
                    <text x="225" y="588" textAnchor="middle" fontSize="18" fill="#ef4444" fontWeight="700" opacity="0.9">Lagging</text>
                    <text x="675" y="588" textAnchor="middle" fontSize="18" fill="#3b82f6" fontWeight="700" opacity="0.9">Improving</text>
                    {/* Axis labels */}
                    <text x="450" y="598" textAnchor="middle" fontSize="13" fill="#64748b" fontWeight="500">RS Rating →</text>
                    <text x="14" y="300" fontSize="13" fill="#64748b" fontWeight="500" transform="rotate(-90,14,300)">Momentum →</text>
                    {(() => {
                      // Padded plot area so dots & labels are never clipped at the edges.
                      const X0 = 70, X1 = 830, Y0 = 55, Y1 = 545;
                      const placed: Array<{ x: number; y: number }> = [];
                      const pts = rrg.map((pt) => ({
                        pt,
                        x: X0 + (Math.max(0, Math.min(100, pt.rs)) / 100) * (X1 - X0),
                        y: Y1 - (Math.max(0, Math.min(100, pt.mom)) / 100) * (Y1 - Y0),
                      }));
                      return pts.map(({ pt, x, y }) => {
                        const color = pt.quadrant === 'Leading' ? '#34d399' : pt.quadrant === 'Weakening' ? '#f59e0b' : pt.quadrant === 'Lagging' ? '#ef4444' : '#3b82f6';
                        const short = pt.sector
                          .replace('Technology', 'Tech')
                          .replace('Consumer Discretionary', 'Cons.Disc')
                          .replace('Consumer Staples', 'Cons.Stap')
                          .replace('Communication Services', 'Comm')
                          .replace('Communication', 'Comm')
                          .replace('Healthcare', 'Health')
                          .replace('Real Estate', 'RE')
                          .replace('Financial Services', 'Fin')
                          .replace('Financial', 'Fin')
                          .replace('Industrials', 'Indust')
                          .replace('Utilities', 'Util')
                          .replace('Materials', 'Matls');
                        // Simple collision avoidance: try label slots around the dot
                        // until one doesn't overlap an already-placed label.
                        const slots: Array<[number, number]> = [[0, -22], [0, 38], [50, -4], [-50, -4], [0, -44], [0, 60], [70, -22], [-70, -22]];
                        let lx = x, ly = y - 22;
                        for (const [dx, dy] of slots) {
                          const cx = x + dx, cy = y + dy;
                          const clash = placed.some((p) => Math.abs(p.x - cx) < 92 && Math.abs(p.y - cy) < 30);
                          if (!clash) { lx = cx; ly = cy; break; }
                        }
                        placed.push({ x: lx, y: ly });
                        return (
                          <g key={pt.sector}>
                            <circle cx={x} cy={y} r="11" fill={color} fillOpacity="0.8" stroke="#0b1120" strokeWidth="2.5" />
                            <circle cx={x} cy={y} r="11" fill="none" stroke={color} strokeWidth="2" />
                            {/* Connector when the label had to move away from the dot */}
                            {(Math.abs(lx - x) > 30 || Math.abs(ly - y) > 42) && (
                              <line x1={x} y1={y} x2={lx} y2={ly + 5} stroke={color} strokeWidth="1" opacity="0.5" />
                            )}
                            <text x={lx} y={ly} textAnchor="middle" fontSize="16" fill="#f1f5f9" fontWeight="700" stroke="#0b1120" strokeWidth="4" paintOrder="stroke">{short}</text>
                            <text x={lx} y={ly + 16} textAnchor="middle" fontSize="12" fill={pt.chg >= 0 ? '#6ee7b7' : '#fca5a5'} fontWeight="600" stroke="#0b1120" strokeWidth="3" paintOrder="stroke">{fmtPct(pt.chg)}%</text>
                            <title>{`${pt.sector}: RS ${pt.rs.toFixed(0)}, Mom ${pt.mom.toFixed(0)}, ${rrgPeriod === 'daily' ? '1D' : rrgPeriod === 'weekly' ? '1W' : rrgPeriod === 'monthly' ? '1M' : rrgPeriod === 'quarterly' ? '3M' : rrgPeriod === 'ytd' ? 'YTD' : '1Y'} ${fmtPct(pt.chg)}%`}</title>
                          </g>
                        );
                      });
                    })()}
                  </svg>
                  <div className="flex items-center justify-center gap-6 mt-2">
                    {[['Leading', '#34d399'], ['Weakening', '#f59e0b'], ['Lagging', '#ef4444'], ['Improving', '#3b82f6']].map(([label, color]) => (
                      <div key={String(label)} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: String(color) }} />
                        <span className="text-[10px] text-gray-400 font-medium">{label}</span>
                      </div>
                    ))}
                  </div>
                  {/* Readable sector table: quadrant, RS, momentum, period change */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                    {[...rrg].sort((a, b) => b.rs - a.rs).map((pt) => {
                      const color = pt.quadrant === 'Leading' ? '#34d399' : pt.quadrant === 'Weakening' ? '#f59e0b' : pt.quadrant === 'Lagging' ? '#ef4444' : '#3b82f6';
                      return (
                        <div key={`row-${pt.sector}`} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-white/5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[11px] font-semibold text-gray-200 truncate flex-1">{pt.sector}</span>
                          <span className="text-[9px] text-gray-500 tabular-nums shrink-0">RS {pt.rs.toFixed(0)} · M {pt.mom.toFixed(0)}</span>
                          <span className={`text-[11px] font-bold tabular-nums w-14 text-right shrink-0 ${pt.chg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtPct(pt.chg)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Panel>

              {/* 8. MARKET BRIEF + NEWS */}
              <Panel title="Market Brief" badge="NEWS" className="lg:col-span-6 min-h-[360px]">
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/[0.02] border border-[#1e293b] rounded-lg p-2.5 text-center">
                      <p className="text-[8px] text-gray-500 uppercase tracking-wider mb-0.5">S&P 500 Sectors</p>
                      <p className="text-sm font-bold text-white">{sectorData.length}</p>
                      <p className="text-[8px] text-gray-500">{sectorData.filter(s => s.daily > 0).length} positive</p>
                    </div>
                    <div className="bg-white/[0.02] border border-[#1e293b] rounded-lg p-2.5 text-center">
                      <p className="text-[8px] text-gray-500 uppercase tracking-wider mb-0.5">Best Sector</p>
                      <p className="text-sm font-bold text-emerald-400 truncate">{industryRanks[0]?.sector?.replace('Technology', 'Tech').replace('Consumer ', '') || '—'}</p>
                      <p className="text-[8px] text-emerald-400/70">{fmtPct(industryRanks[0]?.daily || 0)}%</p>
                    </div>
                    <div className="bg-white/[0.02] border border-[#1e293b] rounded-lg p-2.5 text-center">
                      <p className="text-[8px] text-gray-500 uppercase tracking-wider mb-0.5">Worst Sector</p>
                      <p className="text-sm font-bold text-red-400 truncate">{industryRanks[industryRanks.length - 1]?.sector?.replace('Technology', 'Tech').replace('Consumer ', '') || '—'}</p>
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
                          {industryRanks.slice(0, 3).map(s => s.sector.replace('Technology', 'Tech').replace('Consumer ', '')).join(', ')}{' '}
                          lead the session, while{' '}
                          {industryRanks.slice(-2).map(s => s.sector.replace('Technology', 'Tech').replace('Consumer ', '')).join(' and ')}{' '}
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
