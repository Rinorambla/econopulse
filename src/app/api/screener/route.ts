import { NextResponse } from 'next/server'
import { fetchYahooMarket } from '@/lib/yahoo-unified'

// Basic screener building from available market snapshots
// type=most_active|top_gainers|top_losers
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'most_active'
  const limitParam = parseInt(searchParams.get('limit') || '25',10)
  try {
    const all = await fetchYahooMarket('all')
    let list = all
    if (type === 'top_gainers') list = [...all].sort((a,b)=>b.changePercent - a.changePercent)
    else if (type === 'top_losers') list = [...all].sort((a,b)=>a.changePercent - b.changePercent)
    else if (type === 'most_active') list = [...all].sort((a,b)=> (b.volume||0) - (a.volume||0))
    const data = list.slice(0, limitParam)
    return NextResponse.json({ ok:true, type, count:data.length, data })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message||'error' }, { status:500 })
  }
}
