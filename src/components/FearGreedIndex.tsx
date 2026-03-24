'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, BoltIcon } from '@heroicons/react/24/outline';

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
  const getRingColor = (index: number): string => {
    if (index < 25) return '#ef4444';
    if (index < 45) return '#f97316';
    if (index < 55) return '#eab308';
    if (index < 75) return '#22c55e';
    return '#4ade80';
  };

  const fetchReal = useCallback(async () => {
    try {
      const r = await fetch('/api/market-sentiment-new', { cache: 'no-store' });
      if (!r.ok) throw new Error('failed');
      const json = await r.json();
      setData(json);
    } catch {
      const now = Date.now();
      const cycle = Math.sin(Math.floor(now / 60000) / 5);
      const fg = Math.round(50 + cycle * 15);
      const vol = Math.round(15 + Math.abs(cycle) * 10);
      const trend: 'up' | 'down' | 'neutral' = fg > 60 ? 'up' : fg < 40 ? 'down' : 'neutral';
      setData({
        fearGreedIndex: fg,
        trend,
        volatility: vol,
        aiPrediction: 'Fallback',
        sentiment: getSentiment(fg),
        lastUpdated: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReal();
    const id = setInterval(fetchReal, 120_000);
    return () => clearInterval(id);
  }, [fetchReal]);

  // SVG arc helper
  const arcPath = (pct: number) => {
    const r = 44;
    const cx = 50, cy = 50;
    const startAngle = -210;
    const sweep = 240;
    const angle = startAngle + sweep * Math.min(pct, 1);
    const rad = (a: number) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(angle));
    const y2 = cy + r * Math.sin(rad(angle));
    const large = sweep * pct > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400" />
      </div>
    );
  }

  const pct = data.fearGreedIndex / 100;
  const color = getRingColor(data.fearGreedIndex);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 gap-2">
      {/* Compact gauge */}
      <div className="relative w-[130px] h-[130px]">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[0deg]">
          {/* Track */}
          <path d={arcPath(1)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" strokeLinecap="round" />
          {/* Value */}
          <path d={arcPath(pct)} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color}55)`, transition: 'all 0.8s ease-out' }} />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-white leading-none" style={{ color }}>{data.fearGreedIndex}</span>
          <span className="text-[9px] text-white/60 mt-0.5">{data.sentiment}</span>
        </div>
        {/* Trend arrow */}
        <div className="absolute top-1 right-1">
          {data.trend === 'up'
            ? <ArrowTrendingUpIcon className="h-4 w-4 text-green-400" />
            : data.trend === 'down'
            ? <ArrowTrendingDownIcon className="h-4 w-4 text-red-400" />
            : null}
        </div>
      </div>

      {/* Bottom metrics row */}
      <div className="flex items-center gap-2 text-[9px]">
        <div className="bg-white/[0.06] rounded px-1.5 py-0.5">
          <span className="text-gray-500">Vol </span>
          <span className="font-bold text-white">{data.volatility}%</span>
        </div>
        <div className="bg-white/[0.06] rounded px-1.5 py-0.5">
          <span className="text-gray-500">Sig </span>
          <span className={`font-bold ${data.trend === 'up' ? 'text-green-400' : data.trend === 'down' ? 'text-red-400' : 'text-yellow-400'}`}>
            {data.trend === 'up' ? 'BULL' : data.trend === 'down' ? 'BEAR' : 'FLAT'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span></span>
          <span className="text-gray-500">Live</span>
        </div>
      </div>

      {/* AI badge + timestamp */}
      <div className="flex items-center gap-2 text-[8px]">
        <span className="inline-flex items-center gap-0.5 bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white px-1.5 py-0.5 rounded-full font-semibold">
          <BoltIcon className="h-2.5 w-2.5" /> AI
        </span>
        {data.lastUpdated && <span className="text-gray-600">{new Date(data.lastUpdated).toLocaleTimeString()}</span>}
      </div>
    </div>
  );
};

export default FearGreedIndex;
