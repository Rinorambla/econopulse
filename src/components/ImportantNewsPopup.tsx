'use client'

import { useEffect, useMemo, useState } from 'react'

type NewsItem = { id: string; title: string; description?: string; url: string; source?: string; publishedDate?: string; tags?: string[] }

const IMPACT_TAGS = ['fed','interest','rate','cpi','inflation','jobs','payroll','nfp','ecb','boe','pmi','gdp','earnings','guidance','geopolitics','energy','oil','war']

function isImpactful(n: NewsItem): boolean {
  const txt = `${n.title} ${n.description || ''} ${(n.tags||[]).join(' ')}`.toLowerCase()
  return IMPACT_TAGS.some(tag => txt.includes(tag))
}

export default function ImportantNewsPopup() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [open, setOpen] = useState(false)

  // daily dismiss key
  const dismissKey = useMemo(() => {
    const d = new Date()
    const key = `newsDismiss-${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
    return key
  }, [])

  useEffect(() => {
    const dismissed = localStorage.getItem(dismissKey)
    if (dismissed === '1') return

    const load = async () => {
      try {
        const ctrl = new AbortController()
        const t = setTimeout(()=>ctrl.abort(), 10000)
        const res = await fetch('/api/news', { signal: ctrl.signal })
        clearTimeout(t)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const data: NewsItem[] = Array.isArray(json?.data) ? json.data : []
        const impactful = data.filter(isImpactful).slice(0,3)
        if (impactful.length) {
          setItems(impactful)
          setOpen(true)
        }
      } catch {}
    }
    load()
  }, [dismissKey])

  if (!open || !items.length) return null

  const close = () => { setOpen(false); localStorage.setItem(dismissKey, '1') }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-lg shadow-xl w-[92vw] max-w-[560px] p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white">Important News</h3>
          <button onClick={close} className="text-gray-300 hover:text-white text-sm">Close</button>
        </div>
        <ul className="space-y-3">
          {items.map(n => (
            <li key={n.id} className="text-[12px]">
              <a className="text-blue-300 hover:text-blue-200 font-medium" href={n.url} target="_blank" rel="noreferrer">{n.title}</a>
              {n.description && <div className="text-gray-300 mt-0.5">{n.description}</div>}
              <div className="text-[11px] text-gray-500 mt-0.5">{n.source || 'News'} · {n.publishedDate ? new Date(n.publishedDate).toLocaleString() : ''}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
