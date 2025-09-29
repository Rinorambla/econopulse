import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

// Bloomberg-Style Market Dashboard API
// Lightweight version for dashboard with essential data only

interface MarketSnapshot {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap?: number
  category: string
  performance: number
  volatility?: number
  rsi?: number
  trend?: 'up' | 'down' | 'sideways'
}

interface MarketSummary {
  totalAssets: number
  gainers: number
  losers: number
  unchanged: number
  totalVolume: number
  marketMomentum: number
  fearGreedIndex: number
  lastUpdate: string
}

// No mock/demo data. Only real data responses.

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request as unknown as Request)
    const rl = rateLimit(`bb:${ip}`, 60, 60_000)
    if (!rl.ok) {
      return NextResponse.json({ status: 'error', message: 'Rate limit exceeded' }, { status: 429, headers: rateLimitHeaders(rl) })
    }
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'
    
    console.log(`Bloomberg API: Fetching ${category} data...`)

    // Try to fetch real data from unified API
    try {
  console.log('Fetching from unified market API...')
  const base = process.env.BASE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
  const response = await fetch(`${base}/api/unified-market?assetClass=${category}&period=1d`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.status === 'success' && data.data) {
          // Transform unified API data to Bloomberg format
          const transformedAssets = data.data.map((asset: any) => ({
            ...asset,
            volatility: undefined,
            rsi: undefined,
            trend: asset.performance > 2 ? 'up' : asset.performance < -2 ? 'down' : 'sideways'
          }))

          const summary: MarketSummary = {
            totalAssets: transformedAssets.length,
            gainers: transformedAssets.filter((a: any) => a.performance > 0).length,
            losers: transformedAssets.filter((a: any) => a.performance < 0).length,
            unchanged: transformedAssets.filter((a: any) => Math.abs(a.performance) < 0.1).length,
            totalVolume: transformedAssets.reduce((sum: number, a: any) => sum + (a.volume || 0), 0),
            marketMomentum: transformedAssets.reduce((sum: number, a: any) => sum + a.performance, 0) / transformedAssets.length,
            fearGreedIndex: 50,
            lastUpdate: data.timestamp
          }

          console.log(`✅ Bloomberg API: Retrieved ${transformedAssets.length} real assets`)

          return NextResponse.json({
            status: 'success',
            data: transformedAssets,
            summary,
            timestamp: data.timestamp,
            source: 'unified-api'
          }, { headers: rateLimitHeaders(rl) })
        }
      }
    } catch (apiError) {
      console.log('Unified API failed')
    }

    // No fallback demo data
    return NextResponse.json({ status: 'error', message: 'Data unavailable' }, { status: 502, headers: rateLimitHeaders(rl) })

  } catch (error) {
    console.error('❌ Bloomberg API Error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to fetch Bloomberg-style market data',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
