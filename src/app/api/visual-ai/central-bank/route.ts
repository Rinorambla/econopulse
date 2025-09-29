import { NextRequest, NextResponse } from 'next/server';

interface CentralBankStatement {
  id: string;
  bank: string;
  country: string;
  date: string;
  type: 'rate_decision' | 'speech' | 'minutes' | 'statement';
  title: string;
  summary: string;
  sentiment: 'hawkish' | 'dovish' | 'neutral';
  confidence: number;
  keyPoints: string[];
  rateChange?: number;
  currentRate?: number;
  nextMeetingDate?: string;
}

// Mock data with realistic central bank communications
const mockCentralBankData: CentralBankStatement[] = [
  {
    id: 'fed_2024_01',
    bank: 'Federal Reserve',
    country: 'United States',
    date: '2024-01-31',
    type: 'rate_decision',
    title: 'Federal Reserve maintains federal funds rate at 5.25-5.50%',
    summary: 'The Federal Open Market Committee decided to maintain the target range for the federal funds rate. Inflation has eased over the past year but remains elevated.',
    sentiment: 'hawkish',
    confidence: 85,
    keyPoints: [
      'Inflation remains elevated despite recent progress',
      'Labor market remains tight but showing signs of cooling',
      'Economic activity has continued to expand at solid pace',
      'Committee remains committed to bringing inflation to 2% target'
    ],
    rateChange: 0,
    currentRate: 5.375,
    nextMeetingDate: '2024-03-20'
  },
  {
    id: 'ecb_2024_01',
    bank: 'European Central Bank',
    country: 'Eurozone',
    date: '2024-01-25',
    type: 'statement',
    title: 'ECB maintains key interest rates unchanged',
    summary: 'The Governing Council decided to keep key ECB interest rates unchanged. Inflation has declined significantly but is expected to fluctuate around current levels.',
    sentiment: 'neutral',
    confidence: 75,
    keyPoints: [
      'Inflation declining but remains above target',
      'Economic growth showing signs of resilience',
      'Wage growth remains elevated',
      'Monetary policy transmission proceeding'
    ],
    rateChange: 0,
    currentRate: 4.50,
    nextMeetingDate: '2024-03-07'
  },
  {
    id: 'boe_2024_01',
    bank: 'Bank of England',
    country: 'United Kingdom',
    date: '2024-02-01',
    type: 'minutes',
    title: 'Bank of England maintains Bank Rate at 5.25%',
    summary: 'The Monetary Policy Committee voted by majority to maintain Bank Rate. CPI inflation fell to 4.0% in December, with services inflation remaining elevated.',
    sentiment: 'hawkish',
    confidence: 80,
    keyPoints: [
      'CPI inflation continues to fall but services inflation elevated',
      'Labor market showing further signs of loosening',
      'GDP growth flat in Q4 2023',
      'Further tightening may be required if inflation persistence'
    ],
    rateChange: 0,
    currentRate: 5.25,
    nextMeetingDate: '2024-03-21'
  },
  {
    id: 'boj_2024_01',
    bank: 'Bank of Japan',
    country: 'Japan',
    date: '2024-01-23',
    type: 'statement',
    title: 'Bank of Japan maintains ultra-loose monetary policy',
    summary: 'The Bank maintained its ultra-loose monetary policy settings. The economy is recovering moderately, though some weakness is seen in part.',
    sentiment: 'dovish',
    confidence: 90,
    keyPoints: [
      'Economy recovering moderately with some weakness',
      'Inflation expectations rising gradually',
      'Will continue with monetary easing',
      'Closely monitoring wage negotiations for 2024'
    ],
    rateChange: 0,
    currentRate: -0.10,
    nextMeetingDate: '2024-03-19'
  },
  {
    id: 'pboc_2024_01',
    bank: 'People\'s Bank of China',
    country: 'China',
    date: '2024-02-05',
    type: 'statement',
    title: 'PBOC maintains accommodative monetary policy stance',
    summary: 'The central bank will maintain appropriate monetary policy support for the economy while keeping liquidity reasonably ample.',
    sentiment: 'dovish',
    confidence: 85,
    keyPoints: [
      'Will maintain reasonably ample liquidity',
      'Support for real economy development',
      'Prudent monetary policy to be flexible',
      'Focus on high-quality economic development'
    ],
    currentRate: 3.45
  },
  {
    id: 'rba_2024_01',
    bank: 'Reserve Bank of Australia',
    country: 'Australia',
    date: '2024-02-06',
    type: 'rate_decision',
    title: 'RBA holds cash rate steady at 4.35%',
    summary: 'The Board decided to hold the cash rate steady. Inflation has declined significantly but remains above the target range.',
    sentiment: 'neutral',
    confidence: 70,
    keyPoints: [
      'Inflation declining but above target range',
      'Labor market remains tight',
      'Economic growth below trend',
      'Will remain vigilant to upside risks to inflation'
    ],
    rateChange: 0,
    currentRate: 4.35,
    nextMeetingDate: '2024-03-19'
  },
  {
    id: 'snb_2024_01',
    bank: 'Swiss National Bank',
    country: 'Switzerland',
    date: '2024-03-21',
    type: 'rate_decision',
    title: 'SNB cuts policy rate to 1.50%',
    summary: 'The SNB is lowering the policy rate by 0.25 percentage points to 1.50%. Inflation has declined further and underlying inflationary pressure has eased.',
    sentiment: 'dovish',
    confidence: 95,
    keyPoints: [
      'Inflation declined further to 1.2%',
      'Underlying inflationary pressure has eased',
      'Economic activity remains solid',
      'Further rate cuts possible if inflation outlook deteriorates'
    ],
    rateChange: -0.25,
    currentRate: 1.50,
    nextMeetingDate: '2024-06-20'
  },
  {
    id: 'boc_2024_01',
    bank: 'Bank of Canada',
    country: 'Canada',
    date: '2024-01-24',
    type: 'rate_decision',
    title: 'Bank of Canada maintains policy rate at 5.00%',
    summary: 'The Bank of Canada today held its target for the overnight rate at 5%. CPI inflation eased to 3.4% in December.',
    sentiment: 'hawkish',
    confidence: 75,
    keyPoints: [
      'CPI inflation eased but remains above target',
      'Economic growth stronger than expected in Q4',
      'Labor market tight with wage growth elevated',
      'Prepared to raise rates further if needed'
    ],
    rateChange: 0,
    currentRate: 5.00,
    nextMeetingDate: '2024-03-06'
  }
];

// Simulate API calls with caching
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export async function GET(request: NextRequest) {
  try {
    console.log('🏦 Fetching Central Bank Statements data...');
    
    const cacheKey = 'central-bank-statements';
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📄 Returning cached Central Bank data');
      return NextResponse.json({
        success: true,
        data: cached.data,
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    // In a real implementation, this would fetch from multiple sources:
    // - FRED API for Fed statements
    // - ECB API for ECB communications  
    // - Bank APIs for other central banks
    // - RSS feeds for recent statements
    // - NLP analysis for sentiment scoring

    // For now, return enhanced mock data
    const processedData = mockCentralBankData.map(statement => ({
      ...statement,
      relativeDate: getRelativeDate(statement.date),
      impactScore: calculateImpactScore(statement),
      marketReaction: getExpectedMarketReaction(statement)
    }));

    // Sort by date (most recent first)
    processedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Cache the processed data
    cache.set(cacheKey, {
      data: processedData,
      timestamp: Date.now()
    });

    console.log(`✅ Central Bank Statements data processed: ${processedData.length} statements`);

    return NextResponse.json({
      success: true,
      data: processedData,
      source: 'api',
      metadata: {
        totalStatements: processedData.length,
        hawkishCount: processedData.filter(s => s.sentiment === 'hawkish').length,
        dovishCount: processedData.filter(s => s.sentiment === 'dovish').length,
        neutralCount: processedData.filter(s => s.sentiment === 'neutral').length,
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching Central Bank data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch central bank statements',
      data: mockCentralBankData, // fallback
      source: 'fallback',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper functions
function getRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function calculateImpactScore(statement: CentralBankStatement): number {
  let score = 50; // base score
  
  // Rate changes have higher impact
  if (statement.rateChange && Math.abs(statement.rateChange) > 0) {
    score += Math.abs(statement.rateChange) * 20;
  }
  
  // Sentiment strength
  if (statement.sentiment === 'hawkish') score += 15;
  if (statement.sentiment === 'dovish') score += 15;
  
  // Confidence level
  score += (statement.confidence - 50) / 2;
  
  // Major central banks have more impact
  if (['Federal Reserve', 'European Central Bank', 'Bank of England'].includes(statement.bank)) {
    score += 10;
  }
  
  return Math.min(100, Math.max(0, score));
}

function getExpectedMarketReaction(statement: CentralBankStatement): {
  bonds: 'up' | 'down' | 'neutral';
  currencies: 'strengthen' | 'weaken' | 'neutral';
  equities: 'up' | 'down' | 'neutral';
} {
  if (statement.sentiment === 'hawkish') {
    return {
      bonds: 'down',
      currencies: 'strengthen', 
      equities: 'down'
    };
  }
  
  if (statement.sentiment === 'dovish') {
    return {
      bonds: 'up',
      currencies: 'weaken',
      equities: 'up'
    };
  }
  
  return {
    bonds: 'neutral',
    currencies: 'neutral',
    equities: 'neutral'
  };
}
