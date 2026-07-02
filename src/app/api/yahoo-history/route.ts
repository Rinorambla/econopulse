import { NextResponse } from 'next/server'
import { fetchYahooHistory, fetchMultipleHistory } from '@/lib/yahoo-history'
import { fetchTiingoHistory } from '@/lib/tiingo-history'

export const revalidate = 0

async function fetchOne(symbol: string, range: string, interval: string, prePost = false) {
  const y = await fetchYahooHistory(symbol, range, interval, prePost)
  if (y && y.bars && y.bars.length >= 2) return y
  const t = await fetchTiingoHistory(symbol, range, interval)
  if (t && t.bars && t.bars.length >= 2) return t
  return y || t || null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbolParam = searchParams.get('symbol') || ''
  const symbolsParam = searchParams.get('symbols') || ''
  const range = searchParams.get('range') || '1mo'
  const interval = searchParams.get('interval') || '1d'
  const prePost = searchParams.get('prepost') === '1' || searchParams.get('prepost') === 'true'
  try {
    if (symbolsParam) {
      const symbols = symbolsParam.split(',').map(s=>s.trim()).filter(Boolean).slice(0,15)
      const data = await fetchMultipleHistory(symbols, range, interval)
      const have = new Set(data.map(d => d.symbol.toUpperCase()))
      const missing = symbols.filter(s => !have.has(s.toUpperCase()))
      for (const s of missing) {
        const t = await fetchTiingoHistory(s, range, interval)
        if (t) data.push(t)
      }
      return NextResponse.json({ ok:true, mode:'multi', count:data.length, range, interval, data })
    }
    if (!symbolParam) return NextResponse.json({ ok:false, error:'symbol or symbols param required'}, { status:400 })
    const data = await fetchOne(symbolParam, range, interval, prePost)
    if (!data) return NextResponse.json({ ok:false, error:'not found'}, { status:404 })
    return NextResponse.json({ ok:true, range, interval, data })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message||'error'}, { status:500 })
  }
}

