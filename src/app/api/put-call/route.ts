import { NextResponse } from 'next/server'
import { fredService } from '@/lib/fred'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

function toNum(v: any): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: Request) {
  const ip = getClientIp(req)
  const rl = rateLimit(`putcall:${ip}`, 60, 60_000)
  if (!rl.ok) return new NextResponse('Too Many Requests', { status: 429, headers: rateLimitHeaders(rl) })

  try {
    const url = new URL(req.url)
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || 60)))
    // Common FRED series code for CBOE Total Put/Call Ratio is PUTCALL
    const seriesId = process.env.FRED_PUTCALL_SERIES_ID || 'PUTCALL'
    const raw = await fredService.getEconomicIndicator(seriesId, limit)
    const observations: Array<{ date: string; value: string }> = raw?.observations || []
    const series = observations
      .map(o => ({ date: o.date, value: toNum(o.value) }))
      .filter(p => p.value != null)

    const latest = series[0] || null
    return NextResponse.json({ ok: true, seriesId, latest, series, updatedAt: new Date().toISOString() }, { headers: rateLimitHeaders(rl) })
  } catch (e: any) {
    // Fallback neutral
    const now = new Date().toISOString()
    const series = Array.from({ length: 30 }).map((_,i)=> ({ date: new Date(Date.now()-i*86400000).toISOString().slice(0,10), value: 1.0 }))
    return NextResponse.json({ ok: false, seriesId: 'fallback', latest: series[0], series, updatedAt: now, error: 'FRED unavailable' }, { headers: rateLimitHeaders(rl) })
  }
}
