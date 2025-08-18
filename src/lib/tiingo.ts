// Tiingo API Service for Financial Data - UNIFIED REAL DATA
export class TiingoService {
  private apiKey: string;
  private baseUrl = 'https://api.tiingo.com';

  constructor() {
    // Using REAL Tiingo API key for live data
    this.apiKey = process.env.TIINGO_API_KEY || '0ef36bebbaa57f70fcc6705254bab79ac599e485';
  }

  // Get current stock quote
  async getStockQuote(symbol: string) {
    try {
      const url = `${this.baseUrl}/tiingo/daily/${symbol}/prices?token=${this.apiKey}`;
      console.log(`🔍 Fetching REAL quote for ${symbol} from Tiingo...`);
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Tiingo API error for ${symbol}: ${response.status} - ${errorText}`);
        return null;
      }

      const data = await response.json();
      console.log(`📊 Tiingo REAL response for ${symbol}:`, JSON.stringify(data, null, 2));

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
      console.warn(`❌ Error fetching REAL data for ${symbol} from Tiingo:`, error);
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
        signal: AbortSignal.timeout(10000)
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
      console.warn('❌ Error fetching multiple quotes:', error);
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
      console.warn('❌ Error fetching news:', error);
      return [];
    }
  }
}

export const tiingoService = new TiingoService();

// Helper functions for easy use
export async function getTiingoMarketData(symbols: string[] = ['SPY', 'QQQ', 'IWM', 'DIA']) {
  try {
    console.log(`🔍 Fetching REAL market data for ${symbols.length} symbols from Tiingo...`);
    
    const marketData = await tiingoService.getMultipleQuotes(symbols);
    
    console.log(`✅ Retrieved REAL data for ${marketData.length} symbols from Tiingo`);
    
    return marketData.map(item => ({
      symbol: item.symbol,
      price: item.data?.price || 0,
      change: item.data?.change || 0,
      changePercent: item.data?.changePercent || 0,
      volume: item.data?.volume || 0,
      high: item.data?.high || 0,
      low: item.data?.low || 0,
      source: 'Tiingo',
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('❌ Error in getTiingoMarketData:', error);
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
