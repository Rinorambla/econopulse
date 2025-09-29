import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooBatchQuotes } from '@/lib/yahoo-quote-batch';

interface RealEstateData {
  city: string;
  country: string;
  medianPrice: number;
  currency: string;
  unit: string;
  monthlyChange: number;
  yearlyChange: number;
  priceToIncomeRatio: number;
  affordabilityIndex: number;
  rentYield: number;
  vacancyRate: number;
  constructionIndex: number;
  mortgageRate: number;
  foreignBuyerShare: number;
  marketTrend: 'hot' | 'cooling' | 'stable' | 'declining';
  bubbleRisk: 'low' | 'medium' | 'high' | 'extreme';
  liquidity: number;
}

// Cache per evitare troppe richieste API
let cachedData: RealEstateData[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 6; // 6 ore

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
  const force = req.nextUrl.searchParams.get('forceRefresh') === '1';
    
    // Restituisci dati cache se ancora validi
  if (!force && cachedData && (now - lastFetchTime < CACHE_DURATION)) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        source: 'Global Property Guide/OECD (cached)',
        lastUpdated: new Date(lastFetchTime).toISOString()
      });
    }

    console.log('🏘️ Fetching real estate proxies (global REIT ETFs) via Yahoo...');

    const reitSymbols: Record<string,string> = {
      'New York':'VNQ', // US REIT
      'London':'IWDP.L', // Global property UCITS (placeholder)
      'Tokyo':'1343.T', // J-REIT ETF
      'Sydney':'SLF.AX', // AUS REIT ETF
      'Berlin':'XREA.DE', // DE REIT ETF placeholder
      'Dubai':'DFMGI', // Index placeholder
      'Shanghai':'508056.SS', // C-REIT sample placeholder
      'Mumbai':'RELIANCE.NS' // Proxy large cap dev (placeholder)
    };
    let yahooData: Record<string, any> = {};
    try {
      const quotes = await fetchYahooBatchQuotes(Object.values(reitSymbols));
      quotes.forEach(q=>{ yahooData[q.symbol]=q; });
      console.log('✅ REIT/Proxy quotes', quotes.length);
    } catch(e) { console.log('⚠️ REIT Yahoo fetch failed'); }

  // Dati immobiliari (prezzi derivati da ETF/indice proxy changePercent; fundamentals statiche)
  const baseData: RealEstateData[] = [
      {
        city: 'New York',
        country: 'United States',
    medianPrice: 1250000 * ((yahooData['VNQ']?.regularMarketChangePercent ?? 0)/100 + 1),
        currency: 'USD',
        unit: 'per unit',
        monthlyChange: -0.8,
        yearlyChange: -5.2,
        priceToIncomeRatio: 14.2,
        affordabilityIndex: 28,
        rentYield: 3.4,
        vacancyRate: 6.8,
        constructionIndex: 142,
        mortgageRate: 7.2,
        foreignBuyerShare: 18.4,
        marketTrend: 'cooling',
        bubbleRisk: 'high',
        liquidity: 85
      },
      {
        city: 'London',
        country: 'United Kingdom',
  medianPrice: 685000 * ((yahooData['IWDP.L']?.regularMarketChangePercent ?? 0)/100 + 1),
        currency: 'GBP',
        unit: 'per unit',
        monthlyChange: -1.2,
        yearlyChange: -8.6,
        priceToIncomeRatio: 16.8,
        affordabilityIndex: 22,
        rentYield: 2.8,
        vacancyRate: 4.2,
        constructionIndex: 98,
        mortgageRate: 5.8,
        foreignBuyerShare: 28.6,
        marketTrend: 'declining',
        bubbleRisk: 'high',
        liquidity: 92
      },
      {
        city: 'Tokyo',
        country: 'Japan',
  medianPrice: 52000000 * ((yahooData['1343.T']?.regularMarketChangePercent ?? 0)/100 + 1),
        currency: 'JPY',
        unit: 'per unit',
        monthlyChange: 0.4,
        yearlyChange: 2.8,
        priceToIncomeRatio: 12.4,
        affordabilityIndex: 45,
        rentYield: 4.2,
        vacancyRate: 8.9,
        constructionIndex: 105,
        mortgageRate: 1.2,
        foreignBuyerShare: 4.8,
        marketTrend: 'stable',
        bubbleRisk: 'medium',
        liquidity: 78
      },
      {
        city: 'Sydney',
        country: 'Australia',
  medianPrice: 1150000 * ((yahooData['SLF.AX']?.regularMarketChangePercent ?? 0)/100 + 1),
        currency: 'AUD',
        unit: 'per unit',
        monthlyChange: -2.4,
        yearlyChange: -12.8,
        priceToIncomeRatio: 18.6,
        affordabilityIndex: 18,
        rentYield: 2.6,
        vacancyRate: 3.2,
        constructionIndex: 86,
        mortgageRate: 6.4,
        foreignBuyerShare: 14.2,
        marketTrend: 'declining',
        bubbleRisk: 'extreme',
        liquidity: 68
      },
      {
        city: 'Shanghai',
        country: 'China',
  medianPrice: 5850000 * ((yahooData['508056.SS']?.regularMarketChangePercent ?? 0)/100 + 1),
        currency: 'CNY',
        unit: 'per unit',
        monthlyChange: -0.2,
        yearlyChange: -4.2,
        priceToIncomeRatio: 22.4,
        affordabilityIndex: 12,
        rentYield: 1.8,
        vacancyRate: 12.4,
        constructionIndex: 78,
        mortgageRate: 4.8,
        foreignBuyerShare: 2.1,
        marketTrend: 'cooling',
        bubbleRisk: 'extreme',
        liquidity: 42
      },
      {
        city: 'Dubai',
        country: 'UAE',
  medianPrice: 2450000 * ((yahooData['DFMGI']?.regularMarketChangePercent ?? 0)/100 + 1),
        currency: 'AED',
        unit: 'per unit',
        monthlyChange: 3.2,
        yearlyChange: 28.4,
        priceToIncomeRatio: 8.4,
        affordabilityIndex: 65,
        rentYield: 6.8,
        vacancyRate: 18.6,
        constructionIndex: 165,
        mortgageRate: 4.2,
        foreignBuyerShare: 68.4,
        marketTrend: 'hot',
        bubbleRisk: 'medium',
        liquidity: 58
      },
      {
        city: 'Berlin',
        country: 'Germany',
  medianPrice: 485000 * ((yahooData['XREA.DE']?.regularMarketChangePercent ?? 0)/100 + 1),
        currency: 'EUR',
        unit: 'per unit',
        monthlyChange: 0.8,
        yearlyChange: 4.2,
        priceToIncomeRatio: 11.2,
        affordabilityIndex: 52,
        rentYield: 3.6,
        vacancyRate: 2.8,
        constructionIndex: 118,
        mortgageRate: 4.1,
        foreignBuyerShare: 12.8,
        marketTrend: 'stable',
        bubbleRisk: 'medium',
        liquidity: 74
      },
      {
        city: 'Mumbai',
        country: 'India',
  medianPrice: 18500000 * ((yahooData['RELIANCE.NS']?.regularMarketChangePercent ?? 0)/100 + 1),
        currency: 'INR',
        unit: 'per unit',
        monthlyChange: 1.4,
        yearlyChange: 8.6,
        priceToIncomeRatio: 24.8,
        affordabilityIndex: 8,
        rentYield: 2.4,
        vacancyRate: 6.4,
        constructionIndex: 142,
        mortgageRate: 8.6,
        foreignBuyerShare: 1.2,
        marketTrend: 'hot',
        bubbleRisk: 'high',
        liquidity: 45
      }
    ];

    // Calcolo deterministico: monthlyChange = quotePercent (se disponibile), affordabilityIndex e rentYield statici
    const processedData = baseData.map(row => {
      // Quote percent already embedded in medianPrice formula; also expose it directly
      // We attempt to extract changePercent from yahooData symbol
      const symbol = reitSymbols[row.city];
      let pct = row.monthlyChange;
      if (symbol && yahooData[symbol]?.regularMarketChangePercent !== undefined) {
        pct = yahooData[symbol].regularMarketChangePercent;
      }
      return { ...row, monthlyChange: pct };
    });

    // Aggiorna cache
    cachedData = processedData;
    lastFetchTime = now;

    console.log('✅ Real estate data processed:', processedData.length, 'cities');

    return NextResponse.json({
      success: true,
      data: processedData,
      source: 'Yahoo Finance REIT/Index (price change) + Static Property Metrics',
      methodology: {
        medianPrice: 'Baseline * (1 + regularMarketChangePercent/100)',
        monthlyChange: 'regularMarketChangePercent from proxy symbol',
        fundamentals: 'Static placeholders until integration with OECD / national stats',
        note: 'No random adjustments applied'
      },
      lastUpdated: new Date().toISOString(),
      count: processedData.length
    });

  } catch (error) {
    console.error('❌ Error fetching real estate data:', error);
    
    // Fallback con dati di base
    const fallbackData: RealEstateData[] = [
      {
        city: 'New York',
        country: 'United States',
        medianPrice: 1250000,
        currency: 'USD',
        unit: 'per unit',
        monthlyChange: -0.8,
        yearlyChange: -5.2,
        priceToIncomeRatio: 14.2,
        affordabilityIndex: 28,
        rentYield: 3.4,
        vacancyRate: 6.8,
        constructionIndex: 142,
        mortgageRate: 7.2,
        foreignBuyerShare: 18.4,
        marketTrend: 'cooling',
        bubbleRisk: 'high',
        liquidity: 85
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
