import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { fredService } from '@/lib/fred';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';

// Initialize OpenAI client only when needed to avoid build-time errors
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

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
    // If OpenAI is not configured, fall through to the rule-based analyzer
    // which uses live FRED data — no "contact administrator" message.
    if (!process.env.OPENAI_API_KEY) {
      const economicData = await fredService.getEconomicSnapshot();
      const quadrantData = await fredService.getEconomicQuadrant();
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
        cycleAnalysis: quadrantData.analysis,
      };
      const analysis = buildRuleBasedAnalysis(economicContext);
      const res = NextResponse.json({
        success: true,
        realtime: true,
        data: {
          analysis,
          economicData: economicContext,
          quadrant: quadrantData.current,
          lastUpdated: new Date().toISOString(),
          dataSource: 'FRED + Rule-Based',
          aiSource: 'rule-engine',
          fallback: false,
        },
      });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

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
      const openai = getOpenAIClient();
      const TIMEOUT_MS = 12_000;
      const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => new Promise<T>((resolve, reject) => {
        const id = setTimeout(() => reject(new Error('openai_timeout')), ms);
        p.then(v => { clearTimeout(id); resolve(v); }).catch(e => { clearTimeout(id); reject(e); });
      });
      const completion = await withTimeout(openai.chat.completions.create({
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
      }), TIMEOUT_MS);

      aiResponse = completion.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('OpenAI API error:', error?.status, error?.code, error?.message);
      // Any OpenAI failure (timeout, quota, network) → fall back to the rule-based engine.
      const analysis = buildRuleBasedAnalysis(economicContext);
      const res = NextResponse.json({
        success: true,
        realtime: true,
        data: {
          analysis,
          economicData: economicContext,
          quadrant: quadrantData.current,
          lastUpdated: new Date().toISOString(),
          dataSource: 'FRED + Rule-Based',
          aiSource: 'rule-engine',
          fallback: false,
        },
      });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    if (!aiResponse) {
      const analysis = buildRuleBasedAnalysis(economicContext);
      const res = NextResponse.json({
        success: true,
        realtime: true,
        data: {
          analysis,
          economicData: economicContext,
          quadrant: quadrantData.current,
          lastUpdated: new Date().toISOString(),
          dataSource: 'FRED + Rule-Based',
          aiSource: 'rule-engine',
          fallback: false,
        },
      });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // Parse AI response into structured format
    const analysis = parseAiResponse(aiResponse, economicContext);

    // Return comprehensive analysis
    const res = NextResponse.json({
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
    res.headers.set('Cache-Control', 'no-store');
    return res;

  } catch (error) {
    console.error('Error in AI economic analysis:', error);
    // Soft fallback path when upstreams fail unexpectedly
    const res = NextResponse.json({ success:false, realtime:false, error:'AI analysis failed' }, { status: 503 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
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

// ─── Rule-based macro analyzer ──────────────────────────────────────────────
// Deterministic scoring over live FRED indicators so AI Quick Take always has
// a substantive answer, even without an OpenAI key.
function num(v: any): number | null {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isFinite(n) ? n : null;
}

function buildRuleBasedAnalysis(ctx: any): EconomicAnalysis {
  const inflation = num(ctx.inflation);          // CPI YoY %
  const unemployment = num(ctx.unemployment);    // %
  const fedRate = num(ctx.fedRate);              // %
  const confidence = num(ctx.consumerConfidence);
  const housing = num(ctx.housingStarts);
  const indProd = num(ctx.industrialProduction);
  const retail = num(ctx.retailSales);
  const cycle = String(ctx.currentCycle || 'Mixed');

  // Score: positive = bullish, negative = bearish
  let score = 0;
  const factors: string[] = [];
  const risks: string[] = [];
  const opps: string[] = [];

  if (inflation != null) {
    if (inflation > 4) { score -= 2; risks.push(`Inflation elevated at ${inflation.toFixed(1)}% — pressure on real incomes`); }
    else if (inflation > 3) { score -= 1; risks.push(`Inflation above Fed target (${inflation.toFixed(1)}%)`); }
    else if (inflation < 2) { score += 1; factors.push(`Inflation cooling (${inflation.toFixed(1)}%) supports easing path`); }
    else { factors.push(`Inflation near target (${inflation.toFixed(1)}%)`); }
  }
  if (unemployment != null) {
    if (unemployment < 4) { score += 2; factors.push(`Tight labor market (unemployment ${unemployment.toFixed(1)}%)`); }
    else if (unemployment < 5) { score += 1; factors.push(`Healthy employment (unemployment ${unemployment.toFixed(1)}%)`); }
    else if (unemployment > 5.5) { score -= 2; risks.push(`Unemployment rising to ${unemployment.toFixed(1)}% — recession signal`); }
  }
  if (fedRate != null && inflation != null) {
    const realRate = fedRate - inflation;
    if (realRate > 2) { score -= 1; risks.push(`Restrictive policy (real rate ~${realRate.toFixed(1)}%) — growth headwind`); opps.push('Fixed income duration — peak rates favor bonds'); }
    else if (realRate < 0) { score += 1; factors.push(`Accommodative real rates (${realRate.toFixed(1)}%) — supportive for risk assets`); }
  }
  if (confidence != null) {
    if (confidence > 100) { score += 1; factors.push(`Consumer confidence strong (${confidence.toFixed(0)})`); }
    else if (confidence < 90) { score -= 1; risks.push(`Consumer confidence weak (${confidence.toFixed(0)})`); }
  }
  if (housing != null && housing < 1300) { score -= 1; risks.push('Housing starts slowing — rate-sensitive sector under stress'); }
  if (indProd != null && indProd < 0) { score -= 1; risks.push('Industrial production contracting'); }
  if (retail != null && retail > 0.3) { score += 1; factors.push('Retail sales resilient — consumer spending intact'); }

  // Cycle hints
  const cycleLower = cycle.toLowerCase();
  if (cycleLower.includes('expansion')) { score += 1; opps.push('Cyclicals and small caps benefit from expansion'); }
  else if (cycleLower.includes('contraction') || cycleLower.includes('recession')) { score -= 2; opps.push('Defensives, utilities, staples typically outperform'); }
  else if (cycleLower.includes('recovery')) { score += 1; opps.push('Early-cycle plays — financials and industrials'); }
  else if (cycleLower.includes('slowdown')) { score -= 1; opps.push('Quality factor and long-duration bonds'); }

  // Direction
  let direction: EconomicAnalysis['direction'];
  if (score >= 3) direction = 'bullish';
  else if (score <= -3) direction = 'bearish';
  else if (Math.abs(score) <= 1) direction = 'neutral';
  else direction = 'mixed';

  // Confidence proportional to magnitude of evidence
  const conf = Math.min(95, 55 + Math.abs(score) * 7);

  // Pad lists to 3 items
  const padFactors = ['Federal Reserve policy stance', 'Labor market dynamics', 'Consumer spending trends'];
  const padRisks = ['Geopolitical tensions', 'Policy uncertainty', 'Market volatility'];
  const padOpps = ['Quality factor exposure', 'Selective sector rotation', 'Diversified income strategies'];
  while (factors.length < 3) factors.push(padFactors[factors.length] || padFactors[0]);
  while (risks.length < 3) risks.push(padRisks[risks.length] || padRisks[0]);
  while (opps.length < 3) opps.push(padOpps[opps.length] || padOpps[0]);

  // Summary
  const dirText = direction === 'bullish' ? 'tilts constructive' :
                  direction === 'bearish' ? 'leans defensive' :
                  direction === 'mixed' ? 'shows mixed signals' : 'is balanced';
  const summary = `Macro backdrop ${dirText}. Cycle: ${cycle}.` +
    (inflation != null ? ` CPI ${inflation.toFixed(1)}%` : '') +
    (unemployment != null ? `, U-rate ${unemployment.toFixed(1)}%` : '') +
    (fedRate != null ? `, Fed funds ${fedRate.toFixed(2)}%.` : '.');

  // Recommendation
  let recommendation: string;
  if (direction === 'bullish') recommendation = 'Lean into risk: cyclicals, small caps, and credit spreads. Trim defensive overweights.';
  else if (direction === 'bearish') recommendation = 'Reduce risk: rotate to quality, staples, and Treasuries. Hold elevated cash buffer.';
  else if (direction === 'mixed') recommendation = 'Barbell positioning: pair quality growth with defensives until macro clarifies.';
  else recommendation = 'Maintain balanced allocation; let earnings and Fed guidance dictate next move.';

  return {
    currentCycle: cycle,
    direction,
    confidence: conf,
    timeframe: '3-6 months',
    keyFactors: factors.slice(0, 3),
    risks: risks.slice(0, 3),
    opportunities: opps.slice(0, 3),
    summary,
    recommendation,
  };
}
