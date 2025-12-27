import { NextResponse } from 'next/server';
import { getYahooQuotes } from '@/lib/yahooFinance';

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
function calculateHistoricalPrice(currentPrice: number, changePercent: number, period: '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y'): number {
  // For demo: use current price and change% to back-calculate
  // In production, fetch actual historical data
  const multiplier = 1 + (changePercent / 100);
  return currentPrice / multiplier;
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

      const holdings = MOCK_HOLDINGS[ticker] || [];
      const holdingTickers = holdings.map(h => h.ticker);
      
      // Fetch real-time quotes for holdings
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
        const quotes = await getYahooQuotes(holdingTickers);
        holdingsData = holdings.map(h => {
          const quote = quotes.find(q => q.ticker === h.ticker);
          const currentPrice = quote?.price || 0;
          const changePercent = quote?.changePercent || 0;
          const change = quote?.change || 0;
          
          // Calculate last price based on period (simplified for demo)
          const lastPrice = currentPrice - change;
          
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

    // Fetch ETF overview data
    const symbols = SECTOR_ETFS.map(e => e.ticker);
    const quotes = await getYahooQuotes(symbols);

    const etfData = SECTOR_ETFS.map(etf => {
      const quote = quotes.find(q => q.ticker === etf.ticker);
      const currentPrice = quote?.price || 0;
      const changePercent = quote?.changePercent || 0;
      const change = quote?.change || 0;
      
      // Calculate last price based on period
      const lastPrice = currentPrice - change;

      return {
        ticker: etf.ticker,
        sector: etf.sector,
        closingPrice: currentPrice,
        lastPrice,
        change,
        changePercent,
        volume: quote?.volume || 0,
        marketCap: quote?.marketCap || 0,
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
