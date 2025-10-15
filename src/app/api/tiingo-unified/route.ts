import { NextRequest, NextResponse } from 'next/server'
import { TiingoUnifiedAPI } from '@/lib/tiingo-unified'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'
    const summary = searchParams.get('summary') === 'true'

    console.log(`🎯 Tiingo-Only API: Fetching ${category} data...`)

    // Initialize Tiingo API
    const apiKey = process.env.TIINGO_API_KEY
    if (!apiKey) {
      throw new Error('TIINGO_API_KEY not found in environment variables')
    }

    const tiingoAPI = new TiingoUnifiedAPI(apiKey)

    if (summary) {
      // Return only market summary
      const marketSummary = await tiingoAPI.getMarketSummary()
      
      return NextResponse.json({
        status: 'success',
        summary: marketSummary,
        timestamp: new Date().toISOString(),
        source: 'Tiingo Unified'
      })
    }

    // Fetch comprehensive market data
    const marketData = await tiingoAPI.fetchAllMarketData(category)

    if (marketData.length === 0) {
      return NextResponse.json({
        status: 'error',
        message: 'No data available from Tiingo',
        timestamp: new Date().toISOString()
      }, { status: 404 })
    }

    // Calculate summary statistics
    const summary_stats = {
      totalAssets: marketData.length,
      gainers: marketData.filter(asset => asset.performance > 0).length,
      losers: marketData.filter(asset => asset.performance < 0).length,
      unchanged: marketData.filter(asset => Math.abs(asset.performance) < 0.1).length,
      totalVolume: marketData.reduce((sum, asset) => sum + (asset.volume || 0), 0),
      averagePerformance: marketData.reduce((sum, asset) => sum + asset.performance, 0) / marketData.length,
      assetBreakdown: {
        equity: marketData.filter(a => a.assetClass === 'Equity').length,
        crypto: marketData.filter(a => a.assetClass === 'Cryptocurrency').length,
        forex: marketData.filter(a => a.assetClass === 'Currency').length,
        etf: marketData.filter(a => a.category === 'ETF').length
      }
    }

    console.log(`✅ Tiingo-Only API: Retrieved ${marketData.length} assets`)
    console.log(`    📈 Equity: ${summary_stats.assetBreakdown.equity}`)
    console.log(`    ₿ Crypto: ${summary_stats.assetBreakdown.crypto}`)
    console.log(`    💱 Forex: ${summary_stats.assetBreakdown.forex}`)
    console.log(`    🏦 ETF: ${summary_stats.assetBreakdown.etf}`)

    return NextResponse.json({
      status: 'success',
      data: marketData,
      summary: summary_stats,
      metadata: {
        category,
        totalAssets: marketData.length,
        dataSource: 'Tiingo API',
        coverage: 'Global Markets',
        realTime: true
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Tiingo-Only API Error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to fetch data from Tiingo',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { 
    status: 200, 
    headers: { 'Content-Type': 'application/json' }
  })
}
