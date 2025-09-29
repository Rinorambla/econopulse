'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import SPXChart from '@/components/SPXChart';

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
  const [analystsData, setAnalystsData] = useState<any>(null);
  const [analystsLoading, setAnalystsLoading] = useState(false);
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
  const [selectedView, setSelectedView] = useState<string>('portfolios'); // 'markets', 'portfolios', 'news', 'fedwatch', 'spx', 'calendar', 'analysts', or 'earnings'

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
        flag: '­ƒç║­ƒç©',
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
        flag: '­ƒç║­ƒç©',
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
        flag: '­ƒç║­ƒç©',
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
        flag: '­ƒç║­ƒç©',
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
        flag: '­ƒç║­ƒç©',
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
        flag: '­ƒç║­ƒç©',
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
        flag: '­ƒç║­ƒç©',
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
        flag: '­ƒç║­ƒç©',
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
        flag: '­ƒç¬­ƒç║',
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
        flag: '­ƒç®­ƒç¬',
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
        flag: '­ƒç®­ƒç¬',
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
        flag: '­ƒç¼­ƒçº',
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
        flag: '­ƒç¼­ƒçº',
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
          console.log('­ƒôè Earnings calendar data loaded:', earningsResult.summary);
        } else {
          console.warn('Failed to fetch earnings calendar data');
        }
      } catch (earningsError) {
        console.warn('Error fetching earnings calendar:', earningsError);
      }
      
      console.log('­ƒôè Dashboard loaded successfully');
      console.log('­ƒÅª Economic Portfolios received:', result.economicPortfolios ? Object.keys(result.economicPortfolios).length : 0);
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

  // Fetch analysts data
  const fetchAnalystsData = async () => {
    try {
      setAnalystsLoading(true);
      const response = await fetch('/api/analysts');
      if (response.ok) {
        const data = await response.json();
        setAnalystsData(data);
      } else {
        console.error('Failed to fetch analysts data');
      }
    } catch (error) {
      console.error('Error fetching analysts data:', error);
    } finally {
      setAnalystsLoading(false);
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

  // Load analysts data when analysts view is selected
  useEffect(() => {
    if (selectedView === 'analysts' && !analystsData) {
      fetchAnalystsData();
    }
  }, [selectedView, analystsData]);

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

  // Filter data based on selected filters
  const getFilteredData = () => {
    return data.filter(item => {
      // Sector filter
      if (selectedSector !== 'All') {
        if (selectedSector === 'ETF') {
          // Show all ETFs - comprehensive matching
          const isETF = item.sector?.includes('ETF') || 
                       item.sector?.includes('Bond') ||
                       item.sector?.includes('Index') ||
                       item.sector?.includes('Commodities') ||
                       item.sector?.includes('International') ||
                       item.sector?.includes('Emerging Markets') ||
                       item.sector?.includes('Growth') ||
                       item.sector?.includes('Value') ||
                       item.sector?.includes('Materials') ||
                       item.sector?.includes('Real Estate ETF') ||
                       item.sector?.includes('Financial ETF') ||
                       item.sector?.includes('Energy ETF') ||
                       item.sector?.includes('Healthcare ETF') ||
                       item.sector?.includes('Technology ETF') ||
                       item.sector?.includes('Currency ETF') ||
                       item.sector?.includes('Crypto ETF');
          if (!isETF) return false;
        } else if (selectedSector === 'Technology') {
          // Match Technology companies and ETFs
          const isTech = item.sector?.includes('Technology') ||
                        item.sector?.includes('Software') ||
                        item.sector?.includes('Semiconductor') ||
                        item.sector?.includes('Internet') ||
                        item.sector?.includes('Communication Services');
          if (!isTech) return false;
        } else if (selectedSector === 'Healthcare') {
          // Match Healthcare companies and ETFs
          const isHealthcare = item.sector?.includes('Healthcare') ||
                              item.sector?.includes('Biotechnology') ||
                              item.sector?.includes('Pharmaceuticals') ||
                              item.sector?.includes('Medical');
          if (!isHealthcare) return false;
        } else if (selectedSector === 'Financial') {
          // Match Financial companies and ETFs - EXPANDED to catch "Financial Services"
          const isFinancial = item.sector?.includes('Financial') ||
                             item.sector?.includes('Bank') ||
                             item.sector?.includes('Insurance') ||
                             item.sector?.includes('Investment') ||
                             item.sector?.includes('Services'); // This catches "Financial Services"
          if (!isFinancial) return false;
        } else if (selectedSector === 'Real Estate') {
          // Match Real Estate and REITs
          const isRealEstate = item.sector?.includes('Real Estate') ||
                              item.sector?.includes('REIT');
          if (!isRealEstate) return false;
        } else if (selectedSector === 'Consumer Staples') {
          // Match Consumer Staples
          const isConsumerStaples = item.sector?.includes('Consumer Staples') ||
                                   (item.sector?.includes('Consumer') && !item.sector?.includes('Discretionary'));
          if (!isConsumerStaples) return false;
        } else if (selectedSector === 'Consumer') {
          // Match ALL Consumer companies
          const isConsumer = item.sector?.includes('Consumer') ||
                            item.sector?.includes('Retail') ||
                            item.sector?.includes('Food') ||
                            item.sector?.includes('Beverage');
          if (!isConsumer) return false;
        } else if (selectedSector === 'Energy') {
          // Match Energy companies and ETFs
          const isEnergy = item.sector?.includes('Energy') ||
                          item.sector?.includes('Oil') ||
                          item.sector?.includes('Gas') ||
                          item.sector?.includes('Utilities');
          if (!isEnergy) return false;
        } else if (selectedSector === 'Index') {
          // Match Index ETFs
          const isIndex = item.sector?.includes('Index') ||
                         item.sector?.includes('SPY') ||
                         item.sector?.includes('QQQ');
          if (!isIndex) return false;
        } else if (selectedSector === 'Commodities') {
          // Match Commodities and related ETFs
          const isCommodities = item.sector?.includes('Commodities') ||
                               item.sector?.includes('Gold') ||
                               item.sector?.includes('Silver') ||
                               item.sector?.includes('Oil') ||
                               item.sector?.includes('Materials');
          if (!isCommodities) return false;
        } else if (selectedSector === 'Bond') {
          // Match Bond ETFs and bonds
          const isBond = item.sector?.includes('Bond') ||
                        item.sector?.includes('Treasury') ||
                        item.sector?.includes('Fixed Income');
          if (!isBond) return false;
        } else if (selectedSector === 'Currency') {
          // Match Currency ETFs and forex-related
          const isCurrency = item.sector?.includes('Currency') ||
                            item.sector?.includes('Forex') ||
                            item.sector?.includes('Dollar') ||
                            item.sector?.includes('Euro') ||
                            item.sector?.includes('Yen');
          if (!isCurrency) return false;
        } else if (selectedSector === 'Crypto') {
          // Match Crypto ETFs, mining stocks, and crypto-related
          const isCrypto = item.sector?.includes('Crypto') ||
                          item.sector?.includes('Bitcoin') ||
                          item.sector?.includes('Mining') ||
                          item.sector?.includes('Blockchain');
          if (!isCrypto) return false;
        } else if (selectedSector === 'ETF') {
          // Match ALL ETFs regardless of specific type
          const isETF = item.sector?.includes('ETF') ||
                       item.sector?.includes('Index') ||
                       item.sector?.includes('Bond') ||
                       item.sector?.includes('Commodities') ||
                       item.sector?.includes('Currency') ||
                       item.sector === 'International' ||
                       item.sector === 'Emerging Markets' ||
                       item.sector?.includes('Growth') ||
                       item.sector?.includes('Value') ||
                       // Include major ETF tickers explicitly
                       ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'VEA', 'VWO', 'EFA', 'EEM',
                        'XLF', 'XLE', 'XLI', 'XLK', 'XLP', 'XLU', 'XLV', 'XLB', 'XLY', 'XLRE',
                        'AGG', 'BND', 'TLT', 'GLD', 'SLV', 'USO', 'UNG'].includes(item.ticker);
          if (!isETF) return false;
        } else if (selectedSector === 'Utilities') {
          // Match Utilities
          const isUtilities = item.sector?.includes('Utilities') ||
                             item.sector?.includes('Utility');
          if (!isUtilities) return false;
        } else if (selectedSector === 'Industrials') {
          // Match Industrials - catch both "Industrial" and "Industrials"
          const isIndustrials = item.sector?.includes('Industrial') ||
                               item.sector?.includes('Aerospace');
          if (!isIndustrials) return false;
        } else if (selectedSector === 'Materials') {
          // Match Materials
          const isMaterials = item.sector?.includes('Materials');
          if (!isMaterials) return false;
        } else if (selectedSector === 'Communication') {
          // Match Communication Services
          const isCommunication = item.sector?.includes('Communication');
          if (!isCommunication) return false;
        } else if (item.sector !== selectedSector) {
          return false;
        }
      }

      // Market filter
      if (selectedMarket !== 'All') {
        const isEuropean = item.ticker.includes('.AS') || item.ticker.includes('.DE') || item.ticker.includes('.SW') || item.ticker.includes('.PA') || item.ticker.includes('.L');
        const isAsian = ['TSM', 'BABA', 'TCEHY', 'JD', 'BIDU', 'NIO'].includes(item.ticker);
        const isCommodity = item.sector === 'Commodities' || item.ticker.includes('XAU') || item.ticker.includes('XAG') || item.ticker.includes('BRENT') || item.ticker.includes('WTI');
        const isCrypto = item.ticker.includes('/');

        if (selectedMarket === 'European' && !isEuropean) return false;
        if (selectedMarket === 'Asian' && !isAsian) return false;
        if (selectedMarket === 'Commodities' && !isCommodity) return false;
        if (selectedMarket === 'Cryptocurrency' && !isCrypto) return false;
        if (selectedMarket === 'US' && (isEuropean || isAsian || isCommodity || isCrypto)) return false;
      }

      // Search filter
      if (searchTerm && !item.ticker.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });
  };

  const filteredData = getFilteredData();

  // GROW PLAN: Raggruppa dati per categoria
  const groupDataByCategory = (data: MarketData[]) => {
    const categories = {
      'US Markets': data.filter(item => 
        ['Index', 'Technology', 'Financial Services', 'Consumer Discretionary', 'Healthcare', 'Consumer Staples', 'Retail', 'Industrial', 'Aerospace', 'Automotive', 'Airlines', 'Travel & Leisure', 'Energy'].includes(item.sector || '') &&
        !item.ticker.includes('.') && !item.ticker.includes('/')
      ),
      'European Markets': data.filter(item => item.ticker.includes('.AS') || item.ticker.includes('.DE') || item.ticker.includes('.SW') || item.ticker.includes('.PA') || item.ticker.includes('.L')),
      'Asian Markets': data.filter(item => ['TSM', 'BABA', 'TCEHY', 'JD', 'BIDU', 'NIO'].includes(item.ticker)),
      'Commodities': data.filter(item => item.sector === 'Commodities' || item.ticker.includes('XAU') || item.ticker.includes('XAG') || item.ticker.includes('BRENT') || item.ticker.includes('WTI')),
      'Cryptocurrency': data.filter(item => item.ticker.includes('/'))
    };
    
    return Object.entries(categories).filter(([_, items]) => items.length > 0);
  };

  const categorizedData = groupDataByCategory(data);

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
              ­ƒôè Markets Dashboard
            </button>
            <button
              onClick={() => setSelectedView('portfolios')}
              className={`px-4 py-2 text-sm font-medium rounded whitespace-nowrap ${
                selectedView === 'portfolios'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              ­ƒôê Economic Portfolios
            </button>
            <button
              onClick={() => setSelectedView('news')}
              className={`px-4 py-2 text-sm font-medium rounded whitespace-nowrap ${
                selectedView === 'news'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              ­ƒô░ News
            </button>
            <button
              onClick={() => setSelectedView('fedwatch')}
              className={`px-4 py-2 text-sm font-medium rounded whitespace-nowrap ${
                selectedView === 'fedwatch'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              ­ƒÅª FedWatch
            </button>
            <button
              onClick={() => setSelectedView('spx')}
              className={`px-4 py-2 text-sm font-medium rounded whitespace-nowrap ${
                selectedView === 'spx'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              ­ƒôè S&P 500 P/E
            </button>
            <button
              onClick={() => setSelectedView('calendar')}
              className={`px-4 py-2 text-sm font-medium rounded whitespace-nowrap ${
                selectedView === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              ­ƒôà Economic Calendar
            </button>
            <button
              onClick={() => setSelectedView('analysts')}
              className={`px-4 py-2 text-sm font-medium rounded whitespace-nowrap ${
                selectedView === 'analysts'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              ­ƒÅå Top Wall Street Analysts
            </button>
            <button
              onClick={() => setSelectedView('earnings')}
              className={`px-4 py-2 text-sm font-medium rounded whitespace-nowrap ${
                selectedView === 'earnings'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              ­ƒôê Earnings Calendar
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

      {/* Conditional Content */}
      {selectedView === 'markets' ? (
        <>
      {/* Filter Controls */}
      <div className="max-w-7xl mx-auto px-3 mb-2">
        {/* Quick Sector Filters */}
        <div className="mb-2">
          <div className="flex flex-wrap gap-1">
            {['All', 'ETF', 'Technology', 'Healthcare', 'Financial', 'Real Estate', 'Consumer Staples', 'Consumer', 'Energy', 'Utilities', 'Industrials', 'Materials', 'Communication', 'Index', 'Commodities', 'Bond', 'Currency', 'Crypto'].map(sector => (
              <button
                key={sector}
                onClick={() => setSelectedSector(sector)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedSector === sector
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {sector}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded p-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {/* Search */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search ticker or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Market Filter */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Market</label>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="All">All Markets</option>
                {getUniqueMarkets().map(market => (
                  <option key={market} value={market}>{market}</option>
                ))}
              </select>
            </div>

            {/* Sector Filter */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Sector</label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="All">All Sectors</option>
                {getUniqueSectors().map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>

            {/* Results Count */}
            <div className="flex items-end">
              <div className="text-xs text-gray-400">
                Showing <span className="text-white font-bold">{filteredData.length}</span> of <span className="text-white font-bold">{data.length}</span> stocks
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(selectedSector !== 'All' || selectedMarket !== 'All' || searchTerm) && (
            <div className="mt-2">
              <button
                onClick={() => {
                  setSelectedSector('All');
                  setSelectedMarket('All');
                  setSearchTerm('');
                }}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-3 pb-2">
        <div className="bg-slate-800 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-1 py-1 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                    Ticker/Name
                  </th>
                  <th className="px-1 py-1 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                    Price/Change
                  </th>
                  <th className="px-1 py-1 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                    Perf
                  </th>
                  <th className="px-1 py-1 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                    Vol
                  </th>
                  <th className="px-1 py-1 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                    Trend
                  </th>
                  <th className="px-1 py-1 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                    D/S
                  </th>
                  <th className="px-1 py-1 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                    Opt Sent
                  </th>
                  <th className="px-1 py-1 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                    Gamma
                  </th>
                  <th className="px-1 py-1 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                    P/C
                  </th>
                  <th className="px-1 py-1 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                    OTM
                  </th>
                  <th className="px-1 py-1 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                    Skew
                  </th>
                  <th className="px-1 py-1 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                    Intra
                  </th>
                  <th className="px-1 py-1 text-left text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                    ATM
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {(filteredData || []).map((item, index) => (
                  <tr key={index} className="hover:bg-slate-700/50">
                    <td className="px-1 py-1 whitespace-nowrap">
                      <div>
                        <div className="text-xs font-medium text-white flex items-center gap-1">
                          {item.ticker}
                          {item.direction && <span className="text-[10px]">{item.direction}</span>}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[80px]">{item.name}</div>
                        {item.sector && <div className="text-[10px] text-blue-400">{item.sector}</div>}
                      </div>
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap">
                      <div>
                        <div className="text-xs font-medium text-white">
                          ${item.price || 'N/A'}
                        </div>
                        <div className={`text-[10px] ${getPerformanceColor(item.change || '+0.00')}`}>
                          {item.change ? `$${item.change}` : 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap">
                      <span className={`text-[10px] font-medium ${getPerformanceColor(item.performance)}`}>
                        {item.performance}
                      </span>
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap">
                      <div className="text-[10px] text-gray-300">{item.volume || 'N/A'}</div>
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap">
                      <span className={`inline-flex px-1 py-0.5 text-[10px] font-semibold rounded ${getTrendColor(item.trend)}`}>
                        {item.trend}
                      </span>
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap text-[10px] text-gray-300">
                      {item.demandSupply}
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap text-[10px] text-gray-300">
                      {item.optionsSentiment}
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap">
                      <span className={`text-[10px] font-medium ${
                        item.gammaRisk === 'BUY' ? 'text-green-500' : 
                        item.gammaRisk === 'SELL' ? 'text-red-500' : 'text-yellow-500'
                      }`}>
                        {item.gammaRisk}
                      </span>
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap text-[10px] text-gray-300">
                      {item.putCallRatio}
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap text-[10px] text-gray-300">
                      {item.unusualOtm}
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap text-[10px] text-gray-300">
                      {item.otmSkew}
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap text-[10px] text-gray-300">
                      {item.intradayFlow}
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap text-[10px] text-gray-300">
                      {item.unusualAtm}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mt-2 grid grid-cols-4 gap-1">
          <div className="bg-slate-800 rounded p-1">
            <h3 className="text-xs font-semibold mb-0.5">Market Status</h3>
            <p className="text-xs font-bold text-green-500">OPEN</p>
            <p className="text-[10px] text-gray-400">NYSE: 9:30-4:00 ET</p>
          </div>
          <div className="bg-slate-800 rounded p-1">
            <h3 className="text-xs font-semibold mb-0.5">VIX Level</h3>
            <p className={`text-xs font-bold ${
              vixData.color === 'green' ? 'text-green-500' :
              vixData.color === 'yellow' ? 'text-yellow-500' : 
              vixData.color === 'red' ? 'text-red-500' : 'text-yellow-500'
            }`}>
              {vixData.price}
            </p>
            <p className="text-[10px] text-gray-400">{vixData.volatilityLevel} vol.</p>
          </div>
          <div className="bg-slate-800 rounded p-1">
            <h3 className="text-xs font-semibold mb-0.5">Active</h3>
            <p className="text-xs font-bold text-blue-500">{data.length}</p>
            <p className="text-[10px] text-gray-400">Tracking</p>
          </div>
          <div className="bg-slate-800 rounded p-1">
            <h3 className="text-xs font-semibold mb-0.5">Update</h3>
            <p className="text-xs font-bold text-white">Live</p>
            <p className="text-[10px] text-gray-400">Real-time</p>
          </div>
        </div>
      </div>

      </>
      ) : selectedView === 'portfolios' ? (
        <>
        {/* Enhanced Economic Portfolios Section */}
        <div className="max-w-7xl mx-auto px-3 pb-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">­ƒôè Economic Regime Investment Portfolios</h2>
            <p className="text-gray-300 text-sm mb-4">
              Professional portfolios optimized for different economic conditions. Real data, diversified allocations.
            </p>
            
            {/* Investment Disclaimer */}
            <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="text-blue-400 mt-1">Ôä╣´©Å</div>
                <div>
                  <h3 className="text-blue-300 font-semibold text-sm mb-2">Investment Guidance</h3>
                  <p className="text-blue-200 text-xs leading-relaxed">
                    These portfolios are based on real market data and historical economic patterns. Each portfolio is designed for specific economic conditions. 
                    <strong> Always diversify your investments</strong> and consider your risk tolerance. Past performance does not guarantee future results.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {economicPortfolios ? (
            <div className="space-y-6">
              {/* Market Context Indicator */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    ­ƒÄ» Current Market Context
                  </h3>
                  <div className="text-xs text-gray-400">Updated: {new Date().toLocaleTimeString()}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">Market Sentiment</div>
                    <div className="text-white font-bold text-lg">{summary?.marketSentiment || 'Neutral'}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">Average Performance</div>
                    <div className={`font-bold text-lg ${parseFloat(summary?.avgPerformance || '0') > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {summary?.avgPerformance || '0.00%'}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">Market Activity</div>
                    <div className="text-white font-bold text-lg">
                      {summary?.bullishCount || 0}Ôåù / {summary?.bearishCount || 0}Ôåÿ
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Portfolio Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(() => {
                  console.log('­ƒÅª Rendering economic portfolios:', economicPortfolios ? Object.keys(economicPortfolios).length : 0);
                  console.log('­ƒÅª Portfolio data structure:', economicPortfolios);
                  return Object.entries(economicPortfolios);
                })()
                  .sort(([, a]: [string, any], [, b]: [string, any]) => parseFloat(b.avgPerformance) - parseFloat(a.avgPerformance))
                  .map(([key, portfolio]: [string, any], index: number) => {
                    console.log('­ƒôè Main Portfolio rendering:', { key, portfolio, index });
                    
                    // Defensive check for portfolio properties
                    if (!portfolio || typeof portfolio !== 'object') {
                      console.warn('ÔÜá´©Å Invalid portfolio object:', portfolio);
                      return null;
                    }

                    return (
                    <div key={key} className={`bg-slate-800 rounded-xl p-6 border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] relative ${
                      index === 0 ? 'border-yellow-500/30 bg-gradient-to-br from-slate-800 to-yellow-900/10' :
                      index === 1 ? 'border-gray-400/30 bg-gradient-to-br from-slate-800 to-gray-900/10' :
                      index === 2 ? 'border-orange-500/30 bg-gradient-to-br from-slate-800 to-orange-900/10' :
                      'border-slate-600/30'
                    }`}>
                      
                      {/* Performance Ranking Badge */}
                      <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                        index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-gray-800' :
                        index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                        'bg-gradient-to-r from-blue-500 to-blue-700'
                      }`}>
                        #{index + 1}
                      </div>

                      {/* Portfolio Header */}
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-white mb-2 pr-12">{portfolio?.name || 'Unknown Portfolio'}</h3>
                        <p className="text-gray-300 text-sm mb-3">{portfolio?.description || 'Portfolio description not available'}</p>
                        
                        {/* Multi-Timeframe Performance Metrics */}
                        <div className="mb-4">
                          <div className="text-sm font-semibold text-gray-300 mb-3">­ƒôè Performance Analysis</div>
                          
                          {/* Performance Grid */}
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
                            {portfolio.avgPerformances ? (
                              <>
                                <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                                  <div className="text-xs text-gray-400">Daily</div>
                                  <div className={`text-sm font-bold ${
                                    portfolio.avgPerformances.daily > 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {portfolio.avgPerformances.daily > 0 ? '+' : ''}{portfolio.avgPerformances.daily.toFixed(2)}%
                                  </div>
                                </div>
                                <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                                  <div className="text-xs text-gray-400">Weekly</div>
                                  <div className={`text-sm font-bold ${
                                    portfolio.avgPerformances.weekly > 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {portfolio.avgPerformances.weekly > 0 ? '+' : ''}{portfolio.avgPerformances.weekly.toFixed(2)}%
                                  </div>
                                </div>
                                <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                                  <div className="text-xs text-gray-400">Monthly</div>
                                  <div className={`text-sm font-bold ${
                                    portfolio.avgPerformances.monthly > 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {portfolio.avgPerformances.monthly > 0 ? '+' : ''}{portfolio.avgPerformances.monthly.toFixed(2)}%
                                  </div>
                                </div>
                                <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                                  <div className="text-xs text-gray-400">Quarterly</div>
                                  <div className={`text-sm font-bold ${
                                    portfolio.avgPerformances.quarterly > 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {portfolio.avgPerformances.quarterly > 0 ? '+' : ''}{portfolio.avgPerformances.quarterly.toFixed(2)}%
                                  </div>
                                </div>
                                <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                                  <div className="text-xs text-gray-400">Yearly</div>
                                  <div className={`text-sm font-bold ${
                                    portfolio.avgPerformances.yearly > 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {portfolio.avgPerformances.yearly > 0 ? '+' : ''}{portfolio.avgPerformances.yearly.toFixed(2)}%
                                  </div>
                                </div>
                              </>
                            ) : (
                              /* Fallback to single performance */
                              <>
                                <div className="col-span-2 bg-slate-700/50 rounded-lg p-3">
                                  <div className="text-xs text-gray-400 mb-1">Current Performance</div>
                                  <div className={`text-lg font-bold ${
                                    parseFloat(portfolio.avgPerformance) > 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {parseFloat(portfolio.avgPerformance) > 0 ? '+' : ''}{portfolio.avgPerformance}
                                  </div>
                                </div>
                                <div className="col-span-2 bg-slate-700/50 rounded-lg p-3">
                                  <div className="text-xs text-gray-400 mb-1">Risk Level</div>
                                  <div className="text-white font-semibold">
                                    {Math.abs(parseFloat(portfolio.avgPerformance)) > 2 ? 'High' :
                                     Math.abs(parseFloat(portfolio.avgPerformance)) > 1 ? 'Medium' : 'Low'}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Investment Recommendation */}
                        <div className={`p-3 rounded-lg border-l-4 ${
                          parseFloat(portfolio.avgPerformance) > 1 ? 'bg-green-900/20 border-green-500 text-green-200' :
                          parseFloat(portfolio.avgPerformance) > 0 ? 'bg-blue-900/20 border-blue-500 text-blue-200' :
                          parseFloat(portfolio.avgPerformance) > -1 ? 'bg-yellow-900/20 border-yellow-500 text-yellow-200' :
                          'bg-red-900/20 border-red-500 text-red-200'
                        }`}>
                          <div className="text-xs font-semibold mb-1">
                            {parseFloat(portfolio.avgPerformance) > 1 ? '­ƒƒó Strong Buy Signal' :
                             parseFloat(portfolio.avgPerformance) > 0 ? '­ƒöÁ Buy Signal' :
                             parseFloat(portfolio.avgPerformance) > -1 ? '­ƒƒí Hold/Caution' :
                             '­ƒö┤ Avoid/Reduce'}
                          </div>
                          <div className="text-xs">
                            {parseFloat(portfolio.avgPerformance) > 1 ? 'Excellent conditions for this strategy' :
                             parseFloat(portfolio.avgPerformance) > 0 ? 'Favorable market conditions' :
                             parseFloat(portfolio.avgPerformance) > -1 ? 'Mixed signals, monitor closely' :
                             'Unfavorable conditions for this strategy'}
                          </div>
                        </div>
                      </div>

                      {/* ETF Holdings with Real Data */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-300 border-b border-slate-600 pb-2">
                          ­ƒôê Holdings & Performance
                        </h4>
                        <div className="space-y-2">
                          {portfolio.etfData && portfolio.etfData.slice(0, 5).map((etf: any, etfIndex: number) => (
                            <div key={etfIndex} className="p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-white font-semibold text-sm">{etf.ticker}</span>
                                    <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                                      {(100 / portfolio.etfData.length).toFixed(0)}%
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-400 truncate max-w-[200px] mb-2">{etf.name}</div>
                                  
                                  {/* Multi-timeframe performance for each ETF */}
                                  {etf.performances ? (
                                    <div className="grid grid-cols-5 gap-1">
                                      <div className="text-center">
                                        <div className="text-[10px] text-gray-500">1D</div>
                                        <div className={`text-[10px] font-semibold ${
                                          etf.performances.daily > 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                          {etf.performances.daily > 0 ? '+' : ''}{etf.performances.daily.toFixed(1)}%
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-[10px] text-gray-500">1W</div>
                                        <div className={`text-[10px] font-semibold ${
                                          etf.performances.weekly > 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                          {etf.performances.weekly > 0 ? '+' : ''}{etf.performances.weekly.toFixed(1)}%
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-[10px] text-gray-500">1M</div>
                                        <div className={`text-[10px] font-semibold ${
                                          etf.performances.monthly > 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                          {etf.performances.monthly > 0 ? '+' : ''}{etf.performances.monthly.toFixed(1)}%
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-[10px] text-gray-500">3M</div>
                                        <div className={`text-[10px] font-semibold ${
                                          etf.performances.quarterly > 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                          {etf.performances.quarterly > 0 ? '+' : ''}{etf.performances.quarterly.toFixed(1)}%
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-[10px] text-gray-500">1Y</div>
                                        <div className={`text-[10px] font-semibold ${
                                          etf.performances.yearly > 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                          {etf.performances.yearly > 0 ? '+' : ''}{etf.performances.yearly.toFixed(1)}%
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={`text-xs font-semibold ${
                                      etf.currentPerformance > 0 ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      {etf.currentPerformance > 0 ? '+' : ''}{etf.currentPerformance.toFixed(2)}%
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end ml-2">
                                  <span className="text-white font-medium text-sm">${etf.price.toFixed(2)}</span>
                                  <div className="text-xs text-gray-400">{etf.change}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons - Now Functional */}
                      <div className="mt-6 pt-4 border-t border-slate-600">
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => {
                              const detailsContent = `
­ƒôè PORTFOLIO DETAILED ANALYSIS

Portfolio: ${portfolio?.name || 'Unknown Portfolio'}
­ƒÄ» Economic Regime: ${key.replace(/([A-Z])/g, ' $1').trim()}

´┐¢ MULTI-TIMEFRAME PERFORMANCE:
${portfolio.avgPerformances ? `
ÔÇó Daily:     ${portfolio.avgPerformances.daily > 0 ? '+' : ''}${portfolio.avgPerformances.daily.toFixed(2)}%
ÔÇó Weekly:    ${portfolio.avgPerformances.weekly > 0 ? '+' : ''}${portfolio.avgPerformances.weekly.toFixed(2)}%
ÔÇó Monthly:   ${portfolio.avgPerformances.monthly > 0 ? '+' : ''}${portfolio.avgPerformances.monthly.toFixed(2)}%
ÔÇó Quarterly: ${portfolio.avgPerformances.quarterly > 0 ? '+' : ''}${portfolio.avgPerformances.quarterly.toFixed(2)}%
ÔÇó Yearly:    ${portfolio.avgPerformances.yearly > 0 ? '+' : ''}${portfolio.avgPerformances.yearly.toFixed(2)}%
` : `Current: ${portfolio.avgPerformance}`}

­ƒôê Risk Level: ${Math.abs(parseFloat(portfolio.avgPerformance)) > 2 ? 'High' : Math.abs(parseFloat(portfolio.avgPerformance)) > 1 ? 'Medium' : 'Low'}

­ƒÆ╝ DETAILED HOLDINGS (${portfolio.etfData ? portfolio.etfData.length : 0} ETFs):
${portfolio.etfData ? portfolio.etfData.map((etf: any) => {
  if (etf.performances) {
    return `
ÔÇó ${etf.ticker} - ${etf.name}
  Price: $${etf.price.toFixed(2)}
  Performance: 1D: ${etf.performances.daily.toFixed(1)}% | 1W: ${etf.performances.weekly.toFixed(1)}% | 1M: ${etf.performances.monthly.toFixed(1)}% | 3M: ${etf.performances.quarterly.toFixed(1)}% | 1Y: ${etf.performances.yearly.toFixed(1)}%
  Allocation: ${(100 / portfolio.etfData.length).toFixed(0)}%`;
  } else {
    return `
ÔÇó ${etf.ticker} - ${etf.name}
  Price: $${etf.price.toFixed(2)}
  Performance: ${etf.currentPerformance > 0 ? '+' : ''}${etf.currentPerformance.toFixed(2)}%
  Allocation: ${(100 / portfolio.etfData.length).toFixed(0)}%`;
  }
}).join('\n') : 'Loading...'}

ÔÜá´©Å RISK ASSESSMENT:
${parseFloat(portfolio.avgPerformance) > 1 ? 'Low Risk - Stable performance in current market conditions' :
  parseFloat(portfolio.avgPerformance) > 0 ? 'Medium Risk - Moderate volatility expected' :
  parseFloat(portfolio.avgPerformance) > -1 ? 'High Risk - Caution advised, monitor closely' :
  'Very High Risk - Consider reducing exposure'}

­ƒôê Market Context: ${portfolio?.description || 'Portfolio description not available'}

­ƒÆí PROFESSIONAL ANALYSIS:
ÔÇó This portfolio is designed for ${portfolio?.description ? portfolio.description.toLowerCase() : 'market conditions'}
ÔÇó Diversification across ${portfolio?.etfData ? portfolio.etfData.length : 0} ETFs reduces single-asset risk
ÔÇó Rebalance quarterly or when allocations drift >5% from targets
ÔÇó Monitor economic indicators that affect this regime
                              `;
                              
                              // Create a modal-style alert with better formatting
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 investment-modal';
                              modal.innerHTML = `
                                <div class="bg-slate-800 rounded-xl p-6 max-w-4xl max-h-[85vh] overflow-y-auto m-4 border border-slate-600 shadow-2xl">
                                  <div class="flex justify-between items-center mb-4 sticky top-0 bg-slate-800 z-10 pb-2">
                                    <h3 class="text-xl font-bold text-white">­ƒôè Portfolio Detailed Analysis</h3>
                                    <button class="text-gray-400 hover:text-white text-2xl hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                                  </div>
                                  <pre class="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed bg-slate-900/50 p-4 rounded-lg border border-slate-700">${detailsContent}</pre>
                                  <div class="mt-6 flex justify-end sticky bottom-0 bg-slate-800 pt-4">
                                    <button class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors font-semibold" onclick="this.parentElement.parentElement.parentElement.remove()">Close Analysis</button>
                                  </div>
                                </div>
                              `;
                              document.body.appendChild(modal);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer"
                          >
                            ­ƒôè View Details
                          </button>
                          <button 
                            onClick={() => {
                              const investmentGuide = `
­ƒÆ░ HOW TO INVEST IN ${portfolio.name ? portfolio.name.toUpperCase() : key.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}

­ƒÄ» Portfolio Strategy: ${key.replace(/([A-Z])/g, ' $1').trim()}
­ƒôè Current Performance: ${portfolio.avgPerformance || 'N/A'}

­ƒôï STEP-BY-STEP INVESTMENT PROCESS:

1´©ÅÔâú PREPARATION
   ÔÇó Assess your risk tolerance
   ÔÇó Determine investment amount (recommend 5-15% of portfolio)
   ÔÇó Current risk level: ${portfolio.avgPerformance ? (Math.abs(parseFloat(portfolio.avgPerformance)) > 2 ? 'HIGH' : Math.abs(parseFloat(portfolio.avgPerformance)) > 1 ? 'MEDIUM' : 'LOW') : 'N/A'}

2´©ÅÔâú BROKER SELECTION
   ÔÇó Choose a broker: Fidelity, Vanguard, Charles Schwab, E*TRADE
   ÔÇó Ensure they offer ETF trading
   ÔÇó Look for commission-free ETF trades

3´©ÅÔâú INVESTMENT ALLOCATION
${portfolio.etfData && Array.isArray(portfolio.etfData) ? portfolio.etfData.map((etf: any, idx: number) => {
  const allocation = (100 / portfolio.etfData.length).toFixed(0);
  return `   ${idx + 1}. ${etf.ticker || 'N/A'} (${allocation}%) - Current Price: $${etf.price || '0.00'}
      ÔÇó ${etf.name || 'ETF Name'}
      ÔÇó Performance: ${etf.performance ? (etf.performance > 0 ? '+' : '') + etf.performance.toFixed(2) + '%' : 'N/A'}`;
}).join('\n') : '   ÔÇó Equal weight distribution across all holdings'}

4´©ÅÔâú EXECUTION TIMELINE
   ÔÇó Buy in 2-3 tranches over 4-6 weeks (dollar-cost averaging)
   ÔÇó Set up automatic rebalancing quarterly
   ÔÇó Monitor monthly for major regime changes

5´©ÅÔâú REBALANCING STRATEGY
   ÔÇó Review quarterly
   ÔÇó Rebalance if any ETF deviates >5% from target
   ÔÇó Adjust based on economic regime changes

ÔÜá´©Å IMPORTANT DISCLAIMERS:
   ÔÇó Past performance Ôëá future results
   ÔÇó Diversify across multiple strategies
   ÔÇó Only invest what you can afford to lose
   ÔÇó Consider professional financial advice

­ƒÆí PRO TIPS:
   ÔÇó Start with 50% of intended allocation
   ÔÇó Scale up gradually as confidence grows
   ÔÇó Use limit orders instead of market orders
   ÔÇó Track performance vs benchmark (SPY)
                              `;
                              
                              // Create investment guide modal
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                              modal.innerHTML = `
                                <div class="bg-slate-800 rounded-xl p-6 max-w-3xl max-h-[85vh] overflow-y-auto m-4 border border-slate-600">
                                  <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-xl font-bold text-white">­ƒÆ░ Investment Guide</h3>
                                    <button class="text-gray-400 hover:text-white text-2xl" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                                  </div>
                                  <pre class="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">${investmentGuide}</pre>
                                  <div class="mt-6 flex justify-between">
                                    <div class="text-xs text-gray-400">
                                      ÔÜá´©Å This is educational content only. Not financial advice.
                                    </div>
                                    <button class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors" onclick="this.parentElement.parentElement.parentElement.remove()">Got It!</button>
                                  </div>
                                </div>
                              `;
                              document.body.appendChild(modal);
                            }}
                            className="bg-green-600 hover:bg-green-500 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer"
                          >
                            ­ƒÆ░ How to Invest
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
              </div>

              {/* Investment Tips */}
              <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                  ­ƒÆí Professional Investment Tips
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <span className="text-green-400 font-bold">1.</span>
                      <div>
                        <div className="text-white font-semibold text-sm">Diversification is Key</div>
                        <div className="text-gray-300 text-xs">Never put all eggs in one basket. Mix multiple portfolios based on market conditions.</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-blue-400 font-bold">2.</span>
                      <div>
                        <div className="text-white font-semibold text-sm">Monitor Economic Indicators</div>
                        <div className="text-gray-300 text-xs">Watch inflation, unemployment, and GDP growth to adjust your portfolio allocation.</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <span className="text-yellow-400 font-bold">3.</span>
                      <div>
                        <div className="text-white font-semibold text-sm">Rebalance Regularly</div>
                        <div className="text-gray-300 text-xs">Review and rebalance your portfolio quarterly based on performance.</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-purple-400 font-bold">4.</span>
                      <div>
                        <div className="text-white font-semibold text-sm">Start Small, Scale Smart</div>
                        <div className="text-gray-300 text-xs">Begin with smaller positions and increase allocation as you gain confidence.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg p-6 mb-8">
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Loading economic portfolios with real market data...</p>
              </div>
            </div>
          )}
        </div>
        </>
      ) : selectedView === 'news' ? (
        <>
        {/* News Section */}
        <div className="max-w-7xl mx-auto px-3 pb-8">
          <h2 className="text-xl font-bold text-white mb-4 mt-8">Latest Market News</h2>
          <div className="bg-slate-800 rounded-lg p-6">
            {newsData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {newsData.slice(0, 9).map((article, index) => (
                  <div key={article.id || index} className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-xs text-gray-400">
                        {article.source}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(article.publishedDate).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <h3 className="text-sm font-medium text-white mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    
                    <p className="text-xs text-gray-300 mb-3 line-clamp-3">
                      {article.description}
                    </p>
                    
                    {article.tickers && article.tickers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {article.tickers.slice(0, 3).map((ticker: string, i: number) => (
                          <span key={i} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                            {ticker}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {article.url && article.url !== '#' && (
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Read more ÔåÆ
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">Loading news...</p>
              </div>
            )}
          </div>
        </div>
        </>
      ) : selectedView === 'fedwatch' ? (
        <>
        {/* FedWatch Section */}
        <div className="max-w-7xl mx-auto px-3 pb-8">
          <h2 className="text-xl font-bold text-white mb-4 mt-8">­ƒÅª US FedWatch - Rate Probability Analysis</h2>
          
          {fedWatchData ? (
            <div className="space-y-6">
              {/* Header Overview */}
              <div className="bg-slate-800 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">{fedWatchData.currentRate}%</div>
                    <div className="text-gray-400 text-sm">Current Fed Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-medium text-blue-400 mb-2">{fedWatchData.nextMeeting}</div>
                    <div className="text-gray-400 text-sm">Next FOMC Meeting</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-2 ${
                      fedWatchData.aiAnalysis.recommendation === 'CUT' ? 'text-green-400' :
                      fedWatchData.aiAnalysis.recommendation === 'HIKE' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {fedWatchData.aiAnalysis.recommendation}
                    </div>
                    <div className="text-gray-400 text-sm">AI Prediction</div>
                    <div className="text-xs text-gray-500 mt-1">{fedWatchData.aiAnalysis.confidence}% confidence</div>
                  </div>
                </div>
              </div>

              {/* Probability Chart */}
              <div className="bg-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Rate Change Probabilities</h3>
                <div className="space-y-3">
                  {Object.entries(fedWatchData.probabilities).map(([key, probability]) => {
                    const typedProbability = probability as number;
                    const label = {
                      cut75: '-0.75%',
                      cut50: '-0.50%',
                      cut25: '-0.25%',
                      hold: 'Hold',
                      hike25: '+0.25%',
                      hike50: '+0.50%',
                      hike75: '+0.75%'
                    }[key];
                    
                    const color = key.includes('cut') ? 'bg-green-500' : 
                                 key.includes('hike') ? 'bg-red-500' : 'bg-yellow-500';
                    
                    return (
                      <div key={key} className="flex items-center">
                        <div className="w-16 text-sm text-gray-400">{label}</div>
                        <div className="flex-1 bg-gray-700 rounded-full h-4 relative overflow-hidden mx-3">
                          <div 
                            className={`h-full ${color} rounded-full transition-all duration-1000`}
                            style={{ width: `${typedProbability}%` }}
                          ></div>
                          <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                            {typedProbability}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Analysis */}
              <div className="bg-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">AI Market Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-gray-300 text-sm mb-3">Fed Decision Reasoning</div>
                    <div className="text-gray-400 text-sm leading-relaxed mb-4">
                      {fedWatchData.aiAnalysis.reasoning}
                    </div>
                    <div className="text-gray-300 text-sm mb-2">Market Impact</div>
                    <div className="text-gray-400 text-sm">
                      {fedWatchData.aiAnalysis.marketImpact}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-gray-300 text-sm mb-3">Sector Impact</div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-green-400 text-xs font-medium mb-1">Positive Sectors</div>
                        <div className="flex flex-wrap gap-1">
                          {fedWatchData.aiAnalysis.sectors.positive.map((sector: string, i: number) => (
                            <span key={i} className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                              {sector}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-red-400 text-xs font-medium mb-1">Negative Sectors</div>
                        <div className="flex flex-wrap gap-1">
                          {fedWatchData.aiAnalysis.sectors.negative.map((sector: string, i: number) => (
                            <span key={i} className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                              {sector}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Economic Indicators */}
              <div className="bg-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Economic Indicators</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">{fedWatchData.economicIndicators.inflation}%</div>
                    <div className="text-gray-400 text-sm">Inflation</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">{fedWatchData.economicIndicators.unemployment}%</div>
                    <div className="text-gray-400 text-sm">Unemployment</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">{fedWatchData.economicIndicators.gdpGrowth}%</div>
                    <div className="text-gray-400 text-sm">GDP Growth</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">{fedWatchData.economicIndicators.cpi}%</div>
                    <div className="text-gray-400 text-sm">CPI</div>
                  </div>
                </div>
              </div>

              {/* Market Reaction */}
              <div className="bg-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Market Reaction</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white mb-1">{fedWatchData.marketReaction.dollarIndex.toFixed(1)}</div>
                    <div className="text-gray-400 text-sm">Dollar Index</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white mb-1">{fedWatchData.marketReaction.treasuryYield10y.toFixed(2)}%</div>
                    <div className="text-gray-400 text-sm">10Y Treasury</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold mb-1 ${
                      fedWatchData.marketReaction.sp500Impact === 'Positive' ? 'text-green-400' :
                      fedWatchData.marketReaction.sp500Impact === 'Negative' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {fedWatchData.marketReaction.sp500Impact}
                    </div>
                    <div className="text-gray-400 text-sm">S&P 500 Impact</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white mb-1">{fedWatchData.marketReaction.volatility}</div>
                    <div className="text-gray-400 text-sm">VIX Level</div>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-gray-500">
                Last updated: {new Date(fedWatchData.lastUpdated).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="text-center py-8">
                <p className="text-gray-400">Loading FedWatch data...</p>
              </div>
            </div>
          )}
        </div>
        </>
      ) : selectedView === 'spx' ? (
        <>
        {/* S&P 500 P/E Analysis Section */}
        <div className="max-w-7xl mx-auto px-3 pb-8">
          <h2 className="text-xl font-bold text-white mb-4 mt-8">­ƒôè S&P 500 P/E Valuation Analysis</h2>
          
          {spxValuation ? (
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Current P/E */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">{spxValuation.current}</div>
                  <div className="text-gray-400 text-sm">Current P/E</div>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                    spxValuation.color === 'green' ? 'bg-green-500/20 text-green-400' :
                    spxValuation.color === 'red' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {spxValuation.signal}
                  </div>
                </div>

                {/* 12 Month Average */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-2">{spxValuation.historical.trailing12Months}</div>
                  <div className="text-gray-400 text-sm">12M Avg</div>
                  <div className={`text-xs mt-1 ${
                    parseFloat(spxValuation.deviations.vs12M) > 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {parseFloat(spxValuation.deviations.vs12M) > 0 ? '+' : ''}{spxValuation.deviations.vs12M}%
                  </div>
                </div>

                {/* Historical Benchmarks */}
                <div className="space-y-3">
                  <div className="text-gray-300 text-sm mb-3">Historical Benchmarks</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">5 Years</span>
                      <div className="text-right">
                        <div className="text-white font-medium">{spxValuation.historical.trailing5Years}</div>
                        <div className={`text-xs ${
                          parseFloat(spxValuation.deviations.vs5Y) > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {parseFloat(spxValuation.deviations.vs5Y) > 0 ? '+' : ''}{spxValuation.deviations.vs5Y}%
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">10 Years</span>
                      <div className="text-right">
                        <div className="text-white font-medium">{spxValuation.historical.trailing10Years}</div>
                        <div className={`text-xs ${
                          parseFloat(spxValuation.deviations.vs10Y) > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {parseFloat(spxValuation.deviations.vs10Y) > 0 ? '+' : ''}{spxValuation.deviations.vs10Y}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Market Context */}
                <div>
                  <div className="text-gray-300 text-sm mb-3">Market Context</div>
                  <div className="space-y-2">
                    <div className={`px-3 py-2 rounded-lg text-center ${
                      spxValuation.marketContext.includes('Bull') ? 'bg-green-500/20 text-green-400' :
                      spxValuation.marketContext.includes('Bear') || spxValuation.marketContext.includes('Recession') ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {spxValuation.marketContext}
                    </div>
                    <div className="text-center">
                      <div className="text-white font-medium">{spxValuation.percentile}th</div>
                      <div className="text-gray-400 text-xs">Percentile</div>
                    </div>
                  </div>
                </div>

                {/* Visual Comparison Chart */}
                <div>
                  <div className="text-gray-300 text-sm mb-3">Visual Comparison</div>
                  <div className="space-y-2">
                    {/* Current P/E */}
                    <div className="flex items-center">
                      <div className="w-16 text-xs text-gray-400">Current</div>
                      <div className="flex-1 bg-gray-700 rounded h-4 relative overflow-hidden">
                        <div 
                          className="h-full bg-red-500 rounded transition-all duration-1000"
                          style={{ width: `${Math.min((spxValuation.current / 35) * 100, 100)}%` }}
                        ></div>
                        <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">
                          {spxValuation.current}
                        </span>
                      </div>
                    </div>

                    {/* 12 Months */}
                    <div className="flex items-center">
                      <div className="w-16 text-xs text-gray-400">12M Avg</div>
                      <div className="flex-1 bg-gray-700 rounded h-3 relative overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded transition-all duration-1000"
                          style={{ width: `${Math.min((spxValuation.historical.trailing12Months / 35) * 100, 100)}%` }}
                        ></div>
                        <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                          {spxValuation.historical.trailing12Months}
                        </span>
                      </div>
                    </div>

                    {/* 5 Years */}
                    <div className="flex items-center">
                      <div className="w-16 text-xs text-gray-400">5Y Avg</div>
                      <div className="flex-1 bg-gray-700 rounded h-3 relative overflow-hidden">
                        <div 
                          className="h-full bg-blue-400 rounded transition-all duration-1000"
                          style={{ width: `${Math.min((spxValuation.historical.trailing5Years / 35) * 100, 100)}%` }}
                        ></div>
                        <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                          {spxValuation.historical.trailing5Years}
                        </span>
                      </div>
                    </div>

                    {/* 10 Years */}
                    <div className="flex items-center">
                      <div className="w-16 text-xs text-gray-400">10Y Avg</div>
                      <div className="flex-1 bg-gray-700 rounded h-3 relative overflow-hidden">
                        <div 
                          className="h-full bg-blue-300 rounded transition-all duration-1000"
                          style={{ width: `${Math.min((spxValuation.historical.trailing10Years / 35) * 100, 100)}%` }}
                        ></div>
                        <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                          {spxValuation.historical.trailing10Years}
                        </span>
                      </div>
                    </div>

                    {/* Historical Average */}
                    <div className="flex items-center">
                      <div className="w-16 text-xs text-gray-400">Hist. Avg</div>
                      <div className="flex-1 bg-gray-700 rounded h-3 relative overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded transition-all duration-1000"
                          style={{ width: `${Math.min((spxValuation.historical.historicalAverage / 35) * 100, 100)}%` }}
                        ></div>
                        <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                          {spxValuation.historical.historicalAverage}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Analysis Section */}
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Analysis Text */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-3">Market Analysis</h3>
                    <div className="text-gray-400 text-sm leading-relaxed">
                      {spxValuation.explanation}
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      <strong>vs Long-term Average:</strong> {parseFloat(spxValuation.deviations.vsHistorical) > 0 ? '+' : ''}{spxValuation.deviations.vsHistorical}%
                    </div>
                  </div>

                  {/* Additional Metrics */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-3">Key Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-600">
                        <span className="text-gray-400">Historical Percentile</span>
                        <span className="text-white font-medium">{spxValuation.percentile}th</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-600">
                        <span className="text-gray-400">Market Context</span>
                        <span className={`font-medium ${
                          spxValuation.marketContext.includes('Bull') ? 'text-green-400' :
                          spxValuation.marketContext.includes('Bear') ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {spxValuation.marketContext}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-600">
                        <span className="text-gray-400">Investment Signal</span>
                        <span className={`font-medium ${
                          spxValuation.color === 'green' ? 'text-green-400' :
                          spxValuation.color === 'red' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {spxValuation.signal}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Chart */}
              <div className="mt-6 pt-6 border-t border-slate-700">
                <SPXChart />
              </div>

              <div className="text-center text-xs text-gray-500 mt-6">
                Last updated: {new Date().toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="text-center py-8">
                <p className="text-gray-400">Loading S&P 500 P/E analysis...</p>
              </div>
            </div>
          )}
        </div>
        </>
      ) : selectedView === 'portfolios' ? (
        <>
        {/* Economic Portfolios Section */}
        <div className="max-w-7xl mx-auto px-3 pb-8">
          <h2 className="text-xl font-bold text-white mb-4 mt-8">­ƒôè Economic Regime Portfolios</h2>
          
          {economicPortfolios ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Object.entries(economicPortfolios).map(([regime, portfolio]: [string, any]) => (
                <div key={regime} className="bg-slate-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4 capitalize">{regime.replace(/([A-Z])/g, ' $1').trim()}</h3>
                  <div className="space-y-3">
                    {portfolio.assets?.map((asset: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm">{asset.symbol}</span>
                        <span className="text-white font-medium">{asset.allocation}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="text-xs text-gray-400 mb-1">Expected Return</div>
                    <div className="text-white font-bold">{portfolio?.expectedReturn || 0}%</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg p-6 mb-8">
              <div className="text-center py-8">
                <p className="text-gray-400">Loading economic portfolios...</p>
              </div>
            </div>
          )}

          {/* S&P 500 P/E Valuation Analysis - Only in Portfolios section */}
          {spxValuation && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4 mt-8">S&P 500 P/E Valuation Analysis</h2>
              <div className="bg-slate-800 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  {/* Current P/E */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">{spxValuation.current}</div>
                    <div className="text-gray-400 text-sm">Current P/E</div>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                      spxValuation.color === 'green' ? 'bg-green-500/20 text-green-400' :
                      spxValuation.color === 'red' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {spxValuation.signal}
                    </div>
                  </div>

                  {/* 12 Month Average */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">{spxValuation.historical.trailing12Months}</div>
                    <div className="text-gray-400 text-sm">12M Avg</div>
                    <div className={`text-xs mt-1 ${
                      parseFloat(spxValuation.deviations.vs12M) > 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {parseFloat(spxValuation.deviations.vs12M) > 0 ? '+' : ''}{spxValuation.deviations.vs12M}%
                    </div>
                  </div>

                  {/* Historical Benchmarks */}
                  <div className="space-y-3">
                    <div className="text-gray-300 text-sm mb-3">Historical Benchmarks</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">5 Years</span>
                        <div className="text-right">
                          <div className="text-white font-medium">{spxValuation.historical.trailing5Years}</div>
                          <div className={`text-xs ${
                            parseFloat(spxValuation.deviations.vs5Y) > 0 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {parseFloat(spxValuation.deviations.vs5Y) > 0 ? '+' : ''}{spxValuation.deviations.vs5Y}%
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">10 Years</span>
                        <div className="text-right">
                          <div className="text-white font-medium">{spxValuation.historical.trailing10Years}</div>
                          <div className={`text-xs ${
                            parseFloat(spxValuation.deviations.vs10Y) > 0 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {parseFloat(spxValuation.deviations.vs10Y) > 0 ? '+' : ''}{spxValuation.deviations.vs10Y}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Market Context */}
                  <div>
                    <div className="text-gray-300 text-sm mb-3">Market Context</div>
                    <div className="space-y-2">
                      <div className={`px-3 py-2 rounded-lg text-center ${
                        spxValuation.marketContext.includes('Bull') ? 'bg-green-500/20 text-green-400' :
                        spxValuation.marketContext.includes('Bear') || spxValuation.marketContext.includes('Recession') ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {spxValuation.marketContext}
                      </div>
                      <div className="text-center">
                        <div className="text-white font-medium">{spxValuation.percentile}th</div>
                        <div className="text-gray-400 text-xs">Percentile</div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Comparison Chart */}
                  <div>
                    <div className="text-gray-300 text-sm mb-3">Visual Comparison</div>
                    <div className="space-y-2">
                      {/* Current P/E */}
                      <div className="flex items-center">
                        <div className="w-16 text-xs text-gray-400">Current</div>
                        <div className="flex-1 bg-gray-700 rounded h-4 relative overflow-hidden">
                          <div 
                            className="h-full bg-red-500 rounded transition-all duration-1000"
                            style={{ width: `${Math.min((spxValuation.current / 35) * 100, 100)}%` }}
                          ></div>
                          <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">
                            {spxValuation.current}
                          </span>
                        </div>
                      </div>

                      {/* 12 Months */}
                      <div className="flex items-center">
                        <div className="w-16 text-xs text-gray-400">12M Avg</div>
                        <div className="flex-1 bg-gray-700 rounded h-3 relative overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded transition-all duration-1000"
                            style={{ width: `${Math.min((spxValuation.historical.trailing12Months / 35) * 100, 100)}%` }}
                          ></div>
                          <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                            {spxValuation.historical.trailing12Months}
                          </span>
                        </div>
                      </div>

                      {/* 5 Years */}
                      <div className="flex items-center">
                        <div className="w-16 text-xs text-gray-400">5Y Avg</div>
                        <div className="flex-1 bg-gray-700 rounded h-3 relative overflow-hidden">
                          <div 
                            className="h-full bg-blue-400 rounded transition-all duration-1000"
                            style={{ width: `${Math.min((spxValuation.historical.trailing5Years / 35) * 100, 100)}%` }}
                          ></div>
                          <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                            {spxValuation.historical.trailing5Years}
                          </span>
                        </div>
                      </div>

                      {/* 10 Years */}
                      <div className="flex items-center">
                        <div className="w-16 text-xs text-gray-400">10Y Avg</div>
                        <div className="flex-1 bg-gray-700 rounded h-3 relative overflow-hidden">
                          <div 
                            className="h-full bg-blue-300 rounded transition-all duration-1000"
                            style={{ width: `${Math.min((spxValuation.historical.trailing10Years / 35) * 100, 100)}%` }}
                          ></div>
                          <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                            {spxValuation.historical.trailing10Years}
                          </span>
                        </div>
                      </div>

                      {/* Historical Average */}
                      <div className="flex items-center">
                        <div className="w-16 text-xs text-gray-400">Hist. Avg</div>
                        <div className="flex-1 bg-gray-700 rounded h-3 relative overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded transition-all duration-1000"
                            style={{ width: `${Math.min((spxValuation.historical.historicalAverage / 35) * 100, 100)}%` }}
                          ></div>
                          <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                            {spxValuation.historical.historicalAverage}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <div className="text-gray-300 text-sm mb-3">Analysis</div>
                    <div className="text-gray-400 text-sm leading-relaxed">
                      {spxValuation.explanation}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      vs Long-term Avg: {parseFloat(spxValuation.deviations.vsHistorical) > 0 ? '+' : ''}{spxValuation.deviations.vsHistorical}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </>
      ) : selectedView === 'calendar' ? (
        <>
        {/* Economic Calendar Section */}
        <div className="max-w-7xl mx-auto px-3 pb-8">
          <h2 className="text-xl font-bold text-white mb-6 mt-8">­ƒôà Economic Calendar</h2>
          
          <div className="bg-slate-800 rounded-lg p-6">
            {economicEvents.length > 0 ? (
              <div className="space-y-4">
                {/* Group events by date */}
                {Object.entries(
                  economicEvents.reduce((acc: any, event: any) => {
                    const dateKey = event.date.toDateString();
                    if (!acc[dateKey]) acc[dateKey] = [];
                    acc[dateKey].push(event);
                    return acc;
                  }, {})
                ).map(([dateKey, dayEvents]: [string, any]) => (
                  <div key={dateKey} className="border-b border-slate-700 pb-4 last:border-b-0">
                    {/* Date Header */}
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold text-white">
                        {new Date(dateKey).toLocaleDateString('en-US', { 
                          weekday: 'long',
                          month: 'long', 
                          day: 'numeric'
                        })}
                      </h3>
                    </div>
                    
                    {/* Events for this date */}
                    <div className="space-y-2">
                      {(dayEvents as any[]).map((event: any) => (
                        <div key={event.id} className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {/* Time */}
                              <div className="text-xs text-gray-400 font-mono bg-slate-600 px-2 py-1 rounded">
                                {event.time}
                              </div>
                              
                              {/* Country Flag */}
                              <div className="text-lg">
                                {event.flag}
                              </div>
                              
                              {/* Event Details */}
                              <div className="flex-1">
                                <div className="text-sm font-medium text-white">
                                  {event.event}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {event.country} ÔÇó {event.currency}
                                </div>
                              </div>
                            </div>
                            
                            {/* Importance Badge */}
                            <div className="flex items-center space-x-3">
                              <div className={`px-2 py-1 rounded text-xs font-medium ${
                                event.importance === 'high' 
                                  ? 'bg-red-500/20 text-red-400' 
                                  : event.importance === 'medium'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {event.importance.toUpperCase()}
                              </div>
                            </div>
                          </div>
                          
                          {/* Data Values */}
                          <div className="mt-3 grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-xs text-gray-400">Actual</div>
                              <div className="text-sm font-medium text-white">
                                {event.actual || '-'}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-400">Forecast</div>
                              <div className="text-sm font-medium text-white">
                                {event.forecast || '-'}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-400">Previous</div>
                              <div className="text-sm font-medium text-white">
                                {event.previous || '-'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">Loading economic calendar...</p>
              </div>
            )}
            
            {/* Footer note */}
            <div className="text-center text-xs text-gray-500 mt-6 pt-6 border-t border-slate-700">
              Times shown in EST ÔÇó Data provided for educational purposes
            </div>
          </div>
        </div>
        </>
      ) : selectedView === 'analysts' ? (
        <>
        {/* Top Wall Street Analysts Section */}
        <div className="max-w-7xl mx-auto px-3 pb-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">­ƒÅå Top Wall Street Analysts</h2>
            <p className="text-gray-300 text-sm mb-4">
              Discover the most accurate and influential analysts on Wall Street. Currently showing demo data - add your API key for live feeds.
            </p>
            
            {/* Data Source Indicator */}
            <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="text-blue-400 mt-1">­ƒôè</div>
                <div>
                  <h3 className="text-blue-300 font-semibold text-sm mb-2">
                    {analystsData?.source === 'live' ? 'Live Data Feed' : 
                     analystsData?.source === 'mock' ? 'Demo Data' : 'Loading...'}
                  </h3>
                  <p className="text-blue-200 text-xs leading-relaxed">
                    {analystsData?.source === 'live' ? 
                      `Real-time analyst data from ${analystsData?.apiProvider}. Updated: ${analystsData?.timestamp ? new Date(analystsData.timestamp).toLocaleString() : 'Loading...'}` :
                      analystsData?.source === 'mock' ?
                      'Demo data shown. Add FMP_API_KEY to your .env.local file for live analyst data from Financial Modeling Prep.' :
                      'Loading analyst data...'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Investment Research Disclaimer */}
            <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="text-amber-400 mt-1">ÔÜá´©Å</div>
                <div>
                  <h3 className="text-amber-300 font-semibold text-sm mb-2">Investment Research Disclaimer</h3>
                  <p className="text-amber-200 text-xs leading-relaxed">
                    These analyst ratings and recommendations are for informational purposes only. Past performance does not guarantee future results. 
                    <strong> Always conduct your own research</strong> and consider multiple sources before making investment decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {analystsLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-300">Loading live analyst data...</span>
            </div>
          ) : analystsData?.data ? (
            <>
          {/* Analyst Performance Leaderboard */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                ­ƒÄ» Analyst Performance Leaderboard
              </h3>
              <div className="flex items-center space-x-4">
                <button
                  onClick={fetchAnalystsData}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                >
                  ­ƒöä Refresh
                </button>
                <div className="text-xs text-gray-400">
                  {analystsData?.source === 'live' ? 'Live Data' : 'Demo Data'}
                </div>
              </div>
            </div>
            </div>

            {/* Top Analysts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analystsData?.data?.topAnalysts?.map((analyst: any, index: number) => (
                <div key={analyst.id || index} className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-6 border border-slate-600 hover:border-slate-500 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${index < 3 ? 'bg-yellow-400' : 'bg-blue-400'}`}></div>
                      <div className="text-sm font-bold text-gray-300">#{analyst.rank || (index + 1)}</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                      (analyst.accuracy || analyst.successRate || 0) >= 85 ? 'bg-green-500/20 text-green-300' :
                      (analyst.accuracy || analyst.successRate || 0) >= 75 ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {(analyst.accuracy || analyst.successRate || 0).toFixed(1)}% Success
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-white font-bold text-lg mb-1">{analyst.name || 'Unknown Analyst'}</h4>
                    <p className="text-blue-300 font-semibold text-sm mb-2">{analyst.firm || 'Unknown Firm'}</p>
                    <p className="text-gray-400 text-xs">{analyst.sector || analyst.specialty || 'Multi-Sector'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Avg Return</div>
                      <div className="text-green-400 font-bold text-sm">
                        {analyst.avgReturn ? `${analyst.avgReturn}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Total Calls</div>
                      <div className="text-white font-bold text-sm">{analyst.totalCalls || analyst.calls || 'N/A'}</div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-2">Recent Performance</div>
                    <div className="text-sm text-gray-300">
                      {analyst.recentPerformance || analyst.recentCall || 'No recent data'}
                    </div>
                  </div>
                  
                  {analyst.recentCalls && analyst.recentCalls.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-400 mb-2">Recent Calls</div>
                      <div className="space-y-1">
                        {analyst.recentCalls.slice(0, 2).map((call: any, callIndex: number) => (
                          <div key={callIndex} className="text-xs bg-slate-900 rounded p-2">
                            <span className="text-blue-300 font-bold">{call.symbol}</span>
                            <span className="text-gray-300 ml-2">{call.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t border-slate-600 pt-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Followers: {analyst.followers || 'N/A'}</span>
                      <span className="text-gray-400">Rank: #{analyst.rank || (index + 1)}</span>
                    </div>
                  </div>
                </div>
              )) || (
                // Fallback if no data available
                Array.from({length: 6}).map((_, index) => (
                  <div key={index} className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-6 border border-slate-600 animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-4 bg-slate-600 rounded w-1/3"></div>
                      <div className="h-6 bg-slate-600 rounded w-16"></div>
                    </div>
                    <div className="h-6 bg-slate-600 rounded mb-2"></div>
                    <div className="h-4 bg-slate-600 rounded w-2/3 mb-4"></div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="h-8 bg-slate-600 rounded"></div>
                      <div className="h-8 bg-slate-600 rounded"></div>
                    </div>
                  </div>
                ))
              )}
                  reputation: "Crypto & Growth Bull",
                  ranking: 4,
                  followers: "1.3M",
                  color: "from-blue-500 to-blue-700"
                },
                {
                  name: "Katie Stockton",
                  firm: "Fairlead Strategies",
                  specialty: "Technical Analysis",
                  successRate: 79.8,
                  avgReturn: "+15.1%",
                  topPicks: ["GLD", "SPY", "TLT"],
                  recentCall: "Gold Breakout Above $2,100",
                  reputation: "Technical Expert",
                  ranking: 5,
                  followers: "1.1M",
                  color: "from-purple-500 to-purple-700"
                },
                {
                  name: "Michael Wilson",
                  firm: "Morgan Stanley",
                  specialty: "Market Strategy",
                  successRate: 78.6,
                  avgReturn: "+13.8%",
                  topPicks: ["UTILITIES", "STAPLES", "BONDS"],
                  recentCall: "Defensive Positioning Recommended",
                  reputation: "Bear Market Caller",
                  ranking: 6,
                  followers: "980K",
                  color: "from-indigo-500 to-indigo-700"
                }
              ].map((analyst, index) => (
                <div key={analyst.name} className={`bg-slate-800 rounded-xl p-6 border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] relative ${
                  index === 0 ? 'border-yellow-500/30 bg-gradient-to-br from-slate-800 to-yellow-900/10' :
                  index === 1 ? 'border-gray-400/30 bg-gradient-to-br from-slate-800 to-gray-900/10' :
                  index === 2 ? 'border-orange-500/30 bg-gradient-to-br from-slate-800 to-orange-900/10' :
                  'border-slate-600/30'
                }`}>
                  
                  {/* Ranking Badge */}
                  <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg bg-gradient-to-r ${analyst.color}`}>
                    #{analyst.ranking}
                  </div>

                  {/* Analyst Info */}
                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-white mb-1">{analyst.name}</h4>
                    <p className="text-blue-400 text-sm font-medium mb-1">{analyst.firm}</p>
                    <p className="text-gray-300 text-sm">{analyst.specialty} Specialist</p>
                    <p className="text-gray-400 text-xs mt-1">­ƒæÑ {analyst.followers} followers</p>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-green-400">{analyst.successRate}%</div>
                      <div className="text-xs text-gray-400">Success Rate</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-blue-400">{analyst.avgReturn}</div>
                      <div className="text-xs text-gray-400">Avg Return</div>
                    </div>
                  </div>

                  {/* Top Picks */}
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-gray-300 mb-2">Current Top Picks</div>
                    <div className="flex flex-wrap gap-2">
                      {analyst.topPicks.map((pick, idx) => (
                        <span key={idx} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded font-medium">
                          {pick}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recent Call */}
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-gray-300 mb-2">Recent Notable Call</div>
                    <div className="text-xs text-gray-400 leading-relaxed bg-slate-900/50 p-3 rounded-lg">
                      {analyst.recentCall}
                    </div>
                  </div>

                  {/* Reputation Badge */}
                  <div className={`p-3 rounded-lg border-l-4 text-center ${
                    analyst.successRate > 85 ? 'bg-green-900/20 border-green-500 text-green-200' :
                    analyst.successRate > 80 ? 'bg-blue-900/20 border-blue-500 text-blue-200' :
                    'bg-yellow-900/20 border-yellow-500 text-yellow-200'
                  }`}>
                    <div className="text-sm font-semibold">{analyst.reputation}</div>
                    <div className="text-xs opacity-80">
                      {analyst.successRate > 85 ? '­ƒÅå Elite Performance' :
                       analyst.successRate > 80 ? '­ƒîƒ Top Tier' :
                       '­ƒôê Consistent'} 
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Analyst Calls & Ratings */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
            <h3 className="text-xl font-bold text-white mb-6">­ƒöÑ Recent Analyst Calls & Price Targets</h3>
            
            <div className="space-y-4">
              {[
                {
                  analyst: "Dan Ives",
                  firm: "Wedbush",
                  stock: "NVDA",
                  action: "Raised PT",
                  oldPT: "$140",
                  newPT: "$180",
                  rating: "OUTPERFORM",
                  date: "2 hours ago",
                  impact: "+3.2%",
                  reasoning: "AI demand acceleration continues, datacenter buildout robust"
                },
                {
                  analyst: "Katy Huberty",
                  firm: "Morgan Stanley",
                  stock: "AAPL",
                  action: "Maintained",
                  oldPT: "$250",
                  newPT: "$250",
                  rating: "OVERWEIGHT",
                  date: "5 hours ago",
                  impact: "+1.1%",
                  reasoning: "Services revenue growth trajectory remains intact"
                },
                {
                  analyst: "Brian Belski",
                  firm: "BMO Capital",
                  stock: "SPY",
                  action: "Year-End Target",
                  oldPT: "N/A",
                  newPT: "$610",
                  rating: "OUTPERFORM",
                  date: "1 day ago",
                  impact: "+0.8%",
                  reasoning: "Economic resilience supports equity markets"
                },
                {
                  analyst: "Tom Lee",
                  firm: "Fundstrat",
                  stock: "COIN",
                  action: "Initiated",
                  oldPT: "N/A",
                  newPT: "$300",
                  rating: "BUY",
                  date: "1 day ago",
                  impact: "+5.7%",
                  reasoning: "Bitcoin ETF flows driving structural growth"
                },
                {
                  analyst: "Katie Stockton",
                  firm: "Fairlead",
                  stock: "GLD",
                  action: "Technical Buy",
                  oldPT: "$200",
                  newPT: "$220",
                  rating: "BUY",
                  date: "2 days ago",
                  impact: "+1.9%",
                  reasoning: "Golden cross pattern confirmed, momentum positive"
                }
              ].map((call, index) => (
                <div key={index} className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700/70 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-bold text-lg">{call.stock}</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          call.rating.includes('BUY') || call.rating.includes('OUTPERFORM') || call.rating.includes('OVERWEIGHT') 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {call.rating}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {call.analyst} ÔÇó {call.firm}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-white font-bold">{call.newPT}</div>
                        <div className="text-xs text-gray-400">{call.action}</div>
                      </div>
                      <div className={`text-sm font-bold ${
                        call.impact.startsWith('+') ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {call.impact}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-300 mb-2">
                    <strong>Reasoning:</strong> {call.reasoning}
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <div>{call.date}</div>
                    <div>
                      {call.oldPT !== "N/A" && call.oldPT !== call.newPT && (
                        <span>PT: {call.oldPT} ÔåÆ {call.newPT}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analyst Tracking & Methodology */}
          <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              ­ƒôè How We Track Analyst Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 font-bold text-lg">Ô£ô</span>
                  <div>
                    <div className="text-white font-semibold text-sm">Price Target Accuracy</div>
                    <div className="text-gray-300 text-xs">Measured over 12-month periods with time-weighted returns</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-400 font-bold text-lg">­ƒôê</span>
                  <div>
                    <div className="text-white font-semibold text-sm">Timing of Calls</div>
                    <div className="text-gray-300 text-xs">Early calls receive higher weighting in performance calculations</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-yellow-400 font-bold text-lg">­ƒÄ»</span>
                  <div>
                    <div className="text-white font-semibold text-sm">Consistency Score</div>
                    <div className="text-gray-300 text-xs">Regular outperformance weighted more than sporadic big wins</div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <span className="text-purple-400 font-bold text-lg">­ƒôè</span>
                  <div>
                    <div className="text-white font-semibold text-sm">Risk-Adjusted Returns</div>
                    <div className="text-gray-300 text-xs">Volatility and downside protection factored into rankings</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-indigo-400 font-bold text-lg">­ƒÅå</span>
                  <div>
                    <div className="text-white font-semibold text-sm">Market Impact</div>
                    <div className="text-gray-300 text-xs">Stock price movement following analyst upgrades/downgrades</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-pink-400 font-bold text-lg">­ƒô▒</span>
                  <div>
                    <div className="text-white font-semibold text-sm">Social Influence</div>
                    <div className="text-gray-300 text-xs">Media mentions, social following, and institutional adoption</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
      ) : selectedView === 'markets' ? (
        <>
        {/* Markets Overview Section */}
        <div className="max-w-7xl mx-auto px-3 pb-8">
          <h2 className="text-xl font-bold text-white mb-6 mt-8">­ƒôê Markets Overview</h2>
          
          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{summary.avgPerformance}</div>
                <div className="text-gray-400 text-sm">Avg Performance</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{summary.totalVolume}</div>
                <div className="text-gray-400 text-sm">Total Volume</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">{summary.bullishCount}</div>
                <div className="text-gray-400 text-sm">Bullish</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-400">{summary.bearishCount}</div>
                <div className="text-gray-400 text-sm">Bearish</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Search Ticker
                </label>
                <input
                  type="text"
                  placeholder="Search by ticker..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Sector
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Sectors</option>
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Financial">Financial</option>
                  <option value="Consumer">Consumer</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Energy">Energy</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Materials">Materials</option>
                  <option value="Real Estate">Real Estate</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Market
                </label>
                <select
                  value={selectedMarket}
                  onChange={(e) => setSelectedMarket(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Markets</option>
                  <option value="US">US Markets</option>
                  <option value="International">International</option>
                  <option value="Crypto">Crypto</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stock Data Table */}
          <div className="bg-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Ticker</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Change</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Volume</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Trend</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Sentiment</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Filter data based on current selections
                    let filteredData = data;
                    
                    if (searchTerm) {
                      filteredData = filteredData.filter(stock => 
                        stock.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        stock.name.toLowerCase().includes(searchTerm.toLowerCase())
                      );
                    }
                    
                    if (selectedSector !== 'All') {
                      filteredData = filteredData.filter(stock => stock.sector === selectedSector);
                    }

                    return filteredData.length > 0 ? (
                      filteredData.map((stock, index) => (
                        <tr key={stock.ticker} className="border-b border-slate-700 hover:bg-slate-700 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <div className="font-medium text-white">{stock.ticker}</div>
                              <div className="text-xs text-gray-400">{stock.name}</div>
                              {stock.direction && (
                                <span className={`text-xs ${
                                  stock.direction === 'Ôåù' ? 'text-green-400' :
                                  stock.direction === 'Ôåÿ' ? 'text-red-400' :
                                  'text-yellow-400'
                                }`}>
                                  {stock.direction}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-white font-medium">{stock.price || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`font-medium ${
                              stock.change && parseFloat(stock.change.replace('%', '')) > 0 
                                ? 'text-green-400' 
                                : 'text-red-400'
                            }`}>
                              {stock.change || stock.performance}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-white">{stock.volume || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              stock.trend.toLowerCase().includes('bull') || stock.trend.toLowerCase().includes('up')
                                ? 'bg-green-500/20 text-green-400'
                                : stock.trend.toLowerCase().includes('bear') || stock.trend.toLowerCase().includes('down')
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {stock.trend}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              stock.optionsSentiment.toLowerCase().includes('bull') || stock.optionsSentiment.toLowerCase().includes('positive')
                                ? 'bg-green-500/20 text-green-400'
                                : stock.optionsSentiment.toLowerCase().includes('bear') || stock.optionsSentiment.toLowerCase().includes('negative')
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {stock.optionsSentiment}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                          {loading ? 'Loading market data...' : 'No data matching your filters'}
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Economic Portfolios Overview - In Markets View */}
          {economicPortfolios && Object.keys(economicPortfolios).length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">­ƒôè Economic Regime Portfolios</h2>
                <button
                  onClick={() => setSelectedView('portfolios')}
                  className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                >
                  View Full Analysis ÔåÆ
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(economicPortfolios)
                  .sort(([, a]: [string, any], [, b]: [string, any]) => parseFloat(b.avgPerformance) - parseFloat(a.avgPerformance))
                  .slice(0, 3) // Show only top 3 in markets view
                  .map(([key, portfolio]: [string, any], index: number) => (
                    <div key={key} className={`bg-slate-800 rounded-lg p-4 border-l-4 ${
                      index === 0 ? 'border-green-500' :
                      index === 1 ? 'border-yellow-500' :
                      'border-blue-500'
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-white">{portfolio?.name || 'Unknown Portfolio'}</h3>
                        <span className={`text-sm font-bold ${
                          parseFloat(portfolio?.avgPerformance || 0) > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {parseFloat(portfolio?.avgPerformance || 0) > 0 ? '+' : ''}{portfolio?.avgPerformance || '0.00%'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">{portfolio?.description || 'Portfolio description not available'}</p>
                      
                      {/* Multi-timeframe performance summary */}
                      {portfolio.avgPerformances && (
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-center bg-slate-700/50 rounded p-1">
                            <div className="text-[10px] text-gray-400">1W</div>
                            <div className={`text-xs font-semibold ${
                              portfolio.avgPerformances.weekly > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {portfolio.avgPerformances.weekly > 0 ? '+' : ''}{portfolio.avgPerformances.weekly.toFixed(1)}%
                            </div>
                          </div>
                          <div className="text-center bg-slate-700/50 rounded p-1">
                            <div className="text-[10px] text-gray-400">1M</div>
                            <div className={`text-xs font-semibold ${
                              portfolio.avgPerformances.monthly > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {portfolio.avgPerformances.monthly > 0 ? '+' : ''}{portfolio.avgPerformances.monthly.toFixed(1)}%
                            </div>
                          </div>
                          <div className="text-center bg-slate-700/50 rounded p-1">
                            <div className="text-[10px] text-gray-400">1Y</div>
                            <div className={`text-xs font-semibold ${
                              portfolio.avgPerformances.yearly > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {portfolio.avgPerformances.yearly > 0 ? '+' : ''}{portfolio.avgPerformances.yearly.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Investment Signal */}
                      <div className={`text-center py-2 rounded text-xs font-semibold ${
                        parseFloat(portfolio.avgPerformance) > 1 ? 'bg-green-900/30 text-green-300' :
                        parseFloat(portfolio.avgPerformance) > 0 ? 'bg-blue-900/30 text-blue-300' :
                        parseFloat(portfolio.avgPerformance) > -1 ? 'bg-yellow-900/30 text-yellow-300' :
                        'bg-red-900/30 text-red-300'
                      }`}>
                        {parseFloat(portfolio.avgPerformance) > 1 ? '­ƒƒó Strong Buy' :
                         parseFloat(portfolio.avgPerformance) > 0 ? '­ƒöÁ Buy Signal' :
                         parseFloat(portfolio.avgPerformance) > -1 ? '­ƒƒí Hold' :
                         '­ƒö┤ Avoid/Reduce'}
                      </div>
                    </div>
                  ))}
              </div>
              
              <div className="text-center mt-4">
                <p className="text-xs text-gray-500">
                  Showing top 3 performing portfolios ÔÇó Real-time data
                </p>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-gray-500 mt-6">
            Last updated: {lastUpdated}
          </div>
        </div>
        </>
      ) : selectedView === 'spx' ? (
        <>
        {/* S&P 500 P/E Analysis Section */}
        <div className="max-w-7xl mx-auto px-3 pb-8">
          {spxValuation ? (
            <div>
              <h2 className="text-xl font-bold text-white mb-6 mt-8">­ƒôè S&P 500 P/E Valuation Analysis</h2>
              
              {/* Main P/E Section */}
              <div className="bg-slate-800 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  {/* Current P/E */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">{spxValuation.current}</div>
                    <div className="text-gray-400 text-sm">Current P/E</div>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                      spxValuation.color === 'green' ? 'bg-green-500/20 text-green-400' :
                      spxValuation.color === 'red' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {spxValuation.signal}
                    </div>
                  </div>

                  {/* 12 Month Average */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">{spxValuation.historical.trailing12Months}</div>
                    <div className="text-gray-400 text-sm">12M Avg</div>
                    <div className={`text-xs mt-1 ${
                      parseFloat(spxValuation.deviations.vs12M) > 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {parseFloat(spxValuation.deviations.vs12M) > 0 ? '+' : ''}{spxValuation.deviations.vs12M}%
                    </div>
                  </div>

                  {/* 5 Year Average */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">{spxValuation.historical.trailing5Years}</div>
                    <div className="text-gray-400 text-sm">5Y Avg</div>
                    <div className={`text-xs mt-1 ${
                      parseFloat(spxValuation.deviations.vs5Y) > 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {parseFloat(spxValuation.deviations.vs5Y) > 0 ? '+' : ''}{spxValuation.deviations.vs5Y}%
                    </div>
                  </div>

                  {/* 10 Year Average */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">{spxValuation.historical.trailing10Years}</div>
                    <div className="text-gray-400 text-sm">10Y Avg</div>
                    <div className={`text-xs mt-1 ${
                      parseFloat(spxValuation.deviations.vs10Y) > 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {parseFloat(spxValuation.deviations.vs10Y) > 0 ? '+' : ''}{spxValuation.deviations.vs10Y}%
                    </div>
                  </div>

                  {/* Historical Average */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">{spxValuation.historical.historicalAverage}</div>
                    <div className="text-gray-400 text-sm">Historical Avg</div>
                    <div className={`text-xs mt-1 ${
                      parseFloat(spxValuation.deviations.vsHistorical) > 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {parseFloat(spxValuation.deviations.vsHistorical) > 0 ? '+' : ''}{spxValuation.deviations.vsHistorical}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Analysis Section */}
              <div className="bg-slate-800 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Analysis Text */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-3">Market Analysis</h3>
                    <div className="text-gray-400 text-sm leading-relaxed">
                      {spxValuation.explanation}
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      <strong>vs Long-term Average:</strong> {parseFloat(spxValuation.deviations.vsHistorical) > 0 ? '+' : ''}{spxValuation.deviations.vsHistorical}%
                    </div>
                  </div>

                  {/* Additional Metrics */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-3">Key Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-600">
                        <span className="text-gray-400">Historical Percentile</span>
                        <span className="text-white font-medium">{spxValuation.percentile}th</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-600">
                        <span className="text-gray-400">Market Context</span>
                        <span className={`font-medium ${
                          spxValuation.marketContext.includes('Bull') ? 'text-green-400' :
                          spxValuation.marketContext.includes('Bear') ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {spxValuation.marketContext}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-600">
                        <span className="text-gray-400">Investment Signal</span>
                        <span className={`font-medium ${
                          spxValuation.color === 'green' ? 'text-green-400' :
                          spxValuation.color === 'red' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {spxValuation.signal}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Chart */}
              <div className="bg-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Historical P/E Trend</h3>
                <SPXChart />
              </div>

              <div className="text-center text-xs text-gray-500 mt-6">
                Last updated: {new Date().toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="text-center py-8">
                <p className="text-gray-400">Loading S&P 500 P/E analysis...</p>
              </div>
            </div>
          )}
        </div>
        </>
      ) : selectedView === 'earnings' ? (
        <>
        {/* Earnings Calendar Section */}
        <div className="max-w-7xl mx-auto px-3 pb-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">­ƒôê Earnings Calendar</h2>
            <p className="text-gray-300 text-sm mb-4">
              Real-time earnings announcements from major companies. Plan your trades around key earnings dates.
            </p>
          </div>

          {earningsData ? (
            <div className="space-y-6">
              {/* Earnings Summary */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    ­ƒôè Earnings Overview
                  </h3>
                  <div className="text-xs text-gray-400">Next 14 Days</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-xs text-gray-400 mb-1">Total Events</div>
                    <div className="text-white font-bold text-2xl">{earningsData.summary.totalEvents}</div>
                  </div>
                  <div className="bg-red-900/20 rounded-lg p-4 text-center border border-red-500/30">
                    <div className="text-xs text-red-300 mb-1">High Impact</div>
                    <div className="text-red-400 font-bold text-2xl">{earningsData.summary.highSignificance}</div>
                  </div>
                  <div className="bg-yellow-900/20 rounded-lg p-4 text-center border border-yellow-500/30">
                    <div className="text-xs text-yellow-300 mb-1">Medium Impact</div>
                    <div className="text-yellow-400 font-bold text-2xl">{earningsData.summary.mediumSignificance}</div>
                  </div>
                  <div className="bg-green-900/20 rounded-lg p-4 text-center border border-green-500/30">
                    <div className="text-xs text-green-300 mb-1">Low Impact</div>
                    <div className="text-green-400 font-bold text-2xl">{earningsData.summary.lowSignificance}</div>
                  </div>
                </div>
                
                {/* Next Major Earning */}
                {earningsData.summary.nextMajorEarning && (
                  <div className="mt-6 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-blue-300 font-bold text-sm">­ƒÄ» Next Major Earning</h4>
                        <div className="text-white font-bold text-lg mt-1">
                          {earningsData.summary.nextMajorEarning.company} ({earningsData.summary.nextMajorEarning.symbol})
                        </div>
                        <div className="text-blue-200 text-sm">
                          {new Date(earningsData.summary.nextMajorEarning.date).toLocaleDateString()} at {earningsData.summary.nextMajorEarning.time}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-blue-300 text-xs">Estimate</div>
                        <div className="text-white font-bold">{earningsData.summary.nextMajorEarning.estimate}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Earnings Calendar Table */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-700">
                  <h3 className="text-lg font-bold text-white">­ƒôà Upcoming Earnings</h3>
                  <p className="text-gray-400 text-sm mt-1">Companies reporting earnings in the next 14 days</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-700/50">
                      <tr>
                        <th className="text-left p-4 text-xs font-semibold text-gray-300 uppercase tracking-wider">Date</th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-300 uppercase tracking-wider">Time</th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-300 uppercase tracking-wider">Company</th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-300 uppercase tracking-wider">Symbol</th>
                        <th className="text-center p-4 text-xs font-semibold text-gray-300 uppercase tracking-wider">Estimate</th>
                        <th className="text-center p-4 text-xs font-semibold text-gray-300 uppercase tracking-wider">Actual</th>
                        <th className="text-center p-4 text-xs font-semibold text-gray-300 uppercase tracking-wider">Impact</th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-300 uppercase tracking-wider">Sector</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-600">
                      {earningsData.earningsCalendar.map((earning: any, index: number) => (
                        <tr key={index} className="hover:bg-slate-700/30 transition-colors">
                          <td className="p-4">
                            <div className="text-white font-medium">
                              {new Date(earning.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-gray-300 text-sm">{earning.time}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-white font-medium">{earning.company}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-blue-400 font-bold">{earning.symbol}</div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="text-gray-300">{earning.estimate || '-'}</div>
                          </td>
                          <td className="p-4 text-center">
                            {earning.actual ? (
                              <div className={`font-bold ${
                                parseFloat(earning.actual.replace('$', '')) > parseFloat((earning.estimate || '$0').replace('$', ''))
                                  ? 'text-green-400' 
                                  : 'text-red-400'
                              }`}>
                                {earning.actual}
                              </div>
                            ) : (
                              <div className="text-gray-500">-</div>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              earning.significance === 'High' 
                                ? 'bg-red-900/50 text-red-300 border border-red-500/30'
                                : earning.significance === 'Medium'
                                ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30'
                                : 'bg-green-900/50 text-green-300 border border-green-500/30'
                            }`}>
                              {earning.significance}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="text-gray-400 text-sm">{earning.sector}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Earnings Tips */}
              <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <div className="text-purple-400 mt-1">­ƒÆí</div>
                  <div>
                    <h3 className="text-purple-300 font-semibold mb-3">Trading Earnings Tips</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-200">
                      <div>
                        <strong>Before Market Open (BMO):</strong> Results released before 9:30 AM ET. Stock may gap up or down at market open.
                      </div>
                      <div>
                        <strong>After Market Close (AMC):</strong> Results released after 4:00 PM ET. Stock may gap in after-hours trading.
                      </div>
                      <div>
                        <strong>High Impact:</strong> Large-cap companies that can move the entire market. Expect high volatility.
                      </div>
                      <div>
                        <strong>Options Activity:</strong> Earnings typically increase implied volatility. Consider the impact on option prices.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-gray-500">
                Last updated: {new Date(earningsData.lastUpdated).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="text-center py-8">
                <p className="text-gray-400">Loading earnings calendar...</p>
              </div>
            </div>
          )}
        </div>
        </>
      ) : null}

      <Footer />
    </div>
    </ProtectedRoute>
  );
}
