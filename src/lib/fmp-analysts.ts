// Real analyst CONSENSUS from Financial Modeling Prep (FMP).
// The available plan exposes:
//   • /stable/grades-consensus?symbol=X  → real Buy/Hold/Sell analyst counts
//   • /stable/grades?symbol=X            → real recent rating actions (firm+date)
// Individual analyst names + price targets are premium on FMP, so we use the
// consensus feed to make the Buy/Hold/Sell calls and "last rating" dates REAL.
// Results are cached in-memory with a TTL to respect FMP rate limits.

import { env } from '@/lib/env'

const BASE = 'https://financialmodelingprep.com'
const TTL = 1000 * 60 * 60 * 6 // 6h

export type FmpConsensus = {
  action: 'Buy' | 'Hold' | 'Sell'
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
  lastActionDate: string // most recent real rating action date (ISO yyyy-mm-dd)
}

type CacheEntry = { value: FmpConsensus | null; expires: number }
const cache = new Map<string, CacheEntry>()

function fresh(key: string): FmpConsensus | null | undefined {
  const e = cache.get(key)
  if (e && e.expires > Date.now()) return e.value
  return undefined
}

async function fetchJson(url: string, ms = 7000): Promise<any | null> {
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

function actionFromCounts(c: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }): 'Buy' | 'Hold' | 'Sell' {
  const bullish = c.strongBuy + c.buy
  const bearish = c.sell + c.strongSell
  if (bullish > c.hold && bullish >= bearish) return 'Buy'
  if (bearish > c.hold && bearish > bullish) return 'Sell'
  return 'Hold'
}

/**
 * Fetch real Buy/Hold/Sell consensus + most-recent rating date per ticker.
 * Best-effort, cached, capped. Returns a Map keyed by ticker.
 */
export async function getFmpConsensus(tickers: string[], maxNew = 30): Promise<Map<string, FmpConsensus>> {
  const out = new Map<string, FmpConsensus>()
  const key = env.FMP_API_KEY
  const need: string[] = []
  for (const t of tickers) {
    const c = fresh(t)
    if (c !== undefined) {
      if (c) out.set(t, c)
    } else {
      need.push(t)
    }
  }
  if (!key || need.length === 0) return out

  const batch = need.slice(0, maxNew)
  await pool(batch, 5, async (sym) => {
    // Consensus counts (tiny payload).
    const cons = await fetchJson(`${BASE}/stable/grades-consensus?symbol=${encodeURIComponent(sym)}&apikey=${key}`)
    const row = Array.isArray(cons) && cons.length ? cons[0] : null
    if (!row) {
      cache.set(sym, { value: null, expires: Date.now() + TTL })
      return
    }
    const counts = {
      strongBuy: Number(row.strongBuy) || 0,
      buy: Number(row.buy) || 0,
      hold: Number(row.hold) || 0,
      sell: Number(row.sell) || 0,
      strongSell: Number(row.strongSell) || 0,
    }

    // Most-recent real rating action date (grades feed, capped read).
    let lastActionDate = ''
    const grades = await fetchJson(`${BASE}/stable/grades?symbol=${encodeURIComponent(sym)}&apikey=${key}`, 9000)
    if (Array.isArray(grades)) {
      for (const g of grades) {
        const d = String(g?.date || '').slice(0, 10)
        if (d && d > lastActionDate) lastActionDate = d
      }
    }

    const value: FmpConsensus = {
      ...counts,
      action: actionFromCounts(counts),
      lastActionDate,
    }
    cache.set(sym, { value, expires: Date.now() + TTL })
    out.set(sym, value)
  })

  return out
}
