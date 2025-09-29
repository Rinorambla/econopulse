import { NextResponse } from 'next/server'
import { allSymbols, DEFAULT_GROUPS } from '@/lib/extended-universe'
import { getYahooQuotes } from '@/lib/yahooFinance'
import { mapQuote } from '@/lib/yahoo-unified'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const groupParam = searchParams.get('groups') // comma list of group keys
  const limit = parseInt(searchParams.get('limit')||'0',10)

  try {
    let symbols = allSymbols()
    if (groupParam) {
      const wanted = new Set(groupParam.split(',').map(s=>s.trim()))
      symbols = allSymbols(DEFAULT_GROUPS.filter(g=>wanted.has(g.key)))
    }

    // Optional limit
    if (limit>0) symbols = symbols.slice(0, limit)

    // Fetch quotes in batches
    const quotes = await getYahooQuotes(symbols)
    const assets = quotes.map(q=> mapQuote(q, 'Auto'))

    return NextResponse.json({ ok:true, count: assets.length, symbols: assets.map(a=>a.symbol), data: assets })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'fetch failed' }, { status:500 })
  }
}
