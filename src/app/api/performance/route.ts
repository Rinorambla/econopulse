import { NextResponse } from 'next/server'
import { computeTimeframePerformance, TimeframePerf } from '@/lib/performance'

export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get('symbols')
  if (!symbolsParam) return NextResponse.json({ ok:false, error:'symbols required' }, { status:400 })
  const symbols = symbolsParam.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean).slice(0,150)
  try {
    const perf = await computeTimeframePerformance(symbols)
    const filterParam = searchParams.get('fields') // e.g. d1,w1,m1,m3,m6,ytd,w52
    let data: any[] = perf
    if (filterParam) {
      const wanted = new Set(filterParam.split(',').map(s=>s.trim()))
      data = perf.map(p => {
        const base: any = { symbol: p.symbol }
        for (const k of Object.keys(p) as (keyof TimeframePerf)[]) {
          if (k === 'symbol') continue
          if (wanted.has(k)) base[k] = (p as any)[k]
        }
        return base
      })
    }
    // summary stats
    const summary = (['d1','w1','m1','m3','m6','ytd','w52'] as (keyof TimeframePerf)[]).reduce((acc, key) => {
      const vals = perf.map(p => p[key]).filter(v=>typeof v === 'number') as number[]
      if (vals.length) acc[key] = {
        avg: vals.reduce((s,v)=>s+v,0)/vals.length,
        min: Math.min(...vals),
        max: Math.max(...vals)
      }
      return acc
    }, {} as Record<string, { avg:number; min:number; max:number }>)
    return NextResponse.json({ ok:true, count: data.length, data, summary })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message||'error' }, { status:500 })
  }
}
