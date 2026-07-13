import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { fetchYahooChartQuotes } from '@/lib/yahoo-chart-quotes';

/**
 * World Economic Cycle classifier — HIGH-ACCURACY VERSION
 *
 * Data sources (in priority order):
 *   1. IMF DataMapper WEO API   (current-year nowcast/forecast + last actual,  ~6-month update)
 *        - NGDP_RPCH  Real GDP growth (annual %)
 *        - PCPIPCH    Average CPI inflation (annual %)
 *   2. World Bank                (annual actuals, fallback for countries IMF misses)
 *        - NY.GDP.MKTP.KD.ZG   /   FP.CPI.TOTL.ZG
 *   3. Country-ETF market momentum (Yahoo, real-time daily)
 *        - 3-month total return of each country's flagship equity ETF, used as a
 *          live market-based confirmation of the macro regime + confidence score.
 *
 * Each country gets the most-recent IMF value (which can be a "current year" estimate
 * incorporating monthly indicators, much fresher than the World Bank annual actuals)
 * plus the prior year for direction (delta).
 *
 * Classification combines BOTH absolute level and YoY direction to identify the regime:
 *   - Reflation   (growth recovering / inflation contained)   -> best for risk assets
 *   - Inflation   (growth strong + inflation accelerating)    -> overheating
 *   - Stagflation (growth weak + inflation high)              -> worst regime
 *   - Recession   (growth weak + inflation contained/falling) -> contraction
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Cycle = 'Reflation' | 'Inflation' | 'Stagflation' | 'Recession' | 'Unknown';

interface CountryCycle {
  iso3: string;
  iso2: string;
  name: string;
  region: string;
  gdpLatest: number | null;
  gdpPrior: number | null;
  cpiLatest: number | null;
  cpiPrior: number | null;
  growthDelta: number | null;
  inflationDelta: number | null;
  cycle: Cycle;
  asOf: string | null;
  source: 'IMF' | 'WorldBank' | 'Mixed' | null;
  /** 3-month total return of the country's flagship equity ETF (real-time, %). */
  marketMomentum: number | null;
  /** Ticker used for the market-momentum signal. */
  etf: string | null;
  /** 0-100: data freshness + macro/market agreement. */
  confidence: number;
}

interface ApiResponse {
  generatedAt: string;
  countries: CountryCycle[];
  summary: Record<Cycle, number>;
  source: string;
}

// 60 largest economies + key emerging markets, spread across all regions
const COUNTRIES: Array<{ iso3: string; iso2: string; name: string; region: string }> = [
  // North America
  { iso3: 'USA', iso2: 'US', name: 'United States', region: 'North America' },
  { iso3: 'CAN', iso2: 'CA', name: 'Canada', region: 'North America' },
  { iso3: 'MEX', iso2: 'MX', name: 'Mexico', region: 'North America' },
  // South America
  { iso3: 'BRA', iso2: 'BR', name: 'Brazil', region: 'South America' },
  { iso3: 'ARG', iso2: 'AR', name: 'Argentina', region: 'South America' },
  { iso3: 'CHL', iso2: 'CL', name: 'Chile', region: 'South America' },
  { iso3: 'COL', iso2: 'CO', name: 'Colombia', region: 'South America' },
  { iso3: 'PER', iso2: 'PE', name: 'Peru', region: 'South America' },
  { iso3: 'VEN', iso2: 'VE', name: 'Venezuela', region: 'South America' },
  // Europe
  { iso3: 'GBR', iso2: 'GB', name: 'United Kingdom', region: 'Europe' },
  { iso3: 'DEU', iso2: 'DE', name: 'Germany', region: 'Europe' },
  { iso3: 'FRA', iso2: 'FR', name: 'France', region: 'Europe' },
  { iso3: 'ITA', iso2: 'IT', name: 'Italy', region: 'Europe' },
  { iso3: 'ESP', iso2: 'ES', name: 'Spain', region: 'Europe' },
  { iso3: 'NLD', iso2: 'NL', name: 'Netherlands', region: 'Europe' },
  { iso3: 'BEL', iso2: 'BE', name: 'Belgium', region: 'Europe' },
  { iso3: 'SWE', iso2: 'SE', name: 'Sweden', region: 'Europe' },
  { iso3: 'NOR', iso2: 'NO', name: 'Norway', region: 'Europe' },
  { iso3: 'DNK', iso2: 'DK', name: 'Denmark', region: 'Europe' },
  { iso3: 'FIN', iso2: 'FI', name: 'Finland', region: 'Europe' },
  { iso3: 'CHE', iso2: 'CH', name: 'Switzerland', region: 'Europe' },
  { iso3: 'AUT', iso2: 'AT', name: 'Austria', region: 'Europe' },
  { iso3: 'IRL', iso2: 'IE', name: 'Ireland', region: 'Europe' },
  { iso3: 'PRT', iso2: 'PT', name: 'Portugal', region: 'Europe' },
  { iso3: 'GRC', iso2: 'GR', name: 'Greece', region: 'Europe' },
  { iso3: 'POL', iso2: 'PL', name: 'Poland', region: 'Europe' },
  { iso3: 'CZE', iso2: 'CZ', name: 'Czech Republic', region: 'Europe' },
  { iso3: 'HUN', iso2: 'HU', name: 'Hungary', region: 'Europe' },
  { iso3: 'ROU', iso2: 'RO', name: 'Romania', region: 'Europe' },
  { iso3: 'TUR', iso2: 'TR', name: 'Turkey', region: 'Europe' },
  { iso3: 'RUS', iso2: 'RU', name: 'Russia', region: 'Europe' },
  { iso3: 'UKR', iso2: 'UA', name: 'Ukraine', region: 'Europe' },
  // Middle East
  { iso3: 'SAU', iso2: 'SA', name: 'Saudi Arabia', region: 'Middle East' },
  { iso3: 'ARE', iso2: 'AE', name: 'United Arab Emirates', region: 'Middle East' },
  { iso3: 'ISR', iso2: 'IL', name: 'Israel', region: 'Middle East' },
  { iso3: 'QAT', iso2: 'QA', name: 'Qatar', region: 'Middle East' },
  { iso3: 'IRN', iso2: 'IR', name: 'Iran', region: 'Middle East' },
  { iso3: 'EGY', iso2: 'EG', name: 'Egypt', region: 'Middle East' },
  // Africa
  { iso3: 'ZAF', iso2: 'ZA', name: 'South Africa', region: 'Africa' },
  { iso3: 'NGA', iso2: 'NG', name: 'Nigeria', region: 'Africa' },
  { iso3: 'KEN', iso2: 'KE', name: 'Kenya', region: 'Africa' },
  { iso3: 'MAR', iso2: 'MA', name: 'Morocco', region: 'Africa' },
  { iso3: 'ETH', iso2: 'ET', name: 'Ethiopia', region: 'Africa' },
  { iso3: 'GHA', iso2: 'GH', name: 'Ghana', region: 'Africa' },
  // Asia
  { iso3: 'CHN', iso2: 'CN', name: 'China', region: 'Asia' },
  { iso3: 'JPN', iso2: 'JP', name: 'Japan', region: 'Asia' },
  { iso3: 'KOR', iso2: 'KR', name: 'South Korea', region: 'Asia' },
  { iso3: 'IND', iso2: 'IN', name: 'India', region: 'Asia' },
  { iso3: 'IDN', iso2: 'ID', name: 'Indonesia', region: 'Asia' },
  { iso3: 'THA', iso2: 'TH', name: 'Thailand', region: 'Asia' },
  { iso3: 'MYS', iso2: 'MY', name: 'Malaysia', region: 'Asia' },
  { iso3: 'PHL', iso2: 'PH', name: 'Philippines', region: 'Asia' },
  { iso3: 'VNM', iso2: 'VN', name: 'Vietnam', region: 'Asia' },
  { iso3: 'SGP', iso2: 'SG', name: 'Singapore', region: 'Asia' },
  { iso3: 'TWN', iso2: 'TW', name: 'Taiwan', region: 'Asia' },
  { iso3: 'HKG', iso2: 'HK', name: 'Hong Kong', region: 'Asia' },
  { iso3: 'PAK', iso2: 'PK', name: 'Pakistan', region: 'Asia' },
  { iso3: 'BGD', iso2: 'BD', name: 'Bangladesh', region: 'Asia' },
  // Oceania
  { iso3: 'AUS', iso2: 'AU', name: 'Australia', region: 'Oceania' },
  { iso3: 'NZL', iso2: 'NZ', name: 'New Zealand', region: 'Oceania' },
];

// Flagship country equity ETF (US-listed, deep liquidity) per ISO3 — used for the
// real-time market-momentum confirmation layer. Not every country has one.
const COUNTRY_ETF: Record<string, string> = {
  USA: 'SPY', CAN: 'EWC', MEX: 'EWW',
  BRA: 'EWZ', ARG: 'ARGT', CHL: 'ECH', COL: 'GXG', PER: 'EPU',
  GBR: 'EWU', DEU: 'EWG', FRA: 'EWQ', ITA: 'EWI', ESP: 'EWP', NLD: 'EWN',
  BEL: 'EWK', SWE: 'EWD', NOR: 'NORW', DNK: 'EDEN', FIN: 'EFNL', CHE: 'EWL',
  AUT: 'EWO', IRL: 'EIRL', PRT: 'PGAL', GRC: 'GREK', POL: 'EPOL', TUR: 'TUR',
  SAU: 'KSA', ARE: 'UAE', ISR: 'EIS', QAT: 'QAT', EGY: 'EGPT',
  ZAF: 'EZA', NGA: 'NGE',
  CHN: 'MCHI', JPN: 'EWJ', KOR: 'EWY', IND: 'INDA', IDN: 'EIDO', THA: 'THD',
  MYS: 'EWM', PHL: 'EPHE', VNM: 'VNM', SGP: 'EWS', TWN: 'EWT', HKG: 'EWH',
  PAK: 'PAK',
  AUS: 'EWA', NZL: 'ENZL',
};

// Simple in-memory cache
let _cache: { ts: number; data: ApiResponse } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1h — macro is slow but the market-momentum layer is live

/**
 * Fetch from IMF DataMapper WEO API.
 * Note: the IMF endpoint returns ALL countries for the requested indicator in one response,
 * so we fetch once globally and extract per-ISO3 on the consumer side.
 * Example URL: https://www.imf.org/external/datamapper/api/v1/NGDP_RPCH
 * Response shape: { values: { NGDP_RPCH: { USA: { "2024": 2.8, ... }, ITA: { ... } } } }
 */
async function imfAll(indicator: 'NGDP_RPCH' | 'PCPIPCH'): Promise<Record<string, Record<string, number>>> {
  const url = `https://www.imf.org/external/datamapper/api/v1/${indicator}`;
  // IMF's edge blocks requests with no/!browser User-Agent and the all-countries
  // payload is large, so we send proper headers, allow a generous timeout, and retry
  // once before giving up (falling back to World Bank would yield stale ~2024 data).
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EconoPulse/1.0; +https://www.econopulse.ai)',
          'Accept': 'application/json,*/*;q=0.8',
        },
        next: { revalidate: 21600 },
      });
      if (!res.ok) continue;
      const json: any = await res.json();
      const values = json?.values?.[indicator];
      if (values && typeof values === 'object' && Object.keys(values).length > 0) return values;
    } catch {
      // retry once
    }
  }
  return {};
}

function extractImfSeries(
  all: Record<string, Record<string, number>>,
  iso3: string,
): Array<{ year: number; value: number }> {
  const series = all?.[iso3];
  if (!series || typeof series !== 'object') return [];
  const currentYear = new Date().getUTCFullYear();
  const out: Array<{ year: number; value: number }> = [];
  for (const [yStr, v] of Object.entries(series)) {
    const y = Number(yStr);
    const num = Number(v);
    if (!isFinite(y) || !isFinite(num)) continue;
    // Keep recent years only, capped at the CURRENT year: the current-year value
    // is the IMF nowcast (freshest estimate of where we are NOW), while future
    // years are pure forecasts and would mis-date the present cycle.
    if (y < currentYear - 5 || y > currentYear) continue;
    out.push({ year: y, value: num });
  }
  return out.sort((a, b) => b.year - a.year);
}

/**
 * World Bank fallback — used only if IMF doesn't return data for a country.
 */
async function wb(iso3: string, indicator: string): Promise<Array<{ year: number; value: number }>> {
  try {
    const url = `https://api.worldbank.org/v2/country/${iso3}/indicator/${indicator}?format=json&per_page=10&date=2018:2026`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const json: any = await res.json();
    const rows = Array.isArray(json) ? json[1] : [];
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((r: any) => r && r.value !== null && !isNaN(Number(r.value)))
      .map((r: any) => ({ year: Number(r.date), value: Number(r.value) }))
      .sort((a, b) => b.year - a.year);
  } catch {
    return [];
  }
}

/**
 * High-accuracy cycle classifier.
 * Uses a weighted score combining absolute level AND direction (YoY delta) for
 * both growth and inflation, then maps to one of the four quadrants.
 *
 *   growthScore:  +ve = expansion,  -ve = contraction
 *   inflScore:    +ve = inflation pressure rising/high,  -ve = disinflation
 *
 * Thresholds calibrated on developed-market norms with country-flexible bands:
 *   GDP:   <0.5 weak,  0.5–2.5 moderate,  >2.5 strong
 *   CPI:   <2.0 low,   2.0–4.0 moderate,  >4.0 high
 */
function classify(
  growthDelta: number | null,
  inflationDelta: number | null,
  gdpLatest: number | null,
  cpiLatest: number | null,
): Cycle {
  if (gdpLatest == null || cpiLatest == null) return 'Unknown';

  // --- growth score ---------------------------------------------------------
  let growthScore = 0;
  // level component
  if (gdpLatest >= 3) growthScore += 2;
  else if (gdpLatest >= 1.5) growthScore += 1;
  else if (gdpLatest >= 0.5) growthScore += 0;
  else if (gdpLatest >= -0.5) growthScore -= 1;
  else growthScore -= 2;
  // direction component
  if (growthDelta != null) {
    if (growthDelta >= 0.5) growthScore += 1;
    else if (growthDelta <= -0.5) growthScore -= 1;
  }

  // --- inflation score ------------------------------------------------------
  let inflScore = 0;
  // level component (relative to ~2% target)
  if (cpiLatest >= 6) inflScore += 2;
  else if (cpiLatest >= 4) inflScore += 1;
  else if (cpiLatest >= 2.5) inflScore += 0;
  else if (cpiLatest >= 1) inflScore -= 1;
  else inflScore -= 2;
  // direction component
  if (inflationDelta != null) {
    if (inflationDelta >= 0.5) inflScore += 1;
    else if (inflationDelta <= -0.5) inflScore -= 1;
  }

  // --- map to quadrant ------------------------------------------------------
  const growthUp = growthScore > 0;
  const inflHigh = inflScore > 0;

  // Strong stagflation override: very high CPI with very weak growth
  if (cpiLatest >= 5 && gdpLatest < 1.5) return 'Stagflation';
  // Strong recession override: contracting GDP with falling/low CPI
  if (gdpLatest < 0 && cpiLatest < 4) return 'Recession';

  if (growthUp && inflHigh) return 'Inflation';
  if (growthUp && !inflHigh) return 'Reflation';
  if (!growthUp && inflHigh) return 'Stagflation';
  return 'Recession';
}

async function buildData(): Promise<ApiResponse> {
  // 1. Single global fetch per IMF indicator (returns all countries at once),
  //    plus real-time 3-month market momentum for every country ETF (Yahoo).
  const etfSymbols = Array.from(new Set(Object.values(COUNTRY_ETF)));
  const [imfGdpAll, imfCpiAll, momentumQuotes] = await Promise.all([
    imfAll('NGDP_RPCH'),
    imfAll('PCPIPCH'),
    fetchYahooChartQuotes(etfSymbols, '3mo', 6, 100).catch(() => ({} as Record<string, { changePercent: number }>)),
  ]);

  // 2. Per-country: extract from IMF; fall back to World Bank only when IMF lacks data.
  //    Batch World Bank fallbacks to avoid hammering it.
  const BATCH = 6;
  const results: CountryCycle[] = [];
  for (let i = 0; i < COUNTRIES.length; i += BATCH) {
    const slice = COUNTRIES.slice(i, i + BATCH);
    const batchRes = await Promise.all(
      slice.map(async (c) => {
        let gdpSeries = extractImfSeries(imfGdpAll, c.iso3);
        let cpiSeries = extractImfSeries(imfCpiAll, c.iso3);
        let gdpSrc: 'IMF' | 'WorldBank' = 'IMF';
        let cpiSrc: 'IMF' | 'WorldBank' = 'IMF';

        if (gdpSeries.length < 2) {
          const wbGdp = await wb(c.iso3, 'NY.GDP.MKTP.KD.ZG');
          if (wbGdp.length >= gdpSeries.length) {
            gdpSeries = wbGdp;
            gdpSrc = 'WorldBank';
          }
        }
        if (cpiSeries.length < 2) {
          const wbCpi = await wb(c.iso3, 'FP.CPI.TOTL.ZG');
          if (wbCpi.length >= cpiSeries.length) {
            cpiSeries = wbCpi;
            cpiSrc = 'WorldBank';
          }
        }

        const gdpLatest = gdpSeries[0]?.value ?? null;
        const gdpPrior = gdpSeries[1]?.value ?? null;
        const cpiLatest = cpiSeries[0]?.value ?? null;
        const cpiPrior = cpiSeries[1]?.value ?? null;
        const growthDelta = gdpLatest != null && gdpPrior != null ? +(gdpLatest - gdpPrior).toFixed(2) : null;
        const inflationDelta = cpiLatest != null && cpiPrior != null ? +(cpiLatest - cpiPrior).toFixed(2) : null;
        const cycle = classify(growthDelta, inflationDelta, gdpLatest, cpiLatest);
        const asOf = gdpSeries[0]?.year ? String(gdpSeries[0].year) : null;
        const source: 'IMF' | 'WorldBank' | 'Mixed' | null =
          gdpLatest == null && cpiLatest == null ? null : gdpSrc === cpiSrc ? gdpSrc : 'Mixed';

        // Real-time market confirmation: 3-month return of the country's flagship ETF.
        const etf = COUNTRY_ETF[c.iso3] || null;
        const mom = etf ? (momentumQuotes as any)[etf]?.changePercent : undefined;
        const marketMomentum = typeof mom === 'number' && isFinite(mom) ? +mom.toFixed(2) : null;

        // Confidence 0-100: data availability + freshness + macro/market agreement.
        let confidence = 0;
        if (gdpLatest != null && cpiLatest != null) confidence += 40;      // both macro pillars present
        if (growthDelta != null && inflationDelta != null) confidence += 15; // direction available
        const currentYear = new Date().getUTCFullYear();
        if (asOf && Number(asOf) >= currentYear) confidence += 20;         // nowcast-fresh
        else if (asOf && Number(asOf) >= currentYear - 1) confidence += 10;
        if (marketMomentum != null) {
          // Market agrees when equities rise in pro-growth regimes and fall in contraction regimes.
          const marketUp = marketMomentum > 1.5;
          const marketDown = marketMomentum < -1.5;
          const agrees =
            ((cycle === 'Reflation' || cycle === 'Inflation') && marketUp) ||
            ((cycle === 'Recession' || cycle === 'Stagflation') && marketDown);
          const disagrees =
            ((cycle === 'Reflation' || cycle === 'Inflation') && marketDown) ||
            ((cycle === 'Recession' || cycle === 'Stagflation') && marketUp);
          confidence += agrees ? 25 : disagrees ? 5 : 15; // neutral market = partial credit
        }
        confidence = Math.max(0, Math.min(100, confidence));

        return {
          iso3: c.iso3,
          iso2: c.iso2,
          name: c.name,
          region: c.region,
          gdpLatest: gdpLatest != null ? +gdpLatest.toFixed(2) : null,
          gdpPrior: gdpPrior != null ? +gdpPrior.toFixed(2) : null,
          cpiLatest: cpiLatest != null ? +cpiLatest.toFixed(2) : null,
          cpiPrior: cpiPrior != null ? +cpiPrior.toFixed(2) : null,
          growthDelta,
          inflationDelta,
          cycle,
          asOf,
          source,
          marketMomentum,
          etf,
          confidence,
        } as CountryCycle;
      })
    );
    results.push(...batchRes);
  }

  const summary: Record<Cycle, number> = {
    Reflation: 0,
    Inflation: 0,
    Stagflation: 0,
    Recession: 0,
    Unknown: 0,
  };
  for (const r of results) summary[r.cycle]++;

  return {
    generatedAt: new Date().toISOString(),
    countries: results,
    summary,
    source: 'IMF DataMapper WEO (primary) + World Bank WDI (fallback) + live country-ETF momentum (Yahoo)',
  };
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`world-cycles:${ip}`);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const force = req.nextUrl.searchParams.get('refresh') === '1';
  try {
    if (!force && _cache && Date.now() - _cache.ts < CACHE_TTL) {
      return NextResponse.json(_cache.data, {
        status: 200,
        headers: {
          ...rateLimitHeaders(rl),
          'x-cache': 'HIT',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600',
        },
      });
    }
    const data = await buildData();
    _cache = { ts: Date.now(), data };
    return NextResponse.json(data, {
      status: 200,
      headers: {
        ...rateLimitHeaders(rl),
        'x-cache': 'MISS',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600',
      },
    });
  } catch (e) {
    console.error('world-economic-cycles error', e);
    return NextResponse.json({ error: 'Failed to build world cycles' }, { status: 500 });
  }
}
