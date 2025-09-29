"use client"
import React from 'react'
import dynamic from 'next/dynamic'
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export interface SectorDatum { name: string; avgPerformance: number; count: number }

export function SectorBarChart({ data }: { data: SectorDatum[] }) {
  const top = data.slice(0, 10)
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
  <h3 className="text-white font-semibold mb-3 text-base">Sector Avg Performance</h3>
      <Plot
        data={[{
          type: 'bar',
          x: top.map(s => Number(s.avgPerformance)),
          y: top.map(s => s.name),
          orientation: 'h',
          marker: { color: top.map(s => s.avgPerformance >= 0 ? '#22c55e' : '#ef4444') },
          hovertemplate: '%{y}: <b>%{x:.2f}%</b><extra></extra>',
          width: 0.6,
          text: top.map(s => `${s.avgPerformance.toFixed(1)}%`),
          textposition: 'outside',
          textfont: { color: '#e5e7eb', size: 11 }
        }]}
        layout={{
          paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { t: 10, b: 30, l: 120, r: 20 },
          height: 300,
          xaxis: { title: { text: '%', font:{ color:'#9ca3af', size:12 } }, zeroline: false, gridcolor: '#374151', tickfont:{ color:'#cbd5e1', size:11 } },
          yaxis: { automargin: true, tickfont:{ color:'#e5e7eb', size:12 } },
          showlegend: false
        }}
        config={{ displayModeBar: false }}
        style={{ width: '100%', height: '300px' }}
      />
    </div>
  )
}
