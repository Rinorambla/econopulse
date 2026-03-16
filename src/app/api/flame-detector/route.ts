import { NextResponse } from 'next/server';
import { getTiingoMarketData, getTiingoHistorical } from '@/lib/tiingo';
import { rateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

interface FlameData {
  level: number; // 0-1 scale
  intensity: 'Low' | 'Moderate' | 'High' | 'Extreme';
  description: string;
  timestamp: string;
  components: {
    vixSpike: number; // VIX acceleration (-1 to 1)
    volumeSurge: number; // Volume vs 20-day avg (0-2)
    putCallExtreme: number; // Put/call deviation (-1 to 1)
    fearGreedExcess: number; // F&G above 75 or below 25 (0-1)
    momentumOverbought: number; // RSI extreme levels (0-1)
  };
}

async function calculateFlameLevel(): Promise<FlameData> {
  try {
    // Get current quotes for VIX, SPY, QQQ
    const quotes = await getTiingoMarketData(['SPY', 'QQQ']);
    const spyQuote = quotes.find((q: any) => q.symbol === 'SPY');
    
    // Get historical data
    const [vixHistorical, spyHistorical] = await Promise.all([
      getTiingoHistorical('VIX', 30),
      getTiingoHistorical('SPY', 30)
    ]);
    
    if (!spyQuote || !spyHistorical || !spyHistorical.length) {
      throw new Error('Failed to fetch required market data');
    }

    // Use historical VIX data for current level (VIX may not be in IEX endpoint)
    const currentVIX = vixHistorical?.[0]?.close ?? 18;
    const currentSPY = spyQuote.price || spyHistorical[0]?.close;
    
    // Component 1: VIX Spike Detection (-1 to 1)
    const vixPrices = (vixHistorical || []).map((d: any) => d.close);
    if (!vixPrices.length) throw new Error('No VIX historical data');
    const vixMA20 = vixPrices.slice(0, 20).reduce((a: number, b: number) => a + b) / Math.min(20, vixPrices.length);
    const vixSlice = vixPrices.slice(0, 20);
    const vixStdDev = Math.sqrt(
      vixSlice.reduce((sum: number, p: number) => sum + Math.pow(p - vixMA20, 2), 0) / vixSlice.length
    ) || 1;
    const vixSpike = Math.max(-1, Math.min(1, (currentVIX - vixMA20) / (2 * vixStdDev)));
    
    // Component 2: Volume Surge (0-2 scale)
    const recentVolumes = spyHistorical.slice(0, 5).map((d: any) => d.volume).filter(Boolean);
    const historicalVolumes = spyHistorical.slice(5, 25).map((d: any) => d.volume).filter(Boolean);
    const avgRecentVolume = recentVolumes.length ? recentVolumes.reduce((a: number, b: number) => a + b) / recentVolumes.length : 1;
    const avgHistoricalVolume = historicalVolumes.length ? historicalVolumes.reduce((a: number, b: number) => a + b) / historicalVolumes.length : 1;
    const volumeSurge = Math.min(2, avgRecentVolume / avgHistoricalVolume);
    
    // Component 3: Put/Call Extreme (approximate, -1 to 1)
    // Using VIX as proxy: high VIX = bearish extreme, low VIX = bullish extreme
    const vixPercentile = vixPrices.filter((p: number) => p <= currentVIX).length / vixPrices.length;
    const putCallExtreme = vixPercentile < 0.2 ? 1 : (vixPercentile > 0.8 ? -1 : 0);
    
    // Component 4: Fear & Greed Excess (0-1)
    const spyPrices = spyHistorical.map((d: any) => d.close);
    const spyReturn = spyPrices[20] ? (currentSPY - spyPrices[20]) / spyPrices[20] : 0; // 20-day return
    const fearGreedProxy = Math.max(0, Math.min(1, Math.abs(spyReturn * 10))); // Scale by 10x
    
    // Component 5: Momentum Overbought (0-1)
    // RSI approximation using 14-day price changes
    const gains = [];
    const losses = [];
    for (let i = 0; i < Math.min(14, spyPrices.length - 1); i++) {
      const change = spyPrices[i] - spyPrices[i + 1];
      if (change > 0) gains.push(change);
      else losses.push(Math.abs(change));
    }
    const avgGain = gains.length ? gains.reduce((a, b) => a + b) / gains.length : 0;
    const avgLoss = losses.length ? losses.reduce((a, b) => a + b) / losses.length : 1;
    const rsi = 100 - (100 / (1 + avgGain / avgLoss));
    const momentumOverbought = rsi > 70 ? (rsi - 70) / 30 : (rsi < 30 ? (30 - rsi) / 30 : 0);
    
    // Calculate composite FLAME level (0-1)
    const components = {
      vixSpike: Number(vixSpike.toFixed(3)),
      volumeSurge: Number(volumeSurge.toFixed(3)),
      putCallExtreme: Number(putCallExtreme.toFixed(3)),
      fearGreedExcess: Number(fearGreedProxy.toFixed(3)),
      momentumOverbought: Number(momentumOverbought.toFixed(3))
    };
    
    // Weighted average: VIX and momentum are most important for euphoria
    const level = (
      Math.abs(vixSpike) * 0.3 + 
      (volumeSurge - 1) * 0.2 + 
      Math.abs(putCallExtreme) * 0.2 + 
      fearGreedProxy * 0.15 + 
      momentumOverbought * 0.15
    );
    
    const normalizedLevel = Math.max(0, Math.min(1, level));
    
    // Determine intensity and description
    let intensity: 'Low' | 'Moderate' | 'High' | 'Extreme';
    let description: string;
    
    if (normalizedLevel < 0.25) {
      intensity = 'Low';
      description = 'Market calm. Normal volatility levels.';
    } else if (normalizedLevel < 0.5) {
      intensity = 'Moderate';
      description = 'Moderate optimism. Balanced rotation.';
    } else if (normalizedLevel < 0.75) {
      intensity = 'High';
      description = 'High euphoria. Risk-on behavior dominant.';
    } else {
      intensity = 'Extreme';
      description = 'Extreme euphoria. Caution advised.';
    }
    
    return {
      level: Number(normalizedLevel.toFixed(3)),
      intensity,
      description,
      timestamp: new Date().toISOString(),
      components
    };
    
  } catch (error) {
    console.error('Error calculating FLAME level:', error);
    
    // Fallback values
    return {
      level: 0.40, // Default moderate level
      intensity: 'Moderate',
      description: 'Moderate optimism. Balanced rotation.',
      timestamp: new Date().toISOString(),
      components: {
        vixSpike: 0,
        volumeSurge: 1,
        putCallExtreme: 0,
        fearGreedExcess: 0.4,
        momentumOverbought: 0.3
      }
    };
  }
}

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(`flame-detector-${clientIp}`, 60, 300000); // 60 requests per 5 minutes
    
    if (!rateLimitResult.ok) {
      const headers = rateLimitHeaders(rateLimitResult);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers }
      );
    }
    
    const flameData = await calculateFlameLevel();
    
    const headers = rateLimitHeaders(rateLimitResult);
    return NextResponse.json(flameData, {
      headers: {
        ...headers,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Refresh-Interval': '300' // 5 minutes
      }
    });
    
  } catch (error) {
    console.error('FLAME detector API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate FLAME level' },
      { status: 500 }
    );
  }
}