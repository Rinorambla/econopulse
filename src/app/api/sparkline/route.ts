export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

// 1-month daily closes per symbol for table sparklines (Yahoo spark endpoint).
const CACHE = new Map<string, { at: number; closes: number[] }>();
const TTL = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`sparkline:${ip}`, 30, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });
  try {
    const url = new URL(req.url);
    const csv = url.searchParams.get('symbols')?.trim() || '';
    const symbols = [...new Set(csv.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))].slice(0, 25);
    if (!symbols.length) return NextResponse.json({ ok: false, error: 'missing symbols' }, { status: 400, headers: rateLimitHeaders(rl) });

    const now = Date.now();
    const out: Record<string, number[]> = {};
    const missing = symbols.filter(s => {
      const c = CACHE.get(s);
      if (c && now - c.at < TTL) { out[s] = c.closes; return false; }
      return true;
    });

    if (missing.length) {
      const qs = new URLSearchParams({ symbols: missing.join(','), range: '1mo', interval: '1d' });
      const r = await fetch(`https://query1.finance.yahoo.com/v7/finance/spark?${qs}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 600 },
      });
      if (r.ok) {
        const js: any = await r.json();
        const results: any[] = js?.spark?.result || [];
        for (const item of results) {
          const sym = String(item?.symbol || '').toUpperCase();
          const resp = item?.response?.[0];
          const closes: number[] = (resp?.indicators?.quote?.[0]?.close || []).filter((v: any) => typeof v === 'number' && isFinite(v));
          if (sym && closes.length >= 2) {
            out[sym] = closes;
            CACHE.set(sym, { at: now, closes });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, data: out }, { headers: { ...rateLimitHeaders(rl), 'Cache-Control': 'public, max-age=300' } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
