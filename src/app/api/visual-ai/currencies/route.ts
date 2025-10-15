import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooBatchQuotes } from '@/lib/yahoo-quote-batch';

interface CurrencyData {
  currency: string;
  currencyCode: string;
  country: string;
  exchangeRate: number;
  baseCurrency: string;
  dailyChange: number;
  weeklyChange: number;
  monthlyChange: number;
  yearlyChange: number;
  volatility: number;
  strengthIndex: number;
  realExchangeRate: number;
  purchasingPowerParity: number;
  carryTradeRate: number;
  centralBankRate: number;
  inflationRate: number;
  currentAccountBalance: number;
  reservesLevel: number;
  trend: 'strengthening' | 'weakening' | 'stable';
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

// Cache per evitare troppe richieste API
let cachedData: CurrencyData[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 15; // 15 minuti per forex

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
  const force = req.nextUrl.searchParams.get('forceRefresh') === '1';
    
    // Restituisci dati cache se ancora validi
  if (!force && cachedData && (now - lastFetchTime < CACHE_DURATION)) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        source: 'Tiingo/OANDA Currency APIs (cached)',
        lastUpdated: new Date(lastFetchTime).toISOString()
      });
    }

    console.log('💰 Fetching FX spot proxies via Yahoo Finance...');
    const pairMap: Record<string,string> = {
      'EURUSD':'EURUSD=X',
      'GBPUSD':'GBPUSD=X',
      'USDJPY':'JPY=X',
      'AUDUSD':'AUDUSD=X',
      'USDCAD':'CAD=X',
      'USDCHF':'CHF=X',
      'NZDUSD':'NZDUSD=X',
      'USDCNY':'CNY=X'
    };
    let fxQuotes: Record<string, any> = {};
    try {
      const quotes = await fetchYahooBatchQuotes(Object.values(pairMap));
      quotes.forEach(q => fxQuotes[q.symbol] = q);
      console.log('✅ Yahoo FX quotes', quotes.length);
    } catch(e) { console.log('⚠️ Yahoo FX fetch failed'); }

  // Dati valutari (spot proxies vs USD). Prezzi = Yahoo; altri campi baseline documentati.
  const baseData: CurrencyData[] = [
      {
        currency: 'US Dollar',
        currencyCode: 'USD',
        country: 'United States',
        exchangeRate: 1.0000,
        baseCurrency: 'USD',
        dailyChange: 0.0,
        weeklyChange: 0.8,
        monthlyChange: 2.4,
        yearlyChange: 5.8,
        volatility: 8.2,
        strengthIndex: 100,
        realExchangeRate: 100,
        purchasingPowerParity: 100,
        carryTradeRate: 2.4,
        centralBankRate: 5.25,
        inflationRate: 3.2,
        currentAccountBalance: -3.8,
        reservesLevel: 243.2,
        trend: 'strengthening',
        sentiment: 'bullish'
      },
      {
        currency: 'Euro',
        currencyCode: 'EUR',
        country: 'Eurozone',
  exchangeRate: fxQuotes['EURUSD=X']?.regularMarketPrice ? 1/ fxQuotes['EURUSD=X'].regularMarketPrice : 0.9185,
        baseCurrency: 'USD',
        dailyChange: -0.4,
        weeklyChange: -1.2,
        monthlyChange: -2.8,
        yearlyChange: -8.4,
        volatility: 9.8,
        strengthIndex: 85,
        realExchangeRate: 88.4,
        purchasingPowerParity: 95.2,
        carryTradeRate: -1.8,
        centralBankRate: 4.50,
        inflationRate: 2.6,
        currentAccountBalance: 2.4,
        reservesLevel: 912.4,
        trend: 'weakening',
        sentiment: 'bearish'
      },
      {
        currency: 'Japanese Yen',
        currencyCode: 'JPY',
        country: 'Japan',
  exchangeRate: fxQuotes['JPY=X']?.regularMarketPrice ?? 148.65,
        baseCurrency: 'USD',
        dailyChange: 0.6,
        weeklyChange: 2.1,
        monthlyChange: -4.2,
        yearlyChange: -12.8,
        volatility: 12.4,
        strengthIndex: 68,
        realExchangeRate: 72.8,
        purchasingPowerParity: 108.4,
        carryTradeRate: -4.8,
        centralBankRate: -0.10,
        inflationRate: 3.4,
        currentAccountBalance: 1.8,
        reservesLevel: 1231.8,
        trend: 'weakening',
        sentiment: 'bearish'
      },
      {
        currency: 'British Pound',
        currencyCode: 'GBP',
        country: 'United Kingdom',
  exchangeRate: fxQuotes['GBPUSD=X']?.regularMarketPrice ? 1/ fxQuotes['GBPUSD=X'].regularMarketPrice : 0.8024,
        baseCurrency: 'USD',
        dailyChange: -0.2,
        weeklyChange: 0.4,
        monthlyChange: 1.8,
        yearlyChange: 2.4,
        volatility: 11.2,
        strengthIndex: 92,
        realExchangeRate: 89.6,
        purchasingPowerParity: 84.2,
        carryTradeRate: 0.8,
        centralBankRate: 5.25,
        inflationRate: 4.6,
        currentAccountBalance: -3.2,
        reservesLevel: 178.4,
        trend: 'stable',
        sentiment: 'neutral'
      },
      {
        currency: 'Chinese Yuan',
        currencyCode: 'CNY',
        country: 'China',
  exchangeRate: fxQuotes['CNY=X']?.regularMarketPrice ?? 7.2450,
        baseCurrency: 'USD',
        dailyChange: 0.1,
        weeklyChange: -0.6,
        monthlyChange: -1.4,
        yearlyChange: -4.8,
        volatility: 6.8,
        strengthIndex: 78,
        realExchangeRate: 82.4,
        purchasingPowerParity: 115.6,
        carryTradeRate: -1.2,
        centralBankRate: 3.45,
        inflationRate: 0.8,
        currentAccountBalance: 2.1,
        reservesLevel: 3224.8,
        trend: 'weakening',
        sentiment: 'bearish'
      },
      {
        currency: 'Swiss Franc',
        currencyCode: 'CHF',
        country: 'Switzerland',
  exchangeRate: fxQuotes['CHF=X']?.regularMarketPrice ? 1/ fxQuotes['CHF=X'].regularMarketPrice : 0.8895,
        baseCurrency: 'USD',
        dailyChange: 0.3,
        weeklyChange: 1.2,
        monthlyChange: 0.8,
        yearlyChange: 6.4,
        volatility: 8.9,
        strengthIndex: 105,
        realExchangeRate: 102.4,
        purchasingPowerParity: 78.2,
        carryTradeRate: -0.4,
        centralBankRate: 1.75,
        inflationRate: 1.4,
        currentAccountBalance: 8.2,
        reservesLevel: 894.2,
        trend: 'strengthening',
        sentiment: 'bullish'
      },
      {
        currency: 'Australian Dollar',
        currencyCode: 'AUD',
        country: 'Australia',
  exchangeRate: fxQuotes['AUDUSD=X']?.regularMarketPrice ? 1/ fxQuotes['AUDUSD=X'].regularMarketPrice : 1.5248,
        baseCurrency: 'USD',
        dailyChange: -0.8,
        weeklyChange: -1.8,
        monthlyChange: 2.4,
        yearlyChange: -6.2,
        volatility: 14.2,
        strengthIndex: 72,
        realExchangeRate: 74.8,
        purchasingPowerParity: 82.4,
        carryTradeRate: 1.8,
        centralBankRate: 4.35,
        inflationRate: 5.4,
        currentAccountBalance: 1.2,
        reservesLevel: 64.2,
        trend: 'weakening',
        sentiment: 'bearish'
      },
      {
        currency: 'Canadian Dollar',
        currencyCode: 'CAD',
        country: 'Canada',
  exchangeRate: fxQuotes['CAD=X']?.regularMarketPrice ?? 1.3485,
        baseCurrency: 'USD',
        dailyChange: -0.1,
        weeklyChange: 0.6,
        monthlyChange: 1.2,
        yearlyChange: -2.8,
        volatility: 9.6,
        strengthIndex: 82,
        realExchangeRate: 84.6,
        purchasingPowerParity: 87.2,
        carryTradeRate: 0.2,
        centralBankRate: 5.00,
        inflationRate: 2.8,
        currentAccountBalance: -2.4,
        reservesLevel: 106.8,
        trend: 'stable',
        sentiment: 'neutral'
      }
    ];

    // Calcoli deterministici: dailyChange = regularMarketChangePercent, volatility proxy da |daily| * 3 + baseline
    const processedData = baseData.map(row => {
      const symbolKey = (() => {
        switch(row.currencyCode) {
          case 'EUR': return 'EURUSD=X';
          case 'GBP': return 'GBPUSD=X';
          case 'JPY': return 'JPY=X';
          case 'AUD': return 'AUDUSD=X';
          case 'CAD': return 'CAD=X';
          case 'CHF': return 'CHF=X';
          case 'NZD': return 'NZDUSD=X';
          case 'CNY': return 'CNY=X';
          default: return undefined;
        }
      })();
      let pct = row.dailyChange;
      if (symbolKey && fxQuotes[symbolKey]?.regularMarketChangePercent !== undefined) {
        pct = fxQuotes[symbolKey].regularMarketChangePercent;
      }
      const volatility = Math.round(Math.min(40, Math.max(5, Math.abs(pct) * 3 + 5))*10)/10;
      // StrengthIndex adjust: baseline +/- pct * 2
      const strengthIndex = Math.max(40, Math.min(120, row.strengthIndex + pct * 2));
      return { ...row, dailyChange: pct, volatility, strengthIndex };
    });

    // Aggiorna cache
    cachedData = processedData;
    lastFetchTime = now;

    console.log('✅ Currency data processed:', processedData.length, 'currencies');

    return NextResponse.json({
      success: true,
      data: processedData,
      source: 'Yahoo Finance FX (price/change) + Static Macro Proxies',
      methodology: {
        exchangeRate: 'Yahoo Finance pair quote (regularMarketPrice)',
        dailyChange: 'regularMarketChangePercent from quote',
        volatility: '|dailyChange| * 3 + 5 (bounded 5-40)',
        strengthIndex: 'Baseline strengthIndex adjusted by dailyChange * 2',
        staticFields: 'Macro fundamentals placeholders until integrated with central bank / IMF datasets'
      },
      lastUpdated: new Date().toISOString(),
      count: processedData.length
    });

  } catch (error) {
    console.error('❌ Error fetching currency data:', error);
    
    // Fallback con dati di base
    const fallbackData: CurrencyData[] = [
      {
        currency: 'US Dollar',
        currencyCode: 'USD',
        country: 'United States',
        exchangeRate: 1.0000,
        baseCurrency: 'USD',
        dailyChange: 0.0,
        weeklyChange: 0.8,
        monthlyChange: 2.4,
        yearlyChange: 5.8,
        volatility: 8.2,
        strengthIndex: 100,
        realExchangeRate: 100,
        purchasingPowerParity: 100,
        carryTradeRate: 2.4,
        centralBankRate: 5.25,
        inflationRate: 3.2,
        currentAccountBalance: -3.8,
        reservesLevel: 243.2,
        trend: 'strengthening',
        sentiment: 'bullish'
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
