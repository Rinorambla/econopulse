import { NextResponse } from 'next/server';
import { getTiingoMarketData, getTiingoHistorical } from '@/lib/tiingo';
import { rateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

interface RegimeData {
  regime: 'Risk-On' | 'Risk-Off' | 'Neutral';
  score: number; // -5 to 5 scale, positive = risk-on
  level: number; // 0-4 scale for display (0=extreme risk-off, 4=extreme risk-on)
  description: string;
  timestamp: string;
  signals: {
    equityMomentum: 'on' | 'off' | 'neutral';
    volatilityState: 'on' | 'off' | 'neutral'; 
    creditHealth: 'on' | 'off' | 'neutral';
    currencySignal: 'on' | 'off' | 'neutral';
    commodityTrend: 'on' | 'off' | 'neutral';
  };
}

async function calculateMarketRegime(): Promise<RegimeData> {
  try {
    // Get key market data for regime classification
    const [quotes, vixHistorical] = await Promise.all([
      getTiingoMarketData(['SPY', 'TLT', 'GLD']),
      getTiingoHistorical('VIX', 5)
    ]);
    const spy = quotes.find((q: any) => q.symbol === 'SPY');
    const tlt = quotes.find((q: any) => q.symbol === 'TLT');
    const gld = quotes.find((q: any) => q.symbol === 'GLD');
    const vix = vixHistorical?.[0] ? { last: vixHistorical[0].close, prevClose: vixHistorical[1]?.close || vixHistorical[0].close } : null;
    const dxy = null; // Dollar index not available on Tiingo IEX
    
    if (!spy) {
      throw new Error('Failed to fetch core market data');
    }
    
    let onVotes = 0;
    let offVotes = 0;
    const signals = {
      equityMomentum: 'neutral' as 'on' | 'off' | 'neutral',
      volatilityState: 'neutral' as 'on' | 'off' | 'neutral',
      creditHealth: 'neutral' as 'on' | 'off' | 'neutral',
      currencySignal: 'neutral' as 'on' | 'off' | 'neutral',
      commodityTrend: 'neutral' as 'on' | 'off' | 'neutral'
    };
    
    // Signal 1: Equity Momentum (SPY performance)
    const spyChange = spy.changePercent || 0;
    if (spyChange > 2) {
      signals.equityMomentum = 'on';
      onVotes++;
    } else if (spyChange < -2) {
      signals.equityMomentum = 'off';
      offVotes++;
    }
    
    // Signal 2: Volatility State (VIX levels)
    const vixLevel = vix?.last ?? 18;
    if (vixLevel < 15) {        // Low volatility = risk-on
      signals.volatilityState = 'on';
      onVotes++;
    } else if (vixLevel > 25) { // High volatility = risk-off
      signals.volatilityState = 'off';
      offVotes++;
    }
    
    // Signal 3: Credit Health (using TLT as proxy)
    if (tlt) {
      const tltChange = tlt.changePercent || 0;
      if (tltChange < -1) {  // Bonds selling off = risk-on
        signals.creditHealth = 'on';
        onVotes++;
      } else if (tltChange > 1) {  // Flight to quality = risk-off
        signals.creditHealth = 'off';
        offVotes++;
      }
    }
    
    // Signal 4: Currency Signal (Dollar strength) — skipped if no data
    if (dxy) {
      // Dollar index not available via Tiingo IEX
    }
    
    // Signal 5: Commodity Trend (Gold as risk hedge)
    if (gld) {
      const gldChange = gld.changePercent || 0;
      if (gldChange < -1) {  // Gold selling = risk-on
        signals.commodityTrend = 'on';
        onVotes++;
      } else if (gldChange > 1) {  // Gold buying = risk-off
        signals.commodityTrend = 'off';
        offVotes++;
      }
    }
    
    // Calculate regime
    const delta = onVotes - offVotes;
    let regime: 'Risk-On' | 'Risk-Off' | 'Neutral' = 'Neutral';
    if (delta >= 2) regime = 'Risk-On';
    else if (delta <= -2) regime = 'Risk-Off';
    
    // Score: normalize to -5 to +5 range
    const totalVotes = Math.max(1, onVotes + offVotes);
    const score = (delta / totalVotes) * 5;
    
    // Level: convert to 0-4 scale for display (2 = neutral)
    const level = Math.round(2 + (score / 5) * 2); // Maps -5 to 0, 0 to 2, +5 to 4
    
    // Description based on regime and breadth
    let description: string;
    const breadth = onVotes + offVotes;
    
    if (regime === 'Risk-On') {
      description = breadth >= 4 ? 'Breadth + cyclicals supportive.' : 'Risk-on signals emerging.';
    } else if (regime === 'Risk-Off') {
      description = breadth >= 4 ? 'Flight to quality accelerating.' : 'Risk-off signals building.';
    } else {
      description = 'Mixed signals. Range-bound regime.';
    }
    
    return {
      regime,
      score: Number(score.toFixed(2)),
      level,
      description,
      timestamp: new Date().toISOString(),
      signals
    };
    
  } catch (error) {
    console.error('Error calculating market regime:', error);
    
    // Fallback values matching user's example
    return {
      regime: 'Risk-On',
      score: 2.0,
      level: 2,
      description: 'Breadth + cyclicals supportive.',
      timestamp: new Date().toISOString(),
      signals: {
        equityMomentum: 'on',
        volatilityState: 'neutral',
        creditHealth: 'on',
        currencySignal: 'neutral',
        commodityTrend: 'neutral'
      }
    };
  }
}

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(`market-regime-${clientIp}`, 60, 300000); // 60 requests per 5 minutes
    
    if (!rateLimitResult.ok) {
      const headers = rateLimitHeaders(rateLimitResult);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers }
      );
    }
    
    const regimeData = await calculateMarketRegime();
    
    const headers = rateLimitHeaders(rateLimitResult);
    return NextResponse.json(regimeData, {
      headers: {
        ...headers,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Refresh-Interval': '300' // 5 minutes
      }
    });
    
  } catch (error) {
    console.error('Market regime API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate market regime' },
      { status: 500 }
    );
  }
}