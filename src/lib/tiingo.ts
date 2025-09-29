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

  // Get current stock quote
  async getStockQuote(symbol: string) {
    try {
  const url = `${this.baseUrl}/tiingo/daily/${symbol}/prices?token=${this.apiKey}`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Tiingo API error for ${symbol}: ${response.status} - ${errorText}`);
        return null;
      }

  const data = await response.json();

      if (data && data.length > 0) {
        const quote = data[0];
        return {
          symbol: symbol,
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

  // Get historical prices
  async getHistoricalPrices(symbol: string, daysBack: number = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      
      const url = `${this.baseUrl}/tiingo/daily/${symbol}/prices?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&token=${this.apiKey}`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) {
        return null;
      }

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

  // Get crypto prices
  async getCryptoQuote(symbol: string) {
    try {
      const url = `${this.baseUrl}/tiingo/crypto/prices?tickers=${symbol}&token=${this.apiKey}`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const quote = data[0];
        const priceData = quote.priceData[0];
        
        return {
          symbol: symbol,
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

  // Get forex rates
  async getForexQuote(pair: string) {
    try {
      const url = `${this.baseUrl}/tiingo/fx/${pair}/top?token=${this.apiKey}`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        return null;
      }

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

  // Get ETF data
  async getETFQuote(symbol: string) {
    // ETFs are treated as regular stocks in Tiingo
    return this.getStockQuote(symbol);
  }

  // ULTRA-FAST BULK API METHOD - Enhanced for massive parallel processing
  async getBulkQuotes(symbols: string[], batchSize: number = 12) {
    try {
  console.log(`Bulk processing ${symbols.length} symbols from Tiingo IEX...`);
      
      const results = [];
      const startTime = Date.now();
      
      // Process in smaller batches with NO DELAYS for maximum speed
      const batchPromises = [];
      
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const symbolsQuery = batch.join(',');
        
        // Create promise for each batch to run in parallel
        const batchPromise = (async () => {
          try {
            const url = `${this.baseUrl}/iex?tickers=${symbolsQuery}&token=${this.apiKey}`;
            console.log(`📊 Batch ${Math.floor(i/batchSize) + 1}: Processing ${batch.length} symbols in parallel...`);
            
            const response = await fetch(url, {
              headers: { 
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              signal: AbortSignal.timeout(10000) // Reduced timeout for speed
            });
            
            if (response.ok) {
              try {
                const batchData = await response.json();
                if (Array.isArray(batchData) && batchData.length > 0) {
                  console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: Retrieved ${batchData.length} quotes in ${Date.now() - startTime}ms`);
                  return batchData;
                }
              } catch (parseError) {
                console.warn(`⚠️ Batch ${Math.floor(i/batchSize) + 1} JSON parse error:`, parseError);
              }
            } else {
              console.warn(`⚠️ Batch ${Math.floor(i/batchSize) + 1} failed: ${response.status}`);
              // Consume the response body
              try {
                await response.text();
              } catch {}
            }
            
            return [];
          } catch (batchError) {
            console.warn(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, batchError);
            return [];
          }
        })();
        
        batchPromises.push(batchPromise);
      }
      
      // Execute ALL batches in parallel for maximum speed - NO DELAYS
  console.log(`Executing ${batchPromises.length} batches in parallel...`);
      const parallelResults = await Promise.all(batchPromises);
      
      // Flatten results
      for (const batchResult of parallelResults) {
        if (batchResult && batchResult.length > 0) {
          results.push(...batchResult);
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const symbolsPerSecond = Math.round(symbols.length / (duration / 1000));
      
  console.log(`Bulk completed: ${results.length}/${symbols.length} symbols in ${duration}ms (${symbolsPerSecond} symbols/sec)`);
      
      // Debug: Log the first IEX response to see the structure
  // Intentionally avoid logging full payloads in production
      
      return results.map(quote => ({
        symbol: quote.ticker,
        price: quote.last || quote.close || quote.tngoLast || quote.high || quote.open || 0,
        change: (quote.tngoLast || quote.high || quote.open || 0) - (quote.prevClose || quote.open || 0),
        changePercent: ((quote.tngoLast || quote.high || quote.open || 0) - (quote.prevClose || quote.open || 0)) / (quote.prevClose || quote.open || 1) * 100,
        volume: quote.volume,
        high: quote.high,
        low: quote.low,
        open: quote.open,
        timestamp: quote.timestamp,
        source: 'Tiingo IEX'
      }));
      
    } catch (error) {
  console.error('Ultra-fast bulk quote fetch error:', error);
      return [];
    }
  }

  // Get multiple stocks at once
  async getMultipleQuotes(symbols: string[]) {
    try {
      const promises = symbols.map(symbol => this.getStockQuote(symbol));
      const results = await Promise.allSettled(promises);
      
      return results
        .map((result, index) => ({
          symbol: symbols[index],
          data: result.status === 'fulfilled' ? result.value : null
        }))
        .filter(item => item.data !== null);
    } catch (error) {
  console.warn('Error fetching multiple quotes:', error);
      return [];
    }
  }

  // Get news for a symbol
  async getNews(symbols: string[] = [], limit: number = 10) {
    try {
      const symbolsParam = symbols.length > 0 ? `&tickers=${symbols.join(',')}` : '';
      const url = `${this.baseUrl}/tiingo/news?token=${this.apiKey}${symbolsParam}&limit=${limit}`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        return [];
      }

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

export const tiingoService = new TiingoService();

// Helper functions for easy use
export async function getTiingoMarketData(symbols: string[] = ['SPY', 'QQQ', 'IWM', 'DIA']) {
  try {
    console.log(`Fetching market data for ${symbols.length} symbols from Tiingo...`);
    
    // Use the new BULK API method for much better performance
    const quotes = await tiingoService.getBulkQuotes(symbols, 10); // 10 symbols per batch (reduced from 15)
    
    if (!quotes || quotes.length === 0) {
  console.warn('No quotes returned from Tiingo bulk API, falling back to individual requests');
      // Fallback to individual requests for critical symbols only
      const criticalSymbols = symbols.slice(0, 50); // Limit to first 50 symbols as fallback
      const results = await tiingoService.getMultipleQuotes(criticalSymbols);
      return results.filter(quote => quote !== null);
    }
    
  console.log(`Retrieved data for ${quotes.length} symbols from Tiingo`);
    return quotes;
    
  } catch (error) {
  console.error('Error in getTiingoMarketData:', error);
    return [];
  }
}

export async function getTiingoHistorical(symbol: string, daysBack: number = 30) {
  return tiingoService.getHistoricalPrices(symbol, daysBack);
}

export async function getTiingoCrypto(symbols: string[] = ['BTCUSD', 'ETHUSD', 'ADAUSD']) {
  try {
    const cryptoData = [];
    
    for (const symbol of symbols) {
      const data = await tiingoService.getCryptoQuote(symbol);
      if (data) {
        cryptoData.push(data);
      }
    }
    
    return cryptoData;
  } catch (error) {
    console.error('❌ Error in getTiingoCrypto:', error);
    return [];
  }
}

export async function getTiingoForex(pairs: string[] = ['EURUSD', 'GBPUSD', 'USDJPY']) {
  try {
    const forexData = [];
    
    for (const pair of pairs) {
      const data = await tiingoService.getForexQuote(pair);
      if (data) {
        forexData.push(data);
      }
    }
    
    return forexData;
  } catch (error) {
    console.error('❌ Error in getTiingoForex:', error);
    return [];
  }
}

export async function getTiingoNews(symbols: string[] = [], limit: number = 10) {
  return tiingoService.getNews(symbols, limit);
}
