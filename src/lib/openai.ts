import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PortfolioRequest {
  riskTolerance: 'conservative' | 'balanced' | 'aggressive' | 'smart_pick';
  timeHorizon: string;
  marketData: any;
  economicIndicators: any;
}

export interface Portfolio {
  name: string;
  type: string;
  allocation: {
    asset: string;
    symbol: string;
    percentage: number;
    sector?: string;
  }[];
  expectedReturn: number;
  riskScore: number;
  reasoning: string;
}

export class AIPortfolioService {
  async generatePortfolio(request: PortfolioRequest): Promise<Portfolio> {
    try {
      const prompt = `
        Generate a financial portfolio based on the following parameters:
        - Risk Tolerance: ${request.riskTolerance}
        - Time Horizon: ${request.timeHorizon}
        - Current Market Data: ${JSON.stringify(request.marketData)}
        - Economic Indicators: ${JSON.stringify(request.economicIndicators)}

        Please provide a portfolio with:
        1. Asset allocation percentages
        2. Specific ETF/stock symbols
        3. Expected return estimate
        4. Risk score (1-10)
        5. Reasoning for the allocation

        Respond in JSON format matching this structure:
        {
          "name": "Portfolio Name",
          "type": "${request.riskTolerance}",
          "allocation": [
            {
              "asset": "Asset Name",
              "symbol": "SYMBOL",
              "percentage": 30,
              "sector": "Technology"
            }
          ],
          "expectedReturn": 8.5,
          "riskScore": 6,
          "reasoning": "Explanation of the portfolio strategy"
        }
      `;

      const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4',
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;
      if (!response) throw new Error('No response from OpenAI');

      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating portfolio:', error);
      throw error;
    }
  }

  async analyzeEconomicCycle(marketData: any): Promise<{
    currentCycle: string;
    projectedCycle: string;
    confidence: number;
    explanation: string;
  }> {
    try {
      const prompt = `
        Analyze the current economic cycle based on the following market data:
        ${JSON.stringify(marketData)}

        Determine:
        1. Current economic cycle (Reflation, Expansion, Stagflation, Deflation)
        2. Projected cycle for next 3 months
        3. Confidence level (0-100%)
        4. Brief explanation

        Respond in JSON format:
        {
          "currentCycle": "Expansion",
          "projectedCycle": "Expansion",
          "confidence": 85,
          "explanation": "Analysis explanation"
        }
      `;

      const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4',
        temperature: 0.3,
      });

      const response = completion.choices[0].message.content;
      if (!response) throw new Error('No response from OpenAI');

      return JSON.parse(response);
    } catch (error) {
      console.error('Error analyzing economic cycle:', error);
      throw error;
    }
  }
}

export const aiPortfolioService = new AIPortfolioService();
