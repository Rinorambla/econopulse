import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooChartQuotes } from '@/lib/yahoo-chart-quotes';

interface EnergyData {
  commodity: string;
  price: number;
  currency: string;
  unit: string;
  dailyChange: number;
  majorProducers: string[];
  geopoliticalRisk: 'low' | 'medium' | 'high' | 'critical';
}

const ENERGY_MAP: Record<string, { name: string; unit: string; producers: string[]; risk: EnergyData['geopoliticalRisk'] }> = {
  'CL=F': { name: 'Crude Oil (WTI)', unit: '$/barrel', producers: ['USA', 'Saudi Arabia', 'Russia', 'Canada', 'Iraq'], risk: 'high' },
  'BZ=F': { name: 'Brent Oil', unit: '$/barrel', producers: ['Saudi Arabia', 'Russia', 'Iraq', 'UAE', 'Kuwait'], risk: 'high' },
  'NG=F': { name: 'Natural Gas (Henry Hub)', unit: '$/MMBtu', producers: ['USA', 'Russia', 'Iran', 'Qatar', 'Australia'], risk: 'medium' },
  'RB=F': { name: 'Gasoline (RBOB)', unit: '$/gallon', producers: ['USA', 'China', 'India', 'Russia', 'Japan'], risk: 'medium' },
  'HO=F': { name: 'Heating Oil', unit: '$/gallon', producers: ['USA', 'Russia', 'China', 'India', 'Saudi Arabia'], risk: 'medium' },
  'URA':  { name: 'Uranium (U3O8)', unit: '$/share (ETF)', producers: ['Kazakhstan', 'Australia', 'Namibia', 'Canada', 'Uzbekistan'], risk: 'high' },
};

let cachedData: EnergyData[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 30;

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
    const force = req.nextUrl.searchParams.get('forceRefresh') === '1';
    if (!force && cachedData && (now - lastFetchTime < CACHE_DURATION)) {
      return NextResponse.json({ success: true, data: cachedData, source: 'Yahoo Finance (cached)', lastUpdated: new Date(lastFetchTime).toISOString() });
    }

    console.log('⚡ Fetching energy prices via Yahoo v8/chart...');
    const quotes = await fetchYahooChartQuotes(Object.keys(ENERGY_MAP));

    const processedData: EnergyData[] = Object.entries(ENERGY_MAP).map(([symbol, info]) => {
      const q = quotes[symbol];
      return {
        commodity: info.name,
        price: q?.price ?? 0,
        currency: 'USD',
        unit: info.unit,
        dailyChange: q?.changePercent ?? 0,
        majorProducers: info.producers,
        geopoliticalRisk: info.risk,
      };
    }).filter(e => e.price > 0);

    cachedData = processedData;
    lastFetchTime = now;
    console.log('✅ Energy data:', processedData.map(e => `${e.commodity}=$${e.price.toFixed(2)}`).join(', '));

    return NextResponse.json({ success: true, data: processedData, source: 'Yahoo Finance', lastUpdated: new Date().toISOString(), count: processedData.length });
  } catch (error) {
    console.error('❌ Error fetching energy data:', error);
    return NextResponse.json({ success: false, data: cachedData ?? [], source: 'error', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
