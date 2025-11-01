"use client";

import React, {useMemo} from 'react';

type Ticker = { symbol: string; name?: string; change: number; points: number[] };

function Sparkline({ points, width=80, height=20, color="#60A5FA" }: { points: number[]; width?: number; height?: number; color?: string; }) {
  const path = useMemo(() => {
    if (!points.length) return '';
    const min = Math.min(...points), max = Math.max(...points);
    const scaleX = (i:number) => (i/(points.length-1))*width;
    const scaleY = (v:number) => {
      if (max === min) return height/2;
      return height - ((v - min)/(max-min))*height;
    };
    return points.map((v,i)=>`${i===0?'M':'L'} ${scaleX(i).toFixed(2)} ${scaleY(v).toFixed(2)}`).join(' ');
  }, [points, width, height]);
  const last = points[points.length-1] ?? 0;
  const first = points[0] ?? 0;
  const up = last >= first;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" opacity={0.9} />
      <circle cx={width} cy={up ? 2.5 : height-2.5} r={1.8} fill={up ? '#22c55e' : '#ef4444'} />
    </svg>
  );
}

const baseTickers: Ticker[] = [
  { symbol: 'NVDA', change: 1.2, points: [98,102,101,105,108,107,111,115] },
  { symbol: 'AAPL', change: -0.6, points: [80,79,78,79,81,80,79,78] },
  { symbol: 'TSLA', change: 2.4, points: [60,61,63,62,66,68,67,70] },
  { symbol: 'EUR/USD', change: 0.1, points: [1.08,1.081,1.079,1.082,1.083,1.081,1.084,1.085] },
  { symbol: 'BTC-USD', change: 0.9, points: [62000,62500,61800,63000,64000,63800,64500,65000] },
  { symbol: 'CL=F', change: -0.8, points: [78,77.5,77.8,77.2,76.9,77.1,76.5,76.2] },
];

export default function NeuralTickerRibbon() {
  // Keep it purely visual, subtle speed to fit the brand
  const items = baseTickers;
  return (
    <div className="relative w-full overflow-hidden border-y border-[var(--color-border)] bg-[var(--color-panel)]/50">
      <div className="flex items-center gap-6 animate-[ticker_24s_linear_infinite] will-change-transform">
        {[...items, ...items].map((t, idx) => {
          const up = t.change >= 0;
          return (
            <div key={idx} className="flex items-center gap-3 py-2 pl-4 pr-6 whitespace-nowrap">
              <div className="text-xs font-semibold text-white/90">{t.symbol}</div>
              <div className={`text-[11px] ${up ? 'text-emerald-400' : 'text-rose-400'}`}>{up?'+':''}{t.change.toFixed(1)}%</div>
              <Sparkline points={t.points} />
            </div>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}
