import { NextResponse } from 'next/server'
import { getYahooQuotes } from '@/lib/yahooFinance'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

function sanitizeSymbols(raw: string | null): string[] {
  if (!raw) return []
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  const cleaned = parts.map(s => s.toUpperCase().replace(/[^A-Z0-9=.^-]/g, ''))
  // Deduplicate and cap
  const uniq: string[] = []
  for (const s of cleaned) if (s && !uniq.includes(s)) uniq.push(s)
  return uniq.slice(0, 50)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const symbols = sanitizeSymbols(url.searchParams.get('symbols'))
  const ip = getClientIp(req)
  const rl = rateLimit(`watchlist-quotes:${ip}`, 60, 60_000)
  if (!rl.ok) {
    return new NextResponse('Rate limit exceeded', { status: 429, headers: rateLimitHeaders(rl) })
  }
  if (symbols.length === 0) {
    return NextResponse.json({ ok: true, data: [], count: 0 }, { headers: rateLimitHeaders(rl) })
  }
  try {
    const quotes = await getYahooQuotes(symbols)
    const data = quotes.map(q => ({
      symbol: q.ticker,
      name: q.name,
      price: q.price,
      changePercent: q.changePercent,
      change: q.change,
      volume: q.volume,
    }))
    return NextResponse.json({ ok: true, data, count: data.length }, { headers: rateLimitHeaders(rl) })
  } catch (e) {
    console.error('watchlist-quotes error', e)
    return new NextResponse('Failed to fetch quotes', { status: 500, headers: rateLimitHeaders(rl) })
  }
}
