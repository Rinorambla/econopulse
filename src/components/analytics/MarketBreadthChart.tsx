"use client"
import React from 'react'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export interface BreadthData {
  positive: number
  negative: number
  neutral: number
}

export function MarketBreadthChart({ data }: { data: BreadthData }) {
  const total = data.positive + data.negative + data.neutral || 1
  const pct = (n: number) => (n / total * 100).toFixed(1)
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
  <h3 className="text-white font-semibold mb-3 text-base">Market Breadth</h3>
      <Plot
        data={[{
          values: [data.positive, data.negative, data.neutral],
          labels: [`Gainers ${pct(data.positive)}%`,`Losers ${pct(data.negative)}%`,`Neutral ${pct(data.neutral)}%`],
          type: 'pie',
          marker: { colors: ['#16a34a','#dc2626','#9ca3af'] },
          hole: .55,
          textinfo: 'label+value',
          textfont: { size: 12, color: '#e5e7eb' }
        }]}
        layout={{
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { t: 10, b: 10, l: 10, r: 10 },
          showlegend: false,
          height: 200
        }}
        config={{ displayModeBar: false }}
        style={{ width: '100%', height: '200px' }}
      />
    </div>
  )
}
