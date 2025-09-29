import fs from 'fs'
import path from 'path'
import { fetchYahooMarket } from './yahoo-unified'

const SNAP_DIR = path.join(process.cwd(), 'data-snapshots')
if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR)

export interface SnapshotMeta { timestamp: string; category: string; count: number; file: string }

export async function createSnapshot(category='all') {
  const data = await fetchYahooMarket(category)
  const ts = new Date().toISOString().replace(/[:.]/g,'-')
  const file = path.join(SNAP_DIR, `${category}-${ts}.json`)
  fs.writeFileSync(file, JSON.stringify({ timestamp: new Date().toISOString(), category, data }, null, 2))
  return { timestamp: ts, category, count: data.length, file }
}

export function listSnapshots(category?: string): SnapshotMeta[] {
  const files = fs.readdirSync(SNAP_DIR).filter(f=>f.endsWith('.json'))
  return files
    .filter(f => !category || f.startsWith(category+"-"))
    .map(f => {
      const full = path.join(SNAP_DIR, f)
      const raw = JSON.parse(fs.readFileSync(full,'utf8'))
      return { timestamp: raw.timestamp, category: raw.category, count: raw.data.length, file: f }
    })
    .sort((a,b)=> a.timestamp < b.timestamp ? 1 : -1)
}

export function loadSnapshot(file: string) {
  const full = path.join(SNAP_DIR, file)
  if (!fs.existsSync(full)) return null
  return JSON.parse(fs.readFileSync(full,'utf8'))
}
