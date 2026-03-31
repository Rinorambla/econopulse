"use client";
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Brush } from 'recharts';

type SimilarityPoint = {
  date: string;
  crisis2007: number;
  bubble2000: number;
  pandemic2020: number;
  composite: number;
};

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #475569',
  borderRadius: '8px',
  color: '#f1f5f9'
};

function computeSMA(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    return Math.round((sum / period) * 10) / 10;
  });
}

function computeEMA(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let ema: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (ema === null) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += values[j];
      ema = sum / period;
    } else {
      ema = values[i] * k + ema * (1 - k);
    }
    result.push(Math.round(ema * 10) / 10);
  }
  return result;
}

function computeBollinger(values: number[], period: number): { upper: (number | null)[]; lower: (number | null)[] } {
  const sma = computeSMA(values, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (sma[i] === null) { upper.push(null); lower.push(null); continue; }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) sumSq += (values[j] - sma[i]!) ** 2;
    const std = Math.sqrt(sumSq / period);
    upper.push(Math.round((sma[i]! + 2 * std) * 10) / 10);
    lower.push(Math.round((sma[i]! - 2 * std) * 10) / 10);
  }
  return { upper, lower };
}

type Indicator = 'sma20' | 'sma50' | 'ema12' | 'bollinger';
const INDICATORS: { key: Indicator; label: string; color: string }[] = [
  { key: 'sma20', label: 'SMA 20', color: '#22d3ee' },
  { key: 'sma50', label: 'SMA 50', color: '#a78bfa' },
  { key: 'ema12', label: 'EMA 12', color: '#34d399' },
  { key: 'bollinger', label: 'Bollinger', color: '#f472b6' },
];

export default function HistoricalSimilarityChart({ data }: { data: SimilarityPoint[] }) {
  const [active, setActive] = useState<Set<Indicator>>(new Set());

  const enriched = useMemo(() => {
    if (!data || data.length === 0) return [];
    const compositeVals = data.map(d => d.composite);
    const sma20 = computeSMA(compositeVals, 20);
    const sma50 = computeSMA(compositeVals, 50);
    const ema12 = computeEMA(compositeVals, 12);
    const boll = computeBollinger(compositeVals, 20);
    return data.map((d, i) => ({
      ...d,
      sma20: sma20[i],
      sma50: sma50[i],
      ema12: ema12[i],
      bollUpper: boll.upper[i],
      bollLower: boll.lower[i],
    }));
  }, [data]);

  const toggle = (k: Indicator) => setActive(prev => {
    const next = new Set(prev);
    next.has(k) ? next.delete(k) : next.add(k);
    return next;
  });

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500 text-sm">No historical similarity data available</div>;
  }

  return (
    <div>
      {/* Indicator Toggle Buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {INDICATORS.map(ind => (
          <button
            key={ind.key}
            onClick={() => toggle(ind.key)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all ${
              active.has(ind.key)
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-white/10'
            }`}
            style={active.has(ind.key) ? { borderColor: ind.color, color: ind.color } : undefined}
          >
            {ind.label}
          </button>
        ))}
      </div>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={enriched}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              stroke="#475569"
              fontSize={10}
              tickFormatter={(value: string) => {
                const d = new Date(value);
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
              minTickGap={40}
            />
            <YAxis stroke="#475569" fontSize={10} tickFormatter={(v: number) => `${v}%`} domain={['dataMin - 5', 'dataMax + 5']} />
            <Tooltip
              contentStyle={tooltipStyle as any}
              formatter={(value: any, name: any) => [value != null ? `${value}%` : '—', name]}
              labelFormatter={(label: string) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            />
            <Line type="monotone" dataKey="crisis2007" stroke="#dc2626" strokeWidth={2} name="2007 Crisis" dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="bubble2000" stroke="#ea580c" strokeWidth={2} name="2000 Bubble" dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="pandemic2020" stroke="#d97706" strokeWidth={2} name="2020 Pandemic" dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="composite" stroke="#6366f1" strokeDasharray="4 4" strokeWidth={2} name="Composite" dot={false} />
            {/* Indicator overlays */}
            {active.has('sma20') && <Line type="monotone" dataKey="sma20" stroke="#22d3ee" strokeWidth={1.5} name="SMA 20" dot={false} strokeDasharray="6 3" />}
            {active.has('sma50') && <Line type="monotone" dataKey="sma50" stroke="#a78bfa" strokeWidth={1.5} name="SMA 50" dot={false} strokeDasharray="6 3" />}
            {active.has('ema12') && <Line type="monotone" dataKey="ema12" stroke="#34d399" strokeWidth={1.5} name="EMA 12" dot={false} />}
            {active.has('bollinger') && (
              <>
                <Line type="monotone" dataKey="bollUpper" stroke="#f472b6" strokeWidth={1} name="Boll Upper" dot={false} strokeDasharray="2 2" />
                <Line type="monotone" dataKey="bollLower" stroke="#f472b6" strokeWidth={1} name="Boll Lower" dot={false} strokeDasharray="2 2" />
              </>
            )}
            <Brush dataKey="date" height={20} stroke="#475569" fill="#0c1222" travellerWidth={8}
              tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'short' })} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
