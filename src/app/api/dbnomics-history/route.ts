import { NextResponse } from 'next/server'

export const revalidate = 0

// DBnomics (db.nomics.world) — free aggregator for series NOT on FRED, e.g. the
// ISM Manufacturing/Services PMI. Symbol form: DBN:<provider>/<dataset>/<series>.

// Same generous-lookback mapping as fred-history: macro series are monthly, so
// short chart ranges still get enough points to draw a line.
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
  // Accept either ?series=PROVIDER/DATASET/SERIES or ?symbol=DBN:PROVIDER/DATASET/SERIES
  let series = searchParams.get('series') || ''
  const symbol = searchParams.get('symbol') || ''
  if (!series && symbol) series = symbol.replace(/^dbn:/i, '')
  series = series.trim()
  const range = searchParams.get('range') || '5y'

  if (!/^[\w.\-]+\/[\w.\-]+\/[\w.\-]+$/.test(series)) {
    return NextResponse.json({ ok: false, error: 'series must be provider/dataset/series' }, { status: 400 })
  }

  const url = `https://api.db.nomics.world/v22/series/${series}?observations=1`

  try {
    // One retry — DBnomics can be slow on a cold TLS handshake.
    let res: Response | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(9000) })
        if (res.ok) break
      } catch (err) {
        if (attempt === 1) throw err
        res = null
      }
    }
    if (!res || !res.ok) return NextResponse.json({ ok: false, error: `DBnomics ${res?.status ?? 'unreachable'}` }, { status: res?.status ?? 502 })
    const json = await res.json()
    const doc = json?.series?.docs?.[0]
    const dates: string[] = Array.isArray(doc?.period_start_day) ? doc.period_start_day : []
    const values: unknown[] = Array.isArray(doc?.value) ? doc.value : []
    const startCutoff = Math.floor(new Date(`${startForRange(range)}T00:00:00Z`).getTime() / 1000)
    // ISM PMIs are diffusion indexes (historical extremes ~29–78): DBnomics
    // occasionally appends corrupted single-digit values — drop them.
    const isIsm = /^ISM\//i.test(series)
    const bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[] = []
    for (let i = 0; i < dates.length && i < values.length; i++) {
      const v = typeof values[i] === 'number' ? (values[i] as number) : parseFloat(String(values[i]))
      if (!Number.isFinite(v)) continue
      if (isIsm && (v < 20 || v > 90)) continue
      const t = Math.floor(new Date(`${dates[i]}T00:00:00Z`).getTime() / 1000)
      if (!Number.isFinite(t) || t < startCutoff) continue
      bars.push({ time: t, open: v, high: v, low: v, close: v, volume: 0 })
    }

    if (bars.length < 2) return NextResponse.json({ ok: false, error: 'no data' }, { status: 404 })

    return NextResponse.json({ ok: true, range, interval: 'macro', data: { symbol: `DBN:${series}`, bars } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
