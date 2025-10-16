import { NextRequest, NextResponse } from 'next/server'

// Tiny helper: fetch with timeout and safe JSON parse
async function fetchWithTimeout(url: string, ms = 3000) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'EconoPulse/1.0 (+news)' } })
    clearTimeout(t)
    return res.ok ? res : null
  } catch {
    return null
  }
}

type NewsItem = {
  title: string
  url: string
  source: string
  publishedAt: string
  summary?: string
  tickers?: string[]
}

export const revalidate = 0

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.max(1, Math.min(20, Number(searchParams.get('limit') || '8')))

  // Attempt a single lightweight public feed (optional)
  // We purposely avoid heavy/paid APIs. If it fails, we return curated fallback.
  const items: NewsItem[] = []

  try {
    // Example: Yahoo Finance RSS (unofficial). Keep this optional and best-effort.
    const rss = await fetchWithTimeout('https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US', 2500)
    if (rss) {
      const text = await rss.text()
      // Very naive RSS parse for titles/links; no external libs to keep it lightweight.
      const entryRegex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<\/item>/g
      let m: RegExpExecArray | null
      while ((m = entryRegex.exec(text)) && items.length < limit) {
        const [_, titleRaw, linkRaw, dateRaw] = m
        const title = titleRaw?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || 'Market update'
        const url = linkRaw?.trim() || 'https://finance.yahoo.com/'
        const publishedAt = new Date(dateRaw || Date.now()).toISOString()
        items.push({ title, url, source: 'Yahoo Finance', publishedAt })
      }
    }
  } catch {
    // ignore
  }

  // If empty or underfilled, top up with curated fallback headlines
  while (items.length < limit) {
    const now = new Date().toISOString()
    items.push(
      { title: 'FOMC policy path and inflation trajectory in focus', url: 'https://www.federalreserve.gov/monetarypolicy.htm', source: 'FOMC', publishedAt: now },
      { title: 'Equities mixed as yields stabilize; energy and tech diverge', url: 'https://www.bloomberg.com/markets', source: 'Bloomberg (summary)', publishedAt: now },
      { title: 'Global PMIs signal uneven growth; services resilient', url: 'https://www.spglobal.com/marketintelligence/en/news-insights/latest-news-headlines', source: 'S&P Global (summary)', publishedAt: now },
      { title: 'Oil consolidates amid supply risks; gold steady on risk hedges', url: 'https://www.reuters.com/markets/commodities/', source: 'Reuters (summary)', publishedAt: now }
    )
    if (items.length > limit) break
  }

  // Ensure limit
  const data = items.slice(0, limit)

  return NextResponse.json({ ok: true, count: data.length, data })
}
