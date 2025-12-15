import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/sector-stocks?sector=Technology
 * 
 * Returns top stocks for a given sector with performance metrics.
 * This allows users to see individual equities they can invest in
 * based on sector performance from AI Portfolio recommendations.
 */

// Top stocks by sector (curated list of liquid, major names)
const SECTOR_STOCKS: Record<string, Array<{ ticker: string; name: string; weight?: number }>> = {
  Technology: [
    { ticker: 'AAPL', name: 'Apple Inc.', weight: 15 },
    { ticker: 'MSFT', name: 'Microsoft Corp.', weight: 15 },
    { ticker: 'NVDA', name: 'NVIDIA Corp.', weight: 12 },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', weight: 10 },
    { ticker: 'META', name: 'Meta Platforms Inc.', weight: 8 },
    { ticker: 'AVGO', name: 'Broadcom Inc.', weight: 7 },
    { ticker: 'ORCL', name: 'Oracle Corp.', weight: 6 },
    { ticker: 'CSCO', name: 'Cisco Systems Inc.', weight: 5 },
    { ticker: 'ADBE', name: 'Adobe Inc.', weight: 5 },
    { ticker: 'CRM', name: 'Salesforce Inc.', weight: 5 },
    { ticker: 'INTC', name: 'Intel Corp.', weight: 4 },
    { ticker: 'AMD', name: 'Advanced Micro Devices', weight: 4 },
    { ticker: 'NOW', name: 'ServiceNow Inc.', weight: 4 },
  ],
  Healthcare: [
    { ticker: 'UNH', name: 'UnitedHealth Group', weight: 12 },
    { ticker: 'JNJ', name: 'Johnson & Johnson', weight: 11 },
    { ticker: 'LLY', name: 'Eli Lilly & Co.', weight: 10 },
    { ticker: 'ABBV', name: 'AbbVie Inc.', weight: 9 },
    { ticker: 'MRK', name: 'Merck & Co.', weight: 8 },
    { ticker: 'PFE', name: 'Pfizer Inc.', weight: 7 },
    { ticker: 'TMO', name: 'Thermo Fisher Scientific', weight: 7 },
    { ticker: 'ABT', name: 'Abbott Laboratories', weight: 6 },
    { ticker: 'DHR', name: 'Danaher Corp.', weight: 6 },
    { ticker: 'AMGN', name: 'Amgen Inc.', weight: 6 },
    { ticker: 'CVS', name: 'CVS Health Corp.', weight: 5 },
    { ticker: 'BMY', name: 'Bristol-Myers Squibb', weight: 5 },
    { ticker: 'GILD', name: 'Gilead Sciences Inc.', weight: 4 },
    { ticker: 'ISRG', name: 'Intuitive Surgical Inc.', weight: 4 },
  ],
  Financials: [
    { ticker: 'BRK.B', name: 'Berkshire Hathaway', weight: 14 },
    { ticker: 'JPM', name: 'JPMorgan Chase & Co.', weight: 12 },
    { ticker: 'V', name: 'Visa Inc.', weight: 11 },
    { ticker: 'MA', name: 'Mastercard Inc.', weight: 10 },
    { ticker: 'BAC', name: 'Bank of America', weight: 8 },
    { ticker: 'WFC', name: 'Wells Fargo & Co.', weight: 7 },
    { ticker: 'GS', name: 'Goldman Sachs Group', weight: 6 },
    { ticker: 'MS', name: 'Morgan Stanley', weight: 6 },
    { ticker: 'SCHW', name: 'Charles Schwab Corp.', weight: 5 },
    { ticker: 'BLK', name: 'BlackRock Inc.', weight: 5 },
    { ticker: 'AXP', name: 'American Express Co.', weight: 5 },
    { ticker: 'C', name: 'Citigroup Inc.', weight: 4 },
    { ticker: 'PNC', name: 'PNC Financial Services', weight: 4 },
    { ticker: 'USB', name: 'U.S. Bancorp', weight: 3 },
  ],
  Energy: [
    { ticker: 'XOM', name: 'Exxon Mobil Corp.', weight: 18 },
    { ticker: 'CVX', name: 'Chevron Corp.', weight: 16 },
    { ticker: 'COP', name: 'ConocoPhillips', weight: 12 },
    { ticker: 'SLB', name: 'Schlumberger Ltd.', weight: 10 },
    { ticker: 'EOG', name: 'EOG Resources Inc.', weight: 9 },
    { ticker: 'MPC', name: 'Marathon Petroleum', weight: 8 },
    { ticker: 'PSX', name: 'Phillips 66', weight: 7 },
    { ticker: 'VLO', name: 'Valero Energy Corp.', weight: 6 },
    { ticker: 'OXY', name: 'Occidental Petroleum', weight: 5 },
    { ticker: 'HAL', name: 'Halliburton Co.', weight: 5 },
    { ticker: 'KMI', name: 'Kinder Morgan Inc.', weight: 4 },
  ],
  Industrials: [
    { ticker: 'BA', name: 'Boeing Co.', weight: 11 },
    { ticker: 'HON', name: 'Honeywell International', weight: 10 },
    { ticker: 'UNP', name: 'Union Pacific Corp.', weight: 9 },
    { ticker: 'CAT', name: 'Caterpillar Inc.', weight: 9 },
    { ticker: 'RTX', name: 'Raytheon Technologies', weight: 8 },
    { ticker: 'GE', name: 'General Electric Co.', weight: 8 },
    { ticker: 'LMT', name: 'Lockheed Martin Corp.', weight: 7 },
    { ticker: 'DE', name: 'Deere & Co.', weight: 7 },
    { ticker: 'MMM', name: '3M Co.', weight: 6 },
    { ticker: 'UPS', name: 'United Parcel Service', weight: 6 },
    { ticker: 'GD', name: 'General Dynamics Corp.', weight: 5 },
    { ticker: 'NOC', name: 'Northrop Grumman Corp.', weight: 5 },
    { ticker: 'EMR', name: 'Emerson Electric Co.', weight: 5 },
    { ticker: 'FDX', name: 'FedEx Corp.', weight: 4 },
  ],
  'Consumer Discretionary': [
    { ticker: 'AMZN', name: 'Amazon.com Inc.', weight: 20 },
    { ticker: 'TSLA', name: 'Tesla Inc.', weight: 15 },
    { ticker: 'HD', name: 'Home Depot Inc.', weight: 12 },
    { ticker: 'MCD', name: "McDonald's Corp.", weight: 10 },
    { ticker: 'NKE', name: 'Nike Inc.', weight: 8 },
    { ticker: 'SBUX', name: 'Starbucks Corp.', weight: 7 },
    { ticker: 'LOW', name: "Lowe's Companies Inc.", weight: 6 },
    { ticker: 'TJX', name: 'TJX Companies Inc.', weight: 5 },
    { ticker: 'BKNG', name: 'Booking Holdings Inc.', weight: 5 },
    { ticker: 'GM', name: 'General Motors Co.', weight: 4 },
    { ticker: 'F', name: 'Ford Motor Co.', weight: 4 },
    { ticker: 'ABNB', name: 'Airbnb Inc.', weight: 4 },
  ],
  'Consumer Staples': [
    { ticker: 'WMT', name: 'Walmart Inc.', weight: 15 },
    { ticker: 'PG', name: 'Procter & Gamble Co.', weight: 14 },
    { ticker: 'KO', name: 'Coca-Cola Co.', weight: 12 },
    { ticker: 'PEP', name: 'PepsiCo Inc.', weight: 11 },
    { ticker: 'COST', name: 'Costco Wholesale Corp.', weight: 10 },
    { ticker: 'PM', name: 'Philip Morris Intl.', weight: 8 },
    { ticker: 'MO', name: 'Altria Group Inc.', weight: 7 },
    { ticker: 'CL', name: 'Colgate-Palmolive Co.', weight: 6 },
    { ticker: 'MDLZ', name: 'Mondelez International', weight: 5 },
    { ticker: 'KMB', name: 'Kimberly-Clark Corp.', weight: 5 },
    { ticker: 'GIS', name: 'General Mills Inc.', weight: 4 },
    { ticker: 'KHC', name: 'Kraft Heinz Co.', weight: 3 },
  ],
  Utilities: [
    { ticker: 'NEE', name: 'NextEra Energy Inc.', weight: 16 },
    { ticker: 'DUK', name: 'Duke Energy Corp.', weight: 13 },
    { ticker: 'SO', name: 'Southern Co.', weight: 12 },
    { ticker: 'D', name: 'Dominion Energy Inc.', weight: 11 },
    { ticker: 'EXC', name: 'Exelon Corp.', weight: 10 },
    { ticker: 'AEP', name: 'American Electric Power', weight: 9 },
    { ticker: 'SRE', name: 'Sempra Energy', weight: 8 },
    { ticker: 'XEL', name: 'Xcel Energy Inc.', weight: 7 },
    { ticker: 'ED', name: 'Consolidated Edison', weight: 7 },
    { ticker: 'WEC', name: 'WEC Energy Group Inc.', weight: 7 },
  ],
  Materials: [
    { ticker: 'LIN', name: 'Linde PLC', weight: 18 },
    { ticker: 'APD', name: 'Air Products & Chemicals', weight: 14 },
    { ticker: 'SHW', name: 'Sherwin-Williams Co.', weight: 12 },
    { ticker: 'FCX', name: 'Freeport-McMoRan Inc.', weight: 11 },
    { ticker: 'NEM', name: 'Newmont Corp.', weight: 10 },
    { ticker: 'ECL', name: 'Ecolab Inc.', weight: 9 },
    { ticker: 'DD', name: 'DuPont de Nemours Inc.', weight: 8 },
    { ticker: 'DOW', name: 'Dow Inc.', weight: 7 },
    { ticker: 'NUE', name: 'Nucor Corp.', weight: 6 },
    { ticker: 'VMC', name: 'Vulcan Materials Co.', weight: 5 },
  ],
  'Real Estate': [
    { ticker: 'PLD', name: 'Prologis Inc.', weight: 14 },
    { ticker: 'AMT', name: 'American Tower Corp.', weight: 13 },
    { ticker: 'EQIX', name: 'Equinix Inc.', weight: 12 },
    { ticker: 'PSA', name: 'Public Storage', weight: 11 },
    { ticker: 'SPG', name: 'Simon Property Group', weight: 10 },
    { ticker: 'O', name: 'Realty Income Corp.', weight: 9 },
    { ticker: 'WELL', name: 'Welltower Inc.', weight: 8 },
    { ticker: 'DLR', name: 'Digital Realty Trust', weight: 7 },
    { ticker: 'AVB', name: 'AvalonBay Communities', weight: 7 },
    { ticker: 'EQR', name: 'Equity Residential', weight: 6 },
    { ticker: 'VTR', name: 'Ventas Inc.', weight: 3 },
  ],
  'Communication Services': [
    { ticker: 'META', name: 'Meta Platforms Inc.', weight: 20 },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', weight: 18 },
    { ticker: 'NFLX', name: 'Netflix Inc.', weight: 14 },
    { ticker: 'DIS', name: 'Walt Disney Co.', weight: 12 },
    { ticker: 'T', name: 'AT&T Inc.', weight: 10 },
    { ticker: 'VZ', name: 'Verizon Communications', weight: 9 },
    { ticker: 'CMCSA', name: 'Comcast Corp.', weight: 8 },
    { ticker: 'TMUS', name: 'T-Mobile US Inc.', weight: 6 },
    { ticker: 'CHTR', name: 'Charter Communications', weight: 3 },
  ],
};

// Map portfolio names to sector keys
const PORTFOLIO_TO_SECTOR: Record<string, string> = {
  // Economic cycle portfolios - map to their dominant sector
  'Goldilocks Economy': 'Technology',
  'Recession': 'Utilities', 
  'Stagflation': 'Energy',
  'Deflation': 'Consumer Staples',
  'Reflation': 'Industrials',
  'Disinflation Soft Landing': 'Technology',
  'Dollar Weakness & Global Rebalancing': 'Industrials',
  
  // Direct sector portfolio names
  'Tech-Heavy Portfolio': 'Technology',
  'Technology Portfolio': 'Technology',
  'Healthcare Portfolio': 'Healthcare',
  'Financial Portfolio': 'Financials',
  'Financials Portfolio': 'Financials',
  'Energy Portfolio': 'Energy',
  'Industrial Portfolio': 'Industrials',
  'Industrials Portfolio': 'Industrials',
  'Consumer Discretionary Portfolio': 'Consumer Discretionary',
  'Consumer Portfolio': 'Consumer Discretionary',
  'Consumer Staples Portfolio': 'Consumer Staples',
  'Staples Portfolio': 'Consumer Staples',
  'Utilities Portfolio': 'Utilities',
  'Materials Portfolio': 'Materials',
  'Real Estate Portfolio': 'Real Estate',
  'Communication Services Portfolio': 'Communication Services',
  'Telecom Portfolio': 'Communication Services',
  
  // Regional/theme portfolios - map to diversified sectors
  'Europe Portfolio': 'Industrials',
  'Emerging Markets Portfolio': 'Industrials',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolio = searchParams.get('portfolio');
    const sector = searchParams.get('sector');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Determine sector from portfolio name or direct sector param
    let targetSector = sector;
    if (!targetSector && portfolio) {
      targetSector = PORTFOLIO_TO_SECTOR[portfolio] || null;
    }

    if (!targetSector) {
      return NextResponse.json(
        { error: 'Missing sector or portfolio parameter' },
        { status: 400 }
      );
    }

    const stocks = SECTOR_STOCKS[targetSector];
    if (!stocks) {
      return NextResponse.json(
        { error: `No stocks found for sector: ${targetSector}` },
        { status: 404 }
      );
    }

    // Get top N stocks
    const topStocks = stocks.slice(0, limit);
    const tickers = topStocks.map((s) => s.ticker).join(',');

    // Fetch real-time quotes
    const quotesUrl = new URL('/api/quotes', request.url);
    quotesUrl.searchParams.set('symbols', tickers);

    const quotesRes = await fetch(quotesUrl.toString());
    const quotesData = await quotesRes.json();

    if (!quotesData.ok || !quotesData.data) {
      return NextResponse.json({
        sector: targetSector,
        stocks: topStocks.map((s) => ({
          ticker: s.ticker,
          name: s.name,
          weight: s.weight || 0,
          price: 0,
          change: '0.00%',
          changePercent: 0,
          performance: {
            daily: '0.00%',
            weekly: '0.00%',
            monthly: '0.00%',
            quarterly: '0.00%',
            yearly: '0.00%',
          },
        })),
      });
    }

    // Merge quotes with stock data
    const enrichedStocks = topStocks.map((stock) => {
      const quote = quotesData.data[stock.ticker];
      return {
        ticker: stock.ticker,
        name: quote?.name || stock.name,
        weight: stock.weight || 0,
        price: quote?.price || 0,
        change: quote?.changePercent
          ? `${quote.changePercent > 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`
          : '0.00%',
        changePercent: quote?.changePercent || 0,
        performance: quote?.performance || {
          daily: '0.00%',
          weekly: '0.00%',
          monthly: '0.00%',
          quarterly: '0.00%',
          yearly: '0.00%',
        },
      };
    });

    return NextResponse.json({
      sector: targetSector,
      stocks: enrichedStocks,
    });
  } catch (error) {
    console.error('Error in /api/sector-stocks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
