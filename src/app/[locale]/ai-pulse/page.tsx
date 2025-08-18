'use client';

import React, { useState, useEffect } from 'react';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Target,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Clock,
  Activity,
  Globe,
  DollarSign,
  Briefcase,
  PieChart
} from 'lucide-react';
import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Cell
} from 'recharts';

// ===== INTERFACES =====
interface SectorPerformance {
  sector: string;
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  yearly: number;
  marketCap: number;
  volume: number;
  topStocks: string[];
}

interface EconomicCycle {
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
  lastUpdated: string;
}

interface AIEconomicAnalysis {
  currentCycle: string;
  direction: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  confidence: number;
  timeframe: string;
  keyFactors: string[];
  risks: string[];
  opportunities: string[];
  summary: string;
  recommendation: string;
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

// ===== MAIN COMPONENT =====
export default function AIPulsePage({ params }: { params: Promise<{ locale: string }> }) {
  const [sectorData, setSectorData] = useState<SectorPerformance[]>([]);
  const [economicData, setEconomicData] = useState<EconomicCycle | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIEconomicAnalysis | null>(null);
  const [etfData, setEtfData] = useState<ETFData[]>([]);
  const [selectedComparison, setSelectedComparison] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('daily');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch sector performance data
  const fetchSectorData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/sector-performance');
      if (!response.ok) throw new Error('Failed to fetch sector data');
      
      const data = await response.json();
      setSectorData(data.sectors || []);
      setLastUpdated(data.lastUpdated || new Date().toISOString());
      setError('');
    } catch (err) {
      console.error('Error fetching sector data:', err);
      setError('Failed to load sector performance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch economic cycle data
  const fetchEconomicData = async () => {
    try {
      const response = await fetch('/api/economic-data');
      if (!response.ok) throw new Error('Failed to fetch economic data');
      
      const result = await response.json();
      setEconomicData(result.data);
    } catch (err) {
      console.error('Error fetching economic data:', err);
    }
  };

  // Fetch AI economic analysis
  const fetchAIAnalysis = async () => {
    try {
      setAiLoading(true);
      const response = await fetch('/api/ai-economic-analysis');
      if (!response.ok) throw new Error('Failed to fetch AI analysis');
      
      const result = await response.json();
      setAiAnalysis(result.data?.analysis || result);
    } catch (err) {
      console.error('Error fetching AI analysis:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // Fetch ETF comparison data
  const fetchETFData = async () => {
    try {
      const response = await fetch('/api/etf-comparison');
      if (!response.ok) throw new Error('Failed to fetch ETF data');
      
      const result = await response.json();
      setEtfData(result.etfs || []);
    } catch (err) {
      console.error('Error fetching ETF data:', err);
    }
  };

  useEffect(() => {
    fetchSectorData();
    fetchEconomicData();
    fetchAIAnalysis();
    fetchETFData();
  }, []);

  // Set default comparison when ETF data is loaded
  useEffect(() => {
    if (etfData.length > 0 && !selectedComparison) {
      setSelectedComparison('QQQ-SPY'); // Default to QQQ vs SPY
    }
  }, [etfData, selectedComparison]);

  // Handle refresh
  const handleRefresh = () => {
    fetchSectorData();
    fetchEconomicData();
    fetchAIAnalysis();
    fetchETFData();
  };

  // Get performance value based on selected period
  const getPerformanceValue = (sector: SectorPerformance) => {
    switch (selectedPeriod) {
      case 'daily': return sector.daily;
      case 'weekly': return sector.weekly;
      case 'monthly': return sector.monthly;
      case 'quarterly': return sector.quarterly;
      case 'yearly': return sector.yearly;
      default: return sector.daily;
    }
  };

  // Get period label
  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'daily': return 'Today';
      case 'weekly': return 'This Week';
      case 'monthly': return 'This Month';
      case 'quarterly': return 'This Quarter';
      case 'yearly': return 'This Year';
      default: return 'Today';
    }
  };

  // Get economic cycle color
  const getEconomicCycleColor = (cycle: string) => {
    switch (cycle.toLowerCase()) {
      case 'expansion': return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'peak': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';  
      case 'contraction': case 'recession': return 'text-red-400 bg-red-900/20 border-red-500/30';
      case 'trough': return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  // Get color based on performance
  const getPerformanceColor = (value: number) => {
    if (value > 2) return 'text-emerald-400';
    if (value > 1) return 'text-green-400';  
    if (value > 0) return 'text-lime-400';
    if (value > -1) return 'text-yellow-400';
    if (value > -2) return 'text-orange-400';
    return 'text-red-400';
  };

  // Get AI direction color and icon
  const getAIDirectionDisplay = (direction: string) => {
    const dir = direction.toLowerCase();
    if (dir === 'bullish') return { color: 'text-green-400', icon: <TrendingUp className="w-5 h-5" />, bg: 'bg-green-900/20 border-green-500/30' };
    if (dir === 'bearish') return { color: 'text-red-400', icon: <TrendingDown className="w-5 h-5" />, bg: 'bg-red-900/20 border-red-500/30' };
    if (dir === 'mixed') return { color: 'text-yellow-400', icon: <BarChart3 className="w-5 h-5" />, bg: 'bg-yellow-900/20 border-yellow-500/30' };
    return { color: 'text-gray-400', icon: <Target className="w-5 h-5" />, bg: 'bg-gray-900/20 border-gray-500/30' };
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
              onClick={handleRefresh}
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
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Economic Cycle Overview */}
          {economicData && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Globe className="w-7 h-7 text-blue-400" />
                  Economic Cycle Analysis
                </h2>
                {lastUpdated && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Clock className="w-4 h-4" />
                    Updated: {new Date(lastUpdated).toLocaleTimeString()}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`rounded-lg p-4 border ${getEconomicCycleColor(economicData.current.cycle)}`}>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Current Cycle
                  </h3>
                  <p className="text-lg font-bold">{economicData.current.cycle}</p>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-gray-300 font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Growth
                  </h3>
                  <p className="text-lg font-bold text-white">{economicData.current.growth}</p>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-gray-300 font-semibold mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Inflation
                  </h3>
                  <p className="text-lg font-bold text-white">{economicData.current.inflation}</p>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-gray-300 font-semibold mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Confidence
                  </h3>
                  <p className="text-lg font-bold text-white">{economicData.current.confidence}/100</p>
                </div>
              </div>
              
              {economicData.indicators && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Key Economic Indicators</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-gray-400 text-sm">GDP Growth</p>
                      <p className="text-white font-semibold">{economicData.indicators.gdp?.value}%</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-gray-400 text-sm">Fed Rate</p>
                      <p className="text-white font-semibold">{economicData.indicators.fedRate?.value}%</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-gray-400 text-sm">Unemployment</p>
                      <p className="text-white font-semibold">{economicData.indicators.unemployment?.value}%</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-gray-400 text-sm">Inflation Rate</p>
                      <p className="text-white font-semibold">{economicData.indicators.inflation?.value}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Economic Analysis */}
          {aiAnalysis && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Target className="w-7 h-7 text-purple-400" />
                  AI Economic Analysis
                  {aiLoading && <RefreshCw className="w-5 h-5 animate-spin" />}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {/* Direction */}
                <div className={`rounded-lg p-4 border ${getAIDirectionDisplay(aiAnalysis.direction).bg}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {getAIDirectionDisplay(aiAnalysis.direction).icon}
                    <h3 className="font-semibold">Market Direction</h3>
                  </div>
                  <p className={`text-lg font-bold capitalize ${getAIDirectionDisplay(aiAnalysis.direction).color}`}>
                    {aiAnalysis.direction}
                  </p>
                </div>

                {/* Confidence */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-white">Confidence Level</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${aiAnalysis.confidence}%` }}
                      ></div>
                    </div>
                    <p className="text-lg font-bold text-blue-400">{aiAnalysis.confidence}%</p>
                  </div>
                </div>

                {/* Timeframe */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-green-400" />
                    <h3 className="font-semibold text-white">Timeframe</h3>
                  </div>
                  <p className="text-lg font-bold text-green-400">{aiAnalysis.timeframe}</p>
                </div>
              </div>

              {/* Summary */}
              {aiAnalysis.summary && (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">AI Summary</h3>
                  <p className="text-gray-300 leading-relaxed">{aiAnalysis.summary}</p>
                </div>
              )}

              {/* Key Factors, Risks, Opportunities */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Key Factors */}
                {aiAnalysis.keyFactors && aiAnalysis.keyFactors.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      Key Factors
                    </h3>
                    <ul className="space-y-2">
                      {aiAnalysis.keyFactors.slice(0, 3).map((factor, idx) => (
                        <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                          <span className="text-blue-400 mt-1">•</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risks */}
                {aiAnalysis.risks && aiAnalysis.risks.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-red-400" />
                      Key Risks
                    </h3>
                    <ul className="space-y-2">
                      {aiAnalysis.risks.slice(0, 3).map((risk, idx) => (
                        <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                          <span className="text-red-400 mt-1">•</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Opportunities */}
                {aiAnalysis.opportunities && aiAnalysis.opportunities.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-400" />
                      Opportunities
                    </h3>
                    <ul className="space-y-2">
                      {aiAnalysis.opportunities.slice(0, 3).map((opportunity, idx) => (
                        <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                          <span className="text-green-400 mt-1">•</span>
                          <span>{opportunity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sector Performance */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <PieChart className="w-7 h-7 text-emerald-400" />
                Sector Performance Analysis
              </h2>
              
              <div className="flex items-center gap-4">
                {/* Period Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Period:</span>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as any)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                
                {lastUpdated && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Clock className="w-4 h-4" />
                    {new Date(lastUpdated).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>

            {sectorData.length > 0 && (
              <div className="space-y-6">
                {/* Performance Chart */}
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">Sector Performance - {getPeriodLabel()}</h4>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sectorData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis 
                          dataKey="sector" 
                          tick={{ fontSize: 12, fill: '#f1f5f9' }}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: '#f1f5f9' }}
                          label={{ 
                            value: 'Performance (%)', 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { textAnchor: 'middle', fill: '#f1f5f9' }
                          }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            borderRadius: '8px',
                            color: '#ffffff'
                          }}
                          formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Performance']}
                        />
                        <Bar 
                          dataKey={(entry: SectorPerformance) => getPerformanceValue(entry)}
                          fill="#3b82f6"
                          stroke="#ffffff"
                          strokeWidth={1}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sector Details Table */}
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">Detailed Sector Analysis</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 text-gray-300">Sector</th>
                          <th className="text-right py-2 text-gray-300">Performance</th>
                          <th className="text-right py-2 text-gray-300">Volume</th>
                          <th className="text-right py-2 text-gray-300">Market Cap</th>
                          <th className="text-left py-2 text-gray-300">Top ETFs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...sectorData]
                          .sort((a, b) => getPerformanceValue(b) - getPerformanceValue(a))
                          .map((sector, index) => (
                            <tr key={sector.sector} className="border-b border-white/5">
                              <td className="py-3 text-white font-medium">{sector.sector}</td>
                              <td className={`py-3 text-right font-medium ${getPerformanceColor(getPerformanceValue(sector))}`}>
                                {getPerformanceValue(sector) >= 0 ? '+' : ''}{getPerformanceValue(sector).toFixed(2)}%
                              </td>
                              <td className="py-3 text-right text-gray-300">
                                {(sector.volume / 1000000).toFixed(1)}M
                              </td>
                              <td className="py-3 text-right text-gray-300">
                                ${(sector.marketCap / 1000000000).toFixed(1)}B
                              </td>
                              <td className="py-3 text-gray-300">
                                {sector.topStocks?.slice(0, 3).join(', ') || 'N/A'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ETF Comparison Tool */}
          {etfData.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8">
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
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid rgba(148, 163, 184, 0.3)',
                              borderRadius: '8px',
                              color: '#ffffff'
                            }}
                            formatter={(value: any, name: string) => {
                              if (name === 'price') return [`$${Number(value).toFixed(2)}`, 'Current Price'];
                              return [`${Number(value).toFixed(2)}%`, 'Daily Change'];
                            }}
                          />
                          <Bar 
                            dataKey="price" 
                            fill="#3b82f6"
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
                              <td className={`py-3 text-right font-medium ${getPerformanceColor(etf.change)}`}>
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
          )}
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
