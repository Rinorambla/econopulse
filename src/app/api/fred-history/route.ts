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
  // "SERIES@PC1" → FRED units=pc1 (percent change from year ago), used for
  // TradingView-style YoY series (e.g. Inflation Rate YoY from CPIAUCSL).
  let units = ''
  const at = series.indexOf('@')
  if (at > 0) {
    const suffix = series.slice(at + 1)
    series = series.slice(0, at)
    if (['PC1', 'PCH', 'CH1', 'CHG'].includes(suffix)) units = suffix.toLowerCase()
  }
  const range = searchParams.get('range') || '5y'

  if (!series) return NextResponse.json({ ok: false, error: 'series param required' }, { status: 400 })

  const start = startForRange(range)
  type Obs = { date: string; value: string }

  // Primary: FRED JSON API (supports units=pc1 etc. server-side). Fallback: the
  // key-less public CSV export, so charts keep working when FRED_API_KEY is
  // missing/invalid in a deployment (YoY transforms are then computed here).
  const viaApi = async (): Promise<Obs[] | null> => {
    const key = process.env.FRED_API_KEY
    if (!key) return null
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(series)}&api_key=${key}&file_type=json&observation_start=${start}&sort_order=asc${units ? `&units=${units}` : ''}`
    try {
      const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) })
      if (!res.ok) return null
      const json = await res.json()
      return Array.isArray(json?.observations) ? json.observations : null
    } catch { return null }
  }
  const viaCsv = async (): Promise<Obs[] | null> => {
    // Pull extra history so the YoY transform has its 12-month lookback.
    const cosd = units ? new Date(new Date(start).getTime() - 400 * 86400000).toISOString().slice(0, 10) : start
    try {
      const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(series)}&cosd=${cosd}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconoPulse/1.0)', Accept: 'text/csv,*/*' },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) return null
      const lines = (await res.text()).trim().split(/\r?\n/)
      if (lines.length < 2 || !/^(observation_date|DATE)/i.test(lines[0])) return null
      let obs: Obs[] = lines.slice(1).map((l) => { const [date, value] = l.split(','); return { date: (date || '').trim(), value: (value || '').trim() } }).filter((o) => o.date)
      if (units) {
        // pc1 = % change from a year ago; pch/chg = % / absolute change from the previous observation.
        const vals = obs.map((o) => parseFloat(o.value))
        const dates = obs.map((o) => new Date(o.date + 'T00:00:00Z').getTime())
        const year = 365.25 * 86400000
        const out: Obs[] = []
        for (let i = 0; i < obs.length; i++) {
          const v = vals[i]
          if (!Number.isFinite(v)) continue
          let base: number | null = null
          if (units === 'pc1' || units === 'ch1') {
            // nearest observation ~1y earlier (±45 days tolerance)
            const target = dates[i] - year
            let best = -1, bestD = Infinity
            for (let j = i - 1; j >= 0; j--) { const d = Math.abs(dates[j] - target); if (d < bestD) { bestD = d; best = j } if (dates[j] < target - 60 * 86400000) break }
            if (best >= 0 && bestD <= 45 * 86400000 && Number.isFinite(vals[best])) base = vals[best]
          } else {
            for (let j = i - 1; j >= 0; j--) if (Number.isFinite(vals[j])) { base = vals[j]; break }
          }
          if (base == null) continue
          const r = units === 'pc1' || units === 'pch' ? (base !== 0 ? ((v - base) / Math.abs(base)) * 100 : NaN) : v - base
          if (Number.isFinite(r)) out.push({ date: obs[i].date, value: String(Math.round(r * 1000) / 1000) })
        }
        obs = out.filter((o) => o.date >= start)
      }
      return obs
    } catch { return null }
  }

  try {
    const obs = (await viaApi()) || (await viaCsv())
    if (!obs) return NextResponse.json({ ok: false, error: 'FRED unavailable' }, { status: 502 })
    const bars = obs
      .map((o) => {
        const v = parseFloat(o.value)
        if (!Number.isFinite(v)) return null
        const t = Math.floor(new Date(`${o.date}T00:00:00Z`).getTime() / 1000)
        return { time: t, open: v, high: v, low: v, close: v, volume: 0 }
      })
      .filter((b): b is { time: number; open: number; high: number; low: number; close: number; volume: number } => b !== null)

    if (bars.length < 2) return NextResponse.json({ ok: false, error: 'no data' }, { status: 404 })

    return NextResponse.json({ ok: true, range, interval: 'macro', data: { symbol: `FRED:${series}${units ? '@' + units.toUpperCase() : ''}`, bars } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
