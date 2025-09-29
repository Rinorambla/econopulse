"use client"
import React, { useMemo } from 'react'

interface BullBearSentimentMiniProps {
  performances: number[] // real performance numbers (selected timeframe) for visible assets
}

// Small sparkline built from current performances (sorted by symbol order outside)
export const BullBearSentimentMini: React.FC<BullBearSentimentMiniProps> = ({ performances }) => {
  const { bullPct, bearPct, spark } = useMemo(() => {
    const pos = performances.filter(v => v > 0).length
    const neg = performances.filter(v => v < 0).length
    const total = pos + neg || 1
    const bullPct = (pos / total) * 100
    const bearPct = 100 - bullPct

    // Build sparkline paths (positive / negative segments) using normalized values
    const maxAbs = Math.max(1, Math.min(15, Math.max(...performances.map(v => Math.abs(v)))))
    const pts = performances.slice(0, 60) // cap to keep svg tiny
    const width = 140
    const height = 32
    const step = pts.length > 1 ? width / (pts.length - 1) : width
    const normY = (v: number) => {
      const clamped = Math.max(-maxAbs, Math.min(maxAbs, v))
      const ratio = (clamped + maxAbs) / (2 * maxAbs)
      return height - ratio * height
    }
    const buildPath = (filterPositive: boolean) => {
      let d = ''
      pts.forEach((v, i) => {
        const isPos = v >= 0
        if ((filterPositive && !isPos) || (!filterPositive && isPos)) {
          d += ' '
          return
        }
        const x = i * step
        const y = normY(v)
        // Start new segment with M, continue with L
        const prev = pts[i - 1]
        const prevOk = i > 0 && ((filterPositive && prev >= 0) || (!filterPositive && prev < 0))
        d += `${prevOk ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      return d
    }
    const spark = {
      posPath: buildPath(true),
      negPath: buildPath(false),
      width,
      height
    }
    return { bullPct, bearPct, spark }
  }, [performances])

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 flex items-center gap-4 w-full">
      <div className="relative">
        <svg width={spark.width} height={spark.height} viewBox={`0 0 ${spark.width} ${spark.height}`} className="overflow-visible">
          <path d={spark.negPath} stroke="#dc2626" strokeWidth={1.5} fill="none" />
          <path d={spark.posPath} stroke="#16a34a" strokeWidth={1.5} fill="none" />
          {/* midline */}
          <line x1={0} x2={spark.width} y1={spark.height/2} y2={spark.height/2} stroke="#374151" strokeDasharray="3 3" />
        </svg>
      </div>
      <div className="flex flex-col text-xs font-mono leading-tight">
        <span className="text-green-400 font-semibold">{bullPct.toFixed(0)}%</span>
        <span className="text-red-400 font-semibold">{bearPct.toFixed(0)}%</span>
      </div>
      <div className="flex flex-col gap-2 ml-2">
        <span className="px-3 py-1 rounded text-xs font-semibold bg-green-600/80 text-white border border-green-500">BULL</span>
        <span className="px-3 py-1 rounded text-xs font-semibold bg-red-600/80 text-white border border-red-500">BEAR</span>
      </div>
      <div className="ml-auto flex flex-col items-end text-[11px] text-gray-300">
        <span className="leading-none">Sentiment</span>
        <span className={bullPct>=bearPct ? 'text-green-400 font-semibold':'text-red-400 font-semibold'}>
          {bullPct>=bearPct ? 'Bullish' : 'Bearish'}
        </span>
      </div>
    </div>
  )
}

export default BullBearSentimentMini
