export interface FmpEconEvent {
  date: string
  country?: string
  event?: string
  previous?: string | number
  forecast?: string | number
  actual?: string | number
  change?: string | number
  importance?: string | number
}

interface EconEventOut { date: string; time?: string; region: string; event: string; importance: 'High'|'Medium'|'Low'; previous?: string; forecast?: string; actual?: string; source: string }

const impFromFmp = (v: any): 'High'|'Medium'|'Low' => {
  const s = String(v ?? '').toLowerCase()
  if (s.includes('3') || s.includes('high')) return 'High'
  if (s.includes('2') || s.includes('medium')) return 'Medium'
  return 'Low'
}

export async function getFmpEconomicCalendar(d1: string, d2: string): Promise<EconEventOut[]> {
  const key = process.env.FMP_API_KEY
  if (!key) return []
  const url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${encodeURIComponent(d1)}&to=${encodeURIComponent(d2)}&apikey=${encodeURIComponent(key)}`
  const res = await fetch(url, { headers: { 'Accept': 'application/json' }, next: { revalidate: 60 } })
  if (!res.ok) return []
  const data: FmpEconEvent[] = await res.json()
  if (!Array.isArray(data)) return []
  return data.map((row) => ({
    date: (row.date ? new Date(row.date).toISOString().slice(0,10) : ''),
    region: row.country || 'Global',
    event: row.event || 'Event',
    importance: impFromFmp(row.importance),
    previous: row.previous != null ? String(row.previous) : undefined,
    forecast: row.forecast != null ? String(row.forecast) : undefined,
    actual: row.actual != null ? String(row.actual) : undefined,
    source: 'FMP'
  })).filter(ev => ev.date && ev.event)
}
