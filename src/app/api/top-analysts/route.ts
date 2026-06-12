export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 15

import { NextResponse } from 'next/server'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { requirePremium } from '@/lib/plan-guard'
import { buildLeaderboard, ANALYST_SECTORS } from '@/lib/top-analysts-data'
import { getYahooQuotes } from '@/lib/yahooFinance'
import { getRecommendations, getPriceTargets } from '@/lib/finnhub-analysts'
import { getFmpConsensus } from '@/lib/fmp-analysts'
import { getAlphaVantageAnalysts } from '@/lib/alphavantage-analysts'

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const rl = rateLimit(`top-analysts:${ip}`, 30, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rl) }
    )
  }

  // Server-side premium gate (page is premium-only; protect the API too)
  const gate = await requirePremium(request)
  if (!gate.ok) return gate.response

  const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
    Promise.race([p, new Promise<T>((res) => setTimeout(() => res(fallback), ms))])

  const analysts = buildLeaderboard()

  // Enrich curated roster with REAL data, best-effort and time-boxed:
  //  • live prices from Yahoo (free, batched) → real implied return vs price
  //  • FMP grades-consensus → REAL Buy/Hold/Sell street consensus per ticker
  //  • FMP grades → REAL most-recent rating action date
  //  • Alpha Vantage OVERVIEW → REAL analyst target price (quota-capped, 24h cache)
  //  • Finnhub price targets/recommendation as secondary best-effort
  let provider: 'curated' | 'live' = 'curated'
  try {
    const tickers = Array.from(
      new Set(analysts.flatMap((a) => a.coverage.map((c) => c.ticker)))
    )

    const [quotes, recs, targets, fmp, av] = await Promise.all([
      withTimeout(getYahooQuotes(tickers), 9000, [] as Awaited<ReturnType<typeof getYahooQuotes>>),
      withTimeout(getRecommendations(tickers, 40), 8000, new Map()),
      withTimeout(getPriceTargets(tickers, 40), 8000, new Map()),
      withTimeout(getFmpConsensus(tickers, 30), 11_000, new Map()),
      withTimeout(getAlphaVantageAnalysts(tickers, 6), 12_000, new Map()),
    ])

    const priceByTicker = new Map<string, number>()
    for (const q of quotes) if (q?.ticker && q.price > 0) priceByTicker.set(q.ticker, q.price)

    let enriched = 0
    for (const a of analysts) {
      const liveReturns: number[] = []
      let latestActivity = ''
      for (const c of a.coverage) {
        const livePrice = priceByTicker.get(c.ticker)
        const tgt = targets.get(c.ticker)
        const rec = recs.get(c.ticker)
        const fc = fmp.get(c.ticker)
        const av1 = av.get(c.ticker)
        // Real Buy/Hold/Sell action: FMP consensus → Alpha Vantage → Finnhub.
        if (fc) {
          c.action = fc.action
          enriched++
        } else if (av1?.action) {
          c.action = av1.action
          enriched++
        } else if (rec) {
          c.action = rec.action
        }
        // Real price target: Alpha Vantage → Finnhub.
        if (av1?.targetPrice) {
          c.priceTarget = Math.round(av1.targetPrice * 100) / 100
          enriched++
        } else if (tgt?.targetMean) {
          c.priceTarget = Math.round(tgt.targetMean * 100) / 100
          enriched++
        }
        // Real most-recent rating action date: FMP grades first, then Finnhub.
        if (fc?.lastActionDate && fc.lastActionDate > latestActivity) {
          latestActivity = fc.lastActionDate
        } else if (tgt?.lastUpdated && tgt.lastUpdated > latestActivity) {
          latestActivity = tgt.lastUpdated
        }
        if (livePrice && c.priceTarget > 0) {
          c.currentPrice = Math.round(livePrice * 100) / 100
          c.expectedReturn = Math.round(((c.priceTarget / livePrice - 1) * 100) * 10) / 10
          liveReturns.push(c.expectedReturn)
        }
      }
      // Keep best-upside calls on top after re-pricing.
      a.coverage.sort((x, y) => y.expectedReturn - x.expectedReturn)
      // Reflect live implied upside (real prices vs targets) as the analyst's current avg return.
      if (liveReturns.length) {
        a.avgReturn = Math.round((liveReturns.reduce((s, v) => s + v, 0) / liveReturns.length) * 10) / 10
      }
      // Reflect the most recent real rating activity on covered names.
      if (latestActivity) {
        const d = new Date(latestActivity)
        if (!isNaN(d.getTime())) a.lastRating = d.toISOString().slice(0, 10)
      }
    }
    if (enriched > 0 || priceByTicker.size > 0) {
      provider = 'live'
      // Re-rank with live data: reputation rating stays primary, but the live
      // average implied upside (and recency) become real, dynamic tie-breakers
      // so the leaderboard order shifts with the market.
      analysts.sort(
        (a, b) =>
          b.rating - a.rating ||
          b.avgReturn - a.avgReturn ||
          new Date(b.lastRating).getTime() - new Date(a.lastRating).getTime()
      )
    }
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
