import { NextResponse } from 'next/server'

export const revalidate = 0

// Map the chart range presets to a FRED observation_start lookback. Macro series
// are monthly/weekly, so we always return a generous window regardless of the
// intraday-style short ranges and let the chart fit the content.
function startForRange(range: string): string {
  const now = new Date()
  const d = new Date(now)
  switch (range) {
    case '1d':
    case '5d':
    case '1mo':
      d.setFullYear(now.getFullYear() - 1); break
    case '3mo':
      d.setFullYear(now.getFullYear() - 2); break
    case '6mo':
      d.setFullYear(now.getFullYear() - 3); break
    case 'ytd':
      return `${now.getFullYear()}-01-01`
    case '1y':
      d.setFullYear(now.getFullYear() - 2); break
    case '2y':
      d.setFullYear(now.getFullYear() - 3); break
    case '5y':
      d.setFullYear(now.getFullYear() - 6); break
    case '10y':
      d.setFullYear(now.getFullYear() - 12); break
    case 'max':
      return '1900-01-01'
    default:
      d.setFullYear(now.getFullYear() - 5); break
  }
  return d.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // Accept either ?series=ID or ?symbol=FRED:ID
  let series = searchParams.get('series') || ''
  const symbol = searchParams.get('symbol') || ''
  if (!series && symbol) series = symbol.replace(/^fred:/i, '')
  series = series.trim().toUpperCase()
  const range = searchParams.get('range') || '5y'

  if (!series) return NextResponse.json({ ok: false, error: 'series param required' }, { status: 400 })

  const FRED_API_KEY = process.env.FRED_API_KEY
  if (!FRED_API_KEY) return NextResponse.json({ ok: false, error: 'FRED not configured' }, { status: 503 })

  const start = startForRange(range)
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(series)}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${start}&sort_order=asc`

  try {
    const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return NextResponse.json({ ok: false, error: `FRED ${res.status}` }, { status: res.status })
    const json = await res.json()
    const obs: { date: string; value: string }[] = Array.isArray(json?.observations) ? json.observations : []
    const bars = obs
      .map((o) => {
        const v = parseFloat(o.value)
        if (!Number.isFinite(v)) return null
        const t = Math.floor(new Date(`${o.date}T00:00:00Z`).getTime() / 1000)
        return { time: t, open: v, high: v, low: v, close: v, volume: 0 }
      })
      .filter((b): b is { time: number; open: number; high: number; low: number; close: number; volume: number } => b !== null)

    if (bars.length < 2) return NextResponse.json({ ok: false, error: 'no data' }, { status: 404 })

    return NextResponse.json({ ok: true, range, interval: 'macro', data: { symbol: `FRED:${series}`, bars } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
