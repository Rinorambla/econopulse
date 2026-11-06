// Server-only: economic-calendar events scraped from the same Tradays/MQL5 widget
// shown on /economics. The widget HTML embeds a clean JSON array of this week's
// events with ActualValue/ForecastValue/PreviousValue and an ISO-3166 numeric
// country code — released figures flow in as they come out (10-min cache).

import fs from 'fs';
import path from 'path';
import seedJson from '@/data/macro-matrix-seed.json';

export interface TradaysEvent {
  id: number;
  name: string;
  importance: 'High' | 'Medium' | 'Low';
  currency: string;
  actual: string;
  forecast: string;
  previous: string;
  releaseAt: string; // ISO datetime
  countryNum: number; // ISO-3166 numeric
  /** 1 = released (Processed), 0 = upcoming */
  processed: number;
  /** Event path for history lookups, e.g. "united-states/unemployment-rate" */
  url: string;
}

// ISO-3166 alpha-2 → numeric, for the countries tracked on /economics.
export const ISO2_TO_NUM: Record<string, number> = {
  US: 840, CN: 156, DE: 276, JP: 392, IN: 356, GB: 826, FR: 250, CA: 124, IT: 380, BR: 76,
  RU: 643, KR: 410, AU: 36, MX: 484, ES: 724, ID: 360, NL: 528, SA: 682, TR: 792, CH: 756,
  PL: 616, AR: 32, BE: 56, SE: 752, IE: 372, AT: 40, NO: 578, IL: 376, TH: 764, AE: 784,
  SG: 702, MY: 458, VN: 704, PH: 608, DK: 208, HK: 344, FI: 246, PT: 620, GR: 300, NZ: 554,
  CL: 152, CO: 170, ZA: 710, EG: 818, CZ: 203, RO: 642, HU: 348, EU: 999,
};
export const NUM_TO_ISO2: Record<number, string> = Object.fromEntries(Object.entries(ISO2_TO_NUM).map(([k, v]) => [v, k]));

// ISO-3166 alpha-2 → Tradays country-page slug (/en/economic-calendar/{slug}).
// Only the economies the provider publishes country pages for (others 404).
export const ISO2_TO_SLUG: Record<string, string> = {
  US: 'united-states', EU: 'european-union', CN: 'china', DE: 'germany', JP: 'japan',
  IN: 'india', GB: 'united-kingdom', FR: 'france', CA: 'canada', IT: 'italy', BR: 'brazil',
  KR: 'south-korea', AU: 'australia', MX: 'mexico', ES: 'spain', CH: 'switzerland',
  SE: 'sweden', NO: 'norway', SG: 'singapore', HK: 'hong-kong', NZ: 'new-zealand',
  ZA: 'south-africa',
};
export const ISO2_NAME: Record<string, string> = {
  US: 'United States', EU: 'Euro Area', CN: 'China', DE: 'Germany', JP: 'Japan', IN: 'India', GB: 'United Kingdom',
  FR: 'France', CA: 'Canada', IT: 'Italy', BR: 'Brazil', KR: 'South Korea', AU: 'Australia', MX: 'Mexico', ES: 'Spain',
  CH: 'Switzerland', SE: 'Sweden', NO: 'Norway', SG: 'Singapore', HK: 'Hong Kong', NZ: 'New Zealand', ZA: 'South Africa',
  RU: 'Russia', ID: 'Indonesia', NL: 'Netherlands', SA: 'Saudi Arabia', TR: 'Turkey', PL: 'Poland', AR: 'Argentina',
  BE: 'Belgium', IE: 'Ireland', AT: 'Austria', IL: 'Israel', TH: 'Thailand', AE: 'UAE', MY: 'Malaysia', VN: 'Vietnam',
  PH: 'Philippines', DK: 'Denmark', FI: 'Finland', PT: 'Portugal', GR: 'Greece', CL: 'Chile', CO: 'Colombia', EG: 'Egypt',
  CZ: 'Czechia', RO: 'Romania', HU: 'Hungary',
};

const WIDGET_URL = 'https://www.tradays.com/en/economic-calendar/widget?mode=2&theme=1&fw=html';
const CACHE_TTL_MS = 3 * 60 * 1000;

let cache: { at: number; events: TradaysEvent[] } | null = null;

function mapImportance(s: string): TradaysEvent['importance'] {
  const v = (s || '').toLowerCase();
  return v === 'high' ? 'High' : v === 'medium' ? 'Medium' : 'Low';
}

// The provider serves some strings double-encoded (UTF-8 bytes read as
// Latin-1: "€" → "â¬", "¥" → "Â¥") and pads figures with zero-width / narrow
// spaces. Undo both so values read and parse cleanly.
export function fixText(s: string): string {
  let t = s;
  if (/[\u00c2\u00c3\u00e2][\u0080-\u00bf]/.test(t) && !/[^\u0000-\u00ff]/.test(t)) {
    try { t = Buffer.from(t, 'latin1').toString('utf8'); } catch { /* keep as is */ }
  }
  return t
    .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
    .replace(/[\u00a0\u2009\u202f\u2007]/g, ' ')
    .replace(/[\u2212\u2012\u2013]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanVal(v: unknown): string {
  // The widget embeds non-breaking spaces (e.g. "48.3 K") that can double-encode,
  // and the history pages ship them as numeric entities ("130&#xA0;K").
  return fixText(String(v ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' '));
}

function parseEvents(html: string): TradaysEvent[] {
  const out: TradaysEvent[] = [];
  // Each event is a flat JSON object: {"Id": 312906, ... "Country": 392}
  for (const m of html.matchAll(/\{"Id":\s*\d+[^{}]*\}/g)) {
    try {
      const raw = JSON.parse(m[0]) as Record<string, unknown>;
      if (typeof raw.EventName !== 'string' || typeof raw.ReleaseDate !== 'number') continue;
      out.push({
        id: Number(raw.Id),
        name: raw.EventName,
        importance: mapImportance(String(raw.Importance || '')),
        currency: String(raw.CurrencyCode || ''),
        actual: cleanVal(raw.ActualValue),
        forecast: cleanVal(raw.ForecastValue),
        previous: cleanVal(raw.PreviousValue),
        releaseAt: new Date(raw.ReleaseDate).toISOString(),
        countryNum: Number(raw.Country || 0),
        processed: Number(raw.Processed || 0),
        url: String(raw.Url || '')
          .replace(/^\/en\/economic-calendar\/(widget\/)?/, '')
          .replace(/^\/+|\/+$/g, ''),
      });
    } catch {
      /* skip malformed entry */
    }
  }
  // De-dupe by id keeping the last occurrence (widget may embed the list twice).
  const byId = new Map<number, TradaysEvent>();
  for (const e of out) byId.set(e.id, e);
  return Array.from(byId.values()).sort((a, b) => a.releaseAt.localeCompare(b.releaseAt));
}

/** This week's calendar events (with live actuals). Never throws; [] on failure. */
export async function getTradaysCalendar(): Promise<TradaysEvent[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.events;
  try {
    const res = await fetch(WIDGET_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const events = parseEvents(await res.text());
      if (events.length) {
        cache = { at: Date.now(), events };
        return events;
      }
    }
  } catch {
    /* fall through */
  }
  return cache?.events || [];
}

// ── Per-event history (full archive straight from the Tradays event page) ─────

export interface EventHistoryRow {
  date: string; // ISO datetime of the release
  period: string; // reference period, e.g. "Sep 2026"
  actual: string;
  forecast: string;
  previous: string;
  /** Tradays' own good/bad coloring vs forecast ('' when neutral/unknown) */
  tone: 'green' | 'red' | '';
}

export interface EventHistory {
  /** Full chart series (ms epoch + numeric value), oldest → newest */
  series: Array<{ t: number; v: number }>;
  /** Release-by-release table rows, newest first */
  rows: EventHistoryRow[];
}

const HISTORY_TTL_MS = 60 * 60 * 1000;
const historyCache = new Map<string, { at: number; data: EventHistory | null }>();

export function isValidEventPath(p: string): boolean {
  return /^[a-z0-9-]+\/[a-z0-9-]+$/.test(p);
}

function parseHistory(html: string): EventHistory | null {
  // Chart series: var data=["idx,timestampMs,value", ...]
  const series: Array<{ t: number; v: number }> = [];
  const dm = html.match(/var data\s*=\s*\[([\s\S]*?)\]/);
  if (dm) {
    for (const part of dm[1].split('","')) {
      const bits = part.replace(/"/g, '').split(',');
      const t = Number(bits[1]);
      const v = Number(bits[2]);
      if (Number.isFinite(t) && Number.isFinite(v)) series.push({ t, v });
    }
  }

  // History table: one block per release with period/actual/forecast/previous.
  const rows: EventHistoryRow[] = [];
  for (const block of html.split('event-table-history__item').slice(1)) {
    const chunk = block.slice(0, 1600);
    const date = chunk.match(/data-date="(\d+)"/);
    const period = chunk.match(/__period">([^<]*)</);
    const tone = chunk.match(/__actual\s+(red|green)/);
    const actual = chunk.match(/__actual[^>]*>\s*<span[^>]*>\s*([^<]*?)\s*</);
    const forecast = chunk.match(/__forecast">([^<]*)</);
    const previous = chunk.match(/__previous[^>]*>\s*(?:<span[^>]*>)?\s*([^<]*?)\s*</);
    if (!date || !period) continue;
    rows.push({
      date: new Date(Number(date[1])).toISOString(),
      period: cleanVal(period[1]),
      actual: cleanVal(actual?.[1]),
      forecast: cleanVal(forecast?.[1]),
      previous: cleanVal(previous?.[1]),
      tone: (tone?.[1] as 'red' | 'green') || '',
    });
  }

  if (!series.length && !rows.length) return null;
  return { series, rows };
}

/** Full history for one event (chart series + monthly release table). */
export async function getTradaysEventHistory(eventPath: string): Promise<EventHistory | null> {
  if (!isValidEventPath(eventPath)) return null;
  const hit = historyCache.get(eventPath);
  if (hit && Date.now() - hit.at < HISTORY_TTL_MS) return hit.data;
  let data: EventHistory | null = null;
  try {
    const res = await fetch(`https://www.tradays.com/en/economic-calendar/${eventPath}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) data = parseHistory(await res.text());
  } catch {
    /* data stays null */
  }
  if (historyCache.size > 2000) historyCache.clear(); // simple bound
  historyCache.set(eventPath, { at: Date.now(), data });
  return data;
}

// ── Country history matrix (indicator × month, spreadsheet style) ─────────────

export interface CountryEventMeta {
  /** Event path, e.g. "united-states/unemployment-rate" */
  path: string;
  name: string;
  frequency: string;
}

/** One released figure placed in the month of its reference period. */
export interface MatrixCell {
  a: string; // actual (display)
  v: number | null; // numeric actual
  f: string; // forecast
  p: string; // previous
  period: string;
  tone: 'green' | 'red' | '';
  /** Set when the cell came from the live calendar (period inferred); cleared
   *  once the provider's history confirms the release. */
  live?: boolean;
}

export interface MatrixRow extends CountryEventMeta {
  /** Month key "YYYY-MM" (reference period) → released figure */
  values: Record<string, MatrixCell>;
}

export interface CountryMatrix {
  /** Month keys, oldest → newest */
  months: string[];
  rows: MatrixRow[];
  updatedAt: string;
  /** True when served from the last good build because the provider is unreachable. */
  stale?: boolean;
}

// Weekly/noise series that would flood a monthly sheet (auctions, oil stocks,
// seasonal duplicates, speeches…).
const EVENT_EXCLUDE =
  /auction|eia-|api-weekly|baker-hughes|redbook|mba-|wasde|cftc|\btic-|stocks-change|bill-|-note|-bond|fed-budget|loan-officer|\bteu\b|\brail|4-week|nsa|-sa$|speech|testimony|holiday|minutes|-annual$|home-sales-mm|housing-starts-mm|building-permits-mm|press-conference|statement|report$/;

// Priority order mirroring a macro data sheet (growth → rates → jobs → prices →
// consumer → surveys → production → housing → trade/credit); within a bucket,
// page order. Everything unmatched follows in page order.
const EVENT_PRIORITY: RegExp[] = [
  /gross-domestic|^gdp/,
  /interest-rate|rate-decision/,
  /nonfarm-payrolls/,
  /unemployment-rate|employment-change/,
  /participation-rate/,
  /^adp-/,
  /jolts|job-openings|job-offers/,
  /challenger/,
  /jobless-claims|unemployment-claims/,
  /average-hourly-earnings|^wage|average-earnings|labor-cost|labour-cost/,
  /consumer-price|^cpi|^core-cpi|core-inflation|inflation-rate|^hicp|harmonized/,
  /producer-price|^ppi|^core-ppi|wholesale-price/,
  /^core-pce/,
  /^pce-price|real-pce|real-personal-consumption/,
  /personal-income|personal-spending|real-consumer-spending/,
  /import-price|export-price/,
  /retail-sales/,
  /michigan|consumer-sentiment|consumer-confidence|economic-optimism|inflation-expectations/,
  /ism-manufacturing-pmi|ism-non-manufacturing-pmi|manufacturing-pmi|services-pmi|composite-pmi|caixin|^pmi/,
  /business-confidence|business-climate|ifo-|zew-|tankan|nfib/,
  /industrial-production|manufacturing-production/,
  /factory-orders|durable-goods|machinery-orders|core-machinery/,
  /capacity-utilization/,
  /new-home-sales|existing-home-sales|pending-home-sales|housing-starts/,
  /building-permits|house-price|home-price|construction-spending/,
  /dallas-fed-manufacturing|richmond-fed-manufacturing|philadelphia-fed-manufacturing|philly-fed|empire-state|chicago-pmi|kansas-fed/,
  /trade-balance|current-account/,
  /money-supply|consumer-credit|private-loans|bank-lending/,
  /government-budget|public-debt/,
];
const PER_BUCKET = 4;
const MAX_MATRIX_EVENTS = 84;
export const MATRIX_MONTHS = 26;

const COUNTRY_EVENTS_TTL_MS = 6 * 60 * 60 * 1000;
const countryEventsCache = new Map<string, { at: number; data: CountryEventMeta[] }>();

/** All indicator series listed on a provider country page, curated + prioritized. */
export async function getTradaysCountryEvents(iso2: string): Promise<CountryEventMeta[]> {
  const slug = ISO2_TO_SLUG[iso2];
  if (!slug) return [];
  const hit = countryEventsCache.get(slug);
  if (hit && Date.now() - hit.at < COUNTRY_EVENTS_TTL_MS) return hit.data;

  let events: CountryEventMeta[] = [];
  try {
    const res = await fetch(`https://www.tradays.com/en/economic-calendar/${slug}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const html = await res.text();
      const seen = new Set<string>();
      const rowRe = new RegExp(
        `href="/en/economic-calendar/(${slug}/[a-z0-9-]+)">([^<]+)</a>([\\s\\S]{0,1800}?)<td>(Weekly|Monthly|Quarterly|Yearly|Irregular)</td>`,
        'g'
      );
      for (const m of html.matchAll(rowRe)) {
        const path = m[1];
        const eventSlug = path.slice(slug.length + 1);
        if (seen.has(path) || EVENT_EXCLUDE.test(eventSlug)) continue;
        seen.add(path);
        events.push({ path, name: cleanVal(m[2]), frequency: m[4] });
      }
      const score = (e: CountryEventMeta) => {
        const s = e.path.slice(slug.length + 1);
        const i = EVENT_PRIORITY.findIndex((re) => re.test(s));
        return i === -1 ? EVENT_PRIORITY.length : i;
      };
      const buckets = new Map<number, CountryEventMeta[]>();
      for (const e of events) {
        const b = score(e);
        const arr = buckets.get(b) || [];
        if (b < EVENT_PRIORITY.length && arr.length >= PER_BUCKET) continue;
        arr.push(e);
        buckets.set(b, arr);
      }
      events = Array.from(buckets.keys())
        .sort((a, b) => a - b)
        .flatMap((b) => buckets.get(b)!)
        .slice(0, MAX_MATRIX_EVENTS);
    }
  } catch {
    /* fall through */
  }
  if (events.length) countryEventsCache.set(slug, { at: Date.now(), data: events });
  return events.length ? events : hit?.data || [];
}

// The provider prints "N/D" / "—" for not-yet-released figures; only cells
// with an actual number count as a print.
const hasFigure = (s: string | undefined | null): boolean => /\d/.test(String(s || ''));

const num = (s: string): number | null => {
  const m = String(s || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  let v = parseFloat(m[0]);
  if (/\bK\b/i.test(s)) v *= 1e3;
  else if (/\bM\b/i.test(s)) v *= 1e6;
  else if (/\bB\b/i.test(s)) v *= 1e9;
  else if (/\bT\b/i.test(s)) v *= 1e12;
  return Number.isFinite(v) ? v : null;
};

// ── Matrix build strategy ────────────────────────────────────────────────────
// Reading every indicator's history page costs ~80 requests per country, and
// the provider rate-limits aggressively. So:
//   1. A committed seed (src/data/macro-matrix-seed.json, built offline by
//      scripts/build-macro-matrix-seed.cjs) gives every country a full sheet.
//   2. At runtime the sheet is refreshed INCREMENTALLY: only rows whose event
//      had a release in the live calendar window are re-read (a handful), and
//      this week's live prints are overlaid immediately.
//   3. The merged result is cached 10 min in memory and persisted to
//      data-snapshots/ when the filesystem is writable.

type SeedShape = { builtAt: string; countries: Record<string, { months: string[]; rows: MatrixRow[] }> };
const SEED = seedJson as unknown as SeedShape;
const SNAP_DIR = path.join(process.cwd(), 'data-snapshots');
const snapFile = (iso2: string) => path.join(SNAP_DIR, `macro-matrix-${iso2}.json`);

// ── Reference-period bucketing ───────────────────────────────────────────────
// A macro data sheet is organised by the period the figure describes, not the
// day it was published: October CPI (released mid-November) sits in the
// October column, Q3 GDP in September. Provider period strings look like
// "Sep 2026", "Oct 2026 prelim.", "2 Q 2026" or "16 Oct 2026" (weekly).
const MON: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
export function refMonthKey(period: string, fallbackKey: string): string {
  const p = (period || '').trim();
  let m = p.match(/^(?:\d{1,2}\s+)?([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/);
  if (m && MON[m[1].toLowerCase()]) return `${m[2]}-${MON[m[1].toLowerCase()]}`;
  m = p.match(/^([1-4])\s*Q\s+(\d{4})/i) || p.match(/^Q([1-4])\s+(\d{4})/i);
  if (m) return `${m[2]}-${String(Number(m[1]) * 3).padStart(2, '0')}`;
  m = p.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;
  return fallbackKey;
}
const addMonths = (key: string, n: number): string => {
  const [y, mo] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
/** Re-bucket a row's cells by reference period (idempotent). On collisions
 *  the later release wins (final print over flash/prelim). */
function normalizeRow(row: MatrixRow): MatrixRow {
  const entries = Object.entries(row.values).sort(([a], [b]) => a.localeCompare(b));
  const values: Record<string, MatrixCell> = {};
  for (const [k, cell] of entries) {
    const a = fixText(cell.a);
    const c: MatrixCell = { ...cell, a, v: a === cell.a ? cell.v : num(a), f: fixText(cell.f), p: fixText(cell.p) };
    values[refMonthKey(c.period, k)] = c;
  }
  return { ...row, values };
}

function readSnapshot(iso2: string): CountryMatrix | null {
  try {
    const f = snapFile(iso2);
    if (fs.existsSync(f)) {
      const j = JSON.parse(fs.readFileSync(f, 'utf8')) as CountryMatrix;
      if (Array.isArray(j?.rows) && Array.isArray(j?.months)) return { ...j, rows: j.rows.map(normalizeRow) };
    }
  } catch { /* fall through to seed */ }
  const c = SEED.countries?.[iso2];
  return c ? { months: c.months, rows: c.rows.map(normalizeRow), updatedAt: SEED.builtAt } : null;
}
function writeSnapshot(iso2: string, m: CountryMatrix): void {
  try {
    if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR, { recursive: true });
    const { stale: _s, ...rest } = m;
    fs.writeFileSync(snapFile(iso2), JSON.stringify(rest), 'utf8');
  } catch { /* read-only FS (serverless) — memory cache still applies */ }
}

export function monthAxis(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = MATRIX_MONTHS - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

/** Read one event's history into reference-month → cell. Rows arrive newest
 *  first, so the latest release for a period (final over prelim) wins. */
async function rowValues(path: string, monthSet: Set<string>): Promise<Record<string, MatrixCell> | null> {
  const hist = await getTradaysEventHistory(path).catch(() => null);
  if (!hist) return null;
  const values: Record<string, MatrixCell> = {};
  for (const r of hist.rows) {
    if (!hasFigure(r.actual)) continue;
    const key = refMonthKey(r.period, r.date.slice(0, 7));
    if (!monthSet.has(key) || values[key]) continue;
    values[key] = { a: r.actual, v: num(r.actual), f: r.forecast, p: r.previous, period: r.period, tone: r.tone };
  }
  return values;
}

/** Reference month for a live print without a period string: the next period
 *  after the row's latest confirmed cell (weekly → release month). */
function inferLiveKey(row: MatrixRow, releaseKey: string): string {
  if (/^weekly/i.test(row.frequency)) return releaseKey;
  const step = /^quarterly/i.test(row.frequency) ? 3 : 1;
  const confirmed = Object.entries(row.values).filter(([, c]) => !c.live).map(([k]) => k).sort();
  if (!confirmed.length) return addMonths(releaseKey, -step);
  const next = addMonths(confirmed[confirmed.length - 1], step);
  // Never place a figure after its own release month.
  return next > releaseKey ? releaseKey : next;
}

/** Full build (offline seed script / first run without a seed). `limit` keeps
 *  only the top-priority rows (events are already priority-ordered). */
export async function buildCountryMatrixFull(iso2: string, concurrency = 3, pauseMs = 250, limit = Infinity): Promise<CountryMatrix | null> {
  const months = monthAxis();
  const monthSet = new Set(months);
  const events = (await getTradaysCountryEvents(iso2)).slice(0, limit);
  if (!events.length) return null;
  const rows: MatrixRow[] = new Array(events.length);
  let next = 0;
  const worker = async () => {
    while (next < events.length) {
      const idx = next++;
      const ev = events[idx];
      const values = (await rowValues(ev.path, monthSet)) || {};
      rows[idx] = { ...ev, values };
      if (pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, events.length) }, worker));
  const filled = rows.filter((r) => r && Object.keys(r.values).length > 0);
  return filled.length ? { months, rows: filled, updatedAt: new Date().toISOString() } : null;
}

const MATRIX_TTL_MS = 5 * 60 * 1000;
const FIRST_BUILD_ROWS = 56;
const TOPUP_ROWS = 10;
const matrixCache = new Map<string, { at: number; data: CountryMatrix }>();

/**
 * Spreadsheet-style history for one country: rows = indicators, columns = the
 * last N months, cells = the figure released in that month. Served from the
 * seed/snapshot and refreshed incrementally with this week's releases.
 */
export async function getCountryHistoryMatrix(iso2: string): Promise<CountryMatrix | null> {
  const hit = matrixCache.get(iso2);
  if (hit && Date.now() - hit.at < MATRIX_TTL_MS) return hit.data;

  const months = monthAxis();
  const monthSet = new Set(months);
  const base = hit?.data || readSnapshot(iso2);

  // No seed for this country → bounded first build (top-priority rows only,
  // gentle pace); the remaining rows are topped up on later refreshes.
  if (!base) {
    const full = await buildCountryMatrixFull(iso2, 2, 150, FIRST_BUILD_ROWS).catch(() => null);
    if (!full) return null;
    matrixCache.set(iso2, { at: Date.now(), data: full });
    writeSnapshot(iso2, full);
    return full;
  }

  // Re-align the base to the current month axis (drop months that aged out).
  const rows: MatrixRow[] = base.rows.map((r) => ({
    ...r,
    values: Object.fromEntries(Object.entries(r.values).filter(([k]) => monthSet.has(k))),
  }));
  const byPath = new Map(rows.map((r) => [r.path, r]));

  let touched = 0;
  let providerOk = true;
  try {
    const slug = ISO2_TO_SLUG[iso2];
    const live = (await getTradaysCalendar()).filter((e) => e.url.startsWith(`${slug}/`));
    // 1) Overlay live prints right away (no extra requests). The calendar has
    //    no period string, so the reference month is inferred and the cell is
    //    flagged `live` until the history read below confirms it.
    for (const e of live) {
      if (!hasFigure(e.actual)) continue;
      const row = byPath.get(e.url);
      if (!row) continue;
      const releaseKey = e.releaseAt.slice(0, 7);
      const already = Object.entries(row.values).some(([k, c]) => c.a === e.actual && k >= addMonths(releaseKey, -4) && k <= releaseKey);
      if (already) continue;
      const key = inferLiveKey(row, releaseKey);
      if (!monthSet.has(key)) continue;
      row.values[key] = { a: e.actual, v: num(e.actual), f: e.forecast, p: e.previous, period: '', tone: '', live: true };
      touched++;
    }
    // 2) Re-read history only for rows that had a release in the window (they
    //    may carry revisions / the provider's beat-miss tone) — capped.
    const refresh = Array.from(new Set(live.filter((e) => hasFigure(e.actual)).map((e) => e.url))).filter((p) => byPath.has(p)).slice(0, 24);
    // 3) Top up rows the sheet doesn't have yet (partial first build / newly
    //    listed indicators) — a few per refresh so the sheet completes over time.
    const catalogue = await getTradaysCountryEvents(iso2).catch(() => [] as CountryEventMeta[]);
    const missing = catalogue.filter((e) => !byPath.has(e.path)).slice(0, TOPUP_ROWS);
    let i = 0;
    const worker = async () => {
      while (i < refresh.length) {
        const p = refresh[i++];
        const values = await rowValues(p, monthSet);
        if (values === null) { providerOk = false; continue; }
        const row = byPath.get(p)!;
        // History is authoritative: drop inferred live cells it doesn't confirm.
        const kept = Object.fromEntries(Object.entries(row.values).filter(([k, c]) => !c.live || values[k]));
        row.values = { ...kept, ...values };
        touched++;
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, refresh.length) }, worker));
    let k = 0;
    const topup = async () => {
      while (k < missing.length) {
        const ev = missing[k++];
        const values = await rowValues(ev.path, monthSet);
        if (values === null) { providerOk = false; continue; }
        if (!Object.keys(values).length) continue;
        const row: MatrixRow = { ...ev, values };
        rows.push(row);
        byPath.set(ev.path, row);
        touched++;
        await new Promise((r) => setTimeout(r, 150));
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, missing.length) }, topup));
    if (missing.length) {
      // Keep catalogue order (priority) so the sheet reads like the seed.
      const order = new Map(catalogue.map((e, idx) => [e.path, idx]));
      rows.sort((a, b) => (order.get(a.path) ?? 1e9) - (order.get(b.path) ?? 1e9));
    }
  } catch {
    providerOk = false;
  }

  const data: CountryMatrix = {
    months,
    rows,
    updatedAt: touched ? new Date().toISOString() : base.updatedAt,
    stale: !providerOk && !touched ? true : undefined,
  };
  if (matrixCache.size > 60) matrixCache.clear();
  matrixCache.set(iso2, { at: Date.now(), data });
  if (touched) writeSnapshot(iso2, data);
  return data;
}
