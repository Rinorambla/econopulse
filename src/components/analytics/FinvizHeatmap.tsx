import React, { useMemo } from 'react'
import { squarify, TreemapItem } from '@/lib/treemap'

export interface HeatmapAsset {
  symbol: string
  name: string
  price: number
  changePercent: number
  volume: number
  marketCap: number
  sector: string
  industry?: string
}

interface HeatmapProps {
  assets: HeatmapAsset[]
  scale?: number
  sectorMinPct?: number // hide sectors < threshold of total cap
}

function color(val:number, scale:number) {
  const s = scale
  const v = Math.max(-s, Math.min(s,val)) / s // -1..1
  const g = v>0? 60+Math.round(160*v) : 60+Math.round(0*(1+v))
  const r = v<0? 60+Math.round(160*-v) : 60
  return `rgb(${r},${g},60)`
}

export const Heatmap: React.FC<HeatmapProps> = ({ assets, scale=5, sectorMinPct=0.01 }) => {
  // Group by sector
  const bySector = useMemo(()=>{
    const m: Record<string, HeatmapAsset[]> = {}
    assets.forEach(a=>{ const s=a.sector||'Other'; (m[s]=m[s]||[]).push(a) })
    return m
  },[assets])

  const totalCap = assets.reduce((s,a)=> s+(a.marketCap||0),0) || 1
  const sectorRects = useMemo(()=>{
    const items: TreemapItem[] = Object.entries(bySector)
      .filter(([sec,list])=> (list.reduce((s,a)=>s+(a.marketCap||0),0)/totalCap) >= sectorMinPct)
      .map(([sec,list])=>({ id:sec, value:list.reduce((s,a)=>s+(a.marketCap||0),0)||list.length, data:{ sector:sec, list } }))
    return squarify(items,1,1)
  },[bySector,totalCap,sectorMinPct])

  return (
    <div className="relative w-full h-[1200px] bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {sectorRects.map(sec => {
        const list: HeatmapAsset[] = sec.data.list
        const rects = squarify(list.map(a=>({ id:a.symbol, value:a.marketCap||1, data:a })),1,1)
        return (
          <div key={sec.id} style={{ position:'absolute', left:`${sec.x*100}%`, top:`${sec.y*100}%`, width:`${sec.w*100}%`, height:`${sec.h*100}%`, padding:2 }} className="overflow-hidden border border-gray-800">
            <div className="text-[10px] font-semibold text-gray-200 px-1 py-[2px] bg-gray-800/70 backdrop-blur-sm truncate">{sec.id}</div>
            <div className="relative w-full h-full">
              {rects.map(r=>{
                const a: HeatmapAsset = r.data
                const val = a.changePercent || 0
                const bg = color(val, scale)
                return (
                  <div key={r.id} style={{ position:'absolute', left:`${r.x*100}%`, top:`${r.y*100}%`, width:`${r.w*100}%`, height:`${r.h*100}%`, background:bg }} className="group outline outline-gray-900/40 overflow-hidden cursor-pointer">
                    <div className="p-0.5 h-full flex flex-col justify-between">
                      <div className="text-[9px] font-medium leading-tight text-white truncate" title={a.name}>{a.symbol}</div>
                      <div className="text-[9px] font-mono font-semibold text-white/90">{val>0?'+':''}{val.toFixed(2)}%</div>
                    </div>
                    <div className="absolute inset-0 hidden group-hover:flex flex-col justify-center items-center text-[10px] bg-black/60 text-white p-1 text-center">
                      <div className="font-semibold mb-0.5">{a.symbol}</div>
                      <div className="opacity-80 truncate mb-0.5">{a.name}</div>
                      <div>{a.price?.toFixed(2)} • {val>0?'+':''}{val.toFixed(2)}%</div>
                      <div className="opacity-70">Cap: {a.marketCap? formatCap(a.marketCap):'n/a'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      <div className="absolute bottom-1 left-2 right-2 flex items-center gap-1 text-[10px] text-gray-300">
        <span>-{scale}%</span>
        <div className="flex-1 h-2 bg-gradient-to-r from-red-700 via-gray-700 to-green-700 rounded" />
        <span>+{scale}%</span>
  {/* Source note removed per request */}
      </div>
    </div>
  )
}

function formatCap(v:number) {
  if (v>=1e12) return (v/1e12).toFixed(2)+'T'
  if (v>=1e9) return (v/1e9).toFixed(2)+'B'
  if (v>=1e6) return (v/1e6).toFixed(1)+'M'
  return v.toString()
}

export default Heatmap
