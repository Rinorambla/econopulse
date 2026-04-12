import { NextResponse } from 'next/server';
import { getTiingoMarketData, getTiingoHistorical } from '@/lib/tiingo';
import { getPolygonClient } from '@/lib/polygonFinance';
import { rateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

interface FlameData {
  level: number;
  intensity: 'Low' | 'Moderate' | 'High' | 'Extreme';
  description: string;
  timestamp: string;
  components: {
    vixSpike: number;
    volumeSurge: number;
    putCallExtreme: number;
    fearGreedExcess: number;
    momentumOverbought: number;
  };
}

// Fetch VIX data from Polygon (CBOE index — Tiingo doesn't have it)
async function getVIXData(): Promise<{ current: number; history: number[] }> {
  const polygon = getPolygonClient();
  if (polygon.isConfigured) {
    try {
      const prev = await polygon.getPreviousDay('VIX');
      if (prev && prev.price > 0) {
        return { current: prev.price, history: [prev.price] };
      }
    } catch (e) { console.warn('Polygon VIX failed:', e); }
    // Try VIXY ETF as proxy
    try {
      const vixy = await polygon.getPreviousDay('VIXY');
      if (vixy && vixy.price > 0) {
        // VIXY tracks VIX futures; approximate VIX
        return { current: vixy.price, history: [vixy.price] };
      }
    } catch (e) { /* ignore */ }
  }
  // Fallback: try Tiingo for UVXY/VXX as volatility proxy
  try {
    const hist = await getTiingoHistorical('UVXY', 30);
    if (hist && hist.length > 0) {
      const prices = hist.map((d: any) => d.close).filter(Boolean);
      const current = prices[0] || 20;
      // UVXY is approximately 1.5x VIX; normalize
      return { current: current / 1.5, history: prices.map((p: number) => p / 1.5) };
    }
  } catch (e) { /* ignore */ }
  return { current: 18, history: [18] };
}

async function calculateFlameLevel(): Promise<FlameData> {
  try {
    // Get SPY/QQQ quotes from Tiingo (reliable)
    const quotes = await getTiingoMarketData(['SPY', 'QQQ']);
    const spyQuote = quotes.find((q: any) => q.symbol === 'SPY');
    
    // Get SPY historical + VIX in parallel
    const [spyHistorical, vixData] = await Promise.all([
      getTiingoHistorical('SPY', 30),
      getVIXData(),
    ]);
    
    if (!spyQuote || !spyHistorical || !spyHistorical.length) {
      throw new Error('Failed to fetch required market data');
    }

    const currentVIX = vixData.current;
    const currentSPY = spyQuote.price || spyHistorical[0]?.close;
    const spyPrices = spyHistorical.map((d: any) => d.close).filter(Boolean);
    
    // Component 1: VIX Spike Detection (0-1)
    // VIX below 15 = calm (0), 15-20 = moderate, 20-30 = elevated, 30+ = extreme
    const vixNorm = Math.max(0, Math.min(1, (currentVIX - 12) / 30));
    // Also check VIX acceleration vs recent levels
    const vixHistory = vixData.history.length > 1 ? vixData.history : [currentVIX];
    const vixAvg = vixHistory.reduce((a: number, b: number) => a + b, 0) / vixHistory.length || currentVIX;
    const vixAccel = vixAvg > 0 ? Math.max(0, Math.min(1, (currentVIX - vixAvg) / vixAvg)) : 0;
    const vixSpike = Math.max(vixNorm, vixAccel);
    
    // Component 2: Volume Surge (0-1)
    const recentVolumes = spyHistorical.slice(0, 5).map((d: any) => d.volume).filter(Boolean);
    const historicalVolumes = spyHistorical.slice(5, 25).map((d: any) => d.volume).filter(Boolean);
    const avgRecentVolume = recentVolumes.length ? recentVolumes.reduce((a: number, b: number) => a + b) / recentVolumes.length : 1;
    const avgHistoricalVolume = historicalVolumes.length ? historicalVolumes.reduce((a: number, b: number) => a + b) / historicalVolumes.length : 1;
    const volumeRatio = avgHistoricalVolume > 0 ? avgRecentVolume / avgHistoricalVolume : 1;
    const volumeSurge = Math.max(0, Math.min(1, (volumeRatio - 0.8) / 0.8)); // 0.8x = 0, 1.6x = 1
    
    // Component 3: Put/Call Extreme (0-1)
    // Use VIX as proxy: when VIX is very low (complacency → overheating) or very high (panic)
    // Low VIX (<15) → complacency → overheating signal
    // High VIX (>30) → panic → contrarian overheating signal
    const putCallExtreme = currentVIX < 14 ? 0.8 : 
                           currentVIX < 16 ? 0.5 :
                           currentVIX < 20 ? 0.2 :
                           currentVIX > 35 ? 0.9 :
                           currentVIX > 28 ? 0.6 :
                           currentVIX > 22 ? 0.3 : 0.1;
    
    // Component 4: Fear & Greed Excess (0-1)
    // Based on multi-week SPY return (too-fast rally = overheating)
    const spyReturn20d = spyPrices.length > 20 ? (currentSPY - spyPrices[19]) / spyPrices[19] : 0;
    const spyReturn5d = spyPrices.length > 5 ? (currentSPY - spyPrices[4]) / spyPrices[4] : 0;
    const fearGreedExcess = Math.max(0, Math.min(1, 
      Math.max(Math.abs(spyReturn20d) * 5, Math.abs(spyReturn5d) * 10)
    ));
    
    // Component 5: Momentum Overbought (0-1) — RSI-based
    const gains: number[] = [];
    const losses: number[] = [];
    for (let i = 0; i < Math.min(14, spyPrices.length - 1); i++) {
      const change = spyPrices[i] - spyPrices[i + 1];
      if (change > 0) gains.push(change);
      else losses.push(Math.abs(change));
    }
    const avgGain = gains.length ? gains.reduce((a, b) => a + b) / 14 : 0;
    const avgLoss = losses.length ? losses.reduce((a, b) => a + b) / 14 : 1;
    const rsi = 100 - (100 / (1 + avgGain / (avgLoss || 0.01)));
    const momentumOverbought = rsi > 70 ? (rsi - 70) / 30 : (rsi < 30 ? (30 - rsi) / 30 : 0);
    
    // Weighted composite level (0-1)
    const components = {
      vixSpike: Number(vixSpike.toFixed(3)),
      volumeSurge: Number(volumeSurge.toFixed(3)),
      putCallExtreme: Number(putCallExtreme.toFixed(3)),
      fearGreedExcess: Number(fearGreedExcess.toFixed(3)),
      momentumOverbought: Number(momentumOverbought.toFixed(3))
    };
    
    const level = (
      components.vixSpike * 0.25 + 
      components.volumeSurge * 0.15 + 
      components.putCallExtreme * 0.25 + 
      components.fearGreedExcess * 0.15 + 
      components.momentumOverbought * 0.20
    );
    
    const normalizedLevel = Math.max(0, Math.min(1, level));
    
    let intensity: 'Low' | 'Moderate' | 'High' | 'Extreme';
    let description: string;
    
    if (normalizedLevel < 0.25) {
      intensity = 'Low';
      description = `Market calm. VIX at ${currentVIX.toFixed(1)}, normal volatility.`;
    } else if (normalizedLevel < 0.5) {
      intensity = 'Moderate';
      description = `Moderate activity. VIX at ${currentVIX.toFixed(1)}, balanced positioning.`;
    } else if (normalizedLevel < 0.75) {
      intensity = 'High';
      description = `Elevated signals. VIX at ${currentVIX.toFixed(1)}, risk-on behavior dominant.`;
    } else {
      intensity = 'Extreme';
      description = `Extreme levels. VIX at ${currentVIX.toFixed(1)}, caution advised.`;
    }
    
    return { level: Number(normalizedLevel.toFixed(3)), intensity, description, timestamp: new Date().toISOString(), components };
    
  } catch (error) {
    console.error('Error calculating FLAME level:', error);
    return {
      level: 0.35,
      intensity: 'Moderate',
      description: 'Data partially available. Moderate activity estimated.',
      timestamp: new Date().toISOString(),
      components: { vixSpike: 0.2, volumeSurge: 0.3, putCallExtreme: 0.2, fearGreedExcess: 0.3, momentumOverbought: 0.25 }
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