import { NextRequest, NextResponse } from 'next/server';

// API LEGGERA - Solo per testare che il server funzioni
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const test = searchParams.get('test');
    
    // Health check - risposta immediata
    if (test === 'health') {
      return NextResponse.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      });
    }

    // Test minimale con dati mock
    if (test === 'mock') {
      const mockData = {
        status: 'success',
        data: {
          stocks: [
            { symbol: 'AAPL', price: 150.25, change: 2.5, changePercent: 1.69 },
            { symbol: 'GOOGL', price: 2800.50, change: -15.25, changePercent: -0.54 },
            { symbol: 'MSFT', price: 380.75, change: 5.10, changePercent: 1.36 }
          ],
          forex: [
            { symbol: 'EURUSD', price: 1.0875, change: 0.0025, changePercent: 0.23 },
            { symbol: 'GBPUSD', price: 1.2650, change: -0.0030, changePercent: -0.24 }
          ],
          crypto: [
            { symbol: 'BTC', price: 43250.00, change: 1250.00, changePercent: 2.98 },
            { symbol: 'ETH', price: 2580.50, change: -45.25, changePercent: -1.72 }
          ]
        },
        timestamp: new Date().toISOString()
      };

      return NextResponse.json(mockData);
    }

    // Default: Info API
    return NextResponse.json({
      api: 'Unified Market API - Light',
      endpoints: {
        health: '/api/light-test?test=health',
        mock: '/api/light-test?test=mock',
        status: '/api/light-test'
      },
      status: 'available',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Light API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
