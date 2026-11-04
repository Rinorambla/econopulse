export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { buildCountryMatrixFull, ISO2_TO_SLUG } from '@/lib/tradays-calendar';

// Local/admin-only: (re)builds src/data/macro-matrix-seed.json — the committed
// full sheet for every WECO country — one country at a time, gently (3 parallel
// reads, 250 ms pause) to stay under the provider's rate limit. Not exposed in
// production: requires localhost or ADMIN_TOKEN.
//
//   GET /api/admin/build-macro-seed?country=US      → build/refresh one country
//   GET /api/admin/build-macro-seed?country=ALL     → all countries, sequential
//   &out=json  → also return the built countries in the response (for
//                serverless hosts where the filesystem is read-only; paste the
//                payload into the seed file with scripts/merge-macro-seed.cjs).

const SEED_PATH = path.join(process.cwd(), 'src', 'data', 'macro-matrix-seed.json');

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const params = new URL(req.url).searchParams;
  const token = params.get('token');
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  if (!isLocal && (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  const want = (params.get('country') || 'US').toUpperCase();
  const outJson = params.get('out') === 'json';
  const codes = want === 'ALL' ? Object.keys(ISO2_TO_SLUG) : want.split(',').filter((c) => ISO2_TO_SLUG[c]);
  if (!codes.length) return NextResponse.json({ ok: false, error: 'invalid_country' }, { status: 400 });

  let seed: { builtAt: string; countries: Record<string, unknown> } = { builtAt: new Date().toISOString(), countries: {} };
  try { seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8')); } catch { /* fresh */ }

  const built: Record<string, unknown> = {};
  const report: Record<string, string> = {};
  let wrote = false;
  for (const c of codes) {
    const t0 = Date.now();
    const m = await buildCountryMatrixFull(c, 3, 250).catch(() => null);
    if (m) {
      const payload = { months: m.months, rows: m.rows };
      seed.countries[c] = payload;
      built[c] = payload;
      seed.builtAt = new Date().toISOString();
      try { fs.writeFileSync(SEED_PATH, JSON.stringify(seed), 'utf8'); wrote = true; } catch { wrote = false; }
      report[c] = `rows=${m.rows.length} cells=${m.rows.reduce((n, r) => n + Object.keys(r.values).length, 0)} ${Math.round((Date.now() - t0) / 1000)}s`;
    } else {
      report[c] = 'FAILED';
    }
    // Breathe between countries.
    if (codes.length > 1) await new Promise((r) => setTimeout(r, 4000));
  }
  return NextResponse.json({ ok: true, builtAt: seed.builtAt, wrote, countries: Object.keys(seed.countries), report, ...(outJson ? { seed: { builtAt: seed.builtAt, countries: built } } : {}) });
}
