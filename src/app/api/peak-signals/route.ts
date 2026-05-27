import { NextRequest, NextResponse } from 'next/server';

/*
  EconoPulse Peak Signals API (real / proxy / unavailable classification)
  Uses only publicly accessible or licensed-by-user (FRED) macro series.
  Proprietary signals (e.g. sell-side indicator, M&A deal z-score) are marked unavailable.
  Some indicators are proxied using alternative open data (consumer confidence via UMCSENT, valuation stress via SP500 + CPI).
*/

type SignalStatus = 'real' | 'proxy' | 'unavailable';

interface RawSignalResult {
  key: string;
  label: string;
  category: 'Sentiment' | 'Valuation' | 'Macro';
  status: SignalStatus;
  triggered: boolean;
  value: number | string | null;
  threshold: string;
  source: string;
  notes?: string;
}

interface Snapshot { date: string; triggeredKeys: string[]; percent: number; spy?: number }

interface ApiResponse {
  generatedAt: string;
  signals: RawSignalResult[];
  current: Snapshot;
  historical: Snapshot[];
  recent: Snapshot[];
  disclaimer: string;
}

const PEAK_DATES = ['2000-03-10','2007-10-09','2018-09-20','2020-02-19','2022-01-03']; // known market peaks (S&P 500)

// ===== Simple in-process cache (persists per serverless warm container) =====
interface CacheEntry { ts:number; data: ApiResponse }
let _cache: CacheEntry | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function fetchFREDSeries(seriesId: string, observationStart?: string) {
  const key = process.env.FRED_API_KEY;
  if (!key) return null;
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: key,
    file_type: 'json'
  });
  if (observationStart) params.set('observation_start', observationStart);
  const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.observations as Array<{ date: string; value: string }>;
  } catch (e) {
    console.error('FRED fetch error', seriesId, e);
    return null;
  }
}

function latestNumeric(observations: Array<{date:string; value:string}> | null): number | null {
  if (!observations || observations.length === 0) return null;
  for (let i = observations.length - 1; i >= 0; i--) {
    const v = parseFloat(observations[i].value);
    if (!isNaN(v)) return v;
  }
  return null;
}

function valueOnOrBefore(observations: Array<{date:string; value:string}> | null, target: string): number | null {
  if (!observations) return null;
  // assume sorted ascending
  for (let i = observations.length - 1; i >= 0; i--) {
    if (observations[i].date <= target) {
      const v = parseFloat(observations[i].value);
      return isNaN(v) ? null : v;
    }
  }
  return null;
}

function percentile(val: number, sample: number[]): number {
  if (!sample.length) return 0;
  const sorted = [...sample].sort((a,b)=>a-b);
  const idx = sorted.findIndex(x => x >= val);
  if (idx === -1) return 100;
  return Math.round((idx / sorted.length) * 100);
}

export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get('refresh') === '1';
    if (!force && _cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
      return NextResponse.json(_cache.data, {
        status: 200,
        headers: {
          'x-cache': 'HIT',
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      });
    }
    // Fetch required series in parallel
    const [umcSent, dgs10, dgs2, cpi, sp500, hySpread, sloos, vix, nfci, icsa, unrate, real10y, sahm] = await Promise.all([
      fetchFREDSeries('UMCSENT','1990-01-01'), // consumer sentiment proxy
      fetchFREDSeries('DGS10','1990-01-01'),
      fetchFREDSeries('DGS2','1990-01-01'),
      fetchFREDSeries('CPIAUCSL','1990-01-01'),
      fetchFREDSeries('SP500','1990-01-01'),
      fetchFREDSeries('BAMLH0A0HYM2','1990-01-01'), // HY OAS
      fetchFREDSeries('DRTSCILM','1990-01-01'), // SLOOS tightening (% net)
      fetchFREDSeries('VIXCLS','1990-01-01'),    // CBOE VIX (daily close)
      fetchFREDSeries('NFCI','1990-01-01'),       // Chicago Fed National Financial Conditions Index
      fetchFREDSeries('ICSA','1990-01-01'),       // Initial jobless claims (weekly)
      fetchFREDSeries('UNRATE','1990-01-01'),     // Unemployment rate (monthly)
      fetchFREDSeries('DFII10','2003-01-01'),     // 10y TIPS real yield (starts 2003)
      fetchFREDSeries('SAHMREALTIME','1959-01-01')// Sahm rule real-time indicator
    ]);

    // Prepare derived metrics
    const latestSent = latestNumeric(umcSent); // index (proxy for >110)
    const latest10y = latestNumeric(dgs10);
    const latest2y = latestNumeric(dgs2);
    const latestHY = latestNumeric(hySpread); // basis points
    const latestSLOOS = latestNumeric(sloos); // percentage

    // Yield curve inversion condition
    let inversionTriggered = false;
    if (dgs10 && dgs2) {
      // last 180 days average spread < 0
      const last180 = dgs10.slice(-180).map((o,i)=>{
        const v10 = parseFloat(o.value); const v2 = parseFloat(dgs2![dgs2!.length-180 + i]?.value || 'NaN');
        return v10 - v2;
      }).filter(v=>!isNaN(v));
      const avg = last180.reduce((a,b)=>a+b,0)/ (last180.length||1);
      inversionTriggered = avg < 0;
    }

    // Credit stress low (HY OAS percentile < 25 over 10y)
    let creditTriggered = false; let creditPercentile = null;
    if (hySpread) {
      const tenYear = hySpread.slice(-365*10).map(o=>parseFloat(o.value)).filter(v=>!isNaN(v));
      if (latestHY!=null) {
        creditPercentile = percentile(latestHY, tenYear);
        creditTriggered = creditPercentile < 25; // low spread = exuberance
      }
    }

    // Tightening credit conditions (SLOOS > 0)
    const tighteningTriggered = latestSLOOS != null ? latestSLOOS > 0 : false;

    // Valuation + CPI proxy: z-score of (Price / CPI index) last 10y > 1
    let valTriggered = false; let valZ: number | null = null;
    if (sp500 && cpi) {
      const pairs: number[] = [];
      const mapCPI: Record<string, number> = {};
      cpi.forEach(o=>{ const v=parseFloat(o.value); if(!isNaN(v)) mapCPI[o.date]=v; });
      sp500.slice(-365*10).forEach(o=>{ const p=parseFloat(o.value); const c = mapCPI[o.date]; if(!isNaN(p)&&!isNaN(c)) pairs.push(p/c); });
      const latestPrice = latestNumeric(sp500); const latestCPI = latestNumeric(cpi);
      if (pairs.length>30 && latestPrice!=null && latestCPI!=null) {
        const ratio = latestPrice/latestCPI;
        const mean = pairs.reduce((a,b)=>a+b,0)/pairs.length;
        const std = Math.sqrt(pairs.reduce((a,b)=>a+(b-mean)**2,0)/pairs.length);
        valZ = std? (ratio-mean)/std : 0;
        valTriggered = valZ > 1;
      }
    }

    // Consumer sentiment proxy > 100 (scale differs from Conference Board; treat >100 as elevated)
    const sentimentConfidenceTriggered = latestSent != null ? latestSent > 100 : false;

    // ───────── New real FRED-based signals ─────────

    // VIX > 25 (elevated fear)
    const latestVIX = latestNumeric(vix);
    const vixTriggered = latestVIX != null ? latestVIX > 25 : false;

    // NFCI loose (negative = excess credit / euphoric financial conditions) → < -0.4
    const latestNFCI = latestNumeric(nfci);
    const nfciLooseTriggered = latestNFCI != null ? latestNFCI < -0.4 : false;

    // Initial jobless claims spike: latest 4-week MA vs 12-month low, > +25%
    let claimsSpikeTriggered = false; let claimsRatio: number | null = null;
    if (icsa && icsa.length >= 60) {
      const vals = icsa.map(o => parseFloat(o.value)).filter(v => !isNaN(v));
      if (vals.length >= 60) {
        const last4 = vals.slice(-4); const last4MA = last4.reduce((a,b)=>a+b,0)/last4.length;
        const last52 = vals.slice(-52);
        const min52 = Math.min(...last52);
        claimsRatio = min52 > 0 ? (last4MA / min52 - 1) * 100 : null;
        claimsSpikeTriggered = claimsRatio != null && claimsRatio > 25;
      }
    }

    // Unemployment at cycle low: current within +0.3 of trailing 36-month min (late-cycle peak signal)
    let unrateCycleLowTriggered = false; let unrateDelta: number | null = null;
    if (unrate && unrate.length >= 36) {
      const vals = unrate.map(o => parseFloat(o.value)).filter(v => !isNaN(v));
      if (vals.length >= 36) {
        const latest = vals[vals.length - 1];
        const min36 = Math.min(...vals.slice(-36));
        unrateDelta = +(latest - min36).toFixed(2);
        unrateCycleLowTriggered = unrateDelta != null && unrateDelta <= 0.3;
      }
    }

    // 10y Real Yield > 2% (restrictive territory)
    const latestReal10y = latestNumeric(real10y);
    const real10yTriggered = latestReal10y != null ? latestReal10y > 2 : false;

    // Sahm Rule recession trigger: SAHMREALTIME > 0.5
    const latestSahm = latestNumeric(sahm);
    const sahmTriggered = latestSahm != null ? latestSahm > 0.5 : false;

    // Compose signals
  const signals: RawSignalResult[] = [
      {
        key:'consumer_confidence', label:'Consumer Sentiment Index > 100', category:'Sentiment', status:'proxy',
        triggered: sentimentConfidenceTriggered, value: latestSent, threshold:'>100 (proxy for Conference Board >110)', source:'FRED: UMCSENT', notes:'Proxy: University of Michigan Sentiment' }
      ,{
        key:'yield_curve_inversion', label:'Inverted Yield Curve (avg 10y-2y < 0, 6m)', category:'Macro', status:'real',
        triggered: inversionTriggered, value: latest10y!=null && latest2y!=null ? +(latest10y-latest2y).toFixed(2): null, threshold:'6m avg spread < 0', source:'FRED: DGS10, DGS2'
      }
      ,{
        key:'credit_stress_low', label:'High Yield OAS in bottom 25% (10y)', category:'Macro', status:'real',
        triggered: creditTriggered, value: creditPercentile, threshold:'Percentile < 25', source:'FRED: BAMLH0A0HYM2', notes:'Lower percentile = tighter spreads'
      }
      ,{
        key:'tightening_credit', label:'Banks Tightening C&I Loan Standards', category:'Macro', status:'real',
        triggered: tighteningTriggered, value: latestSLOOS, threshold:'Net % > 0', source:'FRED: DRTSCILM'
      }
      ,{
        key:'valuation_cpi_z', label:'(Price/CPI) 10y Z-Score > 1', category:'Valuation', status:'proxy',
        triggered: valTriggered, value: valZ!=null? +valZ.toFixed(2): null, threshold:'Z > 1', source:'FRED: SP500, CPIAUCSL'
      }
      ,{
        key:'vix_elevated', label:'VIX Above 25 (Elevated Fear)', category:'Sentiment', status:'real',
        triggered: vixTriggered, value: latestVIX!=null? +latestVIX.toFixed(2): null, threshold:'> 25', source:'FRED: VIXCLS'
      }
      ,{
        key:'nfci_loose', label:'Financial Conditions Very Loose (NFCI)', category:'Macro', status:'real',
        triggered: nfciLooseTriggered, value: latestNFCI!=null? +latestNFCI.toFixed(2): null, threshold:'< -0.4 (loose)', source:'FRED: NFCI', notes:'Chicago Fed Financial Conditions Index'
      }
      ,{
        key:'claims_spike', label:'Initial Jobless Claims Spike (>25% above 12m low)', category:'Macro', status:'real',
        triggered: claimsSpikeTriggered, value: claimsRatio!=null? +claimsRatio.toFixed(1): null, threshold:'4w MA vs 52w min > +25%', source:'FRED: ICSA'
      }
      ,{
        key:'unrate_cycle_low', label:'Unemployment at 36m Cycle Low (late-cycle)', category:'Macro', status:'real',
        triggered: unrateCycleLowTriggered, value: unrateDelta, threshold:'within +0.3 of 36m min', source:'FRED: UNRATE'
      }
      ,{
        key:'real_yield_restrictive', label:'10y Real Yield Above 2% (Restrictive)', category:'Macro', status:'real',
        triggered: real10yTriggered, value: latestReal10y!=null? +latestReal10y.toFixed(2): null, threshold:'> 2.0%', source:'FRED: DFII10'
      }
      ,{
        key:'sahm_rule', label:'Sahm Rule Recession Indicator', category:'Macro', status:'real',
        triggered: sahmTriggered, value: latestSahm!=null? +latestSahm.toFixed(2): null, threshold:'> 0.5', source:'FRED: SAHMREALTIME'
      }
      ,{
        key:'sell_side_indicator', label:'Sell-Side Composite Signal', category:'Sentiment', status:'unavailable',
        triggered: false, value: null, threshold:'Proprietary', source:'Unavailable', notes:'Proprietary index – excluded'
      }
      ,{
        key:'ma_deal_z', label:'M&A Deals 10y Z > 1', category:'Sentiment', status:'unavailable',
        triggered: false, value: null, threshold:'Z > 1', source:'Unavailable', notes:'Requires licensed M&A dataset'
      }
      ,{
        key:'lowpe_vs_highpe', label:'Low P/E underperforms High P/E >2.5ppt (6m)', category:'Valuation', status:'unavailable',
        triggered: false, value: null, threshold:'Diff < -2.5%', source:'Unavailable', notes:'Requires constituent earnings & price history'
      }
    ];

    // Current snapshot
  const eligibleKeys = signals.filter(s=> s.status !== 'unavailable').map(s=> s.key);
  const realKeysTriggered = signals.filter(s=> s.triggered && s.status!=='unavailable').map(s=> s.key);
  const pct = (triggerCount:number, denom:number)=> denom? Math.round(triggerCount/denom*100):0;
  const currentPercent = pct(realKeysTriggered.length, eligibleKeys.length);
  const current: Snapshot = { date: new Date().toISOString().split('T')[0], triggeredKeys: realKeysTriggered, percent: currentPercent };

  // Point-in-time reconstruction helper for the new FRED signals
  function pitNewSignals(dateStr: string): string[] {
    const out: string[] = [];
    // VIX
    const v = valueOnOrBefore(vix, dateStr); if (v != null && v > 25) out.push('vix_elevated');
    // NFCI
    const n = valueOnOrBefore(nfci, dateStr); if (n != null && n < -0.4) out.push('nfci_loose');
    // Claims spike (need 52w window up to date)
    if (icsa) {
      const upto = icsa.filter(o => o.date <= dateStr).map(o => parseFloat(o.value)).filter(x => !isNaN(x));
      if (upto.length >= 52) {
        const last4MA = upto.slice(-4).reduce((a,b)=>a+b,0)/4;
        const min52 = Math.min(...upto.slice(-52));
        if (min52 > 0 && (last4MA/min52 - 1) * 100 > 25) out.push('claims_spike');
      }
    }
    // Unemployment cycle low (36m)
    if (unrate) {
      const upto = unrate.filter(o => o.date <= dateStr).map(o => parseFloat(o.value)).filter(x => !isNaN(x));
      if (upto.length >= 36) {
        const latest = upto[upto.length - 1];
        const min36 = Math.min(...upto.slice(-36));
        if (latest - min36 <= 0.3) out.push('unrate_cycle_low');
      }
    }
    // Real yield (DFII10 starts 2003)
    const ry = valueOnOrBefore(real10y, dateStr); if (ry != null && ry > 2) out.push('real_yield_restrictive');
    // Sahm rule
    const sh = valueOnOrBefore(sahm, dateStr); if (sh != null && sh > 0.5) out.push('sahm_rule');
    return out;
  }

    // Build historical snapshots for provided PEAK_DATES (real + proxy only)
  const historical: Snapshot[] = PEAK_DATES.map(date => {
      // For now: reuse current triggers for unavailable, recompute those we can using valueOnOrBefore
      const triggeredKeys: string[] = [];
      // Consumer sentiment proxy
      const sentVal = valueOnOrBefore(umcSent, date);
      if (sentVal!=null && sentVal > 100) triggeredKeys.push('consumer_confidence');
      // Yield curve
      const tenVal = valueOnOrBefore(dgs10, date); const twoVal = valueOnOrBefore(dgs2, date);
      if (tenVal!=null && twoVal!=null && tenVal - twoVal < 0) triggeredKeys.push('yield_curve_inversion');
      // HY OAS tight
      if (hySpread) {
        const histList = hySpread.filter(o=> o.date <= date).slice(-365*10).map(o=>parseFloat(o.value)).filter(v=>!isNaN(v));
        const val = valueOnOrBefore(hySpread, date);
        if (val!=null && histList.length>30) {
          const perc = percentile(val, histList);
            if (perc < 25) triggeredKeys.push('credit_stress_low');
        }
      }
      // Tightening credit conditions
      const sloosVal = valueOnOrBefore(sloos, date);
      if (sloosVal!=null && sloosVal > 0) triggeredKeys.push('tightening_credit');
      // Valuation proxy
      const priceVal = valueOnOrBefore(sp500, date); const cpiVal = valueOnOrBefore(cpi, date);
      if (priceVal!=null && cpiVal!=null) {
        // Build 10y window ending at date
        const startIdx = sp500?.findIndex(o=>o.date >= date) ?? 0;
        const window = (sp500||[]).slice(Math.max(0,startIdx-365*10), startIdx).map(o=>{ const p=parseFloat(o.value); const cp = valueOnOrBefore(cpi,o.date); return (!isNaN(p)&& cp)? p/(cp as number): NaN; }).filter(v=>!isNaN(v));
        if (window.length>30) {
          const mean = window.reduce((a,b)=>a+b,0)/window.length; const std = Math.sqrt(window.reduce((a,b)=>a+(b-mean)**2,0)/window.length);
          const z = std ? (priceVal/(cpiVal) - mean)/std : 0;
          if (z > 1) triggeredKeys.push('valuation_cpi_z');
        }
      }
      // New FRED-based signals
      triggeredKeys.push(...pitNewSignals(date));
      const percent = pct(triggeredKeys.length, eligibleKeys.length);
      return { date, triggeredKeys, percent };
    });

    // Recent (last 6 month-end snapshots) - recompute point-in-time triggers per month
    const recent: Snapshot[] = [];
    for (let m = 5; m >= 0; m--) {
      const ref = new Date();
      ref.setDate(1);
      ref.setHours(0, 0, 0, 0);
      ref.setMonth(ref.getMonth() - m + 1);
      ref.setDate(0); // last day of previous month
      const dateStr = ref.toISOString().split('T')[0];
      const monthLabel = dateStr.slice(0, 7); // e.g. "2026-01"
      const triggeredKeys: string[] = [];
      // Re-evaluate triggers historically (subset of metrics we can reconstruct)
      const sentVal = valueOnOrBefore(umcSent, dateStr);
      if (sentVal != null && sentVal > 100) triggeredKeys.push('consumer_confidence');
      const tenVal = valueOnOrBefore(dgs10, dateStr);
      const twoVal = valueOnOrBefore(dgs2, dateStr);
      if (tenVal != null && twoVal != null && tenVal - twoVal < 0) triggeredKeys.push('yield_curve_inversion');
      if (hySpread) {
        const histList = hySpread
          .filter((o) => o.date <= dateStr)
          .slice(-365 * 10)
          .map((o) => parseFloat(o.value))
          .filter((v) => !isNaN(v));
        const val = valueOnOrBefore(hySpread, dateStr);
        if (val != null && histList.length > 30) {
          const percVal = percentile(val, histList);
          if (percVal < 25) triggeredKeys.push('credit_stress_low');
        }
      }
      const sloosVal = valueOnOrBefore(sloos, dateStr);
      if (sloosVal != null && sloosVal > 0) triggeredKeys.push('tightening_credit');
      const priceVal = valueOnOrBefore(sp500, dateStr);
      const cpiVal = valueOnOrBefore(cpi, dateStr);
      if (priceVal != null && cpiVal != null) {
        const startIdx = sp500?.findIndex((o) => o.date >= dateStr) ?? 0;
        const window = (sp500 || [])
          .slice(Math.max(0, startIdx - 365 * 10), startIdx)
          .map((o) => {
            const p = parseFloat(o.value);
            const cp = valueOnOrBefore(cpi, o.date);
            return !isNaN(p) && cp ? p / (cp as number) : NaN;
          })
          .filter((v) => !isNaN(v));
        if (window.length > 30) {
          const mean = window.reduce((a, b) => a + b, 0) / window.length;
          const std = Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length);
          const z = std ? (priceVal / cpiVal - mean) / std : 0;
          if (z > 1) triggeredKeys.push('valuation_cpi_z');
        }
      }
      // New FRED-based signals
      triggeredKeys.push(...pitNewSignals(dateStr));
      recent.push({ date: monthLabel, triggeredKeys, percent: pct(triggeredKeys.length, eligibleKeys.length) });
    }

  const response: ApiResponse = {
      generatedAt: new Date().toISOString(),
      signals,
      current,
      historical,
      recent,
      disclaimer: 'Signals classified as real/proxy/unavailable. Proxy signals use open substitutes; unavailable require proprietary data. Informational only.'
    };
  _cache = { ts: Date.now(), data: response };
  return NextResponse.json(response, {
    status: 200,
    headers: {
      'x-cache': 'MISS',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  });
  } catch (e) {
    console.error('Peak signals error', e);
    return NextResponse.json({ error: 'Failed to compute peak signals' }, { status: 500 });
  }
}
