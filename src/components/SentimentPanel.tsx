'use client'

import { useEffect, useMemo, useState } from 'react'

type PutCallPoint = { date: string; value: number }

export default function SentimentPanel() {
  const [fg, setFg] = useState<{ index: number; sentiment: string } | null>(null)
  const [pc, setPc] = useState<PutCallPoint[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const c1 = fetch('/api/market-sentiment-new', { cache: 'no-store' }).then(r=>r.json()).catch(()=>null)
      const c2 = fetch('/api/put-call?limit=60', { cache: 'no-store' }).then(r=>r.json()).catch(()=>null)
      const [fgj, pcj] = await Promise.all([c1,c2])
      if (fgj && typeof fgj.fearGreedIndex === 'number') setFg({ index: fgj.fearGreedIndex, sentiment: fgj.sentiment })
      if (pcj && Array.isArray(pcj.series)) setPc(pcj.series as PutCallPoint[])
    } finally { setLoading(false) }
  }

  useEffect(() => { load(); const id = setInterval(load, 5*60*1000); return ()=>clearInterval(id) }, [])

  const latestPc = pc[0]?.value ?? null
  const pcMini = useMemo(() => (pc.slice(0, 24).reverse()), [pc])

  const fgColor = !fg ? 'text-gray-300' : fg.index >= 55 ? 'text-green-400' : fg.index <= 45 ? 'text-red-400' : 'text-yellow-300'
  const pcColor = latestPc!=null ? (latestPc > 1 ? 'text-red-400' : latestPc < 0.8 ? 'text-green-400' : 'text-yellow-300') : 'text-gray-300'

  return (
    <section className="max-w-7xl mx-auto px-3 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-800 border border-slate-700 rounded p-3">
          <div className="text-xs text-gray-400">Market Sentiment (Composite)</div>
          <div className={`text-xl font-bold ${fgColor}`}>{fg ? `${fg.index} · ${fg.sentiment}` : '—'}</div>
          <div className="text-[11px] text-gray-400 mt-1">Based on SPY/VIX + macro snapshot</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">US - CBOE Total Put/Call</div>
              <div className={`text-xl font-bold ${pcColor}`}>{latestPc!=null ? latestPc.toFixed(2) : '—'}</div>
            </div>
            {/* simple sparkline */}
            <div className="h-[36px] w-[120px] relative">
              <svg viewBox="0 0 120 36" className="absolute inset-0">
                <polyline
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  points={(() => {
                    if (!pcMini.length) return ''
                    const vals = pcMini.map(p=>p.value)
                    const min = Math.min(...vals)
                    const max = Math.max(...vals)
                    const norm = (v:number) => max===min ? 18 : 36 - ((v - min) / (max - min)) * 36
                    return pcMini.map((p,i)=> `${(i/(pcMini.length-1))*120},${norm(p.value)}`).join(' ')
                  })()}
                />
              </svg>
            </div>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">> 1.00 = risk-off skew; < 0.80 = risk-on skew</div>
        </div>
      </div>
    </section>
  )
}
