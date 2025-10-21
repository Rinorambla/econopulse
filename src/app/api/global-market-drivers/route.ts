import { NextResponse } from 'next/server'
import { getTiingoMarketData } from '@/lib/tiingo'

type DriverCategory = 'Monetary Policy' | 'Earnings' | 'Macro Growth' | 'Inflation' | 'Energy' | 'Geopolitics' | 'Liquidity' | 'Risk Sentiment'

interface CountryDrivers {
  code: string // ISO3
  name: string
  driverCategory: DriverCategory
  sentiment: 'Bullish' | 'Bearish' | 'Neutral'
  sentimentScore: number // 0-100
  retailStrength: number // 0-100
  hedgeFundFlow: number // 0-100
  headlines: Array<{ title: string; reason: 'Up' | 'Down' | 'Mixed'; source?: string }>
  outlook: string
  rationale: string
  lastUpdated: string
}

// Representative ETFs for regions (Tiingo IEX supports many of these tickers)
const REGION_TICKERS: Record<string, { name: string; iso3: string; proxy: string }> = {
  USA: { name: 'United States', iso3: 'USA', proxy: 'SPY' },
  CHN: { name: 'China', iso3: 'CHN', proxy: 'MCHI' },
  JPN: { name: 'Japan', iso3: 'JPN', proxy: 'EWJ' },
  AUS: { name: 'Australia', iso3: 'AUS', proxy: 'EWA' },
  DEU: { name: 'Germany', iso3: 'DEU', proxy: 'EWG' },
  GBR: { name: 'United Kingdom', iso3: 'GBR', proxy: 'EWU' },
  IND: { name: 'India', iso3: 'IND', proxy: 'INDA' },
  BRA: { name: 'Brazil', iso3: 'BRA', proxy: 'EWZ' },
  CAN: { name: 'Canada', iso3: 'CAN', proxy: 'EWC' }
}

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)) }

function deriveCategory(symbol: string, changePct: number): DriverCategory {
  // Heuristics per region, then adjust by direction
  if (symbol === 'SPY') return Math.abs(changePct) > 1.2 ? 'Risk Sentiment' : 'Monetary Policy'
  if (symbol === 'MCHI') return 'Macro Growth'
  if (symbol === 'EWJ') return 'Inflation'
  if (symbol === 'EWA') return 'Energy'
  if (symbol === 'EWG' || symbol === 'EWU') return 'Macro Growth'
  if (symbol === 'INDA') return 'Earnings'
  if (symbol === 'EWZ') return 'Energy'
  if (symbol === 'EWC') return 'Energy'
  return 'Macro Growth'
}

function labelFromScore(s: number): 'Bullish' | 'Bearish' | 'Neutral' {
  if (s >= 60) return 'Bullish'
  if (s <= 40) return 'Bearish'
  return 'Neutral'
}

export async function GET() {
  try {
    const symbols = Object.values(REGION_TICKERS).map(r => r.proxy)
    const quotes = await getTiingoMarketData(symbols).catch(() => [])

    const bySymbol: Record<string, any> = {}
    for (const q of quotes) {
      const s = q.symbol
      const d: any = 'data' in q ? (q as any).data : q
      bySymbol[s] = d
    }

    const now = new Date().toISOString()

    const countries: CountryDrivers[] = Object.values(REGION_TICKERS).map(region => {
      const d = bySymbol[region.proxy]
      const changePercent = typeof d?.changePercent === 'number' ? d.changePercent : 0
      // Sentiment score from daily change (bounded)
      const score = clamp(Math.round(50 + changePercent * 8), 0, 100)
      const sentiment = labelFromScore(score)
      // Simple flow proxies: retail reacts to momentum, hedge funds to mean reversion/liquidity
      const retailStrength = clamp(Math.round(50 + changePercent * 10), 0, 100)
      const hedgeFundFlow = clamp(Math.round(55 - Math.sign(changePercent) * Math.min(Math.abs(changePercent) * 6, 12)), 0, 100)
      const driverCategory = deriveCategory(region.proxy, changePercent)

      const rationale = (
        driverCategory === 'Monetary Policy' ? 'Policy path and rate expectations are the primary risk-on/off lever.' :
        driverCategory === 'Macro Growth' ? 'Growth momentum and PMIs drive earnings multiples and flows.' :
        driverCategory === 'Inflation' ? 'Inflation trends shape real yields and discount rates.' :
        driverCategory === 'Energy' ? 'Commodity prices and terms of trade affect margins and FX.' :
        driverCategory === 'Geopolitics' ? 'Policy uncertainty and supply chain risks steer risk premia.' :
        driverCategory === 'Liquidity' ? 'Dollar liquidity and financial conditions guide cross-asset beta.' :
        'Positioning/volatility regime dominates near-term direction.'
      )

      const outlook = (
        sentiment === 'Bullish' ? 'Constructive near-term skew; dips likely to be bought if macro holds.' :
        sentiment === 'Bearish' ? 'Defensive skew; rallies may fade until macro improves.' :
        'Range-bound; catalysts needed to resolve direction.'
      )

      const headlines = [
        { title: `${region.name}: ${driverCategory} in focus`, reason: sentiment === 'Bullish' ? 'Up' : sentiment === 'Bearish' ? 'Down' : 'Mixed' as const }
      ]

      return {
        code: region.iso3,
        name: region.name,
        driverCategory,
        sentiment,
        sentimentScore: score,
        retailStrength,
        hedgeFundFlow,
        headlines,
        outlook,
        rationale,
        lastUpdated: now
      }
    })

    return NextResponse.json({
      countries,
      meta: { source: quotes.length ? 'Tiingo IEX + heuristic' : 'Heuristic fallback', updated: now }
    }, { status: 200 })
  } catch (e) {
    const now = new Date().toISOString()
    const fallback: CountryDrivers[] = Object.values(REGION_TICKERS).map(r => ({
      code: r.iso3,
      name: r.name,
      driverCategory: 'Macro Growth',
      sentiment: 'Neutral',
      sentimentScore: 50,
      retailStrength: 50,
      hedgeFundFlow: 55,
      headlines: [{ title: `${r.name}: Macro growth in focus`, reason: 'Mixed' }],
      outlook: 'Range-bound; awaiting catalysts.',
      rationale: 'Fallback view when live data is unavailable.',
      lastUpdated: now
    }))
    return NextResponse.json({ countries: fallback, meta: { source: 'Fallback', updated: now } }, { status: 200 })
  }
}
