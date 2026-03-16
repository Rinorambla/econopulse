import { NextResponse } from 'next/server';
import { getTiingoQuote, getTiingoHistorical } from '@/lib/tiingo';
import { rateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

interface BottomData {
  level: number; // 0-1 scale
  intensity: 'Low' | 'Moderate' | 'High' | 'Extreme';
  description: string;
  timestamp: string;
  components: {
    oversoldSignals: number; // RSI extreme oversold (0-1)
    fearSpike: number; // VIX elevation (0-1)
    putCallPanic: number; // Put/call ratio extreme (0-1)
    defensiveRotation: number; // Utilities vs Tech performance (0-1)
    creditStress: number; // Credit spread widening proxy (0-1)
  };
}

async function calculateBottomLevel(): Promise<BottomData> {
  try {
    // Get major index data
    const [vixQuote, spyQuote, qqq, xlk, xlu, tlt] = await Promise.all([
      getTiingoQuote('VIX'),
      getTiingoQuote('SPY'), 
      getTiingoQuote('QQQ'),
      getTiingoQuote('XLK'), // Technology sector
      getTiingoQuote('XLU'), // Utilities sector (defensive)
      getTiingoQuote('TLT')  // Long-term treasuries (credit stress proxy)
    ]);
    
    // Get historical data for calculations
    const [vixHistorical, spyHistorical, xlkHistorical, xluHistorical, tltHistorical] = await Promise.all([
      getTiingoHistorical('VIX', 30),
      getTiingoHistorical('SPY', 30),
      getTiingoHistorical('XLK', 30),
      getTiingoHistorical('XLU', 30),
      getTiingoHistorical('TLT', 30)
    ]);
    
    if (!vixQuote || !spyQuote || !spyHistorical || !vixHistorical) {
      throw new Error('Failed to fetch required market data');
    }
    
    const currentVIX = vixQuote.adjClose;
    const currentSPY = spyQuote.adjClose;
    
    // Component 1: Oversold Signals (0-1)
    const spyPrices = spyHistorical.map(d => d.adjClose);
    const gains = [];
    const losses = [];
    
    // Calculate RSI for SPY
    for (let i = 0; i < Math.min(14, spyPrices.length - 1); i++) {
      const change = spyPrices[i] - spyPrices[i + 1];
      if (change > 0) gains.push(change);
      else losses.push(Math.abs(change));
    }
    
    const avgGain = gains.length ? gains.reduce((a, b) => a + b) / gains.length : 0;
    const avgLoss = losses.length ? losses.reduce((a, b) => a + b) / losses.length : 1;
    const rsi = 100 - (100 / (1 + avgGain / avgLoss));
    
    // Oversold intensity: stronger signal when RSI < 30
    const oversoldSignals = rsi < 30 ? (30 - rsi) / 30 : 0;
    
    // Component 2: Fear Spike (0-1)
    const vixPrices = vixHistorical.map(d => d.adjClose);
    const vixMA20 = vixPrices.slice(0, 20).reduce((a, b) => a + b) / 20;
    const vixPercentile = vixPrices.filter(price => price <= currentVIX).length / vixPrices.length;
    const fearSpike = vixPercentile > 0.8 ? (vixPercentile - 0.8) / 0.2 : 0;
    
    // Component 3: Put/Call Panic (0-1)
    // Using VIX elevation as proxy for put/call behavior
    const vixElevation = currentVIX > vixMA20 * 1.5 ? 1 : 
                        currentVIX > vixMA20 * 1.2 ? 0.6 : 
                        currentVIX > vixMA20 ? 0.3 : 0;
    const putCallPanic = vixElevation;
    
    // Component 4: Defensive Rotation (0-1)
    let defensiveRotation = 0;
    if (xlk && xlu && xlkHistorical && xluHistorical) {
      const xlkReturn = (xlk.adjClose - xlkHistorical[20]?.adjClose) / xlkHistorical[20]?.adjClose || 0;
      const xluReturn = (xlu.adjClose - xluHistorical[20]?.adjClose) / xluHistorical[20]?.adjClose || 0;
      
      // When utilities outperform tech significantly, it's defensive rotation
      const rotationSignal = xluReturn - xlkReturn;
      defensiveRotation = rotationSignal > 0.05 ? Math.min(1, rotationSignal * 10) : 0;
    }
    
    // Component 5: Credit Stress (0-1)
    let creditStress = 0;
    if (tlt && tltHistorical) {
      const tltReturn = (tlt.adjClose - tltHistorical[20]?.adjClose) / tltHistorical[20]?.adjClose || 0;
      const spyReturn = (currentSPY - spyPrices[20]) / spyPrices[20];
      
      // When bonds significantly outperform stocks, it indicates credit stress
      const spreadProxy = tltReturn - spyReturn;
      creditStress = spreadProxy > 0.03 ? Math.min(1, spreadProxy * 15) : 0;
    }
    
    const components = {
      oversoldSignals: Number(oversoldSignals.toFixed(3)),
      fearSpike: Number(fearSpike.toFixed(3)),
      putCallPanic: Number(putCallPanic.toFixed(3)),
      defensiveRotation: Number(defensiveRotation.toFixed(3)),
      creditStress: Number(creditStress.toFixed(3))
    };
    
    // Calculate composite BOTTOM level (0-1)
    // Higher weight on oversold and fear signals
    const level = (
      oversoldSignals * 0.35 + 
      fearSpike * 0.25 + 
      putCallPanic * 0.2 + 
      defensiveRotation * 0.1 + 
      creditStress * 0.1
    );
    
    const normalizedLevel = Math.max(0, Math.min(1, level));
    
    // Determine intensity and description
    let intensity: 'Low' | 'Moderate' | 'High' | 'Extreme';
    let description: string;
    
    if (normalizedLevel < 0.25) {
      intensity = 'Low';
      description = 'Low panic. Markets stable.';
    } else if (normalizedLevel < 0.5) {
      intensity = 'Moderate';
      description = 'Moderate caution. Quality over growth.';
    } else if (normalizedLevel < 0.75) {
      intensity = 'High';
      description = 'High panic. Value opportunities emerging.';
    } else {
      intensity = 'Extreme';
      description = 'Extreme panic. Potential major bottom forming.';
    }
    
    return {
      level: Number(normalizedLevel.toFixed(3)),
      intensity,
      description,
      timestamp: new Date().toISOString(),
      components
    };
    
  } catch (error) {
    console.error('Error calculating BOTTOM level:', error);
    
    // Fallback values
    return {
      level: 0.37, // Default moderate level
      intensity: 'Moderate',
      description: 'Moderate caution. Quality over growth.',
      timestamp: new Date().toISOString(),
      components: {
        oversoldSignals: 0.3,
        fearSpike: 0.2,
        putCallPanic: 0.4,
        defensiveRotation: 0.1,
        creditStress: 0.2
      }
    };
  }
}

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = await rateLimit(`bottom-detector-${clientIp}`, 60, 300); // 60 requests per 5 minutes
    
    if (!rateLimitResult.allowed) {
      const headers = rateLimitHeaders(rateLimitResult);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers }
      );
    }
    
    const bottomData = await calculateBottomLevel();
    
    const headers = rateLimitHeaders(rateLimitResult);
    return NextResponse.json(bottomData, {
      headers: {
        ...headers,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Refresh-Interval': '300' // 5 minutes
      }
    });
    
  } catch (error) {
    console.error('BOTTOM detector API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate BOTTOM level' },
      { status: 500 }
    );
  }
}