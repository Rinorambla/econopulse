export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 15

import { NextResponse } from 'next/server'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { buildLeaderboard, ANALYST_SECTORS } from '@/lib/top-analysts-data'
import { getYahooQuotes } from '@/lib/yahooFinance'
import { getRecommendations, getPriceTargets } from '@/lib/finnhub-analysts'

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const rl = rateLimit(`top-analysts:${ip}`, 30, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rl) }
    )
  }

  const analysts = buildLeaderboard()

  // Enrich curated coverage with REAL data, best-effort and time-boxed:
  //  • live prices from Yahoo (free, batched) → real implied return vs price
  //  • analyst price targets + recommendation from Finnhub (cached, capped)
  let provider: 'curated' | 'live' = 'curated'
  try {
    const tickers = Array.from(
      new Set(analysts.flatMap((a) => a.coverage.map((c) => c.ticker)))
    )
    const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
      Promise.race([p, new Promise<T>((res) => setTimeout(() => res(fallback), ms))])

    const [quotes, recs, targets] = await Promise.all([
      withTimeout(getYahooQuotes(tickers), 9000, [] as Awaited<ReturnType<typeof getYahooQuotes>>),
      withTimeout(getRecommendations(tickers, 40), 8000, new Map()),
      withTimeout(getPriceTargets(tickers, 40), 8000, new Map()),
    ])

    const priceByTicker = new Map<string, number>()
    for (const q of quotes) if (q?.ticker && q.price > 0) priceByTicker.set(q.ticker, q.price)

    let enriched = 0
    for (const a of analysts) {
      for (const c of a.coverage) {
        const livePrice = priceByTicker.get(c.ticker)
        const tgt = targets.get(c.ticker)
        const rec = recs.get(c.ticker)
        if (rec) c.action = rec.action
        if (tgt?.targetMean) {
          c.priceTarget = Math.round(tgt.targetMean * 100) / 100
          enriched++
        }
        if (livePrice && c.priceTarget > 0) {
          c.currentPrice = Math.round(livePrice * 100) / 100
          c.expectedReturn = Math.round(((c.priceTarget / livePrice - 1) * 100) * 10) / 10
        }
      }
      // Keep best-upside calls on top after re-pricing.
      a.coverage.sort((x, y) => y.expectedReturn - x.expectedReturn)
    }
    if (enriched > 0 || priceByTicker.size > 0) provider = 'live'
  } catch {
    /* fall back to curated values */
  }

  return NextResponse.json(
    {
      ok: true,
      asOf: new Date().toISOString(),
      provider,
      sectors: ANALYST_SECTORS,
      analysts,
    },
    { headers: rateLimitHeaders(rl) }
  )
}
