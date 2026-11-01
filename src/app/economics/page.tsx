'use client';

/* ─────────────────────────────────────────────
   Economics — Trading Economics-style global macro hub.
   · Worldwide economic calendar (actual / forecast / previous)
   · Automatic commentary when data is released
   · Country indicators table (GDP, inflation, unemployment, rates…)
   All data is live: /api/economic-calendar, /api/economics-releases,
   /api/country-data, /api/ai-economic-analysis.
   ───────────────────────────────────────────── */

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import PlanGate from '@/components/PlanGate';

const TradaysCalendarWidget = dynamic(() => import('@/components/TradaysCalendarWidget'), { ssr: false });

// ── Types ────────────────────────────────────────────────────────────────────
type EconEvent = {
  date: string; time?: string; region: string; event: string;
  importance: 'High' | 'Medium' | 'Low';
  previous?: string; forecast?: string; actual?: string; source?: string;
};

type CountryRow = {
  country: string; countryCode: string;
  gdp: { value: number; growth: number; date: string };
  inflation: { value: number; date: string };
  unemployment: { value: number; date: string };
  interestRate: { value: number; date: string; source: string };
  currency: { code: string; usdRate: number };
  population: { value: number; date: string };
  creditRating: string;
  realtime: boolean;
};

type GlobalStats = { totalGdp: number; averageGrowth: number; averageInflation: number; averageUnemployment: number; totalCountries: number };

type CountryIndicatorRow = {
  kpi: string; name: string; group: string;
  value: number; date: string;
  previous: number | null; previousDate: string | null;
  high: number | null; low: number | null;
  unit: string; frequency: string; source: string;
};

type CalendarRelease = {
  id: number; name: string; importance: 'High' | 'Medium' | 'Low';
  currency: string; actual: string; forecast: string; previous: string;
  releaseAt: string; url: string;
};

type CountryDetailData = {
  indicators: CountryIndicatorRow[];
  released: CalendarRelease[];
  upcoming: CalendarRelease[];
};

// Compact human format for an indicator value given its unit.
function fmtIndicator(v: number | null, unit: string): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const u = (unit || '').toLowerCase();
  if (u.includes('%')) return `${v.toFixed(2)}%`;
  const abs = Math.abs(v);
  let scaled = `${v.toFixed(2)}`;
  if (abs >= 1e12) scaled = `${(v / 1e12).toFixed(2)}T`;
  else if (abs >= 1e9) scaled = `${(v / 1e9).toFixed(2)}B`;
  else if (abs >= 1e6) scaled = `${(v / 1e6).toFixed(2)}M`;
  else if (abs >= 1e3) scaled = `${(v / 1e3).toFixed(1)}K`;
  else if (abs < 100) scaled = `${v.toFixed(abs < 2 ? 4 : 2)}`;
  if (u.startsWith('usd')) return `$${scaled}`;
  if (u.includes('lcu')) return scaled;
  return scaled;
}

// ── Flags ────────────────────────────────────────────────────────────────────
const NAME_FLAGS: Record<string, string> = {
  'united states': '🇺🇸', 'usa': '🇺🇸', 'euro area': '🇪🇺', 'eurozone': '🇪🇺', 'european union': '🇪🇺',
  'united kingdom': '🇬🇧', 'uk': '🇬🇧', japan: '🇯🇵', canada: '🇨🇦', australia: '🇦🇺',
  'new zealand': '🇳🇿', switzerland: '🇨🇭', china: '🇨🇳', germany: '🇩🇪', france: '🇫🇷',
  italy: '🇮🇹', spain: '🇪🇸', netherlands: '🇳🇱', india: '🇮🇳', brazil: '🇧🇷',
  'south korea': '🇰🇷', mexico: '🇲🇽', russia: '🇷🇺', sweden: '🇸🇪', norway: '🇳🇴',
  poland: '🇵🇱', turkey: '🇹🇷', 'south africa': '🇿🇦', singapore: '🇸🇬', 'hong kong': '🇭🇰',
  indonesia: '🇮🇩', 'saudi arabia': '🇸🇦', argentina: '🇦🇷', portugal: '🇵🇹', greece: '🇬🇷',
  austria: '🇦🇹', belgium: '🇧🇪', ireland: '🇮🇪', denmark: '🇩🇰', finland: '🇫🇮',
};

function flagFor(region: string): string {
  const r = (region || '').trim();
  // ISO-2 code (FMP style) → regional indicator emoji
  if (/^[A-Za-z]{2}$/.test(r)) {
    const up = r.toUpperCase();
    if (up === 'EA' || up === 'EU') return '🇪🇺';
    return String.fromCodePoint(...[...up].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
  }
  return NAME_FLAGS[r.toLowerCase()] || '🌐';
}

// ── Formatting helpers ──────────────────────────────────────────────────────
const fmtPct = (v: number | null | undefined, digits = 1) =>
  v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(digits)}%`;
const fmtTrn = (v: number) => (Number.isFinite(v) && v > 0 ? `$${v.toFixed(2)}T` : '—');
const fmtPop = (v: number) =>
  !Number.isFinite(v) || v <= 0 ? '—' : v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : `${(v / 1e6).toFixed(1)}M`;

// ── Per-event history: chart + month-by-month comparison table ───────────────
type EventHistoryData = {
  series: Array<{ t: number; v: number }>;
  rows: Array<{ date: string; period: string; actual: string; forecast: string; previous: string; tone: 'green' | 'red' | '' }>;
};
const eventHistoryCache = new Map<string, EventHistoryData | 'error'>();

function EventHistoryPanel({ eventPath }: { eventPath: string }) {
  const [data, setData] = useState<EventHistoryData | 'error' | null>(eventHistoryCache.get(eventPath) || null);

  useEffect(() => {
    if (eventHistoryCache.has(eventPath)) { setData(eventHistoryCache.get(eventPath)!); return; }
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/event-history?event=${encodeURIComponent(eventPath)}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
        const j = await r.json();
        const d: EventHistoryData | 'error' = j?.ok ? { series: j.series || [], rows: j.rows || [] } : 'error';
        eventHistoryCache.set(eventPath, d);
        if (alive) setData(d);
      } catch {
        eventHistoryCache.set(eventPath, 'error');
        if (alive) setData('error');
      }
    })();
    return () => { alive = false; };
  }, [eventPath]);

  if (data === null) return <div className="py-3 text-center text-[11px] text-gray-500">Loading history…</div>;
  if (data === 'error') return <div className="py-3 text-center text-[11px] text-gray-500">History unavailable for this indicator.</div>;

  const pts = data.series.slice(-48);
  const rows = data.rows.slice(0, 13);
  const vals = pts.map(p => p.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const W = 680, H = 120, PAD = 6;
  const x = (i: number) => PAD + (i / Math.max(pts.length - 1, 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);
  const up = pts.length > 1 && pts[pts.length - 1].v >= pts[0].v;
  const fmtD = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {/* Performance chart */}
      {pts.length > 1 && (
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] text-gray-500">
            <span className="font-bold uppercase tracking-wider">Performance</span>
            <span className={`font-bold ${up ? 'text-emerald-400' : 'text-red-400'}`}>Last: {pts[pts.length - 1].v}</span>
            <span>min {min} · max {max}</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28 rounded border border-slate-800 bg-slate-950" preserveAspectRatio="none">
            {[0.25, 0.5, 0.75].map(f => (
              <line key={f} x1={0} x2={W} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)} stroke="#1e293b" strokeWidth={1} />
            ))}
            <polyline
              fill="none" stroke={up ? '#34d399' : '#f87171'} strokeWidth={1.8}
              points={pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')}
            />
            {pts.map((p, i) => (
              <rect key={i} x={i * (W / pts.length)} y={0} width={W / pts.length} height={H} fill="transparent">
                <title>{`${fmtD(p.t)} — ${p.v}`}</title>
              </rect>
            ))}
          </svg>
          <div className="mt-0.5 flex justify-between px-0.5 text-[9px] text-gray-600">
            <span>{fmtD(pts[0].t)}</span>
            <span>{fmtD(pts[Math.floor(pts.length / 2)].t)}</span>
            <span>{fmtD(pts[pts.length - 1].t)}</span>
          </div>
        </div>
      )}
      {/* Month-by-month table */}
      {rows.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Month by month</div>
          <div className="overflow-auto max-h-44 rounded border border-slate-800">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-[9px] uppercase tracking-wider text-gray-500 bg-slate-950 sticky top-0">
                  <th className="pl-2 pr-2 py-1 font-semibold">Period</th>
                  <th className="px-2 py-1 text-right font-semibold">Actual</th>
                  <th className="px-2 py-1 text-right font-semibold">Forecast</th>
                  <th className="px-2 pr-2 py-1 text-right font-semibold">Previous</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.date}-${i}`} className="border-t border-slate-800/50">
                    <td className="pl-2 pr-2 py-1 text-gray-400 whitespace-nowrap">{r.period || new Date(r.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</td>
                    <td className={`px-2 py-1 text-right font-bold whitespace-nowrap ${r.tone === 'green' ? 'text-emerald-400' : r.tone === 'red' ? 'text-red-400' : 'text-gray-100'}`}>{r.actual || '—'}</td>
                    <td className="px-2 py-1 text-right text-gray-400 whitespace-nowrap">{r.forecast || '—'}</td>
                    <td className="px-2 pr-2 py-1 text-right text-gray-500 whitespace-nowrap">{r.previous || '—'}</td>
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

// ── Page ─────────────────────────────────────────────────────────────────────
type Tab = 'calendar' | 'countries';

export default function EconomicsPage() {
  return (
    <PlanGate requiredPlan="free">
      <EconomicsInner />
    </PlanGate>
  );
}

function EconomicsInner() {
  const [tab, setTab] = useState<Tab>('calendar');
  const [calendar, setCalendar] = useState<EconEvent[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loadingCal, setLoadingCal] = useState(true);
  const [loadingCty, setLoadingCty] = useState(true);
  const [sortKey, setSortKey] = useState<'gdp' | 'growth' | 'inflation' | 'unemployment' | 'rate'>('gdp');
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [countryDetail, setCountryDetail] = useState<Record<string, CountryDetailData | 'loading' | 'error'>>({});
  const [expandedRelease, setExpandedRelease] = useState<string | null>(null);

  // Full indicator set (EconomicsAPI) + live-calendar releases (Tradays widget data)
  // for an expanded country, cached per code.
  const toggleCountry = (code: string) => {
    const next = expandedCountry === code ? null : code;
    setExpandedCountry(next);
    if (!next || countryDetail[next]) return;
    setCountryDetail((m) => ({ ...m, [next]: 'loading' }));
    (async () => {
      const [indRes, calRes] = await Promise.all([
        fetch(`/api/country-indicators?country=${encodeURIComponent(next)}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) })
          .then((r) => r.json()).catch(() => null),
        fetch(`/api/calendar-releases?country=${encodeURIComponent(next)}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) })
          .then((r) => r.json()).catch(() => null),
      ]);
      const indicators: CountryIndicatorRow[] = indRes?.ok && Array.isArray(indRes.indicators) ? indRes.indicators : [];
      const released: CalendarRelease[] = calRes?.ok && Array.isArray(calRes.released) ? calRes.released : [];
      const upcoming: CalendarRelease[] = calRes?.ok && Array.isArray(calRes.upcoming) ? calRes.upcoming : [];
      setCountryDetail((m) => ({
        ...m,
        [next]: indicators.length || released.length || upcoming.length ? { indicators, released, upcoming } : 'error',
      }));
    })();
  };

  // Calendar (next 14 days) — feeds the "high-impact events today" stat card.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/economic-calendar?days=14', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
        const j = await r.json();
        if (alive && Array.isArray(j?.data)) setCalendar(j.data);
      } catch { /* keep previous */ }
      finally { if (alive) setLoadingCal(false); }
    };
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 10 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Country indicators
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/country-data', { cache: 'no-store', signal: AbortSignal.timeout(30000) });
        const j = await r.json();
        if (alive && Array.isArray(j?.data?.countries)) {
          setCountries(j.data.countries);
          if (j?.data?.global) setGlobalStats(j.data.global);
        }
      } catch { /* ignore */ }
      finally { if (alive) setLoadingCty(false); }
    })();
    return () => { alive = false; };
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);

  const sortedCountries = useMemo(() => {
    const val = (c: CountryRow) =>
      sortKey === 'gdp' ? c.gdp.value :
      sortKey === 'growth' ? c.gdp.growth :
      sortKey === 'inflation' ? c.inflation.value :
      sortKey === 'unemployment' ? c.unemployment.value :
      (Number.isFinite(c.interestRate.value) ? c.interestRate.value : -Infinity);
    return [...countries].sort((a, b) => (sortDesc ? val(b) - val(a) : val(a) - val(b)));
  }, [countries, sortKey, sortDesc]);

  const highToday = calendar.filter(e => e.date === todayStr && e.importance === 'High').length;

  const sortBtn = (key: typeof sortKey, label: string) => (
    <button
      onClick={() => { if (sortKey === key) setSortDesc(s => !s); else { setSortKey(key); setSortDesc(true); } }}
      className={`inline-flex items-center gap-1 hover:text-white transition-colors ${sortKey === key ? 'text-white' : ''}`}
    >
      {label}{sortKey === key ? (sortDesc ? ' ↓' : ' ↑') : ''}
    </button>
  );

  return (
    <div className="min-h-full bg-slate-950 text-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Global Economics</h1>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'High-impact events today', value: loadingCal ? '…' : String(highToday), accent: highToday > 0 ? 'text-red-400' : 'text-gray-200' },
            { label: `Tracked GDP (${globalStats?.totalCountries ?? '—'} countries)`, value: globalStats ? fmtTrn(globalStats.totalGdp) : '…', accent: 'text-white' },
            { label: 'Avg inflation', value: globalStats ? fmtPct(globalStats.averageInflation) : '…', accent: 'text-amber-400' },
            { label: 'Avg unemployment', value: globalStats ? fmtPct(globalStats.averageUnemployment) : '…', accent: 'text-sky-400' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
              <div className={`text-lg font-bold ${s.accent}`}>{s.value}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-900/60 border border-slate-800 p-0.5 gap-0.5">
            {([
              ['calendar', 'Live Calendar'],
              ['countries', 'Countries'],
            ] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-[12px] px-3 py-1.5 rounded-md font-semibold transition-colors ${tab === t ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white hover:bg-slate-800'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Calendar tab ── */}
        {tab === 'calendar' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2">
            <TradaysCalendarWidget height={640} />
          </div>
        )}

        {/* ── Countries tab ── */}
        {tab === 'countries' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-x-auto">
            {loadingCty && <div className="p-6 text-center text-gray-500 text-sm">Loading country indicators…</div>}
            {!loadingCty && (
              <table className="w-full text-[12px] min-w-[760px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 border-b border-slate-800 bg-slate-900/80">
                    <th className="pl-4 pr-2 py-2.5 font-semibold">Country</th>
                    <th className="px-2 py-2.5 text-right font-semibold">{sortBtn('gdp', 'GDP')}</th>
                    <th className="px-2 py-2.5 text-right font-semibold">{sortBtn('growth', 'GDP Growth')}</th>
                    <th className="px-2 py-2.5 text-right font-semibold">{sortBtn('inflation', 'Inflation')}</th>
                    <th className="px-2 py-2.5 text-right font-semibold">{sortBtn('unemployment', 'Unemployment')}</th>
                    <th className="px-2 py-2.5 text-right font-semibold">{sortBtn('rate', 'Interest Rate')}</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Population</th>
                    <th className="px-2 pr-4 py-2.5 text-right font-semibold">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCountries.map((c) => {
                    const isOpen = expandedCountry === c.countryCode;
                    const detail = countryDetail[c.countryCode];
                    return (
                      <React.Fragment key={c.countryCode}>
                        <tr
                          className={`border-b border-slate-800/60 cursor-pointer transition-colors ${isOpen ? 'bg-slate-800/40' : 'hover:bg-slate-800/30'}`}
                          onClick={() => toggleCountry(c.countryCode)}
                          title="Click for all indicators"
                        >
                          <td className="pl-4 pr-2 py-2.5 whitespace-nowrap">
                            <span className={`mr-2 inline-block text-[10px] transition-transform ${isOpen ? 'rotate-90 text-sky-300' : 'text-gray-600'}`}>▶</span>
                            <span className="mr-2">{flagFor(c.countryCode)}</span>
                            <span className="text-white font-medium">{c.country}</span>
                            <span className="ml-2 text-[10px] text-gray-600">{c.currency.code}</span>
                          </td>
                          <td className="px-2 py-2.5 text-right text-gray-200 font-semibold whitespace-nowrap">{fmtTrn(c.gdp.value)}</td>
                          <td className={`px-2 py-2.5 text-right font-semibold whitespace-nowrap ${c.gdp.growth > 0 ? 'text-emerald-400' : c.gdp.growth < 0 ? 'text-red-400' : 'text-gray-400'}`}>{fmtPct(c.gdp.growth)}</td>
                          <td className={`px-2 py-2.5 text-right whitespace-nowrap ${c.inflation.value > 4 ? 'text-red-400' : c.inflation.value > 2.5 ? 'text-amber-400' : 'text-emerald-400'}`}>{fmtPct(c.inflation.value)}</td>
                          <td className="px-2 py-2.5 text-right text-gray-300 whitespace-nowrap">{fmtPct(c.unemployment.value)}</td>
                          <td className="px-2 py-2.5 text-right text-gray-300 whitespace-nowrap">{Number.isFinite(c.interestRate.value) ? fmtPct(c.interestRate.value, 2) : '—'}</td>
                          <td className="px-2 py-2.5 text-right text-gray-400 whitespace-nowrap">{fmtPop(c.population.value)}</td>
                          <td className="px-2 pr-4 py-2.5 text-right whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${/^AA/.test(c.creditRating) ? 'bg-emerald-500/15 text-emerald-300' : /^(A|BBB)/.test(c.creditRating) ? 'bg-sky-500/15 text-sky-300' : 'bg-amber-500/15 text-amber-300'}`}>{c.creditRating}</span>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="border-b border-slate-800/60 bg-slate-900/70">
                            <td colSpan={8} className="px-4 py-3">
                              {detail === 'loading' || detail === undefined ? (
                                <div className="py-3 text-center text-[12px] text-gray-500">Loading country data…</div>
                              ) : detail === 'error' ? (
                                <div className="py-3 text-center text-[12px] text-gray-500">Detailed data unavailable for {c.country}.</div>
                              ) : (
                                <>
                                  {/* Live calendar releases (same data as the Live Calendar widget) */}
                                  {detail.released.length > 0 && (
                                    <div className="mb-3">
                                      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                                        📅 Latest releases — live calendar
                                      </div>
                                      <div className="overflow-x-auto rounded-lg border border-slate-800">
                                        <table className="w-full text-[11px] min-w-[520px]">
                                          <thead>
                                            <tr className="text-left text-[9px] uppercase tracking-wider text-gray-500 bg-slate-950/70 border-b border-slate-800">
                                              <th className="pl-3 pr-2 py-1.5 font-semibold">When</th>
                                              <th className="px-2 py-1.5 font-semibold">Event</th>
                                              <th className="px-2 py-1.5 text-right font-semibold">Actual</th>
                                              <th className="px-2 py-1.5 text-right font-semibold">Forecast</th>
                                              <th className="px-2 pr-3 py-1.5 text-right font-semibold">Previous</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {detail.released.map((ev) => {
                                              const a = parseFloat(ev.actual.replace(/[%,KMBT\s]/gi, ''));
                                              const f = parseFloat((ev.forecast || ev.previous).replace(/[%,KMBT\s]/gi, ''));
                                              const tone = Number.isFinite(a) && Number.isFinite(f) && a !== f ? (a > f ? 'text-emerald-400' : 'text-red-400') : 'text-gray-100';
                                              const d = new Date(ev.releaseAt);
                                              const evKey = `${c.countryCode}:${ev.id}`;
                                              const isEvOpen = expandedRelease === evKey;
                                              return (
                                                <React.Fragment key={ev.id}>
                                                  <tr
                                                    className={`border-b border-slate-800/50 last:border-0 ${ev.url ? 'cursor-pointer hover:bg-slate-800/40' : ''} ${isEvOpen ? 'bg-slate-800/30' : ''}`}
                                                    onClick={(e) => { e.stopPropagation(); if (ev.url) setExpandedRelease(isEvOpen ? null : evKey); }}
                                                    title={ev.url ? 'Click for full history (chart + month by month)' : undefined}
                                                  >
                                                    <td className="pl-3 pr-2 py-1.5 text-gray-500 whitespace-nowrap">
                                                      {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-gray-200">
                                                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${ev.importance === 'High' ? 'bg-red-400' : ev.importance === 'Medium' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                                                      {ev.name}
                                                      {ev.url && <span className={`ml-1.5 text-[9px] ${isEvOpen ? 'text-sky-300' : 'text-sky-500/60'}`}>{isEvOpen ? '▾' : '▸'} history</span>}
                                                    </td>
                                                    <td className={`px-2 py-1.5 text-right font-bold whitespace-nowrap ${tone}`}>{ev.actual || '—'}</td>
                                                    <td className="px-2 py-1.5 text-right text-gray-400 whitespace-nowrap">{ev.forecast || '—'}</td>
                                                    <td className="px-2 pr-3 py-1.5 text-right text-gray-500 whitespace-nowrap">{ev.previous || '—'}</td>
                                                  </tr>
                                                  {isEvOpen && ev.url && (
                                                    <tr className="border-b border-slate-800/50 bg-slate-950/50" onClick={(e) => e.stopPropagation()}>
                                                      <td colSpan={5} className="px-3 py-2">
                                                        <EventHistoryPanel eventPath={ev.url} />
                                                      </td>
                                                    </tr>
                                                  )}
                                                </React.Fragment>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                  {detail.upcoming.length > 0 && (
                                    <div className="mb-3 flex flex-wrap items-center gap-1.5">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Upcoming:</span>
                                      {detail.upcoming.map((ev) => (
                                        <span key={ev.id} className="rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1 text-[10px] text-gray-400">
                                          {new Date(ev.releaseAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {ev.name}
                                          {ev.forecast ? <span className="text-gray-500"> (f: {ev.forecast})</span> : null}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {detail.indicators.length > 0 && (
                                    <>
                                      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-sky-300">
                                        {flagFor(c.countryCode)} {c.country} — all indicators
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                        {detail.indicators.map((ind) => {
                                          const delta = ind.previous != null ? ind.value - ind.previous : null;
                                          return (
                                            <div key={ind.kpi} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                                              <div className="text-[10px] text-gray-500 leading-tight">{ind.name}</div>
                                              <div className="mt-0.5 flex items-baseline gap-2">
                                                <span className="text-[14px] font-bold text-white">{fmtIndicator(ind.value, ind.unit)}</span>
                                                {delta != null && Math.abs(delta) > 1e-9 && (
                                                  <span className={`text-[10px] font-semibold ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {delta > 0 ? '▲' : '▼'} vs {fmtIndicator(ind.previous, ind.unit)}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="mt-0.5 text-[9px] text-gray-600">
                                                {ind.date}{ind.frequency ? ` · ${ind.frequency}` : ''}{ind.source ? ` · ${ind.source}` : ''}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
            <div className="px-4 py-2 text-[10px] text-gray-600 bg-slate-900/60">
              {sortedCountries.length} countries · sorted by {sortKey} · click a country for all its indicators
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
