// Server-only: EconomicsAPI (economicsapi.com) — latest macro indicators for ~50
// countries (IMF/BIS/central-bank sourced; daily policy rates, monthly CPI, quarterly
// GDP growth). The free plan allows 100 calls/month, and GET /v1/latest returns every
// country+indicator in one call, so we cache the full snapshot on disk for 24h
// (~30 calls/month) and serve stale data on failure.

import fs from 'fs';
import path from 'path';
import { env } from '@/lib/env';

export interface EconApiRow {
  series_id: string;
  country_id: string; // ISO3
  country: string;
  kpi_id: string; // e.g. 'PR.CPI.Yoy'
  indicator: string;
  latest_value: number;
  latest_value_date: string;
  previous_value: number | null;
  previous_value_date: string | null;
  unit: string;
  frequency: string;
}

/** ISO3 → (kpi_id → row) */
export type EconApiSnapshot = Map<string, Map<string, EconApiRow>>;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_FILE = path.join(process.cwd(), 'data-snapshots', 'economicsapi-latest.json');

interface CacheShape {
  fetchedAt: string;
  rows: EconApiRow[];
}

let memCache: { at: number; snapshot: EconApiSnapshot } | null = null;

function buildSnapshot(rows: EconApiRow[]): EconApiSnapshot {
  const map: EconApiSnapshot = new Map();
  for (const row of rows) {
    if (!row?.country_id || !row?.kpi_id || !Number.isFinite(row.latest_value)) continue;
    let byKpi = map.get(row.country_id);
    if (!byKpi) {
      byKpi = new Map();
      map.set(row.country_id, byKpi);
    }
    byKpi.set(row.kpi_id, row);
  }
  return map;
}

function readDisk(): CacheShape | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as CacheShape;
  } catch {
    return null;
  }
}

function writeDisk(data: CacheShape): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch {
    /* non-fatal */
  }
}

/**
 * Latest macro snapshot for all covered countries, or null when the key is missing
 * and no cached data exists. Never throws.
 */
export async function getEconomicsApiLatest(): Promise<EconApiSnapshot | null> {
  if (memCache && Date.now() - memCache.at < CACHE_TTL_MS) return memCache.snapshot;

  const disk = readDisk();
  if (disk && Date.now() - new Date(disk.fetchedAt).getTime() < CACHE_TTL_MS) {
    const snapshot = buildSnapshot(disk.rows);
    memCache = { at: new Date(disk.fetchedAt).getTime(), snapshot };
    return snapshot;
  }

  const key = env.ECONOMICSAPI_KEY;
  if (key) {
    try {
      const res = await fetch('https://api.economicsapi.com/v1/latest', {
        headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const js = await res.json();
        const rows: EconApiRow[] = Array.isArray(js?.data) ? js.data : [];
        if (rows.length) {
          writeDisk({ fetchedAt: new Date().toISOString(), rows });
          const snapshot = buildSnapshot(rows);
          memCache = { at: Date.now(), snapshot };
          return snapshot;
        }
      }
    } catch {
      /* fall through to stale cache */
    }
  }

  // Serve stale data rather than nothing (rate limit / outage / missing key).
  if (disk) {
    const snapshot = buildSnapshot(disk.rows);
    memCache = { at: Date.now(), snapshot }; // avoid refetch storms
    return snapshot;
  }
  return null;
}
