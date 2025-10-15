import { NextResponse } from 'next/server';

// Placeholder generator for Q-CTA Position indicator.
// Replace with real upstream fetch when available (e.g. from a CTA model vendor or internal calc).
// The series is deterministic (no randomness) so UI doesn't jitter across reloads.
function buildSeries(days: number = 180) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const series: Array<{ time: number; value: number }> = [];
  // Synthetic curve: slow oscillation (sin) + gentle upward drift + bounded 0-100.
  for (let i = days - 1; i >= 0; i--) {
    const t = now - i * dayMs;
    // Base oscillation (approx 40 day cycle)
    const theta = (i / 40) * Math.PI * 2;
    const osc = Math.sin(theta) * 20; // +/-20
    const drift = (days - i) * 0.05; // slow drift upward
    const base = 50 + osc + drift; // center at 50
    // Clamp 0..100
    const value = Math.min(100, Math.max(0, Number(base.toFixed(2))));
    series.push({ time: t, value });
  }
  return series;
}

export async function GET() {
  try {
    // In future: if process.env.QCTA_API_KEY exists, call real provider.
    const series = buildSeries(200);
    const latest = series[series.length - 1];
    return NextResponse.json({
      success: true,
      data: {
        series,
        latest,
        source: process.env.QCTA_API_KEY ? 'upstream-provider' : 'placeholder',
      },
      lastUpdated: new Date().toISOString(),
      note: 'Placeholder synthetic Q-CTA Position (0–100). Replace route logic with real data source when available.'
    }, { status: 200 });
  } catch (e: any) {
    console.error('q-cta-position route error', e);
    return NextResponse.json({ success: false, error: 'Failed to build Q-CTA Position series' }, { status: 500 });
  }
}
