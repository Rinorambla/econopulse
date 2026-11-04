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

// FRED id -> DBnomics series (provider/dataset/series) for sources that are
// current on DBnomics. Daily H.15 series use the "_N.B" business-day codes.
const DBN_MIRROR: Record<string, string> = {
  FEDFUNDS: 'FED/H15/RIFSPFF_N.M', DFF: 'FED/H15/RIFSPFF_N.D',
  DGS1MO: 'FED/H15/RIFLGFCM01_N.B', DGS3MO: 'FED/H15/RIFLGFCM03_N.B', DGS6MO: 'FED/H15/RIFLGFCM06_N.B',
  DGS1: 'FED/H15/RIFLGFCY01_N.B', DGS2: 'FED/H15/RIFLGFCY02_N.B', DGS3: 'FED/H15/RIFLGFCY03_N.B', DGS5: 'FED/H15/RIFLGFCY05_N.B',
  DGS7: 'FED/H15/RIFLGFCY07_N.B', DGS10: 'FED/H15/RIFLGFCY10_N.B', DGS20: 'FED/H15/RIFLGFCY20_N.B', DGS30: 'FED/H15/RIFLGFCY30_N.B',
  DFII5: 'FED/H15/RIFLGFCY05_XII_N.B', DFII10: 'FED/H15/RIFLGFCY10_XII_N.B', DFII30: 'FED/H15/RIFLGFCY30_XII_N.B',
  A191RL1Q225SBEA: 'BEA/NIPA-T10101/A191RL-Q', GDPC1: 'BEA/NIPA-T10106/A191RX-Q', GDP: 'BEA/NIPA-T10105/A191RC-Q',
  PCEPI: 'BEA/NIPA-T20804/DPCERG-M', PCEPILFE: 'BEA/NIPA-T20804/DPCCRG-M',
  PCE: 'BEA/NIPA-T20600/DPCERC-M', PI: 'BEA/NIPA-T20600/A065RC-M', PSAVERT: 'BEA/NIPA-T20600/A072RC-M',
}
// BEA level series are published in millions on DBnomics vs billions on FRED.
const DBN_SCALE: Record<string, number> = { GDPC1: 1e-3, GDP: 1e-3, PCE: 1e-3, PI: 1e-3 }
// Some cloud egress ranges can't reach fred.stlouisfed.org at all (requests
// hang until timeout). Remember that for a while so the fallback chain stays
// fast instead of paying the timeout on every chart load.
let csvBlockedUntil = 0
const CSV_BLOCK_MS = 15 * 60 * 1000

const toIsoDate = (p: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p
  if (/^\d{4}-\d{2}$/.test(p)) return `${p}-01`
  const q = p.match(/^(\d{4})-Q([1-4])$/)
  if (q) return `${q[1]}-${String((Number(q[2]) - 1) * 3 + 1).padStart(2, '0')}-01`
  if (/^\d{4}$/.test(p)) return `${p}-01-01`
  return p
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
  // Apply FRED-style unit transforms to raw observations when the source
  // couldn't do it server-side: pc1 = % change from a year ago; pch / chg =
  // % / absolute change from the previous observation.
  const transform = (obs: Obs[]): Obs[] => {
    if (!units) return obs
    const vals = obs.map((o) => parseFloat(o.value))
    const dates = obs.map((o) => new Date(o.date + 'T00:00:00Z').getTime())
    const year = 365.25 * 86400000
    const out: Obs[] = []
    for (let i = 0; i < obs.length; i++) {
      const v = vals[i]
      if (!Number.isFinite(v)) continue
      let base: number | null = null
      if (units === 'pc1' || units === 'ch1') {
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
    return out.filter((o) => o.date >= start)
  }
  // Extra lookback so a YoY transform has its 12-month base.
  const rawStart = units ? new Date(new Date(start).getTime() - 400 * 86400000).toISOString().slice(0, 10) : start

  // Fallback 1: FRED's key-less CSV export (works from most networks; some
  // cloud egress ranges are blocked, hence the DBnomics fallback below).
  const viaCsv = async (): Promise<Obs[] | null> => {
    if (Date.now() < csvBlockedUntil) return null
    try {
      const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(series)}&cosd=${rawStart}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconoPulse/1.0)', Accept: 'text/csv,*/*' },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return null
      const lines = (await res.text()).trim().split(/\r?\n/)
      if (lines.length < 2 || !/^(observation_date|DATE)/i.test(lines[0])) return null
      const obs: Obs[] = lines.slice(1).map((l) => { const [date, value] = l.split(','); return { date: (date || '').trim(), value: (value || '').trim() } }).filter((o) => o.date)
      return transform(obs)
    } catch (e: unknown) {
      if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')) csvBlockedUntil = Date.now() + CSV_BLOCK_MS
      return null
    }
  }

  // Fallback 2: DBnomics mirrors of the official sources that stay current
  // there (Fed H.15 rates/yields, BEA NIPA). BLS on DBnomics lags months, so
  // CPI/payrolls stay on FRED only.
  const viaDbnomics = async (): Promise<Obs[] | null> => {
    const code = DBN_MIRROR[series]
    if (!code) return null
    try {
      const res = await fetch(`https://api.db.nomics.world/v22/series/${code}?observations=1&format=json`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(12000) })
      if (!res.ok) return null
      const j = await res.json()
      const d = j?.series?.docs?.[0]
      const periods: string[] = Array.isArray(d?.period_start_day) ? d.period_start_day : Array.isArray(d?.period) ? d.period : []
      const values: unknown[] = Array.isArray(d?.value) ? d.value : []
      if (!periods.length) return null
      const scale = DBN_SCALE[series] ?? 1
      const obs: Obs[] = periods.map((p, i) => {
        const n = typeof values[i] === 'number' ? (values[i] as number) * scale : NaN
        return { date: toIsoDate(p), value: Number.isFinite(n) ? String(n) : '.' }
      }).filter((o) => o.date >= rawStart)
      return transform(obs)
    } catch { return null }
  }

  try {
    const obs = (await viaApi()) || (await viaCsv()) || (await viaDbnomics())
    if (!obs) return NextResponse.json({ ok: false, error: 'FRED unavailable (set a valid FRED_API_KEY)' }, { status: 502 })
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
