import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function POST(req: NextRequest) {
  try {
    const { question, userId, context } = await req.json()

    console.log('🎯 EconoAI request received:', { 
      question: question?.substring(0, 100), 
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString()
    })

    if (!question || typeof question !== 'string') {
      console.error('❌ Invalid question format')
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured')
      return NextResponse.json(
        { 
          error: 'AI service not configured', 
          answer: 'EconoAI is currently being configured. Please try again later.' 
        },
        { status: 503 }
      )
    }

    console.log('✅ OpenAI client initialized')
    const openai = getOpenAIClient()

  // System prompt for financial analysis
  const systemPrompt = `You are EconoAI, an expert financial analyst and market strategist at EconoPulse with 20+ years of Wall Street experience. You provide comprehensive market intelligence across ALL asset classes and market topics.

YOUR EXPERTISE COVERS:
📊 Equities: Individual stocks, sectors, indices (S&P 500, Nasdaq, Dow, Russell 2000, international markets)
📈 Market Analysis: Daily market movements, trends, sentiment, technical levels, volume analysis
💰 Asset Classes: Bonds, commodities (gold, oil, copper), currencies (forex), cryptocurrencies
🌍 Global Markets: US, Europe, Asia, emerging markets, cross-market correlations
📰 News & Events: Earnings, Fed meetings, economic data, geopolitical events, policy changes
⚠️ Risk Analysis: Volatility (VIX), drawdowns, correlations, tail risks, sector rotations
💼 Portfolio Strategy: Asset allocation, diversification, hedging, rebalancing
📉 Economic Indicators: GDP, inflation (CPI/PPI), employment, PMI, consumer confidence, housing
🏦 Fed & Monetary Policy: Interest rates, Fed funds, QE/QT, yield curve, FOMC decisions
🔮 Forecasts & Outlook: Short/medium/long term scenarios, bull/bear cases, probability assessments

ANSWER EVERY QUESTION TYPE:
- "What's happening today?" → Analyze current market action (assume S&P, key sectors, VIX, yields)
- "What are the risks?" → Identify current market risks (technical, fundamental, macro, geopolitical)
- "Should I buy X?" → Provide balanced analysis with entry levels, risks, alternatives
- "Compare X vs Y" → Side-by-side comparison with metrics, scenarios, recommendations
- "Outlook for [sector/stock/market]?" → Technical + fundamental + macro analysis with levels
- "Portfolio review" → Assess allocation, risk, diversification, suggest improvements
- Any other market question → Provide expert, data-driven, actionable answer

RESPONSE FORMAT:
✅ Start with direct answer (1-2 sentences summary)
📊 Main analysis (2-3 concise paragraphs with specific data/levels/metrics)
🎯 Actionable takeaway (clear next steps or key levels to watch)
⚠️ Risk disclaimer (1 sentence: educational only, DYOR)

TONE & STYLE:
- Professional yet accessible (like Bloomberg + WSJ combined)
- Use specific numbers, percentages, price levels, dates
- Reference current market context (VIX ~15, 10Y yield ~4.5%, etc)
- Acknowledge uncertainty honestly ("If X happens... if Y happens...")
- Be decisive but balanced (bull case + bear case)
- NO generic fluff - every sentence must add value

CRITICAL: Answer EVERY question asked, even if you need to make reasonable market assumptions based on typical conditions. Never say "I don't have real-time data" - provide framework-based analysis instead.

If the user provided context, you MUST incorporate it precisely. Context can include: recent market summary, macro indicators, key levels, and top headlines. Prioritize accuracy from context.

When helpful, structure the output JSON-like sections:
{
  "summary": "2-line takeaway",
  "market": { "levels": ["S&P 500 ~","VIX ~","10Y ~"], "sectors": ["..."], "flows": ["..."] },
  "macro": { "cycle": "...", "inflation": "...", "labor": "..." },
  "news": [ { "title": "...", "why": "impact" } ],
  "scenarios": [ { "if": "...", "then": "..." } ],
  "risks": ["..."],
  "actions": ["level to watch", "hedge idea", "timing note"]
}
Keep prose crisp and professional.`

    // Choose model: allow override via env, default to gpt-4o (fallback to gpt-4o-mini on 404)
    const primaryModel = process.env.OPENAI_MODEL || 'gpt-4o';
    const fallbackModel = 'gpt-4o-mini';

    let completion;
    try {
      // Primary attempt
      completion = await openai.chat.completions.create({
        model: primaryModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...(context ? [{ role: 'user' as const, content: `Context:\n${JSON.stringify(context).slice(0, 8000)}` }] : []),
          { role: 'user', content: question }
        ],
        temperature: 0.8, // Slightly higher for more nuanced financial analysis
        max_tokens: 1000, // More space for comprehensive answers
        presence_penalty: 0.1, // Encourage varied responses
        frequency_penalty: 0.1, // Reduce repetition
      })
    } catch (err: any) {
      // Retry on model not found / no access
      const isModelNotFound = err?.status === 404 || err?.code === 'model_not_found' || /model .* does not exist/i.test(err?.message||'');
      if (!isModelNotFound) throw err;
      console.warn(`Model ${primaryModel} unavailable, retrying with ${fallbackModel}...`);
      completion = await openai.chat.completions.create({
        model: fallbackModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...(context ? [{ role: 'user' as const, content: `Context:\n${JSON.stringify(context).slice(0, 8000)}` }] : []),
          { role: 'user', content: question }
        ],
        temperature: 0.8,
        max_tokens: 1000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });
    }

    const answer = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    // Log successful response for monitoring
    console.log('✅ EconoAI response generated:', {
      userId: userId || 'anonymous',
      questionLength: question.length,
      answerLength: answer.length,
      model: completion.model,
      tokensUsed: completion.usage?.total_tokens || 0,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      answer,
      question,
      usedContext: Boolean(context),
      timestamp: new Date().toISOString(),
      model: completion.model,
      usage: completion.usage
    })

  } catch (error: any) {
    console.error('❌ EconoAI API error:', {
      message: error?.message,
      status: error?.status,
      type: error?.type,
      code: error?.code,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n')
    })

    // Handle specific OpenAI errors
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      )
    }

    if (error?.status === 401 || error?.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'API authentication failed. Please contact support.' },
        { status: 500 }
      )
    }

    if (error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { error: 'Network error. Please check your connection and try again.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to process your question. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}
