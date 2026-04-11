export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 25;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getTiingoMarketData } from '@/lib/tiingo';

// All heatmap symbols — S&P 500 top stocks by weight
const HEATMAP_SYMBOLS = [
  'AAPL', 'MSFT', 'NVDA', 'AVGO', 'CRM', 'ADBE', 'CSCO', 'ACN', 'ORCL', 'INTC', 'AMD', 'QCOM',
  'UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'PFE', 'TMO', 'ABT', 'DHR', 'BMY',
  'BRK-B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'SPGI', 'BLK',
  'AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'LOW', 'SBUX', 'TJX', 'BKNG', 'CMG',
  'GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS',
  'GE', 'CAT', 'UNP', 'HON', 'UPS', 'BA', 'RTX', 'DE', 'LMT',
  'PG', 'KO', 'PEP', 'COST', 'WMT', 'PM', 'MO', 'MDLZ',
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PXD', 'VLO',
  'NEE', 'DUK', 'SO', 'D', 'AEP', 'SRE', 'EXC',
  'PLD', 'AMT', 'CCI', 'EQIX', 'PSA', 'SPG', 'O',
  'LIN', 'APD', 'SHW', 'FCX', 'NEM', 'ECL', 'DD',
];

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`heatmap-quotes:${ip}`, 30, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });

  try {
    const quotes = await getTiingoMarketData(HEATMAP_SYMBOLS);
    const data = quotes.map((q: any) => ({
      symbol: q.symbol || q.ticker,
      price: q.price ?? 0,
      change: q.change ?? 0,
      changePercent: q.changePercent ?? 0,
      volume: q.volume ?? 0,
    }));
    return NextResponse.json({ ok: true, data, count: data.length, asOf: new Date().toISOString() }, { headers: rateLimitHeaders(rl) });
  } catch (e: any) {
    console.error('heatmap-quotes error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
