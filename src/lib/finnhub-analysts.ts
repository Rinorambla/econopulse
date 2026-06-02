// Real analyst data from Finnhub (recommendation trends + price targets).
// Free tier supports /stock/recommendation reliably; /stock/price-target may be
// premium and is treated as best-effort. Results are cached in-memory with a TTL
// so we stay well within Finnhub's rate limits across requests.

import { env } from '@/lib/env'

export type FinnhubRec = {
  action: 'Buy' | 'Hold' | 'Sell'
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
  period: string
}

export type FinnhubTarget = {
  targetMean: number | null
  targetHigh: number | null
  targetLow: number | null
  lastUpdated: string | null
}

type CacheEntry<T> = { value: T; expires: number }

const REC_TTL = 1000 * 60 * 60 * 6 // 6h
const TGT_TTL = 1000 * 60 * 60 * 12 // 12h
const recCache = new Map<string, CacheEntry<FinnhubRec | null>>()
const tgtCache = new Map<string, CacheEntry<FinnhubTarget | null>>()

const BASE = 'https://finnhub.io/api/v1'

function fresh<T>(m: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const e = m.get(key)
  if (e && e.expires > Date.now()) return e.value
  return undefined
}

async function fetchJson(url: string, ms = 6000): Promise<any | null> {
  try {
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(ms) })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

// Run async tasks with a small concurrency cap to respect rate limits.
async function pool<T>(items: string[], limit: number, fn: (s: string) => Promise<T>): Promise<void> {
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      await fn(items[idx])
    }
  })
  await Promise.all(workers)
}

function recFromTrend(t: any): FinnhubRec | null {
  if (!t) return null
  const strongBuy = Number(t.strongBuy) || 0
  const buy = Number(t.buy) || 0
  const hold = Number(t.hold) || 0
  const sell = Number(t.sell) || 0
  const strongSell = Number(t.strongSell) || 0
  const total = strongBuy + buy + hold + sell + strongSell
  if (total === 0) return null
  const bullish = strongBuy + buy
  const bearish = sell + strongSell
  let action: 'Buy' | 'Hold' | 'Sell' = 'Hold'
  if (bullish > hold && bullish >= bearish) action = 'Buy'
  else if (bearish > hold && bearish > bullish) action = 'Sell'
  return { action, strongBuy, buy, hold, sell, strongSell, period: String(t.period || '') }
}

/**
 * Fetch latest recommendation trend per ticker. Best-effort, cached, capped.
 * @param maxNew limit how many *uncached* tickers we fetch this call.
 */
export async function getRecommendations(tickers: string[], maxNew = 40): Promise<Map<string, FinnhubRec>> {
  const out = new Map<string, FinnhubRec>()
  const key = env.FINNHUB_API_KEY
  const need: string[] = []
  for (const t of tickers) {
    const cached = fresh(recCache, t)
    if (cached !== undefined) {
      if (cached) out.set(t, cached)
    } else {
      need.push(t)
    }
  }
  if (!key || need.length === 0) return out
  const batch = need.slice(0, maxNew)
  await pool(batch, 5, async (sym) => {
    const data = await fetchJson(`${BASE}/stock/recommendation?symbol=${encodeURIComponent(sym)}&token=${key}`)
    const latest = Array.isArray(data) && data.length ? data[0] : null
    const rec = recFromTrend(latest)
    recCache.set(sym, { value: rec, expires: Date.now() + REC_TTL })
    if (rec) out.set(sym, rec)
  })
  return out
}

/**
 * Fetch analyst price targets per ticker. Best-effort (may be premium), cached, capped.
 */
export async function getPriceTargets(tickers: string[], maxNew = 40): Promise<Map<string, FinnhubTarget>> {
  const out = new Map<string, FinnhubTarget>()
  const key = env.FINNHUB_API_KEY
  const need: string[] = []
  for (const t of tickers) {
    const cached = fresh(tgtCache, t)
    if (cached !== undefined) {
      if (cached) out.set(t, cached)
    } else {
      need.push(t)
    }
  }
  if (!key || need.length === 0) return out
  const batch = need.slice(0, maxNew)
  await pool(batch, 5, async (sym) => {
    const data = await fetchJson(`${BASE}/stock/price-target?symbol=${encodeURIComponent(sym)}&token=${key}`)
    const mean = Number(data?.targetMean)
    const tgt: FinnhubTarget | null = (data && mean > 0)
      ? {
          targetMean: mean,
          targetHigh: Number(data.targetHigh) || null,
          targetLow: Number(data.targetLow) || null,
          lastUpdated: data.lastUpdated || null,
        }
      : null
    tgtCache.set(sym, { value: tgt, expires: Date.now() + TGT_TTL })
    if (tgt) out.set(sym, tgt)
  })
  return out
}
