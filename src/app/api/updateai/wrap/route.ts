export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 55

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getYahooQuotes } from '@/lib/yahooFinance'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

type IndexQuote = { symbol: string; name: string; price: number | null; changePct: number | null }

const INDEX_MAP: Array<{ symbol: string; name: string }> = [
  { symbol: 'SPY', name: 'S&P 500' },
  { symbol: 'QQQ', name: 'Nasdaq 100' },
  { symbol: 'DIA', name: 'Dow Jones' },
  { symbol: 'IWM', name: 'Russell 2000' },
  { symbol: '^VIX', name: 'VIX' },
  { symbol: 'TLT', name: '20Y Treasury' },
  { symbol: 'DX-Y.NYB', name: 'US Dollar' },
  { symbol: 'GC=F', name: 'Gold' },
  { symbol: 'CL=F', name: 'WTI Crude' },
  { symbol: 'BTC-USD', name: 'Bitcoin' },
  { symbol: 'ETH-USD', name: 'Ethereum' },
  { symbol: 'EURUSD=X', name: 'EUR/USD' },
]

function getAIClient(): { client: OpenAI; model: string; provider: string } | null {
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      provider: 'openai',
    }
  }
  if (process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' }),
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
    }
  }
  return null
}

async function fetchQuotes(): Promise<IndexQuote[]> {
  try {
    const symbols = INDEX_MAP.map(x => x.symbol)
    const quotes = await getYahooQuotes(symbols)
    const byKey: Record<string, any> = {}
    for (const q of quotes || []) {
      const key = String((q as any).ticker || (q as any).symbol || '').toUpperCase()
      if (key) byKey[key] = q
    }
    return INDEX_MAP.map(({ symbol, name }) => {
      const q = byKey[symbol.toUpperCase()]
      const price = q?.price ?? q?.regularMarketPrice ?? null
      const changePct = q?.changePercent ?? q?.regularMarketChangePercent ?? null
      return {
        symbol,
        name,
        price: price != null && isFinite(Number(price)) && Number(price) !== 0 ? Number(price) : null,
        changePct: changePct != null && isFinite(Number(changePct)) ? Number(changePct) : null,
      }
    })
  } catch (e) {
    console.warn('[updateai] fetchQuotes failed:', (e as any)?.message)
    return INDEX_MAP.map(({ symbol, name }) => ({ symbol, name, price: null, changePct: null }))
  }
}

async function fetchTopMovers(origin: string): Promise<{ top: any[]; bottom: any[] }> {
  try {
    const r = await fetch(`${origin}/api/top-movers?period=daily`, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!r.ok) return { top: [], bottom: [] }
    const j = await r.json()
    const norm = (arr: any[]) => (arr || []).slice(0, 5).map((m: any) => ({
      symbol: m.symbol || m.ticker,
      ticker: m.ticker || m.symbol,
      name: m.name,
      changePercent: m.changePercent ?? m.performance ?? m.dailyChange ?? null,
    }))
    return { top: norm(j?.top), bottom: norm(j?.bottom) }
  } catch { return { top: [], bottom: [] } }
}

async function fetchSectorPerf(origin: string): Promise<any[]> {
  try {
    const r = await fetch(`${origin}/api/sector-performance`, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!r.ok) return []
    const j = await r.json()
    const raw = j?.sectors || j?.data || []
    return raw.slice(0, 11).map((s: any) => ({
      name: s.name || s.sector || s.symbol,
      sector: s.sector || s.name,
      symbol: s.symbol,
      changePercent: s.changePercent ?? s.daily ?? s.performance ?? null,
    }))
  } catch { return [] }
}

async function fetchNews(origin: string): Promise<any[]> {
  try {
    const r = await fetch(`${origin}/api/news`, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!r.ok) return []
    const j = await r.json()
    return (j?.data || []).slice(0, 8)
  } catch { return [] }
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  if (n >= 1000) return n.toFixed(0)
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(4)
}

async function generateBrief(quotes: IndexQuote[], movers: { top: any[]; bottom: any[] }, sectors: any[], news: any[]): Promise<{ brief: string; provider: string | null }> {
  const ai = getAIClient()
  if (!ai) return { brief: '', provider: null }

  const indexLines = quotes.map(q => `- ${q.name} (${q.symbol}): ${fmtPrice(q.price)} (${fmtPct(q.changePct)})`).join('\n')
  const topLines = movers.top.map((m: any) => `${m.symbol || m.ticker} ${fmtPct(m.changePercent ?? m.performance)}`).join(', ') || '—'
  const bottomLines = movers.bottom.map((m: any) => `${m.symbol || m.ticker} ${fmtPct(m.changePercent ?? m.performance)}`).join(', ') || '—'
  const sectorLines = sectors.slice(0, 11).map((s: any) => `${s.name || s.sector || s.symbol}: ${fmtPct(s.changePercent ?? s.performance)}`).join(', ') || '—'
  const newsLines = news.slice(0, 6).map((n: any, i: number) => `${i + 1}. ${n.title}`).join('\n') || '—'

  const userMessage = `You are writing today's market wrap for EconoPulse. Use ONLY the data below. Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

INDICES & MACRO:
${indexLines}

SECTORS: ${sectorLines}

TOP GAINERS (S&P 500): ${topLines}
TOP LOSERS (S&P 500): ${bottomLines}

HEADLINES:
${newsLines}

Write a concise, professional market wrap with these EXACT sections (use markdown headings):

## 📊 Today at a Glance
2–3 sentences covering equity indices, VIX, dollar, yields, gold, oil, crypto. Cite the actual numbers.

## 🔄 Sector Rotation
What's leading and lagging today; what does it imply (risk-on / risk-off / late cycle / defensive).

## 📰 What Moved Markets
Tie the headlines to the price action above. Be concrete.

## 🎯 Key Takeaways
3 bullet points: (1) a tactical observation, (2) a risk to watch, (3) a level or theme to watch tomorrow.

Constraints:
- Total ≤ 350 words.
- No disclaimers, no greetings, no "as an AI".
- Be specific, data-driven, professional. No hype.`

  try {
    const completion = await Promise.race([
      ai.client.chat.completions.create({
        model: ai.model,
        messages: [
          { role: 'system', content: 'You are a senior market strategist writing daily market wraps for institutional investors. Concise, data-driven, no fluff.' },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 800,
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('ai_timeout')), 30000)),
    ])
    const text = (completion as any)?.choices?.[0]?.message?.content || ''
    return { brief: text, provider: ai.provider }
  } catch (e) {
    console.warn('[updateai] AI brief failed:', (e as any)?.message)
    return { brief: '', provider: ai.provider }
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request)
  const rl = rateLimit(`updateai-wrap:${ip}`, 20, 60_000)
  if (!rl.ok) {
    return new NextResponse(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { 'Content-Type': 'application/json', ...rateLimitHeaders(rl) } })
  }
  const url = new URL(req.url)
  const origin = `${url.protocol}//${url.host}`

  const [quotes, movers, sectors, news] = await Promise.all([
    fetchQuotes(),
    fetchTopMovers(origin),
    fetchSectorPerf(origin),
    fetchNews(origin),
  ])

  const { brief, provider } = await generateBrief(quotes, movers, sectors, news)

  return NextResponse.json({
    ok: true,
    asOf: new Date().toISOString(),
    provider: provider || 'none',
    quotes,
    sectors,
    movers,
    news,
    brief,
  }, { headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(rl) } })
}
