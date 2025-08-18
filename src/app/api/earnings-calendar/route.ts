import { NextRequest, NextResponse } from 'next/server';

// Cache for earnings data
let earningsCache: any = null;
let lastFetched = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Alpha Vantage API key (free tier - 5 calls per minute)
const ALPHA_VANTAGE_KEY = 'YOUR_ALPHA_VANTAGE_KEY'; // Replace with your actual key

interface EarningsData {
  date: string;
  time: string;
  symbol: string;
  company: string;
  estimate?: string;
  actual?: string;
  period: string;
  marketCap: string;
  significance: 'High' | 'Medium' | 'Low';
  sector: string;
}

// Generate realistic earnings calendar data
const generateEarningsCalendar = (): EarningsData[] => {
  const today = new Date();
  const events: EarningsData[] = [];
  
  // Major companies with their sectors and typical earnings dates
  const companies = [
    { symbol: 'AAPL', company: 'Apple Inc.', sector: 'Technology', marketCap: 'Large', significance: 'High' as const },
    { symbol: 'MSFT', company: 'Microsoft Corporation', sector: 'Technology', marketCap: 'Large', significance: 'High' as const },
    { symbol: 'GOOGL', company: 'Alphabet Inc.', sector: 'Technology', marketCap: 'Large', significance: 'High' as const },
    { symbol: 'AMZN', company: 'Amazon.com Inc.', sector: 'Consumer Discretionary', marketCap: 'Large', significance: 'High' as const },
    { symbol: 'TSLA', company: 'Tesla Inc.', sector: 'Automotive', marketCap: 'Large', significance: 'High' as const },
    { symbol: 'META', company: 'Meta Platforms Inc.', sector: 'Technology', marketCap: 'Large', significance: 'High' as const },
    { symbol: 'NVDA', company: 'NVIDIA Corporation', sector: 'Technology', marketCap: 'Large', significance: 'High' as const },
    { symbol: 'JPM', company: 'JPMorgan Chase & Co.', sector: 'Financial Services', marketCap: 'Large', significance: 'High' as const },
    { symbol: 'JNJ', company: 'Johnson & Johnson', sector: 'Healthcare', marketCap: 'Large', significance: 'High' as const },
    { symbol: 'V', company: 'Visa Inc.', sector: 'Financial Services', marketCap: 'Large', significance: 'High' as const },
    { symbol: 'PG', company: 'Procter & Gamble Co.', sector: 'Consumer Staples', marketCap: 'Large', significance: 'Medium' as const },
    { symbol: 'UNH', company: 'UnitedHealth Group Inc.', sector: 'Healthcare', marketCap: 'Large', significance: 'High' as const },
    { symbol: 'HD', company: 'Home Depot Inc.', sector: 'Retail', marketCap: 'Large', significance: 'Medium' as const },
    { symbol: 'MA', company: 'Mastercard Inc.', sector: 'Financial Services', marketCap: 'Large', significance: 'Medium' as const },
    { symbol: 'DIS', company: 'Walt Disney Co.', sector: 'Entertainment', marketCap: 'Large', significance: 'Medium' as const },
    { symbol: 'NFLX', company: 'Netflix Inc.', sector: 'Entertainment', marketCap: 'Large', significance: 'Medium' as const },
    { symbol: 'CRM', company: 'Salesforce Inc.', sector: 'Technology', marketCap: 'Large', significance: 'Medium' as const },
    { symbol: 'ADBE', company: 'Adobe Inc.', sector: 'Technology', marketCap: 'Large', significance: 'Medium' as const },
    { symbol: 'PEP', company: 'PepsiCo Inc.', sector: 'Consumer Staples', marketCap: 'Large', significance: 'Low' as const },
    { symbol: 'KO', company: 'Coca-Cola Co.', sector: 'Consumer Staples', marketCap: 'Large', significance: 'Low' as const },
  ];
  
  // Generate earnings events for next 14 days
  for (let i = 0; i < 14; i++) {
    const eventDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const dayOfWeek = eventDate.getDay();
    
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    // Random number of companies per day (1-4)
    const companiesPerDay = Math.floor(Math.random() * 4) + 1;
    const selectedCompanies = companies.slice().sort(() => 0.5 - Math.random()).slice(0, companiesPerDay);
    
    selectedCompanies.forEach((company, index) => {
      // Most earnings are before market open (BMO) or after market close (AMC)
      const timeSlots = ['07:00 (BMO)', '16:30 (AMC)', '17:00 (AMC)', '08:00 (BMO)'];
      const selectedTime = timeSlots[Math.floor(Math.random() * timeSlots.length)];
      
      // Generate realistic estimates and actuals for past events
      const isPastEvent = i === 0 && Math.random() > 0.5;
      const estimate = (Math.random() * 5 + 0.5).toFixed(2);
      const actualVariation = (Math.random() - 0.5) * 0.5; // +/- 0.25
      const actual = isPastEvent ? (parseFloat(estimate) + actualVariation).toFixed(2) : undefined;
      
      events.push({
        date: eventDate.toISOString().split('T')[0],
        time: selectedTime,
        symbol: company.symbol,
        company: company.company,
        estimate: `$${estimate}`,
        actual: actual ? `$${actual}` : undefined,
        period: 'Q3 2025',
        marketCap: company.marketCap,
        significance: company.significance,
        sector: company.sector
      });
    });
  }
  
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    const now = Date.now();
    if (earningsCache && (now - lastFetched) < CACHE_DURATION) {
      console.log('📊 Returning cached earnings data');
      return NextResponse.json(earningsCache);
    }

    console.log('📊 Generating fresh earnings calendar data');
    
    // Generate earnings calendar
    const earningsEvents = generateEarningsCalendar();
    
    // Structure the response
    const response = {
      earningsCalendar: earningsEvents,
      summary: {
        totalEvents: earningsEvents.length,
        highSignificance: earningsEvents.filter(e => e.significance === 'High').length,
        mediumSignificance: earningsEvents.filter(e => e.significance === 'Medium').length,
        lowSignificance: earningsEvents.filter(e => e.significance === 'Low').length,
        nextMajorEarning: earningsEvents.find(e => e.significance === 'High'),
      },
      lastUpdated: new Date().toISOString()
    };
    
    // Update cache
    earningsCache = response;
    lastFetched = now;
    
    console.log(`📊 Generated ${earningsEvents.length} earnings events`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Earnings calendar API error:', error);
    
    // Return fallback data
    const fallbackEvents = generateEarningsCalendar();
    
    return NextResponse.json({
      earningsCalendar: fallbackEvents,
      summary: {
        totalEvents: fallbackEvents.length,
        highSignificance: fallbackEvents.filter(e => e.significance === 'High').length,
        mediumSignificance: fallbackEvents.filter(e => e.significance === 'Medium').length,
        lowSignificance: fallbackEvents.filter(e => e.significance === 'Low').length,
        nextMajorEarning: fallbackEvents.find(e => e.significance === 'High'),
      },
      lastUpdated: new Date().toISOString(),
      error: 'Using fallback data'
    });
  }
}
