'use client'

import { useEffect, useState, useCallback } from 'react'

interface FlameData {
  level: number;
  intensity: 'Low' | 'Moderate' | 'High' | 'Extreme';
  description: string;
  timestamp: string;
}

interface BottomData {
  level: number;
  intensity: 'Low' | 'Moderate' | 'High' | 'Extreme';
  description: string;
  timestamp: string;
}

interface RegimeData {
  regime: 'Risk-On' | 'Risk-Off' | 'Neutral';
  score: number;
  level: number;
  description: string;
  timestamp: string;
}

interface RecessionData {
  recession_probability: number;
  risk_level: 'Low risk' | 'Moderate risk' | 'High risk' | 'Extreme risk';
  current_spread: number;
  updated: string;
}

export default function MarketSentimentRiskDashboard() {
  const [flame, setFlame] = useState<FlameData | null>(null)
  const [bottom, setBottom] = useState<BottomData | null>(null)
  const [regime, setRegime] = useState<RegimeData | null>(null)
  const [recession, setRecession] = useState<RecessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [nextUpdate, setNextUpdate] = useState<number>(0)
  const [isOnline, setIsOnline] = useState(true)
  
  // Real-time update interval (30 seconds for dynamic feel)
  const UPDATE_INTERVAL = 30 * 1000

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [flameRes, bottomRes, regimeRes, recessionRes] = await Promise.all([
        fetch('/api/flame-detector', { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }).then(r => r.json()).catch(() => null),
        fetch('/api/bottom-detector', { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }).then(r => r.json()).catch(() => null),
        fetch('/api/market-regime', { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }).then(r => r.json()).catch(() => null),
        fetch('/api/recession-index', { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }).then(r => r.json()).catch(() => null)
      ])
      
      if (flameRes && !flameRes.error) setFlame(flameRes)
      if (bottomRes && !bottomRes.error) setBottom(bottomRes)
      if (regimeRes && !regimeRes.error) setRegime(regimeRes)
      if (recessionRes && !recessionRes.error) setRecession(recessionRes)
      
      const now = new Date()
      setLastUpdated(now.toLocaleTimeString())
      setNextUpdate(Date.now() + UPDATE_INTERVAL)
      setIsOnline(true)
    } catch (error) {
      console.error('Error loading sentiment data:', error)
      setIsOnline(false)
    } finally {
      setLoading(false)
    }
  }, [UPDATE_INTERVAL])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, UPDATE_INTERVAL)
    return () => clearInterval(interval)
  }, [loadData, UPDATE_INTERVAL])

  // Countdown timer for next update
  useEffect(() => {
    if (nextUpdate <= Date.now()) return
    
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((nextUpdate - Date.now()) / 1000))
      if (remaining <= 0) {
        clearInterval(timer)
      }
    }, 1000)
    
    return () => clearInterval(timer)
  }, [nextUpdate])

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'Low': return 'text-green-400'
      case 'Moderate': return 'text-yellow-400'
      case 'High': return 'text-orange-400'
      case 'Extreme': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getRegimeColor = (regimeType: string) => {
    switch (regimeType) {
      case 'Risk-On': return 'text-green-400'
      case 'Risk-Off': return 'text-red-400'
      case 'Neutral': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const getRiskColor = (risk: string) => {
    if (risk.includes('Low')) return 'text-green-400'
    if (risk.includes('Moderate')) return 'text-yellow-400'
    if (risk.includes('High')) return 'text-orange-400'
    if (risk.includes('Extreme')) return 'text-red-400'
    return 'text-gray-400'
  }

  const getCountdown = () => {
    if (!nextUpdate) return 0
    return Math.max(0, Math.ceil((nextUpdate - Date.now()) / 1000))
  }

  if (loading && !flame && !bottom && !regime && !recession) {
    return (
      <section className="max-w-7xl mx-auto px-3 py-4">
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="animate-pulse w-4 h-4 bg-slate-600 rounded"></div>
            <span className="text-slate-400">Loading Market Sentiment & Risk Dashboard...</span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="max-w-7xl mx-auto px-3 py-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className="text-xl font-bold text-white">Market Sentiment & Risk Dashboard</h2>
              <div className="flex items-center space-x-3 text-sm text-slate-400">
                <span>Updated: {lastUpdated}</span>
                {isOnline ? (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Live</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span>Offline</span>
                  </div>
                )}
                {loading && <span className="animate-pulse text-blue-400">●</span>}
              </div>
            </div>
          </div>
          
          {/* Next update countdown */}
          <div className="text-right">
            <div className="text-xs text-slate-500">Next update in</div>
            <div className="text-sm font-mono text-slate-300">
              {getCountdown()}s
            </div>
          </div>
        </div>

        {/* Main Indicators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* FLAME - Euphoria Level */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">🔥</span>
              <div>
                <div className="text-sm font-medium text-slate-300">FLAME</div>
                <div className="text-xs text-slate-500">Euphoria Level</div>
              </div>
            </div>
            {flame ? (
              <>
                <div className="flex items-baseline space-x-2 mb-2">
                  <span className={`text-2xl font-bold ${getIntensityColor(flame.intensity)}`}>
                    {flame.level.toFixed(2)}
                  </span>
                  <span className={`text-sm ${getIntensityColor(flame.intensity)}`}>
                    {flame.intensity}
                  </span>
                </div>
                <div className="text-xs text-slate-400">{flame.description}</div>
              </>
            ) : (
              <div className="text-slate-500">—</div>
            )}
          </div>

          {/* BOTTOM - Panic Level */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="text-sm font-medium text-slate-300">BOTTOM</div>
                <div className="text-xs text-slate-500">Panic Level</div>
              </div>
            </div>
            {bottom ? (
              <>
                <div className="flex items-baseline space-x-2 mb-2">
                  <span className={`text-2xl font-bold ${getIntensityColor(bottom.intensity)}`}>
                    {bottom.level.toFixed(2)}
                  </span>
                  <span className={`text-sm ${getIntensityColor(bottom.intensity)}`}>
                    {bottom.intensity}
                  </span>
                </div>
                <div className="text-xs text-slate-400">{bottom.description}</div>
              </>
            ) : (
              <div className="text-slate-500">—</div>
            )}
          </div>

          {/* Regime - Risk On/Off */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">🎯</span>
              <div>
                <div className="text-sm font-medium text-slate-300">Regime</div>
                <div className="text-xs text-slate-500">Risk-on / off</div>
              </div>
            </div>
            {regime ? (
              <>
                <div className="flex items-baseline space-x-2 mb-2">
                  <span className={`text-2xl font-bold ${getRegimeColor(regime.regime)}`}>
                    {regime.level}
                  </span>
                  <span className={`text-sm ${getRegimeColor(regime.regime)}`}>
                    {regime.regime}
                  </span>
                </div>
                <div className="text-xs text-slate-400">{regime.description}</div>
              </>
            ) : (
              <div className="text-slate-500">—</div>
            )}
          </div>

          {/* Recession - Signal Index */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">📉</span>
              <div>
                <div className="text-sm font-medium text-slate-300">Recession</div>
                <div className="text-xs text-slate-500">Signal index</div>
              </div>
            </div>
            {recession ? (
              <>
                <div className="flex items-baseline space-x-2 mb-2">
                  <span className={`text-2xl font-bold ${getRiskColor(recession.risk_level)}`}>
                    {recession.recession_probability.toFixed(3)}
                  </span>
                  <span className={`text-sm ${getRiskColor(recession.risk_level)}`}>
                    {recession.risk_level}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Spread: {recession.current_spread?.toFixed(2) || 'N/A'}
                </div>
              </>
            ) : (
              <div className="text-slate-500">—</div>
            )}
          </div>

        </div>

        {/* Real-time Status Footer */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-700">
          <div className="text-xs text-slate-500">
            🔴 Real-time updates every 30 seconds
          </div>
          <div className="flex items-center space-x-4">
            {loading && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-3 h-3 border border-slate-400 border-t-transparent rounded-full"></div>
                <span className="text-xs text-slate-400">Refreshing...</span>
              </div>
            )}
            <button 
              onClick={loadData}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              disabled={loading}
            >
              Refresh Now
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}