import { NextResponse } from 'next/server'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

export async function GET(req: Request) {
  const ip = getClientIp(req)
  const rl = rateLimit(`cnn-fgi:${ip}`, 30, 60_000)
  if (!rl.ok) return new NextResponse('Too Many Requests', { status: 429, headers: rateLimitHeaders(rl) })

  try {
    // Placeholder proxy: CNN FGI has no simple public JSON. If we add a scraper/service later, wire it here.
    // For now, return null payload with guidance while we rely on our composite index.
    return NextResponse.json({ ok: false, source: 'cnn', data: null, note: 'CNN FGI requires a dedicated scraper/service; using internal composite instead.' }, { headers: rateLimitHeaders(rl) })
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: 'cnn_fgi_unavailable' }, { headers: rateLimitHeaders(rl) })
  }
}
