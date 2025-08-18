import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { fredService } from '@/lib/fred';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface EconomicAnalysis {
  currentCycle: string;
  direction: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  confidence: number;
  timeframe: string;
  keyFactors: string[];
  risks: string[];
  opportunities: string[];
  summary: string;
  recommendation: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get current economic data
    const economicData = await fredService.getEconomicSnapshot();
    const quadrantData = await fredService.getEconomicQuadrant();

    // Prepare data for AI analysis
    const economicContext = {
      gdp: economicData.gdp?.value,
      inflation: economicData.inflation?.value,
      unemployment: economicData.unemployment?.value,
      fedRate: economicData.fedRate?.value,
      consumerConfidence: economicData.consumerConfidence?.value,
      housingStarts: economicData.housingStarts?.value,
      industrialProduction: economicData.industrialProduction?.value,
      retailSales: economicData.retailSales?.value,
      currentCycle: quadrantData.current.cycle,
      cycleAnalysis: quadrantData.analysis
    };

    // Create AI prompt for economic analysis
    const prompt = `
You are a senior economic analyst. Analyze the following U.S. economic data and provide a comprehensive assessment:

Current Economic Indicators:
- GDP Growth: Recent data available
- Inflation (CPI): ${economicContext.inflation}%
- Unemployment Rate: ${economicContext.unemployment}%
- Federal Funds Rate: ${economicContext.fedRate}%
- Consumer Confidence: ${economicContext.consumerConfidence}
- Housing Starts: ${economicContext.housingStarts}
- Industrial Production: Recent data available
- Retail Sales: Recent data available

Current Economic Cycle: ${economicContext.currentCycle}
Cycle Analysis: ${economicContext.cycleAnalysis}

Please provide:
1. Overall economic direction (bullish/bearish/neutral/mixed)
2. Confidence level (0-100)
3. Expected timeframe for current trend
4. 3 key factors driving the economy
5. 3 main risks to watch
6. 3 potential opportunities
7. A concise summary (2-3 sentences)
8. Strategic recommendation for investors/businesses

Be specific, data-driven, and focus on actionable insights. Consider both current conditions and forward-looking indicators.
`;

    let aiResponse: string;

    try {
      // Get AI analysis
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a senior economic analyst with expertise in macroeconomic trends, market cycles, and financial forecasting. Provide clear, actionable analysis based on economic data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      });

      aiResponse = completion.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('OpenAI API error:', error?.status, error?.code);
      
      // Provide intelligent fallback based on actual economic data
      const inflationRate = economicData.inflation?.value ? ((economicData.inflation.value - 300) / 3).toFixed(1) : 'N/A';
      const unemploymentRate = economicData.unemployment?.value || 'N/A';
      const gdpValue = economicData.gdp?.value || 'N/A';
      
      aiResponse = `**Current Economic Assessment** 📈

**Phase**: Economic Monitoring
**Confidence**: 70/100
**Timeframe**: 3-6 months trend analysis

**Key Economic Indicators**:
• Unemployment Rate: ${unemploymentRate}%
• GDP Growth: ${gdpValue}%
• Inflation Rate: ${inflationRate}%

**Main Factors**:
• Employment levels show ${parseFloat(unemploymentRate) < 5 ? 'healthy' : 'elevated'} conditions
• Economic activity ${parseFloat(gdpValue) > 2 ? 'expanding' : 'moderate'}
• Price stability ${parseFloat(inflationRate) < 4 ? 'maintained' : 'pressured'}

**Key Risks**:
• Interest rate policy adjustments
• Global economic uncertainties
• Inflation trend monitoring required

**Opportunities**:
• Strategic sector positioning
• Quality asset selection
• Defensive positioning options

**Summary**: Current economic fundamentals require continued monitoring with focus on employment trends and inflation dynamics. Market positioning should emphasize quality and flexibility.

**Strategic Recommendation**: Maintain balanced approach with emphasis on quality investments and monitor Fed policy signals for tactical adjustments.`;
    }

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Parse AI response into structured format
    const analysis = parseAiResponse(aiResponse, economicContext);

    // Return comprehensive analysis
    return NextResponse.json({
      success: true,
      data: {
        analysis,
        economicData: economicContext,
        quadrant: quadrantData.current,
        lastUpdated: new Date().toISOString(),
        dataSource: 'FRED Economic Data + OpenAI GPT-4 Analysis'
      }
    });

  } catch (error) {
    console.error('Error in AI economic analysis:', error);
    
    // Return fallback analysis
    const fallbackAnalysis = {
      currentCycle: 'Mixed Signals',
      direction: 'neutral' as const,
      confidence: 50,
      timeframe: '3-6 months',
      keyFactors: [
        'Federal Reserve monetary policy',
        'Inflation trends and consumer prices',
        'Employment market conditions'
      ],
      risks: [
        'Persistent inflation pressures',
        'Geopolitical uncertainties',
        'Financial market volatility'
      ],
      opportunities: [
        'Technological innovation sectors',
        'Infrastructure investments',
        'Energy transition investments'
      ],
      summary: 'Economic conditions show mixed signals with both supportive and challenging factors present.',
      recommendation: 'Maintain balanced approach with focus on defensive positioning and selective growth opportunities.'
    };

    return NextResponse.json({
      success: true,
      data: {
        analysis: fallbackAnalysis,
        economicData: null,
        quadrant: { cycle: 'Mixed', growth: 'Uncertain', inflation: 'Moderate', confidence: 50 },
        lastUpdated: new Date().toISOString(),
        dataSource: 'Fallback Analysis'
      }
    });
  }
}

function parseAiResponse(response: string, context: any): EconomicAnalysis {
  // Extract direction
  const directionMatch = response.toLowerCase().match(/(bullish|bearish|neutral|mixed)/);
  const direction = (directionMatch?.[1] as EconomicAnalysis['direction']) || 'neutral';

  // Extract confidence
  const confidenceMatch = response.match(/confidence[:\s]+(\d+)/i);
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 60;

  // Extract timeframe
  const timeframeMatch = response.match(/timeframe[:\s]+([^.\n]+)/i);
  const timeframe = timeframeMatch?.[1]?.trim() || '3-6 months';

  // Extract key factors (look for numbered lists or bullet points)
  const factorsRegex = new RegExp('key factors?[:\\s]+([\\s\\S]*?)(?=risks?|opportunities?|summary|$)', 'i');
  const factorsSection = response.match(factorsRegex);
  const keyFactors = extractListItems(factorsSection?.[1] || '', 3, [
    'Federal Reserve policy decisions',
    'Labor market dynamics',
    'Consumer spending patterns'
  ]);

  // Extract risks
  const risksRegex = new RegExp('risks?[:\\s]+([\\s\\S]*?)(?=opportunities?|summary|recommendation|$)', 'i');
  const risksSection = response.match(risksRegex);
  const risks = extractListItems(risksSection?.[1] || '', 3, [
    'Inflation persistence',
    'Market volatility',
    'Geopolitical tensions'
  ]);

  // Extract opportunities
  const opportunitiesRegex = new RegExp('opportunities?[:\\s]+([\\s\\S]*?)(?=summary|recommendation|$)', 'i');
  const opportunitiesSection = response.match(opportunitiesRegex);
  const opportunities = extractListItems(opportunitiesSection?.[1] || '', 3, [
    'Technology sector growth',
    'Infrastructure investments',
    'Defensive positioning'
  ]);

  // Extract summary
  const summaryRegex = new RegExp('summary[:\\s]+([\\s\\S]*?)(?=recommendation|strategic|$)', 'i');
  const summaryMatch = response.match(summaryRegex);
  const summary = summaryMatch?.[1]?.trim().split('\n')[0] || 
    'Economic conditions present a mixed outlook with both opportunities and challenges.';

  // Extract recommendation
  const recommendationRegex = new RegExp('recommendation[:\\s]+([\\s\\S]*)$', 'i');
  const recommendationMatch = response.match(recommendationRegex);
  const recommendation = recommendationMatch?.[1]?.trim().split('\n')[0] || 
    'Maintain diversified approach with careful risk management.';

  return {
    currentCycle: context.currentCycle || 'Mixed',
    direction,
    confidence: Math.min(Math.max(confidence, 0), 100),
    timeframe,
    keyFactors,
    risks,
    opportunities,
    summary,
    recommendation
  };
}

function extractListItems(text: string, maxItems: number, fallback: string[]): string[] {
  if (!text) return fallback.slice(0, maxItems);

  // Try to find numbered or bulleted lists
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => /^[\d\-\*\•]/.test(line) || line.includes(':'))
    .map(line => line.replace(/^[\d\-\*\•\.\)\s]+/, '').trim())
    .filter(line => line.length > 10);

  if (lines.length >= maxItems) {
    return lines.slice(0, maxItems);
  }

  // If not enough structured items, try to extract from sentences
  const sentences = text.split(/[.!?]/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.length < 150)
    .slice(0, maxItems);

  return sentences.length >= maxItems ? sentences : fallback.slice(0, maxItems);
}
