import { NextResponse } from 'next/server'
import { buildDefaultUniverse, fetchMultiSourceUniverse } from '@/lib/multi-source-pipeline'
import { HierNode, HeatmapMetric } from '@/lib/global-heatmap-types'

export const revalidate = 0

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const metric = (searchParams.get('metric') as HeatmapMetric) || 'changeLocalPct'
  const universeItems = buildDefaultUniverse()
  const norm = await fetchMultiSourceUniverse(universeItems)
    // Build hierarchy region -> country -> sector -> instrument
    const byRegion: Record<string, HierNode> = {}
    for (const n of norm) {
      const r = byRegion[n.region] || (byRegion[n.region] = { id:n.region, name:n.region, level:'region', value:0, change:0, children:[] })
      let countryNode = r.children!.find(c=>c.id===n.country)
      if (!countryNode) { countryNode = { id:n.country, name:n.country, level:'country', value:0, change:0, children:[] }; r.children!.push(countryNode) }
      let sectorNode = countryNode.children!.find(c=>c.id===n.country+'-'+n.sector)
      if (!sectorNode) { sectorNode = { id:n.country+'-'+n.sector, name:n.sector, level:'sector', value:0, change:0, children:[] }; countryNode.children!.push(sectorNode) }
      const size = n.marketCapUSD || 1e9 // fallback size; refine later per type
      const changeMetric = metric==='changeUSDPct' ? n.changeUSDPct : metric==='benchmarkRelPct' ? n.benchmarkRelPct : n.changeLocalPct
      const change = changeMetric ?? 0
      sectorNode.children!.push({ id:n.id, name:n.symbol, level:'instrument', value:size, change, data:n })
      sectorNode.value += size
      sectorNode.change = sectorNode.children!.reduce((s,c)=>s+c.change,0)/sectorNode.children!.length
      countryNode.value += size
      countryNode.change = countryNode.children!.reduce((s,c)=>s+c.change,0)/countryNode.children!.length
      r.value += size
      r.change = r.children!.reduce((s,c)=>s+c.change,0)/r.children!.length
    }
    const regions = Object.values(byRegion)
    return NextResponse.json({ ok:true, count:norm.length, regions })
  } catch(e:any) {
    return NextResponse.json({ ok:false, error:e?.message||'error' }, { status:500 })
  }
}
