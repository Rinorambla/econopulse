import { NextRequest, NextResponse } from 'next/server';
import { getPolygonClient } from '@/lib/polygonFinance';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface StrikeLevel {
  strike: number;
  oi: number;
  volume: number;
  type: 'call' | 'put';
  expiration: string;
  iv?: number | null;
  distance: number; // % from current price
}

interface PivotPoint {
  level: number;
  label: 'R3' | 'R2' | 'R1' | 'P' | 'S1' | 'S2' | 'S3';
}

interface GammaStrike {
  strike: number;
  callOi: number;
  putOi: number;
  callGex: number;  // call gamma exposure (positive sign)
  putGex: number;   // put gamma exposure (negative sign)
  netGex: number;
}

interface KeyLevels {
  symbol: string;
  asOf: string;
  underlyingPrice: number;
  // Options-derived levels (from open interest + volume on chain)
  maxPain: number | null;
  callWalls: StrikeLevel[];   // top 3 by OI — likely resistance
  putWalls: StrikeLevel[];    // top 3 by OI — likely support
  callVolToday: StrikeLevel[]; // top 3 by today's volume — fresh positioning
  putVolToday: StrikeLevel[];
  // Technical levels
  high20d: number | null;
  low20d: number | null;
  high52w: number | null;
  low52w: number | null;
  pivots: PivotPoint[];
  vwap20d: number | null;
  // Full gamma exposure profile across strikes
  gammaProfile: GammaStrike[];
  gammaFlip: number | null; // strike where net GEX crosses zero
  // Signal interpretation
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  notes: string[];
  source: string;
}

// In-memory cache (15 min TTL)
type CacheEntry = { ts: number; data: KeyLevels };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 15 * 60 * 1000;

function cacheKey(sym: string) { return `levels:${sym.toUpperCase()}`; }

function calcMaxPain(contracts: any[]): number | null {
  // Group by strike across all expirations within nearest 60 days
  const strikes = Array.from(new Set(contracts.map(c => c.strike))).sort((a, b) => a - b);
  if (strikes.length < 3) return null;
  let bestStrike = strikes[0];
  let minPain = Infinity;
  for (const S of strikes) {
    let pain = 0;
    for (const c of contracts) {
      const oi = c.openInterest || 0;
      if (!oi) continue;
      if (c.contractType === 'call' && S > c.strike) pain += oi * (S - c.strike);
      if (c.contractType === 'put' && S < c.strike) pain += oi * (c.strike - S);
    }
    if (pain < minPain) { minPain = pain; bestStrike = S; }
  }
  return bestStrike;
}

function topByKey(
  contracts: any[],
  type: 'call' | 'put',
  key: 'openInterest' | 'volume',
  underlyingPrice: number,
  n = 3
): StrikeLevel[] {
  // Aggregate per strike (sum across expirations)
  const map = new Map<number, { oi: number; volume: number; iv: number | null; expirations: string[] }>();
  for (const c of contracts) {
    if (c.contractType !== type) continue;
    const cur = map.get(c.strike) || { oi: 0, volume: 0, iv: null, expirations: [] };
    cur.oi += c.openInterest || 0;
    cur.volume += c.volume || 0;
    if (c.impliedVolatility != null && cur.iv == null) cur.iv = c.impliedVolatility;
    if (c.expiration && !cur.expirations.includes(c.expiration)) cur.expirations.push(c.expiration);
    map.set(c.strike, cur);
  }
  const arr: StrikeLevel[] = [];
  for (const [strike, v] of map) {
    arr.push({
      strike,
      oi: v.oi,
      volume: v.volume,
      type,
      expiration: v.expirations.sort()[0] || '',
      iv: v.iv,
      distance: underlyingPrice > 0 ? ((strike - underlyingPrice) / underlyingPrice) * 100 : 0,
    });
  }
  arr.sort((a, b) => (key === 'openInterest' ? b.oi - a.oi : b.volume - a.volume));
  return arr.slice(0, n);
}

function computePivots(high: number, low: number, close: number): PivotPoint[] {
  const P = (high + low + close) / 3;
  const R1 = 2 * P - low;
  const S1 = 2 * P - high;
  const R2 = P + (high - low);
  const S2 = P - (high - low);
  const R3 = high + 2 * (P - low);
  const S3 = low - 2 * (high - P);
  return [
    { level: R3, label: 'R3' },
    { level: R2, label: 'R2' },
    { level: R1, label: 'R1' },
    { level: P,  label: 'P'  },
    { level: S1, label: 'S1' },
    { level: S2, label: 'S2' },
    { level: S3, label: 'S3' },
  ];
}

async function fetchPolygonDailyBars(symbol: string, days = 260): Promise<any[]> {
  const apiKeys = (process.env.POLYGON_API_KEY || '').split(',').filter(Boolean);
  if (!apiKeys.length) return [];
  const apiKey = apiKeys[0];
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  const f = from.toISOString().slice(0, 10);
  const t = to.toISOString().slice(0, 10);
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${f}/${t}?adjusted=true&sort=asc&limit=400&apiKey=${apiKey}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const j = await res.json();
    return j?.results || [];
  } catch {
    return [];
  }
}

function computeBias(price: number, maxPain: number | null, callWalls: StrikeLevel[], putWalls: StrikeLevel[]): { bias: 'Bullish' | 'Bearish' | 'Neutral'; notes: string[] } {
  const notes: string[] = [];
  let score = 0;
  if (maxPain != null) {
    const dist = ((maxPain - price) / price) * 100;
    if (Math.abs(dist) < 0.5) {
      notes.push(`Price pinned near max pain ($${maxPain.toFixed(2)})`);
    } else if (dist > 0) {
      score += 1;
      notes.push(`Max pain above price → magnet at $${maxPain.toFixed(2)} (+${dist.toFixed(1)}%)`);
    } else {
      score -= 1;
      notes.push(`Max pain below price → magnet at $${maxPain.toFixed(2)} (${dist.toFixed(1)}%)`);
    }
  }
  const nearestCall = callWalls.find(w => w.strike >= price);
  const nearestPut = [...putWalls].reverse().find(w => w.strike <= price);
  if (nearestCall) notes.push(`Nearest call wall: $${nearestCall.strike.toFixed(2)} (resistance, ${(nearestCall.oi / 1000).toFixed(0)}k OI)`);
  if (nearestPut) notes.push(`Nearest put wall: $${nearestPut.strike.toFixed(2)} (support, ${(nearestPut.oi / 1000).toFixed(0)}k OI)`);

  // Walls heuristic: bigger put walls below than call walls above → bullish
  const sumCall = callWalls.reduce((s, w) => s + w.oi, 0);
  const sumPut = putWalls.reduce((s, w) => s + w.oi, 0);
  if (sumPut > sumCall * 1.3) { score += 1; notes.push('Put walls dominate → support stronger than resistance'); }
  else if (sumCall > sumPut * 1.3) { score -= 1; notes.push('Call walls dominate → resistance stronger than support'); }

  const bias = score > 0 ? 'Bullish' : score < 0 ? 'Bearish' : 'Neutral';
  return { bias, notes };
}

function computeGammaProfile(contracts: any[], spot: number): { profile: GammaStrike[]; flip: number | null } {
  if (!contracts.length || !spot) return { profile: [], flip: null };
  // Aggregate per strike across the chain
  const map = new Map<number, GammaStrike>();
  for (const c of contracts) {
    const oi = c.openInterest || 0;
    if (!oi) continue;
    const gamma = typeof c.gamma === 'number' && isFinite(c.gamma) ? c.gamma : null;
    // Notional gamma exposure: gamma * OI * 100 * spot^2 * 0.01 (per 1% move).
    // If gamma is missing, fall back to OI proxy so the chart still renders.
    const gex = gamma != null ? gamma * oi * 100 * spot * spot * 0.01 : oi * 100;
    const cur = map.get(c.strike) || { strike: c.strike, callOi: 0, putOi: 0, callGex: 0, putGex: 0, netGex: 0 };
    if (c.contractType === 'call') {
      cur.callOi += oi;
      cur.callGex += gex;
    } else if (c.contractType === 'put') {
      cur.putOi += oi;
      // Dealer convention: short puts = short gamma below; we render puts as negative
      cur.putGex += -gex;
    }
    cur.netGex = cur.callGex + cur.putGex;
    map.set(c.strike, cur);
  }
  // Restrict to ±25% from spot for readability
  const lo = spot * 0.75;
  const hi = spot * 1.25;
  const profile = Array.from(map.values())
    .filter(r => r.strike >= lo && r.strike <= hi)
    .sort((a, b) => a.strike - b.strike);
  // Find gamma flip: the strike closest to spot where cumulative netGex changes sign
  let flip: number | null = null;
  for (let i = 1; i < profile.length; i++) {
    const prev = profile[i - 1].netGex;
    const cur = profile[i].netGex;
    if ((prev <= 0 && cur > 0) || (prev >= 0 && cur < 0)) {
      // linear interpolation between two strikes
      const s1 = profile[i - 1].strike;
      const s2 = profile[i].strike;
      const t = Math.abs(prev) / (Math.abs(prev) + Math.abs(cur) || 1);
      const cand = s1 + (s2 - s1) * t;
      if (flip == null || Math.abs(cand - spot) < Math.abs(flip - spot)) flip = cand;
    }
  }
  return { profile, flip };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get('symbol') || '').toUpperCase().trim();
    if (!symbol) return NextResponse.json({ ok: false, error: 'Missing symbol' }, { status: 400 });
    const force = searchParams.get('force') === '1';

    const k = cacheKey(symbol);
    const hit = CACHE.get(k);
    if (!force && hit && (Date.now() - hit.ts) < TTL_MS) {
      return NextResponse.json({ ok: true, data: hit.data, cached: true });
    }

    const polygon = getPolygonClient();
    if (!polygon) return NextResponse.json({ ok: false, error: 'Polygon client unavailable' }, { status: 503 });

    // Fetch in parallel
    const [contracts, bars, prev] = await Promise.all([
      polygon.getOptionsSnapshot(symbol).catch(() => [] as any[]),
      fetchPolygonDailyBars(symbol, 260),
      polygon.getPreviousDay(symbol).catch(() => null),
    ]);

    const underlyingPrice = (prev as any)?.price || (bars.length ? bars[bars.length - 1].c : 0);

    // Filter contracts to nearest 2-3 expirations within 60 days for cleaner walls
    let activeContracts = contracts;
    if (contracts.length) {
      const now = Date.now();
      const horizon = now + 60 * 86400000;
      const validExps = Array.from(new Set(contracts
        .filter(c => c.expiration)
        .map(c => c.expiration)
      )).filter(e => {
        const t = new Date(e).getTime();
        return t > now && t < horizon;
      }).sort();
      const nearest = validExps.slice(0, 3);
      if (nearest.length) {
        activeContracts = contracts.filter(c => nearest.includes(c.expiration));
      }
    }

    const maxPain = activeContracts.length ? calcMaxPain(activeContracts) : null;
    const callWalls = topByKey(activeContracts, 'call', 'openInterest', underlyingPrice, 3);
    const putWalls  = topByKey(activeContracts, 'put',  'openInterest', underlyingPrice, 3);
    const callVolToday = topByKey(activeContracts, 'call', 'volume', underlyingPrice, 3);
    const putVolToday  = topByKey(activeContracts, 'put',  'volume', underlyingPrice, 3);

    // Technical levels
    let high20d: number | null = null, low20d: number | null = null;
    let high52w: number | null = null, low52w: number | null = null;
    let pivots: PivotPoint[] = [];
    let vwap20d: number | null = null;
    if (bars.length) {
      const last20 = bars.slice(-20);
      high20d = Math.max(...last20.map((b: any) => b.h));
      low20d = Math.min(...last20.map((b: any) => b.l));
      const last252 = bars.slice(-252);
      high52w = Math.max(...last252.map((b: any) => b.h));
      low52w = Math.min(...last252.map((b: any) => b.l));
      // Pivots from yesterday's bar
      const lastBar = bars[bars.length - 1];
      pivots = computePivots(lastBar.h, lastBar.l, lastBar.c);
      // VWAP 20d
      const tpv = last20.reduce((s: number, b: any) => s + ((b.h + b.l + b.c) / 3) * (b.v || 0), 0);
      const tv = last20.reduce((s: number, b: any) => s + (b.v || 0), 0);
      if (tv > 0) vwap20d = tpv / tv;
    }

    const { profile: gammaProfile, flip: gammaFlip } = computeGammaProfile(activeContracts, underlyingPrice);

    const { bias, notes } = computeBias(underlyingPrice, maxPain, callWalls, putWalls);
    if (gammaFlip != null) {
      const above = underlyingPrice >= gammaFlip;
      notes.push(`Gamma flip ~$${gammaFlip.toFixed(2)} → dealers ${above ? 'long gamma (stabilizing)' : 'short gamma (volatile)'}`);
    }
    if (vwap20d != null) notes.push(`20d VWAP: $${vwap20d.toFixed(2)} (${underlyingPrice >= vwap20d ? 'above' : 'below'})`);
    if (high52w != null && underlyingPrice >= high52w * 0.98) notes.push(`Near 52-week high ($${high52w.toFixed(2)})`);
    if (low52w != null && underlyingPrice <= low52w * 1.02) notes.push(`Near 52-week low ($${low52w.toFixed(2)})`);

    const data: KeyLevels = {
      symbol,
      asOf: new Date().toISOString(),
      underlyingPrice,
      maxPain,
      callWalls,
      putWalls,
      callVolToday,
      putVolToday,
      high20d,
      low20d,
      high52w,
      low52w,
      pivots,
      vwap20d,
      gammaProfile,
      gammaFlip,
      bias,
      notes,
      source: contracts.length ? 'polygon' : 'technical-only',
    };

    CACHE.set(k, { ts: Date.now(), data });
    return NextResponse.json({ ok: true, data, cached: false });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Internal error' }, { status: 500 });
  }
}
