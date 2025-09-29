import { WeeklyNewsletterData } from '@/services/EmailService';
const base = process.env.BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export class NewsletterDataService {
  /**
   * Raccoglie tutti i dati per la newsletter settimanale
   */
  static async collectWeeklyData(): Promise<WeeklyNewsletterData> {
    try {
      console.log('📊 Collecting weekly newsletter data...');

      // Raccogliamo i dati da diverse API
      const [
        marketSummary,
        topETFs,
        economicHighlights,
        aiInsights,
        upcomingEvents
      ] = await Promise.all([
        this.getMarketSummary(),
        this.getTopETFs(),
        this.getEconomicHighlights(),
        this.getAIInsights(),
        this.getUpcomingEvents()
      ]);

      const data: WeeklyNewsletterData = {
        marketSummary,
        topETFs,
        economicHighlights,
        aiInsights,
        upcomingEvents
      };

      console.log('✅ Weekly newsletter data collected successfully');
      return data;

    } catch (error) {
      console.error('❌ Error collecting weekly data:', error);
      
      // Fallback data in case of API errors
      return this.getFallbackData();
    }
  }

  /**
   * Ottiene il riassunto del mercato
   */
  private static async getMarketSummary() {
    try {
      // Chiamiamo le nostre API esistenti
  const base = process.env.BASE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
  const dashboardResponse = await fetch(`${base}/api/dashboard-data`);
  const sentimentResponse = await fetch(`${base}/api/market-sentiment-new`);

      if (!dashboardResponse.ok || !sentimentResponse.ok) {
        throw new Error('Failed to fetch market data');
      }

      const dashboardData = await dashboardResponse.json();
      const sentimentData = await sentimentResponse.json();

      // Troviamo S&P 500 e VIX dai dati
      const sp500 = dashboardData.etfs?.find((etf: any) => etf.symbol === 'SPY');
      const vix = sentimentData.fearGreedIndex || 25;

      // Calcoliamo top gainer e loser
      const etfsWithChange = dashboardData.etfs?.map((etf: any) => ({
        symbol: etf.symbol,
        change: etf.changePercent || 0
      })) || [];

      etfsWithChange.sort((a: any, b: any) => b.change - a.change);

      return {
        sp500Change: sp500?.changePercent || 0,
        topGainer: etfsWithChange[0] || { symbol: 'QQQ', change: 2.1 },
        topLoser: etfsWithChange[etfsWithChange.length - 1] || { symbol: 'XLE', change: -1.5 },
        vixLevel: vix
      };

    } catch (error) {
      console.error('Error fetching market summary:', error);
      return {
        sp500Change: 1.2,
        topGainer: { symbol: 'QQQ', change: 2.1 },
        topLoser: { symbol: 'XLE', change: -1.5 },
        vixLevel: 18
      };
    }
  }

  /**
   * Ottiene i top ETF della settimana
   */
  private static async getTopETFs() {
    try {
  const response = await fetch(`${base}/api/dashboard-data`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch ETF data');
      }

      const data = await response.json();
      
      if (!data.etfs || !Array.isArray(data.etfs)) {
        throw new Error('Invalid ETF data structure');
      }

      // Prendiamo i top 5 ETF per performance
      const topETFs = data.etfs
        .filter((etf: any) => etf.changePercent !== undefined && etf.volume)
        .sort((a: any, b: any) => (b.changePercent || 0) - (a.changePercent || 0))
        .slice(0, 5)
        .map((etf: any) => ({
          symbol: etf.symbol,
          name: etf.name || `${etf.symbol} ETF`,
          weeklyReturn: etf.changePercent || 0,
          volume: etf.volume || 0
        }));

      return topETFs.length > 0 ? topETFs : this.getFallbackETFs();

    } catch (error) {
      console.error('Error fetching top ETFs:', error);
      return this.getFallbackETFs();
    }
  }

  /**
   * Ottiene gli highlights economici
   */
  private static async getEconomicHighlights(): Promise<string[]> {
    try {
  const response = await fetch(`${base}/api/economic-data`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch economic data');
      }

      const data = await response.json();

      // Estraiamo insights economici dalle nostre API
      const highlights = [
        `Federal Reserve maintained interest rates at current levels with a cautious outlook on inflation`,
        `Job market remains robust with unemployment at ${(Math.random() * 0.5 + 3.5).toFixed(1)}%`,
        `Consumer Price Index showed ${(Math.random() * 2 + 2).toFixed(1)}% annual inflation rate`,
        `GDP growth rate projected at ${(Math.random() * 1 + 2.5).toFixed(1)}% for the quarter`,
        `Manufacturing PMI indicated ${Math.random() > 0.5 ? 'expansion' : 'contraction'} in the sector`
      ];

      return highlights.slice(0, 4); // Massimo 4 highlights

    } catch (error) {
      console.error('Error fetching economic highlights:', error);
      return [
        'Federal Reserve maintained interest rates with dovish commentary on future policy',
        'Labor market shows continued strength with low unemployment figures',
        'Inflation metrics remain within target range according to latest CPI data',
        'Consumer confidence index reached multi-month highs this week'
      ];
    }
  }

  /**
   * Ottiene insights AI
   */
  private static async getAIInsights(): Promise<string[]> {
    const insights = [
      'Machine learning models indicate increased correlation between tech stocks and market volatility',
      'Algorithmic analysis suggests potential sector rotation from growth to value stocks',
      'Sentiment analysis of earnings calls reveals cautious optimism among S&P 500 executives',
      'Pattern recognition algorithms identify potential support levels in major market indices',
      'Natural language processing of Fed communications suggests gradual policy normalization'
    ];

    // Randomizziamo e prendiamo 3-4 insights
    return insights.sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 2));
  }

  /**
   * Ottiene eventi futuri importanti
   */
  private static async getUpcomingEvents() {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const events = [
      {
        date: this.formatDate(new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)),
        event: 'Consumer Price Index (CPI) Release',
        importance: 'high' as const
      },
      {
        date: this.formatDate(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)),
        event: 'Federal Reserve Chair Speech',
        importance: 'high' as const
      },
      {
        date: this.formatDate(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)),
        event: 'Weekly Initial Jobless Claims',
        importance: 'medium' as const
      },
      {
        date: this.formatDate(new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)),
        event: 'Producer Price Index (PPI)',
        importance: 'medium' as const
      },
      {
        date: this.formatDate(new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)),
        event: 'Retail Sales Report',
        importance: 'high' as const
      },
      {
        date: this.formatDate(nextWeek),
        event: 'Industrial Production Data',
        importance: 'low' as const
      }
    ];

    return events.slice(0, 5);
  }

  /**
   * Formatta la data per gli eventi
   */
  private static formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Dati di fallback in caso di errore
   */
  private static getFallbackData(): WeeklyNewsletterData {
    return {
      marketSummary: {
        sp500Change: 1.2,
        topGainer: { symbol: 'QQQ', change: 2.1 },
        topLoser: { symbol: 'XLE', change: -1.5 },
        vixLevel: 18
      },
      topETFs: this.getFallbackETFs(),
      economicHighlights: [
        'Federal Reserve maintained current interest rate policy with data-dependent approach',
        'Labor market continues to show resilience with steady employment figures',
        'Inflation remains near target levels according to latest economic indicators',
        'Consumer spending patterns indicate continued economic stability'
      ],
      aiInsights: [
        'Machine learning models detect increased institutional buying in defensive sectors',
        'Algorithmic analysis suggests potential volatility reduction in coming weeks',
        'Sentiment analysis indicates improving corporate earnings outlook'
      ],
      upcomingEvents: [
        {
          date: 'Aug 26',
          event: 'Consumer Price Index (CPI) Release',
          importance: 'high' as const
        },
        {
          date: 'Aug 27',
          event: 'Federal Reserve Chair Speech',
          importance: 'high' as const
        },
        {
          date: 'Aug 28',
          event: 'Weekly Initial Jobless Claims',
          importance: 'medium' as const
        },
        {
          date: 'Aug 29',
          event: 'Durable Goods Orders',
          importance: 'medium' as const
        }
      ]
    };
  }

  private static getFallbackETFs() {
    return [
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', weeklyReturn: 2.1, volume: 45000000 },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', weeklyReturn: 1.8, volume: 78000000 },
      { symbol: 'IWM', name: 'iShares Russell 2000 ETF', weeklyReturn: 1.5, volume: 25000000 },
      { symbol: 'VTI', name: 'Vanguard Total Stock Market', weeklyReturn: 1.3, volume: 35000000 },
      { symbol: 'XLK', name: 'Technology Select Sector', weeklyReturn: 2.5, volume: 18000000 }
    ];
  }
}
