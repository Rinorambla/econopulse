import { NextRequest, NextResponse } from 'next/server'

// Fetch Yahoo Finance chart data for a ticker (1y daily) and compute multi-timeframe returns
async function fetchYahooHistory(ticker: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta || {};
    const quotes = result.indicators?.quote?.[0] || {};
    const closes: number[] = (quotes.close || []).filter((v: any) => typeof v === 'number');
    if (!closes.length) return null;
    const last = closes[closes.length - 1];
    // helper to get close n trading days ago
    function closeNDaysAgo(n: number) {
      return closes[closes.length - 1 - n] ?? closes[0];
    }
    const prev1 = closeNDaysAgo(1) || last; // previous day
    // approximate trading day counts
    const oneWeek = closeNDaysAgo(5) || closes[0];
    const oneMonth = closeNDaysAgo(21) || closes[0];
    const oneQuarter = closeNDaysAgo(63) || closes[0];
    const oneYear = closes[0];

    const pct = (curr: number, base: number) => base ? ((curr - base) / base) * 100 : 0;

    const dailyPct = pct(last, prev1);
    const weeklyPct = pct(last, oneWeek);
    const monthlyPct = pct(last, oneMonth);
    const quarterlyPct = pct(last, oneQuarter);
    const yearlyPct = pct(last, oneYear);

    const previousClose = prev1;
    const change = last - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    const fmt = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;

    return {
      symbol: ticker.toUpperCase(),
      name: meta.longName || meta.shortName || ticker.toUpperCase(),
      price: last,
      change: change,
      changePercent,
      performance: {
        daily: fmt(dailyPct),
        weekly: fmt(weeklyPct),
        monthly: fmt(monthlyPct),
        quarterly: fmt(quarterlyPct),
        yearly: fmt(yearlyPct)
      }
    };
  } catch (e) {
    console.warn('Quote fetch error', ticker, e);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get('symbols');
  if (!symbolsParam) return NextResponse.json({ ok: false, error: 'symbols param required' }, { status: 400 });
  const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 60); // safety cap

  const out: Record<string, any> = {};
  for (const sym of symbols) {
    const q = await fetchYahooHistory(sym);
    if (q) out[q.symbol] = q;
    // small delay to be polite
    await new Promise(r => setTimeout(r, 80));
  }
  return NextResponse.json({ ok: true, count: Object.keys(out).length, data: out, timestamp: new Date().toISOString() });
}
