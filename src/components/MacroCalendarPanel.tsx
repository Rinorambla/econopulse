'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

// Economic calendar panel on /api/live-calendar: this week's releases with live
// actual / forecast / previous for every country (same provider as the event
// histories) plus the schedule feed for the following days. Terminal styling,
// impact / country / day filters, next-high-impact countdown, click a released
// row to open its full history (chart + release table).

export type CalEvent = {
  id: string; ts: string; date: string; code: string; region: string; event: string;
  importance: 'High' | 'Medium' | 'Low';
  actual: string; forecast: string; previous: string; url: string; source: 'live' | 'schedule';
};

type Impact = 'all' | 'high' | 'highmed';

const num = (s?: string) => { const v = parseFloat((s || '').replace(/[^\d.-]/g, '')); return Number.isFinite(v) ? v : null; };

function fmtCountdown(ms: number): string {
  if (ms <= 0) return 'now';
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${String(m % 60).padStart(2, '0')}m`;
  return `${m}m`;
}

const dayLabel = (iso: string, today: string) =>
  iso === today ? 'Today' : new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });

// ── Per-event history: chart + release table (from /api/event-history) ──────
type HistoryData = {
  series: Array<{ t: number; v: number }>;
  rows: Array<{ date: string; period: string; actual: string; forecast: string; previous: string; tone: 'green' | 'red' | '' }>;
};
const historyCache = new Map<string, HistoryData | 'error'>();

export function EventHistory({ eventPath }: { eventPath: string }) {
  const [data, setData] = useState<HistoryData | 'error' | null>(historyCache.get(eventPath) || null);
  useEffect(() => {
    if (historyCache.has(eventPath)) { setData(historyCache.get(eventPath)!); return; }
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/event-history?event=${encodeURIComponent(eventPath)}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
        const j = await r.json();
        const d: HistoryData | 'error' = j?.ok ? { series: j.series || [], rows: j.rows || [] } : 'error';
        historyCache.set(eventPath, d);
        if (alive) setData(d);
      } catch { historyCache.set(eventPath, 'error'); if (alive) setData('error'); }
    })();
    return () => { alive = false; };
  }, [eventPath]);

  if (data === null) return <div className="py-3 text-center text-[11px] text-gray-500">Loading history…</div>;
  if (data === 'error') return <div className="py-3 text-center text-[11px] text-gray-500">History unavailable for this indicator.</div>;

  const pts = data.series.slice(-60);
  const rows = data.rows.slice(0, 14);
  const vals = pts.map((p) => p.v);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const W = 680, H = 110, PAD = 6;
  const x = (i: number) => PAD + (i / Math.max(pts.length - 1, 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);
  const up = pts.length > 1 && pts[pts.length - 1].v >= pts[0].v;
  const fmtD = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {pts.length > 1 && (
        <div>
          <div className="mb-1 flex items-center gap-2 font-mono text-[10px] text-gray-500">
            <span className="font-bold uppercase tracking-wider">History</span>
            <span className={`font-bold ${up ? 'text-emerald-400' : 'text-red-400'}`}>last {pts[pts.length - 1].v}</span>
            <span>min {min} · max {max}</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full rounded border border-slate-800 bg-slate-950" preserveAspectRatio="none">
            {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={W} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)} stroke="#1e293b" strokeWidth={1} />)}
            <polyline fill="none" stroke={up ? '#34d399' : '#f87171'} strokeWidth={1.8} points={pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')} />
            {pts.map((p, i) => <rect key={i} x={i * (W / pts.length)} y={0} width={W / pts.length} height={H} fill="transparent"><title>{`${fmtD(p.t)} — ${p.v}`}</title></rect>)}
          </svg>
          <div className="mt-0.5 flex justify-between px-0.5 font-mono text-[9px] text-gray-600">
            <span>{fmtD(pts[0].t)}</span><span>{fmtD(pts[Math.floor(pts.length / 2)].t)}</span><span>{fmtD(pts[pts.length - 1].t)}</span>
          </div>
        </div>
      )}
      {rows.length > 0 && (
        <div>
          <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-gray-500">Release by release</div>
          <div className="max-h-44 overflow-auto rounded border border-slate-800">
            <table className="w-full text-[11px]">
              <thead><tr className="sticky top-0 bg-slate-950 text-left font-mono text-[9px] uppercase tracking-wider text-gray-500">
                <th className="py-1 pl-2 pr-2 font-semibold">Period</th><th className="px-2 py-1 text-right font-semibold">Actual</th><th className="px-2 py-1 text-right font-semibold">Forecast</th><th className="py-1 pl-2 pr-2 text-right font-semibold">Previous</th>
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.date}-${i}`} className="border-t border-slate-800/50">
                    <td className="whitespace-nowrap py-1 pl-2 pr-2 text-gray-400">{r.period || new Date(r.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</td>
                    <td className={`whitespace-nowrap px-2 py-1 text-right font-bold ${r.tone === 'green' ? 'text-emerald-400' : r.tone === 'red' ? 'text-red-400' : 'text-gray-100'}`}>{r.actual || '—'}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-right text-gray-400">{r.forecast || '—'}</td>
                    <td className="whitespace-nowrap py-1 pl-2 pr-2 text-right text-gray-500">{r.previous || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel ───────────────────────────────────────────────────────────────────
export default function MacroCalendarPanel({ fill }: { fill: boolean }) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [impact, setImpact] = useState<Impact>('highmed');
  const [region, setRegion] = useState<string>('ALL');
  const [day, setDay] = useState<string>('ALL');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/live-calendar', { cache: 'no-store', signal: AbortSignal.timeout(30000) });
        const j = await r.json();
        if (alive && j?.ok && Array.isArray(j.events)) { setEvents(j.events); setFailed(false); }
        else if (alive) setFailed(true);
      } catch { if (alive) setFailed(true); }
      finally { if (alive) setLoading(false); }
    };
    load();
    // Live figures land within minutes of release.
    const poll = setInterval(() => { if (!document.hidden) load(); }, 3 * 60 * 1000);
    const tick = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => { alive = false; clearInterval(poll); clearInterval(tick); };
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const regions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) counts.set(e.code, (counts.get(e.code) || 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [events]);

  const days = useMemo(() => Array.from(new Set(events.map((e) => e.date))).sort(), [events]);

  const visible = useMemo(() => events.filter((e) =>
    (impact === 'all' || e.importance === 'High' || (impact === 'highmed' && e.importance === 'Medium')) &&
    (region === 'ALL' || e.code === region) &&
    (day === 'ALL' || e.date === day)
  ), [events, impact, region, day]);

  const nextHigh = useMemo(() => {
    let best: CalEvent | null = null;
    for (const e of events) {
      if (e.importance !== 'High' || e.actual) continue;
      const at = Date.parse(e.ts);
      if (at < now - 60000) continue;
      if (!best || at < Date.parse(best.ts)) best = e;
    }
    return best;
  }, [events, now]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of visible) { const a = m.get(e.date) || []; a.push(e); m.set(e.date, a); }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);

  const released = events.filter((e) => e.actual).length;

  // Land on today's block once the list is in (past days stay above for context).
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (scrolledRef.current || !byDay.length) return;
    const box = listRef.current;
    const row = box?.querySelector<HTMLElement>('tr[data-today="1"]');
    if (box && row) { box.scrollTop = Math.max(0, row.offsetTop - 28); scrolledRef.current = true; }
  }, [byDay]);

  const chip = (active: boolean, extra = '') =>
    `rounded-md border px-2 py-1 text-[11px] transition-colors ${active ? 'border-amber-500/50 bg-amber-500/15 text-amber-200' : 'border-slate-800 bg-slate-900 text-gray-400 hover:border-slate-600 hover:text-gray-200'} ${extra}`;

  return (
    <div className={`flex flex-col ${fill ? 'min-h-0 flex-1' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-800 bg-slate-950/60 px-3 py-2">
        <div className="flex gap-1">
          {([['highmed', 'High + Med'], ['high', 'High only'], ['all', 'All']] as [Impact, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setImpact(v)} className={chip(impact === v)}>{l}</button>
          ))}
        </div>
        <span className="hidden h-4 w-px bg-slate-700 sm:block" />
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setRegion('ALL')} className={chip(region === 'ALL', 'font-mono')}>ALL</button>
          {regions.map((c) => <button key={c} onClick={() => setRegion(c)} className={chip(region === c, 'font-mono font-bold')}>{c}</button>)}
        </div>
        <span className="hidden h-4 w-px bg-slate-700 sm:block" />
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setDay('ALL')} className={chip(day === 'ALL')}>All days</button>
          {days.map((d) => <button key={d} onClick={() => setDay(d)} className={chip(day === d)}>{dayLabel(d, today)}</button>)}
        </div>
        {nextHigh && (
          <div className="ml-auto flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px]">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-red-300">Next high</span>
            <span className="font-mono font-bold text-red-200">{nextHigh.code}</span>
            <span className="max-w-[260px] truncate text-gray-200">{nextHigh.event}</span>
            <span className="font-mono text-amber-300">in {fmtCountdown(Date.parse(nextHigh.ts) - now)}</span>
          </div>
        )}
      </div>

      <div ref={listRef} className={`overflow-auto ${fill ? 'min-h-0 flex-1' : 'max-h-[560px]'}`}>
        {loading && <div className="p-10 text-center text-sm text-gray-500">Loading economic calendar…</div>}
        {!loading && failed && events.length === 0 && <div className="p-10 text-center text-sm text-gray-500">Calendar temporarily unavailable — retrying automatically.</div>}
        {!loading && !failed && byDay.length === 0 && <div className="p-10 text-center text-sm text-gray-500">No events match these filters.</div>}
        {byDay.length > 0 && (
          <table className="w-full min-w-[760px] text-[12px]">
            <thead className="sticky top-0 z-10 bg-slate-900 text-left font-mono text-[9px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-1.5 pl-3 pr-2 font-semibold">Time</th>
                <th className="px-2 py-1.5 font-semibold">Ctry</th>
                <th className="px-2 py-1.5 font-semibold">Event</th>
                <th className="px-2 py-1.5 text-right font-semibold">Actual</th>
                <th className="px-2 py-1.5 text-right font-semibold">Forecast</th>
                <th className="py-1.5 pl-2 pr-3 text-right font-semibold">Previous</th>
              </tr>
            </thead>
            <tbody>
              {byDay.map(([d, list]) => (
                <Fragment key={d}>
                  <tr className="bg-slate-950/80" data-today={d === today ? '1' : undefined}>
                    <td colSpan={6} className={`py-1 pl-3 font-mono text-[10px] font-bold uppercase tracking-wider ${d === today ? 'text-amber-300' : 'text-gray-400'}`}>
                      {new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })}{d === today ? ' · today' : ''}
                    </td>
                  </tr>
                  {list.map((e) => {
                    const at = Date.parse(e.ts);
                    const has = !!e.actual;
                    const past = at < now;
                    const isNext = nextHigh?.id === e.id;
                    const a = num(e.actual), f = num(e.forecast) ?? num(e.previous);
                    const tone = has && a != null && f != null && a !== f ? (a > f ? 'text-emerald-400' : 'text-red-400') : 'text-gray-100';
                    const isOpen = open === e.id;
                    const canOpen = !!e.url;
                    return (
                      <Fragment key={e.id}>
                        <tr
                          onClick={() => canOpen && setOpen(isOpen ? null : e.id)}
                          className={`border-t border-slate-800/60 transition-colors hover:bg-slate-800/40 ${isNext ? 'bg-red-500/5' : ''} ${past && !has ? 'opacity-70' : ''} ${canOpen ? 'cursor-pointer' : ''} ${isOpen ? 'bg-slate-800/50' : ''}`}
                          title={canOpen ? 'Click for history' : undefined}
                        >
                          <td className="whitespace-nowrap py-1.5 pl-3 pr-2 font-mono text-[11px] text-gray-400">
                            {new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[11px] font-bold text-gray-300">{e.code}</td>
                          <td className="px-2 py-1.5 text-gray-200">
                            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${e.importance === 'High' ? 'bg-red-400' : e.importance === 'Medium' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                            {e.event}
                            {isNext && <span className="ml-2 rounded bg-red-500/15 px-1 font-mono text-[9px] font-bold uppercase tracking-wider text-red-300">next</span>}
                            {canOpen && <span className={`ml-1.5 font-mono text-[9px] ${isOpen ? 'text-sky-300' : 'text-sky-500/50'}`}>{isOpen ? '▾' : '▸'}</span>}
                          </td>
                          <td className={`whitespace-nowrap px-2 py-1.5 text-right font-bold ${tone}`}>{has ? e.actual : <span className="font-normal text-gray-600">—</span>}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right text-gray-400">{e.forecast || '—'}</td>
                          <td className="whitespace-nowrap py-1.5 pl-2 pr-3 text-right text-gray-500">{e.previous || '—'}</td>
                        </tr>
                        {isOpen && (
                          <tr className="border-t border-slate-800/40 bg-slate-950/60">
                            <td colSpan={6} className="px-3 py-2.5"><EventHistory eventPath={e.url} /></td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 border-t border-slate-800 bg-slate-900/80 px-3 py-1 font-mono text-[9px] text-gray-600">
        <span><span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 align-middle" /> high</span>
        <span><span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle" /> medium</span>
        <span><span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-600 align-middle" /> low</span>
        <span>· {events.length} events · {released} released · times in your local zone · actual green/red vs forecast · click a row for history · live refresh every 3 min</span>
      </div>
    </div>
  );
}
