// UNIFIED MARKET API - Sistema Unificato per Tutti i Mercati Finanziari
// Aggiornamenti 2x al giorno con rotazione intelligente delle API

import { getPolygonClient, type PolygonQuote } from './polygonFinance';

interface APICredentials {
  tiingo: string[];
  twelvedata: string[];
  exchangerate: string[];
  alphavintage: string[];
  polygon: string[];
  fred: string;
}

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  timestamp: string;
  source: string;
}

export class UnifiedMarketAPI {
  private credentials: APICredentials;
  private cache: Map<string, { data: MarketData[], timestamp: number }>;
  private apiUsage: Map<string, { calls: number, resetTime: number }>;
  private currentKeyIndex: Map<string, number>;
  
  // Cache Duration: 6 ore (4 aggiornamenti al giorno, ma utilizziamo 2x)
  private readonly CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 ore
  private readonly UPDATE_SCHEDULE = [9, 15]; // 9:00 e 15:00 (orari di mercato)

  constructor() {
    this.credentials = {
      tiingo: [
        process.env.TIINGO_API_KEY || '',
        process.env.TIINGO_API_KEY_2 || ''
      ].filter(Boolean) as string[],
      twelvedata: [
        process.env.TWELVE_DATA_API_KEY || '',
        process.env.TWELVE_DATA_API_KEY_2 || '',
        process.env.TWELVE_DATA_API_KEY_3 || ''
      ].filter(Boolean) as string[],
      exchangerate: [
        process.env.EXCHANGERATE_API_KEY || '',
        process.env.EXCHANGERATE_API_KEY_2 || ''
      ].filter(Boolean) as string[],
      alphavintage: [
        process.env.ALPHAVANTAGE_API_KEY || ''
      ].filter(Boolean) as string[],
      polygon: [
        process.env.POLYGON_API_KEY || '',
        process.env.POLYGON_API_KEY_2 || ''
      ].filter(Boolean) as string[],
      fred: process.env.FRED_API_KEY || ''
    };

    this.cache = new Map();
    this.apiUsage = new Map();
    this.currentKeyIndex = new Map();
    
    // Inizializza contatori per ogni servizio
    Object.keys(this.credentials).forEach(service => {
      this.currentKeyIndex.set(service, 0);
      this.apiUsage.set(service, { calls: 0, resetTime: Date.now() + 24 * 60 * 60 * 1000 });
    });

    console.log('🚀 UnifiedMarketAPI initialized with multiple API keys from environment variables');
  }

  // Rotazione intelligente delle API keys
  private getNextApiKey(service: keyof APICredentials): string {
    const keys = this.credentials[service];
    if (!Array.isArray(keys)) return keys as string;
    if (!keys.length) {
      throw new Error(`No API keys configured for ${service}`);
    }
    
    const currentIndex = this.currentKeyIndex.get(service) || 0;
    const key = keys[currentIndex];
    
    // Ruota alla prossima key
    this.currentKeyIndex.set(service, (currentIndex + 1) % keys.length);
    
    return key;
  }

  // Verifica se è ora di aggiornare (2x al giorno)
  private shouldUpdate(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const today = now.toDateString();
    
    // Verifica se abbiamo già aggiornato oggi negli orari prestabiliti
  const lastUpdate = typeof localStorage !== 'undefined' ? localStorage.getItem('lastMarketUpdate') : null;
    if (lastUpdate) {
      const lastDate = new Date(lastUpdate).toDateString();
      const lastHour = new Date(lastUpdate).getHours();
      
      // Se è lo stesso giorno e abbiamo già aggiornato in questo slot orario
      if (lastDate === today) {
        if ((currentHour >= 9 && currentHour < 15 && lastHour >= 9) ||
            (currentHour >= 15 && lastHour >= 15)) {
          return false;
        }
      }
    }

    // Aggiorna se siamo negli orari di mercato (9:00-16:00)
    return currentHour >= 9 && currentHour <= 16;
  }

  // EQUITY - Azioni (Tiingo → Polygon → TwelveData)
  async fetchEquityData(symbols: string[]): Promise<MarketData[]> {
    const results: MarketData[] = [];
    
    try {
      // Prova prima con Tiingo (più veloce per bulk)
      const tiingoKey = this.getNextApiKey('tiingo');
      const tiingoData = await this.fetchFromTiingo(symbols.slice(0, 50), tiingoKey);
      results.push(...tiingoData);
      
      // Se non abbiamo abbastanza dati, prova Polygon.io
      if (results.length < symbols.length * 0.8) {
        const remainingSymbols = symbols.filter(s => 
          !results.some(r => r.symbol === s)
        );
        const polygonData = await this.fetchFromPolygon(remainingSymbols);
        results.push(...polygonData);
      }

      // Ultimo fallback: TwelveData
      if (results.length < symbols.length * 0.8) {
        const twelveKey = this.getNextApiKey('twelvedata');
        const remainingSymbols = symbols.filter(s => 
          !results.some(r => r.symbol === s)
        );
        const twelveData = await this.fetchFromTwelveData(remainingSymbols.slice(0, 30), twelveKey);
        results.push(...twelveData);
      }
      
    } catch (error) {
      console.warn('Equity API error:', error);
    }
    
    return results;
  }

  // FOREX - Valute (Polygon → ExchangeRate → TwelveData)  
  async fetchForexData(pairs: string[]): Promise<MarketData[]> {
    const results: MarketData[] = [];
    
    try {
      // Prova prima con Polygon forex
      const polygonForex = await this.fetchForexFromPolygon(pairs);
      results.push(...polygonForex);

      // Se non bastano, usa ExchangeRate
      if (results.length < pairs.length * 0.8) {
        const remaining = pairs.filter(p => !results.some(r => r.symbol === p));
        const exchangeKey = this.getNextApiKey('exchangerate');
        const forexData = await this.fetchFromExchangeRate(remaining, exchangeKey);
        results.push(...forexData);
      }
    } catch (error) {
      console.warn('Forex API error:', error);
      
      // Fallback to TwelveData
      try {
        const remaining = pairs.filter(p => !results.some(r => r.symbol === p));
        const twelveKey = this.getNextApiKey('twelvedata');
        const twelveForex = await this.fetchForexFromTwelve(remaining, twelveKey);
        results.push(...twelveForex);
      } catch (fallbackError) {
        console.warn('Forex fallback error:', fallbackError);
      }
    }
    
    return results;
  }

  // CRYPTO - Criptovalute (Polygon → TwelveData)
  async fetchCryptoData(symbols: string[]): Promise<MarketData[]> {
    const results: MarketData[] = [];
    
    try {
      // Prova prima con Polygon crypto
      const polygonCrypto = await this.fetchCryptoFromPolygon(symbols);
      results.push(...polygonCrypto);

      // Fallback to TwelveData per i rimanenti
      if (results.length < symbols.length * 0.8) {
        const remaining = symbols.filter(s => !results.some(r => r.symbol === s));
        const twelveKey = this.getNextApiKey('twelvedata');
        const cryptoData = await this.fetchCryptoFromTwelve(remaining, twelveKey);
        results.push(...cryptoData);
      }
    } catch (error) {
      console.warn('Crypto API error:', error);
    }
    
    return results;
  }

  // COMMODITIES - Materie Prime (Alpha Vintage + TwelveData)
  async fetchCommoditiesData(symbols: string[]): Promise<MarketData[]> {
    const results: MarketData[] = [];
    
    try {
      const alphaKey = this.getNextApiKey('alphavintage');
      const commoditiesData = await this.fetchFromAlphaVintage(symbols, alphaKey);
      results.push(...commoditiesData);
      
    } catch (error) {
      console.warn('Commodities API error:', error);
    }
    
    return results;
  }

  // Implementazioni specifiche per ogni API
  private async fetchFromTiingo(symbols: string[], apiKey: string): Promise<MarketData[]> {
    const results: MarketData[] = [];
    
    try {
      // Bulk API call
      const symbolsParam = symbols.slice(0, 50).join(',');
      const url = `https://api.tiingo.com/iex?tickers=${symbolsParam}&token=${apiKey}`;
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        data.forEach((item: any) => {
          results.push({
            symbol: item.ticker,
            name: item.ticker,
            price: item.last || item.tngoLast || 0,
            change: (item.last || item.tngoLast || 0) - (item.prevClose || 0),
            changePercent: ((item.last || item.tngoLast || 0) - (item.prevClose || 0)) / (item.prevClose || 1) * 100,
            volume: item.volume,
            timestamp: new Date().toISOString(),
            source: 'Tiingo'
          });
        });
        
        console.log(`✅ Tiingo: ${results.length} symbols fetched`);
      }
      
    } catch (error) {
      console.warn('Tiingo API error:', error);
    }
    
    return results;
  }

  private async fetchFromTwelveData(symbols: string[], apiKey: string): Promise<MarketData[]> {
    const results: MarketData[] = [];
    
    try {
      // TwelveData ha limite di 8 simboli per chiamata
      for (let i = 0; i < symbols.length; i += 8) {
        const batch = symbols.slice(i, i + 8);
        const symbolsParam = batch.join(',');
        
        const url = `https://api.twelvedata.com/quote?symbol=${symbolsParam}&apikey=${apiKey}`;
        
        const response = await fetch(url, {
          signal: AbortSignal.timeout(8000)
        });
        
        if (response.ok) {
          const data = await response.json();
          const quotes = Array.isArray(data) ? data : [data];
          
          quotes.forEach((item: any) => {
            if (item.symbol && item.close) {
              const current = parseFloat(item.close);
              const previous = parseFloat(item.previous_close || item.close);
              
              results.push({
                symbol: item.symbol,
                name: item.name || item.symbol,
                price: current,
                change: current - previous,
                changePercent: ((current - previous) / previous) * 100,
                volume: parseInt(item.volume) || 0,
                timestamp: new Date().toISOString(),
                source: 'TwelveData'
              });
            }
          });
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ TwelveData: ${results.length} symbols fetched`);
      
    } catch (error) {
      console.warn('TwelveData API error:', error);
    }
    
    return results;
  }

  private async fetchFromExchangeRate(pairs: string[], apiKey: string): Promise<MarketData[]> {
    const results: MarketData[] = [];
    
    try {
      // ExchangeRate API per coppie forex
      const majorPairs = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];
      
      for (const pair of pairs) {
        if (pair.includes('USD')) {
          const baseCurrency = pair.replace('USD=X', '').replace('=X', '');
          
          if (majorPairs.includes(baseCurrency)) {
            const url = `https://api.exchangerate-api.com/v4/latest/${baseCurrency}?access_key=${apiKey}`;
            
            const response = await fetch(url, {
              signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
              const data = await response.json();
              const rate = data.rates?.USD || 0;
              
              if (rate > 0) {
                results.push({
                  symbol: pair,
                  name: `${baseCurrency}/USD`,
                  price: rate,
                  change: 0, // ExchangeRate non fornisce change
                  changePercent: 0,
                  timestamp: new Date().toISOString(),
                  source: 'ExchangeRate'
                });
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
      
      console.log(`✅ ExchangeRate: ${results.length} pairs fetched`);
      
    } catch (error) {
      console.warn('ExchangeRate API error:', error);
    }
    
    return results;
  }

  private async fetchForexFromTwelve(pairs: string[], apiKey: string): Promise<MarketData[]> {
    const results: MarketData[] = [];
    
    try {
      for (const pair of pairs.slice(0, 20)) {
        // Converte formato Yahoo (EURUSD=X) a TwelveData (EUR/USD)
        const symbol = pair.replace('=X', '').replace('USD', '/USD');
        
        const url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`;
        
        const response = await fetch(url, {
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.close) {
            const current = parseFloat(data.close);
            const previous = parseFloat(data.previous_close || data.close);
            
            results.push({
              symbol: pair,
              name: symbol,
              price: current,
              change: current - previous,
              changePercent: ((current - previous) / previous) * 100,
              timestamp: new Date().toISOString(),
              source: 'TwelveData-Forex'
            });
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      console.log(`✅ TwelveData Forex: ${results.length} pairs fetched`);
      
    } catch (error) {
      console.warn('TwelveData Forex error:', error);
    }
    
    return results;
  }

  private async fetchCryptoFromTwelve(symbols: string[], apiKey: string): Promise<MarketData[]> {
    const results: MarketData[] = [];
    
    try {
      for (const symbol of symbols.slice(0, 25)) {
        // Converte formato (BTC-USD) a (BTC/USD)  
        const cryptoSymbol = symbol.replace('-USD', '/USD');
        
        const url = `https://api.twelvedata.com/quote?symbol=${cryptoSymbol}&apikey=${apiKey}`;
        
        const response = await fetch(url, {
          signal: AbortSignal.timeout(6000)
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.close) {
            const current = parseFloat(data.close);
            const previous = parseFloat(data.previous_close || data.close);
            
            results.push({
              symbol: symbol,
              name: data.name || symbol,
              price: current,
              change: current - previous,
              changePercent: ((current - previous) / previous) * 100,
              volume: parseInt(data.volume) || 0,
              timestamp: new Date().toISOString(),
              source: 'TwelveData-Crypto'
            });
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log(`✅ TwelveData Crypto: ${results.length} symbols fetched`);
      
    } catch (error) {
      console.warn('TwelveData Crypto error:', error);
    }
    
    return results;
  }

  private async fetchFromAlphaVintage(symbols: string[], apiKey: string): Promise<MarketData[]> {
    const results: MarketData[] = [];
    
    try {
      // Alpha Vantage commodities endpoint has strict limits; do not synthesize data.
      if (!apiKey) return results;
      console.log('AlphaVantage commodities fetch skipped due to rate limits or missing key');
      
    } catch (error) {
      console.warn('AlphaVintage API error:', error);
    }
    
    return results;
  }

  // POLYGON.IO - Equities via prev day aggregates
  private async fetchFromPolygon(symbols: string[]): Promise<MarketData[]> {
    const results: MarketData[] = [];
    
    try {
      const polygon = getPolygonClient();
      if (!polygon.isConfigured) return results;

      const quotes = await polygon.getSnapshots(symbols);
      
      for (const q of quotes) {
        results.push({
          symbol: q.symbol,
          name: q.name,
          price: q.price,
          change: q.change,
          changePercent: q.changePercent,
          volume: q.volume,
          timestamp: q.timestamp,
          source: 'Polygon'
        });
      }
      
      console.log(`✅ Polygon equities: ${results.length} symbols fetched`);
    } catch (error) {
      console.warn('Polygon equities error:', error);
    }
    
    return results;
  }

  // POLYGON.IO - Forex pairs
  private async fetchForexFromPolygon(pairs: string[]): Promise<MarketData[]> {
    const results: MarketData[] = [];
    
    try {
      const polygon = getPolygonClient();
      if (!polygon.isConfigured) return results;

      for (const pair of pairs) {
        // Converte EURUSD=X → from=EUR, to=USD
        const clean = pair.replace('=X', '');
        const from = clean.slice(0, 3);
        const to = clean.slice(3) || 'USD';

        const quote = await polygon.getForexQuote(from, to);
        if (quote) {
          results.push({
            symbol: pair,
            name: quote.name,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            timestamp: quote.timestamp,
            source: 'Polygon-Forex'
          });
        }
      }

      console.log(`✅ Polygon forex: ${results.length} pairs fetched`);
    } catch (error) {
      console.warn('Polygon forex error:', error);
    }

    return results;
  }

  // POLYGON.IO - Crypto pairs
  private async fetchCryptoFromPolygon(symbols: string[]): Promise<MarketData[]> {
    const results: MarketData[] = [];
    
    try {
      const polygon = getPolygonClient();
      if (!polygon.isConfigured) return results;

      for (const symbol of symbols) {
        // Converte BTC-USD → from=BTC, to=USD
        const parts = symbol.split('-');
        const from = parts[0];
        const to = parts[1] || 'USD';

        const quote = await polygon.getCryptoQuote(from, to);
        if (quote) {
          results.push({
            symbol: symbol,
            name: quote.name,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            volume: quote.volume,
            timestamp: quote.timestamp,
            source: 'Polygon-Crypto'
          });
        }
      }

      console.log(`✅ Polygon crypto: ${results.length} symbols fetched`);
    } catch (error) {
      console.warn('Polygon crypto error:', error);
    }

    return results;
  }

  // Metodo principale per ottenere tutti i dati di mercato
  async getAllMarketData(): Promise<{
    equity: MarketData[],
    forex: MarketData[],
    crypto: MarketData[],
    commodities: MarketData[],
    bonds: MarketData[],
    timestamp: string,
    nextUpdate: string
  }> {
    console.log('🔥 Starting unified market data fetch...');
    
    // Simboli per ogni categoria
    const symbols = {
      equity: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'QQQ', 'VTI'],
      forex: ['EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X', 'AUDUSD=X', 'USDCAD=X'],
      crypto: ['BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD', 'SOL-USD'],
      commodities: ['GC=F', 'SI=F', 'CL=F', 'NG=F', 'HG=F', 'PL=F'],
      bonds: ['^TNX', '^TYX', '^IRX', '^FVX']
    };

    const results = {
      equity: await this.fetchEquityData(symbols.equity),
      forex: await this.fetchForexData(symbols.forex),
      crypto: await this.fetchCryptoData(symbols.crypto),
      commodities: await this.fetchCommoditiesData(symbols.commodities),
      bonds: [] as MarketData[], // FRED API separata
      timestamp: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + this.CACHE_DURATION).toISOString()
    };

    // Cache dei risultati
    this.cache.set('unified-market-data', {
      data: [...results.equity, ...results.forex, ...results.crypto, ...results.commodities],
      timestamp: Date.now()
    });

    // Aggiorna il timestamp dell'ultimo update
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lastMarketUpdate', new Date().toISOString());
    }

    console.log(`🎯 Unified API Complete:
    📈 Equity: ${results.equity.length} symbols
    💱 Forex: ${results.forex.length} pairs  
    ₿ Crypto: ${results.crypto.length} tokens
    ⚒️ Commodities: ${results.commodities.length} items
    🏦 Total: ${results.equity.length + results.forex.length + results.crypto.length + results.commodities.length} assets
  ⏰ Schedule info: ${results.nextUpdate}`);

    return results;
  }

  // Metodo per ottenere dati cached o fetch se necessario
  async getMarketData(forceRefresh: boolean = false): Promise<any> {
    const cached = this.cache.get('unified-market-data');
    
    if (!forceRefresh && cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log('📊 Using cached market data');
      return {
        data: cached.data,
        cached: true,
        timestamp: new Date(cached.timestamp).toISOString()
      };
    }
    
    if (!forceRefresh && !this.shouldUpdate()) {
      console.log('⏰ Not time for scheduled update (2x daily at 9:00 and 15:00)');
      return cached ? {
        data: cached.data,
        cached: true,
        timestamp: new Date(cached.timestamp).toISOString()
      } : null;
    }
    
    const freshData = await this.getAllMarketData();
    return {
      ...freshData,
      cached: false
    };
  }

  // Statistiche utilizzo API
  getAPIUsageStats(): { [service: string]: number } {
    const stats: { [service: string]: number } = {};
    
    this.apiUsage.forEach((usage, service) => {
      stats[service] = usage.calls;
    });
    
    return stats;
  }
}

// Export singleton instance
export const unifiedMarketAPI = new UnifiedMarketAPI();
