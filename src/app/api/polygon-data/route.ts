import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getPolygonClient } from '@/lib/polygonFinance';

// Polygon.io Market Data API route
// Supporta equities, forex, crypto via Polygon.io
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rl = rateLimit(`polygon-${clientIp}`, 30, 60000); // 30 req/min
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rl.reset },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const symbols = searchParams.get('symbols')?.split(',').filter(Boolean) || [];

    const polygon = getPolygonClient();

    if (!polygon.isConfigured) {
      return NextResponse.json(
        { error: 'Polygon API not configured' },
        { status: 503 }
      );
    }

    const startTime = Date.now();

    // Default symbols per categoria
    const defaultEquities = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'QQQ', 'VTI'];
    const defaultForex: [string, string][] = [['EUR', 'USD'], ['GBP', 'USD'], ['USD', 'JPY'], ['USD', 'CHF'], ['AUD', 'USD'], ['USD', 'CAD']];
    const defaultCrypto: [string, string][] = [['BTC', 'USD'], ['ETH', 'USD'], ['BNB', 'USD'], ['XRP', 'USD'], ['SOL', 'USD'], ['ADA', 'USD']];

    if (category === 'equities' || category === 'stocks') {
      const tickers = symbols.length > 0 ? symbols : defaultEquities;
      const data = await polygon.getSnapshots(tickers);
      return NextResponse.json({
        success: true,
        category: 'equities',
        data,
        count: data.length,
        source: 'Polygon.io',
        processingTime: `${Date.now() - startTime}ms`
      }, { headers: rateLimitHeaders(rl) });
    }

    if (category === 'forex') {
      const pairs: [string, string][] = symbols.length > 0
        ? symbols.map(s => {
            const clean = s.replace('=X', '');
            return [clean.slice(0, 3), clean.slice(3) || 'USD'] as [string, string];
          })
        : defaultForex;
      
      const data = [];
      for (const [from, to] of pairs) {
        const quote = await polygon.getForexQuote(from, to);
        if (quote) data.push(quote);
      }
      return NextResponse.json({
        success: true,
        category: 'forex',
        data,
        count: data.length,
        source: 'Polygon.io',
        processingTime: `${Date.now() - startTime}ms`
      }, { headers: rateLimitHeaders(rl) });
    }

    if (category === 'crypto') {
      const pairs: [string, string][] = symbols.length > 0
        ? symbols.map(s => {
            const parts = s.split('-');
            return [parts[0], parts[1] || 'USD'] as [string, string];
          })
        : defaultCrypto;
      
      const data = [];
      for (const [from, to] of pairs) {
        const quote = await polygon.getCryptoQuote(from, to);
        if (quote) data.push(quote);
      }
      return NextResponse.json({
        success: true,
        category: 'crypto',
        data,
        count: data.length,
        source: 'Polygon.io',
        processingTime: `${Date.now() - startTime}ms`
      }, { headers: rateLimitHeaders(rl) });
    }

    // All categories
    const multiData = await polygon.getMultiAssetQuotes({
      equities: symbols.length > 0 ? symbols : defaultEquities,
      forex: defaultForex,
      crypto: defaultCrypto
    });

    return NextResponse.json({
      success: true,
      category: 'all',
      data: multiData,
      counts: {
        equities: multiData.equities.length,
        forex: multiData.forex.length,
        crypto: multiData.crypto.length,
        total: multiData.equities.length + multiData.forex.length + multiData.crypto.length
      },
      source: 'Polygon.io',
      processingTime: `${Date.now() - startTime}ms`,
      timestamp: multiData.timestamp
    }, { headers: rateLimitHeaders(rl) });

  } catch (error) {
    console.error('Polygon API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
