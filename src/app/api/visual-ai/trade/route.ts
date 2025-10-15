import { NextRequest, NextResponse } from 'next/server';

interface TradeData {
  country: string;
  countryCode: string; // ISO2
  iso3: string;        // ISO3 used by World Bank
  exports: number;     // current US$
  imports: number;     // current US$
  tradeBalance: number;
  exportGrowth?: number; // yoy % (if previous year available)
  importGrowth?: number;
  tradeIntensity?: number; // (exports+imports)/GDP*100 if GDP available (placeholder null)
  dataYear: number;
  gdpYear?: number;
  metadata: {
    exportsIndicator: string;
    importsIndicator: string;
    source: string;
  };
}

// World Bank indicators (current US$)
const EXPORTS_IND = 'NE.EXP.GNFS.CD';
const IMPORTS_IND = 'NE.IMP.GNFS.CD';

// Country mapping (ISO2 -> { country, iso3 })
const COUNTRIES: { countryCode: string; iso3: string; country: string }[] = [
  { countryCode: 'US', iso3: 'USA', country: 'United States' },
  { countryCode: 'CN', iso3: 'CHN', country: 'China' },
  { countryCode: 'DE', iso3: 'DEU', country: 'Germany' },
  { countryCode: 'JP', iso3: 'JPN', country: 'Japan' },
  { countryCode: 'GB', iso3: 'GBR', country: 'United Kingdom' },
  { countryCode: 'FR', iso3: 'FRA', country: 'France' },
  { countryCode: 'NL', iso3: 'NLD', country: 'Netherlands' },
  { countryCode: 'KR', iso3: 'KOR', country: 'South Korea' },
  { countryCode: 'CA', iso3: 'CAN', country: 'Canada' },
  { countryCode: 'IN', iso3: 'IND', country: 'India' }
];

async function fetchWorldBankLatest(iso3: string, indicator: string) {
  const url = `https://api.worldbank.org/v2/country/${iso3}/indicator/${indicator}?format=json&per_page=60`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' }, next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`World Bank fetch failed ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json) || json.length < 2) throw new Error('Unexpected World Bank response');
  const data = json[1];
  const firstValid = data.find((d: any) => d.value !== null);
  if (!firstValid) throw new Error('No data');
  const secondValid = data.filter((d: any) => d.value !== null)[1];
  return {
    value: firstValid.value as number,
    year: parseInt(firstValid.date, 10),
    prevValue: secondValid?.value as number | undefined,
    prevYear: secondValid ? parseInt(secondValid.date, 10) : undefined
  };
}

async function buildTradeData(): Promise<TradeData[]> {
  const results: TradeData[] = [];
  for (const c of COUNTRIES) {
    try {
      const [exp, imp] = await Promise.all([
        fetchWorldBankLatest(c.iso3, EXPORTS_IND),
        fetchWorldBankLatest(c.iso3, IMPORTS_IND)
      ]);
      const exportsVal = exp.value;
      const importsVal = imp.value;
      const balance = exportsVal - importsVal;
      const exportGrowth = exp.prevValue ? ((exportsVal - exp.prevValue) / exp.prevValue) * 100 : undefined;
      const importGrowth = imp.prevValue ? ((importsVal - imp.prevValue) / imp.prevValue) * 100 : undefined;
      results.push({
        country: c.country,
        countryCode: c.countryCode,
        iso3: c.iso3,
        exports: exportsVal,
        imports: importsVal,
        tradeBalance: balance,
        exportGrowth: exportGrowth !== undefined ? Math.round(exportGrowth * 10) / 10 : undefined,
        importGrowth: importGrowth !== undefined ? Math.round(importGrowth * 10) / 10 : undefined,
        tradeIntensity: undefined, // Placeholder until GDP integration
        dataYear: Math.min(exp.year, imp.year),
        metadata: { exportsIndicator: EXPORTS_IND, importsIndicator: IMPORTS_IND, source: 'World Bank Open Data' }
      });
    } catch (e) {
      console.warn(`⚠️ World Bank trade fetch failed for ${c.iso3}:`, e);
    }
  }
  return results;
}

// Simulate API calls with caching
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 25 * 60 * 1000; // 25 minutes

export async function GET(request: NextRequest) {
  try {
  console.log('🌐 Fetching World Bank Trade data (REAL)...');
    
    const cacheKey = 'trade-flows-data';
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📦 Returning cached Trade data');
      return NextResponse.json({
        success: true,
        data: cached.data,
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    const realData = await buildTradeData();
    const processedData = realData
      .map(row => ({
        ...row,
        tradeRank: calculateTradeRank(row.exports + row.imports, realData),
        exportDiversification: undefined, // requires product breakdown not provided by basic indicator
        tradeOpenness: undefined,
        competitivenessScore: undefined,
        riskAssessment: undefined
      }))
      .sort((a,b) => (b.exports + b.imports) - (a.exports + a.imports));

    // Sort by total trade volume (exports + imports)
    processedData.sort((a, b) => (b.exports + b.imports) - (a.exports + a.imports));

    // Cache the processed data
    cache.set(cacheKey, {
      data: processedData,
      timestamp: Date.now()
    });

    console.log(`✅ Trade Flows data processed: ${processedData.length} countries`);

    return NextResponse.json({
      success: true,
      data: processedData,
      source: 'World Bank Open Data',
      metadata: {
        totalCountries: processedData.length,
        surplusCountries: processedData.filter(c => c.tradeBalance > 0).length,
        deficitCountries: processedData.filter(c => c.tradeBalance < 0).length,
        totalTradeUSD: processedData.reduce((sum, c) => sum + c.exports + c.imports, 0),
        dataYearRange: processedData.reduce((acc, c) => {
          acc.min = Math.min(acc.min, c.dataYear); acc.max = Math.max(acc.max, c.dataYear); return acc;
        }, { min: 9999, max: 0 }),
        methodology: {
          exports: EXPORTS_IND,
          imports: IMPORTS_IND,
          notes: 'Values are current US$. Growth = YoY if previous year available. No synthetic data.'
        },
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching Trade data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch trade flows data',
  data: [],
  source: 'error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper functions
function calculateTradeRank(totalTrade: number, allCountries: { exports: number; imports: number }[]): number {
  const sorted = allCountries.map(c => c.exports + c.imports).sort((a, b) => b - a);
  return sorted.indexOf(totalTrade) + 1;
}

// Removed synthetic diversification, openness, competitiveness, risk computations (require granular trade composition data)
