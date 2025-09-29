import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooBatchQuotes } from '@/lib/yahoo-quote-batch';

interface EnergyData {
  commodity: string;
  price: number;
  currency: string;
  unit: string;
  dailyChange: number;
  weeklyChange: number;
  monthlyChange: number;
  yearlyChange: number;
  volatility: number;
  inventoryLevel: number;
  productionRate: number;
  consumption: number;
  majorProducers: string[];
  geopoliticalRisk: 'low' | 'medium' | 'high' | 'critical';
  seasonalTrend: 'bullish' | 'bearish' | 'neutral';
}

// Cache per evitare troppe richieste API
let cachedData: EnergyData[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minuti

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
  const force = req.nextUrl.searchParams.get('forceRefresh') === '1';
    
    // Restituisci dati cache se ancora validi
  if (!force && cachedData && (now - lastFetchTime < CACHE_DURATION)) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        source: 'EIA/IEA Energy APIs (cached)',
        lastUpdated: new Date(lastFetchTime).toISOString()
      });
    }

    console.log('⚡ Fetching energy benchmark quotes via Yahoo Finance...');

    // Map commodities to representative Yahoo symbols (ETF or futures continuous)
    const symbolMap: Record<string,string> = {
      'Crude Oil (WTI)': 'CL=F',
      'Brent Oil': 'BZ=F',
      'Natural Gas (Henry Hub)': 'NG=F',
      'Gasoline (RBOB)': 'RB=F',
      'Heating Oil': 'HO=F',
      'Uranium (U3O8)': 'URA' // ETF proxy
    };
    let yahooData: Record<string, any> = {};
    try {
      const quotes = await fetchYahooBatchQuotes(Object.values(symbolMap));
      quotes.forEach(q => { yahooData[q.symbol] = q; });
      console.log('✅ Energy Yahoo quotes', quotes.length);
    } catch(e) {
      console.log('⚠️ Energy Yahoo fetch failed, using static pricing base');
    }

  // Dati energetici (proxies real-time: prezzi da Yahoo; altri campi statici/documentati)
  const baseData: EnergyData[] = [
      {
        commodity: 'Crude Oil (WTI)',
    price: yahooData['CL=F']?.regularMarketPrice ?? 82.45,
        currency: 'USD',
        unit: '$/barrel',
        dailyChange: 1.2,
        weeklyChange: 3.4,
        monthlyChange: -2.8,
        yearlyChange: 15.6,
        volatility: 28.4,
        inventoryLevel: 456.2, // million barrels
        productionRate: 12.8, // million bpd
        consumption: 20.4, // million bpd
        majorProducers: ['USA', 'Saudi Arabia', 'Russia', 'Canada', 'Iraq'],
        geopoliticalRisk: 'high',
        seasonalTrend: 'bullish'
      },
      {
        commodity: 'Brent Oil',
  price: yahooData['BZ=F']?.regularMarketPrice ?? 86.12,
        currency: 'USD',
        unit: '$/barrel',
        dailyChange: 0.8,
        weeklyChange: 2.9,
        monthlyChange: -1.4,
        yearlyChange: 18.2,
        volatility: 26.8,
        inventoryLevel: 289.4, // million barrels
        productionRate: 28.6, // million bpd
        consumption: 29.2, // million bpd
        majorProducers: ['Saudi Arabia', 'Russia', 'Iraq', 'UAE', 'Kuwait'],
        geopoliticalRisk: 'high',
        seasonalTrend: 'bullish'
      },
      {
        commodity: 'Natural Gas (Henry Hub)',
  price: yahooData['NG=F']?.regularMarketPrice ?? 2.68,
        currency: 'USD',
        unit: '$/MMBtu',
        dailyChange: -2.4,
        weeklyChange: -5.8,
        monthlyChange: 12.4,
        yearlyChange: -45.2,
        volatility: 42.6,
        inventoryLevel: 3248, // Bcf
        productionRate: 102.4, // Bcf/d
        consumption: 89.6, // Bcf/d
        majorProducers: ['USA', 'Russia', 'Iran', 'Qatar', 'Australia'],
        geopoliticalRisk: 'medium',
        seasonalTrend: 'bearish'
      },
      {
        commodity: 'Coal (Newcastle)',
        price: 128.50,
        currency: 'USD',
        unit: '$/tonne',
        dailyChange: 0.4,
        weeklyChange: 2.1,
        monthlyChange: 8.4,
        yearlyChange: -28.6,
        volatility: 35.2,
        inventoryLevel: 18.6, // million tonnes
        productionRate: 8.2, // billion tonnes/year
        consumption: 8.0, // billion tonnes/year
        majorProducers: ['China', 'India', 'Indonesia', 'Australia', 'Russia'],
        geopoliticalRisk: 'medium',
        seasonalTrend: 'neutral'
      },
      {
        commodity: 'Gasoline (RBOB)',
  price: yahooData['RB=F']?.regularMarketPrice ?? 2.48,
        currency: 'USD',
        unit: '$/gallon',
        dailyChange: 1.8,
        weeklyChange: 4.2,
        monthlyChange: -1.8,
        yearlyChange: 22.4,
        volatility: 32.8,
        inventoryLevel: 225.4, // million barrels
        productionRate: 9.8, // million bpd
        consumption: 9.2, // million bpd
        majorProducers: ['USA', 'China', 'India', 'Russia', 'Japan'],
        geopoliticalRisk: 'medium',
        seasonalTrend: 'bullish'
      },
      {
        commodity: 'Heating Oil',
  price: yahooData['HO=F']?.regularMarketPrice ?? 2.94,
        currency: 'USD',
        unit: '$/gallon',
        dailyChange: 0.6,
        weeklyChange: 2.8,
        monthlyChange: -0.9,
        yearlyChange: 19.8,
        volatility: 29.4,
        inventoryLevel: 115.6, // million barrels
        productionRate: 4.8, // million bpd
        consumption: 3.6, // million bpd
        majorProducers: ['USA', 'Russia', 'China', 'India', 'Saudi Arabia'],
        geopoliticalRisk: 'medium',
        seasonalTrend: 'neutral'
      },
      {
        commodity: 'Uranium (U3O8)',
  price: yahooData['URA']?.regularMarketPrice ?? 64.25,
        currency: 'USD',
        unit: '$/lb',
        dailyChange: 2.1,
        weeklyChange: 6.8,
        monthlyChange: 18.4,
        yearlyChange: 52.8,
        volatility: 38.6,
        inventoryLevel: 2.4, // million lbs
        productionRate: 140, // million lbs/year
        consumption: 180, // million lbs/year
        majorProducers: ['Kazakhstan', 'Australia', 'Namibia', 'Canada', 'Uzbekistan'],
        geopoliticalRisk: 'high',
        seasonalTrend: 'bullish'
      }
    ];

    // Calcoli deterministici senza randomness
    const processedData = baseData.map(row => {
      // Usa percentuale di variazione giornaliera reale se disponibile dal quote (regularMarketChangePercent)
      const quoteSymbol = symbolMap[row.commodity] || Object.keys(symbolMap).find(k=>k===row.commodity);
      let pct = 0;
      if (quoteSymbol) {
        const q = yahooData[ symbolMap[row.commodity] ];
        if (q?.regularMarketChangePercent !== undefined) pct = q.regularMarketChangePercent;
      }
      const dailyChange = pct !== 0 ? pct : row.dailyChange; // fallback statico
      // Volatility proxy = (|dailyChange| * 8) bounded + baseline
      const volatility = Math.round(Math.min(80, Math.max(10, Math.abs(dailyChange) * 8 + 12))*10)/10;
      return {
        ...row,
        dailyChange,
        volatility
      };
    });

    // Aggiorna cache
    cachedData = processedData;
    lastFetchTime = now;

    console.log('✅ Energy market data processed:', processedData.length, 'commodities');

    return NextResponse.json({
      success: true,
      data: processedData,
      source: Object.keys(yahooData).length? 'Yahoo Finance Futures/ETF (price) + Static Fundamental Proxies':'Static Energy Dataset (no live quotes)',
      methodology: {
        price: 'Direct from Yahoo Finance symbol',
        dailyChange: 'regularMarketChangePercent or static baseline',
        volatility: '|dailyChange| * 8 + 12 (bounded 10-80)',
        fundamentals: 'Static reference values (to be replaced with EIA/IEA)'
      },
      lastUpdated: new Date().toISOString(),
      count: processedData.length
    });

  } catch (error) {
    console.error('❌ Error fetching energy data:', error);
    
    // Fallback con dati di base
    const fallbackData: EnergyData[] = [
      {
        commodity: 'Crude Oil (WTI)',
        price: 82.45,
        currency: 'USD',
        unit: '$/barrel',
        dailyChange: 1.2,
        weeklyChange: 3.4,
        monthlyChange: -2.8,
        yearlyChange: 15.6,
        volatility: 28.4,
        inventoryLevel: 456.2,
        productionRate: 12.8,
        consumption: 20.4,
        majorProducers: ['USA', 'Saudi Arabia', 'Russia'],
        geopoliticalRisk: 'high',
        seasonalTrend: 'bullish'
      }
    ];

    return NextResponse.json({
      success: false,
      data: fallbackData,
      source: 'Fallback data (API error)',
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
