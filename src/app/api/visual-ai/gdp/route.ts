import { NextRequest, NextResponse } from 'next/server';

interface GDPData {
  country: string;
  countryCode: string;
  gdpGrowth: number;
  gdpPerCapita: number;
  trend: 'accelerating' | 'stable' | 'decelerating';
  dataYear: number;
}

// Country mapping (ISO3 -> display info)
const COUNTRIES: { iso3: string; iso2: string; name: string }[] = [
  { iso3: 'USA', iso2: 'US', name: 'United States' },
  { iso3: 'CHN', iso2: 'CN', name: 'China' },
  { iso3: 'JPN', iso2: 'JP', name: 'Japan' },
  { iso3: 'DEU', iso2: 'DE', name: 'Germany' },
  { iso3: 'GBR', iso2: 'GB', name: 'United Kingdom' },
  { iso3: 'FRA', iso2: 'FR', name: 'France' },
  { iso3: 'IND', iso2: 'IN', name: 'India' },
  { iso3: 'BRA', iso2: 'BR', name: 'Brazil' },
  { iso3: 'CAN', iso2: 'CA', name: 'Canada' },
  { iso3: 'AUS', iso2: 'AU', name: 'Australia' },
  { iso3: 'KOR', iso2: 'KR', name: 'South Korea' },
  { iso3: 'MEX', iso2: 'MX', name: 'Mexico' },
  { iso3: 'IDN', iso2: 'ID', name: 'Indonesia' },
  { iso3: 'TUR', iso2: 'TR', name: 'Turkey' },
  { iso3: 'RUS', iso2: 'RU', name: 'Russia' },
  { iso3: 'ZAF', iso2: 'ZA', name: 'South Africa' },
];

// World Bank indicators
const GDP_GROWTH_IND = 'NY.GDP.MKTP.KD.ZG'; // GDP growth annual %
const GDP_PERCAPITA_IND = 'NY.GDP.PCAP.CD';  // GDP per capita current US$

let cachedData: GDPData[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 4; // 4 hours

async function fetchWorldBankIndicator(iso3Codes: string[], indicator: string): Promise<Map<string, { value: number; year: number; prevValue?: number }>> {
  const result = new Map<string, { value: number; year: number; prevValue?: number }>();
  const url = `https://api.worldbank.org/v2/country/${iso3Codes.join(';')}/indicator/${indicator}?format=json&per_page=200&date=2020:2024`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'EconoPulse-Dashboard/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return result;
    const json = await res.json();
    if (!Array.isArray(json) || json.length < 2) return result;
    const data: any[] = json[1] || [];
    // Group by country ISO3 and get latest non-null
    const byCountry = new Map<string, any[]>();
    for (const d of data) {
      if (d.value === null) continue;
      const iso3 = d.countryiso3code;
      if (!byCountry.has(iso3)) byCountry.set(iso3, []);
      byCountry.get(iso3)!.push(d);
    }
    for (const [iso3, records] of byCountry) {
      records.sort((a: any, b: any) => parseInt(b.date) - parseInt(a.date));
      const latest = records[0];
      const prev = records[1];
      result.set(iso3, {
        value: latest.value,
        year: parseInt(latest.date),
        prevValue: prev?.value,
      });
    }
  } catch (e) {
    console.error('World Bank GDP fetch error:', e);
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🌍 Fetching GDP Growth data from World Bank...');

    const now = Date.now();
    const force = request.nextUrl.searchParams.get('forceRefresh') === '1';

    if (!force && cachedData && (now - lastFetchTime < CACHE_DURATION)) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        source: 'World Bank (cached)',
        timestamp: new Date().toISOString(),
      });
    }

    const iso3Codes = COUNTRIES.map(c => c.iso3);
    const [growthMap, perCapitaMap] = await Promise.all([
      fetchWorldBankIndicator(iso3Codes, GDP_GROWTH_IND),
      fetchWorldBankIndicator(iso3Codes, GDP_PERCAPITA_IND),
    ]);

    const processedData: GDPData[] = [];
    for (const c of COUNTRIES) {
      const growth = growthMap.get(c.iso3);
      const perCapita = perCapitaMap.get(c.iso3);
      if (!growth) continue;
      const trend: GDPData['trend'] =
        growth.prevValue !== undefined
          ? growth.value > growth.prevValue + 0.5 ? 'accelerating'
            : growth.value < growth.prevValue - 0.5 ? 'decelerating'
            : 'stable'
          : 'stable';
      processedData.push({
        country: c.name,
        countryCode: c.iso2,
        gdpGrowth: Math.round(growth.value * 100) / 100,
        gdpPerCapita: Math.round(perCapita?.value || 0),
        trend,
        dataYear: growth.year,
      });
    }

    processedData.sort((a, b) => b.gdpGrowth - a.gdpGrowth);

    if (processedData.length > 0) {
      cachedData = processedData;
      lastFetchTime = now;
    }

    const finalData = processedData.length > 0 ? processedData : getFallbackData();

    console.log(`✅ GDP data: ${finalData.length} countries, source=${processedData.length > 0 ? 'World Bank' : 'fallback'}`);

    return NextResponse.json({
      success: true,
      data: finalData,
      source: processedData.length > 0 ? 'World Bank Open Data' : 'fallback',
      metadata: {
        totalCountries: finalData.length,
        averageGrowth: +(finalData.reduce((s, c) => s + c.gdpGrowth, 0) / finalData.length).toFixed(1),
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching GDP data:', error);
    return NextResponse.json({
      success: true,
      data: getFallbackData(),
      source: 'fallback',
      timestamp: new Date().toISOString(),
    });
  }
}

function getFallbackData(): GDPData[] {
  const data: GDPData[] = [
    { country: 'India', countryCode: 'IN', gdpGrowth: 7.8, gdpPerCapita: 2612, trend: 'accelerating', dataYear: 2023 },
    { country: 'China', countryCode: 'CN', gdpGrowth: 5.2, gdpPerCapita: 12720, trend: 'decelerating', dataYear: 2023 },
    { country: 'Indonesia', countryCode: 'ID', gdpGrowth: 5.1, gdpPerCapita: 4788, trend: 'stable', dataYear: 2023 },
    { country: 'Turkey', countryCode: 'TR', gdpGrowth: 4.5, gdpPerCapita: 10655, trend: 'accelerating', dataYear: 2023 },
    { country: 'Brazil', countryCode: 'BR', gdpGrowth: 2.9, gdpPerCapita: 8917, trend: 'accelerating', dataYear: 2023 },
    { country: 'South Korea', countryCode: 'KR', gdpGrowth: 1.4, gdpPerCapita: 35196, trend: 'stable', dataYear: 2023 },
    { country: 'United States', countryCode: 'US', gdpGrowth: 2.5, gdpPerCapita: 76398, trend: 'stable', dataYear: 2023 },
    { country: 'Mexico', countryCode: 'MX', gdpGrowth: 3.2, gdpPerCapita: 11497, trend: 'stable', dataYear: 2023 },
    { country: 'Australia', countryCode: 'AU', gdpGrowth: 2.0, gdpPerCapita: 64491, trend: 'stable', dataYear: 2023 },
    { country: 'Canada', countryCode: 'CA', gdpGrowth: 1.1, gdpPerCapita: 54966, trend: 'stable', dataYear: 2023 },
    { country: 'France', countryCode: 'FR', gdpGrowth: 0.9, gdpPerCapita: 40493, trend: 'stable', dataYear: 2023 },
    { country: 'Japan', countryCode: 'JP', gdpGrowth: 1.9, gdpPerCapita: 34064, trend: 'stable', dataYear: 2023 },
    { country: 'United Kingdom', countryCode: 'GB', gdpGrowth: 0.1, gdpPerCapita: 45225, trend: 'decelerating', dataYear: 2023 },
    { country: 'South Africa', countryCode: 'ZA', gdpGrowth: 0.7, gdpPerCapita: 7055, trend: 'decelerating', dataYear: 2023 },
    { country: 'Russia', countryCode: 'RU', gdpGrowth: 3.6, gdpPerCapita: 15345, trend: 'stable', dataYear: 2023 },
    { country: 'Germany', countryCode: 'DE', gdpGrowth: -0.3, gdpPerCapita: 48264, trend: 'decelerating', dataYear: 2023 },
  ];
  return data.sort((a, b) => b.gdpGrowth - a.gdpGrowth);
}
