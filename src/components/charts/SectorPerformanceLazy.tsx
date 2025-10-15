"use client";

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line
} from 'recharts';

export type SectorPoint = {
  sector: string;
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  yearly: number;
  value: number; // selected period value for single bar view
};

export default function SectorPerformanceLazy({
  data,
  view
}: {
  data: SectorPoint[];
  view: 'bar' | 'multi';
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="w-full h-full bg-white/5 rounded" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      {view === 'bar' ? (
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="sector"
            tick={{ fontSize: 11, fill: '#f1f5f9' }}
            angle={-40}
            textAnchor="end"
            height={90}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#f1f5f9' }}
            label={{
              value: 'Performance (%)',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#f1f5f9' }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15,23,42,0.95)',
              border: '1px solid rgba(148,163,184,0.3)',
              borderRadius: '8px',
              color: '#fff'
            }}
            formatter={(v: any, _n: any, p: any) => [
              `${Number(v).toFixed(2)}%`,
              p?.payload?.sector || 'Value'
            ]}
          />
          <Bar dataKey="value" fill="url(#perfGradient)" stroke="#60a5fa" strokeWidth={1} radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="sector"
            tick={{ fontSize: 11, fill: '#f1f5f9' }}
            angle={-40}
            textAnchor="end"
            height={90}
          />
          <YAxis tick={{ fontSize: 11, fill: '#f1f5f9' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15,23,42,0.95)',
              border: '1px solid rgba(148,163,184,0.3)',
              borderRadius: '8px',
              color: '#fff'
            }}
          />
          <Line type="monotone" dataKey="daily" stroke="#60a5fa" strokeWidth={2} dot={false} name="Daily %" />
          <Line type="monotone" dataKey="weekly" stroke="#34d399" strokeWidth={2} dot={false} name="Weekly %" />
          <Line type="monotone" dataKey="monthly" stroke="#fbbf24" strokeWidth={2} dot={false} name="Monthly %" />
          <Line type="monotone" dataKey="quarterly" stroke="#a78bfa" strokeWidth={2} dot={false} name="Quarterly %" />
          <Line type="monotone" dataKey="yearly" stroke="#f87171" strokeWidth={2} dot={false} name="Yearly %" />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
