'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Search, BarChart3, Grid3x3, List, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';

type TimePeriod = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y';

interface SectorETF {
  ticker: string;
  sector: string;
  closingPrice: number;
  lastPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
}

interface Holding {
  ticker: string;
  name: string;
  weight: number;
  closingPrice: number;
  lastPrice: number;
  change: number;
  changePercent: number;
}

interface HoldingsData {
  ticker: string;
  sector: string;
  holdings: Holding[];
  totalHoldings: number;
  lastUpdated: string;
}

export default function SectorTracker() {
  const [period, setPeriod] = useState<TimePeriod>('1D');
  const [etfData, setEtfData] = useState<SectorETF[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [error, setError] = useState('');
  
  // Holdings drill-down state
  const [selectedETF, setSelectedETF] = useState<string | null>(null);
  const [holdingsData, setHoldingsData] = useState<HoldingsData | null>(null);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [holdingsView, setHoldingsView] = useState<'list' | 'heatmap'>('list');
  const [holdingsSearch, setHoldingsSearch] = useState('');

  const periods: TimePeriod[] = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y'];

  const fetchETFData = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      
      const response = await fetch(`/api/sector-etf-data?period=${period}`, {
        cache: 'no-store',
      });
      
      if (!response.ok) throw new Error('Failed to fetch ETF data');
      
      const data = await response.json();
      setEtfData(data.etfs || []);
      setLastUpdated(data.lastUpdated || new Date().toISOString());
      setError('');
    } catch (err) {
      console.error('ETF data error:', err);
      setError('Failed to load sector ETF data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchHoldings = async (ticker: string) => {
    try {
      setHoldingsLoading(true);
      const response = await fetch(`/api/sector-etf-data?ticker=${ticker}&period=${period}`, {
        cache: 'no-store',
      });
      
      if (!response.ok) throw new Error('Failed to fetch holdings');
      
      const data = await response.json();
      setHoldingsData(data);
    } catch (err) {
      console.error('Holdings error:', err);
    } finally {
      setHoldingsLoading(false);
    }
  };

  useEffect(() => {
    fetchETFData();
  }, [period]);

  useEffect(() => {
    if (selectedETF) {
      fetchHoldings(selectedETF);
    } else {
      setHoldingsData(null);
    }
  }, [selectedETF, period]);

  const formatPrice = (price: number) => price.toFixed(2);
  const formatChange = (change: number) => (change >= 0 ? '+' : '') + change.toFixed(2);
  const formatPercent = (percent: number) => (percent >= 0 ? '+' : '') + percent.toFixed(2);

  const getChangeColor = (changePercent: number) => {
    if (changePercent > 0) return 'text-emerald-400';
    if (changePercent < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getChangeBg = (changePercent: number) => {
    if (changePercent > 0) return 'bg-emerald-500/10 border-emerald-500/20';
    if (changePercent < 0) return 'bg-red-500/10 border-red-500/20';
    return 'bg-gray-500/10 border-gray-500/20';
  };

  const filteredHoldings = holdingsData?.holdings.filter(h =>
    h.ticker.toLowerCase().includes(holdingsSearch.toLowerCase()) ||
    h.name.toLowerCase().includes(holdingsSearch.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 backdrop-blur-md rounded-2xl border border-red-500/20 p-8">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Sector Tracker</h2>
            <p className="text-sm text-gray-400">
              Track the performance of the Select Sector SPDR® ETFs and their underlying holdings
            </p>
          </div>
          <button
            onClick={() => fetchETFData(true)}
            disabled={refreshing}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
        </div>

        {/* Period filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400 mr-2">Overview as of {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          {periods.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ETF Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="text-left p-4 text-sm font-semibold text-gray-300">
                <div className="flex flex-col">
                  <span>Ticker</span>
                  <span className="font-normal text-xs text-gray-500">Sector</span>
                </div>
              </th>
              <th className="text-right p-4 text-sm font-semibold text-gray-300">
                <div className="flex flex-col items-end">
                  <span>Closing Price ($)</span>
                  <span className="font-normal text-xs text-gray-500">Market price of last trade</span>
                </div>
              </th>
              <th className="text-right p-4 text-sm font-semibold text-gray-300">
                <div className="flex flex-col items-end">
                  <span>Last Price ($)</span>
                  <span className="font-normal text-xs text-gray-500">Historical price</span>
                </div>
              </th>
              <th className="text-right p-4 text-sm font-semibold text-gray-300">
                <div className="flex flex-col items-end">
                  <span>Change ($)</span>
                  <span className="font-normal text-xs text-gray-500">Price difference</span>
                </div>
              </th>
              <th className="text-right p-4 text-sm font-semibold text-gray-300">
                <div className="flex flex-col items-end">
                  <span>Change (%)</span>
                  <span className="font-normal text-xs text-gray-500">Percentage change</span>
                </div>
              </th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {etfData.map((etf, idx) => (
              <React.Fragment key={etf.ticker}>
                <tr
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => setSelectedETF(selectedETF === etf.ticker ? null : etf.ticker)}
                >
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{etf.ticker}</span>
                      <span className="text-sm text-gray-400">{etf.sector}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-semibold text-white">
                    {formatPrice(etf.closingPrice)}
                  </td>
                  <td className="p-4 text-right text-gray-300">
                    {formatPrice(etf.lastPrice)}
                  </td>
                  <td className={`p-4 text-right font-medium ${getChangeColor(etf.changePercent)}`}>
                    {formatChange(etf.change)}
                  </td>
                  <td className="p-4 text-right">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${getChangeBg(etf.changePercent)}`}>
                      {etf.changePercent > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : etf.changePercent < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : null}
                      <span className={`font-semibold text-sm ${getChangeColor(etf.changePercent)}`}>
                        {formatPercent(etf.changePercent)}%
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {selectedETF === etf.ticker ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </td>
                </tr>

                {/* Holdings drill-down */}
                {selectedETF === etf.ticker && (
                  <tr>
                    <td colSpan={6} className="bg-slate-950/50 border-b border-white/10">
                      <div className="p-6">
                        {holdingsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
                          </div>
                        ) : holdingsData ? (
                          <HoldingsView
                            data={holdingsData}
                            view={holdingsView}
                            setView={setHoldingsView}
                            search={holdingsSearch}
                            setSearch={setHoldingsSearch}
                            filteredHoldings={filteredHoldings}
                            formatPrice={formatPrice}
                            formatChange={formatChange}
                            formatPercent={formatPercent}
                            getChangeColor={getChangeColor}
                            getChangeBg={getChangeBg}
                            period={period}
                          />
                        ) : (
                          <p className="text-gray-400 text-center py-8">No holdings data available</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Holdings detail view component
function HoldingsView({
  data,
  view,
  setView,
  search,
  setSearch,
  filteredHoldings,
  formatPrice,
  formatChange,
  formatPercent,
  getChangeColor,
  getChangeBg,
  period,
}: {
  data: HoldingsData;
  view: 'list' | 'heatmap';
  setView: (v: 'list' | 'heatmap') => void;
  search: string;
  setSearch: (s: string) => void;
  filteredHoldings: Holding[];
  formatPrice: (n: number) => string;
  formatChange: (n: number) => string;
  formatPercent: (n: number) => string;
  getChangeColor: (n: number) => string;
  getChangeBg: (n: number) => string;
  period: TimePeriod;
}) {
  // Calculate total change for ETF
  const totalChangePercent = data.holdings.reduce((sum, h) => sum + h.changePercent, 0) / (data.holdings.length || 1);

  return (
    <div>
      {/* Holdings header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">
            {data.ticker} - {data.sector}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>{data.totalHoldings} Number of Holdings</span>
            <span>
              <span className={getChangeColor(totalChangePercent)}>
                {formatPercent(totalChangePercent)}%
              </span>
              {' '}Total %Change
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
              view === 'list'
                ? 'bg-emerald-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <List className="w-4 h-4" />
            List view
          </button>
          <button
            onClick={() => setView('heatmap')}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
              view === 'heatmap'
                ? 'bg-emerald-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
            Heat map
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Enter symbol, company name"
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      {/* Holdings list/heatmap */}
      {view === 'list' ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="text-left p-3 text-xs font-semibold text-gray-400">Ticker</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-400">Name</th>
                <th className="text-right p-3 text-xs font-semibold text-gray-400">Weight (%)</th>
                <th className="text-right p-3 text-xs font-semibold text-gray-400">Closing Price ($)</th>
                <th className="text-right p-3 text-xs font-semibold text-gray-400">Last Price ($)</th>
                <th className="text-right p-3 text-xs font-semibold text-gray-400">Change ($)</th>
                <th className="text-right p-3 text-xs font-semibold text-gray-400">Change (%)</th>
              </tr>
            </thead>
            <tbody>
              {filteredHoldings.slice(0, 20).map((holding) => (
                <tr
                  key={holding.ticker}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="p-3 font-bold text-white">{holding.ticker}</td>
                  <td className="p-3 text-sm text-gray-300">{holding.name}</td>
                  <td className="p-3 text-right text-gray-300">{holding.weight.toFixed(2)}</td>
                  <td className="p-3 text-right font-semibold text-white">{formatPrice(holding.closingPrice)}</td>
                  <td className="p-3 text-right text-gray-300">{formatPrice(holding.lastPrice)}</td>
                  <td className={`p-3 text-right font-medium ${getChangeColor(holding.changePercent)}`}>
                    {formatChange(holding.change)}
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-semibold ${getChangeColor(holding.changePercent)}`}>
                      {formatPercent(holding.changePercent)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredHoldings.length > 20 && (
            <div className="mt-4 text-center text-sm text-gray-400">
              Showing 1-20 of {filteredHoldings.length} holdings
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {filteredHoldings.map((holding) => {
            const intensity = Math.min(Math.abs(holding.changePercent) / 5, 1); // Scale to 0-1
            const bgColor = holding.changePercent >= 0
              ? `rgba(16, 185, 129, ${intensity * 0.3})` // emerald
              : `rgba(239, 68, 68, ${intensity * 0.3})`; // red
            
            return (
              <div
                key={holding.ticker}
                className="p-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                style={{ backgroundColor: bgColor }}
              >
                <div className="font-bold text-white mb-1">{holding.ticker}</div>
                <div className="text-xs text-gray-400 mb-2 truncate">{holding.name}</div>
                <div className={`text-sm font-semibold ${getChangeColor(holding.changePercent)}`}>
                  {formatPercent(holding.changePercent)}%
                </div>
                <div className="text-xs text-gray-500">{formatPrice(holding.closingPrice)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
