// Polygon.io Market Data Client
// Supporta equities, forex, crypto con rotazione API keys e rate limiting

interface PolygonQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  timestamp: string;
  source: string;
}

interface PolygonPrevDayResult {
  T: string;   // ticker
  o: number;   // open
  h: number;   // high
  l: number;   // low
  c: number;   // close
  v: number;   // volume
  vw: number;  // volume-weighted avg price
  t: number;   // timestamp ms
}

interface PolygonSnapshotTicker {
  ticker: string;
  todaysChange: number;
  todaysChangePerc: number;
  day: { o: number; h: number; l: number; c: number; v: number; vw: number };
  prevDay: { o: number; h: number; l: number; c: number; v: number; vw: number };
  lastTrade?: { p: number; s: number; t: number };
  min?: { o: number; h: number; l: number; c: number; v: number; vw: number };
}

interface PolygonOptionContract {
  ticker: string;
  underlying: string;
  strike: number;
  expiration: string;
  contractType: 'call' | 'put';
  openInterest: number;
  volume: number;
  lastPrice: number;
  impliedVolatility: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
}

interface PolygonOptionsMetrics {
  symbol: string;
  underlyingPrice: number;
  totalCallVolume: number;
  totalPutVolume: number;
  totalCallOI: number;
  totalPutOI: number;
  putCallVolumeRatio: number | null;
  putCallOIRatio: number | null;
  gex: number | null;
  gexLabel: 'Low' | 'Medium' | 'High' | 'Extreme';
  ivCall25d: number | null;
  ivPut25d: number | null;
  callSkew: 'Call Skew' | 'Put Skew' | 'Neutral';
  atmVolumeShare: number | null;
  otmVolumeShare: number | null;
  contractCount: number;
  dataSource: 'polygon';
}

// Mapping comuni per nomi leggibili
const TICKER_NAMES: Record<string, string> = {
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corp.',
  'GOOGL': 'Alphabet Inc.',
  'AMZN': 'Amazon.com Inc.',
  'TSLA': 'Tesla Inc.',
  'META': 'Meta Platforms',
  'NVDA': 'NVIDIA Corp.',
  'SPY': 'S&P 500 ETF',
  'QQQ': 'Nasdaq 100 ETF',
  'VTI': 'Vanguard Total Market',
  'DIA': 'Dow Jones ETF',
  'IWM': 'Russell 2000 ETF',
  'GLD': 'Gold ETF',
  'SLV': 'Silver ETF',
  'USO': 'Oil ETF',
  'TLT': 'Treasury Bond ETF',
  'XLF': 'Financial Sector',
  'XLK': 'Technology Sector',
  'XLE': 'Energy Sector',
  'XLV': 'Healthcare Sector',
  'XLI': 'Industrial Sector',
  'XLP': 'Consumer Staples',
  'XLY': 'Consumer Discretionary',
  'XLU': 'Utilities Sector',
  'XLB': 'Materials Sector',
  'XLRE': 'Real Estate Sector',
};

class PolygonClient {
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private lastCallTime: number = 0;
  private readonly MIN_CALL_INTERVAL = 12500; // 5 calls/min = 1 ogni 12s (free tier)
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 min cache

  constructor() {
    this.apiKeys = [
      process.env.POLYGON_API_KEY || '',
      process.env.POLYGON_API_KEY_2 || '',
    ].filter(Boolean);

    if (this.apiKeys.length === 0) {
      console.warn('⚠️ No Polygon API keys configured');
    } else {
      console.log(`✅ PolygonClient initialized with ${this.apiKeys.length} API key(s)`);
    }
  }

  get isConfigured(): boolean {
    return this.apiKeys.length > 0;
  }

  private getNextKey(): string {
    if (this.apiKeys.length === 0) throw new Error('No Polygon API keys configured');
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallTime;
    if (elapsed < this.MIN_CALL_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, this.MIN_CALL_INTERVAL - elapsed));
    }
    this.lastCallTime = Date.now();
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && (Date.now() - entry.timestamp) < this.CACHE_TTL) {
      return entry.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Previous day aggregate per un singolo ticker
  async getPreviousDay(ticker: string): Promise<PolygonQuote | null> {
    const cacheKey = `prev-${ticker}`;
    const cached = this.getCached<PolygonQuote>(cacheKey);
    if (cached) return cached;

    try {
      await this.throttle();
      const apiKey = this.getNextKey();
      const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/prev?adjusted=true&apiKey=${apiKey}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        console.warn(`Polygon prev day ${ticker}: HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const r: PolygonPrevDayResult = data.results[0];
        const quote: PolygonQuote = {
          symbol: ticker,
          name: TICKER_NAMES[ticker] || ticker,
          price: r.c,
          change: 0,
          changePercent: 0,
          volume: r.v,
          open: r.o,
          high: r.h,
          low: r.l,
          previousClose: r.c, // questo è il prev day close
          timestamp: new Date(r.t).toISOString(),
          source: 'Polygon'
        };
        this.setCache(cacheKey, quote);
        return quote;
      }

      return null;
    } catch (error) {
      console.warn(`Polygon prev day error for ${ticker}:`, error);
      return null;
    }
  }

  // Grouped daily bars - TUTTI i ticker in una sola chiamata (efficientissimo)
  async getGroupedDaily(date?: string): Promise<PolygonQuote[]> {
    const targetDate = date || this.getPreviousBusinessDay();
    const cacheKey = `grouped-${targetDate}`;
    const cached = this.getCached<PolygonQuote[]>(cacheKey);
    if (cached) return cached;

    try {
      await this.throttle();
      const apiKey = this.getNextKey();
      const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${targetDate}?adjusted=true&apiKey=${apiKey}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        console.warn(`Polygon grouped daily: HTTP ${response.status}`);
        return [];
      }

      const data = await response.json();

      if (data.results && Array.isArray(data.results)) {
        const quotes: PolygonQuote[] = data.results.map((r: PolygonPrevDayResult) => ({
          symbol: r.T,
          name: TICKER_NAMES[r.T] || r.T,
          price: r.c,
          change: r.c - r.o,
          changePercent: r.o > 0 ? ((r.c - r.o) / r.o) * 100 : 0,
          volume: r.v,
          open: r.o,
          high: r.h,
          low: r.l,
          previousClose: r.o, // approximation da open
          timestamp: new Date(r.t).toISOString(),
          source: 'Polygon'
        }));

        this.setCache(cacheKey, quotes);
        console.log(`✅ Polygon grouped daily: ${quotes.length} tickers for ${targetDate}`);
        return quotes;
      }

      return [];
    } catch (error) {
      console.warn('Polygon grouped daily error:', error);
      return [];
    }
  }

  // Snapshot di ticker specifici (richiede piano Starter+)
  async getSnapshots(tickers: string[]): Promise<PolygonQuote[]> {
    const cacheKey = `snap-${tickers.sort().join(',')}`;
    const cached = this.getCached<PolygonQuote[]>(cacheKey);
    if (cached) return cached;

    try {
      await this.throttle();
      const apiKey = this.getNextKey();
      const tickerParam = tickers.join(',');
      const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickerParam}&apiKey=${apiKey}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        // Snapshot potrebbe non essere disponibile su free tier, fallback a prev day
        if (response.status === 403) {
          console.warn('Polygon snapshots non disponibili (richiede piano a pagamento), uso prev day');
          return this.getPrevDayBatch(tickers);
        }
        return [];
      }

      const data = await response.json();

      if (data.tickers && Array.isArray(data.tickers)) {
        const quotes: PolygonQuote[] = data.tickers.map((t: PolygonSnapshotTicker) => ({
          symbol: t.ticker,
          name: TICKER_NAMES[t.ticker] || t.ticker,
          price: t.lastTrade?.p || t.day?.c || t.prevDay?.c || 0,
          change: t.todaysChange || 0,
          changePercent: t.todaysChangePerc || 0,
          volume: t.day?.v || 0,
          open: t.day?.o || t.prevDay?.o || 0,
          high: t.day?.h || t.prevDay?.h || 0,
          low: t.day?.l || t.prevDay?.l || 0,
          previousClose: t.prevDay?.c || 0,
          timestamp: new Date().toISOString(),
          source: 'Polygon'
        }));

        this.setCache(cacheKey, quotes);
        return quotes;
      }

      return [];
    } catch (error) {
      console.warn('Polygon snapshots error:', error);
      return this.getPrevDayBatch(tickers);
    }
  }

  // Batch di previous day - per free tier quando snapshots non disponibili
  async getPrevDayBatch(tickers: string[]): Promise<PolygonQuote[]> {
    const results: PolygonQuote[] = [];

    for (const ticker of tickers) {
      const quote = await this.getPreviousDay(ticker);
      if (quote) {
        results.push(quote);
      }
    }

    return results;
  }

  // Forex quotes da Polygon
  async getForexQuote(from: string, to: string): Promise<PolygonQuote | null> {
    const pair = `C:${from}${to}`;
    const cacheKey = `fx-${pair}`;
    const cached = this.getCached<PolygonQuote>(cacheKey);
    if (cached) return cached;

    try {
      await this.throttle();
      const apiKey = this.getNextKey();
      const url = `https://api.polygon.io/v2/aggs/ticker/${pair}/prev?adjusted=true&apiKey=${apiKey}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) return null;

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        const quote: PolygonQuote = {
          symbol: `${from}${to}=X`,
          name: `${from}/${to}`,
          price: r.c,
          change: r.c - r.o,
          changePercent: r.o > 0 ? ((r.c - r.o) / r.o) * 100 : 0,
          volume: r.v || 0,
          open: r.o,
          high: r.h,
          low: r.l,
          previousClose: r.o,
          timestamp: new Date(r.t).toISOString(),
          source: 'Polygon-Forex'
        };
        this.setCache(cacheKey, quote);
        return quote;
      }

      return null;
    } catch (error) {
      console.warn(`Polygon forex error ${from}/${to}:`, error);
      return null;
    }
  }

  // Crypto quotes da Polygon
  async getCryptoQuote(from: string, to: string = 'USD'): Promise<PolygonQuote | null> {
    const pair = `X:${from}${to}`;
    const cacheKey = `crypto-${pair}`;
    const cached = this.getCached<PolygonQuote>(cacheKey);
    if (cached) return cached;

    try {
      await this.throttle();
      const apiKey = this.getNextKey();
      const url = `https://api.polygon.io/v2/aggs/ticker/${pair}/prev?adjusted=true&apiKey=${apiKey}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) return null;

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        const quote: PolygonQuote = {
          symbol: `${from}-${to}`,
          name: `${from}/${to}`,
          price: r.c,
          change: r.c - r.o,
          changePercent: r.o > 0 ? ((r.c - r.o) / r.o) * 100 : 0,
          volume: r.v || 0,
          open: r.o,
          high: r.h,
          low: r.l,
          previousClose: r.o,
          timestamp: new Date(r.t).toISOString(),
          source: 'Polygon-Crypto'
        };
        this.setCache(cacheKey, quote);
        return quote;
      }

      return null;
    } catch (error) {
      console.warn(`Polygon crypto error ${from}/${to}:`, error);
      return null;
    }
  }

  // Fetch multi-asset: equities, forex e crypto in batch
  async getMultiAssetQuotes(options: {
    equities?: string[];
    forex?: [string, string][];      // es. [['EUR','USD'], ['GBP','USD']]
    crypto?: [string, string][];     // es. [['BTC','USD'], ['ETH','USD']]
  }): Promise<{
    equities: PolygonQuote[];
    forex: PolygonQuote[];
    crypto: PolygonQuote[];
    timestamp: string;
    source: string;
  }> {
    const results = {
      equities: [] as PolygonQuote[],
      forex: [] as PolygonQuote[],
      crypto: [] as PolygonQuote[],
      timestamp: new Date().toISOString(),
      source: 'Polygon.io'
    };

    // Equities: prova prima snapshots, poi fallback a prev day
    if (options.equities && options.equities.length > 0) {
      try {
        results.equities = await this.getSnapshots(options.equities);
      } catch {
        results.equities = await this.getPrevDayBatch(options.equities);
      }
    }

    // Forex
    if (options.forex && options.forex.length > 0) {
      for (const [from, to] of options.forex) {
        const quote = await this.getForexQuote(from, to);
        if (quote) results.forex.push(quote);
      }
    }

    // Crypto
    if (options.crypto && options.crypto.length > 0) {
      for (const [from, to] of options.crypto) {
        const quote = await this.getCryptoQuote(from, to);
        if (quote) results.crypto.push(quote);
      }
    }

    console.log(`✅ Polygon multi-asset: ${results.equities.length} equities, ${results.forex.length} forex, ${results.crypto.length} crypto`);
    return results;
  }

  // Utility: calcola il giorno lavorativo precedente
  private getPreviousBusinessDay(): string {
    const now = new Date();
    let daysBack = 1;
    const day = now.getDay();
    
    if (day === 0) daysBack = 2;      // Domenica → Venerdì
    else if (day === 1) daysBack = 3;  // Lunedì → Venerdì
    else if (day === 6) daysBack = 1;  // Sabato → Venerdì

    const target = new Date(now);
    target.setDate(target.getDate() - daysBack);
    return target.toISOString().split('T')[0];
  }

  // ========== OPTIONS CHAIN ==========

  // Get options contracts list for a ticker (with OI, volume, greeks)
  async getOptionsSnapshot(ticker: string): Promise<PolygonOptionContract[]> {
    const cacheKey = `opts-snap-${ticker}`;
    const cached = this.getCached<PolygonOptionContract[]>(cacheKey);
    if (cached) return cached;

    try {
      await this.throttle();
      const apiKey = this.getNextKey();
      // Snapshot endpoint: requires Starter+ plan. Returns full chain with greeks.
      const url = `https://api.polygon.io/v3/snapshot/options/${encodeURIComponent(ticker)}?limit=250&apiKey=${apiKey}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(12000),
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 403) {
          console.warn('Polygon options snapshot requires paid plan, falling back to contracts');
          return this.getOptionsContracts(ticker);
        }
        return [];
      }

      const data = await response.json();
      if (!data.results || !Array.isArray(data.results)) return [];

      const contracts: PolygonOptionContract[] = data.results.map((r: any) => ({
        ticker: r.details?.ticker || '',
        underlying: ticker,
        strike: r.details?.strike_price || 0,
        expiration: r.details?.expiration_date || '',
        contractType: r.details?.contract_type || 'call',
        openInterest: r.open_interest || 0,
        volume: r.day?.volume || 0,
        lastPrice: r.day?.close || r.last_quote?.midpoint || 0,
        impliedVolatility: r.implied_volatility || null,
        delta: r.greeks?.delta || null,
        gamma: r.greeks?.gamma || null,
        theta: r.greeks?.theta || null,
        vega: r.greeks?.vega || null,
      }));

      this.setCache(cacheKey, contracts);
      console.log(`✅ Polygon options snapshot for ${ticker}: ${contracts.length} contracts`);
      return contracts;
    } catch (error) {
      console.warn(`Polygon options snapshot error for ${ticker}:`, error);
      return this.getOptionsContracts(ticker);
    }
  }

  // Fallback: Get options contracts via reference endpoint (free tier compatible)
  async getOptionsContracts(ticker: string): Promise<PolygonOptionContract[]> {
    const cacheKey = `opts-ref-${ticker}`;
    const cached = this.getCached<PolygonOptionContract[]>(cacheKey);
    if (cached) return cached;

    try {
      await this.throttle();
      const apiKey = this.getNextKey();
      // Get nearest 2 expirations worth of contracts
      const today = new Date().toISOString().split('T')[0];
      const url = `https://api.polygon.io/v3/reference/options/contracts?underlying_ticker=${encodeURIComponent(ticker)}&expiration_date.gte=${today}&order=asc&limit=250&sort=expiration_date&apiKey=${apiKey}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) return [];

      const data = await response.json();
      if (!data.results || !Array.isArray(data.results)) return [];

      // Reference endpoint gives contract details but NOT live OI/volume/greeks
      // We need to enrich with prev-day aggs for each contract
      const contracts: PolygonOptionContract[] = data.results.map((r: any) => ({
        ticker: r.ticker || '',
        underlying: r.underlying_ticker || ticker,
        strike: r.strike_price || 0,
        expiration: r.expiration_date || '',
        contractType: r.contract_type || 'call',
        openInterest: 0,  // to be enriched
        volume: 0,
        lastPrice: 0,
        impliedVolatility: null,
        delta: null,
        gamma: null,
        theta: null,
        vega: null,
      }));

      // Enrich top contracts (nearest expirations, near ATM) with prev-day data
      // Group by expiration, pick the 2 nearest, then ±10 strikes around ATM
      const expirations = [...new Set(contracts.map(c => c.expiration))].sort();
      const nearExps = expirations.slice(0, 2);
      const nearContracts = contracts.filter(c => nearExps.includes(c.expiration));

      // Get underlying price for ATM filtering
      const quote = await this.getPreviousDay(ticker);
      const underlyingPrice = quote?.price || 0;

      // Filter to strikes within 15% of ATM
      const relevantContracts = underlyingPrice > 0 
        ? nearContracts.filter(c => Math.abs(c.strike - underlyingPrice) / underlyingPrice < 0.15)
        : nearContracts.slice(0, 50);

      // Batch enrich with prev-day aggs (respecting rate limits)
      for (const contract of relevantContracts.slice(0, 40)) {
        try {
          await this.throttle();
          const aggKey = this.getNextKey();
          const aggUrl = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(contract.ticker)}/prev?adjusted=true&apiKey=${aggKey}`;
          const aggRes = await fetch(aggUrl, {
            signal: AbortSignal.timeout(6000),
            headers: { 'Accept': 'application/json' }
          });
          if (aggRes.ok) {
            const aggData = await aggRes.json();
            if (aggData.results?.[0]) {
              const a = aggData.results[0];
              contract.volume = a.v || 0;
              contract.lastPrice = a.c || 0;
            }
          }
        } catch { /* skip individual contract errors */ }
      }

      this.setCache(cacheKey, relevantContracts);
      console.log(`✅ Polygon options contracts for ${ticker}: ${relevantContracts.length} enriched`);
      return relevantContracts;
    } catch (error) {
      console.warn(`Polygon options contracts error for ${ticker}:`, error);
      return [];
    }
  }

  // Get options aggregate metrics (P/C ratio, GEX, volume) for a ticker
  async getOptionsMetrics(ticker: string): Promise<PolygonOptionsMetrics | null> {
    const cacheKey = `opts-metrics-${ticker}`;
    const cached = this.getCached<PolygonOptionsMetrics>(cacheKey);
    if (cached) return cached;

    const contracts = await this.getOptionsSnapshot(ticker);
    if (!contracts.length) return null;

    let totalCallVol = 0, totalPutVol = 0;
    let totalCallOI = 0, totalPutOI = 0;
    let gex = 0;
    let atmVolume = 0, otmVolume = 0, totalVolume = 0;

    // Get underlying price
    const quote = await this.getPreviousDay(ticker);
    const price = quote?.price || 0;

    for (const c of contracts) {
      totalVolume += c.volume;
      const moneyness = price > 0 ? c.strike / price : 1;

      if (Math.abs(moneyness - 1) < 0.02) atmVolume += c.volume;
      else if (Math.abs(moneyness - 1) > 0.05) otmVolume += c.volume;

      if (c.contractType === 'call') {
        totalCallVol += c.volume;
        totalCallOI += c.openInterest;
        // GEX = OI × contractMultiplier × S² × gamma (dealer long calls)
        if (c.gamma && price > 0) {
          gex += c.openInterest * 100 * price * price * c.gamma;
        }
      } else {
        totalPutVol += c.volume;
        totalPutOI += c.openInterest;
        // Dealer short puts = short gamma
        if (c.gamma && price > 0) {
          gex -= c.openInterest * 100 * price * price * c.gamma;
        }
      }
    }

    const pcVolRatio = totalCallVol > 0 ? totalPutVol / totalCallVol : null;
    const pcOIRatio = totalCallOI > 0 ? totalPutOI / totalCallOI : null;
    const gexAbs = Math.abs(gex);
    const gexLabel: 'Low' | 'Medium' | 'High' | 'Extreme' = 
      gexAbs > 5e10 ? 'Extreme' : gexAbs > 1e10 ? 'High' : gexAbs > 1e9 ? 'Medium' : 'Low';

    // IV skew from 25-delta contracts
    const calls25 = contracts.filter(c => c.contractType === 'call' && c.delta && Math.abs(c.delta - 0.25) < 0.1);
    const puts25 = contracts.filter(c => c.contractType === 'put' && c.delta && Math.abs(Math.abs(c.delta) - 0.25) < 0.1);
    const avgCallIV = calls25.length > 0 ? calls25.reduce((s, c) => s + (c.impliedVolatility || 0), 0) / calls25.length : null;
    const avgPutIV = puts25.length > 0 ? puts25.reduce((s, c) => s + (c.impliedVolatility || 0), 0) / puts25.length : null;

    let callSkew: 'Call Skew' | 'Put Skew' | 'Neutral' = 'Neutral';
    if (avgCallIV && avgPutIV) {
      const diff = avgCallIV - avgPutIV;
      callSkew = diff > 0.02 ? 'Call Skew' : diff < -0.02 ? 'Put Skew' : 'Neutral';
    }

    const metrics: PolygonOptionsMetrics = {
      symbol: ticker,
      underlyingPrice: price,
      totalCallVolume: totalCallVol,
      totalPutVolume: totalPutVol,
      totalCallOI: totalCallOI,
      totalPutOI: totalPutOI,
      putCallVolumeRatio: pcVolRatio,
      putCallOIRatio: pcOIRatio,
      gex: isFinite(gex) ? gex : null,
      gexLabel,
      ivCall25d: avgCallIV,
      ivPut25d: avgPutIV,
      callSkew,
      atmVolumeShare: totalVolume > 0 ? atmVolume / totalVolume : null,
      otmVolumeShare: totalVolume > 0 ? otmVolume / totalVolume : null,
      contractCount: contracts.length,
      dataSource: 'polygon'
    };

    this.setCache(cacheKey, metrics);
    return metrics;
  }
}

// Singleton per riuso across routes
let polygonClientInstance: PolygonClient | null = null;

export function getPolygonClient(): PolygonClient {
  if (!polygonClientInstance) {
    polygonClientInstance = new PolygonClient();
  }
  return polygonClientInstance;
}

export type { PolygonQuote, PolygonOptionContract, PolygonOptionsMetrics };
export { PolygonClient };
