'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Dati storici S&P 500 P/E ed EPS basati sul grafico fornito
const historicalData = [
  { year: 1993, eps: 28.5, pe: 21.3 },
  { year: 1994, eps: 31.2, pe: 15.0 },
  { year: 1995, eps: 33.8, pe: 18.1 },
  { year: 1996, eps: 38.1, pe: 20.7 },
  { year: 1997, eps: 40.6, pe: 24.4 },
  { year: 1998, eps: 42.4, pe: 32.6 },
  { year: 1999, eps: 45.9, pe: 30.5 },
  { year: 2000, eps: 49.2, pe: 27.6 },
  { year: 2001, eps: 24.7, pe: 46.5 },
  { year: 2002, eps: 27.6, pe: 31.4 },
  { year: 2003, eps: 38.4, pe: 22.8 },
  { year: 2004, eps: 58.6, pe: 20.7 },
  { year: 2005, eps: 69.2, pe: 17.8 },
  { year: 2006, eps: 81.5, pe: 17.4 },
  { year: 2007, eps: 66.2, pe: 22.8 },
  { year: 2008, eps: 14.9, pe: 60.7 },
  { year: 2009, eps: 49.5, pe: 20.5 },
  { year: 2010, eps: 81.4, pe: 15.2 },
  { year: 2011, eps: 96.5, pe: 13.4 },
  { year: 2012, eps: 100.1, pe: 14.4 },
  { year: 2013, eps: 107.2, pe: 17.0 },
  { year: 2014, eps: 118.8, pe: 17.6 },
  { year: 2015, eps: 100.5, pe: 20.2 },
  { year: 2016, eps: 105.9, pe: 21.2 },
  { year: 2017, eps: 124.5, pe: 21.7 },
  { year: 2018, eps: 162.9, pe: 16.8 },
  { year: 2019, eps: 162.8, pe: 19.7 },
  { year: 2020, eps: 139.0, pe: 26.3 },
  { year: 2021, eps: 208.1, pe: 22.8 },
  { year: 2022, eps: 219.2, pe: 18.1 },
  { year: 2023, eps: 223.5, pe: 20.8 },
  { year: 2024, eps: 235.0, pe: 24.2 },
  { year: 2025, eps: 245.0, pe: 25.8 } // Proiezione corrente
];

// Arricchimento dati con direzione (flow) e delta percentuale
const processedData = historicalData.map((d, idx, arr) => {
  if (idx === 0) return { ...d, epsDirection: null, peDirection: null, epsDeltaPct: null, peDeltaPct: null };
  const prev = arr[idx - 1];
  const epsDirection = d.eps > prev.eps ? 'up' : d.eps < prev.eps ? 'down' : 'flat';
  const peDirection = d.pe > prev.pe ? 'up' : d.pe < prev.pe ? 'down' : 'flat';
  const epsDeltaPct = prev.eps ? ((d.eps - prev.eps) / prev.eps) * 100 : null;
  const peDeltaPct = prev.pe ? ((d.pe - prev.pe) / prev.pe) * 100 : null;
  return { ...d, epsDirection, peDirection, epsDeltaPct, peDeltaPct };
});

// Dot personalizzato con freccia di direzione (flow)
interface ArrowDotProps {
  cx?: number; cy?: number; payload?: any; stroke?: string; metric: 'eps' | 'pe'; compact?: boolean;
}

const ArrowDot: React.FC<ArrowDotProps> = ({ cx = 0, cy = 0, payload, stroke = '#fff', metric, compact }) => {
  const directionKey = metric === 'eps' ? 'epsDirection' : 'peDirection';
  const deltaKey = metric === 'eps' ? 'epsDeltaPct' : 'peDeltaPct';
  const dir = payload?.[directionKey];
  if (!dir || dir === 'flat') return null; // niente freccia per flat
  const color = dir === 'up' ? (metric === 'eps' ? 'var(--color-bull-alt)' : 'var(--color-bear-alt)') : 'var(--color-warning)';
  const size = compact ? 6 : 9;
  const half = size / 2;
  const path = dir === 'up'
    ? `M ${cx - half} ${cy + half} L ${cx} ${cy - half} L ${cx + half} ${cy + half} Z`
    : `M ${cx - half} ${cy - half} L ${cx} ${cy + half} L ${cx + half} ${cy - half} Z`;
  return (
    <g>
      <path d={path} fill={color} stroke={color} opacity={0.9} />
      {!compact && payload?.[deltaKey] != null && (
        <text x={cx + (dir === 'up' ? half + 3 : half + 3)} y={cy + 4} fontSize={10} fill={color} fontWeight={600}>
          {payload[deltaKey] > 0 ? '+' : ''}{payload[deltaKey].toFixed(1)}%
        </text>
      )}
    </g>
  );
};

// Tooltip personalizzato
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const eps = payload.find((p: any) => p.dataKey === 'eps')?.value;
    const pe = payload.find((p: any) => p.dataKey === 'pe')?.value;
    
    return (
      <div className="bg-slate-900 border border-slate-600 rounded-lg p-4 shadow-xl backdrop-blur-sm">
        <p className="text-white font-bold mb-3 text-center border-b border-slate-600 pb-2">
          📅 Year {label}
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 font-semibold flex items-center">
              📊 EPS:
            </span>
            <span className="text-white font-bold ml-2">
              ${eps}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-red-400 font-semibold flex items-center">
              📈 P/E Ratio:
            </span>
            <span className="text-white font-bold ml-2">
              {pe}x
            </span>
          </div>
          {pe && eps && (
            <div className="mt-3 pt-2 border-t border-slate-600 text-xs text-gray-400 text-center">
              Market Cap ≈ ${Math.round(eps * pe)}B
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

interface SPXChartProps {
  className?: string;
  compact?: boolean; // Nuova prop per modalità compatta
}

const SPXChart: React.FC<SPXChartProps> = ({ className = "", compact = false }) => {
  const chartHeight = compact ? '180px' : '350px';
  
  return (
    <div className={`bg-slate-800 rounded-lg ${compact ? 'p-4' : 'p-6'} ${className}`}>
      {!compact && (
        <div className="mb-6 border-b border-slate-600 pb-4">
          <h3 className="text-xl font-bold text-white mb-2">S&P 500 EPS and P/E Historical Analysis</h3>
          <p className="text-sm text-gray-400">Historical earnings per share and price-to-earnings ratio trends (1993-2025)</p>
        </div>
      )}
      
      {/* Grafico Principale */}
      <div className={`bg-slate-900/50 rounded-lg p-3 mb-4 border border-slate-700 shadow-lg`}>
        <div style={{ width: '100%', height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={processedData}
              margin={{
                top: compact ? 10 : 20,
                right: compact ? 20 : 40,
                left: compact ? 10 : 30,
                bottom: compact ? 10 : 35,
              }}
            >
              <CartesianGrid 
                strokeDasharray="2 2" 
                stroke="#475569" 
                opacity={0.5}
              />
              <XAxis 
                dataKey="year" 
                stroke="var(--color-neutral)"
                fontSize={compact ? 10 : 12}
                tickLine={false}
                axisLine={false}
                interval={compact ? 4 : 2}
                dy={5}
              />
              <YAxis 
                yAxisId="left"
                stroke="var(--color-primary)"
                fontSize={compact ? 10 : 12}
                tickLine={false}
                axisLine={false}
                dx={-5}
                label={{ 
                  value: 'EPS ($)', 
                  angle: -90, 
                  position: 'insideLeft', 
                  style: { 
                    textAnchor: 'middle', 
                    fill: 'var(--color-primary)',
                    fontSize: compact ? 11 : 13,
                    fontWeight: 'bold'
                  } 
                }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="var(--color-bear-alt)"
                fontSize={compact ? 10 : 12}
                tickLine={false}
                axisLine={false}
                dx={5}
                label={{ 
                  value: 'P/E Ratio', 
                  angle: 90, 
                  position: 'insideRight', 
                  style: { 
                    textAnchor: 'middle', 
                    fill: 'var(--color-bear-alt)',
                    fontSize: compact ? 11 : 13,
                    fontWeight: 'bold'
                  } 
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              {!compact && (
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '15px',
                    marginTop: '10px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                  iconType="line"
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  formatter={(value, entry) => (
                    <span style={{ 
                      color: entry.color, 
                      fontSize: '13px', 
                      fontWeight: 'bold',
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                      padding: '4px 8px',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      borderRadius: '4px',
                      margin: '0 5px'
                    }}>
                      {value}
                    </span>
                  )}
                />
              )}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="eps"
                stroke="var(--color-primary)"
                strokeWidth={compact ? 2.2 : 3.2}
                dot={(props) => {
                  const { key, ...rest } = (props as any) || {};
                  return <ArrowDot key={key} {...rest} metric="eps" compact={compact} />;
                }}
                activeDot={{ r: compact ? 5 : 7, fill: 'var(--color-primary)', strokeWidth: 2, stroke: 'var(--color-primary-strong)' }}
                name="EPS ($)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="pe"
                stroke="var(--color-bear-alt)"
                strokeWidth={compact ? 2.2 : 3.2}
                dot={(props) => {
                  const { key, ...rest } = (props as any) || {};
                  return <ArrowDot key={key} {...rest} metric="pe" compact={compact} />;
                }}
                activeDot={{ r: compact ? 5 : 7, fill: 'var(--color-bear-alt)', strokeWidth: 2, stroke: 'var(--color-bear)' }}
                name="P/E Ratio"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Separatore Compatto */}
      {!compact && (
        <div className="flex items-center justify-center my-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>
          <div className="mx-3 px-2 py-1 bg-slate-700/50 rounded border border-slate-600/50">
            <span className="text-xs text-gray-500 font-medium">INSIGHTS</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>
        </div>
      )}
      
      {/* Sezione Informazioni - Compatta */}
      {!compact && (
        <div className="bg-gradient-to-r from-slate-700/20 to-slate-600/20 rounded-lg p-4 border border-slate-600/50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs text-gray-300">
            <div className="space-y-2">
              <h4 className="text-blue-400 font-semibold text-sm flex items-center border-b border-blue-400/20 pb-1 mb-2">
                📈 Key Observations
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start p-2 bg-green-500/5 rounded border-l-2 border-green-400">
                  <span className="text-green-400 mr-2 text-base">•</span>
                  <span className="leading-snug">EPS shows consistent long-term growth trend despite cyclical volatility</span>
                </li>
                <li className="flex items-start p-2 bg-yellow-500/5 rounded border-l-2 border-yellow-400">
                  <span className="text-yellow-400 mr-2 text-base">•</span>
                  <span className="leading-snug">P/E ratio fluctuates with market cycles and investor sentiment</span>
                </li>
                <li className="flex items-start p-2 bg-red-500/5 rounded border-l-2 border-red-400">
                  <span className="text-red-400 mr-2 text-base">•</span>
                  <span className="leading-snug">Current P/E levels elevated compared to historical average of ~18x</span>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-red-400 font-semibold text-sm flex items-center border-b border-red-400/20 pb-1 mb-2">
                🎯 Notable Market Periods
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start p-2 bg-orange-500/5 rounded border-l-2 border-orange-400">
                  <span className="text-orange-400 mr-2 text-base">•</span>
                  <span className="leading-snug"><strong>2000:</strong> Dot-com bubble peak (P/E ~28x)</span>
                </li>
                <li className="flex items-start p-2 bg-red-500/5 rounded border-l-2 border-red-400">
                  <span className="text-red-400 mr-2 text-base">•</span>
                  <span className="leading-snug"><strong>2008:</strong> Financial crisis impact (P/E spike to 60x)</span>
                </li>
                <li className="flex items-start p-2 bg-purple-500/5 rounded border-l-2 border-purple-400">
                  <span className="text-purple-400 mr-2 text-base">•</span>
                  <span className="leading-snug"><strong>2020:</strong> COVID-19 market disruption and recovery</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SPXChart;
