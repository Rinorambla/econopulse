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

  let aiResponse: string = '';

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
      // Do not generate synthetic analysis. Return service unavailable.
      return NextResponse.json({ success:false, realtime:false, error:'AI economic analysis unavailable' }, { status: 503 });
    }

    if (!aiResponse) {
      // No AI output -> do not synthesize
      return NextResponse.json({ success:false, realtime:false, error:'No AI response' }, { status: 503 });
    }

    // Parse AI response into structured format
    const analysis = parseAiResponse(aiResponse, economicContext);

    // Return comprehensive analysis
    return NextResponse.json({
      success: true,
      realtime: true,
      data: {
        analysis,
        economicData: economicContext,
        quadrant: quadrantData.current,
        lastUpdated: new Date().toISOString(),
        dataSource: 'FRED + OpenAI',
        aiSource: 'openai',
        fallback: false
      }
    });

  } catch (error) {
    console.error('Error in AI economic analysis:', error);
    // Do not provide synthetic fallback
    return NextResponse.json({ success:false, realtime:false, error:'AI analysis failed' }, { status: 503 });
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
