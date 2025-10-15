import { NextRequest, NextResponse } from 'next/server'
import { getTradingEconomicsCalendar } from '../../../lib/tradingeconomics'
import { getFmpEconomicCalendar } from '../../../lib/fmp'
import fs from 'fs'
import path from 'path'

// Real economic calendar via TradingEconomics (if keys configured), with safe fallback

interface EconEvent { date: string; time?: string; region: string; event: string; importance: 'High'|'Medium'|'Low'; previous?: string; forecast?: string; actual?: string; source: string }

let cache: { ts:number; data:EconEvent[] } | null = null
const TTL = 3*60*1000
const SNAP_DIR = path.join(process.cwd(), 'data-snapshots')
const SNAP_FILE = path.join(SNAP_DIR, 'economic-calendar-latest.json')

function writeSnapshot(data: EconEvent[]) {
  try {
    if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR)
    const payload = { ts: new Date().toISOString(), source: 'economic-calendar', count: data.length, data }
    fs.writeFileSync(SNAP_FILE, JSON.stringify(payload, null, 2), 'utf8')
  } catch (e) {
    console.warn('economic-calendar snapshot write error:', e)
  }
}

function readSnapshot(): { ts:string; count:number; data:EconEvent[] } | null {
  try {
    if (!fs.existsSync(SNAP_FILE)) return null
    const raw = JSON.parse(fs.readFileSync(SNAP_FILE, 'utf8'))
    if (Array.isArray(raw?.data)) return raw
    return null
  } catch (e) {
    console.warn('economic-calendar snapshot read error:', e)
    return null
  }
}

function generateSeedEconomic(): EconEvent[] {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0,10)
  return [
    { date: fmt(today), region: 'United States', event: 'Initial Jobless Claims', importance: 'High', previous: '233k', forecast: '235k', actual: '-', source: 'seed' },
    { date: fmt(new Date(today.getTime()+86400000)), region: 'Euro Area', event: 'CPI YoY (Final)', importance: 'High', previous: '2.5%', forecast: '2.5%', actual: '-', source: 'seed' },
    { date: fmt(new Date(today.getTime()+2*86400000)), region: 'Italy', event: 'Industrial Production MoM', importance: 'Medium', previous: '-0.2%', forecast: '0.1%', actual: '-', source: 'seed' },
    { date: fmt(new Date(today.getTime()+3*86400000)), region: 'United States', event: 'Michigan Consumer Sentiment (Prelim)', importance: 'Medium', previous: '68.2', forecast: '68.0', actual: '-', source: 'seed' }
  ]
}

export async function GET(req: NextRequest) {
  try {
    // cache
    if (cache && Date.now()-cache.ts < TTL) {
  return NextResponse.json({ ok:true, data: cache.data, count: cache.data.length, lastUpdate: new Date(cache.ts).toISOString() })
    }

    const url = new URL(req.url)
    const daysParam = url.searchParams.get('days')
    const startParam = url.searchParams.get('start')
    const endParam = url.searchParams.get('end')
    const country = url.searchParams.get('country') || undefined
    const imp = url.searchParams.get('importance') || undefined // e.g. "high,medium,low" or "3,2,1"
    const days = Math.max(1, Math.min(45, Number(daysParam) || 21))
    let d1 = ''
    let d2 = ''
    if (startParam && endParam) {
      d1 = startParam
      d2 = endParam
    } else {
      const start = new Date()
      const end = new Date(Date.now() + days*86400000)
      d1 = start.toISOString().slice(0,10)
      d2 = end.toISOString().slice(0,10)
    }

    // Try TradingEconomics first (guest works but limited; keys recommended)
    let calendar: EconEvent[] = []
    try {
      calendar = await getTradingEconomicsCalendar({ d1, d2, country, importance: imp })
    } catch (e) {
      console.warn('TE calendar error, will fallback:', e)
    }

    // Fallback to FMP if TE empty and FMP key exists
    if (!calendar.length) {
      try {
        const fmp = await getFmpEconomicCalendar(d1, d2)
        if (fmp.length) {
          calendar = fmp as any
        }
      } catch (e) {
        console.warn('FMP calendar fallback error:', e)
      }
    }

    cache = { ts: Date.now(), data: calendar }
    // Persist latest good snapshot
    if (calendar.length) writeSnapshot(calendar)
    // If empty, try snapshot fallback to avoid blank UI
    if (!calendar.length) {
      const snap = readSnapshot()
      if (snap && Array.isArray(snap.data) && snap.data.length) {
        console.warn('economic-calendar: serving snapshot fallback (empty live)')
        return NextResponse.json({ ok:true, data: snap.data, count: snap.data.length, lastUpdate: snap.ts, source: 'snapshot' })
      }
      // Final fallback: seed data
      const seed = generateSeedEconomic()
      return NextResponse.json({ ok:true, data: seed, count: seed.length, lastUpdate: new Date().toISOString(), source: 'seed' })
    }
    return NextResponse.json({ ok:true, data: calendar, count: calendar.length, lastUpdate: new Date().toISOString(), source: 'live' })
  } catch (e:any) {
    // On failure, serve last snapshot if available
    const snap = readSnapshot()
    if (snap && Array.isArray(snap.data) && snap.data.length) {
      console.warn('economic-calendar: serving snapshot fallback')
      return NextResponse.json({ ok:true, data: snap.data, count: snap.data.length, lastUpdate: snap.ts, source: 'snapshot' })
    }
    // Final fallback: seed data (never empty UI)
    const seed = generateSeedEconomic()
    return NextResponse.json({ ok:true, data: seed, count: seed.length, lastUpdate: new Date().toISOString(), source: 'seed' })
  }
}
