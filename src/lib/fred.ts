// FRED API Service for Economic Data
export class FredService {
  private apiKey: string;
  private baseUrl = 'https://api.stlouisfed.org/fred';

  constructor() {
    this.apiKey = process.env.FRED_API_KEY!;
  }

  async getEconomicIndicator(seriesId: string, limit = 1) {
    try {
      const response = await fetch(
        `${this.baseUrl}/series/observations?series_id=${seriesId}&api_key=${this.apiKey}&file_type=json&limit=${limit}&sort_order=desc`
      );
      
      if (!response.ok) {
        throw new Error(`FRED API error: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching FRED data:', error);
      throw error;
    }
  }

  async getInflationRate() {
    try {
      // Get 13 months of CPI data to calculate year-over-year inflation
      const cpiData = await this.getEconomicIndicator('CPIAUCSL', 13);
      const observations = cpiData.observations;
      
      if (observations && observations.length >= 2) {
        const currentCPI = parseFloat(observations[0].value);
        const yearAgoCPI = parseFloat(observations[12]?.value || observations[observations.length - 1].value);
        
        // Calculate year-over-year inflation rate
        const inflationRate = ((currentCPI - yearAgoCPI) / yearAgoCPI) * 100;
        
        return {
          value: Math.round(inflationRate * 10) / 10, // Round to 1 decimal
          date: observations[0].date,
          series_id: 'CPIAUCSL',
          calculation: 'year_over_year'
        };
      }
      
      // Fallback if insufficient data
      return {
        value: 3.2,
        date: new Date().toISOString().split('T')[0],
        series_id: 'CPIAUCSL',
        calculation: 'fallback'
      };
      
    } catch (error) {
      console.error('Error calculating inflation rate:', error);
      return {
        value: 3.2,
        date: new Date().toISOString().split('T')[0],
        series_id: 'CPIAUCSL',
        calculation: 'error_fallback'
      };
    }
  }

  async getMultipleIndicators(seriesIds: string[]) {
    try {
      const promises = seriesIds.map(id => this.getEconomicIndicator(id));
      const results = await Promise.all(promises);
      
      return seriesIds.reduce((acc, id, index) => {
        const data = results[index];
        const latestValue = data.observations?.[0];
        
        acc[id] = {
          value: latestValue?.value ? parseFloat(latestValue.value) : null,
          date: latestValue?.date,
          series_id: id
        };
        
        return acc;
      }, {} as Record<string, any>);
    } catch (error) {
      console.error('Error fetching multiple FRED indicators:', error);
      throw error;
    }
  }

  // Key Economic Indicators
  async getEconomicSnapshot() {
    const indicators = {
      GDP_GROWTH: 'A191RL1Q225SBEA',    // Real GDP Growth Rate (Quarterly, Annualized)
      UNEMPLOYMENT: 'UNRATE',           // Unemployment Rate
      FED_RATE: 'FEDFUNDS',            // Federal Funds Rate
      CONSUMER_CONFIDENCE: 'UMCSENT',   // Consumer Sentiment
      HOUSING_STARTS: 'HOUST',          // Housing Starts
      INDUSTRIAL_PRODUCTION: 'INDPRO',  // Industrial Production Index
      RETAIL_SALES: 'RSAFS'            // Retail Sales
    };

    try {
      // Get standard indicators
      const data = await this.getMultipleIndicators(Object.values(indicators));
      
      // Get calculated inflation rate
      const inflationData = await this.getInflationRate();
      
      return {
        gdp: data['A191RL1Q225SBEA'],
        inflation: inflationData,
        unemployment: data['UNRATE'],
        fedRate: data['FEDFUNDS'],
        consumerConfidence: data['UMCSENT'],
        housingStarts: data['HOUST'],
        industrialProduction: data['INDPRO'],
        retailSales: data['RSAFS'],
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting economic snapshot:', error);
      throw error;
    }
  }

  // Calculate Economic Quadrant
  async getEconomicQuadrant() {
    try {
      const snapshot = await this.getEconomicSnapshot();
      
      // Determine growth trend (based on GDP and industrial production)
      const growthScore = this.calculateGrowthScore(snapshot);
      const inflationTrend = this.calculateInflationTrend(snapshot);
      
      const quadrant = this.determineQuadrant(growthScore, snapshot.inflation?.value);
      
      return {
        current: {
          cycle: quadrant.cycle,
          growth: quadrant.growth,
          inflation: quadrant.inflation,
          confidence: quadrant.confidence
        },
        indicators: snapshot,
        analysis: quadrant.analysis
      };
    } catch (error) {
      console.error('Error calculating economic quadrant:', error);
      throw error;
    }
  }

  private calculateGrowthScore(snapshot: any): number {
    // Simple growth scoring based on unemployment and industrial production
    const unemployment = snapshot.unemployment?.value || 5;
    const growthScore = unemployment < 4 ? 75 : unemployment < 6 ? 50 : 25;
    return growthScore;
  }

  private calculateInflationTrend(snapshot: any): 'rising' | 'falling' | 'stable' {
    const inflation = snapshot.inflation?.value || 2;
    if (inflation > 3) return 'rising';
    if (inflation < 2) return 'falling';
    return 'stable';
  }

  private determineQuadrant(growthScore: number, inflation: number) {
    let cycle = 'Expansion';
    let growth = 'Rising';
    let inflationStatus = 'Moderate';
    let confidence = 75;
    let analysis = '';

    if (growthScore > 60 && inflation < 3) {
      cycle = 'Expansion';
      growth = 'Rising';
      inflationStatus = 'Low';
      confidence = 85;
      analysis = 'Economic expansion with controlled inflation - favorable environment';
    } else if (growthScore > 40 && inflation > 3) {
      cycle = 'Recovery';
      growth = 'Moderate';
      inflationStatus = 'Rising';
      confidence = 65;
      analysis = 'Economic recovery phase with inflationary pressures';
    } else if (growthScore < 40 && inflation > 3) {
      cycle = 'Stagflation';
      growth = 'Slowing';
      inflationStatus = 'High';
      confidence = 35;
      analysis = 'Challenging environment with slowing growth and high inflation';
    } else {
      cycle = 'Contraction';
      growth = 'Declining';
      inflationStatus = 'Low';
      confidence = 45;
      analysis = 'Economic contraction with deflationary risks';
    }

    return {
      cycle,
      growth,
      inflation: inflationStatus,
      confidence,
      analysis
    };
  }
}

export const fredService = new FredService();
