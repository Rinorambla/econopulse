// Self-updating official macro releases (FRED mirrors BLS/BEA/Eurostat/OECD; DBnomics
// mirrors ISM). Shared by /api/economics-releases (release feed with actuals) and
// /api/economic-calendar (enriches ForexFactory events — which carry NO actuals —
// with the latest official readings once they are published).

export interface OfficialRelease {
  date: string
  time?: string
  region: string
  event: string
  importance: 'High' | 'Medium' | 'Low'
  previous?: string
  forecast?: string
  actual?: string
  source: string
}

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

async function fetchFredRelease(def: FredDef, key: string): Promise<OfficialRelease | null> {
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

async function fetchDbnRelease(def: DbnDef): Promise<OfficialRelease | null> {
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

let officialCache: { ts: number; data: OfficialRelease[] } | null = null
const OFFICIAL_TTL = 30 * 60 * 1000

export async function getOfficialReleases(): Promise<OfficialRelease[]> {
  if (officialCache && Date.now() - officialCache.ts < OFFICIAL_TTL) return officialCache.data
  const fredKey = process.env.FRED_API_KEY || ''
  const tasks = SERIES.map(def =>
    def.kind === 'fred'
      ? (fredKey ? fetchFredRelease(def, fredKey) : Promise.resolve(null))
      : fetchDbnRelease(def)
  )
  const results = await Promise.all(tasks)
  const data = results.filter((e): e is OfficialRelease => !!e)
  if (data.length) officialCache = { ts: Date.now(), data }
  return data
}

// ── Calendar enrichment ───────────────────────────────────────────────────────
// Maps ForexFactory event titles → the official release that carries the actual.
// Only PAST events get an actual, and only when the official observation period
// sits within ~70 days before the event date (so the latest print is the right one).
const MATCHERS: { re: RegExp; region?: string; event: string; releaseRegion?: string }[] = [
  { re: /^ISM Manufacturing PMI/i, region: 'United States', event: 'ISM Manufacturing PMI' },
  { re: /^ISM Services PMI/i, region: 'United States', event: 'ISM Services PMI' },
  { re: /^Unemployment Claims/i, region: 'United States', event: 'Initial Jobless Claims' },
  { re: /Non-?Farm Employment Change/i, region: 'United States', event: 'Nonfarm Payrolls (m/m change)' },
  { re: /^Unemployment Rate/i, event: 'Unemployment Rate' }, // region-matched below
  { re: /Federal Funds Rate/i, region: 'United States', event: 'Fed Funds Effective Rate' },
  { re: /UoM Consumer Sentiment/i, region: 'United States', event: 'Michigan Consumer Sentiment' },
  { re: /^Core CPI y\/y/i, region: 'United States', event: 'Core Inflation Rate YoY' },
  { re: /^CPI y\/y/i, event: 'Inflation Rate YoY' },
  { re: /CPI Flash Estimate y\/y/i, region: 'Euro Area', event: 'HICP Inflation YoY' },
  { re: /Core PCE Price Index y\/y/i, region: 'United States', event: 'Core PCE Price Index YoY' },
  { re: /(Advance|Prelim|Final) GDP q\/q/i, region: 'United States', event: 'GDP Growth Rate QoQ (SAAR)' },
  { re: /Main Refinancing Rate|Deposit Facility Rate/i, region: 'Euro Area', event: 'ECB Deposit Facility Rate' },
]

interface CalendarishEvent { date: string; region: string; event: string; actual?: string; previous?: string }

export function enrichCalendarWithActuals<T extends CalendarishEvent>(events: T[], releases: OfficialRelease[]): number {
  const today = new Date().toISOString().slice(0, 10)
  let filled = 0
  for (const ev of events) {
    if (ev.actual || ev.date > today) continue
    const m = MATCHERS.find(x => x.re.test(ev.event) && (!x.region || x.region === ev.region))
    if (!m) continue
    const rel = releases.find(r => r.event === m.event && r.region === (m.region || ev.region))
    if (!rel || !rel.actual) continue
    // Official observation period must be recent relative to the event date.
    const evTs = Date.parse(ev.date)
    const relTs = Date.parse(rel.date)
    if (!Number.isFinite(evTs) || !Number.isFinite(relTs)) continue
    const diffDays = (evTs - relTs) / 86400000
    if (diffDays < -3 || diffDays > 70) continue
    ev.actual = rel.actual
    if (!ev.previous && rel.previous) ev.previous = rel.previous
    filled++
  }
  return filled
}

// Legacy alias for the series list consumers (not exported before; kept private).
export type { FredDef, DbnDef, SeriesDef }
