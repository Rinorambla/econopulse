import { NextResponse } from 'next/server';
import { fredService } from '@/lib/fred';
import { getTiingoMarketData } from '@/lib/tiingo';

export async function GET() {
  try {
    console.log('🔍 Calculating Fear & Greed Index with Tiingo data...');
    
    // Get real market data from Tiingo for key indicators
    const marketData = await getTiingoMarketData(['SPY', 'QQQ', 'VIX', 'GLD']).catch(() => null);
    
    // Get economic data from FRED
    const economicData = await fredService.getEconomicSnapshot().catch(() => null);
    
  // Calculate Fear & Greed Index
  let fearGreedIndex = 50; // Base neutral (deterministic start)
    
    // Market data influence (70% weight)
    if (marketData && marketData.length > 0) {
      const spyData = marketData.find(stock => stock.symbol === 'SPY');
      const vixData = marketData.find(stock => stock.symbol === 'VIX');
      
      if (spyData) {
        // Handle both data structures with type casting
        const hasData = 'data' in spyData && spyData.data;
        const changePercent = hasData ? (spyData as any).data.changePercent : (spyData as any).changePercent;
        fearGreedIndex += changePercent * 6; // SPY performance
      }
      
      if (vixData) {
        // Handle both data structures with type casting
        const hasData = 'data' in vixData && vixData.data;
        const changePercent = hasData ? (vixData as any).data.changePercent : (vixData as any).changePercent;
        fearGreedIndex -= changePercent * 2; // VIX inverse
      }
    }
    
    // Economic data influence (30% weight)
    if (economicData) {
      const inflation = economicData.inflation?.value || 3;
      const unemployment = economicData.unemployment?.value || 4;
      
      fearGreedIndex += (3 - inflation) * 2; // Lower inflation = higher greed
      fearGreedIndex += (5 - unemployment) * 1; // Lower unemployment = higher greed
    }
    
    // Ensure within bounds
    fearGreedIndex = Math.max(0, Math.min(100, fearGreedIndex));
    
    // Determine sentiment
    let sentiment: string;
    if (fearGreedIndex >= 75) sentiment = 'Extreme Greed';
    else if (fearGreedIndex >= 55) sentiment = 'Greed';
    else if (fearGreedIndex >= 45) sentiment = 'Neutral';
    else if (fearGreedIndex >= 25) sentiment = 'Fear';
    else sentiment = 'Extreme Fear';
    
    // Determine trend deterministically from index bands
    const trend = fearGreedIndex > 60 ? 'up' : fearGreedIndex < 40 ? 'down' : 'neutral';

    // Derive volatility from VIX (no random). If VIX not available, fallback to SPY abs change * 4 (rough intraday proxy)
    let derivedVolatility = 0;
    if (marketData && marketData.length) {
      const vix = marketData.find(s => s.symbol === 'VIX');
      if (vix) {
        const d: any = 'data' in vix ? (vix as any).data : vix;
        derivedVolatility = Math.round(d?.last ?? d?.close ?? 0);
      } else {
        const spy = marketData.find(s => s.symbol === 'SPY');
        if (spy) {
          const d: any = 'data' in spy ? (spy as any).data : spy;
          if (typeof d?.changePercent === 'number') {
            derivedVolatility = Math.round(Math.abs(d.changePercent) * 4);
          }
        }
      }
    }
    
    console.log(`✅ Fear & Greed Index: ${Math.round(fearGreedIndex)} (${sentiment})`);
    
    return NextResponse.json({
      fearGreedIndex: Math.round(fearGreedIndex),
      sentiment,
      trend,
      volatility: derivedVolatility,
      aiPrediction: `AI Analysis: Market showing ${sentiment.toLowerCase()} conditions. ${marketData ? 'Real-time composite indicates' : 'Economic indicators imply'} ${trend === 'up' ? 'bullish' : trend === 'down' ? 'bearish' : 'neutral'} posture.`,
      lastUpdated: new Date().toISOString(),
      meta: {
        methodology_version: '1.0.0',
        components: {
          prices: 'Tiingo bulk quotes',
          macro: 'FRED snapshot'
        }
      },
      sources: {
        economic: economicData ? 'FRED API' : 'Unavailable',
        market: marketData && marketData.length > 0 ? 'Tiingo API' : 'Unavailable'
      }
    });
    
  } catch (error) {
    console.error('❌ Market sentiment API error:', error);
    
    return NextResponse.json({
      fearGreedIndex: 50,
      sentiment: 'Neutral',
      trend: 'neutral',
      volatility: 0,
      aiPrediction: 'Baseline neutral reading shown (data fetch error).',
      lastUpdated: new Date().toISOString(),
      sources: {
        economic: 'Error',
        market: 'Error'
      }
    }, { status: 200 });
  }
}
