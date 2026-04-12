import { NextResponse } from 'next/server'

interface GeoRiskPoint {
  date: string
  gpr: number
  change: number
  percentile: number
  regime: 'low' | 'moderate' | 'elevated' | 'crisis'
}

let cache: { ts: number; data: GeoRiskPoint[] } | null = null
const TTL = 1000 * 60 * 60 * 6 // 6h

function classify(gpr: number): GeoRiskPoint['regime'] {
  if (gpr < 100) return 'low'
  if (gpr < 200) return 'moderate'
  if (gpr < 350) return 'elevated'
  return 'crisis'
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < TTL) {
      return NextResponse.json({ success: true, source: 'cache', data: cache.data, lastUpdated: new Date(cache.ts).toISOString() })
    }

    const key = process.env.FRED_API_KEY
    if (!key) {
      return NextResponse.json({ success: false, data: [], source: 'missing FRED_API_KEY', lastUpdated: new Date().toISOString() })
    }

    // Use FRED Economic Policy Uncertainty Index (daily) as geopolitical risk proxy
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=USEPUINDXD&api_key=${key}&file_type=json&limit=365&sort_order=asc&observation_start=${new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0]}`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error('FRED HTTP ' + res.status)

    const json = await res.json()
    const obs = json.observations || []

    let prev: number | null = null
    const points: GeoRiskPoint[] = []
    for (const o of obs) {
      const val = parseFloat(o.value)
      if (!isFinite(val)) continue
      const change = prev != null ? +(val - prev).toFixed(1) : 0
      prev = val
      points.push({ date: o.date, gpr: +val.toFixed(1), change, percentile: 0, regime: classify(val) })
    }

    if (points.length) {
      const values = points.map(p => p.gpr)
      const min = Math.min(...values)
      const max = Math.max(...values)
      points.forEach(p => { p.percentile = Math.round(((p.gpr - min) / (max - min || 1)) * 100) })
    }

    cache = { ts: Date.now(), data: points }
    const crisis = points.filter(d => d.regime === 'crisis')
    console.log('✅ Geopolitical risk (FRED EPU):', points.length, 'days, latest:', points[points.length - 1]?.gpr)

    return NextResponse.json({ success: true, source: 'FRED USEPUINDXD', data: points, crisis: crisis.map(c => ({ date: c.date, gpr: c.gpr })), lastUpdated: new Date().toISOString() })
  } catch (e: any) {
    console.error('❌ Geopolitical risk error:', e.message)
    return NextResponse.json({ success: false, error: e.message, data: [], availability: 'error' }, { status: 500 })
  }
}
