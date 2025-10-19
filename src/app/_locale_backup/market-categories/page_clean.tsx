'use client'

import React, { useState, useEffect } from 'react'
// Replaced missing UI imports with minimal local button styling
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign,
  BarChart3,
  PieChart,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Globe,
  Building,
  Layers,
  Target,
  Zap
} from 'lucide-react'

// Types
interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  category: string;
  sector?: string;
  industry?: string;
  country?: string;
  peRatio?: number;
  dividendYield?: number;
  beta?: number;
  '52weekHigh'?: number;
  '52weekLow'?: number;
  avgVolume?: number;
  eps?: number;
  bookValue?: number;
  priceToBook?: number;
  revenue?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  debtToEquity?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  currentRatio?: number;
  quickRatio?: number;
  cashPerShare?: number;
  revenuePerShare?: number;
  forwardPE?: number;
  pegRatio?: number;
  priceToSales?: number;
  priceToEarnings?: number;
  priceToBookRatio?: number;
  sharesOutstanding?: number;
  floatShares?: number;
  insiderOwnership?: number;
  institutionalOwnership?: number;
  shortRatio?: number;
  shortPercentFloat?: number;
  sharesShort?: number;
  sharesShortPrevMonth?: number;
  dateShortInterest?: string;
  percentInsiders?: number;
  percentInstitutions?: number;
  forwardAnnualDividendRate?: number;
  forwardAnnualDividendYield?: number;
  payoutRatio?: number;
  dividendDate?: string;
  exDividendDate?: string;
  lastSplitFactor?: string;
  lastSplitDate?: string;
  '1y'?: number;
  '3y'?: number;
  '5y'?: number;
  ytd?: number;
  '1d'?: number;
  '5d'?: number;
  '1m'?: number;
  '3m'?: number;
  '6m'?: number;
}

interface GroupedAssets {
  [category: string]: MarketAsset[];
}

// Constants
const CATEGORIES = [
  { key: 'stocks', label: 'Stocks', icon: TrendingUp },
  { key: 'etfs', label: 'ETFs', icon: PieChart },
  { key: 'crypto', label: 'Crypto', icon: Layers },
  { key: 'commodities', label: 'Commodities', icon: Target },
  { key: 'forex', label: 'Forex', icon: Globe },
  { key: 'bonds', label: 'Bonds', icon: Building },
];

const PERIODS = [
  { key: '1d', label: '1 Day', short: '1D' },
  { key: '5d', label: '5 Days', short: '5D' },
  { key: '1m', label: '1 Month', short: '1M' },
  { key: '3m', label: '3 Months', short: '3M' },
  { key: '6m', label: '6 Months', short: '6M' },
  { key: '1y', label: '1 Year', short: '1Y' },
  { key: 'ytd', label: 'YTD', short: 'YTD' },
];

// Mock data generator
const generateMockData = (category: string): MarketAsset[] => {
  const mockAssets: MarketAsset[] = [];
  const assetCounts: { [key: string]: number } = {
    stocks: 50,
    etfs: 30,
    crypto: 25,
    commodities: 15,
    forex: 20,
    bonds: 10
  };

  const sectors = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial', 'Materials', 'Utilities', 'Real Estate', 'Telecommunications'];
  const count = assetCounts[category] || 20;

  for (let i = 0; i < count; i++) {
    const changePercent = (Math.random() - 0.5) * 20; // -10% to +10%
    const price = Math.random() * 1000 + 10;
    const volume = Math.random() * 10000000;
    const marketCap = Math.random() * 1000000000000; // Random market cap

    mockAssets.push({
      symbol: `${category.toUpperCase()}${i + 1}`,
      name: `${category} Asset ${i + 1}`,
      price,
      change: (changePercent / 100) * price,
      changePercent,
      volume,
      marketCap,
      category: sectors[Math.floor(Math.random() * sectors.length)],
      sector: sectors[Math.floor(Math.random() * sectors.length)],
      peRatio: Math.random() * 30 + 5,
      dividendYield: Math.random() * 5,
      beta: Math.random() * 2 + 0.5,
      '52weekHigh': price * (1 + Math.random() * 0.5),
      '52weekLow': price * (1 - Math.random() * 0.3),
      '1d': changePercent,
      '5d': (Math.random() - 0.5) * 15,
      '1m': (Math.random() - 0.5) * 20,
      '3m': (Math.random() - 0.5) * 30,
      '6m': (Math.random() - 0.5) * 40,
      '1y': (Math.random() - 0.5) * 50,
      ytd: (Math.random() - 0.5) * 35,
    });
  }

  return mockAssets;
};

// Utility functions
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

const formatPercent = (percent: number) => {
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
};

const formatVolume = (volume: number) => {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toFixed(0);
};

const getPerformanceColor = (value: number) => {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-gray-400';
};

// Main component
export default function MarketCategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState('stocks');
  const [selectedPeriod, setSelectedPeriod] = useState('1d');
  const [groupedAssets, setGroupedAssets] = useState<GroupedAssets>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sectorFilter, setSectorFilter] = useState('all');
  const [sortBy, setSortBy] = useState('marketCap');

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const assets = generateMockData(selectedCategory);
        const grouped = assets.reduce((acc, asset) => {
          if (!acc[asset.category]) {
            acc[asset.category] = [];
          }
          acc[asset.category].push(asset);
          return acc;
        }, {} as GroupedAssets);

        setGroupedAssets(grouped);
        setLastUpdated(new Date());
      } catch (err) {
        setError('Failed to load market data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCategory]);

  // Get performance value based on selected period
  const getPerformanceValue = (asset: MarketAsset): number => {
    switch (selectedPeriod) {
      case '1d': return asset['1d'] || 0;
      case '5d': return asset['5d'] || 0;
      case '1m': return asset['1m'] || 0;
      case '3m': return asset['3m'] || 0;
      case '6m': return asset['6m'] || 0;
      case '1y': return asset['1y'] || 0;
      case 'ytd': return asset.ytd || 0;
      default: return asset.changePercent;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-white text-lg">Loading market data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <p className="text-white text-lg mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Market Categories
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Explore comprehensive market data across different asset categories with advanced filtering and visualization.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Selection */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Asset Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CATEGORIES.map(category => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.key}
                      className={`h-auto py-3 px-4 flex flex-col items-center gap-2 rounded-md border transition-all ${
                        selectedCategory === category.key
                          ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-lg scale-105'
                          : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 border-slate-600/50'
                      }`}
                      onClick={() => setSelectedCategory(category.key)}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Period Selection */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Time Period</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {PERIODS.map(period => (
                  <button
                    key={period.key}
                    className={`transition-all rounded-md border px-3 py-2 text-sm ${
                      selectedPeriod === period.key
                        ? 'bg-green-600 hover:bg-green-700 text-white border-green-700'
                        : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 border-slate-600/50'
                    }`}
                    onClick={() => setSelectedPeriod(period.key)}
                  >
                    {period.short}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Finviz-style Heat Map */}
        {(() => {
          // Combina tutti gli asset in un unico array
          const allAssets = Object.entries(groupedAssets).flatMap(([category, categoryAssets]) =>
            categoryAssets.map(asset => ({
              ...asset,
              performance: getPerformanceValue(asset),
              marketCap: asset.marketCap || (Math.random() * 1000000)
            }))
          );

          // Get unique sectors for filtering
          const uniqueSectors = ['all', ...Array.from(new Set(allAssets.map(asset => asset.category)))];

          // Filter by sector
          const filteredAssets = sectorFilter === 'all' 
            ? allAssets 
            : allAssets.filter(asset => asset.category === sectorFilter);

          // Sort assets based on selected criteria
          const sortedAssets = [...filteredAssets].sort((a, b) => {
            switch (sortBy) {
              case 'performance':
                return b.performance - a.performance;
              case 'volume':
                return (b.volume || 0) - (a.volume || 0);
              case 'alphabetical':
                return a.symbol.localeCompare(b.symbol);
              case 'marketCap':
              default:
                return b.marketCap - a.marketCap;
            }
          });

          // Funzione per calcolare il layout treemap unificato
          const calculateUnifiedTreemapLayout = (assets: any[]) => {
            const containerWidth = 1200;
            const totalMarketCap = assets.reduce((sum, asset) => sum + asset.marketCap, 0);
            
            return assets.map((asset, index) => {
              const ratio = asset.marketCap / totalMarketCap;
              const baseArea = Math.max(3000, ratio * containerWidth * 400);
              
              let width, height;
              
              if (index === 0) {
                width = Math.min(200, Math.max(140, Math.sqrt(baseArea * 1.8)));
                height = Math.min(160, Math.max(100, baseArea / width));
              } else if (index < 3) {
                width = Math.min(160, Math.max(120, Math.sqrt(baseArea * 1.5)));
                height = Math.min(130, Math.max(80, baseArea / width));
              } else if (index < 8) {
                width = Math.min(130, Math.max(100, Math.sqrt(baseArea * 1.2)));
                height = Math.min(110, Math.max(70, baseArea / width));
              } else if (index < 20) {
                width = Math.min(105, Math.max(85, Math.sqrt(baseArea)));
                height = Math.min(90, Math.max(60, baseArea / width));
              } else if (index < 40) {
                width = Math.min(90, Math.max(75, Math.sqrt(baseArea * 0.9)));
                height = Math.min(75, Math.max(55, baseArea / width));
              } else {
                width = Math.min(80, Math.max(65, Math.sqrt(baseArea * 0.8)));
                height = Math.min(65, Math.max(45, baseArea / width));
              }

              return {
                ...asset,
                width: Math.round(width),
                height: Math.round(height),
                area: Math.round(baseArea)
              };
            });
          };

          // Funzione per ottenere il colore Finviz-style
          const getFinvizColor = (performance: number) => {
            if (performance >= 5) return { bg: '#004d00', border: '#006600', text: '#ffffff' };
            if (performance >= 3) return { bg: '#006600', border: '#008800', text: '#ffffff' };
            if (performance >= 1) return { bg: '#008800', border: '#00aa00', text: '#ffffff' };
            if (performance >= 0.5) return { bg: '#00aa00', border: '#00cc00', text: '#ffffff' };
            if (performance >= 0) return { bg: '#00cc00', border: '#00ee00', text: '#000000' };
            if (performance >= -0.5) return { bg: '#ffeeee', border: '#ffcccc', text: '#000000' };
            if (performance >= -1) return { bg: '#ffcccc', border: '#ffaaaa', text: '#000000' };
            if (performance >= -3) return { bg: '#ff6666', border: '#ff4444', text: '#ffffff' };
            if (performance >= -5) return { bg: '#ff4444', border: '#ff2222', text: '#ffffff' };
            return { bg: '#cc0000', border: '#aa0000', text: '#ffffff' };
          };

          const layoutAssets = calculateUnifiedTreemapLayout(sortedAssets);
          
          // Statistiche generali
          const totalAssets = filteredAssets.length;
          const avgPerformance = filteredAssets.reduce((sum, asset) => sum + asset.performance, 0) / totalAssets;
          const totalMarketCap = filteredAssets.reduce((sum, asset) => sum + asset.marketCap, 0);
          const gainers = filteredAssets.filter(asset => asset.performance > 0).length;
          const losers = filteredAssets.filter(asset => asset.performance < 0).length;

          return (
            <div className="space-y-6">
              {/* Finviz-style Filters and Controls */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Sector Filter */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Sector Filter
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {uniqueSectors.map(sector => (
                        <button
                          key={sector}
                          onClick={() => setSectorFilter(sector)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            sectorFilter === sector
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white'
                          }`}
                        >
                          {sector === 'all' ? 'All Sectors' : sector}
                          {sector !== 'all' && (
                            <span className="ml-1 text-xs opacity-75">
                              ({allAssets.filter(a => a.category === sector).length})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sort Options */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Sort By
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSortBy('marketCap')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          sortBy === 'marketCap'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                        }`}
                      >
                        💰 Market Cap
                      </button>
                      <button
                        onClick={() => setSortBy('performance')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          sortBy === 'performance'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                        }`}
                      >
                        📈 Performance
                      </button>
                      <button
                        onClick={() => setSortBy('volume')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          sortBy === 'volume'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                        }`}
                      >
                        📊 Volume
                      </button>
                      <button
                        onClick={() => setSortBy('alphabetical')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          sortBy === 'alphabetical'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                        }`}
                      >
                        🔤 A-Z
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filter Results Summary */}
                <div className="mt-4 pt-4 border-t border-slate-600">
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-slate-400">
                      Showing <span className="text-blue-300 font-medium">{totalAssets}</span> assets
                      {sectorFilter !== 'all' && (
                        <span> in <span className="text-green-300 font-medium">{sectorFilter}</span></span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-green-300">▲ {gainers} gainers</span>
                      <span className="text-red-300">▼ {losers} losers</span>
                      <span className="text-gray-300">━ {totalAssets - gainers - losers} unchanged</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Heat Map */}
              <div className="bg-slate-900/70 backdrop-blur-sm border border-slate-600 rounded-xl overflow-hidden">
                {/* Unified Header */}
                <div className="bg-slate-800/80 px-6 py-5 border-b border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {selectedCategory} Heat Map
                        {sectorFilter !== 'all' && (
                          <span className="text-lg text-blue-300 ml-2">• {sectorFilter}</span>
                        )}
                      </h3>
                      <div className="text-sm text-slate-300">
                        {totalAssets} assets • {PERIODS.find(p => p.key === selectedPeriod)?.label} • Sorted by {
                          sortBy === 'marketCap' ? 'Market Cap' :
                          sortBy === 'performance' ? 'Performance' :
                          sortBy === 'volume' ? 'Volume' : 'Alphabetical'
                        }
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-white mb-1">
                        Avg: {avgPerformance.toFixed(2)}%
                      </div>
                      <div className="text-sm text-slate-400">
                        Market Cap: {formatVolume(totalMarketCap)}
                      </div>
                    </div>
                  </div>
                </div>
              
                {/* Unified Finviz-style Treemap */}
                <div className="p-3" style={{ backgroundColor: '#0a0f1a' }}>
                  <div 
                    className="flex flex-wrap gap-1 justify-start items-start"
                    style={{ 
                      minHeight: '600px',
                      maxHeight: '800px'
                    }}
                  >
                    {layoutAssets.map((asset, index) => {
                      const colors = getFinvizColor(asset.performance);
                      
                      return (
                        <div
                          key={`unified-${asset.symbol}-${index}`}
                          className="relative group flex flex-col justify-center items-center border cursor-pointer transition-all duration-200 hover:scale-105 hover:z-30 hover:shadow-2xl flex-shrink-0"
                          style={{
                            backgroundColor: colors.bg,
                            borderColor: colors.border,
                            borderWidth: '1px',
                            color: colors.text,
                            width: `${asset.width}px`,
                            height: `${asset.height}px`,
                            fontSize: asset.width > 120 ? '14px' : asset.width > 90 ? '12px' : '10px'
                          }}
                        >
                          {/* Contenuto principale */}
                          <div className="text-center p-1 w-full h-full flex flex-col justify-center">
                            {/* Symbol - sempre visibile */}
                            <div 
                              className="font-bold leading-tight mb-1 truncate"
                              style={{ 
                                fontSize: asset.width > 140 ? '16px' : asset.width > 100 ? '14px' : '12px',
                                color: colors.text
                              }}
                            >
                              {asset.symbol}
                            </div>
                            
                            {/* Performance - sempre visibile */}
                            <div 
                              className="font-bold leading-tight"
                              style={{ 
                                fontSize: asset.width > 140 ? '14px' : asset.width > 100 ? '12px' : '10px',
                                color: colors.text
                              }}
                            >
                              {asset.performance > 0 ? '+' : ''}{asset.performance.toFixed(1)}%
                            </div>
                            
                            {/* Price - per box medi e grandi */}
                            {asset.width > 90 && (
                              <div 
                                className="text-xs leading-tight mt-1 opacity-90 truncate"
                                style={{ color: colors.text }}
                              >
                                {formatPrice(asset.price)}
                              </div>
                            )}

                            {/* Category label - solo per box molto grandi */}
                            {asset.width > 140 && asset.height > 120 && (
                              <div 
                                className="text-xs leading-tight opacity-75 mt-1"
                                style={{ color: colors.text }}
                              >
                                {asset.category}
                              </div>
                            )}
                          </div>

                          {/* Enhanced Hover Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-slate-900/98 backdrop-blur-sm text-white text-sm rounded-lg border border-slate-500 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-40 whitespace-nowrap shadow-2xl min-w-max">
                            <div className="font-bold text-blue-300 mb-2 text-base">{asset.symbol}</div>
                            <div className="text-slate-200 mb-2 font-medium max-w-xs truncate">{asset.name}</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-400">Price:</span>
                                <span className="text-green-300 font-medium">{formatPrice(asset.price)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-400">Performance:</span>
                                <span className={asset.performance > 0 ? 'text-green-300' : 'text-red-300'} style={{ fontWeight: 'bold' }}>
                                  {asset.performance > 0 ? '+' : ''}{asset.performance.toFixed(2)}%
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-400">Volume:</span>
                                <span className="text-slate-300">{formatVolume(asset.volume)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-400">Market Cap:</span>
                                <span className="text-slate-300">{formatVolume(asset.marketCap)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-400">Sector:</span>
                                <span className="text-blue-300">{asset.category}</span>
                              </div>
                            </div>
                            
                            {/* Tooltip Arrow */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900/98"></div>
                          </div>

                          {/* Performance Badge - solo per top performers */}
                          {(index < 5 && Math.abs(asset.performance) > 3) && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 text-black text-xs font-bold flex items-center justify-center border-2 border-white z-10">
                              {index + 1}
                            </div>
                          )}

                          {/* Hover Border Effect */}
                          <div 
                            className="absolute inset-0 border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                            style={{ 
                              borderColor: asset.performance > 0 ? '#10b981' : '#ef4444',
                              boxShadow: `0 0 20px ${asset.performance > 0 ? '#10b981' : '#ef4444'}40`
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* No Data State */}
        {!loading && !error && Object.keys(groupedAssets).length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400">
              <p className="text-lg font-medium">No data available for {selectedCategory}</p>
              <p className="text-sm mt-1">Select a different category</p>
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
