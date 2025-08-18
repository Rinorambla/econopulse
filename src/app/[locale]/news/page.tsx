'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [nextRefresh, setNextRefresh] = useState<number>(300); // 5 minutes in seconds

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
      if (autoRefresh) {
        fetchNews();
        setNextRefresh(300); // Reset countdown
      }
    }, 300000);
    
    // Countdown timer for next refresh
    const countdownInterval = setInterval(() => {
      setNextRefresh(prev => prev > 0 ? prev - 1 : 300);
    }, 1000);
    
    return () => {
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, [autoRefresh]);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur-sm border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <NavigationLink href="/">
                  <ArrowLeftIcon className="h-6 w-6 text-gray-400 hover:text-white" />
                </NavigationLink>
                <h1 className="text-2xl font-bold text-white">Financial News</h1>
              </div>
              <div className="flex items-center space-x-3">
                {lastUpdated && (
                  <div className="text-sm text-gray-400">
                    Last updated: {formatDate(lastUpdated)}
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      autoRefresh 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
                  </button>
                  {autoRefresh && (
                    <div className="text-xs text-gray-400">
                      Next update: {Math.floor(nextRefresh / 60)}:{(nextRefresh % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    fetchNews();
                    setNextRefresh(300);
                  }}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {news.map((article) => (
                <div key={article.id} className="bg-slate-800/30 backdrop-blur-sm rounded-lg border border-gray-700 p-6 hover:border-blue-500 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-white mb-2 line-clamp-2">
                        <a 
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-400 transition-colors"
                        >
                          {article.title}
                        </a>
                      </h2>
                      <p className="text-gray-300 mb-4 line-clamp-3">
                        {article.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Source */}
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getSourceColor(article.source)}`}>
                          {article.source}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="flex items-center space-x-1 text-gray-400 text-sm">
                        <ClockIcon className="h-4 w-4" />
                        <span>{formatDate(article.publishedDate)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Tickers */}
                      {article.tickers && article.tickers.length > 0 && (
                        <div className="flex items-center space-x-1">
                          {article.tickers.slice(0, 3).map((ticker) => (
                            <span key={ticker} className="bg-green-900/50 text-green-400 px-2 py-1 rounded text-xs font-mono">
                              {ticker.toUpperCase()}
                            </span>
                          ))}
                          {article.tickers.length > 3 && (
                            <span className="text-gray-400 text-xs">+{article.tickers.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Tags */}
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <TagIcon className="h-4 w-4 text-gray-400" />
                          <div className="flex space-x-1">
                            {article.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      Read full article →
                    </a>
                  </div>
                </div>
              ))}

              {news.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No news articles available at this time.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
