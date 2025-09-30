'use client';

import { useState, useEffect } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, BoltIcon } from '@heroicons/react/24/outline';
import MarketParticles from './MarketParticles';

interface MarketData {
  fearGreedIndex: number;
  trend: 'up' | 'down' | 'neutral';
  aiPrediction: string;
  volatility: number;
  sentiment: string;
  lastUpdated?: string;
}

const FearGreedIndex = () => {
  const [data, setData] = useState<MarketData>({
    fearGreedIndex: 0,
    trend: 'neutral',
    aiPrediction: 'Analyzing...',
    volatility: 0,
    sentiment: 'Neutral'
  });
  const [isLoading, setIsLoading] = useState(true);

  const getSentiment = (index: number): string => {
    if (index < 25) return 'Extreme Fear';
    if (index < 45) return 'Fear';
    if (index < 55) return 'Neutral';
    if (index < 75) return 'Greed';
    return 'Extreme Greed';
  };
  const getIndexColor = (index: number): string => {
    if (index < 25) return 'from-red-500 to-red-700';
    if (index < 45) return 'from-orange-500 to-red-500';
    if (index < 55) return 'from-yellow-500 to-orange-500';
    if (index < 75) return 'from-green-500 to-yellow-500';
    return 'from-green-400 to-green-600';
  };
  const getGlowColor = (index: number): string => {
    if (index < 25) return 'shadow-red-500/50';
    if (index < 45) return 'shadow-orange-500/50';
    if (index < 55) return 'shadow-yellow-500/50';
    if (index < 75) return 'shadow-green-500/50';
    return 'shadow-green-400/50';
  };

  useEffect(() => {
    const fetchReal = async () => {
      try {
        const r = await fetch('/api/market-sentiment-new');
        if (!r.ok) throw new Error('failed');
        const json = await r.json();
        setData(json);
      } catch (e) {
        const now = Date.now();
        const cycle = Math.sin(Math.floor(now / 60000) / 5);
        const fg = Math.round(50 + cycle * 15);
        const trend: 'up' | 'down' | 'neutral' = fg > 60 ? 'up' : fg < 40 ? 'down' : 'neutral';
        setData(d => ({
          ...d,
          fearGreedIndex: fg,
          trend,
            aiPrediction: 'Fallback neutral composite displayed (live feed unavailable).',
          sentiment: getSentiment(fg),
          lastUpdated: new Date().toISOString()
        }));
      } finally {
        setIsLoading(false);
      }
    };
    fetchReal();
    const id = setInterval(fetchReal, 120000);
    return () => clearInterval(id);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-8">
        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-blue-400" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-6">
      <MarketParticles />

      {/* Cerchio centrale */}
      <div className={`relative w-28 h-28 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br ${getIndexColor(data.fearGreedIndex)} shadow-2xl ${getGlowColor(data.fearGreedIndex)} animate-pulse flex items-center justify-center`}>
        <div className="absolute inset-2 bg-slate-900 rounded-full flex flex-col items-center justify-center border border-white/10">
          <div className="text-xl sm:text-3xl font-bold text-white leading-none">{data.fearGreedIndex}</div>
          <div className="text-[10px] sm:text-xs text-gray-300 text-center px-1 sm:px-2 leading-tight">{data.sentiment}</div>
        </div>
        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2">
          {data.trend === 'up' ? (
            <ArrowTrendingUpIcon className="h-4 w-4 sm:h-6 sm:w-6 text-green-400 animate-bounce" />
          ) : (
            <ArrowTrendingDownIcon className="h-4 w-4 sm:h-6 sm:w-6 text-red-400 animate-bounce" />
          )}
        </div>
      </div>

      {/* Pannello testi in basso a destra */}
      <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 flex flex-col items-end gap-2 max-w-[230px] sm:max-w-xs text-right">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full font-semibold animate-pulse flex items-center shadow-lg self-end">
          <BoltIcon className="h-3 w-3 mr-1" /> AI POWERED
        </div>
        <div className="text-[10px] sm:text-sm text-blue-400 font-semibold leading-tight">🤖 AI Market Intelligence</div>
        <div className="text-white text-[10px] sm:text-xs bg-blue-900/40 px-2 sm:px-3 py-2 rounded-md border border-blue-500/30 backdrop-blur-sm leading-snug line-clamp-4">
          {data.aiPrediction}
        </div>
        {data.lastUpdated && (
          <div className="text-[9px] sm:text-[11px] text-gray-500">Upd: {new Date(data.lastUpdated).toLocaleTimeString()}</div>
        )}
        <div className="flex items-center gap-2">
          <div className="bg-white/10 rounded-md px-2 py-1">
            <span className="block text-[9px] text-gray-400">Vol</span>
            <span className="block text-[10px] font-bold text-white">{data.volatility}%</span>
          </div>
          <div className="bg-white/10 rounded-md px-2 py-1">
            <span className="block text-[9px] text-gray-400">Sig</span>
            <span className={`block text-[10px] font-bold ${data.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>{data.trend === 'up' ? 'BULL' : 'BEAR'}</span>
          </div>
            <div className="bg-white/10 rounded-md px-2 py-1">
            <span className="block text-[9px] text-gray-400">Idx</span>
            <span className="block text-[10px] font-bold text-white">{data.fearGreedIndex}</span>
          </div>
          <div className="flex items-center text-[9px] text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-ping mr-1" />Live
          </div>
        </div>
      </div>
    </div>
  );
};

export default FearGreedIndex;
