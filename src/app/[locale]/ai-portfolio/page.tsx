'use client';

import { useState, useEffect, useMemo } from 'react';
import RequirePlan from '@/components/RequirePlan';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList } from 'recharts';

interface PortfolioData {
  [key: string]: {
    name: string;
    description: string;
    performance: {
      daily: string;
      weekly: string;
      monthly: string;
      quarterly: string;
      yearly: string;
    };
    holdings: Array<{
      ticker: string;
      name: string;
      weight: number;
      price: number;
      change: string;
      performance: {
        daily: string;
        weekly: string;
        monthly: string;
        quarterly: string;
        yearly: string;
      };
    }>;
  aiScore?: number;
  };
}

// Helper to parse performance percentage string to number
const parsePct = (v?: string) => {
  if (!v) return 0;
  const n = parseFloat(v.replace(/%/,'').trim());
  return isNaN(n) ? 0 : n;
};

// Build regional synthetic portfolios (Europe & Emerging Markets) preventing duplicates
function augmentWithRegional(base: PortfolioData): PortfolioData {
  const clone: PortfolioData = { ...base };
  const existingNames = new Set(Object.values(base).map(p => p.name.toLowerCase()));
  const alreadyEurope = Array.from(existingNames).some(n => n.includes('europe'));
  const alreadyEmerging = Array.from(existingNames).some(n => n.includes('emerging'));

  // Collect all holdings from existing portfolios
  const allHoldings: Record<string, any> = {};
  Object.values(base).forEach(p => {
    p.holdings?.forEach(h => { if (!allHoldings[h.ticker]) allHoldings[h.ticker] = h; });
  });
  const holdingsList = Object.values(allHoldings);

  // Region classification heuristics
  // Core ETF & equity proxies for regions (used also as fallback universe)
  const EUROPE_TICKERS = new Set([
    'VGK','EZU','FEZ','EWU','EWL','EWG','EWQ','EWI','IEUR','IEV','EWO','EWK','EWN','EWP','EWD','EIRL','EFA','IXUS','SX5E','DAX','FTSE','STOXX50E'
  ]);
  const EUROPE_FALLBACK = [ 'VGK','EZU','FEZ','EWG','EWQ','EWL','EWI','EWU','IEUR','IEV' ];
  const isEurope = (t: string) => /\.(AS|DE|SW|PA|L|BR|MC|MI|F|BE|CO)$/.test(t) || EUROPE_TICKERS.has(t.replace(/[^A-Z.]/g,''));
  const emergingTickers = new Set([
    'BABA','TCEHY','JD','BIDU','NIO','TSM','MELI','PDD','INFY','VALE','SNP','YPF','EC','GGAL','ITUB','PBR','EEM','VWO','IEMG','EMXC','FXI','EWZ','EWW','EZA','EPOL','EPI','EWY','INDA','ASHR','KWEB'
  ]);
  const EM_FALLBACK = [ 'EEM','VWO','IEMG','FXI','EWZ','EWW','EZA','EPOL','EPI','INDA' ];
  const isEmerging = (t: string) => emergingTickers.has(t.replace(/[^A-Z.]/g,''));

  let europeHoldings = holdingsList.filter(h => isEurope(h.ticker));
  let emergingHoldings = holdingsList.filter(h => isEmerging(h.ticker));

  // If broad international ETF (e.g. IXUS / EFA) present but few pure Europe tickers, synthesize by decomposing into region ETFs
  const hasBroadIntl = holdingsList.some(h => ['IXUS','EFA','VEA'].includes(h.ticker));
  if (hasBroadIntl && europeHoldings.length < 5) {
    const supplemental = EUROPE_FALLBACK.filter(t => !europeHoldings.some(h=>h.ticker===t)).slice(0, 5 - europeHoldings.length)
      .map(t => ({
        ticker: t,
        name: `${t} ETF`,
        weight: 0, // will rebalance later
        price: 0,
        change: '0.00%',
        performance: { daily:'0.00%', weekly:'0.00%', monthly:'0.00%', quarterly:'0.00%', yearly:'0.00%' }
      }));
    europeHoldings = [...europeHoldings, ...supplemental];
  }
  if (emergingHoldings.length < 5) {
    const supplemental = EM_FALLBACK.filter(t => !emergingHoldings.some(h=>h.ticker===t)).slice(0, 5 - emergingHoldings.length)
      .map(t => ({
        ticker: t,
        name: `${t} ETF`,
        weight: 0,
        price: 0,
        change: '0.00%',
        performance: { daily:'0.00%', weekly:'0.00%', monthly:'0.00%', quarterly:'0.00%', yearly:'0.00%' }
      }));
    emergingHoldings = [...emergingHoldings, ...supplemental];
  }

  // Utility to compute aggregate performance from holdings (simple average of underlying performance fields)
  const aggregatePerf = (list: any[]) => {
    const tf = ['daily','weekly','monthly','quarterly','yearly'] as const;
    const avg: any = {};
    tf.forEach(k => {
      if (!list.length) { avg[k] = '0.00%'; return; }
      const sum = list.reduce((acc,h)=> acc + parsePct(h.performance?.[k]),0);
      const val = sum / list.length;
      const sign = val>0?'+':'';
      avg[k] = `${sign}${val.toFixed(2)}%`;
    });
    return avg as {daily:string;weekly:string;monthly:string;quarterly:string;yearly:string};
  };

  // Evenly weight holdings (or use existing weight capped) then normalize
  const buildWeights = (list: any[]) => {
    if (!list.length) return list;
    const w = +(100 / list.length).toFixed(2);
    return list.map(h => ({ ...h, weight: w }));
  };

  if (!alreadyEurope && europeHoldings.length) {
    const weighted = buildWeights(europeHoldings);
    clone['europe'] = {
      name: 'Europe Portfolio',
      description: 'Aggregated synthetic European equity exposure (auto-generated).',
      performance: aggregatePerf(weighted),
      holdings: weighted.slice(0, 25) // cap to 25 for UI
    };
    console.log('[SyntheticPortfolio] Added Europe Portfolio', { count: weighted.length });
  }

  if (!alreadyEmerging && emergingHoldings.length) {
    const weighted = buildWeights(emergingHoldings);
    clone['emerging_markets'] = {
      name: 'Emerging Markets Portfolio',
      description: 'Aggregated synthetic Emerging Markets equity exposure (auto-generated).',
      performance: aggregatePerf(weighted),
      holdings: weighted.slice(0, 25)
    };
    console.log('[SyntheticPortfolio] Added Emerging Markets Portfolio', { count: weighted.length });
  }
  return clone;
}

// Compute AI score (0-100) using weighted multi-timeframe momentum
function computeAIScore(perf: {daily:string;weekly:string;monthly:string;quarterly:string;yearly:string}) {
  const clamp = (v:number,min:number,max:number)=> Math.max(min, Math.min(max, v));
  const d = clamp(parsePct(perf.daily), -5, 5) / 5;
  const w = clamp(parsePct(perf.weekly), -12, 12) / 12;
  const m = clamp(parsePct(perf.monthly), -25, 25) / 25;
  const q = clamp(parsePct(perf.quarterly), -40, 40) / 40;
  const y = clamp(parsePct(perf.yearly), -80, 80) / 80;
  const raw = d*0.1 + w*0.15 + m*0.2 + q*0.25 + y*0.3;
  const scaled = (raw + 1) / 2 * 100;
  return Math.round(clamp(scaled,0,100));
}

export default function AIPortfolioPage() {
  const [prompt, setPrompt] = useState('');
  const [investment, setInvestment] = useState('');
  const [generatedPortfolioText, setGeneratedPortfolioText] = useState('');
  const [generatedHoldings, setGeneratedHoldings] = useState<any[] | null>(null);
  const [genStats, setGenStats] = useState<{ invested:number; cash:number; diversification:number; risk:string; strategy:string }|null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [economicPortfolios, setEconomicPortfolios] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ai-generator');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activePeriods, setActivePeriods] = useState<string[]>(['daily','weekly','monthly','yearly']);
  const [barPeriod, setBarPeriod] = useState<'daily'|'weekly'|'monthly'|'quarterly'|'yearly'>('monthly');
  const [barSort, setBarSort] = useState<'name'|'performance'>('performance');
  // Regime sync (shared with MarketInteractiveChart)
  const [currentRegime, setCurrentRegime] = useState<RegimeKey>('goldilocks')
  useEffect(() => {
    try { const r = localStorage.getItem('mic_regime') as RegimeKey | null; if (r) setCurrentRegime(r) } catch {}
    const onSet = (e:any)=> { const v = e?.detail as RegimeKey; if (v) setCurrentRegime(v) }
    window.addEventListener('mic:setRegime', onSet as any)
    return ()=> window.removeEventListener('mic:setRegime', onSet as any)
  }, [])
  // AI signal banner (from MarketInteractiveChart)
  // AI signal banner removed per requirements; top pick card retained

  // Rank portfolios by AI entry desirability
  const aiRankings = useMemo(() => {
    if (!economicPortfolios) return [] as Array<{ key:string; fullName:string; name:string; entry:number; exit:number; score:number; reasons:string[] }>
    const rows: Array<{ key:string; fullName:string; name:string; entry:number; exit:number; score:number; reasons:string[] }> = []
    Object.entries(economicPortfolios).forEach(([key, p]) => {
      const sig = computePortfolioAISignal(p, currentRegime)
      if (!sig) return
      const fullName = p.name || key
      const name = fullName.replace(' Portfolio','')
      // Composite score: favor high entry, penalize high exit beyond 40
      const score = sig.entry - Math.max(0, sig.exit - 40) * 0.6
      rows.push({ key, fullName, name, entry: sig.entry, exit: sig.exit, score, reasons: sig.reasons })
    })
    rows.sort((a,b)=> b.score - a.score)
    return rows
  }, [economicPortfolios, currentRegime])
  const topPick = aiRankings[0] || null

  useEffect(() => {
    fetchEconomicPortfolios();
    // Auto-refresh every 10 minutes
    const id = setInterval(() => fetchEconomicPortfolios(), 600000);
    return () => clearInterval(id);
  }, []);

  const fetchEconomicPortfolios = async (forceRefresh = false) => {
    if (forceRefresh) setIsRefreshing(true);
    try {
      // Add cache-busting parameter if forcing refresh
      const url = forceRefresh ? `/api/dashboard-data?refresh=${Date.now()}` : '/api/dashboard-data';
      const response = await fetch(url);
      const data = await response.json();
      if (data.economicPortfolios) {
        // Augment with regional synthetic portfolios (no duplication)
        const augmented = augmentWithRegional(data.economicPortfolios);
        // After augmentation fetch real quotes for every holding (deduped)
        const allSymbols = Array.from(new Set(Object.values(augmented).flatMap(p => p.holdings?.map(h => h.ticker) || [])));
        let quotes: Record<string, any> = {};
        if (allSymbols.length) {
          try {
            const qres = await fetch(`/api/quotes?symbols=${encodeURIComponent(allSymbols.join(','))}`);
            const qjson = await qres.json();
            if (qjson.ok) quotes = qjson.data || {};
          } catch (e) {
            console.warn('Quotes fetch failed', e);
          }
        }
        // Merge real data into holdings and recompute portfolio performance as weighted average of daily
        const merged: PortfolioData = {};
        Object.entries(augmented).forEach(([key, p]) => {
          const newHoldings = p.holdings.map(h => {
            const q = quotes[h.ticker];
            if (!q) return h; // keep existing
            return {
              ...h,
              name: q.name || h.name,
              price: q.price ?? h.price,
              change: `${q.changePercent > 0 ? '+' : ''}${q.changePercent.toFixed(2)}%`,
              performance: q.performance || h.performance
            };
          });
          // recompute portfolio performance as average (or weighted) of underlying
          const totalWeight = newHoldings.reduce((s, h) => s + (h.weight || 0), 0) || 100;
          const agg = (tf: keyof typeof newHoldings[0]['performance']) => {
            const sum = newHoldings.reduce((acc, h) => acc + parsePct(h.performance?.[tf]), 0);
            const val = sum / newHoldings.length;
            return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
          };
          const perfObj = {
            daily: agg('daily'),
            weekly: agg('weekly'),
            monthly: agg('monthly'),
            quarterly: agg('quarterly'),
            yearly: agg('yearly')
          };
          merged[key] = {
            ...p,
            performance: perfObj,
            holdings: newHoldings,
            aiScore: computeAIScore(perfObj)
          };
        });
        setEconomicPortfolios(merged);
        setLastUpdated(data.lastUpdated);
        // Show cache status to user if available
        if (data.lastUpdated) {
          const cacheTime = new Date(data.lastUpdated);
          const cacheAge = Math.round((Date.now() - cacheTime.getTime()) / 1000 / 60);
          console.log('📊 Portfolio data loaded:', {
            portfolios: Object.keys(merged).length,
            lastUpdated: cacheTime.toLocaleString(),
            cacheAge: cacheAge < 60 ? `${cacheAge} minutes ago` : `${Math.round(cacheAge/60)} hours ago`,
            source: forceRefresh ? 'Force refresh' : 'Cache/Fresh'
          });
        }
      }
    } catch (error) {
      console.error('Error loading portfolios:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // === Real Data AI Portfolio Generation ===
  interface CandidateAsset { symbol:string; role:string; baseWeight:number; allowAdjust?:boolean; }
  const CANDIDATES: CandidateAsset[] = [
    { symbol:'VTI', role:'US Core', baseWeight:25 },
    { symbol:'QQQ', role:'Tech Growth', baseWeight:15 },
    { symbol:'SCHD', role:'Dividend Value', baseWeight:10 },
    { symbol:'VTV', role:'Value', baseWeight:0, allowAdjust:true },
    { symbol:'IEFA', role:'Developed Intl', baseWeight:8 },
    { symbol:'VWO', role:'Emerging Mkts', baseWeight:7 },
    { symbol:'AGG', role:'Core Bonds', baseWeight:10 },
    { symbol:'TLT', role:'Long Duration', baseWeight:5 },
    { symbol:'GLD', role:'Gold Hedge', baseWeight:5 },
    { symbol:'BIL', role:'Cash Proxy', baseWeight:5 },
    { symbol:'SOXX', role:'Semis Theme', baseWeight:5 },
    { symbol:'BTC-USD', role:'Crypto', baseWeight:0 },
  ];

  type RiskProfile = 'low'|'medium'|'high';
  function inferRisk(promptText:string): RiskProfile {
    const p = promptText.toLowerCase();
    if (/(aggressive|high risk|rocket|moon|speculative|growth max)/.test(p)) return 'high';
    if (/(income|capital preservation|low risk|conservative|stability)/.test(p)) return 'low';
    return 'medium';
  }
  function adjustWeights(risk:RiskProfile, promptText:string) {
    // clone weights
    const weights: Record<string, number> = Object.fromEntries(CANDIDATES.map(c=>[c.symbol,c.baseWeight]));
    // baseline by risk
    if (risk==='low') {
      weights['QQQ'] -= 5; weights['AGG'] += 5; weights['TLT'] += 3; weights['BTC-USD']=0; weights['SOXX']-=2; weights['BIL'] += 3;
    } else if (risk==='high') {
      weights['QQQ'] += 5; weights['SOXX'] += 3; weights['AGG'] -= 4; weights['TLT'] = 0; weights['BTC-USD']=8; weights['BIL'] = Math.max(0, weights['BIL']-3);
    } else { // medium
      weights['BTC-USD']=3; weights['AGG'] += 2;
    }
    const p = promptText.toLowerCase();
    if (/(dividend|income|yield)/.test(p)) { weights['SCHD'] += 5; weights['QQQ'] -= 3; }
    if (/(technology|ai|software|innovation|semiconduct)/.test(p)) { weights['QQQ'] += 4; weights['SOXX'] += 2; weights['AGG'] -= 2; }
    if (/(emerging|china|india|latam)/.test(p)) { weights['VWO'] += 3; }
    if (/(international|europe|global diversification)/.test(p)) { weights['IEFA'] += 3; }
    if (/(hedge|inflation|protection|risk)/.test(p)) { weights['GLD'] += 2; }
    if (/(cash|liquidity)/.test(p)) { weights['BIL'] += 3; }
    // Remove negative & set minimum 0
    Object.keys(weights).forEach(k=> { if (weights[k] < 0) weights[k]=0; });
    // Normalize to 100 (excluding crypto if user didn't ask & risk not high)
    const includeCrypto = /(crypto|bitcoin|btc)/.test(p) || risk==='high';
    if (!includeCrypto) weights['BTC-USD']=0;
    const total = Object.values(weights).reduce((a,b)=>a+b,0) || 1;
    Object.keys(weights).forEach(k=> { weights[k] = +(weights[k] / total * 100); });
    return weights;
  }
  function shannonEntropy(weights: Record<string, number>) {
    const w = Object.values(weights).filter(v=>v>0).map(v=> v/100);
    const h = -w.reduce((a,b)=> a + b*Math.log(b), 0);
    const hMax = Math.log(w.length || 1);
    return hMax? +( (h / hMax) * 100 ).toFixed(1) : 0;
  }

  const generatePortfolio = async () => {
    setGenError(null); setGeneratedHoldings(null); setGeneratedPortfolioText(''); setGenStats(null);
    if (!prompt.trim() || !investment.trim()) { setGenError('Provide investment amount and goals.'); return; }
    const investNum = parseFloat(investment);
    if (!isFinite(investNum) || investNum <= 0) { setGenError('Invalid investment amount.'); return; }
    setIsGenerating(true);
    try {
      const risk = inferRisk(prompt);
      const weights = adjustWeights(risk, prompt);
      const symbols = Object.keys(weights).filter(s=> weights[s] > 0);
      // Fetch quotes
      let quotes: Record<string, any> = {};
      try {
        const qRes = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`);
        const qJson = await qRes.json();
        if (qJson.ok) quotes = qJson.data;
      } catch (e) { setGenError('Quote fetch failed; try again.'); }
      // Build holdings
      const holdings: any[] = [];
      let invested = 0;
      symbols.forEach(sym => {
        const w = weights[sym];
        const allocValue = investNum * (w/100);
        const q = quotes[sym];
        const price = q?.price || 0;
        const shares = price>0 ? Math.floor(allocValue / price) : 0;
        const value = price * shares;
        invested += value;
        holdings.push({
          symbol: sym,
          role: CANDIDATES.find(c=>c.symbol===sym)?.role || 'Asset',
            targetWeight: +w.toFixed(2),
            price: price,
            shares,
            value: +value.toFixed(2),
            perf: q?.performance || {},
            changePct: q?.changePercent || 0,
            name: q?.name || sym
        });
      });
      const cash = +(investNum - invested).toFixed(2);
      // Realized weights
      holdings.forEach(h=> { h.realizedWeight = invested>0 ? +( (h.value / invested) * 100 ).toFixed(2) : 0; });
      // Diversification
      const diversification = shannonEntropy(Object.fromEntries(holdings.map(h=> [h.symbol, h.targetWeight])));
      // Strategy summary
      const strategy = `Risk: ${risk.toUpperCase()} | Emphasis: ${prompt.split(/[,.;]/)[0].slice(0,80)}`;
      // Sort by target weight desc
      holdings.sort((a,b)=> b.targetWeight - a.targetWeight);
      setGeneratedHoldings(holdings);
      setGenStats({ invested:+invested.toFixed(2), cash, diversification, risk, strategy });
      // Text summary
      const lines = [
        `AI Portfolio (${risk} risk) – Investment $${investNum.toFixed(2)}`,
        `Strategy: ${strategy}`,
        '',
        'Symbol | Role | Target% | Realized% | Shares | Price | Value',
        '-------|------|---------|-----------|--------|-------|------',
        ...holdings.map(h=> `${h.symbol} | ${h.role} | ${h.targetWeight.toFixed(1)} | ${h.realizedWeight.toFixed(1)} | ${h.shares} | ${h.price.toFixed(2)} | ${h.value.toFixed(2)}`),
        '',
        `Invested: $${invested.toFixed(2)}  Cash Buffer: $${cash.toFixed(2)}  Diversification Score: ${diversification}%`
      ];
      setGeneratedPortfolioText(lines.join('\n'));
    } catch (e:any) {
      console.error(e);
      setGenError(e.message || 'Unexpected error');
    } finally { setIsGenerating(false); }
  };

  const getPerformanceColor = (performance: string | number) => {
    const numValue = typeof performance === 'string' 
      ? parseFloat(performance.replace('%', '')) 
      : performance;
    return numValue >= 0 ? 'text-green-500' : 'text-red-500';
  };

  // Prepare chart data from portfolios
  const prepareChartData = () => {
    if (!economicPortfolios) return [];
    
    return Object.entries(economicPortfolios).map(([key, portfolio]) => ({
      name: portfolio.name?.replace(' Portfolio', '') || key,
      fullName: portfolio.name || key,
      daily: parseFloat(portfolio.performance?.daily?.replace('%', '') || '0'),
      weekly: parseFloat(portfolio.performance?.weekly?.replace('%', '') || '0'), 
      monthly: parseFloat(portfolio.performance?.monthly?.replace('%', '') || '0'),
      quarterly: parseFloat(portfolio.performance?.quarterly?.replace('%', '') || '0'),
      yearly: parseFloat(portfolio.performance?.yearly?.replace('%', '') || '0'),
    }));
  };

  const barChartData = () => {
    const base = prepareChartData();
    if (!base.length) return [];
    const sorted = [...base].sort((a,b)=>{
      if (barSort==='name') return a.name.localeCompare(b.name);
      return (b as any)[barPeriod] - (a as any)[barPeriod];
    });
    return sorted;
  };

  // Map portfolio name to economic regime key used by MarketInteractiveChart
  type RegimeKey = 'goldilocks' | 'recession' | 'stagflation' | 'reflation' | 'deflation' | 'disinflation' | 'dollarWeakness'
  const friendlyRegimeLabel = (reg: RegimeKey) => ({
    goldilocks: 'Goldilocks Economy',
    recession: 'Recession',
    stagflation: 'Stagflation',
    reflation: 'Reflation',
    deflation: 'Deflation',
    disinflation: 'Disinflation',
    dollarWeakness: 'Dollar Weakness',
  }[reg] || reg)
  const nameToRegime = (name: string): RegimeKey | null => {
    const s = (name || '').toLowerCase()
    if (s.includes('goldilocks')) return 'goldilocks'
    if (s.includes('recession')) return 'recession'
    if (s.includes('stagflation')) return 'stagflation'
    if (s.includes('reflation')) return 'reflation'
    if (s.includes('deflation')) return 'deflation'
    if (s.includes('disinflation') || s.includes('soft landing')) return 'disinflation'
    if (s.includes('dollar') && (s.includes('weakness') || s.includes('rebalancing'))) return 'dollarWeakness'
    return null
  }
  const setGlobalRegime = (reg: RegimeKey) => {
    try { localStorage.setItem('mic_regime', reg) } catch {}
    try { window.dispatchEvent(new CustomEvent('mic:setRegime', { detail: reg })) } catch {}
  }

  // Meta for periods (color + label)
  const PERIOD_META: Record<string,{label:string;color:string;gradient:string[]}> = {
    daily:   { label: '1D', color: '#10B981', gradient:['rgba(16,185,129,0.35)','rgba(16,185,129,0)'] },
    weekly:  { label: '1W', color: '#3B82F6', gradient:['rgba(59,130,246,0.35)','rgba(59,130,246,0)'] },
    monthly: { label: '1M', color: '#8B5CF6', gradient:['rgba(139,92,246,0.35)','rgba(139,92,246,0)'] },
    yearly:  { label: '1Y', color: '#F59E0B', gradient:['rgba(245,158,11,0.35)','rgba(245,158,11,0)'] }
  };

  // AI signal for a portfolio (heuristic, uses performance and breadth; weighted by regime)
  function computePortfolioAISignal(p:any, regime:RegimeKey) {
    const d = parseFloat(p?.performance?.daily?.replace('%','')||'0')
    const w = parseFloat(p?.performance?.weekly?.replace('%','')||'0')
    const m = parseFloat(p?.performance?.monthly?.replace('%','')||'0')
    const q = parseFloat(p?.performance?.quarterly?.replace('%','')||'0')
    const y = parseFloat(p?.performance?.yearly?.replace('%','')||'0')
    const h = Array.isArray(p?.holdings) ? p.holdings : []
    const breadth = h.length ? (h.filter((x:any)=> parseFloat(x?.performance?.monthly?.replace('%','')||'0')>0).length / h.length) : 0.5
    const dailyBreadth = h.length ? (h.filter((x:any)=> parseFloat(x?.performance?.daily?.replace('%','')||'0')>0).length / h.length) : 0.5
    const clamp = (v:number,a=-1,b=1)=> Math.max(a, Math.min(b, v))
    const tn = (v:number, s:number)=> clamp(Math.tanh(v/Math.max(0.001,s)))
    const fD = tn(d, 1.2)
    const fW = tn(w, 3)
    const fM = tn(m, 6)
    const fQ = tn(q, 10)
    const fY = tn(y, 18)
    const fBr = clamp(breadth*2-1)
    const fBrD = clamp(dailyBreadth*2-1)
    const overbought = Math.max(0, (d-1.2)/2) + Math.max(0,(w-4)/6) + Math.max(0,(m-8)/10)
    const fOB = clamp(Math.tanh(overbought))
    const crossWarn = (m>0 && d<0) ? 0.6 : 0
    // Regime weights (trend vs mean reversion tilt)
    const W: Record<RegimeKey, [number,number,number,number,number,number,number,number]> = {
      //           D     W     M     Q     Y     Br    BrD   OB
      goldilocks: [0.10, 0.15, 0.30, 0.15, 0.10, 0.15, 0.05, -0.10],
      disinflation:[0.10, 0.15, 0.25, 0.15, 0.10, 0.15, 0.10, -0.10],
      reflation:  [0.10, 0.20, 0.25, 0.10, 0.05, 0.15, 0.05, -0.10],
      recession:  [0.05, 0.05, 0.10, 0.15, 0.10, 0.20, 0.20, -0.05],
      stagflation:[0.05, 0.10, 0.10, 0.10, 0.05, 0.25, 0.25, -0.05],
      deflation:  [0.05, 0.05, 0.10, 0.10, 0.10, 0.25, 0.25, -0.05],
      dollarWeakness:[0.10,0.20, 0.20, 0.10, 0.05, 0.20, 0.05, -0.10],
    }
    const wgt = W[regime]
    const entryS = clamp(
      wgt[0]*fD + wgt[1]*fW + wgt[2]*fM + wgt[3]*fQ + wgt[4]*fY + wgt[5]*fBr + wgt[6]*fBrD + wgt[7]*(-fOB) - 0.15*crossWarn
    )
    const exitS = clamp( 0.45*fOB + 0.25*(fBr<0? -fBr:0) + 0.15*(fM<0? -fM:0) + 0.15*(fD<0? -fD:0) )
    const toProb = (s:number)=> Math.round(((s + 1) / 2) * 100)
    const entry = Math.max(1, Math.min(99, toProb(entryS)))
    const exit = Math.max(1, Math.min(99, toProb(exitS)))
  const reasons:string[] = []
  if (fM>0.3) reasons.push('1M momentum positive')
  if (fBr>0.2) reasons.push('Breadth is favorable')
  if (fOB>0.4) reasons.push('Overbought risk')
  if (crossWarn>0.5) reasons.push('Short-term weakness vs 1M')
    return { entry, exit, reasons }
  }

  // Period toggling UI removed for simplified view (bar chart only)

  // Enhanced custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const rows = payload.filter((p:any)=> activePeriods.includes(p.dataKey));
    if (!rows.length) return null;
    return (
      <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-600 rounded-lg p-4 shadow-xl min-w-[160px]">
        <p className="font-semibold text-white mb-2 text-sm">{label}</p>
        <div className="space-y-1">
          {rows.map((entry:any, i:number) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{background: entry.color}}></span>
                {PERIOD_META[entry.dataKey]?.label || entry.dataKey}
              </span>
              <span className={entry.value>=0?'text-green-400':'text-red-400'}>{entry.value>0?'+':''}{entry.value.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Custom label renderer for bar values (improves contrast & alignment)
  const ValueLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (typeof value !== 'number' || isNaN(value)) return null;
    const isPos = value >= 0;
    const text = `${value>0?'+':''}${value.toFixed(2)}%`;
    // Position label just after bar end (for negative values place before start)
    const padding = 6;
    const tx = isPos ? (x + width + padding) : (x - padding);
    const anchor = isPos ? 'start' : 'end';
    return (
      <text x={tx} y={y + (height/2) + 3} textAnchor={anchor} fontSize={10} fill={isPos ? '#10B981' : '#EF4444'} fontWeight={500}>{text}</text>
    );
  };

  // computeYDomain removed with the multi-period line/area chart

  const renderPortfolio = (portfolioKey: string, portfolioData: any) => {
    if (!portfolioData || !portfolioData.holdings) return null;
  // Per-portfolio AI Entry/Exit chips removed per requirements
    return (
  <div key={portfolioKey} id={`portfolio-${portfolioKey}`} className="bg-slate-800 border border-slate-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow scroll-mt-20">
        <div className="border-b border-slate-600 pb-4 mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">{portfolioData.name}</h3>
            <p className="text-sm text-gray-400">{portfolioData.description}</p>
            {typeof portfolioData.aiScore === 'number' && (
              <div className="mt-1 text-[10px] tracking-wide uppercase text-gray-500">
                AI Score: <span className={`${portfolioData.aiScore>75?'text-green-400':portfolioData.aiScore>50?'text-blue-400':portfolioData.aiScore>35?'text-amber-400':'text-red-400'}`}>{portfolioData.aiScore}</span> • {portfolioData.aiScore>75?'Strong':portfolioData.aiScore>50?'Moderate':portfolioData.aiScore>35?'Weak':'Very Weak'} momentum
              </div>
            )}
          </div>
          {typeof portfolioData.aiScore === 'number' && (
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16">
                <path strokeWidth="3" stroke="#334155" fill="none" d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32" />
                <path strokeLinecap="round" strokeWidth="3" fill="none" d="M18 2 a16 16 0 0 1 0 32 a16 16 0 0 1 0 -32" stroke={portfolioData.aiScore>75?'#10B981':portfolioData.aiScore>50?'#3B82F6':portfolioData.aiScore>35?'#F59E0B':'#EF4444'} strokeDasharray={`${(portfolioData.aiScore/100)*100} ${(1-portfolioData.aiScore/100)*100}`} strokeDashoffset="25" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold" style={{color: portfolioData.aiScore>75?'#10B981':portfolioData.aiScore>50?'#3B82F6':portfolioData.aiScore>35?'#F59E0B':'#EF4444'}}>{portfolioData.aiScore}</div>
            </div>
          )}
        </div>
        
        {/* Performance Section */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-slate-700 rounded-lg">
            <div className="text-xs font-medium text-gray-400 mb-1">1D</div>
            <div className={`text-sm font-bold ${getPerformanceColor(portfolioData.performance?.daily || '0.00%')}`}>
              {portfolioData.performance?.daily || '0.00%'}
            </div>
          </div>
          <div className="text-center p-3 bg-slate-700 rounded-lg">
            <div className="text-xs font-medium text-gray-400 mb-1">1W</div>
            <div className={`text-sm font-bold ${getPerformanceColor(portfolioData.performance?.weekly || '0.00%')}`}>
              {portfolioData.performance?.weekly || '0.00%'}
            </div>
          </div>
          <div className="text-center p-3 bg-slate-700 rounded-lg">
            <div className="text-xs font-medium text-gray-400 mb-1">1M</div>
            <div className={`text-sm font-bold ${getPerformanceColor(portfolioData.performance?.monthly || '0.00%')}`}>
              {portfolioData.performance?.monthly || '0.00%'}
            </div>
          </div>
          <div className="text-center p-3 bg-slate-700 rounded-lg">
            <div className="text-xs font-medium text-gray-400 mb-1">1Y</div>
            <div className={`text-sm font-bold ${getPerformanceColor(portfolioData.performance?.yearly || '0.00%')}`}>
              {portfolioData.performance?.yearly || '0.00%'}
            </div>
          </div>
        </div>

        {/* Holdings */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-300 border-b border-slate-600 pb-1">Holdings</h4>
          {portfolioData.holdings?.slice(0, 5).map((stock: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg gap-3 overflow-hidden">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-white">{stock.ticker}</div>
                <div className="text-xs text-gray-400 truncate">{stock.name}</div>
                <div className="text-xs text-blue-400 mt-1">Weight: {stock.weight}%</div>
              </div>
              <div className="shrink-0 text-right ml-4 w-28 sm:w-32">
                <div className="text-sm font-semibold text-white whitespace-nowrap leading-tight">${typeof stock.price === 'number' ? stock.price.toFixed(2) : '0.00'}</div>
                <div className={`text-xs font-medium whitespace-nowrap leading-tight ${getPerformanceColor(stock.change || stock.performance?.daily || '0.00%')}`}>
                  {stock.change || stock.performance?.daily || '0.00%'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
  <RequirePlan min="pro">
    <div className="min-h-screen bg-[var(--background)] text-white">
      {/* Navigation Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center">
            <NavigationLink href="/" className="flex items-center space-x-2 text-gray-300 hover:text-white">
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Back to Home</span>
            </NavigationLink>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">
            ✨ AI Portfolio Generator
          </h1>
          <p className="text-gray-400">
            Create personalized investment portfolios with artificial intelligence
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('ai-generator')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'ai-generator'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              AI Generator
            </button>
            <button
              onClick={() => setActiveTab('economic-portfolios')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'economic-portfolios'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Economic Portfolios
            </button>
          </div>

          {activeTab === 'ai-generator' && (
            <div className="space-y-6">
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-600">
                <h2 className="text-xl font-semibold mb-4 text-white">
                  ✨ Generate your personalized portfolio
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Investment Amount ($)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 10000"
                      value={investment}
                      onChange={(e) => setInvestment(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Describe your investment goals
                    </label>
                    <textarea
                      placeholder="e.g. I want a diversified portfolio with focus on technology and long-term growth..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <button 
                    onClick={generatePortfolio}
                    disabled={!prompt.trim() || !investment.trim() || isGenerating}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                  >
                    {isGenerating ? (
                      <>⏳ Generating portfolio...</>
                    ) : (
                      <>✨ Generate AI Portfolio</>
                    )}
                  </button>
                </div>
              </div>

              {(genError || generatedHoldings) && (
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-600 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">📈 Generated Portfolio {genStats && <span className="text-xs font-normal text-gray-400">(Real Market Data)</span>}</h2>
                    {genStats && (
                      <button onClick={()=> navigator.clipboard.writeText(generatedPortfolioText)} className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 border border-slate-500 text-gray-300">Copy Markdown</button>
                    )}
                  </div>
                  {genError && (
                    <div className="text-red-400 text-sm bg-red-900/20 border border-red-700 rounded p-3">{genError}</div>
                  )}
                  {generatedHoldings && genStats && (
                    <>
                      <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-4 text-xs">
                        <div className="bg-slate-700 rounded p-3">
                          <div className="text-gray-400 mb-1">Invested</div>
                          <div className="text-green-400 font-semibold">${genStats.invested.toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-700 rounded p-3">
                          <div className="text-gray-400 mb-1">Cash Buffer</div>
                          <div className="text-blue-400 font-semibold">${genStats.cash.toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-700 rounded p-3">
                          <div className="text-gray-400 mb-1">Diversification</div>
                          <div className="text-amber-400 font-semibold">{genStats.diversification}%</div>
                        </div>
                        <div className="bg-slate-700 rounded p-3">
                          <div className="text-gray-400 mb-1">Risk Profile</div>
                          <div className="font-semibold capitalize {genStats.risk==='high'?'text-red-400':genStats.risk==='low'?'text-green-400':'text-yellow-400'}">{genStats.risk}</div>
                        </div>
                      </div>
                      <div className="overflow-auto rounded border border-slate-600">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-700 text-gray-300">
                            <tr>
                              {['Symbol','Role','Target %','Real %','Shares','Price','Value','Daily %','Monthly %','Yearly %'].map(h=> <th key={h} className="px-2 py-1 text-left font-semibold">{h}</th>)}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {generatedHoldings.map(h=> {
                              const d = parseFloat(h.perf?.daily?.replace('%','')||'0');
                              const m = parseFloat(h.perf?.monthly?.replace('%','')||'0');
                              const y = parseFloat(h.perf?.yearly?.replace('%','')||'0');
                              return (
                                <tr key={h.symbol} className="hover:bg-slate-700/40">
                                  <td className="px-2 py-1 font-semibold text-white whitespace-nowrap">{h.symbol}</td>
                                  <td className="px-2 py-1 text-gray-400 whitespace-nowrap">{h.role}</td>
                                  <td className="px-2 py-1">{h.targetWeight.toFixed(1)}</td>
                                  <td className="px-2 py-1">{h.realizedWeight.toFixed(1)}</td>
                                  <td className="px-2 py-1">{h.shares}</td>
                                  <td className="px-2 py-1">${h.price.toFixed(2)}</td>
                                  <td className="px-2 py-1">${h.value.toFixed(2)}</td>
                                  <td className={`px-2 py-1 ${d>=0?'text-green-400':'text-red-400'}`}>{d>=0?'+':''}{d.toFixed(2)}%</td>
                                  <td className={`px-2 py-1 ${m>=0?'text-green-400':'text-red-400'}`}>{m>=0?'+':''}{m.toFixed(2)}%</td>
                                  <td className={`px-2 py-1 ${y>=0?'text-green-400':'text-red-400'}`}>{y>=0?'+':''}{y.toFixed(2)}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-slate-700 p-4 rounded-md text-[11px] text-gray-400 leading-relaxed border border-slate-600">
                          <p className="mb-1"><strong className="text-gray-300">Methodology:</strong> We infer risk profile & thematic emphasis from your text, map to asset class target weights (equities, factors, international, bonds, hedges, thematic, crypto), fetch live quotes (Yahoo Finance), compute share counts using floor division, and report residual as cash buffer. Diversification score = normalized Shannon entropy of target weights.</p>
                        </div>
                        <div
                          role="note"
                          aria-label="Important disclaimer"
                          className="relative overflow-hidden rounded-md border border-amber-500/40 bg-gradient-to-br from-amber-900/40 via-slate-900/40 to-slate-900/60 p-4 text-[11px] leading-relaxed">
                          <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(circle_at_30%_20%,white,transparent)] opacity-40" />
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 text-amber-400">⚠️</div>
                            <div className="space-y-1">
                              <h4 className="text-amber-300 font-semibold tracking-wide text-[10px] uppercase">Important Disclaimer</h4>
                              <p className="text-gray-200">
                                This AI-generated allocation is <span className="font-semibold underline decoration-amber-400/70 decoration-2">NOT investment advice</span>. It is a starting point for research only and may not match your financial objectives, risk tolerance, tax situation, or regulatory constraints.
                              </p>
                              <ul className="list-disc ml-4 text-gray-400">
                                <li>Market data can be delayed or incomplete.</li>
                                <li>Allocations ignore transaction costs & tax impact.</li>
                                <li>Past performance metrics do not guarantee future results.</li>
                              </ul>
                              <p className="text-gray-300 font-medium">Always perform independent due diligence or consult a licensed professional before acting.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-300 mb-2">Markdown Summary</h3>
                        <pre className="bg-slate-900/60 border border-slate-600 rounded p-3 text-[11px] whitespace-pre-wrap text-gray-300 max-h-64 overflow-auto">{generatedPortfolioText}</pre>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'economic-portfolios' && (
            <div className="space-y-6">
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2 text-white">
                    💼 Economic Portfolios
                  </h2>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <span>Ready-to-use portfolios for different economic scenarios</span>
                    {lastUpdated && (
                      <span>• Last updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right space-y-2">
                  {topPick && (
                    <div className="bg-gradient-to-br from-slate-700/70 via-slate-800 to-slate-900/80 border border-slate-600 rounded-lg p-3 w-72 text-left shadow-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[11px] text-gray-300 font-medium">AI Best Entry Now</div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-500 bg-slate-900/40 text-gray-300">{friendlyRegimeLabel(currentRegime)}</span>
                      </div>
                      <div className="text-sm font-semibold text-white truncate">{topPick.name}</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-2">
                          <div className="text-[10px] text-emerald-300 uppercase tracking-wide">Entry</div>
                          <div className="text-lg font-bold text-emerald-300">{topPick.entry}%</div>
                        </div>
                        <div className="rounded-md border border-red-500/50 bg-red-500/10 p-2">
                          <div className="text-[10px] text-red-300 uppercase tracking-wide">Exit</div>
                          <div className="text-lg font-bold text-red-300">{topPick.exit}%</div>
                        </div>
                      </div>
                      {topPick.reasons?.length ? (
                        <div className="mt-2">
                          <div className="text-[10px] text-gray-400 mb-0.5">Why</div>
                          <ul className="list-disc ml-4 text-[11px] text-gray-300 space-y-0.5">
                            {topPick.reasons.slice(0,2).map((r, i)=> (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <a href={`#portfolio-${topPick.key}`} className="mt-2 inline-block text-[11px] text-blue-300 hover:text-blue-200">Open portfolio →</a>
                    </div>
                  )}
                </div>
                {/* auto-refresh hidden per requirements */}
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading portfolios...</p>
                </div>
              ) : economicPortfolios ? (
                <>
                  {/* Performance Comparison Chart */}
                  <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-lg p-6 mb-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-slate-700/80 border border-slate-600 flex items-center justify-center text-blue-300">📊</div>
                        <div>
                          <h3 className="text-xl font-bold text-white">Performance Overview</h3>
                          <p className="text-xs text-slate-400">Compare portfolios across timeframes</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      {/* Bar Chart - Performance by Selected Period (Enhanced, now includes 1D) */}
                      <div className="bg-slate-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                          <h4 className="text-lg font-semibold text-white">{barPeriod==='daily'?'Daily':barPeriod==='weekly'?'Weekly':barPeriod==='monthly'?'Monthly':barPeriod==='quarterly'?'Quarterly':'Yearly'} Performance (%)</h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            {(['daily','weekly','monthly','quarterly','yearly'] as const).map(p=> (
                              <button
                                key={p}
                                onClick={()=>setBarPeriod(p)}
                                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${barPeriod===p?'bg-blue-600 text-white border-blue-500':'bg-slate-800 text-gray-400 border-slate-600 hover:text-white'}`}
                                title={p==='daily'?'Daily':p==='weekly'?'Weekly':p==='monthly'?'Monthly':p==='quarterly'?'Quarterly':'Yearly'}
                              >
                                {p==='daily'?'1D':p==='weekly'?'1W':p==='monthly'?'1M':p==='quarterly'?'3M':'1Y'}
                              </button>
                            ))}
                            <button onClick={()=>setBarSort(s=> s==='performance'?'name':'performance')} className="px-2.5 py-1 text-xs rounded-md border bg-slate-800 text-gray-400 border-slate-600 hover:text-white" title="Toggle sort">
                              Sort: {barSort==='performance'?'Perf':'Name'}
                            </button>
                          </div>
                        </div>
                        {(() => {
                          const data = barChartData();
                          const longest = data.reduce((m,d)=> Math.max(m, d.name.length), 0);
                          const yAxisWidth = Math.min(200, Math.max(90, longest * 8));
                          const dynamicHeight = Math.max(280, data.length * 34); // 34px per row baseline
                          return (
                            <div style={{ width: '100%', height: dynamicHeight }}>
                              <ResponsiveContainer>
                                <BarChart data={data} layout="vertical" margin={{left:0,right:32,top:8,bottom:8}} barCategoryGap={6}>
                              <defs>
                                <linearGradient id="grad-pos" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.15} />
                                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.85} />
                                </linearGradient>
                                <linearGradient id="grad-neg" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
                                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.85} />
                                </linearGradient>
                              </defs>
                                  <CartesianGrid strokeDasharray="2 4" stroke="#334155" horizontal={true} vertical={false} />
                                  <XAxis type="number" stroke="#94A3B8" tickFormatter={(v)=>`${v}%`} fontSize={11} domain={[ (dataMin: number)=> Math.min(-5, Math.floor(dataMin - 2)), (dataMax: number)=> Math.max(5, Math.ceil(dataMax + 2)) ]} />
                                  <YAxis type="category" dataKey="name" stroke="#94A3B8" width={yAxisWidth} tick={{fontSize:11}} />
                                  <Tooltip content={<CustomTooltip />} />
                                  <ReferenceLine x={0} stroke="#64748B" strokeDasharray="3 3" />
                                  <Bar dataKey={barPeriod} radius={[0,4,4,0]} barSize={22} isAnimationActive onClick={(d:any)=> {
                                    const n = d?.payload?.fullName || d?.payload?.name || d?.name || '';
                                    const reg = nameToRegime(String(n));
                                    if (reg) setGlobalRegime(reg);
                                  }}>
                                    <LabelList dataKey={barPeriod} content={ValueLabel} />
                                    {data.map((entry,i)=> {
                                      const val = (entry as any)[barPeriod];
                                      const isTop = aiRankings.length && aiRankings[0].name === entry.name;
                                      const stroke = isTop ? '#F59E0B' : (val>=0?'#10B981':'#EF4444');
                                      const sw = isTop ? 2 : 0.6;
                                      return <Cell key={`cell-${i}`} fill={val>=0?'url(#grad-pos)':'url(#grad-neg)'} stroke={stroke} strokeWidth={sw} />
                                    })}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          );
                        })()}
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Toggle timeframe & sort for comparative ranking.</span>
                          <span>Click a bar for tooltip.</span>
                        </div>
                      </div>

                      {/* Removed secondary line/area chart for simplified layout */}
                    </div>

                    {/* Quick Stats removed per request */}
                  </div>

                  {/* Portfolio Cards */}
                  <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                    {Object.entries(economicPortfolios).map(([key, portfolio]) => 
                      renderPortfolio(key, portfolio)
                    )}
                  </div>
                  {/* Disclaimers */}
                  <div className="mt-10 space-y-3 text-[11px] leading-relaxed text-gray-500 border-t border-slate-700 pt-4">
                    <h4 className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Disclaimers</h4>
                    <p><strong>Disclaimer 1:</strong> Past performance is not indicative of future results. Reported returns are computed from currently available market data and may differ from realizable outcomes.</p>
                    <p><strong>Disclaimer 2:</strong> The information provided is for educational and informational purposes only and does not constitute financial, legal, tax advice or an investment recommendation.</p>
                    <p><strong>Disclaimer 3:</strong> Price and performance data are sourced from third parties (e.g. Yahoo Finance / Tiingo) and provided “as is” without warranty of accuracy or completeness. Delays or discrepancies may occur.</p>
                    <p><strong>Disclaimer 4:</strong> Synthetic portfolios (e.g. Europe / Emerging Markets) are automatically constructed via heuristics and may not represent an optimal allocation or one suitable for your risk profile.</p>
                    <p><strong>Disclaimer 5:</strong> Always conduct your own due diligence or consult a qualified financial advisor before making investment decisions.</p>
                    <p className="italic text-gray-600">By continuing to use this page you acknowledge full responsibility for any decisions made using the displayed data and analytics.</p>
                  </div>
                </>
              ) : (
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-600 text-center">
                  <p className="text-gray-400">
                    Error loading economic portfolios.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  </RequirePlan>
  );
}

// (duplicate computeAIScore removed – function defined earlier)