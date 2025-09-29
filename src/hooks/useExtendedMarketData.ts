import { useEffect, useState, useCallback } from 'react'

export interface ExtendedAsset {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  category: string
  assetClass: string
  performance: number
  timestamp: string
}

interface Options {
  groups?: string[]
  refreshMs?: number
  limit?: number
  auto?: boolean
}

export function useExtendedMarketData(opts: Options = {}) {
  const { groups, refreshMs = 60000, limit = 0, auto = true } = opts
  const [data, setData] = useState<ExtendedAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (groups && groups.length) params.set('groups', groups.join(','))
      if (limit>0) params.set('limit', String(limit))
      const res = await fetch(`/api/extended-batch?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const js = await res.json()
      if (!js.ok) throw new Error(js.error || 'fetch failed')
      setData(js.data || [])
      setLastUpdate(new Date().toISOString())
    } catch(e:any) {
      setError(e.message || 'errore fetch')
    } finally {
      setLoading(false)
    }
  }, [groups, limit])

  useEffect(()=>{ fetchData() }, [fetchData])

  useEffect(()=>{
    if (!auto) return
    const id = setInterval(fetchData, refreshMs)
    return ()=> clearInterval(id)
  }, [auto, refreshMs, fetchData])

  return { data, loading, error, lastUpdate, refresh: fetchData }
}
