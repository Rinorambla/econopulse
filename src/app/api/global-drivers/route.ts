import { NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getTiingoMarketData } from '@/lib/tiingo';

/**
 * Global Economic Drivers API - comprehensive country analysis
 * Combines: economic indicators, market performance, cycle analysis, investment thesis
 */

type EconomicCycle = 'Expansion' | 'Slowdown' | 'Contraction' | 'Recovery' | 'Overheating' | 'Stagflation' | 'Neutral';
type RiskLevel = 'Low' | 'Moderate' | 'Elevated' | 'High';
type InvestmentStance = 'Bullish' | 'Cautious Bullish' | 'Neutral' | 'Cautious' | 'Defensive';

interface CountryDriver {
  id: string;
  name: string;
  flag: string;
  ticker: string;
  // Market performance
  price: number | null;
  changePercent: number; // daily
  mtdReturn: number | null;
  ytdReturn: number | null;
  // Economic indicators
  gdpGrowth: number | null;
  inflation: number | null;
  unemployment: number | null;
  policyRate: number | null;
  // Cycle analysis
  cycle: EconomicCycle;
  cycleScore: number; // 0-100
  riskLevel: RiskLevel;
  outlook3M: string;
  // Investment thesis
  investmentStance: InvestmentStance;
  thesis: string;
  keyDrivers: string[];
  risks: string[];
  // Metadata
  lastUpdated: string;
}

const COUNTRY_MAP: Array<{ code: string; name: string; flag: string; ticker: string; wbCode: string }> = [
  { code: 'USA', name: 'United States', flag: '🇺🇸', ticker: 'SPY', wbCode: 'US' },
  { code: 'CAN', name: 'Canada', flag: '🇨🇦', ticker: 'EWC', wbCode: 'CA' },
  { code: 'GBR', name: 'United Kingdom', flag: '🇬🇧', ticker: 'EWU', wbCode: 'GB' },
  { code: 'DEU', name: 'Germany', flag: '🇩🇪', ticker: 'EWG', wbCode: 'DE' },
  { code: 'FRA', name: 'France', flag: '🇫🇷', ticker: 'EWQ', wbCode: 'FR' },
  { code: 'ITA', name: 'Italy', flag: '🇮🇹', ticker: 'EWI', wbCode: 'IT' },
  { code: 'JPN', name: 'Japan', flag: '🇯🇵', ticker: 'EWJ', wbCode: 'JP' },
  { code: 'AUS', name: 'Australia', flag: '🇦🇺', ticker: 'EWA', wbCode: 'AU' },
  { code: 'CHN', name: 'China', flag: '🇨🇳', ticker: 'MCHI', wbCode: 'CN' },
  { code: 'IND', name: 'India', flag: '🇮🇳', ticker: 'INDA', wbCode: 'IN' },
];

// Simple in-memory cache
let cache: { timestamp: number; data: CountryDriver[] } | null = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function fetchWorldBankIndicator(countryCode: string, indicator: string): Promise<{ value: number; date: string } | null> {
  try {
    const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicator}?format=json&per_page=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json: any = await res.json();
    const rows = Array.isArray(json) ? json[1] : [];
    if (!rows) return null;
    const valid = rows.find((r: any) => r && r.value !== null);
    if (!valid) return null;
    return { value: Number(valid.value), date: valid.date };
  } catch {
    return null;
  }
}

async function fetchFredRate(series: string): Promise<number | null> {
  const key = process.env.FRED_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${key}&file_type=json&limit=1&sort_order=desc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const j: any = await res.json();
    const last = j.observations?.[0];
    if (!last || last.value === '.') return null;
    return Number(last.value);
  } catch {
    return null;
  }
}

function determineCycle(gdp: number | null, inflation: number | null, unemployment: number | null): EconomicCycle {
  if (!gdp || !inflation || !unemployment) return 'Neutral';
  
  // Cycle classification logic
  if (gdp > 3 && inflation > 3) return 'Overheating';
  if (gdp > 2.5 && inflation < 3 && unemployment < 5) return 'Expansion';
  if (gdp < 0 && unemployment > 6) return 'Contraction';
  if (gdp < 1 && inflation > 4) return 'Stagflation';
  if (gdp > 0 && gdp < 2 && unemployment > 5) return 'Recovery';
  if (gdp > 0 && gdp < 2) return 'Slowdown';
  
  return 'Neutral';
}

function calculateCycleScore(cycle: EconomicCycle, gdp: number | null, inflation: number | null): number {
  const base = {
    Expansion: 75,
    Overheating: 60,
    Slowdown: 45,
    Recovery: 55,
    Contraction: 25,
    Stagflation: 30,
    Neutral: 50,
  }[cycle];
  
  let score = base;
  if (gdp) score += Math.min(Math.max(gdp * 5, -15), 15);
  if (inflation) score -= Math.min(Math.max((inflation - 2) * 3, -10), 10);
  
  return Math.round(Math.max(0, Math.min(100, score)));
}

function assessRisk(cycle: EconomicCycle, inflation: number | null, unemployment: number | null): RiskLevel {
  if (cycle === 'Contraction' || cycle === 'Stagflation') return 'High';
  if (cycle === 'Overheating' || (inflation && inflation > 4)) return 'Elevated';
  if (cycle === 'Slowdown' || (unemployment && unemployment > 6)) return 'Moderate';
  return 'Low';
}

function generate3MOutlook(cycle: EconomicCycle, gdp: number | null, inflation: number | null): string {
  switch (cycle) {
    case 'Expansion':
      return 'Continued growth expected. Monitor for overheating signs.';
    case 'Overheating':
      return 'Peak growth likely near. Policy tightening risk elevated.';
    case 'Slowdown':
      return 'Decelerating momentum. Defensive positioning warranted.';
    case 'Contraction':
      return 'Recessionary pressures persist. Await stabilization signals.';
    case 'Recovery':
      return 'Emerging from trough. Early-cycle assets may outperform.';
    case 'Stagflation':
      return 'High inflation + weak growth. Limited policy options.';
    default:
      return 'Range-bound. Awaiting clearer directional catalysts.';
  }
}

function determineInvestmentStance(cycle: EconomicCycle, riskLevel: RiskLevel, ytd: number | null): InvestmentStance {
  if (cycle === 'Expansion' && riskLevel === 'Low') return 'Bullish';
  if (cycle === 'Expansion' || cycle === 'Recovery') return 'Cautious Bullish';
  if (cycle === 'Contraction' || cycle === 'Stagflation') return 'Defensive';
  if (riskLevel === 'High' || riskLevel === 'Elevated') return 'Cautious';
  if (ytd && ytd > 15) return 'Cautious Bullish';
  if (ytd && ytd < -10) return 'Defensive';
  return 'Neutral';
}

function generateThesis(
  name: string,
  cycle: EconomicCycle,
  stance: InvestmentStance,
  gdp: number | null,
  inflation: number | null,
  ytd: number | null
): string {
  const perfContext = ytd ? (ytd > 10 ? 'strong YTD momentum' : ytd < -5 ? 'weak YTD performance' : 'moderate YTD returns') : 'mixed performance';
  const growthContext = gdp ? (gdp > 2.5 ? 'robust growth' : gdp > 0 ? 'modest growth' : 'contraction') : 'uncertain growth';
  const inflationContext = inflation ? (inflation > 3 ? 'elevated inflation pressures' : 'contained inflation') : 'stable prices';
  
  switch (stance) {
    case 'Bullish':
      return `${name} exhibits ${growthContext} in an ${cycle} phase with ${inflationContext}. ${perfContext} suggests continued strength. Favor cyclical exposure.`;
    case 'Cautious Bullish':
      return `${name} shows ${growthContext} during ${cycle}, but ${inflationContext} warrants selectivity. ${perfContext} intact. Prefer quality over momentum.`;
    case 'Neutral':
      return `${name} in ${cycle} with ${growthContext} and ${inflationContext}. ${perfContext} reflects mixed signals. Balanced allocation recommended.`;
    case 'Cautious':
      return `${name} facing ${cycle} headwinds. ${growthContext} amid ${inflationContext}. ${perfContext} signals caution. Reduce beta, emphasize quality.`;
    case 'Defensive':
      return `${name} experiencing ${cycle} stress. ${growthContext} combined with ${inflationContext}. ${perfContext} confirms weakness. Prioritize capital preservation.`;
  }
}

function identifyKeyDrivers(cycle: EconomicCycle, inflation: number | null, gdp: number | null): string[] {
  const drivers: string[] = [];
  
  if (cycle === 'Expansion') drivers.push('Economic momentum', 'Corporate earnings growth');
  if (cycle === 'Overheating') drivers.push('Peak cycle dynamics', 'Central bank policy');
  if (cycle === 'Slowdown') drivers.push('Decelerating growth', 'Rate cut expectations');
  if (cycle === 'Contraction') drivers.push('Recessionary pressures', 'Fiscal stimulus hopes');
  if (cycle === 'Recovery') drivers.push('Bottoming process', 'Early-cycle rebound');
  if (cycle === 'Stagflation') drivers.push('Inflation persistence', 'Weak demand');
  
  if (inflation && inflation > 3) drivers.push('Inflation concerns');
  if (gdp && gdp < 1) drivers.push('Growth slowdown');
  if (gdp && gdp > 3) drivers.push('Strong GDP momentum');
  
  return drivers.slice(0, 3);
}

function identifyRisks(cycle: EconomicCycle, riskLevel: RiskLevel, inflation: number | null): string[] {
  const risks: string[] = [];
  
  if (riskLevel === 'High' || riskLevel === 'Elevated') {
    risks.push('Policy error risk');
  }
  if (cycle === 'Overheating') {
    risks.push('Overheating → hard landing');
  }
  if (cycle === 'Contraction') {
    risks.push('Prolonged recession');
  }
  if (inflation && inflation > 4) {
    risks.push('Persistent inflation');
  }
  if (cycle === 'Stagflation') {
    risks.push('Limited policy tools');
  }
  
  // Add generic risks if list is short
  if (risks.length < 2) {
    risks.push('Geopolitical shocks', 'Market repricing');
  }
  
  return risks.slice(0, 3);
}

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`global-drivers:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Rate limit' }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  // Check cache
  const url = new URL(req.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';
  
  if (!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json({
      success: true,
      regions: cache.data,
      updatedAt: new Date(cache.timestamp).toISOString(),
      cached: true,
    }, { headers: rateLimitHeaders(rl) });
  }

  try {
    // Fetch market data for all ETFs
    const tickers = COUNTRY_MAP.map(c => c.ticker);
    const quotes = await getTiingoMarketData(tickers);
    const quoteMap: Record<string, any> = {};
    for (const q of quotes) {
      const data = 'data' in q ? (q as any).data : q;
      quoteMap[q.symbol] = data;
    }

    // Build country drivers with parallel economic data fetches
    const now = new Date().toISOString();
    const drivers = await Promise.all(
      COUNTRY_MAP.map(async (country) => {
        const quote = quoteMap[country.ticker] || {};
        const price = quote.price ?? quote.last ?? quote.close ?? null;
        const changePercent = quote.changePercent ?? 0;
        
        // Fetch economic indicators (World Bank)
        const [gdpData, inflationData, unemploymentData] = await Promise.all([
          fetchWorldBankIndicator(country.wbCode, 'NY.GDP.MKTP.KD.ZG'), // GDP growth
          fetchWorldBankIndicator(country.wbCode, 'FP.CPI.TOTL.ZG'),    // Inflation
          fetchWorldBankIndicator(country.wbCode, 'SL.UEM.TOTL.ZS'),    // Unemployment
        ]);

        const gdpGrowth = gdpData?.value ?? null;
        const inflation = inflationData?.value ?? null;
        const unemployment = unemploymentData?.value ?? null;

        // Policy rate (US only via FRED, others use fallback)
        let policyRate: number | null = null;
        if (country.wbCode === 'US') {
          policyRate = await fetchFredRate('FEDFUNDS');
        } else {
          // Fallback static rates (approximate Dec 2024)
          const fallbackRates: Record<string, number> = {
            CA: 3.25, GB: 4.75, DE: 3.65, FR: 3.65, IT: 3.65,
            JP: 0.25, AU: 4.35, CN: 3.45, IN: 6.50,
          };
          policyRate = fallbackRates[country.wbCode] ?? null;
        }

        // Calculate MTD/YTD (simplified - would need historical data for accuracy)
        // For now, use daily change as proxy
        const mtdReturn = changePercent; // Placeholder
        const ytdReturn = changePercent * 30; // Rough estimate

        // Cycle analysis
        const cycle = determineCycle(gdpGrowth, inflation, unemployment);
        const cycleScore = calculateCycleScore(cycle, gdpGrowth, inflation);
        const riskLevel = assessRisk(cycle, inflation, unemployment);
        const outlook3M = generate3MOutlook(cycle, gdpGrowth, inflation);

        // Investment thesis
        const investmentStance = determineInvestmentStance(cycle, riskLevel, ytdReturn);
        const thesis = generateThesis(country.name, cycle, investmentStance, gdpGrowth, inflation, ytdReturn);
        const keyDrivers = identifyKeyDrivers(cycle, inflation, gdpGrowth);
        const risks = identifyRisks(cycle, riskLevel, inflation);

        return {
          id: country.code,
          name: country.name,
          flag: country.flag,
          ticker: country.ticker,
          price,
          changePercent: Math.round(changePercent * 100) / 100,
          mtdReturn: mtdReturn ? Math.round(mtdReturn * 100) / 100 : null,
          ytdReturn: ytdReturn ? Math.round(ytdReturn * 100) / 100 : null,
          gdpGrowth: gdpGrowth ? Math.round(gdpGrowth * 100) / 100 : null,
          inflation: inflation ? Math.round(inflation * 100) / 100 : null,
          unemployment: unemployment ? Math.round(unemployment * 100) / 100 : null,
          policyRate: policyRate ? Math.round(policyRate * 100) / 100 : null,
          cycle,
          cycleScore,
          riskLevel,
          outlook3M,
          investmentStance,
          thesis,
          keyDrivers,
          risks,
          lastUpdated: now,
        } as CountryDriver;
      })
    );

    // Cache results
    cache = { timestamp: Date.now(), data: drivers };

    return NextResponse.json({
      success: true,
      regions: drivers,
      updatedAt: now,
      cached: false,
    }, { headers: rateLimitHeaders(rl) });

  } catch (error) {
    console.error('[global-drivers]', error);
    
    // Return cached data if available
    if (cache) {
      return NextResponse.json({
        success: true,
        regions: cache.data,
        updatedAt: new Date(cache.timestamp).toISOString(),
        cached: true,
        error: 'Using cached data due to fetch error',
      }, { headers: rateLimitHeaders(rl) });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch global drivers',
      regions: [],
    }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
