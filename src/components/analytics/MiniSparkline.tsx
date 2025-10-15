"use client"
import React, { useEffect, useState } from 'react'
import { fetchHistory, HistoryResponse } from './helpers'

interface Props { symbol: string; range?: string; interval?: string }

export function MiniSparkline({ symbol, range='5d', interval='1d' }: Props) {
  const [points, setPoints] = useState<{time:number;close:number}[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
  fetchHistory(symbol, range, interval).then((d: HistoryResponse | null) => {
      if (cancelled) return
      if (d) setPoints(d.bars)
  }).catch((e: any)=>!cancelled&&setError('err'))
    return () => { cancelled = true }
  }, [symbol, range, interval])

  if (!points.length) return <div className="h-6 w-full bg-gray-700/40 rounded" />
  const min = Math.min(...points.map(p=>p.close))
  const max = Math.max(...points.map(p=>p.close))
  const norm = (v:number)=> ( (v - min) / (max - min || 1) )
  const path = points.map((p,i)=>{
    const x = (i/(points.length-1))*100
    const y = (1-norm(p.close))*100
    return `${i===0?'M':'L'}${x},${y}`
  }).join(' ')
  const color = points[points.length-1].close >= points[0].close ? '#16a34a' : '#dc2626'
  return (
    <svg viewBox="0 0 100 30" className="w-full h-6">
      <path d={path} stroke={color} strokeWidth={1.5} fill="none" />
    </svg>
  )
}
