export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

// World government bond yields (10Y benchmarks + US curve points), intraday.
// Primary: one batched public quote call. Fallbacks: the issuing central
// banks' / treasuries' open daily data, so the card never goes dark for the
// majors. Values are yields in %, change in basis points vs previous close.

export interface BondQuote {
  id: string; // e.g. "DE10Y"
  yield: number;
  deltaBp: number | null;
  asOf: string; // ISO
  source: string;
}

const PRIMARY: Array<{ id: string; sym: string }> = [
  { id: 'US2Y', sym: 'US2Y' }, { id: 'US10Y', sym: 'US10Y' }, { id: 'US30Y', sym: 'US30Y' },
  { id: 'DE10Y', sym: 'DE10Y-DE' }, { id: 'IT10Y', sym: 'IT10Y-IT' }, { id: 'FR10Y', sym: 'FR10Y-FR' },
  { id: 'ES10Y', sym: 'ES10Y-ES' }, { id: 'GB10Y', sym: 'GB10Y-GB' }, { id: 'CH10Y', sym: 'CH10Y-CH' },
  { id: 'JP10Y', sym: 'JP10Y-JP' }, { id: 'CA10Y', sym: 'CA10Y-CA' }, { id: 'AU10Y', sym: 'AU10Y-AU' },
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const n = (s: unknown): number => parseFloat(String(s ?? '').replace(/[%,+\s]/g, ''));

async function viaQuotes(): Promise<Map<string, BondQuote>> {
  const out = new Map<string, BondQuote>();
  const syms = PRIMARY.map((p) => p.sym).join('|');
  const url = `https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=${encodeURIComponent(syms)}&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!res.ok) return out;
    const j = await res.json();
    const list: Array<Record<string, unknown>> = j?.FormattedQuoteResult?.FormattedQuote || [];
    for (const q of list) {
      const p = PRIMARY.find((x) => x.sym === q.symbol);
      if (!p) continue;
      const y = n(q.last);
      const ch = n(q.change);
      if (!Number.isFinite(y)) continue;
      const t = q.last_time ? new Date(String(q.last_time)) : new Date();
      out.set(p.id, { id: p.id, yield: y, deltaBp: Number.isFinite(ch) ? ch * 100 : null, asOf: (isNaN(t.getTime()) ? new Date() : t).toISOString(), source: 'market' });
    }
  } catch { /* fall through to official sources */ }
  return out;
}

// ── Official daily fallbacks (last two observations → level + change) ────────
type Obs = { date: string; value: number };
const fromObs = (id: string, obs: Obs[], source: string): BondQuote | null => {
  const clean = obs.filter((o) => Number.isFinite(o.value)).sort((a, b) => a.date.localeCompare(b.date));
  if (!clean.length) return null;
  const last = clean[clean.length - 1];
  const prev = clean.length > 1 ? clean[clean.length - 2] : null;
  return { id, yield: last.value, deltaBp: prev ? (last.value - prev.value) * 100 : null, asOf: new Date(last.date).toISOString(), source };
};
const get = (url: string, accept = 'text/csv,application/json,*/*') =>
  fetch(url, { headers: { 'User-Agent': UA, Accept: accept }, next: { revalidate: 1800 }, signal: AbortSignal.timeout(8000) });

async function viaDbnomics(id: string, code: string): Promise<BondQuote | null> {
  const r = await get(`https://api.db.nomics.world/v22/series/${code}?observations=1&format=json&limit=1`, 'application/json');
  const j = await r.json();
  const d = j?.series?.docs?.[0];
  const periods: string[] = d?.period_start_day || d?.period || [];
  const values: unknown[] = d?.value || [];
  const obs: Obs[] = periods.map((p, i) => ({ date: p, value: typeof values[i] === 'number' ? (values[i] as number) : NaN })).slice(-10);
  return fromObs(id, obs, 'Federal Reserve H.15');
}

const OFFICIAL: Record<string, () => Promise<BondQuote | null>> = {
  US10Y: () => viaDbnomics('US10Y', 'FED/H15/RIFLGFCY10_N.B'),
  US2Y: () => viaDbnomics('US2Y', 'FED/H15/RIFLGFCY02_N.B'),
  US30Y: () => viaDbnomics('US30Y', 'FED/H15/RIFLGFCY30_N.B'),
  CA10Y: async () => {
    const r = await get('https://www.bankofcanada.ca/valet/observations/BD.CDN.10YR.DQ.YLD/json?recent=5');
    const j = await r.json();
    const obs: Obs[] = (j?.observations || []).map((o: { d: string; [k: string]: unknown }) => ({ date: o.d, value: n((o['BD.CDN.10YR.DQ.YLD'] as { v?: string } | undefined)?.v) }));
    return fromObs('CA10Y', obs, 'Bank of Canada');
  },
  JP10Y: async () => {
    const r = await get('https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/jgbcme.csv');
    const obs: Obs[] = [];
    for (const l of (await r.text()).split(/\r?\n/)) {
      const m = l.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2}),(.*)$/);
      if (!m) continue;
      obs.push({ date: `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`, value: n(m[4].split(',')[9]) }); // 10Y column
    }
    return fromObs('JP10Y', obs, 'Japan MOF');
  },
  AU10Y: async () => {
    const r = await get('https://www.rba.gov.au/statistics/tables/csv/f2-data.csv');
    const obs: Obs[] = [];
    for (const l of (await r.text()).split(/\r?\n/)) {
      const m = l.match(/^(\d{2})-([A-Za-z]{3})-(\d{4}),([^,]*),([^,]*),([^,]*),([^,]*)/);
      if (!m) continue;
      const d = new Date(`${m[1]} ${m[2]} ${m[3]} UTC`);
      if (!isNaN(d.getTime())) obs.push({ date: d.toISOString().slice(0, 10), value: n(m[7]) }); // 10 year bond column
    }
    return fromObs('AU10Y', obs.slice(-10), 'RBA');
  },
  GB10Y: async () => {
    const from = new Date(Date.now() - 20 * 86400000);
    const ds = `${String(from.getUTCDate()).padStart(2, '0')}/${from.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}/${from.getUTCFullYear()}`;
    const r = await get(`https://www.bankofengland.co.uk/boeapps/iadb/fromshowcolumns.asp?csv.x=yes&Datefrom=${ds}&Dateto=now&SeriesCodes=IUDMNZC&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N`);
    const obs: Obs[] = [];
    for (const l of (await r.text()).split(/\r?\n/).slice(1)) {
      const [d, v] = l.split(',');
      const t = new Date(`${d} UTC`);
      if (d && !isNaN(t.getTime())) obs.push({ date: t.toISOString().slice(0, 10), value: n(v) });
    }
    return fromObs('GB10Y', obs, 'Bank of England');
  },
  DE10Y: async () => {
    const r = await get('https://api.statistiken.bundesbank.de/rest/data/BBSIS/D.I.ZAR.ZI.EUR.S1311.B.A604.R10XX.R.A.A._Z._Z.A?lastNObservations=5&format=csv', 'text/csv');
    const obs: Obs[] = [];
    for (const l of (await r.text()).split(/\r?\n/)) {
      const m = l.match(/^"?(\d{4}-\d{2}-\d{2})"?;([^;]*)/);
      if (m) obs.push({ date: m[1], value: n(m[2].replace(',', '.')) });
    }
    return fromObs('DE10Y', obs, 'Bundesbank');
  },
};

let memo: { at: number; data: BondQuote[] } | null = null;
const MEMO_MS = 60 * 1000;

export async function GET(req: NextRequest) {
  const rl = rateLimit(`world-bonds:${getClientIp(req)}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: rateLimitHeaders(rl) });
  // ?official=1 skips the market feed (diagnostics for the fallback sources).
  const officialOnly = req.nextUrl.searchParams.get('official') === '1';
  if (!officialOnly && memo && Date.now() - memo.at < MEMO_MS) {
    return NextResponse.json({ ok: true, quotes: memo.data, updatedAt: new Date(memo.at).toISOString() }, { headers: rateLimitHeaders(rl) });
  }
  const quotes = officialOnly ? new Map<string, BondQuote>() : await viaQuotes();
  const missing = PRIMARY.map((p) => p.id).filter((id) => !quotes.has(id) && OFFICIAL[id]);
  if (missing.length) {
    const results = await Promise.all(missing.map((id) => OFFICIAL[id]().catch(() => null)));
    for (const q of results) if (q) quotes.set(q.id, q);
  }
  const data = PRIMARY.map((p) => quotes.get(p.id)).filter((q): q is BondQuote => !!q);
  if (data.length && !officialOnly) memo = { at: Date.now(), data };
  return NextResponse.json(
    { ok: data.length > 0, quotes: data, updatedAt: new Date().toISOString() },
    { status: data.length ? 200 : 502, headers: { ...rateLimitHeaders(rl), 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' } }
  );
}
