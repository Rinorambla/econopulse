export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;
import { NextResponse } from 'next/server';
export async function GET() {
  const out: Record<string, unknown> = {};
  const t = async (k: string, url: string, init?: RequestInit) => {
    const t0 = Date.now();
    try { const r = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(12000) }); const txt = await r.text(); out[k] = { status: r.status, ms: Date.now() - t0, head: txt.slice(0, 80) }; }
    catch (e) { out[k] = { err: String((e as Error).message), ms: Date.now() - t0 }; }
  };
  await Promise.all([
    t('csv_ua', 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=UNRATE&cosd=2025-01-01', { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconoPulse/1.0)' } }),
    t('csv_browser_ua', 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=UNRATE&cosd=2025-01-01', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36', Accept: 'text/csv,*/*', 'Accept-Language': 'en-US,en;q=0.9' } }),
    t('api_json', 'https://api.stlouisfed.org/fred/series/observations?series_id=UNRATE&file_type=json&api_key=' + (process.env.FRED_API_KEY || 'x')),
    t('home', 'https://fred.stlouisfed.org/', { headers: { 'User-Agent': 'Mozilla/5.0' } }),
    t('dbn', 'https://api.db.nomics.world/v22/series/BLS/ln/LNS14000000?observations=1&format=json'),
  ]);
  return NextResponse.json(out);
}
