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

const FxsCalendarWidget = dynamic(() => import('@/components/FxsCalendarWidget'), { ssr: false });

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

type AiAnalysis = {
  currentCycle?: string; direction?: string; confidence?: number;
  keyFactors?: string[]; risks?: string[]; opportunities?: string[];
  summary?: string; recommendation?: string;
};

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

function regionLabel(region: string): string {
  const CODE_NAMES: Record<string, string> = {
    US: 'United States', EA: 'Euro Area', EU: 'European Union', GB: 'United Kingdom', UK: 'United Kingdom',
    JP: 'Japan', CN: 'China', DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain', CA: 'Canada',
    AU: 'Australia', NZ: 'New Zealand', CH: 'Switzerland', IN: 'India', BR: 'Brazil', KR: 'South Korea',
    MX: 'Mexico', SE: 'Sweden', NO: 'Norway', PL: 'Poland', TR: 'Turkey', ZA: 'South Africa',
    SG: 'Singapore', HK: 'Hong Kong', ID: 'Indonesia', SA: 'Saudi Arabia', AR: 'Argentina', NL: 'Netherlands',
  };
  if (/^[A-Za-z]{2}$/.test(region)) return CODE_NAMES[region.toUpperCase()] || region.toUpperCase();
  return region;
}

// ── Release-commentary engine ────────────────────────────────────────────────
// Parses "3.2%", "233K", "-0.4", "1.5M", "2.1B" into numbers for comparison.
function parseNum(s?: string): number | null {
  if (s == null) return null;
  const m = String(s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  let v = parseFloat(m[0]);
  const suffix = String(s).toUpperCase();
  if (/\dK\b|\dK$/.test(suffix.replace(/\s/g, ''))) v *= 1e3;
  else if (/\dM\b|\dM$/.test(suffix.replace(/\s/g, ''))) v *= 1e6;
  else if (/\dB\b|\dB$/.test(suffix.replace(/\s/g, ''))) v *= 1e9;
  else if (/\dT\b|\dT$/.test(suffix.replace(/\s/g, ''))) v *= 1e12;
  return Number.isFinite(v) ? v : null;
}

type Kind = 'inflation' | 'labor-weak' | 'labor-strong' | 'growth' | 'rates' | 'trade' | 'other';

function classify(name: string): Kind {
  const n = name.toLowerCase();
  if (/(cpi|ppi|pce|inflation|deflator|hicp|price index|prices)/.test(n)) return 'inflation';
  if (/(unemployment|jobless|claims)/.test(n)) return 'labor-weak';
  if (/(payroll|employment change|jobs report|hiring|adp)/.test(n)) return 'labor-strong';
  if (/(rate decision|interest rate|refi rate|cash rate|bank rate|policy rate|fomc|deposit rate)/.test(n)) return 'rates';
  if (/(trade balance|current account|exports|imports)/.test(n)) return 'trade';
  if (/(gdp|retail|industrial|production|pmi|ism|confidence|sentiment|housing|durable|manufacturing|services|zew|ifo|construction|orders|starts|permits)/.test(n)) return 'growth';
  return 'other';
}

// Builds a one-line analyst comment for a released event (actual present),
// or a "what to watch" note for an upcoming one.
function makeComment(e: EconEvent): { text: string; tone: 'pos' | 'neg' | 'neutral' } {
  const kind = classify(e.event);
  const a = parseNum(e.actual);
  const f = parseNum(e.forecast);
  const p = parseNum(e.previous);
  const name = `${regionLabel(e.region)} ${e.event}`;

  // Upcoming event → preview comment
  if (a === null) {
    if (f !== null && p !== null) {
      const dir = f > p ? 'rising from' : f < p ? 'easing from' : 'unchanged vs';
      return { text: `Consensus sees ${name} at ${e.forecast} — ${dir} ${e.previous}.`, tone: 'neutral' };
    }
    if (p !== null) return { text: `${name} due — previous reading was ${e.previous}.`, tone: 'neutral' };
    return { text: `${name} scheduled.`, tone: 'neutral' };
  }

  const ref = f !== null ? f : p;
  const refLabel = f !== null ? 'consensus' : 'the prior reading';
  const refStr = f !== null ? e.forecast : e.previous;
  let base = `${name} came in at ${e.actual}`;
  if (refStr != null) base += ` vs ${refStr} ${f !== null ? 'expected' : 'previous'}`;
  if (f !== null && e.previous != null) base += ` (prev ${e.previous})`;
  base += '.';

  if (ref === null) return { text: base, tone: 'neutral' };

  const tol = Math.max(Math.abs(ref) * 0.002, 1e-9);
  const beat = a > ref + tol;
  const miss = a < ref - tol;

  let verdict = '';
  let tone: 'pos' | 'neg' | 'neutral' = 'neutral';
  switch (kind) {
    case 'inflation':
      if (beat) { verdict = `Hotter than ${refLabel} — keeps pressure on the central bank to stay restrictive.`; tone = 'neg'; }
      else if (miss) { verdict = `Cooler than ${refLabel} — supports the disinflation narrative and dovish rate bets.`; tone = 'pos'; }
      else { verdict = 'In line — no change to the inflation picture.'; }
      break;
    case 'labor-weak': // unemployment rate, jobless claims: higher = weaker labor market
      if (beat) { verdict = `Labor market softer than ${refLabel} — growth concern, but adds to rate-cut odds.`; tone = 'neg'; }
      else if (miss) { verdict = `Labor market tighter than ${refLabel} — resilience persists.`; tone = 'pos'; }
      else { verdict = 'In line with expectations.'; }
      break;
    case 'labor-strong': // payrolls etc.: higher = stronger
      if (beat) { verdict = `Stronger hiring than ${refLabel} — labor demand remains solid.`; tone = 'pos'; }
      else if (miss) { verdict = `Weaker job creation than ${refLabel} — cooling labor momentum.`; tone = 'neg'; }
      else { verdict = 'In line with expectations.'; }
      break;
    case 'rates':
      if (beat) { verdict = 'Hawkish surprise — tighter policy than markets priced.'; tone = 'neg'; }
      else if (miss) { verdict = 'Dovish surprise — easier policy than expected.'; tone = 'pos'; }
      else { verdict = 'Decision as expected — focus shifts to forward guidance.'; }
      break;
    case 'trade':
      if (beat) { verdict = `Better external balance than ${refLabel}.`; tone = 'pos'; }
      else if (miss) { verdict = `Wider deficit / weaker balance than ${refLabel}.`; tone = 'neg'; }
      else { verdict = 'Broadly in line.'; }
      break;
    case 'growth':
      if (beat) { verdict = `Upside surprise vs ${refLabel} — stronger momentum than consensus.`; tone = 'pos'; }
      else if (miss) { verdict = `Downside miss vs ${refLabel} — softer activity than expected.`; tone = 'neg'; }
      else { verdict = 'In line — momentum unchanged.'; }
      break;
    default:
      if (beat) { verdict = `Above ${refLabel}.`; tone = 'pos'; }
      else if (miss) { verdict = `Below ${refLabel}.`; tone = 'neg'; }
      else { verdict = 'In line.'; }
  }
  return { text: `${base} ${verdict}`, tone };
}

// Colors the printed actual value green/red based on economic interpretation.
function actualTone(e: EconEvent): 'pos' | 'neg' | 'neutral' {
  const a = parseNum(e.actual);
  const f = parseNum(e.forecast) ?? parseNum(e.previous);
  if (a === null || f === null) return 'neutral';
  const tol = Math.max(Math.abs(f) * 0.002, 1e-9);
  if (Math.abs(a - f) <= tol) return 'neutral';
  const higher = a > f;
  const kind = classify(e.event);
  const goodWhenHigher = kind === 'growth' || kind === 'labor-strong' || kind === 'trade';
  const badWhenHigher = kind === 'inflation' || kind === 'labor-weak';
  if (goodWhenHigher) return higher ? 'pos' : 'neg';
  if (badWhenHigher) return higher ? 'neg' : 'pos';
  return 'neutral';
}

const TONE_TEXT: Record<'pos' | 'neg' | 'neutral', string> = {
  pos: 'text-emerald-400', neg: 'text-red-400', neutral: 'text-gray-200',
};
const DOT: Record<EconEvent['importance'], string> = {
  High: 'bg-red-400', Medium: 'bg-amber-400', Low: 'bg-slate-500',
};

// ── Event → history series mapping (FRED:/DBN: symbols served by fred-history / dbnomics-history) ──
type SeriesMatch = { re: RegExp; sym: string; label: string };
const US_SERIES: SeriesMatch[] = [
  { re: /ism (manufacturing|mfg) pmi/, sym: 'DBN:ISM/pmi/pm', label: 'ISM Manufacturing PMI' },
  { re: /ism (services|non-?manufacturing) pmi/, sym: 'DBN:ISM/nm-pmi/pm', label: 'ISM Services PMI' },
  { re: /core cpi/, sym: 'FRED:CPILFESL@PC1', label: 'Core CPI YoY %' },
  { re: /\bcpi\b|inflation rate/, sym: 'FRED:CPIAUCSL@PC1', label: 'CPI YoY %' },
  { re: /core pce/, sym: 'FRED:PCEPILFE@PC1', label: 'Core PCE YoY %' },
  { re: /\bppi\b/, sym: 'FRED:PPIACO@PC1', label: 'PPI YoY %' },
  { re: /unemployment rate/, sym: 'FRED:UNRATE', label: 'Unemployment Rate %' },
  { re: /non-?farm|nfp|payroll/, sym: 'FRED:PAYEMS@CHG', label: 'Nonfarm Payrolls m/m (K)' },
  { re: /jobless claims|unemployment claims/, sym: 'FRED:ICSA', label: 'Initial Jobless Claims' },
  { re: /jolts|job openings/, sym: 'FRED:JTSJOL', label: 'Job Openings (K)' },
  { re: /\bgdp\b/, sym: 'FRED:A191RL1Q225SBEA', label: 'GDP QoQ SAAR %' },
  { re: /retail sales/, sym: 'FRED:RSAFS@PC1', label: 'Retail Sales YoY %' },
  { re: /industrial production/, sym: 'FRED:INDPRO@PC1', label: 'Industrial Production YoY %' },
  { re: /consumer sentiment|uom/, sym: 'FRED:UMCSENT', label: 'Michigan Consumer Sentiment' },
  { re: /housing starts/, sym: 'FRED:HOUST', label: 'Housing Starts (K, SAAR)' },
  { re: /building permits/, sym: 'FRED:PERMIT', label: 'Building Permits (K, SAAR)' },
  { re: /durable goods/, sym: 'FRED:DGORDER@PCH', label: 'Durable Goods Orders m/m %' },
  { re: /trade balance/, sym: 'FRED:BOPGSTB', label: 'Trade Balance ($M)' },
  { re: /fomc|federal funds|fed funds/, sym: 'FRED:FEDFUNDS', label: 'Fed Funds Rate %' },
  { re: /inflation expectations/, sym: 'FRED:MICH', label: 'Michigan 1Y Inflation Expectations %' },
];
const EUR_SERIES: SeriesMatch[] = [
  { re: /german.*(cpi|inflation)/, sym: 'FRED:CP0000DEM086NEST@PC1', label: 'Germany CPI YoY %' },
  { re: /french.*(cpi|inflation)/, sym: 'FRED:CP0000FRM086NEST@PC1', label: 'France CPI YoY %' },
  { re: /italian.*(cpi|inflation)/, sym: 'FRED:CP0000ITM086NEST@PC1', label: 'Italy CPI YoY %' },
  { re: /spanish.*(cpi|inflation)/, sym: 'FRED:CP0000ESM086NEST@PC1', label: 'Spain CPI YoY %' },
  { re: /german.*unemployment/, sym: 'FRED:LRHUTTTTDEM156S', label: 'Germany Unemployment %' },
  { re: /italian.*unemployment/, sym: 'FRED:LRHUTTTTITM156S', label: 'Italy Unemployment %' },
  { re: /cpi|hicp|inflation/, sym: 'FRED:CP0000EZ19M086NEST@PC1', label: 'Euro Area HICP YoY %' },
  { re: /ecb|refinancing|deposit facility/, sym: 'FRED:ECBDFR', label: 'ECB Deposit Rate %' },
];
const REGION_SERIES: { region: RegExp; list: SeriesMatch[] }[] = [
  { region: /united states|^us$/, list: US_SERIES },
  { region: /euro|germany|france|italy|spain|^(ea|eu|de|fr|it|es)$/, list: EUR_SERIES },
  { region: /united kingdom|^(gb|uk)$/, list: [
    { re: /unemployment|claimant/, sym: 'FRED:LRHUTTTTGBM156S', label: 'UK Unemployment %' },
    { re: /bank rate|official bank|boe/, sym: 'FRED:IUDSOIA', label: 'UK Overnight Rate (SONIA) %' },
  ]},
  { region: /japan|^jp$/, list: [
    { re: /unemployment/, sym: 'FRED:LRHUTTTTJPM156S', label: 'Japan Unemployment %' },
    { re: /boj|policy rate/, sym: 'FRED:IRSTCI01JPM156N', label: 'Japan Overnight Rate %' },
  ]},
  { region: /canada|^ca$/, list: [
    { re: /unemployment/, sym: 'FRED:LRUNTTTTCAM156S', label: 'Canada Unemployment %' },
    { re: /boc|overnight rate|rate decision/, sym: 'FRED:IRSTCI01CAM156N', label: 'Canada Overnight Rate %' },
  ]},
  { region: /australia|^au$/, list: [
    { re: /unemployment/, sym: 'FRED:LRHUTTTTAUM156S', label: 'Australia Unemployment %' },
    { re: /rba|cash rate/, sym: 'FRED:IRSTCI01AUM156N', label: 'Australia Cash Rate %' },
  ]},
  { region: /switzerland|^ch$/, list: [
    { re: /snb|policy rate|libor/, sym: 'FRED:IR3TIB01CHM156N', label: 'Switzerland 3M Rate %' },
  ]},
];

function seriesForEvent(e: EconEvent): { sym: string; label: string } | null {
  const region = regionLabel(e.region).toLowerCase();
  const name = e.event.toLowerCase();
  for (const grp of REGION_SERIES) {
    if (!grp.region.test(region)) continue;
    for (const m of grp.list) if (m.re.test(name)) return { sym: m.sym, label: m.label };
  }
  return null;
}

// ── Inline history chart (line / bars) shown under a clicked calendar event ──
type Bar = { time: number; close: number };
const chartCache = new Map<string, Bar[]>();

function InlineMacroChart({ sym, label }: { sym: string; label: string }) {
  const [bars, setBars] = useState<Bar[] | null>(chartCache.get(sym) || null);
  const [err, setErr] = useState(false);
  const [mode, setMode] = useState<'line' | 'bars'>('line');

  useEffect(() => {
    if (chartCache.has(sym)) { setBars(chartCache.get(sym)!); return; }
    let alive = true;
    (async () => {
      try {
        const url = sym.startsWith('DBN:')
          ? `/api/dbnomics-history?symbol=${encodeURIComponent(sym)}&range=5y`
          : `/api/fred-history?symbol=${encodeURIComponent(sym)}&range=5y`;
        const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
        const j = await r.json();
        const raw: { time: number; close: number }[] = j?.data?.bars || [];
        if (!alive) return;
        if (!raw.length) { setErr(true); return; }
        const pts = raw.slice(-120).map(b => ({ time: b.time, close: b.close }));
        chartCache.set(sym, pts);
        setBars(pts);
      } catch { if (alive) setErr(true); }
    })();
    return () => { alive = false; };
  }, [sym]);

  if (err) return <div className="text-[11px] text-gray-600 py-3">History unavailable for this indicator.</div>;
  if (!bars) return <div className="text-[11px] text-gray-600 py-3">Loading history…</div>;

  const W = 720, H = 150, PAD = 4;
  const vals = bars.map(b => b.close);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i / Math.max(bars.length - 1, 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);
  const zeroY = min < 0 && max > 0 ? y(0) : H - PAD;
  const last = vals[vals.length - 1];
  const first = vals[0];
  const up = last >= first;
  const fmtD = (t: number) => new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  const fmtDFull = (t: number) => new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtV = (v: number) => Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(Math.abs(v) < 10 ? 2 : 1);
  // 5 evenly spaced time ticks
  const tickIdx = [0, 1, 2, 3, 4].map(k => Math.round(k * (bars.length - 1) / 4)).filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <span className="text-[11px] font-semibold text-gray-300">{label}</span>
        <span className={`text-[11px] font-bold ${up ? 'text-emerald-400' : 'text-red-400'}`}>Last: {fmtV(last)}</span>
        <span className="text-[10px] text-gray-600">5Y · {bars.length} obs · min {fmtV(min)} / max {fmtV(max)}</span>
        <div className="ml-auto inline-flex rounded bg-slate-900/80 border border-slate-700 p-0.5 gap-0.5">
          {(['line', 'bars'] as const).map(m => (
            <button key={m} onClick={(ev) => { ev.stopPropagation(); setMode(m); }}
              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${mode === m ? 'bg-slate-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {m === 'line' ? 'Line' : 'Bars'}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40 rounded border border-slate-800 bg-slate-950" preserveAspectRatio="none">
          {/* Horizontal grid at 5 value levels */}
          {[0, 0.25, 0.5, 0.75, 1].map(f => (
            <line key={f} x1={0} x2={W} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)} stroke="#1e293b" strokeWidth={1} />
          ))}
          {min < 0 && max > 0 && <line x1={0} x2={W} y1={zeroY} y2={zeroY} stroke="#475569" strokeDasharray="3,3" strokeWidth={1} />}
          {mode === 'line' ? (
            <polyline
              fill="none" stroke={up ? '#34d399' : '#f87171'} strokeWidth={1.8}
              points={bars.map((b, i) => `${x(i)},${y(b.close)}`).join(' ')}
            />
          ) : (
            bars.map((b, i) => {
              const bw = Math.max((W - PAD * 2) / bars.length - 1, 1);
              const yv = y(b.close);
              const base = min < 0 && max > 0 ? zeroY : H - PAD;
              const top = Math.min(yv, base), h = Math.max(Math.abs(base - yv), 1);
              return <rect key={i} x={x(i) - bw / 2} y={top} width={bw} height={h} fill={b.close >= (min < 0 ? 0 : min) ? '#38bdf8' : '#f87171'} opacity={i === bars.length - 1 ? 1 : 0.75} />;
            })
          )}
          {/* Hover targets: native tooltip with date + value for every observation */}
          {bars.map((b, i) => {
            const slot = W / bars.length;
            return (
              <rect key={`h${i}`} x={i * slot} y={0} width={slot} height={H} fill="transparent" className="hover:fill-slate-400/10">
                <title>{`${fmtDFull(b.time)} — ${fmtV(b.close)}`}</title>
              </rect>
            );
          })}
        </svg>
        {/* Value axis labels (max → min) */}
        <div className="absolute inset-y-0 right-1 flex flex-col justify-between py-0.5 pointer-events-none text-right">
          {[1, 0.75, 0.5, 0.25, 0].map(f => (
            <span key={f} className="text-[9px] leading-none text-gray-400 bg-slate-950/80 px-1 rounded">
              {fmtV(min + f * span)}
            </span>
          ))}
        </div>
      </div>
      {/* Time axis */}
      <div className="flex justify-between text-[10px] text-gray-500 mt-0.5 px-0.5">
        {tickIdx.map(i => <span key={i}>{fmtD(bars[i].time)}</span>)}
      </div>
    </div>
  );
}

// ── Formatting helpers ──────────────────────────────────────────────────────
const fmtPct = (v: number | null | undefined, digits = 1) =>
  v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(digits)}%`;
const fmtTrn = (v: number) => (Number.isFinite(v) && v > 0 ? `$${v.toFixed(2)}T` : '—');
const fmtPop = (v: number) =>
  !Number.isFinite(v) || v <= 0 ? '—' : v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : `${(v / 1e6).toFixed(1)}M`;

// ── Page ─────────────────────────────────────────────────────────────────────
type Tab = 'calendar' | 'news' | 'releases' | 'countries' | 'forecasts';

type NewsItem = { id: string; title: string; description?: string; url: string; source: string; publishedDate: string };

type ForecastRow = {
  code: string; country: string;
  gdpGrowth: Record<string, number | null>;
  inflation: Record<string, number | null>;
  unemployment: Record<string, number | null>;
  govDebt: Record<string, number | null>;
};

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
  const [releases, setReleases] = useState<EconEvent[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [ai, setAi] = useState<AiAnalysis | null>(null);
  const [loadingCal, setLoadingCal] = useState(true);
  const [loadingRel, setLoadingRel] = useState(true);
  const [loadingCty, setLoadingCty] = useState(true);
  const [minImp, setMinImp] = useState<'All' | 'Medium' | 'High'>('Medium');
  const [calSource, setCalSource] = useState<'econopulse' | 'fxstreet'>('econopulse');
  const [regionQuery, setRegionQuery] = useState('');
  const [sortKey, setSortKey] = useState<'gdp' | 'growth' | 'inflation' | 'unemployment' | 'rate'>('gdp');
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [forecasts, setForecasts] = useState<ForecastRow[]>([]);
  const [fxYears, setFxYears] = useState<string[]>([]);
  const [loadingFx, setLoadingFx] = useState(false);

  // Economics news stream (TE "stream"-style) — fetched when the tab first opens.
  useEffect(() => {
    if (tab !== 'news' || news.length) return;
    let alive = true;
    (async () => {
      setLoadingNews(true);
      try {
        const r = await fetch('/api/news', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
        const j = await r.json();
        if (alive && Array.isArray(j?.data)) setNews(j.data);
      } catch { /* ignore */ }
      finally { if (alive) setLoadingNews(false); }
    })();
    return () => { alive = false; };
  }, [tab, news.length]);

  // IMF WEO forecasts — fetched when the tab first opens.
  useEffect(() => {
    if (tab !== 'forecasts' || forecasts.length) return;
    let alive = true;
    (async () => {
      setLoadingFx(true);
      try {
        const r = await fetch('/api/economics-forecasts', { cache: 'no-store', signal: AbortSignal.timeout(25000) });
        const j = await r.json();
        if (alive && j?.ok && Array.isArray(j.data)) { setForecasts(j.data); setFxYears(j.years || []); }
      } catch { /* ignore */ }
      finally { if (alive) setLoadingFx(false); }
    })();
    return () => { alive = false; };
  }, [tab, forecasts.length]);

  // Calendar (next 14 days)
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

  // Recent releases with actuals
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/economics-releases?days=10', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
        const j = await r.json();
        if (alive && Array.isArray(j?.data)) setReleases(j.data);
      } catch { /* keep previous */ }
      finally { if (alive) setLoadingRel(false); }
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

  // AI macro commentary (rule-engine fallback works without OpenAI key)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/ai-economic-analysis', { cache: 'no-store', signal: AbortSignal.timeout(30000) });
        const j = await r.json();
        if (alive && j?.data?.analysis) setAi(j.data.analysis);
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Calendar grouped by day with filters
  const groupedCalendar = useMemo(() => {
    const q = regionQuery.trim().toLowerCase();
    const filtered = calendar.filter(e =>
      e.date >= todayStr &&
      (minImp === 'All' || (minImp === 'Medium' ? e.importance !== 'Low' : e.importance === 'High')) &&
      (!q || regionLabel(e.region).toLowerCase().includes(q) || e.event.toLowerCase().includes(q))
    );
    const map = new Map<string, EconEvent[]>();
    for (const e of filtered) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [calendar, minImp, regionQuery, todayStr]);

  // Releases stream: FMP actuals if present, else fall back to recent calendar entries that carry actuals
  const releaseStream = useMemo(() => {
    const withActuals = releases.length
      ? releases
      : calendar.filter(e => e.actual && e.actual !== '-');
    const q = regionQuery.trim().toLowerCase();
    return withActuals
      .filter(e => !q || regionLabel(e.region).toLowerCase().includes(q) || e.event.toLowerCase().includes(q))
      .filter(e => minImp === 'All' || (minImp === 'Medium' ? e.importance !== 'Low' : e.importance === 'High'))
      .slice(0, 120);
  }, [releases, calendar, regionQuery, minImp]);

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

  const dayLabel = (d: string) => {
    const dt = new Date(`${d}T12:00:00Z`);
    const label = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    return d === todayStr ? `Today · ${label}` : label;
  };

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
              ['calendar', 'Calendar'],
              ['news', 'News'],
              ['releases', 'Indicators'],
              ['countries', 'Countries'],
              ['forecasts', 'Forecasts'],
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
          {tab === 'calendar' && (
            <div className="inline-flex rounded-lg bg-slate-900/60 border border-slate-800 p-0.5 gap-0.5">
              {([['econopulse', 'EconoPulse'], ['fxstreet', 'FXStreet Live']] as const).map(([src, label]) => (
                <button
                  key={src}
                  onClick={() => setCalSource(src)}
                  className={`text-[11px] px-2.5 py-1 rounded font-semibold transition-colors ${calSource === src ? 'bg-slate-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {((tab === 'calendar' && calSource === 'econopulse') || tab === 'releases') && (
            <>
              <div className="inline-flex rounded-lg bg-slate-900/60 border border-slate-800 p-0.5 gap-0.5">
                {(['High', 'Medium', 'All'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMinImp(m)}
                    className={`text-[11px] px-2.5 py-1 rounded font-semibold transition-colors ${minImp === m ? 'bg-slate-700 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    {m === 'Medium' ? 'Med+' : m}
                  </button>
                ))}
              </div>
              <input
                value={regionQuery}
                onChange={(e) => setRegionQuery(e.target.value)}
                placeholder="Filter country or event…"
                className="text-[12px] bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 text-gray-200 placeholder-gray-600 outline-none focus:border-slate-600 w-56"
              />
            </>
          )}
        </div>

        {/* ── Calendar tab ── */}
        {tab === 'calendar' && calSource === 'fxstreet' && <FxsCalendarWidget />}
        {tab === 'calendar' && calSource === 'econopulse' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            {loadingCal && <div className="p-6 text-center text-gray-500 text-sm">Loading calendar…</div>}
            {!loadingCal && groupedCalendar.length === 0 && (
              <div className="p-6 text-center text-gray-500 text-sm">No events match the current filters.</div>
            )}
            {groupedCalendar.map(([date, events]) => (
              <div key={date}>
                <div className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider border-y border-slate-800 ${date === todayStr ? 'bg-blue-500/10 text-blue-300' : 'bg-slate-900/80 text-gray-400'}`}>
                  {dayLabel(date)}
                </div>
                <table className="w-full text-[12px]">
                  <tbody>
                    {events.map((e, i) => {
                      const tone = e.actual ? actualTone(e) : 'neutral';
                      const preview = e.importance === 'High' ? makeComment(e) : null;
                      const chart = seriesForEvent(e);
                      const rowKey = `${date}|${i}|${e.event}`;
                      const isOpen = expandedEvent === rowKey;
                      return (
                        <React.Fragment key={rowKey}>
                          <tr
                            className={`border-b border-slate-800/60 transition-colors ${chart ? 'cursor-pointer hover:bg-slate-800/50' : 'hover:bg-slate-800/30'} ${isOpen ? 'bg-slate-800/40' : ''}`}
                            onClick={() => { if (chart) setExpandedEvent(isOpen ? null : rowKey); }}
                            title={chart ? 'Click to show historical chart' : undefined}
                          >
                            <td className="pl-4 pr-2 py-2 text-gray-500 whitespace-nowrap w-20">{e.time || '—'}</td>
                            <td className="px-2 py-2 whitespace-nowrap w-44">
                              <span className="mr-1.5">{flagFor(e.region)}</span>
                              <span className="text-gray-300">{regionLabel(e.region)}</span>
                            </td>
                            <td className="px-2 py-2">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${DOT[e.importance]}`} />
                              <span className="text-gray-200">{e.event}</span>
                              {chart && <span className={`ml-2 text-[10px] ${isOpen ? 'text-sky-300' : 'text-sky-500/70'}`}>{isOpen ? '▾ chart' : '▸ chart'}</span>}
                            </td>
                            <td className={`px-2 py-2 text-right font-semibold whitespace-nowrap w-24 ${TONE_TEXT[tone]}`}>{e.actual || '—'}</td>
                            <td className="px-2 py-2 text-right text-gray-400 whitespace-nowrap w-24">{e.forecast || '—'}</td>
                            <td className="px-2 pr-4 py-2 text-right text-gray-500 whitespace-nowrap w-24">{e.previous || '—'}</td>
                          </tr>
                          {isOpen && chart && (
                            <tr className="border-b border-slate-800/60 bg-slate-900/60">
                              <td colSpan={6} className="px-4">
                                <InlineMacroChart sym={chart.sym} label={chart.label} />
                              </td>
                            </tr>
                          )}
                          {preview && (
                            <tr className="border-b border-slate-800/60">
                              <td />
                              <td colSpan={5} className="px-2 pb-2 pt-0">
                                <span className={`text-[11px] italic ${preview.tone === 'pos' ? 'text-emerald-500/80' : preview.tone === 'neg' ? 'text-red-500/80' : 'text-gray-500'}`}>
                                  💬 {preview.text}
                                </span>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
            <div className="px-4 py-2 flex justify-between text-[10px] text-gray-600 bg-slate-900/60">
              <span>Actual / Forecast / Previous · click ▸ chart events for history · auto-refresh every 10 min</span>
              <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mr-1" />High <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 ml-2 mr-1" />Medium <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-500 ml-2 mr-1" />Low</span>
            </div>
          </div>
        )}

        {/* ── Releases tab ── */}
        {tab === 'releases' && (
          <div className="space-y-3">
            {loadingRel && loadingCal && <div className="p-6 text-center text-gray-500 text-sm rounded-xl border border-slate-800 bg-slate-900/40">Loading releases…</div>}
            {!loadingRel && !loadingCal && releaseStream.length === 0 && (
              <div className="p-6 text-center text-gray-500 text-sm rounded-xl border border-slate-800 bg-slate-900/40">
                No released figures available yet — check the Calendar tab for upcoming data.
              </div>
            )}
            {releaseStream.map((e, i) => {
              const c = makeComment(e);
              const tone = actualTone(e);
              return (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 hover:bg-slate-900/70 transition-colors">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base">{flagFor(e.region)}</span>
                    <span className="font-semibold text-white text-[13px]">{regionLabel(e.region)} — {e.event}</span>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${DOT[e.importance]}`} />
                    <span className="ml-auto text-[11px] text-gray-500">{e.date}{e.time ? ` · ${e.time}` : ''}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-4 text-[12px]">
                    <span>Actual: <b className={TONE_TEXT[tone]}>{e.actual ?? '—'}</b></span>
                    <span className="text-gray-400">Forecast: {e.forecast ?? '—'}</span>
                    <span className="text-gray-500">Previous: {e.previous ?? '—'}</span>
                  </div>
                  <p className={`mt-1.5 text-[12px] leading-relaxed ${c.tone === 'pos' ? 'text-emerald-400/90' : c.tone === 'neg' ? 'text-red-400/90' : 'text-gray-400'}`}>
                    💬 {c.text}
                  </p>
                </div>
              );
            })}

            {/* AI macro commentary */}
            {ai && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-4 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] font-bold text-indigo-300">🤖 AI Macro Commentary</span>
                  {ai.currentCycle && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">{ai.currentCycle}</span>}
                  {ai.direction && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ai.direction === 'bullish' ? 'bg-emerald-500/20 text-emerald-300' : ai.direction === 'bearish' ? 'bg-red-500/20 text-red-300' : 'bg-slate-500/20 text-gray-300'}`}>
                      {ai.direction}
                    </span>
                  )}
                </div>
                {ai.summary && <p className="text-[12px] text-gray-300 leading-relaxed">{ai.summary}</p>}
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  {!!ai.keyFactors?.length && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Key factors</div>
                      <ul className="space-y-0.5">{ai.keyFactors.slice(0, 5).map((k, i) => <li key={i} className="text-[11px] text-gray-400">• {k}</li>)}</ul>
                    </div>
                  )}
                  {!!ai.risks?.length && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Risks</div>
                      <ul className="space-y-0.5">{ai.risks.slice(0, 5).map((k, i) => <li key={i} className="text-[11px] text-red-400/80">• {k}</li>)}</ul>
                    </div>
                  )}
                </div>
              </div>
            )}
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
                  {sortedCountries.map((c) => (
                    <tr key={c.countryCode} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                      <td className="pl-4 pr-2 py-2.5 whitespace-nowrap">
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
                  ))}
                </tbody>
              </table>
            )}
            <div className="px-4 py-2 text-[10px] text-gray-600 bg-slate-900/60">
              {sortedCountries.length} countries · sorted by {sortKey}
            </div>
          </div>
        )}

        {/* ── News tab (economics stream) ── */}
        {tab === 'news' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            {loadingNews && <div className="p-6 text-center text-gray-500 text-sm">Loading news stream…</div>}
            {!loadingNews && (() => {
              const ECON_RE = /fed|ecb|boe|boj|inflation|cpi|ppi|gdp|interest rate|rate cut|rate hike|treasur|yield|bond|unemploy|jobs|payroll|recession|pmi|econom|central bank|stimulus|tariff|trade|deficit|debt|imf|consumer|housing|manufactur|retail sales/i;
              const econ = news.filter(n => ECON_RE.test(`${n.title} ${n.description || ''}`));
              const stream = (econ.length >= 5 ? econ : news).slice(0, 60);
              if (!stream.length) return <div className="p-6 text-center text-gray-500 text-sm">No headlines available right now.</div>;
              const ago = (d: string) => {
                const ms = Date.now() - new Date(d).getTime();
                if (!Number.isFinite(ms)) return '';
                const m = Math.floor(ms / 60000);
                if (m < 1) return 'now';
                if (m < 60) return `${m}m`;
                const h = Math.floor(m / 60);
                if (h < 24) return `${h}h`;
                return `${Math.floor(h / 24)}d`;
              };
              return (
                <div className="divide-y divide-slate-800/60">
                  {stream.map(n => (
                    <a key={n.id || n.url} href={n.url} target="_blank" rel="noopener noreferrer" className="group flex gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors">
                      <span className="shrink-0 w-10 pt-0.5 text-[11px] font-mono text-amber-300/80 tabular-nums">{ago(n.publishedDate)}</span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium leading-snug text-gray-200 group-hover:text-white transition-colors">{n.title}</span>
                        {n.description && <span className="mt-0.5 hidden sm:block text-[11.5px] text-gray-500 line-clamp-2">{n.description}</span>}
                        <span className="text-[10px] text-gray-600">{n.source}</span>
                      </span>
                    </a>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Forecasts tab (IMF WEO projections) ── */}
        {tab === 'forecasts' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-x-auto">
            {loadingFx && <div className="p-6 text-center text-gray-500 text-sm">Loading IMF forecasts…</div>}
            {!loadingFx && forecasts.length === 0 && (
              <div className="p-6 text-center text-gray-500 text-sm">Forecast data unavailable right now.</div>
            )}
            {!loadingFx && forecasts.length > 0 && (
              <>
                <table className="w-full text-[12px] min-w-[860px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 border-b border-slate-800 bg-slate-900/80">
                      <th className="pl-4 pr-2 py-2.5 font-semibold" rowSpan={2}>Country</th>
                      <th className="px-2 py-1.5 text-center font-semibold border-l border-slate-800" colSpan={fxYears.length}>GDP Growth %</th>
                      <th className="px-2 py-1.5 text-center font-semibold border-l border-slate-800" colSpan={fxYears.length}>Inflation %</th>
                      <th className="px-2 py-1.5 text-center font-semibold border-l border-slate-800" colSpan={2}>Unemployment %</th>
                      <th className="px-2 pr-4 py-1.5 text-center font-semibold border-l border-slate-800">Debt/GDP</th>
                    </tr>
                    <tr className="text-[10px] text-gray-600 border-b border-slate-800 bg-slate-900/80">
                      {fxYears.map(y => <th key={`g${y}`} className="px-2 py-1 text-right font-medium first:border-l first:border-slate-800">{y}</th>)}
                      {fxYears.map(y => <th key={`i${y}`} className="px-2 py-1 text-right font-medium first:border-l first:border-slate-800">{y}</th>)}
                      {fxYears.slice(0, 2).map(y => <th key={`u${y}`} className="px-2 py-1 text-right font-medium first:border-l first:border-slate-800">{y}</th>)}
                      <th className="px-2 pr-4 py-1 text-right font-medium border-l border-slate-800">{fxYears[0]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecasts.map(f => (
                      <tr key={f.code} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                        <td className="pl-4 pr-2 py-2 whitespace-nowrap">
                          <span className="mr-2">{flagFor(f.country)}</span>
                          <span className="text-white font-medium">{f.country}</span>
                        </td>
                        {fxYears.map(y => {
                          const v = f.gdpGrowth[y];
                          return <td key={`g${y}`} className={`px-2 py-2 text-right tabular-nums first:border-l first:border-slate-800/60 ${v == null ? 'text-gray-600' : v > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{v == null ? '—' : v.toFixed(1)}</td>;
                        })}
                        {fxYears.map(y => {
                          const v = f.inflation[y];
                          return <td key={`i${y}`} className={`px-2 py-2 text-right tabular-nums first:border-l first:border-slate-800/60 ${v == null ? 'text-gray-600' : v > 4 ? 'text-red-400' : v > 2.5 ? 'text-amber-400' : 'text-emerald-400'}`}>{v == null ? '—' : v.toFixed(1)}</td>;
                        })}
                        {fxYears.slice(0, 2).map(y => {
                          const v = f.unemployment[y];
                          return <td key={`u${y}`} className={`px-2 py-2 text-right tabular-nums text-gray-300 first:border-l first:border-slate-800/60 ${v == null ? 'text-gray-600' : ''}`}>{v == null ? '—' : v.toFixed(1)}</td>;
                        })}
                        <td className={`px-2 pr-4 py-2 text-right tabular-nums border-l border-slate-800/60 ${f.govDebt[fxYears[0]] == null ? 'text-gray-600' : (f.govDebt[fxYears[0]] as number) > 100 ? 'text-red-400' : 'text-gray-300'}`}>
                          {f.govDebt[fxYears[0]] == null ? '—' : `${(f.govDebt[fxYears[0]] as number).toFixed(0)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 text-[10px] text-gray-600 bg-slate-900/60">
                  IMF World Economic Outlook projections · {forecasts.length} countries
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
