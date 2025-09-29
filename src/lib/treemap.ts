// Lightweight squarified treemap layout
// Input: items with value. Output: x,y,w,h in 0..1

export interface TreemapItem<T=any> { id: string; value: number; data: T }
export interface TreemapRect<T=any> { id:string; x:number; y:number; w:number; h:number; data:T }

function worst(row: TreemapItem[], w: number) {
  const s = row.reduce((a,b)=>a+b.value,0)
  const max = Math.max(...row.map(r=>r.value))
  const min = Math.min(...row.map(r=>r.value))
  const r = (w*w*s)? Math.max((w*w*max)/(s*s), (s*s)/(w*w*min)) : 0
  return r
}

function layoutRow(row: TreemapItem[], x:number,y:number,w:number,h:number, horizontal:boolean, out:TreemapRect[]) {
  const s = row.reduce((a,b)=>a+b.value,0)
  if (horizontal) {
    let cx = x
    row.forEach(item=>{
      const ww = w * (item.value / s)
      out.push({ id:item.id, x:cx, y, w:ww, h, data:item.data })
      cx += ww
    })
  } else {
    let cy = y
    row.forEach(item=>{
      const hh = h * (item.value / s)
      out.push({ id:item.id, x, y:cy, w, h:hh, data:item.data })
      cy += hh
    })
  }
}

export function squarify<T>(items: TreemapItem<T>[], width=1, height=1): TreemapRect<T>[] {
  const filtered = items.filter(i=>i.value>0)
  const total = filtered.reduce((a,b)=>a+b.value,0) || 1
  const normalized = filtered.map(i=> ({ ...i, value:i.value / total }))
  const out: TreemapRect<T>[] = []
  let x=0, y=0, w=width, h=height
  let row: TreemapItem<T>[] = []
  let remaining = normalized.slice()
  while (remaining.length) {
    const item = remaining[0]
    if (!row.length) {
      row.push(item)
      remaining.shift()
      continue
    }
    const horizontal = w >= h
    const test = [...row, item]
    const side = horizontal? h : w
    if (worst(test, side) <= worst(row, side)) {
      row.push(item)
      remaining.shift()
    } else {
      // layout row
      layoutRow(row,x,y,w,h*(row.reduce((a,b)=>a+b.value,0)), !horizontal, out)
      const usedFraction = row.reduce((a,b)=>a+b.value,0)
      if (horizontal) {
        y += h * usedFraction
        h *= (1 - usedFraction)
      } else {
        x += w * usedFraction
        w *= (1 - usedFraction)
      }
      row=[]
    }
  }
  if (row.length) {
    const horizontal = w >= h
    layoutRow(row,x,y,w,h, !horizontal, out)
  }
  return out
}
