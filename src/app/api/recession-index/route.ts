import { NextResponse } from 'next/server'
import { fredService } from '@/lib/fred'

// Recession Index (mspred): us03my / BAMLH0A0HYM2
// We map us03my to FRED's 3-Month Treasury Constant Maturity: TB3MS
// BAMLH0A0HYM2 = ICE BofA US High Yield Index Option-Adjusted Spread

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const limit = Math.max(24, Math.min(240, Number(url.searchParams.get('limit') || '120'))) // months

    // Fetch last N observations for both series (sorted desc per fredService)
    const [tb3ms, hyoas] = await Promise.all([
      fredService.getEconomicIndicator('TB3MS', limit),
      fredService.getEconomicIndicator('BAMLH0A0HYM2', limit),
    ])

    const a = (tb3ms?.observations || []).map((o: any) => ({ date: o.date as string, v: parseFloat(o.value) }))
    const b = (hyoas?.observations || []).map((o: any) => ({ date: o.date as string, v: parseFloat(o.value) }))

    // Align by date (use map for B)
    const bMap = new Map<string, number>(
      b
        .filter((x: { date: string; v: number }) => Number.isFinite(x.v))
        .map((x: { date: string; v: number }) => [x.date, x.v] as const)
    )
    const series: Array<{ date: string; value: number }> = []
    for (const o of a) {
      if (!Number.isFinite(o.v)) continue
      const bv = bMap.get(o.date)
      if (typeof bv === 'number' && bv !== 0) {
        series.push({ date: o.date, value: o.v / bv })
      }
    }
    // FRED returns desc ordered; ensure ascending by date for consumers that expect chronological
    series.sort((x, y) => x.date.localeCompare(y.date))
    const latest = series.length ? series[series.length - 1] : null

    return NextResponse.json({
      success: true,
      id: 'mspred',
      name: 'Recession Index',
      formula: 'TB3MS / BAMLH0A0HYM2',
      latest,
      series,
      source: 'FRED',
    })
  } catch (e) {
    console.error('Recession Index API error:', e)
    return NextResponse.json({ success: false, error: 'failed' }, { status: 500 })
  }
}
