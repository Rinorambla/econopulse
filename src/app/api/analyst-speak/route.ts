import { NextRequest, NextResponse } from 'next/server'
import { getTiingoNews } from '@/lib/tiingo'

export const revalidate = 0

function detectSentiment(text: string) {
  const t = text.toLowerCase()
  const bull = /(upgrade|overweight|outperform|buy|raise|hike|positive|bullish|overweight|accumulate)/
  const bear = /(downgrade|underweight|underperform|sell|reduce|cut|negative|bearish|underweight|avoid)/
  if (bull.test(t) && !bear.test(t)) return 'bullish'
  if (bear.test(t) && !bull.test(t)) return 'bearish'
  return 'neutral'
}

function extractAction(text: string) {
  const t = text.toLowerCase()
  if (/initiates?|initiation/.test(t)) return 'initiation'
  if (/upgrade|upgrades|upgraded/.test(t)) return 'upgrade'
  if (/downgrade|downgrades|downgraded/.test(t)) return 'downgrade'
  if (/reiterate|reiterates/.test(t)) return 'reiterate'
  return undefined
}

function extractPriceTarget(text: string) {
  const m = text.match(/price target (?:to|at|of)\s*\$?([0-9]+(?:\.[0-9]{1,2})?)/i)
  return m ? Number(m[1]) : undefined
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbolsParam = searchParams.get('symbols') || ''
    const limit = Math.min(40, Math.max(5, Number(searchParams.get('limit')) || 20))
    const symbols = symbolsParam
      ? symbolsParam.split(',').map(s=>s.trim()).filter(Boolean).slice(0, 10)
      : []

    // Fetch broader set then filter for analyst-related content
    const raw = await getTiingoNews(symbols, Math.max(limit, 60))
    const now = Date.now()
    const keywords = /(analyst|analysts|strategist|strategy|price target|upgrade|downgrade|initiat|outperform|underperform|overweight|underweight|rating|maintains|reiterate|estimate|outlook|commentary)/i
    const items = (raw || [])
      .filter((n: any) => {
        const text = `${n.title || ''} ${n.description || ''}`
        if (!keywords.test(text)) return false
        // optional: limit to last 14 days
        const ts = n.publishedDate ? Date.parse(n.publishedDate) : now
        return (now - ts) <= 14 * 24 * 3600 * 1000
      })
      .map((n: any) => {
        const text = `${n.title || ''} ${n.description || ''}`
        return {
          title: n.title,
          source: n.source,
          url: n.url,
          publishedDate: n.publishedDate,
          tickers: n.tickers || [],
          tags: n.tags || [],
          snippet: n.description,
          sentiment: detectSentiment(text),
          action: extractAction(text),
          priceTarget: extractPriceTarget(text)
        }
      })
      .sort((a: any, b: any) => Date.parse(b.publishedDate) - Date.parse(a.publishedDate))
      .slice(0, limit)

    return NextResponse.json({ ok: true, count: items.length, data: items })
  } catch (e: any) {
    console.error('analyst-speak error', e)
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 })
  }
}
