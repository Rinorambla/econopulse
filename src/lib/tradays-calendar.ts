// Server-only: economic-calendar events scraped from the same Tradays/MQL5 widget
// shown on /economics. The widget HTML embeds a clean JSON array of this week's
// events with ActualValue/ForecastValue/PreviousValue and an ISO-3166 numeric
// country code — released figures flow in as they come out (10-min cache).

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
const CACHE_TTL_MS = 10 * 60 * 1000;

let cache: { at: number; events: TradaysEvent[] } | null = null;

function mapImportance(s: string): TradaysEvent['importance'] {
  const v = (s || '').toLowerCase();
  return v === 'high' ? 'High' : v === 'medium' ? 'Medium' : 'Low';
}

function cleanVal(v: unknown): string {
  // The widget embeds non-breaking spaces (e.g. "48.3 K") that can double-encode,
  // and the history pages ship them as numeric entities ("130&#xA0;K").
  return String(v ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/\u00c2?\u00a0/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

/** One released figure placed in its release month. */
export interface MatrixCell {
  a: string; // actual (display)
  v: number | null; // numeric actual
  f: string; // forecast
  p: string; // previous
  period: string;
  tone: 'green' | 'red' | '';
}

export interface MatrixRow extends CountryEventMeta {
  /** Month key "YYYY-MM" (release month) → released figure */
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

// Matrix cache: 10 min fresh; a failed rebuild re-serves the last good matrix
// (flagged stale) so the sheet never blanks out on provider hiccups.
const MATRIX_TTL_MS = 10 * 60 * 1000;
const matrixCache = new Map<string, { at: number; data: CountryMatrix }>();

/**
 * Spreadsheet-style history for one country: rows = indicators, columns = the
 * last N months, cells = the figure released in that month (latest release of
 * the month wins), with this week's live releases overlaid so new prints land
 * the moment they come out.
 */
export async function getCountryHistoryMatrix(iso2: string): Promise<CountryMatrix | null> {
  const hit = matrixCache.get(iso2);
  if (hit && Date.now() - hit.at < MATRIX_TTL_MS) return hit.data;

  const months: string[] = [];
  const now = new Date();
  for (let i = MATRIX_MONTHS - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  const monthSet = new Set(months);
  const stale = (): CountryMatrix | null => {
    if (!hit) return null;
    const d = { ...hit.data, stale: true };
    matrixCache.set(iso2, { at: Date.now() - MATRIX_TTL_MS + 2 * 60 * 1000, data: d }); // retry in 2 min
    return d;
  };

  const events = await getTradaysCountryEvents(iso2);
  if (!events.length) return stale();

  const rows: MatrixRow[] = new Array(events.length);
  const CONCURRENCY = 6;
  let next = 0;
  const worker = async () => {
    while (next < events.length) {
      const idx = next++;
      const ev = events[idx];
      const values: Record<string, MatrixCell> = {};
      const hist = await getTradaysEventHistory(ev.path).catch(() => null);
      if (hist) {
        for (const r of hist.rows) {
          const key = r.date.slice(0, 7);
          if (!monthSet.has(key) || values[key] || !r.actual) continue;
          values[key] = { a: r.actual, v: num(r.actual), f: r.forecast, p: r.previous, period: r.period, tone: r.tone };
        }
      }
      rows[idx] = { ...ev, values };
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, events.length) }, worker));

  // Live overlay from this week's calendar (same provider), keyed by event path.
  try {
    const slug = ISO2_TO_SLUG[iso2];
    const live = (await getTradaysCalendar()).filter((e) => e.actual !== '' && e.url.startsWith(`${slug}/`));
    const byPath = new Map(rows.filter(Boolean).map((r) => [r.path, r]));
    for (const e of live) {
      const row = byPath.get(e.url);
      if (!row) continue;
      const key = e.releaseAt.slice(0, 7);
      if (!monthSet.has(key)) continue;
      const cur = row.values[key];
      if (cur && cur.a === e.actual) continue;
      row.values[key] = { a: e.actual, v: num(e.actual), f: e.forecast, p: e.previous, period: '', tone: '' };
    }
  } catch {
    /* best-effort */
  }

  const filled = rows.filter((r) => r && Object.keys(r.values).length > 0);
  if (!filled.length) return stale();
  const data: CountryMatrix = { months, rows: filled, updatedAt: new Date().toISOString() };
  if (matrixCache.size > 60) matrixCache.clear();
  matrixCache.set(iso2, { at: Date.now(), data });
  return data;
}
