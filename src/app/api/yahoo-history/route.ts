import { NextResponse } from 'next/server'
import { fetchYahooHistory, fetchMultipleHistory } from '@/lib/yahoo-history'

export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbolParam = searchParams.get('symbol') || ''
  const symbolsParam = searchParams.get('symbols') || ''
  const range = searchParams.get('range') || '1mo'
  const interval = searchParams.get('interval') || '1d'
  try {
    if (symbolsParam) {
      const symbols = symbolsParam.split(',').map(s=>s.trim()).filter(Boolean).slice(0,15)
      const data = await fetchMultipleHistory(symbols, range, interval)
      return NextResponse.json({ ok:true, mode:'multi', count:data.length, range, interval, data })
    }
    if (!symbolParam) return NextResponse.json({ ok:false, error:'symbol or symbols param required'}, { status:400 })
    const data = await fetchYahooHistory(symbolParam, range, interval)
    if (!data) return NextResponse.json({ ok:false, error:'not found'}, { status:404 })
    return NextResponse.json({ ok:true, range, interval, data })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message||'error'}, { status:500 })
  }
}
