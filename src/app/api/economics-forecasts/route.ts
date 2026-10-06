export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

// IMF WEO forecasts (DataMapper API — free, no key). One call per indicator
// returns every country/year including the WEO projection years, so a
// TradingEconomics-style "Forecasts" table costs 4 upstream calls, cached 12h.

interface ForecastRow {
  code: string
  country: string
  gdpGrowth: Record<string, number | null>
  inflation: Record<string, number | null>
  unemployment: Record<string, number | null>
  govDebt: Record<string, number | null>
}

const COUNTRIES: { code: string; name: string }[] = [
  { code: 'USA', name: 'United States' }, { code: 'CHN', name: 'China' }, { code: 'JPN', name: 'Japan' },
  { code: 'DEU', name: 'Germany' }, { code: 'IND', name: 'India' }, { code: 'GBR', name: 'United Kingdom' },
  { code: 'FRA', name: 'France' }, { code: 'ITA', name: 'Italy' }, { code: 'ESP', name: 'Spain' },
  { code: 'CAN', name: 'Canada' }, { code: 'BRA', name: 'Brazil' }, { code: 'RUS', name: 'Russia' },
  { code: 'KOR', name: 'South Korea' }, { code: 'AUS', name: 'Australia' }, { code: 'MEX', name: 'Mexico' },
  { code: 'IDN', name: 'Indonesia' }, { code: 'NLD', name: 'Netherlands' }, { code: 'SAU', name: 'Saudi Arabia' },
  { code: 'TUR', name: 'Turkey' }, { code: 'CHE', name: 'Switzerland' }, { code: 'POL', name: 'Poland' },
  { code: 'SWE', name: 'Sweden' }, { code: 'BEL', name: 'Belgium' }, { code: 'ARG', name: 'Argentina' },
  { code: 'NOR', name: 'Norway' }, { code: 'AUT', name: 'Austria' }, { code: 'ARE', name: 'UAE' },
  { code: 'SGP', name: 'Singapore' }, { code: 'DNK', name: 'Denmark' }, { code: 'ZAF', name: 'South Africa' },
  { code: 'IRL', name: 'Ireland' }, { code: 'PRT', name: 'Portugal' }, { code: 'GRC', name: 'Greece' },
  { code: 'FIN', name: 'Finland' }, { code: 'NZL', name: 'New Zealand' }, { code: 'EGY', name: 'Egypt' },
  { code: 'NGA', name: 'Nigeria' }, { code: 'VNM', name: 'Vietnam' }, { code: 'THA', name: 'Thailand' },
  { code: 'ISR', name: 'Israel' },
]

const INDICATORS = {
  gdpGrowth: 'NGDP_RPCH',     // Real GDP growth, %
  inflation: 'PCPIPCH',       // CPI inflation, avg %
  unemployment: 'LUR',        // Unemployment rate, %
  govDebt: 'GGXWDG_NGDP',     // Gross government debt, % GDP
} as const

async function imfAll(indicator: string): Promise<Record<string, Record<string, number>>> {
  const r = await fetch(`https://www.imf.org/external/datamapper/api/v1/${indicator}`, {
    next: { revalidate: 12 * 3600 },
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!r.ok) throw new Error(`IMF ${indicator} HTTP ${r.status}`)
  const j = await r.json()
  return j?.values?.[indicator] || {}
}

let cache: { ts: number; payload: any } | null = null
const TTL = 12 * 3600 * 1000

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request)
  const rl = rateLimit(`econ-forecasts:${ip}`, 20, 60_000)
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } })

  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.payload, { headers: rateLimitHeaders(rl) })
  }

  try {
    const [gdp, infl, unemp, debt] = await Promise.all([
      imfAll(INDICATORS.gdpGrowth),
      imfAll(INDICATORS.inflation),
      imfAll(INDICATORS.unemployment).catch(() => ({} as Record<string, Record<string, number>>)),
      imfAll(INDICATORS.govDebt).catch(() => ({} as Record<string, Record<string, number>>)),
    ])

    const nowYear = new Date().getFullYear()
    const years = [nowYear, nowYear + 1, nowYear + 2].map(String)

    const pick = (src: Record<string, Record<string, number>>, code: string): Record<string, number | null> => {
      const byYear = src[code] || {}
      const out: Record<string, number | null> = {}
      for (const y of years) {
        const v = byYear[y]
        out[y] = typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) / 10 : null
      }
      return out
    }

    const data: ForecastRow[] = COUNTRIES.map(({ code, name }) => ({
      code,
      country: name,
      gdpGrowth: pick(gdp, code),
      inflation: pick(infl, code),
      unemployment: pick(unemp, code),
      govDebt: pick(debt, code),
    })).filter(row => Object.values(row.gdpGrowth).some(v => v != null))

    const payload = { ok: true, years, data, source: 'IMF WEO (DataMapper)', asOf: new Date().toISOString() }
    cache = { ts: Date.now(), payload }
    return NextResponse.json(payload, { headers: rateLimitHeaders(rl) })
  } catch (e: any) {
    if (cache) return NextResponse.json(cache.payload, { headers: { ...rateLimitHeaders(rl), 'X-Cache': 'STALE' } })
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500, headers: rateLimitHeaders(rl) })
  }
}
