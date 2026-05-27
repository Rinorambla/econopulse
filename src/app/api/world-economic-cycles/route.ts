import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

/**
 * World Economic Cycle classifier
 * For each country, fetches the latest 2 valid annual observations of:
 *   - GDP growth (annual %)        -> NY.GDP.MKTP.KD.ZG
 *   - CPI inflation (annual %)     -> FP.CPI.TOTL.ZG
 * Classifies each country into one of the 4 cycle quadrants:
 *   - Reflation   (growth ↑, inflation ↓)  -> recovering disinflationary phase
 *   - Inflation   (growth ↑, inflation ↑)  -> overheating / boom
 *   - Stagflation (growth ↓, inflation ↑)  -> worst regime
 *   - Recession   (growth ↓, inflation ↓)  -> contraction / disinflation
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

// Simple in-memory cache
let _cache: { ts: number; data: ApiResponse } | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h — World Bank annual data updates slowly

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

function classify(growthDelta: number | null, inflationDelta: number | null, gdpLatest: number | null, cpiLatest: number | null): Cycle {
  if (growthDelta == null || inflationDelta == null || gdpLatest == null || cpiLatest == null) return 'Unknown';
  // Slight dead-band around 0 to avoid noise; combine direction with absolute level
  const growthUp = growthDelta > 0 || gdpLatest > 3;
  const growthDown = growthDelta < 0 || gdpLatest < 1;
  const inflUp = inflationDelta > 0 || cpiLatest > 4;
  const inflDown = inflationDelta < 0 || cpiLatest < 2;

  if (growthDown && inflUp) return 'Stagflation';
  if (growthDown && inflDown) return 'Recession';
  if (growthUp && inflUp) return 'Inflation';
  if (growthUp && inflDown) return 'Reflation';

  // Tie-breakers based on absolute level
  if (cpiLatest > 4 && gdpLatest < 2) return 'Stagflation';
  if (gdpLatest >= 2 && cpiLatest <= 3) return 'Reflation';
  if (gdpLatest >= 2 && cpiLatest > 3) return 'Inflation';
  return 'Recession';
}

async function buildData(): Promise<ApiResponse> {
  // Run in small batches of 8 to avoid hammering World Bank
  const BATCH = 8;
  const results: CountryCycle[] = [];
  for (let i = 0; i < COUNTRIES.length; i += BATCH) {
    const slice = COUNTRIES.slice(i, i + BATCH);
    const batchRes = await Promise.all(
      slice.map(async (c) => {
        const [gdpSeries, cpiSeries] = await Promise.all([
          wb(c.iso3, 'NY.GDP.MKTP.KD.ZG'),
          wb(c.iso3, 'FP.CPI.TOTL.ZG'),
        ]);
        const gdpLatest = gdpSeries[0]?.value ?? null;
        const gdpPrior = gdpSeries[1]?.value ?? null;
        const cpiLatest = cpiSeries[0]?.value ?? null;
        const cpiPrior = cpiSeries[1]?.value ?? null;
        const growthDelta = gdpLatest != null && gdpPrior != null ? +(gdpLatest - gdpPrior).toFixed(2) : null;
        const inflationDelta = cpiLatest != null && cpiPrior != null ? +(cpiLatest - cpiPrior).toFixed(2) : null;
        const cycle = classify(growthDelta, inflationDelta, gdpLatest, cpiLatest);
        const asOf = gdpSeries[0]?.year ? String(gdpSeries[0].year) : null;
        return {
          iso3: c.iso3,
          iso2: c.iso2,
          name: c.name,
          region: c.region,
          gdpLatest,
          gdpPrior,
          cpiLatest,
          cpiPrior,
          growthDelta,
          inflationDelta,
          cycle,
          asOf,
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
    source: 'World Bank (NY.GDP.MKTP.KD.ZG, FP.CPI.TOTL.ZG)',
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
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
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
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
      },
    });
  } catch (e) {
    console.error('world-economic-cycles error', e);
    return NextResponse.json({ error: 'Failed to build world cycles' }, { status: 500 });
  }
}
