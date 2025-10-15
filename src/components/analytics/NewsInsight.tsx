"use client"
import React, { useEffect, useState, useCallback } from 'react'

interface AiAnalysis {
  analysis: {
    currentCycle: string
    direction: string
    confidence: number
    timeframe: string
    keyFactors: string[]
    risks: string[]
    opportunities: string[]
    summary: string
    recommendation: string
  }
  lastUpdated: string
  dataSource: string
}

interface NewsItem { id:string; title:string; source:string; publishedDate:string; url:string }

export const NewsInsight: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)
  const [analysis, setAnalysis] = useState<AiAnalysis['analysis']|null>(null)
  const [news, setNews] = useState<NewsItem[]>([])
  const [ts, setTs] = useState<string>('')

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const [aiResp, newsResp] = await Promise.all([
        fetch('/api/ai-economic-analysis'),
        fetch('/api/news')
      ])
      if (aiResp.ok) {
        const aiJson = await aiResp.json()
        if (aiJson?.data?.analysis) {
          setAnalysis(aiJson.data.analysis)
          setTs(aiJson.data.lastUpdated || new Date().toISOString())
        } else {
          setAnalysis(null)
        }
      } else {
        // Hide error; simply no analysis
        setAnalysis(null)
      }
      if (newsResp.ok) {
        const newsJson = await newsResp.json()
        setNews(newsJson.data?.slice(0,6)||[])
      }
    } catch(e:any) {
      setError(e.message)
    } finally { setLoading(false) }
  },[])

  useEffect(()=>{
    load();
    // periodic auto-refresh: 5 minutes
    const id = setInterval(load, 300000);
    return ()=> clearInterval(id)
  },[load])

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-700/50 rounded w-1/3" />
        <div className="h-3 bg-gray-700/40 rounded w-2/3" />
        <div className="h-3 bg-gray-700/40 rounded w-full" />
        <div className="h-3 bg-gray-700/30 rounded w-5/6" />
      </div>
    )
  }

  if (error) {
    return <div className="text-xs text-gray-500">Insight unavailable.</div>
  }

  if (!analysis) {
  return <div className="text-xs text-gray-400">No analysis available.</div>
  }

  const dirColor = analysis.direction.includes('bull') ? 'text-green-400' : analysis.direction.includes('bear') ? 'text-red-400' : 'text-amber-300'
  // Derive sentiment percentage (simple heuristic)
  let sentimentPercent = 0
  if (analysis.direction.includes('bull')) sentimentPercent = analysis.confidence
  else if (analysis.direction.includes('bear')) sentimentPercent = -analysis.confidence
  else if (analysis.direction.includes('mixed')) sentimentPercent = 0
  else sentimentPercent = 0
  const sentimentColor = sentimentPercent > 0 ? 'bg-green-500/20 text-green-400 border-green-500/40' : sentimentPercent < 0 ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="space-y-1">
          <h3 className="text-white font-semibold text-lg flex items-center gap-3">AI Macro Insight
            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium tracking-wide ${sentimentColor}`}>{sentimentPercent>0?'+':''}{sentimentPercent}%</span>
          </h3>
          <p className="text-xs text-gray-500">Updated {ts? new Date(ts).toLocaleTimeString():''}</p>
        </div>
  {/* auto-refresh hidden per requirements */}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          <p className="text-sm text-gray-300"><span className={"font-semibold "+dirColor}>{analysis.direction.toUpperCase()}</span> • Cycle: <span className="text-blue-300">{analysis.currentCycle}</span> • Confidence: {analysis.confidence}% • Horizon: {analysis.timeframe}</p>
          <p className="text-sm text-gray-200 leading-relaxed">{analysis.summary}</p>
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="font-semibold text-gray-300 mb-1">Key Factors</p>
              <ul className="space-y-1 list-disc list-inside text-gray-400">
                {analysis.keyFactors.slice(0,3).map((f,i)=><li key={i}>{f}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-300 mb-1">Risks</p>
              <ul className="space-y-1 list-disc list-inside text-gray-400">
                {analysis.risks.slice(0,3).map((f,i)=><li key={i}>{f}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-300 mb-1">Opportunities</p>
              <ul className="space-y-1 list-disc list-inside text-gray-400">
                {analysis.opportunities.slice(0,3).map((f,i)=><li key={i}>{f}</li>)}
              </ul>
            </div>
          </div>
          <div className="bg-gray-900/50 border border-gray-700 rounded p-3 text-xs text-gray-300">
            <span className="font-semibold text-blue-300">Strategy:</span> {analysis.recommendation}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Top Headlines</p>
          <ul className="space-y-2">
            {news.map(n=> (
              <li key={n.id} className="text-xs border-b border-gray-700/60 pb-1 last:border-b-0">
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 line-clamp-2 font-medium">{n.title}</a>
                <span className="block text-[10px] text-gray-500 mt-0.5">{n.source} • {new Date(n.publishedDate).toLocaleDateString()}</span>
              </li>
            ))}
            {!news.length && <li className="text-[11px] text-gray-500">No news</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default NewsInsight
