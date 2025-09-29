import { NextResponse } from 'next/server'
import { fetchMultipleHistory } from '@/lib/yahoo-history'
import { computeMetrics } from '@/lib/metrics'

export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get('symbols')
  const range = searchParams.get('range') || '6mo'
  if (!symbolsParam) return NextResponse.json({ ok:false, error:'symbols param required' }, { status:400 })
  const symbols = symbolsParam.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean).slice(0,25)
  try {
    const histories = await fetchMultipleHistory(symbols, range, '1d')
    const metrics = histories.map(h=>computeMetrics(h))
    return NextResponse.json({ ok:true, count: metrics.length, metrics })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'error' }, { status:500 })
  }
}
