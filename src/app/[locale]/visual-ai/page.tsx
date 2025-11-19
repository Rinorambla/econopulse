'use client';

import React, { useState, useEffect } from 'react';
import Footer from '@/components/Footer';
import RequirePlan from '@/components/RequirePlan';
import Link from 'next/link';
import { 
  ArrowLeft,
  Globe,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Map,
  DollarSign,
  Activity,
  Briefcase,
  MessageSquare,
  Search,
  AlertTriangle,
  Eye,
  Brain,
  Cpu,
  Database
} from 'lucide-react';
import dynamic from 'next/dynamic';
import LazyVisible from '@/components/LazyVisible';
// Recharts: load components client-side only to avoid SSR issues
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ScatterChart = dynamic(() => import('recharts').then(m => m.ScatterChart), { ssr: false });
const Scatter = dynamic(() => import('recharts').then(m => m.Scatter), { ssr: false });
const ErrorBar = dynamic(() => import('recharts').then(m => m.ErrorBar), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
const ProbabilitySparkline = dynamic(() => import('@/components/charts/ProbabilitySparkline'), { ssr: false });
const PopulationGrowthBarChart = dynamic(() => import('@/components/charts/PopulationGrowthBarChart'), { ssr: false });
const DebtToGDPBarChart = dynamic(() => import('@/components/charts/DebtToGDPBarChart'), { ssr: false });
const SPXChart = dynamic(() => import('@/components/SPXChart'), { ssr: false });

// Lightweight fetch with timeout to avoid long stalls on slow endpoints
const fetchWithTimeout = (url: string, timeoutMs = 5000): Promise<Response | null> => {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    return fetch(url, { signal: ctrl.signal })
      .then(r => r)
      .catch(() => null)
      .finally(() => clearTimeout(t));
  } catch {
    return Promise.resolve(null);
  }
};

// ===== NUMBER & PERCENT FORMAT HELPERS (ensure consistent EN/US formatting) =====
const formatNumber = (value: any, fractionDigits = 0): string => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
};

const formatPercent = (value: any, fractionDigits = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${Number(value).toFixed(fractionDigits)}%`;
};

const formatCompact = (value: any): string => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const n = Number(value);
  if (Math.abs(n) >= 1e12) return `${(n/1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `${(n/1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n/1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n/1e3).toFixed(2)}K`;
  return n.toFixed(2);
};

const formatPopulation = (value: any): string => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const n = Number(value);
  if (n >= 1e9) return `${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`;
  return formatNumber(n);
};

// Labels for Fed Tools series
const seriesLabel = (id: string): string => {
  const map: Record<string, string> = {
    WALCL: 'Fed Balance Sheet (WALCL)',
    IORB: 'Interest on Reserve Balances (IORB)',
    RRPONTSYD: 'Overnight Reverse Repo (RRP)',
    DFF: 'Effective Fed Funds (DFF)',
    SOFR: 'SOFR',
  };
  return map[id] || id;
};

// Format latest values for Fed Tools series
const formatFedValue = (id: string, value?: number): string => {
  if (value === null || value === undefined || isNaN(value as any)) return '—';
  const v = Number(value);
  if (id === 'WALCL' || id === 'RRPONTSYD') {
    // Heuristic: FRED often returns millions; convert to billions if large
    const billions = v > 1e4 ? v / 1e3 : v; // if millions -> billions
    return billions >= 1000
      ? `$${(billions / 1000).toFixed(2)}T`
      : `$${billions.toFixed(1)}B`;
  }
  // Policy rates (percent)
  return `${v.toFixed(2)}%`;
};

// ===== INTERFACES =====
interface PopulationData {
  country: string;
  countryCode: string;
  population: number;
  growthRate: number;
  urbanization: number;
  density: number;
  medianAge: number;
}

interface DebtData {
  country: string;
  debtToGdp: number;
  publicDebt: number;
  privateDebt: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  trend: number;
}

interface YieldCurveData {
  maturity: string;
  us: number;
  eu: number;
  em: number;
}

interface CountryMetrics {
  country: string;
  pe: number;
  dividendYield: number;
  marketCap: number;
  valuation: 'undervalued' | 'fair' | 'overvalued';
}

interface SectorMetrics {
  sector: string;
  pe: number;
  dividendYield: number;
  performance1M: number;
  performance6M: number;
  performance1Y: number;
  type: 'growth' | 'defensive' | 'cyclical';
}

interface CentralBankStatement {
  id: string;
  bank: string;
  country: string;
  date: string;
  type: 'rate_decision' | 'speech' | 'minutes' | 'statement';
  title: string;
  summary: string;
  sentiment: 'hawkish' | 'dovish' | 'neutral';
  confidence: number;
  keyPoints: string[];
  rateChange?: number;
  currentRate?: number;
  nextMeetingDate?: string;
  relativeDate?: string;
  impactScore?: number;
  marketReaction?: {
    bonds: 'up' | 'down' | 'neutral';
    currencies: 'strengthen' | 'weaken' | 'neutral';
    equities: 'up' | 'down' | 'neutral';
  };
}

interface GDPData {
  country: string;
  countryCode: string;
  gdpGrowth: number;
  gdpPerCapita: number;
  quarterlyGrowth: number;
  annualGrowth: number;
  trend: 'accelerating' | 'stable' | 'decelerating';
}

interface TradeData {
  country: string;
  exports: number;
  imports: number;
  tradeBalance: number;
  mainExports: string[];
  mainImports: string[];
  tradePartners: string[];
  balance?: number; // Alias per tradeBalance
}

interface OilSeasonalityData {
  month: string;
  averagePrice: number;
  volatility: number;
  historicalRange: {
    min: number;
    max: number;
  };
  seasonalTrend: 'bullish' | 'bearish' | 'neutral';
}

// Additional fallback generators for valuation/market widgets missing their own mocks
const generateStocksFallback = (): StockValuationData[] => [
  { country: 'United States', index: 'S&P 500', pe: 25.1, pb: 4.2, dividendYield: 1.6, roe: 18.5, marketCap: 45000000000000, valuation: 'overvalued', momentum: 12.4, volatility: 16.2, shillerPE: 31.2 },
  { country: 'Japan', index: 'Nikkei 225', pe: 15.8, pb: 1.6, dividendYield: 2.1, roe: 9.4, marketCap: 5500000000000, valuation: 'fair', momentum: 8.2, volatility: 14.1, shillerPE: 24.3 },
  { country: 'Germany', index: 'DAX', pe: 14.3, pb: 1.7, dividendYield: 2.9, roe: 11.3, marketCap: 2100000000000, valuation: 'fair', momentum: 5.6, volatility: 15.5, shillerPE: 19.8 },
  { country: 'China', index: 'CSI 300', pe: 11.9, pb: 1.3, dividendYield: 2.4, roe: 8.1, marketCap: 7200000000000, valuation: 'undervalued', momentum: -3.1, volatility: 18.7, shillerPE: 15.4 },
  { country: 'India', index: 'Nifty 50', pe: 22.7, pb: 3.5, dividendYield: 1.2, roe: 16.9, marketCap: 3700000000000, valuation: 'overvalued', momentum: 14.9, volatility: 17.4, shillerPE: 28.1 }
];

const generateEnergyFallback = (): EnergyData[] => [
  { commodity: 'Crude Oil WTI', price: 79.4, currency: 'USD', unit: 'bbl', dailyChange: -0.4, monthlyChange: 2.1, yearlyChange: -5.6, volatility: 28.3, geopoliticalRisk: 'medium', seasonalTrend: 'neutral' },
  { commodity: 'Natural Gas', price: 2.65, currency: 'USD', unit: 'MMBtu', dailyChange: 1.2, monthlyChange: -4.3, yearlyChange: -32.1, volatility: 42.6, geopoliticalRisk: 'medium', seasonalTrend: 'bearish' },
  { commodity: 'Brent Oil', price: 83.1, currency: 'USD', unit: 'bbl', dailyChange: -0.2, monthlyChange: 1.8, yearlyChange: -4.7, volatility: 26.4, geopoliticalRisk: 'high', seasonalTrend: 'neutral' },
  { commodity: 'Gasoline', price: 2.42, currency: 'USD', unit: 'gal', dailyChange: 0.3, monthlyChange: 5.2, yearlyChange: -1.9, volatility: 24.1, geopoliticalRisk: 'low', seasonalTrend: 'bullish' }
];

const generateRealEstateFallback = (): RealEstateData[] => [
  { city: 'New York', country: 'US', medianPrice: 680000, currency: 'USD', monthlyChange: -0.2, yearlyChange: -3.1, priceToIncomeRatio: 9.5, affordabilityIndex: 72, rentYield: 3.2, marketTrend: 'cooling', bubbleRisk: 'medium' },
  { city: 'London', country: 'GB', medianPrice: 520000, currency: 'GBP', monthlyChange: -0.5, yearlyChange: -4.2, priceToIncomeRatio: 11.3, affordabilityIndex: 65, rentYield: 2.9, marketTrend: 'cooling', bubbleRisk: 'high' },
  { city: 'Tokyo', country: 'JP', medianPrice: 480000, currency: 'JPY', monthlyChange: 0.3, yearlyChange: 2.1, priceToIncomeRatio: 8.1, affordabilityIndex: 83, rentYield: 2.4, marketTrend: 'stable', bubbleRisk: 'low' },
  { city: 'Sydney', country: 'AU', medianPrice: 750000, currency: 'AUD', monthlyChange: 0.1, yearlyChange: -1.7, priceToIncomeRatio: 10.4, affordabilityIndex: 69, rentYield: 3.0, marketTrend: 'stable', bubbleRisk: 'high' },
  { city: 'Dubai', country: 'AE', medianPrice: 540000, currency: 'AED', monthlyChange: 0.8, yearlyChange: 7.4, priceToIncomeRatio: 7.3, affordabilityIndex: 88, rentYield: 5.6, marketTrend: 'hot', bubbleRisk: 'medium' }
];

const generateCurrenciesFallback = (): CurrencyData[] => [
  { currency: 'US Dollar', currencyCode: 'USD', country: 'United States', exchangeRate: 1, dailyChange: 0.1, monthlyChange: 0.8, yearlyChange: 3.2, volatility: 6.3, strengthIndex: 78, centralBankRate: 5.5, trend: 'strengthening', sentiment: 'bullish' },
  { currency: 'Euro', currencyCode: 'EUR', country: 'Eurozone', exchangeRate: 1.08, dailyChange: -0.05, monthlyChange: -0.4, yearlyChange: -2.1, volatility: 5.2, strengthIndex: 52, centralBankRate: 3.75, trend: 'weakening', sentiment: 'neutral' },
  { currency: 'British Pound', currencyCode: 'GBP', country: 'United Kingdom', exchangeRate: 1.27, dailyChange: 0.02, monthlyChange: -0.6, yearlyChange: -1.4, volatility: 7.1, strengthIndex: 48, centralBankRate: 4.75, trend: 'weakening', sentiment: 'bearish' },
  { currency: 'Japanese Yen', currencyCode: 'JPY', country: 'Japan', exchangeRate: 0.0069, dailyChange: -0.01, monthlyChange: -1.2, yearlyChange: -8.4, volatility: 9.5, strengthIndex: 33, centralBankRate: 0.1, trend: 'weakening', sentiment: 'bearish' },
  { currency: 'Swiss Franc', currencyCode: 'CHF', country: 'Switzerland', exchangeRate: 1.12, dailyChange: 0.03, monthlyChange: 0.4, yearlyChange: 1.2, volatility: 4.1, strengthIndex: 69, centralBankRate: 1.75, trend: 'stable', sentiment: 'neutral' }
];

interface CommodityData {
  commodity: string;
  price: number;
  currency: string;
  unit: string;
  monthlyChange: number;
  yearlyChange: number;
  volatility: number;
  majorProducers: string[];
  seasonalPattern: 'bullish' | 'bearish' | 'neutral';
}

interface FedWatchMeeting {
  meetingDate: string;
  meetingLabel: string;
  currentTarget: string;
  probabilities: { rate: string; probability: number }[];
  impliedMoveBps: number;
}

interface GeoRiskPoint {
  date: string;
  gpr: number;
  change: number;
  percentile: number;
  regime: 'low' | 'moderate' | 'elevated' | 'crisis';
}

interface COTFlowRecord {
  market: string;      // e.g. E-MINI S&P 500
  symbol: string;      // ES, NQ, CL, GC etc
  date: string;        // report date ISO
  nonCommercialNet: number; // large spec net (long-short)
  commercialNet: number;    // commercial hedgers net
  changeNonCommercial: number; // WoW change
  changeCommercial: number;    // WoW change
  openInterest: number;    // total OI
  direction: 'long' | 'short' | 'neutral';
  zScore?: number;          // z-score of current nonCommercialNet vs history
  lookbackWeeks?: number;   // sample size used
  extreme?: boolean;        // |zScore| >= threshold
}

interface MetalData {
  metal: string;
  price: number;
  currency: string;
  unit: string;
  dailyChange: number;
  monthlyChange: number;
  yearlyChange: number;
  volatility: number;
  safeHavenScore: number;
  industrialDemand: number;
  jewelryDemand: number;
  investmentDemand: number;
}

interface PMIData {
  country: string;
  countryCode: string;
  manufacturing: number;
  services: number;
  composite: number;
  newOrders: number;
  employment: number;
  trend: 'expansion' | 'contraction' | 'neutral';
  economicSignal: 'strong' | 'moderate' | 'weak' | 'recession';
}

interface StockValuationData {
  country: string;
  index: string;
  pe: number;
  pb: number;
  dividendYield: number;
  roe: number;
  marketCap: number;
  valuation: 'undervalued' | 'fair' | 'overvalued' | 'extremely_overvalued';
  momentum: number;
  volatility: number;
  shillerPE: number;
}

interface EnergyData {
  commodity: string;
  price: number;
  currency: string;
  unit: string;
  dailyChange: number;
  monthlyChange: number;
  yearlyChange: number;
  volatility: number;
  geopoliticalRisk: 'low' | 'medium' | 'high' | 'critical';
  seasonalTrend: 'bullish' | 'bearish' | 'neutral';
}

interface RealEstateData {
  city: string;
  country: string;
  medianPrice: number;
  currency: string;
  monthlyChange: number;
  yearlyChange: number;
  priceToIncomeRatio: number;
  affordabilityIndex: number;
  rentYield: number;
  marketTrend: 'hot' | 'cooling' | 'stable' | 'declining';
  bubbleRisk: 'low' | 'medium' | 'high' | 'extreme';
}

interface CurrencyData {
  currency: string;
  currencyCode: string;
  country: string;
  exchangeRate: number;
  dailyChange: number;
  monthlyChange: number;
  yearlyChange: number;
  volatility: number;
  strengthIndex: number;
  centralBankRate: number;
  trend: 'strengthening' | 'weakening' | 'stable';
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface PEHistoricalData {
  date: string;
  pe: number;
  price: number;
  earnings: number;
  sector: string;
  marketCap: number;
}

interface PEPrediction {
  date: string;
  predictedPE: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
  trend: 'rising' | 'falling' | 'stable';
}

interface PEPredictorData {
  ticker: string;
  companyName: string;
  currentPE: number;
  historicalData: PEHistoricalData[];
  predictions: PEPrediction[];
  accuracy: number;
  lastUpdated: string;
  modelType: 'LSTM' | 'Regression' | 'Neural Network';
}

interface CountryMetrics {
  country: string;
  pe: number;
  dividendYield: number;
  marketCap: number;
  valuation: 'undervalued' | 'fair' | 'overvalued';
}

interface SectorMetrics {
  sector: string;
  pe: number;
  dividendYield: number;
  performance1M: number;
  performance6M: number;
  performance1Y: number;
  type: 'defensive' | 'cyclical' | 'growth';
}

interface AIInsight {
  title: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  risks: string[];
  opportunities: string[];
}

interface WidgetData {
  id: string;
  title: string;
  data: any;
  aiInsight: AIInsight;
  lastUpdated: string;
  source?: string; // origin of dataset (if known)
  fallback?: boolean; // true when using synthetic/generated data
}

// FedWatch mock generator (fallback)
const generateFedWatchData = (): FedWatchMeeting[] => [
  {
    meetingDate: new Date(Date.now()+30*86400000).toISOString(),
    meetingLabel: 'Sep (Est)',
    currentTarget: '5.25-5.50%',
    probabilities: [
      { rate: '5.25-5.50%', probability: 52.5 },
      { rate: '5.00-5.25%', probability: 34.0 },
      { rate: '4.75-5.00%', probability: 13.5 }
    ],
    impliedMoveBps: -6.0
  },
  {
    meetingDate: new Date(Date.now()+90*86400000).toISOString(),
    meetingLabel: 'Nov (Est)',
    currentTarget: '5.25-5.50%',
    probabilities: [
      { rate: '5.00-5.25%', probability: 44.0 },
      { rate: '4.75-5.00%', probability: 32.0 },
      { rate: '5.25-5.50%', probability: 18.0 },
      { rate: '4.50-4.75%', probability: 6.0 }
    ],
    impliedMoveBps: -28.0
  },
  {
    meetingDate: new Date(Date.now()+150*86400000).toISOString(),
    meetingLabel: 'Jan (Est)',
    currentTarget: '5.25-5.50%',
    probabilities: [
      { rate: '4.75-5.00%', probability: 39.0 },
      { rate: '4.50-4.75%', probability: 33.0 },
      { rate: '5.00-5.25%', probability: 17.0 },
      { rate: '4.25-4.50%', probability: 11.0 }
    ],
    impliedMoveBps: -47.0
  }
]

// Fallback COT flow sample (approximate illustrative values; replace with real fetch)
const generateCOTFlowFallback = (): COTFlowRecord[] => {
  const now = new Date();
  const date = new Date(now.getTime() - 3*24*60*60*1000).toISOString().split('T')[0];
  return [
    { market: 'E-MINI S&P 500', symbol: 'ES', date, nonCommercialNet: 120000, commercialNet: -115000, changeNonCommercial: 4500, changeCommercial: -4200, openInterest: 2100000, direction: 'long' },
    { market: 'E-MINI NASDAQ 100', symbol: 'NQ', date, nonCommercialNet: 38000, commercialNet: -36000, changeNonCommercial: -1500, changeCommercial: 1400, openInterest: 780000, direction: 'long' },
    { market: 'CRUDE OIL WTI', symbol: 'CL', date, nonCommercialNet: 285000, commercialNet: -290000, changeNonCommercial: 8000, changeCommercial: -7700, openInterest: 3100000, direction: 'long' },
    { market: 'GOLD', symbol: 'GC', date, nonCommercialNet: 165000, commercialNet: -170000, changeNonCommercial: -6000, changeCommercial: 5900, openInterest: 560000, direction: 'long' },
    { market: 'SILVER', symbol: 'SI', date, nonCommercialNet: 28000, commercialNet: -30000, changeNonCommercial: 1200, changeCommercial: -1100, openInterest: 160000, direction: 'long' },
    { market: 'US DOLLAR INDEX', symbol: 'DX', date, nonCommercialNet: -8000, commercialNet: 7500, changeNonCommercial: -500, changeCommercial: 520, openInterest: 52000, direction: 'short' }
  ];
}

// Geopolitical Risk fallback (synthetic last 12 months with reasonable variation)
const generateGeoRiskFallback = (): GeoRiskPoint[] => {
  const out: GeoRiskPoint[] = [];
  const now = new Date();
  let prev = 110; // start around moderate
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const drift = Math.sin((12 - i) / 12 * Math.PI * 2) * 8; // seasonal-ish
    const noise = (Math.random() - 0.5) * 12;
    const gpr = Math.max(40, Math.min(220, prev + drift + noise));
    const change = Number((gpr - prev).toFixed(1));
    prev = gpr;
    out.push({
      date: d.toISOString().slice(0, 10),
      gpr: Number(gpr.toFixed(1)),
      change,
      percentile: 0, // temp, compute after series built
      regime: gpr < 70 ? 'low' : gpr < 110 ? 'moderate' : gpr < 160 ? 'elevated' : 'crisis'
    });
  }
  const vals = out.map(o => o.gpr);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  out.forEach(o => { o.percentile = Math.round(((o.gpr - min) / (max - min || 1)) * 100); });
  return out;
};

// ===== MOCK DATA GENERATORS =====
const generatePopulationData = (): PopulationData[] => [
  { country: 'China', countryCode: 'CN', population: 1412000000, growthRate: 0.34, urbanization: 64.7, density: 153, medianAge: 38.4 },
  { country: 'India', countryCode: 'IN', population: 1380000000, growthRate: 0.99, urbanization: 35.4, density: 464, medianAge: 28.4 },
  { country: 'United States', countryCode: 'US', population: 331900000, growthRate: 0.59, urbanization: 82.7, density: 36, medianAge: 38.5 },
  { country: 'Indonesia', countryCode: 'ID', population: 273500000, growthRate: 1.07, urbanization: 56.6, density: 151, medianAge: 30.2 },
  { country: 'Pakistan', countryCode: 'PK', population: 225200000, growthRate: 2.00, urbanization: 37.2, density: 287, medianAge: 22.8 },
  { country: 'Brazil', countryCode: 'BR', population: 215300000, growthRate: 0.65, urbanization: 87.6, density: 25, medianAge: 33.2 },
  { country: 'Nigeria', countryCode: 'NG', population: 218500000, growthRate: 2.58, urbanization: 52.7, density: 226, medianAge: 18.1 },
  { country: 'Bangladesh', countryCode: 'BD', population: 166300000, growthRate: 1.01, urbanization: 39.0, density: 1265, medianAge: 27.6 }
];

const generateDebtData = (): DebtData[] => [
  { country: 'Japan', debtToGdp: 266.2, publicDebt: 10.1, privateDebt: 4.8, riskLevel: 'medium', trend: 1.2 },
  { country: 'Greece', debtToGdp: 206.3, publicDebt: 0.4, privateDebt: 0.2, riskLevel: 'high', trend: -2.1 },
  { country: 'Italy', debtToGdp: 155.6, publicDebt: 2.7, privateDebt: 1.8, riskLevel: 'high', trend: 0.8 },
  { country: 'Portugal', debtToGdp: 137.2, publicDebt: 0.3, privateDebt: 0.2, riskLevel: 'medium', trend: -1.5 },
  { country: 'Spain', debtToGdp: 120.0, publicDebt: 1.6, privateDebt: 1.2, riskLevel: 'medium', trend: -0.3 },
  { country: 'France', debtToGdp: 115.7, publicDebt: 3.0, privateDebt: 2.1, riskLevel: 'medium', trend: 0.5 },
  { country: 'United States', debtToGdp: 108.1, publicDebt: 23.3, privateDebt: 18.7, riskLevel: 'medium', trend: 2.1 },
  { country: 'Germany', debtToGdp: 71.2, publicDebt: 2.8, privateDebt: 2.0, riskLevel: 'low', trend: -1.8 }
];

const generateYieldCurveData = (): YieldCurveData[] => [
  { maturity: '3M', us: 5.25, eu: 3.75, em: 7.25 },
  { maturity: '6M', us: 5.15, eu: 3.65, em: 7.15 },
  { maturity: '1Y', us: 4.95, eu: 3.45, em: 6.95 },
  { maturity: '2Y', us: 4.65, eu: 3.15, em: 6.65 },
  { maturity: '5Y', us: 4.25, eu: 2.85, em: 6.25 },
  { maturity: '10Y', us: 4.35, eu: 2.95, em: 6.35 },
  { maturity: '30Y', us: 4.45, eu: 3.05, em: 6.45 }
];

const generateCountryMetrics = (): CountryMetrics[] => [
  { country: 'United States', pe: 25.4, dividendYield: 1.8, marketCap: 45.3, valuation: 'overvalued' },
  { country: 'China', pe: 12.8, dividendYield: 2.4, marketCap: 12.1, valuation: 'undervalued' },
  { country: 'Japan', pe: 15.2, dividendYield: 2.8, marketCap: 4.9, valuation: 'fair' },
  { country: 'Germany', pe: 14.6, dividendYield: 3.2, marketCap: 2.3, valuation: 'fair' },
  { country: 'United Kingdom', pe: 16.8, dividendYield: 3.8, marketCap: 2.8, valuation: 'fair' },
  { country: 'France', pe: 18.2, dividendYield: 2.9, marketCap: 2.2, valuation: 'fair' },
  { country: 'India', pe: 22.1, dividendYield: 1.4, marketCap: 3.4, valuation: 'overvalued' },
  { country: 'Canada', pe: 19.5, dividendYield: 2.6, marketCap: 2.1, valuation: 'fair' }
];

const generateSectorMetrics = (): SectorMetrics[] => [
  { sector: 'Technology', pe: 28.5, dividendYield: 1.2, performance1M: 3.4, performance6M: 12.8, performance1Y: 28.7, type: 'growth' },
  { sector: 'Healthcare', pe: 18.2, dividendYield: 1.8, performance1M: 1.2, performance6M: 6.4, performance1Y: 12.3, type: 'defensive' },
  { sector: 'Financials', pe: 12.8, dividendYield: 3.2, performance1M: 2.8, performance6M: 8.9, performance1Y: 15.6, type: 'cyclical' },
  { sector: 'Energy', pe: 14.1, dividendYield: 4.5, performance1M: -2.1, performance6M: -5.8, performance1Y: 8.2, type: 'cyclical' },
  { sector: 'Utilities', pe: 16.5, dividendYield: 3.8, performance1M: 0.8, performance6M: 2.1, performance1Y: 5.4, type: 'defensive' },
  { sector: 'Consumer Discretionary', pe: 22.3, dividendYield: 1.6, performance1M: 2.5, performance6M: 10.2, performance1Y: 18.9, type: 'cyclical' },
  { sector: 'Consumer Staples', pe: 20.1, dividendYield: 2.4, performance1M: 0.5, performance6M: 3.8, performance1Y: 7.6, type: 'defensive' },
  { sector: 'Industrials', pe: 19.8, dividendYield: 2.1, performance1M: 1.8, performance6M: 7.3, performance1Y: 14.2, type: 'cyclical' }
];

const generatePMIData = (): PMIData[] => [
  { country: 'United States', countryCode: 'US', manufacturing: 52.3, services: 54.1, composite: 53.2, newOrders: 53.8, employment: 51.2, trend: 'expansion', economicSignal: 'moderate' },
  { country: 'Eurozone', countryCode: 'EU', manufacturing: 48.7, services: 51.2, composite: 49.9, newOrders: 48.2, employment: 49.1, trend: 'contraction', economicSignal: 'moderate' },
  { country: 'China', countryCode: 'CN', manufacturing: 50.8, services: 52.6, composite: 51.7, newOrders: 51.4, employment: 49.8, trend: 'expansion', economicSignal: 'moderate' },
  { country: 'Japan', countryCode: 'JP', manufacturing: 49.2, services: 53.8, composite: 51.5, newOrders: 48.6, employment: 48.9, trend: 'contraction', economicSignal: 'moderate' },
  { country: 'United Kingdom', countryCode: 'GB', manufacturing: 47.8, services: 52.4, composite: 50.1, newOrders: 47.2, employment: 48.4, trend: 'contraction', economicSignal: 'moderate' },
  { country: 'Germany', countryCode: 'DE', manufacturing: 46.9, services: 50.8, composite: 48.9, newOrders: 46.4, employment: 47.8, trend: 'contraction', economicSignal: 'weak' },
  { country: 'India', countryCode: 'IN', manufacturing: 55.2, services: 58.1, composite: 56.7, newOrders: 56.8, employment: 54.2, trend: 'expansion', economicSignal: 'strong' },
  { country: 'Brazil', countryCode: 'BR', manufacturing: 51.4, services: 49.8, composite: 50.6, newOrders: 52.1, employment: 50.4, trend: 'expansion', economicSignal: 'moderate' }
];

const generateGDPData = (): GDPData[] => [
  { country: 'United States', countryCode: 'US', gdpGrowth: 2.5, gdpPerCapita: 76398, quarterlyGrowth: 0.6, annualGrowth: 2.5, trend: 'stable' },
  { country: 'China', countryCode: 'CN', gdpGrowth: 5.2, gdpPerCapita: 12720, quarterlyGrowth: 1.2, annualGrowth: 5.2, trend: 'decelerating' },
  { country: 'Japan', countryCode: 'JP', gdpGrowth: 1.1, gdpPerCapita: 34064, quarterlyGrowth: 0.1, annualGrowth: 1.1, trend: 'stable' },
  { country: 'Germany', countryCode: 'DE', gdpGrowth: 0.3, gdpPerCapita: 48264, quarterlyGrowth: -0.1, annualGrowth: 0.3, trend: 'decelerating' },
  { country: 'United Kingdom', countryCode: 'GB', gdpGrowth: 0.5, gdpPerCapita: 45225, quarterlyGrowth: 0.2, annualGrowth: 0.5, trend: 'stable' },
  { country: 'France', countryCode: 'FR', gdpGrowth: 0.8, gdpPerCapita: 40493, quarterlyGrowth: 0.1, annualGrowth: 0.8, trend: 'stable' },
  { country: 'India', countryCode: 'IN', gdpGrowth: 7.2, gdpPerCapita: 2612, quarterlyGrowth: 1.6, annualGrowth: 7.2, trend: 'accelerating' },
  { country: 'Brazil', countryCode: 'BR', gdpGrowth: 2.9, gdpPerCapita: 8917, quarterlyGrowth: 0.5, annualGrowth: 2.9, trend: 'accelerating' }
];

const generateTradeData = (): TradeData[] => [
  { 
    country: 'China', 
    exports: 3593, 
    imports: 2714, 
    tradeBalance: 879, 
    mainExports: ['Electronics', 'Machinery', 'Textiles'], 
    mainImports: ['Energy', 'Raw Materials', 'Technology'],
    tradePartners: ['USA', 'EU', 'ASEAN']
  },
  { 
    country: 'United States', 
    exports: 2044, 
    imports: 3273, 
    tradeBalance: -1229, 
    mainExports: ['Technology', 'Agriculture', 'Services'], 
    mainImports: ['Electronics', 'Energy', 'Consumer Goods'],
    tradePartners: ['China', 'Mexico', 'Canada']
  },
  { 
    country: 'Germany', 
    exports: 1811, 
    imports: 1625, 
    tradeBalance: 186, 
    mainExports: ['Automotive', 'Machinery', 'Chemicals'], 
    mainImports: ['Energy', 'Electronics', 'Raw Materials'],
    tradePartners: ['EU', 'China', 'USA']
  },
  { 
    country: 'Japan', 
    exports: 705, 
    imports: 721, 
    tradeBalance: -16, 
    mainExports: ['Automotive', 'Electronics', 'Machinery'], 
    mainImports: ['Energy', 'Raw Materials', 'Food'],
    tradePartners: ['China', 'USA', 'South Korea']
  },
  { 
    country: 'United Kingdom', 
    exports: 468, 
    imports: 692, 
    tradeBalance: -224, 
    mainExports: ['Services', 'Machinery', 'Chemicals'], 
    mainImports: ['Energy', 'Food', 'Consumer Goods'],
    tradePartners: ['EU', 'USA', 'China']
  },
  { 
    country: 'France', 
    exports: 625, 
    imports: 652, 
    tradeBalance: -27, 
    mainExports: ['Luxury Goods', 'Agriculture', 'Aerospace'], 
    mainImports: ['Energy', 'Electronics', 'Raw Materials'],
    tradePartners: ['EU', 'China', 'USA']
  }
];

const generateOilSeasonalityData = (): OilSeasonalityData[] => [
  { month: 'Jan', averagePrice: 78.2, volatility: 12.5, historicalRange: { min: 45.3, max: 98.7 }, seasonalTrend: 'neutral' },
  { month: 'Feb', averagePrice: 79.8, volatility: 11.2, historicalRange: { min: 47.1, max: 102.3 }, seasonalTrend: 'bullish' },
  { month: 'Mar', averagePrice: 82.1, volatility: 14.8, historicalRange: { min: 38.2, max: 109.8 }, seasonalTrend: 'bullish' },
  { month: 'Apr', averagePrice: 84.5, volatility: 16.3, historicalRange: { min: 35.6, max: 112.4 }, seasonalTrend: 'bullish' },
  { month: 'May', averagePrice: 88.7, volatility: 18.9, historicalRange: { min: 42.8, max: 118.2 }, seasonalTrend: 'bullish' },
  { month: 'Jun', averagePrice: 91.3, volatility: 19.7, historicalRange: { min: 48.9, max: 126.5 }, seasonalTrend: 'bullish' },
  { month: 'Jul', averagePrice: 89.1, volatility: 17.2, historicalRange: { min: 52.1, max: 121.8 }, seasonalTrend: 'neutral' },
  { month: 'Aug', averagePrice: 86.8, volatility: 15.6, historicalRange: { min: 49.3, max: 115.7 }, seasonalTrend: 'bearish' },
  { month: 'Sep', averagePrice: 83.4, volatility: 13.1, historicalRange: { min: 45.7, max: 108.9 }, seasonalTrend: 'bearish' },
  { month: 'Oct', averagePrice: 81.2, volatility: 14.8, historicalRange: { min: 43.2, max: 105.6 }, seasonalTrend: 'bearish' },
  { month: 'Nov', averagePrice: 79.6, volatility: 12.9, historicalRange: { min: 41.8, max: 98.4 }, seasonalTrend: 'bearish' },
  { month: 'Dec', averagePrice: 77.9, volatility: 11.4, historicalRange: { min: 39.5, max: 95.2 }, seasonalTrend: 'neutral' }
];

// ===== MAIN COMPONENT =====
export default function VisualAIPage({ params }: { params: Promise<{ locale: string }> }) {
  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWidget, setSelectedWidget] = useState<WidgetData | null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  // Interactive controls for enhanced professionalism
  const [sectorMetric, setSectorMetric] = useState<'performance1Y'|'performance6M'|'performance1M'>('performance1Y');
  const [sectorSortDir, setSectorSortDir] = useState<'desc'|'asc'>('desc');
  const [countryAxisMetric, setCountryAxisMetric] = useState<'pe'|'dividendYield'>('pe');
  // Auto-refresh tick to re-run data initialization periodically
  const [refreshTick, setRefreshTick] = useState(0);
  // UX: high-level navigation of widgets
  const [activeTab, setActiveTab] = useState<'macro'|'markets'|'commodities'|'policy'|'all'>('macro');
  const [searchTerm, setSearchTerm] = useState('');
  const TAB_GROUPS: Record<'macro'|'markets'|'commodities'|'policy'|'all', string[]> = {
    macro: ['population','gdp','pmi','yields','trade'],
    markets: ['stocks','sectors','country_metrics','currencies','spx_historical','pe_predictor'],
    commodities: ['energy','metals','agriculture','oil_seasonality','real_estate'],
    policy: ['central_bank','fed_dot_plot','fedwatch','fed_tools','recession_prob','cot_flow','geopolitical_risk','debt'],
    all: []
  };

  // Generate AI insights
  const generateAIInsight = (widgetType: string, data: any): AIInsight => {
    const insights: Record<string, AIInsight> = {
      population: {
        title: "Demographic Transition Impact",
        content: "Global population growth is decelerating, with developed nations facing aging populations while emerging markets drive growth. This shift will reshape consumer markets, labor forces, and debt sustainability.",
        sentiment: 'neutral',
        confidence: 85,
        risks: ["Aging populations in developed countries", "Youth unemployment in high-growth regions", "Urban infrastructure stress"],
        opportunities: ["Growing middle class in EM", "Technology adoption acceleration", "Sustainable development investments"]
      },
      debt: {
        title: "Debt Vulnerability Analysis",
        content: "Rising debt-to-GDP ratios across developed economies signal potential fiscal constraints. Japan and Southern Europe show highest vulnerability, while emerging markets face currency risk.",
        sentiment: 'negative',
        confidence: 78,
        risks: ["Interest rate sensitivity", "Fiscal space reduction", "Currency devaluation risk"],
        opportunities: ["Debt restructuring programs", "Green bonds growth", "Fiscal consolidation benefits"]
      },
      yields: {
        title: "Yield Curve Dynamics",
        content: "Inverted yield curves in developed markets signal recession risks, while EM curves remain steep. Central bank policies diverging globally.",
        sentiment: 'negative',
        confidence: 82,
        risks: ["Recession indicators", "Banking sector stress", "Credit tightening"],
        opportunities: ["Value opportunities in bonds", "Currency diversification", "Defensive positioning"]
      },
      country_metrics: {
        title: "Global Market Valuations",
        content: "US markets show stretched valuations while EM markets offer attractive entry points. Dividend yields vary significantly across regions.",
        sentiment: 'neutral',
        confidence: 75,
        risks: ["Valuation corrections", "Earnings disappointments", "Multiple compression"],
        opportunities: ["EM value opportunities", "Dividend income strategies", "Sector rotation potential"]
      },
      sectors: {
        title: "Sector Cycle Analysis",
        content: "Technology leads growth while defensive sectors lag. Cyclical sectors showing mixed signals amid economic uncertainty.",
        sentiment: 'neutral',
        confidence: 80,
        risks: ["Growth deceleration", "Interest rate impact", "Geopolitical tensions"],
        opportunities: ["AI revolution benefits", "Energy transition plays", "Healthcare innovation"]
      },
      central_bank: {
        title: "Central Bank Policy Analysis",
        content: "Global central banks showing divergent policy paths. Fed remains hawkish while ECB and BoJ maintain accommodative stance. Policy divergence creating currency volatility.",
        sentiment: 'neutral',
        confidence: 88,
        risks: ["Policy divergence volatility", "Rate shock risks", "Communication confusion"],
        opportunities: ["Carry trade opportunities", "Rate differential plays", "Policy pivot timing"]
      },
      gdp: {
        title: "Global Growth Divergence",
        content: "Economic growth showing significant regional divergence. EM markets leading growth while developed markets face headwinds. China slowdown impacting global supply chains.",
        sentiment: 'neutral',
        confidence: 82,
        risks: ["Growth synchronization risk", "China spillover effects", "Productivity slowdown"],
        opportunities: ["EM outperformance", "Structural reforms", "Infrastructure investment"]
      },
      trade: {
        title: "Global Trade Rebalancing",
        content: "Trade flows showing structural shifts away from globalization towards regionalization. Supply chain resilience becoming priority over efficiency.",
        sentiment: 'neutral',
        confidence: 75,
        risks: ["Trade war escalation", "Supply chain fragmentation", "Efficiency loss"],
        opportunities: ["Nearshoring trends", "Regional trade growth", "Supply chain technology"]
      },
      oil_seasonality: {
        title: "Oil Price Seasonal Patterns",
        content: "Oil prices show consistent seasonal patterns driven by refining cycles and weather. Summer driving season typically bullish, winter heating demand variable.",
        sentiment: 'neutral',
        confidence: 85,
        risks: ["Seasonal demand volatility", "Weather pattern changes", "Strategic reserve releases"],
        opportunities: ["Seasonal trading strategies", "Refining margin plays", "Storage arbitrage"]
      },
      agriculture: {
        title: "Agricultural Commodity Dynamics",
        content: "Agricultural markets facing climate challenges and supply chain disruptions. Weather patterns and geopolitical tensions driving price volatility across major grain markets.",
        sentiment: 'neutral',
        confidence: 78,
        risks: ["Climate change impacts", "Supply chain disruptions", "Geopolitical tensions"],
        opportunities: ["Food security investments", "Agricultural technology", "Sustainable farming"]
      },
      metals: {
        title: "Precious Metals Outlook",
        content: "Gold maintaining safe-haven appeal amid economic uncertainty. Industrial metals facing demand headwinds from slowing growth. Central bank demand supporting precious metals.",
        sentiment: 'positive',
        confidence: 82,
        risks: ["Interest rate sensitivity", "Dollar strength", "Industrial demand weakness"],
        opportunities: ["Inflation hedge", "Safe haven demand", "Industrial electrification"]
      },
      pmi: {
        title: "Manufacturing Health Check",
        content: "PMI readings show global manufacturing slowdown with services holding up better. Supply chain normalization helping production but demand concerns persist.",
        sentiment: 'neutral',
        confidence: 85,
        risks: ["Demand softening", "Supply chain disruptions", "Labor market tightness"],
        opportunities: ["Inventory restocking", "Automation investments", "Nearshoring benefits"]
      },
      stocks: {
        title: "Global Equity Valuations",
        content: "Equity markets showing stretched valuations in developed markets while emerging markets trade at discounts. Earnings growth facing headwinds from economic slowdown.",
        sentiment: 'neutral',
        confidence: 79,
        risks: ["Valuation compression", "Earnings downgrades", "Multiple contraction"],
        opportunities: ["EM value opportunities", "Dividend strategies", "Quality factor outperformance"]
      },
      energy: {
        title: "Energy Market Dynamics",
        content: "Energy markets balancing geopolitical supply risks with demand concerns. Transition to renewables creating investment opportunities while fossil fuels face volatility.",
        sentiment: 'neutral',
        confidence: 83,
        risks: ["Geopolitical supply disruptions", "Demand volatility", "Policy uncertainty"],
        opportunities: ["Energy security investments", "Renewable transition", "Storage technologies"]
      },
      real_estate: {
        title: "Global Property Markets",
        content: "Real estate markets cooling globally as higher interest rates impact affordability. Commercial real estate facing structural headwinds from remote work trends.",
        sentiment: 'negative',
        confidence: 87,
        risks: ["Interest rate sensitivity", "Affordability crisis", "Commercial real estate stress"],
        opportunities: ["Residential market corrections", "Infrastructure investments", "REITs opportunities"]
      },
      currencies: {
        title: "Currency Market Dynamics",
        content: "Dollar strength persisting on Fed policy and safe haven flows. EM currencies under pressure from capital outflows and commodity price volatility.",
        sentiment: 'neutral',
        confidence: 81,
        risks: ["Dollar strength", "Capital flow volatility", "Central bank intervention"],
        opportunities: ["Carry trade strategies", "Currency hedging", "EM recovery potential"]
      },
      spx_historical: {
        title: "S&P 500 Historical Analysis",
        content: "Historical S&P 500 data reveals key market cycles and valuation patterns. Current P/E ratios suggest elevated valuations compared to long-term averages, while earnings growth shows resilience despite economic uncertainties.",
        sentiment: 'neutral',
        confidence: 87,
        risks: ["Elevated P/E ratios above historical norms", "Interest rate sensitivity", "Potential earnings compression"],
        opportunities: ["Long-term earnings growth trend intact", "Historical resilience through cycles", "Value opportunities in corrections"]
      },
      pe_predictor: {
        title: "P/E Ratio Forecasting Analysis",
        content: "AI-powered LSTM models analyze historical P/E patterns to predict future valuation levels. Current market conditions suggest moderate P/E expansion with seasonal volatility patterns.",
        sentiment: 'neutral',
        confidence: 87,
        risks: ["Earnings compression risk", "Multiple contraction", "Interest rate sensitivity"],
        opportunities: ["Value opportunities emergence", "Market timing optimization", "Sector rotation benefits"]
      },
      fedwatch: {
        title: "Fed Funds Rate Path Probability",
        content: "Market-implied probabilities suggest a gradual easing bias with cuts priced over the next 2-3 meetings. Distribution skews toward modest cuts rather than aggressive policy shifts.",
        sentiment: 'neutral',
        confidence: 84,
        risks: ["Sticky inflation delaying cuts", "Re-acceleration in labor market", "Financial stability shock"],
        opportunities: ["Duration extension timing", "Curve steepener trades", "Equity multiple support"]
      },
      cot_flow: {
        title: "Global COT Positioning Flows",
        content: "Weekly Commitment of Traders positioning shows large speculators maintaining net longs in equity indices and energy while remaining defensive on USD. Recent increases in crude and S&P net longs indicate risk-on reinforcement.",
        sentiment: 'neutral',
        confidence: 79,
        risks: ["Position crowding in crude", "Potential reversal in equity sentiment", "Macro shock de-risking"],
        opportunities: ["Momentum alignment with positioning", "Spread trades (Energy vs USD)", "Hedge timing using net extremes"]
      },
      geopolitical_risk: {
        title: "Geopolitical Risk Index",
        content: "Geopolitical risk momentum remains concentrated in elevated regimes with episodic spikes. Current percentile indicates markets are pricing persistent strategic tensions rather than acute crisis.",
        sentiment: 'neutral',
        confidence: 76,
        risks: ["Escalation to crisis regime", "Energy supply disruption", "Trade fragmentation"],
        opportunities: ["Defense & cybersecurity hedges", "Selective energy exposure", "Event-volatility trading"]
      }
    };
    
    return insights[widgetType] || {
      title: "AI Analysis",
      content: "Comprehensive analysis of current market conditions and trends.",
      sentiment: 'neutral',
      confidence: 70,
      risks: ["Market volatility", "Economic uncertainty"],
      opportunities: ["Strategic positioning", "Long-term growth"]
    };
  };

  // Initialize widgets with real data
  useEffect(() => {
    const initializeWidgets = async () => {
      try {
        console.log('🚀 Initializing Visual AI widgets with real data...');
        
  // Decide which groups to load based on active tab to cut initial network cost
  const isMacro = activeTab === 'macro' || activeTab === 'all';
  const isMarkets = activeTab === 'markets' || activeTab === 'all';
  const isCommodities = activeTab === 'commodities' || activeTab === 'all';
  const isPolicy = activeTab === 'policy' || activeTab === 'all';

  // Fetch real data from APIs (only those relevant to the active tab)
  const [populationRes, debtRes, yieldsRes, centralBankRes, gdpRes, tradeRes, oilRes, agricultureRes, metalsRes, pmiRes, stocksRes, energyRes, realEstateRes, currenciesRes, pePredictorRes, fedDotRes, fedwatchRes, fedToolsRes, recessionRes, cotFlowRes, geoRiskRes] = await Promise.all([
          isMacro ? fetchWithTimeout('/api/visual-ai/population', 5000) : Promise.resolve(null),
          isPolicy ? fetchWithTimeout('/api/visual-ai/debt', 5000) : Promise.resolve(null),
          isMacro ? fetchWithTimeout('/api/visual-ai/yields', 5000) : Promise.resolve(null),
          isPolicy ? fetchWithTimeout('/api/visual-ai/central-bank', 6000) : Promise.resolve(null),
          isMacro ? fetchWithTimeout('/api/visual-ai/gdp', 5000) : Promise.resolve(null),
          isMacro ? fetchWithTimeout('/api/visual-ai/trade', 5000) : Promise.resolve(null),
          isCommodities ? fetchWithTimeout('/api/visual-ai/oil-seasonality', 5000) : Promise.resolve(null),
          isCommodities ? fetchWithTimeout('/api/visual-ai/agriculture', 5000) : Promise.resolve(null),
          isCommodities ? fetchWithTimeout('/api/visual-ai/metals', 5000) : Promise.resolve(null),
          isMacro ? fetchWithTimeout('/api/visual-ai/pmi', 5000) : Promise.resolve(null),
          isMarkets ? fetchWithTimeout('/api/visual-ai/stocks', 6000) : Promise.resolve(null),
          isCommodities ? fetchWithTimeout('/api/visual-ai/energy', 5000) : Promise.resolve(null),
          isCommodities ? fetchWithTimeout('/api/visual-ai/real-estate', 5000) : Promise.resolve(null),
          isMarkets ? fetchWithTimeout('/api/visual-ai/currencies', 5000) : Promise.resolve(null),
          isMarkets ? fetchWithTimeout('/api/visual-ai/pe-predictor?ticker=SPY', 6000) : Promise.resolve(null),
    isPolicy ? fetchWithTimeout('/api/visual-ai/fed-dot-plot', 6000) : Promise.resolve(null),
          isPolicy ? fetchWithTimeout('/api/visual-ai/fedwatch', 6000) : Promise.resolve(null),
          isPolicy ? fetchWithTimeout('/api/visual-ai/fed-tools', 7000) : Promise.resolve(null),
          isPolicy ? fetchWithTimeout('/api/visual-ai/global-recession-probability', 7000) : Promise.resolve(null),
          isPolicy ? fetchWithTimeout('/api/visual-ai/cot-flow', 6000) : Promise.resolve(null),
          isPolicy ? fetchWithTimeout('/api/visual-ai/geopolitical-risk', 6000) : Promise.resolve(null)
        ]);

    // Track fallback flag for disclosure
    let populationFallback = true;
    let debtFallback = true;
    let yieldsFallback = true;
    let gdpFallback = true;
    let tradeFallback = true;
    let oilFallback = true;
    let pmiFallback = true;
    let stocksFallback = true;
    let energyFallback = true;
    let realEstateFallback = true;
    let currenciesFallback = true;

    // Process population data
    let populationData = generatePopulationData(); // fallback
        if (populationRes && populationRes.ok) {
          const popApiData = await populationRes.json();
          if (popApiData.data && popApiData.data.length > 0) {
            populationData = popApiData.data;
            console.log('✅ Population data loaded from API');
      populationFallback = false;
          }
        }

        // Process debt data  
    let debtData = generateDebtData(); // fallback
        if (debtRes && debtRes.ok) {
          const debtApiData = await debtRes.json();
          if (debtApiData.data && debtApiData.data.length > 0) {
            debtData = debtApiData.data;
            console.log('✅ Debt data loaded from API');
      debtFallback = false;
          }
        }

        // Process yield curve data
    let yieldsData = generateYieldCurveData(); // fallback
        if (yieldsRes && yieldsRes.ok) {
          const yieldsApiData = await yieldsRes.json();
          if (yieldsApiData.data && yieldsApiData.data.length > 0) {
            yieldsData = yieldsApiData.data;
            console.log('✅ Yields data loaded from API');
      yieldsFallback = false;
          }
        }

        // Process central bank data
        let centralBankData: CentralBankStatement[] = []; // fallback to empty for mock
        if (centralBankRes && centralBankRes.ok) {
          const cbApiData = await centralBankRes.json();
          if (cbApiData.data && cbApiData.data.length > 0) {
            centralBankData = cbApiData.data;
            console.log('✅ Central Bank data loaded from API');
          }
        }

        // Process GDP data
    let gdpData = generateGDPData(); // fallback
        if (gdpRes && gdpRes.ok) {
          const gdpApiData = await gdpRes.json();
          if (gdpApiData.data && gdpApiData.data.length > 0) {
            gdpData = gdpApiData.data;
            console.log('✅ GDP data loaded from API');
      gdpFallback = false;
          }
        }

        // Process trade data
    let tradeData = generateTradeData(); // fallback
        if (tradeRes && tradeRes.ok) {
          const tradeApiData = await tradeRes.json();
          if (tradeApiData.data && tradeApiData.data.length > 0) {
            tradeData = tradeApiData.data;
            console.log('✅ Trade data loaded from API');
      tradeFallback = false;
          }
        }

        // Process oil seasonality data
    let oilData = generateOilSeasonalityData(); // fallback
        if (oilRes && oilRes.ok) {
          const oilApiData = await oilRes.json();
          if (oilApiData.data && oilApiData.data.length > 0) {
            oilData = oilApiData.data;
            console.log('✅ Oil Seasonality data loaded from API');
      oilFallback = false;
          }
        }

        // Process agriculture data
        let agricultureData: CommodityData[] = [];
        if (agricultureRes && agricultureRes.ok) {
          const agriApiData = await agricultureRes.json();
          if (agriApiData.success && agriApiData.data && agriApiData.data.length > 0) {
            agricultureData = agriApiData.data;
            console.log('✅ Agriculture data loaded from API');
          }
        }

        // Process metals data
        let metalsData: MetalData[] = [];
        if (metalsRes && metalsRes.ok) {
          const metalsApiData = await metalsRes.json();
          if (metalsApiData.success && metalsApiData.data && metalsApiData.data.length > 0) {
            metalsData = metalsApiData.data;
            console.log('✅ Metals data loaded from API');
          }
        }

        // Process PMI data
    let pmiData = generatePMIData(); // fallback
        if (pmiRes && pmiRes.ok) {
          const pmiApiData = await pmiRes.json();
          if (pmiApiData.success && pmiApiData.data && pmiApiData.data.length > 0) {
            pmiData = pmiApiData.data;
            console.log('✅ PMI data loaded from API');
      pmiFallback = false;
          }
        }

        // Process stocks data
    let stocksData: StockValuationData[] = generateStocksFallback();
        if (stocksRes && stocksRes.ok) {
          try {
            const stocksApiData = await stocksRes.json();
            if (stocksApiData.success && stocksApiData.data && stocksApiData.data.length > 0) {
              stocksData = stocksApiData.data;
              console.log('✅ Stocks data loaded from API');
      stocksFallback = false;
            } else {
              console.log('ℹ️ Stocks API empty -> using fallback');
            }
          } catch { console.log('ℹ️ Stocks API parse failed -> using fallback'); }
        }

        // Process energy data
    let energyData: EnergyData[] = generateEnergyFallback();
        if (energyRes && energyRes.ok) {
          try {
            const energyApiData = await energyRes.json();
            if (energyApiData.success && energyApiData.data && energyApiData.data.length > 0) {
              energyData = energyApiData.data;
              console.log('✅ Energy data loaded from API');
      energyFallback = false;
            } else {
              console.log('ℹ️ Energy API empty -> using fallback');
            }
          } catch { console.log('ℹ️ Energy API parse failed -> using fallback'); }
        }

        // Process real estate data
    let realEstateData: RealEstateData[] = generateRealEstateFallback();
        if (realEstateRes && realEstateRes.ok) {
          try {
            const realEstateApiData = await realEstateRes.json();
            if (realEstateApiData.success && realEstateApiData.data && realEstateApiData.data.length > 0) {
              realEstateData = realEstateApiData.data;
              console.log('✅ Real Estate data loaded from API');
      realEstateFallback = false;
            } else {
              console.log('ℹ️ Real Estate API empty -> using fallback');
            }
          } catch { console.log('ℹ️ Real Estate API parse failed -> using fallback'); }
        }

        // Process currencies data
    let currenciesData: CurrencyData[] = generateCurrenciesFallback();
        if (currenciesRes && currenciesRes.ok) {
          try {
            const currenciesApiData = await currenciesRes.json();
            if (currenciesApiData.success && currenciesApiData.data && currenciesApiData.data.length > 0) {
              currenciesData = currenciesApiData.data;
              console.log('✅ Currencies data loaded from API');
      currenciesFallback = false;
            } else {
              console.log('ℹ️ Currencies API empty -> using fallback');
            }
          } catch { console.log('ℹ️ Currencies API parse failed -> using fallback'); }
        }

        // Process P/E Predictor data
        let pePredictorData: PEPredictorData | null = null;
        if (pePredictorRes && pePredictorRes.ok) {
          const peApiData = await pePredictorRes.json();
          if (peApiData.success && peApiData.data) {
            pePredictorData = peApiData.data;
            console.log('✅ P/E Predictor data loaded from API');
          }
        }

        // Process Fed Dot Plot (SEP) data
        let fedDotData: any[] = [];
        let fedDotSource = '';
        if (fedDotRes && fedDotRes.ok) {
          try {
            const dotApi = await fedDotRes.json();
            const horizons = dotApi?.data?.horizons || dotApi?.data || [];
            if (Array.isArray(horizons) && horizons.length > 0) {
              fedDotData = horizons;
              fedDotSource = dotApi?.source || 'SEP dataset';
              console.log('✅ Fed Dot Plot data loaded from API');
            }
          } catch { console.warn('⚠️ Fed Dot Plot API parse failed'); }
        }

        // Process FedWatch data
        let fedwatchData: FedWatchMeeting[] = generateFedWatchData();
        if (fedwatchRes && fedwatchRes.ok) {
          const fwApi = await fedwatchRes.json();
            if (fwApi.success && fwApi.data && fwApi.data.length>0) {
              fedwatchData = fwApi.data;
              console.log('✅ FedWatch data loaded from API');
            }
        }

        // Process Fed Tools (FRED) data
        let fedToolsData: any[] = [];
        if (fedToolsRes && fedToolsRes.ok) {
          try {
            const ftApi = await fedToolsRes.json();
            if (ftApi.success && ftApi.data && ftApi.data.length > 0) {
              fedToolsData = ftApi.data;
              console.log('✅ Fed Tools (FRED) data loaded from API');
            }
          } catch (e) { console.warn('⚠️ Fed Tools API parse failed'); }
        }

        // Process Global Recession Probability
        let recessionData: any = null;
        if (recessionRes && recessionRes.ok) {
          try {
            const rj = await recessionRes.json();
            if (rj.success && (rj.latest || rj.history)) {
              recessionData = rj;
              console.log('✅ Global Recession Probability loaded');
            }
          } catch (e) { console.warn('⚠️ Recession API parse failed'); }
        }

        // Process COT Flow data
        let cotFlowData: COTFlowRecord[] = generateCOTFlowFallback();
        if (cotFlowRes && cotFlowRes.ok) {
          try {
            const cotApi = await cotFlowRes.json();
            if (cotApi.success && cotApi.data && cotApi.data.length > 0) {
              cotFlowData = cotApi.data;
              console.log('✅ COT Flow data loaded from API');
            }
          } catch (e) {
            console.warn('⚠️ COT Flow API parse failed, using fallback');
          }
        }

        // Process Geopolitical Risk data (with synthetic fallback if unavailable)
        let geoRiskFallback = true;
        let geoRiskData: GeoRiskPoint[] = generateGeoRiskFallback();
        if (geoRiskRes && geoRiskRes.ok) {
          try {
            const geoApi = await geoRiskRes.json();
            if (geoApi.success && geoApi.data && geoApi.data.length > 0) {
              geoRiskData = geoApi.data;
              geoRiskFallback = false;
              console.log('✅ Geopolitical Risk data loaded from API');
            } else {
              console.log('ℹ️ Geo Risk API unavailable -> using fallback');
            }
          } catch (e) {
            console.warn('⚠️ Geo Risk API parse failed, using fallback');
          }
        } else {
          console.log('ℹ️ Geo Risk endpoint not fetched or unavailable -> using fallback');
        }

        const widgetData: WidgetData[] = [
          {
            id: 'population',
            title: 'Global Population Growth',
            data: populationData,
            aiInsight: generateAIInsight('population', populationData),
            lastUpdated: new Date().toISOString(),
            source: 'World Bank',
            fallback: populationFallback
          },
          {
            id: 'debt',
            title: 'Government Debt Heatmap',
            data: debtData,
            aiInsight: generateAIInsight('debt', debtData),
            lastUpdated: new Date().toISOString(),
            source: 'World Bank + OECD',
            fallback: debtFallback
          },
          {
            id: 'yields',
            title: 'Global Yield Curves',
            data: yieldsData,
            aiInsight: generateAIInsight('yields', yieldsData),
            lastUpdated: new Date().toISOString(),
            source: 'Internal / Aggregated',
            fallback: yieldsFallback
          },
          {
            id: 'country_metrics',
            title: 'Country P/E vs Dividend Yield',
            data: generateCountryMetrics(),
            aiInsight: generateAIInsight('country_metrics', null),
            lastUpdated: new Date().toISOString(),
            source: 'Composite (valuation sample)',
            fallback: true
          },
          {
            id: 'sectors',
            title: 'Sector Performance Matrix',
            data: generateSectorMetrics(),
            aiInsight: generateAIInsight('sectors', null),
            lastUpdated: new Date().toISOString(),
            source: 'Composite (sector sample)',
            fallback: true
          },
          {
            id: 'central_bank',
            title: 'Central Bank Statements',
            data: centralBankData,
            aiInsight: generateAIInsight('central_bank', centralBankData),
            lastUpdated: new Date().toISOString(),
            source: 'Central Bank Releases',
            fallback: centralBankData.length === 0
          },
          {
            id: 'gdp',
            title: 'GDP Growth Heatmap',
            data: gdpData,
            aiInsight: generateAIInsight('gdp', gdpData),
            lastUpdated: new Date().toISOString(),
            source: 'World Bank',
            fallback: gdpFallback
          },
          {
            id: 'trade',
            title: 'Global Trade Flows',
            data: tradeData,
            aiInsight: generateAIInsight('trade', tradeData),
            lastUpdated: new Date().toISOString(),
            source: 'UN / WTO Composite',
            fallback: tradeFallback
          },
          {
            id: 'oil_seasonality',
            title: 'Oil Price Seasonality',
            data: oilData,
            aiInsight: generateAIInsight('oil_seasonality', oilData),
            lastUpdated: new Date().toISOString(),
            source: 'Energy Markets',
            fallback: oilFallback
          },
          {
            id: 'agriculture',
            title: 'Agricultural Commodities',
            data: agricultureData,
            aiInsight: generateAIInsight('agriculture', agricultureData),
            lastUpdated: new Date().toISOString(),
            source: 'Commodity Markets',
            fallback: agricultureData.length === 0
          },
          {
            id: 'metals',
            title: 'Precious Metals',
            data: metalsData,
            aiInsight: generateAIInsight('metals', metalsData),
            lastUpdated: new Date().toISOString(),
            source: 'Commodity Markets',
            fallback: metalsData.length === 0
          },
          {
            id: 'pmi',
            title: 'Manufacturing PMI',
            data: pmiData,
            aiInsight: generateAIInsight('pmi', pmiData),
            lastUpdated: new Date().toISOString(),
            source: 'S&P Global / National Sources',
            fallback: pmiFallback
          },
          {
            id: 'stocks',
            title: 'Stock Valuations',
            data: stocksData,
            aiInsight: generateAIInsight('stocks', stocksData),
            lastUpdated: new Date().toISOString(),
            source: 'Market Data (Tiingo/Yahoo)',
            fallback: stocksFallback
          },
          {
            id: 'energy',
            title: 'Energy Markets',
            data: energyData,
            aiInsight: generateAIInsight('energy', energyData),
            lastUpdated: new Date().toISOString(),
            source: 'Commodity Markets',
            fallback: energyFallback
          },
          {
            id: 'real_estate',
            title: 'Real Estate Markets',
            data: realEstateData,
            aiInsight: generateAIInsight('real_estate', realEstateData),
            lastUpdated: new Date().toISOString(),
            source: 'Housing Market Data',
            fallback: realEstateFallback
          },
          {
            id: 'currencies',
            title: 'Currency Strength',
            data: currenciesData,
            aiInsight: generateAIInsight('currencies', currenciesData),
            lastUpdated: new Date().toISOString(),
            source: 'FX Markets',
            fallback: currenciesFallback
          },
          {
            id: 'spx_historical',
            title: 'S&P 500 Historical',
            data: [], // Non servono dati specifici, usa il componente SPXChart
            aiInsight: generateAIInsight('spx_historical', null),
            lastUpdated: new Date().toISOString()
          },
          {
            id: 'pe_predictor',
            title: 'P/E Ratio Predictor',
            data: pePredictorData,
            aiInsight: generateAIInsight('pe_predictor', pePredictorData),
            lastUpdated: new Date().toISOString()
          },
          {
            id: 'fed_dot_plot',
            title: 'Fed Dot Plot (SEP)',
            data: fedDotData,
            aiInsight: {
              title: 'Policy Path Medians',
              content: 'Dot plot medians by horizon from the FOMC Summary of Economic Projections, with central tendency ranges.',
              sentiment: 'neutral',
              confidence: 88,
              risks: ['Projection uncertainty','Inflation persistence','Growth downside'],
              opportunities: ['Duration timing','Policy path trades','Curve positioning']
            },
            lastUpdated: new Date().toISOString(),
            source: fedDotSource,
            fallback: false
          },
          {
            id: 'fedwatch',
            title: 'US FedWatch Rate Forecast',
            data: fedwatchData,
            aiInsight: generateAIInsight('fedwatch', fedwatchData),
            lastUpdated: new Date().toISOString()
          },
          {
            id: 'fed_tools',
            title: 'Fed Tools (FRED)',
            data: fedToolsData,
            aiInsight: {
              title: 'Policy Tools Snapshot',
              content: 'Current stance via balance sheet, IORB, RRP, DFF and SOFR. No synthetic data; series sourced from FRED.',
              sentiment: 'neutral',
              confidence: 90,
              risks: ['Policy path uncertainty','Liquidity swings in RRP','Term premium volatility'],
              opportunities: ['Timing duration shifts','Funding rate hedges','Liquidity-aware positioning']
            },
            lastUpdated: new Date().toISOString(),
            source: 'FRED',
            fallback: false
          },
          {
            id: 'recession_prob',
            title: 'Global Recession Probability',
            data: recessionData,
            aiInsight: {
              title: 'Cycle Risk Assessment',
              content: 'Composite probability from NBER, yield curve, Industrial Production momentum, Unemployment momentum, and Consumer Sentiment. 100% real FRED series.',
              sentiment: 'neutral',
              confidence: 85,
              risks: ['Deep inversion persistence','Labor market deterioration','Production slowdown'],
              opportunities: ['Duration extension on peaks','Defensive sector tilts','Hedge deployment timing']
            },
            lastUpdated: new Date().toISOString(),
            source: 'FRED',
            fallback: false
          },
          {
            id: 'cot_flow',
            title: 'Global COT Flow',
            data: cotFlowData,
            aiInsight: generateAIInsight('cot_flow', cotFlowData),
            lastUpdated: new Date().toISOString()
          },
          {
            id: 'geopolitical_risk',
            title: 'Geopolitical Risk Index',
            data: geoRiskData,
            aiInsight: generateAIInsight('geopolitical_risk', geoRiskData),
            lastUpdated: new Date().toISOString(),
            fallback: geoRiskFallback
          }
        ];
        
        setWidgets(widgetData);
        console.log('✅ Visual AI dashboard initialized with real data');
        
      } catch (error) {
        console.error('❌ Error initializing widgets:', error);
        // Fallback to mock data
        const fallbackWidgets: WidgetData[] = [
          {
            id: 'population_fallback',
            title: 'Global Population Growth',
            data: generatePopulationData(),
            aiInsight: generateAIInsight('population', null),
            lastUpdated: new Date().toISOString()
          },
          {
            id: 'debt_fallback',
            title: 'Government Debt Heatmap',
            data: generateDebtData(),
            aiInsight: generateAIInsight('debt', null),
            lastUpdated: new Date().toISOString()
          },
          {
            id: 'yields_fallback',
            title: 'Global Yield Curves',
            data: generateYieldCurveData(),
            aiInsight: generateAIInsight('yields', null),
            lastUpdated: new Date().toISOString()
          },
          {
            id: 'country_metrics_fallback',
            title: 'Country P/E vs Dividend Yield',
            data: generateCountryMetrics(),
            aiInsight: generateAIInsight('country_metrics', null),
            lastUpdated: new Date().toISOString()
          },
          {
            id: 'sectors_fallback',
            title: 'Sector Performance Matrix',
            data: generateSectorMetrics(),
            aiInsight: generateAIInsight('sectors', null),
            lastUpdated: new Date().toISOString()
          },
          {
            id: 'pmi_fallback',
            title: 'Global PMI Heatmap',
            data: generatePMIData(),
            aiInsight: generateAIInsight('pmi', null),
            lastUpdated: new Date().toISOString()
          }
        ];
        setWidgets(fallbackWidgets);
      } finally {
        setLoading(false);
      }
    };

    initializeWidgets();
  }, [refreshTick, activeTab]);

  // Auto-refresh every 10 minutes without showing loading spinner
  useEffect(() => {
    const REFRESH_MS = 600_000; // 10 minutes
    const id = setInterval(() => setRefreshTick((t) => t + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  // Render detailed chart
  const renderDetailedChart = (widget: WidgetData) => {
    console.log(`🔍 Rendering chart for widget: "${widget?.id}" with data:`, widget?.data ? 'HAS DATA' : 'NO DATA');
    
    if (!widget || !widget.data) {
      console.log(`❌ Widget "${widget?.id}" has no data`);
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">No data available</p>
        </div>
      );
    }

    switch (widget.id) {
      case 'recession_prob': {
        const hist = widget.data?.history || [];
        const latest = widget.data?.latest;
        const data = hist.map((h: any) => ({ date: h.date, value: h.probability }));
        return (
          <div className="w-full h-full flex flex-col">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-2xl font-bold text-white">{latest ? `${latest.probability}%` : '—'}</div>
              <div className="text-xs text-gray-400">{latest?.date?.slice(0,10)}</div>
            </div>
            <LazyVisible minHeight={120}>
              <ProbabilitySparkline data={data} />
            </LazyVisible>
          </div>
        );
      }
      case 'population':
      case 'population_fallback':
        return (
          <LazyVisible minHeight={300}>
            <PopulationGrowthBarChart data={widget.data} />
          </LazyVisible>
        );
      
      case 'debt':
      case 'debt_fallback':
        return (
          <LazyVisible minHeight={320}>
            <DebtToGDPBarChart data={widget.data} />
          </LazyVisible>
        );
      
      case 'yields':
      case 'yields_fallback':
        return (
          <LineChart data={widget.data}>
            <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
            <XAxis dataKey="maturity" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#f9fafb' }}
            />
            <Line type="monotone" dataKey="us" stroke="#22d3ee" strokeWidth={3} name="US" />
            <Line type="monotone" dataKey="eu" stroke="#a855f7" strokeWidth={3} name="EU" />
            <Line type="monotone" dataKey="em" stroke="#f59e0b" strokeWidth={3} name="EM" />
          </LineChart>
        );
      
      case 'country_metrics':
      case 'country_metrics_fallback':
        return (
          <ScatterChart data={widget.data}>
            <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
            <XAxis dataKey={countryAxisMetric} stroke="#9ca3af" name={countryAxisMetric === 'pe' ? 'P/E Ratio' : 'Dividend Yield %'} />
            <YAxis dataKey={countryAxisMetric === 'pe' ? 'dividendYield' : 'pe'} stroke="#9ca3af" name={countryAxisMetric === 'pe' ? 'Dividend Yield %' : 'P/E Ratio'} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#000000', 
                border: '3px solid #3b82f6', 
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                padding: '24px',
                minWidth: '380px',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none'
              }}
              labelStyle={{ 
                color: '#ffffff', 
                fontSize: '18px', 
                fontWeight: '700',
                textShadow: 'none',
                WebkitFontSmoothing: 'antialiased'
              }}
              cursor={{ stroke: '#3b82f6', strokeWidth: 3, strokeOpacity: 0.8 }}
              formatter={(value, name, props) => {
                const data = props.payload;
                return [
                  <div key="detailed-country-tooltip" style={{ 
                    color: '#ffffff',
                    WebkitFontSmoothing: 'antialiased',
                    textRendering: 'optimizeLegibility'
                  }}>
                    <div style={{ 
                      color: '#ffffff', 
                      fontSize: '20px', 
                      fontWeight: '800', 
                      marginBottom: '20px', 
                      textAlign: 'center',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#1e40af',
                      border: '2px solid #3b82f6'
                    }}>
                      🏛️ {data?.country}
                    </div>
                    
                    <div style={{ 
                      color: '#ffffff', 
                      marginBottom: '14px', 
                      fontSize: '16px', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '2px solid #374151'
                    }}>
                      <span style={{ color: '#a855f7', fontWeight: '600' }}>📊 P/E Ratio:</span>
                      <span style={{ 
                        color: '#ffffff', 
                        fontWeight: '700', 
                        fontSize: '18px',
                        backgroundColor: '#374151',
                        padding: '6px 16px',
                        borderRadius: '8px',
                        border: '2px solid #6b7280'
                      }}>
                        {data?.pe}
                      </span>
                    </div>
                    
                    <div style={{ 
                      color: '#ffffff', 
                      marginBottom: '14px', 
                      fontSize: '16px', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '2px solid #374151'
                    }}>
                      <span style={{ color: '#f59e0b', fontWeight: '600' }}>💰 Dividend Yield:</span>
                      <span style={{ 
                        color: '#ffffff', 
                        fontWeight: '700', 
                        fontSize: '18px',
                        backgroundColor: '#374151',
                        padding: '6px 16px',
                        borderRadius: '8px',
                        border: '2px solid #6b7280'
                      }}>
                        {data?.dividendYield}%
                      </span>
                    </div>
                    
                    <div style={{ 
                      color: '#ffffff', 
                      marginBottom: '20px', 
                      fontSize: '16px', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '2px solid #374151'
                    }}>
                      <span style={{ color: '#10b981', fontWeight: '600' }}>🌍 Market Cap:</span>
                      <span style={{ 
                        color: '#ffffff', 
                        fontWeight: '700', 
                        fontSize: '18px',
                        backgroundColor: '#374151',
                        padding: '6px 16px',
                        borderRadius: '8px',
                        border: '2px solid #6b7280'
                      }}>
                        ${data?.marketCap}T
                      </span>
                    </div>
                    
                    <div style={{ 
                      color: '#ffffff',
                      fontSize: '17px',
                      textAlign: 'center',
                      marginTop: '16px',
                      padding: '16px',
                      borderRadius: '10px',
                      backgroundColor: data?.valuation === 'undervalued' ? '#059669' : 
                                      data?.valuation === 'overvalued' ? '#dc2626' : '#d97706',
                      border: `3px solid ${data?.valuation === 'undervalued' ? '#10b981' : 
                                          data?.valuation === 'overvalued' ? '#ef4444' : '#f59e0b'}`,
                      fontWeight: '700'
                    }}>
                      📈 {data?.valuation?.toUpperCase()}
                      <div style={{ 
                        fontSize: '13px', 
                        marginTop: '8px', 
                        opacity: 0.95,
                        fontWeight: '500'
                      }}>
                        {data?.valuation === 'undervalued' ? 'Excellent Investment Opportunity' : 
                         data?.valuation === 'overvalued' ? 'Consider Waiting for Better Entry' : 'Fair Market Value'}
                      </div>
                    </div>
                  </div>
                ];
              }}
            />
            <Scatter dataKey="marketCap" name="Market Cap">
              {widget.data.map((entry: CountryMetrics, index: number) => (
                <Cell key={`cell-${index}`} fill={
                  entry.valuation === 'undervalued' ? '#22c55e' :
                  entry.valuation === 'fair' ? '#eab308' : '#ef4444'
                } />
              ))}
            </Scatter>
          </ScatterChart>
        );
      
      case 'sectors':
      case 'sectors_fallback':
        const sortedSectors = widget.data.slice().sort((a: SectorMetrics, b: SectorMetrics) =>
          sectorSortDir === 'desc' ? (b[sectorMetric] as number) - (a[sectorMetric] as number) : (a[sectorMetric] as number) - (b[sectorMetric] as number)
        );
        return (
          <BarChart data={sortedSectors}>
            <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
            <XAxis dataKey="sector" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '3px solid #059669', 
                borderRadius: '16px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9)',
                padding: '24px',
                minWidth: '380px'
              }}
              labelStyle={{ color: '#f9fafb', fontSize: '18px', fontWeight: 'bold' }}
              cursor={{ fill: 'rgba(34, 197, 94, 0.15)' }}
              formatter={(value, name, props) => {
                const data = props.payload;
                return [
                  <div key="detailed-sector-tooltip" style={{ color: '#ffffff' }}>
                    <div style={{ color: '#22d3ee', fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>
                      🏢 {data?.sector}
                    </div>
                    <div style={{ color: '#10b981', marginBottom: '10px', fontSize: '16px' }}>
                      📈 1Y Performance: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>{value}%</span>
                    </div>
                    <div style={{ color: '#06b6d4', marginBottom: '10px', fontSize: '16px' }}>
                      📅 6M Performance: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>{data?.performance6M}%</span>
                    </div>
                    <div style={{ color: '#8b5cf6', marginBottom: '10px', fontSize: '16px' }}>
                      📆 1M Performance: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>{data?.performance1M}%</span>
                    </div>
                    <div style={{ color: '#a855f7', marginBottom: '10px', fontSize: '16px' }}>
                      📊 P/E Ratio: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>{data?.pe}</span>
                    </div>
                    <div style={{ color: '#f59e0b', marginBottom: '10px', fontSize: '16px' }}>
                      💰 Dividend Yield: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>{data?.dividendYield}%</span>
                    </div>
                    <div style={{ 
                      color: data?.type === 'growth' ? '#22d3ee' : 
                            data?.type === 'defensive' ? '#22c55e' : '#f59e0b',
                      fontSize: '16px',
                      textAlign: 'center',
                      marginTop: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      border: `2px solid ${data?.type === 'growth' ? '#22d3ee' : 
                                          data?.type === 'defensive' ? '#22c55e' : '#f59e0b'}`
                    }}>
                      🎯 <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{data?.type?.toUpperCase()}</span>
                    </div>
                  </div>
                ];
              }}
            />
            <Bar dataKey={sectorMetric} name={sectorMetric === 'performance1Y' ? '1Y %' : sectorMetric === 'performance6M' ? '6M %' : '1M %'}>
              {sortedSectors.map((entry: SectorMetrics, index: number) => (
                <Cell key={`cell-${index}`} fill={
                  entry.type === 'growth' ? '#22d3ee' :
                  entry.type === 'defensive' ? '#22c55e' : '#f59e0b'
                } />
              ))}
            </Bar>
          </BarChart>
        );
      
      case 'pmi':
      case 'pmi_fallback':
        return (
          <BarChart data={widget.data}>
            <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
            <XAxis dataKey="country" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
            <YAxis domain={[40, 60]} stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '3px solid #dc2626', 
                borderRadius: '16px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9)',
                padding: '24px',
                minWidth: '350px'
              }}
              labelStyle={{ color: '#f9fafb', fontSize: '18px', fontWeight: 'bold' }}
              cursor={{ fill: 'rgba(239, 68, 68, 0.15)' }}
              formatter={(value, name, props) => {
                const data = props.payload;
                const isExpansion = typeof value === 'number' && value >= 50;
                return [
                  <div key="detailed-pmi-tooltip" style={{ color: '#ffffff' }}>
                    <div style={{ color: '#22d3ee', fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>
                      🏭 {data?.country}
                    </div>
                    <div style={{ color: '#f59e0b', marginBottom: '10px', fontSize: '16px' }}>
                      📊 PMI Composite: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>{value}</span>
                    </div>
                    <div style={{ color: '#a855f7', marginBottom: '10px', fontSize: '16px' }}>
                      🏭 Manufacturing: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>{data?.manufacturing}</span>
                    </div>
                    <div style={{ color: '#06b6d4', marginBottom: '10px', fontSize: '16px' }}>
                      🏪 Services: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>{data?.services}</span>
                    </div>
                    <div style={{ color: '#10b981', marginBottom: '16px', fontSize: '16px' }}>
                      📈 Trend: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>{data?.trend?.toUpperCase()}</span>
                    </div>
                    <div style={{ 
                      color: isExpansion ? '#22c55e' : '#ef4444',
                      fontSize: '18px',
                      textAlign: 'center',
                      marginTop: '16px',
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: isExpansion ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                      border: `3px solid ${isExpansion ? '#22c55e' : '#ef4444'}`
                    }}>
                      {isExpansion ? '🟢 EXPANSION' : '🔴 CONTRACTION'}
                      <div style={{ fontSize: '14px', marginTop: '6px', opacity: 0.9 }}>
                        {isExpansion ? 'Economic Growth Mode' : 'Economic Slowdown'}
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
                        Threshold: 50 (Current: {value})
                      </div>
                    </div>
                  </div>
                ];
              }}
            />
            <Bar dataKey="composite" name="PMI Composite">
              {widget.data.map((entry: PMIData, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.composite >= 50 ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        );
      
      case 'central_bank': {
        const chartData = (widget.data as CentralBankStatement[])
          .filter(s => typeof s.currentRate === 'number')
          .slice(0, 8);
        return (
          <div className="space-y-4">
            {chartData.length > 0 && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-xs text-gray-300 mb-2">Current Policy Rates</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3,3" stroke="#ffffff15" />
                    <XAxis dataKey="bank" stroke="#9ca3af" fontSize={11} angle={-30} textAnchor="end" height={60} />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '2px solid #334155', borderRadius: '10px' }}
                      labelStyle={{ color: '#e5e7eb', fontWeight: 700 }}
                      formatter={(v:any, _n:any, p:any) => [ `${Number(v).toFixed(2)}%`, p?.payload?.bank ]}
                    />
                    <Bar dataKey="currentRate" radius={[4,4,0,0]}>
                      {chartData.map((s, i) => (
                        <Cell key={s.id || i} fill={
                          s.sentiment === 'hawkish' ? '#ef4444' :
                          s.sentiment === 'dovish' ? '#22c55e' : '#3b82f6'
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {(widget.data as CentralBankStatement[]).slice(0, 3).map((statement: CentralBankStatement) => (
              <div key={statement.id} className={`p-4 rounded-lg border-l-4 ${
                statement.sentiment === 'hawkish' ? 'border-red-400 bg-red-500/10' :
                statement.sentiment === 'dovish' ? 'border-green-400 bg-green-500/10' :
                'border-blue-400 bg-blue-500/10'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-300">{statement.bank}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    statement.sentiment === 'hawkish' ? 'text-red-300 bg-red-500/20' :
                    statement.sentiment === 'dovish' ? 'text-green-300 bg-green-500/20' :
                    'text-blue-300 bg-blue-500/20'
                  }`}>
                    {statement.sentiment.toUpperCase()}
                  </span>
                </div>
                <p className="text-white text-sm mb-2">{statement.title}</p>
                <div className="flex items-center gap-3 text-xs text-gray-300">
                  {typeof statement.currentRate === 'number' && (
                    <span>Rate: <span className="text-white font-semibold">{statement.currentRate.toFixed(2)}%</span></span>
                  )}
                  {typeof statement.rateChange === 'number' && (
                    <span>Δ: <span className={`font-semibold ${statement.rateChange>0?'text-red-300':statement.rateChange<0?'text-green-300':'text-gray-300'}`}>{statement.rateChange>0?'+':''}{statement.rateChange} pp</span></span>
                  )}
                  <span>{statement.relativeDate}</span>
                </div>
              </div>
            ))}
          </div>
        );
      }

      case 'gdp':
        return (
          <BarChart data={widget.data}>
            <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
            <XAxis dataKey="country" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '3px solid #10b981', 
                borderRadius: '16px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9)',
                padding: '24px',
                minWidth: '350px'
              }}
              labelStyle={{ color: '#f9fafb', fontSize: '18px', fontWeight: 'bold' }}
              cursor={{ fill: 'rgba(16, 185, 129, 0.15)' }}
              formatter={(value, name, props) => {
                const data = props.payload;
                return [
                  <div key="gdp-tooltip" style={{ color: '#ffffff' }}>
                    <div style={{ color: '#22d3ee', fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>
                      🌍 {data?.country}
                    </div>
                    <div style={{ color: '#10b981', marginBottom: '10px', fontSize: '16px' }}>
                      📈 Annual Growth: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>{formatPercent(value,2)}</span>
                    </div>
                    <div style={{ color: '#06b6d4', marginBottom: '10px', fontSize: '16px' }}>
                      📊 Quarterly Growth: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>{formatPercent(data?.quarterlyGrowth,2)}</span>
                    </div>
                    <div style={{ color: '#f59e0b', marginBottom: '16px', fontSize: '16px' }}>
                      💰 GDP per Capita: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>${formatNumber(data?.gdpPerCapita,0)}</span>
                    </div>
                    <div style={{ 
                      color: data?.trend === 'accelerating' ? '#22c55e' : 
                            data?.trend === 'decelerating' ? '#ef4444' : '#f59e0b',
                      fontSize: '18px',
                      textAlign: 'center',
                      marginTop: '16px',
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: data?.trend === 'accelerating' ? 'rgba(34, 197, 94, 0.25)' : 
                                      data?.trend === 'decelerating' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                      border: `3px solid ${data?.trend === 'accelerating' ? '#22c55e' : 
                                          data?.trend === 'decelerating' ? '#ef4444' : '#f59e0b'}`
                    }}>
                      📈 <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{data?.trend?.toUpperCase()}</span>
                    </div>
                  </div>
                ];
              }}
            />
            <Bar dataKey="gdpGrowth" name="GDP Growth %">
              {widget.data.map((entry: GDPData, index: number) => (
                <Cell key={`cell-${index}`} fill={
                  entry.trend === 'accelerating' ? '#22c55e' :
                  entry.trend === 'decelerating' ? '#ef4444' : '#f59e0b'
                } />
              ))}
            </Bar>
          </BarChart>
        );

      case 'trade':
        return (
          <BarChart data={widget.data}>
            <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
            <XAxis dataKey="country" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '3px solid #8b5cf6', 
                borderRadius: '16px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9)',
                padding: '24px',
                minWidth: '380px'
              }}
              labelStyle={{ color: '#f9fafb', fontSize: '18px', fontWeight: 'bold' }}
              cursor={{ fill: 'rgba(139, 92, 246, 0.15)' }}
              formatter={(value, name, props) => {
                const data = props.payload;
                return [
                  <div key="trade-tooltip" style={{ color: '#ffffff' }}>
                    <div style={{ color: '#22d3ee', fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>
                      🌐 {data?.country}
                    </div>
                    <div style={{ color: '#10b981', marginBottom: '10px', fontSize: '16px' }}>
                      📤 Exports: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>${data?.exports}B</span>
                    </div>
                    <div style={{ color: '#ef4444', marginBottom: '10px', fontSize: '16px' }}>
                      📥 Imports: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>${data?.imports}B</span>
                    </div>
                    <div style={{ 
                      color: data?.tradeBalance >= 0 ? '#22c55e' : '#ef4444', 
                      marginBottom: '16px', 
                      fontSize: '16px' 
                    }}>
                      ⚖️ Trade Balance: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>${data?.tradeBalance}B</span>
                    </div>
                    <div style={{ fontSize: '14px', marginTop: '12px' }}>
                      <div style={{ color: '#a855f7', marginBottom: '6px' }}>
                        🔝 Main Exports: {data?.mainExports?.slice(0, 2).join(', ')}
                      </div>
                      <div style={{ color: '#f59e0b' }}>
                        🤝 Top Partners: {data?.tradePartners?.slice(0, 2).join(', ')}
                      </div>
                    </div>
                  </div>
                ];
              }}
            />
            <Bar dataKey="tradeBalance" name="Trade Balance $B">
              {widget.data.map((entry: TradeData, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.tradeBalance >= 0 ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        );

      case 'oil_seasonality':
        return (
          <LineChart data={widget.data}>
            <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
            <XAxis dataKey="month" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '3px solid #f59e0b', 
                borderRadius: '16px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9)',
                padding: '24px',
                minWidth: '350px'
              }}
              labelStyle={{ color: '#f9fafb', fontSize: '18px', fontWeight: 'bold' }}
              cursor={{ stroke: '#f59e0b', strokeWidth: 2 }}
              formatter={(value, name, props) => {
                const data = props.payload;
                return [
                  <div key="oil-tooltip" style={{ color: '#ffffff' }}>
                    <div style={{ color: '#22d3ee', fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>
                      🛢️ {data?.month} Oil Prices
                    </div>
                    <div style={{ color: '#f59e0b', marginBottom: '10px', fontSize: '16px' }}>
                      💰 Average Price: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>${value}/barrel</span>
                    </div>
                    <div style={{ color: '#ef4444', marginBottom: '10px', fontSize: '16px' }}>
                      📊 Volatility: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>{data?.volatility}%</span>
                    </div>
                    <div style={{ color: '#a855f7', marginBottom: '16px', fontSize: '16px' }}>
                      📈 Range: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>${data?.historicalRange?.min} - ${data?.historicalRange?.max}</span>
                    </div>
                    <div style={{ 
                      color: data?.seasonalTrend === 'bullish' ? '#22c55e' : 
                            data?.seasonalTrend === 'bearish' ? '#ef4444' : '#f59e0b',
                      fontSize: '18px',
                      textAlign: 'center',
                      marginTop: '16px',
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: data?.seasonalTrend === 'bullish' ? 'rgba(34, 197, 94, 0.25)' : 
                                      data?.seasonalTrend === 'bearish' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                      border: `3px solid ${data?.seasonalTrend === 'bullish' ? '#22c55e' : 
                                          data?.seasonalTrend === 'bearish' ? '#ef4444' : '#f59e0b'}`
                    }}>
                      📈 <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{data?.seasonalTrend?.toUpperCase()}</span>
                    </div>
                  </div>
                ];
              }}
            />
            <Line type="monotone" dataKey="averagePrice" stroke="#f59e0b" strokeWidth={3} name="Average Price" />
          </LineChart>
        );
      

      
      case 'agriculture':
        return (
          <BarChart data={widget.data}>
            <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
            <XAxis dataKey="commodity" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#f9fafb' }}
            />
            <Bar dataKey="price" fill="#22c55e" />
          </BarChart>
        );
      
      case 'metals':
        return (
          <BarChart data={widget.data}>
            <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
            <XAxis dataKey="metal" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#f9fafb' }}
            />
            <Bar dataKey="price" fill="#f59e0b" />
          </BarChart>
        );
      
      case 'stocks':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={widget.data}>
              <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
              <XAxis dataKey="pe" stroke="#9ca3af" name="P/E Ratio" />
              <YAxis dataKey="dividendYield" stroke="#9ca3af" name="Dividend Yield %" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Scatter dataKey="marketCap" fill="#22d3ee" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      
      case 'energy':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={widget.data}>
              <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
              <XAxis dataKey="commodity" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Bar dataKey="price" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'fed_dot_plot': {
        type DotPt = { label: string; median: number; low: number; high: number; y: number; err: [number, number] };
        const horizons: DotPt[] = (widget.data || []).map((h: any): DotPt => {
          const label = h.label || h.key;
          const median = Number(h.median);
          const low = Number(h.centralTendencyLow ?? h.low ?? median);
          const high = Number(h.centralTendencyHigh ?? h.high ?? median);
          const errLow = Math.max(0, median - low);
          const errHigh = Math.max(0, high - median);
          return { label, median, low, high, y: median, err: [errLow, errHigh] };
        });
        if (!horizons.length) {
          return <div className="flex items-center justify-center h-full text-gray-400">Dot plot data not available</div>;
        }
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
              <XAxis type="category" dataKey="label" stroke="#9ca3af" allowDuplicatedCategory={false} />
              <YAxis type="number" dataKey="y" stroke="#9ca3af" unit="%" domain={[0, 'auto']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '2px solid #374151', borderRadius: '12px' }}
                labelStyle={{ color: '#f9fafb', fontWeight: 'bold' }}
                formatter={(value, _name, props:any) => {
                  const p = props?.payload || {};
                  return [ `${value}%`, `${p.label} (range ${p.low}-${p.high}%)` ]
                }}
              />
              <Scatter data={horizons} fill="#22d3ee">
                <ErrorBar dataKey="err" direction="y" stroke="#f59e0b" width={8} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );
      }
      
      case 'real_estate':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={widget.data}>
              <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
              <XAxis dataKey="city" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Bar dataKey="affordabilityIndex" name="Affordability Index">
                {widget.data.map((entry: RealEstateData, index: number) => (
                  <Cell key={`cell-${index}`} fill={
                    entry.bubbleRisk === 'low' ? '#22c55e' :
                    entry.bubbleRisk === 'medium' ? '#eab308' :
                    entry.bubbleRisk === 'high' ? '#f97316' : '#ef4444'
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'currencies':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={widget.data}>
              <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
              <XAxis dataKey="currencyCode" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Bar dataKey="strengthIndex" name="Strength Index">
                {widget.data.map((entry: CurrencyData, index: number) => (
                  <Cell key={`cell-${index}`} fill={
                    entry.trend === 'strengthening' ? '#22c55e' :
                    entry.trend === 'stable' ? '#eab308' : '#ef4444'
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'spx_historical':
        return (
          <div className="w-full h-full">
            <SPXChart compact={false} />
          </div>
        );
      
      case 'pe_predictor':
        if (!widget.data) {
          return (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">P/E Predictor data not available</p>
            </div>
          );
        }
        
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 space-y-8">
            {/* Current P/E Gauge */}
            <div className="text-center">
              <div className="text-6xl font-bold text-cyan-400 mb-4">
                {widget.data.currentPE?.toFixed(1)}
              </div>
              <div className="text-xl text-gray-300 mb-2">Current S&P 500 P/E Ratio</div>
              <div className="text-sm text-gray-400">
                {new Date(widget.data.date || '').toLocaleDateString()}
              </div>
            </div>
            
            {/* Predictions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
              {widget.data.predictions?.slice(0, 3).map((pred: any, index: number) => (
                <div key={index} className="bg-white/5 rounded-lg p-6 text-center border border-white/10">
                  <div className="text-2xl font-bold text-purple-400 mb-2">
                    {pred.predictedPE?.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-300 mb-2">
                    {pred.date} Prediction
                  </div>
                  <div className="text-xs text-gray-500">
                    Confidence: {pred.confidence?.toFixed(0)}%
                  </div>
                </div>
              )) || []}
            </div>
            
            {/* Model Info */}
            <div className="text-center bg-white/5 rounded-lg p-4 border border-white/10 max-w-md">
              <div className="text-lg font-semibold text-green-400 mb-2">
                AI Model Confidence
              </div>
              <div className="text-3xl font-bold text-green-400 mb-2">
                {widget.data.accuracy || 0}%
              </div>
              <div className="text-xs text-gray-400">
                LSTM Neural Network Analysis
              </div>
            </div>
          </div>
        );
      case 'fedwatch': {
        const meetings: FedWatchMeeting[] = widget.data || [];
        if (!meetings.length) {
          return (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">FedWatch data not available</p>
            </div>
          );
        }
        const flattened = meetings.flatMap(m => m.probabilities.map(p => ({ meeting: m.meetingLabel, rate: p.rate, probability: p.probability })));
        // Compute implied path (weighted average probability per meeting)
        const meetingSummary = meetings.map(m => {
          const weighted = m.probabilities.reduce((acc, p) => acc + (p.probability * parseFloat(p.rate.split('-')[0]) || 0), 0) / 100;
          return { label: m.meetingLabel, implied: weighted.toFixed(2), move: m.impliedMoveBps };
        });
        return (
          <div className="flex flex-col gap-8">
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flattened}>
                  <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                  <XAxis dataKey="rate" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '2px solid #374151', borderRadius: '12px' }}
                    labelStyle={{ color: '#f9fafb', fontWeight: 'bold' }}
                    formatter={(value, name, props) => [ `${value}%`, `${props.payload.meeting}` ]}
                  />
                  <Bar dataKey="probability">
                    {flattened.map((d,i)=>(<Cell key={i} fill={d.probability === Math.max(...flattened.filter(f=>f.meeting===d.meeting).map(f=>f.probability)) ? '#22c55e' : '#3b82f6'} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {meetingSummary.map(ms => (
                <div key={ms.label} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-sm text-gray-400 mb-1">{ms.label}</div>
                  <div className="text-xl font-bold text-cyan-400 mb-1">{ms.implied}%</div>
                  <div className={`text-xs font-medium ${ms.move < 0 ? 'text-green-400' : ms.move > 0 ? 'text-red-400' : 'text-gray-400'}`}>{ms.move>0?`+${ms.move}`:ms.move} bps implied</div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'cot_flow': {
        const cot: COTFlowRecord[] = widget.data || [];
        if (!cot.length) {
          return <div className="flex items-center justify-center h-full text-gray-400">COT Flow data not available</div>;
        }
        const barData = cot.map(r => ({ symbol: r.symbol, net: r.nonCommercialNet, change: r.changeNonCommercial, z: r.zScore, extreme: r.extreme }));
        const sortedDirectional = cot.slice().sort((a,b)=>Math.abs(b.changeNonCommercial)-Math.abs(a.changeNonCommercial)).slice(0,5);
        return (
          <div className="flex flex-col gap-8">
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                  <XAxis dataKey="symbol" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '2px solid #374151', borderRadius: '12px' }}
                    labelStyle={{ color: '#f9fafb', fontWeight: 'bold' }}
                    formatter={(value, name, props) => [ `${value}${name==='net'?'':' pts'}`, name==='net'?'Non-Comm Net': name==='z' ? 'Z-Score' : 'Weekly Δ' ]}
                  />
                  <Bar dataKey="net">
                    {barData.map((d,i)=>(<Cell key={i} fill={d.extreme ? (d.net>=0 ? '#16a34a':'#dc2626') : (d.net>=0?'#22c55e':'#ef4444')} stroke={d.extreme ? '#fbbf24':'none'} strokeWidth={d.extreme?2:0} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600"></span> Net Long</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600"></span> Net Short</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-700 border border-yellow-400"></span> Extreme Long (|z| ≥ 2)</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-700 border border-yellow-400"></span> Extreme Short (|z| ≥ 2)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {sortedDirectional.map(item => (
                <div key={item.symbol} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-sm text-gray-400 mb-1">{item.market}</div>
                  <div className="text-lg font-bold text-white mb-1">{item.symbol}</div>
                  <div className={`text-xs font-medium ${item.nonCommercialNet>=0?'text-green-400':'text-red-400'}`}>Net: {item.nonCommercialNet.toLocaleString()}</div>
                  <div className={`text-xs ${item.changeNonCommercial>=0?'text-green-300':'text-red-300'}`}>Δ: {item.changeNonCommercial>=0?'+':''}{item.changeNonCommercial.toLocaleString()}</div>
                  {item.zScore !== undefined && (
                    <div className={`text-[10px] mt-1 ${Math.abs(item.zScore)>=2 ? 'text-yellow-300 font-semibold':'text-gray-500'}`}>z: {item.zScore.toFixed(2)}</div>
                  )}
                  <div className="text-[10px] text-gray-500">OI: {item.openInterest.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'geopolitical_risk': {
        const series: GeoRiskPoint[] = widget.data || [];
        if (!series.length) return <div className="flex items-center justify-center h-full text-gray-400">Geo Risk data not available</div>;
        const latest = series[series.length-1];
        return (
          <div className="flex flex-col gap-8">
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3,3" stroke="#ffffff15" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '2px solid #374151', borderRadius: '12px' }}
                    labelStyle={{ color: '#f9fafb', fontWeight: 'bold' }}
                    formatter={(v, n, p:any) => [`${v}`, p.payload.regime.toUpperCase()]} />
                  <Line type="monotone" dataKey="gpr" stroke="#fbbf24" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey={"percentile"} stroke="#6366f1" strokeWidth={1} dot={false} yAxisId={1} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-xs text-gray-400 mb-1">Latest</div>
                <div className="text-2xl font-bold text-yellow-300">{latest.gpr}</div>
                <div className="text-[10px] text-gray-500">Index</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-xs text-gray-400 mb-1">Change</div>
                <div className={`text-2xl font-bold ${latest.change>=0?'text-red-400':'text-green-400'}`}>{latest.change>=0?'+':''}{latest.change}</div>
                <div className="text-[10px] text-gray-500">d/d</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-xs text-gray-400 mb-1">Percentile</div>
                <div className="text-2xl font-bold text-indigo-400">{latest.percentile}%</div>
                <div className="text-[10px] text-gray-500">vs sample</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-xs text-gray-400 mb-1">Regime</div>
                <div className={`text-xl font-bold ${latest.regime==='crisis'?'text-red-400': latest.regime==='elevated'?'text-orange-400': latest.regime==='moderate'?'text-yellow-300':'text-green-400'}`}>{latest.regime.toUpperCase()}</div>
                <div className="text-[10px] text-gray-500">classification</div>
              </div>
            </div>
          </div>
        );
      }
      
      default:
        console.log(`⚠️  Widget "${widget.id}" falling to default case - no chart renderer found`);
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Chart not available for this widget</p>
          </div>
        );
    }
  };

  // Handle AI Query
  const handleAIQuery = async () => {
    if (!aiQuery.trim() || !selectedWidget) return;
    
    setAiLoading(true);
    
    // Simulate AI response
    setTimeout(() => {
      const responses = [
        `Based on the ${selectedWidget.title} data, ${aiQuery} shows significant implications for market dynamics. The current trends suggest ${selectedWidget.aiInsight.sentiment === 'positive' ? 'favorable' : selectedWidget.aiInsight.sentiment === 'negative' ? 'challenging' : 'mixed'} conditions ahead.`,
        `Analyzing ${selectedWidget.title}: ${aiQuery} correlates with broader economic indicators. Key factors include ${selectedWidget.aiInsight.risks[0]} and ${selectedWidget.aiInsight.opportunities[0]}.`,
        `Your question about ${aiQuery} in the context of ${selectedWidget.title} highlights important patterns. The AI confidence level is ${selectedWidget.aiInsight.confidence}% for this analysis.`
      ];
      
      setAiResponse(responses[Math.floor(Math.random() * responses.length)]);
      setAiLoading(false);
    }, 1500);
  };

  // Get color based on sentiment
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'negative': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    }
  };

  // Get risk level color
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Fed Tools helpers
  const formatFedValue = (id: string, value: number) => {
    if (!Number.isFinite(value)) return '—';
    if (id === 'WALCL') {
      // millions USD -> trillions USD
      const trillions = value / 1_000_000;
      return `$${trillions.toFixed(2)}T`;
    }
    if (id === 'RRPONTSYD') {
      // millions USD -> billions USD
      const billions = value / 1_000;
      return `$${billions.toFixed(1)}B`;
    }
    // Percent series
    return `${value.toFixed(2)}%`;
  };
  const seriesLabel = (id: string) => id === 'WALCL' ? 'Fed Balance Sheet'
    : id === 'IORB' ? 'IORB'
    : id === 'RRPONTSYD' ? 'Overnight RRP'
    : id === 'DFF' ? 'Eff. Fed Funds'
    : id === 'SOFR' ? 'SOFR' : id;

  if (loading) {
    return (
  <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Visual AI Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <RequirePlan min="premium">
  <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          {/* Hero Header */}
          <div className="mb-8">
            <div className="mb-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </Link>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
              <div className="p-6 md:p-8">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Visual AI</h1>
                    <p className="mt-2 text-gray-300 max-w-2xl">A modern, AI-assisted macro and markets overview. Explore curated widgets with clean visuals and focused insights.</p>
                  </div>
                  <div className="hidden md:flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <div className="text-gray-400">Widgets</div>
                      <div className="text-xl font-semibold text-white">{widgets.length}</div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="text-right">
                      <div className="text-gray-400">AI Confidence</div>
                      <div className="text-xl font-semibold text-white">82%</div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="text-right">
                      <div className="text-gray-400">Last Refresh</div>
                      <div className="text-xl font-semibold text-white">{new Date().toLocaleTimeString()}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  {/* Tabs */}
                  <div className="flex flex-wrap items-center gap-2">
                    {([
                      {key:'macro',label:'Macro'},
                      {key:'markets',label:'Markets'},
                      {key:'commodities',label:'Commodities'},
                      {key:'policy',label:'Policy & Risk'},
                      {key:'all',label:'All'}
                    ] as {key: 'macro'|'markets'|'commodities'|'policy'|'all'; label: string;}[]).map(t => (
                      <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${activeTab===t.key ? 'bg-white/10 border-white/30 text-white' : 'border-white/10 text-gray-300 hover:border-white/20 hover:text-white'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {/* Search + Refresh */}
                  <div className="flex items-center gap-2">
                    <input
                      value={searchTerm}
                      onChange={(e)=>setSearchTerm(e.target.value)}
                      placeholder="Search widgets..."
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      onClick={()=>setRefreshTick(t=>t+1)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm"
                      title="Refresh data"
                    >
                      <Activity className="w-4 h-4" /> Refresh
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {widgets
              .filter(w => (activeTab==='all' || TAB_GROUPS[activeTab].includes(w.id)) && (searchTerm.trim()==='' || w.title.toLowerCase().includes(searchTerm.toLowerCase())))
              .map((widget) => (
              <div 
                key={widget.id} 
                className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:border-white/20 transition-colors"
              >
                {/* Widget Header */}
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{widget.title}</h3>
                    <div className="mt-1 text-[11px] text-gray-400">Updated {new Date(widget.lastUpdated).toLocaleTimeString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {widget.fallback && (
                      <span className="px-2 py-1 rounded text-[10px] border border-yellow-500/30 text-yellow-300 bg-yellow-500/10">partial</span>
                    )}
                    <div className={`px-2 py-1 rounded text-[10px] font-medium ${getSentimentColor(widget.aiInsight.sentiment)}`}>
                      AI {widget.aiInsight.confidence}%
                    </div>
                  </div>
                </div>

                {/* Widget Visualization */}
                <div className="h-48 mb-3">
                  {widget.id === 'population' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="country" stroke="#9ca3af" fontSize={10} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#111827', 
                            border: '2px solid #374151', 
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
                          }}
                          labelStyle={{ color: '#f9fafb', fontSize: '14px', fontWeight: 'bold' }}
                          itemStyle={{ color: '#22d3ee', fontSize: '13px' }}
                          formatter={(value, name, props) => {
                            return [
                              `${formatPopulation(value)} people`,
                              `Growth: ${formatPercent(props.payload?.growthRate, 2)}`
                            ];
                          }}
                        />
                        <Bar dataKey="population" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'debt' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="country" stroke="#9ca3af" fontSize={10} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#111827', 
                            border: '2px solid #374151', 
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
                          }}
                          labelStyle={{ color: '#f9fafb', fontSize: '14px', fontWeight: 'bold' }}
                          itemStyle={{ color: '#fbbf24', fontSize: '13px' }}
                          formatter={(value, name, props) => [
                            `${value}% Debt/GDP`,
                            `Risk: ${props.payload?.riskLevel?.toUpperCase() || 'N/A'}`
                          ]}
                        />
                        <Bar dataKey="debtToGdp">
                          {widget.data.map((entry: DebtData, index: number) => (
                            <Cell key={`cell-${index}`} fill={
                              entry.riskLevel === 'low' ? '#22c55e' :
                              entry.riskLevel === 'medium' ? '#eab308' :
                              entry.riskLevel === 'high' ? '#f97316' : '#ef4444'
                            } />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'yields' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="maturity" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#111827', 
                            border: '2px solid #374151', 
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
                          }}
                          labelStyle={{ color: '#f9fafb', fontSize: '14px', fontWeight: 'bold' }}
                          itemStyle={{ fontSize: '13px' }}
                          formatter={(value, name) => [`${value}%`, name === 'us' ? 'US Treasury' : name === 'eu' ? 'EU Bonds' : 'EM Bonds']}
                        />
                        <Line type="monotone" dataKey="us" stroke="#22d3ee" strokeWidth={2} />
                        <Line type="monotone" dataKey="eu" stroke="#a855f7" strokeWidth={2} />
                        <Line type="monotone" dataKey="em" stroke="#f59e0b" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'country_metrics' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="pe" stroke="#9ca3af" fontSize={12} />
                        <YAxis dataKey="dividendYield" stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '3px solid #3b82f6', 
                            borderRadius: '16px',
                            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9)',
                            padding: '24px',
                            minWidth: '380px'
                          }}
                          labelStyle={{ 
                            color: '#f9fafb', 
                            fontSize: '18px', 
                            fontWeight: 'bold'
                          }}
                          cursor={{ fill: 'rgba(59, 130, 246, 0.15)' }}
                          formatter={(value, name, props) => {
                            const data = props.payload;
                            if (name === 'marketCap') {
                              return [
                                <div key="country-tooltip" style={{ color: '#ffffff' }}>
                                  <div style={{ 
                                    color: '#22d3ee', 
                                    fontSize: '20px', 
                                    fontWeight: 'bold', 
                                    marginBottom: '16px', 
                                    textAlign: 'center'
                                  }}>
                                    🏛️ {data?.country}
                                  </div>
                                  
                                  <div style={{ 
                                    color: '#a855f7', 
                                    marginBottom: '10px', 
                                    fontSize: '16px'
                                  }}>
                                    📊 P/E Ratio: <span style={{ 
                                      color: '#ffffff', 
                                      fontWeight: 'bold', 
                                      fontSize: '18px'
                                    }}>
                                      {data?.pe}
                                    </span>
                                  </div>
                                  
                                  <div style={{ 
                                    color: '#f59e0b', 
                                    marginBottom: '10px', 
                                    fontSize: '16px'
                                  }}>
                                    💰 Dividend Yield: <span style={{ 
                                      color: '#ffffff', 
                                      fontWeight: 'bold', 
                                      fontSize: '18px'
                                    }}>
                                      {data?.dividendYield}%
                                    </span>
                                  </div>
                                  
                                  <div style={{ 
                                    color: '#10b981', 
                                    marginBottom: '16px', 
                                    fontSize: '16px'
                                  }}>
                                    🌍 Market Cap: <span style={{ 
                                      color: '#ffffff', 
                                      fontWeight: 'bold', 
                                      fontSize: '18px'
                                    }}>
                                      ${value}T
                                    </span>
                                  </div>
                                  
                                  <div style={{ 
                                    color: data?.valuation === 'undervalued' ? '#22c55e' : 
                                            data?.valuation === 'overvalued' ? '#ef4444' : '#f59e0b',
                                    fontSize: '18px',
                                    textAlign: 'center',
                                    marginTop: '16px',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    backgroundColor: data?.valuation === 'undervalued' ? 'rgba(34, 197, 94, 0.25)' : 
                                                    data?.valuation === 'overvalued' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                                    border: `3px solid ${data?.valuation === 'undervalued' ? '#22c55e' : 
                                                        data?.valuation === 'overvalued' ? '#ef4444' : '#f59e0b'}`
                                  }}>
                                    📈 <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{data?.valuation?.toUpperCase()}</span>
                                    <div style={{ 
                                      fontSize: '14px', 
                                      marginTop: '6px', 
                                      opacity: 0.9
                                    }}>
                                      {data?.valuation === 'undervalued' ? 'Excellent Buy Opportunity' : 
                                       data?.valuation === 'overvalued' ? 'Consider Waiting for Dip' : 'Fair Market Valuation'}
                                    </div>
                                  </div>
                                </div>
                              ];
                            }
                            return [`${value}${name === 'dividendYield' ? '%' : ''}`, props.payload?.country];
                          }}
                        />
                        <Scatter dataKey="marketCap">
                          {widget.data.map((entry: CountryMetrics, index: number) => (
                            <Cell key={`cell-${index}`} fill={
                              entry.valuation === 'undervalued' ? '#22c55e' :
                              entry.valuation === 'fair' ? '#eab308' : '#ef4444'
                            } />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'sectors' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="sector" stroke="#9ca3af" fontSize={10} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '3px solid #059669', 
                            borderRadius: '16px',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)',
                            padding: '20px',
                            minWidth: '320px'
                          }}
                          labelStyle={{ color: '#f9fafb', fontSize: '16px', fontWeight: 'bold' }}
                          itemStyle={{ fontSize: '13px' }}
                          cursor={{ fill: 'rgba(34, 197, 94, 0.1)' }}
                          formatter={(value, name, props) => {
                            const data = props.payload;
                            return [
                              <div key="sector-tooltip" style={{ color: '#ffffff' }}>
                                <div style={{ color: '#22d3ee', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>
                                  🏢 {data?.sector}
                                </div>
                                <div style={{ color: '#10b981', marginBottom: '8px', fontSize: '15px' }}>
                                  📈 1Y Performance: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>{value}%</span>
                                </div>
                                <div style={{ color: '#a855f7', marginBottom: '8px', fontSize: '15px' }}>
                                  📊 P/E Ratio: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>{data?.pe}</span>
                                </div>
                                <div style={{ color: '#f59e0b', marginBottom: '8px', fontSize: '15px' }}>
                                  💰 Dividend Yield: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>{data?.dividendYield}%</span>
                                </div>
                                <div style={{ color: '#06b6d4', marginBottom: '8px', fontSize: '15px' }}>
                                  📅 6M Performance: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>{data?.performance6M}%</span>
                                </div>
                                <div style={{ color: '#8b5cf6', marginBottom: '8px', fontSize: '15px' }}>
                                  📆 1M Performance: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>{data?.performance1M}%</span>
                                </div>
                                <div style={{ 
                                  color: data?.type === 'growth' ? '#22d3ee' : 
                                        data?.type === 'defensive' ? '#22c55e' : '#f59e0b',
                                  fontSize: '15px',
                                  textAlign: 'center',
                                  marginTop: '8px',
                                  padding: '8px',
                                  borderRadius: '8px',
                                  backgroundColor: 'rgba(255,255,255,0.1)'
                                }}>
                                  🎯 <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{data?.type?.toUpperCase()}</span>
                                </div>
                              </div>
                            ];
                          }}
                        />
                        <Bar dataKey="performance1Y">
                          {widget.data.map((entry: SectorMetrics, index: number) => (
                            <Cell key={`cell-${index}`} fill={
                              entry.type === 'growth' ? '#22d3ee' :
                              entry.type === 'defensive' ? '#22c55e' : '#f59e0b'
                            } />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'pmi' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="country" stroke="#9ca3af" fontSize={10} angle={-45} textAnchor="end" height={60} />
                        <YAxis domain={[40, 60]} stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '3px solid #dc2626', 
                            borderRadius: '16px',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)',
                            padding: '20px',
                            minWidth: '300px'
                          }}
                          labelStyle={{ color: '#f9fafb', fontSize: '16px', fontWeight: 'bold' }}
                          itemStyle={{ fontSize: '13px' }}
                          cursor={{ fill: 'rgba(239, 68, 68, 0.1)' }}
                          formatter={(value, name, props) => {
                            const data = props.payload;
                            const isExpansion = typeof value === 'number' && value >= 50;
                            return [
                              <div key="pmi-tooltip" style={{ color: '#ffffff' }}>
                                <div style={{ color: '#22d3ee', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>
                                  🏭 {data?.country}
                                </div>
                                <div style={{ color: '#f59e0b', marginBottom: '8px', fontSize: '15px' }}>
                                  📊 PMI Composite: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>{value}</span>
                                </div>
                                <div style={{ color: '#a855f7', marginBottom: '8px', fontSize: '15px' }}>
                                  🏭 Manufacturing: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>{data?.manufacturing}</span>
                                </div>
                                <div style={{ color: '#06b6d4', marginBottom: '8px', fontSize: '15px' }}>
                                  🏪 Services: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>{data?.services}</span>
                                </div>
                                <div style={{ color: '#10b981', marginBottom: '12px', fontSize: '15px' }}>
                                  📈 Trend: <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>{data?.trend?.toUpperCase()}</span>
                                </div>
                                <div style={{ 
                                  color: isExpansion ? '#22c55e' : '#ef4444',
                                  fontSize: '16px',
                                  textAlign: 'center',
                                  marginTop: '8px',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  backgroundColor: isExpansion ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                  border: `2px solid ${isExpansion ? '#22c55e' : '#ef4444'}`
                                }}>
                                  {isExpansion ? '🟢 EXPANSION' : '🔴 CONTRACTION'}
                                  <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                                    {isExpansion ? 'Economy Growing' : 'Economy Slowing'}
                                  </div>
                                </div>
                              </div>
                            ];
                          }}
                        />
                        <Bar dataKey="composite">
                          {widget.data.map((entry: PMIData, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.composite >= 50 ? '#22c55e' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'central_bank' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="bank" stroke="#9ca3af" fontSize={10} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '3px solid #f59e0b', 
                            borderRadius: '16px',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)',
                            padding: '20px',
                            minWidth: '320px'
                          }}
                          labelStyle={{ color: '#f9fafb', fontSize: '16px', fontWeight: 'bold' }}
                          formatter={(value, _name, props:any) => {
                            const d = props?.payload || {};
                            return [
                              <div key="cb-preview-tooltip" style={{ color: '#fff' }}>
                                <div style={{ color: '#f59e0b', marginBottom: 8, fontWeight: 700 }}>{d.bank}</div>
                                <div style={{ color: '#22c55e' }}>Current rate: <span style={{ color:'#fff', fontWeight:700 }}>{d.currentRate?.toFixed?.(2)}%</span></div>
                                {typeof d.rateChange === 'number' && (
                                  <div style={{ color: d.rateChange>0?'#ef4444':d.rateChange<0?'#22c55e':'#9ca3af' }}>
                                    Change: <span style={{ color:'#fff', fontWeight:700 }}>{d.rateChange>0?'+':''}{d.rateChange} pp</span>
                                  </div>
                                )}
                                {d.sentiment && (
                                  <div style={{ marginTop: 6, color: d.sentiment==='hawkish'?'#fca5a5':d.sentiment==='dovish'?'#86efac':'#93c5fd' }}>
                                    Sentiment: <b style={{ color:'#fff' }}>{String(d.sentiment).toUpperCase()}</b>
                                  </div>
                                )}
                              </div>, ''
                            ];
                          }}
                        />
                        <Bar dataKey="currentRate" radius={[4, 4, 0, 0]}>
                          {(widget.data || []).map((s: any, i: number) => (
                            <Cell key={s.id || i} fill={
                              s.sentiment === 'hawkish' ? '#ef4444' :
                              s.sentiment === 'dovish' ? '#22c55e' : '#3b82f6'
                            } />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'gdp' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="country" stroke="#9ca3af" fontSize={10} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '3px solid #10b981', 
                            borderRadius: '16px',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)',
                            padding: '20px',
                            minWidth: '300px'
                          }}
                          labelStyle={{ color: '#f9fafb', fontSize: '16px', fontWeight: 'bold' }}
                          formatter={(value, name, props) => [
                            <div key="gdp-tooltip" style={{ color: '#ffffff', fontSize: '14px' }}>
                              <div style={{ color: '#10b981', marginBottom: '6px' }}>
                                📈 GDP Growth: <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{value}%</span>
                              </div>
                              <div style={{ color: '#06b6d4', marginBottom: '6px' }}>
                                🏛️ Country: <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{props.payload?.country}</span>
                              </div>
                              {props.payload?.trend && (
                                <div style={{ color: '#f59e0b' }}>
                                  📊 Trend: <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{props.payload.trend}</span>
                                </div>
                              )}
                            </div>,
                            ''
                          ]}
                        />
                        <Bar dataKey="gdpGrowth" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'trade' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="country" stroke="#9ca3af" fontSize={10} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '3px solid #8b5cf6', 
                            borderRadius: '16px',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)',
                            padding: '20px',
                            minWidth: '300px'
                          }}
                          labelStyle={{ color: '#f9fafb', fontSize: '16px', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="tradeBalance" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'oil_seasonality' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0b1220', border: '2px solid #334155', borderRadius: '10px' }}
                          labelStyle={{ color: '#e5e7eb', fontWeight: 700 }}
                          formatter={(v: any, _n: any, p: any) => [
                            `$${Number(v).toFixed(2)}/bbl`,
                            `${p?.payload?.month} • Avg Price`
                          ]}
                        />
                        <Line type="monotone" dataKey="averagePrice" stroke="#f97316" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'agriculture' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="commodity" stroke="#9ca3af" fontSize={10} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '3px solid #22c55e', 
                            borderRadius: '16px',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)',
                            padding: '20px',
                            minWidth: '300px'
                          }}
                          labelStyle={{ color: '#f9fafb', fontSize: '16px', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="price" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'metals' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="metal" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '3px solid #facc15', 
                            borderRadius: '16px',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)',
                            padding: '20px',
                            minWidth: '320px'
                          }}
                          labelStyle={{ color: '#f9fafb', fontSize: '16px', fontWeight: 'bold' }}
                          formatter={(value, name, props) => [
                            <div key="metals-tooltip" style={{ color: '#ffffff', fontSize: '14px' }}>
                              <div style={{ color: '#facc15', marginBottom: '8px', fontSize: '16px', textAlign: 'center' }}>
                                ⚡ {props.payload?.metal}
                              </div>
                              <div style={{ color: '#22c55e', marginBottom: '6px' }}>
                                💰 Price: <span style={{ color: '#ffffff', fontWeight: 'bold' }}>${value}/oz</span>
                              </div>
                              {props.payload?.change && (
                                <div style={{ color: props.payload.change >= 0 ? '#10b981' : '#ef4444', marginBottom: '6px' }}>
                                  📈 24h Change: <span style={{ color: '#ffffff', fontWeight: 'bold' }}>
                                    {props.payload.change >= 0 ? '+' : ''}{props.payload.change}%
                                  </span>
                                </div>
                              )}
                              <div style={{ color: '#a855f7', fontSize: '12px', fontStyle: 'italic' }}>
                                {props.payload?.metal === 'Gold' ? '🏆 Safe Haven Asset' :
                                 props.payload?.metal === 'Silver' ? '⚡ Industrial & Investment' :
                                 props.payload?.metal === 'Platinum' ? '🚗 Automotive Demand' : '💎 Precious Metal'}
                              </div>
                            </div>,
                            ''
                          ]}
                        />
                        <Bar dataKey="price" fill="#facc15" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'stocks' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="index" stroke="#9ca3af" fontSize={10} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0b1220', border: '2px solid #334155', borderRadius: '10px' }}
                          labelStyle={{ color: '#e5e7eb', fontWeight: 700 }}
                          formatter={(v: any, _n: any, p: any) => [
                            `${Number(v).toFixed(1)}`,
                            `${p?.payload?.index} • P/E`
                          ]}
                        />
                        <Bar dataKey="pe" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'energy' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="commodity" stroke="#9ca3af" fontSize={10} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0b1220', border: '2px solid #334155', borderRadius: '10px' }}
                          labelStyle={{ color: '#e5e7eb', fontWeight: 700 }}
                          formatter={(v: any, _n: any, p: any) => [
                            `$${Number(v).toFixed(2)} ${p?.payload?.unit || ''}`,
                            `${p?.payload?.commodity} • ${p?.payload?.currency || 'USD'}`
                          ]}
                        />
                        <Bar dataKey="price" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'fed_dot_plot' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis type="category" dataKey="label" stroke="#9ca3af" fontSize={12} allowDuplicatedCategory={false} />
                        <YAxis type="number" dataKey="y" stroke="#9ca3af" fontSize={12} unit="%" domain={[0,'auto']} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0b1220', border: '2px solid #475569', borderRadius: '12px', padding: 12, boxShadow: '0 10px 20px rgba(0,0,0,0.6)' }}
                          labelStyle={{ color: '#e5e7eb', fontWeight: 700, fontSize: 12 }}
                          itemStyle={{ color: '#e5e7eb', fontSize: 12 }}
                          formatter={(value, _name, props:any) => {
                            const p = props?.payload || {};
                            return [ `${value}%`, `${p.label} (median; range ${p.low}-${p.high}%)` ]
                          }}
                        />
                        {/* Transform widget.data to plotting shape */}
                        <Scatter data={(widget.data || []).map((h:any)=>{
                          const label = h.label || h.key;
                          const median = Number(h.median);
                          const low = Number(h.centralTendencyLow ?? h.low ?? median);
                          const high = Number(h.centralTendencyHigh ?? h.high ?? median);
                          const errLow = Math.max(0, median - low);
                          const errHigh = Math.max(0, high - median);
                          return { label, y: median, low, high, err: [errLow, errHigh] };
                        })} fill="#22d3ee">
                          <ErrorBar dataKey="err" direction="y" stroke="#f59e0b" width={6} />
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'real_estate' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="city" stroke="#9ca3af" fontSize={10} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0b1220', border: '2px solid #334155', borderRadius: '10px' }}
                          labelStyle={{ color: '#e5e7eb', fontWeight: 700 }}
                          formatter={(v: any, _n: any, p: any) => [
                            `${Number(v).toFixed(0)}`,
                            `${p?.payload?.city}, ${p?.payload?.country} • Affordability`
                          ]}
                        />
                        <Bar dataKey="affordabilityIndex" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'currencies' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={widget.data}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                        <XAxis dataKey="currencyCode" stroke="#9ca3af" fontSize={11} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0b1220', border: '2px solid #334155', borderRadius: '10px' }}
                          labelStyle={{ color: '#e5e7eb', fontWeight: 700 }}
                          formatter={(v: any, _n: any, p: any) => [
                            `${Number(v).toFixed(0)}`,
                            `${p?.payload?.currency} • ${p?.payload?.exchangeRate ?? ''}`
                          ]}
                        />
                        <Bar dataKey="strengthIndex" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  
                  {widget.id === 'spx_historical' && (
                    <div className="w-full h-full">
                      <SPXChart compact={true} />
                    </div>
                  )}
                  {widget.id === 'fed_tools' && widget.data && (
                    <div className="w-full h-full grid grid-cols-2 gap-3">
                      {(() => {
                        const items = (widget.data as any[]);
                        const pick = (key:string) => items.find(s=>s.id===key);
                        const keys = ['DFF','SOFR','IORB','WALCL'];
                        return keys.map(k => {
                          const s = pick(k);
                          if (!s) return null;
                          const hist = (s.history||[]).slice(-60);
                          return (
                            <div key={k} className="bg-white/5 rounded-lg p-2 border border-white/10">
                              <div className="flex items-center justify-between mb-1 text-xs text-gray-300">
                                <span>{seriesLabel(k)}</span>
                                <span className="font-semibold text-white">{formatFedValue(k, s.latest?.value)}</span>
                              </div>
                              <ResponsiveContainer width="100%" height={60}>
                                <LineChart data={hist}>
                                  <XAxis dataKey="date" hide />
                                  <YAxis hide domain={['auto','auto']} />
                                  <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                  {widget.id === 'recession_prob' && widget.data && (
                    <div className="w-full h-full flex flex-col">
                      {(() => {
                        const latest = widget.data.latest;
                        const hist = (widget.data.history || []).map((h:any)=>({ date:h.date, value:h.probability }));
                        return (
                          <>
                            <div className="flex items-baseline justify-between mb-1">
                              <div className="text-2xl font-bold text-white">{latest ? `${latest.probability}%` : '—'}</div>
                              <div className="text-[10px] text-gray-400">{latest?.date?.slice(0,10)}</div>
                            </div>
                            <ResponsiveContainer width="100%" height={70}>
                              <LineChart data={hist}>
                                <XAxis dataKey="date" hide />
                                <YAxis hide domain={[0,100]} />
                                <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </>
                        );
                      })()}
                    </div>
                  )}
                  
                  {widget.id === 'pe_predictor' && widget.data && (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-cyan-400 mb-2">
                          {widget.data.currentPE?.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-300 mb-4">Current P/E</div>
                        
                        <div className="space-y-2">
                          <div className="text-sm text-gray-400">
                            Predicted: <span className="text-purple-400 font-semibold">
                              {widget.data.predictions?.[0]?.predictedPE?.toFixed(1)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Confidence: {widget.data.accuracy || 0}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {widget.id === 'geopolitical_risk' && widget.data && (
                    <ResponsiveContainer width="100%" height="100%">
                      {(() => {
                        const series = (widget.data as GeoRiskPoint[]).slice(-12);
                        return (
                          <LineChart data={series}>
                            <CartesianGrid strokeDasharray="3,3" stroke="#ffffff10" />
                            <XAxis dataKey="date" stroke="#9ca3af" hide />
                            <YAxis stroke="#9ca3af" hide />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#111827', border: '2px solid #374151', borderRadius: '10px' }}
                              labelStyle={{ color: '#f9fafb' }}
                              formatter={(v, n, p:any) => [`${v}`, p.payload.regime.toUpperCase()]}
                            />
                            <Line type="monotone" dataKey="gpr" stroke="#fbbf24" strokeWidth={2} dot={false} />
                          </LineChart>
                        );
                      })()}
                    </ResponsiveContainer>
                  )}
                  {widget.id === 'fedwatch' && widget.data && (
                    <ResponsiveContainer width="100%" height="100%">
                      {(() => {
                        const meetings = widget.data as FedWatchMeeting[];
                        const next = meetings[0];
                        if (!next || !next.probabilities) return <div className="flex items-center justify-center text-xs text-gray-400">No data</div>;
                        const data = next.probabilities
                          .slice()
                          .sort((a,b)=>b.probability-a.probability)
                          .map(p=>({ rate: p.rate, probability: p.probability }));
                        return (
                          <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                            <XAxis dataKey="rate" stroke="#9ca3af" fontSize={10} angle={-30} textAnchor="end" height={60} />
                            <YAxis stroke="#9ca3af" fontSize={10} hide />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0b1220', border: '2px solid #475569', borderRadius: '12px', padding: 12, boxShadow: '0 10px 20px rgba(0,0,0,0.6)' }}
                              labelStyle={{ color: '#e5e7eb', fontSize: 12, fontWeight: 700 }}
                              itemStyle={{ color: '#e5e7eb', fontSize: 12 }}
                              formatter={(value) => [`${value}%`, 'Probability']} 
                            />
                            <Bar dataKey="probability">
                              {data.map((d, i) => (
                                <Cell key={i} fill={i===0?'#22c55e': i===1?'#eab308':'#3b82f6'} />
                              ))}
                            </Bar>
                          </BarChart>
                        );
                      })()}
                    </ResponsiveContainer>
                  )}
                  {widget.id === 'cot_flow' && widget.data && (
                    <ResponsiveContainer width="100%" height="100%">
                      {(() => {
                        const cot = (widget.data as COTFlowRecord[]).slice(0,6);
                        const data = cot.map(r => ({ symbol: r.symbol, net: r.nonCommercialNet, change: r.changeNonCommercial, z: r.zScore, extreme: r.extreme }));
                        return (
                          <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
                            <XAxis dataKey="symbol" stroke="#9ca3af" fontSize={12} />
                            <YAxis stroke="#9ca3af" fontSize={10} hide />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0b1220', border: '2px solid #475569', borderRadius: '12px', padding: 12, boxShadow: '0 10px 20px rgba(0,0,0,0.6)' }}
                              labelStyle={{ color: '#e5e7eb', fontSize: 12, fontWeight: 700 }}
                              itemStyle={{ color: '#e5e7eb', fontSize: 12 }}
                              formatter={(value, name, props) => [ `${value}${name==='net'?'':' pts'}`, name==='net'?'Net Spec Position': name==='z' ? 'Z-Score' : 'Weekly Δ' ]}
                              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Bar dataKey="net">
                              {data.map((d,i)=>(
                                <Cell key={i} fill={d.extreme ? (d.net>=0 ? '#16a34a' : '#dc2626') : (d.net>=0?'#22c55e':'#ef4444')} stroke={d.extreme ? '#fbbf24' : 'none'} strokeWidth={d.extreme ? 2 : 0} />
                              ))}
                            </Bar>
                          </BarChart>
                        );
                      })()}
                    </ResponsiveContainer>
                  )}
                </div>

                {/* AI Insight + Action */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-300 font-medium text-sm">{widget.aiInsight.title}</span>
                    </div>
                    <p className="text-gray-300 text-[13px] line-clamp-2">{widget.aiInsight.content}</p>
                  </div>
                  <button
                    onClick={() => setSelectedWidget(widget)}
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-sm"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Widget Modal */}
        {selectedWidget && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/20 w-full max-h-[95vh] flex flex-col ${
              selectedWidget.id === 'spx_historical' ? 'max-w-6xl' : 'max-w-4xl'
            }`}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white">{selectedWidget.title}</h2>
                <button
                  onClick={() => setSelectedWidget(null)}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Detailed Chart */}
                <div className={`${selectedWidget.id === 'spx_historical' ? 'h-96' : selectedWidget.id === 'pe_predictor' ? 'h-auto' : 'h-64'} mb-6`}>
                  {/* Contextual controls for certain widgets */}
                  {selectedWidget.id === 'sectors' && (
                    <div className="flex flex-wrap gap-3 mb-3 items-center text-xs">
                      <span className="text-gray-400">Metric:</span>
                      {['performance1Y','performance6M','performance1M'].map(m => (
                        <button key={m} onClick={()=>setSectorMetric(m as any)} className={`px-2 py-1 rounded border ${sectorMetric===m?'bg-green-500/20 border-green-400 text-green-300':'border-white/10 text-gray-300 hover:border-white/30'}`}>{m.replace('performance','').toUpperCase()}</button>
                      ))}
                      <span className="ml-4 text-gray-400">Sort:</span>
                      {['desc','asc'].map(dir => (
                        <button key={dir} onClick={()=>setSectorSortDir(dir as any)} className={`px-2 py-1 rounded border ${sectorSortDir===dir?'bg-blue-500/20 border-blue-400 text-blue-300':'border-white/10 text-gray-300 hover:border-white/30'}`}>{dir}</button>
                      ))}
                    </div>
                  )}
                  {selectedWidget.id === 'country_metrics' && (
                    <div className="flex flex-wrap gap-3 mb-3 items-center text-xs">
                      <span className="text-gray-400">X Axis:</span>
                      {['pe','dividendYield'].map(ax => (
                        <button key={ax} onClick={()=>setCountryAxisMetric(ax as any)} className={`px-2 py-1 rounded border ${countryAxisMetric===ax?'bg-purple-500/20 border-purple-400 text-purple-300':'border-white/10 text-gray-300 hover:border-white/30'}`}>{ax==='pe'?'P/E':'Dividend Yield'}</button>
                      ))}
                    </div>
                  )}
                  {selectedWidget.id === 'spx_historical' || selectedWidget.id === 'pe_predictor' ? (
                    renderDetailedChart(selectedWidget)
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {renderDetailedChart(selectedWidget)}
                    </ResponsiveContainer>
                  )}
                  {selectedWidget.id === 'fed_tools' && selectedWidget.data && (
                    <div className="mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                        {(selectedWidget.data as any[]).map((s:any) => (
                          <div key={s.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                            <div className="text-[10px] text-gray-400 mb-1">{s.label || seriesLabel(s.id)}</div>
                            <div className="text-lg font-bold text-cyan-300">{formatFedValue(s.id, s.latest?.value)}</div>
                            <div className="text-[10px] text-gray-500">{s.latest?.date?.slice(0,10)}</div>
                          </div>
                        ))}
                      </div>
                      {(() => {
                        // Merge histories onto a common date axis for 3 key rates
                        const items = (selectedWidget.data as any[]);
                        const keys = ['DFF','SOFR','IORB'];
                        const byId: Record<string, any> = {};
                        keys.forEach(k => { const s = items.find(i=>i.id===k); if (s) byId[k]=s; });
                        const allDates = Array.from(new Set(keys.flatMap(k => (byId[k]?.history||[]).map((p:any)=>p.date)))).sort();
                        const rows = allDates.map(d => ({
                          date: d,
                          DFF: (byId.DFF?.history.find((p:any)=>p.date===d)?.value) ?? null,
                          SOFR: (byId.SOFR?.history.find((p:any)=>p.date===d)?.value) ?? null,
                          IORB: (byId.IORB?.history.find((p:any)=>p.date===d)?.value) ?? null,
                        })).slice(-180);
                        return (
                          <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={rows}>
                                <CartesianGrid strokeDasharray="3,3" stroke="#ffffff15" />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
                                <YAxis stroke="#9ca3af" fontSize={10} domain={[dataMin=>Math.floor((dataMin as number)-0.5), dataMax=>Math.ceil((dataMax as number)+0.5)]} />
                                <Tooltip contentStyle={{ backgroundColor:'#111827', border:'2px solid #374151', borderRadius: '10px' }} labelStyle={{ color:'#f9fafb' }} />
                                <Line type="monotone" dataKey="DFF" stroke="#22c55e" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="SOFR" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="IORB" stroke="#6366f1" strokeWidth={2} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {selectedWidget.id === 'recession_prob' && selectedWidget.data && (
                    <div className="mt-4 space-y-4">
                      {(() => {
                        const hist = (selectedWidget.data.history || []).map((h:any)=>({ date:h.date, probability:h.probability }));
                        return (
                          <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={hist}>
                                <CartesianGrid strokeDasharray="3,3" stroke="#ffffff15" />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
                                <YAxis domain={[0,100]} stroke="#9ca3af" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor:'#111827', border:'2px solid #374151', borderRadius: '10px' }} labelStyle={{ color:'#f9fafb' }} formatter={(v)=> [`${v}%`,'Probability']} />
                                <Line type="monotone" dataKey="probability" stroke="#f97316" strokeWidth={2} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })()}
                      {(() => {
                        const last = (selectedWidget.data.history||[]).slice(-1)[0];
                        const c = last?.components || {};
                        const item = (label:string, key: string, color:string)=>{
                          const v = c[key];
                          const pct = (typeof v==='number' && isFinite(v)) ? Math.round(v*100) : null;
                          return (
                            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                              <div className="text-[11px] text-gray-400 mb-1">{label}</div>
                              <div className="text-lg font-bold" style={{color}}>{pct!=null? `${pct}%`:'—'}</div>
                            </div>
                          );
                        };
                        return (
                          <div>
                            <div className="text-sm text-gray-300 mb-2">Latest component contributions (risk-normalized)</div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              {item('NBER Recession Prob','recNBER','#f87171')}
                              {item('Term Spread (Inversion)','termSpread','#fb923c')}
                              {item('Industrial Production MoM','ipMomentum','#60a5fa')}
                              {item('Unemployment Momentum','unMomentum','#f59e0b')}
                              {item('Consumer Sentiment','sentimentRisk','#22d3ee')}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* AI Analysis - Versione Compatta */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      <h3 className="text-base font-semibold text-white">AI Analysis</h3>
                    </div>
                    <p className="text-gray-300 text-xs mb-3 leading-relaxed">{selectedWidget.aiInsight.content}</p>
                    {selectedWidget.source && (
                      <div className="text-[10px] text-gray-400 mb-2">Source: {selectedWidget.source}{selectedWidget.fallback && ' (partial / fallback)'} </div>
                    )}
                    <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getSentimentColor(selectedWidget.aiInsight.sentiment)}`}>
                      {selectedWidget.aiInsight.sentiment.toUpperCase()} • {selectedWidget.aiInsight.confidence}% Confidence
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                        <h4 className="font-medium text-red-300 text-sm">Key Risks</h4>
                      </div>
                      <ul className="text-red-200 text-xs space-y-1">
                        {selectedWidget.aiInsight.risks.slice(0, 2).map((risk, index) => (
                          <li key={index}>• {risk}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <h4 className="font-medium text-green-300 text-sm">Opportunities</h4>
                      </div>
                      <ul className="text-green-200 text-xs space-y-1">
                        {selectedWidget.aiInsight.opportunities.slice(0, 2).map((opportunity, index) => (
                          <li key={index}>• {opportunity}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Q&A Section - Barra fissa in fondo */}
              <div className="border-t border-white/10 bg-slate-800/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">Ask AI About This Data</h3>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    placeholder="Ask anything about this data..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                    onKeyPress={(e) => e.key === 'Enter' && handleAIQuery()}
                  />
                  <button
                    onClick={handleAIQuery}
                    disabled={aiLoading}
                    className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    {aiLoading ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    ) : (
                      <Search className="w-3 h-3" />
                    )}
                    Ask AI
                  </button>
                </div>

                {aiResponse && (
                  <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/20 mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-3 h-3 text-cyan-400" />
                      <span className="text-cyan-300 font-medium text-sm">AI Response</span>
                    </div>
                    <p className="text-cyan-100 text-sm">{aiResponse}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </RequirePlan>
  );
}
