import { NextRequest, NextResponse } from 'next/server';

interface GDPData {
  country: string;
  countryCode: string;
  gdpGrowth: number;
  gdpPerCapita: number;
  quarterlyGrowth: number;
  annualGrowth: number;
  trend: 'accelerating' | 'stable' | 'decelerating';
}

// Enhanced mock data with more realistic GDP figures
const mockGDPData: GDPData[] = [
  { country: 'United States', countryCode: 'US', gdpGrowth: 2.1, gdpPerCapita: 76398, quarterlyGrowth: 0.4, annualGrowth: 2.1, trend: 'stable' },
  { country: 'China', countryCode: 'CN', gdpGrowth: 5.4, gdpPerCapita: 12720, quarterlyGrowth: 1.3, annualGrowth: 5.4, trend: 'decelerating' },
  { country: 'Japan', countryCode: 'JP', gdpGrowth: 0.9, gdpPerCapita: 34064, quarterlyGrowth: 0.1, annualGrowth: 0.9, trend: 'stable' },
  { country: 'Germany', countryCode: 'DE', gdpGrowth: -0.2, gdpPerCapita: 48264, quarterlyGrowth: -0.3, annualGrowth: -0.2, trend: 'decelerating' },
  { country: 'United Kingdom', countryCode: 'GB', gdpGrowth: 0.7, gdpPerCapita: 45225, quarterlyGrowth: 0.2, annualGrowth: 0.7, trend: 'stable' },
  { country: 'France', countryCode: 'FR', gdpGrowth: 0.9, gdpPerCapita: 40493, quarterlyGrowth: 0.1, annualGrowth: 0.9, trend: 'stable' },
  { country: 'India', countryCode: 'IN', gdpGrowth: 7.8, gdpPerCapita: 2612, quarterlyGrowth: 1.8, annualGrowth: 7.8, trend: 'accelerating' },
  { country: 'Brazil', countryCode: 'BR', gdpGrowth: 3.2, gdpPerCapita: 8917, quarterlyGrowth: 0.6, annualGrowth: 3.2, trend: 'accelerating' },
  { country: 'Canada', countryCode: 'CA', gdpGrowth: 1.5, gdpPerCapita: 54966, quarterlyGrowth: 0.3, annualGrowth: 1.5, trend: 'stable' },
  { country: 'Australia', countryCode: 'AU', gdpGrowth: 1.8, gdpPerCapita: 64491, quarterlyGrowth: 0.4, annualGrowth: 1.8, trend: 'stable' },
  { country: 'South Korea', countryCode: 'KR', gdpGrowth: 2.6, gdpPerCapita: 35196, quarterlyGrowth: 0.5, annualGrowth: 2.6, trend: 'accelerating' },
  { country: 'Mexico', countryCode: 'MX', gdpGrowth: 2.8, gdpPerCapita: 11497, quarterlyGrowth: 0.6, annualGrowth: 2.8, trend: 'accelerating' },
  { country: 'Indonesia', countryCode: 'ID', gdpGrowth: 5.1, gdpPerCapita: 4788, quarterlyGrowth: 1.2, annualGrowth: 5.1, trend: 'stable' },
  { country: 'Turkey', countryCode: 'TR', gdpGrowth: 4.5, gdpPerCapita: 10655, quarterlyGrowth: 0.9, annualGrowth: 4.5, trend: 'accelerating' },
  { country: 'Russia', countryCode: 'RU', gdpGrowth: 2.1, gdpPerCapita: 15345, quarterlyGrowth: 0.4, annualGrowth: 2.1, trend: 'stable' },
  { country: 'South Africa', countryCode: 'ZA', gdpGrowth: 0.8, gdpPerCapita: 7055, quarterlyGrowth: 0.1, annualGrowth: 0.8, trend: 'decelerating' }
];

// Simulate API calls with caching
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 20 * 60 * 1000; // 20 minutes

export async function GET(request: NextRequest) {
  try {
    console.log('🌍 Fetching GDP Growth data...');
    
    const cacheKey = 'gdp-growth-data';
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📊 Returning cached GDP data');
      return NextResponse.json({
        success: true,
        data: cached.data,
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    // In a real implementation, this would fetch from:
    // - World Bank API: https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.KD.ZG
    // - IMF WEO API: https://www.imf.org/external/datamapper/api/
    // - OECD API: https://stats.oecd.org/restsdmx/sdmx.ashx/GetData/

    // For now, enhance mock data with additional insights
    const processedData = mockGDPData.map(country => ({
      ...country,
      growthRank: calculateGrowthRank(country.gdpGrowth, mockGDPData),
      economicSize: categorizeEconomicSize(country.gdpPerCapita),
      volatilityRisk: assessVolatilityRisk(country),
      investmentGrade: getInvestmentGrade(country)
    }));

    // Sort by GDP growth (highest first)
    processedData.sort((a, b) => b.gdpGrowth - a.gdpGrowth);

    // Cache the processed data
    cache.set(cacheKey, {
      data: processedData,
      timestamp: Date.now()
    });

    console.log(`✅ GDP Growth data processed: ${processedData.length} countries`);

    return NextResponse.json({
      success: true,
      data: processedData,
      source: 'enhanced_mock', // Would be 'world_bank' or 'imf' in real implementation
      metadata: {
        totalCountries: processedData.length,
        growthLeaders: processedData.filter(c => c.gdpGrowth > 3).length,
        contractionCount: processedData.filter(c => c.gdpGrowth < 0).length,
        averageGrowth: (processedData.reduce((sum, c) => sum + c.gdpGrowth, 0) / processedData.length).toFixed(1),
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching GDP data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch GDP growth data',
      data: mockGDPData, // fallback
      source: 'fallback',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper functions
function calculateGrowthRank(gdpGrowth: number, allCountries: GDPData[]): number {
  const sorted = allCountries.map(c => c.gdpGrowth).sort((a, b) => b - a);
  return sorted.indexOf(gdpGrowth) + 1;
}

function categorizeEconomicSize(gdpPerCapita: number): 'developed' | 'emerging' | 'frontier' {
  if (gdpPerCapita > 25000) return 'developed';
  if (gdpPerCapita > 5000) return 'emerging';
  return 'frontier';
}

function assessVolatilityRisk(country: GDPData): 'low' | 'medium' | 'high' {
  // Simple heuristic based on growth volatility
  const growthVolatility = Math.abs(country.gdpGrowth - country.quarterlyGrowth * 4);
  
  if (growthVolatility < 1) return 'low';
  if (growthVolatility < 2) return 'medium';
  return 'high';
}

function getInvestmentGrade(country: GDPData): 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' {
  // Simplified rating based on GDP per capita and growth stability
  if (country.gdpPerCapita > 50000 && country.trend === 'stable') return 'AAA';
  if (country.gdpPerCapita > 30000 && country.trend !== 'decelerating') return 'AA';
  if (country.gdpPerCapita > 20000) return 'A';
  if (country.gdpPerCapita > 10000 && country.gdpGrowth > 0) return 'BBB';
  if (country.gdpGrowth > 2) return 'BB';
  if (country.gdpGrowth > 0) return 'B';
  return 'CCC';
}
