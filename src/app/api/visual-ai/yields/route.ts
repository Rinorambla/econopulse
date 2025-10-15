import { NextRequest, NextResponse } from 'next/server';

interface YieldCurveData {
  maturity: string;
  us: number;
  eu: number;
  em: number;
}

// Cache per evitare troppe richieste API
let cachedData: YieldCurveData[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minuti

export async function GET() {
  try {
    const now = Date.now();
    
    // Restituisci dati cache se ancora validi
    if (cachedData && (now - lastFetchTime < CACHE_DURATION)) {
      return NextResponse.json({
        data: cachedData,
        source: 'FRED API (cached)',
        lastUpdated: new Date(lastFetchTime).toISOString()
      });
    }

    console.log('📈 Fetching REAL yield curve data from FRED API...');

    // FRED API key - Dovresti aggiungere la tua API key nelle variabili d'ambiente
    const FRED_API_KEY = process.env.FRED_API_KEY || '';
    
    if (!FRED_API_KEY) {
      console.warn('⚠️  FRED_API_KEY not found, using fallback data');
      return getFallbackYieldData();
    }

    // Serie FRED per i rendimenti USA
    const fredSeries = {
      '3M': 'DGS3MO',   // 3-Month Treasury
      '6M': 'DGS6MO',   // 6-Month Treasury  
      '1Y': 'DGS1',     // 1-Year Treasury
      '2Y': 'DGS2',     // 2-Year Treasury
      '5Y': 'DGS5',     // 5-Year Treasury
      '10Y': 'DGS10',   // 10-Year Treasury
      '30Y': 'DGS30'    // 30-Year Treasury
    };

    // Fetch dati USA da FRED
    const usYields: Record<string, number> = {};
    
    for (const [maturity, series] of Object.entries(fredSeries)) {
      try {
        const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`;
        
        const response = await fetch(fredUrl, {
          headers: {
            'User-Agent': 'EconoPulse-Dashboard/1.0',
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.observations && data.observations.length > 0) {
            const latestValue = parseFloat(data.observations[0].value);
            if (!isNaN(latestValue)) {
              usYields[maturity] = latestValue;
            }
          }
        }
        
        // Piccolo delay per non sovraccaricare l'API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error fetching ${maturity} yield:`, error);
      }
    }

    console.log('📊 US yields fetched:', Object.keys(usYields).length, 'maturities');

    // Per ora usiamo stime per EU e EM basate su spread tipici
    const estimateEuYields = (usYield: number, maturity: string): number => {
      // EU generalmente ha rendimenti più bassi degli USA
      const spreads: Record<string, number> = {
        '3M': -1.5, '6M': -1.3, '1Y': -1.0, '2Y': -0.8, 
        '5Y': -0.6, '10Y': -0.4, '30Y': -0.2
      };
      return Math.max(0, usYield + (spreads[maturity] || -0.5));
    };

    const estimateEmYields = (usYield: number, maturity: string): number => {
      // EM generalmente ha rendimenti più alti degli USA (premio per il rischio)
      const spreads: Record<string, number> = {
        '3M': 2.0, '6M': 2.2, '1Y': 2.5, '2Y': 2.8, 
        '5Y': 3.0, '10Y': 3.2, '30Y': 3.5
      };
      return usYield + (spreads[maturity] || 2.5);
    };

    // Costruisci i dati finali
    const processedData: YieldCurveData[] = [];
    const maturities = ['3M', '6M', '1Y', '2Y', '5Y', '10Y', '30Y'];

    for (const maturity of maturities) {
      const usYield = usYields[maturity];
      if (usYield !== undefined) {
        processedData.push({
          maturity,
          us: usYield,
          eu: estimateEuYields(usYield, maturity),
          em: estimateEmYields(usYield, maturity)
        });
      }
    }

    // Se non abbiamo abbastanza dati reali, usa fallback
    if (processedData.length < 4) {
      console.warn('⚠️  Insufficient real data, using fallback');
      return getFallbackYieldData();
    }

    console.log('✅ Processed yield curve data:', processedData.length, 'maturities');

    // Aggiorna cache
    cachedData = processedData;
    lastFetchTime = now;

    return NextResponse.json({
      data: processedData,
      source: 'FRED API + estimates',
      lastUpdated: new Date().toISOString(),
      count: processedData.length
    });

  } catch (error) {
    console.error('❌ Error fetching yield curve data:', error);
    return getFallbackYieldData();
  }
}

function getFallbackYieldData() {
  // Dati realistici basati su condizioni di mercato recenti
  const fallbackData: YieldCurveData[] = [
    { maturity: '3M', us: 5.25, eu: 3.75, em: 7.25 },
    { maturity: '6M', us: 5.15, eu: 3.65, em: 7.15 },
    { maturity: '1Y', us: 4.95, eu: 3.45, em: 6.95 },
    { maturity: '2Y', us: 4.65, eu: 3.15, em: 6.65 },
    { maturity: '5Y', us: 4.25, eu: 2.85, em: 6.25 },
    { maturity: '10Y', us: 4.35, eu: 2.95, em: 6.35 },
    { maturity: '30Y', us: 4.45, eu: 3.05, em: 6.45 }
  ];

  return NextResponse.json({
    data: fallbackData,
    source: 'Fallback data (realistic estimates)',
    lastUpdated: new Date().toISOString(),
    count: fallbackData.length
  });
}
