// Nasdaq.com public earnings-calendar fetcher.
// Free, no API key, precise data: date, BMO/AMC time, EPS forecast, market cap,
// number of analyst estimates, fiscal quarter. Coverage: the whole US market.
// Endpoint: https://api.nasdaq.com/api/calendar/earnings?date=YYYY-MM-DD

export interface NasdaqEarningEvent {
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
  numEstimates?: number;
  lastYearEps?: string;
}

const NASDAQ_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://www.nasdaq.com',
  Referer: 'https://www.nasdaq.com/',
};

function parseMoney(s: unknown): number {
  if (typeof s !== 'string' || !s) return 0;
  const n = Number(s.replace(/[$,]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function classifyCap(mc: number): string {
  if (mc >= 10_000_000_000) return 'Large';
  if (mc >= 2_000_000_000) return 'Medium';
  return 'Small';
}

function classifySig(mc: number): 'High' | 'Medium' | 'Low' {
  if (mc >= 50_000_000_000) return 'High';
  if (mc >= 5_000_000_000) return 'Medium';
  return 'Low';
}

function mapTime(t: unknown): 'BMO' | 'AMC' | 'TBD' {
  if (t === 'time-pre-market') return 'BMO';
  if (t === 'time-after-hours') return 'AMC';
  return 'TBD';
}

async function fetchDay(date: string): Promise<NasdaqEarningEvent[]> {
  try {
    const res = await fetch(`https://api.nasdaq.com/api/calendar/earnings?date=${date}`, {
      headers: NASDAQ_HEADERS,
      signal: AbortSignal.timeout(9000),
      // Server-side cache: each day's calendar barely changes intra-day.
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rows: any[] = json?.data?.rows || [];
    return rows
      .filter((r) => r?.symbol)
      .map((r) => {
        const mc = parseMoney(r.marketCap);
        const eps = typeof r.epsForecast === 'string' && r.epsForecast.trim() ? r.epsForecast.trim() : undefined;
        return {
          date,
          time: mapTime(r.time),
          symbol: String(r.symbol).toUpperCase(),
          company: r.name || r.companyName || r.symbol,
          epsEstimate: eps,
          estimate: eps,
          actual: undefined,
          period: r.fiscalQuarterEnding || 'Upcoming',
          marketCap: classifyCap(mc),
          significance: classifySig(mc),
          sector: r.sector || 'Unknown',
          numEstimates: Number(r.noOfEsts) || undefined,
          lastYearEps: typeof r.lastYearEPS === 'string' && r.lastYearEPS.trim() ? r.lastYearEPS.trim() : undefined,
          _mc: mc,
        } as NasdaqEarningEvent & { _mc: number };
      })
      // Biggest companies first within the day.
      .sort((a: any, b: any) => b._mc - a._mc)
      .map(({ _mc, ...ev }: any) => ev as NasdaqEarningEvent);
  } catch {
    return [];
  }
}

/**
 * Fetch the Nasdaq earnings calendar for the next `days` days (weekdays only —
 * earnings are not reported on weekends). Days are fetched with small
 * concurrency to stay polite; each day is capped to `perDayLimit` events
 * (largest market caps first) so the payload stays reasonable.
 */
export async function getNasdaqEarningsCalendar(days = 14, perDayLimit = 25): Promise<NasdaqEarningEvent[]> {
  const dates: string[] = [];
  const d = new Date();
  for (let i = 0; i <= days && dates.length < 15; i++) {
    const day = new Date(d.getTime() + i * 86400000);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    dates.push(day.toISOString().slice(0, 10));
  }

  const out: NasdaqEarningEvent[] = [];
  const CONCURRENCY = 4;
  for (let i = 0; i < dates.length; i += CONCURRENCY) {
    const chunk = dates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map((dt) => fetchDay(dt)));
    for (const dayEvents of results) out.push(...dayEvents.slice(0, perDayLimit));
  }
  return out;
}
