import { NextResponse } from 'next/server'
import { fetchYahooMarket, getYahooSummary, mapQuote } from '@/lib/yahoo-unified'
import { validateAsset, summarizeIssues } from '@/lib/data-validation'
import { getYahooQuotes } from '@/lib/yahooFinance'

export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || 'all'
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? parseInt(limitParam,10) : undefined
  const symbolsParam = searchParams.get('symbols') // comma separated list overrides category
  try {
    if (symbolsParam) {
      const symbols = symbolsParam.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean)
      const quotes = await getYahooQuotes(symbols)
      const raw = quotes.map(q=>mapQuote(q,'Custom'))
      const validated = raw.map(a=>validateAsset(a))
      const issues = validated.flatMap(v=>v.issues)
      return NextResponse.json({ ok:true, source:'yahoo', mode:'symbols', count:validated.length, issues: summarizeIssues(issues), data: validated.map(v=>v.asset) }, { status:200 })
    } else {
      const raw = await fetchYahooMarket(category, limit)
      const validated = raw.map(a=>validateAsset(a))
      const issues = validated.flatMap(v=>v.issues)
      const summary = category === 'all' ? await getYahooSummary() : undefined
      return NextResponse.json({ ok: true, source: 'yahoo', category, count: validated.length, issues: summarizeIssues(issues), summary, data: validated.map(v=>v.asset) }, { status: 200 })
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
