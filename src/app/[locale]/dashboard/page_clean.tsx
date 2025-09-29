'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '../../../components/Navigation';
import Footer from '../../../components/Footer';
import ProtectedRoute from '../../../components/ProtectedRoute';
import SPXChart from '../../../components/SPXChart';

interface MarketData {
  ticker: string;
  name: string;
  performance: string;
  price?: string;
  change?: string;
  volume?: string;
  trend: string;
  demandSupply: string;
  optionsSentiment: string;
  gammaRisk: string;
  unusualAtm: string;
  unusualOtm: string;
  otmSkew: string;
  intradayFlow: string;
  putCallRatio: string;
  sector?: string;
  lastUpdated?: number;
  direction?: string; // Freccia per direzione
  // AI PE Ratio fields
  peTrailing?: number|null;
  peForward?: number|null;
  peHistory?: number[];
  peNormalized?: number|null;
  peSignal?: string;
  peExplanation?: string;
  sentimentData?: {
    score: number;
    sentiment: string;
    confidence: number;
  };
  peAIPrediction?: {
    pe3: number|null;
    pe6: number|null;
    pe12: number|null;
    probability: number;
    sentimentImpact: string;
  };
}

interface DashboardResponse {
  data: MarketData[];
  economicPortfolios?: any;
  spxValuation?: any;
  summary: {
    avgPerformance: string;
    totalVolume: string;
    bullishCount: number;
    bearishCount: number;
    marketSentiment: string;
  };
  lastUpdated: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<MarketData[]>([]);
  const [summary, setSummary] = useState<DashboardResponse['summary'] | null>(null);
  const [economicPortfolios, setEconomicPortfolios] = useState<any>(null);
  const [spxValuation, setSpxValuation] = useState<any>(null);
  const [newsData, setNewsData] = useState<any[]>([]);
  const [fedWatchData, setFedWatchData] = useState<any>(null);
  const [economicEvents, setEconomicEvents] = useState<any[]>([]);
  const [earningsData, setEarningsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // VIX data state
  const [vixData, setVixData] = useState<{
    price: number;
    volatilityLevel: string;
    color: string;
  }>({ price: 18.5, volatilityLevel: 'Moderate', color: 'yellow' });
  
  // New filter states
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMarket, setSelectedMarket] = useState<string>('All');
  const [selectedView, setSelectedView] = useState<string>('portfolios'); // 'markets', 'portfolios', 'news', 'fedwatch', 'spx', 'calendar', or 'earnings'

  // Generate realistic economic calendar events
  const generateEconomicEvents = () => {
    const today = new Date();
    const events = [];
    
    // This week's events
    const thisWeekEvents = [
      {
        id: 1,
        date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
        time: '08:30',
        country: 'US',
        flag: '🇺🇸',
        event: 'Initial Jobless Claims',
        importance: 'medium',
        actual: null,
        forecast: '220K',
        previous: '213K',
        currency: 'USD'
      },
      {
        id: 2,
        date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
        time: '10:00',
        country: 'US',
        flag: '🇺🇸',
        event: 'Existing Home Sales',
        importance: 'medium',
        actual: null,
        forecast: '4.10M',
        previous: '4.15M',
        currency: 'USD'
      },
      {
        id: 3,
        date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
        time: '08:30',
        country: 'US',
        flag: '🇺🇸',
        event: 'Flash Manufacturing PMI',
        importance: 'high',
        actual: null,
        forecast: '48.5',
        previous: '48.0',
        currency: 'USD'
      },
      {
        id: 4,
        date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
        time: '14:00',
        country: 'US',
        flag: '🇺🇸',
        event: 'FOMC Meeting Minutes',
        importance: 'high',
        actual: null,
        forecast: null,
        previous: null,
        currency: 'USD'
      },
      {
        id: 5,
        date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
        time: '08:30',
        country: 'US',
        flag: '🇺🇸',
        event: 'GDP Quarterly Rate',
        importance: 'high',
        actual: null,
        forecast: '2.1%',
        previous: '2.8%',
        currency: 'USD'
      },
      {
        id: 6,
        date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
        time: '08:30',
        country: 'US',
        flag: '🇺🇸',
        event: 'Core PCE Price Index',
        importance: 'high',
        actual: null,
        forecast: '2.8%',
        previous: '2.9%',
        currency: 'USD'
      },
      {
        id: 7,
        date: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000),
        time: '08:30',
        country: 'US',
        flag: '🇺🇸',
        event: 'Non-Farm Payrolls',
        importance: 'high',
        actual: null,
        forecast: '200K',
        previous: '256K',
        currency: 'USD'
      },
      {
        id: 8,
        date: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000),
        time: '08:30',
        country: 'US',
        flag: '🇺🇸',
        event: 'Unemployment Rate',
        importance: 'high',
        actual: null,
        forecast: '4.1%',
        previous: '4.1%',
        currency: 'USD'
      },
      // European events
      {
        id: 9,
        date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
        time: '09:00',
        country: 'EU',
        flag: '🇪🇺',
        event: 'ECB Interest Rate Decision',
        importance: 'high',
        actual: null,
        forecast: '3.25%',
        previous: '3.25%',
        currency: 'EUR'
      },
      {
        id: 10,
        date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
        time: '10:00',
        country: 'DE',
        flag: '🇩🇪',
        event: 'German IFO Business Climate',
        importance: 'medium',
        actual: null,
        forecast: '85.8',
        previous: '85.4',
        currency: 'EUR'
      },
      {
        id: 11,
        date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
        time: '09:55',
        country: 'DE',
        flag: '🇩🇪',
        event: 'German Unemployment Rate',
        importance: 'medium',
        actual: null,
        forecast: '6.0%',
        previous: '6.0%',
        currency: 'EUR'
      },
      // UK events
      {
        id: 12,
        date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
        time: '07:00',
        country: 'UK',
        flag: '🇬🇧',
        event: 'BOE Interest Rate Decision',
        importance: 'high',
        actual: null,
        forecast: '4.75%',
        previous: '4.75%',
        currency: 'GBP'
      },
      {
        id: 13,
        date: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000),
        time: '09:30',
        country: 'UK',
        flag: '🇬🇧',
        event: 'GDP Monthly Rate',
        importance: 'medium',
        actual: null,
        forecast: '0.2%',
        previous: '0.1%',
        currency: 'GBP'
      }
    ];

    return thisWeekEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const fetchLiveData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard-data', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.warn(`Dashboard API error: ${response.status} ${response.statusText}`);
        // Don't throw immediately, try to get error details
        if (response.status === 503) {
          console.warn('Service temporarily unavailable, using existing data');
          return; // Keep existing data
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: DashboardResponse = await response.json();
      
      // Ensure data is always an array
      setData(result.data || []);
      setSummary(result.summary || null);
      setEconomicPortfolios(result.economicPortfolios || null);
      setSpxValuation(result.spxValuation || null);
      setLastUpdated(result.lastUpdated || new Date().toISOString());
      
      // Fetch earnings calendar data separately
      try {
        const earningsResponse = await fetch('/api/earnings-calendar', {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (earningsResponse.ok) {
          const earningsResult = await earningsResponse.json();
          setEarningsData(earningsResult);
          console.log('📊 Earnings calendar data loaded:', earningsResult.summary);
        } else {
          console.warn('Failed to fetch earnings calendar data');
        }
      } catch (earningsError) {
        console.warn('Error fetching earnings calendar:', earningsError);
      }
      
      console.log('📊 Dashboard loaded successfully');
      console.log('🏦 Economic Portfolios received:', result.economicPortfolios ? Object.keys(result.economicPortfolios).length : 0);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Show empty data on error
      setData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchNews = async () => {
    try {
      const response = await fetch('/api/news', { cache: 'no-store' });
      const result = await response.json();
      setNewsData(result.data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      setNewsData([]);
    }
  };

  const fetchFedWatch = async () => {
    try {
      const response = await fetch('/api/fed-watch', { cache: 'no-store' });
      const result = await response.json();
      setFedWatchData(result);
    } catch (error) {
      console.error('Error fetching Fed Watch data:', error);
      setFedWatchData(null);
    }
  };

  const fetchVixData = async () => {
    try {
      const response = await fetch('/api/vix');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setVixData({
            price: result.data.price,
            volatilityLevel: result.data.volatilityLevel,
            color: result.data.color
          });
        }
      }
    } catch (error) {
      console.error('Error fetching VIX data:', error);
    }
  };

  useEffect(() => {
    fetchLiveData();
    fetchVixData();
    fetchNews();
    fetchFedWatch();
    setEconomicEvents(generateEconomicEvents());
    
    // Auto-refresh every 1 hour (3600 seconds = 60 minutes)
    const interval = setInterval(() => {
      fetchLiveData();
      fetchVixData();
      fetchNews();
      fetchFedWatch();
    }, 3600000);
    return () => clearInterval(interval);
  }, []);

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'UPTREND': return 'text-green-500 bg-green-100';
      case 'DOWNTREND': return 'text-red-500 bg-red-100';
      default: return 'text-yellow-500 bg-yellow-100';
    }
  };

  const getPerformanceColor = (performance: string) => {
    return performance.startsWith('+') ? 'text-green-500' : 'text-red-500';
  };

  // Get unique sectors for filter dropdown
  const getUniqueSectors = () => {
    const sectors = [...new Set(data.map(item => item.sector).filter(Boolean))];
    return sectors.sort();
  };

  // Get unique markets for filter dropdown
  const getUniqueMarkets = () => {
    const markets = new Set<string>();
    data.forEach(item => {
      if (item.ticker.includes('.AS') || item.ticker.includes('.DE') || item.ticker.includes('.SW') || item.ticker.includes('.PA') || item.ticker.includes('.L')) {
        markets.add('European');
      } else if (['TSM', 'BABA', 'TCEHY', 'JD', 'BIDU', 'NIO'].includes(item.ticker)) {
        markets.add('Asian');
      } else if (item.sector === 'Commodities' || item.ticker.includes('XAU') || item.ticker.includes('XAG') || item.ticker.includes('BRENT') || item.ticker.includes('WTI')) {
        markets.add('Commodities');
      } else if (item.ticker.includes('/')) {
        markets.add('Cryptocurrency');
      } else {
        markets.add('US');
      }
    });
    return Array.from(markets).sort();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-900 text-white">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-3 py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <NavigationLink href="/" className="text-blue-400 hover:text-blue-300">
                  <ArrowLeftIcon className="h-4 w-4" />
                </NavigationLink>
                <div>
                  <h1 className="text-sm font-bold">Market Dashboard</h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Navigation */}
        <div className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-3 py-3">
            <div className="flex space-x-1 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedView('markets')}
                className={`px-4 py-2 text-sm font-medium rounded whitespace-nowrap ${
                  selectedView === 'markets'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                📊 Markets Dashboard
              </button>
              <button
                onClick={() => setSelectedView('portfolios')}
                className={`px-4 py-2 text-sm font-medium rounded whitespace-nowrap ${
                  selectedView === 'portfolios'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                📈 Economic Portfolios
              </button>
              <button
                onClick={() => setSelectedView('news')}
                className={`px-4 py-2 text-sm font-medium rounded whitespace-nowrap ${
                  selectedView === 'news'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                📰 News
              </button>
              <button
                onClick={() => setSelectedView('fedwatch')}
                className={`px-4 py-2 text-sm font-medium rounded whitespace-nowrap ${
                  selectedView === 'fedwatch'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                🏦 FedWatch
              </button>
              <button
                onClick={() => setSelectedView('spx')}
                className={`px-4 py-2 text-sm font-medium rounded whitespace-nowrap ${
                  selectedView === 'spx'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                📊 S&P 500 P/E
              </button>
              <button
                onClick={() => setSelectedView('calendar')}
                className={`px-4 py-2 text-sm font-medium rounded whitespace-nowrap ${
                  selectedView === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                📅 Economic Calendar
              </button>
              <button
                onClick={() => setSelectedView('earnings')}
                className={`px-4 py-2 text-sm font-medium rounded whitespace-nowrap ${
                  selectedView === 'earnings'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                📈 Earnings Calendar
              </button>
            </div>
          </div>
        </div>

        {/* Market Summary */}
        {summary && (
          <div className="max-w-7xl mx-auto px-3 py-1">
            <div className="grid grid-cols-5 gap-1 mb-2">
              <div className="bg-slate-800 rounded p-1">
                <div className="text-xs text-gray-400">Avg Performance</div>
                <div className={`text-xs font-bold ${summary.avgPerformance.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                  {summary.avgPerformance}
                </div>
              </div>
              <div className="bg-slate-800 rounded p-1">
                <div className="text-xs text-gray-400">Volume</div>
                <div className="text-xs font-bold text-white">{summary.totalVolume}</div>
              </div>
              <div className="bg-slate-800 rounded p-1">
                <div className="text-xs text-gray-400">Bull/Bear</div>
                <div className="text-xs font-bold text-white">{summary.bullishCount}/{summary.bearishCount}</div>
              </div>
              <div className="bg-slate-800 rounded p-1">
                <div className="text-xs text-gray-400">Sentiment</div>
                <div className={`text-xs font-bold ${
                  summary.marketSentiment === 'Bullish' ? 'text-green-500' : 
                  summary.marketSentiment === 'Bearish' ? 'text-red-500' : 'text-yellow-500'
                }`}>
                  {summary.marketSentiment}
                </div>
              </div>
              <div className="bg-slate-800 rounded p-1">
                <div className="text-xs text-gray-400">Status</div>
                <div className="text-xs font-bold flex items-center text-green-500">
                  <div className="w-1 h-1 rounded-full mr-1 bg-green-500 animate-pulse"></div>
                  LIVE
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-white mb-4">Dashboard Content</h2>
          <p className="text-gray-300 mb-4">Selected view: {selectedView}</p>
          <p className="text-gray-400 text-sm">
            Dashboard successfully cleaned! All analyst sections have been removed.
          </p>
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
