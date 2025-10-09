"use client";
import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';

type PopulationDatum = {
  country: string;
  population: number;
  growthRate: number; // 0..1
  urbanization: number; // 0..1
  density: number;
  medianAge: number;
};

function formatNumber(num: number, decimals = 0) {
  return num?.toLocaleString(undefined, { maximumFractionDigits: decimals });
}
function formatPercent(num: number, decimals = 0) {
  return num.toFixed(decimals) + '%';
}
function formatPopulation(num: number) {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
  return String(num);
}

export default function PopulationGrowthBarChart({ data }: { data: PopulationDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3,3" stroke="#ffffff20" />
        <XAxis dataKey="country" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
        <YAxis stroke="#9ca3af" />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '10px', minWidth: '280px' }}
          labelStyle={{ color: '#f9fafb', fontWeight: 'bold' }}
          formatter={(value: any, name: any, props: any) => {
            const d = props.payload;
            return [
              <div key="pop-tooltip" style={{ color: '#f9fafb', fontSize: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: 8 }}>🌍 {d.country}</div>
                <div>Population: <span style={{ fontWeight: 600 }}>{formatPopulation(d.population)}</span></div>
                <div>Growth: <span style={{ fontWeight: 600, color: d.growthRate>=1? '#22c55e':'#eab308' }}>{formatPercent(d.growthRate, 2)}</span></div>
                <div>Urbanization: <span style={{ fontWeight: 600 }}>{formatPercent(d.urbanization, 1)}</span></div>
                <div>Density: <span style={{ fontWeight: 600 }}>{formatNumber(d.density)}</span> /km²</div>
                <div>Median Age: <span style={{ fontWeight: 600 }}>{formatNumber(d.medianAge, 1)}</span></div>
              </div>, ''
            ];
          }}
        />
        <Bar dataKey="growthRate" name="Growth %" fill="#22d3ee" />
      </BarChart>
    </ResponsiveContainer>
  );
}
