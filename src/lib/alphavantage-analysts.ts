// Real analyst price targets + consensus from Alpha Vantage (OVERVIEW endpoint).
// The free OVERVIEW response includes real, per-ticker analyst fields:
//   • AnalystTargetPrice
//   • AnalystRatingStrongBuy / Buy / Hold / Sell / StrongSell
// IMPORTANT: Alpha Vantage free tier is ~25 requests/DAY. We therefore use a
// long (24h) in-memory cache and a hard daily request budget, fetching only a
// small set of the most-covered tickers. Treated strictly as a best-effort
// SECONDARY source (FMP/Finnhub remain primary).

import { env } from '@/lib/env'

const BASE = 'https://www.alphavantage.co/query'
const TTL = 1000 * 60 * 60 * 24 // 24h — respect the tiny free quota
const DAILY_BUDGET = 20 // leave headroom under the ~25/day free limit

export type AvAnalyst = {
  targetPrice: number | null
  action: 'Buy' | 'Hold' | 'Sell' | null
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
}

type CacheEntry = { value: AvAnalyst | null; expires: number }
const cache = new Map<string, CacheEntry>()

// Daily request budget, reset each calendar day (UTC).
let budgetDay = ''
let budgetUsed = 0
function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}
function takeBudget(): boolean {
  const day = todayKey()
  if (day !== budgetDay) {
    budgetDay = day
    budgetUsed = 0
  }
  if (budgetUsed >= DAILY_BUDGET) return false
  budgetUsed++
  return true
}

function fresh(key: string): AvAnalyst | null | undefined {
  const e = cache.get(key)
  if (e && e.expires > Date.now()) return e.value
  return undefined
}

function actionFromCounts(c: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }): 'Buy' | 'Hold' | 'Sell' | null {
  const total = c.strongBuy + c.buy + c.hold + c.sell + c.strongSell
  if (total === 0) return null
  const bullish = c.strongBuy + c.buy
  const bearish = c.sell + c.strongSell
  if (bullish > c.hold && bullish >= bearish) return 'Buy'
  if (bearish > c.hold && bearish > bullish) return 'Sell'
  return 'Hold'
}

async function fetchJson(url: string, ms = 8000): Promise<any | null> {
  try {
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(ms) })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

/**
 * Fetch real analyst target + rating counts for a small set of tickers.
 * Best-effort, cached 24h, and capped by a daily request budget to respect
 * Alpha Vantage's free-tier quota. Returns a Map keyed by ticker.
 *
 * @param tickers candidate tickers (only the first `maxNew` uncached are fetched)
 * @param maxNew  max number of fresh API calls this invocation
 */
export async function getAlphaVantageAnalysts(tickers: string[], maxNew = 4): Promise<Map<string, AvAnalyst>> {
  const out = new Map<string, AvAnalyst>()
  const key = env.ALPHAVANTAGE_API_KEY
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

  // Sequential with a delay to respect the free tier's 5 requests/minute limit,
  // and budget-limited to respect the ~25 requests/day limit.
  let fetched = 0
  for (const sym of need) {
    if (fetched >= maxNew) break
    if (!takeBudget()) break

    const data = await fetchJson(`${BASE}?function=OVERVIEW&symbol=${encodeURIComponent(sym)}&apikey=${key}`)
    // Rate-limit / throttle responses come back as { Information } or { Note }.
    // Do NOT cache these as null — give back the budget and stop so the ticker
    // is retried on a later request instead of being poisoned for 24h.
    if (data && (data.Information || data.Note)) {
      budgetUsed = Math.max(0, budgetUsed - 1)
      break
    }
    fetched++
    // Genuinely empty / unknown symbol → cache null (24h) to avoid re-asking.
    if (!data || !data.Symbol) {
      cache.set(sym, { value: null, expires: Date.now() + TTL })
      continue
    }
    const counts = {
      strongBuy: Number(data.AnalystRatingStrongBuy) || 0,
      buy: Number(data.AnalystRatingBuy) || 0,
      hold: Number(data.AnalystRatingHold) || 0,
      sell: Number(data.AnalystRatingSell) || 0,
      strongSell: Number(data.AnalystRatingStrongSell) || 0,
    }
    const target = Number(data.AnalystTargetPrice)
    const value: AvAnalyst = {
      targetPrice: Number.isFinite(target) && target > 0 ? target : null,
      action: actionFromCounts(counts),
      ...counts,
    }
    cache.set(sym, { value, expires: Date.now() + TTL })
    out.set(sym, value)

    // Pace remaining requests (~5/min) only if more are pending.
    if (fetched < maxNew) await new Promise((r) => setTimeout(r, 1300))
  }

  return out
}
