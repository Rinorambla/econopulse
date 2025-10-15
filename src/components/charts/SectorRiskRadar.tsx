"use client";
import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

type RadarPoint = { sector: string; riskScore: number; momentum: number; valuation?: number; sentiment?: number };

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #475569',
  borderRadius: '8px',
  color: '#f1f5f9'
};

export default function SectorRiskRadar({ data }: { data: RadarPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data}>
        <PolarGrid stroke="#475569" />
        <PolarAngleAxis dataKey="sector" tick={{ fill: '#d1d5db', fontSize: 12 }} />
        <PolarRadiusAxis angle={0} domain={[0, 100]} tick={{ fill: '#d1d5db', fontSize: 10 }} stroke="#64748b" />
        <Radar name="Risk Score" dataKey="riskScore" stroke="#dc2626" fill="#dc2626" fillOpacity={0.6} strokeWidth={3} dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }} />
        <Radar name="Momentum" dataKey="momentum" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} />
        <Tooltip contentStyle={tooltipStyle as any} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
