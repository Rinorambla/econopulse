"use client";
import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell } from 'recharts';

type DebtDatum = {
  country: string;
  debtToGdp: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme' | 'critical';
};

export default function DebtToGDPBarChart({ data }: { data: DebtDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
        <XAxis dataKey="country" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
        <YAxis stroke="#9ca3af" />
        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#f9fafb' }} />
        <Bar dataKey="debtToGdp">
          {data.map((entry, idx) => (
            <Cell key={idx}
              fill={entry.riskLevel === 'low' ? '#22c55e' : entry.riskLevel === 'medium' ? '#eab308' : entry.riskLevel === 'high' ? '#f97316' : '#ef4444'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
