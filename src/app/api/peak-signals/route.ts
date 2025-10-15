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
      return NextResponse.json(_cache.data, { status:200, headers:{'x-cache':'HIT'} });
    }
    // Fetch required series in parallel
    const [umcSent, dgs10, dgs2, cpi, sp500, hySpread, sloos] = await Promise.all([
      fetchFREDSeries('UMCSENT','1990-01-01'), // consumer sentiment proxy
      fetchFREDSeries('DGS10','1990-01-01'),
      fetchFREDSeries('DGS2','1990-01-01'),
      fetchFREDSeries('CPIAUCSL','1990-01-01'),
      fetchFREDSeries('SP500','1990-01-01'),
      fetchFREDSeries('BAMLH0A0HYM2','1990-01-01'), // HY OAS
      fetchFREDSeries('DRTSCILM','1990-01-01') // SLOOS tightening (% net)
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
      const percent = pct(triggeredKeys.length, eligibleKeys.length);
      return { date, triggeredKeys, percent };
    });

    // Recent (last 6 month-end snapshots) - recompute point-in-time triggers per month end
    const recent: Snapshot[] = [];
    for (let m=5; m>=0; m--) {
      const ref = new Date(); ref.setDate(1); ref.setHours(0,0,0,0); ref.setMonth(ref.getMonth()-m+1); ref.setDate(0); // last day previous month offset
      const dateStr = ref.toISOString().split('T')[0];
      const triggeredKeys: string[] = [];
      // Re-evaluate triggers historically (subset of metrics we can reconstruct)
      const sentVal = valueOnOrBefore(umcSent, dateStr); if (sentVal!=null && sentVal > 100) triggeredKeys.push('consumer_confidence');
      const tenVal = valueOnOrBefore(dgs10, dateStr); const twoVal = valueOnOrBefore(dgs2, dateStr); if (tenVal!=null && twoVal!=null && tenVal - twoVal < 0) triggeredKeys.push('yield_curve_inversion');
      if (hySpread) { const histList = hySpread.filter(o=> o.date <= dateStr).slice(-365*10).map(o=>parseFloat(o.value)).filter(v=>!isNaN(v)); const val = valueOnOrBefore(hySpread, dateStr); if (val!=null && histList.length>30) { const percVal = percentile(val, histList); if (percVal < 25) triggeredKeys.push('credit_stress_low'); } }
      const sloosVal = valueOnOrBefore(sloos, dateStr); if (sloosVal!=null && sloosVal > 0) triggeredKeys.push('tightening_credit');
      const priceVal = valueOnOrBefore(sp500, dateStr); const cpiVal = valueOnOrBefore(cpi, dateStr); if (priceVal!=null && cpiVal!=null) { const startIdx = sp500?.findIndex(o=>o.date >= dateStr) ?? 0; const window = (sp500||[]).slice(Math.max(0,startIdx-365*10), startIdx).map(o=>{ const p=parseFloat(o.value); const cp = valueOnOrBefore(cpi,o.date); return (!isNaN(p)&&cp)? p/(cp as number): NaN; }).filter(v=>!isNaN(v)); if (window.length>30) { const mean = window.reduce((a,b)=>a+b,0)/window.length; const std = Math.sqrt(window.reduce((a,b)=>a+(b-mean)**2,0)/window.length); const z = std? (priceVal/(cpiVal) - mean)/std:0; if (z>1) triggeredKeys.push('valuation_cpi_z'); } }
      recent.push({ date: dateStr.slice(0,7), triggeredKeys, percent: pct(triggeredKeys.length, eligibleKeys.length) });
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
  return NextResponse.json(response, { status: 200, headers:{'x-cache':'MISS'} });
  } catch (e) {
    console.error('Peak signals error', e);
    return NextResponse.json({ error: 'Failed to compute peak signals' }, { status: 500 });
  }
}
