import { NextResponse } from 'next/server'
import { getTiingoMarketData } from '@/lib/tiingo'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

type Group = 'G7' | 'Developed' | 'Emerging'
type Country = { code: string; name: string; proxy: string; group: Group }

// Coverage via common US-listed MSCI country ETFs (iShares/others) for broad availability
const COUNTRIES: Country[] = [
  // G7
  { code: 'USA', name: 'United States', proxy: 'SPY', group: 'G7' },
  { code: 'CAN', name: 'Canada', proxy: 'EWC', group: 'G7' },
  { code: 'GBR', name: 'United Kingdom', proxy: 'EWU', group: 'G7' },
  { code: 'DEU', name: 'Germany', proxy: 'EWG', group: 'G7' },
  { code: 'FRA', name: 'France', proxy: 'EWQ', group: 'G7' },
  { code: 'ITA', name: 'Italy', proxy: 'EWI', group: 'G7' },
  { code: 'JPN', name: 'Japan', proxy: 'EWJ', group: 'G7' },
  // Developed (ex-G7)
  { code: 'AUS', name: 'Australia', proxy: 'EWA', group: 'Developed' },
  { code: 'NZL', name: 'New Zealand', proxy: 'ENZL', group: 'Developed' },
  { code: 'SWE', name: 'Sweden', proxy: 'EWD', group: 'Developed' },
  { code: 'NOR', name: 'Norway', proxy: 'ENOR', group: 'Developed' },
  { code: 'DNK', name: 'Denmark', proxy: 'EDEN', group: 'Developed' },
  { code: 'NLD', name: 'Netherlands', proxy: 'EWN', group: 'Developed' },
  { code: 'CHE', name: 'Switzerland', proxy: 'EWL', group: 'Developed' },
  { code: 'ESP', name: 'Spain', proxy: 'EWP', group: 'Developed' },
  { code: 'PRT', name: 'Portugal', proxy: 'PGAL', group: 'Developed' },
  { code: 'IRL', name: 'Ireland', proxy: 'EIRL', group: 'Developed' },
  { code: 'AUT', name: 'Austria', proxy: 'EWO', group: 'Developed' },
  { code: 'BEL', name: 'Belgium', proxy: 'EWK', group: 'Developed' },
  { code: 'FIN', name: 'Finland', proxy: 'EFNL', group: 'Developed' },
  { code: 'ISR', name: 'Israel', proxy: 'EIS', group: 'Developed' },
  { code: 'SGP', name: 'Singapore', proxy: 'EWS', group: 'Developed' },
  { code: 'KOR', name: 'South Korea', proxy: 'EWY', group: 'Developed' },
  { code: 'HKG', name: 'Hong Kong', proxy: 'EWH', group: 'Developed' },
  { code: 'TWN', name: 'Taiwan', proxy: 'EWT', group: 'Developed' },
  // Emerging
  { code: 'CHN', name: 'China', proxy: 'MCHI', group: 'Emerging' },
  { code: 'IND', name: 'India', proxy: 'INDA', group: 'Emerging' },
  { code: 'BRA', name: 'Brazil', proxy: 'EWZ', group: 'Emerging' },
  { code: 'MEX', name: 'Mexico', proxy: 'EWW', group: 'Emerging' },
  { code: 'ZAF', name: 'South Africa', proxy: 'EZA', group: 'Emerging' },
  { code: 'POL', name: 'Poland', proxy: 'EPOL', group: 'Emerging' },
  { code: 'MYS', name: 'Malaysia', proxy: 'EWM', group: 'Emerging' },
  { code: 'THA', name: 'Thailand', proxy: 'THD', group: 'Emerging' },
  { code: 'PHL', name: 'Philippines', proxy: 'EPHE', group: 'Emerging' },
  { code: 'IDN', name: 'Indonesia', proxy: 'EIDO', group: 'Emerging' },
  { code: 'TUR', name: 'Turkey', proxy: 'TUR', group: 'Emerging' },
  { code: 'CHL', name: 'Chile', proxy: 'ECH', group: 'Emerging' },
  { code: 'COL', name: 'Colombia', proxy: 'ICOL', group: 'Emerging' },
  { code: 'PER', name: 'Peru', proxy: 'EPU', group: 'Emerging' },
  { code: 'QAT', name: 'Qatar', proxy: 'QAT', group: 'Emerging' },
  { code: 'ARE', name: 'United Arab Emirates', proxy: 'UAE', group: 'Emerging' },
  { code: 'SAU', name: 'Saudi Arabia', proxy: 'KSA', group: 'Emerging' },
  { code: 'EGY', name: 'Egypt', proxy: 'EGPT', group: 'Emerging' },
  { code: 'ARG', name: 'Argentina', proxy: 'ARGT', group: 'Emerging' },
]

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)) }

function labelFromChange(changePct: number): 'Bullish'|'Bearish'|'Neutral' {
  if (changePct > 0.3) return 'Bullish'
  if (changePct < -0.3) return 'Bearish'
  return 'Neutral'
}

function driverFromContext(symbol: string, changePct: number): string {
  // Simple heuristics; can be refined per region later
  if (['SPY','EWG','EWU','EWQ','EWI','EWJ'].includes(symbol)) return Math.abs(changePct) > 1 ? 'Risk Sentiment' : 'Monetary Policy'
  if (['EWA','ENZL','EWT','EWY','EWS','EWL','EWN','EWD','ENOR','EDEN'].includes(symbol)) return 'Macro Growth'
  if (['EWZ','EWW','EZA','EIDO','THD','EPHE','TUR','ECH','ICOL','EPU','QAT','UAE','KSA','EGPT','ARGT'].includes(symbol)) return 'EM Flows / FX'
  if (['MCHI','INDA'].includes(symbol)) return 'Earnings / Growth'
  return 'Macro Growth'
}

export async function GET(req: Request) {
  // Rate limit per IP
  const ip = getClientIp(req)
  const rl = rateLimit(`world-drivers:${ip}`, 30, 60_000)
  if (!rl.ok) {
    return new NextResponse('Too Many Requests', { status: 429, headers: rateLimitHeaders(rl) })
  }

  try {
    const quotes = await getTiingoMarketData(COUNTRIES.map(c=>c.proxy))
    const bySym: Record<string, any> = {}
    for (const q of quotes) bySym[q.symbol] = 'data' in q ? (q as any).data : q

    const now = new Date().toISOString()
    const countries = COUNTRIES.map(c => {
      const d = bySym[c.proxy] || {}
      const changePercent = typeof d.changePercent === 'number' ? d.changePercent : 0
      const price = d.price ?? d.last ?? d.close ?? null
      const sentiment = labelFromChange(changePercent)
      const sentimentScore = clamp(Math.round(50 + changePercent * 8))
      const retailStrength = clamp(Math.round(50 + changePercent * 10))
      const hedgeFundFlow = clamp(Math.round(55 - Math.sign(changePercent) * Math.min(Math.abs(changePercent) * 6, 12)))
      const driver = driverFromContext(c.proxy, changePercent)
      const outlook = (
        sentiment === 'Bullish' ? 'Constructive near-term skew; dips likely bought.' :
        sentiment === 'Bearish' ? 'Defensive tone; rallies vulnerable.' :
        'Range-bound; catalysts needed.'
      )
      return {
        code: c.code,
        name: c.name,
        group: c.group,
        proxy: c.proxy,
        price,
        changePercent: Math.round((changePercent + Number.EPSILON) * 100) / 100,
        sentiment,
        sentimentScore,
        retailStrength,
        hedgeFundFlow,
        driver,
        outlook,
        updatedAt: now
      }
    })

    return NextResponse.json({ updatedAt: now, countries }, { headers: rateLimitHeaders(rl) })
  } catch (e) {
    const now = new Date().toISOString()
    // Fallback neutral set
    return NextResponse.json({ updatedAt: now, countries: COUNTRIES.map(c=> ({ code:c.code, name:c.name, group:c.group, proxy:c.proxy, price: null, changePercent: 0, sentiment: 'Neutral', sentimentScore: 50, retailStrength: 50, hedgeFundFlow: 55, driver: 'Macro Growth', outlook: 'Awaiting catalysts' })) }, { headers: rateLimitHeaders(rl) })
  }
}
