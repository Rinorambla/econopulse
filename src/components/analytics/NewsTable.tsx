"use client";
import React from 'react'

interface NewsItem { id:string; title:string; source:string; publishedDate:string; url:string }

// Client static component: no async/await; data could later be injected via props.
export function NewsTable({ limit = 12, items }: { limit?: number; items?: NewsItem[] }) {
  const list: NewsItem[] = (items && items.length ? items : []).slice(0, limit)

  if (!list.length) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-2 text-sm">Latest News</h3>
        <div className="text-xs text-gray-500">No news available.</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 overflow-x-auto">
      <h3 className="text-white font-semibold mb-3 text-sm">Latest News</h3>
      <table className="w-full text-xs text-left border-collapse">
        <thead className="text-gray-400">
          <tr className="border-b border-gray-700/70">
            <th className="py-1 pr-3 font-medium">Title</th>
            <th className="py-1 pr-3 font-medium">Source</th>
            <th className="py-1 pr-3 font-medium whitespace-nowrap">Date</th>
          </tr>
        </thead>
        <tbody>
          {list.map(n => (
            <tr key={n.id} className="border-b border-gray-700/40 last:border-b-0 hover:bg-gray-700/30">
              <td className="py-1 pr-3 align-top max-w-[340px]">
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 font-medium leading-snug line-clamp-2">{n.title}</a>
              </td>
              <td className="py-1 pr-3 align-top text-gray-400 whitespace-nowrap">{n.source}</td>
              <td className="py-1 pr-3 align-top text-gray-400 whitespace-nowrap">{new Date(n.publishedDate).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default NewsTable