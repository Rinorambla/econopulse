import { NextResponse } from 'next/server';
import { fetchYahooChartQuotes } from '@/lib/yahoo-chart-quotes';

interface MetalData {
  metal: string;
  price: number;
  currency: string;
  unit: string;
  dailyChange: number;
  weeklyChange: number;
  monthlyChange: number;
  yearlyChange: number;
  marketCap: number;
  volatility: number;
  safeHavenScore: number;
  industrialDemand: number;
  jewelryDemand: number;
  investmentDemand: number;
}

const METAL_SYMBOLS: Record<string, { symbol: string; unit: string; marketCap: number; safeHaven: number; industrial: number; jewelry: number; investment: number }> = {
  'Gold':      { symbol: 'GC=F', unit: '$/troy oz', marketCap: 15.2, safeHaven: 95, industrial: 8, jewelry: 52, investment: 40 },
  'Silver':    { symbol: 'SI=F', unit: '$/troy oz', marketCap: 1.4,  safeHaven: 78, industrial: 56, jewelry: 18, investment: 26 },
  'Platinum':  { symbol: 'PL=F', unit: '$/troy oz', marketCap: 0.03, safeHaven: 65, industrial: 68, jewelry: 22, investment: 10 },
  'Palladium': { symbol: 'PA=F', unit: '$/troy oz', marketCap: 0.01, safeHaven: 45, industrial: 85, jewelry: 10, investment: 5 },
  'Copper':    { symbol: 'HG=F', unit: '$/lb',      marketCap: 0.18, safeHaven: 15, industrial: 95, jewelry: 3, investment: 2 },
};

let cachedData: MetalData[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 15;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedData && (now - lastFetchTime < CACHE_DURATION)) {
      return NextResponse.json({ success: true, data: cachedData, source: 'Yahoo Finance (cached)', lastUpdated: new Date(lastFetchTime).toISOString() });
    }

    console.log('💎 Fetching metals prices via Yahoo v8/chart...');
    const symbols = Object.values(METAL_SYMBOLS).map(m => m.symbol);
    const quotes = await fetchYahooChartQuotes(symbols);

    const processedData: MetalData[] = Object.entries(METAL_SYMBOLS).map(([metal, info]) => {
      const q = quotes[info.symbol];
      return {
        metal,
        price: q?.price ?? 0,
        currency: 'USD',
        unit: info.unit,
        dailyChange: q?.changePercent ?? 0,
        weeklyChange: 0,
        monthlyChange: 0,
        yearlyChange: 0,
        marketCap: info.marketCap,
        volatility: 0,
        safeHavenScore: info.safeHaven,
        industrialDemand: info.industrial,
        jewelryDemand: info.jewelry,
        investmentDemand: info.investment,
      };
    }).filter(m => m.price > 0);

    cachedData = processedData;
    lastFetchTime = now;
    console.log('✅ Metals data:', processedData.map(m => `${m.metal}=$${m.price.toFixed(2)}`).join(', '));

    return NextResponse.json({ success: true, data: processedData, source: 'Yahoo Finance', lastUpdated: new Date().toISOString(), count: processedData.length });
  } catch (error) {
    console.error('❌ Error fetching metals data:', error);
    return NextResponse.json({ success: false, data: cachedData ?? [], source: 'error', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
