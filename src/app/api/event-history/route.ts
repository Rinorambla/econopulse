export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getTradaysEventHistory, isValidEventPath } from '@/lib/tradays-calendar';

// Full history of one calendar indicator (chart series + month-by-month releases),
// sourced from the same provider as the Live Calendar widget.

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`evt-hist:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const eventPath = (new URL(req.url).searchParams.get('event') || '').trim().toLowerCase();
  if (!isValidEventPath(eventPath)) {
    return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400, headers: rateLimitHeaders(rl) });
  }

  try {
    const data = await getTradaysEventHistory(eventPath);
    if (!data) {
      return NextResponse.json({ ok: false, error: 'no_data' }, { status: 404, headers: rateLimitHeaders(rl) });
    }
    return NextResponse.json(
      { ok: true, series: data.series, rows: data.rows },
      { headers: { ...rateLimitHeaders(rl), 'Cache-Control': 'public, max-age=0, s-maxage=3600' } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
