import { NextResponse } from 'next/server';

/**
 * Dynamic country macro data using public World Bank indicators + optional FRED (US policy rate).
 * Indicators (World Bank):
 *  - GDP current US$ (NY.GDP.MKTP.CD)
 *  - GDP growth % (NY.GDP.MKTP.KD.ZG)
 *  - Inflation CPI YoY % (FP.CPI.TOTL.ZG)
 *  - Unemployment % (SL.UEM.TOTL.ZS)
 * Policy rate (US only) via FRED FEDFUNDS if FRED_API_KEY provided; others fallback to static reference list.
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
  { code:'US', name:'United States', currency:'USD', creditRating:'AAA' },
  { code:'CN', name:'China', currency:'CNY', creditRating:'A+' },
  { code:'DE', name:'Germany', currency:'EUR', creditRating:'AAA' },
  { code:'JP', name:'Japan', currency:'JPY', creditRating:'A+' },
  { code:'IN', name:'India', currency:'INR', creditRating:'BBB-' },
  { code:'GB', name:'United Kingdom', currency:'GBP', creditRating:'AA' },
  { code:'FR', name:'France', currency:'EUR', creditRating:'AA' },
  { code:'CA', name:'Canada', currency:'CAD', creditRating:'AAA' },
  { code:'IT', name:'Italy', currency:'EUR', creditRating:'BBB' },
  { code:'AU', name:'Australia', currency:'AUD', creditRating:'AAA' }
];

// Simple in-memory cache (server runtime) to avoid hammering public APIs
let cache: { timestamp:number; data:CountryIndicators[] } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1h

async function fetchWorldBankIndicator(countryCode:string, indicator:string) {
  const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicator}?format=json&per_page=10`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if(!res.ok) throw new Error(`WorldBank ${countryCode} ${indicator}`);
  const json:any = await res.json();
  const rows = Array.isArray(json) ? json[1] : [];
  if(!rows) throw new Error('Invalid WorldBank response');
  const valid = rows.find((r:any)=> r && r.value !== null);
  if(!valid) throw new Error('No recent value');
  return { value: Number(valid.value), date: valid.date };
}

async function fetchUsdFxRate(currency:string):Promise<number> {
  if(currency==='USD') return 1;
  // Use exchangerate.host (ECB) free API
  try {
    const res = await fetch(`https://api.exchangerate.host/latest?base=USD&symbols=${currency}`);
    if(!res.ok) return NaN;
    const j = await res.json();
    return j.rates?.[currency] || NaN;
  } catch { return NaN; }
}

async function fetchFredPolicyRate():Promise<{ value:number; date:string } | null> {
  const key = process.env.FRED_API_KEY;
  if(!key) return null;
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&api_key=${key}&file_type=json&observation_start=2024-01-01`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('FRED');
    const j:any = await res.json();
    const obs = j.observations?.filter((o:any)=> o.value !== '.' );
    const last = obs?.[obs.length-1];
    if(!last) return null;
    return { value: Number(last.value), date: last.date };
  } catch { return null; }
}

export async function GET(request:Request) {
  try {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';
  if(!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
      const totalGdp = cache.data.reduce((s,c)=> s + c.gdp.value, 0); // already trillions
      const avgGrowth = cache.data.reduce((s,c)=> s + c.gdp.growth, 0) / cache.data.length;
      const avgInfl = cache.data.reduce((s,c)=> s + c.inflation.value, 0) / cache.data.length;
      const avgUnemp = cache.data.reduce((s,c)=> s + c.unemployment.value, 0) / cache.data.length;
      return NextResponse.json({ success:true, data: { countries: cache.data.sort((a,b)=> b.gdp.value - a.gdp.value), global:{ totalGdp, averageGrowth: avgGrowth, averageInflation: avgInfl, averageUnemployment: avgUnemp, totalCountries: cache.data.length }, lastUpdated: new Date(cache.timestamp).toISOString() }, realtime:true, cached:true });
    }

    // Fetch FRED policy rate for US if available
    const fredPolicy = await fetchFredPolicyRate();

    const indicatorsPromises = COUNTRIES.map(async cfg => {
      try {
        const [gdpCurrent, gdpGrowth, inflation, unemployment, population, marketCap, lendingRate] = await Promise.all([
          fetchWorldBankIndicator(cfg.code, 'NY.GDP.MKTP.CD'),       // GDP current USD
          fetchWorldBankIndicator(cfg.code, 'NY.GDP.MKTP.KD.ZG'),    // GDP growth %
          fetchWorldBankIndicator(cfg.code, 'FP.CPI.TOTL.ZG'),       // Inflation CPI %
          fetchWorldBankIndicator(cfg.code, 'SL.UEM.TOTL.ZS'),       // Unemployment %
          fetchWorldBankIndicator(cfg.code, 'SP.POP.TOTL'),          // Population
          fetchWorldBankIndicator(cfg.code, 'CM.MKT.LCAP.CD').catch(()=> ({ value:0, date:'' })), // Market cap (may be 0)
          fetchWorldBankIndicator(cfg.code, 'FR.INR.LEND').catch(()=> ({ value: NaN, date: new Date().getFullYear().toString() })) // Lending interest rate proxy (if unavailable -> NaN)
        ]);

        // GDP current is absolute (USD). Convert to trillions for UI consistency (value property expects T as in previous UI)
        const gdpValueTrn = gdpCurrent.value / 1e12;
        const fx = await fetchUsdFxRate(cfg.currency);
  const policyRateValue = cfg.code==='US' && fredPolicy ? fredPolicy.value : (typeof lendingRate.value === 'number' ? lendingRate.value : NaN);
  const policyDate = cfg.code==='US' && fredPolicy ? fredPolicy.date : lendingRate.date || new Date().toISOString().slice(0,10);
  const interestRate = { value: policyRateValue, date: policyDate, source: (cfg.code==='US' && fredPolicy)? 'FRED' : (typeof lendingRate.value === 'number' ? 'WorldBank:LendRate':'N/A') };

        const indicator:CountryIndicators = {
          country: cfg.name,
            countryCode: cfg.code,
            gdp: { value: gdpValueTrn, growth: gdpGrowth.value, date: gdpGrowth.date },
            inflation: { value: inflation.value, date: inflation.date },
            unemployment: { value: unemployment.value, date: unemployment.date },
            interestRate,
            currency: { code: cfg.currency, usdRate: fx },
            marketCap: { value: marketCap.value, date: marketCap.date, source: marketCap.value? 'WorldBank:CM.MKT.LCAP.CD':'N/A' },
            population: { value: population.value, date: population.date },
            creditRating: cfg.creditRating,
            realtime: true
        };
        return indicator;
      } catch (e) {
        console.error('Country fetch failed', cfg.code, e);
        // Minimal fallback retains previous style but marks realtime false
        return {
          country: cfg.name,
          countryCode: cfg.code,
          gdp: { value: 0, growth: 0, date: '' },
          inflation: { value: 0, date: '' },
          unemployment: { value: 0, date: '' },
          interestRate: { value: NaN, date: new Date().toISOString().slice(0,10), source:'N/A' },
          currency: { code: cfg.currency, usdRate: NaN },
          marketCap: { value: 0, date: '', source:'N/A' },
          population: { value: 0, date: '' },
          creditRating: cfg.creditRating,
          realtime: false,
          diagnostics:{ missing:['all'] }
        } as CountryIndicators;
      }
    });

    const countries = await Promise.all(indicatorsPromises);

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

  const totalGdp = countries.reduce((s,c)=> s + c.gdp.value, 0);
    const averageGrowth = countries.reduce((s,c)=> s + c.gdp.growth, 0) / countries.length;
    const averageInflation = countries.reduce((s,c)=> s + c.inflation.value, 0) / countries.length;
    const averageUnemployment = countries.reduce((s,c)=> s + c.unemployment.value, 0) / countries.length;

    const validationSummary = {
      countriesTotal: countries.length,
      countriesAllRealtime: countries.filter(c=> c.realtime).length,
      countriesWithMissing: countries.filter(c=> c.diagnostics && c.diagnostics.missing.length>0).length,
      indicatorsMissingBreakdown: countries.reduce((acc:Record<string,number>,c)=> { (c.diagnostics?.missing||[]).forEach(m=> { acc[m]=(acc[m]||0)+1; }); return acc; }, {})
    };

    return NextResponse.json({
      success:true,
      data:{
        countries: countries.sort((a,b)=> b.gdp.value - a.gdp.value),
        global:{
          totalGdp: totalGdp, // already in trillions
          averageGrowth,
          averageInflation,
          averageUnemployment,
          totalCountries: countries.length
        },
        lastUpdated: new Date().toISOString()
      },
      realtime:true,
      validation: validationSummary,
      sources:[ 'World Bank API', 'FRED (US policy rate where available)' ]
    });
  } catch (error) {
    console.error('Error fetching dynamic country data', error);
    return NextResponse.json({ success:false, error:'Failed to fetch country economic data (dynamic)', timestamp:new Date().toISOString() }, { status: 500 });
  }
}
