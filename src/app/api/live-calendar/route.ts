export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getTradaysCalendar, NUM_TO_ISO2, ISO2_NAME } from '@/lib/tradays-calendar';

// Unified live calendar for /economics: this week's events from the calendar
// provider (live actual / forecast / previous, all countries, event path for
// history) merged with the EconoPulse schedule feed (/api/economic-calendar)
// for the days beyond the provider window, so the sheet always shows ~2 weeks.

export interface LiveCalEvent {
  id: string;
  ts: string; // ISO instant
  date: string; // YYYY-MM-DD (UTC)
  code: string; // ISO2 country
  region: string;
  event: string;
  importance: 'High' | 'Medium' | 'Low';
  actual: string;
  forecast: string;
  previous: string;
  url: string; // provider event path ("" when unknown)
  source: 'live' | 'schedule';
}

const FF_CODE: Record<string, string> = {
  'united states': 'US', 'euro area': 'EU', 'united kingdom': 'GB', japan: 'JP', canada: 'CA',
  australia: 'AU', 'new zealand': 'NZ', switzerland: 'CH', china: 'CN',
};

// Minutes a zone is ahead of UTC at a given instant.
function tzOffsetMinutes(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(at);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return (Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute')) - at.getTime()) / 60000;
}

// Schedule feed times are US Eastern ("08:30 ET").
function etToIso(date: string, time?: string): string {
  const m = time?.match(/^(\d{1,2}):(\d{2})/);
  const [y, mo, d] = date.split('-').map(Number);
  if (!m) return new Date(Date.UTC(y, mo - 1, d, 12)).toISOString();
  const guess = new Date(Date.UTC(y, mo - 1, d, Number(m[1]), Number(m[2])));
  return new Date(guess.getTime() - tzOffsetMinutes('America/New_York', guess) * 60000).toISOString();
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`live-cal:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const origin = new URL(req.url).origin;
  const [live, sched] = await Promise.all([
    getTradaysCalendar().catch(() => []),
    fetch(`${origin}/api/economic-calendar?days=14`, { cache: 'no-store', signal: AbortSignal.timeout(20000) })
      .then((r) => r.json()).then((j) => (Array.isArray(j?.data) ? j.data : [])).catch(() => []),
  ]);

  const out: LiveCalEvent[] = [];
  for (const e of live) {
    const code = NUM_TO_ISO2[e.countryNum] || '';
    if (!code) continue;
    out.push({
      id: `t${e.id}`,
      ts: e.releaseAt,
      date: e.releaseAt.slice(0, 10),
      code,
      region: ISO2_NAME[code] || code,
      event: e.name,
      importance: e.importance,
      actual: e.actual,
      forecast: e.forecast,
      previous: e.previous,
      url: e.url,
      source: 'live',
    });
  }

  // Schedule events only for days the live window doesn't cover.
  const liveDays = new Set(out.map((e) => e.date));
  const lastLive = out.length ? out.map((e) => e.date).sort().at(-1)! : '';
  let i = 0;
  for (const s of sched as Array<{ date: string; time?: string; region: string; event: string; importance: 'High' | 'Medium' | 'Low'; actual?: string; forecast?: string; previous?: string }>) {
    if (!s?.date || liveDays.has(s.date) || s.date <= lastLive) continue;
    const code = FF_CODE[String(s.region || '').toLowerCase()] || String(s.region || '').slice(0, 2).toUpperCase();
    out.push({
      id: `s${i++}`,
      ts: etToIso(s.date, s.time),
      date: s.date,
      code,
      region: ISO2_NAME[code] || s.region,
      event: s.event,
      importance: s.importance || 'Low',
      actual: s.actual && s.actual !== '-' ? s.actual : '',
      forecast: s.forecast || '',
      previous: s.previous || '',
      url: '',
      source: 'schedule',
    });
  }
  out.sort((a, b) => a.ts.localeCompare(b.ts));

  return NextResponse.json(
    { ok: true, events: out, liveCount: live.length, updatedAt: new Date().toISOString() },
    { headers: { ...rateLimitHeaders(rl), 'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600' } }
  );
}
