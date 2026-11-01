export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getEconomicsApiLatest } from '@/lib/economicsapi';

// All macro indicators for one country (EconomicsAPI snapshot: IMF/BIS/World Bank
// sourced, ~20 KPIs). Powers the expandable country detail in /economics.

const ISO3: Record<string, string> = {
  US: 'USA', CN: 'CHN', DE: 'DEU', JP: 'JPN', IN: 'IND', GB: 'GBR', FR: 'FRA', CA: 'CAN', IT: 'ITA', BR: 'BRA',
  RU: 'RUS', KR: 'KOR', AU: 'AUS', MX: 'MEX', ES: 'ESP', ID: 'IDN', NL: 'NLD', SA: 'SAU', TR: 'TUR', CH: 'CHE',
  PL: 'POL', AR: 'ARG', BE: 'BEL', SE: 'SWE', IE: 'IRL', AT: 'AUT', NO: 'NOR', IL: 'ISR', TH: 'THA', AE: 'ARE',
  SG: 'SGP', MY: 'MYS', VN: 'VNM', PH: 'PHL', DK: 'DNK', HK: 'HKG', FI: 'FIN', PT: 'PRT', GR: 'GRC', NZ: 'NZL',
  CL: 'CHL', CO: 'COL', ZA: 'ZAF', EG: 'EGY', CZ: 'CZE', RO: 'ROU', HU: 'HUN',
};

// Display order: headline indicators first, then grouped.
const KPI_ORDER = [
  'NA.GDP.CUR.USD', 'NA.GDP.Yoy', 'NA.GDP.PC.USD', 'PR.CPI.Yoy', 'IR.POL', 'LB.UR', 'LB.PART',
  'GF.DEBT.GDP', 'GF.BAL.GDP', 'EA.TBAL', 'EA.EXP', 'EA.IMP', 'EA.CA.GDP', 'EA.FDI.IN',
  'MN.FX.OFF', 'MN.FXRES', 'MN.M2', 'ST.IP.Yoy', 'HS.HPI.Yoy', 'DM.POP',
];

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`country-ind:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const raw = (new URL(req.url).searchParams.get('country') || '').trim().toUpperCase();
  const iso3 = raw.length === 2 ? ISO3[raw] : raw;
  if (!iso3 || !/^[A-Z]{3}$/.test(iso3)) {
    return NextResponse.json({ ok: false, error: 'invalid_country' }, { status: 400, headers: rateLimitHeaders(rl) });
  }

  try {
    const snapshot = await getEconomicsApiLatest();
    const byKpi = snapshot?.get(iso3);
    if (!byKpi || !byKpi.size) {
      return NextResponse.json({ ok: false, error: 'no_data' }, { status: 404, headers: rateLimitHeaders(rl) });
    }
    const rows = Array.from(byKpi.values());
    rows.sort((a, b) => {
      const ia = KPI_ORDER.indexOf(a.kpi_id);
      const ib = KPI_ORDER.indexOf(b.kpi_id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    return NextResponse.json(
      {
        ok: true,
        country: rows[0]?.country || iso3,
        indicators: rows.map((r) => ({
          kpi: r.kpi_id,
          name: r.indicator,
          group: r.group || '',
          value: r.latest_value,
          date: r.latest_value_date,
          previous: r.previous_value,
          previousDate: r.previous_value_date,
          high: r.highest_value ?? null,
          low: r.lowest_value ?? null,
          unit: r.unit,
          frequency: r.frequency,
          source: r.source_name || '',
        })),
      },
      { headers: { ...rateLimitHeaders(rl), 'Cache-Control': 'public, max-age=0, s-maxage=3600' } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
