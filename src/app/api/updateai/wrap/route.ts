export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 55

import { NextRequest, NextResponse } from 'next/server'
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

// ====== EconoPulse Brief Engine (rule-based, deterministic, no external LLM) ======
function pickQuote(quotes: IndexQuote[], symbol: string): IndexQuote | undefined {
  return quotes.find(q => q.symbol.toUpperCase() === symbol.toUpperCase())
}

function describeMove(pct: number | null | undefined): string {
  if (pct == null || !isFinite(pct)) return 'flat'
  const a = Math.abs(pct)
  const dir = pct > 0 ? 'up' : 'down'
  if (a < 0.15) return 'flat'
  if (a < 0.5) return `${dir} modestly`
  if (a < 1.2) return `${dir}`
  if (a < 2.5) return `${dir} sharply`
  return `${dir} strongly`
}

function buildBrief(quotes: IndexQuote[], movers: { top: any[]; bottom: any[] }, sectors: any[], news: any[]): string {
  const spx = pickQuote(quotes, 'SPY')
  const ndx = pickQuote(quotes, 'QQQ')
  const dji = pickQuote(quotes, 'DIA')
  const rty = pickQuote(quotes, 'IWM')
  const vix = pickQuote(quotes, '^VIX')
  const tlt = pickQuote(quotes, 'TLT')
  const dxy = pickQuote(quotes, 'DX-Y.NYB')
  const gold = pickQuote(quotes, 'GC=F')
  const oil = pickQuote(quotes, 'CL=F')
  const btc = pickQuote(quotes, 'BTC-USD')
  const eth = pickQuote(quotes, 'ETH-USD')
  const eur = pickQuote(quotes, 'EURUSD=X')

  const equityAvg = [spx, ndx, dji, rty]
    .map(q => q?.changePct)
    .filter((x): x is number => x != null && isFinite(x))
  const equityMean = equityAvg.length ? equityAvg.reduce((s, x) => s + x, 0) / equityAvg.length : null

  // === Section 1: Today at a Glance ===
  const idxBits: string[] = []
  if (spx?.changePct != null) idxBits.push(`S&P 500 ${describeMove(spx.changePct)} ${fmtPct(spx.changePct)}`)
  if (ndx?.changePct != null) idxBits.push(`Nasdaq 100 ${fmtPct(ndx.changePct)}`)
  if (dji?.changePct != null) idxBits.push(`Dow ${fmtPct(dji.changePct)}`)
  if (rty?.changePct != null) idxBits.push(`Russell 2000 ${fmtPct(rty.changePct)}`)

  const macroBits: string[] = []
  if (vix?.price != null) {
    const vixLevel = vix.price < 15 ? 'complacent' : vix.price < 20 ? 'calm' : vix.price < 25 ? 'elevated' : vix.price < 30 ? 'stressed' : 'panic'
    macroBits.push(`VIX at ${fmtPrice(vix.price)} (${vixLevel}, ${fmtPct(vix.changePct)})`)
  }
  if (dxy?.changePct != null) macroBits.push(`USD ${fmtPct(dxy.changePct)}`)
  if (tlt?.changePct != null) macroBits.push(`20Y Treasuries ${fmtPct(tlt.changePct)} (yields ${tlt.changePct > 0 ? 'lower' : 'higher'})`)
  if (gold?.changePct != null) macroBits.push(`Gold ${fmtPct(gold.changePct)} at ${fmtPrice(gold.price)}`)
  if (oil?.changePct != null) macroBits.push(`WTI Crude ${fmtPct(oil.changePct)}`)
  const cryptoBits: string[] = []
  if (btc?.changePct != null) cryptoBits.push(`BTC ${fmtPct(btc.changePct)} ($${fmtPrice(btc.price)})`)
  if (eth?.changePct != null) cryptoBits.push(`ETH ${fmtPct(eth.changePct)}`)
  if (eur?.changePct != null) cryptoBits.push(`EUR/USD ${fmtPct(eur.changePct)}`)

  const glance = [
    idxBits.length ? `**Equities:** ${idxBits.join(', ')}.` : '',
    macroBits.length ? `**Macro:** ${macroBits.join('; ')}.` : '',
    cryptoBits.length ? `**Crypto / FX:** ${cryptoBits.join(', ')}.` : '',
  ].filter(Boolean).join(' ')

  // === Section 2: Sector Rotation ===
  const sortedSec = [...sectors]
    .filter(s => s?.changePercent != null && isFinite(s.changePercent))
    .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))
  const leaders = sortedSec.slice(0, 3)
  const laggards = sortedSec.slice(-3).reverse()

  const cyclicalNames = new Set(['Technology', 'Consumer Discretionary', 'Communication', 'Financial', 'Industrials', 'Materials', 'Energy'])
  const defensiveNames = new Set(['Consumer Staples', 'Utilities', 'Healthcare', 'Real Estate'])
  const cyclicalAvg = sortedSec.filter(s => cyclicalNames.has(s.name || s.sector)).map(s => s.changePercent)
  const defensiveAvg = sortedSec.filter(s => defensiveNames.has(s.name || s.sector)).map(s => s.changePercent)
  const cycMean = cyclicalAvg.length ? cyclicalAvg.reduce((a: number, b: number) => a + b, 0) / cyclicalAvg.length : null
  const defMean = defensiveAvg.length ? defensiveAvg.reduce((a: number, b: number) => a + b, 0) / defensiveAvg.length : null

  let regime = 'mixed'
  if (cycMean != null && defMean != null) {
    const spread = cycMean - defMean
    if (spread > 0.4) regime = 'risk-on (cyclicals leading defensives)'
    else if (spread < -0.4) regime = 'risk-off (defensives bid, cyclicals under pressure)'
    else regime = 'neutral / consolidating'
  }
  const techLed = leaders.some(s => (s.name || s.sector) === 'Technology' || (s.name || s.sector) === 'Communication')
  const energyLed = leaders.some(s => (s.name || s.sector) === 'Energy')
  const stapleLed = leaders.some(s => (s.name || s.sector) === 'Consumer Staples' || (s.name || s.sector) === 'Utilities')

  const rotationBits: string[] = []
  if (leaders.length) rotationBits.push(`**Leaders:** ${leaders.map(s => `${s.name || s.sector} ${fmtPct(s.changePercent)}`).join(', ')}.`)
  if (laggards.length) rotationBits.push(`**Laggards:** ${laggards.map(s => `${s.name || s.sector} ${fmtPct(s.changePercent)}`).join(', ')}.`)
  rotationBits.push(`Tape reads **${regime}**.`)
  if (techLed) rotationBits.push('Growth/Tech leadership signals appetite for duration and AI-linked beta.')
  else if (energyLed) rotationBits.push('Energy strength implies a commodity / inflation tilt.')
  else if (stapleLed) rotationBits.push('Defensive bid points to late-cycle caution.')

  const rotation = rotationBits.join(' ')

  // === Section 3: What Moved Markets ===
  const moversBits: string[] = []
  if (movers.top?.length) {
    moversBits.push(`Best in S&P: ${movers.top.slice(0, 5).map((m: any) => `${m.symbol || m.ticker} ${fmtPct(m.changePercent)}`).join(', ')}.`)
  }
  if (movers.bottom?.length) {
    moversBits.push(`Worst: ${movers.bottom.slice(0, 5).map((m: any) => `${m.symbol || m.ticker} ${fmtPct(m.changePercent)}`).join(', ')}.`)
  }
  const headlineHits: string[] = []
  const headlines = (news || []).slice(0, 5).map((n: any) => String(n?.title || '')).filter(Boolean)
  for (const h of headlines.slice(0, 3)) {
    headlineHits.push(`• ${h}`)
  }
  const moved = [
    moversBits.join(' '),
    headlineHits.length ? `\n${headlineHits.join('\n')}` : '',
  ].filter(Boolean).join(' ')

  // === Section 4: Key Takeaways (rule-based) ===
  const takes: string[] = []
  // Tactical
  if (equityMean != null) {
    if (equityMean > 0.5) takes.push(`Tape is on offer — broad equity strength averaged ${fmtPct(equityMean)} across the four headline indices.`)
    else if (equityMean < -0.5) takes.push(`Risk-off bias — headline indices averaged ${fmtPct(equityMean)}; reduce gross exposure into weakness if VIX is rising.`)
    else takes.push(`Indices little changed (${fmtPct(equityMean)} avg) — leadership rotation matters more than index direction today.`)
  }
  // Risk
  if (vix?.price != null) {
    if (vix.price > 25) takes.push(`Risk to watch: **VIX at ${fmtPrice(vix.price)}** signals stressed positioning — expect outsized intraday swings; keep stops tight.`)
    else if (vix.price < 14) takes.push(`Risk to watch: **VIX compressed at ${fmtPrice(vix.price)}** — complacency can precede sharp re-pricings; consider cheap protection.`)
    else takes.push(`Risk to watch: **VIX ${fmtPrice(vix.price)}** is in the normal regime; keep volatility budget intact.`)
  } else {
    takes.push(`Risk to watch: monitor VIX, USD strength, and 10Y yield direction — those drive cross-asset correlations.`)
  }
  // Level / theme tomorrow
  const themeBits: string[] = []
  if (gold?.changePct != null && Math.abs(gold.changePct) > 1) themeBits.push(`gold momentum (${fmtPct(gold.changePct)})`)
  if (oil?.changePct != null && Math.abs(oil.changePct) > 1.5) themeBits.push(`crude trajectory (${fmtPct(oil.changePct)})`)
  if (btc?.changePct != null && Math.abs(btc.changePct) > 2) themeBits.push(`BTC follow-through (${fmtPct(btc.changePct)})`)
  if (dxy?.changePct != null && Math.abs(dxy.changePct) > 0.4) themeBits.push(`USD ${dxy.changePct > 0 ? 'breakout' : 'breakdown'}`)
  if (tlt?.changePct != null && Math.abs(tlt.changePct) > 0.7) themeBits.push(`long-end yield ${tlt.changePct > 0 ? 'compression' : 'expansion'}`)
  if (themeBits.length) takes.push(`Watch tomorrow: ${themeBits.join(', ')} — these are the cross-asset drivers in play.`)
  else takes.push(`Watch tomorrow: sector breadth and any follow-through in today's leaders/laggards before adding risk.`)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return [
    `## 📊 Today at a Glance`,
    glance || '_Live indices unavailable._',
    ``,
    `## 🔄 Sector Rotation`,
    rotation,
    ``,
    `## 📰 What Moved Markets`,
    moved || '_No standout movers or headlines._',
    ``,
    `## 🎯 Key Takeaways`,
    ...takes.map(t => `- ${t}`),
    ``,
    `_${today} · EconoPulse market wrap_`,
  ].join('\n')
}

async function generateBrief(quotes: IndexQuote[], movers: { top: any[]; bottom: any[] }, sectors: any[], news: any[]): Promise<{ brief: string; provider: string }> {
  // Deterministic, in-house brief — no external LLM dependency.
  return { brief: buildBrief(quotes, movers, sectors, news), provider: 'econopulse-engine' }
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
