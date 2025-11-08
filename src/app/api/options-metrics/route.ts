export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
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

export async function GET() {
  // Feature removed – return 410 Gone to signal deprecation
  return NextResponse.json({ success: false, error: 'options_metrics_removed' }, { status: 410 });
}
