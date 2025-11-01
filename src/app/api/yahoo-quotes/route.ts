export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getYahooQuotes } from '@/lib/yahooFinance';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`yahoo-quotes:${ip}`, 80, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });
  try {
    const url = new URL(req.url);
    const csv = url.searchParams.get('symbols')?.trim() || '';
    const symbols = csv.split(',').map(s => s.trim()).filter(Boolean).slice(0, 20);
    if (!symbols.length) return NextResponse.json({ ok: false, error: 'missing symbols' }, { status: 400, headers: rateLimitHeaders(rl) });
    const quotes = await getYahooQuotes(symbols);
    return NextResponse.json({ ok: true, data: quotes, asOf: new Date().toISOString() }, { headers: rateLimitHeaders(rl) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown_error' }, { status: 500 });
  }
}
