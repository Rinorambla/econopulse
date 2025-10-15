'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import Footer from '@/components/Footer';
import { AlertTriangle, BarChart3, RefreshCw } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Navigation renders links internally; no external navLinks prop needed

interface ETFData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  expenseRatio?: number;
  dividendYield?: number;
  beta?: number;
  peRatio?: number;
}

interface ComparisonPair {
  id: string;
  name: string;
  etf1: string;
  etf2: string;
}

const COMPARISON_PAIRS: ComparisonPair[] = [
  { id: 'spy-qqq', name: 'SPY vs QQQ', etf1: 'SPY', etf2: 'QQQ' },
  { id: 'voo-vtv', name: 'VOO vs VTV', etf1: 'VOO', etf2: 'VTV' },
  { id: 'vti-vxus', name: 'VTI vs VXUS', etf1: 'VTI', etf2: 'VXUS' },
  { id: 'arkk-tqqq', name: 'ARKK vs TQQQ', etf1: 'ARKK', etf2: 'TQQQ' },
  { id: 'itot-jepi', name: 'ITOT vs JEPI', etf1: 'ITOT', etf2: 'JEPI' },
  { id: 'jepi-qyld', name: 'JEPI vs QYLD', etf1: 'JEPI', etf2: 'QYLD' }
];

export default function AIPulsePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [etfData, setETFData] = useState<{ [key: string]: ETFData }>({});
  const [selectedComparison, setSelectedComparison] = useState<string | null>(null);

  const fetchETFData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/etf-comparison');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.success && data.data) {
        setETFData(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch ETF data');
      }
    } catch (err) {
      console.error('Error fetching ETF data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ETF data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchETFData();
    const interval = setInterval(fetchETFData, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentComparison = React.useMemo(() => {
    if (!selectedComparison || !etfData) return null;
    
    const pair = COMPARISON_PAIRS.find(p => p.id === selectedComparison);
    if (!pair) return null;
    
    return {
      pair,
      etf1Data: etfData[pair.etf1] || null,
      etf2Data: etfData[pair.etf2] || null
    };
  }, [selectedComparison, etfData]);

  if (loading && Object.keys(etfData).length === 0) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-900 text-gray-100">
          <Navigation />
          <div className="flex items-center justify-center min-h-[80vh]">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-xl">Loading ETF data...</p>
            </div>
          </div>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-gray-100">
  <Navigation />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-white">AI Pulse</h1>
            <p className="text-gray-400">Real-time ETF comparison and analysis</p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-400">{error}</span>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">Select Comparison</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {COMPARISON_PAIRS.map((pair) => (
                <button
                  key={pair.id}
                  onClick={() => setSelectedComparison(pair.id)}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    selectedComparison === pair.id
                      ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                      : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="text-sm font-medium">{pair.name}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {pair.etf1} • {pair.etf2}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {currentComparison && currentComparison.etf1Data && currentComparison.etf2Data && (
            <div className="space-y-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Price Comparison</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: currentComparison.etf1Data.symbol, price: currentComparison.etf1Data.price },
                      { name: currentComparison.etf2Data.symbol, price: currentComparison.etf2Data.price }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#F3F4F6' }}
                      />
                      <Bar dataKey="price" fill="#60A5FA" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Performance Comparison (%)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: currentComparison.etf1Data.symbol, performance: currentComparison.etf1Data.changePercent },
                      { name: currentComparison.etf2Data.symbol, performance: currentComparison.etf2Data.changePercent }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#F3F4F6' }}
                      />
                      <Bar dataKey="performance" fill="#34D399" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Detailed Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-300">Metric</th>
                        <th className="text-left py-3 px-4 text-gray-300">{currentComparison.etf1Data.symbol}</th>
                        <th className="text-left py-3 px-4 text-gray-300">{currentComparison.etf2Data.symbol}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4 text-gray-400">Price</td>
                        <td className="py-3 px-4 text-white">${currentComparison.etf1Data.price.toFixed(2)}</td>
                        <td className="py-3 px-4 text-white">${currentComparison.etf2Data.price.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4 text-gray-400">Change</td>
                        <td className={`py-3 px-4 ${currentComparison.etf1Data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {currentComparison.etf1Data.change >= 0 ? '+' : ''}${currentComparison.etf1Data.change.toFixed(2)} 
                          ({currentComparison.etf1Data.changePercent >= 0 ? '+' : ''}{currentComparison.etf1Data.changePercent.toFixed(2)}%)
                        </td>
                        <td className={`py-3 px-4 ${currentComparison.etf2Data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {currentComparison.etf2Data.change >= 0 ? '+' : ''}${currentComparison.etf2Data.change.toFixed(2)} 
                          ({currentComparison.etf2Data.changePercent >= 0 ? '+' : ''}{currentComparison.etf2Data.changePercent.toFixed(2)}%)
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4 text-gray-400">Volume</td>
                        <td className="py-3 px-4 text-white">{currentComparison.etf1Data.volume.toLocaleString()}</td>
                        <td className="py-3 px-4 text-white">{currentComparison.etf2Data.volume.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!selectedComparison && (
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-8 text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-500" />
              <h3 className="text-xl font-semibold mb-2 text-gray-300">Select an ETF pair to compare</h3>
              <p className="text-gray-400">Choose one of the comparison pairs above to view detailed analytics and charts.</p>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
