import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooHistory } from '@/lib/yahoo-history';

interface OilSeasonalityData {
  month: string;
  monthNumber: number;
  averagePrice: number;
  volatility: number; // stdev of daily pct changes within month across years (annualized proxy)
  historicalRange: { min: number; max: number };
  seasonalTrend: 'bullish' | 'bearish' | 'neutral';
  sampleSizeYears: number;
}

// In-memory cache (server runtime)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function stdev(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((a,b)=>a+b,0) / values.length;
  const variance = values.reduce((a,b)=>a + Math.pow(b-mean,2),0) / values.length;
  return Math.sqrt(variance);
}

export async function GET(request: NextRequest) {
  try {
    const force = request.nextUrl.searchParams.get('forceRefresh') === '1';
    const cacheKey = 'oil-seasonality:CL=F:10y:1d';

    if (!force) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return NextResponse.json({ success: true, data: cached.data, source: 'cache', lastUpdated: new Date(cached.timestamp).toISOString() });
      }
    }

    // Fetch up to ~10y of daily WTI Front Month futures (Yahoo symbol: CL=F)
    const hist = await fetchYahooHistory('CL=F', '10y', '1d');
    if (!hist || !hist.bars?.length) {
      throw new Error('No Yahoo history for CL=F');
    }

    // Group closes by calendar month across years
    const monthData: Record<number, { closes: number[]; dailyRets: number[] }>
      = Object.fromEntries(Array.from({length:12}, (_,i)=>[i,{closes:[],dailyRets:[]}])) as any;

    // Iterate bars, collect per-month closes and daily percentage changes
    let prevClose: number | null = null;
    for (const b of hist.bars) {
      const d = new Date(b.time);
      const m = d.getUTCMonth();
      const c = b.close;
      monthData[m].closes.push(c);
      if (prevClose && prevClose > 0) {
        monthData[m].dailyRets.push((c - prevClose) / prevClose);
      }
      prevClose = c;
    }

    // Compute per-month statistics
    const results: OilSeasonalityData[] = [];
    for (let m = 0; m < 12; m++) {
      const closes = monthData[m].closes;
      const rets = monthData[m].dailyRets;
      if (!closes.length) continue;
      const avg = closes.reduce((a,b)=>a+b,0) / closes.length;
      const min = Math.min(...closes);
      const max = Math.max(...closes);
      // annualized volatility proxy: stdev(daily) * sqrt(252) * 100
      const vol = stdev(rets) * Math.sqrt(252) * 100;
      results.push({
        month: MONTHS[m],
        monthNumber: m+1,
        averagePrice: Math.round(avg * 100) / 100,
        volatility: Math.round(vol * 10) / 10,
        historicalRange: { min: Math.round(min * 100) / 100, max: Math.round(max * 100) / 100 },
        seasonalTrend: 'neutral', // set below after we have all averages
        sampleSizeYears: Math.max(1, Math.round(closes.length / 20)) // ~20 trading days per month
      });
    }

    // Determine seasonalTrend relative to the median monthly average
    const avgPrices = results.map(r => r.averagePrice);
    const med = avgPrices.sort((a,b)=>a-b)[Math.floor(avgPrices.length/2)] || 0;
    const spread = (Math.max(...avgPrices) - Math.min(...avgPrices)) || 1;
    for (const r of results) {
      const z = (r.averagePrice - med) / spread; // simple relative position
      r.seasonalTrend = z > 0.1 ? 'bullish' : z < -0.1 ? 'bearish' : 'neutral';
    }

    // Sort by calendar order
    results.sort((a,b)=>a.monthNumber - b.monthNumber);

    const payload = {
      months: results,
      meta: {
        symbol: 'CL=F',
        range: '10y',
        interval: '1d',
        methodology: 'Per-month averages and annualized vol from Yahoo WTI front-month (CL=F) daily closes over ~10y',
        generatedAt: new Date().toISOString()
      }
    };

    cache.set(cacheKey, { data: payload.months, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: payload.months, source: 'Yahoo Finance (CL=F)', lastUpdated: new Date().toISOString() });
  } catch (error: any) {
    console.error('❌ Oil Seasonality error:', error?.message || error);
    return NextResponse.json({ success: false, data: [], error: error?.message || 'unknown error' }, { status: 500 });
  }
}
