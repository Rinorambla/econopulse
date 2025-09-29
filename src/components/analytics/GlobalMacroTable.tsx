import React, { useMemo } from 'react'
import { INDICES, FX_MAJORS, COMMODITIES, CRYPTO, MEGACAP_EQUITIES, RATES, SECTOR_ETFS, COUNTRY_ETFS } from '@/lib/symbol-universe'

export interface MacroAsset {
  symbol: string
  name: string
  price: number
  changePercent: number
  category: string
  change?: number
}

interface GlobalMacroTableProps {
  assets: MacroAsset[]
  maxAbs?: number // fallback scaling cap
}

// Friendly names mapping
const FRIENDLY: Record<string,string> = {
  '^GSPC':'S&P 500','^DJI':'Dow Jones','^IXIC':'NASDAQ','^N225':'Nikkei 225','^GDAXI':'DAX','^FTSE':'FTSE 100','^STOXX50E':'STOXX 50','^VIX':'VIX','^AXJO':'ASX200',
  'GC=F':'Gold','SI=F':'Silver','HG=F':'Copper','CL=F':'WTI','BZ=F':'Brent','NG=F':'Nat Gas','ZW=F':'Wheat','ZC=F':'Corn','ZS=F':'Soybeans','PL=F':'Platinum','PA=F':'Palladium','ALI=F':'Aluminum',
  'BTC-USD':'Bitcoin','ETH-USD':'Ethereum','ADA-USD':'Cardano','XRP-USD':'Ripple','SOL-USD':'Solana',
  'EURUSD=X':'EUR/USD','GBPUSD=X':'GBP/USD','USDJPY=X':'USD/JPY','AUDUSD=X':'AUD/USD','USDCAD=X':'USD/CAD','USDCHF=X':'USD/CHF','NZDUSD=X':'NZD/USD','USDCNH=X':'USD/CNH','DX-Y.NYB':'DXY',
  'AAPL':'Apple','MSFT':'Microsoft','AMZN':'Amazon','TSLA':'Tesla','META':'Meta','NVDA':'Nvidia','GOOGL':'Alphabet','BHP.AX':'BHP','CBA.AX':'CBA','CSL.AX':'CSL'
}

// Curated column groups similar to example (each column = one group)
interface GroupDef { key:string; title:string; symbols:string[] }
const GROUPS: GroupDef[] = [
  { key:'indices', title: INDICES.title, symbols: INDICES.symbols.slice(0,9) },
  { key:'fx', title: 'FX', symbols: FX_MAJORS.symbols.filter(s=>s!=='DX-Y.NYB').concat('DX-Y.NYB') },
  { key:'commodities', title: COMMODITIES.title, symbols: COMMODITIES.symbols.slice(0,9) },
  { key:'equities', title: MEGACAP_EQUITIES.title, symbols: MEGACAP_EQUITIES.symbols.slice(0,7) },
  { key:'sector', title: SECTOR_ETFS.title, symbols: SECTOR_ETFS.symbols.slice(0,7) },
  { key:'crypto', title: CRYPTO.title, symbols: CRYPTO.symbols.slice(0,5) }
]

// Heat bar representing magnitude relative to global max
function HeatBar({ value, scale }: { value:number; scale:number }) {
  const v = Math.max(-scale, Math.min(scale, value))
  const pct = (Math.abs(v)/scale)*100
  const positive = v >= 0
  return (
    <div className="h-3 w-full bg-gray-700/40 rounded overflow-hidden relative">
      {pct>1 && <div className={`h-full ${positive?'bg-green-500':'bg-red-500'}`} style={{width:`${pct}%`, [positive?'left':'right']:0, position:'absolute'} as any} />}
    </div>
  )
}

export const GlobalMacroTable: React.FC<GlobalMacroTableProps> = ({ assets, maxAbs = 5 }) => {
  const assetMap = useMemo(()=>{
    const m:Record<string,MacroAsset> = {}
    assets.forEach(a=>{ m[a.symbol]=a })
    return m
  },[assets])

  // Collect all change values present in curated list to derive dynamic scale
  const dynamicScale = useMemo(()=>{
    const vals:number[]=[]
    GROUPS.forEach(g=> g.symbols.forEach(s=> { const a=assetMap[s]; if(a && isFinite(a.changePercent)) vals.push(Math.abs(a.changePercent)) }))
    const p95 = vals.sort((a,b)=>a-b)[Math.floor(vals.length*0.95)] || 0
    const scale = Math.min(maxAbs, Math.max(1, p95 || 1))
    return scale
  },[assetMap,maxAbs])

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1000px] grid md:grid-cols-3 xl:grid-cols-6 gap-4">
        {GROUPS.map(group=>{
          const rows = group.symbols.map(sym=>assetMap[sym]).filter(Boolean)
          if(!rows.length) return (
            <div key={group.key} className="bg-gray-800/40 border border-gray-700 rounded p-2 text-xs text-gray-500 flex items-center justify-center">
              {group.title}: no data
            </div>
          )
          return (
            <div key={group.key} className="bg-gray-800/60 border border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-[#081E3A] text-[11px] tracking-wide text-white font-semibold px-3 py-1 flex justify-between"><span>{group.title}</span><span className="opacity-60">Chg</span></div>
              <table className="w-full text-[11px]">
                <tbody>
                  {rows.map(r=>{
                    const ch = r.changePercent
                    const color = ch>0?'text-green-400': ch<0?'text-red-400':'text-gray-300'
                    return (
                      <tr key={r.symbol} className="border-t border-gray-700 first:border-t-0 hover:bg-gray-700/30">
                        <td className="px-2 py-1 w-[46%] text-gray-200 font-medium leading-tight">{FRIENDLY[r.symbol]||r.name||r.symbol}</td>
                        <td className="px-1 py-1 w-[24%] text-right tabular-nums text-gray-300">{r.price? r.price.toFixed(2):'-'}</td>
                        <td className={`px-1 py-1 w-[18%] text-right tabular-nums font-semibold ${color}`}>{ch>0?'+':''}{ch.toFixed(2)}%</td>
                        <td className="px-2 py-1 w-[12%]"><HeatBar value={ch} scale={dynamicScale} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
  {/* Footer note removed per request */}
    </div>
  )
}

export default GlobalMacroTable
