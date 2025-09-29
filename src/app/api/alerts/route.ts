import { NextResponse } from 'next/server'
import { fetchMultipleHistory } from '@/lib/yahoo-history'
import { computeMetrics } from '@/lib/metrics'

// Simple alert engine
// params: symbols, pct=3 (move threshold), rsiHigh=70, rsiLow=30
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get('symbols')
  if (!symbolsParam) return NextResponse.json({ ok:false, error:'symbols required' }, { status:400 })
  const pct = parseFloat(searchParams.get('pct') || '3')
  const rsiHigh = parseFloat(searchParams.get('rsiHigh') || '70')
  const rsiLow = parseFloat(searchParams.get('rsiLow') || '30')
  const symbols = symbolsParam.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean).slice(0,30)
  try {
    const histories = await fetchMultipleHistory(symbols, '3mo', '1d')
    const alerts: any[] = []
    histories.forEach(h => {
      const m = computeMetrics(h)
      const bars = h.bars
      if (bars.length < 2) return
      const last = bars[bars.length-1]
      const prev = bars[bars.length-2]
      const movePct = prev.close ? ((last.close - prev.close)/prev.close)*100 : 0
      const triggers: string[] = []
      if (Math.abs(movePct) >= pct) triggers.push(`Move ${movePct.toFixed(2)}%`) 
      if (m.rsi14 !== null && m.rsi14 >= rsiHigh) triggers.push(`RSI High ${m.rsi14.toFixed(1)}`)
      if (m.rsi14 !== null && m.rsi14 <= rsiLow) triggers.push(`RSI Low ${m.rsi14.toFixed(1)}`)
      if (m.breakout20d) triggers.push('Breakout 20D High')
      if (triggers.length) alerts.push({ symbol: h.symbol, triggers, metrics: m })
    })
    return NextResponse.json({ ok:true, count: alerts.length, alerts })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message||'error' }, { status:500 })
  }
}
