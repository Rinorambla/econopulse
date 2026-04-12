import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooChartQuotes } from '@/lib/yahoo-chart-quotes';

interface CommodityData {
  commodity: string;
  price: number;
  currency: string;
  unit: string;
  dailyChangePct: number;
  majorProducers: string[];
}

// Yahoo futures symbols for agricultural commodities
const COMMODITY_MAP: Record<string, { name: string; unit: string; producers: string[] }> = {
  'ZW=F': { name: 'Wheat', unit: 'cents/bushel', producers: ['China', 'India', 'Russia', 'USA', 'France'] },
  'ZC=F': { name: 'Corn', unit: 'cents/bushel', producers: ['USA', 'China', 'Brazil', 'Argentina', 'Ukraine'] },
  'ZS=F': { name: 'Soybeans', unit: 'cents/bushel', producers: ['USA', 'Brazil', 'Argentina', 'China', 'India'] },
  'KC=F': { name: 'Coffee', unit: 'cents/lb', producers: ['Brazil', 'Vietnam', 'Colombia', 'Indonesia', 'Ethiopia'] },
  'CC=F': { name: 'Cocoa', unit: '$/metric ton', producers: ['Ivory Coast', 'Ghana', 'Indonesia', 'Nigeria', 'Brazil'] },
  'CT=F': { name: 'Cotton', unit: 'cents/lb', producers: ['China', 'India', 'USA', 'Brazil', 'Pakistan'] },
  'SB=F': { name: 'Sugar', unit: 'cents/lb', producers: ['Brazil', 'India', 'China', 'Thailand', 'USA'] },
};

let cachedData: CommodityData[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
    const force = req.nextUrl.searchParams.get('forceRefresh') === '1';

    if (!force && cachedData && (now - lastFetchTime < CACHE_DURATION)) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        source: 'Yahoo Finance (cached)',
        lastUpdated: new Date(lastFetchTime).toISOString(),
      });
    }

    console.log('🌾 Fetching agricultural commodity data via Yahoo v8/chart...');

    let yahooData: Record<string, any> = {};
    try {
      yahooData = await fetchYahooChartQuotes(Object.keys(COMMODITY_MAP));
      console.log('✅ Agriculture Yahoo quotes:', Object.keys(yahooData).length);
    } catch (e) {
      console.warn('⚠️ Agriculture Yahoo fetch failed, using fallback');
    }

    const processedData: CommodityData[] = [];
    for (const [symbol, info] of Object.entries(COMMODITY_MAP)) {
      const quote = yahooData[symbol];
      processedData.push({
        commodity: info.name,
        price: quote?.price ?? getFallbackPrice(info.name),
        currency: 'USD',
        unit: info.unit,
        dailyChangePct: quote?.changePercent ?? 0,
        majorProducers: info.producers,
      });
    }

    cachedData = processedData;
    lastFetchTime = now;

    console.log('✅ Agricultural data processed:', processedData.length, 'commodities');

    return NextResponse.json({
      success: true,
      data: processedData,
      source: Object.keys(yahooData).length > 0 ? 'Yahoo Finance' : 'fallback',
      lastUpdated: new Date().toISOString(),
      count: processedData.length,
    });
  } catch (error) {
    console.error('❌ Error fetching agricultural data:', error);
    return NextResponse.json({
      success: true,
      data: getFallbackData(),
      source: 'fallback',
      lastUpdated: new Date().toISOString(),
    });
  }
}

function getFallbackPrice(name: string): number {
  const prices: Record<string, number> = {
    Wheat: 685, Corn: 472, Soybeans: 1456, Coffee: 245, Cocoa: 3450, Cotton: 69, Sugar: 21,
  };
  return prices[name] || 100;
}

function getFallbackData(): CommodityData[] {
  return Object.values(COMMODITY_MAP).map(info => ({
    commodity: info.name,
    price: getFallbackPrice(info.name),
    currency: 'USD',
    unit: info.unit,
    dailyChangePct: 0,
    majorProducers: info.producers,
  }));
}
