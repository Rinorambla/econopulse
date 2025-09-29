import React, { useMemo } from 'react'
import { ExtendedAsset } from '@/hooks/useExtendedMarketData'
import { DEFAULT_GROUPS } from '@/lib/extended-universe'

interface MegaHeatmapProps {
  assets: ExtendedAsset[]
  metric?: 'changePercent'
  scale?: number // percent absolute cap for color scale
  sizeMode?: 'equal' | 'volume'
}

// Simple diverging color scale from -scale .. +scale
function colorFor(v:number, scale:number) {
  const s = scale || 5
  const clipped = Math.max(-s, Math.min(s, v))
  const t = clipped / s // -1..1
  if (t > 0) {
    const g = 80 + Math.round(120 * t)
    return `rgb(0,${g},0)`
  } else if (t < 0) {
    const r = 80 + Math.round(120 * -t)
    return `rgb(${r},0,0)`
  }
  return 'rgb(60,60,60)'
}

export const MegaHeatmap: React.FC<MegaHeatmapProps> = ({ assets, metric='changePercent', scale=5, sizeMode='equal' }) => {
  const groups = useMemo(()=>{
    const by: Record<string, ExtendedAsset[]> = {}
    assets.forEach(a=>{
      const g = a.assetClass || a.category || 'Other'
      by[g] = by[g] || []
      by[g].push(a)
    })
    return by
  }, [assets])

  // Sort groups by avg performance desc
  const orderedGroups = Object.entries(groups).map(([g,list])=>({
    key:g,
    items:list,
    avg:list.reduce((s,a)=>s+(a.performance||a.changePercent||0),0)/list.length
  })).sort((a,b)=> b.avg - a.avg)

  // For sizing
  const maxVol = Math.max(...assets.map(a=>a.volume||0), 1)
  const baseArea = 70 // px^2 baseline tile area

  return (
    <div className="space-y-6">
      <div className="text-xs text-gray-400">Tiles color = daily % change (clipped ±{scale}%). Dimension = {sizeMode==='volume'?'relative volume':'equal size'}.</div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {orderedGroups.map(group => {
          return (
            <div key={group.key} className="bg-gray-800/60 rounded-lg border border-gray-700 p-3 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white truncate">{group.key}</h3>
                <span className={`text-xs ${group.avg>=0?'text-green-400':'text-red-400'}`}>{group.avg>0?'+':''}{group.avg.toFixed(2)}%</span>
              </div>
              <div className="flex flex-wrap gap-[2px]">
                {group.items.sort((a,b)=> (b.volume||0)-(a.volume||0)).map(it=>{
                  const val = (it as any)[metric] ?? it.performance ?? 0
                  const tileSize = sizeMode==='volume' ? Math.max(14, Math.sqrt(baseArea * (it.volume||0)/maxVol)) : Math.sqrt(baseArea)
                  const bg = colorFor(val, scale)
                  return (
                    <div key={it.symbol}
                      title={`${it.symbol} ${val>0?'+':''}${val.toFixed(2)}%\nPrice: ${it.price.toFixed(2)} Vol: ${it.volume}`}
                      className="flex items-center justify-center rounded-sm text-[9px] font-medium shadow-inner"
                      style={{
                        background:bg,
                        width: tileSize,
                        height: tileSize,
                        color: 'white',
                        minWidth:14,
                        minHeight:14,
                        lineHeight:1.1
                      }}
                    >
                      {it.symbol.length>6? it.symbol.slice(0,5)+'…': it.symbol}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-gray-400">
        <span>-{scale}%</span>
        <div className="flex-1 h-2 bg-gradient-to-r from-red-700 via-gray-600 to-green-700 rounded" />
        <span>+{scale}%</span>
      </div>
    </div>
  )
}

export default MegaHeatmap
