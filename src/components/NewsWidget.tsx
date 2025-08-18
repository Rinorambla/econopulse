import React, { useState, useEffect } from 'react';
import { NavigationLink } from './Navigation';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedDate: string;
  url: string;
}

const NewsWidget = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('/api/news');
        if (response.ok) {
          const result = await response.json();
          // Get only the first 3 news items for the widget
          setNews(result.data?.slice(0, 3) || []);
        }
      } catch (error) {
        console.error('Error fetching news widget:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchNews, 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-3 bg-gray-700 rounded w-full mb-1"></div>
            <div className="h-2 bg-gray-800 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {news.map((article) => (
        <div key={article.id} className="border-b border-gray-800 pb-2 last:border-b-0">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:text-blue-400 transition-colors"
          >
            <h5 className="text-sm font-medium text-white line-clamp-2 mb-1">
              {article.title}
            </h5>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{article.source}</span>
              <span>
                {new Date(article.publishedDate).toLocaleDateString()}
              </span>
            </div>
          </a>
        </div>
      ))}
      
      <div className="pt-2">
        <NavigationLink 
          href="/news"
          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
        >
          View all news →
        </NavigationLink>
      </div>
    </div>
  );
};

export default NewsWidget;
