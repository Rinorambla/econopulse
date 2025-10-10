'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';

interface SectorData {
  sector: string;
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  yearly: number;
  marketCap: number;
  volume: number;
  topStocks: string[];
  name?: string;
  symbol?: string;
  performance?: number;
  price?: number;
  change?: number;
  status?: string;
}

interface EconomicData {
  current: {
    cycle: string;
    growth: string;
    inflation: string;
    confidence: number;
  };
  indicators: {
    gdp: { value: number; date: string };
    inflation: { value: number; date: string };
    unemployment: { value: number; date: string };
    fedRate: { value: number; date: string };
  };
  analysis: string;
}

interface AIAnalysis {
  direction: string;
  confidence: number;
  reasoning: string;
  keyFactors: string[];
  timeframe: string;
  riskLevel: string;
}

interface ETFData {
  symbol: string;
  name: string;
  category: string;
  price: number;
  change: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  expense: number;
  volatility: number;
  trend: string;
  momentum: string;
  marketCap: number;
  ytdReturn: number;
  peRatio: number;
  dividend: number;
  beta: number;
  timestamp: string;
}

// Utility functions for color classes
const getColorClass = (performance: number) => {
  if (performance > 3) return 'text-emerald-400';
  if (performance > 1) return 'text-green-400';
  if (performance > 0) return 'text-lime-400';
  if (performance > -1) return 'text-amber-400';
  if (performance > -3) return 'text-orange-400';
  return 'text-red-400';
};

const enhancedTooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(148, 163, 184, 0.3)',
  borderRadius: '8px',
  color: '#ffffff',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  fontSize: '14px',
  fontWeight: '500'
};

export default function AIPulsePage({ params }: { params: Promise<{ locale: string }> }) {
  const [sectorData, setSectorData] = useState<SectorData[]>([]);
  const [economicData, setEconomicData] = useState<EconomicData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [etfData, setEtfData] = useState<ETFData[]>([]);
  const [selectedComparison, setSelectedComparison] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');

  // Chart colors
  const chartColors = {
    primary: '#3b82f6',
    secondary: '#10b981', 
    accent: '#f59e0b',
    warning: '#ef4444'
  };

  // Calculate current comparison based on selected ETFs
  const currentComparison = React.useMemo(() => {
    if (!selectedComparison || etfData.length === 0) return null;
    
    const comparisonMap: Record<string, string[]> = {
      'QQQ-SPY': ['QQQ', 'SPY'],
      'VOO-VUG': ['VOO', 'VUG'],
      'QQQ-VGT': ['QQQ', 'VGT'],
      'IVV-VOO': ['IVV', 'VOO'],
      'VOO-VTI': ['VOO', 'VTI'],
      'JEPI-JEPQ': ['JEPI', 'JEPQ']
    };

    const symbols = comparisonMap[selectedComparison];
    if (!symbols) return null;

    return symbols.map(symbol => 
      etfData.find(etf => etf.symbol === symbol)
    ).filter(Boolean) as ETFData[];
  }, [selectedComparison, etfData]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [sectorResponse, economicResponse, aiResponse, etfResponse] = await Promise.all([
        fetch('/api/sector-performance'),
        fetch('/api/economic-data'),
        fetch('/api/ai-economic-analysis'),
        fetch('/api/etf-comparison')
      ]);

      const [sectorResult, economicResult, aiResult, etfResult] = await Promise.all([
        sectorResponse.json(),
        economicResponse.json(),
        aiResponse.json(),
        etfResponse.json()
      ]);

      // Handle sector data
      if (sectorResult.sectors && Array.isArray(sectorResult.sectors)) {
        setSectorData(sectorResult.sectors);
      }

      // Handle economic data
      if (economicResult.current) {
        setEconomicData(economicResult);
      }

      // Handle AI analysis
      if (aiResult && aiResult.direction) {
        setAiAnalysis(aiResult);
      }

      // Handle ETF data
      if (etfResult.etfs && Array.isArray(etfResult.etfs)) {
        setEtfData(etfResult.etfs);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadData();
    }, 300000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Set default comparison when ETF data is loaded
  useEffect(() => {
    if (etfData.length > 0 && !selectedComparison) {
      setSelectedComparison('QQQ-SPY'); // Default to QQQ vs SPY
    }
  }, [etfData, selectedComparison]);

  const getPerformanceValue = (sector: SectorData): number => {
    switch (selectedPeriod) {
      case 'daily':
        return sector.daily || sector.performance || 0;
      case 'weekly':
        return sector.weekly || 0;
      case 'monthly':
        return sector.monthly || 0;
      case 'quarterly':
        return sector.quarterly || 0;
      case 'yearly':
        return sector.yearly || 0;
      default:
        return sector.daily || sector.performance || 0;
    }
  };

  const validSectors = sectorData.filter(sector => 
    sector && 
    typeof getPerformanceValue(sector) === 'number' && 
    !isNaN(getPerformanceValue(sector))
  );

  const averageChange = validSectors.length > 0 
    ? (validSectors.reduce((sum, sector) => sum + getPerformanceValue(sector), 0) / validSectors.length)
    : 0;

  const positiveCount = validSectors.filter(sector => getPerformanceValue(sector) > 0).length;
  const negativeCount = validSectors.filter(sector => getPerformanceValue(sector) < 0).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mb-4 mx-auto"></div>
              <p className="text-white text-xl">Loading AI Pulse Dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/en"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-gray-300 hover:text-white rounded-lg transition-colors border border-white/10 mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          
          <div className="bg-red-500/10 backdrop-blur-md rounded-xl p-8 border border-red-500/20">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Error Loading Data</h1>
            <p className="text-white mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/en"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-gray-300 hover:text-white rounded-lg transition-colors border border-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              AI Pulse Dashboard
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-2">Market Overview</h3>
            <div className={`text-2xl font-bold ${getColorClass(averageChange)}`}>
              {averageChange >= 0 ? '+' : ''}{averageChange.toFixed(2)}%
            </div>
            <div className="text-gray-400 text-sm">Average Change</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-2">Sectors Up</h3>
            <div className="text-2xl font-bold text-green-400">{positiveCount}</div>
            <div className="text-gray-400 text-sm">of {validSectors.length} sectors</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-2">Sectors Down</h3>
            <div className="text-2xl font-bold text-red-400">{negativeCount}</div>
            <div className="text-gray-400 text-sm">of {validSectors.length} sectors</div>
          </div>
        </div>

        {/* ETF Comparison Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">ETF Comparison Tool</h2>
          
          {/* Comparison Selection Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {[
              { key: 'QQQ-SPY', label: 'QQQ vs SPY', symbols: ['QQQ', 'SPY'] },
              { key: 'VOO-VUG', label: 'VOO vs VUG', symbols: ['VOO', 'VUG'] },
              { key: 'QQQ-VGT', label: 'QQQ vs VGT', symbols: ['QQQ', 'VGT'] },
              { key: 'IVV-VOO', label: 'IVV vs VOO', symbols: ['IVV', 'VOO'] },
              { key: 'VOO-VTI', label: 'VOO vs VTI', symbols: ['VOO', 'VTI'] },
              { key: 'JEPI-JEPQ', label: 'JEPI vs JEPQ', symbols: ['JEPI', 'JEPQ'] }
            ].map((comparison) => (
              <button
                key={comparison.key}
                onClick={() => setSelectedComparison(comparison.key)}
                className={`px-4 py-3 rounded-lg border transition-all ${
                  selectedComparison === comparison.key
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                {comparison.label}
              </button>
            ))}
          </div>

          {/* Current Comparison Display */}
          {selectedComparison && currentComparison && currentComparison.length >= 2 && (
            <div className="space-y-6">
              {/* Comparison Chart */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">Price Comparison</h4>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentComparison} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                      <XAxis 
                        dataKey="symbol" 
                        tick={{ fontSize: 12, fill: '#f1f5f9' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#f1f5f9' }}
                        label={{ 
                          value: 'Price ($)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle', fill: '#f1f5f9' }
                        }}
                      />
                      <Tooltip 
                        contentStyle={enhancedTooltipStyle}
                        labelStyle={{ color: '#f1f5f9' }}
                        formatter={(value: any, name: string) => {
                          if (name === 'price') return [`$${Number(value).toFixed(2)}`, 'Current Price'];
                          return [`${Number(value).toFixed(2)}%`, 'Daily Change'];
                        }}
                      />
                      <Bar 
                        dataKey="price" 
                        fill={chartColors.primary}
                        stroke="#ffffff"
                        strokeWidth={1}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">Detailed Comparison</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-gray-300">Symbol</th>
                        <th className="text-right py-2 text-gray-300">Price</th>
                        <th className="text-right py-2 text-gray-300">Change</th>
                        <th className="text-right py-2 text-gray-300">Volume</th>
                        <th className="text-right py-2 text-gray-300">High</th>
                        <th className="text-right py-2 text-gray-300">Low</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentComparison.map((etf: ETFData) => (
                        <tr key={etf.symbol} className="border-b border-white/5">
                          <td className="py-3 text-white font-medium">{etf.symbol}</td>
                          <td className="py-3 text-right text-white">${etf.price.toFixed(2)}</td>
                          <td className={`py-3 text-right font-medium ${getColorClass(etf.change)}`}>
                            {etf.change >= 0 ? '+' : ''}{etf.change.toFixed(2)}%
                          </td>
                          <td className="py-3 text-right text-gray-300">{etf.volume.toLocaleString()}</td>
                          <td className="py-3 text-right text-gray-300">${etf.high.toFixed(2)}</td>
                          <td className="py-3 text-right text-gray-300">${etf.low.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
    </ProtectedRoute>
  );
}
