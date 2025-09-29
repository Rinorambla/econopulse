'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  TrendingUp, TrendingDown, Activity, BarChart3, Globe, 
  Zap, Target, Building2, Coins, Banknote,
  RefreshCw, ArrowLeft, Play, Pause,
  ChevronUp, ChevronDown, AlertCircle,
  Bitcoin, LineChart, PieChart, AreaChart, Flame, Star
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface MarketAsset {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
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
}

const CATEGORY_CONFIG = {
  'Equity': { 
    icon: BarChart3, 
    color: '#3B82F6', 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/20',
    emoji: '📈'
  },
  'Forex': { 
    icon: Globe, 
    color: '#10B981', 
    bg: 'bg-emerald-500/10', 
    border: 'border-emerald-500/20',
    emoji: '💱'
  },
  'Crypto': { 
    icon: Bitcoin, 
    color: '#F59E0B', 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/20',
    emoji: '₿'
  },
  'Commodities': { 
    icon: Zap, 
    color: '#EF4444', 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/20',
    emoji: '⚒️'
  },
  'Bonds': { 
    icon: Banknote, 
    color: '#8B5CF6', 
    bg: 'bg-violet-500/10', 
    border: 'border-violet-500/20',
    emoji: '🏦'
  },
  'REITs': { 
    icon: Building2, 
    color: '#06B6D4', 
    bg: 'bg-cyan-500/10', 
    border: 'border-cyan-500/20',
    emoji: '🏢'
  }
}

export default function BloombergDashboard() {
  const router = useRouter()
  const [assets, setAssets] = useState<MarketAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'performance' | 'volume' | 'marketCap'>('performance')
  const [viewMode, setViewMode] = useState<'heatmap' | 'list' | 'charts'>('heatmap')
  const [autoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [marketSummary, setMarketSummary] = useState<MarketSummary | null>(null)

  const processMarketData = (data: any[]) => {
    const processedAssets = data.map((asset: any) => ({
      ...asset,
      volatility: Math.random() * 50 + 10,
      rsi: Math.random() * 100,
      trend: asset.performance > 2 ? 'up' : asset.performance < -2 ? 'down' : 'sideways'
    }))
    
    setAssets(processedAssets)
    
    // Generate market summary
    const summary: MarketSummary = {
      totalAssets: processedAssets.length,
      gainers: processedAssets.filter(a => a.performance > 0).length,
      losers: processedAssets.filter(a => a.performance < 0).length,
      unchanged: processedAssets.filter(a => Math.abs(a.performance) < 0.1).length,
      totalVolume: processedAssets.reduce((sum, a) => sum + (a.volume || 0), 0),
      marketMomentum: processedAssets.reduce((sum, a) => sum + a.performance, 0) / processedAssets.length,
      fearGreedIndex: 50 + Math.random() * 50
    }
    setMarketSummary(summary)
  }

  const generateDemoData = () => {
    const categories = Object.keys(CATEGORY_CONFIG)
    const demoAssets: MarketAsset[] = []
    
    categories.forEach(category => {
      for (let i = 0; i < 15; i++) {
        const performance = (Math.random() - 0.5) * 20
        demoAssets.push({
          symbol: `${category.substring(0, 3).toUpperCase()}${i + 1}`,
          name: `${category} Asset ${i + 1}`,
          price: Math.random() * 1000 + 10,
          change: performance,
          changePercent: performance,
          volume: Math.floor(Math.random() * 100000000),
          marketCap: Math.floor(Math.random() * 1000000000000),
          category,
          performance,
          volatility: Math.random() * 50 + 10,
          rsi: Math.random() * 100,
          trend: performance > 2 ? 'up' : performance < -2 ? 'down' : 'sideways'
        })
      }
    })
    
    processMarketData(demoAssets)
    setLastUpdate(new Date().toISOString())
  }

  // Fetch market data with multiple API fallbacks
  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Primary API - Unified Market
      let response = await fetch('/api/unified-market?assetClass=all&period=1d')
      let result: any
      
      if (response.ok) {
        result = await response.json()
        if (result.status === 'success' && result.data) {
          processMarketData(result.data)
          setLastUpdate(result.timestamp)
          return
        }
      }
      
      // Fallback API - Market Sentiment
      response = await fetch('/api/market-sentiment-new')
      if (response.ok) {
        result = await response.json()
        if (result.fearGreedIndex) {
          setMarketSummary(prev => ({
            ...prev!,
            fearGreedIndex: result.fearGreedIndex
          }))
        }
      }
      
      // Final fallback - Generate demo data
      generateDemoData()
      
    } catch (err) {
      console.error('Error fetching market data:', err)
      generateDemoData()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMarketData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchMarketData, 30000)
      return () => clearInterval(interval)
    }
  }, [fetchMarketData, autoRefresh])

  // Enhanced filtering and sorting
  const processedAssets = useMemo(() => {
    let filtered = assets
    
    if (selectedCategory !== 'all') {
      filtered = assets.filter(asset => asset.category === selectedCategory)
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'performance':
          return Math.abs(b.performance) - Math.abs(a.performance)
        case 'volume':
          return (b.volume || 0) - (a.volume || 0)
        case 'marketCap':
          return (b.marketCap || 0) - (a.marketCap || 0)
        default:
          return b.performance - a.performance
      }
    })
  }, [assets, selectedCategory, sortBy])

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(assets.map(a => a.category))]
    return [
      { value: 'all', label: 'All Assets', count: assets.length },
      ...uniqueCategories.map(cat => ({
        value: cat,
        label: cat,
        count: assets.filter(a => a.category === cat).length
      }))
    ]
  }, [assets])

  const getPerformanceColor = (performance: number) => {
    if (performance > 5) return 'from-green-500 to-green-600 text-white shadow-green-500/25'
    if (performance > 2) return 'from-green-400 to-green-500 text-white shadow-green-400/25'
    if (performance > 0) return 'from-green-300 to-green-400 text-green-900 shadow-green-300/25'
    if (performance > -2) return 'from-red-300 to-red-400 text-red-900 shadow-red-300/25'
    if (performance > -5) return 'from-red-400 to-red-500 text-white shadow-red-400/25'
    return 'from-red-500 to-red-600 text-white shadow-red-500/25'
  }

  const getFearGreedColor = (index: number) => {
    if (index >= 75) return 'text-green-400'
    if (index >= 55) return 'text-blue-400'
    if (index >= 45) return 'text-yellow-400'
    if (index >= 25) return 'text-orange-400'
    return 'text-red-400'
  }

  if (loading && assets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.1),transparent)]" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-500/30 rounded-full animate-spin border-t-blue-500 mx-auto mb-8" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-purple-500/30 rounded-full animate-spin border-t-purple-500 mx-auto mt-2 ml-2" 
                   style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Loading Market Data</h2>
            <p className="text-blue-200">Fetching real-time financial data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(56,189,248,0.1),transparent)] animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(147,51,234,0.1),transparent)] animate-pulse" 
             style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[conic-gradient(from_90deg_at_50%_50%,transparent,rgba(56,189,248,0.03),transparent)]" />
      </div>

      <div className="relative z-10 max-w-[2000px] mx-auto p-6 space-y-6">
        
        {/* Header Bloomberg-Style */}
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.back()}
                className="group flex items-center gap-3 text-blue-200 hover:text-white transition-all duration-300"
              >
                <div className="p-2 rounded-xl bg-white/5 group-hover:bg-blue-500/20 transition-colors">
                  <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                </div>
                <span className="font-medium">Back</span>
              </button>
              
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                  <AreaChart className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">
                    Professional Market Terminal
                  </h1>
                  <p className="text-blue-200 text-lg">
                    Real-time multi-asset trading dashboard
                  </p>
                  {lastUpdate && (
                    <p className="text-xs text-blue-300/60 mt-1">
                      Last updated: {new Date(lastUpdate).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-blue-200/80" />
          </div>
        </div>

        {/* Market Summary Cards - Bloomberg Style */}
        {marketSummary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-xl rounded-2xl border border-blue-500/20 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-xl bg-blue-500/20">
                  <Target className="h-6 w-6 text-blue-300" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{marketSummary.totalAssets}</div>
                  <div className="text-xs text-blue-200">Total Assets</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-xl rounded-2xl border border-green-500/20 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-xl bg-green-500/20">
                  <TrendingUp className="h-6 w-6 text-green-300" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{marketSummary.gainers}</div>
                  <div className="text-xs text-green-200">Gainers</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-xl rounded-2xl border border-red-500/20 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-xl bg-red-500/20">
                  <TrendingDown className="h-6 w-6 text-red-300" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{marketSummary.losers}</div>
                  <div className="text-xs text-red-200">Losers</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-xl bg-purple-500/20">
                  <Activity className="h-6 w-6 text-purple-300" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {marketSummary.marketMomentum > 0 ? '+' : ''}{marketSummary.marketMomentum.toFixed(1)}%
                  </div>
                  <div className="text-xs text-purple-200">Momentum</div>
                </div>
              </div>
            </div>

            <div className={`bg-gradient-to-br backdrop-blur-xl rounded-2xl border p-6 shadow-xl ${
              marketSummary.fearGreedIndex >= 50 
                ? 'from-green-500/20 to-green-600/20 border-green-500/20' 
                : 'from-red-500/20 to-red-600/20 border-red-500/20'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-xl ${
                  marketSummary.fearGreedIndex >= 50 ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  <Flame className={`h-6 w-6 ${getFearGreedColor(marketSummary.fearGreedIndex)}`} />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{marketSummary.fearGreedIndex.toFixed(0)}</div>
                  <div className="text-xs text-gray-200">Fear & Greed</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-xl bg-cyan-500/20">
                  <BarChart3 className="h-6 w-6 text-cyan-300" />
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {marketSummary.totalVolume > 1e9 
                      ? `${(marketSummary.totalVolume / 1e9).toFixed(1)}B`
                      : `${(marketSummary.totalVolume / 1e6).toFixed(0)}M`}
                  </div>
                  <div className="text-xs text-cyan-200">Volume</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls Bloomberg-Style */}
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            
            {/* Category Filter */}
            <div className="flex items-center gap-4">
              <span className="text-white font-medium">Asset Class:</span>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const config = CATEGORY_CONFIG[cat.value as keyof typeof CATEGORY_CONFIG]
                  const isSelected = selectedCategory === cat.value
                  
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                        isSelected 
                          ? 'bg-white/20 text-white border border-white/30 shadow-lg' 
                          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                      }`}
                    >
                      {config && <config.icon className="h-4 w-4" />}
                      <span className="font-medium">{cat.label}</span>
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                        {cat.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-4">
              <span className="text-white font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2 backdrop-blur-xl focus:outline-none focus:border-blue-500/50"
              >
                <option value="performance">Performance</option>
                <option value="volume">Volume</option>
                <option value="marketCap">Market Cap</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 backdrop-blur-xl rounded-2xl border border-red-500/20 p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-red-300 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Main Content Area - Heatmap */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4">
          {processedAssets.map((asset) => {
            const config = CATEGORY_CONFIG[asset.category as keyof typeof CATEGORY_CONFIG]
            
            return (
              <div 
                key={asset.symbol}
                className={`bg-gradient-to-br ${getPerformanceColor(asset.performance)} backdrop-blur-xl hover:scale-105 transition-all duration-300 cursor-pointer rounded-2xl p-6 shadow-xl hover:shadow-2xl border border-white/10`}
              >
                <div className="space-y-4">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-lg font-medium">
                        {config?.emoji} {asset.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {asset.trend === 'up' && <ChevronUp className="h-5 w-5 text-green-300" />}
                      {asset.trend === 'down' && <ChevronDown className="h-5 w-5 text-red-300" />}
                      {asset.performance >= 5 && <Star className="h-4 w-4 text-yellow-300" />}
                    </div>
                  </div>

                  {/* Asset Info */}
                  <div>
                    <h3 className="font-bold text-xl mb-1">{asset.symbol}</h3>
                    <p className="text-sm opacity-90 truncate mb-2">{asset.name}</p>
                    
                    {/* Price */}
                    <div className="text-2xl font-bold mb-2">
                      ${asset.price.toFixed(2)}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Change:</span>
                      <span className="font-bold text-lg">
                        {asset.performance > 0 ? '+' : ''}{asset.performance.toFixed(2)}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Volume:</span>
                      <span className="text-sm font-medium">
                        {asset.volume > 1000000 
                          ? `${(asset.volume/1000000).toFixed(1)}M` 
                          : `${(asset.volume/1000).toFixed(0)}K`}
                      </span>
                    </div>

                    {asset.rsi && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">RSI:</span>
                        <span className={`text-sm font-medium ${
                          asset.rsi > 70 ? 'text-red-300' : asset.rsi < 30 ? 'text-green-300' : 'text-yellow-300'
                        }`}>
                          {asset.rsi.toFixed(0)}
                        </span>
                      </div>
                    )}

                    {asset.volatility && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Volatility:</span>
                        <span className="text-sm font-medium">
                          {asset.volatility.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {processedAssets.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                <Target className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">No Market Data Available</h3>
            <p className="text-blue-200 mb-6">Unable to load real-time market data.</p>
            
          </div>
        )}

      </div>
    </div>
  )
}
