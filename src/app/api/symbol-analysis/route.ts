export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 20;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { fetchYahooHistory } from '@/lib/yahoo-history';

/**
 * Deterministic quant analysis for any symbol — computed from REAL price data
 * (1 year of daily bars via Yahoo). No AI key needed, always precise:
 *   - Multi-timeframe trend matrix (5D / 1M / 3M / 6M / 1Y returns)
 *   - Technicals: RSI(14), MACD(12,26,9), SMA20/50/200 posture, golden/death cross
 *   - Volatility (ATR14 %), volume trend vs 20-day average
 *   - 52-week range position
 *   - Support / resistance from swing-point pivots
 *   - Composite 0-100 score + verdict (Strong Sell → Strong Buy)
 */

interface Bar { time: number; open: number; high: number; low: number; close: number; volume: number }

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  let s = 0;
  for (let i = values.length - period; i < values.length; i++) s += values[i];
  return s / period;
}

function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  let avgGain = gain / period, avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, d)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function emaSeries(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[0] : values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function macdState(closes: number[]): { macd: number; signal: number; hist: number } | null {
  if (closes.length < 35) return null;
  const e12 = emaSeries(closes, 12);
  const e26 = emaSeries(closes, 26);
  const macdLine = e12.map((v, i) => v - e26[i]);
  const sig = emaSeries(macdLine.slice(-60), 9); // signal over recent window
  const macd = macdLine[macdLine.length - 1];
  const signal = sig[sig.length - 1];
  return { macd, signal, hist: macd - signal };
}

function atrPct(bars: Bar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = bars.length - period; i < bars.length; i++) {
    const h = bars[i].high, l = bars[i].low, pc = bars[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const atr = trs.reduce((a, b) => a + b, 0) / trs.length;
  const last = bars[bars.length - 1].close;
  return last > 0 ? (atr / last) * 100 : null;
}

/** Return % over the last n TRADING days (approx calendar mapping done by caller). */
function retOver(closes: number[], nBars: number): number | null {
  if (closes.length <= nBars) return null;
  const then = closes[closes.length - 1 - nBars];
  const now = closes[closes.length - 1];
  return then > 0 ? ((now - then) / then) * 100 : null;
}

/** Swing-point pivots: local highs/lows over a lookback window, clustered. */
function pivotLevels(bars: Bar[], lookback = 120, wing = 3): { support: number[]; resistance: number[] } {
  const slice = bars.slice(-lookback);
  const last = bars[bars.length - 1].close;
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = wing; i < slice.length - wing; i++) {
    let isHigh = true, isLow = true;
    for (let j = 1; j <= wing; j++) {
      if (slice[i].high < slice[i - j].high || slice[i].high < slice[i + j].high) isHigh = false;
      if (slice[i].low > slice[i - j].low || slice[i].low > slice[i + j].low) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) highs.push(slice[i].high);
    if (isLow) lows.push(slice[i].low);
  }
  // Cluster levels within 0.75% of each other, keep the 3 nearest to price.
  const cluster = (arr: number[]): number[] => {
    const sorted = [...arr].sort((a, b) => a - b);
    const groups: number[][] = [];
    for (const v of sorted) {
      const g = groups[groups.length - 1];
      if (g && Math.abs(v - g[g.length - 1]) / v < 0.0075) g.push(v);
      else groups.push([v]);
    }
    return groups.map((g) => g.reduce((a, b) => a + b, 0) / g.length);
  };
  const support = cluster(lows).filter((v) => v < last).sort((a, b) => b - a).slice(0, 3);
  const resistance = cluster(highs).filter((v) => v > last).sort((a, b) => a - b).slice(0, 3);
  return { support, resistance };
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`symbol-analysis:${ip}`, 30, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });

  const url = new URL(req.url);
  const symbol = (url.searchParams.get('symbol') || '').trim().toUpperCase();
  if (!symbol || /^FRED:/i.test(symbol) || symbol.includes('/')) {
    return NextResponse.json({ ok: false, error: 'unsupported symbol' }, { status: 400, headers: rateLimitHeaders(rl) });
  }

  try {
    const hist = await fetchYahooHistory(symbol, '1y', '1d');
    const bars: Bar[] = (hist?.bars || []).filter((b) => Number.isFinite(b.close) && b.close > 0);
    if (bars.length < 60) {
      return NextResponse.json({ ok: false, error: 'not enough history' }, { status: 404, headers: rateLimitHeaders(rl) });
    }

    const closes = bars.map((b) => b.close);
    const last = closes[closes.length - 1];

    // ── Trend matrix (trading-day approximations) ────────────────────────────
    const trend = {
      d5: retOver(closes, 5),
      m1: retOver(closes, 21),
      m3: retOver(closes, 63),
      m6: retOver(closes, 126),
      y1: retOver(closes, Math.min(251, closes.length - 1)),
    };

    // ── Technicals ────────────────────────────────────────────────────────────
    const rsi14 = rsi(closes, 14);
    const macd = macdState(closes);
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const sma200 = sma(closes, 200);
    const atr = atrPct(bars, 14);

    const hi52 = Math.max(...bars.map((b) => b.high));
    const lo52 = Math.min(...bars.map((b) => b.low));
    const from52High = hi52 > 0 ? ((last - hi52) / hi52) * 100 : null;
    const from52Low = lo52 > 0 ? ((last - lo52) / lo52) * 100 : null;

    const vol20 = sma(bars.map((b) => b.volume), 20);
    const lastVol = bars[bars.length - 1].volume;
    const volumeVsAvg = vol20 && vol20 > 0 ? ((lastVol - vol20) / vol20) * 100 : null;

    const { support, resistance } = pivotLevels(bars);

    // ── Composite score 0-100 ────────────────────────────────────────────────
    // Each signal votes -2..+2; sum is mapped to 0-100.
    let score = 0, maxScore = 0;
    const vote = (v: number, w = 1) => { score += v * w; maxScore += 2 * w; };

    if (sma20 != null) vote(last > sma20 ? 1 : -1);
    if (sma50 != null) vote(last > sma50 ? 1 : -1);
    if (sma200 != null) vote(last > sma200 ? 2 : -2);                     // long-term regime (weight)
    if (sma50 != null && sma200 != null) vote(sma50 > sma200 ? 2 : -2);   // golden/death cross
    if (rsi14 != null) vote(rsi14 >= 70 ? -1 : rsi14 >= 55 ? 2 : rsi14 >= 45 ? 0 : rsi14 >= 30 ? -1 : 1); // overbought/oversold aware
    if (macd) vote(macd.hist > 0 ? 2 : -2);
    if (trend.m1 != null) vote(trend.m1 > 2 ? 1 : trend.m1 < -2 ? -1 : 0);
    if (trend.m3 != null) vote(trend.m3 > 5 ? 2 : trend.m3 < -5 ? -2 : 0);
    if (from52High != null) vote(from52High > -3 ? 1 : from52High < -25 ? -1 : 0); // near highs = strength

    const composite = maxScore > 0 ? Math.round(((score + maxScore) / (2 * maxScore)) * 100) : 50;
    const verdict =
      composite >= 72 ? 'Strong Buy' :
      composite >= 58 ? 'Buy' :
      composite >= 42 ? 'Neutral' :
      composite >= 28 ? 'Sell' : 'Strong Sell';

    return NextResponse.json(
      {
        ok: true,
        symbol,
        price: +last.toFixed(4),
        asOf: new Date(bars[bars.length - 1].time).toISOString(),
        composite,
        verdict,
        trend,
        technicals: {
          rsi14: rsi14 != null ? +rsi14.toFixed(1) : null,
          macdHist: macd ? +macd.hist.toFixed(4) : null,
          sma20: sma20 != null ? +sma20.toFixed(2) : null,
          sma50: sma50 != null ? +sma50.toFixed(2) : null,
          sma200: sma200 != null ? +sma200.toFixed(2) : null,
          goldenCross: sma50 != null && sma200 != null ? sma50 > sma200 : null,
          atrPct: atr != null ? +atr.toFixed(2) : null,
          volumeVsAvg: volumeVsAvg != null ? +volumeVsAvg.toFixed(1) : null,
          from52High: from52High != null ? +from52High.toFixed(1) : null,
          from52Low: from52Low != null ? +from52Low.toFixed(1) : null,
        },
        levels: {
          support: support.map((v) => +v.toFixed(2)),
          resistance: resistance.map((v) => +v.toFixed(2)),
        },
      },
      { headers: { ...rateLimitHeaders(rl), 'Cache-Control': 'public, max-age=120' } },
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
