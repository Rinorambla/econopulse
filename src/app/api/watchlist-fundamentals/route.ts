export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

type FundRow = {
  symbol: string;
  dividendYield?: number | null;
  forwardPE?: number | null;
  earningsDate?: string | null;
  earningsGrowth?: number | null;
  holdingsCount?: number | null; // for ETFs
};

async function fetchQuoteSummary(symbol: string) {
  const modules = [
    'summaryDetail',
    'financialData',
    'calendarEvents',
    'topHoldings',
  ].join(',');
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconopulseBot/1.0)' },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const js = await res.json();
  const r = js?.quoteSummary?.result?.[0];
  return r || null;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`watchlist-fund:${ip}`, 60, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });

  try {
    const url = new URL(req.url);
    const csv = url.searchParams.get('symbols')?.trim() || '';
    let symbols = csv.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    if (!symbols.length) return NextResponse.json({ ok: false, error: 'missing symbols' }, { status: 400, headers: rateLimitHeaders(rl) });
    symbols = symbols.slice(0, 12); // safety cap

    const out: Record<string, FundRow> = {};
    for (const sym of symbols) {
      const r = await fetchQuoteSummary(sym);
      if (!r) { out[sym] = { symbol: sym }; continue; }
      const dy = r.summaryDetail?.dividendYield?.raw ?? r.summaryDetail?.trailingAnnualDividendYield?.raw ?? null;
      const fpe = r.financialData?.forwardPE?.raw ?? null;
      const eg = r.financialData?.earningsGrowth?.raw ?? null;
      let ed: string | null = null;
      try {
        const edArr = r.calendarEvents?.earnings?.earningsDate || r.calendarEvents?.earningsDate;
        if (Array.isArray(edArr) && edArr[0]?.raw) ed = new Date(edArr[0].raw * 1000).toISOString();
        else if (edArr?.raw) ed = new Date(edArr.raw * 1000).toISOString();
      } catch {}
      let hc: number | null = null;
      try {
        const h = r.topHoldings?.holdings || r.topHoldings?.stockHoldings || r.topHoldings?.equityHoldings;
        if (Array.isArray(h)) hc = h.length;
        else if (typeof r.topHoldings?.maxAge === 'number') hc = r.topHoldings?.maxAge || null; // fallback meaningless but avoids undefined
      } catch {}
      out[sym] = {
        symbol: sym,
        dividendYield: dy,
        forwardPE: fpe,
        earningsDate: ed,
        earningsGrowth: eg,
        holdingsCount: hc,
      };
      // polite pacing
      await new Promise(r => setTimeout(r, 120));
    }
    return NextResponse.json({ ok: true, data: out, asOf: new Date().toISOString() }, { headers: rateLimitHeaders(rl) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown_error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
