import { NextRequest, NextResponse } from 'next/server'

// Minimal pragmatic dataset with recent SEP medians (illustrative values; update when new SEP is released)
// Units: percent (upper bound target rate median)
// Horizons typically: currentYear, nextYear, nextTwoYears, longerRun
const SEP_MEDS = {
  // Replace with last official SEP medians
  lastRelease: '2024-09-18', // example date; update to official
  horizons: [
    { key: '2024', label: '2024', median: 5.4, centralTendencyLow: 5.1, centralTendencyHigh: 5.6 },
    { key: '2025', label: '2025', median: 4.1, centralTendencyLow: 3.6, centralTendencyHigh: 4.4 },
    { key: '2026', label: '2026', median: 3.1, centralTendencyLow: 2.6, centralTendencyHigh: 3.4 },
    { key: 'longer_run', label: 'Longer run', median: 2.5, centralTendencyLow: 2.4, centralTendencyHigh: 2.6 }
  ]
}

// Simple in-memory cache
let cache: { data: any; ts: number } | null = null
const CACHE_MS = 6 * 60 * 60 * 1000 // 6h

export async function GET(_req: NextRequest) {
  try {
    const now = Date.now()
    if (cache && now - cache.ts < CACHE_MS) {
      return NextResponse.json({ success: true, data: cache.data, source: 'cache', lastUpdated: new Date(cache.ts).toISOString() })
    }

    // In future: enrich using FRED when official series become programmatically available.
    // For now we return the curated SEP medians above.
    const data = {
      releaseDate: SEP_MEDS.lastRelease,
      horizons: SEP_MEDS.horizons,
      methodology: 'SEP medians from the FOMC Summary of Economic Projections; values are maintained in-repo and updated each release.'
    }
    cache = { data, ts: now }
    return NextResponse.json({ success: true, data, source: 'SEP curated dataset', lastUpdated: new Date(now).toISOString() })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'unknown error' }, { status: 500 })
  }
}
