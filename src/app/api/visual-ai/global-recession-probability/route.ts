import { NextResponse } from 'next/server';
import { fredService } from '@/lib/fred';

// Global Recession Probability (heuristic composite) using real FRED series
// Components:
// - RECPROUSM156N: NBER Probability of Recession (US)
// - DGS10 vs DGS3MO: 10y-3m term spread (inversions lead recessions)
// - INDPRO: Industrial Production momentum
// - UNRATE: Unemployment rate momentum
// - UMCSENT: Consumer Sentiment percentile

type Obs = { date: string; value: number };

async function fetchSeriesAsc(seriesId: string, limit: number) {
  const json = await fredService.getEconomicIndicator(seriesId, limit);
  const obs = (json?.observations || [])
    .filter((o: any) => o && o.value !== '.' && o.value !== null && o.value !== '')
    .map((o: any) => ({ date: o.date, value: Number(o.value) }))
    .filter((o: any) => Number.isFinite(o.value));
  // API returns desc because we ask sort desc; reverse to ascending
  return obs.reverse();
}

function pctChange(a: number, b: number) {
  return b !== 0 ? (a - b) / Math.abs(b) : 0;
}

function zscore(series: number[]) {
  if (series.length < 3) return series.map(() => 0);
  const mean = series.reduce((s, v) => s + v, 0) / series.length;
  const sd = Math.sqrt(series.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / series.length) || 1;
  return series.map(v => (v - mean) / sd);
}

function percentileRank(series: number[], current: number) {
  if (!series.length) return 0.5;
  const sorted = [...series].sort((a, b) => a - b);
  const idx = sorted.findIndex(v => v > current);
  const pos = idx === -1 ? sorted.length : idx;
  return pos / sorted.length;
}

export async function GET() {
  try {
    // Get 8 years of history for robust percentiles and recent 24M slice for UI
    const spanDays = 365 * 8 * 1.0;
    const limit = Math.floor(spanDays); // fredService uses limit (obs count)

    const [rec, d10, d3m, indpro, unrate, umcsent] = await Promise.all([
      fetchSeriesAsc('RECPROUSM156N', 4000), // monthly
      fetchSeriesAsc('DGS10', 4000),        // daily
      fetchSeriesAsc('DGS3MO', 4000),       // daily
      fetchSeriesAsc('INDPRO', 4000),       // monthly
      fetchSeriesAsc('UNRATE', 4000),       // monthly
      fetchSeriesAsc('UMCSENT', 4000),      // monthly
    ]);

    // Build a daily date axis from treasury or fallback to monthly
    const baseDates = (d10.length && d3m.length
      ? Array.from(new Set([...d10.map((o: Obs) => o.date), ...d3m.map((o: Obs) => o.date)])).sort()
      : (indpro.length ? indpro.map((o: Obs) => o.date) : (rec.length ? rec.map((o: Obs) => o.date) : []))
    );

    const valueOnOrBefore = (series: Obs[], date: string) => {
      // binary search could be used; linear scan is OK for limited slices
      for (let i = series.length - 1; i >= 0; i--) {
        if (series[i].date <= date) return series[i].value;
      }
      return null as number | null;
    };

    // Construct component sub-scores in [0,1]
  const rows = baseDates.map((date: string) => {
      const ten = valueOnOrBefore(d10, date);
      const three = valueOnOrBefore(d3m, date);
      const spread = (ten != null && three != null) ? ten - three : null;
      const recp = valueOnOrBefore(rec, date); // 0..1 probability from FRED
      const ip = valueOnOrBefore(indpro, date);
      const un = valueOnOrBefore(unrate, date);
      const cs = valueOnOrBefore(umcsent, date);

      return { date, spread, recp, ip, un, cs };
  }).filter((r: any) => r.spread != null || r.recp != null || r.ip != null || r.un != null || r.cs != null);

    // Compute momentum terms (MoM) for monthly series by comparing to prior monthly observation
  const monthlyRows = rows.filter((_r: any, i: number) => i % 21 === 0); // approx monthly from daily axis
    for (let i = 1; i < monthlyRows.length; i++) {
      const curr = monthlyRows[i];
      const prev = monthlyRows[i - 1];
      (curr as any).ipMoM = (curr.ip != null && prev.ip != null) ? pctChange(curr.ip, prev.ip) : null;
      (curr as any).unChg = (curr.un != null && prev.un != null) ? (curr.un - prev.un) : null;
    }

    // Build percentiles for Consumer Sentiment and normalize to risk
  const csSeries = monthlyRows.map((r: any) => r.cs).filter((v: any): v is number => v != null);
  const csRanks = csSeries.length ? csSeries.map((v: number) => percentileRank(csSeries, v)) : [];

    // Map components to [0,1] risk contributions
    const components: { date: string; recNBER?: number; termSpread?: number; ipMomentum?: number; unMomentum?: number; sentimentRisk?: number }[] = [];
    for (let i = 0; i < monthlyRows.length; i++) {
      const mr = monthlyRows[i] as any;
      // NBER recession probability (already 0..1)
      const recNBER = typeof mr.recp === 'number' ? Math.max(0, Math.min(1, mr.recp)) : undefined;
      // Term spread: deep inversion -> higher risk. Map via logistic around 0 with scale
      const ts = typeof mr.spread === 'number' ? (1 / (1 + Math.exp(5 * (mr.spread)))) : undefined;
      // IP momentum: negative MoM => risk
      const ipMom = typeof mr.ipMoM === 'number' ? Math.max(0, Math.min(1, -mr.ipMoM * 5)) : undefined;
      // Unemployment up => risk; normalize per 0.1pp ~ 0.1 risk
      const unMom = typeof mr.unChg === 'number' ? Math.max(0, Math.min(1, mr.unChg * 0.5)) : undefined;
      // Sentiment: low percentile => risk (1 - pct)
      const csIndex = csSeries.indexOf(mr.cs);
      const sentimentRisk = (csIndex >= 0 && csRanks.length) ? (1 - csRanks[csIndex]) : undefined;

      components.push({ date: mr.date, recNBER, termSpread: ts, ipMomentum: ipMom, unMomentum: unMom, sentimentRisk });
    }

    // Composite probability: weighted average of available components
    const weights = { recNBER: 0.35, termSpread: 0.25, ipMomentum: 0.15, unMomentum: 0.15, sentimentRisk: 0.10 };
    const composite = components.map(c => {
      let wSum = 0, vSum = 0;
      (Object.keys(weights) as (keyof typeof weights)[]).forEach(k => {
        const v = c[k as keyof typeof c] as number | undefined;
        if (typeof v === 'number' && Number.isFinite(v)) { wSum += weights[k]; vSum += v * weights[k]; }
      });
      const prob = wSum ? vSum / wSum : 0;
      return { date: c.date, probability: + (prob * 100).toFixed(1), components: c };
    });

    const last24M = composite.slice(-24);
    const latest = last24M[last24M.length - 1] || composite[composite.length - 1];

    return NextResponse.json({
      success: true,
      realtime: true,
      source: 'FRED',
      lastUpdated: new Date().toISOString(),
      latest: latest ? { date: latest.date, probability: latest.probability } : null,
      history: last24M,
    });
  } catch (e) {
    console.error('Global Recession Probability error:', e);
    // No synthetic fallback per policy
    return NextResponse.json({ success: false, error: 'Unavailable' }, { status: 503 });
  }
}
