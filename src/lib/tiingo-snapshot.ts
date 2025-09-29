// Tiingo Snapshot Manager - aggiorna dataset completo 2-3 volte al giorno
import { TiingoUnifiedAPI } from './tiingo-unified'

export interface SnapshotMeta {
  lastUpdate: number
  refreshing: boolean
  symbols: number
  categories: string[]
}

interface SnapshotStore {
  data: any[]
  meta: SnapshotMeta
  refreshPromise: Promise<void> | null
}

const store: SnapshotStore = {
  data: [],
  meta: { lastUpdate: 0, refreshing: false, symbols: 0, categories: [], },
  refreshPromise: null
}

// Aggiorna se più vecchio di 6 ore o forzato
const STALE_MS = 1000 * 60 * 60 * 6
const AUTO_INTERVAL_MS = 1000 * 60 * 30 // ogni 30 minuti controlla

export function shouldRefresh(force?: boolean) {
  if (force) return true
  if (!store.meta.lastUpdate) return true
  return Date.now() - store.meta.lastUpdate > STALE_MS
}

export async function ensureSnapshot(force = false) {
  if (!shouldRefresh(force)) return
  if (store.meta.refreshing) return store.refreshPromise

  const apiKey = process.env.TIINGO_API_KEY
  if (!apiKey) return

  store.meta.refreshing = true
  store.refreshPromise = (async () => {
    try {
      const api = new TiingoUnifiedAPI(apiKey)
      const data = await api.fetchAllMarketData('all')
      store.data = data
      store.meta.lastUpdate = Date.now()
      store.meta.symbols = data.length
      store.meta.categories = [...new Set(data.map(d => d.category))]
      console.log(`💾 Snapshot aggiornato: ${data.length} assets @ ${new Date(store.meta.lastUpdate).toISOString()}`)
    } catch (e) {
      console.error('❌ Snapshot refresh error', e)
    } finally {
      store.meta.refreshing = false
      store.refreshPromise = null
    }
  })()
  return store.refreshPromise
}

export function getSnapshot(category?: string) {
  if (!category || category === 'all') return store.data
  const lc = category.toLowerCase()
  return store.data.filter(a => (a.category || '').toLowerCase() === lc)
}

export function getSnapshotMeta() { return store.meta }

// Avvio iniziale lazily: la prima richiesta lo triggerà.
// Scheduler periodico leggero
if (typeof global !== 'undefined' && !(global as any).__TIINGO_SNAPSHOT_INTERVAL__) {
  ;(global as any).__TIINGO_SNAPSHOT_INTERVAL__ = setInterval(() => {
    ensureSnapshot(false)
  }, AUTO_INTERVAL_MS)
  console.log('⏱️ Snapshot auto-refresher attivato (30m)')
}
