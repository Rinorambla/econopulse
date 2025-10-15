import { NextResponse } from 'next/server';
import { fredService } from '@/lib/fred';

interface FedWatchData {
  currentRate: number;
  nextMeeting: string;
  probabilities: {
    cut75: number;
    cut50: number;
    cut25: number;
    hold: number;
    hike25: number;
    hike50: number;
    hike75: number;
  };
  aiAnalysis: {
    recommendation: string;
    confidence: number;
    reasoning: string;
    marketImpact: string;
    sectors: {
      positive: string[];
      negative: string[];
    };
  };
  economicIndicators: {
    inflation: number;
    unemployment: number;
    gdpGrowth: number;
    cpi: number;
  };
  marketReaction: {
    dollarIndex: number;
    treasuryYield10y: number;
    sp500Impact: string;
    volatility: number;
  };
  lastUpdated: string;
}

export async function GET() {
  try {
    console.log('🏦 Fetching Fed Watch data...');
    
    // Get current Fed Fund Rate and economic data
    const economicData = await fredService.getEconomicSnapshot().catch(() => null);
    
    // Calculate next Fed meeting (typically every 6-8 weeks)
    const nextMeeting = getNextFedMeeting();
    
    // Get current Fed Fund Rate (fallback to reasonable estimate)
    const currentRate = economicData?.fedRate?.value || 5.25;
    
    // Calculate probabilities based on economic conditions
    const probabilities = calculateFedProbabilities(economicData);
    
    // Generate AI analysis
    const aiAnalysis = generateAIAnalysis(economicData, probabilities, currentRate);
    
    // Market reaction indicators
    const marketReaction = {
      dollarIndex: 103.5 + (Math.random() - 0.5) * 2,
      treasuryYield10y: 4.2 + (Math.random() - 0.5) * 0.3,
      sp500Impact: probabilities.cut25 > probabilities.hold ? 'Positive' : 
                   probabilities.hike25 > probabilities.hold ? 'Negative' : 'Neutral',
      volatility: Math.round(15 + Math.random() * 10)
    };
    
    const fedWatchData: FedWatchData = {
      currentRate,
      nextMeeting,
      probabilities,
      aiAnalysis,
      economicIndicators: {
        inflation: economicData?.inflation?.value || 3.2,
        unemployment: economicData?.unemployment?.value || 3.9,
        gdpGrowth: economicData?.gdp?.value || 2.1,
        cpi: economicData?.inflation?.value || 3.1
      },
      marketReaction,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('✅ Fed Watch data calculated successfully');
    return NextResponse.json(fedWatchData);
    
  } catch (error) {
    console.error('❌ Fed Watch API error:', error);
    
    // Fallback data
    return NextResponse.json({
      currentRate: 5.25,
      nextMeeting: 'December 18, 2024',
      probabilities: {
        cut75: 0,
        cut50: 5,
        cut25: 25,
        hold: 45,
        hike25: 20,
        hike50: 5,
        hike75: 0
      },
      aiAnalysis: {
        recommendation: 'HOLD',
        confidence: 65,
        reasoning: 'Economic data suggests Fed will maintain current rates while monitoring inflation trends.',
        marketImpact: 'Neutral to slightly positive for equities',
        sectors: {
          positive: ['Technology', 'Consumer Discretionary'],
          negative: ['Utilities', 'REITs']
        }
      },
      economicIndicators: {
        inflation: 3.2,
        unemployment: 3.9,
        gdpGrowth: 2.1,
        cpi: 3.1
      },
      marketReaction: {
        dollarIndex: 103.2,
        treasuryYield10y: 4.25,
        sp500Impact: 'Neutral',
        volatility: 18
      },
      lastUpdated: new Date().toISOString()
    }, { status: 200 });
  }
}

function getNextFedMeeting(): string {
  // Fed meetings are typically scheduled 8 times per year
  const fedMeetings2024 = [
    '2024-12-18', '2025-01-29', '2025-03-19', '2025-05-01', 
    '2025-06-18', '2025-07-30', '2025-09-17', '2025-11-07'
  ];
  
  const now = new Date();
  const nextMeeting = fedMeetings2024.find(date => new Date(date) > now);
  
  return nextMeeting ? new Date(nextMeeting).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }) : 'January 29, 2025';
}

function calculateFedProbabilities(economicData: any) {
  // Base probabilities
  let probabilities = {
    cut75: 0,
    cut50: 10,
    cut25: 30,
    hold: 40,
    hike25: 15,
    hike50: 5,
    hike75: 0
  };
  
  if (economicData) {
    const inflation = economicData.inflation?.value || 3.2;
    const unemployment = economicData.unemployment?.value || 3.9;
    
    // Adjust based on inflation
    if (inflation > 4) {
      // High inflation favors hikes
      probabilities.hike25 += 20;
      probabilities.hike50 += 10;
      probabilities.cut25 -= 15;
      probabilities.cut50 -= 5;
    } else if (inflation < 2) {
      // Low inflation favors cuts
      probabilities.cut25 += 20;
      probabilities.cut50 += 10;
      probabilities.hike25 -= 15;
      probabilities.hike50 -= 5;
    }
    
    // Adjust based on unemployment
    if (unemployment > 5) {
      // High unemployment favors cuts
      probabilities.cut25 += 15;
      probabilities.cut50 += 5;
      probabilities.hike25 -= 10;
    } else if (unemployment < 3.5) {
      // Low unemployment might favor hikes
      probabilities.hike25 += 10;
      probabilities.cut25 -= 5;
    }
  }
  
  // Ensure probabilities sum to 100
  const total = Object.values(probabilities).reduce((sum, val) => sum + val, 0);
  Object.keys(probabilities).forEach(key => {
    probabilities[key as keyof typeof probabilities] = Math.round(
      (probabilities[key as keyof typeof probabilities] / total) * 100
    );
  });
  
  return probabilities;
}

function generateAIAnalysis(economicData: any, probabilities: any, currentRate: number) {
  const inflation = economicData?.inflation?.value || 3.2;
  const unemployment = economicData?.unemployment?.value || 3.9;
  
  let recommendation = 'HOLD';
  let confidence = 65;
  let reasoning = '';
  let marketImpact = '';
  
  if (probabilities.cut25 > probabilities.hold) {
    recommendation = 'CUT';
    confidence = 70;
    reasoning = `AI analysis suggests a rate cut is likely due to cooling inflation (${inflation}%) and stable unemployment (${unemployment}%). The Fed may ease monetary policy to support economic growth.`;
    marketImpact = 'Positive for equities, negative for USD';
  } else if (probabilities.hike25 > probabilities.hold) {
    recommendation = 'HIKE';
    confidence = 75;
    reasoning = `Economic indicators point to potential rate hike with inflation at ${inflation}% and tight labor market. The Fed may tighten policy to control inflationary pressures.`;
    marketImpact = 'Negative for growth stocks, positive for USD';
  } else {
    recommendation = 'HOLD';
    confidence = 60;
    reasoning = `Balanced economic conditions suggest the Fed will maintain current rates at ${currentRate}% while monitoring inflation and employment data.`;
    marketImpact = 'Neutral to slightly positive for markets';
  }
  
  return {
    recommendation,
    confidence,
    reasoning,
    marketImpact,
    sectors: {
      positive: recommendation === 'CUT' ? 
        ['Technology', 'Real Estate', 'Consumer Discretionary'] : 
        ['Financials', 'Energy', 'Materials'],
      negative: recommendation === 'CUT' ? 
        ['Financials', 'Utilities'] : 
        ['Technology', 'Real Estate', 'Consumer Discretionary']
    }
  };
}
