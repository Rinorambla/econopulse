"use client";

import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type SpreadPoint = { time: number; spread: number };
type ValuePoint = { symbol: string; [key: string]: number | string };

export default function ETFLineChartLazy({
  mode,
  data,
  metric,
  spreadType
}: {
  mode: 'spread' | 'value';
  data: SpreadPoint[] | ValuePoint[];
  metric?: string; // for value mode
  spreadType?: 'percent' | 'absolute';
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      {mode === 'spread' ? (
        <LineChart data={data as SpreadPoint[]} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            tick={{ fontSize: 11, fill: '#f1f5f9' }}
            tickFormatter={(t: number) => new Date(Number(t)).toLocaleDateString()}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#f1f5f9' }}
            label={{
              value: spreadType === 'percent' ? 'Spread (%)' : 'Spread ($)',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#f1f5f9' }
            }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px', color: '#ffffff' }}
            formatter={(v: any) => (spreadType === 'percent' ? [`${Number(v).toFixed(2)}%`, 'Spread'] : [`$${Number(v).toFixed(2)}`, 'Spread'])}
            labelFormatter={(l: any) => new Date(Number(l)).toLocaleDateString()}
          />
          <Line type="monotone" dataKey="spread" stroke="#60a5fa" strokeWidth={2} dot={false} activeDot={{ r: 3, stroke: '#93c5fd', strokeWidth: 1 }} />
        </LineChart>
      ) : (
        <LineChart data={data as ValuePoint[]} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="symbol" tick={{ fontSize: 12, fill: '#f1f5f9' }} />
          <YAxis tick={{ fontSize: 11, fill: '#f1f5f9' }} />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px', color: '#ffffff' }}
            formatter={(v: any) => [`${Number(v).toFixed(2)}`, metric || 'Value']}
          />
          <Line type="monotone" dataKey={metric || 'price'} stroke="#6366f1" strokeWidth={2} dot={{ r: 3, stroke: '#818cf8', strokeWidth: 1, fill: '#818cf8' }} activeDot={{ r: 4, stroke: '#93c5fd', strokeWidth: 1 }} />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
