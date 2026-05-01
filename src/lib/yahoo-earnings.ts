import yahooFinance from 'yahoo-finance2';

// Suppress yahoo-finance2 console notices
try { (yahooFinance as any).suppressNotices?.(['yahooSurvey', 'ripHistorical']); } catch { /* noop */ }

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
  'AAPL','MSFT','GOOGL','GOOG','AMZN','META','NVDA','TSLA','BRK-B','LLY',
  'AVGO','JPM','V','UNH','XOM','MA','WMT','PG','JNJ','HD','COST','ORCL',
  'NFLX','BAC','ABBV','KO','CVX','MRK','PEP','TMO','ADBE','CRM','AMD','LIN',
  'ACN','MCD','DIS','ABT','CSCO','PFE','WFC','TMUS','VZ','INTC','IBM','GE',
  'CAT','NKE','BA','GS','MS','AXP','C','BX','BLK','SCHW','UBER','SHOP','PYPL'
]);

function toDateOnly(d: any): string | null {
  if (!d) return null;
  try {
    let dt: Date;
    if (d instanceof Date) dt = d;
    else if (typeof d === 'number') dt = new Date(d > 1e12 ? d : d * 1000);
    else if (typeof d === 'string') dt = new Date(d);
    else if (typeof d === 'object' && d.raw) dt = new Date(Number(d.raw) * 1000);
    else dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function pickNum(v: any): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && typeof v.raw === 'number') return v.raw;
  const n = Number(v);
  return isNaN(n) ? null : n;
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
    const summary: any = await yahooFinance.quoteSummary(symbol, {
      modules: ['calendarEvents', 'price', 'summaryProfile'],
    } as any);

    const cal: any = summary?.calendarEvents?.earnings;
    const price: any = summary?.price;
    const profile: any = summary?.summaryProfile;

    const dates: any[] = cal?.earningsDate || [];
    const earningsDate = toDateOnly(dates[0]);
    if (!earningsDate) return null;

    const epsEstNum = pickNum(cal?.earningsAverage);
    const marketCap = pickNum(price?.marketCap) || 0;

    return {
      date: earningsDate,
      time: 'TBD',
      symbol,
      company: price?.longName || price?.shortName || symbol,
      epsEstimate: epsEstNum != null ? `$${epsEstNum.toFixed(2)}` : undefined,
      estimate: epsEstNum != null ? `$${epsEstNum.toFixed(2)}` : undefined,
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
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const slice = symbols.slice(i, i + batchSize);
    try {
      const out = await Promise.all(
        slice.map((s) =>
          Promise.race<YahooEarningEvent | null>([
            fetchOne(s),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
          ])
        )
      );
      for (const ev of out) {
        if (!ev) continue;
        const d = new Date(ev.date + 'T00:00:00');
        if (d >= today && d <= end) results.push(ev);
      }
    } catch {
      /* continue */
    }
  }

  const seen = new Set<string>();
  const unique = results.filter((e) => {
    const k = `${e.symbol}|${e.date}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  unique.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));
  return unique;
}
