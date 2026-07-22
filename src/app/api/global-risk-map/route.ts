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

// Central banks — rate values are indicative and overridden LIVE from FRED when possible.
const CENTRAL_BANKS: CentralBank[] = [
  { id: 'fed', name: 'Federal Reserve', country: 'United States', lat: 38.89, lon: -77.04, rate: null, rateName: 'Fed Funds (effective)', stance: 'on-hold', note: 'Balancing sticky services inflation vs labor cooling.', live: false },
  { id: 'ecb', name: 'European Central Bank', country: 'Eurozone', lat: 50.11, lon: 8.67, rate: null, rateName: 'Deposit Facility', stance: 'easing', note: 'Growth-supportive bias as inflation normalizes.', live: false },
  { id: 'boe', name: 'Bank of England', country: 'United Kingdom', lat: 51.51, lon: -0.09, rate: null, rateName: 'Bank Rate', stance: 'easing', note: 'Gradual cuts; wage growth still watched.', live: false },
  { id: 'boj', name: 'Bank of Japan', country: 'Japan', lat: 35.69, lon: 139.77, rate: null, rateName: 'Policy Rate', stance: 'tightening', note: 'Slow normalization away from ultra-loose policy; yen in focus.', live: false },
  { id: 'pboc', name: 'People\'s Bank of China', country: 'China', lat: 39.91, lon: 116.40, rate: null, rateName: '7d Reverse Repo', stance: 'easing', note: 'Supporting property deleveraging and domestic demand.', live: false },
  { id: 'snb', name: 'Swiss National Bank', country: 'Switzerland', lat: 46.95, lon: 7.45, rate: null, rateName: 'Policy Rate', stance: 'easing', note: 'CHF strength keeps inflation lowest in G10.', live: false },
  { id: 'boc', name: 'Bank of Canada', country: 'Canada', lat: 45.42, lon: -75.70, rate: null, rateName: 'Overnight Rate', stance: 'easing', note: 'Housing-sensitive economy responding to cuts.', live: false },
  { id: 'rba', name: 'Reserve Bank of Australia', country: 'Australia', lat: -33.87, lon: 151.21, rate: null, rateName: 'Cash Rate', stance: 'on-hold', note: 'Commodity income cushions; inflation in band.', live: false },
  { id: 'cbrt', name: 'Central Bank of Türkiye', country: 'Türkiye', lat: 39.93, lon: 32.86, rate: null, rateName: '1w Repo', stance: 'easing', note: 'Disinflation path from extreme levels; lira watched.', live: false },
  { id: 'bcb', name: 'Banco Central do Brasil', country: 'Brazil', lat: -15.79, lon: -47.88, rate: null, rateName: 'Selic', stance: 'on-hold', note: 'High real rates; fiscal credibility premium.', live: false },
];

// FRED series for live policy rates (best-effort).
const FRED_RATE_SERIES: Record<string, string> = {
  fed: 'DFF',        // Fed Funds effective, daily
  ecb: 'ECBDFR',     // ECB deposit facility rate, daily
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
    // ── LIVE market stress signals (Yahoo) ─────────────────────────────────
    // 1-month momentum for havens/energy/defense + VIX level.
    const [monthQ, dayQ] = await Promise.all([
      fetchYahooChartQuotes(['GC=F', 'BZ=F', 'ITA', 'DX-Y.NYB'], '1mo', 4, 100).catch(() => ({} as any)),
      fetchYahooChartQuotes(['^VIX'], '2d', 1, 0).catch(() => ({} as any)),
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
      sources: 'Curated geopolitical dataset (reviewed) · live market stress via Yahoo (VIX, gold, Brent, defense, DXY) · central-bank rates via FRED where available',
    };
    _cache = { ts: Date.now(), payload };
    return NextResponse.json(payload, { headers: { ...rateLimitHeaders(rl), 'x-cache': 'MISS' } });
  } catch (e: any) {
    if (_cache) return NextResponse.json(_cache.payload, { headers: { ...rateLimitHeaders(rl), 'x-cache': 'STALE' } });
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
