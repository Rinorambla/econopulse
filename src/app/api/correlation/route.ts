import { NextResponse } from 'next/server'
import { computeCorrelation } from '@/lib/correlation'

export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get('symbols')
  const range = searchParams.get('range') || '3mo'
  if (!symbolsParam) return NextResponse.json({ ok:false, error:'symbols required' }, { status:400 })
  const symbols = symbolsParam.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean).slice(0,15)
  try {
    const matrix = await computeCorrelation(symbols, range)
    return NextResponse.json({ ok:true, range, ...matrix })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message||'error' }, { status:500 })
  }
}
