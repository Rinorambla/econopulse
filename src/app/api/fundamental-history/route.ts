export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getFundamentalsHistory } from '@/lib/fundamentals-history';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`fundamental-history:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const symbol = (new URL(req.url).searchParams.get('symbol') || '').trim().toUpperCase();
  if (!symbol || !/^[A-Z0-9.^=-]{1,12}$/.test(symbol)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_symbol' },
      { status: 400, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const data = await getFundamentalsHistory(symbol);
    if (!data || (!data.annual.length && !data.quarterly.length)) {
      return NextResponse.json(
        { ok: false, error: 'no_data' },
        { status: 404, headers: rateLimitHeaders(rl) }
      );
    }
    return NextResponse.json(
      { ok: true, ...data },
      {
        headers: {
          ...rateLimitHeaders(rl),
          // Fundamentals change quarterly; cache at the CDN but always revalidate in the
          // browser so schema upgrades are picked up immediately.
          'Cache-Control': 'public, max-age=0, must-revalidate, s-maxage=21600, stale-while-revalidate=86400',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500, headers: rateLimitHeaders(rl) }
    );
  }
}
