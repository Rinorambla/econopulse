"use client";
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

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

export default function HistoricalSimilarityChart({ data }: { data: SimilarityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          stroke="#d1d5db"
          fontSize={12}
          tickFormatter={(value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis
          stroke="#d1d5db"
          fontSize={12}
          tickFormatter={(value: number) => `${value}%`}
        />
        <Tooltip
          contentStyle={tooltipStyle as any}
          formatter={(value: any, name: any) => [`${value}%`, name]}
          labelFormatter={(label: string) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        />
        <Line type="monotone" dataKey="crisis2007" stroke="#dc2626" strokeWidth={3} name="2007 Crisis" dot={{ r: 0 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="bubble2000" stroke="#ea580c" strokeWidth={3} name="2000 Bubble" dot={{ r: 0 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="pandemic2020" stroke="#d97706" strokeWidth={3} name="2020 Pandemic" dot={{ r: 0 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="composite" stroke="#6366f1" strokeDasharray="4 4" strokeWidth={2} name="Composite" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
