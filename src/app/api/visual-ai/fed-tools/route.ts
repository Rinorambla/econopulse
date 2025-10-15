import { NextResponse } from 'next/server';
import { fredService } from '@/lib/fred';

// Fed Tools via FRED series
// - WALCL: Fed total assets (H.4.1)
// - IORB: Interest on Reserve Balances
// - RRPONTSYD: Overnight Reverse Repo (total)
// - DFF: Effective Federal Funds Rate
// - SOFR: Secured Overnight Financing Rate

type SeriesKey = 'WALCL' | 'IORB' | 'RRPONTSYD' | 'DFF' | 'SOFR';

export async function GET() {
  try {
    const series: SeriesKey[] = ['WALCL', 'IORB', 'RRPONTSYD', 'DFF', 'SOFR'];

    // Fetch last ~180 days to draw compact sparklines
    const fetchHistory = async (id: string) => {
      const json = await fredService.getEconomicIndicator(id, 180);
      const obs = (json?.observations || [])
        .filter((o: any) => o && o.value !== '.' && o.value !== null && o.value !== '')
        .map((o: any) => ({ date: o.date, value: Number(o.value) }))
        .filter((o: any) => Number.isFinite(o.value));
      const latest = obs[0] || null; // API called with sort desc
      return { id, latest, history: obs.reverse() }; // reverse ascending for charts
    };

    const results = await Promise.all(series.map(s => fetchHistory(s)));

    // Shape data for UI
    const data = results.map(r => ({
      id: r.id,
      latest: r.latest,
      history: r.history,
      unit: r.id === 'WALCL' ? 'USD billions' : r.id === 'RRPONTSYD' ? 'USD billions' : 'percent',
      label:
        r.id === 'WALCL' ? 'Fed Balance Sheet (WALCL)'
        : r.id === 'IORB' ? 'Interest on Reserve Balances (IORB)'
        : r.id === 'RRPONTSYD' ? 'Overnight Reverse Repo (RRP)'
        : r.id === 'DFF' ? 'Effective Fed Funds (DFF)'
        : 'SOFR',
    }));

    return NextResponse.json({ success: true, realtime: true, data, source: 'FRED', lastUpdated: new Date().toISOString() });
  } catch (e: any) {
    console.error('Fed Tools API error:', e);
    // No synthetic fallback per policy
    return NextResponse.json({ success: false, realtime: false, error: 'Fed Tools unavailable' }, { status: 503 });
  }
}
