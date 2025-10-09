"use client";
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type RegimePoint = { date: string; riskLevel: number; volatility: number };

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #475569',
  borderRadius: '8px',
  color: '#f1f5f9'
};

export default function MarketRegimeArea({ data }: { data: RegimePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#d1d5db" fontSize={12} tickFormatter={(v: string)=> new Date(v).toLocaleDateString('en-US',{month:'short'})} />
        <YAxis stroke="#d1d5db" fontSize={12} />
        <Tooltip 
          contentStyle={tooltipStyle as any}
          formatter={(value: any, name: any) => [
            typeof value === 'number' ? (name === 'riskLevel' ? `${value.toFixed(1)}%` : value.toFixed(1)) : value,
            name === 'riskLevel' ? 'Risk Level' : 'Volatility'
          ]}
        />
        <Area type="monotone" dataKey="riskLevel" stroke="#dc2626" fill="#dc2626" fillOpacity={0.55} strokeWidth={2} />
        <Area type="monotone" dataKey="volatility" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
