export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 25;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { env } from '@/lib/env';

// Static sector mapping for S&P 500 stocks
const STOCK_SECTOR: Record<string, string> = {
  AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology', AVGO: 'Technology',
  CRM: 'Technology', ADBE: 'Technology', CSCO: 'Technology', ACN: 'Technology',
  ORCL: 'Technology', INTC: 'Technology', AMD: 'Technology', QCOM: 'Technology',
  TXN: 'Technology', IBM: 'Technology', AMAT: 'Technology', MU: 'Technology',
  UNH: 'Healthcare', JNJ: 'Healthcare', LLY: 'Healthcare', ABBV: 'Healthcare',
  MRK: 'Healthcare', PFE: 'Healthcare', TMO: 'Healthcare', ABT: 'Healthcare',
  DHR: 'Healthcare', BMY: 'Healthcare', AMGN: 'Healthcare', GILD: 'Healthcare',
  ISRG: 'Healthcare', VRTX: 'Healthcare', MDT: 'Healthcare',
  'BRK-B': 'Financial', JPM: 'Financial', V: 'Financial', MA: 'Financial',
  BAC: 'Financial', WFC: 'Financial', GS: 'Financial', MS: 'Financial',
  SPGI: 'Financial', BLK: 'Financial', AXP: 'Financial', CB: 'Financial',
  AMZN: 'Consumer Discretionary', TSLA: 'Consumer Discretionary',
  HD: 'Consumer Discretionary', MCD: 'Consumer Discretionary',
  NKE: 'Consumer Discretionary', LOW: 'Consumer Discretionary',
  SBUX: 'Consumer Discretionary', TJX: 'Consumer Discretionary',
  BKNG: 'Consumer Discretionary', CMG: 'Consumer Discretionary',
  GOOGL: 'Communication', META: 'Communication', NFLX: 'Communication',
  DIS: 'Communication', CMCSA: 'Communication', T: 'Communication',
  VZ: 'Communication', TMUS: 'Communication',
  GE: 'Industrials', CAT: 'Industrials', UNP: 'Industrials',
  HON: 'Industrials', UPS: 'Industrials', BA: 'Industrials',
  RTX: 'Industrials', DE: 'Industrials', LMT: 'Industrials',
  PG: 'Consumer Staples', KO: 'Consumer Staples', PEP: 'Consumer Staples',
  COST: 'Consumer Staples', WMT: 'Consumer Staples', PM: 'Consumer Staples',
  MO: 'Consumer Staples', MDLZ: 'Consumer Staples', CL: 'Consumer Staples',
  XOM: 'Energy', CVX: 'Energy', COP: 'Energy', SLB: 'Energy',
  EOG: 'Energy', MPC: 'Energy', PXD: 'Energy', VLO: 'Energy',
  NEE: 'Utilities', DUK: 'Utilities', SO: 'Utilities', D: 'Utilities',
  AEP: 'Utilities', SRE: 'Utilities', EXC: 'Utilities',
  PLD: 'Real Estate', AMT: 'Real Estate', CCI: 'Real Estate',
  EQIX: 'Real Estate', PSA: 'Real Estate', SPG: 'Real Estate', O: 'Real Estate',
  LIN: 'Materials', APD: 'Materials', SHW: 'Materials',
  FCX: 'Materials', NEM: 'Materials', ECL: 'Materials', DD: 'Materials',
};

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`stock-detail:${ip}`, 60, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });

  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol')?.trim().toUpperCase();
  if (!symbol) return NextResponse.json({ ok: false, error: 'missing symbol' }, { status: 400, headers: rateLimitHeaders(rl) });

  const apiKey = env.TIINGO_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, error: 'no data provider configured' }, { status: 503, headers: rateLimitHeaders(rl) });

  try {
    // Parallel: IEX quote + 1-year historical
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 365);

    const [iexRes, histRes, metaRes] = await Promise.all([
      fetch(`https://api.tiingo.com/iex?tickers=${encodeURIComponent(symbol)}&token=${apiKey}`, {
        headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000),
      }).catch(() => null),
      fetch(`https://api.tiingo.com/tiingo/daily/${encodeURIComponent(symbol)}/prices?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&token=${apiKey}`, {
        headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000),
      }).catch(() => null),
      fetch(`https://api.tiingo.com/tiingo/daily/${encodeURIComponent(symbol)}?token=${apiKey}`, {
        headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000),
      }).catch(() => null),
    ]);

    let price = 0, change = 0, changePct = 0, volume = 0, high = 0, low = 0, open = 0, prevClose = 0;
    if (iexRes?.ok) {
      const iexData = await iexRes.json();
      if (Array.isArray(iexData) && iexData.length > 0) {
        const q = iexData[0];
        price = q.last ?? q.tngoLast ?? q.close ?? 0;
        prevClose = q.prevClose ?? 0;
        change = price - prevClose;
        changePct = prevClose ? (change / prevClose) * 100 : 0;
        volume = q.volume ?? 0;
        high = q.high ?? 0;
        low = q.low ?? 0;
        open = q.open ?? 0;
      }
    }

    // Compute 52W high/low, 50D avg, 200D avg from historical
    let fiftyTwoWeekHigh: number | null = null;
    let fiftyTwoWeekLow: number | null = null;
    let fiftyDayAverage: number | null = null;
    let twoHundredDayAverage: number | null = null;
    let avgVolume: number | null = null;

    if (histRes?.ok) {
      const hist = await histRes.json();
      if (Array.isArray(hist) && hist.length > 0) {
        // If no IEX data, use latest daily bar
        if (!price && hist.length > 0) {
          const latest = hist[hist.length - 1];
          price = latest.close ?? latest.adjClose ?? 0;
          open = latest.open ?? 0;
          high = latest.high ?? 0;
          low = latest.low ?? 0;
          volume = latest.volume ?? 0;
          if (hist.length >= 2) {
            prevClose = hist[hist.length - 2].close ?? 0;
            change = price - prevClose;
            changePct = prevClose ? (change / prevClose) * 100 : 0;
          }
        }

        const closes = hist.map((b: any) => b.close ?? b.adjClose ?? 0).filter((c: number) => c > 0);
        const highs = hist.map((b: any) => b.high ?? 0).filter((h: number) => h > 0);
        const lows = hist.map((b: any) => b.low ?? 0).filter((l: number) => l > 0);
        const vols = hist.map((b: any) => b.volume ?? 0);

        if (highs.length) fiftyTwoWeekHigh = Math.max(...highs);
        if (lows.length) fiftyTwoWeekLow = Math.min(...lows);
        if (closes.length >= 50) fiftyDayAverage = closes.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50;
        if (closes.length >= 200) twoHundredDayAverage = closes.slice(-200).reduce((a: number, b: number) => a + b, 0) / 200;
        if (vols.length >= 60) avgVolume = Math.round(vols.slice(-60).reduce((a: number, b: number) => a + b, 0) / 60);
      }
    }

    // Meta (name, exchange)
    let shortName: string | null = null;
    let exchange: string | null = null;
    let description: string | null = null;
    if (metaRes?.ok) {
      const meta = await metaRes.json();
      shortName = meta.name ?? null;
      exchange = meta.exchangeCode ?? null;
      description = meta.description ?? null;
    }

    const sector = STOCK_SECTOR[symbol] ?? null;

    return NextResponse.json({
      ok: true,
      data: {
        symbol,
        shortName,
        exchange,
        description,
        sector,
        regularMarketPrice: price || null,
        regularMarketChange: change,
        regularMarketChangePercent: changePct,
        regularMarketVolume: volume || null,
        regularMarketOpen: open || null,
        regularMarketDayHigh: high || null,
        regularMarketDayLow: low || null,
        previousClose: prevClose || null,
        fiftyTwoWeekHigh,
        fiftyTwoWeekLow,
        fiftyDayAverage,
        twoHundredDayAverage,
        averageDailyVolume3Month: avgVolume,
        source: 'Tiingo',
      },
      asOf: new Date().toISOString(),
    }, { headers: rateLimitHeaders(rl) });
  } catch (e: any) {
    console.error('stock-detail error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
