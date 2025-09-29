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

// Mapping from CFTC market name fragments to a short symbol we show in UI
const SYMBOL_MAP: Record<string,string> = {
  'E-MINI S&P': 'ES',
  'NASDAQ 100': 'NQ',
  'CRUDE OIL': 'CL',
  'WTI CRUDE': 'CL',
  'GOLD': 'GC',
  'SILVER': 'SI',
  'DOLLAR INDEX': 'DX',
  'EURO FX': '6E',
  'BRITISH POUND STERLING': '6B',
  'NATURAL GAS': 'NG',
  'COPPER': 'HG',
  'BRENT CRUDE': 'BZ',
  'SOYBEANS': 'ZS',
  'CORN': 'ZC',
  'WHEAT': 'ZW',
  '10-YEAR U.S. TREASURY NOTES': 'ZN',
  '5-YEAR U.S. TREASURY NOTES': 'ZF'
}

function pickSymbol(market: string): string {
  const upper = market.toUpperCase()
  for (const key of Object.keys(SYMBOL_MAP)) {
    if (upper.includes(key)) return SYMBOL_MAP[key]
  }
  return market.slice(0,6).toUpperCase()
}

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

// Parse CFTC legacy futures-only CSV lines (public weekly report). We pick a subset of markets.
function parseCSV(csv: string): COTFlowRecord[] {
  const lines = csv.split(/\r?\n/).filter(l=>l.trim().length>0)
  // Identify header indices (legacy format). We search by column names.
  const header = lines[0].split(',')
  const idx = (name: string) => header.findIndex(h => h.trim().toLowerCase() === name.toLowerCase())
  const marketIdx = idx('Market_and_Exchange_Names')
  const dateIdx = idx('Report_Date_as_YYYY-MM-DD')
  const ncLongIdx = idx('Noncomm_Positions_Long_All')
  const ncShortIdx = idx('Noncomm_Positions_Short_All')
  const ncChangeLongIdx = idx('Change_in_Noncomm_Long_All')
  const ncChangeShortIdx = idx('Change_in_Noncomm_Short_All')
  const commLongIdx = idx('Comm_Positions_Long_All')
  const commShortIdx = idx('Comm_Positions_Short_All')
  const commChangeLongIdx = idx('Change_in_Comm_Long_All')
  const commChangeShortIdx = idx('Change_in_Comm_Short_All')
  const oiIdx = idx('Open_Interest_All')

  if ([marketIdx,dateIdx,ncLongIdx,ncShortIdx,commLongIdx,commShortIdx,oiIdx].some(i=>i===-1)) {
    throw new Error('Unexpected CSV header format')
  }

  const focusMarkets = Object.keys(SYMBOL_MAP)
  const out: COTFlowRecord[] = []
  for (let i=1;i<lines.length;i++) {
    const cols = lines[i].split(',')
    const market = cols[marketIdx]?.trim()
    if (!market) continue
    if (!focusMarkets.some(f=> market.toUpperCase().includes(f))) continue
    const date = cols[dateIdx]?.trim()
    const ncLong = parseInt(cols[ncLongIdx]||'0',10)
    const ncShort = parseInt(cols[ncShortIdx]||'0',10)
    const ncChangeLong = parseInt(cols[ncChangeLongIdx]||'0',10)
    const ncChangeShort = parseInt(cols[ncChangeShortIdx]||'0',10)
    const commLong = parseInt(cols[commLongIdx]||'0',10)
    const commShort = parseInt(cols[commShortIdx]||'0',10)
    const commChangeLong = parseInt(cols[commChangeLongIdx]||'0',10)
    const commChangeShort = parseInt(cols[commChangeShortIdx]||'0',10)
    const oi = parseInt(cols[oiIdx]||'0',10)

    const nonCommercialNet = ncLong - ncShort
    const commercialNet = commLong - commShort
    const changeNonCommercial = (ncChangeLong - ncChangeShort)
    const changeCommercial = (commChangeLong - commChangeShort)
    let direction: COTFlowRecord['direction'] = 'neutral'
    if (nonCommercialNet > 0) direction = 'long'
    else if (nonCommercialNet < 0) direction = 'short'
    out.push({
      market,
      symbol: pickSymbol(market),
      date,
      nonCommercialNet,
      commercialNet,
      changeNonCommercial,
      changeCommercial,
      openInterest: oi,
      direction
    })
  }

  return out.sort((a,b)=> a.market.localeCompare(b.market))
}

async function fetchCOT(): Promise<COTFlowRecord[]> {
  // CFTC publishes multiple CSVs. We use a common legacy futures-only file (financial futures example)
  // NOTE: URLs can change; adjust if 404. Provide two attempts.
  const urls = [
    'https://www.cftc.gov/dea/newcot/f_disagg.csv', // disaggregated
    'https://www.cftc.gov/dea/newcot/f_fin.csv' // financial futures
  ]
  let lastErr: any = null
  for (const url of urls) {
    try {
      const res = await fetch(url, { next: { revalidate: 0 } })
      if (!res.ok) { lastErr = new Error('HTTP '+res.status); continue }
      const text = await res.text()
      const parsed = parseCSV(text)
      if (parsed.length) return parsed
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('All COT fetch attempts failed')
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
