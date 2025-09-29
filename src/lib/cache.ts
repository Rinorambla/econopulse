// Advanced Caching System with Multiple Levels
interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
}

class MultiLevelCache {
  private memoryCache: Map<string, CacheItem> = new Map();
  private config: CacheConfig;

  constructor(config: CacheConfig = { maxSize: 100, defaultTTL: 3600000 }) {
    this.config = config;
    
    // Clean expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 300000);
  }

  set(key: string, data: any, ttl?: number): void {
    const item: CacheItem = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    };

    // If cache is full, remove oldest entry
    if (this.memoryCache.size >= this.config.maxSize) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(key, item);
  }

  get(key: string): any | null {
    const item = this.memoryCache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (this.isExpired(item)) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    const item = this.memoryCache.get(key);
    return item ? !this.isExpired(item) : false;
  }

  delete(key: string): boolean {
    return this.memoryCache.delete(key);
  }

  clear(): void {
    this.memoryCache.clear();
  }

  getStats(): { size: number; hitRate?: number; keys: string[] } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys())
    };
  }

  // Advanced cache methods
  setWithTags(key: string, data: any, tags: string[] = [], ttl?: number): void {
    const taggedKey = `${key}|tags:${tags.join(',')}`;
    this.set(taggedKey, data, ttl);
    
    // Store tag mappings
    tags.forEach(tag => {
      const tagKey = `tag:${tag}`;
      const taggedKeys = this.get(tagKey) || [];
      taggedKeys.push(key);
      this.set(tagKey, taggedKeys, ttl);
    });
  }

  invalidateByTag(tag: string): number {
    const tagKey = `tag:${tag}`;
    const taggedKeys = this.get(tagKey) || [];
    
    let invalidated = 0;
    taggedKeys.forEach((key: string) => {
      if (this.memoryCache.delete(key)) {
        invalidated++;
      }
    });
    
    this.delete(tagKey);
    return invalidated;
  }

  private isExpired(item: CacheItem): boolean {
    return Date.now() > (item.timestamp + item.ttl);
  }

  private getOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.memoryCache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.memoryCache.entries()) {
      if (now > (item.timestamp + item.ttl)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.memoryCache.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.log(`🗑️  Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }
}

// Cache configurations for different data types
export const cacheConfigs = {
  marketData: {
    ttl: 3600000, // 1 hour
    key: 'market_data'
  },
  portfolioData: {
    ttl: 3600000, // 1 hour  
    key: 'portfolio_data'
  },
  staticData: {
    ttl: 86400000, // 24 hours
    key: 'static_data'
  },
  newsData: {
    ttl: 1800000, // 30 minutes
    key: 'news_data'
  }
};

// Create cache instances
export const marketCache = new MultiLevelCache({
  maxSize: 50,
  defaultTTL: cacheConfigs.marketData.ttl
});

export const portfolioCache = new MultiLevelCache({
  maxSize: 20,
  defaultTTL: cacheConfigs.portfolioData.ttl
});

export const staticCache = new MultiLevelCache({
  maxSize: 100,
  defaultTTL: cacheConfigs.staticData.ttl
});

// Utility functions
export function getCacheKey(type: string, params: Record<string, any> = {}): string {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return paramString ? `${type}:${paramString}` : type;
}

export function getTimeUntilExpiry(timestamp: number, ttl: number): number {
  return Math.max(0, (timestamp + ttl) - Date.now());
}

export function formatCacheStatus(cache: MultiLevelCache, name: string): string {
  const stats = cache.getStats();
  return `📦 ${name}: ${stats.size} entries`;
}
