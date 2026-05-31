export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

import { NextResponse } from 'next/server'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { env } from '@/lib/env'
import { buildLeaderboard, ANALYST_SECTORS } from '@/lib/top-analysts-data'

type LiveRating = {
  symbol: string
  firm: string
  fromGrade: string
  toGrade: string
  action: string
  date: string
}

// Symbols polled for live analyst activity (Finnhub upgrade/downgrade feed)
const LIVE_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL', 'TSLA', 'AMD', 'AVGO', 'JPM']

async function fetchLiveActivity(): Promise<LiveRating[]> {
  const key = env.FINNHUB_API_KEY
  if (!key) return []
  try {
    const results = await Promise.allSettled(
      LIVE_SYMBOLS.map(async (symbol) => {
        const url = `https://finnhub.io/api/v1/stock/upgrade-downgrade?symbol=${symbol}&token=${key}`
        const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) })
        if (!r.ok) return [] as LiveRating[]
        const arr = (await r.json()) as any[]
        return (Array.isArray(arr) ? arr : []).slice(0, 5).map((x) => ({
          symbol,
          firm: String(x.company || '—'),
          fromGrade: String(x.fromGrade || ''),
          toGrade: String(x.toGrade || ''),
          action: String(x.action || ''),
          date: x.gradeTime ? new Date(x.gradeTime * 1000).toISOString() : '',
        }))
      })
    )
    const merged: LiveRating[] = []
    for (const res of results) {
      if (res.status === 'fulfilled') merged.push(...res.value)
    }
    return merged
      .filter((m) => m.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 18)
  } catch (e) {
    console.warn('[top-analysts] live activity failed:', (e as any)?.message)
    return []
  }
}

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
  const liveActivity = await fetchLiveActivity()

  return NextResponse.json(
    {
      ok: true,
      asOf: new Date().toISOString(),
      provider: env.FINNHUB_API_KEY ? 'finnhub' : 'curated',
      sectors: ANALYST_SECTORS,
      analysts,
      liveActivity,
    },
    { headers: rateLimitHeaders(rl) }
  )
}
