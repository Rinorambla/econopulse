'use client';

import { useState, useEffect } from 'react';
import { ArrowLeftIcon, ClockIcon, TagIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedDate: string;
  tickers: string[];
  tags: string[];
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  // auto-refresh is always on silently (no visible countdown)

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/news');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setNews(result.data || []);
      setLastUpdated(result.lastUpdated || new Date().toISOString());
    } catch (error) {
      console.error('Error fetching news:', error);
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    
    // Auto-refresh every 5 minutes (300000ms)
    const refreshInterval = setInterval(() => {
      fetchNews();
    }, 300000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSourceColor = (source: string) => {
    const colors = [
      'bg-blue-600', 'bg-green-600', 'bg-purple-600', 
      'bg-orange-600', 'bg-teal-600', 'bg-pink-600'
    ];
    const hash = source.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--background)] text-white">
        {/* Header */}
        <div className="border-b border-white/10 bg-gradient-to-r from-slate-900/70 via-slate-800/60 to-slate-900/70 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Use locale-agnostic path so NavigationLink adds the current locale only once */}
              <NavigationLink href="/ai-pulse" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors">
                <ArrowLeftIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Back</span>
              </NavigationLink>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">Financial News</h1>
                <p className="text-xs text-gray-400 mt-1">Real-time curated global market headlines</p>
              </div>
            </div>
            {lastUpdated && (
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <ClockIcon className="h-4 w-4" /> {formatDate(lastUpdated)}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {news.map(article => (
                  <div key={article.id} className="group relative bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-900/60 border border-white/10 hover:border-blue-500/40 rounded-xl p-6 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg md:text-xl font-semibold leading-snug mb-2 pr-2">
                          <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-300 transition-colors line-clamp-2">
                            {article.title}
                          </a>
                        </h2>
                        {article.description && (
                          <p className="text-sm text-gray-300 line-clamp-3">
                            {article.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-start gap-2 shrink-0">
                        <span className={`px-2 py-1 rounded-md text-[11px] font-medium tracking-wide text-white ${getSourceColor(article.source)} shadow-sm`}>{article.source}</span>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <ClockIcon className="h-4 w-4" /> {formatDate(article.publishedDate)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {Array.isArray(article.tickers) && article.tickers
                        .filter(t => typeof t === 'string' && t.trim().length > 0)
                        .slice(0,4)
                        .map(tk => {
                          const key = `tk-${tk}`;
                          let label: string;
                          try {
                            label = (tk as string).toUpperCase();
                          } catch {
                            label = String(tk);
                          }
                          return (
                            <span
                              key={key}
                              className="px-2 py-1 rounded-md text-[11px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                            >
                              {label}
                            </span>
                          );
                        })}
                      {Array.isArray(article.tickers) && article.tickers.filter(t=> typeof t === 'string' && t.trim().length>0).length > 4 && (
                        <span className="text-[11px] text-gray-400">+{article.tickers.filter(t=> typeof t === 'string' && t.trim().length>0).length - 4}</span>
                      )}
                      {Array.isArray(article.tags) && article.tags.slice(0,3).map(tag => (
                        <span key={`tag-${tag}`} className="px-2 py-1 rounded-md text-[11px] bg-white/5 text-gray-300 border border-white/10">{tag}</span>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                      <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
                        Read full article →
                      </a>
                      <span className="text-[10px] uppercase tracking-wide text-gray-500">External Source</span>
                    </div>
                    <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5 group-hover:ring-blue-400/30 transition" />
                  </div>
                ))}
                {news.length===0 && (
                  <div className="text-center py-16 border border-dashed border-white/10 rounded-xl bg-white/5">
                    <p className="text-gray-400 text-sm">No news articles available right now.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
