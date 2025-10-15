import React, { useMemo } from 'react'
import { HierNode } from '@/lib/global-heatmap-types'
import { squarify, TreemapItem } from '@/lib/treemap'

interface Props { regions: HierNode[]; pctScale?: number }

// Clamp helper
const clamp = (v:number,min:number,max:number)=> Math.min(max, Math.max(min,v))

function colorFromChange(pct:number, scale:number) {
  const v = clamp(pct, -scale, scale) / scale // -1..1
  // Smooth green/red gradient
  const r = v < 0 ? 220 : Math.round(220 - 160 * v)
  const g = v > 0 ? 210 : Math.round(210 + 120 * v)
  const b = 190 - Math.round(Math.abs(v) * 140)
  return `rgb(${r},${g},${b})`
}

export const GlobalTreemap: React.FC<Props> = ({ regions, pctScale=3 }) => {
  const total = regions.reduce((s,r)=> s + (r.value||0), 0) || 1
  // Sort regions by value desc for consistent layout
  const ordered = [...regions].sort((a,b)=> b.value - a.value)

  return (
    <div className="w-full space-y-6">
      <div className="flex gap-4 w-full" style={{ minHeight: 520 }}>
        {ordered.map(region => {
          const regionWidthPct = (region.value / total) * 100
          const countries = region.children || []
          // Country level squarify layout
            const countryRects = (()=>{
              const items: TreemapItem<HierNode>[] = countries.map(c=>({ id:c.id, value: c.value || 1, data: c }))
              return squarify(items, 1, 1)
            })()
          return (
            <div key={region.id} className="relative flex flex-col bg-[#14181f] border border-gray-700 rounded" style={{ flexBasis: regionWidthPct+'%', minWidth: 160 }}>
              <div className="px-2 pt-2 pb-1 text-xs font-semibold tracking-wide text-gray-200 uppercase">{region.name}</div>
              <div className="flex-1 relative overflow-hidden">
                {countryRects.map(cRect => {
                  const country = cRect.data
                  // Sector layout inside each country
                  const sectors = (country.children||[]).filter(s=> s.level === 'sector')
                  const sectorRects = squarify(sectors.map(s=>({ id:s.id, value:s.value||1, data:s })), 1, 1)
                  // Weighted avg change for country fallback
                  const countryChange = country.change
                  return (
                    <div key={cRect.id} className="absolute border border-gray-800 overflow-hidden" style={{ left:`${cRect.x*100}%`, top:`${cRect.y*100}%`, width:`${cRect.w*100}%`, height:`${cRect.h*100}%` }}>
                      <div className="absolute inset-0">
                        {sectorRects.map(sRect => {
                          const sNode = sRect.data
                          const change = sNode.change
                          return (
                            <div key={sRect.id}
                              className="absolute group transition-colors duration-200"
                              style={{ left:`${sRect.x*100}%`, top:`${sRect.y*100}%`, width:`${sRect.w*100}%`, height:`${sRect.h*100}%`, background: colorFromChange(change, pctScale) }}>
                              {sRect.w > 0.1 && sRect.h > 0.12 && (
                                <div className="p-0.5 h-full flex flex-col justify-between">
                                  <div className="text-[9px] font-medium leading-tight text-white/95 truncate" title={sNode.name}>{sNode.name}</div>
                                  <div className="text-[9px] font-mono font-semibold text-white/95">{change>0?'+':''}{change.toFixed(2)}%</div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center flex-col mix-blend-plus-lighter">
                        <div className="text-white font-bold" style={{ fontSize: Math.min(28, Math.max(12, (cRect.w*100 + cRect.h*100)/4)) }}>{country.name}</div>
                        <div className="text-white/90 text-xs font-medium">{countryChange>0?'+':''}{countryChange.toFixed(2)}%</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-gray-300">
        <span>-{pctScale}%</span>
        <div className="flex-1 h-3 rounded bg-gradient-to-r from-red-700 via-gray-600 to-green-700" />
        <span>+{pctScale}%</span>
        <span className="ml-3 opacity-60">Size = Market Cap (approx) • Color = % Change</span>
      </div>
    </div>
  )
}

export default GlobalTreemap
