import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// US Economic Cycle Detector — classifies the CURRENT regime and the regime we
// are TRANSITIONING toward, using 3-month trends (vs 6-month baseline) of
// official FRED data instead of a single month's print.

type Regime = 'goldilocks' | 'reflation' | 'stagflation' | 'recession' | 'deflation' | 'disinflation'

const REGIME_LABEL: Record<Regime, string> = {
  goldilocks: 'Goldilocks Economy',
  reflation: 'Reflation',
  stagflation: 'Stagflation',
  recession: 'Recession',
  deflation: 'Deflation',
  disinflation: 'Disinflation',
}

interface Obs { t: number; v: number }

let CACHE: { ts: number; payload: any } | null = null
const TTL = 6 * 60 * 60 * 1000

async function fred(id: string): Promise<Obs[]> {
  const key = process.env.FRED_API_KEY
  if (!key) return []
  const start = new Date(Date.now() - 4 * 365 * 86400000).toISOString().slice(0, 10)
  try {
    const r = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${key}&file_type=json&observation_start=${start}&sort_order=asc`,
      { signal: AbortSignal.timeout(9000), next: { revalidate: 21600 } },
    )
    if (!r.ok) return []
    const j = await r.json()
    return (j?.observations || [])
      .map((o: any) => ({ t: new Date(o.date).getTime(), v: parseFloat(o.value) }))
      .filter((o: Obs) => Number.isFinite(o.v))
  } catch {
    return []
  }
}

const last = (s: Obs[]): number | null => (s.length ? s[s.length - 1].v : null)
// Value closest to N months before the last observation.
function monthsAgo(s: Obs[], m: number): number | null {
  if (!s.length) return null
  const target = s[s.length - 1].t - m * 30.44 * 86400000
  let best = s[0]
  for (const o of s) if (Math.abs(o.t - target) < Math.abs(best.t - target)) best = o
  return best.v
}
// Annualized % change over the last N months.
function annPct(s: Obs[], m: number): number | null {
  const now = last(s), prev = monthsAgo(s, m)
  if (now == null || prev == null || prev === 0) return null
  return (Math.pow(now / prev, 12 / m) - 1) * 100
}
function yoy(s: Obs[]): number | null {
  const now = last(s), prev = monthsAgo(s, 12)
  if (now == null || prev == null || prev === 0) return null
  return ((now - prev) / prev) * 100
}
const clamp = (n: number, lo = -100, hi = 100) => Math.max(lo, Math.min(hi, n))

function classify(growth: number, inflLevel: number, inflMom: number, sahm: number | null, claimsTrend: number | null): Regime {
  const laborBreaking = (sahm != null && sahm >= 0.3) || (claimsTrend != null && claimsTrend > 20)
  if (growth <= -12 || laborBreaking) {
    return inflLevel > 25 ? 'stagflation' : 'recession'
  }
  if (growth >= 10) {
    if (inflLevel > 25 && inflMom > 5) return 'reflation'
    if (inflLevel > 45) return 'reflation'
    return 'goldilocks'
  }
  // Sluggish growth band
  if (inflLevel > 35 && inflMom >= 0) return 'stagflation'
  if (inflMom < -5) return 'disinflation'
  if (inflLevel <= 0 && inflMom < 0) return 'deflation'
  return inflLevel > 25 ? 'reflation' : 'goldilocks'
}

async function build() {
  const [indpro, payems, unrate, rsafs, icsa, cpi, corepce, hy, sahm, umcsent, houst] = await Promise.all([
    fred('INDPRO'), fred('PAYEMS'), fred('UNRATE'), fred('RSAFS'), fred('ICSA'),
    fred('CPIAUCSL'), fred('PCEPILFE'), fred('BAMLH0A0HYM2'), fred('SAHMREALTIME'),
    fred('UMCSENT'), fred('HOUST'),
  ])

  // ── Growth composite (3-month trends, -100..+100) ──
  const parts3: { name: string; score: number; detail: string }[] = []
  const parts6: number[] = []
  const add = (name: string, s3: number | null, s6: number | null, detail: string) => {
    if (s3 == null) return
    parts3.push({ name, score: clamp(s3), detail })
    if (s6 != null) parts6.push(clamp(s6))
  }

  const ip3 = annPct(indpro, 3), ip6 = annPct(indpro, 6)
  if (ip3 != null) add('Industrial production', ip3 * 25, ip6 != null ? ip6 * 25 : null, `${ip3 >= 0 ? '+' : ''}${ip3.toFixed(1)}% 3M ann.`)

  const pNow = last(payems), p3 = monthsAgo(payems, 3), p6 = monthsAgo(payems, 6)
  if (pNow != null && p3 != null) {
    const avg3 = (pNow - p3) / 3 // K jobs/month
    const avg6 = p6 != null ? (pNow - p6) / 6 : null
    add('Payrolls', ((avg3 - 50) / 150) * 100, avg6 != null ? ((avg6 - 50) / 150) * 100 : null, `${avg3 >= 0 ? '+' : ''}${avg3.toFixed(0)}K/month avg (3M)`)
  }

  const rs3 = annPct(rsafs, 3), rs6 = annPct(rsafs, 6)
  if (rs3 != null) add('Retail sales', rs3 * 16, rs6 != null ? rs6 * 16 : null, `${rs3 >= 0 ? '+' : ''}${rs3.toFixed(1)}% 3M ann.`)

  const uNow = last(unrate), u3 = monthsAgo(unrate, 3), u6 = monthsAgo(unrate, 6)
  if (uNow != null && u3 != null) {
    add('Unemployment', -(uNow - u3) * 250, u6 != null ? -(uNow - u6) * 125 : null, `${uNow.toFixed(1)}% (${(uNow - u3) >= 0 ? '+' : ''}${(uNow - u3).toFixed(1)}pp in 3M)`)
  }

  const cNow = last(icsa), c3 = monthsAgo(icsa, 3)
  const claimsTrend = cNow != null && c3 != null && c3 > 0 ? ((cNow - c3) / c3) * 100 : null
  if (claimsTrend != null) add('Jobless claims', -claimsTrend * 3, null, `${claimsTrend >= 0 ? '+' : ''}${claimsTrend.toFixed(0)}% in 3M`)

  const h3 = annPct(houst, 3)
  if (h3 != null) add('Housing starts', h3 * 3, annPct(houst, 6) != null ? annPct(houst, 6)! * 3 : null, `${h3 >= 0 ? '+' : ''}${h3.toFixed(0)}% 3M ann.`)

  const umNow = last(umcsent), um3 = monthsAgo(umcsent, 3)
  if (umNow != null && um3 != null) add('Consumer sentiment', (umNow - um3) * 8, null, `${umNow.toFixed(1)} (${(umNow - um3) >= 0 ? '+' : ''}${(umNow - um3).toFixed(1)} in 3M)`)

  const growthScore = parts3.length ? parts3.reduce((s, p) => s + p.score, 0) / parts3.length : 0
  const growthScore6 = parts6.length ? parts6.reduce((s, p) => s + p, 0) / parts6.length : growthScore
  const growthMomentum = growthScore - growthScore6 // >0 = growth improving vs 6M baseline

  // ── Inflation level + momentum ──
  const cpiYoY = yoy(cpi)
  const pceYoY = yoy(corepce)
  const cpi3mAnn = annPct(cpi, 3)
  const level = cpiYoY != null && pceYoY != null ? (cpiYoY + pceYoY) / 2 : (cpiYoY ?? pceYoY ?? 2)
  const inflLevel = clamp((level - 2) * 40) // 2% target → 0
  const inflMom = cpi3mAnn != null && cpiYoY != null ? clamp((cpi3mAnn - cpiYoY) * 40) : 0

  // ── Stress confirmations ──
  const sahmNow = last(sahm)
  const hyNow = last(hy), hy3 = monthsAgo(hy, 3)
  const hyDelta = hyNow != null && hy3 != null ? (hyNow - hy3) * 100 : null // bp

  const regime = classify(growthScore, inflLevel, inflMom, sahmNow, claimsTrend)
  // Where are we heading? Project 3-month momentum forward.
  const projected = classify(growthScore + growthMomentum * 1.5, clamp(inflLevel + inflMom * 0.75), inflMom, sahmNow, claimsTrend)
  const transitioningTo = projected !== regime ? projected : null

  // Confidence: agreement of growth components with the growth verdict + macro clarity.
  const agree = parts3.filter(p => (growthScore >= 0 ? p.score >= 0 : p.score < 0)).length
  const confidence = Math.round(clamp(45 + (agree / Math.max(parts3.length, 1)) * 35 + Math.min(Math.abs(growthScore) / 4, 15), 40, 95))

  const drivers = [
    ...parts3.map(p => `${p.name}: ${p.detail}`),
    cpiYoY != null ? `CPI ${cpiYoY.toFixed(1)}% YoY${cpi3mAnn != null ? ` (3M ann. ${cpi3mAnn.toFixed(1)}% → ${cpi3mAnn > cpiYoY ? 'accelerating' : 'cooling'})` : ''}` : null,
    pceYoY != null ? `Core PCE ${pceYoY.toFixed(1)}% YoY` : null,
    sahmNow != null ? `Sahm rule ${sahmNow.toFixed(2)} (${sahmNow >= 0.5 ? 'recession signal' : sahmNow >= 0.3 ? 'warning' : 'no recession signal'})` : null,
    hyDelta != null ? `HY spread ${hyDelta >= 0 ? '+' : ''}${hyDelta.toFixed(0)}bp in 3M` : null,
  ].filter(Boolean) as string[]

  return {
    ok: true,
    regime,
    regimeLabel: REGIME_LABEL[regime],
    transitioningTo,
    transitioningToLabel: transitioningTo ? REGIME_LABEL[transitioningTo] : null,
    confidence,
    growthScore: Math.round(growthScore),
    growthMomentum: Math.round(growthMomentum),
    inflationLevel: Math.round(inflLevel),
    inflationMomentum: Math.round(inflMom),
    inflationYoY: cpiYoY != null ? +cpiYoY.toFixed(2) : null,
    inflation3mAnn: cpi3mAnn != null ? +cpi3mAnn.toFixed(2) : null,
    corePceYoY: pceYoY != null ? +pceYoY.toFixed(2) : null,
    sahm: sahmNow,
    drivers,
    methodology: '3-month trends vs 6-month baseline across 7 growth indicators + CPI/core-PCE level & momentum (FRED)',
    asOf: new Date().toISOString(),
  }
}

export async function GET() {
  try {
    if (CACHE && Date.now() - CACHE.ts < TTL) {
      return NextResponse.json(CACHE.payload, { headers: { 'x-cache': 'HIT' } })
    }
    const payload = await build()
    CACHE = { ts: Date.now(), payload }
    return NextResponse.json(payload, { headers: { 'x-cache': 'MISS' } })
  } catch (e: any) {
    if (CACHE) return NextResponse.json(CACHE.payload, { headers: { 'x-cache': 'STALE' } })
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 })
  }
}
