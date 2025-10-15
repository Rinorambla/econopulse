"use client";
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface Row { time: number; [k: string]: number; }
export type ComparisonLineChartProps = { data: Row[]; symbols: string[] };

const colors = ['#60a5fa','#34d399','#f59e0b','#f472b6','#22d3ee','#a78bfa','#fca5a5','#c084fc'];

const formatDate = (t:number) => {
  try { return new Date(t*1000).toLocaleDateString(); } catch { return String(t); }
};

export default function ComparisonLineChartLazy({ data, symbols }: ComparisonLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="time" tickFormatter={formatDate} tick={{fontSize:10, fill:'#94a3b8'}} minTickGap={24} />
        <YAxis tick={{fontSize:10, fill:'#94a3b8'}} width={36} domain={["dataMin", "dataMax"]} />
        <Tooltip labelFormatter={(v)=> formatDate(Number(v))} contentStyle={{ background:"rgba(2,6,23,0.95)", border:"1px solid #475569", fontSize: "11px" }} />
        <Legend wrapperStyle={{fontSize:'10px'}} />
        {symbols.map((s, i) => (
          <Line key={s} type="monotone" dataKey={s} stroke={colors[i % colors.length]} dot={false} strokeWidth={1.6} isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
