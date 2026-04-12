export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getTiingoMarketData } from '@/lib/tiingo';
import { getYahooQuotes } from '@/lib/yahooFinance';

// Expanded S&P 500 universe — ~120 top stocks by market cap
const HEATMAP_SYMBOLS = [
  // Technology
  'AAPL', 'MSFT', 'NVDA', 'AVGO', 'CRM', 'ADBE', 'CSCO', 'ACN', 'ORCL', 'INTC', 'AMD', 'QCOM',
  'TXN', 'NOW', 'INTU', 'IBM', 'AMAT', 'MU', 'LRCX', 'KLAC', 'ADI', 'SNPS', 'PANW', 'FTNT',
  'MSI', 'CDNS', 'FI', 'FIS', 'KEYS', 'HPQ', 'CTSH',
  // Healthcare
  'UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'PFE', 'TMO', 'ABT', 'DHR', 'BMY',
  'AMGN', 'GILD', 'ISRG', 'VRTX', 'CI', 'CVS', 'SYK', 'BSX', 'MDT', 'MCK', 'HCA', 'ELV',
  // Financial
  'BRK-B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'SPGI', 'BLK',
  'AXP', 'PYPL', 'SCHW', 'CME', 'ICE', 'CB', 'PGR', 'AON', 'MMC', 'COF', 'USB',
  // Consumer Discretionary
  'AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'LOW', 'SBUX', 'TJX', 'BKNG', 'CMG',
  'GM', 'F', 'ORLY', 'AZO', 'ROST', 'MAR', 'HLT', 'YUM', 'EBAY', 'LULU',
  // Communication
  'GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS', 'CHTR', 'EA', 'TTWO', 'WBD',
  // Industrials
  'GE', 'CAT', 'UNP', 'HON', 'UPS', 'BA', 'RTX', 'DE', 'LMT',
  'ETN', 'ITW', 'EMR', 'NOC', 'GD', 'CSX', 'FDX', 'WM', 'NSC', 'PCAR', 'TT',
  // Consumer Staples
  'PG', 'KO', 'PEP', 'COST', 'WMT', 'PM', 'MO', 'MDLZ',
  'CL', 'KMB', 'TGT', 'SYY', 'STZ', 'KHC', 'HSY', 'GIS', 'SJM', 'KR',
  // Energy
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PXD', 'VLO', 'PSX', 'OXY', 'HAL', 'DVN',
  // Utilities
  'NEE', 'DUK', 'SO', 'D', 'AEP', 'SRE', 'EXC', 'XEL', 'WEC', 'ED',
  // Real Estate
  'PLD', 'AMT', 'CCI', 'EQIX', 'PSA', 'SPG', 'O', 'DLR', 'WELL', 'AVB',
  // Materials
  'LIN', 'APD', 'SHW', 'FCX', 'NEM', 'ECL', 'DD', 'NUE', 'VMC', 'MLM',
];

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`heatmap-quotes:${ip}`, 30, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });

  try {
    // 1. Try Tiingo first (bulk IEX — fast)
    const tiingoQuotes = await getTiingoMarketData(HEATMAP_SYMBOLS).catch(() => []);
    const quotes: { symbol: string; price: number; change: number; changePercent: number; volume: number }[] =
      tiingoQuotes.map((q: any) => ({
        symbol: (q.symbol || q.ticker || '').toUpperCase(),
        price: q.price ?? 0,
        change: q.change ?? 0,
        changePercent: q.changePercent ?? 0,
        volume: q.volume ?? 0,
      }));
    const got = new Set(quotes.map(q => q.symbol));
    const missing = HEATMAP_SYMBOLS.filter(s => !got.has(s.toUpperCase()));

    // 2. Fill missing from Yahoo (batched, slower but wider coverage)
    if (missing.length > 0) {
      try {
        const yahooQ = await getYahooQuotes(missing.slice(0, 40)); // cap to avoid timeout
        for (const yq of yahooQ) {
          if (yq && yq.ticker) {
            quotes.push({
              symbol: yq.ticker.toUpperCase(),
              price: yq.price ?? 0,
              change: yq.change ?? 0,
              changePercent: yq.changePercent ?? 0,
              volume: yq.volume ?? 0,
            });
          }
        }
      } catch (e) { console.warn('Yahoo fallback failed:', e); }
    }

    return NextResponse.json({
      ok: true, data: quotes, count: quotes.length,
      sources: { tiingo: got.size, yahoo: missing.length > 0 ? quotes.length - got.size : 0 },
      asOf: new Date().toISOString(),
    }, { headers: rateLimitHeaders(rl) });
  } catch (e: any) {
    console.error('heatmap-quotes error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
