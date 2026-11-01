// Server-only: "Top Stocks — Medium/Long Term" value & quality screener.
// Universe filtered by 12 criteria (mid-cap 2–10B, P/E & Fwd P/E < 15, dividend > 3%,
// op margin > 15%, ROE > 10%, LT debt/equity < 1, positive EPS growth past/this/next
// years, positive 5y sales growth, positive net margin) via the Finviz screener,
// then enriched with Yahoo metrics. A disk snapshot tracks membership over time so
// stocks that stop qualifying are flagged to the user instead of silently vanishing.

import fs from 'fs';
import os from 'os';
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

// Finviz blocks datacenter IPs (e.g. Vercel), so fall back to public HTML proxies.
// Only public screener URLs are fetched — no user data is involved.
type Transport = (url: string) => Promise<string | null>;

async function fetchText(url: string, headers: Record<string, string>, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const TRANSPORTS: Transport[] = [
  (url) => fetchText(url, { 'User-Agent': UA, Accept: 'text/html' }, 15000),
  (url) => fetchText(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { 'User-Agent': UA }, 25000),
  (url) => fetchText(`https://r.jina.ai/${url}`, { 'User-Agent': UA, 'X-Return-Format': 'html' }, 30000),
];

// Remember which transport worked so subsequent pages skip the blocked ones.
let transportIdx = 0;

async function fetchFinvizHtml(url: string): Promise<string | null> {
  for (let i = 0; i < TRANSPORTS.length; i++) {
    const idx = (transportIdx + i) % TRANSPORTS.length;
    const html = await TRANSPORTS[idx](url);
    // A valid screener page contains result rows (legacy or div-grid) or the total counter.
    if (html && (html.includes('styled-row') || html.includes('data-column-id=') || /#\d+\s*\/\s*\d+\s*Total/.test(html))) {
      transportIdx = idx;
      return html;
    }
  }
  return null;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DROPPED_RETENTION_DAYS = 90;
// Vercel's filesystem is read-only except /tmp; prefer the repo folder locally.
const CACHE_DIRS = [path.join(process.cwd(), 'data-snapshots'), path.join(os.tmpdir(), 'econopulse')];
const CACHE_NAME = 'value-screener.json';

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

/** Rows of ticker → named cells for one screener page (works with both the
 * legacy <table> markup and the 2026 div-grid markup with data-column-id). */
function parsePage(html: string): Array<{ ticker: string; cells: Record<string, string> }> {
  const out: Array<{ ticker: string; cells: Record<string, string> }> = [];

  // New div-grid markup: cells carry data-column-id + role="gridcell".
  const cellRe = /data-column-id="([A-Za-z0-9]+)"[^>]*role="gridcell"[^>]*>([\s\S]*?)<\/div>/g;
  let row: { ticker: string; cells: Record<string, string> } | null = null;
  for (const m of html.matchAll(cellRe)) {
    const col = m[1];
    const rawInner = m[2];
    if (col === 'ticker') {
      // Plain <span>TICKER</span> (the logo-letter span carries a class attribute).
      const t = [...rawInner.matchAll(/<span>([A-Z][A-Z0-9.-]*)<\/span>/g)].map((x) => x[1]).pop();
      row = t ? { ticker: t, cells: {} } : null;
      if (row) out.push(row);
    } else if (row) {
      row.cells[col] = rawInner.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
    }
  }
  if (out.length) return out;

  // Legacy <table> markup fallback.
  const LEGACY_COLS: Record<string, string[]> = {
    // v=111 / v=121 / v=161 positional headers (index 0 = row number)
    '11': ['row', 'ticker', 'company', 'sector', 'industry', 'country', 'marketCap', 'PE', 'price', 'change', 'volume'],
    '18v': ['row', 'ticker', 'marketCap', 'PE', 'forwardPE', 'PEG', 'PS', 'PB', 'PC', 'PFCF', 'epsYoY', 'epsYoY1', 'eps5Years', 'estLTGrowth', 'sales5Years', 'price', 'change', 'volume'],
    '18f': ['row', 'ticker', 'marketCap', 'dividendYield', 'roa', 'roe', 'roi', 'curRatio', 'quickRatio', 'ltdebtEq', 'debtEq', 'grossMargin', 'operMargin', 'netMargin', 'earningsDate', 'price', 'change', 'volume'],
  };
  for (const block of html.split('<tr class="styled-row').slice(1)) {
    const rowHtml = block.split('</tr>')[0];
    const tm = rowHtml.match(/stock\?t=([A-Z][A-Z0-9.-]*)/);
    if (!tm) continue;
    const values = rowHtml
      .split(/<td[^>]*>/)
      .slice(1)
      .map((c) => c.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim());
    const names =
      values.length === 11 ? LEGACY_COLS['11'] : /%$/.test(values[3] || '') ? LEGACY_COLS['18f'] : LEGACY_COLS['18v'];
    const cells: Record<string, string> = {};
    values.forEach((v, i) => { if (names[i]) cells[names[i]] = v; });
    out.push({ ticker: tm[1], cells });
  }
  return out;
}

async function fetchView(view: string): Promise<Map<string, Record<string, string>> | null> {
  try {
    const byTicker = new Map<string, Record<string, string>>();
    const html = await fetchFinvizHtml(`https://finviz.com/screener.ashx?v=${view}&f=${FINVIZ_FILTERS}&r=1`);
    if (!html) return null;
    const totalM = html.match(/#\d+\s*\/\s*(\d+)\s*Total/);
    const total = totalM ? Number(totalM[1]) : 0;
    for (const r of parsePage(html)) byTicker.set(r.ticker, r.cells);
    if (!byTicker.size) return null;

    for (let offset = 21; offset <= Math.min(total, 200); offset += 20) {
      const pageHtml = await fetchFinvizHtml(`https://finviz.com/screener.ashx?v=${view}&f=${FINVIZ_FILTERS}&r=${offset}`);
      if (!pageHtml) break;
      for (const r of parsePage(pageHtml)) byTicker.set(r.ticker, r.cells);
      await new Promise((r) => setTimeout(r, 400)); // be polite
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
    const v = valuation?.get(ticker);
    const f = financial?.get(ticker);
    rows.push({
      symbol: ticker,
      company: c.company || ticker,
      sector: c.sector || '',
      industry: c.industry || '',
      country: c.country || '',
      marketCap: c.marketCap || '',
      trailingPE: cellNum(c.PE),
      price: cellNum(c.price),
      forwardPE: cellNum(v?.forwardPE),
      dividendYieldPct: cellNum(f?.dividendYield),
      roePct: cellNum(f?.roe),
      ltDebtToEquity: cellNum(f?.ltdebtEq),
      operatingMarginPct: cellNum(f?.operMargin),
      netMarginPct: cellNum(f?.netMargin),
    });
  }
  return rows.length ? rows : null;
}

// ── Snapshot persistence & dropped tracking ───────────────────────────────────

function readCache(): ScreenerResult | null {
  for (const dir of CACHE_DIRS) {
    try {
      const file = path.join(dir, CACHE_NAME);
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')) as ScreenerResult;
    } catch {
      /* try next location */
    }
  }
  return null;
}

// Committed seed snapshot — bundled with the build so production always has data
// even when Finviz blocks every transport from datacenter IPs.
function readSeed(): ScreenerResult | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const seed = require('@/data/value-screener-seed.json') as ScreenerResult;
    return seed?.current?.length ? seed : null;
  } catch {
    return null;
  }
}

function writeCache(data: ScreenerResult): void {
  for (const dir of CACHE_DIRS) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, CACHE_NAME), JSON.stringify(data));
      return;
    } catch {
      /* read-only location (e.g. Vercel cwd) — try next */
    }
  }
}

/**
 * Current screen + dropped history. Refreshes at most once per 24h; serves the
 * cached snapshot otherwise, stale data when the live refresh fails, and the
 * committed seed snapshot as last resort (so production never shows an error).
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
    const fallback = disk || readSeed();
    if (fallback) {
      const stale = { ...fallback, live: false };
      memCache = stale;
      return stale;
    }
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  // Baseline for firstSeen/dropped tracking: disk cache, else the committed seed.
  const baseline = disk || readSeed();
  const prevBySymbol = new Map((baseline?.current || []).map((s) => [s.symbol, s]));
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
    ...(baseline?.current || [])
      .filter((s) => !currentSymbols.has(s.symbol))
      .map((s) => ({ symbol: s.symbol, name: s.name, sector: s.sector, droppedAt: today, firstSeen: s.firstSeen })),
    // Keep previous drops (unless the stock re-qualified) within the retention window.
    ...(baseline?.dropped || []).filter((d) => !currentSymbols.has(d.symbol) && d.droppedAt >= cutoff),
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
