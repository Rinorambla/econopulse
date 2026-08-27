'use client';

// In-house Economic Calendar — real events from /api/economic-calendar
// (ForexFactory weekly feed → FMP → TradingEconomics fallbacks).
// Grouped by day, importance filter, auto-refresh. Replaces the Tradays iframe.
import { useEffect, useMemo, useState } from 'react';

type EconEvent = {
  date: string; time?: string; region: string; event: string;
  importance: 'High' | 'Medium' | 'Low'; previous?: string; forecast?: string; actual?: string;
};

const FLAGS: Record<string, string> = {
  'united states': '🇺🇸', 'euro area': '🇪🇺', 'eurozone': '🇪🇺', 'united kingdom': '🇬🇧',
  japan: '🇯🇵', canada: '🇨🇦', australia: '🇦🇺', 'new zealand': '🇳🇿', switzerland: '🇨🇭',
  china: '🇨🇳', germany: '🇩🇪', france: '🇫🇷', italy: '🇮🇹', spain: '🇪🇸',
};
const flagFor = (region: string) => FLAGS[region.toLowerCase()] || '🌐';

const DOT: Record<EconEvent['importance'], string> = {
  High: 'bg-red-400', Medium: 'bg-amber-400', Low: 'bg-slate-500',
};

export default function EconomicCalendarPanel({ height = 400 }: { height?: number }) {
  const [events, setEvents] = useState<EconEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [minImp, setMinImp] = useState<'All' | 'Medium' | 'High'>('Medium');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/economic-calendar?days=14', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
        if (!r.ok) return;
        const j = await r.json();
        if (alive && Array.isArray(j?.data)) setEvents(j.data);
      } catch { /* keep previous */ }
      finally { if (alive) setLoading(false); }
    };
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 10 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const grouped = useMemo(() => {
    const filtered = events.filter(e =>
      e.date >= todayStr &&
      (minImp === 'All' || (minImp === 'Medium' ? e.importance !== 'Low' : e.importance === 'High'))
    );
    const map = new Map<string, EconEvent[]>();
    for (const e of filtered) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [events, minImp, todayStr]);

  const dayLabel = (d: string) => {
    const dt = new Date(`${d}T12:00:00Z`);
    const label = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return d === todayStr ? `Today · ${label}` : label;
  };

  return (
    <div className="flex flex-col" style={{ height }}>
      <div className="flex items-center justify-between px-3 pt-2 pb-1.5">
        <span className="text-[10px] text-gray-500">Next 14 days · auto-refresh</span>
        <div className="inline-flex rounded-md bg-slate-900/60 border border-slate-800 p-0.5 gap-0.5">
          {(['High', 'Medium', 'All'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMinImp(m)}
              className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors ${minImp === m ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white hover:bg-slate-800'}`}
            >
              {m === 'Medium' ? 'Med+' : m}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
        {loading && !events.length && (
          <div className="space-y-2 p-2">{[...Array(8)].map((_, i) => <div key={i} className="h-7 bg-slate-800/40 rounded animate-pulse" />)}</div>
        )}
        {!loading && grouped.length === 0 && (
          <div className="p-6 text-center text-[11px] text-gray-500">No upcoming events for this filter.</div>
        )}
        {grouped.map(([date, list]) => (
          <div key={date}>
            <div className={`sticky top-0 z-10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${date === todayStr ? 'text-blue-300' : 'text-gray-400'} bg-[#0d1424]/95 backdrop-blur border-b border-slate-800/60`}>
              {dayLabel(date)}
              <span className="ml-2 text-gray-600 font-normal normal-case">{list.length} events</span>
            </div>
            {list.map((e, i) => (
              <div key={`${date}-${i}`} className="grid grid-cols-[52px_1fr_auto] gap-2 items-center px-2 py-1.5 border-b border-slate-800/40 hover:bg-white/[0.03]">
                <div className="text-[9.5px] font-mono text-gray-500">{e.time ? e.time.replace(' ET', '') : '—'}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT[e.importance]}`} title={e.importance} />
                    <span className="text-[11px]" aria-hidden>{flagFor(e.region)}</span>
                    <span className="text-[11px] text-gray-100 font-medium truncate">{e.event}</span>
                  </div>
                  <div className="text-[9px] text-gray-500 ml-6">{e.region}</div>
                </div>
                <div className="text-right text-[9.5px] tabular-nums whitespace-nowrap">
                  {e.actual && e.actual !== '-' && <div><span className="text-gray-500">Act </span><span className="text-white font-semibold">{e.actual}</span></div>}
                  {e.forecast && <div><span className="text-gray-500">Fcst </span><span className="text-blue-300">{e.forecast}</span></div>}
                  {e.previous && <div><span className="text-gray-500">Prev </span><span className="text-gray-300">{e.previous}</span></div>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
