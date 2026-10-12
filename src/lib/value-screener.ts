// Server-only: "Top Stocks — Medium/Long Term" value & quality screener.
// Universe filtered by 12 criteria (mid-cap 2–10B, P/E & Fwd P/E < 15, dividend > 3%,
// op margin > 15%, ROE > 10%, LT debt/equity < 1, positive EPS growth past/this/next
// years, positive 5y sales growth, positive net margin) via the Finviz screener,
// then enriched with Yahoo metrics. A disk snapshot tracks membership over time so
// stocks that stop qualifying are flagged to the user instead of silently vanishing.

import fs from 'fs';
import path from 'path';

export interface ScreenedStock {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  country: string;
  marketCap: string; // as reported by the screen, e.g. "3.18B"
  price: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  dividendYieldPct: number | null;
  roePct: number | null;
  operatingMarginPct: number | null;
  netMarginPct: number | null;
  firstSeen: string; // YYYY-MM-DD — in the list since
}

export interface DroppedStock {
  symbol: string;
  name: string;
  sector: string;
  droppedAt: string; // YYYY-MM-DD — stopped meeting the criteria
  firstSeen: string;
}

export interface ScreenerResult {
  current: ScreenedStock[];
  dropped: DroppedStock[];
  fetchedAt: string;
  live: boolean; // false when serving stale cache after a failed refresh
}

export const SCREEN_CRITERIA: Array<{ label: string; value: string }> = [
  { label: 'Market cap', value: 'Mid $2B–$10B' },
  { label: 'P/E', value: '< 15' },
  { label: 'Forward P/E', value: '< 15' },
  { label: 'Dividend yield', value: '> 3%' },
  { label: 'Operating margin', value: '> 15%' },
  { label: 'Net profit margin', value: '> 0%' },
  { label: 'Return on equity', value: '> 10%' },
  { label: 'LT debt/equity', value: '< 1' },
  { label: 'EPS growth past 5y', value: '> 0%' },
  { label: 'EPS growth this year', value: '> 0%' },
  { label: 'EPS growth next 5y', value: '> 0%' },
  { label: 'Sales growth past 5y', value: '> 0%' },
];

const FINVIZ_FILTERS = [
  'cap_mid',
  'fa_div_o3',
  'fa_epspast5years_pos',
  'fa_epsyoy_pos',
  'fa_estltgrowth_pos',
  'fa_fpe_u15',
  'fa_ltdebteq_u1',
  'fa_netmargin_pos',
  'fa_opermargin_o15',
  'fa_pe_u15',
  'fa_roe_o10',
  'fa_sales5years_pos',
].join(',');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DROPPED_RETENTION_DAYS = 90;
const CACHE_FILE = path.join(process.cwd(), 'data-snapshots', 'value-screener.json');

let memCache: ScreenerResult | null = null;

// ── Finviz screen (3 views: overview 111, valuation 121, financial 161) ──────

interface ScreenRow {
  symbol: string;
  company: string;
  sector: string;
  industry: string;
  country: string;
  marketCap: string;
  price: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  dividendYieldPct: number | null;
  roePct: number | null;
  operatingMarginPct: number | null;
  netMarginPct: number | null;
  ltDebtToEquity: number | null;
}

function cellNum(s: string | undefined): number | null {
  if (!s || s === '-') return null;
  const v = parseFloat(s.replace(/[%,]/g, ''));
  return Number.isFinite(v) ? v : null;
}

/** Rows of [ticker, cells[]] for one screener page. */
function parsePage(html: string): Array<{ ticker: string; cells: string[] }> {
  const out: Array<{ ticker: string; cells: string[] }> = [];
  for (const block of html.split('<tr class="styled-row').slice(1)) {
    const rowHtml = block.split('</tr>')[0];
    const tm = rowHtml.match(/stock\?t=([A-Z][A-Z0-9.-]*)/);
    if (!tm) continue;
    const cells = rowHtml
      .split(/<td[^>]*>/)
      .slice(1)
      .map((c) => c.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim());
    out.push({ ticker: tm[1], cells });
  }
  return out;
}

async function fetchView(view: string): Promise<Map<string, string[]> | null> {
  try {
    const byTicker = new Map<string, string[]>();
    const first = await fetch(`https://finviz.com/screener.ashx?v=${view}&f=${FINVIZ_FILTERS}&r=1`, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!first.ok) return null;
    const html = await first.text();
    const totalM = html.match(/#\d+\s*\/\s*(\d+)\s*Total/);
    const total = totalM ? Number(totalM[1]) : 0;
    for (const r of parsePage(html)) byTicker.set(r.ticker, r.cells);
    if (!byTicker.size) return null;

    for (let offset = 21; offset <= Math.min(total, 200); offset += 20) {
      try {
        const res = await fetch(`https://finviz.com/screener.ashx?v=${view}&f=${FINVIZ_FILTERS}&r=${offset}`, {
          headers: { 'User-Agent': UA, Accept: 'text/html' },
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) break;
        for (const r of parsePage(await res.text())) byTicker.set(r.ticker, r.cells);
        await new Promise((r) => setTimeout(r, 400)); // be polite
      } catch {
        break;
      }
    }
    return byTicker;
  } catch {
    return null;
  }
}

async function fetchScreen(): Promise<ScreenRow[] | null> {
  // Overview (company/sector/industry/country/mcap/P/E/price), Valuation (Fwd P/E),
  // Financial (dividend, ROE, LT debt/eq, margins).
  const overview = await fetchView('111');
  if (!overview) return null;
  await new Promise((r) => setTimeout(r, 400));
  const valuation = await fetchView('121');
  await new Promise((r) => setTimeout(r, 400));
  const financial = await fetchView('161');

  const rows: ScreenRow[] = [];
  for (const [ticker, c] of overview.entries()) {
    // v=111 cells: [No, Ticker, Company, Sector, Industry, Country, MktCap, P/E, Price, Change, Volume]
    const v = valuation?.get(ticker); // v=121: [No, Ticker, MktCap, P/E, FwdP/E, PEG, P/S, P/B, P/C, P/FCF, ...]
    const f = financial?.get(ticker); // v=161: [No, Ticker, MktCap, Dividend, ROA, ROE, ROIC, CurrR, QuickR, LTDebt/Eq, Debt/Eq, GrossM, OperM, ProfitM, ...]
    rows.push({
      symbol: ticker,
      company: c[2] || ticker,
      sector: c[3] || '',
      industry: c[4] || '',
      country: c[5] || '',
      marketCap: c[6] || '',
      trailingPE: cellNum(c[7]),
      price: cellNum(c[8]),
      forwardPE: cellNum(v?.[4]),
      dividendYieldPct: cellNum(f?.[3]),
      roePct: cellNum(f?.[5]),
      ltDebtToEquity: cellNum(f?.[9]),
      operatingMarginPct: cellNum(f?.[12]),
      netMarginPct: cellNum(f?.[13]),
    });
  }
  return rows.length ? rows : null;
}

// ── Snapshot persistence & dropped tracking ───────────────────────────────────

function readCache(): ScreenerResult | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as ScreenerResult;
  } catch {
    return null;
  }
}

function writeCache(data: ScreenerResult): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch {
    /* non-fatal */
  }
}

/**
 * Current screen + dropped history. Refreshes at most once per 24h; serves the
 * cached snapshot otherwise (and stale data when the live refresh fails).
 */
export async function getValueScreener(): Promise<ScreenerResult | null> {
  const now = Date.now();
  if (memCache && now - new Date(memCache.fetchedAt).getTime() < CACHE_TTL_MS) return memCache;

  const disk = readCache();
  if (disk && now - new Date(disk.fetchedAt).getTime() < CACHE_TTL_MS) {
    memCache = disk;
    return disk;
  }

  const rows = await fetchScreen();
  if (!rows) {
    // Keep serving stale results; don't mark anything as dropped on a failed fetch.
    if (disk) {
      const stale = { ...disk, live: false };
      memCache = stale;
      return stale;
    }
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const prevBySymbol = new Map((disk?.current || []).map((s) => [s.symbol, s]));
  const currentSymbols = new Set(rows.map((r) => r.symbol));

  const current: ScreenedStock[] = rows.map((r) => {
    const prev = prevBySymbol.get(r.symbol);
    return {
      symbol: r.symbol,
      name: r.company,
      sector: r.sector,
      industry: r.industry,
      country: r.country,
      marketCap: r.marketCap,
      price: r.price,
      trailingPE: r.trailingPE,
      forwardPE: r.forwardPE,
      dividendYieldPct: r.dividendYieldPct,
      roePct: r.roePct,
      operatingMarginPct: r.operatingMarginPct,
      netMarginPct: r.netMarginPct,
      firstSeen: prev?.firstSeen || today,
    };
  });

  // Stocks that were in the list but no longer pass the screen → flag as dropped.
  const cutoff = new Date(now - DROPPED_RETENTION_DAYS * 86400000).toISOString().slice(0, 10);
  const dropped: DroppedStock[] = [
    ...(disk?.current || [])
      .filter((s) => !currentSymbols.has(s.symbol))
      .map((s) => ({ symbol: s.symbol, name: s.name, sector: s.sector, droppedAt: today, firstSeen: s.firstSeen })),
    // Keep previous drops (unless the stock re-qualified) within the retention window.
    ...(disk?.dropped || []).filter((d) => !currentSymbols.has(d.symbol) && d.droppedAt >= cutoff),
  ];
  // De-dupe by symbol keeping the earliest drop date.
  const dropMap = new Map<string, DroppedStock>();
  for (const d of dropped) {
    const ex = dropMap.get(d.symbol);
    if (!ex || d.droppedAt < ex.droppedAt) dropMap.set(d.symbol, d);
  }

  const result: ScreenerResult = {
    current: current.sort((a, b) => (b.dividendYieldPct ?? 0) - (a.dividendYieldPct ?? 0)),
    dropped: Array.from(dropMap.values()).sort((a, b) => b.droppedAt.localeCompare(a.droppedAt)),
    fetchedAt: new Date().toISOString(),
    live: true,
  };
  memCache = result;
  writeCache(result);
  return result;
}
