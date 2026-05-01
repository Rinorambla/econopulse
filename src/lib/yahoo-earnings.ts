import yahooFinance from 'yahoo-finance2';

export interface YahooEarningEvent {
  date: string;
  time: 'BMO' | 'AMC' | 'TBD';
  symbol: string;
  company: string;
  epsEstimate?: string;
  estimate?: string;
  actual?: string;
  period: string;
  marketCap: string;
  significance: 'High' | 'Medium' | 'Low';
  sector: string;
}

const MEGA_CAP = new Set([
  'AAPL','MSFT','GOOGL','GOOG','AMZN','META','NVDA','TSLA','BRK.B','LLY',
  'AVGO','JPM','V','UNH','XOM','MA','WMT','PG','JNJ','HD','COST','ORCL',
  'NFLX','BAC','ABBV','KO','CVX','MRK','PEP','TMO','ADBE','CRM','AMD','LIN'
]);

function toDateOnly(d: Date | string | number | null | undefined): string | null {
  if (!d) return null;
  try {
    const dt = d instanceof Date ? d : new Date(d as any);
    if (isNaN(dt.getTime())) return null;
    return dt.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function classifySig(symbol: string, marketCap: number): 'High' | 'Medium' | 'Low' {
  if (MEGA_CAP.has(symbol)) return 'High';
  if (marketCap >= 50_000_000_000) return 'High';
  if (marketCap >= 5_000_000_000) return 'Medium';
  return 'Low';
}

function classifyCap(marketCap: number): string {
  if (marketCap >= 10_000_000_000) return 'Large';
  if (marketCap >= 2_000_000_000) return 'Medium';
  return 'Small';
}

async function fetchOne(symbol: string): Promise<YahooEarningEvent | null> {
  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ['calendarEvents', 'price', 'summaryProfile', 'defaultKeyStatistics'],
    } as any);
    const cal: any = (summary as any)?.calendarEvents?.earnings;
    const price: any = (summary as any)?.price;
    const profile: any = (summary as any)?.summaryProfile;
    const keyStats: any = (summary as any)?.defaultKeyStatistics;

    const dates: any[] = cal?.earningsDate || [];
    const first = dates[0];
    const earningsDate = toDateOnly(first?.raw ? new Date(first.raw * 1000) : first);
    if (!earningsDate) return null;

    const epsEstNum =
      (typeof cal?.earningsAverage === 'object' ? cal.earningsAverage?.raw : cal?.earningsAverage) ??
      null;
    const epsActualNum =
      (typeof keyStats?.trailingEps === 'object' ? keyStats.trailingEps?.raw : keyStats?.trailingEps) ??
      null;

    const marketCap =
      (typeof price?.marketCap === 'object' ? price.marketCap?.raw : price?.marketCap) || 0;

    return {
      date: earningsDate,
      time: 'TBD',
      symbol,
      company: price?.longName || price?.shortName || symbol,
      epsEstimate: epsEstNum != null ? `$${Number(epsEstNum).toFixed(2)}` : undefined,
      estimate: epsEstNum != null ? `$${Number(epsEstNum).toFixed(2)}` : undefined,
      actual: undefined,
      period: 'Upcoming',
      marketCap: classifyCap(marketCap),
      significance: classifySig(symbol, marketCap),
      sector: profile?.sector || 'Unknown',
    };
  } catch {
    return null;
  }
}

/**
 * Fetch upcoming earnings via Yahoo Finance for a curated list of tickers.
 * Returns events whose earningsDate falls within [today, today+days].
 */
export async function getYahooEarningsCalendar(
  symbols: string[],
  days = 30
): Promise<YahooEarningEvent[]> {
  if (!symbols?.length) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today.getTime() + days * 86400000);

  const results: YahooEarningEvent[] = [];
  // Throttle: 8 in parallel
  const batchSize = 8;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const slice = symbols.slice(i, i + batchSize);
    const out = await Promise.all(slice.map(fetchOne));
    for (const ev of out) {
      if (!ev) continue;
      const d = new Date(ev.date + 'T00:00:00');
      if (d >= today && d <= end) results.push(ev);
    }
  }

  results.sort((a, b) => a.date.localeCompare(b.date));
  return results;
}
