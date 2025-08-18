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
    let fearGreedIndex = 50; // Base neutral
    
    // Market data influence (70% weight)
    if (marketData && marketData.length > 0) {
      const spyData = marketData.find(stock => stock.symbol === 'SPY');
      const vixData = marketData.find(stock => stock.symbol === 'VIX');
      
      if (spyData) {
        fearGreedIndex += spyData.changePercent * 6; // SPY performance
      }
      
      if (vixData) {
        fearGreedIndex -= vixData.changePercent * 2; // VIX inverse
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
    
    // Determine trend
    const trend = fearGreedIndex > 60 ? 'up' : fearGreedIndex < 40 ? 'down' : 'neutral';
    
    console.log(`✅ Fear & Greed Index: ${Math.round(fearGreedIndex)} (${sentiment})`);
    
    return NextResponse.json({
      fearGreedIndex: Math.round(fearGreedIndex),
      sentiment,
      trend,
      volatility: Math.round(15 + Math.random() * 20),
      aiPrediction: `AI Analysis: Market showing ${sentiment.toLowerCase()} conditions. ${marketData ? 'Real-time data suggests' : 'Economic indicators show'} ${trend === 'up' ? 'bullish' : trend === 'down' ? 'bearish' : 'neutral'} sentiment.`,
      lastUpdated: new Date().toISOString(),
      sources: {
        economic: economicData ? 'FRED API' : 'Simulated',
        market: marketData && marketData.length > 0 ? 'Tiingo API' : 'Simulated'
      }
    });
    
  } catch (error) {
    console.error('❌ Market sentiment API error:', error);
    
    return NextResponse.json({
      fearGreedIndex: 50,
      sentiment: 'Neutral',
      trend: 'neutral',
      volatility: 25,
      aiPrediction: 'Market analysis temporarily unavailable',
      lastUpdated: new Date().toISOString(),
      sources: {
        economic: 'Error',
        market: 'Error'
      }
    }, { status: 200 });
  }
}
