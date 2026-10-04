import { NextRequest, NextResponse } from 'next/server'
import { getFmpEconomicCalendar } from '@/lib/fmp'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

// Recent worldwide macro releases (events with an "actual" value) for the Economics page.
// Source chain (all self-updating):
//   1. FMP economic calendar (if FMP_API_KEY) — full global calendar with actuals + forecasts.
//   2. FRED (if FRED_API_KEY) + DBnomics (no key) — latest official readings of key
//      indicators worldwide; values refresh automatically when agencies publish.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface EconEvent { date: string; time?: string; region: string; event: string; importance: 'High'|'Medium'|'Low'; previous?: string; forecast?: string; actual?: string; source: string }

let cache: { ts: number; data: EconEvent[]; source: string } | null = null
const TTL = 30 * 60 * 1000

// ── Curated self-updating series (FRED mirrors BLS/BEA/Eurostat/OECD; DBnomics mirrors ISM) ──
type Imp = 'High' | 'Medium' | 'Low'
type FredDef = { kind: 'fred'; id: string; units?: 'pc1'; diffK?: boolean; event: string; region: string; importance: Imp; fmt: 'pct' | 'pct2' | 'level' | 'claimsK' }
type DbnDef = { kind: 'dbn'; code: string; event: string; region: string; importance: Imp }
type SeriesDef = FredDef | DbnDef

const SERIES: SeriesDef[] = [
  // United States
  { kind: 'fred', id: 'CPIAUCSL', units: 'pc1', event: 'Inflation Rate YoY', region: 'United States', importance: 'High', fmt: 'pct' },
  { kind: 'fred', id: 'CPILFESL', units: 'pc1', event: 'Core Inflation Rate YoY', region: 'United States', importance: 'High', fmt: 'pct' },
  { kind: 'fred', id: 'PCEPILFE', units: 'pc1', event: 'Core PCE Price Index YoY', region: 'United States', importance: 'High', fmt: 'pct' },
  { kind: 'fred', id: 'UNRATE', event: 'Unemployment Rate', region: 'United States', importance: 'High', fmt: 'pct' },
  { kind: 'fred', id: 'PAYEMS', diffK: true, event: 'Nonfarm Payrolls (m/m change)', region: 'United States', importance: 'High', fmt: 'claimsK' },
  { kind: 'fred', id: 'ICSA', event: 'Initial Jobless Claims', region: 'United States', importance: 'High', fmt: 'claimsK' },
  { kind: 'fred', id: 'A191RL1Q225SBEA', event: 'GDP Growth Rate QoQ (SAAR)', region: 'United States', importance: 'High', fmt: 'pct' },
  { kind: 'fred', id: 'RSAFS', units: 'pc1', event: 'Retail Sales YoY', region: 'United States', importance: 'Medium', fmt: 'pct' },
  { kind: 'fred', id: 'INDPRO', units: 'pc1', event: 'Industrial Production YoY', region: 'United States', importance: 'Medium', fmt: 'pct' },
  { kind: 'fred', id: 'UMCSENT', event: 'Michigan Consumer Sentiment', region: 'United States', importance: 'Medium', fmt: 'level' },
  { kind: 'fred', id: 'FEDFUNDS', event: 'Fed Funds Effective Rate', region: 'United States', importance: 'Medium', fmt: 'pct2' },
  { kind: 'dbn', code: 'ISM/pmi/pm', event: 'ISM Manufacturing PMI', region: 'United States', importance: 'High' },
  { kind: 'dbn', code: 'ISM/nm-pmi/pm', event: 'ISM Services PMI', region: 'United States', importance: 'High' },
  // Euro Area
  { kind: 'fred', id: 'CP0000EZ19M086NEST', units: 'pc1', event: 'HICP Inflation YoY', region: 'Euro Area', importance: 'High', fmt: 'pct' },
  { kind: 'fred', id: 'ECBDFR', event: 'ECB Deposit Facility Rate', region: 'Euro Area', importance: 'High', fmt: 'pct2' },
  // Germany / Italy / France
  { kind: 'fred', id: 'CP0000DEM086NEST', units: 'pc1', event: 'CPI Inflation YoY', region: 'Germany', importance: 'High', fmt: 'pct' },
  { kind: 'fred', id: 'LRHUTTTTDEM156S', event: 'Unemployment Rate (Harmonised)', region: 'Germany', importance: 'Medium', fmt: 'pct' },
  { kind: 'fred', id: 'CP0000ITM086NEST', units: 'pc1', event: 'CPI Inflation YoY', region: 'Italy', importance: 'Medium', fmt: 'pct' },
  { kind: 'fred', id: 'LRHUTTTTITM156S', event: 'Unemployment Rate (Harmonised)', region: 'Italy', importance: 'Medium', fmt: 'pct' },
  { kind: 'fred', id: 'CP0000FRM086NEST', units: 'pc1', event: 'CPI Inflation YoY', region: 'France', importance: 'Medium', fmt: 'pct' },
  // UK / Japan / Canada / Australia
  { kind: 'fred', id: 'LRHUTTTTGBM156S', event: 'Unemployment Rate (Harmonised)', region: 'United Kingdom', importance: 'Medium', fmt: 'pct' },
  { kind: 'fred', id: 'LRHUTTTTJPM156S', event: 'Unemployment Rate (Harmonised)', region: 'Japan', importance: 'Medium', fmt: 'pct' },
  { kind: 'fred', id: 'LRUNTTTTCAM156S', event: 'Unemployment Rate (Harmonised)', region: 'Canada', importance: 'Medium', fmt: 'pct' },
  { kind: 'fred', id: 'LRHUTTTTAUM156S', event: 'Unemployment Rate (Harmonised)', region: 'Australia', importance: 'Medium', fmt: 'pct' },
]

const fmtVal = (v: number, fmt: FredDef['fmt']): string => {
  switch (fmt) {
    case 'pct': return `${v.toFixed(1)}%`
    case 'pct2': return `${v.toFixed(2)}%`
    case 'claimsK': return `${v >= 1000 ? Math.round(v / 1000) : Math.round(v)}K`
    default: return v.toFixed(1)
  }
}

async function fetchFredRelease(def: FredDef, key: string): Promise<EconEvent | null> {
  try {
    const qp = new URLSearchParams({
      series_id: def.id, api_key: key, file_type: 'json', sort_order: 'desc', limit: '4',
    })
    if (def.units) qp.set('units', def.units)
    const r = await fetch(`https://api.stlouisfed.org/fred/series/observations?${qp}`, {
      next: { revalidate: 1800 }, signal: AbortSignal.timeout(9000),
    })
    if (!r.ok) return null
    const j = await r.json()
    const obs: { date: string; value: string }[] = (j?.observations || []).filter((o: any) => o.value !== '.')
    if (obs.length < 2) return null
    let actualNum = parseFloat(obs[0].value)
    let prevNum = parseFloat(obs[1].value)
    if (def.diffK) {
      if (obs.length < 3) return null
      actualNum = parseFloat(obs[0].value) - parseFloat(obs[1].value) // PAYEMS is in thousands
      prevNum = parseFloat(obs[1].value) - parseFloat(obs[2].value)
    }
    if (!Number.isFinite(actualNum) || !Number.isFinite(prevNum)) return null
    return {
      date: obs[0].date,
      region: def.region,
      event: def.event,
      importance: def.importance,
      actual: fmtVal(actualNum, def.fmt),
      previous: fmtVal(prevNum, def.fmt),
      source: 'FRED',
    }
  } catch { return null }
}

async function fetchDbnRelease(def: DbnDef): Promise<EconEvent | null> {
  try {
    const r = await fetch(`https://api.db.nomics.world/v22/series/${def.code}?observations=1`, {
      next: { revalidate: 1800 }, signal: AbortSignal.timeout(9000),
    })
    if (!r.ok) return null
    const j = await r.json()
    const doc = j?.series?.docs?.[0]
    const dates: string[] = Array.isArray(doc?.period_start_day) ? doc.period_start_day : []
    const values: unknown[] = Array.isArray(doc?.value) ? doc.value : []
    // Walk from the end, skipping corrupted entries (ISM diffusion indexes live ~29–78).
    const pts: { date: string; v: number }[] = []
    for (let i = dates.length - 1; i >= 0 && pts.length < 2; i--) {
      const v = typeof values[i] === 'number' ? (values[i] as number) : parseFloat(String(values[i]))
      if (!Number.isFinite(v) || v < 20 || v > 90) continue
      pts.push({ date: dates[i], v })
    }
    if (pts.length < 2) return null
    return {
      date: pts[0].date,
      region: def.region,
      event: def.event,
      importance: def.importance,
      actual: pts[0].v.toFixed(1),
      previous: pts[1].v.toFixed(1),
      source: 'DBnomics',
    }
  } catch { return null }
}

async function getOfficialReleases(): Promise<EconEvent[]> {
  const fredKey = process.env.FRED_API_KEY || ''
  const tasks = SERIES.map(def =>
    def.kind === 'fred'
      ? (fredKey ? fetchFredRelease(def, fredKey) : Promise.resolve(null))
      : fetchDbnRelease(def)
  )
  const results = await Promise.all(tasks)
  return results.filter((e): e is EconEvent => !!e)
}

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
