import { NextRequest, NextResponse } from 'next/server'
import { getFmpEconomicCalendar } from '@/lib/fmp'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { getOfficialReleases, type OfficialRelease } from '@/lib/official-releases'

// Recent worldwide macro releases (events with an "actual" value) for the Economics page.
// Source chain (all self-updating):
//   1. FMP economic calendar (if FMP_API_KEY) — full global calendar with actuals + forecasts.
//   2. FRED (if FRED_API_KEY) + DBnomics (no key) — latest official readings of key
//      indicators worldwide; values refresh automatically when agencies publish.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type EconEvent = OfficialRelease

let cache: { ts: number; data: EconEvent[]; source: string } | null = null
const TTL = 30 * 60 * 1000

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = rateLimit(`econ-releases:${ip}`, 30, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429, headers: rateLimitHeaders(rl) })
  }
  try {
    if (cache && Date.now() - cache.ts < TTL) {
      return NextResponse.json({ ok: true, data: cache.data, count: cache.data.length, source: cache.source, lastUpdate: new Date(cache.ts).toISOString(), cached: true }, { headers: rateLimitHeaders(rl) })
    }
    const url = new URL(req.url)
    const back = Math.max(1, Math.min(21, Number(url.searchParams.get('days')) || 10))
    const end = new Date()
    const start = new Date(Date.now() - back * 86400000)
    const d1 = start.toISOString().slice(0, 10)
    const d2 = end.toISOString().slice(0, 10)

    let events: EconEvent[] = []
    let source = 'fmp'
    try {
      const fmp = await getFmpEconomicCalendar(d1, d2)
      events = (fmp as EconEvent[]).filter(e => e.actual != null && e.actual !== '' && e.actual !== '-')
    } catch (e) {
      console.warn('economics-releases: FMP error', e)
    }

    // Keyless self-updating fallback: official latest readings from FRED + DBnomics.
    if (!events.length) {
      events = await getOfficialReleases()
      source = 'official-series'
    }

    // Newest first
    events.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')))
    cache = { ts: Date.now(), data: events, source }
    return NextResponse.json({ ok: true, data: events, count: events.length, source, lastUpdate: new Date().toISOString() }, { headers: rateLimitHeaders(rl) })
  } catch (e) {
    console.error('economics-releases error', e)
    return NextResponse.json({ ok: true, data: [], count: 0, lastUpdate: new Date().toISOString() }, { headers: rateLimitHeaders(rl) })
  }
}
