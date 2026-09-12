// Shared symbol resolver: maps what users actually type (TradingView-style codes,
// currency pairs with/without slash, metal spots, crypto pairs, index nicknames)
// to the Yahoo Finance ticker the data APIs understand. Unknown input is
// returned unchanged so ratio charts (SPY/QQQ) and normal tickers still work.

const FIAT = new Set(['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'CNY', 'CNH', 'SEK', 'NOK', 'DKK', 'PLN', 'TRY', 'MXN', 'ZAR', 'HKD', 'SGD', 'INR', 'BRL', 'KRW', 'RUB', 'HUF', 'CZK', 'ILS', 'THB', 'IDR', 'MYR', 'PHP', 'TWD', 'SAR', 'AED'])
const METALS = new Set(['XAU', 'XAG', 'XPT', 'XPD'])
const CRYPTO = new Set(['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'DOT', 'AVAX', 'LTC', 'BCH', 'LINK', 'MATIC', 'BNB', 'SHIB', 'TRX', 'UNI', 'ATOM', 'XLM'])
const QUOTES = new Set([...FIAT, 'USDT', 'USDC', 'BTC', 'ETH'])

// Direct aliases — only codes that are NOT real US tickers (e.g. no GOLD → that's
// Barrick, no IBEX → IBEX Ltd, no DOW → Dow Inc, no WTI → W&T Offshore).
const ALIASES: Record<string, string> = {
  // Indices
  SPX: '^GSPC', US500: '^GSPC', SP500: '^GSPC',
  NDX: '^NDX', US100: '^NDX', NAS100: '^NDX',
  DJI: '^DJI', US30: '^DJI',
  RUT: '^RUT', US2000: '^RUT',
  VIX: '^VIX',
  DAX: '^GDAXI', GER40: '^GDAXI', DE40: '^GDAXI',
  CAC40: '^FCHI', FRA40: '^FCHI',
  FTSE: '^FTSE', UK100: '^FTSE', FTSE100: '^FTSE',
  FTSEMIB: 'FTSEMIB.MI', MIB: 'FTSEMIB.MI', IT40: 'FTSEMIB.MI',
  IBEX35: '^IBEX', ES35: '^IBEX',
  EU50: '^STOXX50E', STOXX50: '^STOXX50E', SX5E: '^STOXX50E',
  NIKKEI: '^N225', JP225: '^N225', NI225: '^N225',
  HK50: '^HSI',
  ASX200: '^AXJO', AU200: '^AXJO',
  KOSPI: '^KS11', SENSEX: '^BSESN', NIFTY: '^NSEI',
  DXY: 'DX-Y.NYB', USDX: 'DX-Y.NYB',
  // Treasury yields (CBOE real-time; ^TNX is yield ×10)
  US10Y: '^TNX', US30Y: '^TYX', US5Y: '^FVX', US3M: '^IRX',
  US2Y: 'FRED:DGS2', US20Y: 'FRED:DGS20', US7Y: 'FRED:DGS7',
  // Commodities (safe names only — no ticker collisions)
  USOIL: 'CL=F', CRUDE: 'CL=F', CRUDEOIL: 'CL=F',
  BRENT: 'BZ=F', UKOIL: 'BZ=F',
  NATGAS: 'NG=F', NGAS: 'NG=F', NATURALGAS: 'NG=F',
  COPPER: 'HG=F', PLATINUM: 'PL=F', PALLADIUM: 'PA=F',
  WHEAT: 'ZW=F', SOYBEAN: 'ZS=F', COFFEE: 'KC=F', SUGAR: 'SB=F', COTTON: 'CT=F', COCOA: 'CC=F',
}

// Resolve a two-leg pair (EUR/USD, XAU/USD, SOL/USD, BTC/EUR…) to a Yahoo ticker.
function resolvePair(a: string, b: string): string | null {
  if (b === 'USDT' || b === 'USDC') b = 'USD'
  if (!QUOTES.has(b)) return null
  if (METALS.has(a)) return `${a}${b}=X` // XAUUSD=X spot metals
  if (CRYPTO.has(a)) return `${a}-${b}` // BTC-USD, SOL-EUR…
  if (FIAT.has(a) && FIAT.has(b)) return `${a}${b}=X`
  return null
}

export function normalizeSymbol(sym: string): string {
  const s = sym.trim()
  if (!s) return sym
  // Already-explicit forms: FRED:/DBN:, Yahoo suffixes (=X, =F, -USD), indices (^), exchange dots.
  if (/[:=^.]/.test(s)) return s
  const U = s.toUpperCase()
  if (ALIASES[U]) return ALIASES[U]
  // Pair with separator: 2-5 letters / 2-5 letters (slash, dash or space).
  const sep = /^([A-Z]{2,5})[/\- ]([A-Z]{2,5})$/.exec(U)
  if (sep) {
    const resolved = resolvePair(sep[1], sep[2])
    if (resolved) return resolved
    return sym // e.g. SPY/QQQ ratio chart — leave untouched
  }
  // No separator: 6 letters split 3+3 (EURUSD, XAUUSD, SOLUSD…), or 3-4 letter
  // crypto + USDT/USD (BTCUSDT, DOGEUSD…).
  if (/^[A-Z]{6,9}$/.test(U)) {
    const splits = [3, 4, 5]
    for (const i of splits) {
      if (i >= U.length) break
      const resolved = resolvePair(U.slice(0, i), U.slice(i))
      if (resolved) return resolved
    }
  }
  return sym
}
