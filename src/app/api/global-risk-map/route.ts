export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { fetchYahooChartQuotes } from '@/lib/yahoo-chart-quotes';

/**
 * GLOBAL RISK MAP — one API for the Visual AI world map.
 *
 * Layers:
 *   - conflicts:    active wars / armed conflicts (curated geopolitical dataset,
 *                   reviewed periodically) with intensity + market impact notes
 *   - hotspots:     geopolitical flashpoints to watch (not open war)
 *   - chokepoints:  naval / shipping chokepoints with share of world trade and
 *                   current status
 *   - centralBanks: major central banks with policy rate & stance
 *                   (Fed/ECB fetched LIVE from FRED when a key is configured)
 *   - riskGauge:    0-100 global risk score computed LIVE from market stress
 *                   signals (VIX level, gold & oil 1-month momentum, defense
 *                   sector momentum, USD haven bid)
 */

interface ConflictZone {
  id: string; name: string; lat: number; lon: number;
  intensity: 1 | 2 | 3 | 4 | 5; // 5 = major war
  type: 'war' | 'civil-war' | 'insurgency' | 'maritime-attacks' | 'crisis';
  parties: string; since: string; note: string; marketImpact: string;
}

interface Hotspot {
  id: string; name: string; lat: number; lon: number;
  riskLevel: 'elevated' | 'high' | 'severe';
  note: string; watchFor: string;
}

interface Chokepoint {
  id: string; name: string; lat: number; lon: number;
  tradeShare: string; oilShare?: string;
  status: 'normal' | 'elevated' | 'disrupted';
  note: string;
}

interface CentralBank {
  id: string; name: string; country: string; lat: number; lon: number;
  rate: number | null; rateName: string;
  stance: 'easing' | 'on-hold' | 'tightening';
  note: string; live: boolean;
}

// ── Curated geopolitical dataset (reviewed periodically) ─────────────────────
const CONFLICTS: ConflictZone[] = [
  { id: 'ukr', name: 'Russia–Ukraine War', lat: 49.0, lon: 32.0, intensity: 5, type: 'war', parties: 'Russia vs Ukraine (NATO-backed)', since: '2022', note: 'Largest land war in Europe since WWII; long-range strikes on energy and port infrastructure continue.', marketImpact: 'Grains, natural gas, European defense stocks, EUR risk premium' },
  { id: 'mena', name: 'Israel–Gaza / Regional Tensions', lat: 31.4, lon: 34.4, intensity: 4, type: 'war', parties: 'Israel vs Hamas; friction with Hezbollah & Iran proxies', since: '2023', note: 'Regional escalation risk involving Lebanon, Syria, Iran-aligned militias.', marketImpact: 'Oil risk premium, gold haven bid, defense sector' },
  { id: 'redsea', name: 'Red Sea Shipping Attacks', lat: 14.0, lon: 42.5, intensity: 4, type: 'maritime-attacks', parties: 'Houthi attacks on commercial shipping', since: '2023', note: 'Container traffic through Bab el-Mandeb remains well below pre-crisis levels; rerouting via Cape of Good Hope.', marketImpact: 'Freight rates, container shipping stocks, European import costs' },
  { id: 'sudan', name: 'Sudan Civil War', lat: 15.5, lon: 32.5, intensity: 4, type: 'civil-war', parties: 'SAF vs RSF', since: '2023', note: 'One of the world\'s worst humanitarian crises; gold smuggling funds both sides.', marketImpact: 'Gold supply chains, regional instability (Red Sea coast)' },
  { id: 'myanmar', name: 'Myanmar Civil War', lat: 21.9, lon: 96.0, intensity: 3, type: 'civil-war', parties: 'Junta vs resistance & ethnic armies', since: '2021', note: 'Junta losing territory; border trade with China and Thailand disrupted.', marketImpact: 'Rare earths, rice trade, regional supply chains' },
  { id: 'sahel', name: 'Sahel Insurgencies', lat: 15.0, lon: 0.0, intensity: 3, type: 'insurgency', parties: 'Jihadist groups vs juntas (Mali, Burkina, Niger)', since: '2012', note: 'Wagner/Africa Corps presence; Western forces expelled; coup belt instability.', marketImpact: 'Uranium (Niger), gold production, migration pressure on EU' },
  { id: 'drc', name: 'Eastern DRC Conflict', lat: -1.7, lon: 29.2, intensity: 3, type: 'insurgency', parties: 'M23 (Rwanda-linked) vs FARDC', since: '2021', note: 'Fighting near Goma; critical minerals region.', marketImpact: 'Cobalt, coltan, copper supply risk' },
  { id: 'yemen', name: 'Yemen Conflict', lat: 15.4, lon: 44.2, intensity: 3, type: 'civil-war', parties: 'Houthis vs internationally recognized govt / Saudi coalition', since: '2014', note: 'Fragile truce internally; Houthis project power over Red Sea shipping.', marketImpact: 'Shipping insurance, oil transit risk' },
  { id: 'haiti', name: 'Haiti Gang Crisis', lat: 18.5, lon: -72.3, intensity: 2, type: 'crisis', parties: 'Gang coalitions vs state / international mission', since: '2021', note: 'State capacity collapse; multinational security mission struggling.', marketImpact: 'Regional migration, limited market impact' },
  { id: 'syria', name: 'Syria Instability', lat: 35.0, lon: 38.0, intensity: 2, type: 'civil-war', parties: 'Transitional tensions, residual insurgency', since: '2011', note: 'Post-Assad transition fragile; Kurdish question and Israeli strikes continue.', marketImpact: 'Regional risk premium, reconstruction plays' },
];

const HOTSPOTS: Hotspot[] = [
  { id: 'taiwan', name: 'Taiwan Strait', lat: 24.0, lon: 119.5, riskLevel: 'severe', note: 'PLA drills and grey-zone pressure; semiconductor supply chain concentration (TSMC).', watchFor: 'Blockade drills, election cycles, US-China tech escalation' },
  { id: 'scs', name: 'South China Sea', lat: 12.0, lon: 114.0, riskLevel: 'high', note: 'China-Philippines clashes near Second Thomas Shoal; US mutual defense treaty exposure.', watchFor: 'Coast guard incidents, freedom-of-navigation ops' },
  { id: 'korea', name: 'Korean Peninsula', lat: 38.3, lon: 127.0, riskLevel: 'elevated', note: 'North Korean missile tests; deepening Moscow-Pyongyang military ties.', watchFor: 'ICBM/nuclear tests, border incidents' },
  { id: 'iran', name: 'Iran Nuclear Program', lat: 32.4, lon: 53.7, riskLevel: 'high', note: 'Enrichment near weapons-grade; shadow war with Israel; sanctions enforcement.', watchFor: 'IAEA reports, strike threats, Strait of Hormuz retaliation' },
  { id: 'kashmir', name: 'India–Pakistan (Kashmir)', lat: 34.1, lon: 74.8, riskLevel: 'elevated', note: 'Two nuclear powers; periodic cross-border escalation.', watchFor: 'LoC incidents, terror attacks, water treaty disputes' },
  { id: 'balkans', name: 'Western Balkans', lat: 43.9, lon: 18.4, riskLevel: 'elevated', note: 'Bosnia Serb secessionism, Kosovo-Serbia friction.', watchFor: 'Republika Srpska moves, EU/NATO response' },
  { id: 'venezuela', name: 'Venezuela–Guyana (Essequibo)', lat: 6.8, lon: -61.0, riskLevel: 'elevated', note: 'Territorial claim over oil-rich Essequibo region.', watchFor: 'Military posturing, ExxonMobil operations' },
  { id: 'arctic', name: 'Arctic Militarization', lat: 78.0, lon: 20.0, riskLevel: 'elevated', note: 'NATO-Russia buildup; new shipping routes as ice melts.', watchFor: 'Northern Sea Route traffic, Svalbard tensions' },
];

const CHOKEPOINTS: Chokepoint[] = [
  { id: 'hormuz', name: 'Strait of Hormuz', lat: 26.6, lon: 56.3, tradeShare: '~21% of global oil', oilShare: '21m bbl/day', status: 'elevated', note: 'Iran retaliation risk; tanker seizures history. No practical bypass for Gulf crude.' },
  { id: 'babelmandeb', name: 'Bab el-Mandeb', lat: 12.6, lon: 43.3, tradeShare: '~12% of global trade', oilShare: '6m bbl/day', status: 'disrupted', note: 'Houthi attacks force Cape of Good Hope rerouting (+10-14 days transit).' },
  { id: 'suez', name: 'Suez Canal', lat: 30.5, lon: 32.4, tradeShare: '~12% of global trade', status: 'disrupted', note: 'Transits far below normal due to Red Sea risk; Egypt revenue crisis.' },
  { id: 'malacca', name: 'Strait of Malacca', lat: 2.5, lon: 101.0, tradeShare: '~25% of traded goods', oilShare: '16m bbl/day', status: 'normal', note: 'World\'s busiest chokepoint; China\'s key energy vulnerability.' },
  { id: 'panama', name: 'Panama Canal', lat: 9.1, lon: -79.7, tradeShare: '~5% of global trade', status: 'normal', note: 'Transit capacity recovered from drought lows; watch water levels.' },
  { id: 'bosphorus', name: 'Turkish Straits', lat: 41.1, lon: 29.0, tradeShare: '~3% of global oil', status: 'elevated', note: 'Black Sea grain & oil exports; war-zone insurance premiums.' },
  { id: 'gibraltar', name: 'Strait of Gibraltar', lat: 35.9, lon: -5.6, tradeShare: '~10% of global trade', status: 'normal', note: 'Mediterranean gateway; increased traffic from Cape reroutes.' },
  { id: 'goodhope', name: 'Cape of Good Hope', lat: -34.4, lon: 18.5, tradeShare: 'Surging (Suez bypass)', status: 'elevated', note: 'Absorbing rerouted Suez traffic; longer transits = tighter effective ship supply.' },
  { id: 'danish', name: 'Danish Straits', lat: 55.7, lon: 12.6, tradeShare: '~3% of global oil', status: 'elevated', note: 'Russian "shadow fleet" oil exports; NATO monitoring after infrastructure sabotage.' },
];

// Central banks — rate values are indicative latest policy levels and are
// overridden LIVE from FRED where a series is available (Fed, ECB).
const CENTRAL_BANKS: CentralBank[] = [
  { id: 'fed', name: 'Federal Reserve', country: 'United States', lat: 38.89, lon: -77.04, rate: 3.75, rateName: 'Fed Funds (effective)', stance: 'on-hold', note: 'Balancing sticky services inflation vs labor cooling.', live: false },
  { id: 'ecb', name: 'European Central Bank', country: 'Eurozone', lat: 50.11, lon: 8.67, rate: 2.25, rateName: 'Deposit Facility', stance: 'easing', note: 'Growth-supportive bias as inflation normalizes.', live: false },
  { id: 'boe', name: 'Bank of England', country: 'United Kingdom', lat: 51.51, lon: -0.09, rate: 3.75, rateName: 'Bank Rate', stance: 'easing', note: 'Gradual cuts; wage growth still watched.', live: false },
  { id: 'boj', name: 'Bank of Japan', country: 'Japan', lat: 35.69, lon: 139.77, rate: 1.0, rateName: 'Policy Rate', stance: 'tightening', note: 'Slow normalization away from ultra-loose policy; yen in focus.', live: false },
  { id: 'pboc', name: 'People\'s Bank of China', country: 'China', lat: 39.91, lon: 116.40, rate: 1.4, rateName: '7d Reverse Repo', stance: 'easing', note: 'Supporting property deleveraging and domestic demand.', live: false },
  { id: 'snb', name: 'Swiss National Bank', country: 'Switzerland', lat: 46.95, lon: 7.45, rate: 0.0, rateName: 'Policy Rate', stance: 'easing', note: 'CHF strength keeps inflation lowest in G10.', live: false },
  { id: 'boc', name: 'Bank of Canada', country: 'Canada', lat: 45.42, lon: -75.70, rate: 2.25, rateName: 'Overnight Rate', stance: 'easing', note: 'Housing-sensitive economy responding to cuts.', live: false },
  { id: 'rba', name: 'Reserve Bank of Australia', country: 'Australia', lat: -33.87, lon: 151.21, rate: 3.35, rateName: 'Cash Rate', stance: 'on-hold', note: 'Commodity income cushions; inflation in band.', live: false },
  { id: 'cbrt', name: 'Central Bank of Türkiye', country: 'Türkiye', lat: 39.93, lon: 32.86, rate: 31.0, rateName: '1w Repo', stance: 'easing', note: 'Disinflation path from extreme levels; lira watched.', live: false },
  { id: 'bcb', name: 'Banco Central do Brasil', country: 'Brazil', lat: -15.79, lon: -47.88, rate: 13.75, rateName: 'Selic', stance: 'on-hold', note: 'High real rates; fiscal credibility premium.', live: false },
];

// FRED series for live policy rates (best-effort).
const FRED_RATE_SERIES: Record<string, string> = {
  fed: 'DFF',        // Fed Funds effective, daily
  ecb: 'ECBDFR',     // ECB deposit facility rate, daily
};

// ── Country macro layers (choropleth) ──────────────────────────────────
// GDP growth, government debt, inflation, population growth: LIVE from IMF
// DataMapper (all countries in one call). Liquidity (broad money growth):
// LIVE from World Bank. PMI, AI capex and EPS growth: curated (no free API).
const IMF_INDICATORS = {
  gdp: 'NGDP_RPCH',        // Real GDP growth %
  debt: 'GGXWDG_NGDP',     // Gov gross debt % of GDP
  inflation: 'PCPIPCH',    // CPI inflation %
  population: 'LP',        // Population, millions (growth computed YoY)
} as const;

async function imfAll(indicator: string): Promise<Record<string, Record<string, number>>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://www.imf.org/external/datamapper/api/v1/${indicator}`, {
        signal: AbortSignal.timeout(20000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EconoPulse/1.0; +https://www.econopulse.ai)',
          Accept: 'application/json,*/*;q=0.8',
        },
        next: { revalidate: 21600 },
      });
      if (!res.ok) continue;
      const json: any = await res.json();
      const values = json?.values?.[indicator];
      if (values && typeof values === 'object') return values;
    } catch { /* retry */ }
  }
  return {};
}

/** Latest value per ISO3 capped at the current year (nowcast, not forecast). */
function imfLatest(all: Record<string, Record<string, number>>, opts?: { growth?: boolean }): Record<string, number> {
  const currentYear = new Date().getUTCFullYear();
  const out: Record<string, number> = {};
  for (const [iso3, series] of Object.entries(all)) {
    if (!/^[A-Z]{3}$/.test(iso3)) continue; // skip aggregates
    const years = Object.keys(series).map(Number).filter((y) => isFinite(y) && y <= currentYear).sort((a, b) => b - a);
    if (!years.length) continue;
    const latest = Number(series[String(years[0])]);
    if (!isFinite(latest)) continue;
    if (opts?.growth) {
      const prior = Number(series[String(years[0] - 1)]);
      if (!isFinite(prior) || prior === 0) continue;
      out[iso3] = +(((latest - prior) / prior) * 100).toFixed(2);
    } else {
      out[iso3] = +latest.toFixed(2);
    }
  }
  return out;
}

/** World Bank broad money growth (FM.LBL.BMNY.ZG) — latest value per country. */
async function wbLiquidity(): Promise<Record<string, number>> {
  return wbIndicator('FM.LBL.BMNY.ZG');
}

/** World Bank external balance of goods & services, % of GDP — trade balance layer. */
async function wbTradeBalance(): Promise<Record<string, number>> {
  return wbIndicator('NE.RSB.GNFS.ZS');
}

async function wbIndicator(indicator: string): Promise<Record<string, number>> {
  try {
    const url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=2000&date=2020:2026`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), next: { revalidate: 86400 } });
    if (!res.ok) return {};
    const json: any = await res.json();
    const rows: any[] = Array.isArray(json) ? json[1] || [] : [];
    const out: Record<string, { year: number; value: number }> = {};
    for (const r of rows) {
      const iso3 = r?.countryiso3code;
      const v = Number(r?.value);
      const y = Number(r?.date);
      if (!iso3 || !/^[A-Z]{3}$/.test(iso3) || !isFinite(v) || !isFinite(y)) continue;
      if (!out[iso3] || y > out[iso3].year) out[iso3] = { year: y, value: v };
    }
    return Object.fromEntries(Object.entries(out).map(([k, o]) => [k, +o.value.toFixed(2)]));
  } catch {
    return {};
  }
}

// Manufacturing PMI — curated from latest S&P Global / national releases (no free API).
const PMI_DATA: Record<string, number> = {
  USA: 52.0, CHN: 50.4, DEU: 45.8, JPN: 50.1, GBR: 48.3, FRA: 45.1, ITA: 47.4,
  ESP: 51.4, IND: 58.4, BRA: 52.1, KOR: 49.8, TWN: 50.9, MEX: 51.2, CAN: 49.6,
  AUS: 49.9, RUS: 50.6, TUR: 47.9, IDN: 52.7, VNM: 53.2, THA: 51.6, MYS: 49.5,
  PHL: 51.9, POL: 48.7, CZE: 46.9, SWE: 52.3, CHE: 46.2, NLD: 49.1, SAU: 55.0,
  ARE: 54.2, ZAF: 48.9, EGY: 48.2, NGA: 51.0, GRC: 53.1, IRL: 50.7, SGP: 51.3,
};

// Private AI investment / capex, $B (curated from Stanford AI Index + national programs).
const AI_CAPEX: Record<string, number> = {
  USA: 109.1, CHN: 47.5, GBR: 4.5, DEU: 3.8, FRA: 3.4, IND: 3.2, KOR: 3.0,
  JPN: 2.8, CAN: 2.6, ISR: 2.5, SGP: 2.1, ARE: 1.9, SAU: 1.8, AUS: 1.3,
  NLD: 1.1, SWE: 1.0, CHE: 0.9, ESP: 0.7, ITA: 0.6, BRA: 0.5, TWN: 0.5,
};

// Forward EPS growth consensus for the main equity markets, % (curated).
const EPS_GROWTH: Record<string, number> = {
  USA: 13.5, CHN: 10.2, JPN: 8.8, DEU: 9.5, GBR: 6.8, FRA: 7.9, ITA: 6.2,
  ESP: 7.1, IND: 16.4, BRA: 11.8, KOR: 21.5, TWN: 19.2, MEX: 8.4, CAN: 9.1,
  AUS: 5.6, IDN: 9.8, ZAF: 10.5, SAU: 7.4, NLD: 10.8, CHE: 8.2, SWE: 9.4,
};

// 10-year government bond yields, % (curated from latest market levels).
const BOND_10Y: Record<string, number> = {
  USA: 4.32, DEU: 2.55, ITA: 3.62, FRA: 3.12, ESP: 3.18, GBR: 4.15, CHE: 0.58,
  NLD: 2.78, SWE: 2.35, NOR: 3.65, DNK: 2.42, AUT: 2.95, PRT: 3.05, GRC: 3.35,
  POL: 5.45, CZE: 4.15, HUN: 6.85, ROU: 6.95, TUR: 26.5, RUS: 14.8, UKR: 22.0,
  JPN: 1.08, CHN: 2.18, KOR: 3.05, IND: 6.88, IDN: 6.72, THA: 2.55, MYS: 3.82,
  PHL: 6.15, VNM: 2.85, SGP: 2.95, TWN: 1.55, HKG: 3.45, PAK: 12.5, BGD: 11.8,
  AUS: 4.25, NZL: 4.45, CAN: 3.42, MEX: 9.45, BRA: 11.85, ARG: 15.5, CHL: 5.65,
  COL: 9.85, PER: 6.45, ZAF: 10.35, NGA: 18.5, EGY: 24.0, KEN: 15.2, MAR: 3.85,
  SAU: 4.95, ARE: 4.55, ISR: 4.42, QAT: 4.35,
};

async function fredLatest(series: string, apiKey: string): Promise<number | null> {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    const obs: Array<{ value: string }> = json?.observations || [];
    for (const o of obs) {
      const v = parseFloat(o.value);
      if (Number.isFinite(v)) return v;
    }
    return null;
  } catch {
    return null;
  }
}

let _cache: { ts: number; payload: any } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 min — risk gauge inputs are market-live

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`global-risk:${ip}`, 30, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });

  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.payload, { headers: { ...rateLimitHeaders(rl), 'x-cache': 'HIT' } });
  }

  try {
    // ── LIVE market stress signals (Yahoo) + macro layers (IMF/WB) ────────
    const [monthQ, dayQ, imfGdp, imfDebt, imfCpi, imfPop, liquidity, tradeBalance] = await Promise.all([
      fetchYahooChartQuotes(['GC=F', 'BZ=F', 'ITA', 'DX-Y.NYB'], '1mo', 4, 100).catch(() => ({} as any)),
      fetchYahooChartQuotes(['^VIX'], '2d', 1, 0).catch(() => ({} as any)),
      imfAll(IMF_INDICATORS.gdp),
      imfAll(IMF_INDICATORS.debt),
      imfAll(IMF_INDICATORS.inflation),
      imfAll(IMF_INDICATORS.population),
      wbLiquidity(),
      wbTradeBalance(),
    ]);

    const vix = dayQ['^VIX']?.price ?? null;
    const gold1m = monthQ['GC=F']?.changePercent ?? null;
    const oil1m = monthQ['BZ=F']?.changePercent ?? null;
    const defense1m = monthQ['ITA']?.changePercent ?? null;
    const dxy1m = monthQ['DX-Y.NYB']?.changePercent ?? null;

    // Risk score 0-100 from real market stress inputs.
    let score = 0, weight = 0;
    if (vix != null) { score += Math.max(0, Math.min(100, ((vix - 12) / 28) * 100)) * 0.35; weight += 0.35; }
    if (gold1m != null) { score += Math.max(0, Math.min(100, 50 + gold1m * 5)) * 0.2; weight += 0.2; }
    if (oil1m != null) { score += Math.max(0, Math.min(100, 50 + oil1m * 3)) * 0.15; weight += 0.15; }
    if (defense1m != null) { score += Math.max(0, Math.min(100, 50 + defense1m * 4)) * 0.15; weight += 0.15; }
    if (dxy1m != null) { score += Math.max(0, Math.min(100, 50 + dxy1m * 6)) * 0.15; weight += 0.15; }
    const riskScore = weight > 0 ? Math.round(score / weight) : 50;
    const riskLabel = riskScore >= 70 ? 'Severe' : riskScore >= 55 ? 'High' : riskScore >= 40 ? 'Elevated' : 'Contained';

    // ── LIVE central-bank rates from FRED (best-effort) ────────────────────
    const banks = CENTRAL_BANKS.map((b) => ({ ...b }));
    const fredKey = process.env.FRED_API_KEY;
    if (fredKey) {
      await Promise.all(
        Object.entries(FRED_RATE_SERIES).map(async ([id, series]) => {
          const v = await fredLatest(series, fredKey);
          const bank = banks.find((b) => b.id === id);
          if (bank && v != null) { bank.rate = +v.toFixed(2); bank.live = true; }
        })
      );
    }

    const payload = {
      ok: true,
      generatedAt: new Date().toISOString(),
      riskGauge: {
        score: riskScore,
        label: riskLabel,
        inputs: {
          vix: vix != null ? +vix.toFixed(2) : null,
          gold1m: gold1m != null ? +gold1m.toFixed(2) : null,
          oil1m: oil1m != null ? +oil1m.toFixed(2) : null,
          defense1m: defense1m != null ? +defense1m.toFixed(2) : null,
          dollar1m: dxy1m != null ? +dxy1m.toFixed(2) : null,
        },
      },
      conflicts: CONFLICTS,
      hotspots: HOTSPOTS,
      chokepoints: CHOKEPOINTS,
      centralBanks: banks,
      // Country-level choropleth layers (Record<ISO3, value>)
      macro: {
        gdp: imfLatest(imfGdp),
        debt: imfLatest(imfDebt),
        inflation: imfLatest(imfCpi),
        populationGrowth: imfLatest(imfPop, { growth: true }),
        liquidity,
        tradeBalance,
        bond10y: BOND_10Y,
        pmi: PMI_DATA,
        aiCapex: AI_CAPEX,
        epsGrowth: EPS_GROWTH,
      },
    };
    _cache = { ts: Date.now(), payload };
    return NextResponse.json(payload, { headers: { ...rateLimitHeaders(rl), 'x-cache': 'MISS' } });
  } catch (e: any) {
    if (_cache) return NextResponse.json(_cache.payload, { headers: { ...rateLimitHeaders(rl), 'x-cache': 'STALE' } });
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
