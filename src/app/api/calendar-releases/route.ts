export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getTradaysCalendar, ISO2_TO_NUM } from '@/lib/tradays-calendar';

// Live-calendar events for one country (same data as the Tradays widget on
// /economics): released figures (actual vs forecast vs previous) + upcoming.

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`cal-rel:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const iso2 = (new URL(req.url).searchParams.get('country') || '').trim().toUpperCase();
  const num = ISO2_TO_NUM[iso2];
  if (!num) {
    return NextResponse.json({ ok: false, error: 'invalid_country' }, { status: 400, headers: rateLimitHeaders(rl) });
  }

  try {
    const all = await getTradaysCalendar();
    const mine = all.filter((e) => e.countryNum === num);
    const released = mine
      .filter((e) => e.actual !== '')
      .sort((a, b) => b.releaseAt.localeCompare(a.releaseAt))
      .slice(0, 10);
    const nowIso = new Date().toISOString();
    const upcoming = mine
      .filter((e) => e.actual === '' && e.releaseAt >= nowIso)
      .slice(0, 5);
    return NextResponse.json(
      { ok: true, released, upcoming },
      { headers: { ...rateLimitHeaders(rl), 'Cache-Control': 'public, max-age=0, s-maxage=600' } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
