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
}

// Singleton per riuso across routes
let polygonClientInstance: PolygonClient | null = null;

export function getPolygonClient(): PolygonClient {
  if (!polygonClientInstance) {
    polygonClientInstance = new PolygonClient();
  }
  return polygonClientInstance;
}

export type { PolygonQuote };
export { PolygonClient };
