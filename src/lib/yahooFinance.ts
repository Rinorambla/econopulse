// Yahoo Finance API integration as fallback for missing ETFs

export interface YahooQuote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  name: string;
}

// Simplified Yahoo Finance fetch
export async function getYahooQuote(ticker: string): Promise<YahooQuote | null> {
  try {
    console.log(`🔍 Fetching ${ticker} from Yahoo Finance...`);
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) {
      console.warn(`⚠️  Yahoo Finance API error for ${ticker}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result?.meta) {
      console.warn(`⚠️  No data for ${ticker} from Yahoo Finance`);
      return null;
    }

    const meta = result.meta;
    const quoteBlock = result.indicators?.quote?.[0] || {};
    const closes: number[] = Array.isArray(quoteBlock.close) ? quoteBlock.close.filter((c: any) => typeof c === 'number') : [];
    const volumes: number[] = Array.isArray(quoteBlock.volume) ? quoteBlock.volume.filter((v: any) => typeof v === 'number') : [];

    // Derive current & previous using best available data
    let currentPrice = meta.regularMarketPrice || 0;
    const previousCloseMeta = meta.previousClose || 0;
    const lastClose = closes.length ? closes[closes.length - 1] : 0;
    const prevCloseSeries = closes.length > 1 ? closes[closes.length - 2] : 0;

    // Prefer lastClose if it differs meaningfully from regularMarketPrice (end of session)
    if (lastClose && Math.abs(lastClose - currentPrice) / (currentPrice || 1) > 0.0001) {
      currentPrice = lastClose;
    } else if (!currentPrice && lastClose) {
      currentPrice = lastClose;
    }

    // Choose previous close candidate priority: prevCloseSeries > previousCloseMeta > lastClose
    let previousClose = prevCloseSeries || previousCloseMeta || lastClose || currentPrice;

    // If current == previous (likely after-hours) try meta.regularMarketChangePercent
    let change = currentPrice - previousClose;
    let changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
    if (Math.abs(changePercent) < 0.0001 && typeof meta.regularMarketChangePercent === 'number') {
      changePercent = meta.regularMarketChangePercent;
      change = (changePercent / 100) * previousClose;
    }

    // Fallback: if still zero and we have at least 3 closes, compare last vs third-last
    if (Math.abs(changePercent) < 0.0001 && closes.length > 2) {
      const altPrev = closes[closes.length - 3];
      if (altPrev) {
        previousClose = altPrev;
        change = currentPrice - previousClose;
        changePercent = previousClose ? (change / previousClose) * 100 : 0;
      }
    }

    const quote: YahooQuote = {
      ticker: ticker.toUpperCase(),
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      volume: meta.regularMarketVolume || volumes[volumes.length - 1] || 0,
      name: meta.longName || meta.shortName || ticker
    };

    console.log(`✅ Yahoo Finance: ${ticker} = $${currentPrice.toFixed(2)} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
    return quote;

  } catch (error) {
    console.error(`❌ Yahoo Finance error for ${ticker}:`, error);
    return null;
  }
}

// Fetch multiple quotes from Yahoo Finance
export async function getYahooQuotes(tickers: string[]): Promise<YahooQuote[]> {
  console.log(`🚀 Fetching ${tickers.length} quotes from Yahoo Finance...`);
  
  const results: YahooQuote[] = [];
  
  // Process in batches to avoid overwhelming the API
  const BATCH_SIZE = 5;
  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(ticker => 
      getYahooQuote(ticker).catch(error => {
        console.warn(`⚠️  Failed to fetch ${ticker} from Yahoo Finance:`, error);
        return null;
      })
    );
    
    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter((result): result is YahooQuote => result !== null);
    
    results.push(...validResults);
    
    // Small delay between batches
    if (i + BATCH_SIZE < tickers.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`✅ Successfully fetched ${results.length}/${tickers.length} quotes from Yahoo Finance`);
  return results;
}

// Convert Yahoo Finance data to our MarketDataItem format
export function convertYahooToMarketData(yahooQuote: YahooQuote) {
  return {
    ticker: yahooQuote.ticker,
    price: yahooQuote.price.toString(),
    performance: yahooQuote.changePercent.toFixed(2),
    change: yahooQuote.change,
    volume: yahooQuote.volume.toString(),
    marketCap: '0',
    name: yahooQuote.name
  };
}
