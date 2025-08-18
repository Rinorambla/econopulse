'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Minus, BarChart3, PieChart, Activity, Eye } from 'lucide-react';
import Link from 'next/link';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

interface AssetPerformance {
  symbol: string;
  name: string;
  price: number;
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  yearly: number;
  marketCap?: number;
  volume: number;
  category: string;
}

interface ApiResponse {
  success: boolean;
  category: string;
  assets: AssetPerformance[];
  lastUpdated: string;
  cached: boolean;
  error?: string;
}

// Categories available
const CATEGORIES = [
  { key: 'Stocks', label: 'Stocks', icon: '📈' },
  { key: 'ETFs', label: 'ETFs', icon: '📊' },
  { key: 'Crypto', label: 'Crypto', icon: '₿' },
  { key: 'Commodities', label: 'Commodities', icon: '🥇' }
];

// Performance periods
const PERIODS = [
  { key: 'daily', label: '1D' },
  { key: 'weekly', label: '1W' },
  { key: 'monthly', label: '1M' },
  { key: 'quarterly', label: '3M' },
  { key: 'yearly', label: '1Y' }
];

// Utility functions for styling
const getPerformanceColor = (value: number) => {
  if (value > 3) return 'text-emerald-400';
  if (value > 1) return 'text-green-400';
  if (value > 0) return 'text-blue-400';
  if (value > -1) return 'text-orange-400';
  if (value > -3) return 'text-red-400';
  return 'text-red-500';
};

const getPerformanceBg = (value: number) => {
  if (value > 3) return 'bg-emerald-500/10 border-emerald-500/30';
  if (value > 1) return 'bg-green-500/10 border-green-500/30';
  if (value > 0) return 'bg-blue-500/10 border-blue-500/30';
  if (value > -1) return 'bg-orange-500/10 border-orange-500/30';
  if (value > -3) return 'bg-red-500/10 border-red-500/30';
  return 'bg-red-600/10 border-red-600/30';
};

const getPerformanceIcon = (value: number) => {
  if (value > 0.1) return <TrendingUp className="w-4 h-4" />;
  if (value < -0.1) return <TrendingDown className="w-4 h-4" />;
  return <Minus className="w-4 h-4" />;
};

const formatPrice = (price: number) => {
  if (price >= 1000) return `$${(price / 1000).toFixed(1)}k`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
};

const formatVolume = (volume: number) => {
  if (volume >= 1000000000) return `${(volume / 1000000000).toFixed(1)}B`;
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
  return volume.toString();
};

// Chart colors
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

// Custom tooltip styles for dark theme
const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f1f5f9'
};

export default function MarketCategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState('Stocks');
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [assets, setAssets] = useState<AssetPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'charts' | 'analysis'>('grid');

  const loadCategoryData = async (category: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/market-categories?category=${category}`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        setAssets(data.assets);
        setLastUpdated(data.lastUpdated);
      } else {
        setError(data.error || 'Failed to load data');
        setAssets([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load category data');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadCategoryData(selectedCategory);
    setRefreshing(false);
  };

  useEffect(() => {
    loadCategoryData(selectedCategory);
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadCategoryData(selectedCategory);
    }, 300000);

    return () => clearInterval(interval);
  }, [selectedCategory]);

  const getPerformanceValue = (asset: AssetPerformance): number => {
    switch (selectedPeriod) {
      case 'daily': return asset.daily;
      case 'weekly': return asset.weekly;
      case 'monthly': return asset.monthly;
      case 'quarterly': return asset.quarterly;
      case 'yearly': return asset.yearly;
      default: return asset.daily;
    }
  };

  // Group assets by subcategory
  const groupedAssets = assets.reduce((acc, asset) => {
    if (!acc[asset.category]) {
      acc[asset.category] = [];
    }
    acc[asset.category].push(asset);
    return acc;
  }, {} as { [category: string]: AssetPerformance[] });

  // Calculate analytics data for charts
  const categoryPerformanceData = Object.entries(groupedAssets).map(([category, categoryAssets]) => ({
    category,
    performance: categoryAssets.reduce((sum, asset) => sum + getPerformanceValue(asset), 0) / categoryAssets.length,
    volume: categoryAssets.reduce((sum, asset) => sum + asset.volume, 0),
    count: categoryAssets.length,
    topPerformer: categoryAssets.reduce((best, asset) => 
      getPerformanceValue(asset) > getPerformanceValue(best) ? asset : best, categoryAssets[0]
    )
  }));

  const topPerformers = assets
    .sort((a, b) => getPerformanceValue(b) - getPerformanceValue(a))
    .slice(0, 10);

  const bottomPerformers = assets
    .sort((a, b) => getPerformanceValue(a) - getPerformanceValue(b))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/en/ai-pulse" 
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to AI Pulse</span>
            </Link>
            <div className="h-6 w-px bg-slate-600"></div>
            <h1 className="text-3xl font-bold text-white">Market Categories</h1>
          </div>
          
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Category Selector */}
        <div className="mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Select Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  className={`p-4 rounded-lg border transition-all ${
                    selectedCategory === category.key
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50'
                  }`}
                >
                  <div className="text-2xl mb-2">{category.icon}</div>
                  <div className="font-medium">{category.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Period Selector & View Toggle */}
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Period Selector */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((period) => (
                <button
                  key={period.key}
                  onClick={() => setSelectedPeriod(period.key)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedPeriod === period.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                }`}
              >
                <Eye className="w-4 h-4" />
                Grid View
              </button>
              <button
                onClick={() => setViewMode('charts')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  viewMode === 'charts'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Charts
              </button>
              <button
                onClick={() => setViewMode('analysis')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  viewMode === 'analysis'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                }`}
              >
                <Activity className="w-4 h-4" />
                Analysis
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-blue-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-lg">Loading {selectedCategory.toLowerCase()}...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-6">
            <div className="text-red-400 text-center">
              <p className="font-medium">Error loading data</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Charts View */}
        {!loading && !error && viewMode === 'charts' && categoryPerformanceData.length > 0 && (
          <div className="space-y-6 mb-8">
            {/* Category Performance Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Category Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="category" 
                      stroke="#9ca3af" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={tooltipStyle}
                      formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Performance']}
                    />
                    <Bar dataKey="performance" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Volume Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={categoryPerformanceData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="volume"
                      label={({ category, volume }: any) => 
                        `${category}: ${formatVolume(volume)}`
                      }
                    >
                      {categoryPerformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={tooltipStyle}
                      formatter={(value: any) => [formatVolume(Number(value)), 'Volume']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Heat Map */}
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Performance Heat Map</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {Object.entries(groupedAssets).map(([category, categoryAssets]) => {
                  const avgPerformance = categoryAssets.reduce((sum, asset) => sum + getPerformanceValue(asset), 0) / categoryAssets.length;
                  const color = avgPerformance > 5 ? '#10b981' : 
                               avgPerformance > 2 ? '#22c55e' : 
                               avgPerformance > 0 ? '#3b82f6' : 
                               avgPerformance > -2 ? '#f59e0b' : 
                               avgPerformance > -5 ? '#ef4444' : '#dc2626';
                  
                  return (
                    <div
                      key={`heatmap-${category}`}
                      className="relative group flex flex-col justify-center items-center p-4 rounded-lg border border-white/10 transition-all duration-300 hover:scale-105"
                      style={{
                        backgroundColor: color + '30',
                        borderColor: color + '60'
                      }}
                    >
                      <div className="text-white font-semibold text-sm text-center mb-2">
                        {category}
                      </div>
                      <div 
                        className="text-lg font-bold text-center"
                        style={{ color }}
                      >
                        {avgPerformance >= 0 ? '+' : ''}{avgPerformance.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-400 text-center mt-1">
                        {categoryAssets.length} assets
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Analysis View */}
        {!loading && !error && viewMode === 'analysis' && (
          <div className="space-y-6 mb-8">
            {/* Top & Bottom Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Top Performers
                </h3>
                <div className="space-y-3">
                  {topPerformers.map((asset, index) => (
                    <div key={`top-${asset.symbol}`} className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-white font-semibold">{asset.symbol}</div>
                          <div className="text-green-400 text-sm">{asset.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold">
                          +{getPerformanceValue(asset).toFixed(2)}%
                        </div>
                        <div className="text-gray-400 text-sm">{formatPrice(asset.price)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  Bottom Performers
                </h3>
                <div className="space-y-3">
                  {bottomPerformers.map((asset, index) => (
                    <div key={`bottom-${asset.symbol}`} className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-white font-semibold">{asset.symbol}</div>
                          <div className="text-red-400 text-sm">{asset.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-red-400 font-bold">
                          {getPerformanceValue(asset).toFixed(2)}%
                        </div>
                        <div className="text-gray-400 text-sm">{formatPrice(asset.price)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sector Rotation Analysis */}
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Sector Rotation Analysis</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={categoryPerformanceData.slice(0, 8)}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <PolarRadiusAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <Radar
                    name="Performance"
                    dataKey="performance"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Assets Grid */}
        {!loading && !error && viewMode === 'grid' && Object.keys(groupedAssets).length > 0 && (
          <div className="space-y-8">
            {Object.entries(groupedAssets).map(([subcategory, categoryAssets]) => (
              <div key={subcategory} className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">{subcategory}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categoryAssets.map((asset) => {
                    const performance = getPerformanceValue(asset);
                    return (
                      <div
                        key={asset.symbol}
                        className={`p-4 rounded-lg border transition-all hover:scale-105 ${getPerformanceBg(performance)}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-bold text-white text-lg">{asset.symbol}</div>
                            <div className="text-slate-400 text-sm truncate">{asset.name}</div>
                          </div>
                          <div className={`flex items-center gap-1 ${getPerformanceColor(performance)}`}>
                            {getPerformanceIcon(performance)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Price</span>
                            <span className="text-white font-medium">{formatPrice(asset.price)}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Performance</span>
                            <span className={`font-bold ${getPerformanceColor(performance)}`}>
                              {performance > 0 ? '+' : ''}{performance.toFixed(2)}%
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Volume</span>
                            <span className="text-slate-300 text-sm">{formatVolume(asset.volume)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && Object.keys(groupedAssets).length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400">
              <p className="text-lg font-medium">No data available for {selectedCategory}</p>
              <p className="text-sm mt-1">Try refreshing or select a different category</p>
            </div>
          </div>
        )}

        {/* Footer Info */}
        {lastUpdated && (
          <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
