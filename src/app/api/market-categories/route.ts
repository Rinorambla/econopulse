import { NextResponse } from 'next/server';
import { getTiingoMarketData } from '@/lib/tiingo';

interface CategoryData {
  category: string;
  performance: string;
  change: string;
  volume: string;
  sentiment: string;
  topTickers: string[];
  trend: string;
  direction?: string;
}

interface AssetPerformance {
  symbol: string;
  name: string;
  price: number;
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  yearly: number;
  marketCap?: number;
  volume: number;
  category: string;
}

// Function to get detailed assets for a specific category
async function getCategoryAssets(category: string, cachedData: CategoryData[]): Promise<NextResponse> {
  try {
    // Map frontend categories to backend categories
    const categoryMapping: { [key: string]: string[] } = {
      'Stocks': ['Technology', 'Healthcare', 'Financial', 'Energy', 'Consumer Discretionary', 'Industrial', 'Communication', 'Consumer Staples', 'Utilities', 'Real Estate', 'Materials'],
      'ETFs': ['ETFs'],
      'Crypto': ['Crypto'],
      'Commodities': ['Commodities']
    };

    const mappedCategories = categoryMapping[category];
    
    if (!mappedCategories) {
      return NextResponse.json({
        success: false,
        error: `Category '${category}' not found`,
        assets: []
      });
    }

    if (mappedCategories.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Category '${category}' not implemented yet`,
        assets: []
      });
    }

    console.log(`📊 Getting detailed data for ${category} (${mappedCategories.length} subcategories)...`);
    
    const allAssets: AssetPerformance[] = [];

    // Get data for each mapped category
    for (const subcategory of mappedCategories) {
      const symbols = CATEGORY_SYMBOLS[subcategory as keyof typeof CATEGORY_SYMBOLS];
      
      if (symbols) {
        try {
          const marketData = await getTiingoMarketData(symbols);
          
          if (marketData && marketData.length > 0) {
            const assets: AssetPerformance[] = marketData.map(item => ({
              symbol: item.symbol,
              name: item.symbol, // We could enhance this with company names later
              price: item.price,
              daily: item.changePercent,
              weekly: item.changePercent * 1.2, // Approximated for now
              monthly: item.changePercent * 2.5, // Approximated for now
              quarterly: item.changePercent * 6, // Approximated for now
              yearly: item.changePercent * 12, // Approximated for now
              volume: item.volume,
              category: subcategory
            }));
            
            allAssets.push(...assets);
          }
        } catch (error) {
          console.error(`❌ Error getting data for ${subcategory}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      category,
      assets: allAssets,
      lastUpdated: new Date().toISOString(),
      cached: true
    });

  } catch (error) {
    console.error(`❌ Error getting assets for ${category}:`, error);
    return NextResponse.json({
      success: false,
      error: `Failed to get assets for ${category}`,
      assets: []
    });
  }
}

// Cache for market categories
let cachedCategories: { data: CategoryData[], timestamp: number } | null = null;
const CACHE_DURATION = 120000; // 2 minutes cache

// Tiingo symbols organized by category
const CATEGORY_SYMBOLS = {
  'Technology': ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'TSLA', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC', 'AMD', 'QCOM', 'AVGO', 'TXN', 'CSCO', 'IBM', 'SHOP', 'PYPL', 'SQ'],
  'Healthcare': ['JNJ', 'UNH', 'PFE', 'ABT', 'TMO', 'MRK', 'AZN', 'NVS', 'ROCHE', 'LLY', 'GILD', 'AMGN', 'BIIB', 'VRTX', 'REGN', 'ISRG', 'DHR', 'BSX', 'MDT', 'SYK'],
  'Financial': ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'TFC', 'COF', 'AXP', 'BLK', 'SCHW', 'CME', 'ICE', 'SPGI', 'MCO', 'AON', 'MMC', 'AIG'],
  'Energy': ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'KMI', 'OKE', 'WMB', 'PSX', 'VLO', 'MPC', 'HES', 'DVN', 'FANG', 'APA', 'OXY', 'HAL', 'BKR', 'NOV', 'RIG'],
  'Consumer Discretionary': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'TJX', 'LOW', 'BKNG', 'CMG', 'ORLY', 'AZO', 'GM', 'F', 'ABNB', 'UBER', 'LYFT', 'DIS', 'NFLX', 'MAR'],
  'Industrial': ['BA', 'CAT', 'GE', 'LMT', 'RTX', 'HON', 'UPS', 'FDX', 'UNP', 'CSX', 'NSC', 'LUV', 'DAL', 'AAL', 'UAL', 'DE', 'MMM', 'EMR', 'ETN', 'PH'],
  'Communication': ['NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'GOOGL', 'META', 'TWTR', 'SNAP', 'PINS', 'ROKU', 'SPOT', 'CHTR', 'TMUS', 'DISH', 'FOXA', 'PARA', 'WBD', 'NWSA', 'NYT'],
  'Consumer Staples': ['PG', 'KO', 'PEP', 'WMT', 'COST', 'CL', 'KMB', 'GIS', 'K', 'CPB', 'CAG', 'HSY', 'MKC', 'CHD', 'CLX', 'SJM', 'HRL', 'TSN', 'MDLZ', 'MNST'],
  'Utilities': ['NEE', 'DUK', 'SO', 'D', 'EXC', 'AEP', 'XEL', 'SRE', 'PEG', 'ED', 'EIX', 'PPL', 'FE', 'ES', 'AWK', 'WEC', 'DTE', 'ETR', 'CMS', 'CNP'],
  'Real Estate': ['AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'WELL', 'AVB', 'EQR', 'DLR', 'BXP', 'VTR', 'ESS', 'MAA', 'UDR', 'CPT', 'FRT', 'REG', 'HST', 'PEAK', 'AIV'],
  'Materials': ['LIN', 'APD', 'SHW', 'FCX', 'NEM', 'ECL', 'DD', 'DOW', 'PPG', 'NUE', 'VMC', 'MLM', 'GOLD', 'AA', 'X', 'STLD', 'RS', 'CF', 'MOS', 'FMC'],
  'ETFs': ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'VEA', 'VWO', 'IVV', 'VTV', 'VUG', 'VIG', 'VXUS', 'BND', 'AGG', 'LQD', 'HYG', 'TLT', 'IEF', 'SHY'],
  'Crypto': ['BTCUSD', 'ETHUSD', 'ADAUSD', 'SOLUSD', 'DOGEUSD', 'MATICUSD', 'AVAXUSD', 'LINKUSD', 'DOTUSD', 'UNIUSD', 'LTCUSD', 'BCHUSD', 'XLMUSD', 'VETUSD', 'ICPUSD'],
  'Commodities': ['GLD', 'SLV', 'USO', 'UNG', 'DBA', 'PDBC', 'DJP', 'GSG', 'BCI', 'CORN', 'WEAT', 'SOYB', 'JO', 'NIB', 'BAL', 'COPX', 'SIL', 'PALL', 'PPLT', 'JJC']
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');

    console.log('🏭 Fetching REAL market categories data from Tiingo...');

    // Check cache
    if (cachedCategories && (Date.now() - cachedCategories.timestamp) < CACHE_DURATION) {
      console.log('📦 Using cached market categories data');
      
      // If specific category requested, return detailed assets for that category
      if (categoryParam) {
        return getCategoryAssets(categoryParam, cachedCategories.data);
      }
      
      return NextResponse.json({
        categories: cachedCategories.data,
        lastUpdated: new Date().toISOString(),
        dataSource: 'Tiingo API (Cached)'
      });
    }

    const categories: CategoryData[] = [];

    for (const [categoryName, symbols] of Object.entries(CATEGORY_SYMBOLS)) {
      try {
        console.log(`📊 Processing ${categoryName} with ${symbols.length} symbols...`);
        
        const marketData = await getTiingoMarketData(symbols);
        
        if (marketData && marketData.length > 0) {
          // Calculate category performance
          const totalPerformance = marketData.reduce((sum, item) => sum + item.changePercent, 0);
          const avgPerformance = totalPerformance / marketData.length;
          
          const totalChange = marketData.reduce((sum, item) => sum + item.change, 0);
          const avgChange = totalChange / marketData.length;
          
          const totalVolume = marketData.reduce((sum, item) => sum + item.volume, 0);
          
          const bullishCount = marketData.filter(item => item.changePercent > 0).length;
          const sentiment = bullishCount > marketData.length / 2 ? 'Bullish' : 'Bearish';
          
          const trend = avgPerformance > 1 ? 'UPTREND' : avgPerformance < -1 ? 'DOWNTREND' : 'SIDEWAYS';
          
          categories.push({
            category: categoryName,
            performance: `${avgPerformance > 0 ? '+' : ''}${avgPerformance.toFixed(2)}%`,
            change: avgChange.toFixed(2),
            volume: totalVolume.toLocaleString(),
            sentiment,
            topTickers: marketData
              .sort((a, b) => b.changePercent - a.changePercent)
              .slice(0, 3)
              .map(item => item.symbol),
            trend,
            direction: avgPerformance > 0 ? '↗️' : avgPerformance < 0 ? '↘️' : '→'
          });

          console.log(`✅ ${categoryName}: ${avgPerformance.toFixed(2)}% (${sentiment})`);
        } else {
          console.log(`⚠️ No data available for ${categoryName}`);
          
          // Add placeholder data to maintain UI consistency
          categories.push({
            category: categoryName,
            performance: '0.00%',
            change: '0.00',
            volume: '0',
            sentiment: 'Neutral',
            topTickers: symbols.slice(0, 3),
            trend: 'SIDEWAYS',
            direction: '→'
          });
        }
        
        // Small delay to be respectful to Tiingo API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error processing category ${categoryName}:`, error);
        
        // Add placeholder for this category
        categories.push({
          category: categoryName,
          performance: '0.00%',
          change: '0.00',
          volume: '0',
          sentiment: 'Neutral',
          topTickers: symbols.slice(0, 3),
          trend: 'SIDEWAYS',
          direction: '→'
        });
      }
    }

    // Cache the results
    cachedCategories = {
      data: categories,
      timestamp: Date.now()
    };

    console.log(`✅ Market categories complete - ${categories.length} categories processed`);
    console.log(`📊 Sample: ${categories[0]?.category}: ${categories[0]?.performance}`);

    // If specific category requested, return detailed assets for that category
    if (categoryParam) {
      return getCategoryAssets(categoryParam, categories);
    }

    return NextResponse.json({
      categories,
      lastUpdated: new Date().toISOString(),
      dataSource: 'Tiingo API Real Data'
    });

  } catch (error) {
    console.error('❌ Error fetching market categories:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch market categories data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
