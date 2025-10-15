// Generic data validation helpers for market assets
// Ensures values are finite, within reasonable ranges, and fills missing fields.

export interface ValidationIssue { symbol: string; field: string; value: any; issue: string }

export interface ValidatedAsset<T extends { symbol: string } = any> {
  asset: T
  issues: ValidationIssue[]
}

const MAX_ABS_PCT = 80 // filter clearly broken % moves
const MAX_ABS_PRICE = 1000000

export function validateAsset<T extends { symbol: string; price?: number; changePercent?: number; change?: number; volume?: number }>(raw: T): ValidatedAsset<T> {
  const issues: ValidationIssue[] = []
  const a: any = { ...raw }

  // Price
  if (typeof a.price !== 'number' || !isFinite(a.price) || a.price <= 0) {
    issues.push({ symbol: a.symbol, field: 'price', value: a.price, issue: 'invalid_price_replaced' })
    a.price = 0
  } else if (a.price > MAX_ABS_PRICE) {
    issues.push({ symbol: a.symbol, field: 'price', value: a.price, issue: 'price_outlier_clamped' })
    a.price = MAX_ABS_PRICE
  }

  // Change percent derivation if missing
  if (typeof a.changePercent !== 'number' || !isFinite(a.changePercent)) {
    if (typeof a.change === 'number' && typeof a.price === 'number' && a.price !== 0) {
      a.changePercent = (a.change / (a.price - a.change)) * 100
      issues.push({ symbol: a.symbol, field: 'changePercent', value: a.changePercent, issue: 'derived_from_change' })
    } else {
      a.changePercent = 0
      issues.push({ symbol: a.symbol, field: 'changePercent', value: a.changePercent, issue: 'default_zero' })
    }
  }

  if (Math.abs(a.changePercent) > MAX_ABS_PCT) {
    issues.push({ symbol: a.symbol, field: 'changePercent', value: a.changePercent, issue: 'percent_outlier_clamped' })
    a.changePercent = Math.sign(a.changePercent) * MAX_ABS_PCT
  }

  if (typeof a.volume !== 'number' || !isFinite(a.volume) || a.volume < 0) {
    issues.push({ symbol: a.symbol, field: 'volume', value: a.volume, issue: 'invalid_volume_zeroed' })
    a.volume = 0
  }

  return { asset: a as T, issues }
}

export function summarizeIssues(list: ValidationIssue[]) {
  const byField: Record<string, number> = {}
  list.forEach(i => { byField[i.field] = (byField[i.field] || 0) + 1 })
  return { total: list.length, byField }
}
