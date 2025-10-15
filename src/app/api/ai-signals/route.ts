import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
}

interface AISignal {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  signal: 'LONG' | 'SHORT';
  confidence: number;
  timeframe: 'INTRADAY' | 'SWING';
  indicators: TechnicalIndicators;
  aiReasoning: string;
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2?: number;
  riskReward: number;
  lastUpdated: string;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
}

// Simboli per analisi intraday
const INTRADAY_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'TSLA', 'AMZN', 'NFLX',
  'SPY', 'QQQ', 'IWM', 'DIA', 'XLF', 'XLK', 'XLE', 'XLV', 'XLI', 'XLU',
  'GLD', 'SLV', 'TLT', 'VIX', 'USO', 'EEM', 'FXI', 'EWJ'
];

// Lazy initialization of TiingoService to handle missing API key gracefully
async function getTiingoService(): Promise<any | null> {
  try {
    const { TiingoService } = await import('@/lib/tiingo');
    return new TiingoService();
  } catch (error) {
    console.warn('TiingoService initialization failed:', error);
    return null;
  }
}

// Mappa dei nomi completi dei simboli
function getSymbolName(symbol: string): string {
  const symbolNames: { [key: string]: string } = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'NVDA': 'NVIDIA Corporation',
    'META': 'Meta Platforms Inc.',
    'TSLA': 'Tesla Inc.',
    'AMZN': 'Amazon.com Inc.',
    'NFLX': 'Netflix Inc.',
    'SPY': 'SPDR S&P 500 ETF',
    'QQQ': 'Invesco QQQ Trust',
    'IWM': 'iShares Russell 2000 ETF',
    'DIA': 'SPDR Dow Jones Industrial Average ETF',
    'XLF': 'Financial Select Sector SPDR Fund',
    'XLK': 'Technology Select Sector SPDR Fund',
    'XLE': 'Energy Select Sector SPDR Fund',
    'XLV': 'Health Care Select Sector SPDR Fund',
    'XLI': 'Industrial Select Sector SPDR Fund',
    'XLU': 'Utilities Select Sector SPDR Fund',
    'GLD': 'SPDR Gold Trust',
    'SLV': 'iShares Silver Trust',
    'TLT': 'iShares 20+ Year Treasury Bond ETF',
    'VIX': 'CBOE Volatility Index',
    'USO': 'United States Oil Fund',
    'EEM': 'iShares MSCI Emerging Markets ETF',
    'FXI': 'iShares China Large-Cap ETF',
    'EWJ': 'iShares MSCI Japan ETF'
  };
  
  return symbolNames[symbol] || symbol;
}

// Calcolo indicatori tecnici
function calculateTechnicalIndicators(prices: number[]): TechnicalIndicators {
  const length = prices.length;
  if (length < 50) throw new Error('Insufficient data for indicators');
  
  // RSI (14 periodi)
  const rsi = calculateRSI(prices.slice(-15));
  
  // MACD (12, 26, 9)
  const macd = calculateMACD(prices);
  
  // SMA 20 e 50
  const sma20 = prices.slice(-20).reduce((a, b) => a + b) / 20;
  const sma50 = prices.slice(-50).reduce((a, b) => a + b) / 50;
  
  // EMA 12 e 26
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  // Bollinger Bands (20, 2)
  const bollinger = calculateBollingerBands(prices.slice(-20));
  
  // Stochastic (14, 3, 3)
  const stochastic = calculateStochastic(prices.slice(-14));
  
  return {
    rsi,
    macd,
    sma20,
    sma50,
    ema12,
    ema26,
    bollinger,
    stochastic
  };
}

function calculateRSI(prices: number[]): number {
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  const rs = avgGain / avgLoss;
  
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices: number[]) {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  // Semplificato: signal line come EMA 9 della MACD line
  const signal = macdLine * 0.8; // Approssimazione
  const histogram = macdLine - signal;
  
  return {
    macd: macdLine,
    signal,
    histogram
  };
}

function calculateEMA(prices: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

function calculateBollingerBands(prices: number[]) {
  const sma = prices.reduce((a, b) => a + b) / prices.length;
  const variance = prices.reduce((acc, price) => acc + Math.pow(price - sma, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    upper: sma + (2 * stdDev),
    middle: sma,
    lower: sma - (2 * stdDev)
  };
}

function calculateStochastic(prices: number[]) {
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const current = prices[prices.length - 1];
  
  const k = ((current - low) / (high - low)) * 100;
  const d = k * 0.9; // Approssimazione
  
  return { k, d };
}

// AI Logic per determinare segnali
function generateAISignal(symbol: string, name: string, currentPrice: number, change: number, indicators: TechnicalIndicators, volume: number, avgVolume: number): AISignal | null {
  let signal: 'LONG' | 'SHORT' | null = null;
  let confidence = 0;
  let reasoning = '';
  let entryPrice = currentPrice;
  let stopLoss = 0;
  let target1 = 0;
  let target2: number | undefined;
  
  const { rsi, macd, sma20, sma50, ema12, ema26, bollinger, stochastic } = indicators;
  const volumeRatio = volume / avgVolume;
  const changePercent = (change / (currentPrice - change)) * 100;
  
  // Condizioni RIGOROSE basate solo su ANALISI TECNICA REALE
  
  // Logica LONG - Solo segnali tecnicamente validi
  if (
    rsi < 40 && // RSI sotto neutrale con spazio per crescita
    macd.histogram > -1 && // MACD non eccessivamente negativo
    currentPrice > bollinger.lower && // Sopra banda di Bollinger inferiore
    currentPrice < bollinger.middle * 1.02 && // Vicino al centro delle bande
    ema12 >= ema26 * 0.998 && // EMA quasi in crossover positivo
    volumeRatio > 1.0 && // Volume almeno normale
    change >= 0 // Movimento positivo intraday
  ) {
    signal = 'LONG';
    confidence = Math.min(95, 55 + (volumeRatio - 1) * 15 + (40 - rsi) * 1.2);
    reasoning = `LONG: RSI oversold at ${rsi.toFixed(1)}, MACD recovering (${macd.histogram.toFixed(2)}), price near Bollinger middle, EMA alignment improving, volume ${volumeRatio.toFixed(1)}x, positive intraday momentum`;
    entryPrice = currentPrice;
    stopLoss = Math.max(bollinger.lower * 0.995, currentPrice * 0.975);
    target1 = bollinger.middle;
    target2 = bollinger.upper * 0.98;
  }
  // Logica SHORT - Solo segnali tecnicamente validi
  else if (
    rsi > 60 && // RSI sopra neutrale con spazio per scendere
    macd.histogram < 1 && // MACD non eccessivamente positivo
    currentPrice < bollinger.upper && // Sotto banda di Bollinger superiore
    currentPrice > bollinger.middle * 0.98 && // Vicino al centro delle bande
    ema12 <= ema26 * 1.002 && // EMA quasi in crossover negativo
    volumeRatio > 1.0 && // Volume almeno normale
    change <= 0 // Movimento negativo intraday
  ) {
    signal = 'SHORT';
    confidence = Math.min(95, 55 + (volumeRatio - 1) * 15 + (rsi - 60) * 1.2);
    reasoning = `SHORT: RSI overbought at ${rsi.toFixed(1)}, MACD weakening (${macd.histogram.toFixed(2)}), price near Bollinger middle, EMA turning bearish, volume ${volumeRatio.toFixed(1)}x, negative intraday momentum`;
    entryPrice = currentPrice;
    stopLoss = Math.min(bollinger.upper * 1.005, currentPrice * 1.025);
    target1 = bollinger.middle;
    target2 = bollinger.lower * 1.02;
  }
  // Pattern di breakout LONG con forte volume
  else if (
    rsi > 45 && rsi < 65 &&
    macd.macd > macd.signal && // MACD crossover positivo
    currentPrice > sma20 && sma20 > sma50 && // Trend rialzista confermato
    change > 0 && // Movimento positivo
    volumeRatio > 1.3 && // Alto volume per confermare breakout
    currentPrice > bollinger.middle
  ) {
    signal = 'LONG';
    confidence = Math.min(92, 50 + volumeRatio * 12 + (change / currentPrice) * 500);
    reasoning = `Breakout LONG: RSI healthy at ${rsi.toFixed(1)}, MACD bullish crossover, price above SMA20>SMA50, positive momentum with high volume ${volumeRatio.toFixed(1)}x confirming breakout`;
    entryPrice = currentPrice;
    stopLoss = sma20 * 0.99;
    target1 = currentPrice * 1.025;
    target2 = bollinger.upper;
  }
  // Pattern di breakdown SHORT con forte volume
  else if (
    rsi > 35 && rsi < 55 &&
    macd.macd < macd.signal && // MACD crossover negativo
    currentPrice < sma20 && sma20 < sma50 && // Trend ribassista confermato
    change < 0 && // Movimento negativo
    volumeRatio > 1.3 && // Alto volume per confermare breakdown
    currentPrice < bollinger.middle
  ) {
    signal = 'SHORT';
    confidence = Math.min(92, 50 + volumeRatio * 12 + Math.abs(change / currentPrice) * 500);
    reasoning = `Breakdown SHORT: RSI declining at ${rsi.toFixed(1)}, MACD bearish crossover, price below SMA20<SMA50, negative momentum with high volume ${volumeRatio.toFixed(1)}x confirming breakdown`;
    entryPrice = currentPrice;
    stopLoss = sma20 * 1.01;
    target1 = currentPrice * 0.975;
    target2 = bollinger.lower;
  }
  
  // NESSUN SEGNALE se i dati reali non soddisfano i criteri tecnici rigorosi
  if (!signal) return null;
  
  const riskReward = Math.abs(target1 - entryPrice) / Math.abs(stopLoss - entryPrice);
  
  // Filtro meno restrittivo per il risk/reward
  if (riskReward < 1.2) {
    // Aggiusta target per migliorare risk/reward
    if (signal === 'LONG') {
      target1 = entryPrice + (Math.abs(stopLoss - entryPrice) * 1.5);
    } else {
      target1 = entryPrice - (Math.abs(stopLoss - entryPrice) * 1.5);
    }
  }
  
  const finalRiskReward = Math.abs(target1 - entryPrice) / Math.abs(stopLoss - entryPrice);
  
  return {
    symbol,
    name,
    price: currentPrice,
    change,
    changePercent: Math.round(changePercent * 100) / 100,
    signal,
    confidence: Math.round(confidence),
    timeframe: 'INTRADAY',
    indicators,
    aiReasoning: reasoning,
    entryPrice: Math.round(entryPrice * 100) / 100,
    stopLoss: Math.round(stopLoss * 100) / 100,
    target1: Math.round(target1 * 100) / 100,
    target2: target2 ? Math.round(target2 * 100) / 100 : undefined,
    riskReward: Math.round(finalRiskReward * 100) / 100,
    lastUpdated: new Date().toISOString(),
    volume,
    avgVolume: Math.round(avgVolume),
    volumeRatio: Math.round(volumeRatio * 100) / 100
  };
}

// Cache per i segnali (aggiornamento ogni 5 minuti con dati reali)
let cachedSignals: AISignal[] = [];
let lastUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minuti per dati reali

// Fallback AI signals when TIINGO_API_KEY is not available
function getFallbackAISignals(): AISignal[] {
  const now = new Date().toISOString();
  return [
    {
      symbol: 'SPY',
      name: 'SPDR S&P 500 ETF',
      price: 432.15,
      change: 2.35,
      changePercent: 0.55,
      signal: 'LONG' as const,
      confidence: 78,
      timeframe: 'INTRADAY' as const,
      indicators: {
        rsi: 38.2,
        macd: {
          macd: 0.15,
          signal: -0.10,
          histogram: 0.25
        },
        sma20: 430.50,
        sma50: 428.90,
        ema12: 431.80,
        ema26: 429.60,
        bollinger: {
          upper: 435.20,
          middle: 431.15,
          lower: 427.10
        },
        stochastic: {
          k: 42.5,
          d: 38.7
        }
      },
      aiReasoning: 'LONG: RSI oversold at 38.2, MACD recovering (0.25), price near Bollinger middle, EMA alignment improving, volume 1.2x, positive intraday momentum',
      entryPrice: 432.15,
      stopLoss: 428.50,
      target1: 435.80,
      target2: 438.20,
      riskReward: 1.8,
      lastUpdated: now,
      volume: 85420000,
      avgVolume: 71200000,
      volumeRatio: 1.2
    },
    {
      symbol: 'QQQ',
      name: 'Invesco QQQ Trust',
      price: 368.92,
      change: -1.85,
      changePercent: -0.50,
      signal: 'SHORT' as const,
      confidence: 72,
      timeframe: 'INTRADAY' as const,
      indicators: {
        rsi: 62.8,
        macd: {
          macd: -0.08,
          signal: 0.12,
          histogram: -0.20
        },
        sma20: 370.15,
        sma50: 372.30,
        ema12: 369.45,
        ema26: 371.20,
        bollinger: {
          upper: 374.50,
          middle: 370.25,
          lower: 366.00
        },
        stochastic: {
          k: 65.3,
          d: 68.1
        }
      },
      aiReasoning: 'SHORT: RSI overbought at 62.8, MACD weakening (-0.20), price near Bollinger middle, EMA turning bearish, volume 1.3x, negative intraday momentum',
      entryPrice: 368.92,
      stopLoss: 372.10,
      target1: 366.50,
      target2: 364.20,
      riskReward: 1.5,
      lastUpdated: now,
      volume: 52300000,
      avgVolume: 40200000,
      volumeRatio: 1.3
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 178.45,
      change: 1.12,
      changePercent: 0.63,
      signal: 'LONG' as const,
      timeframe: 'INTRADAY' as const,
      confidence: 81,
      indicators: {
        rsi: 45.5,
        macd: {
          macd: 0.25,
          signal: 0.15,
          histogram: 0.10
        },
        sma20: 177.80,
        sma50: 176.20,
        ema12: 178.10,
        ema26: 177.35,
        bollinger: {
          upper: 180.50,
          middle: 178.25,
          lower: 176.00
        },
        stochastic: {
          k: 58.2,
          d: 55.8
        }
      },
      aiReasoning: 'Breakout LONG: RSI healthy at 45.5, MACD bullish crossover, price above SMA20>SMA50, positive momentum with high volume 1.4x confirming breakout',
      entryPrice: 178.45,
      stopLoss: 176.90,
      target1: 180.20,
      target2: 181.80,
      riskReward: 2.0,
      lastUpdated: now,
      volume: 68500000,
      avgVolume: 49000000,
      volumeRatio: 1.4
    }
  ];
}

export async function GET() {
  try {
    console.log('🤖 AI Signals API called');
    
    // Check if Tiingo service is available
    const tiingoService = await getTiingoService();
    if (!tiingoService) {
      console.warn('⚠️ TIINGO_API_KEY not configured - returning fallback AI signals');
      return NextResponse.json({
        success: true,
        signals: getFallbackAISignals(),
        count: 3,
        lastUpdated: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + CACHE_DURATION).toISOString(),
        longSignals: 2,
        shortSignals: 1,
        avgConfidence: 75,
        message: "Demo AI signals - configure TIINGO_API_KEY for real-time data",
        dataSource: "Fallback Demo Data",
        analysisType: "Technical indicators: RSI, MACD, Bollinger Bands, EMA, SMA with volume confirmation"
      });
    }
    
    const now = Date.now();
    if (now - lastUpdate < CACHE_DURATION && cachedSignals.length > 0) {
      console.log('📊 Returning cached AI signals');
      return NextResponse.json({
        success: true,
        signals: cachedSignals,
        count: cachedSignals.length,
        lastUpdated: new Date(lastUpdate).toISOString(),
        nextUpdate: new Date(lastUpdate + CACHE_DURATION).toISOString()
      });
    }
    
    console.log('🔄 Generating AI signals based on REAL market data only...');
    const signals: AISignal[] = [];
    for (const symbol of INTRADAY_SYMBOLS) {
      try {
        console.log(`📈 Processing ${symbol}...`);
        
        // Ottieni dati storici (ultimi 100 giorni per calcolo indicatori)
        const historicalData = await tiingoService.getHistoricalPrices(symbol, 100);
        
        if (!historicalData || historicalData.length < 50) {
          console.log(`❌ Insufficient data for ${symbol}`);
          continue;
        }
        
        // SEMPRE usa dati reali dalla API Tiingo
        const quote = await tiingoService.getStockQuote(symbol);
        if (!quote) {
          console.log(`❌ No real quote data available for ${symbol}`);
          continue;
        }
        
        const currentPrice = quote.price;
        const change = quote.change;
        const volume = quote.volume;
        
        console.log(`📊 REAL data for ${symbol}: Price=${currentPrice.toFixed(2)} (${change > 0 ? '+' : ''}${change.toFixed(2)}), Volume=${volume.toLocaleString()}`);
        
        const prices = historicalData.map((d: any) => d.close);
        
        // Calcola indicatori
        const indicators = calculateTechnicalIndicators(prices);
        
        // Calcola volume medio dai dati storici
        const avgVolume = historicalData.slice(-20).reduce((sum: number, d: any) => sum + d.volume, 0) / 20;
        
        // Genera segnale AI
        const aiSignal = generateAISignal(
          symbol,
          getSymbolName(symbol),
          currentPrice,
          change,
          indicators,
          volume,
          avgVolume
        );
        
        if (aiSignal) {
          signals.push(aiSignal);
          console.log(`✅ Generated ${aiSignal.signal} signal for ${symbol} with ${aiSignal.confidence}% confidence`);
        }
        
        // Breve pausa per non sovraccaricare l'API
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error);
        continue;
      }
    }
    
    // Ordina per confidenza
    signals.sort((a, b) => b.confidence - a.confidence);
    
    // Prendi solo i migliori 15 segnali
    cachedSignals = signals.slice(0, 15);
    lastUpdate = now;
    
    console.log(`🎯 Generated ${cachedSignals.length} AI signals using REAL market data only`);
    
    const responseData = {
      success: true,
      signals: cachedSignals,
      count: cachedSignals.length,
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(now + CACHE_DURATION).toISOString(),
      longSignals: cachedSignals.filter(s => s.signal === 'LONG').length,
      shortSignals: cachedSignals.filter(s => s.signal === 'SHORT').length,
      avgConfidence: cachedSignals.length > 0 
        ? Math.round(cachedSignals.reduce((acc, s) => acc + s.confidence, 0) / cachedSignals.length)
        : null,
      message: cachedSignals.length === 0 
        ? "No signals match our rigorous technical analysis criteria with current market conditions. This ensures only high-quality trading opportunities."
        : `${cachedSignals.length} high-quality signals identified based on technical analysis.`,
      dataSource: "Tiingo API",
      analysisType: "Technical indicators: RSI, MACD, Bollinger Bands, EMA, SMA with volume confirmation"
    };
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('❌ AI Signals API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI signals', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
