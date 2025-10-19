'use client';

import React, { useState, useEffect } from 'react';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedDate: string;
  tickers?: string[];
  tags?: string[];
}

interface NewsResponse {
  success: boolean;
  data: NewsArticle[];
  lastUpdated: string;
  provider?: string;
  error?: string;
}

export default function Blog() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [provider, setProvider] = useState<string>('');

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('/api/news');
        if (!response.ok) {
          throw new Error('Failed to fetch news');
        }
        const data: NewsResponse = await response.json();
        setProvider(data.provider || '');
        if (data.data) {
          setNews(data.data);
          setLastUpdated(data.lastUpdated);
          if (!data.success && !data.error) {
            setError('News API returned an error');
          }
        } else {
          throw new Error('Malformed response');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load news');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getSourceColor = (_source: string) => 'bg-blue-600/15 text-sky-300 ring-1 ring-inset ring-slate-700/60';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <NavigationLink href="/" className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <span>Back to Dashboard</span>
              </NavigationLink>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">EconoPulse Blog</h1>
              <p className="text-sky-300 mt-1">Real-time Financial News & Market Insights</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Provider / Fallback Banner */}
        {provider === 'fallback' && !loading && !error && (
          <div className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-amber-300 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>Showing cached fallback articles (live provider unavailable). Your API key may be missing or rate-limited.</span>
          </div>
        )}

        {/* Blog Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold tracking-tight text-white mb-4">
            📈 Market News & Analysis
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Stay ahead of the markets with automatically curated financial news, 
            market analysis, and breaking developments that matter to your investments.
          </p>
          {lastUpdated && (
            <div className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600/15 ring-1 ring-inset ring-slate-700/60 rounded-lg">
              <svg className="w-4 h-4 text-sky-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="text-sky-300 text-sm">
                Last updated: {formatDate(lastUpdated)}
              </span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
            <span className="ml-4 text-lg text-white">Loading latest news...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-rose-600/15 border border-rose-600/50 rounded-lg p-6 mb-8 text-center">
            <p className="text-rose-300 text-lg">⚠️ {error}</p>
          </div>
        )}

        {/* News Articles Grid */}
        {!loading && !error && news.length > 0 && (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {news.map((article, index) => (
              <article 
                key={article.id} 
                className="bg-white/10 backdrop-blur-md rounded-xl p-6 hover:bg-white/15 transition-all duration-300 hover:transform hover:scale-105 border border-white/10"
              >
                {/* Article Header */}
                <div className="flex items-start justify-between mb-4">
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getSourceColor(article.source)}`}>
                    {article.source}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(article.publishedDate)}
                  </span>
                </div>

                {/* Article Content */}
                <h3 className="text-xl font-extrabold text-white mb-3 leading-tight">
                  {article.title}
                </h3>
                
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                  {article.description}
                </p>

                {/* Tickers */}
                {article.tickers && article.tickers.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {article.tickers.slice(0, 3).map((ticker, tickerIndex) => (
                        <span 
                          key={tickerIndex}
                          className="inline-flex px-2 py-1 text-xs font-mono font-semibold bg-blue-600/20 text-blue-300 rounded"
                        >
                          ${ticker}
                        </span>
                      ))}
                      {article.tickers.length > 3 && (
                        <span className="inline-flex px-2 py-1 text-xs text-gray-400 rounded">
                          +{article.tickers.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {article.tags && article.tags.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {article.tags.slice(0, 2).map((tag, tagIndex) => (
                        <span 
                          key={tagIndex}
                          className="inline-flex px-2 py-1 text-xs bg-blue-600/20 text-blue-300 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Read More Button */}
                <a 
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25"
                >
                  Read Full Article
                  <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </a>
              </article>
            ))}
          </div>
        )}

        {/* Auto-update notice intentionally hidden per requirements */}

        {/* No Data State */}
        {!loading && !error && news.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-600/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg mb-2">No news articles available</p>
            <p className="text-gray-500">Check back later for the latest market updates</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
