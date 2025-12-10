export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { env } from '@/lib/env';

type FundRow = {
  symbol: string;
  dividendYield?: number | null;
  forwardPE?: number | null;
  earningsDate?: string | null;
  earningsGrowth?: number | null;
  holdingsCount?: number | null; // for ETFs
};

// Tiingo fundamentals via /meta endpoint
async function fetchTiingoMeta(symbol: string) {
  const apiKey = env.TIINGO_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://api.tiingo.com/tiingo/daily/${encodeURIComponent(symbol)}?token=${apiKey}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data || null;
  } catch {
    return null;
  }
}

// Yahoo Finance fallback
async function fetchYahooQuoteSummary(symbol: string) {
  const modules = [
    'summaryDetail',
    'financialData',
    'calendarEvents',
    'topHoldings',
  ].join(',');
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconopulseBot/1.0)' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const js = await res.json();
    const r = js?.quoteSummary?.result?.[0];
    return r || null;
  } catch {
    return null;
  }
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
      // Try Tiingo first for better data coverage
      const tiingoData = await fetchTiingoMeta(sym);
      let dy: number | null = null;
      let fpe: number | null = null;
      let eg: number | null = null;
      let ed: string | null = null;
      let hc: number | null = null;

      if (tiingoData) {
        // Extract from Tiingo /meta endpoint
        dy = tiingoData.dividendYield ?? null;
        // Note: Tiingo /meta doesn't have forwardPE or earnings date
        // We'll need Yahoo fallback for those
      }

      // Fallback to Yahoo for missing data
      if (!dy || !fpe || !ed) {
        const yahooData = await fetchYahooQuoteSummary(sym);
        if (yahooData) {
          if (!dy) {
            dy = yahooData.summaryDetail?.dividendYield?.raw ?? 
                 yahooData.summaryDetail?.trailingAnnualDividendYield?.raw ?? null;
          }
          if (!fpe) {
            fpe = yahooData.financialData?.forwardPE?.raw ?? null;
          }
          if (!eg) {
            eg = yahooData.financialData?.earningsGrowth?.raw ?? null;
          }
          if (!ed) {
            try {
              const edArr = yahooData.calendarEvents?.earnings?.earningsDate || 
                           yahooData.calendarEvents?.earningsDate;
              if (Array.isArray(edArr) && edArr[0]?.raw) {
                ed = new Date(edArr[0].raw * 1000).toISOString();
              } else if (edArr?.raw) {
                ed = new Date(edArr.raw * 1000).toISOString();
              }
            } catch {}
          }
          // Holdings count (ETF only)
          try {
            const th = yahooData.topHoldings;
            if (th) {
              const holdings = th.holdings || th.stockHoldings || th.equityHoldings;
              if (Array.isArray(holdings) && holdings.length > 0) hc = holdings.length;
            }
          } catch {}
        }
      }

      out[sym] = {
        symbol: sym,
        dividendYield: dy,
        forwardPE: fpe,
        earningsDate: ed,
        earningsGrowth: eg,
        holdingsCount: hc,
      };
      
      // Polite pacing between requests
      await new Promise(r => setTimeout(r, 150));
    }
    
    return NextResponse.json({ ok: true, data: out, asOf: new Date().toISOString() }, { headers: rateLimitHeaders(rl) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown_error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
