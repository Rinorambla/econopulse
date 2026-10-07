// Server-only: historical fundamentals for the Fundamental Chart (stockanalysis.com-style).
// Primary source: Alpha Vantage INCOME_STATEMENT + BALANCE_SHEET + CASH_FLOW + EARNINGS
// (~20y annual + ~80 quarters). Yahoo fundamentals-timeseries (~4y, all fields) fills any
// gaps when Alpha Vantage is rate-limited (free tier: 25 req/day), and stale disk cache is
// reused so long histories are never lost. Cached on disk for 24h (fundamentals change
// quarterly).

import fs from 'fs';
import path from 'path';
import { env } from '@/lib/env';

// Flow fields are summed over 4 quarters for TTM; stock (point-in-time) fields use the
// latest quarter value.
export const FLOW_FIELDS = [
  'revenue',
  'costOfRevenue',
  'grossProfit',
  'operatingExpenses',
  'researchAndDevelopment',
  'sga',
  'operatingIncome',
  'ebitda',
  'ebit',
  'interestExpense',
  'incomeTax',
  'pretaxIncome',
  'netIncome',
  'eps',
  'operatingCashFlow',
  'capex',
  'freeCashFlow',
  'dividendsPaid',
  'buybacks',
] as const;

export const STOCK_FIELDS = [
  'totalAssets',
  'totalLiabilities',
  'equity',
  'cash',
  'totalDebt',
  'inventory',
  'sharesOutstanding',
  'price', // as-traded close nearest to the fiscal period end (for valuation metrics)
] as const;

export type FieldKey = (typeof FLOW_FIELDS)[number] | (typeof STOCK_FIELDS)[number];
export const ALL_FIELDS: FieldKey[] = [...FLOW_FIELDS, ...STOCK_FIELDS];

export type FundamentalPoint = { date: string } & Record<FieldKey, number | null>;

export interface FundamentalsHistory {
  version: number;
  symbol: string;
  currency: string;
  source: string;
  complete: boolean; // all Alpha Vantage statements fetched (full history)
  annual: FundamentalPoint[]; // ascending by date
  quarterly: FundamentalPoint[]; // ascending by date
  ttm: FundamentalPoint[]; // rolling 4-quarter aggregates, ascending
  fetchedAt: string;
}

const CACHE_VERSION = 4;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h for complete data
const PARTIAL_TTL_MS = 2 * 60 * 60 * 1000; // retry sooner when AV was rate-limited
const CACHE_DIR = path.join(process.cwd(), 'data-snapshots', 'fundamentals');

const memCache = new Map<string, FundamentalsHistory>();

type PointMap = Map<string, FundamentalPoint>;

function emptyPoint(date: string): FundamentalPoint {
  const p = { date } as FundamentalPoint;
  for (const f of ALL_FIELDS) p[f] = null;
  return p;
}

function num(v: unknown): number | null {
  if (v == null || v === 'None' || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function absNum(v: unknown): number | null {
  const n = num(v);
  return n == null ? null : Math.abs(n);
}

// Fill only missing fields so higher-priority sources win.
function fill(map: PointMap, date: string, values: Partial<Record<FieldKey, number | null>>): void {
  if (!date) return;
  const point = map.get(date) || emptyPoint(date);
  for (const [k, v] of Object.entries(values) as Array<[FieldKey, number | null]>) {
    if (v != null && point[k] == null) point[k] = v;
  }
  map.set(date, point);
}

// ── Cache ────────────────────────────────────────────────────────────────────

function cacheFile(symbol: string): string {
  const safe = symbol.replace(/[^A-Z0-9._-]/gi, '_');
  return path.join(CACHE_DIR, `${safe}.json`);
}

function readDiskCache(symbol: string): FundamentalsHistory | null {
  try {
    const file = cacheFile(symbol);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8')) as FundamentalsHistory;
  } catch {
    return null;
  }
}

function writeDiskCache(data: FundamentalsHistory): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cacheFile(data.symbol), JSON.stringify(data));
  } catch {
    /* non-fatal */
  }
}

function isFresh(data: FundamentalsHistory | null | undefined): boolean {
  if (!data || data.version !== CACHE_VERSION) return false;
  const ttl = data.complete ? CACHE_TTL_MS : PARTIAL_TTL_MS;
  return Date.now() - new Date(data.fetchedAt).getTime() < ttl;
}

// ── Alpha Vantage ────────────────────────────────────────────────────────────

type AvReport = Record<string, string> & { fiscalDateEnding: string };

async function fetchAvFunction(fn: string, symbol: string): Promise<any | null> {
  const key = env.ALPHAVANTAGE_API_KEY;
  if (!key) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=${fn}&symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const js = await res.json();
    // Rate-limited / error replies carry Note | Information | Error Message.
    if (js?.Note || js?.Information || js?.['Error Message']) return null;
    return js;
  } catch {
    return null;
  }
}

function avIncomeValues(r: AvReport): Partial<Record<FieldKey, number | null>> {
  return {
    revenue: num(r.totalRevenue),
    costOfRevenue: num(r.costOfRevenue),
    grossProfit: num(r.grossProfit),
    operatingExpenses: num(r.operatingExpenses),
    researchAndDevelopment: num(r.researchAndDevelopment),
    sga: num(r.sellingGeneralAndAdministrative),
    operatingIncome: num(r.operatingIncome),
    ebitda: num(r.ebitda),
    ebit: num(r.ebit),
    interestExpense: num(r.interestExpense),
    incomeTax: num(r.incomeTaxExpense),
    pretaxIncome: num(r.incomeBeforeTax),
    netIncome: num(r.netIncome),
  };
}

function avCashflowValues(r: AvReport): Partial<Record<FieldKey, number | null>> {
  const ocf = num(r.operatingCashflow);
  const capex = absNum(r.capitalExpenditures);
  return {
    operatingCashFlow: ocf,
    capex,
    freeCashFlow: ocf != null && capex != null ? ocf - capex : null,
    dividendsPaid: absNum(r.dividendPayoutCommonStock) ?? absNum(r.dividendPayout),
    buybacks: absNum(r.paymentsForRepurchaseOfCommonStock) ?? absNum(r.paymentsForRepurchaseOfEquity),
  };
}

function avBalanceValues(r: AvReport): Partial<Record<FieldKey, number | null>> {
  let totalDebt = num(r.shortLongTermDebtTotal);
  if (totalDebt == null) {
    const lt = num(r.longTermDebt);
    const st = num(r.shortTermDebt) ?? num(r.currentDebt);
    if (lt != null || st != null) totalDebt = (lt ?? 0) + (st ?? 0);
  }
  return {
    totalAssets: num(r.totalAssets),
    totalLiabilities: num(r.totalLiabilities),
    equity: num(r.totalShareholderEquity),
    cash: num(r.cashAndShortTermInvestments) ?? num(r.cashAndCashEquivalentsAtCarryingValue),
    totalDebt,
    inventory: num(r.inventory),
    sharesOutstanding: num(r.commonStockSharesOutstanding),
  };
}

interface AvResult {
  annual: PointMap;
  quarterly: PointMap;
  currency: string | null;
  complete: boolean; // all four endpoints answered
  anyOk: boolean;
}

async function fetchAlphaVantage(symbol: string): Promise<AvResult> {
  const annual: PointMap = new Map();
  const quarterly: PointMap = new Map();
  let currency: string | null = null;
  let ok = 0;

  const [inc, bal, cf, earn] = await Promise.all([
    fetchAvFunction('INCOME_STATEMENT', symbol),
    fetchAvFunction('BALANCE_SHEET', symbol),
    fetchAvFunction('CASH_FLOW', symbol),
    fetchAvFunction('EARNINGS', symbol),
  ]);

  const apply = (
    js: any,
    mapper: (r: AvReport) => Partial<Record<FieldKey, number | null>>
  ): boolean => {
    const a: AvReport[] = js?.annualReports || [];
    const q: AvReport[] = js?.quarterlyReports || [];
    if (!a.length && !q.length) return false;
    currency = currency || a[0]?.reportedCurrency || q[0]?.reportedCurrency || null;
    for (const r of a) if (r?.fiscalDateEnding) fill(annual, r.fiscalDateEnding, mapper(r));
    for (const r of q) if (r?.fiscalDateEnding) fill(quarterly, r.fiscalDateEnding, mapper(r));
    return true;
  };

  if (apply(inc, avIncomeValues)) ok++;
  if (apply(bal, avBalanceValues)) ok++;
  if (apply(cf, avCashflowValues)) ok++;

  const annEarn: Array<Record<string, string>> = earn?.annualEarnings || [];
  const qEarn: Array<Record<string, string>> = earn?.quarterlyEarnings || [];
  if (annEarn.length || qEarn.length) {
    ok++;
    for (const r of annEarn) if (r?.fiscalDateEnding) fill(annual, r.fiscalDateEnding, { eps: num(r.reportedEPS) });
    for (const r of qEarn) if (r?.fiscalDateEnding) fill(quarterly, r.fiscalDateEnding, { eps: num(r.reportedEPS) });
  }

  return { annual, quarterly, currency, complete: ok === 4, anyOk: ok > 0 };
}

// ── Yahoo fundamentals-timeseries fallback (≈4 years, all fields) ────────────

const YH_TYPES: Array<{ key: FieldKey; type: string; abs?: boolean }> = [
  { key: 'revenue', type: 'TotalRevenue' },
  { key: 'costOfRevenue', type: 'CostOfRevenue' },
  { key: 'grossProfit', type: 'GrossProfit' },
  { key: 'operatingExpenses', type: 'OperatingExpense' },
  { key: 'researchAndDevelopment', type: 'ResearchAndDevelopment' },
  { key: 'sga', type: 'SellingGeneralAndAdministration' },
  { key: 'operatingIncome', type: 'OperatingIncome' },
  { key: 'ebitda', type: 'EBITDA' },
  { key: 'ebit', type: 'EBIT' },
  { key: 'interestExpense', type: 'InterestExpense' },
  { key: 'incomeTax', type: 'TaxProvision' },
  { key: 'pretaxIncome', type: 'PretaxIncome' },
  { key: 'netIncome', type: 'NetIncome' },
  { key: 'eps', type: 'DilutedEPS' },
  { key: 'operatingCashFlow', type: 'OperatingCashFlow' },
  { key: 'capex', type: 'CapitalExpenditure', abs: true },
  { key: 'freeCashFlow', type: 'FreeCashFlow' },
  { key: 'dividendsPaid', type: 'CashDividendsPaid', abs: true },
  { key: 'buybacks', type: 'RepurchaseOfCapitalStock', abs: true },
  { key: 'totalAssets', type: 'TotalAssets' },
  { key: 'totalLiabilities', type: 'TotalLiabilitiesNetMinorityInterest' },
  { key: 'equity', type: 'StockholdersEquity' },
  { key: 'cash', type: 'CashCashEquivalentsAndShortTermInvestments' },
  { key: 'totalDebt', type: 'TotalDebt' },
  { key: 'inventory', type: 'Inventory' },
  { key: 'sharesOutstanding', type: 'DilutedAverageShares' },
];

interface YahooResult {
  annual: PointMap;
  quarterly: PointMap;
  currency: string | null;
  anyOk: boolean;
}

async function fetchYahoo(symbol: string): Promise<YahooResult> {
  const annual: PointMap = new Map();
  const quarterly: PointMap = new Map();
  let currency: string | null = null;
  try {
    const now = Math.floor(Date.now() / 1000);
    const period1 = now - 60 * 60 * 24 * 365 * 15;
    const types = YH_TYPES.flatMap((m) => [`annual${m.type}`, `quarterly${m.type}`]).join(',');
    const url =
      `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}` +
      `?symbol=${encodeURIComponent(symbol)}&type=${types}&period1=${period1}&period2=${now}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconopulseBot/1.0)' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { annual, quarterly, currency, anyOk: false };
    const js = await res.json();
    const results: any[] = js?.timeseries?.result || [];

    const byType = new Map<string, any>();
    for (const row of results) {
      const t = row?.meta?.type?.[0];
      if (t) byType.set(t, row);
    }

    for (const prefix of ['annual', 'quarterly'] as const) {
      const bucket = prefix === 'annual' ? annual : quarterly;
      for (const m of YH_TYPES) {
        const row = byType.get(`${prefix}${m.type}`);
        const series: any[] = row?.[`${prefix}${m.type}`];
        if (!Array.isArray(series)) continue;
        for (const entry of series) {
          if (!entry?.asOfDate) continue;
          if (entry?.currencyCode) currency = currency || entry.currencyCode;
          const raw = num(entry?.reportedValue?.raw);
          fill(bucket, entry.asOfDate, { [m.key]: m.abs && raw != null ? Math.abs(raw) : raw });
        }
      }
    }
  } catch {
    /* fallthrough */
  }
  return { annual, quarterly, currency, anyOk: annual.size > 0 || quarterly.size > 0 };
}

// ── Historical monthly prices (for valuation metrics) ───────────────────────
// Alpha Vantage fundamentals (EPS, shares outstanding) are retroactively
// split-adjusted, so the split-adjusted Yahoo closes are directly consistent.

interface PriceHistory {
  closes: Array<{ ts: number; close: number }>;
}

async function fetchMonthlyPrices(symbol: string): Promise<PriceHistory | null> {
  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?range=max&interval=1mo`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconopulseBot/1.0)' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const js = await res.json();
    const result = js?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp || [];
    const closesRaw: Array<number | null> = result?.indicators?.quote?.[0]?.close || [];
    if (!timestamps.length) return null;

    const closes: Array<{ ts: number; close: number }> = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = closesRaw[i];
      if (typeof c === 'number' && Number.isFinite(c)) closes.push({ ts: timestamps[i] * 1000, close: c });
    }
    return closes.length ? { closes } : null;
  } catch {
    return null;
  }
}

const PRICE_MATCH_WINDOW_MS = 60 * 24 * 60 * 60 * 1000; // ±60 days

function attachPrices(points: FundamentalPoint[], prices: PriceHistory | null): void {
  if (!prices?.closes.length) return;
  for (const p of points) {
    const target = Date.parse(p.date);
    if (!Number.isFinite(target)) continue;
    let best: { ts: number; close: number } | null = null;
    for (const c of prices.closes) {
      if (!best || Math.abs(c.ts - target) < Math.abs(best.ts - target)) best = c;
    }
    if (!best || Math.abs(best.ts - target) > PRICE_MATCH_WINDOW_MS) continue;
    p.price = best.close;
  }
}

// Some sources emit stray "annual" rows at off-fiscal dates (e.g. an in-progress year).
// Keep annual rows that carry a revenue figure, or whose month matches the dominant
// fiscal year-end month of the revenue-bearing rows.
function filterAnnualOutliers(points: FundamentalPoint[]): FundamentalPoint[] {
  const monthCount = new Map<string, number>();
  for (const p of points) {
    if (p.revenue != null) {
      const m = p.date.slice(5, 7);
      monthCount.set(m, (monthCount.get(m) || 0) + 1);
    }
  }
  if (!monthCount.size) return points;
  let fiscalMonth = '';
  let max = 0;
  for (const [m, c] of monthCount) {
    if (c > max) {
      max = c;
      fiscalMonth = m;
    }
  }
  return points.filter((p) => p.revenue != null || p.date.slice(5, 7) === fiscalMonth);
}

// ── TTM (rolling 4-quarter aggregates) ───────────────────────────────────────

function buildTtm(quarterly: FundamentalPoint[]): FundamentalPoint[] {
  const out: FundamentalPoint[] = [];
  for (let i = 3; i < quarterly.length; i++) {
    const window = quarterly.slice(i - 3, i + 1);
    const point = emptyPoint(quarterly[i].date);
    for (const k of FLOW_FIELDS) {
      if (window.every((q) => q[k] != null)) {
        point[k] = window.reduce((sum, q) => sum + (q[k] as number), 0);
      }
    }
    for (const k of STOCK_FIELDS) {
      point[k] = quarterly[i][k]; // point-in-time: latest quarter
    }
    out.push(point);
  }
  return out;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get full historical fundamentals for a symbol (income, balance sheet, cash flow, EPS).
 * Serves from cache (memory → disk, 24h TTL); otherwise merges Alpha Vantage (long
 * history), Yahoo (recent, all fields) and any stale cached data, field by field.
 */
export async function getFundamentalsHistory(symbolRaw: string): Promise<FundamentalsHistory | null> {
  const symbol = symbolRaw.trim().toUpperCase();
  if (!symbol) return null;

  const mem = memCache.get(symbol);
  if (mem && isFresh(mem)) return mem;

  const disk = readDiskCache(symbol);
  if (disk && isFresh(disk)) {
    memCache.set(symbol, disk);
    return disk;
  }

  const [av, prices] = await Promise.all([fetchAlphaVantage(symbol), fetchMonthlyPrices(symbol)]);
  // Yahoo fills whatever Alpha Vantage couldn't provide (rate limit, missing fields).
  const yh = av.complete ? null : await fetchYahoo(symbol);

  const annual: PointMap = new Map();
  const quarterly: PointMap = new Map();
  const mergeFrom = (src: { annual: Iterable<FundamentalPoint>; quarterly: Iterable<FundamentalPoint> }) => {
    for (const p of src.annual) fill(annual, p.date, p);
    for (const p of src.quarterly) fill(quarterly, p.date, p);
  };

  // Priority: fresh Alpha Vantage → fresh Yahoo → stale cache (keeps long histories
  // alive across rate-limited days and cache-format upgrades).
  mergeFrom({ annual: av.annual.values(), quarterly: av.quarterly.values() });
  if (yh) mergeFrom({ annual: yh.annual.values(), quarterly: yh.quarterly.values() });
  if (disk) mergeFrom({ annual: disk.annual || [], quarterly: disk.quarterly || [] });

  if (!annual.size && !quarterly.size) return null;

  const sortPoints = (m: PointMap) => Array.from(m.values()).sort((a, b) => a.date.localeCompare(b.date));
  const annualArr = filterAnnualOutliers(sortPoints(annual));
  const quarterlyArr = sortPoints(quarterly);
  // Attach as-traded prices before TTM so TTM rows inherit the latest quarter price.
  attachPrices(annualArr, prices);
  attachPrices(quarterlyArr, prices);

  const sources: string[] = [];
  if (av.anyOk) sources.push('alphavantage');
  if (yh?.anyOk) sources.push('yahoo');
  if (!sources.length) sources.push('cache');

  const result: FundamentalsHistory = {
    version: CACHE_VERSION,
    symbol,
    currency: av.currency || yh?.currency || disk?.currency || 'USD',
    source: sources.join('+'),
    complete: av.complete,
    annual: annualArr,
    quarterly: quarterlyArr,
    ttm: buildTtm(quarterlyArr),
    fetchedAt: new Date().toISOString(),
  };

  memCache.set(symbol, result);
  // Only persist when live data arrived, so a rate-limited day can't shorten the TTL
  // window with cache-only content.
  if (av.anyOk || yh?.anyOk) writeDiskCache(result);
  return result;
}
