'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';

// Economic calendar panel on EconoPulse's own feed (/api/economic-calendar:
// ForexFactory schedule + official actuals). Terminal styling, day / impact /
// region filters and a countdown to the next high-impact release.

export type CalEvent = {
  date: string; time?: string; region: string; event: string;
  importance: 'High' | 'Medium' | 'Low';
  previous?: string; forecast?: string; actual?: string; source?: string;
};

const REGION_CODE: Record<string, string> = {
  'united states': 'US', 'euro area': 'EU', 'eurozone': 'EU', 'united kingdom': 'GB', japan: 'JP',
  canada: 'CA', australia: 'AU', 'new zealand': 'NZ', switzerland: 'CH', china: 'CN',
  germany: 'DE', france: 'FR', italy: 'IT', spain: 'ES',
};
const codeFor = (region: string) => REGION_CODE[region.toLowerCase()] || region.slice(0, 2).toUpperCase();

type Impact = 'all' | 'high' | 'highmed';

// Minutes a zone is ahead of UTC at a given instant (negative for the Americas).
function tzOffsetMinutes(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(at);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return (Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute')) - at.getTime()) / 60000;
}

// Feed times are US Eastern ("08:30 ET"); resolve to an absolute instant.
function eventInstant(ev: CalEvent): Date | null {
  const m = ev.time?.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const [y, mo, d] = ev.date.split('-').map(Number);
  const guess = new Date(Date.UTC(y, mo - 1, d, Number(m[1]), Number(m[2])));
  return new Date(guess.getTime() - tzOffsetMinutes('America/New_York', guess) * 60000);
}

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

export default function MacroCalendarPanel({ fill }: { fill: boolean }) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [impact, setImpact] = useState<Impact>('highmed');
  const [region, setRegion] = useState<string>('ALL');
  const [day, setDay] = useState<string>('ALL');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/economic-calendar?days=14', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
        const j = await r.json();
        if (alive && Array.isArray(j?.data)) setEvents(j.data);
      } catch { /* keep previous */ }
      finally { if (alive) setLoading(false); }
    };
    load();
    const poll = setInterval(() => { if (!document.hidden) load(); }, 5 * 60 * 1000);
    const tick = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => { alive = false; clearInterval(poll); clearInterval(tick); };
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const regions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) counts.set(codeFor(e.region), (counts.get(codeFor(e.region)) || 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [events]);

  const days = useMemo(() => Array.from(new Set(events.map((e) => e.date))).filter((d) => d >= today).sort(), [events, today]);

  const visible = useMemo(() => events.filter((e) =>
    e.date >= today &&
    (impact === 'all' || e.importance === 'High' || (impact === 'highmed' && e.importance === 'Medium')) &&
    (region === 'ALL' || codeFor(e.region) === region) &&
    (day === 'ALL' || e.date === day)
  ), [events, today, impact, region, day]);

  const nextHigh = useMemo(() => {
    let best: { ev: CalEvent; at: number } | null = null;
    for (const e of events) {
      if (e.importance !== 'High' || (e.actual && e.actual !== '-')) continue;
      const at = eventInstant(e)?.getTime();
      if (at == null || at < now - 60000) continue;
      if (!best || at < best.at) best = { ev: e, at };
    }
    return best;
  }, [events, now]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of visible) { const a = m.get(e.date) || []; a.push(e); m.set(e.date, a); }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);

  const chip = (active: boolean, extra = '') =>
    `rounded-md border px-2 py-1 text-[11px] transition-colors ${active ? 'border-amber-500/50 bg-amber-500/15 text-amber-200' : 'border-slate-800 bg-slate-900 text-gray-400 hover:border-slate-600 hover:text-gray-200'} ${extra}`;

  return (
    <div className={`flex flex-col ${fill ? 'min-h-0 flex-1' : ''}`}>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-800 bg-slate-950/60 px-3 py-2">
        <div className="flex gap-1">
          {([['highmed', 'High + Med'], ['high', 'High only'], ['all', 'All']] as [Impact, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setImpact(v)} className={chip(impact === v)}>{l}</button>
          ))}
        </div>
        <span className="hidden h-4 w-px bg-slate-700 sm:block" />
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setRegion('ALL')} className={chip(region === 'ALL', 'font-mono')}>ALL</button>
          {regions.map((c) => (
            <button key={c} onClick={() => setRegion(c)} className={chip(region === c, 'font-mono font-bold')}>{c}</button>
          ))}
        </div>
        <span className="hidden h-4 w-px bg-slate-700 sm:block" />
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setDay('ALL')} className={chip(day === 'ALL')}>2 weeks</button>
          {days.map((d) => (
            <button key={d} onClick={() => setDay(d)} className={chip(day === d)}>{dayLabel(d, today)}</button>
          ))}
        </div>
        {nextHigh && (
          <div className="ml-auto flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px]">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-red-300">Next high</span>
            <span className="font-mono font-bold text-red-200">{codeFor(nextHigh.ev.region)}</span>
            <span className="max-w-[260px] truncate text-gray-200">{nextHigh.ev.event}</span>
            <span className="font-mono text-amber-300">in {fmtCountdown(nextHigh.at - now)}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={`overflow-auto ${fill ? 'min-h-0 flex-1' : 'max-h-[560px]'}`}>
        {loading && <div className="p-10 text-center text-sm text-gray-500">Loading economic calendar…</div>}
        {!loading && byDay.length === 0 && <div className="p-10 text-center text-sm text-gray-500">No events match these filters.</div>}
        {!loading && byDay.length > 0 && (
          <table className="w-full min-w-[760px] text-[12px]">
            <thead className="sticky top-0 z-10 bg-slate-900 text-left font-mono text-[9px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="pl-3 pr-2 py-1.5 font-semibold">Time</th>
                <th className="px-2 py-1.5 font-semibold">Ctry</th>
                <th className="px-2 py-1.5 font-semibold">Event</th>
                <th className="px-2 py-1.5 text-right font-semibold">Actual</th>
                <th className="px-2 py-1.5 text-right font-semibold">Forecast</th>
                <th className="px-2 pr-3 py-1.5 text-right font-semibold">Previous</th>
              </tr>
            </thead>
            <tbody>
              {byDay.map(([d, list]) => (
                <Fragment key={d}>
                  <tr className="bg-slate-950/80">
                    <td colSpan={6} className={`pl-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${d === today ? 'text-amber-300' : 'text-gray-400'}`}>
                      {new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })}{d === today ? ' · today' : ''}
                    </td>
                  </tr>
                  {list.map((e, i) => {
                    const at = eventInstant(e);
                    const released = !!e.actual && e.actual !== '-';
                    const past = at ? at.getTime() < now : false;
                    const isNext = nextHigh?.ev === e;
                    const a = num(e.actual), f = num(e.forecast) ?? num(e.previous);
                    const tone = released && a != null && f != null && a !== f ? (a > f ? 'text-emerald-400' : 'text-red-400') : 'text-gray-100';
                    return (
                      <tr key={`${d}-${i}`} className={`border-t border-slate-800/60 transition-colors hover:bg-slate-800/40 ${isNext ? 'bg-red-500/5' : ''} ${past && !released ? 'opacity-70' : ''}`}>
                        <td className="pl-3 pr-2 py-1.5 whitespace-nowrap font-mono text-[11px] text-gray-400">
                          {at ? at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap font-mono text-[11px] font-bold text-gray-300">{codeFor(e.region)}</td>
                        <td className="px-2 py-1.5 text-gray-200">
                          <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${e.importance === 'High' ? 'bg-red-400' : e.importance === 'Medium' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                          {e.event}
                          {isNext && <span className="ml-2 rounded bg-red-500/15 px-1 font-mono text-[9px] font-bold uppercase tracking-wider text-red-300">next</span>}
                        </td>
                        <td className={`px-2 py-1.5 text-right font-bold whitespace-nowrap ${tone}`}>{released ? e.actual : <span className="font-normal text-gray-600">—</span>}</td>
                        <td className="px-2 py-1.5 text-right whitespace-nowrap text-gray-400">{e.forecast || '—'}</td>
                        <td className="px-2 pr-3 py-1.5 text-right whitespace-nowrap text-gray-500">{e.previous || '—'}</td>
                      </tr>
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
        <span>· times in your local zone · actual green/red vs forecast · refreshes every 5 min</span>
      </div>
    </div>
  );
}
