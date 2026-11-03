'use client';

/* ─────────────────────────────────────────────
   Economics — EconoPulse macro terminal.
   Status bar (UTC / local clock, market sessions) + five live panels:
     ECAL  Economic calendar (EconoPulse feed)   CHRT  Indicator chart (any country × indicator, free search)
     HEAT  Macro heat map (EconoPulse data)      NEWS  Economic news stream
     WECO  World economic matrix
   Every panel expands to full screen; keys 1–5 jump to a panel, Esc closes.
   ───────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import PlanGate from '@/components/PlanGate';
import Logo from '@/components/Logo';
import MacroCalendarPanel from '@/components/MacroCalendarPanel';
import MacroHeatmapPanel from '@/components/MacroHeatmapPanel';
import SearchSelect from '@/components/SearchSelect';
import {
  TE_COUNTRIES, TE_INDICATORS, DEFAULT_COUNTRY, DEFAULT_INDICATOR, HEADLINE_SLUGS, searchIndicators,
  type TeCountry, type TeIndicator,
} from '@/lib/te-catalog';
import type { HeatKpi } from '@/lib/macro-heatmap';

const TradingEconomicsEmbed = dynamic(() => import('@/components/TradingEconomicsEmbed'), { ssr: false });

// ── Chart universe: any country × any indicator (searchable catalogue) ──────
const INDICATOR_BY_SLUG = new Map(TE_INDICATORS.map((i) => [i.slug, i]));
const COUNTRY_BY_CODE = new Map(TE_COUNTRIES.map((c) => [c.code, c]));
const HEADLINE = HEADLINE_SLUGS.map((s) => INDICATOR_BY_SLUG.get(s)!).filter(Boolean);

// Heat-map KPI → Trading Economics indicator slug, so a heat-map cell can open
// the matching series in the chart panel.
const HEAT_TO_TE: Record<string, string> = {
  'NA.GDP.Yoy': 'gdp-growth-annual', 'PR.CPI.Yoy': 'inflation-cpi', 'IR.POL': 'interest-rate', 'LB.UR': 'unemployment-rate',
  'ST.IP.Yoy': 'industrial-production', 'HS.HPI.Yoy': 'housing-index', 'GF.DEBT.GDP': 'government-debt-to-gdp',
  'GF.BAL.GDP': 'government-budget', 'EA.CA.GDP': 'current-account-to-gdp', 'NA.GDP.PC.USD': 'gdp-per-capita',
  'NA.GDP.CUR.USD': 'gdp', 'MN.FXRES': 'foreign-exchange-reserves',
};

// Masks for the chart frame's vendor affordances (measured on the rendered
// widget): the "Copy Embed" button, the linked title and the credits line.
const CHART_COVERS: React.CSSProperties[] = [
  { top: 0, right: 0, width: 56, height: 40, background: '#141414' },
  { top: 40, left: 0, width: 340, height: 26, background: '#232323' },
  { left: 0, right: 0, bottom: 0, height: 30, background: '#212529' },
];

// ── Market sessions (cash equity hours, local exchange time) ────────────────
const SESSIONS = [
  { code: 'TKY', name: 'Tokyo', tz: 'Asia/Tokyo', open: 9 * 60, close: 15 * 60 },
  { code: 'LDN', name: 'London', tz: 'Europe/London', open: 8 * 60, close: 16 * 60 + 30 },
  { code: 'NYC', name: 'New York', tz: 'America/New_York', open: 9 * 60 + 30, close: 16 * 60 },
];

function sessionOpen(now: Date, tz: string, open: number, close: number): boolean {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const wd = get('weekday');
  if (wd === 'Sat' || wd === 'Sun') return false;
  const mins = Number(get('hour')) * 60 + Number(get('minute'));
  return mins >= open && mins < close;
}

const fmtClock = (d: Date, tz?: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(d);

function StatusBar() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1700px] flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2">
        <Logo size={24} textVariant="domain" className="[&_span]:text-sm sm:[&_span]:text-base" />
        <span className="hidden h-4 w-px bg-slate-700 sm:block" />
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">Macro Terminal</span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
          {SESSIONS.map((s) => {
            const open = now ? sessionOpen(now, s.tz, s.open, s.close) : false;
            return (
              <span key={s.code} className="inline-flex items-center gap-1.5" title={`${s.name} cash session`}>
                <span className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                <span className={open ? 'text-gray-200' : 'text-gray-500'}>{s.code}</span>
                <span className="text-gray-500">{now ? fmtClock(now, s.tz).slice(0, 5) : '--:--'}</span>
              </span>
            );
          })}
          <span className="hidden h-4 w-px bg-slate-700 md:block" />
          <span className="text-gray-400">UTC <span className="text-gray-100">{now ? fmtClock(now, 'UTC') : '--:--:--'}</span></span>
          <span className="text-gray-400">LOCAL <span className="text-gray-100">{now ? fmtClock(now) : '--:--:--'}</span></span>
        </div>
      </div>
    </div>
  );
}

// ── Panel chrome: terminal header, expand-to-fullscreen, keyboard anchors ────
type PanelId = 'ECAL' | 'NEWS' | 'CHRT' | 'HEAT' | 'WECO';
const PANELS: Array<{ id: PanelId; key: string; title: string }> = [
  { id: 'ECAL', key: '1', title: 'Economic Calendar' },
  { id: 'CHRT', key: '2', title: 'Indicator Chart' },
  { id: 'NEWS', key: '3', title: 'Economic News' },
  { id: 'HEAT', key: '4', title: 'Macro Heat Map' },
  { id: 'WECO', key: '5', title: 'World Economic Matrix' },
];

function Panel({
  id, title, hotkey, expanded, onToggle, controls, children, className = '',
}: {
  id: PanelId; title: string; hotkey: string; expanded: boolean; onToggle: () => void;
  controls?: ReactNode; children: (fill: boolean) => ReactNode; className?: string;
}) {
  return (
    <>
      {expanded && <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm" onClick={onToggle} />}
      <section
        id={id}
        className={`flex flex-col overflow-hidden rounded-xl border bg-slate-900 scroll-mt-16 ${
          expanded ? 'fixed inset-2 z-[70] border-amber-500/40 shadow-[0_0_80px_-20px_rgba(251,191,36,0.35)] md:inset-4' : `relative border-slate-800 ${className}`
        }`}
      >
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/90 px-3 py-2">
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-amber-300">{id}</span>
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-gray-200">{title}</h2>
          <kbd className="hidden rounded border border-slate-700 bg-slate-950 px-1.5 font-mono text-[9px] text-gray-500 sm:inline">{hotkey}</kbd>
          <div className="ml-auto flex items-center gap-2">
            {controls}
            <button
              onClick={onToggle}
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[10px] text-gray-400 transition-colors hover:border-amber-500/50 hover:text-amber-300"
              title={expanded ? 'Close (Esc)' : 'Expand'}
            >
              {expanded ? 'ESC ✕' : '⤢'}
            </button>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children(expanded)}</div>
      </section>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function EconomicsPage() {
  const [country, setCountry] = useState<TeCountry>(DEFAULT_COUNTRY);
  const [indicator, setIndicator] = useState<TeIndicator>(DEFAULT_INDICATOR);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(0);
  const [expanded, setExpanded] = useState<PanelId | null>(null);

  const seriesUrl = `/${country.slug}/${indicator.slug}`;
  const hits = useMemo(() => searchIndicators(search), [search]);
  useEffect(() => setSearchActive(0), [search]);

  const openSeries = useCallback((c: TeCountry, i: TeIndicator) => {
    setCountry(c);
    setIndicator(i);
    setSearch('');
    setSearchOpen(false);
  }, []);

  // Heat-map cell → chart panel with that country/indicator.
  const chartFromHeat = useCallback((iso2: string, kpi: HeatKpi) => {
    const c = COUNTRY_BY_CODE.get(iso2);
    const i = INDICATOR_BY_SLUG.get(HEAT_TO_TE[kpi.id] || '');
    if (!c || !i) return;
    openSeries(c, i);
    setExpanded(null);
    document.getElementById('CHRT')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [openSeries]);

  const toggle = useCallback((id: PanelId) => setExpanded((cur) => (cur === id ? null : id)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      if (e.key === 'Escape') { setExpanded(null); return; }
      const p = PANELS.find((x) => x.key === e.key);
      if (p) { setExpanded(null); document.getElementById(p.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = expanded ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [expanded]);

  return (
    <PlanGate requiredPlan="free">
      <div className="min-h-full bg-slate-950 text-gray-200">
        <StatusBar />

        <div className="mx-auto max-w-[1700px] space-y-4 px-4 py-4">
          {/* Title + panel navigation */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Global Economics</h1>
              <p className="mt-0.5 text-[12px] text-gray-500">
                Calendar, breaking news, indicator history and a live macro matrix for every country — refreshed automatically as data is released.
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-1.5">
              {PANELS.map((p) => (
                <a
                  key={p.id}
                  href={`#${p.id}`}
                  onClick={(e) => { e.preventDefault(); setExpanded(null); document.getElementById(p.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  className="group inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-gray-400 transition-colors hover:border-amber-500/40 hover:text-amber-300"
                >
                  <span className="font-mono text-[10px] font-bold text-amber-400/80 group-hover:text-amber-300">{p.id}</span>
                  {p.title}
                  <kbd className="hidden font-mono text-[9px] text-gray-600 sm:inline">{p.key}</kbd>
                </a>
              ))}
            </nav>
          </div>

          {/* Row 1 — calendar, full width (densest panel). Built on EconoPulse's
              own feed: the vendor's cl-pro widget currently mis-sizes its event
              column at every width (fixed table layout + colspan header). */}
          <Panel id="ECAL" title="Economic Calendar" hotkey="1" expanded={expanded === 'ECAL'} onToggle={() => toggle('ECAL')}>
            {(fill) => <MacroCalendarPanel fill={fill} />}
          </Panel>

          {/* Row 2 — indicator chart + news */}
          <div className="grid gap-4 xl:grid-cols-5">
          <Panel
            id="CHRT"
            title="Indicator Chart"
            hotkey="2"
            expanded={expanded === 'CHRT'}
            onToggle={() => toggle('CHRT')}
            className="xl:col-span-3"
            controls={
              <span className="hidden font-mono text-[10px] text-gray-500 md:inline">
                <span className="text-amber-400/80">{country.code}</span> {country.name} · <span className="text-gray-300">{indicator.name}</span>
              </span>
            }
          >
            {(fill) => (
              <>
                <div className="space-y-2 border-b border-slate-800 bg-slate-950/60 px-3 py-2">
                  {/* Free search + pickers */}
                  <div className="flex flex-wrap items-stretch gap-2">
                    <div className="relative min-w-[260px] flex-1">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-amber-400">›</span>
                      <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
                        onFocus={() => setSearchOpen(true)}
                        onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown') { e.preventDefault(); setSearchActive((a) => Math.min(a + 1, hits.length - 1)); }
                          else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchActive((a) => Math.max(a - 1, 0)); }
                          else if (e.key === 'Enter' && hits[searchActive]) { e.preventDefault(); openSeries(hits[searchActive].country, hits[searchActive].indicator); (e.target as HTMLInputElement).blur(); }
                          else if (e.key === 'Escape') { setSearchOpen(false); (e.target as HTMLInputElement).blur(); }
                        }}
                        placeholder="Search any indicator, any country — e.g. “italy debt”, “japan cpi”, “boe rate”, “pmi”…"
                        className="w-full rounded-md border border-slate-700 bg-slate-950 py-1.5 pl-6 pr-16 text-[12px] text-gray-100 outline-none placeholder:text-gray-600 focus:border-amber-500/60"
                        spellCheck={false}
                        autoComplete="off"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-gray-600">
                        {TE_COUNTRIES.length}×{TE_INDICATORS.length}
                      </span>
                      {searchOpen && search.trim().length >= 2 && (
                        <ul className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-auto rounded-md border border-slate-700 bg-slate-950 py-1 shadow-2xl">
                          {hits.length === 0 && <li className="px-3 py-2 text-[11px] text-gray-500">No match — try a country name, an indicator (cpi, pmi, debt…) or both.</li>}
                          {hits.map((h, i) => (
                            <li
                              key={h.url}
                              onMouseDown={(e) => { e.preventDefault(); openSeries(h.country, h.indicator); }}
                              onMouseEnter={() => setSearchActive(i)}
                              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] ${i === searchActive ? 'bg-amber-500/15 text-amber-100' : 'text-gray-300'}`}
                            >
                              <span className="w-7 shrink-0 font-mono text-[10px] font-bold text-amber-400/80">{h.country.code}</span>
                              <span className="shrink-0 text-gray-400">{h.country.name}</span>
                              <span className="text-gray-600">·</span>
                              <span className="truncate font-semibold">{h.indicator.name}</span>
                              <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-wider text-gray-600">{h.indicator.group}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <SearchSelect items={TE_COUNTRIES} value={country} onChange={setCountry} label="Country" placeholder="Type a country…" className="w-48" />
                    <SearchSelect items={TE_INDICATORS} value={indicator} onChange={setIndicator} label="Indicator" placeholder="Type an indicator…" className="w-60" />
                  </div>
                  {/* Headline chips for the selected country */}
                  <div className="flex flex-wrap gap-1">
                    {HEADLINE.map((i) => (
                      <button
                        key={i.slug}
                        onClick={() => setIndicator(i)}
                        className={`rounded-md border px-2 py-0.5 text-[11px] transition-colors ${indicator.slug === i.slug ? 'border-sky-500/50 bg-sky-500/15 text-sky-200' : 'border-slate-800 bg-slate-900 text-gray-400 hover:border-slate-600 hover:text-gray-200'}`}
                      >
                        {i.name}
                      </button>
                    ))}
                  </div>
                </div>
                <TradingEconomicsEmbed
                  key={fill ? 'chart-full' : 'chart-inline'}
                  widget="ec-pro"
                  attrs={{ url: seriesUrl, chartSettings: { type: 'line', span: 'MAX' } }}
                  height={fill ? '100%' : 560}
                  className={fill ? 'flex-1' : ''}
                  covers={CHART_COVERS}
                  loadingLabel={`Loading ${country.name} — ${indicator.name}…`}
                />
              </>
            )}
          </Panel>
          <Panel id="NEWS" title="Economic News" hotkey="3" expanded={expanded === 'NEWS'} onToggle={() => toggle('NEWS')} className="xl:col-span-2">
            {(fill) => <TradingEconomicsEmbed widget="ns-pro" height={fill ? '100%' : 620} className={fill ? 'flex-1' : 'xl:h-full'} loadingLabel="Loading news…" />}
          </Panel>
          </div>

          {/* Row 3 — macro heat map (EconoPulse data) */}
          <Panel
            id="HEAT"
            title="Macro Heat Map"
            hotkey="4"
            expanded={expanded === 'HEAT'}
            onToggle={() => toggle('HEAT')}
            controls={<span className="hidden font-mono text-[10px] text-gray-500 md:inline">countries × indicators · rank vs peers · click a cell to chart it</span>}
          >
            {(fill) => <MacroHeatmapPanel fill={fill} onPick={chartFromHeat} />}
          </Panel>

          {/* Row 4 — world matrix */}
          <Panel id="WECO" title="World Economic Matrix" hotkey="5" expanded={expanded === 'WECO'} onToggle={() => toggle('WECO')}>
            {(fill) => <TradingEconomicsEmbed widget="mt-pro" height={fill ? '100%' : 'calc(100vh - 300px)'} className={fill ? 'flex-1' : 'min-h-[520px]'} loadingLabel="Loading world economic data…" />}
          </Panel>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 font-mono text-[10px] text-gray-600">
            <span>ECONOPULSE MACRO TERMINAL · data refreshes automatically</span>
            <span>keys <kbd className="rounded border border-slate-800 px-1">1</kbd>–<kbd className="rounded border border-slate-800 px-1">5</kbd> jump to panel · <kbd className="rounded border border-slate-800 px-1">Esc</kbd> close · Powered by EconoPulse.ai</span>
          </footer>
        </div>
      </div>
    </PlanGate>
  );
}
