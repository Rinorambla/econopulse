import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { requirePremium } from '@/lib/plan-guard'
import { getYahooQuotes } from '@/lib/yahooFinance'

// Ensure Node.js runtime for OpenAI SDK
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const preferredRegion = 'auto'
export const maxDuration = 55

// Initialize AI client — supports Anthropic (Claude), OpenAI and Groq (free)
// When OpenAI reports insufficient_quota we skip it for a while and go straight
// to the next configured provider instead of burning a failed roundtrip per chat.
let openaiQuotaBlockUntil = 0

function getAIClient(): { client: OpenAI; model: string; fallbackModel: string; provider: string } {
  // Priority: Anthropic (Claude) → OpenAI → Groq (free)
  // Anthropic exposes an OpenAI-compatible endpoint, so we can reuse the OpenAI SDK.
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: 'https://api.anthropic.com/v1/',
      }),
      // Default to Claude Opus; override with ANTHROPIC_MODEL if needed.
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514',
      // Cheaper/faster Claude model used if the primary one is unavailable.
      fallbackModel: process.env.ANTHROPIC_FALLBACK_MODEL || 'claude-3-5-haiku-latest',
      provider: 'anthropic',
    }
  }
  const openaiBlocked = Date.now() < openaiQuotaBlockUntil
  if (process.env.OPENAI_API_KEY && !(openaiBlocked && process.env.GROQ_API_KEY)) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      fallbackModel: 'gpt-4o-mini',
      provider: 'openai',
    }
  }
  if (process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' }),
      model: 'llama-3.3-70b-versatile',
      fallbackModel: 'llama-3.1-8b-instant',
      provider: 'groq',
    }
  }
  throw new Error('No AI provider configured (set ANTHROPIC_API_KEY, OPENAI_API_KEY or GROQ_API_KEY)')
}

// Helper to timeout a promise
const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('openai_timeout')), ms)
    p.then((v) => { clearTimeout(id); resolve(v) }).catch((e) => { clearTimeout(id); reject(e) })
  })
}

// ============================================================================
// LIVE MARKET DATA ENRICHMENT
// Pulls real, up-to-date numbers so the AI grounds answers on facts, not guesses.
// Everything here is best-effort and time-boxed; failures never block the answer.
// ============================================================================

// Common company / asset names → ticker, so "apple", "bitcoin", "gold" resolve.
const NAME_TO_TICKER: Record<string, string> = {
  apple: 'AAPL', microsoft: 'MSFT', nvidia: 'NVDA', tesla: 'TSLA', amazon: 'AMZN',
  google: 'GOOGL', alphabet: 'GOOGL', meta: 'META', facebook: 'META', netflix: 'NFLX',
  amd: 'AMD', intel: 'INTC', broadcom: 'AVGO', oracle: 'ORCL', salesforce: 'CRM',
  palantir: 'PLTR', 'super micro': 'SMCI', supermicro: 'SMCI', adobe: 'ADBE',
  jpmorgan: 'JPM', 'jp morgan': 'JPM', 'goldman sachs': 'GS', 'bank of america': 'BAC',
  visa: 'V', mastercard: 'MA', berkshire: 'BRK-B', walmart: 'WMT', costco: 'COST',
  exxon: 'XOM', chevron: 'CVX', 'eli lilly': 'LLY', 'united health': 'UNH', pfizer: 'PFE',
  boeing: 'BA', disney: 'DIS', coca: 'KO', 'coca cola': 'KO', pepsi: 'PEP', mcdonalds: 'MCD',
  'mcdonald\'s': 'MCD', starbucks: 'SBUX', nike: 'NKE', ford: 'F', 'general motors': 'GM',
  uber: 'UBER', airbnb: 'ABNB', coinbase: 'COIN', 'micro strategy': 'MSTR', microstrategy: 'MSTR',
  bitcoin: 'BTC-USD', btc: 'BTC-USD', ethereum: 'ETH-USD', eth: 'ETH-USD', solana: 'SOL-USD',
  ripple: 'XRP-USD', xrp: 'XRP-USD', dogecoin: 'DOGE-USD', cardano: 'ADA-USD',
  gold: 'GC=F', silver: 'SI=F', oil: 'CL=F', crude: 'CL=F', 'wti': 'CL=F', 'natural gas': 'NG=F',
  copper: 'HG=F', 'sp500': 'SPY', 's&p': 'SPY', 's&p 500': 'SPY', 'sp 500': 'SPY',
  nasdaq: 'QQQ', 'dow': 'DIA', 'dow jones': 'DIA', 'russell': 'IWM', vix: '^VIX',
  'dollar': 'DX-Y.NYB', 'us dollar': 'DX-Y.NYB', dxy: 'DX-Y.NYB', euro: 'EURUSD=X', 'eur/usd': 'EURUSD=X',
  treasury: 'TLT', bonds: 'TLT', 'yield': 'TLT', 'yields': 'TLT',
  // Italian aliases
  oro: 'GC=F', petrolio: 'CL=F', argento: 'SI=F', rame: 'HG=F', grano: 'ZW=F', 'gas naturale': 'NG=F',
  dollaro: 'DX-Y.NYB', obbligazioni: 'TLT',
}

// A reasonable set of words that look like tickers but aren't, to avoid noise.
const TICKER_STOPWORDS = new Set(['I', 'A', 'THE', 'AND', 'OR', 'FOR', 'IS', 'IT', 'TO', 'IN', 'ON', 'AT', 'OF', 'AI', 'US', 'EU', 'CEO', 'CFO', 'GDP', 'CPI', 'PPI', 'FED', 'FOMC', 'ETF', 'IPO', 'PE', 'EPS', 'YOY', 'QOQ', 'USD', 'EUR', 'WSJ', 'NYSE', 'DYOR', 'ATH', 'YTD', 'Q1', 'Q2', 'Q3', 'Q4', 'OK', 'NO', 'WHY', 'HOW', 'BUY', 'SELL'])

function extractTickers(question: string): string[] {
  const found = new Set<string>()
  // $TICKER form (highest confidence)
  for (const m of question.matchAll(/\$([A-Za-z][A-Za-z.\-]{0,6})/g)) {
    found.add(m[1].toUpperCase())
  }
  // Bare uppercase tokens that look like tickers (2-5 letters)
  for (const m of question.matchAll(/\b([A-Z]{2,5})\b/g)) {
    const t = m[1].toUpperCase()
    if (!TICKER_STOPWORDS.has(t)) found.add(t)
  }
  // Company / asset names
  const lower = ` ${question.toLowerCase()} `
  for (const [name, ticker] of Object.entries(NAME_TO_TICKER)) {
    if (lower.includes(` ${name} `) || lower.includes(`${name},`) || lower.includes(`${name}.`) || lower.includes(`${name}?`) || lower.includes(`${name}'`)) {
      found.add(ticker)
    }
  }
  return Array.from(found).slice(0, 8)
}

function pct(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return 'n/a'
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`
}
function price(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return 'n/a'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(4)
}
function big(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return 'n/a'
  const a = Math.abs(n)
  if (a >= 1e12) return `${(n / 1e12).toFixed(2)}T`
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  return n.toFixed(0)
}

// ── Yahoo crumb auth (needed by v10 quoteSummary for fundamentals) ──────────
const Y_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
let yAuthCache: { crumb: string; cookie: string; ts: number } | null = null
async function getYAuth(): Promise<{ crumb: string; cookie: string } | null> {
  if (yAuthCache && Date.now() - yAuthCache.ts < 30 * 60 * 1000) return yAuthCache
  try {
    const r1 = await fetch('https://fc.yahoo.com/', { signal: AbortSignal.timeout(4000), headers: { 'User-Agent': Y_UA } }).catch(() => null)
    const cookie = (r1?.headers.get('set-cookie') || '').split(/,(?=[^ ])/g).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')
    if (!cookie) return null
    const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { signal: AbortSignal.timeout(4000), headers: { 'User-Agent': Y_UA, Cookie: cookie } })
    if (!r2.ok) return null
    const crumb = (await r2.text()).trim()
    if (!crumb) return null
    yAuthCache = { crumb, cookie, ts: Date.now() }
    return yAuthCache
  } catch { return null }
}

// Deep fundamentals for one ticker: revenue, margins, cash flow, FCF, capex,
// cash/debt, ROE, forward P/E, PEG, dividend yield/rate/payout.
async function fetchFundamentals(ticker: string): Promise<string | null> {
  try {
    const auth = await getYAuth()
    if (!auth) return null
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=financialData%2CdefaultKeyStatistics%2CsummaryDetail&crumb=${encodeURIComponent(auth.crumb)}`
    const r = await fetch(url, { headers: { 'User-Agent': Y_UA, Cookie: auth.cookie, Accept: 'application/json' }, signal: AbortSignal.timeout(7000), cache: 'no-store' })
    if (!r.ok) return null
    const j = await r.json()
    const res = j?.quoteSummary?.result?.[0]
    if (!res) return null
    const fd = res.financialData, ks = res.defaultKeyStatistics, sd = res.summaryDetail
    const raw = (x: any): number | null => (x && typeof x.raw === 'number' && isFinite(x.raw)) ? x.raw : null
    const bits: string[] = []
    const rev = raw(fd?.totalRevenue); if (rev != null) bits.push(`revenue(ttm) ${big(rev)}`)
    const rg = raw(fd?.revenueGrowth); if (rg != null) bits.push(`revenue growth ${(rg * 100).toFixed(1)}%`)
    const gm = raw(fd?.grossMargins); if (gm != null) bits.push(`gross margin ${(gm * 100).toFixed(1)}%`)
    const om = raw(fd?.operatingMargins); if (om != null) bits.push(`operating margin ${(om * 100).toFixed(1)}%`)
    const ocf = raw(fd?.operatingCashflow); if (ocf != null) bits.push(`operating cash flow ${big(ocf)}`)
    const fcf = raw(fd?.freeCashflow); if (fcf != null) bits.push(`free cash flow ${big(fcf)}`)
    if (ocf != null && fcf != null && ocf - fcf > 0) bits.push(`capex ≈ ${big(ocf - fcf)}`)
    const cash = raw(fd?.totalCash); if (cash != null) bits.push(`cash ${big(cash)}`)
    const debt = raw(fd?.totalDebt); if (debt != null) bits.push(`total debt ${big(debt)}`)
    const ebitda = raw(fd?.ebitda); if (ebitda != null) bits.push(`EBITDA ${big(ebitda)}`)
    const roe = raw(fd?.returnOnEquity); if (roe != null) bits.push(`ROE ${(roe * 100).toFixed(1)}%`)
    const tpe = raw(sd?.trailingPE); if (tpe != null) bits.push(`P/E(ttm) ${tpe.toFixed(1)}`)
    const fpe = raw(ks?.forwardPE) ?? raw(sd?.forwardPE); if (fpe != null) bits.push(`forward P/E ${fpe.toFixed(1)}`)
    const peg = raw(ks?.pegRatio); if (peg != null) bits.push(`PEG ${peg.toFixed(2)}`)
    const dy = raw(sd?.dividendYield); if (dy != null) bits.push(`dividend yield ${(dy * 100).toFixed(2)}%`)
    const drate = raw(sd?.dividendRate); if (drate != null) bits.push(`dividend rate $${drate.toFixed(2)}/yr`)
    const payout = raw(sd?.payoutRatio); if (payout != null) bits.push(`payout ratio ${(payout * 100).toFixed(0)}%`)
    const target = raw(fd?.targetMeanPrice); if (target != null) bits.push(`analyst mean target $${target.toFixed(2)}`)
    // Balance sheet / valuation / ownership extras
    const cr = raw(fd?.currentRatio); if (cr != null) bits.push(`current ratio ${cr.toFixed(2)}`)
    const qr = raw(fd?.quickRatio); if (qr != null) bits.push(`quick ratio ${qr.toFixed(2)}`)
    const de = raw(fd?.debtToEquity); if (de != null) bits.push(`debt/equity ${de.toFixed(0)}%`)
    const roa = raw(fd?.returnOnAssets); if (roa != null) bits.push(`ROA ${(roa * 100).toFixed(1)}%`)
    const ev = raw(ks?.enterpriseValue); if (ev != null) bits.push(`EV ${big(ev)}`)
    const evR = raw(ks?.enterpriseToRevenue); if (evR != null) bits.push(`EV/Sales ${evR.toFixed(2)}`)
    const evE = raw(ks?.enterpriseToEbitda); if (evE != null) bits.push(`EV/EBITDA ${evE.toFixed(1)}`)
    const pb = raw(ks?.priceToBook); if (pb != null) bits.push(`P/B ${pb.toFixed(2)}`)
    const ps = raw(sd?.priceToSalesTrailing12Months); if (ps != null) bits.push(`P/S ${ps.toFixed(2)}`)
    const bvps = raw(ks?.bookValue); if (bvps != null) bits.push(`book value/share $${bvps.toFixed(2)}`)
    const so = raw(ks?.sharesOutstanding); if (so != null) bits.push(`shares out ${big(so)}`)
    const fl = raw(ks?.floatShares); if (fl != null) bits.push(`float ${big(fl)}`)
    const spf = raw(ks?.shortPercentOfFloat); if (spf != null) bits.push(`short float ${(spf * 100).toFixed(1)}%`)
    const inst = raw(ks?.heldPercentInstitutions); if (inst != null) bits.push(`institutional ${(inst * 100).toFixed(1)}%`)
    const ins = raw(ks?.heldPercentInsiders); if (ins != null) bits.push(`insiders ${(ins * 100).toFixed(1)}%`)
    const beta = raw(sd?.beta) ?? raw(ks?.beta); if (beta != null) bits.push(`beta ${beta.toFixed(2)}`)
    if (!bits.length) return null
    return `${ticker} fundamentals: ${bits.join('; ')}.`
  } catch { return null }
}

// ── Macro indicator catalog: question keywords (EN+IT) → FRED series ────────
// Lets the chat quote the LATEST real value (+YoY where meaningful) for ~50
// macro indicators without hardcoding topic branches for each one.
type MacroDef = { kw: string[]; id: string; label: string; unit: 'pct' | 'lvl' | 'idx'; yoy?: boolean; mom?: boolean }
const MACRO_CATALOG: MacroDef[] = [
  { kw: ['real gdp', 'pil reale', 'gdp', 'pil '], id: 'GDPC1', label: 'Real GDP ($B)', unit: 'lvl', yoy: true },
  { kw: ['gdp per capita', 'pil pro capite'], id: 'A939RX0Q048SBEA', label: 'Real GDP per capita ($)', unit: 'lvl', yoy: true },
  { kw: ['industrial production', 'produzione industriale'], id: 'INDPRO', label: 'Industrial production (index)', unit: 'idx', yoy: true },
  { kw: ['capacity utilization', 'capacità produttiva', 'capacita produttiva'], id: 'TCU', label: 'Capacity utilization', unit: 'pct' },
  { kw: ['manufacturing production', 'produzione manifatturiera'], id: 'IPMAN', label: 'Manufacturing production (index)', unit: 'idx', yoy: true },
  { kw: ['retail sales', 'vendite al dettaglio'], id: 'RSAFS', label: 'Retail sales ($M)', unit: 'lvl', yoy: true },
  { kw: ['personal income', 'reddito personale', 'redditi'], id: 'PI', label: 'Personal income ($B)', unit: 'lvl', yoy: true },
  { kw: ['personal spending', 'consumer spending', 'consumi', 'spesa delle famiglie'], id: 'PCE', label: 'Personal spending ($B)', unit: 'lvl', yoy: true },
  { kw: ['saving rate', 'savings rate', 'risparmio'], id: 'PSAVERT', label: 'Personal saving rate', unit: 'pct' },
  { kw: ['consumer credit', 'credito al consumo'], id: 'TOTALSL', label: 'Consumer credit ($B)', unit: 'lvl', yoy: true },
  { kw: ['auto sales', 'vehicle sales', 'vendite di auto'], id: 'TOTALSA', label: 'Vehicle sales (M SAAR)', unit: 'lvl' },
  { kw: ['core cpi'], id: 'CPILFESL', label: 'Core CPI (index)', unit: 'idx', yoy: true },
  { kw: ['cpi', 'consumer price', 'prezzi al consumo'], id: 'CPIAUCSL', label: 'CPI (index)', unit: 'idx', yoy: true },
  { kw: ['core ppi'], id: 'PPIFES', label: 'Core PPI final demand (index)', unit: 'idx', yoy: true },
  { kw: ['ppi', 'producer price', 'prezzi alla produzione'], id: 'PPIACO', label: 'PPI all commodities (index)', unit: 'idx', yoy: true },
  { kw: ['core pce'], id: 'PCEPILFE', label: 'Core PCE price index', unit: 'idx', yoy: true },
  { kw: ['pce price', 'pce inflation', 'deflatore pce'], id: 'PCEPI', label: 'PCE price index', unit: 'idx', yoy: true },
  { kw: ['import price', 'prezzi all\'importazione', 'prezzi import'], id: 'IR', label: 'Import prices (index)', unit: 'idx', yoy: true },
  { kw: ['gdp deflator', 'deflatore del pil'], id: 'GDPDEF', label: 'GDP deflator (index)', unit: 'idx', yoy: true },
  { kw: ['unemployment', 'disoccupazione'], id: 'UNRATE', label: 'Unemployment rate', unit: 'pct' },
  { kw: ['participation rate', 'partecipazione'], id: 'CIVPART', label: 'Labor participation rate', unit: 'pct' },
  { kw: ['employment rate', 'tasso di occupazione'], id: 'EMRATIO', label: 'Employment-population ratio', unit: 'pct' },
  { kw: ['payroll', 'nfp', 'non-farm', 'nonfarm', 'buste paga'], id: 'PAYEMS', label: 'Nonfarm payrolls (K jobs)', unit: 'lvl', mom: true },
  { kw: ['initial claims', 'jobless claims', 'sussidi di disoccupazione'], id: 'ICSA', label: 'Initial jobless claims', unit: 'lvl' },
  { kw: ['continuing claims'], id: 'CCSA', label: 'Continuing claims', unit: 'lvl' },
  { kw: ['hourly earnings', 'salari', 'wage growth', 'wages'], id: 'CES0500000003', label: 'Avg hourly earnings ($)', unit: 'lvl', yoy: true },
  { kw: ['employment cost'], id: 'ECIALLCIV', label: 'Employment cost index', unit: 'idx', yoy: true },
  { kw: ['job opening', 'jolts', 'posti di lavoro vacanti'], id: 'JTSJOL', label: 'Job openings (K)', unit: 'lvl' },
  { kw: ['quit rate', 'quits', 'dimissioni'], id: 'JTSQUR', label: 'Quits rate', unit: 'pct' },
  { kw: ['durable goods', 'beni durevoli'], id: 'DGORDER', label: 'Durable goods orders ($M)', unit: 'lvl', yoy: true },
  { kw: ['factory orders', 'ordini alle fabbriche'], id: 'AMTMNO', label: 'Factory new orders ($M)', unit: 'lvl', yoy: true },
  { kw: ['business inventories', 'scorte'], id: 'BUSINV', label: 'Business inventories ($M)', unit: 'lvl', yoy: true },
  { kw: ['corporate profits', 'profitti aziendali', 'utili aziendali aggregati'], id: 'CP', label: 'Corporate profits ($B)', unit: 'lvl', yoy: true },
  { kw: ['housing starts', 'cantieri'], id: 'HOUST', label: 'Housing starts (K SAAR)', unit: 'lvl' },
  { kw: ['building permits', 'permessi di costruzione'], id: 'PERMIT', label: 'Building permits (K SAAR)', unit: 'lvl' },
  { kw: ['existing home sales'], id: 'EXHOSLUSM495S', label: 'Existing home sales (SAAR)', unit: 'lvl' },
  { kw: ['new home sales'], id: 'HSN1F', label: 'New home sales (K SAAR)', unit: 'lvl' },
  { kw: ['case-shiller', 'case shiller', 'prezzi delle case', 'home price'], id: 'CSUSHPINSA', label: 'Case-Shiller home prices (index)', unit: 'idx', yoy: true },
  { kw: ['mortgage rate', 'mutuo', 'mutui'], id: 'MORTGAGE30US', label: '30Y mortgage rate', unit: 'pct' },
  { kw: ['trade balance', 'bilancia commerciale'], id: 'BOPGSTB', label: 'Trade balance ($M)', unit: 'lvl' },
  { kw: ['debt to gdp', 'debito/pil', 'debito pil'], id: 'GFDEGDQ188S', label: 'Federal debt/GDP', unit: 'pct' },
  { kw: ['public debt', 'federal debt', 'debito pubblico'], id: 'GFDEBTN', label: 'Federal debt ($M)', unit: 'lvl', yoy: true },
  { kw: ['deficit'], id: 'MTSDS133FMS', label: 'Federal surplus/deficit ($M, monthly)', unit: 'lvl' },
  { kw: ['m2', 'money supply', 'massa monetaria'], id: 'M2SL', label: 'M2 money supply ($B)', unit: 'lvl', yoy: true },
  { kw: ['m1 '], id: 'M1SL', label: 'M1 money supply ($B)', unit: 'lvl', yoy: true },
  { kw: ['fed balance sheet', 'bilancio della fed', 'walcl', 'quantitative'], id: 'WALCL', label: 'Fed balance sheet ($M)', unit: 'lvl', yoy: true },
  { kw: ['reverse repo', 'rrp'], id: 'RRPONTSYD', label: 'Reverse repo ($B)', unit: 'lvl' },
  { kw: ['bank reserves', 'riserve bancarie'], id: 'TOTRESNS', label: 'Bank reserves ($B)', unit: 'lvl' },
  { kw: ['sofr'], id: 'SOFR', label: 'SOFR', unit: 'pct' },
  { kw: ['2y yield', '2 anni', '2-year'], id: 'DGS2', label: '2Y Treasury yield', unit: 'pct' },
  { kw: ['5y yield', '5 anni'], id: 'DGS5', label: '5Y Treasury yield', unit: 'pct' },
  { kw: ['10y yield', '10 anni', '10-year', 'decennale'], id: 'DGS10', label: '10Y Treasury yield', unit: 'pct' },
  { kw: ['30y yield', '30 anni', 'trentennale'], id: 'DGS30', label: '30Y Treasury yield', unit: 'pct' },
  { kw: ['yield curve', 'curva dei rendimenti', '2s10s', 'spread 2y'], id: 'T10Y2Y', label: '10Y-2Y spread', unit: 'pct' },
  { kw: ['high yield spread', 'spread hy', 'credit spread', 'spread di credito'], id: 'BAMLH0A0HYM2', label: 'High-yield OAS spread', unit: 'pct' },
  { kw: ['investment grade spread', 'spread ig'], id: 'BAMLC0A0CM', label: 'Investment-grade OAS spread', unit: 'pct' },
  { kw: ['real yield', 'rendimento reale', 'rendimenti reali'], id: 'DFII10', label: '10Y real yield (TIPS)', unit: 'pct' },
  { kw: ['sahm'], id: 'SAHMREALTIME', label: 'Sahm rule indicator', unit: 'pct' },
]

// Fetch ~1y of daily bars and derive technical levels for one ticker.
async function fetchTechnical(ticker: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(7000), cache: 'no-store' }
    )
    if (!r.ok) return null
    const j = await r.json()
    const res = j?.chart?.result?.[0]
    const closes: number[] = (res?.indicators?.quote?.[0]?.close || []).filter((x: any) => typeof x === 'number')
    if (closes.length < 30) return null
    const last = closes[closes.length - 1]
    const sma = (n: number) => {
      if (closes.length < n) return null
      const slice = closes.slice(-n)
      return slice.reduce((a, b) => a + b, 0) / n
    }
    const sma20 = sma(20), sma50 = sma(50), sma200 = sma(200)
    const hi52 = Math.max(...closes), lo52 = Math.min(...closes)
    const ret = (n: number) => closes.length > n ? ((last - closes[closes.length - 1 - n]) / closes[closes.length - 1 - n]) * 100 : null
    // 14-period RSI
    let gains = 0, losses = 0
    for (let i = closes.length - 14; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1]
      if (d >= 0) gains += d; else losses -= d
    }
    const rs = losses === 0 ? 100 : gains / losses
    const rsi = 100 - 100 / (1 + rs)
    const trend = sma50 && sma200 ? (sma50 > sma200 ? 'uptrend (50DMA>200DMA)' : 'downtrend (50DMA<200DMA)') : 'n/a'
    return [
      `${ticker} technicals: last ${price(last)};`,
      `1M ${pct(ret(21))}, 3M ${pct(ret(63))}, 6M ${pct(ret(126))};`,
      `52w range ${price(lo52)}–${price(hi52)} (now ${(((last - lo52) / (hi52 - lo52)) * 100).toFixed(0)}% of range);`,
      `SMA20 ${price(sma20)}, SMA50 ${price(sma50)}, SMA200 ${price(sma200)};`,
      `RSI(14) ${rsi.toFixed(0)}; trend ${trend}.`,
    ].join(' ')
  } catch {
    return null
  }
}

// Assemble a single, factual context string from all available live sources.
async function buildLiveContext(req: NextRequest, question: string, clientContext: unknown): Promise<string> {
  const parts: string[] = []
  parts.push(`Server timestamp: ${new Date().toISOString()} (live data follows; use these exact numbers).`)

  const origin = req.nextUrl?.origin || `https://${req.headers.get('host') || 'www.econopulse.ai'}`
  const q = question.toLowerCase()
  // Pull a JSON endpoint with a hard timeout; never throws.
  const fetchJson = (path: string, ms = 8000): Promise<any> =>
    withTimeout(
      fetch(`${origin}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(ms) }).then(r => r.ok ? r.json() : null),
      ms + 1000
    ).catch(() => null)

  // 1) Market-wide snapshot from our own wrap endpoint (indices, sectors, movers, news).
  //    2) FRED macroeconomic snapshot. Fetched in PARALLEL to keep latency low.
  const [wr, ed] = await Promise.all([
    fetchJson('/api/updateai/wrap', 9000),
    fetchJson('/api/economic-data', 9000),
  ])
  try {
    if (wr) {
      if (Array.isArray(wr.quotes)) {
        parts.push('Indices & macro: ' + wr.quotes.map((q: any) => `${q.name} ${price(q.price)} (${pct(q.changePct)})`).join('; ') + '.')
      }
      if (Array.isArray(wr.sectors) && wr.sectors.length) {
        parts.push('Sectors: ' + wr.sectors.map((s: any) => `${s.name || s.sector} ${pct(s.changePercent ?? s.performance)}`).join('; ') + '.')
      }
      if (wr.movers?.top?.length) parts.push('Top gainers: ' + wr.movers.top.map((m: any) => `${m.symbol || m.ticker} ${pct(m.changePercent)}`).join(', ') + '.')
      if (wr.movers?.bottom?.length) parts.push('Top losers: ' + wr.movers.bottom.map((m: any) => `${m.symbol || m.ticker} ${pct(m.changePercent)}`).join(', ') + '.')
      if (Array.isArray(wr.news) && wr.news.length) {
        parts.push('Latest headlines:\n' + wr.news.slice(0, 8).map((n: any) => `• ${n.title}${n.source ? ` (${n.source})` : ''}`).join('\n'))
      }
    }
  } catch { /* ignore */ }

  // FRED macroeconomic snapshot — ALWAYS included so the AI can speak to the
  //    economy, GDP, inflation, jobs, the Fed, consumer/housing/industrial trends.
  try {
    const ind = ed?.data?.indicators
    const cur = ed?.data?.current
    if (ind) {
      const v = (x: any) => (x && typeof x.value === 'number') ? x.value : null
      const macro: string[] = []
      if (v(ind.gdp) != null) macro.push(`Real GDP growth ${v(ind.gdp)}% (annualized)`)
      if (ind.inflation && typeof ind.inflation.value === 'number') macro.push(`CPI inflation ${ind.inflation.value}% YoY`)
      if (v(ind.unemployment) != null) macro.push(`Unemployment ${v(ind.unemployment)}%`)
      if (v(ind.fedRate) != null) macro.push(`Fed funds ${v(ind.fedRate)}%`)
      if (v(ind.consumerConfidence) != null) macro.push(`Consumer sentiment ${v(ind.consumerConfidence)}`)
      if (v(ind.retailSales) != null) macro.push(`Retail sales (index) ${v(ind.retailSales)}`)
      if (v(ind.housingStarts) != null) macro.push(`Housing starts ${v(ind.housingStarts)}K`)
      if (v(ind.industrialProduction) != null) macro.push(`Industrial production (index) ${v(ind.industrialProduction)}`)
      if (macro.length) parts.push('US macro (FRED, latest): ' + macro.join('; ') + '.')
    }
    if (cur?.cycle) parts.push(`Economic cycle: ${cur.cycle} (growth ${cur.growth ?? 'n/a'}, inflation ${cur.inflation ?? 'n/a'}).`)
  } catch { /* ignore */ }

  // 3) Topic-gated specialized data (only fetched when the question is about it,
  //    to keep latency low while covering rates, real estate, debt, geopolitics, P/E…).
  const topicFetches: Promise<void>[] = []
  const wants = (...kw: string[]) => kw.some(k => q.includes(k))

  // Treasury yields / yield curve
  if (wants('yield', 'treasury', 'bond', 'curve', 'rates', '10y', '2y', 'duration', 'tassi', 'rendiment', 'obbligazion', 'btp', 'bund')) {
    topicFetches.push((async () => {
      const y = await fetchJson('/api/visual-ai/yields', 8000)
      const rows = y?.data
      if (Array.isArray(rows) && rows.length) {
        const us = rows.map((r: any) => `${r.maturity} ${typeof r.us === 'number' ? r.us.toFixed(2) + '%' : 'n/a'}`).join(', ')
        parts.push('US Treasury yield curve: ' + us + '.')
      }
    })())
  }
  // Real estate / housing
  if (wants('real estate', 'housing', 'home', 'mortgage', 'property', 'reit', 'immobil', 'case', 'mutu')) {
    topicFetches.push((async () => {
      const re = await fetchJson('/api/visual-ai/real-estate', 8000)
      const s = re?.summary || re?.data || re
      if (s) parts.push('Real estate / housing snapshot: ' + JSON.stringify(s).slice(0, 900) + '.')
    })())
  }
  // Government / national debt
  if (wants('debt', 'deficit', 'borrowing', 'fiscal', 'debito')) {
    topicFetches.push((async () => {
      const d = await fetchJson('/api/visual-ai/debt', 8000)
      const s = d?.summary || d?.data || d
      if (s) parts.push('Government debt / fiscal snapshot: ' + JSON.stringify(s).slice(0, 900) + '.')
    })())
  }
  // Wars / geopolitics
  if (wants('war', 'geopolit', 'conflict', 'sanction', 'russia', 'ukraine', 'china', 'iran', 'israel', 'middle east', 'guerra', 'tariff', 'trade war')) {
    topicFetches.push((async () => {
      const g = await fetchJson('/api/visual-ai/geopolitical-risk', 8000)
      const s = g?.summary || g?.data || g
      if (s) parts.push('Geopolitical risk snapshot: ' + JSON.stringify(s).slice(0, 900) + '.')
    })())
  }
  // Valuations / P/E
  if (wants('p/e', 'pe ratio', 'valuation', 'multiple', 'overvalued', 'undervalued', 'earnings yield', 'forward pe', 'pe forward', 'valutazion', 'multipli', 'sopravvalutat', 'sottovalutat')) {
    topicFetches.push((async () => {
      const pe = await fetchJson('/api/visual-ai/pe-predictor', 8000)
      const s = pe?.summary || pe?.data || pe
      if (s) parts.push('Valuation / P/E snapshot: ' + JSON.stringify(s).slice(0, 900) + '.')
    })())
  }
  // Fed / monetary policy
  if (wants('fed', 'fomc', 'rate cut', 'rate hike', 'powell', 'monetary', 'central bank', 'bce', 'banca centrale', 'taglio tassi', 'rialzo tassi')) {
    topicFetches.push((async () => {
      const fw = await fetchJson('/api/fed-watch', 8000)
      const s = fw?.data || fw
      if (s) parts.push('Fed Watch (rate-path probabilities): ' + JSON.stringify(s).slice(0, 700) + '.')
    })())
  }
  // Recession / cycle risk
  if (wants('recession', 'slowdown', 'downturn', 'hard landing', 'soft landing', 'recessione', 'rallentamento')) {
    topicFetches.push((async () => {
      const rec = await fetchJson('/api/recession-index', 8000)
      const s = rec?.data || rec
      if (s) parts.push('Recession indicators: ' + JSON.stringify(s).slice(0, 700) + '.')
    })())
  }
  // Commodities complex
  if (wants('commodit', 'oil', 'gold', 'silver', 'copper', 'gas', 'wheat', 'crude', 'brent', 'petrolio', 'oro', 'argento', 'rame', 'grano', 'materie prime', 'energia')) {
    topicFetches.push((async () => {
      const syms = ['GC=F', 'SI=F', 'CL=F', 'BZ=F', 'NG=F', 'HG=F', 'PL=F', 'ZW=F', 'ZC=F', 'ZS=F']
      const names: Record<string, string> = { 'GC=F': 'Gold', 'SI=F': 'Silver', 'CL=F': 'WTI', 'BZ=F': 'Brent', 'NG=F': 'NatGas', 'HG=F': 'Copper', 'PL=F': 'Platinum', 'ZW=F': 'Wheat', 'ZC=F': 'Corn', 'ZS=F': 'Soybeans' }
      const qs = await withTimeout(getYahooQuotes(syms), 8000).catch(() => [] as any[])
      if (Array.isArray(qs) && qs.length) {
        parts.push('Commodities: ' + qs.map((c: any) => `${names[c.ticker] || c.ticker} ${price(c.price)} (${pct(c.changePercent)})`).join('; ') + '.')
      }
    })())
  }
  // Banks / financials
  if (wants('bank', 'banche', 'banca', 'banking', 'financial sector', 'credit suisse', 'lending')) {
    topicFetches.push((async () => {
      const qs = await withTimeout(getYahooQuotes(['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'XLF', 'KRE']), 8000).catch(() => [] as any[])
      if (Array.isArray(qs) && qs.length) {
        parts.push('Banks & financials: ' + qs.map((c: any) => `${c.ticker} ${price(c.price)} (${pct(c.changePercent)})`).join('; ') + '.')
      }
    })())
  }
  // Inflation detail (breakevens on top of the CPI already in the macro block)
  if (wants('inflation', 'inflazione', 'cpi', 'ppi', 'prezzi', 'breakeven', 'pce')) {
    topicFetches.push((async () => {
      const [t10, t5] = await Promise.all([
        fetchJson('/api/fred-history?series=T10YIE&range=1y', 7000),
        fetchJson('/api/fred-history?series=T5YIE&range=1y', 7000),
      ])
      const last = (j: any) => { const b = j?.data?.bars; return Array.isArray(b) && b.length ? b[b.length - 1].close : null }
      const v10 = last(t10), v5 = last(t5)
      if (v10 != null || v5 != null) parts.push(`Inflation expectations (breakevens): 5Y ${v5 != null ? v5.toFixed(2) + '%' : 'n/a'}, 10Y ${v10 != null ? v10.toFixed(2) + '%' : 'n/a'}.`)
    })())
  }
  // Earnings season (market-wide beats/misses)
  if (wants('earning', 'earnings', 'utili', 'trimestral', 'eps', 'yerning', 'risultati', 'reporting season')) {
    topicFetches.push((async () => {
      const er = await fetchJson('/api/earnings-results', 9000)
      const sum = er?.summary
      const rows = er?.data
      if (sum) parts.push(`Earnings season (last 7 days): ${JSON.stringify(sum).slice(0, 400)}.`)
      if (Array.isArray(rows) && rows.length) {
        const top = rows.slice(0, 8).map((r: any) => `${r.symbol} EPS ${r.epsActual ?? r.eps ?? 'n/a'} vs est ${r.epsEstimate ?? r.estimate ?? 'n/a'} (${r.surprisePct != null ? (r.surprisePct > 0 ? '+' : '') + Number(r.surprisePct).toFixed(1) + '%' : 'n/a'})`).join('; ')
        parts.push('Recent reports: ' + top + '.')
      }
    })())
  }
  // PMI / ISM business surveys
  if (wants('pmi', 'ism', 'manufacturing survey', 'business confidence', 'fiducia delle imprese', 'new orders')) {
    topicFetches.push((async () => {
      const p = await fetchJson('/api/visual-ai/pmi', 8000)
      const s = p?.data || p
      if (s) parts.push('PMI / ISM surveys: ' + JSON.stringify(s).slice(0, 800) + '.')
    })())
  }
  // Generic macro-indicator lookup: any FRED series from the catalog whose
  // keywords appear in the question gets its latest value (+YoY/MoM) included.
  {
    const matched: MacroDef[] = []
    for (const def of MACRO_CATALOG) {
      if (def.kw.some(k => q.includes(k)) && !matched.some(m => m.id === def.id)) matched.push(def)
      if (matched.length >= 8) break
    }
    if (matched.length) {
      topicFetches.push((async () => {
        const results = await Promise.all(matched.map(async (def) => {
          const j = await fetchJson(`/api/fred-history?series=${def.id}&range=3y`, 7000)
          const b = j?.data?.bars
          if (!Array.isArray(b) || !b.length) return null
          const last = b[b.length - 1]
          const val = last.close
          let out = `${def.label}: ${def.unit === 'pct' ? `${Number(val).toFixed(2)}%` : Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
          const lastTs = last.time
          if (def.yoy) {
            const target = lastTs - 365 * 86400
            const prev = b.reduce((best: any, bar: any) => Math.abs(bar.time - target) < Math.abs(best.time - target) ? bar : best, b[0])
            if (prev?.close) out += ` (YoY ${pct(((val - prev.close) / prev.close) * 100)})`
          }
          if (def.mom && b.length > 1) {
            const prev = b[b.length - 2]
            out += ` (last change ${(val - prev.close) >= 0 ? '+' : ''}${(val - prev.close).toLocaleString('en-US', { maximumFractionDigits: 0 })})`
          }
          return out
        }))
        const ok = results.filter(Boolean) as string[]
        if (ok.length) parts.push('Macro indicators (FRED, latest): ' + ok.join(' | ') + '.')
      })())
    }
  }
  if (topicFetches.length) { try { await Promise.all(topicFetches) } catch { /* ignore */ } }

  // 4) Live quotes + technicals + fundamentals for tickers mentioned in the question.
  const tickers = extractTickers(question)
  if (tickers.length) {
    try {
      const quotes = await withTimeout(getYahooQuotes(tickers), 9000).catch(() => [])
      if (Array.isArray(quotes) && quotes.length) {
        parts.push('Quotes for mentioned symbols: ' + quotes.map((q: any) =>
          `${q.ticker} ${q.name ? `(${q.name}) ` : ''}${price(q.price)} ${pct(q.changePercent)} vol ${q.volume?.toLocaleString?.('en-US') || 'n/a'}`
        ).join('; ') + '.')
      }
      // Detailed technicals for up to 3 of them.
      const techs = await Promise.all(tickers.slice(0, 3).map(t => fetchTechnical(t)))
      for (const t of techs) if (t) parts.push(t)
      // Valuation snapshot (mcap, P/E, forward P/E, EPS, 52w range) — cheap, own API.
      const ext = await fetchJson(`/api/yahoo-extended-quotes?symbols=${encodeURIComponent(tickers.slice(0, 6).join(','))}`, 8000)
      if (Array.isArray(ext?.data) && ext.data.length) {
        parts.push('Valuation snapshot: ' + ext.data.map((r: any) =>
          `${r.symbol}: mcap ${big(r.marketCap)}, P/E ${r.trailingPE != null ? Number(r.trailingPE).toFixed(1) : 'n/a'}, fwd P/E ${r.forwardPE != null ? Number(r.forwardPE).toFixed(1) : 'n/a'}, EPS(ttm) ${r.epsTrailingTwelveMonths ?? 'n/a'}, 52w ${price(r.fiftyTwoWeekLow)}–${price(r.fiftyTwoWeekHigh)}${r.sector ? `, ${r.sector}` : ''}`
        ).join('; ') + '.')
      }
      // Deep fundamentals (cash flow, FCF, capex, margins, PEG, dividends) when asked.
      if (wants('fundament', 'capex', 'cash flow', 'fcf', 'free cash', 'flusso di cassa', 'cassa', 'margin', 'margini', 'fatturato', 'ricavi', 'revenue', 'buyback', 'debt', 'debito', 'pe', 'p/e', 'forward', 'valuation', 'valutazion', 'utili', 'earning', 'eps', 'yerning', 'dividend', 'dividendi', 'cedol', 'roe', 'ebitda', 'peg', 'target')) {
        const funds = await Promise.all(tickers.slice(0, 3).map(t => fetchFundamentals(t)))
        for (const f of funds) if (f) parts.push(f)
      }
      // Per-ticker earnings history + dividends when asked.
      if (wants('earning', 'earnings', 'utili', 'trimestral', 'eps', 'yerning', 'risultati', 'dividend', 'dividendi', 'cedol')) {
        const es = await Promise.all(tickers.slice(0, 3).map(t => fetchJson(`/api/symbol-earnings?symbol=${encodeURIComponent(t)}`, 8000)))
        es.forEach((j, i) => {
          const rows = j?.data || []
          if (rows.length) {
            parts.push(`${tickers[i]} recent earnings: ` + rows.slice(0, 4).map((r: any) =>
              `${r.date} EPS ${r.eps ?? 'n/a'} vs est ${r.estimate ?? 'n/a'}${r.surprisePct != null ? ` (${r.surprisePct > 0 ? '+' : ''}${r.surprisePct}% surprise)` : ''}`
            ).join('; ') + '.')
          }
          const divs = j?.dividends || []
          if (divs.length) {
            const lastDiv = divs[divs.length - 1]
            const yr = divs.filter((d: any) => d.date >= new Date(Date.now() - 366 * 86400000).toISOString().slice(0, 10))
            const annual = yr.reduce((s: number, d: any) => s + (d.amount || 0), 0)
            parts.push(`${tickers[i]} dividends: last $${lastDiv.amount ?? 'n/a'} on ${lastDiv.date}; ~$${annual.toFixed(2)}/share paid in the last 12 months (${yr.length} payments).`)
          }
        })
      }
    } catch { /* ignore */ }
  }

  // 5) Whatever extra context the client passed (e.g. on-screen snapshot).
  if (clientContext) {
    try {
      const c = typeof clientContext === 'string' ? clientContext : JSON.stringify(clientContext)
      if (c && c.length > 4) parts.push('Client-provided on-screen context:\n' + c.slice(0, 3000))
    } catch { /* ignore */ }
  }

  return parts.join('\n\n')
}

// Lightweight diagnostic: GET /api/econoai/chat → which AI providers the server can see.
// Never exposes key values, only whether each env var is present.
export async function GET() {
  const providers = {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
  }
  const anyConfigured = providers.anthropic || providers.openai || providers.groq
  const active = providers.anthropic ? 'anthropic' : providers.openai ? 'openai' : providers.groq ? 'groq' : 'none'
  const res = NextResponse.json({
    ok: anyConfigured,
    active,
    providers,
    message: anyConfigured
      ? `AI is configured. Active provider: ${active}.`
      : 'No AI provider configured. Add GROQ_API_KEY (free) or OPENAI_API_KEY / ANTHROPIC_API_KEY in Vercel env, then redeploy.',
    timestamp: new Date().toISOString(),
  })
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export async function POST(req: NextRequest) {
  let parsedQuestion = ''
  let liveCtxForRetry = ''
  try {
    // Server-side premium gate — AI calls cost money; UI gating is not enough.
    const gate = await requirePremium(req)
    if (!gate.ok) return gate.response

    const { question, userId, context } = await req.json()
    parsedQuestion = question || ''
    const usedContextFlag = Boolean(context)

    console.log('🎯 EconoAI request received:', { 
      question: question?.substring(0, 100), 
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString()
    })

    // Basic rate limiting per IP (generous for testing/demo)
    const ip = getClientIp(req as unknown as Request)
    const rl = rateLimit(`econoai:${ip}`, 100, 60_000) // 100 req/min per IP
    if (!rl.ok) {
      const res = NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
      const headers = rateLimitHeaders(rl)
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    if (!question || typeof question !== 'string') {
      console.error('❌ Invalid question format')
      const res = NextResponse.json({ error: 'Question is required' }, { status: 400 })
      const headers = rateLimitHeaders(rl)
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    // Utility: build a successful fallback response (always 200 so UI keeps working)
    const fallbackResponse = (reason: string) => {
      const res = NextResponse.json({
        answer:
          'Here’s a quick, framework-based analysis while the live AI is initializing: \n\n' +
          '- Summary: Based on typical market conditions, consider focusing on trend strength, earnings momentum, and key support/resistance levels.\n' +
          '- What to watch: S&P 500, VIX, 10Y yield, USD, sector rotation (Tech vs. Energy/Financials).\n' +
          '- Next steps: Define time horizon, set risk limits, and identify 2–3 catalysts that could change the thesis.\n\n' +
          '(AI live answer will be enabled shortly.)',
        question,
        usedContext: usedContextFlag,
        fallback: true,
        reason,
        timestamp: new Date().toISOString(),
      })
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    // If no AI provider is configured, return graceful fallback
    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) {
      console.error('❌ No AI provider configured (need ANTHROPIC_API_KEY, OPENAI_API_KEY or GROQ_API_KEY)')
      const res = fallbackResponse('openai_not_configured')
      const headers = rateLimitHeaders(rl)
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    const { client: aiClient, model: primaryModel, fallbackModel, provider } = getAIClient()
    console.log(`✅ AI client initialized (${provider}: ${primaryModel})`)

    // Build a real, up-to-date market data context server-side (best-effort, time-boxed).
    let liveContext = ''
    try {
      liveContext = await withTimeout(buildLiveContext(req, question, context), 22000)
      liveCtxForRetry = liveContext
      console.log(`📡 Live context built (${liveContext.length} chars)`)
    } catch (e: any) {
      console.warn('⚠️ Live context build failed/timed out:', e?.message)
    }

  // System prompt for financial analysis
  const systemPrompt = `You are EconoAI, an expert financial analyst and market strategist at EconoPulse with 20+ years of Wall Street experience. You provide comprehensive market intelligence across ALL asset classes and market topics.

YOUR EXPERTISE COVERS:
📊 Equities: Individual stocks, sectors, indices (S&P 500, Nasdaq, Dow, Russell 2000, international markets)
📈 Market Analysis: Daily market movements, trends, sentiment, technical levels, volume analysis
💰 Asset Classes: Bonds, commodities (gold, oil, copper), currencies (forex), cryptocurrencies
🌍 Global Markets: US, Europe, Asia, emerging markets, cross-market correlations
📰 News & Events: Earnings, Fed meetings, economic data, geopolitical events, policy changes
⚠️ Risk Analysis: Volatility (VIX), drawdowns, correlations, tail risks, sector rotations
💼 Portfolio Strategy: Asset allocation, diversification, hedging, rebalancing
📉 Economic Indicators: GDP, inflation (CPI/PPI), employment, PMI, consumer confidence, housing
🏦 Fed & Monetary Policy: Interest rates, Fed funds, QE/QT, yield curve, FOMC decisions
🔮 Forecasts & Outlook: Short/medium/long term scenarios, bull/bear cases, probability assessments

ANSWER EVERY QUESTION TYPE:
- "What's happening today?" → Analyze current market action (assume S&P, key sectors, VIX, yields)
- "What are the risks?" → Identify current market risks (technical, fundamental, macro, geopolitical)
- "Should I buy X?" → Provide balanced analysis with entry levels, risks, alternatives
- "Compare X vs Y" → Side-by-side comparison with metrics, scenarios, recommendations
- "Outlook for [sector/stock/market]?" → Technical + fundamental + macro analysis with levels
- "Portfolio review" → Assess allocation, risk, diversification, suggest improvements
- Any other market question → Provide expert, data-driven, actionable answer

RESPONSE FORMAT:
✅ Start with direct answer (1-2 sentences summary)
📊 Main analysis (2-3 concise paragraphs with specific data/levels/metrics)
🎯 Actionable takeaway (clear next steps or key levels to watch)
⚠️ Risk disclaimer (1 sentence: educational only, DYOR)

TONE & STYLE:
- Professional yet accessible (like Bloomberg + WSJ combined)
- Use specific numbers, percentages, price levels, dates
- Reference current market context (VIX ~15, 10Y yield ~4.5%, etc)
- Acknowledge uncertainty honestly ("If X happens... if Y happens...")
- Be decisive but balanced (bull case + bear case)
- NO generic fluff - every sentence must add value

CRITICAL: Answer EVERY question asked, even if you need to make reasonable market assumptions based on typical conditions. Never say "I don't have real-time data" - provide framework-based analysis instead.

YOU CAN ANSWER ANY ECONOMIC/FINANCIAL TOPIC. The live data feed routinely includes: economy & macroeconomics, GDP growth, CPI/inflation + breakeven expectations, unemployment/labor, the Fed & rate path, consumer sentiment & retail sales/consumption, housing/real estate, industrial production, government debt & fiscal deficits, corporate earnings (market-wide beats/misses AND per-ticker EPS history vs estimates), dividends (per-ticker history & yield), company fundamentals (revenue, margins, operating/free cash flow, capex, cash, debt, EBITDA, ROE, P/E, forward P/E, PEG, payout, analyst targets), commodities (gold, silver, oil, gas, copper, grains), banks & financials, P/E & valuations, Treasury yields & the yield curve, recession indicators, geopolitics/wars/sanctions/tariffs, market indices, sectors, movers, and breaking news. Use whichever of these are present to answer thoroughly. Never refuse a topic — if the user asks about economy, wars, debt, real estate, consumption, earnings, dividends, capex, cash flow, P/E, GDP, indicators or comparisons, answer it with the data provided plus your framework. The user may write in Italian — always answer in the user's language.

USING LIVE DATA (highest priority):
- A message labeled "LIVE MARKET DATA" contains REAL, up-to-the-minute numbers fetched from the market and the economy (index levels, % changes, sector performance, top movers, US macro from FRED — GDP, inflation, unemployment, Fed funds, consumer sentiment, retail sales, housing starts, industrial production — plus topic snapshots for yields, real estate, debt, geopolitical risk, valuations/P-E, Fed Watch and recession indicators, the specific quotes/technicals for any ticker mentioned, and the latest news headlines).
- You MUST anchor your answer to these exact numbers. Quote the real price, % change, GDP, CPI, unemployment, Fed funds, yields, RSI, moving averages, 52-week range, and cite the actual headlines provided.
- Do NOT invent or estimate values that are present in the LIVE MARKET DATA — use them verbatim.
- If a specific number the user asks about is genuinely missing from the live data, say what you do have and clearly flag the single missing piece, then give framework analysis for just that gap.
- When you cite a level or move, make clear it is current/real ("currently trading at …", "today …").

If the user provided context, you MUST incorporate it precisely. Context can include: recent market summary, macro indicators, key levels, and top headlines. Prioritize accuracy from context.

When helpful, structure the output JSON-like sections:
{
  "summary": "2-line takeaway",
  "market": { "levels": ["S&P 500 ~","VIX ~","10Y ~"], "sectors": ["..."], "flows": ["..."] },
  "macro": { "cycle": "...", "inflation": "...", "labor": "..." },
  "news": [ { "title": "...", "why": "impact" } ],
  "scenarios": [ { "if": "...", "then": "..." } ],
  "risks": ["..."],
  "actions": ["level to watch", "hedge idea", "timing note"]
}
Keep prose crisp and professional.`

    let completion: any
    const TIMEOUT_MS = 45000
    try {
      // Primary attempt
      completion = await withTimeout(
        aiClient.chat.completions.create({
        model: primaryModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...(liveContext ? [{ role: 'user' as const, content: `LIVE MARKET DATA (real, current — use these exact numbers):\n${liveContext}` }] : []),
          { role: 'user', content: question }
        ],
        temperature: 0.8, // Slightly higher for more nuanced financial analysis
        max_tokens: 1000, // More space for comprehensive answers
        presence_penalty: 0.1, // Encourage varied responses
        frequency_penalty: 0.1, // Reduce repetition
      }),
        TIMEOUT_MS
      )
    } catch (err: any) {
      // Retry on model not found / no access / invalid model id
      const isModelNotFound = err?.status === 404 || err?.code === 'model_not_found' || /model .* does not exist|invalid model|unexpected value.*model|not_found_error/i.test(err?.message || '');
      // If timed out, return fallback
      if (err?.message === 'openai_timeout') {
        console.warn(`⏳ OpenAI request timed out after ${TIMEOUT_MS}ms, returning fallback`)
        const res = fallbackResponse('openai_timeout')
        const headers = rateLimitHeaders(rl)
        Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
        return res
      }
      if (!isModelNotFound) throw err;
      console.warn(`Model ${primaryModel} unavailable, retrying with ${fallbackModel}...`);
      completion = await withTimeout(
        aiClient.chat.completions.create({
        model: fallbackModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...(liveContext ? [{ role: 'user' as const, content: `LIVE MARKET DATA (real, current — use these exact numbers):\n${liveContext}` }] : []),
          { role: 'user', content: question }
        ],
        temperature: 0.8,
        max_tokens: 1000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
        TIMEOUT_MS
      );
    }

    const answer = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    // Log successful response for monitoring
    console.log('✅ EconoAI response generated:', {
      userId: userId || 'anonymous',
      questionLength: question.length,
      answerLength: answer.length,
      model: completion.model,
      tokensUsed: completion.usage?.total_tokens || 0,
      timestamp: new Date().toISOString()
    })

    const res = NextResponse.json({
      answer,
      question,
      usedContext: usedContextFlag,
      timestamp: new Date().toISOString(),
      model: completion.model,
      usage: completion.usage
    })
  const headers = rateLimitHeaders(rl)
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
    res.headers.set('Cache-Control', 'no-store')
    return res

  } catch (error: any) {
    console.error('❌ EconoAI API error:', {
      message: error?.message,
      status: error?.status,
      type: error?.type,
      code: error?.code,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n')
    })

    // OpenAI out of credit → route future requests straight to Groq for 15 min.
    if (error?.code === 'insufficient_quota' || /exceeded your current quota/i.test(error?.message || '')) {
      openaiQuotaBlockUntil = Date.now() + 15 * 60 * 1000
    }

    // Any provider error (429 rate limit, 404/400 bad model, 5xx outage):
    // try every other configured provider before giving a canned fallback,
    // so the chat ALWAYS answers when at least one provider works.
    {
      // Rate limited – try cross-provider failover (e.g. OpenAI → Groq) and smaller models.
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

      // Build candidate (client, model) pairs in order: alternate provider first, then own fallback.
      const candidates: Array<{ client: OpenAI; model: string; label: string }> = [];
      if (process.env.GROQ_API_KEY) {
        const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
        candidates.push({ client: groq, model: 'llama-3.3-70b-versatile', label: 'groq:llama-3.3-70b' });
        candidates.push({ client: groq, model: 'openai/gpt-oss-120b', label: 'groq:gpt-oss-120b' });
        candidates.push({ client: groq, model: 'llama-3.1-8b-instant', label: 'groq:llama-3.1-8b' });
      }
      if (process.env.OPENAI_API_KEY) {
        const oa = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        candidates.push({ client: oa, model: 'gpt-4o-mini', label: 'openai:gpt-4o-mini' });
      }
      if (process.env.ANTHROPIC_API_KEY) {
        const claude = new OpenAI({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: 'https://api.anthropic.com/v1/' });
        candidates.push({ client: claude, model: process.env.ANTHROPIC_FALLBACK_MODEL || 'claude-3-5-haiku-latest', label: 'anthropic:claude-haiku' });
      }

      for (let i = 0; i < candidates.length; i++) {
        const { client, model, label } = candidates[i];
        const waitMs = i === 0 ? 0 : 1500;
        if (waitMs) await delay(waitMs);
        console.warn(`429 failover attempt #${i + 1} via ${label}`);
        try {
          const retryCompletion = await withTimeout(
            client.chat.completions.create({
              model,
              messages: [
                { role: 'system', content: 'You are EconoAI, an expert financial analyst. Answer concisely with specific data, levels, and actionable takeaways. Always answer the question directly. If LIVE MARKET DATA is provided, anchor your answer to those exact real numbers and headlines.' },
                ...(liveCtxForRetry ? [{ role: 'user' as const, content: `LIVE MARKET DATA (real, current — use these exact numbers):\n${liveCtxForRetry}` }] : []),
                { role: 'user', content: parsedQuestion || 'market overview' }
              ],
              temperature: 0.7,
              max_tokens: 700,
            }),
            18000
          )
          const retryAnswer = retryCompletion.choices[0]?.message?.content
          if (retryAnswer) {
            return NextResponse.json({
              answer: retryAnswer,
              question: parsedQuestion,
              usedContext: false,
              timestamp: new Date().toISOString(),
              model: label,
            }, { status: 200 })
          }
        } catch (retryErr: any) {
          console.warn(`Failover ${label} failed:`, retryErr?.status, retryErr?.message)
        }
      }
      if (error?.status === 429) {
        return NextResponse.json({
          answer: 'High demand right now. Quick actionable view: clarify your time horizon, define key levels, and manage size while activity normalizes. Try again shortly for a full AI response.',
          question: 'rate_limited',
          usedContext: false,
          fallback: true,
          reason: 'rate_limited',
          timestamp: new Date().toISOString(),
        }, { status: 200 })
      }
    }

    if (error?.code === 'insufficient_quota' || /exceeded your current quota/i.test(error?.message || '')) {
      return NextResponse.json({
        answer: 'EconoAI is temporarily offline: the AI provider capacity has been exhausted and is being restored. Live market data on this page keeps updating — please try the chat again later.',
        question: 'quota_exhausted',
        usedContext: false,
        fallback: true,
        reason: 'insufficient_quota',
        timestamp: new Date().toISOString(),
      }, { status: 200 })
    }

    if (error?.status === 401 || error?.message?.includes('API key')) {
      return NextResponse.json({
        answer: 'Authentication issue with AI provider. Meanwhile, here’s a structured framework: summarize current trend, watch support/resistance, and align with macro (rates, USD).',
        question: 'auth_issue',
        usedContext: false,
        fallback: true,
        reason: 'auth_error',
        timestamp: new Date().toISOString(),
      }, { status: 200 })
    }

    if (error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT' || error?.message === 'openai_timeout') {
      return NextResponse.json({
        answer:
          'Quick market framework while network is unstable: focus on trend, breadth, and macro levels (10Y yield, USD). Consider staged entries and clear risk limits until connectivity stabilizes.',
        question: 'network_recovery',
        usedContext: false,
        fallback: true,
        reason: 'network_error',
        timestamp: new Date().toISOString(),
      }, { status: 200 })
    }

    // Unknown error: still provide a soft fallback so UX doesn't break
    return NextResponse.json({
      answer: 'Temporary issue processing your request. Here is a quick guidance: define your time horizon, identify catalysts, and watch key support/resistance. Try again shortly for a full AI answer',
      question: 'unknown_error',
      usedContext: false,
      fallback: true,
      reason: 'unknown_error',
      timestamp: new Date().toISOString(),
    }, { status: 200 })
  }
}
