"use client";
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Brush, ComposedChart, ReferenceLine } from 'recharts';

type RegimePoint = { date: string; riskLevel: number; volatility: number; regime?: string };

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

type Indicator = 'sma20' | 'sma50' | 'ema12' | 'thresholds';
const INDICATORS: { key: Indicator; label: string; color: string }[] = [
  { key: 'sma20', label: 'SMA 20', color: '#22d3ee' },
  { key: 'sma50', label: 'SMA 50', color: '#a78bfa' },
  { key: 'ema12', label: 'EMA 12', color: '#34d399' },
  { key: 'thresholds', label: 'Regime Thresholds', color: '#f472b6' },
];

export default function MarketRegimeArea({ data }: { data: RegimePoint[] }) {
  const [active, setActive] = useState<Set<Indicator>>(new Set());

  const enriched = useMemo(() => {
    if (!data || data.length === 0) return [];
    const riskVals = data.map(d => d.riskLevel);
    const sma20 = computeSMA(riskVals, 20);
    const sma50 = computeSMA(riskVals, 50);
    const ema12 = computeEMA(riskVals, 12);
    return data.map((d, i) => ({
      ...d,
      riskSma20: sma20[i],
      riskSma50: sma50[i],
      riskEma12: ema12[i],
    }));
  }, [data]);

  const toggle = (k: Indicator) => setActive(prev => {
    const next = new Set(prev);
    next.has(k) ? next.delete(k) : next.add(k);
    return next;
  });

  return (
    <div className="flex flex-col h-full">
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
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={enriched}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#475569" fontSize={10} tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'short' })} minTickGap={40} />
            <YAxis stroke="#475569" fontSize={10} />
            <Tooltip
              contentStyle={tooltipStyle as any}
              formatter={(value: any, name: any) => {
                if (value == null) return ['—', name];
                const labels: Record<string, string> = { riskLevel: 'Risk Level', volatility: 'Volatility', riskSma20: 'Risk SMA 20', riskSma50: 'Risk SMA 50', riskEma12: 'Risk EMA 12' };
                return [typeof value === 'number' ? value.toFixed(1) : value, labels[name] || name];
              }}
              labelFormatter={(label: string) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            />
            <Area type="monotone" dataKey="riskLevel" stroke="#dc2626" fill="#dc2626" fillOpacity={0.45} strokeWidth={2} name="riskLevel" />
            <Area type="monotone" dataKey="volatility" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} name="volatility" />
            {/* Indicator overlays */}
            {active.has('sma20') && <Line type="monotone" dataKey="riskSma20" stroke="#22d3ee" strokeWidth={1.5} dot={false} name="riskSma20" strokeDasharray="6 3" />}
            {active.has('sma50') && <Line type="monotone" dataKey="riskSma50" stroke="#a78bfa" strokeWidth={1.5} dot={false} name="riskSma50" strokeDasharray="6 3" />}
            {active.has('ema12') && <Line type="monotone" dataKey="riskEma12" stroke="#34d399" strokeWidth={1.5} dot={false} name="riskEma12" />}
            {/* Regime threshold lines */}
            {active.has('thresholds') && (
              <>
                <ReferenceLine y={80} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'Crisis', position: 'right', fill: '#dc2626', fontSize: 9 }} />
                <ReferenceLine y={65} stroke="#ea580c" strokeDasharray="4 4" label={{ value: 'Late Cycle', position: 'right', fill: '#ea580c', fontSize: 9 }} />
                <ReferenceLine y={50} stroke="#d97706" strokeDasharray="4 4" label={{ value: 'Mid Cycle', position: 'right', fill: '#d97706', fontSize: 9 }} />
                <ReferenceLine y={40} stroke="#16a34a" strokeDasharray="4 4" label={{ value: 'Expansion', position: 'right', fill: '#16a34a', fontSize: 9 }} />
              </>
            )}
            <Brush dataKey="date" height={20} stroke="#475569" fill="#0c1222" travellerWidth={8}
              tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'short' })} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
