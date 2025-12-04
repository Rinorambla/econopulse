export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getOptionsMetrics } from '@/lib/options-provider';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

type APIMetrics = {
  symbol: string;
  putCallRatioVol?: string | null;
  putCallRatioOI?: string | null;
  gammaExposure?: number | null;
  gammaLabel?: 'Low'|'Medium'|'High'|'Extreme'|'Unknown';
  callSkew?: 'Call Skew'|'Put Skew'|'Neutral';
  optionsSentiment?: string;
  unusualAtm?: 'Low'|'Medium'|'High';
  unusualOtm?: 'Low'|'Medium'|'High';
  unusualCombo?: string | null;
};

function classifyOptionsSentiment(pcVolRatio: number | null, totalVol: number, gex: number | null): string {
  if (gex != null && isFinite(gex) && gex > 0 && pcVolRatio != null && pcVolRatio < 0.8 && totalVol > 0) return 'FOMO Buying';
  if (pcVolRatio != null && pcVolRatio < 0.8) return 'Stealth Bull';
  if (pcVolRatio != null && pcVolRatio > 1.3) return 'Put Storm';
  return 'Neutral Flow';
}

function levelFromShare(x: number | null | undefined): 'Low'|'Medium'|'High' {
  if (x == null || !isFinite(x as number)) return 'Low';
  const v = x as number;
  if (v > 0.35) return 'High';
  if (v > 0.2) return 'Medium';
  return 'Low';
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`options-metrics:${ip}`, 40, 60_000);
  if (!rl.ok) {
    return new NextResponse(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { ...rateLimitHeaders(rl) } });
  }

  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get('symbol')?.trim();
    const symbolsCsv = url.searchParams.get('symbols')?.trim();
    let symbols: string[] = [];
    if (symbolsCsv) symbols = symbolsCsv.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    else if (symbol) symbols = [symbol.toUpperCase()];
    if (!symbols.length) return NextResponse.json({ success: false, error: 'missing_symbol' }, { status: 400, headers: rateLimitHeaders(rl) });
    // Safety cap
    symbols = symbols.slice(0, 20);

    const out: Record<string, APIMetrics> = {};
    for (const sym of symbols) {
      const m = await getOptionsMetrics(sym, 3);
      if (!m) { out[sym] = { symbol: sym }; continue; }
      const pcVol = m.putCallVolumeRatio;
      const pcOI = m.putCallOIRatio;
      const sentiment = classifyOptionsSentiment(pcVol, (m.totalCallVolume + m.totalPutVolume), m.gex);
      // Build unusual combo once here (client no longer needs to reconstruct)
      let unusualCombo: string | null = null;
      const atmShare = m.atmVolumeShare;
      const otmShare = m.otmVolumeShare;
      if (atmShare != null || otmShare != null) {
        const atmLevel = levelFromShare(atmShare);
        const otmLevel = levelFromShare(otmShare);
        unusualCombo = `${atmLevel} / ${otmLevel}`;
      }
      // Coerce ratios to string with 2 decimals; if zero or null show 0.00 (ensures dashboard shows numeric values)
      const pcVolStr = pcVol == null ? '0.00' : pcVol.toFixed(2);
      const pcOIStr = pcOI == null ? '0.00' : pcOI.toFixed(2);
      out[sym] = {
        symbol: sym,
        putCallRatioVol: pcVolStr,
        putCallRatioOI: pcOIStr,
        gammaExposure: m.gex,
        gammaLabel: m.gexLabel,
        callSkew: m.callSkew,
        optionsSentiment: sentiment,
        unusualAtm: levelFromShare(m.atmVolumeShare),
        unusualOtm: levelFromShare(m.otmVolumeShare),
        unusualCombo
      };
    }

    return NextResponse.json({ success: true, data: out, asOf: new Date().toISOString() }, { headers: rateLimitHeaders(rl) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'unknown_error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
