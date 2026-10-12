export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getValueScreener, SCREEN_CRITERIA } from '@/lib/value-screener';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`value-screener:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  try {
    const data = await getValueScreener();
    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'screen_unavailable' },
        { status: 503, headers: rateLimitHeaders(rl) }
      );
    }
    return NextResponse.json(
      { ok: true, criteria: SCREEN_CRITERIA, ...data },
      { headers: { ...rateLimitHeaders(rl), 'Cache-Control': 'public, max-age=0, s-maxage=3600' } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
