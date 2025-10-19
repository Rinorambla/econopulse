import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Yahoo Finance API for VIX (^VIX symbol)
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
        signal: AbortSignal.timeout(6000)
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch VIX data');
    }

    const data = await response.json();
    const vixData = data.chart?.result?.[0];
    
    if (!vixData) {
      throw new Error('Invalid VIX data structure');
    }

    const currentPrice = vixData.meta.regularMarketPrice;
    const previousClose = vixData.meta.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    // Determine volatility level
    let volatilityLevel = 'Low';
    let color = 'green';
    
    if (currentPrice >= 30) {
      volatilityLevel = 'High';
      color = 'red';
    } else if (currentPrice >= 20) {
      volatilityLevel = 'Moderate';
      color = 'yellow';
    }

    return NextResponse.json({
      success: true,
      data: {
        price: parseFloat(currentPrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volatilityLevel,
        color,
        lastUpdated: new Date().toISOString(),
        symbol: '^VIX'
      }
    });

  } catch (error) {
    console.error('Error fetching VIX data:', error);
    
    // Fallback data
    return NextResponse.json({
      success: false,
      data: {
        price: 18.5, // Fallback value
        change: 0,
        changePercent: 0,
        volatilityLevel: 'Moderate',
        color: 'yellow',
        lastUpdated: new Date().toISOString(),
        symbol: '^VIX',
        error: 'Using fallback data'
      }
    });
  }
}
