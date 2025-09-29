import { NextResponse } from 'next/server'
import { allSymbols, DEFAULT_GROUPS } from '@/lib/extended-universe'
import { fetchYahooBatchQuotes } from '@/lib/yahoo-quote-batch'
import { getYahooQuotes } from '@/lib/yahooFinance'

interface HeatmapNode {
  symbol: string
  name: string
  price: number
  changePercent: number
  volume: number
  marketCap: number
  sector: string
  industry?: string
}

// Simple in-memory cache (per server instance)
let CACHE: { ts:number; data:HeatmapNode[] } | null = null
const TTL_MS = 5*60*1000

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit')||'0',10)
  const categoryParam = (searchParams.get('category')||'all').toLowerCase()

  // Map group key to dashboard category labels
  const groupCategory = (key:string): string => {
    if (key.includes('fx')) return 'Forex'
    if (key.includes('crypto')) return 'Crypto'
    if (key.includes('commodity')) return 'Commodities'
    if (key.includes('bond')) return 'Bonds'
    if (key.includes('sector_etf') || key.includes('factor')) return 'Sector ETFs'
    if (key.includes('global_indices')) return 'Indices'
    if (key.includes('rates')) return 'Bonds'
    if (key.includes('us_')) return 'Equity'
    if (key.includes('eu_') || key.includes('uk_') || key.includes('asia_')) return 'International Equity'
    return 'Other'
  }

  let baseGroups = DEFAULT_GROUPS
  if (categoryParam !== 'all') {
    baseGroups = DEFAULT_GROUPS.filter(g => groupCategory(g.key).toLowerCase() === categoryParam)
  }
  const universe = allSymbols(baseGroups)
  const symbols = limit>0 ? universe.slice(0,limit) : universe

  // Serve cache if fresh and no explicit limit override (limit invalidates full cache reuse)
  if (!limit && CACHE && Date.now()-CACHE.ts < TTL_MS) {
    return NextResponse.json({ ok:true, cached:true, count:CACHE.data.length, data:CACHE.data })
  }
  try {
    const start = Date.now()
    const allAttempts: { tag:string; quotes: any[] }[] = []
    const attemptSets: { tag:string; list:string[] }[] = [
      { tag:'full', list: symbols },
      { tag:'subset_40', list: symbols.slice(0,40) },
      { tag:'subset_20', list: symbols.slice(0,20) },
      { tag:'subset_10', list: symbols.slice(0,10) }
    ]
    let usedQuotes: any[] = []
    let note: string | undefined
    for (const att of attemptSets) {
      const q = await fetchYahooBatchQuotes(att.list)
      allAttempts.push({ tag:att.tag, quotes:q })
      if (q.length) { usedQuotes = q; note = att.tag; break }
    }
    if (!usedQuotes.length) {
      // Fallback: per-symbol fetch (slower but more resilient)
      const fallbackList = symbols.slice(0,25)
      try {
        const singles = await getYahooQuotes(fallbackList)
        if (singles.length) {
          usedQuotes = singles.map(s=>({
            symbol: s.ticker,
            shortName: s.name,
            longName: s.name,
            regularMarketPrice: s.price,
            regularMarketChangePercent: s.changePercent,
            regularMarketVolume: s.volume,
            // approximate pseudo marketCap via volume*price (intraday proxy)
            marketCap: (s.volume||0) * (s.price||0),
            sector: 'Other',
            industry: undefined
          }))
          note = 'fallback_single'
        } else {
          note = note || 'no_data'
        }
      } catch {
        note = note || 'no_data'
      }
    }
    const data: HeatmapNode[] = usedQuotes.map(q=>{
      const marketCap = q.marketCap && q.marketCap > 0 ? q.marketCap : (q.regularMarketVolume || 0) * (q.regularMarketPrice || 0)
      return {
        symbol: q.symbol,
        name: q.shortName || q.longName || q.symbol,
        price: q.regularMarketPrice || 0,
        changePercent: q.regularMarketChangePercent || 0,
        volume: q.regularMarketVolume || 0,
        marketCap,
        sector: q.sector || 'Other',
        industry: q.industry
      }
    }).filter(a=> a.marketCap > 0)
    if (!limit) {
      CACHE = { ts: Date.now(), data }
    }
  return NextResponse.json({ ok:true, count:data.length, ms: Date.now()-start, note, category:categoryParam, attempts: allAttempts.map(a=>({ tag:a.tag, n:a.quotes.length })), data })
  } catch(e:any) {
    return NextResponse.json({ ok:false, error:e?.message||'failed' }, { status:500 })
  }
}
