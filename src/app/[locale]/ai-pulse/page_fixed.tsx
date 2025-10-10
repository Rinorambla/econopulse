'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, BarChart3, LineChart, PieChart, Activity } from 'lucide-react';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart
} from 'recharts';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';

interface SectorData {
  sector: string; // Changed from 'name' to match API
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  yearly: number;
  marketCap: number;
  volume: number;
  topStocks: string[];
  // Keep legacy fields for backward compatibility
  name?: string;
  symbol?: string;
  performance?: number;
  price?: number;
  change?: number;
  status?: string;
}

// Enhanced tooltip styling for better visibility and contrast
const enhancedTooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.98)',
  border: '2px solid rgba(148, 163, 184, 0.4)',
  borderRadius: '8px',
  color: '#ffffff',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
  fontSize: '14px',
  fontWeight: '600',
  padding: '8px 12px'
};

// High contrast chart colors for sharp visuals
const chartColors = {
  primary: '#3b82f6',    // Blue
  secondary: '#10b981',  // Green  
  accent: '#f59e0b',     // Amber
  warning: '#ef4444',    // Red
  info: '#8b5cf6',       // Purple
  success: '#059669',    // Emerald
  danger: '#dc2626',     // Red-600
  muted: '#6b7280'       // Gray-500
};

// Enhanced heatmap color function with better contrast
const getHeatMapColor = (value: number): string => {
  if (value > 3) return '#10b981';   // Bright green
  if (value > 1) return '#059669';   // Green
  if (value > 0) return '#84cc16';   // Lime
  if (value > -1) return '#f59e0b';  // Amber
  if (value > -3) return '#f97316';  // Orange
  return '#ef4444';                  // Red
};

// Performance color with high contrast for accessibility
const getPerformanceColor = (performance: number): string => {
  if (performance > 3) return '#10b981';   // Bright green
  if (performance > 1) return '#22c55e';   // Green
  if (performance > 0) return '#84cc16';   // Lime
  if (performance > -1) return '#f59e0b';  // Amber
  if (performance > -3) return '#f97316';  // Orange
  return '#ef4444';                        // Red
};

// Text color classes for performance display
const getColorClass = (performance: number): string => {
  if (performance > 3) return 'text-emerald-400';
  if (performance > 1) return 'text-green-400';
  if (performance > 0) return 'text-lime-400';
  if (performance > -1) return 'text-yellow-400';
  if (performance > -3) return 'text-orange-400';
  return 'text-red-400';
};

// Background color classes for cards/tiles
const getBgColorClass = (performance: number): string => {
  if (performance > 3) return 'bg-emerald-600/20 border-emerald-600/30';
  if (performance > 1) return 'bg-green-600/20 border-green-600/30';
  if (performance > 0) return 'bg-lime-600/20 border-lime-600/30';
  if (performance > -1) return 'bg-yellow-600/20 border-yellow-600/30';
  if (performance > -3) return 'bg-orange-600/20 border-orange-600/30';
  return 'bg-red-600/20 border-red-600/30';
};

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

export default function AIPulsePage() {
  const [sectorData, setSectorData] = useState<SectorData[]>([]);
  const [economicData, setEconomicData] = useState<EconomicData | null>(null);
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('weekly');

  const fetchData = async () => {
    try {
      const [sectorResponse, economicResponse, aiResponse] = await Promise.all([
        fetch('/api/sector-performance'),
        fetch('/api/economic-data'), 
        fetch('/api/ai-economic-analysis')
      ]);

      if (sectorResponse.ok) {
        const sectors = await sectorResponse.json();
        setSectorData(sectors.sectors || []);
      } else {
        console.warn('Failed to fetch sector data, using fallback');
        setSectorData([]);
      }

      if (economicResponse.ok) {
        const economic = await economicResponse.json();
        setEconomicData(economic);
      }

      if (aiResponse.ok) {
        const ai = await aiResponse.json();
        setAIAnalysis(ai);
      }
    } catch (error) {
      console.error('Error fetching AI Pulse data:', error);
      setSectorData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getTimeframePerformance = (sector: SectorData): number => {
    return sector[selectedTimeframe] || 0;
  };

  // Performance chart data
  const performanceData = sectorData.map(sector => ({
    name: sector.sector,
    value: getTimeframePerformance(sector),
    volume: sector.volume
  }));

  // Heatmap data for sector visualization
  const heatmapData = sectorData.map((sector, index) => ({
    x: Math.floor(index / 3),
    y: index % 3,
    value: getTimeframePerformance(sector),
    name: sector.sector,
    size: sector.marketCap / 1000000000 // Convert to billions
  }));

  // Correlation analysis data
  const correlationData = sectorData.map(sector => ({
    name: sector.sector,
    weekly: sector.weekly,
    monthly: sector.monthly,
    quarterly: sector.quarterly
  }));

  // Economic indicators radar chart data  
  const radarData = economicData ? [
    {
      metric: 'GDP Growth',
      value: Math.abs(economicData.indicators.gdp?.value || 0) * 10,
      fullMark: 50
    },
    {
      metric: 'Inflation',
      value: Math.min((economicData.indicators.inflation?.value || 0), 50),
      fullMark: 50  
    },
    {
      metric: 'Unemployment',
      value: (economicData.indicators.unemployment?.value || 0) * 5,
      fullMark: 50
    },
    {
      metric: 'Fed Rate',
      value: (economicData.indicators.fedRate?.value || 0) * 5,
      fullMark: 50
    },
    {
      metric: 'Market Confidence',
      value: (economicData.current.confidence || 0) * 10,
      fullMark: 50
    }
  ] : [];

  // Technical indicators data
  const technicalData = sectorData.map((sector, index) => ({
    name: sector.sector,
    rsi: 30 + (getTimeframePerformance(sector) * 2),
    macd: getTimeframePerformance(sector) * 0.3,
    volume: sector.volume / 1000000,
    price: 100 + (getTimeframePerformance(sector) * 2)
  }));

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-gray-300">Loading AI Pulse analysis...</p>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Link href="/en/dashboard" className="text-blue-400 hover:text-blue-300 transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold">
                  <span className="text-blue-400">AI</span> Pulse Analytics
                </h1>
                <p className="text-gray-400">Advanced market intelligence & sector analysis</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 rounded-lg p-3 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8">
            <h3 className="text-lg font-semibold mb-4">Analysis Timeframe</h3>
            <div className="flex flex-wrap gap-2">
              {(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const).map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedTimeframe === timeframe
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Performance Overview Chart */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8">
            <div className="flex items-center space-x-2 mb-6">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold">Sector Performance Overview</h2>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    tick={{ fontSize: 11, fill: '#f1f5f9' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#f1f5f9' }} />
                  <Tooltip 
                    contentStyle={enhancedTooltipStyle}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Bar dataKey="volume" fill="#374151" fillOpacity={0.4} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sector Heatmap */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8">
            <div className="flex items-center space-x-2 mb-6">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold">Sector Performance Heatmap</h2>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Group" 
                    domain={[0, 4]}
                    tick={{ fontSize: 11, fill: '#f1f5f9' }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Position" 
                    domain={[0, 3]}
                    tick={{ fontSize: 11, fill: '#f1f5f9' }}
                  />
                  <Tooltip 
                    contentStyle={enhancedTooltipStyle}
                    labelStyle={{ color: '#f1f5f9' }}
                    formatter={(value, name) => [
                      name === 'value' ? `${(value as number).toFixed(2)}%` : value,
                      name === 'value' ? 'Performance' : name
                    ]}
                  />
                  <Scatter data={heatmapData} fill="#3b82f6">
                    {heatmapData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getHeatMapColor(entry.value)}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Correlation Analysis */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8">
            <div className="flex items-center space-x-2 mb-6">
              <LineChart className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold">Multi-Timeframe Correlation</h2>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={correlationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    tick={{ fontSize: 11, fill: '#f1f5f9' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#f1f5f9' }} />
                  <Tooltip 
                    contentStyle={enhancedTooltipStyle}
                    labelStyle={{ color: '#f1f5f9' }}
                    formatter={(value, name) => [`${(value as number).toFixed(2)}%`, `${name}`]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="weekly" 
                    stackId="1" 
                    stroke="#3b82f6" 
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="monthly" 
                    stackId="1" 
                    stroke="#10b981" 
                    fill="#10b981"
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="quarterly" 
                    stackId="1" 
                    stroke="#f59e0b" 
                    fill="#f59e0b"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Economic Radar Chart */}
          {economicData && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8">
              <div className="flex items-center space-x-2 mb-6">
                <Activity className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-bold">Economic Indicators Radar</h2>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255, 255, 255, 0.2)" />
                    <PolarAngleAxis 
                      dataKey="metric"
                      tick={{ fontSize: 11, fill: '#f1f5f9' }}
                    />
                    <PolarRadiusAxis 
                      angle={90}
                      domain={[0, 50]}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                    />
                    <Radar 
                      name="Current" 
                      dataKey="value" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Tooltip 
                      contentStyle={enhancedTooltipStyle}
                      labelStyle={{ color: '#f1f5f9' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Technical Indicators */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8">
            <div className="flex items-center space-x-2 mb-6">
              <PieChart className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold">Technical Indicators Overview</h2>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={technicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    tick={{ fontSize: 11, fill: '#f1f5f9' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#f1f5f9' }} />
                  <Tooltip 
                    contentStyle={enhancedTooltipStyle}
                    labelStyle={{ color: '#f1f5f9' }}
                    formatter={(value, name) => [
                      `${(value as number).toFixed(2)}${name === 'rsi' ? '' : name === 'volume' ? 'M' : ''}`,
                      typeof name === 'string' ? name.toUpperCase() : name
                    ]}
                  />
                  <Bar dataKey="rsi" fill="#3b82f6" name="RSI" />
                  <Bar dataKey="volume" fill="#10b981" name="Volume" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sector Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {sectorData.map((sector) => {
              const performance = getTimeframePerformance(sector);
              return (
                <div 
                  key={sector.sector} 
                  className={`bg-white/10 backdrop-blur-md rounded-xl p-6 border ${getBgColorClass(performance)} transition-all hover:scale-105`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{sector.sector}</h3>
                    {performance > 0 ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
                  </div>
                  <div className={`text-3xl font-bold mb-2 ${getColorClass(performance)}`}>
                    {performance >= 0 ? '+' : ''}{performance.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>Volume: {(sector.volume / 1000000).toFixed(1)}M</div>
                    <div>Market Cap: ${(sector.marketCap / 1000000000).toFixed(1)}B</div>
                  </div>
                  {sector.topStocks && sector.topStocks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-xs text-gray-400">Top Holdings:</div>
                      <div className="text-sm text-white">
                        {sector.topStocks.slice(0, 3).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Economic Cycle Analysis */}
          {economicData && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                <span className="text-blue-400">Current</span> Economic Cycle
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-blue-400 text-sm font-medium">Cycle Phase</div>
                  <div className="text-white text-lg font-bold">{economicData.current.cycle}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-blue-400 text-sm font-medium">GDP Growth</div>
                  <div className="text-white text-lg font-bold">
                    {economicData.indicators.gdp?.value?.toFixed(1) || 'N/A'}%
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-blue-400 text-sm font-medium">Inflation</div>
                  <div className="text-white text-lg font-bold">
                    {economicData.indicators.inflation?.value ? 
                      (economicData.indicators.inflation.value > 100 ? 
                        ((economicData.indicators.inflation.value / 10).toFixed(1)) : 
                        economicData.indicators.inflation.value.toFixed(1)
                      ) : 'N/A'}%
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-blue-400 text-sm font-medium">Unemployment</div>
                  <div className="text-white text-lg font-bold">
                    {economicData.indicators.unemployment?.value?.toFixed(1) || 'N/A'}%
                  </div>
                </div>
              </div>

              {economicData.analysis && (
                <div className="mt-6 p-4 bg-white/5 rounded-lg">
                  <div className="text-blue-400 text-sm font-medium mb-2">Analysis</div>
                  <div className="text-gray-300">{economicData.analysis}</div>
                </div>
              )}
            </div>
          )}

          {/* AI Economic Analysis */}
          {aiAnalysis && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                <span className="text-blue-400">AI</span> Economic Direction Analysis
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-blue-400 text-sm font-medium">Direction</div>
                  <div className="text-white text-lg font-bold">{aiAnalysis.direction}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-blue-400 text-sm font-medium">Confidence</div>
                  <div className="text-white text-lg font-bold">{aiAnalysis.confidence}%</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-blue-400 text-sm font-medium">Risk Level</div>
                  <div className="text-white text-lg font-bold">{aiAnalysis.riskLevel}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="text-blue-400 text-sm font-medium mb-2">Reasoning</div>
                  <div className="text-gray-300">{aiAnalysis.reasoning}</div>
                </div>

                {aiAnalysis.keyFactors && aiAnalysis.keyFactors.length > 0 && (
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="text-blue-400 text-sm font-medium mb-2">Key Factors</div>
                    <ul className="text-gray-300 space-y-1">
                      {aiAnalysis.keyFactors.map((factor, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-blue-400 mt-1">•</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
