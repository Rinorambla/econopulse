import { NextRequest, NextResponse } from 'next/server'
import { getTiingoMarketData, getTiingoHistorical } from '@/lib/tiingo'
import { SP500_SYMBOLS } from '@/lib/universe'
import { fetchYahooBatchQuotes } from '@/lib/yahoo-quote-batch'

type Mover = {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume?: number
  source?: string
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size))
  return out
}

function daysFor(period: string) {
  switch (period) {
    case 'weekly': return 7
    case 'monthly': return 30
    case 'quarterly': return 90
    case 'yearly': return 365
    default: return 1
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limitParam = searchParams.get('limit')
    const limit = Math.max(1, Math.min(50, Number(limitParam) || 10))
    const period = (searchParams.get('period') || 'daily').toLowerCase()
    const sector = (searchParams.get('sector') || '').trim()

    // Base universe: S&P 500
    let universe = SP500_SYMBOLS

    // If sector filter is provided, fetch Yahoo batch to classify and narrow the universe
    let sectorName: string | null = null
    let sectorApplied = false
    if (sector) {
      const info = await fetchYahooBatchQuotes(universe)
      const filtered = info.filter(q => (q.sector || '').toLowerCase() === sector.toLowerCase())
      if (filtered.length > 0) {
        // Sort by market cap and take top 60 for perf
        filtered.sort((a,b)=> (b.marketCap||0) - (a.marketCap||0))
        universe = filtered.slice(0, 60).map(q => q.symbol)
        sectorApplied = true
      }
      sectorName = sector
    }

    if (period === 'daily') {
      // For daily, reduce load by taking top 200 by market cap when no sector filter
      if (!sector) {
        const caps = await fetchYahooBatchQuotes(universe)
        if (caps.length > 0) {
          caps.sort((a,b)=> (b.marketCap||0) - (a.marketCap||0))
          universe = caps.slice(0, 200).map(c => c.symbol)
        } // else: keep original universe
      }

      const quotes = await getTiingoMarketData(universe)
      if (!quotes || quotes.length === 0) {
        return NextResponse.json(
          { error: 'No quotes available' },
          { status: 503 }
        )
      }
      const items: Mover[] = quotes
        .map((q: any) => ({
          symbol: q.symbol || q.ticker,
          price: Number(q.price) || 0,
          change: Number(q.change) || 0,
          changePercent: Number(q.changePercent) || 0,
          volume: Number(q.volume) || undefined,
          source: q.source || 'Tiingo IEX'
        }))
        .filter(m => !!m.symbol && Number.isFinite(m.changePercent))
      const sorted = items.sort((a, b) => (b.changePercent - a.changePercent))
      const top = sorted.filter(m => m.changePercent > 0).slice(0, limit)
      const bottom = [...sorted].reverse().filter(m => m.changePercent < 0).slice(0, limit)
      return NextResponse.json({ success:true, period:'daily', sector: sectorName, sectorApplied, universe:'sp500', universeSize: universe.length, top, bottom, timestamp: new Date().toISOString() })
    }

    // Multi-period path: compute perf over N days using Tiingo historical
    const days = daysFor(period)
    // If no sector filter, limit by market cap to keep latency reasonable
    if (!sector) {
      const caps = await fetchYahooBatchQuotes(universe)
      if (caps.length > 0) {
        caps.sort((a,b)=> (b.marketCap||0) - (a.marketCap||0))
        universe = caps.slice(0, 150).map(c => c.symbol)
      } // else: keep original universe
    }

    const perfs: { symbol: string; ret: number; last: number }[] = []
    const batches = chunk(universe, 25)
    await Promise.all(batches.map(async (batch) => {
      await Promise.all(batch.map(async (sym) => {
        try {
          const hist = await getTiingoHistorical(sym, days+2) // a bit more to ensure coverage
          if (!hist || hist.length < 2) return
          const first = hist[0]
          const last = hist[hist.length - 1]
          if (!first?.close || !last?.close) return
          const ret = ((last.close - first.close) / first.close) * 100
          perfs.push({ symbol: sym, ret, last: last.close })
        } catch {}
      }))
    }))

    if (perfs.length === 0) {
      return NextResponse.json({ error: 'No historical data available' }, { status: 503 })
    }

    perfs.sort((a,b)=> b.ret - a.ret)
    const top = perfs.filter(p=> p.ret>0).slice(0, limit).map(p=> ({ symbol:p.symbol, price:p.last, change:p.last, changePercent:p.ret }))
    const bottom = [...perfs].reverse().filter(p=> p.ret<0).slice(0, limit).map(p=> ({ symbol:p.symbol, price:p.last, change:p.last, changePercent:p.ret }))

  return NextResponse.json({ success:true, period, sector: sectorName, sectorApplied, universe:'sp500', universeSize: universe.length, top, bottom, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('❌ Error in /api/top-movers:', error)
    return NextResponse.json({ error: 'Failed to compute top movers' }, { status: 500 })
  }
}
