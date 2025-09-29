import React, { useState } from 'react'
import { HierNode } from '@/lib/global-heatmap-types'

interface Props { regions: HierNode[] }

interface Crumb { id:string; name:string; node:HierNode }

const formatPct = (v:number)=> `${v>=0?'+':''}${v.toFixed(2)}%`

export const GlobalMarketHeatmap: React.FC<Props> = ({ regions }) => {
  const [path, setPath] = useState<Crumb[]>([])
  const root: HierNode = { id:'root', name:'World', level:'region', value:0, change:0, children:regions }
  const current = path.length? path[path.length-1].node : root

  function drill(node: HierNode) {
    if (!node.children || node.children.length===0) return
    setPath(p=>[...p,{ id:node.id, name:node.name, node }])
  }
  function backTo(index: number) {
    setPath(p=>p.slice(0,index))
  }

  return (
    <div className="space-y-3">
      <div className="text-xs flex flex-wrap items-center gap-1">
        <button onClick={()=>setPath([])} className="px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600">World</button>
        {path.map((c,i)=>(
          <React.Fragment key={c.id}>
            <span className="text-gray-500">/</span>
            <button onClick={()=>backTo(i+1)} className="px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600">{c.name}</button>
          </React.Fragment>
        ))}
      </div>
      <div className="grid md:grid-cols-4 gap-3">
        {current.children?.map(child => (
          <div key={child.id} className="border border-gray-700 rounded p-2 bg-gray-800/40 cursor-pointer hover:border-gray-500 transition" onClick={()=>drill(child)}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-gray-200 truncate" title={child.name}>{child.name}</span>
              <span className={child.change>=0? 'text-green-400 text-[10px]':'text-red-400 text-[10px]'}>{formatPct(child.change)}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {child.children?.slice(0,10).map(gc=> (
                <div key={gc.id} className="text-[9px] px-1 py-0.5 rounded bg-gray-700/60 text-white" title={`${gc.name} ${formatPct(gc.change)}`}>{gc.name}</div>
              ))}
              {child.children && child.children.length>10 && <span className="text-[9px] text-gray-400">+{child.children.length-10}</span>}
            </div>
          </div>
        ))}
        {!current.children?.length && <div className="text-xs text-gray-400">No deeper data.</div>}
      </div>
    </div>
  )
}

export default GlobalMarketHeatmap
