import { NextResponse } from 'next/server';
import { fredService } from '@/lib/fred';

export async function GET() {
  try {
    // Get comprehensive economic data from FRED
    const economicQuadrant = await fredService.getEconomicQuadrant();
    
    return NextResponse.json({
      success: true,
      data: economicQuadrant,
      timestamp: new Date().toISOString(),
      source: 'Federal Reserve Economic Data (FRED)'
    });

  } catch (error) {
    console.error('Error fetching economic data:', error);
    
    // Fallback data if FRED API fails
    return NextResponse.json({
      success: false,
      data: {
        current: {
          cycle: 'Expansion',
          growth: 'Moderate',
          inflation: 'Moderate',
          confidence: 65
        },
        indicators: {
          gdp: { value: 2.8, date: '2025-01-31' },
          inflation: { value: 3.2, date: '2025-01-31' },
          unemployment: { value: 3.8, date: '2025-01-31' },
          fedRate: { value: 5.25, date: '2025-01-31' }
        },
        analysis: 'Economic data temporarily unavailable - using fallback estimates',
        lastUpdated: new Date().toISOString()
      },
      error: 'FRED API temporarily unavailable',
      timestamp: new Date().toISOString(),
      source: 'Fallback Data'
    });
  }
}
