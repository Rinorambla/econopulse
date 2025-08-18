// Twelve Data API - Alternative GRATUITA
// 800 richieste/giorno GRATIS - Perfetto per EconoPulse

const TWELVE_BASE_URL = 'https://api.twelvedata.com';
const TWELVE_API_KEY = process.env.TWELVE_DATA_API_KEY;

export interface TwelveDataQuote {
  symbol: string;
  name: string;
  price: string;
  change: string;
  percent_change: string;
  volume: string;
  timestamp: string;
}

export interface TwelveDataResponse {
  [key: string]: TwelveDataQuote;
}

// Ottieni quote per multiple azioni
export async function getTwelveDataMarketData(symbols: string[] = ['SPY', 'QQQ', 'IWM', 'DIA']) {
  try {
    const symbolsStr = symbols.join(',');
    const response = await fetch(
      `${TWELVE_BASE_URL}/quote?symbol=${symbolsStr}&apikey=${TWELVE_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status}`);
    }
    
    const data: TwelveDataResponse = await response.json();
    
    // Se è un singolo simbolo, Twelve Data restituisce oggetto diretto
    // Se sono multipli, restituisce oggetto con chiavi simbolo
    const quotes = Array.isArray(Object.keys(data)) && symbols.length > 1 ? data : { [symbols[0]]: data };
    
    return symbols.map(symbol => {
      const quote = quotes[symbol] as TwelveDataQuote;
      if (!quote || !quote.price) return null;
      
      const price = parseFloat(quote.price);
      const change = parseFloat(quote.change || '0');
      const percentChange = parseFloat(quote.percent_change || '0');
      
      return {
        ticker: symbol,
        name: quote.name || symbol,
        price: price,
        change: change,
        changePercent: percentChange.toFixed(2),
        volume: quote.volume || '0',
        performance: `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`,
        trend: percentChange > 0.5 ? 'UPTREND' : percentChange < -0.5 ? 'DOWNTREND' : 'SIDEWAYS',
        timestamp: quote.timestamp
      };
    }).filter(Boolean);
  } catch (error) {
    console.error('Twelve Data API Error:', error);
    return [];
  }
}

// Ottieni dati storici
export async function getTwelveDataHistorical(symbol: string, interval: string = '1day', outputsize: number = 30) {
  try {
    const response = await fetch(
      `${TWELVE_BASE_URL}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${TWELVE_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Twelve Data Historical API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('Twelve Data Historical API Error:', error);
    return [];
  }
}

// Ottieni indicatori tecnici
export async function getTwelveDataTechnical(symbol: string, indicator: string = 'RSI', interval: string = '1day') {
  try {
    const response = await fetch(
      `${TWELVE_BASE_URL}/${indicator}?symbol=${symbol}&interval=${interval}&apikey=${TWELVE_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Twelve Data Technical API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Twelve Data Technical API Error:', error);
    return null;
  }
}

// Ottieni forex rates
export async function getTwelveDataForex(pairs: string[] = ['EUR/USD', 'GBP/USD', 'USD/JPY']) {
  try {
    const pairsStr = pairs.join(',');
    const response = await fetch(
      `${TWELVE_BASE_URL}/quote?symbol=${pairsStr}&apikey=${TWELVE_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Twelve Data Forex API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Twelve Data Forex API Error:', error);
    return {};
  }
}

// Ottieni crypto prices
export async function getTwelveDataCrypto(symbols: string[] = ['BTC/USD', 'ETH/USD', 'ADA/USD']) {
  try {
    const symbolsStr = symbols.join(',');
    const response = await fetch(
      `${TWELVE_BASE_URL}/quote?symbol=${symbolsStr}&apikey=${TWELVE_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Twelve Data Crypto API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Twelve Data Crypto API Error:', error);
    return {};
  }
}
