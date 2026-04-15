import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

// Ensure Node.js runtime for OpenAI SDK
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const preferredRegion = 'auto'
export const maxDuration = 55

// Initialize AI client — supports OpenAI and Groq (free)
function getAIClient(): { client: OpenAI; model: string; fallbackModel: string; provider: string } {
  // Priority: OpenAI → Groq (free)
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      fallbackModel: 'gpt-4o-mini',
      provider: 'openai',
    }
  }
  if (process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' }),
      model: 'llama-3.3-70b-versatile',
      fallbackModel: 'llama-3.1-8b-instant',
      provider: 'groq',
    }
  }
  throw new Error('No AI provider configured (set OPENAI_API_KEY or GROQ_API_KEY)')
}

// Helper to timeout a promise
const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('openai_timeout')), ms)
    p.then((v) => { clearTimeout(id); resolve(v) }).catch((e) => { clearTimeout(id); reject(e) })
  })
}

export async function POST(req: NextRequest) {
  let parsedQuestion = ''
  try {
    const { question, userId, context } = await req.json()
    parsedQuestion = question || ''
    const usedContextFlag = Boolean(context)

    console.log('🎯 EconoAI request received:', { 
      question: question?.substring(0, 100), 
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString()
    })

    // Basic rate limiting per IP (generous for testing/demo)
    const ip = getClientIp(req as unknown as Request)
    const rl = rateLimit(`econoai:${ip}`, 100, 60_000) // 100 req/min per IP
    if (!rl.ok) {
      const res = NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
      const headers = rateLimitHeaders(rl)
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    if (!question || typeof question !== 'string') {
      console.error('❌ Invalid question format')
      const res = NextResponse.json({ error: 'Question is required' }, { status: 400 })
      const headers = rateLimitHeaders(rl)
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    // Utility: build a successful fallback response (always 200 so UI keeps working)
    const fallbackResponse = (reason: string) => {
      const res = NextResponse.json({
        answer:
          'Here’s a quick, framework-based analysis while the live AI is initializing: \n\n' +
          '- Summary: Based on typical market conditions, consider focusing on trend strength, earnings momentum, and key support/resistance levels.\n' +
          '- What to watch: S&P 500, VIX, 10Y yield, USD, sector rotation (Tech vs. Energy/Financials).\n' +
          '- Next steps: Define time horizon, set risk limits, and identify 2–3 catalysts that could change the thesis.\n\n' +
          '(AI live answer will be enabled shortly.)',
        question,
        usedContext: usedContextFlag,
        fallback: true,
        reason,
        timestamp: new Date().toISOString(),
      })
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    // If no AI provider is configured, return graceful fallback
    if (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) {
      console.error('❌ No AI provider configured (need OPENAI_API_KEY or GROQ_API_KEY)')
      const res = fallbackResponse('openai_not_configured')
      const headers = rateLimitHeaders(rl)
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    const { client: aiClient, model: primaryModel, fallbackModel, provider } = getAIClient()
    console.log(`✅ AI client initialized (${provider}: ${primaryModel})`)

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

    let completion: any
    const TIMEOUT_MS = 45000
    try {
      // Primary attempt
      completion = await withTimeout(
        aiClient.chat.completions.create({
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
      }),
        TIMEOUT_MS
      )
    } catch (err: any) {
      // Retry on model not found / no access
      const isModelNotFound = err?.status === 404 || err?.code === 'model_not_found' || /model .* does not exist/i.test(err?.message||'');
      // If timed out, return fallback
      if (err?.message === 'openai_timeout') {
        console.warn(`⏳ OpenAI request timed out after ${TIMEOUT_MS}ms, returning fallback`)
        const res = fallbackResponse('openai_timeout')
        const headers = rateLimitHeaders(rl)
        Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
        return res
      }
      if (!isModelNotFound) throw err;
      console.warn(`Model ${primaryModel} unavailable, retrying with ${fallbackModel}...`);
      completion = await withTimeout(
        aiClient.chat.completions.create({
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
      }),
        TIMEOUT_MS
      );
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

    const res = NextResponse.json({
      answer,
      question,
      usedContext: usedContextFlag,
      timestamp: new Date().toISOString(),
      model: completion.model,
      usage: completion.usage
    })
  const headers = rateLimitHeaders(rl)
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
    res.headers.set('Cache-Control', 'no-store')
    return res

  } catch (error: any) {
    console.error('❌ EconoAI API error:', {
      message: error?.message,
      status: error?.status,
      type: error?.type,
      code: error?.code,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n')
    })

    // Handle specific OpenAI errors with retry logic
    if (error?.status === 429) {
      // Rate limited – wait briefly, then retry up to 2x with fallback model
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
      let retryClient: OpenAI;
      let retryModel: string;
      try {
        const ai = getAIClient();
        retryClient = ai.client;
        retryModel = ai.fallbackModel;
      } catch { 
        // No provider available at all
        return NextResponse.json({
          answer: 'High demand right now. Quick actionable view: clarify your time horizon, define key levels, and manage size while activity normalizes. Try again shortly for a full AI response.',
          question: 'rate_limited', usedContext: false, fallback: true, reason: 'rate_limited', timestamp: new Date().toISOString(),
        }, { status: 200 })
      }
      for (let attempt = 1; attempt <= 2; attempt++) {
        const waitMs = attempt * 2000; // 2s, 4s
        console.warn(`429 rate limit, waiting ${waitMs}ms then retry #${attempt} with ${retryModel}...`)
        await delay(waitMs);
        try {
          const retryCompletion = await withTimeout(
            retryClient.chat.completions.create({
              model: retryModel,
              messages: [
                { role: 'system', content: 'You are EconoAI, an expert financial analyst. Answer concisely with specific data, levels, and actionable takeaways. Always answer the question directly.' },
                { role: 'user', content: parsedQuestion || 'market overview' }
              ],
              temperature: 0.7,
              max_tokens: 800,
            }),
            15000
          )
          const retryAnswer = retryCompletion.choices[0]?.message?.content
          if (retryAnswer) {
            return NextResponse.json({
              answer: retryAnswer,
              question: parsedQuestion,
              usedContext: false,
              timestamp: new Date().toISOString(),
              model: retryModel,
            }, { status: 200 })
          }
        } catch (retryErr: any) {
          console.warn(`Retry #${attempt} failed:`, retryErr?.message || retryErr)
        }
      }
      return NextResponse.json({
        answer: 'High demand right now. Quick actionable view: clarify your time horizon, define key levels, and manage size while activity normalizes. Try again shortly for a full AI response.',
        question: 'rate_limited',
        usedContext: false,
        fallback: true,
        reason: 'rate_limited',
        timestamp: new Date().toISOString(),
      }, { status: 200 })
    }

    if (error?.status === 401 || error?.message?.includes('API key')) {
      return NextResponse.json({
        answer: 'Authentication issue with AI provider. Meanwhile, here’s a structured framework: summarize current trend, watch support/resistance, and align with macro (rates, USD).',
        question: 'auth_issue',
        usedContext: false,
        fallback: true,
        reason: 'auth_error',
        timestamp: new Date().toISOString(),
      }, { status: 200 })
    }

    if (error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT' || error?.message === 'openai_timeout') {
      return NextResponse.json({
        answer:
          'Quick market framework while network is unstable: focus on trend, breadth, and macro levels (10Y yield, USD). Consider staged entries and clear risk limits until connectivity stabilizes.',
        question: 'network_recovery',
        usedContext: false,
        fallback: true,
        reason: 'network_error',
        timestamp: new Date().toISOString(),
      }, { status: 200 })
    }

    // Unknown error: still provide a soft fallback so UX doesn't break
    return NextResponse.json({
      answer: 'Temporary issue processing your request. Here is a quick guidance: define your time horizon, identify catalysts, and watch key support/resistance. Try again shortly for a full AI answer',
      question: 'unknown_error',
      usedContext: false,
      fallback: true,
      reason: 'unknown_error',
      timestamp: new Date().toISOString(),
    }, { status: 200 })
  }
}
