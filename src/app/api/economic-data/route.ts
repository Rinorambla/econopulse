import { NextResponse } from 'next/server';
import { fredService } from '@/lib/fred';

export async function GET() {
  try {
    // Get comprehensive economic data from FRED
    const economicQuadrant = await fredService.getEconomicQuadrant();
    return NextResponse.json({
      success: true,
      realtime: true,
      data: { ...economicQuadrant, realtime: true },
      timestamp: new Date().toISOString(),
      source: 'Federal Reserve Economic Data (FRED)'
    });

  } catch (error) {
    console.error('Error fetching economic data:', error);
  // Do not return synthetic fallback; signal service unavailable
  return NextResponse.json({ success:false, realtime:false, error: 'FRED API temporarily unavailable' }, { status: 503 });
  }
}
