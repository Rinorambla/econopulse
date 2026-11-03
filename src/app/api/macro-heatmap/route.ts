export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getEconomicsApiLatest } from '@/lib/economicsapi';
import { HEATMAP_KPIS, type HeatCell } from '@/lib/macro-heatmap';

// Country × indicator matrix for the /economics heat map: every tracked
// country with the comparable macro KPIs (latest + previous reading), from the
// EconomicsAPI snapshot (IMF/BIS/World Bank sourced, 24h disk cache + seed).

const ISO3_TO_ISO2: Record<string, string> = {
  ARG: 'AR', AUS: 'AU', AUT: 'AT', BEL: 'BE', BGR: 'BG', BRA: 'BR', CAN: 'CA', CHE: 'CH', CHN: 'CN', CYP: 'CY',
  CZE: 'CZ', DEU: 'DE', DNK: 'DK', EMU: 'EU', ESP: 'ES', EST: 'EE', FIN: 'FI', FRA: 'FR', GBR: 'GB', GRC: 'GR',
  HKG: 'HK', HRV: 'HR', HUN: 'HU', IDN: 'ID', IND: 'IN', IRL: 'IE', ITA: 'IT', JPN: 'JP', KOR: 'KR', LTU: 'LT',
  LUX: 'LU', LVA: 'LV', MEX: 'MX', MLT: 'MT', NLD: 'NL', NOR: 'NO', NZL: 'NZ', POL: 'PL', PRT: 'PT', ROU: 'RO',
  RUS: 'RU', SAU: 'SA', SGP: 'SG', SVK: 'SK', SVN: 'SI', SWE: 'SE', THA: 'TH', TUR: 'TR', USA: 'US', ZAF: 'ZA',
};

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`macro-heat:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  try {
    const snapshot = await getEconomicsApiLatest();
    if (!snapshot || !snapshot.size) {
      return NextResponse.json({ ok: false, error: 'no_data' }, { status: 404, headers: rateLimitHeaders(rl) });
    }

    const countries = Array.from(snapshot.entries()).map(([iso3, byKpi]) => {
      const any = byKpi.values().next().value;
      const values: Record<string, HeatCell> = {};
      for (const k of HEATMAP_KPIS) {
        const r = byKpi.get(k.id);
        values[k.id] = r && Number.isFinite(r.latest_value)
          ? { v: r.latest_value, prev: Number.isFinite(r.previous_value as number) ? (r.previous_value as number) : null, date: r.latest_value_date }
          : null;
      }
      return { iso3, iso2: ISO3_TO_ISO2[iso3] || iso3.slice(0, 2), name: any?.country || iso3, values };
    })
      // Keep countries with at least the headline trio.
      .filter((c) => c.values['NA.GDP.Yoy'] || c.values['PR.CPI.Yoy'] || c.values['LB.UR'])
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(
      { ok: true, kpis: HEATMAP_KPIS, countries, updatedAt: new Date().toISOString() },
      { headers: { ...rateLimitHeaders(rl), 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
