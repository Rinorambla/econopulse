import { NextResponse } from 'next/server'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { getTiingoMarketData, getTiingoNews } from '@/lib/tiingo'
import { getTradingEconomicsCalendar } from '@/lib/tradingeconomics'

type Region = {
  id: string
  name: string
  ticker: string
  teCountry: string
  flag: string
}

const REGIONS: Region[] = [
  { id: 'us', name: 'United States', ticker: 'SPY', teCountry: 'United States', flag: '🇺🇸' },
  { id: 'cn', name: 'China', ticker: 'MCHI', teCountry: 'China', flag: '🇨🇳' },
  { id: 'jp', name: 'Japan', ticker: 'EWJ', teCountry: 'Japan', flag: '🇯🇵' },
  { id: 'uk', name: 'United Kingdom', ticker: 'EWU', teCountry: 'United Kingdom', flag: '🇬🇧' },
  { id: 'de', name: 'Germany', ticker: 'EWG', teCountry: 'Germany', flag: '🇩🇪' },
  { id: 'eu', name: 'Europe', ticker: 'VGK', teCountry: 'Euro Area', flag: '🇪🇺' },
  { id: 'au', name: 'Australia', ticker: 'EWA', teCountry: 'Australia', flag: '🇦🇺' },
  { id: 'in', name: 'India', ticker: 'INDA', teCountry: 'India', flag: '🇮🇳' },
  { id: 'br', name: 'Brazil', ticker: 'EWZ', teCountry: 'Brazil', flag: '🇧🇷' }
]

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }

function deriveDriver(catalysts: string[], headlines: string[]): string {
  const text = (catalysts.join(' ') + ' ' + headlines.join(' ')).toLowerCase()
  if (/cpi|inflation|jobs|nonfarm|payroll|fed|rate|hike|cut|ecb|boe|pboC|central bank/.test(text)) return 'Macro Policy'
  if (/earnings|results|guidance|revenue|profit|tech|ai|nvidia|semiconductor/.test(text)) return 'Earnings/Tech'
  if (/oil|wti|brent|copper|gold|commodity|fx|currency|yuan|yen|dollar/.test(text)) return 'Commodities/FX'
  return 'Risk Sentiment'
}

function deriveOutlook(sentiment: 'bullish'|'bearish'|'neutral', driver: string, changePct: number, topCatalyst?: string) {
  const dir = sentiment === 'bullish' ? 'Bullish' : sentiment === 'bearish' ? 'Bearish' : 'Neutral'
  const reason = topCatalyst ? `on ${topCatalyst}` : `with ${driver.toLowerCase()} influences`
  const bias = Math.abs(changePct) > 0.8 ? 'strong' : Math.abs(changePct) > 0.3 ? 'moderate' : 'mild'
  return `${dir} ${bias} tone ${reason}. Monitor follow-through vs. data surprises.`
}

export async function GET(req: Request) {
  try {
    // Basic rate limit per IP
    const ip = getClientIp(req)
    const rl = rateLimit(`global-drivers:${ip}`, 30, 60_000)
    if (!rl.ok) {
      return new NextResponse('Too Many Requests', { status: 429, headers: rateLimitHeaders(rl) })
    }
    // Fetch market data
    const tickers = REGIONS.map(r => r.ticker)
    const quotes = await getTiingoMarketData(tickers)

    // Map quotes by ticker for quick lookup
    const byTicker: Record<string, any> = {}
    for (const q of quotes) byTicker[q.symbol] = 'data' in q ? (q as any).data : q

    // TradingEconomics calendar for next 3 days, high/medium importance
    const today = new Date()
    const d1 = today.toISOString().slice(0,10)
    const d2 = new Date(today.getTime() + 3*24*60*60*1000).toISOString().slice(0,10)
    let calendar: any[] = []
    try {
      calendar = await getTradingEconomicsCalendar({ d1, d2, country: REGIONS.map(r=>r.teCountry).join(','), importance: 'high,medium' })
    } catch {}

    // Tiingo news for symbols
    let news: any[] = []
    try {
      news = await getTiingoNews(tickers, 5)
    } catch {}

    const result = REGIONS.map(region => {
      const q = byTicker[region.ticker] || {}
      const changePercent = typeof q.changePercent === 'number' ? q.changePercent : 0
      const sentiment: 'bullish'|'bearish'|'neutral' = changePercent > 0.3 ? 'bullish' : changePercent < -0.3 ? 'bearish' : 'neutral'

      const regionCatalysts = (calendar || []).filter(ev => ev.region === region.teCountry)
        .slice(0, 5)
      const catalystLabels = regionCatalysts.map(ev => ev.event)

      const regionHeadlines = (news || []).filter(n => (n.tickers||[]).includes(region.ticker)).slice(0, 5)
      const headlineTitles = regionHeadlines.map(n => n.title as string)

      const driver = deriveDriver(catalystLabels, headlineTitles)

      // Rough strengths heuristic
      let retail = 50 + (sentiment === 'bullish' ? 1 : -1) * Math.min(10, Math.abs(changePercent))
      if (driver === 'Macro Policy') retail -= 10
      if (/meme|retail|short squeeze|reddit/i.test(headlineTitles.join(' '))) retail += 15
      const hedge = 100 - retail

      const outlook = deriveOutlook(sentiment, driver, changePercent, catalystLabels[0])

      return {
        id: region.id,
        name: region.name,
        flag: region.flag,
        ticker: region.ticker,
        price: q.price ?? q.last ?? q.close ?? null,
        changePercent: Math.round((changePercent + Number.EPSILON) * 100) / 100,
        sentiment,
        driver,
        retailStrength: clamp(Math.round(retail), 0, 100),
        hedgeFundStrength: clamp(Math.round(hedge), 0, 100),
        catalysts: regionCatalysts.map(ev => ({ date: ev.date, event: ev.event, importance: ev.importance })),
        headlines: regionHeadlines.map(n => ({ title: n.title, url: n.url, source: n.source })),
        outlook
      }
    })

    return NextResponse.json({ updatedAt: new Date().toISOString(), regions: result }, { headers: rateLimitHeaders(rl) })
  } catch (e) {
    return NextResponse.json({ error: 'Global drivers failed' }, { status: 200 })
  }
}
