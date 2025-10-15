"use client"
import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface Props { values: number[] }

export function PerformanceHistogram({ values }: Props) {
  const clean = values.filter(v => Number.isFinite(v))
  const stats = useMemo(() => {
    if (!clean.length) return { mean:0, median:0, count:0 }
    const sorted = [...clean].sort((a,b)=>a-b)
    const mean = clean.reduce((s,v)=>s+v,0)/clean.length
    const median = sorted[Math.floor(sorted.length/2)]
    return { mean, median, count: clean.length }
  }, [clean])
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
      <h3 className="text-white font-semibold mb-3 text-base">Performance Distribution</h3>
      <Plot
        data={[{
          type: 'histogram',
          x: clean,
          marker: { color: '#60a5fa', line: { color: '#1f2937', width: 1 } },
          opacity: 0.9,
          hovertemplate: '<b>%{y}</b> tickers<extra></extra>'
        }]}
        layout={{
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { t: 10, b: 45, l: 50, r: 20 },
          height: 300,
          xaxis: { title: { text: '% Change', font: { color: '#9ca3af', size: 12 } }, gridcolor: '#374151', tickfont: { color: '#cbd5e1', size: 11 }, ticksuffix: '%', tickformat: '.1f' },
          yaxis: { title: { text: 'Count', font: { color: '#9ca3af', size: 12 } }, gridcolor: '#374151', tickfont: { color: '#e5e7eb', size: 11 }, tickformat: ',d' },
          shapes: [
            { type:'line', x0: stats.mean, x1: stats.mean, y0:0, y1:1, xref:'x', yref:'paper', line:{color:'#f59e0b', dash:'dash'} },
            { type:'line', x0: stats.median, x1: stats.median, y0:0, y1:1, xref:'x', yref:'paper', line:{color:'#10b981', dash:'dot'} }
          ],
          annotations: [
            { x: stats.mean, y:1, xref:'x', yref:'paper', text:`Mean ${stats.mean.toFixed(2)}%`, showarrow:false, yanchor:'bottom', font:{color:'#f59e0b', size:12} },
            { x: stats.median, y:1, xref:'x', yref:'paper', text:`Median ${stats.median.toFixed(2)}%`, showarrow:false, yanchor:'bottom', font:{color:'#10b981', size:12} }
          ]
        }}
        config={{ displayModeBar: false }}
        style={{ width: '100%', height: '300px' }}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="px-2 py-1 rounded bg-gray-700/70 text-gray-100 text-sm">
          Tickers: <span className="text-white font-semibold">{stats.count}</span>
        </span>
        <span className="px-2 py-1 rounded bg-gray-700/70 text-gray-100 text-sm">
          Mean: <span className="text-white font-semibold">{stats.mean.toFixed(2)}%</span>
        </span>
        <span className="px-2 py-1 rounded bg-gray-700/70 text-gray-100 text-sm">
          Median: <span className="text-white font-semibold">{stats.median.toFixed(2)}%</span>
        </span>
      </div>
    </div>
  )
}
