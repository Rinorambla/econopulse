export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getCountryHistoryMatrix, ISO2_TO_SLUG } from '@/lib/tradays-calendar';

// Spreadsheet-style macro history for one country (rows = indicators, columns
// = last months, cells = the figure released that month). Powers the WECO heat
// map on /economics; refreshes automatically as releases come out.

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`cty-hist:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: rateLimitHeaders(rl) });
  }
  const iso2 = (new URL(req.url).searchParams.get('country') || '').trim().toUpperCase();
  if (!ISO2_TO_SLUG[iso2]) {
    return NextResponse.json({ ok: false, error: 'invalid_country' }, { status: 400, headers: rateLimitHeaders(rl) });
  }
  try {
    const data = await getCountryHistoryMatrix(iso2);
    if (!data) {
      return NextResponse.json({ ok: false, error: 'no_data' }, { status: 404, headers: rateLimitHeaders(rl) });
    }
    return NextResponse.json(
      { ok: true, country: iso2, ...data },
      { headers: { ...rateLimitHeaders(rl), 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=1800' } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
