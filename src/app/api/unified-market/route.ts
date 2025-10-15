import { NextRequest, NextResponse } from 'next/server'
import { unifiedMarketAPI } from '@/lib/unified-market-api'
import { marketScheduler, isMarketHours } from '@/lib/market-scheduler'

// UNIFIED MARKET DATA API ENDPOINT - 2x Daily Updates with Smart Scheduling
export async function GET(request: NextRequest) {
  try {
    console.log('🔥 UNIFIED MARKET API - Starting comprehensive market data fetch...')
    
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    const category = searchParams.get('category') || 'all'
    
    const startTime = Date.now()
    
    // Controlla se dovremmo aggiornare basato sullo scheduler
    const shouldUpdate = forceRefresh || marketScheduler.shouldUpdateNow()
    
    if (!shouldUpdate && !forceRefresh) {
      const schedulerStats = marketScheduler.getSchedulerStats()
      
      return NextResponse.json({
        success: false,
        message: 'Market data not scheduled for update at this time',
        scheduled: true,
        scheduler: schedulerStats,
        isMarketHours: isMarketHours(),
        timestamp: new Date().toISOString()
      }, { status: 202 })
    }
    
    // Ottieni dati dal sistema unificato
    const marketData = await unifiedMarketAPI.getMarketData(shouldUpdate)
    
    if (!marketData) {
      const schedulerStats = marketScheduler.getSchedulerStats()
      
      return NextResponse.json({
        error: 'No market data available',
        message: 'API not scheduled to update at this time',
        scheduler: schedulerStats,
        isMarketHours: isMarketHours()
      }, { status: 202 })
    }
    
    const duration = Date.now() - startTime
    
    // Statistiche utilizzo API
    const apiStats = unifiedMarketAPI.getAPIUsageStats()
    const schedulerStats = marketScheduler.getSchedulerStats()
    
    // Organizza dati per categoria
    const organizedData = {
      equity: marketData.equity || [],
      forex: marketData.forex || [],
      crypto: marketData.crypto || [],
      commodities: marketData.commodities || [],
      bonds: marketData.bonds || [],
    }
    
    // Se richiesta una categoria specifica
    if (category !== 'all' && organizedData[category as keyof typeof organizedData]) {
      const categoryData = organizedData[category as keyof typeof organizedData]
      
      return NextResponse.json({
        success: true,
        category: category,
        data: categoryData,
        count: categoryData.length,
        cached: marketData.cached,
        timestamp: marketData.timestamp || new Date().toISOString(),
        nextUpdate: marketData.nextUpdate,
        processingTime: `${duration}ms`,
        apiUsage: apiStats,
        scheduler: schedulerStats,
        updateSchedule: '2x daily at 9:00 and 15:00 (market hours)',
        isMarketHours: isMarketHours()
      })
    }
    
    // Combina tutti i dati per heatmap
    const allAssets = [
      ...organizedData.equity.map((item: any) => ({ ...item, category: 'equity' })),
      ...organizedData.forex.map((item: any) => ({ ...item, category: 'forex' })),
      ...organizedData.crypto.map((item: any) => ({ ...item, category: 'crypto' })),
      ...organizedData.commodities.map((item: any) => ({ ...item, category: 'commodities' })),
      ...organizedData.bonds.map((item: any) => ({ ...item, category: 'bonds' }))
    ]
    
    // Aggiungi colori per performance
    const processedAssets = allAssets.map(asset => {
      const colors = getColorFromPerformance(asset.changePercent || 0)
      return {
        ...asset,
        performance: asset.changePercent || 0,
        colors: colors,
        volatility: Math.abs(asset.changePercent || 0),
        strength: (asset.changePercent || 0) > 0 ? 'strong' : 'weak',
        rank: 0 // Sarà assegnato dopo il sorting
      }
    })
    
    // Ordina per performance
    processedAssets.sort((a, b) => b.performance - a.performance)
    
    // Assegna rank
    processedAssets.forEach((asset, index) => {
      asset.rank = index + 1
      asset.percentile = ((processedAssets.length - index) / processedAssets.length) * 100
    })
    
    console.log(`🎯 UNIFIED API COMPLETE:
    📊 Total Assets: ${processedAssets.length}
    📈 Equity: ${organizedData.equity.length}
    💱 Forex: ${organizedData.forex.length}  
    ₿ Crypto: ${organizedData.crypto.length}
    ⚒️ Commodities: ${organizedData.commodities.length}
    🏦 Bonds: ${organizedData.bonds.length}
    ⚡ Processing Time: ${duration}ms
    📡 Cached: ${marketData.cached}`)
    
    return NextResponse.json({
      success: true,
      data: processedAssets,
      summary: {
        totalAssets: processedAssets.length,
        byCategory: {
          equity: organizedData.equity.length,
          forex: organizedData.forex.length,
          crypto: organizedData.crypto.length,
          commodities: organizedData.commodities.length,
          bonds: organizedData.bonds.length
        },
        performance: {
          gainers: processedAssets.filter(a => a.performance > 0).length,
          losers: processedAssets.filter(a => a.performance < 0).length,
          avgPerformance: processedAssets.reduce((sum, a) => sum + a.performance, 0) / processedAssets.length
        },
        apiUsage: apiStats,
        dataSources: {
          primary: ['Tiingo', 'TwelveData', 'ExchangeRate', 'AlphaVintage'],
          coverage: '100% multi-source with intelligent rotation',
          updateFrequency: '2x daily (9:00 and 15:00)'
        },
        scheduler: schedulerStats
      },
      cached: marketData.cached,
      timestamp: marketData.timestamp || new Date().toISOString(),
      nextUpdate: marketData.nextUpdate,
      processingTime: `${duration}ms`,
      isMarketHours: isMarketHours(),
      updateSchedule: {
        frequency: '2x daily',
        times: ['09:00', '15:00'],
        timezone: 'Market hours',
        cacheDuration: '6 hours',
        scheduler: schedulerStats
      }
    })
    
  } catch (error) {
    console.error('❌ Unified Market API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Unified Market API Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      fallback: true
    }, { status: 500 })
  }
}

// Helper per i colori basati sulla performance
function getColorFromPerformance(performance: number): { bg: string, text: string, border: string } {
  if (performance >= 5) return { bg: '#006600', text: '#ffffff', border: '#008800' }
  if (performance >= 3) return { bg: '#008800', text: '#ffffff', border: '#00aa00' }
  if (performance >= 1) return { bg: '#00aa00', text: '#ffffff', border: '#00cc00' }
  if (performance >= 0.5) return { bg: '#00cc00', text: '#000000', border: '#00ee00' }
  if (performance >= 0) return { bg: '#00ee00', text: '#000000', border: '#00ff00' }
  if (performance >= -0.5) return { bg: '#ffeeee', text: '#000000', border: '#ffcccc' }
  if (performance >= -1) return { bg: '#ffcccc', text: '#000000', border: '#ffaaaa' }
  if (performance >= -3) return { bg: '#ff6666', text: '#ffffff', border: '#ff4444' }
  if (performance >= -5) return { bg: '#cc0000', text: '#ffffff', border: '#aa0000' }
  return { bg: '#990000', text: '#ffffff', border: '#770000' }
}
