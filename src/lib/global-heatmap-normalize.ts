import { RawInstrument, NormalizedInstrument } from './global-heatmap-types'
import { regionForCountry, normalizeSector } from './global-heatmap-regions'

// Simple FX table placeholder (extend with real FX service later)
const FX_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.09,
  GBP: 1.27,
  JPY: 0.0063,
  CHF: 1.11,
  CAD: 0.73,
  AUD: 0.67,
  CNY: 0.14,
  HKD: 0.13,
  BRL: 0.18,
  INR: 0.012,
  ZAR: 0.055
}

function fxToUSD(currency?: string): number|undefined {
  if (!currency) return undefined
  return FX_USD[currency.toUpperCase()]
}

export function normalizeInstrument(r: RawInstrument): NormalizedInstrument {
  const country = (r.country || guessCountryFromSymbol(r.symbol) || 'US').toUpperCase()
  const region = regionForCountry(country)
  const sector = normalizeSector(r.sector)
  const currency = (r.currency || 'USD').toUpperCase()
  const rate = r.fxRateToUSD || fxToUSD(currency) || 1
  const priceLocal = r.price ?? null
  const priceUSD = priceLocal!=null ? priceLocal * rate : null
  const changeLocalPct = r.changePercent ?? null
  // Approx: assume change in USD same if FX stable intraday (improve later by including FX change)
  const changeUSDPct = changeLocalPct
  const marketCapUSD = r.marketCap!=null ? r.marketCap * (currency==='USD'?1:rate) : null
  return {
    id: r.symbol,
    symbol: r.symbol,
    name: r.name || r.symbol,
    region,
    country,
    sector,
    type: r.type || 'equity',
    currency,
    priceLocal,
    priceUSD,
    changeLocalPct,
    changeUSDPct,
    marketCapUSD,
    benchmarkRelPct: null, // computed later
    source: r.source,
    raw: r
  }
}

function guessCountryFromSymbol(symbol: string): string | undefined {
  if (symbol.endsWith('.L')) return 'GB'
  if (symbol.endsWith('.DE')) return 'DE'
  if (symbol.endsWith('.PA')) return 'FR'
  if (symbol.endsWith('.SW')) return 'CH'
  if (symbol.endsWith('.AS')) return 'NL'
  if (symbol.endsWith('.HK')) return 'HK'
  if (symbol.endsWith('.NS')) return 'IN'
  if (symbol.endsWith('.AX')) return 'AU'
  return undefined
}
