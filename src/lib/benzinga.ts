// Benzinga API Service for Financial News and Market Events
export class BenzingaService {
  private apiKey: string;
  private baseUrl = 'https://api.benzinga.com/api/v2';

  constructor() {
    this.apiKey = process.env.BENZINGA_API_KEY!;
  }

  async getNews(params: {
    symbols?: string[];
    channels?: string[];
    limit?: number;
    displayOutput?: string;
  } = {}) {
    try {
      const {
        symbols = [],
        channels = ['news'],
        limit = 20,
        displayOutput = 'full'
      } = params;

      const queryParams = new URLSearchParams({
        token: this.apiKey,
        channels: channels.join(','),
        displayOutput,
        limit: limit.toString()
      });

      if (symbols.length > 0) {
        queryParams.append('tickers', symbols.join(','));
      }

      const response = await fetch(
        `${this.baseUrl}/news?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`Benzinga API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Benzinga news:', error);
      throw error;
    }
  }

  async getMarketNews(limit: number = 10) {
    return this.getNews({
      channels: ['news', 'analyst-ratings'],
      limit,
      displayOutput: 'full'
    });
  }

  async getStockNews(symbols: string[], limit: number = 10) {
    return this.getNews({
      symbols,
      channels: ['news', 'analyst-ratings'],
      limit,
      displayOutput: 'full'
    });
  }

  async getEarnings(params: {
    symbols?: string[];
    date?: string;
    limit?: number;
  } = {}) {
    try {
      const {
        symbols = [],
        date,
        limit = 20
      } = params;

      const queryParams = new URLSearchParams({
        token: this.apiKey,
        limit: limit.toString()
      });

      if (symbols.length > 0) {
        queryParams.append('tickers', symbols.join(','));
      }

      if (date) {
        queryParams.append('date', date);
      }

      const response = await fetch(
        `${this.baseUrl}/calendar/earnings?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`Benzinga API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Benzinga earnings:', error);
      throw error;
    }
  }

  async getAnalystRatings(symbols: string[], limit: number = 10) {
    try {
      const queryParams = new URLSearchParams({
        token: this.apiKey,
        tickers: symbols.join(','),
        limit: limit.toString()
      });

      const response = await fetch(
        `${this.baseUrl}/calendar/ratings?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`Benzinga API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching analyst ratings:', error);
      throw error;
    }
  }

  // Calculate market sentiment from news
  async getMarketSentiment() {
    try {
      const news = await this.getMarketNews(50);
      
      if (!news || !news.length) {
        return {
          sentiment: 'neutral',
          score: 50,
          confidence: 0,
          totalArticles: 0
        };
      }

      // Simple sentiment analysis based on headline keywords
      let positiveCount = 0;
      let negativeCount = 0;
      
      const positiveKeywords = ['gain', 'up', 'rise', 'bull', 'positive', 'growth', 'strong', 'beat', 'exceed'];
      const negativeKeywords = ['fall', 'down', 'decline', 'bear', 'negative', 'weak', 'miss', 'concern', 'loss'];

      news.forEach((article: any) => {
        const headline = (article.title || '').toLowerCase();
        const content = (article.content || '').toLowerCase();
        const text = headline + ' ' + content;

        const positiveMatches = positiveKeywords.reduce((count, keyword) => 
          count + (text.includes(keyword) ? 1 : 0), 0);
        const negativeMatches = negativeKeywords.reduce((count, keyword) => 
          count + (text.includes(keyword) ? 1 : 0), 0);

        if (positiveMatches > negativeMatches) positiveCount++;
        else if (negativeMatches > positiveMatches) negativeCount++;
      });

      const totalSentimentArticles = positiveCount + negativeCount;
      const sentimentScore = totalSentimentArticles > 0 
        ? Math.round((positiveCount / totalSentimentArticles) * 100)
        : 50;

      let sentiment = 'neutral';
      if (sentimentScore > 60) sentiment = 'bullish';
      else if (sentimentScore < 40) sentiment = 'bearish';

      return {
        sentiment,
        score: sentimentScore,
        confidence: Math.min(totalSentimentArticles / 20, 1) * 100,
        totalArticles: news.length,
        positiveCount,
        negativeCount
      };
    } catch (error) {
      console.error('Error calculating market sentiment:', error);
      return {
        sentiment: 'neutral',
        score: 50,
        confidence: 0,
        totalArticles: 0
      };
    }
  }
}

// Mock service for development (when API key is not available)
export class MockBenzingaService {
  async getMarketNews(limit: number = 10) {
    return [
      {
        id: '1',
        title: 'Market Sees Strong Gains as Tech Stocks Rally',
        content: 'Technology stocks led the market higher today...',
        created: new Date().toISOString(),
        url: '#'
      },
      {
        id: '2', 
        title: 'Federal Reserve Hints at Rate Stability',
        content: 'The Federal Reserve indicated that rates may remain stable...',
        created: new Date().toISOString(),
        url: '#'
      }
    ];
  }

  async getMarketSentiment() {
    return {
      sentiment: 'bullish',
      score: 65,
      confidence: 75,
      totalArticles: 25,
      positiveCount: 16,
      negativeCount: 9
    };
  }

  async getStockNews(symbols: string[], limit: number = 10) {
    return this.getMarketNews(limit);
  }

  async getEarnings() {
    return [];
  }

  async getAnalystRatings() {
    return [];
  }
}

// Export the appropriate service based on API key availability
export const benzingaService = process.env.BENZINGA_API_KEY 
  ? new BenzingaService() 
  : new MockBenzingaService();
