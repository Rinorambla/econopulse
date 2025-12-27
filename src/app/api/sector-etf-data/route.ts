import { NextResponse } from 'next/server';
import { getYahooQuotes } from '@/lib/yahooFinance';
import { env } from '@/lib/env';

// Helper function to fetch from Tiingo
async function getTiingoQuote(symbol: string) {
  const apiKey = env.TIINGO_API_KEY;
  if (!apiKey) return null;
  
  try {
    const response = await fetch(
      `https://api.tiingo.com/tiingo/daily/${symbol}/prices?token=${apiKey}`,
      { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store'
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.length > 0) {
      const quote = data[0];
      return {
        ticker: symbol,
        price: quote.close || quote.adjClose || 0,
        change: (quote.close - quote.prevClose) || 0,
        changePercent: quote.prevClose ? ((quote.close - quote.prevClose) / quote.prevClose) * 100 : 0,
        volume: quote.volume || 0,
        high: quote.high || 0,
        low: quote.low || 0,
        open: quote.open || 0,
        prevClose: quote.prevClose || 0,
      };
    }
    return null;
  } catch (error) {
    console.warn(`Tiingo fetch error for ${symbol}:`, error);
    return null;
  }
}

// Helper to fetch historical data for period calculations
async function getTiingoHistorical(symbol: string, daysBack: number) {
  const apiKey = env.TIINGO_API_KEY;
  if (!apiKey) return null;
  
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);
    
    const response = await fetch(
      `https://api.tiingo.com/tiingo/daily/${symbol}/prices?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&token=${apiKey}`,
      { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store'
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn(`Tiingo historical error for ${symbol}:`, error);
    return null;
  }
}

// Sector SPDR ETFs with metadata
const SECTOR_ETFS = [
  { ticker: 'XLP', sector: 'Consumer Staples' },
  { ticker: 'XLRE', sector: 'Real Estate' },
  { ticker: 'XLC', sector: 'Communication Services' },
  { ticker: 'XLF', sector: 'Financials' },
  { ticker: 'XLV', sector: 'Health Care' },
  { ticker: 'XLU', sector: 'Utilities' },
  { ticker: 'XLY', sector: 'Consumer Discretionary' },
  { ticker: 'XLI', sector: 'Industrials' },
  { ticker: 'XLK', sector: 'Information Technology' },
  { ticker: 'XLB', sector: 'Materials' },
  { ticker: 'XLE', sector: 'Energy' },
  { ticker: 'SPYM', sector: 'S&P 500® ETF' },
];

// Mock holdings data for each ETF (in production, fetch from Yahoo Finance API or holdings data provider)
const MOCK_HOLDINGS: Record<string, Array<{ ticker: string; name: string; weight: number }>> = {
  XLP: [
    { ticker: 'TGT', name: 'TARGET CORP', weight: 3.00 },
    { ticker: 'DLTR', name: 'DOLLAR TREE INC', weight: 1.58 },
    { ticker: 'COST', name: 'COSTCO WHOLESALE CORP', weight: 8.98 },
    { ticker: 'LW', name: 'LAMB WESTON HOLDINGS INC', weight: 0.40 },
    { ticker: 'KHC', name: 'KRAFT HEINZ CO/THE', weight: 1.40 },
    { ticker: 'SJM', name: 'JM SMUCKER CO/THE', weight: 0.72 },
    { ticker: 'CPB', name: 'THE CAMPBELL S COMPANY', weight: 0.38 },
    { ticker: 'HSY', name: 'HERSHEY CO/THE', weight: 1.87 },
    { ticker: 'KVUE', name: 'KENVUE INC', weight: 2.25 },
    { ticker: 'HRL', name: 'HORMEL FOODS CORP', weight: 0.49 },
    { ticker: 'KR', name: 'KROGER CO', weight: 2.62 },
    { ticker: 'KMB', name: 'KIMBERLY CLARK CORP', weight: 2.29 },
    { ticker: 'BF.B', name: 'BROWN FORMAN CORP CLASS B', weight: 0.32 },
    { ticker: 'PG', name: 'PROCTER + GAMBLE CO/THE', weight: 7.85 },
    { ticker: 'STZ', name: 'CONSTELLATION BRANDS INC A', weight: 1.35 },
    { ticker: 'DG', name: 'DOLLAR GENERAL CORP', weight: 2.04 },
    { ticker: 'MDLZ', name: 'MONDELEZ INTERNATIONAL INC A', weight: 4.52 },
    { ticker: 'TSN', name: 'TYSON FOODS INC CL A', weight: 1.13 },
    { ticker: 'CLX', name: 'CLOROX COMPANY', weight: 0.82 },
    { ticker: 'GIS', name: 'GENERAL MILLS INC', weight: 1.71 },
  ],
  XLE: [
    { ticker: 'XOM', name: 'EXXON MOBIL CORP', weight: 22.50 },
    { ticker: 'CVX', name: 'CHEVRON CORP', weight: 15.30 },
    { ticker: 'COP', name: 'CONOCOPHILLIPS', weight: 7.80 },
    { ticker: 'SLB', name: 'SCHLUMBERGER NV', weight: 4.20 },
    { ticker: 'EOG', name: 'EOG RESOURCES INC', weight: 4.10 },
  ],
  XLF: [
    { ticker: 'BRK.B', name: 'BERKSHIRE HATHAWAY INC B', weight: 12.80 },
    { ticker: 'JPM', name: 'JPMORGAN CHASE & CO', weight: 10.50 },
    { ticker: 'V', name: 'VISA INC CLASS A', weight: 7.90 },
    { ticker: 'MA', name: 'MASTERCARD INC A', weight: 6.50 },
    { ticker: 'BAC', name: 'BANK OF AMERICA CORP', weight: 4.70 },
  ],
  XLK: [
    { ticker: 'AAPL', name: 'APPLE INC', weight: 22.10 },
    { ticker: 'MSFT', name: 'MICROSOFT CORP', weight: 21.30 },
    { ticker: 'NVDA', name: 'NVIDIA CORP', weight: 15.40 },
    { ticker: 'AVGO', name: 'BROADCOM INC', weight: 4.80 },
    { ticker: 'ORCL', name: 'ORACLE CORP', weight: 3.20 },
  ],
  XLV: [
    { ticker: 'UNH', name: 'UNITEDHEALTH GROUP INC', weight: 10.20 },
    { ticker: 'LLY', name: 'ELI LILLY & CO', weight: 9.80 },
    { ticker: 'JNJ', name: 'JOHNSON & JOHNSON', weight: 7.50 },
    { ticker: 'ABBV', name: 'ABBVIE INC', weight: 5.60 },
    { ticker: 'MRK', name: 'MERCK & CO INC', weight: 4.90 },
  ],
};

// Helper to calculate historical prices for different periods
function getPeriodDays(period: string): number {
  const periodMap: Record<string, number> = {
    '1D': 2,
    '5D': 7,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    'YTD': Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)),
    '1Y': 365,
    '5Y': 1825,
  };
  return periodMap[period] || 2;
}

async function calculatePeriodPerformance(symbol: string, period: string, currentPrice: number) {
  // For 1D, use simple daily change (already included in quote)
  if (period === '1D') {
    return null; // Use the quote's built-in daily change
  }
  
  const daysBack = getPeriodDays(period);
  const historical = await getTiingoHistorical(symbol, daysBack + 5); // Get extra days for safety
  
  if (historical && historical.length >= 2) {
    // Ensure chronological order (oldest first)
    try {
      historical.sort((a: any, b: any) => {
        const da = new Date(a.date || a.datetime || a.time || a.timestamp || 0).getTime();
        const db = new Date(b.date || b.datetime || b.time || b.timestamp || 0).getTime();
        return da - db;
      });
    } catch {}
    // Get the oldest price in the range (first element after sort)
    const oldestData = historical[0];
    const oldPrice = oldestData.close || oldestData.adjClose || 0;
    
    if (oldPrice > 0) {
      const change = currentPrice - oldPrice;
      const changePercent = (change / oldPrice) * 100;
      return { lastPrice: oldPrice, change, changePercent };
    }
  }
  
  // Fallback: no change
  return null;
}

// Try to fetch full ETF holdings from SPDR (SSGA) API
async function fetchSPDRHoldings(etf: string): Promise<Array<{ ticker: string; name: string; weight: number }>> {
  try {
    const url = `https://www.ssga.com/api/etf/v1/data/holdings?fund=${encodeURIComponent(etf)}&region=us&locale=en`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; EconopulseBot/1.0)'
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const js = await res.json();
    const rows = js?.holdings || js?.fund?.holdings || js?.data || [];
    if (!Array.isArray(rows) || !rows.length) return [];
    return rows.map((r: any) => ({
      ticker: (r.ticker || r.identifier || r.securityTicker || '').toUpperCase(),
      name: r.name || r.securityName || r.holdingName || '',
      weight: Number(r.weight || r.weightPercent || r.portfolioPercent || 0)
    })).filter(h => h.ticker && h.name);
  } catch {
    return [];
  }
}

// Yahoo Finance quoteSummary topHoldings fallback (may return partial list)
async function fetchYahooTopHoldings(etf: string): Promise<Array<{ ticker: string; name: string; weight: number }>> {
  try {
    const modules = ['topHoldings','fundProfile'].join(',');
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(etf)}?modules=${modules}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconopulseBot/1.0)' },
      cache: 'no-store',
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const js = await res.json();
    const r = js?.quoteSummary?.result?.[0];
    const th = r?.topHoldings || {};
    const list = th.holdings || th.stockHoldings || th.equityHoldings || [];
    if (!Array.isArray(list) || !list.length) return [];
    return list.map((h: any) => ({
      ticker: (h.symbol || h.ticker || '').toUpperCase(),
      name: h.holdingName || h.holding || h.name || h.shortName || '',
      weight: Number(h.holdingPercent || h.weight || 0)
    })).filter(h => h.ticker && h.name);
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '1D';
    const ticker = searchParams.get('ticker'); // If provided, return holdings for this ETF

    // If ticker is specified, return holdings data
    if (ticker) {
      const etf = SECTOR_ETFS.find(e => e.ticker === ticker);
      if (!etf) {
        return NextResponse.json({ error: 'ETF not found' }, { status: 404 });
      }

      // Fetch full holdings: SPDR first, Yahoo fallback, then mock if all else fails
      let holdings = await fetchSPDRHoldings(ticker);
      if (!holdings.length) {
        holdings = await fetchYahooTopHoldings(ticker);
      }
      // Final fallback to existing mock snippet to avoid empty responses
      if (!holdings.length) {
        holdings = (MOCK_HOLDINGS[ticker] || []).slice();
      }

      const holdingTickers = holdings.map(h => h.ticker);
      
      // Fetch real-time quotes for holdings using Tiingo first, then Yahoo as fallback
      let holdingsData: Array<{
        ticker: string;
        name: string;
        weight: number;
        closingPrice: number;
        lastPrice: number;
        change: number;
        changePercent: number;
      }> = [];
      
      if (holdingTickers.length > 0) {
        // Try Tiingo first for each holding
        const quotesPromises = holdingTickers.map(async (t) => {
          const tiingoQuote = await getTiingoQuote(t);
          if (tiingoQuote) {
            // For 1D, use daily change
            if (period === '1D') {
              return tiingoQuote;
            }
            
            // For other periods, calculate period performance
            const periodPerf = await calculatePeriodPerformance(t, period, tiingoQuote.price);
            if (periodPerf) {
              return {
                ...tiingoQuote,
                lastPrice: periodPerf.lastPrice,
                change: periodPerf.change,
                changePercent: periodPerf.changePercent,
              };
            }
            return tiingoQuote;
          }
          
          // Fallback to Yahoo
          const yahooQuotes = await getYahooQuotes([t]);
          return yahooQuotes[0] || null;
        });
        
        const quotes = await Promise.all(quotesPromises);
        
        holdingsData = holdings.map((h, idx) => {
          const quote = quotes[idx];
          if (!quote) {
            return {
              ticker: h.ticker,
              name: h.name,
              weight: h.weight,
              closingPrice: 0,
              lastPrice: 0,
              change: 0,
              changePercent: 0,
            };
          }
          
          const currentPrice = quote.price || 0;
          const changePercent = quote.changePercent || 0;
          const change = quote.change || 0;
          const lastPrice = 'lastPrice' in quote ? quote.lastPrice : (currentPrice - change);
          
          return {
            ticker: h.ticker,
            name: h.name,
            weight: h.weight,
            closingPrice: currentPrice,
            lastPrice,
            change,
            changePercent,
          };
        });
      }

      return NextResponse.json({
        ticker: etf.ticker,
        sector: etf.sector,
        holdings: holdingsData,
        totalHoldings: holdings.length,
        lastUpdated: new Date().toISOString(),
      });
    }

    // Fetch ETF overview data with proper period performance
    const symbols = SECTOR_ETFS.map(e => e.ticker);
    
    // Fetch quotes with Tiingo first, Yahoo as fallback
    const quotesPromises = symbols.map(async (symbol) => {
      const tiingoQuote = await getTiingoQuote(symbol);
      if (tiingoQuote) {
        // For 1D, use the quote's own daily change
        if (period === '1D') {
          return tiingoQuote;
        }
        
        // For other periods, calculate period-specific performance
        const periodPerf = await calculatePeriodPerformance(symbol, period, tiingoQuote.price);
        if (periodPerf) {
          return {
            ...tiingoQuote,
            lastPrice: periodPerf.lastPrice,
            change: periodPerf.change,
            changePercent: periodPerf.changePercent,
          };
        }
        // If period calc fails, use daily change
        return tiingoQuote;
      }
      
      // Fallback to Yahoo
      const yahooQuotes = await getYahooQuotes([symbol]);
      return yahooQuotes[0] || null;
    });
    
    const quotes = await Promise.all(quotesPromises);

    const etfData = SECTOR_ETFS.map((etf, idx) => {
      const quote = quotes[idx];
      if (!quote) {
        return {
          ticker: etf.ticker,
          sector: etf.sector,
          closingPrice: 0,
          lastPrice: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          marketCap: 0,
        };
      }
      
      const currentPrice = quote.price || 0;
      const changePercent = quote.changePercent || 0;
      const change = quote.change || 0;
      const lastPrice = 'lastPrice' in quote ? quote.lastPrice : (currentPrice - change);

      return {
        ticker: etf.ticker,
        sector: etf.sector,
        closingPrice: currentPrice,
        lastPrice,
        change,
        changePercent,
        volume: quote.volume || 0,
        marketCap: 0,
      };
    });

    // Sort by performance (changePercent descending)
    etfData.sort((a, b) => b.changePercent - a.changePercent);

    return NextResponse.json({
      etfs: etfData,
      period,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sector ETF data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sector ETF data' },
      { status: 500 }
    );
  }
}
