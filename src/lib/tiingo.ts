// Tiingo API Service for Financial Data - UNIFIED REAL DATA (server-only)
import { env } from './env';

export class TiingoService {
  private apiKey: string;
  private baseUrl = 'https://api.tiingo.com';

  constructor() {
    const key = env.TIINGO_API_KEY;
    if (!key) {
      throw new Error('TIINGO_API_KEY is not configured');
    }
    this.apiKey = key;
  }

  async getStockQuote(symbol: string) {
    try {
      const url = `${this.baseUrl}/tiingo/daily/${symbol}/prices?token=${this.apiKey}`;
      const response = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Tiingo API error for ${symbol}: ${response.status} - ${errorText}`);
        return null;
      }
      const data = await response.json();
      if (data && data.length > 0) {
        const quote = data[0];
        return {
          symbol,
          price: quote.close || quote.adjClose,
            change: quote.close - quote.open,
          changePercent: ((quote.close - quote.open) / quote.open) * 100,
          volume: quote.volume,
          high: quote.high,
          low: quote.low,
          open: quote.open,
          date: quote.date,
          source: 'Tiingo'
        };
      }
      return null;
    } catch (error) {
      console.warn(`❌ Error fetching data for ${symbol} from Tiingo:`, error);
      return null;
    }
  }

  async getHistoricalPrices(symbol: string, daysBack: number = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      const url = `${this.baseUrl}/tiingo/daily/${symbol}/prices?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&token=${this.apiKey}`;
      const response = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(6000) });
      if (!response.ok) return null;
      const data = await response.json();
      return data.map((item: any) => ({
        date: item.date,
        close: item.close,
        volume: item.volume,
        high: item.high,
        low: item.low,
        open: item.open
      }));
    } catch (error) {
      console.warn(`❌ Error fetching historical data for ${symbol}:`, error);
      return null;
    }
  }

  async getCryptoQuote(symbol: string) {
    try {
      const url = `${this.baseUrl}/tiingo/crypto/prices?tickers=${symbol}&token=${this.apiKey}`;
      const response = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.length > 0) {
        const quote = data[0];
        const priceData = quote.priceData[0];
        return {
          symbol,
          price: priceData.close,
          change: priceData.close - priceData.open,
          changePercent: ((priceData.close - priceData.open) / priceData.open) * 100,
          volume: priceData.volume,
          high: priceData.high,
          low: priceData.low,
          open: priceData.open,
          date: priceData.date,
          source: 'Tiingo'
        };
      }
      return null;
    } catch (error) {
      console.warn(`❌ Error fetching crypto data for ${symbol}:`, error);
      return null;
    }
  }

  async getForexQuote(pair: string) {
    try {
      const url = `${this.baseUrl}/tiingo/fx/${pair}/top?token=${this.apiKey}`;
      const response = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.length > 0) {
        const quote = data[0];
        return {
          symbol: pair,
          price: quote.midPrice,
          bid: quote.bidPrice,
          ask: quote.askPrice,
          date: quote.timestamp,
          source: 'Tiingo'
        };
      }
      return null;
    } catch (error) {
      console.warn(`❌ Error fetching forex data for ${pair}:`, error);
      return null;
    }
  }

  async getETFQuote(symbol: string) {
    return this.getStockQuote(symbol);
  }

  async getBulkQuotes(symbols: string[], batchSize: number = 12): Promise<any[]> {
    try {
      console.log(`Bulk processing ${symbols.length} symbols from Tiingo IEX...`);
      const results: any[] = [];
      const startTime = Date.now();
      const batchPromises: Array<() => Promise<any[]>> = [];
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const symbolsQuery = batch.join(',');
        const batchPromise = async (): Promise<any[]> => {
          try {
            const url = `${this.baseUrl}/iex?tickers=${symbolsQuery}&token=${this.apiKey}`;
            const response = await fetch(url, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000) });
            if (response.ok) {
              try {
                const batchData = await response.json();
                if (Array.isArray(batchData) && batchData.length > 0) {
                  return batchData;
                }
              } catch (parseError) {
                console.warn('⚠️ JSON parse error in batch:', parseError);
              }
            }
            return [];
          } catch (batchError) {
            console.warn('❌ Batch error:', batchError);
            return [];
          }
        };
        batchPromises.push(batchPromise);
      }
      // Limit concurrency to avoid overwhelming network/providers
      const CONCURRENCY = 4;
      const parallelResults: any[][] = [];
      for (let i = 0; i < batchPromises.length; i += CONCURRENCY) {
        const slice = batchPromises.slice(i, i + CONCURRENCY);
        const step = await Promise.all(slice.map(fn => fn()));
        parallelResults.push(...step.map(arr => (Array.isArray(arr) ? arr : [])));
      }
      for (const r of parallelResults) if (r?.length) results.push(...r);
      const duration = Date.now() - startTime;
      return results.map((quote: any) => ({
        symbol: quote.ticker,
        price: quote.last || quote.close || quote.tngoLast || quote.high || quote.open || 0,
        change: (quote.tngoLast || quote.high || quote.open || 0) - (quote.prevClose || quote.open || 0),
        changePercent: ((quote.tngoLast || quote.high || quote.open || 0) - (quote.prevClose || quote.open || 0)) / (quote.prevClose || quote.open || 1) * 100,
        volume: quote.volume,
        high: quote.high,
        low: quote.low,
        open: quote.open,
        timestamp: quote.timestamp,
        source: 'Tiingo IEX',
        fetchedMs: duration
      }));
    } catch (error) {
      console.error('Ultra-fast bulk quote fetch error:', error);
      return [];
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<Array<{symbol: string; data: any}>> {
    try {
      const results = await Promise.allSettled(symbols.map(s => this.getStockQuote(s)));
      return results.map((r, i) => ({ symbol: symbols[i], data: r.status === 'fulfilled' ? r.value : null })).filter(r => r.data);
    } catch (error) {
      console.warn('Error fetching multiple quotes:', error);
      return [];
    }
  }

  async getNews(symbols: string[] = [], limit: number = 10): Promise<any[]> {
    try {
      const symbolsParam = symbols.length > 0 ? `&tickers=${symbols.join(',')}` : '';
      const url = `${this.baseUrl}/tiingo/news?token=${this.apiKey}${symbolsParam}&limit=${limit}`;
      const response = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((item: any) => ({
        title: item.title,
        description: item.description,
        url: item.url,
        publishedDate: item.publishedDate,
        source: item.source,
        tags: item.tags || [],
        tickers: item.tickers || []
      }));
    } catch (error) {
      console.warn('Error fetching news:', error);
      return [];
    }
  }
}

// ---------- Lazy singleton (never throws at import time) ----------
let _tiingo: TiingoService | null = null;
function getTiingo(): TiingoService | null {
  if (_tiingo) return _tiingo;
  try {
    _tiingo = new TiingoService();
    return _tiingo;
  } catch (e) {
    console.warn('Tiingo disabled (missing TIINGO_API_KEY). Using fallbacks.', e);
    return null;
  }
}

// ---------- Public helper wrappers (safe if key missing) ----------
export async function getTiingoMarketData(symbols: string[] = ['SPY', 'QQQ', 'IWM', 'DIA']) {
  const svc = getTiingo();
  if (!svc) return [];
  try {
    const quotes = await svc.getBulkQuotes(symbols, 10);
    if (!quotes?.length) {
      const critical = symbols.slice(0, 25);
      const multi = await svc.getMultipleQuotes(critical);
      return multi.map(m => m.data).filter(Boolean) as any[];
    }
    return quotes;
  } catch (e) {
    console.warn('getTiingoMarketData error:', e);
    return [];
  }
}

export async function getTiingoHistorical(symbol: string, daysBack: number = 30) {
  const svc = getTiingo();
  if (!svc) return null;
  return svc.getHistoricalPrices(symbol, daysBack);
}

export async function getTiingoCrypto(symbols: string[] = ['BTCUSD', 'ETHUSD', 'ADAUSD']) {
  const svc = getTiingo();
  if (!svc) return [];
  const out: any[] = [];
  for (const s of symbols) {
    const d = await svc.getCryptoQuote(s);
    if (d) out.push(d);
  }
  return out;
}

export async function getTiingoForex(pairs: string[] = ['EURUSD', 'GBPUSD', 'USDJPY']) {
  const svc = getTiingo();
  if (!svc) return [];
  const out: any[] = [];
  for (const p of pairs) {
    const d = await svc.getForexQuote(p);
    if (d) out.push(d);
  }
  return out;
}

export async function getTiingoNews(symbols: string[] = [], limit: number = 10) {
  const svc = getTiingo();
  if (!svc) return [];
  return svc.getNews(symbols, limit);
}
