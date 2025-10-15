"use client";
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

export type ProbabilityPoint = { date: string; value: number };

export default function ProbabilitySparkline({ data }: { data: ProbabilityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff15" />
        <XAxis dataKey="date" hide />
        <YAxis domain={[0, 100]} hide />
        <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
