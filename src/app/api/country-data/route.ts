import { NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

/**
 * Dynamic country macro data — World Bank (batched, most-recent non-null value per country)
 * with FRED overrides for monthly CPI YoY, harmonised unemployment and central-bank policy
 * rates where available. All sources self-update when agencies publish.
 */

interface CountryMacroConfig { code:string; name:string; currency:string; creditRating:string; fallbackPolicyRate?:number }
interface CountryIndicators {
  country:string; countryCode:string;
  gdp:{ value:number; growth:number; date:string };
  inflation:{ value:number; date:string };
  unemployment:{ value:number; date:string };
  interestRate:{ value:number; date:string; source:string };
  currency:{ code:string; usdRate:number };
  marketCap:{ value:number; date:string; source:string };
  population:{ value:number; date:string };
  creditRating:string;
  realtime:boolean;
  diagnostics?:{ missing:string[] };
}

const COUNTRIES:CountryMacroConfig[] = [
  { code:'US', name:'United States', currency:'USD', creditRating:'AA+' },
  { code:'CN', name:'China', currency:'CNY', creditRating:'A+' },
  { code:'DE', name:'Germany', currency:'EUR', creditRating:'AAA' },
  { code:'JP', name:'Japan', currency:'JPY', creditRating:'A+' },
  { code:'IN', name:'India', currency:'INR', creditRating:'BBB-' },
  { code:'GB', name:'United Kingdom', currency:'GBP', creditRating:'AA' },
  { code:'FR', name:'France', currency:'EUR', creditRating:'AA-' },
  { code:'CA', name:'Canada', currency:'CAD', creditRating:'AAA' },
  { code:'IT', name:'Italy', currency:'EUR', creditRating:'BBB' },
  { code:'BR', name:'Brazil', currency:'BRL', creditRating:'BB' },
  { code:'RU', name:'Russia', currency:'RUB', creditRating:'NR' },
  { code:'KR', name:'South Korea', currency:'KRW', creditRating:'AA', fallbackPolicyRate:2.50 },
  { code:'AU', name:'Australia', currency:'AUD', creditRating:'AAA' },
  { code:'MX', name:'Mexico', currency:'MXN', creditRating:'BBB' },
  { code:'ES', name:'Spain', currency:'EUR', creditRating:'A' },
  { code:'ID', name:'Indonesia', currency:'IDR', creditRating:'BBB' },
  { code:'NL', name:'Netherlands', currency:'EUR', creditRating:'AAA' },
  { code:'SA', name:'Saudi Arabia', currency:'SAR', creditRating:'A+', fallbackPolicyRate:5.00 },
  { code:'TR', name:'Turkey', currency:'TRY', creditRating:'BB-' },
  { code:'CH', name:'Switzerland', currency:'CHF', creditRating:'AAA' },
  { code:'PL', name:'Poland', currency:'PLN', creditRating:'A-' },
  { code:'AR', name:'Argentina', currency:'ARS', creditRating:'CCC' },
  { code:'BE', name:'Belgium', currency:'EUR', creditRating:'AA' },
  { code:'SE', name:'Sweden', currency:'SEK', creditRating:'AAA', fallbackPolicyRate:2.00 },
  { code:'IE', name:'Ireland', currency:'EUR', creditRating:'AA' },
  { code:'AT', name:'Austria', currency:'EUR', creditRating:'AA+' },
  { code:'NO', name:'Norway', currency:'NOK', creditRating:'AAA', fallbackPolicyRate:4.00 },
  { code:'IL', name:'Israel', currency:'ILS', creditRating:'A+' },
  { code:'TH', name:'Thailand', currency:'THB', creditRating:'BBB+' },
  { code:'AE', name:'United Arab Emirates', currency:'AED', creditRating:'AA', fallbackPolicyRate:4.40 },
  { code:'SG', name:'Singapore', currency:'SGD', creditRating:'AAA', fallbackPolicyRate:2.30 },
  { code:'MY', name:'Malaysia', currency:'MYR', creditRating:'A-' },
  { code:'VN', name:'Vietnam', currency:'VND', creditRating:'BB+' },
  { code:'PH', name:'Philippines', currency:'PHP', creditRating:'BBB+' },
  { code:'DK', name:'Denmark', currency:'DKK', creditRating:'AAA', fallbackPolicyRate:1.60 },
  { code:'HK', name:'Hong Kong', currency:'HKD', creditRating:'AA+', fallbackPolicyRate:4.75 },
  { code:'FI', name:'Finland', currency:'EUR', creditRating:'AA+' },
  { code:'PT', name:'Portugal', currency:'EUR', creditRating:'A-' },
  { code:'GR', name:'Greece', currency:'EUR', creditRating:'BBB-' },
  { code:'NZ', name:'New Zealand', currency:'NZD', creditRating:'AA+', fallbackPolicyRate:2.25 },
  { code:'CL', name:'Chile', currency:'CLP', creditRating:'A' },
  { code:'CO', name:'Colombia', currency:'COP', creditRating:'BB+' },
  { code:'ZA', name:'South Africa', currency:'ZAR', creditRating:'BB-' },
  { code:'EG', name:'Egypt', currency:'EGP', creditRating:'B-' },
  { code:'CZ', name:'Czech Republic', currency:'CZK', creditRating:'AA-' },
  { code:'RO', name:'Romania', currency:'RON', creditRating:'BBB-' },
  { code:'HU', name:'Hungary', currency:'HUF', creditRating:'BBB-' }
];

// Euro-area members use the ECB deposit facility rate.
const EURO_AREA = new Set(['DE','FR','IT','ES','NL','BE','IE','AT','FI','PT','GR']);
// Central-bank policy/overnight rate series on FRED.
const POLICY_SERIES: Record<string,string> = {
  US:'FEDFUNDS', GB:'IUDSOIA', JP:'IRSTCI01JPM156N', CA:'IRSTCI01CAM156N', AU:'IRSTCI01AUM156N', CH:'IR3TIB01CHM156N',
};
// Monthly CPI YoY overrides (fresher than World Bank annual).
const CPI_SERIES: Record<string,string> = {
  US:'CPIAUCSL', DE:'CP0000DEM086NEST', IT:'CP0000ITM086NEST', FR:'CP0000FRM086NEST', ES:'CP0000ESM086NEST',
};
// Monthly harmonised unemployment overrides.
const UNEMP_SERIES: Record<string,string> = {
  US:'UNRATE', DE:'LRHUTTTTDEM156S', IT:'LRHUTTTTITM156S', FR:'LRHUTTTTFRM156S',
  GB:'LRHUTTTTGBM156S', JP:'LRHUTTTTJPM156S', CA:'LRUNTTTTCAM156S', AU:'LRHUTTTTAUM156S',
};

// Simple in-memory cache (server runtime) to avoid hammering public APIs
let cache: { timestamp:number; data:CountryIndicators[] } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1h

// Batched World Bank fetch: one request per indicator for all countries (mrnev=1 → most recent non-null).
async function fetchWbAll(indicator:string, codes:string[]):Promise<Map<string,{value:number;date:string}>> {
  const out = new Map<string,{value:number;date:string}>();
  try {
    const url = `https://api.worldbank.org/v2/country/${codes.join(';')}/indicator/${indicator}?format=json&mrnev=1&per_page=200`;
    const res = await fetch(url, { next:{ revalidate: 3600 }, signal: AbortSignal.timeout(15000) });
    if(!res.ok) return out;
    const json:any = await res.json();
    const rows = Array.isArray(json) ? json[1] : [];
    for (const r of rows || []) {
      const id = r?.country?.id;
      const v = Number(r?.value);
      if (id && Number.isFinite(v)) out.set(String(id).toUpperCase(), { value: v, date: String(r.date || '') });
    }
  } catch (e) { console.warn('WB batch fetch failed', indicator, e); }
  return out;
}

// Latest valid observation of a FRED series (optionally YoY % via units=pc1).
async function fredLatest(seriesId:string, units?:'pc1'):Promise<{ value:number; date:string } | null> {
  const key = process.env.FRED_API_KEY;
  if(!key) return null;
  try {
    const qp = new URLSearchParams({ series_id: seriesId, api_key: key, file_type: 'json', sort_order: 'desc', limit: '3' });
    if (units) qp.set('units', units);
    const res = await fetch(`https://api.stlouisfed.org/fred/series/observations?${qp}`, { next:{ revalidate: 3600 }, signal: AbortSignal.timeout(9000) });
    if(!res.ok) return null;
    const j:any = await res.json();
    const ob = (j.observations || []).find((o:any)=> o.value !== '.');
    if(!ob) return null;
    const v = Number(ob.value);
    return Number.isFinite(v) ? { value: v, date: ob.date } : null;
  } catch { return null; }
}

// All USD FX rates in one keyless call.
async function fetchFxRates():Promise<Record<string,number>> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { next:{ revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
    if(!res.ok) return {};
    const j:any = await res.json();
    return j?.rates && typeof j.rates === 'object' ? j.rates : {};
  } catch { return {}; }
}

// NaN-safe aggregates for the header cards.
function buildGlobalStats(rows: CountryIndicators[]) {
  const avg = (vals:number[]) => { const f = vals.filter(Number.isFinite); return f.length ? f.reduce((s,v)=> s+v, 0) / f.length : NaN; };
  return {
    totalGdp: rows.reduce((s,c)=> s + (Number.isFinite(c.gdp.value) ? c.gdp.value : 0), 0),
    averageGrowth: avg(rows.map(c=> c.gdp.growth)),
    averageInflation: avg(rows.map(c=> c.inflation.value)),
    averageUnemployment: avg(rows.map(c=> c.unemployment.value)),
    totalCountries: rows.length,
  };
}

export async function GET(request:Request) {
  try {
  const ip = getClientIp(request);
  const rl = rateLimit(`country:${ip}`, 60, 60_000);
  if (!rl.ok) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimitHeaders(rl) });
    }
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';
  if(!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
      const g = buildGlobalStats(cache.data);
      return NextResponse.json({ success:true, data: { countries: cache.data.sort((a,b)=> b.gdp.value - a.gdp.value), global: g, lastUpdated: new Date(cache.timestamp).toISOString() }, realtime:true, cached:true }, { headers: rateLimitHeaders(rl) });
    }

    // Fetch everything in parallel: batched World Bank indicators, FRED overrides, FX table.
    const codes = COUNTRIES.map(c => c.code);
    const fredKeys = Object.keys(POLICY_SERIES) as (keyof typeof POLICY_SERIES)[];
    const cpiKeys = Object.keys(CPI_SERIES);
    const unempKeys = Object.keys(UNEMP_SERIES);
    const [gdpMap, growthMap, inflMap, unempMap, popMap, mcapMap, lendMap, fx, ecbRate, ...fredResults] = await Promise.all([
      fetchWbAll('NY.GDP.MKTP.CD', codes),       // GDP current USD
      fetchWbAll('NY.GDP.MKTP.KD.ZG', codes),    // GDP growth %
      fetchWbAll('FP.CPI.TOTL.ZG', codes),       // Inflation CPI % (annual)
      fetchWbAll('SL.UEM.TOTL.ZS', codes),       // Unemployment % (annual)
      fetchWbAll('SP.POP.TOTL', codes),          // Population
      fetchWbAll('CM.MKT.LCAP.CD', codes),       // Market cap (sparse)
      fetchWbAll('FR.INR.LEND', codes),          // Lending rate proxy
      fetchFxRates(),
      fredLatest('ECBDFR'),
      ...fredKeys.map(c => fredLatest(POLICY_SERIES[c])),
      ...cpiKeys.map(c => fredLatest(CPI_SERIES[c], 'pc1')),
      ...unempKeys.map(c => fredLatest(UNEMP_SERIES[c])),
    ]);
    const policyByCountry = new Map<string,{value:number;date:string}>();
    fredKeys.forEach((c, i) => { const v = fredResults[i]; if (v) policyByCountry.set(c, v); });
    const cpiByCountry = new Map<string,{value:number;date:string}>();
    cpiKeys.forEach((c, i) => { const v = fredResults[fredKeys.length + i]; if (v) cpiByCountry.set(c, v); });
    const unempByCountry = new Map<string,{value:number;date:string}>();
    unempKeys.forEach((c, i) => { const v = fredResults[fredKeys.length + cpiKeys.length + i]; if (v) unempByCountry.set(c, v); });

    const countries: CountryIndicators[] = COUNTRIES.map(cfg => {
      const gdp = gdpMap.get(cfg.code);
      const growth = growthMap.get(cfg.code);
      const inflWb = inflMap.get(cfg.code);
      const unempWb = unempMap.get(cfg.code);
      const pop = popMap.get(cfg.code);
      const mcap = mcapMap.get(cfg.code);

      // Inflation / unemployment: prefer monthly FRED series, else World Bank annual.
      const infl = cpiByCountry.get(cfg.code) || inflWb;
      const unemp = unempByCountry.get(cfg.code) || unempWb;

      // Policy rate cascade: FRED country series → ECB (euro area) → WB lending rate → static reference.
      let interestRate: CountryIndicators['interestRate'];
      const fredRate = policyByCountry.get(cfg.code);
      const lend = lendMap.get(cfg.code);
      if (fredRate) interestRate = { value: fredRate.value, date: fredRate.date, source: 'FRED' };
      else if (EURO_AREA.has(cfg.code) && ecbRate) interestRate = { value: ecbRate.value, date: ecbRate.date, source: 'ECB (FRED)' };
      else if (lend && Number.isFinite(lend.value)) interestRate = { value: lend.value, date: lend.date, source: 'WorldBank:LendRate' };
      else if (cfg.fallbackPolicyRate != null) interestRate = { value: cfg.fallbackPolicyRate, date: new Date().toISOString().slice(0,10), source: 'Reference' };
      else interestRate = { value: NaN, date: '', source: 'N/A' };

      const realtime = !!(gdp && growth && infl && unemp && pop);
      const row: CountryIndicators = {
        country: cfg.name,
        countryCode: cfg.code,
        gdp: { value: gdp ? gdp.value / 1e12 : 0, growth: growth ? growth.value : NaN, date: growth?.date || gdp?.date || '' },
        inflation: { value: infl ? infl.value : NaN, date: infl?.date || '' },
        unemployment: { value: unemp ? unemp.value : NaN, date: unemp?.date || '' },
        interestRate,
        currency: { code: cfg.currency, usdRate: cfg.currency === 'USD' ? 1 : (Number(fx[cfg.currency]) || NaN) },
        marketCap: { value: mcap?.value || 0, date: mcap?.date || '', source: mcap?.value ? 'WorldBank:CM.MKT.LCAP.CD' : 'N/A' },
        population: { value: pop ? pop.value : 0, date: pop?.date || '' },
        creditRating: cfg.creditRating,
        realtime,
      };
      return row;
    })
    // Drop countries with no usable core data instead of showing zero rows.
    .filter(c => c.gdp.value > 0);


    // Validation diagnostics
    countries.forEach(c => {
      const missing:string[] = [];
      if(!(c.gdp.value>0) || !c.gdp.date) missing.push('gdp');
      if(isNaN(c.gdp.growth)) missing.push('growth');
      if(!(c.inflation.value!==undefined && c.inflation.value!==null) || !c.inflation.date) missing.push('inflation');
      if(!(c.unemployment.value!==undefined && c.unemployment.value!==null) || !c.unemployment.date) missing.push('unemployment');
      if(!(c.interestRate.value!==undefined && c.interestRate.value!==null) || !c.interestRate.date) missing.push('rate');
      if(!c.population.value) missing.push('population');
      if(missing.length>0) {
        c.diagnostics = { missing };
      }
    });
    cache = { timestamp: Date.now(), data: countries };

    const globalStats = buildGlobalStats(countries);

    const validationSummary = {
      countriesTotal: countries.length,
      countriesAllRealtime: countries.filter(c=> c.realtime).length,
      countriesWithMissing: countries.filter(c=> c.diagnostics && c.diagnostics.missing.length>0).length,
      indicatorsMissingBreakdown: countries.reduce((acc:Record<string,number>,c)=> { (c.diagnostics?.missing||[]).forEach(m=> { acc[m]=(acc[m]||0)+1; }); return acc; }, {})
    };

    const res = NextResponse.json({
      success:true,
      data:{
        countries: countries.sort((a,b)=> b.gdp.value - a.gdp.value),
        global: globalStats,
        lastUpdated: new Date().toISOString()
      },
      realtime:true,
      validation: validationSummary,
      sources:[ 'World Bank API', 'FRED (monthly CPI, unemployment, policy rates)' ]
    }, { headers: rateLimitHeaders(rl) });
    return res;
  } catch (error) {
    console.error('Error fetching dynamic country data', error);
    return NextResponse.json({ success:false, error:'Failed to fetch country economic data (dynamic)', timestamp:new Date().toISOString() }, { status: 500 });
  }
}
