export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 15

import { NextResponse } from 'next/server'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { buildLeaderboard, ANALYST_SECTORS } from '@/lib/top-analysts-data'

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

  return NextResponse.json(
    {
      ok: true,
      asOf: new Date().toISOString(),
      provider: 'curated',
      sectors: ANALYST_SECTORS,
      analysts,
    },
    { headers: rateLimitHeaders(rl) }
  )
}
