'use client';

import { useEffect, useMemo, useState } from 'react';

interface EconEvent {
  date: string;
  time?: string;
  region: string;
  event: string;
  importance: 'High' | 'Medium' | 'Low';
  previous?: string;
  forecast?: string;
  actual?: string;
  source?: string;
}

interface ApiResponse {
  ok: boolean;
  data: EconEvent[];
  count: number;
  lastUpdate?: string;
  source?: string;
}

const FLAGS: Record<string, string> = {
  'united states': '🇺🇸', 'usa': '🇺🇸', 'us': '🇺🇸',
  'euro area': '🇪🇺', 'european union': '🇪🇺', 'eu': '🇪🇺',
  'germany': '🇩🇪', 'de': '🇩🇪',
  'italy': '🇮🇹', 'it': '🇮🇹',
  'france': '🇫🇷', 'fr': '🇫🇷',
  'united kingdom': '🇬🇧', 'uk': '🇬🇧', 'gb': '🇬🇧',
  'japan': '🇯🇵', 'jp': '🇯🇵',
  'china': '🇨🇳', 'cn': '🇨🇳',
  'canada': '🇨🇦', 'ca': '🇨🇦',
  'australia': '🇦🇺', 'au': '🇦🇺',
  'switzerland': '🇨🇭', 'ch': '🇨🇭',
  'spain': '🇪🇸', 'es': '🇪🇸',
  'india': '🇮🇳', 'in': '🇮🇳',
  'brazil': '🇧🇷', 'br': '🇧🇷',
  'mexico': '🇲🇽', 'mx': '🇲🇽',
  'south korea': '🇰🇷', 'kr': '🇰🇷',
  'new zealand': '🇳🇿', 'nz': '🇳🇿',
};

const flagFor = (region: string) => FLAGS[region.toLowerCase()] || '🌐';

const impColor = (imp: string) => {
  if (imp === 'High') return 'bg-red-500/20 text-red-300 border-red-500/40';
  if (imp === 'Medium') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
};

const impDots = (imp: string) => {
  if (imp === 'High') return 3;
  if (imp === 'Medium') return 2;
  return 1;
};

function formatDateLabel(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);
    const dd = new Date(d);
    dd.setHours(0, 0, 0, 0);
    if (dd.getTime() === today.getTime()) return 'Today';
    if (dd.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return dd.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function EconomicCalendarFMP({ days = 7, height = 360 }: { days?: number; height?: number | string }) {
  const [events, setEvents] = useState<EconEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('high');
  const [source, setSource] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/economic-calendar?days=${days}`, { cache: 'no-store' });
        const json: ApiResponse = await res.json();
        if (cancel) return;
        if (json?.ok && Array.isArray(json.data)) {
          setEvents(json.data);
          setSource(json.source || '');
          setLastUpdate(json.lastUpdate || '');
        } else {
          setError('No data available');
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [days]);

  const filtered = useMemo(() => {
    let arr = events;
    if (filter === 'high') arr = arr.filter(e => e.importance === 'High');
    else if (filter === 'medium') arr = arr.filter(e => e.importance === 'High' || e.importance === 'Medium');
    return arr.slice().sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  }, [events, filter]);

  const grouped = useMemo(() => {
    const g: Record<string, EconEvent[]> = {};
    for (const ev of filtered) {
      if (!g[ev.date]) g[ev.date] = [];
      g[ev.date].push(ev);
    }
    return Object.entries(g);
  }, [filtered]);

  return (
    <div className="w-full flex flex-col bg-[#0c1222] rounded-md overflow-hidden" style={{ height }}>
      {/* Header / Filter */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">Importance:</span>
          {(['high', 'medium', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded border text-[11px] transition-colors ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
              }`}
            >
              {f === 'high' ? 'High only' : f === 'medium' ? 'Medium+' : 'All'}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-gray-500">
          {source && <span className="uppercase tracking-wide">{source === 'live' ? 'FMP live' : source}</span>}
          {lastUpdate && <span className="ml-2">{new Date(lastUpdate).toLocaleTimeString()}</span>}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading && (
          <div className="p-4 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        )}
        {error && !loading && (
          <div className="p-6 text-center text-sm text-red-400">{error}</div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-500">No events match this filter.</div>
        )}
        {!loading && !error && grouped.map(([date, items]) => (
          <div key={date}>
            <div className="sticky top-0 z-10 px-3 py-1.5 bg-[#0c1222]/95 backdrop-blur border-b border-white/5 text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
              {formatDateLabel(date)}
            </div>
            <div className="divide-y divide-white/5">
              {items.map((ev, idx) => (
                <div
                  key={`${date}-${idx}-${ev.event}`}
                  className="grid grid-cols-12 gap-2 px-3 py-2 hover:bg-white/[0.03] transition-colors text-xs"
                >
                  <div className="col-span-1 flex items-center text-base" title={ev.region}>
                    {flagFor(ev.region)}
                  </div>
                  <div className="col-span-1 flex items-center text-gray-400 font-mono text-[11px]">
                    {ev.time || '—'}
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border ${impColor(ev.importance)}`}>
                      {Array.from({ length: impDots(ev.importance) }).map((_, i) => (
                        <span key={i} className="inline-block w-1 h-1 rounded-full bg-current" />
                      ))}
                    </span>
                  </div>
                  <div className="col-span-5 flex items-center text-gray-200 truncate" title={ev.event}>
                    {ev.event}
                  </div>
                  <div className="col-span-1 flex items-center justify-end text-gray-500 text-[11px]" title="Previous">
                    {ev.previous || '—'}
                  </div>
                  <div className="col-span-1 flex items-center justify-end text-amber-300/80 text-[11px]" title="Forecast">
                    {ev.forecast || '—'}
                  </div>
                  <div className="col-span-2 flex items-center justify-end font-semibold text-[11px]">
                    {ev.actual && ev.actual !== '-' ? (
                      <span className="text-emerald-400">{ev.actual}</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer legend */}
      <div className="px-3 py-1.5 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-[10px] text-gray-500">
        <div className="flex items-center gap-3">
          <span>Prev</span>
          <span className="text-amber-300/80">Forecast</span>
          <span className="text-emerald-400">Actual</span>
        </div>
        <div>{filtered.length} events</div>
      </div>
    </div>
  );
}
