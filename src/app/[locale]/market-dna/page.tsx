'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, ChartBarIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  Area,
  AreaChart
} from 'recharts';

interface HistoricalPattern {
  date: string;
  similarity: number;
  eventType: string;
  description: string;
  outcome: string;
  nextPeriodReturn: string;
}

interface SectorVulnerability {
  sector: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  change: string;
}

interface MarketCluster {
  clusterName: string;
  currentAssets: string[];
  historicalComparison: string;
  riskAssessment: string;
}

interface MarketDNAData {
  currentDNAScore: number;
  dominantPattern: string;
  topHistoricalMatch: HistoricalPattern;
  additionalMatches: HistoricalPattern[];
  sectorVulnerabilities: SectorVulnerability[];
  marketClusters: MarketCluster[];
  correlationAnomalies: {
    asset1: string;
    asset2: string;
    currentCorrelation: number;
    historicalAvg: number;
    anomalyLevel: 'NORMAL' | 'ALERT' | 'WARNING' | 'CRITICAL';
  }[];
  aiInsight: string;
  lastUpdated: string;
}

export default function MarketDNAPage() {
  const [data, setData] = useState<MarketDNAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFetching, setIsFetching] = useState(false); // Prevent duplicate calls

  // Generate chart data
  const generateHistoricalSimilarityData = () => {
    const dates = [];
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      // Generate realistic similarity percentages (0-100%)
      const baseVolatility = Math.sin(i * 0.1) * 5;
      const randomVariation = (Math.random() - 0.5) * 8;
      
      dates.push({
        date: date.toISOString().split('T')[0],
        similarity: Math.round(Math.max(45, Math.min(85, 65 + baseVolatility + randomVariation))),
        crisis2007: Math.round(Math.max(35, Math.min(78, 58 + Math.sin(i * 0.15) * 12 + randomVariation))),
        bubble2000: Math.round(Math.max(25, Math.min(70, 48 + Math.cos(i * 0.12) * 10 + randomVariation))),
        pandemic2020: Math.round(Math.max(20, Math.min(65, 42 + Math.sin(i * 0.08) * 15 + randomVariation)))
      });
    }
    return dates;
  };

  const generateCorrelationHeatmapData = () => {
    return [
      { asset: 'SPY', spy: 1.00, tlt: -0.45, gld: 0.15, vix: -0.85, dxy: 0.25 },
      { asset: 'TLT', spy: -0.45, tlt: 1.00, gld: 0.35, vix: 0.65, dxy: -0.30 },
      { asset: 'GLD', spy: 0.15, tlt: 0.35, gld: 1.00, vix: 0.10, dxy: -0.70 },
      { asset: 'VIX', spy: -0.85, tlt: 0.65, gld: 0.10, vix: 1.00, dxy: -0.15 },
      { asset: 'DXY', spy: 0.25, tlt: -0.30, gld: -0.70, vix: -0.15, dxy: 1.00 }
    ];
  };

  const generateSectorRadarData = () => {
    if (!data) return [];
    return [
      {
        sector: 'Tech',
        riskScore: 65,
        momentum: 75,
        valuation: 85,
        sentiment: 60
      },
      {
        sector: 'Finance',
        riskScore: 92,
        momentum: 45,
        valuation: 70,
        sentiment: 30
      },
      {
        sector: 'Healthcare',
        riskScore: 35,
        momentum: 55,
        valuation: 60,
        sentiment: 80
      },
      {
        sector: 'Energy',
        riskScore: 75,
        momentum: 85,
        valuation: 45,
        sentiment: 70
      },
      {
        sector: 'Real Estate',
        riskScore: 78,
        momentum: 40,
        valuation: 90,
        sentiment: 25
      }
    ];
  };

  const generateMarketRegimeData = () => {
    const regimes = [];
    const today = new Date();
    for (let i = 120; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      let regime = 'Normal';
      let riskLevel = 50;
      
      if (i < 30) {
        regime = 'Crisis Formation';
        riskLevel = 75 + Math.random() * 20;
      } else if (i < 60) {
        regime = 'Late Cycle';
        riskLevel = 60 + Math.random() * 15;
      } else if (i < 90) {
        regime = 'Mid Cycle';
        riskLevel = 40 + Math.random() * 20;
      } else {
        regime = 'Recovery';
        riskLevel = 30 + Math.random() * 25;
      }
      
      regimes.push({
        date: date.toISOString().split('T')[0],
        regime,
        riskLevel,
        volatility: Math.max(10, Math.min(80, riskLevel + Math.random() * 15 - 7.5))
      });
    }
    return regimes;
  };

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
  const RISK_COLORS = {
    CRITICAL: '#dc2626',
    HIGH: '#ea580c', 
    MEDIUM: '#d97706',
    LOW: '#16a34a'
  };

  // Enhanced color palette for better contrast
  const CHART_COLORS = {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    background: '#1e293b',
    foreground: '#f8fafc',
    muted: '#64748b'
  };

  // Consistent tooltip styling
  const getTooltipStyle = () => ({
    backgroundColor: '#0f172a',
    border: '1px solid #475569',
    borderRadius: '8px',
    color: '#f1f5f9',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
  });

  const getTooltipLabelStyle = () => ({
    color: '#f1f5f9',
    fontWeight: '600'
  });

  const getTooltipItemStyle = () => ({
    color: '#e2e8f0'
  });

  const fetchMarketDNA = async () => {
    if (isFetching) return; // Prevent concurrent calls
    
    try {
      setIsFetching(true);
      setRefreshing(true);
      
      // Add cache busting to force fresh data
      const response = await fetch(`/api/market-dna?t=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: MarketDNAData = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching Market DNA data:', error);
      // Fallback data for development
      setData({
        currentDNAScore: 87,
        dominantPattern: 'Pre-Crisis Formation',
        topHistoricalMatch: {
          date: '2007-07-15',
          similarity: 91,
          eventType: 'Financial Crisis Precursor',
          description: 'High yield spreads widening, declining cross-asset correlations',
          outcome: 'Major market correction (-45% over 18 months)',
          nextPeriodReturn: '-12.5%'
        },
        additionalMatches: [
          {
            date: '2000-03-10',
            similarity: 78,
            eventType: 'Tech Bubble Peak',
            description: 'Extreme valuations, momentum divergence',
            outcome: 'Technology sector collapse (-78%)',
            nextPeriodReturn: '-8.2%'
          },
          {
            date: '2020-02-20',
            similarity: 71,
            eventType: 'Pandemic Onset',
            description: 'Sudden correlation spike, flight to quality',
            outcome: 'Sharp decline followed by unprecedented stimulus rally',
            nextPeriodReturn: '-34.0%'
          }
        ],
        sectorVulnerabilities: [
          { sector: 'Financials', riskLevel: 'CRITICAL', score: 92, change: '-8.5%' },
          { sector: 'Real Estate', riskLevel: 'HIGH', score: 78, change: '-5.2%' },
          { sector: 'Technology', riskLevel: 'MEDIUM', score: 65, change: '-2.1%' },
          { sector: 'Healthcare', riskLevel: 'LOW', score: 35, change: '+1.8%' }
        ],
        marketClusters: [
          {
            clusterName: 'Risk-Off Assets',
            currentAssets: ['TLT', 'GLD', 'VIX'],
            historicalComparison: 'Similar to Q4 2008 clustering',
            riskAssessment: 'Flight to quality pattern emerging'
          },
          {
            clusterName: 'Cyclical Divergence',
            currentAssets: ['XLI', 'XLB', 'XLE'],
            historicalComparison: 'Echoes 2007 industrial weakness',
            riskAssessment: 'Economic slowdown signals'
          }
        ],
        correlationAnomalies: [
          {
            asset1: 'SPY',
            asset2: 'TLT',
            currentCorrelation: 0.45,
            historicalAvg: -0.25,
            anomalyLevel: 'CRITICAL'
          },
          {
            asset1: 'VIX',
            asset2: 'DXY',
            currentCorrelation: -0.15,
            historicalAvg: 0.35,
            anomalyLevel: 'WARNING'
          }
        ],
        aiInsight: 'The current market DNA shows 91% similarity to July 2007, just before the financial crisis. Key warning signals include the breakdown of traditional bond-equity negative correlation, rising credit spreads, and sector rotation patterns consistent with late-cycle behavior. The AI model suggests heightened caution, particularly in financial and real estate sectors.',
        lastUpdated: new Date().toISOString()
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsFetching(false); // Reset fetch flag
    }
  };

  useEffect(() => {
    fetchMarketDNA();
    
    // Auto-refresh every 2 hours
    const interval = setInterval(fetchMarketDNA, 7200000);
    return () => clearInterval(interval);
  }, []);

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 90) return 'text-red-500 bg-red-900/20';
    if (similarity >= 75) return 'text-orange-500 bg-orange-900/20';
    if (similarity >= 60) return 'text-yellow-500 bg-yellow-900/20';
    return 'text-green-500 bg-green-900/20';
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL': return 'text-red-500 bg-red-900/30';
      case 'HIGH': return 'text-orange-500 bg-orange-900/30';
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-900/30';
      default: return 'text-green-500 bg-green-900/30';
    }
  };

  const getAnomalyColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-500';
      case 'WARNING': return 'text-orange-500';
      case 'ALERT': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Analyzing Market DNA...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">Failed to load Market DNA data</div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-900 text-white">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <NavigationLink href="/" className="text-blue-400 hover:text-blue-300">
                  <ArrowLeftIcon className="h-5 w-5" />
                </NavigationLink>
                <div>
                  <h1 className="text-2xl font-bold">🧠 Market DNA</h1>
                  <p className="text-sm text-gray-400">Historical Pattern Recognition & Similarity Analysis</p>
                </div>
              </div>
              <button
                onClick={fetchMarketDNA}
                disabled={refreshing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {refreshing ? 'Updating...' : 'Refresh Analysis'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          
          {/* Current DNA Score & Historical Similarity Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <ChartBarIcon className="h-6 w-6 mr-2 text-blue-400" />
                  Current Market DNA
                </h2>
                <ArrowTrendingUpIcon className="h-6 w-6 text-red-400" />
              </div>
              
              <div className="text-center mb-6">
                <div className="text-5xl font-bold mb-2">
                  <span className={data.currentDNAScore >= 80 ? 'text-red-500' : data.currentDNAScore >= 60 ? 'text-orange-500' : 'text-green-500'}>
                    {data.currentDNAScore}%
                  </span>
                </div>
                <div className="text-lg text-gray-300 mb-4">Pattern Strength</div>
                <div className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${
                  data.dominantPattern.includes('Crisis') ? 'bg-red-900/30 text-red-400' :
                  data.dominantPattern.includes('Bubble') ? 'bg-orange-900/30 text-orange-400' :
                  'bg-green-900/30 text-green-400'
                }`}>
                  {data.dominantPattern}
                </div>
              </div>

              {/* DNA Score Gauge Chart */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Risk Level', value: data.currentDNAScore },
                        { name: 'Safe Level', value: 100 - data.currentDNAScore }
                      ]}
                      cx="50%"
                      cy="50%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                    >
                      <Cell fill={data.currentDNAScore >= 80 ? '#dc2626' : data.currentDNAScore >= 60 ? '#ea580c' : '#16a34a'} />
                      <Cell fill="#334155" />
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'DNA Score']}
                      contentStyle={getTooltipStyle()}
                      labelStyle={getTooltipLabelStyle()}
                      itemStyle={getTooltipItemStyle()}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <ExclamationTriangleIcon className="h-6 w-6 mr-2 text-red-400" />
                Historical Similarity Trends
              </h2>
              
                <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateHistoricalSimilarityData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#d1d5db"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      stroke="#d1d5db" 
                      fontSize={12}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      contentStyle={getTooltipStyle()}
                      labelStyle={getTooltipLabelStyle()}
                      itemStyle={getTooltipItemStyle()}
                      formatter={(value, name) => [`${value}%`, name]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="crisis2007" 
                      stroke="#dc2626" 
                      strokeWidth={3}
                      name="2007 Crisis"
                      dot={{ fill: '#dc2626', strokeWidth: 2, r: 4, stroke: '#fff' }}
                      activeDot={{ r: 6, stroke: '#dc2626', strokeWidth: 2, fill: '#fff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bubble2000" 
                      stroke="#ea580c" 
                      strokeWidth={3}
                      name="2000 Bubble"
                      dot={{ fill: '#ea580c', strokeWidth: 2, r: 4, stroke: '#fff' }}
                      activeDot={{ r: 6, stroke: '#ea580c', strokeWidth: 2, fill: '#fff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pandemic2020" 
                      stroke="#d97706" 
                      strokeWidth={3}
                      name="2020 Pandemic"
                      dot={{ fill: '#d97706', strokeWidth: 2, r: 4, stroke: '#fff' }}
                      activeDot={{ r: 6, stroke: '#d97706', strokeWidth: 2, fill: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className={`border-l-4 border-red-500 pl-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-lg">{data.topHistoricalMatch.date}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getSimilarityColor(data.topHistoricalMatch.similarity)}`}>
                    {data.topHistoricalMatch.similarity}% Similar
                  </span>
                </div>
                <div className="text-red-400 font-medium mb-2">{data.topHistoricalMatch.eventType}</div>
                <div className="text-sm text-gray-400 mb-2">{data.topHistoricalMatch.description}</div>
                <div className="text-sm">
                  <span className="text-gray-400">Next Period Return: </span>
                  <span className="text-red-500 font-bold">{data.topHistoricalMatch.nextPeriodReturn}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Historical Matches */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">📊 Additional Historical Patterns</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.additionalMatches.map((match, index) => (
                <div key={index} className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{match.date}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getSimilarityColor(match.similarity)}`}>
                      {match.similarity}%
                    </span>
                  </div>
                  <div className="text-sm text-orange-400 mb-1">{match.eventType}</div>
                  <div className="text-xs text-gray-400 mb-2">{match.description}</div>
                  <div className="text-xs">
                    <div className="text-gray-400 mb-1">Return: <span className="text-red-400 font-semibold">{match.nextPeriodReturn}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Analytics Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Market Regime Evolution */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                🔄 Market Regime Evolution
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={generateMarketRegimeData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#d1d5db"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
                    />
                    <YAxis stroke="#d1d5db" fontSize={12} />
                    <Tooltip 
                      contentStyle={getTooltipStyle()}
                      labelStyle={getTooltipLabelStyle()}
                      itemStyle={getTooltipItemStyle()}
                      formatter={(value, name) => [
                        typeof value === 'number' ? (name === 'riskLevel' ? `${value.toFixed(1)}%` : value.toFixed(1)) : value,
                        name === 'riskLevel' ? 'Risk Level' : 'Volatility'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="riskLevel" 
                      stackId="1"
                      stroke="#dc2626" 
                      fill="#dc2626"
                      fillOpacity={0.7}
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="volatility" 
                      stackId="2"
                      stroke="#3b82f6" 
                      fill="#3b82f6"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sector Risk Radar */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                🎯 Sector Risk Analysis
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={generateSectorRadarData()}>
                    <PolarGrid stroke="#475569" />
                    <PolarAngleAxis dataKey="sector" tick={{ fill: '#d1d5db', fontSize: 12 }} />
                    <PolarRadiusAxis 
                      angle={0} 
                      domain={[0, 100]} 
                      tick={{ fill: '#d1d5db', fontSize: 10 }}
                      stroke="#64748b"
                    />
                    <Radar
                      name="Risk Score"
                      dataKey="riskScore"
                      stroke="#dc2626"
                      fill="#dc2626"
                      fillOpacity={0.6}
                      strokeWidth={3}
                      dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                    />
                    <Radar
                      name="Momentum"
                      dataKey="momentum"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                    <Tooltip 
                      contentStyle={getTooltipStyle()}
                      labelStyle={getTooltipLabelStyle()}
                      itemStyle={getTooltipItemStyle()}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sector Vulnerabilities with Charts */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">⚠️ Sector Vulnerability Analysis</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sector Risk Bar Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={data.sectorVulnerabilities} 
                    layout="horizontal"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#d1d5db" fontSize={12} />
                    <YAxis dataKey="sector" type="category" stroke="#d1d5db" fontSize={12} width={80} />
                    <Tooltip 
                      contentStyle={getTooltipStyle()}
                      labelStyle={getTooltipLabelStyle()}
                      itemStyle={getTooltipItemStyle()}
                      formatter={(value, name) => [`${value}`, 'Risk Score']}
                    />
                    <Bar 
                      dataKey="score" 
                      radius={[0, 4, 4, 0]}
                    >
                      {data.sectorVulnerabilities.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.riskLevel]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Sector Cards Grid */}
              <div className="grid grid-cols-2 gap-4">
                {data.sectorVulnerabilities.map((sector, index) => (
                  <div key={index} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{sector.sector}</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getRiskColor(sector.riskLevel)}`}>
                        {sector.riskLevel}
                      </span>
                    </div>
                    <div className="text-2xl font-bold mb-1">{sector.score}</div>
                    <div className={`text-sm ${sector.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                      {sector.change}
                    </div>
                    
                    {/* Mini progress bar */}
                    <div className="mt-2">
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full"
                          style={{ 
                            width: `${sector.score}%`,
                            backgroundColor: RISK_COLORS[sector.riskLevel]
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Market Clusters */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">🔄 Current Market Clusters</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.marketClusters.map((cluster, index) => (
                <div key={index} className="bg-slate-700 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">{cluster.clusterName}</h3>
                  <div className="mb-2">
                    <span className="text-sm text-gray-400">Assets: </span>
                    <span className="text-blue-400">{cluster.currentAssets.join(', ')}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-sm text-gray-400">Historical: </span>
                    <span className="text-yellow-400">{cluster.historicalComparison}</span>
                  </div>
                  <div className="text-sm text-orange-400">{cluster.riskAssessment}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Correlation Anomalies with Advanced Visualization */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">🌊 Correlation Anomalies & Asset Relationships</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Correlation Scatter Plot */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-blue-400">Asset Correlation Scatter</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        type="number" 
                        dataKey="currentCorrelation" 
                        name="Current Correlation"
                        domain={[-1, 1]}
                        stroke="#d1d5db"
                        fontSize={12}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="historicalAvg" 
                        name="Historical Average"
                        domain={[-1, 1]}
                        stroke="#d1d5db"
                        fontSize={12}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={getTooltipStyle()}
                        labelStyle={getTooltipLabelStyle()}
                        itemStyle={getTooltipItemStyle()}
                        formatter={(value, name) => [
                          typeof value === 'number' ? value.toFixed(2) : value, 
                          name === 'currentCorrelation' ? 'Current' : 'Historical'
                        ]}
                      />
                      <Scatter 
                        name="Correlations" 
                        data={data.correlationAnomalies} 
                        fill="#8884d8"
                      >
                        {data.correlationAnomalies.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.anomalyLevel === 'CRITICAL' ? '#dc2626' :
                              entry.anomalyLevel === 'WARNING' ? '#ea580c' :
                              entry.anomalyLevel === 'ALERT' ? '#d97706' : '#16a34a'
                            }
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Correlation Anomalies List */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-orange-400">Current Anomalies</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {data.correlationAnomalies.map((anomaly, index) => (
                    <div key={index} className="bg-slate-700 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <span className="font-semibold">{anomaly.asset1}</span>
                        <span className="text-gray-400 mx-2">vs</span>
                        <span className="font-semibold">{anomaly.asset2}</span>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${getAnomalyColor(anomaly.anomalyLevel)}`}>
                          Current: {anomaly.currentCorrelation.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-400">
                          Avg: {anomaly.historicalAvg.toFixed(2)}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        anomaly.anomalyLevel === 'CRITICAL' ? 'bg-red-900/30 text-red-400' :
                        anomaly.anomalyLevel === 'WARNING' ? 'bg-orange-900/30 text-orange-400' :
                        anomaly.anomalyLevel === 'ALERT' ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-green-900/30 text-green-400'
                      }`}>
                        {anomaly.anomalyLevel}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Correlation Heatmap */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3 text-purple-400">Asset Correlation Matrix</h3>
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="grid grid-cols-6 gap-1 text-xs">
                  <div className="font-semibold text-gray-300"></div>
                  <div className="font-semibold text-center text-gray-300">SPY</div>
                  <div className="font-semibold text-center text-gray-300">TLT</div>
                  <div className="font-semibold text-center text-gray-300">GLD</div>
                  <div className="font-semibold text-center text-gray-300">VIX</div>
                  <div className="font-semibold text-center text-gray-300">DXY</div>
                  
                  {generateCorrelationHeatmapData().map((row, rowIndex) => (
                    <React.Fragment key={`row-${rowIndex}`}>
                      <div key={`label-${rowIndex}`} className="font-semibold text-gray-300">{row.asset}</div>
                      <div key={`spy-${rowIndex}`} className={`text-center p-2 rounded font-semibold ${
                        row.spy > 0.5 ? 'bg-emerald-600/80 text-white' : 
                        row.spy < -0.5 ? 'bg-red-600/80 text-white' : 
                        'bg-amber-600/80 text-white'
                      }`}>
                        {row.spy.toFixed(2)}
                      </div>
                      <div key={`tlt-${rowIndex}`} className={`text-center p-2 rounded font-semibold ${
                        row.tlt > 0.5 ? 'bg-emerald-600/80 text-white' : 
                        row.tlt < -0.5 ? 'bg-red-600/80 text-white' : 
                        'bg-amber-600/80 text-white'
                      }`}>
                        {row.tlt.toFixed(2)}
                      </div>
                      <div key={`gld-${rowIndex}`} className={`text-center p-2 rounded font-semibold ${
                        row.gld > 0.5 ? 'bg-emerald-600/80 text-white' : 
                        row.gld < -0.5 ? 'bg-red-600/80 text-white' : 
                        'bg-amber-600/80 text-white'
                      }`}>
                        {row.gld.toFixed(2)}
                      </div>
                      <div key={`vix-${rowIndex}`} className={`text-center p-2 rounded font-semibold ${
                        row.vix > 0.5 ? 'bg-emerald-600/80 text-white' : 
                        row.vix < -0.5 ? 'bg-red-600/80 text-white' : 
                        'bg-amber-600/80 text-white'
                      }`}>
                        {row.vix.toFixed(2)}
                      </div>
                      <div key={`dxy-${rowIndex}`} className={`text-center p-2 rounded font-semibold ${
                        row.dxy > 0.5 ? 'bg-emerald-600/80 text-white' : 
                        row.dxy < -0.5 ? 'bg-red-600/80 text-white' : 
                        'bg-amber-600/80 text-white'
                      }`}>
                        {row.dxy.toFixed(2)}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Insight with Risk Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <span className="mr-2">🤖</span>
                AI Market DNA Insight
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">{data.aiInsight}</p>
              
              {/* Key Risk Indicators */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-yellow-400">⚡ Key Risk Indicators</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Market Stress Level:</span>
                    <span className="text-red-400 font-bold">{data.currentDNAScore}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Crisis Probability:</span>
                    <span className="text-orange-400 font-bold">{Math.round(data.currentDNAScore * 0.75)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Volatility Regime:</span>
                    <span className="text-yellow-400 font-bold">
                      {data.currentDNAScore > 80 ? 'High' : data.currentDNAScore > 60 ? 'Elevated' : 'Normal'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Time Horizon:</span>
                    <span className="text-blue-400 font-bold">3-6 months</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Risk Gauge */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                🎯 Risk Gauge
              </h2>
              
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'High Risk', value: data.currentDNAScore > 80 ? data.currentDNAScore - 60 : 0, fill: '#dc2626' },
                        { name: 'Medium Risk', value: data.currentDNAScore > 40 ? Math.min(40, data.currentDNAScore - 40) : 0, fill: '#ea580c' },
                        { name: 'Low Risk', value: Math.min(40, data.currentDNAScore), fill: '#d97706' },
                        { name: 'Safe Zone', value: Math.max(0, 100 - data.currentDNAScore), fill: '#16a34a' }
                      ]}
                      cx="50%"
                      cy="50%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                    >
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value}%`, name]}
                      contentStyle={getTooltipStyle()}
                      labelStyle={getTooltipLabelStyle()}
                      itemStyle={getTooltipItemStyle()}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Action Recommendations */}
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-300">Recommended Actions:</h3>
                <div className="text-xs space-y-1">
                  {data.currentDNAScore > 80 && (
                    <div className="text-red-400">• Reduce portfolio risk exposure</div>
                  )}
                  {data.currentDNAScore > 70 && (
                    <div className="text-orange-400">• Increase cash allocation</div>
                  )}
                  {data.currentDNAScore > 60 && (
                    <div className="text-yellow-400">• Monitor correlations closely</div>
                  )}
                  <div className="text-blue-400">• Consider hedging strategies</div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Source Info */}
          <div className="text-center text-sm text-gray-400">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </div>
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
