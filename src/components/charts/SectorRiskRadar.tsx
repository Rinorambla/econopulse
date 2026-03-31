"use client";
import React, { useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from 'recharts';

type RadarPoint = { sector: string; riskScore: number; momentum: number; valuation?: number; sentiment?: number };

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #475569',
  borderRadius: '8px',
  color: '#f1f5f9'
};

type Dimension = 'riskScore' | 'momentum' | 'valuation' | 'sentiment';
const DIMENSIONS: { key: Dimension; label: string; stroke: string; fill: string; fillOpacity: number; default: boolean }[] = [
  { key: 'riskScore', label: 'Risk Score', stroke: '#dc2626', fill: '#dc2626', fillOpacity: 0.5, default: true },
  { key: 'momentum', label: 'Momentum', stroke: '#3b82f6', fill: '#3b82f6', fillOpacity: 0.25, default: true },
  { key: 'valuation', label: 'Valuation', stroke: '#f59e0b', fill: '#f59e0b', fillOpacity: 0.2, default: false },
  { key: 'sentiment', label: 'Sentiment', stroke: '#10b981', fill: '#10b981', fillOpacity: 0.2, default: false },
];

export default function SectorRiskRadar({ data }: { data: RadarPoint[] }) {
  const [active, setActive] = useState<Set<Dimension>>(new Set(DIMENSIONS.filter(d => d.default).map(d => d.key)));

  const toggle = (k: Dimension) => setActive(prev => {
    const next = new Set(prev);
    next.has(k) ? next.delete(k) : next.add(k);
    return next;
  });

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500 text-sm">No sector risk data available</div>;
  }

  return (
    <div>
      {/* Dimension Toggle Buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {DIMENSIONS.map(dim => (
          <button
            key={dim.key}
            onClick={() => toggle(dim.key)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all ${
              active.has(dim.key)
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-white/10'
            }`}
            style={active.has(dim.key) ? { borderColor: dim.stroke, color: dim.stroke } : undefined}
          >
            {dim.label}
          </button>
        ))}
      </div>
      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#1e293b" />
            <PolarAngleAxis dataKey="sector" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} stroke="#1e293b" />
            {DIMENSIONS.map(dim => active.has(dim.key) && (
              <Radar key={dim.key} name={dim.label} dataKey={dim.key} stroke={dim.stroke} fill={dim.fill} fillOpacity={dim.fillOpacity} strokeWidth={2} dot={{ fill: dim.stroke, strokeWidth: 1, r: 3 }} />
            ))}
            <Tooltip contentStyle={tooltipStyle as any} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
