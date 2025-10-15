import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache for earnings data
let earningsCache: any = null;
let lastFetched = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const SNAP_DIR = path.join(process.cwd(), 'data-snapshots');
const SNAP_FILE = path.join(SNAP_DIR, 'earnings-calendar-latest.json');

function generateSeedEarnings(): any {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0,10);
  const mk = (offset: number, symbol: string, company: string) => ({
    date: fmt(new Date(today.getTime() + offset*86400000)),
    time: offset % 2 === 0 ? 'AMC' : 'BMO',
    symbol,
    company,
    epsEstimate: 'Est: TBD',
    estimate: 'Est: TBD',
    actual: undefined,
    period: 'Q3 2025',
    marketCap: 'Large',
    significance: 'High',
    sector: 'Technology'
  })
  return [
    mk(1,'AAPL','Apple Inc.'),
    mk(2,'MSFT','Microsoft'),
    mk(3,'GOOGL','Alphabet'),
    mk(4,'AMZN','Amazon.com'),
    mk(5,'META','Meta Platforms'),
    mk(6,'NVDA','NVIDIA Corp')
  ]
}

// Financial Modeling Prep API key (set FMP_API_KEY in .env.local)
const FMP_API_KEY = process.env.FMP_API_KEY || '';

interface EarningsData {
  date: string;
  time: string;
  symbol: string;
  company: string;
  estimate?: string;
  epsEstimate?: string; // For frontend compatibility
  actual?: string;
  period: string;
  marketCap: string;
  significance: 'High' | 'Medium' | 'Low';
  sector: string;
}

// Fetch real earnings calendar data from Financial Modeling Prep
const fetchRealEarningsCalendar = async (): Promise<EarningsData[]> => {
  try {
    // Get next 30 days of earnings events
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 30);
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = endDate.toISOString().split('T')[0];
    
    console.log('📊 Fetching REAL earnings calendar from FMP...');
    console.log(`🗓️ Date range: ${fromDate} to ${toDate}`);
    
    if (!FMP_API_KEY) {
      console.warn('⚠️ Missing FMP_API_KEY for earnings calendar. Returning empty fallback.')
      return [];
    }
    const url = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MyFinancialApp/1.0',
      }
    });
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`);
    }
    
    const rawData = await response.json();
    console.log(`📈 FMP returned ${rawData.length} earnings events`);
    
    // Debug: Log first event to see available fields
    if (rawData.length > 0) {
      console.log('📊 Sample FMP event data:', JSON.stringify(rawData[0], null, 2));
    }
    
    // Transform FMP data to our format
    const events: EarningsData[] = rawData
      .filter((event: any) => event.symbol && event.date) // Filter out invalid entries
      .slice(0, 50) // Limit to 50 events to avoid overwhelming the UI
      .map((event: any) => {
        // Determine significance based on market cap and revenue
        let significance: 'High' | 'Medium' | 'Low' = 'Low';
        const revenue = parseFloat(event.revenue) || 0;
        
        if (revenue > 50000000000 || ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA'].includes(event.symbol)) {
          significance = 'High';
        } else if (revenue > 5000000000) {
          significance = 'Medium';
        }
        
        const epsEstimate = event.epsEstimated ? `$${parseFloat(event.epsEstimated).toFixed(2)}` : 
                            event.estimatedEPS ? `$${parseFloat(event.estimatedEPS).toFixed(2)}` :
                            event.estimate ? `$${parseFloat(event.estimate).toFixed(2)}` : 
                            event.consensusEPS ? `$${parseFloat(event.consensusEPS).toFixed(2)}` : 'Est: TBD';
        
        return {
          date: event.date,
          time: event.time || 'BMO', // Before Market Open
          symbol: event.symbol,
          company: event.name || event.companyName || event.symbol,
          epsEstimate: epsEstimate,
          estimate: epsEstimate,
          actual: event.eps ? `$${parseFloat(event.eps).toFixed(2)}` : 
                 event.actualEPS ? `$${parseFloat(event.actualEPS).toFixed(2)}` : 
                 event.reportedEPS ? `$${parseFloat(event.reportedEPS).toFixed(2)}` : undefined,
          period: event.fiscalDateEnding || event.quarter || event.period || 'Q3 2025',
          marketCap: event.marketCapitalization > 10000000000 ? 'Large' : 
                    event.marketCapitalization > 2000000000 ? 'Medium' : 'Small',
          significance,
          sector: event.sector || event.industry || 'Technology'
        };
      });
    
    console.log(`✅ Processed ${events.length} earnings events`);
    return events;
    
  } catch (error) {
  console.error('❌ Error fetching real earnings data:', error);
    
  // Return empty if API fails (no synthetic data)
  console.log('🔄 Falling back to empty earnings list...');
  return [];
  }
};

// No synthetic fallback

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    const now = Date.now();
    if (earningsCache && (now - lastFetched) < CACHE_DURATION) {
      console.log('📊 Returning cached earnings data');
      return NextResponse.json(earningsCache);
    }

  console.log('📊 Fetching fresh earnings calendar data...');
  const url = new URL(request.url)
  const daysParam = url.searchParams.get('days')
  const days = Math.max(1, Math.min(60, Number(daysParam) || 30))
  // Per ora, FMP ritorna prossimi 30 giorni; se days differisce, verrà gestito internamente in FMP o lato UI
  const earningsEvents: EarningsData[] = await fetchRealEarningsCalendar()
    
    // Structure the response
    const response = {
      earningsCalendar: earningsEvents,
      data: earningsEvents, // For compatibility with frontend
      summary: {
        totalEvents: earningsEvents.length,
        totalCompanies: earningsEvents.length,
        highSignificance: earningsEvents.filter((e: EarningsData) => e.significance === 'High').length,
        mediumSignificance: earningsEvents.filter((e: EarningsData) => e.significance === 'Medium').length,
        lowSignificance: earningsEvents.filter((e: EarningsData) => e.significance === 'Low').length,
        nextMajorEarning: earningsEvents.find((e: EarningsData) => e.significance === 'High'),
      },
  lastUpdated: new Date().toISOString()
    };
    
    // Update cache
    earningsCache = response;
    lastFetched = now;

    // Persist snapshot safely (only if non-empty)
    if (earningsEvents.length) {
      try {
        if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR);
        fs.writeFileSync(SNAP_FILE, JSON.stringify(response, null, 2), 'utf8');
      } catch (e) {
        console.warn('earnings-calendar snapshot write error:', e);
      }
    }
    
  console.log(`✅ Returned ${earningsEvents.length} earnings events`);
    
    // If empty, attempt snapshot fallback
    if (!earningsEvents.length) {
      try {
        if (fs.existsSync(SNAP_FILE)) {
          const snapRaw = JSON.parse(fs.readFileSync(SNAP_FILE, 'utf8'))
          if (Array.isArray(snapRaw?.data) && snapRaw.data.length) {
            console.warn('earnings-calendar: serving snapshot fallback (empty live)')
            return NextResponse.json({ ...snapRaw, source: 'snapshot' })
          }
        }
      } catch (e) {
        console.warn('earnings-calendar snapshot read error:', e)
      }
      // Final fallback: seed data
      const seed = generateSeedEarnings()
      const payload = {
        earningsCalendar: seed,
        data: seed,
        summary: {
          totalEvents: seed.length,
          totalCompanies: seed.length,
          highSignificance: seed.filter((e:any)=> e.significance==='High').length,
          mediumSignificance: seed.filter((e:any)=> e.significance==='Medium').length,
          lowSignificance: seed.filter((e:any)=> e.significance==='Low').length,
          nextMajorEarning: seed[0] || null,
        },
        lastUpdated: new Date().toISOString(),
        source: 'seed'
      }
      return NextResponse.json(payload)
    }
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Earnings calendar API error:', error);
    // Try snapshot fallback
    try {
      if (fs.existsSync(SNAP_FILE)) {
        const snapRaw = JSON.parse(fs.readFileSync(SNAP_FILE, 'utf8'))
        if (Array.isArray(snapRaw?.data) && snapRaw.data.length) {
          console.warn('earnings-calendar: serving snapshot fallback');
          return NextResponse.json({ ...snapRaw, source: 'snapshot' });
        }
      }
    } catch (e) {
      console.warn('earnings-calendar snapshot read error:', e);
    }
    // Otherwise, return empty shape
    return NextResponse.json({
      earningsCalendar: [],
      data: [],
      summary: {
        totalEvents: 0,
        totalCompanies: 0,
        highSignificance: 0,
        mediumSignificance: 0,
        lowSignificance: 0,
        nextMajorEarning: null,
      },
      lastUpdated: new Date().toISOString(),
      source: 'empty'
    });
  }
}
