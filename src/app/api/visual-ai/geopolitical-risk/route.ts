import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { GeoRiskPoint } from '@/models/GeoRiskPoint'

interface GeoRiskPoint {
  date: string
  gpr: number
  change: number
  percentile: number
  regime: 'low' | 'moderate' | 'elevated' | 'crisis'
}

let cache: { ts: number; data: GeoRiskPoint[] } | null = null
const TTL = 1000 * 60 * 60 * 6 // 6h

function classify(gpr: number): GeoRiskPoint['regime'] {
  if (gpr < 70) return 'low'
  if (gpr < 110) return 'moderate'
  if (gpr < 160) return 'elevated'
  return 'crisis'
}

// If DB is empty, we attempt a real-data remote fetch from the official Caldara-Iacoviello CSV
// with a short timeout and lightweight CSV parsing (no extra deps). This keeps the widget useful
// even before database ingestion. Data is cached in-memory for TTL.

const REMOTE_SOURCES = [
  'https://www.policyuncertainty.com/media/GPR_World.csv',
  'https://www2.bc.edu/matteo-iacoviello/gpr_files/GPR_World.csv'
];

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' as any });
    return res.ok ? res : null;
  } catch { return null; }
  finally { clearTimeout(t); }
}

function parseGPRCsv(text: string): GeoRiskPoint[] {
  const lines = text.trim().split(/\r?\n/);
  // find header and detect columns (assume first two are date, value)
  const out: GeoRiskPoint[] = [];
  let prev: number | null = null;
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    if (row.length < 2) continue;
    const rawDate = row[0].trim();
    const rawVal = row[1].trim();
    const val = Number(rawVal);
    if (!isFinite(val)) continue;
    // Normalize date: handle formats like 1985:01, 1985-01, 1985M1, etc.
    const m = rawDate.match(/(\d{4})[^0-9]?(\d{1,2})/);
    if (!m) continue;
    const year = m[1];
    const month = m[2].padStart(2, '0');
    const iso = `${year}-${month}-01`;
    const change = prev == null ? 0 : Number((val - prev).toFixed(1));
    prev = val;
    out.push({
      date: iso,
      gpr: Number(val.toFixed(1)),
      change,
      percentile: 0, // compute below
      regime: 'moderate'
    });
  }
  if (!out.length) return out;
  const values = out.map(o => o.gpr);
  const min = Math.min(...values);
  const max = Math.max(...values);
  out.forEach(o => {
    o.percentile = Math.round(((o.gpr - min) / (max - min || 1)) * 100);
    o.regime = classify(o.gpr);
  });
  return out;
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < TTL) {
      return NextResponse.json({ success:true, source:'cache', data: cache.data, lastUpdated: new Date(cache.ts).toISOString() })
    }
  // Attempt to load existing stored series (if previously ingested offline)
    let data: GeoRiskPoint[] = []
    // Try persist and compute extended percentile vs DB history
    let dbConnected = false
    try { await connectDB(); dbConnected = true } catch {}
    if (dbConnected) {
      const hist = await GeoRiskPoint.find({}).sort({ date: 1 }).lean()
      const values = hist.map(h=>h.gpr)
      if (values.length) {
        const max = Math.max(...values)
        const min = Math.min(...values)
        data = hist.map(h => ({
          date: h.date,
          gpr: h.gpr,
          change: h.change,
            percentile: Math.round(((h.gpr - min)/(max-min||1))*100),
          regime: h.regime
        }))
      }
    }
    if (!data.length) {
      // Try remote real-data sources with short timeout
      let remoteText: string | null = null;
      for (const url of REMOTE_SOURCES) {
        const res = await fetchWithTimeout(url, 6000);
        if (res) { remoteText = await res.text(); break; }
      }
      if (remoteText) {
        const parsed = parseGPRCsv(remoteText);
        if (parsed.length) {
          // Limit to last 10 years to keep payload smaller
          const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 10);
          data = parsed.filter(p => new Date(p.date) >= cutoff);
          cache = { ts: Date.now(), data }
          return NextResponse.json({ success:true, source:'remote', data, lastUpdated: new Date().toISOString() })
        }
      }
      return NextResponse.json({ success:true, availability:'unavailable', data: [], source:'Caldara-Iacoviello GPR (not ingested)', lastUpdated:new Date().toISOString(), note:'No DB series and remote source not reachable.' })
    }
    cache = { ts: Date.now(), data }
    const crisis = data.filter(d=>d.regime==='crisis')
    return NextResponse.json({ success:true, source:'database', data, crisis: crisis.map(c=>({ date:c.date, gpr:c.gpr })), lastUpdated: new Date().toISOString() })
  } catch (e:any) {
    return NextResponse.json({ success:false, error:e.message, data: [], availability:'error' }, { status:500 })
  }
}
