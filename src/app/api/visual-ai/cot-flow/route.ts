import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { COTSnapshot } from '@/models/COTSnapshot'

interface COTFlowRecord {
  market: string
  symbol: string
  date: string
  nonCommercialNet: number
  commercialNet: number
  changeNonCommercial: number
  changeCommercial: number
  openInterest: number
  direction: 'long' | 'short' | 'neutral'
  zScore?: number
  lookbackWeeks?: number
  extreme?: boolean
}

// Simple in-memory cache (per server instance)
let cache: { timestamp: number; data: COTFlowRecord[] } | null = null
const CACHE_TTL_MS = 1000 * 60 * 60 * 6 // 6 hours

// Exact CFTC Socrata market names → UI symbols
const MARKET_TARGETS: { name: string; symbol: string; label: string }[] = [
  { name: 'E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE', symbol: 'ES', label: 'E-MINI S&P 500' },
  { name: 'NASDAQ MINI - CHICAGO MERCANTILE EXCHANGE', symbol: 'NQ', label: 'E-MINI NASDAQ 100' },
  { name: 'WTI FINANCIAL CRUDE OIL - NEW YORK MERCANTILE EXCHANGE', symbol: 'CL', label: 'CRUDE OIL WTI' },
  { name: 'BRENT LAST DAY - NEW YORK MERCANTILE EXCHANGE', symbol: 'BZ', label: 'BRENT CRUDE' },
  { name: 'GOLD - COMMODITY EXCHANGE INC.', symbol: 'GC', label: 'GOLD' },
  { name: 'SILVER - COMMODITY EXCHANGE INC.', symbol: 'SI', label: 'SILVER' },
  { name: 'HENRY HUB - NEW YORK MERCANTILE EXCHANGE', symbol: 'NG', label: 'NATURAL GAS' },
  { name: 'COPPER- #1 - COMMODITY EXCHANGE INC.', symbol: 'HG', label: 'COPPER' },
  { name: 'EURO FX - CHICAGO MERCANTILE EXCHANGE', symbol: '6E', label: 'EURO FX' },
  { name: 'BRITISH POUND - CHICAGO MERCANTILE EXCHANGE', symbol: '6B', label: 'BRITISH POUND' },
  { name: 'UST 10Y NOTE - CHICAGO BOARD OF TRADE', symbol: 'ZN', label: '10-YEAR U.S. TREASURY NOTES' },
  { name: 'UST 5Y NOTE - CHICAGO BOARD OF TRADE', symbol: 'ZF', label: '5-YEAR U.S. TREASURY NOTES' },
  { name: 'CORN - CHICAGO BOARD OF TRADE', symbol: 'ZC', label: 'CORN' },
  { name: 'SOYBEANS - CHICAGO BOARD OF TRADE', symbol: 'ZS', label: 'SOYBEANS' },
  { name: 'WHEAT-SRW - CHICAGO BOARD OF TRADE', symbol: 'ZW', label: 'WHEAT' },
]

const MARKET_BY_NAME = Object.fromEntries(MARKET_TARGETS.map(m => [m.name, m]))

// Fallback mock data if remote fetch fails
function fallbackData(): COTFlowRecord[] {
  const date = new Date(Date.now()-3*86400000).toISOString().split('T')[0]
  return [
    { market: 'E-MINI S&P 500', symbol: 'ES', date, nonCommercialNet: 120000, commercialNet: -115000, changeNonCommercial: 4500, changeCommercial: -4200, openInterest: 2100000, direction: 'long' },
    { market: 'CRUDE OIL WTI', symbol: 'CL', date, nonCommercialNet: 285000, commercialNet: -290000, changeNonCommercial: 8000, changeCommercial: -7700, openInterest: 3100000, direction: 'long' },
  { market: 'GOLD', symbol: 'GC', date, nonCommercialNet: 165000, commercialNet: -170000, changeNonCommercial: -6000, changeCommercial: 5900, openInterest: 560000, direction: 'long' },
  { market: 'E-MINI NASDAQ 100', symbol: 'NQ', date, nonCommercialNet: 38000, commercialNet: -36000, changeNonCommercial: -1500, changeCommercial: 1400, openInterest: 780000, direction: 'long' },
  { market: 'NATURAL GAS', symbol: 'NG', date, nonCommercialNet: -95000, commercialNet: 94000, changeNonCommercial: 3200, changeCommercial: -3100, openInterest: 1500000, direction: 'short' },
  { market: 'COPPER', symbol: 'HG', date, nonCommercialNet: 25000, commercialNet: -24000, changeNonCommercial: 900, changeCommercial: -880, openInterest: 420000, direction: 'long' },
  { market: 'US DOLLAR INDEX', symbol: 'DX', date, nonCommercialNet: -8000, commercialNet: 7500, changeNonCommercial: -500, changeCommercial: 520, openInterest: 52000, direction: 'short' },
  { market: '10-YEAR U.S. TREASURY NOTES', symbol: 'ZN', date, nonCommercialNet: -210000, commercialNet: 208000, changeNonCommercial: -4000, changeCommercial: 3950, openInterest: 3200000, direction: 'short' }
  ]
}

// Fetch COT data from CFTC Socrata Open Data API (Legacy Futures-Only format)
// Dataset 6dca-aqww = traditional Non-Commercial / Commercial split
async function fetchCOT(): Promise<COTFlowRecord[]> {
  const where = MARKET_TARGETS.map(m => `market_and_exchange_names='${m.name}'`).join(' OR ')
  const select = [
    'market_and_exchange_names',
    'report_date_as_yyyy_mm_dd',
    'open_interest_all',
    'noncomm_positions_long_all',
    'noncomm_positions_short_all',
    'comm_positions_long_all',
    'comm_positions_short_all',
    'change_in_noncomm_long_all',
    'change_in_noncomm_short_all',
    'change_in_comm_long_all',
    'change_in_comm_short_all',
  ].join(',')
  const url = `https://publicreporting.cftc.gov/resource/6dca-aqww.json?$where=${encodeURIComponent(where)}&$order=report_date_as_yyyy_mm_dd DESC&$limit=100&$select=${select}`
  console.log('📊 COT: Fetching from CFTC Socrata API')
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`CFTC Socrata HTTP ${res.status}`)
  const rows: Record<string, string>[] = await res.json()
  console.log(`📊 COT: Got ${rows.length} rows from Socrata`)

  // Group by market: keep only the latest report per market
  const latestByMarket: Record<string, Record<string, string>> = {}
  for (const row of rows) {
    const name = row.market_and_exchange_names
    if (!latestByMarket[name]) latestByMarket[name] = row
  }

  const out: COTFlowRecord[] = []
  for (const [name, row] of Object.entries(latestByMarket)) {
    const target = MARKET_BY_NAME[name]
    if (!target) continue
    const ncLong = parseInt(row.noncomm_positions_long_all || '0', 10)
    const ncShort = parseInt(row.noncomm_positions_short_all || '0', 10)
    const commLong = parseInt(row.comm_positions_long_all || '0', 10)
    const commShort = parseInt(row.comm_positions_short_all || '0', 10)
    const changeNcLong = parseInt(row.change_in_noncomm_long_all || '0', 10)
    const changeNcShort = parseInt(row.change_in_noncomm_short_all || '0', 10)
    const changeCommLong = parseInt(row.change_in_comm_long_all || '0', 10)
    const changeCommShort = parseInt(row.change_in_comm_short_all || '0', 10)
    const nonCommercialNet = ncLong - ncShort
    const commercialNet = commLong - commShort
    const date = (row.report_date_as_yyyy_mm_dd || '').slice(0, 10)

    let direction: COTFlowRecord['direction'] = 'neutral'
    if (nonCommercialNet > 0) direction = 'long'
    else if (nonCommercialNet < 0) direction = 'short'

    out.push({
      market: target.label,
      symbol: target.symbol,
      date,
      nonCommercialNet,
      commercialNet,
      changeNonCommercial: changeNcLong - changeNcShort,
      changeCommercial: changeCommLong - changeCommShort,
      openInterest: parseInt(row.open_interest_all || '0', 10),
      direction,
    })
  }
  console.log(`📊 COT: Processed ${out.length} markets`)
  return out.sort((a, b) => a.symbol.localeCompare(b.symbol))
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success:true, source:'cache', data: cache.data, lastUpdated: new Date(cache.timestamp).toISOString() })
    }
    let data: COTFlowRecord[]
    try {
      data = await fetchCOT()
    } catch (e) {
      // Fallback
      data = fallbackData()
      return NextResponse.json({ success:true, source:'fallback', data, lastUpdated: new Date().toISOString(), warning: 'Using fallback due to fetch error' })
    }

    // Compute z-scores per symbol when multiple historical rows exist (if future enhancement adds history).
    // Current CSV delivers a single snapshot; we simulate simple normalization by grouping duplicates if any.
    const bySymbol: Record<string, COTFlowRecord[]> = {}
    for (const row of data) {
      bySymbol[row.symbol] = bySymbol[row.symbol] || []
      bySymbol[row.symbol].push(row)
    }
    const Z_THRESHOLD = 2
    for (const sym of Object.keys(bySymbol)) {
      const rows = bySymbol[sym]
      if (rows.length < 2) { // not enough history, skip real z-score (set 0)
        rows.forEach(r => { r.zScore = 0; r.lookbackWeeks = rows.length; r.extreme = false })
        continue
      }
      const values = rows.map(r=>r.nonCommercialNet)
      const mean = values.reduce((a,b)=>a+b,0)/values.length
      const variance = values.reduce((a,b)=> a + Math.pow(b-mean,2),0)/Math.max(1,values.length-1)
      const std = Math.sqrt(variance) || 1
      rows.forEach(r => {
        r.zScore = +( (r.nonCommercialNet - mean)/std ).toFixed(2)
        r.lookbackWeeks = rows.length
        r.extreme = Math.abs(r.zScore) >= Z_THRESHOLD
      })
    }
    // Try persistence & true z-score from historical DB
    let dbConnected = false
    try {
      await connectDB()
      dbConnected = true
    } catch {}

    if (dbConnected) {
      const today = new Date().toISOString().split('T')[0]
      // Upsert snapshots
      await Promise.all(data.map(d => COTSnapshot.updateOne({ symbol: d.symbol, date: today }, {
        $set: {
          market: d.market,
          nonCommercialNet: d.nonCommercialNet,
          commercialNet: d.commercialNet,
          changeNonCommercial: d.changeNonCommercial,
            changeCommercial: d.changeCommercial,
          openInterest: d.openInterest
        }
      }, { upsert: true })))
      // Fetch last 52 weeks per symbol for real z-score
      const since = new Date(Date.now() - 370*86400000).toISOString().split('T')[0]
      const history = await COTSnapshot.find({ date: { $gte: since } }).lean()
      const histBySymbol: Record<string, number[]> = {}
      history.forEach(r => {
        histBySymbol[r.symbol] = histBySymbol[r.symbol] || []
        histBySymbol[r.symbol].push(r.nonCommercialNet)
      })
      data.forEach(row => {
        const hist = histBySymbol[row.symbol]
        if (hist && hist.length >= 8) {
          const mean = hist.reduce((a,b)=>a+b,0)/hist.length
          const variance = hist.reduce((a,b)=> a + Math.pow(b-mean,2),0)/Math.max(1,hist.length-1)
          const std = Math.sqrt(variance) || 1
          row.zScore = +(((row.nonCommercialNet - mean)/std)).toFixed(2)
          row.lookbackWeeks = hist.length
          row.extreme = Math.abs(row.zScore) >= Z_THRESHOLD
        }
      })
    }

    cache = { timestamp: Date.now(), data }
    const crisis = data.filter(d=>d.extreme && Math.abs(d.zScore||0)>=3)
    return NextResponse.json({ success:true, source:'remote', data, crisis: crisis.map(c=>({ symbol:c.symbol, z:c.zScore })), lastUpdated: new Date().toISOString() })
  } catch (e:any) {
    return NextResponse.json({ success:false, error:e.message, data: fallbackData() }, { status: 500 })
  }
}
