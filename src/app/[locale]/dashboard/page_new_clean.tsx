'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

interface MarketData {
  ticker: string;
  name: string;
  price: string;
  change: string;
  performance: string;
  volume: string;
  trend: string;
  demandSupply: string;
  optionsSentiment: string;
  gammaRisk: string;
  unusualAtm: string;
  unusualOtm: string;
  otmSkew: string;
  intradayFlow: string;
  putCallRatio: string;
  sector: string;
  direction?: string;
}

interface DashboardData {
  data: MarketData[];
  lastUpdated: string;
  cacheStatus: string;
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Auto-refresh every 60s; no manual refresh button per requirements
  useEffect(() => {
    const id = setInterval(() => {
      fetchDashboardData();
    }, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/dashboard-data');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatTicker = (ticker: string) => {
    const item = dashboardData?.data.find(i => i.ticker === ticker);
    const isUp = item?.direction === 'up';
    const arrow = isUp ? '↗' : '↘';
    const color = isUp ? 'text-green-400' : 'text-red-400';
    return <span className={color}>{arrow}</span>;
  };

  const getTrendColor = (trend: string) => {
    const t = trend.toLowerCase();
    if (t.includes('up') || t === 'uptrend') return 'text-yellow-400';
    if (t.includes('strong')) return 'text-orange-400';
    return 'text-gray-300';
  };

  const getDemandSupplyColor = (demandSupply: string) => {
    const ds = demandSupply.toUpperCase();
    if (ds.includes('STRONG DEMAND')) return 'text-red-400 font-bold';
    if (ds.includes('DEMAND')) return 'text-red-400';
    if (ds.includes('SUPPLY')) return 'text-purple-400';
    if (ds.includes('SFF.ANG')) return 'text-purple-400';
    return 'text-gray-300';
  };

  const getSentimentColor = (sentiment: string) => {
    const s = sentiment.toUpperCase();
    if (s.includes('STEALTH BULL')) return 'text-yellow-400';
    if (s.includes('STEALTH BEAR')) return 'text-yellow-400';
    if (s.includes('FOMO')) return 'text-green-400';
    if (s.includes('SQUEEZE')) return 'text-orange-400';
    if (s.includes('EOMO')) return 'text-green-400';
    if (s.includes('STROLTH')) return 'text-yellow-400';
    if (s.includes('STALF BEA')) return 'text-yellow-400';
    if (s.includes('CRUSH')) return 'text-red-400';
    if (s.includes('BEAR')) return 'text-red-400';
    if (s.includes('BULL')) return 'text-green-400';
    if (s.includes('FOM')) return 'text-green-400';
    if (s.includes('FCH')) return 'text-orange-400';
    if (s.includes('FOO')) return 'text-green-400';
    if (s.includes('BEARD')) return 'text-yellow-400';
    return 'text-gray-300';
  };

  const getFlowColor = (flow: string) => {
    const f = flow.toUpperCase();
    if (f.includes('GAMMA BULL')) return 'text-cyan-400';
    if (f.includes('BUY')) return 'text-blue-400';
    if (f.includes('BUL')) return 'text-cyan-400';
    return 'text-gray-300';
  };

  const getUnusualColor = (unusual: string) => {
    const u = unusual.toUpperCase();
    if (u.includes('GAMMA BULL')) return 'text-green-400';
    if (u.includes('BULL HEDGE')) return 'text-green-400';
    if (u.includes('BEAR HEDGE')) return 'text-red-400';
    if (u.includes('PUT HEDGE')) return 'text-pink-400';
    if (u.includes('STRONG PUT SOLD')) return 'text-red-400';
    if (u.includes('UT SOLD')) return 'text-red-400';
    if (u.includes('BULL')) return 'text-green-400';
    if (u.includes('BEAR')) return 'text-red-400';
    return 'text-gray-300';
  };

  const getIntradayColor = (flow: string) => {
    const f = flow.toLowerCase();
    if (f === 'low') return 'text-green-400';
    if (f === 'medium') return 'text-yellow-400';
    if (f === 'high') return 'text-red-400';
    if (f.includes('put selling')) return 'text-pink-400';
    if (f.includes('bull seling')) return 'text-green-400';
    if (f.includes('call selling')) return 'text-orange-400';
    if (f.includes('put buying')) return 'text-pink-400';
    if (f.includes('put buting')) return 'text-pink-400';
    if (f.includes('call hedged')) return 'text-orange-400';
    if (f.includes('put')) return 'text-pink-400';
    if (f.includes('bear hedge')) return 'text-red-400';
    if (f.includes('bear')) return 'text-red-400';
    if (f.includes('hedge')) return 'text-orange-400';
    if (f.includes('elevated')) return 'text-purple-400';
    return 'text-gray-300';
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-black p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"></div>
              <span className="ml-4 text-white text-xl">Loading Market Data...</span>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-black p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-red-400 text-lg font-semibold mb-2">Error Loading Data</h3>
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-6">
          
          {/* Market Data Table */}
          <div className="bg-black overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-orange-500">
                  <tr className="text-black text-xs font-bold">
                    <th className="px-2 py-2 text-left border border-black">MAIN US</th>
                    <th className="px-2 py-2 text-center border border-black">OPTION VOL<br />ABOVE AVG</th>
                    <th className="px-2 py-2 text-center border border-black">TREND</th>
                    <th className="px-2 py-2 text-center border border-black">TREND</th>
                    <th className="px-2 py-2 text-center border border-black">DEMAND/SUPPLY<br />(colored strong)</th>
                    <th className="px-2 py-2 text-center border border-black">OPTIONS SENTIMENT<br />(unusual colored)</th>
                    <th className="px-2 py-2 text-center border border-black">OPUNUAI<br />OPTION FLO</th>
                    <th className="px-2 py-2 text-center border border-black">UNUSUAL OPTION<br />FLOW OTM</th>
                    <th className="px-2 py-2 text-center border border-black">INTRADAY<br />FLOW</th>
                    <th className="px-2 py-2 text-center border border-black">PUT/CALL<br />volume<br />ratio</th>
                  </tr>
                </thead>
                <tbody className="bg-black">
                  {dashboardData?.data.slice(0, 20).map((item, index) => (
                    <tr key={item.ticker} className="border-b border-gray-800">
                      <td className="px-2 py-1 border border-gray-800">
                        <div className="flex items-center text-sm">
                          {formatTicker(item.ticker)}
                          <span className="ml-1 text-white font-semibold">{item.ticker}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1 text-center border border-gray-800">
                        <span className={`text-xs font-semibold ${parseFloat(item.performance) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.performance}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center border border-gray-800">
                        <span className={`text-xs font-bold ${getTrendColor(item.trend)}`}>
                          {item.trend.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center border border-gray-800">
                        <span className={`text-xs font-bold ${getTrendColor(item.trend)}`}>
                          {item.trend.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center border border-gray-800">
                        <span className={`text-xs font-bold ${getDemandSupplyColor(item.demandSupply)}`}>
                          {item.demandSupply.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center border border-gray-800">
                        <span className={`text-xs font-bold ${getSentimentColor(item.optionsSentiment)}`}>
                          {item.optionsSentiment.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center border border-gray-800">
                        <span className={`text-xs font-bold ${getFlowColor(item.unusualAtm)}`}>
                          {item.unusualAtm.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center border border-gray-800">
                        <span className={`text-xs font-bold ${getUnusualColor(item.unusualOtm)}`}>
                          {item.unusualOtm.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center border border-gray-800">
                        <span className={`text-xs font-bold ${getIntradayColor(item.intradayFlow)}`}>
                          {item.intradayFlow}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center border border-gray-800">
                        <span className="text-white text-xs">
                          {item.putCallRatio}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Bar */}
          <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span>Last Updated: {dashboardData?.lastUpdated ? new Date(dashboardData.lastUpdated).toLocaleTimeString() : 'Unknown'}</span>
              <span>Cache: {dashboardData?.cacheStatus || 'Unknown'}</span>
              <span>Symbols: {dashboardData?.data.length || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
