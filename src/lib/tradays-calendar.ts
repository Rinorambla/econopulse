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
}

// ISO-3166 alpha-2 → numeric, for the countries tracked on /economics.
export const ISO2_TO_NUM: Record<string, number> = {
  US: 840, CN: 156, DE: 276, JP: 392, IN: 356, GB: 826, FR: 250, CA: 124, IT: 380, BR: 76,
  RU: 643, KR: 410, AU: 36, MX: 484, ES: 724, ID: 360, NL: 528, SA: 682, TR: 792, CH: 756,
  PL: 616, AR: 32, BE: 56, SE: 752, IE: 372, AT: 40, NO: 578, IL: 376, TH: 764, AE: 784,
  SG: 702, MY: 458, VN: 704, PH: 608, DK: 208, HK: 344, FI: 246, PT: 620, GR: 300, NZ: 554,
  CL: 152, CO: 170, ZA: 710, EG: 818, CZ: 203, RO: 642, HU: 348,
};

const WIDGET_URL = 'https://www.tradays.com/en/economic-calendar/widget?mode=2&theme=1&fw=html';
const CACHE_TTL_MS = 10 * 60 * 1000;

let cache: { at: number; events: TradaysEvent[] } | null = null;

function mapImportance(s: string): TradaysEvent['importance'] {
  const v = (s || '').toLowerCase();
  return v === 'high' ? 'High' : v === 'medium' ? 'Medium' : 'Low';
}

function cleanVal(v: unknown): string {
  // The widget embeds non-breaking spaces (e.g. "48.3 K") that can double-encode.
  return String(v ?? '').replace(/\u00c2?\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
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
