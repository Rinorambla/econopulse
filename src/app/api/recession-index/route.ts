import { NextResponse } from 'next/server'
import { fredService } from '@/lib/fred'

// Recession Index: spread (US03MY - BAMLH0A0HYM2) weekly with 100-day SMA
// US03MY = 3-Month Treasury Constant Maturity (FRED: DGS3MO or TB3MS)
// BAMLH0A0HYM2 = ICE BofA US High Yield Index Option-Adjusted Spread

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const limit = Math.max(24, Math.min(360, Number(url.searchParams.get('limit') || '180'))) // months (need more for 100-day SMA)

    // Fetch last N observations for both series
    const [tb3ms, hyoas] = await Promise.all([
      fredService.getEconomicIndicator('DGS3MO', limit), // 3-Month Treasury (daily)
      fredService.getEconomicIndicator('BAMLH0A0HYM2', limit), // HY spread (daily)
    ])

    const a = (tb3ms?.observations || []).map((o: any) => ({ date: o.date as string, v: parseFloat(o.value) }))
    const b = (hyoas?.observations || []).map((o: any) => ({ date: o.date as string, v: parseFloat(o.value) }))

    // Align by date (intersection)
    const bMap = new Map<string, number>(
      b
        .filter((x: { date: string; v: number }) => Number.isFinite(x.v))
        .map((x: { date: string; v: number }) => [x.date, x.v] as const)
    )
    const rawSeries: Array<{ date: string; spread: number }> = []
    for (const o of a) {
      if (!Number.isFinite(o.v)) continue
      const bv = bMap.get(o.date)
      if (typeof bv === 'number') {
        // SPREAD = TB3MS - BAMLH0A0HYM2 (higher spread = lower recession risk)
        rawSeries.push({ date: o.date, spread: o.v - bv })
      }
    }
    // Ensure ascending by date
    rawSeries.sort((x, y) => x.date.localeCompare(y.date))

    // Calculate 100-day SMA on the spread
    const smaWindow = 100
    const series: Array<{ date: string; value: number; spread: number; sma100?: number }> = []
    for (let i = 0; i < rawSeries.length; i++) {
      const spr = rawSeries[i].spread
      let sma = null
      if (i >= smaWindow - 1) {
        const window = rawSeries.slice(i - smaWindow + 1, i + 1)
        const sum = window.reduce((acc, r) => acc + r.spread, 0)
        sma = sum / smaWindow
      }
      // Value = current spread relative to SMA (normalized 0-1 where higher = lower recession risk)
      // Heuristic: if spread > sma, value increases; if spread < sma, value decreases
      // Map: spread in range [-2, 4] → value [0, 1] (adjust based on historical data)
      const normalized = sma !== null ? Math.max(0, Math.min(1, (spr + 2) / 6)) : Math.max(0, Math.min(1, (spr + 2) / 6))
      series.push({
        date: rawSeries[i].date,
        value: Number(normalized.toFixed(3)),
        spread: Number(spr.toFixed(3)),
        sma100: sma !== null ? Number(sma.toFixed(3)) : undefined
      })
    }

    const latest = series.length ? series[series.length - 1] : null

    return NextResponse.json({
      success: true,
      id: 'recession_spread',
      name: 'Recession Index (Spread)',
      formula: '(DGS3MO - BAMLH0A0HYM2) with 100-day SMA',
      latest,
      series: series.slice(-120), // return last 120 points (~10 years monthly or ~4 months daily)
      source: 'FRED',
    })
  } catch (e) {
    console.error('Recession Index API error:', e)
    return NextResponse.json({ success: false, error: 'failed' }, { status: 500 })
  }
}
