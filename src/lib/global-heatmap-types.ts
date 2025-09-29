export interface RawInstrument {
  source: string
  symbol: string
  name: string
  country?: string // ISO CC
  currency?: string
  price?: number
  changePercent?: number
  marketCap?: number
  sector?: string
  type?: string // equity, index, etf, commodity, bond
  fxRateToUSD?: number // optional pre-converted
  meta?: Record<string, any>
}

export interface NormalizedInstrument {
  id: string
  symbol: string
  name: string
  region: string
  country: string
  sector: string
  type: string
  currency: string
  priceLocal: number|null
  priceUSD: number|null
  changeLocalPct: number|null
  changeUSDPct: number|null
  marketCapUSD: number|null
  benchmarkRelPct: number|null
  source: string
  raw: RawInstrument
}

export interface HierNode {
  id: string
  name: string
  level: 'region' | 'country' | 'sector' | 'instrument'
  value: number // sizing (market cap USD)
  change: number // color metric (pct)
  children?: HierNode[]
  data?: any
}

// Metric selection supported by API/UI
export type HeatmapMetric = 'changeLocalPct' | 'changeUSDPct' | 'benchmarkRelPct'

// Pipeline abstraction skeleton for future multi-source expansion
export interface DataSourceFetcher {
  id: string
  priority: number // lower = preferred
  supports(types: string[]): boolean
  fetch(symbols: string[]): Promise<RawInstrument[]>
}

export interface FXProvider {
  id: string
  getRate(base: string, quote: 'USD'): Promise<number|undefined>
}

