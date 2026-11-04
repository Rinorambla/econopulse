'use client';

import { useEffect, useMemo, useState } from 'react';
import { TE_COUNTRIES, indicatorsFor, type TeCountry, type TeIndicator } from '@/lib/te-catalog';

// Release tape: the latest macro prints (from /api/live-calendar) as one-click
// chips — pick one and the Indicator Chart jumps to that country/indicator, so
// news → chart needs no manual search. Mapping calendar event names onto the
// chart catalogue is heuristic (normalised keyword match within the country's
// own indicator list), tuned for the headline releases that move markets.

type CalEvent = {
  id: string; ts: string; code: string; region: string; event: string;
  importance: 'High' | 'Medium' | 'Low'; actual: string; forecast: string; previous: string; url: string;
};

const num = (s?: string) => { const v = parseFloat((s || '').replace(/[^\d.-]/g, '')); return Number.isFinite(v) ? v : null; };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Calendar wording → chart catalogue wording.
const EVENT_SYNONYMS: Array<[RegExp, string]> = [
  [/^cpi\b(?!.*core)|consumer price/i, 'inflation rate'],
  [/core cpi|core inflation/i, 'core inflation rate'],
  [/^ppi\b|producer price/i, 'producer prices change'],
  [/nonfarm payrolls|non-farm payrolls|employment change/i, 'non farm payrolls'],
  [/unemployment rate/i, 'unemployment rate'],
  [/jobless claims|initial claims/i, 'initial jobless claims'],
  [/average hourly earnings|wage/i, 'average hourly earnings'],
  [/jolts|job openings/i, 'job offers'],
  [/adp/i, 'adp employment change'],
  [/retail sales/i, 'retail sales'],
  [/gdp/i, 'gdp growth'],
  [/interest rate decision|rate decision|cash rate|bank rate|refinancing|deposit facility/i, 'interest rate'],
  [/ism manufacturing/i, 'business confidence'],
  [/ism (services|non-manufacturing)/i, 'non manufacturing pmi'],
  [/manufacturing pmi/i, 'manufacturing pmi'],
  [/services pmi/i, 'services pmi'],
  [/composite pmi/i, 'composite pmi'],
  [/michigan|consumer sentiment/i, 'consumer confidence'],
  [/consumer confidence/i, 'consumer confidence'],
  [/industrial production/i, 'industrial production'],
  [/durable goods/i, 'durable goods orders'],
  [/factory orders/i, 'factory orders'],
  [/trade balance|balance of trade/i, 'balance of trade'],
  [/current account/i, 'current account'],
  [/housing starts/i, 'housing starts'],
  [/building permits|building approvals/i, 'building permits'],
  [/new home sales/i, 'new home sales'],
  [/existing home sales/i, 'existing home sales'],
  [/pending home/i, 'pending home sales'],
  [/house price|hpi|home price/i, 'housing index'],
  [/ifo/i, 'business confidence'],
  [/zew/i, 'zew economic sentiment index'],
  [/pce price/i, 'core pce price index'],
  [/personal income/i, 'personal income'],
  [/personal spending/i, 'personal spending'],
  [/money supply|m2|m3/i, 'money supply m2'],
  [/foreign exchange reserves/i, 'foreign exchange reserves'],
  [/exports/i, 'exports'],
  [/imports/i, 'imports'],
  [/tankan/i, 'business confidence'],
  [/inflation expectations/i, 'inflation expectations'],
  [/capacity utilization/i, 'capacity utilization'],
  [/participation rate/i, 'labor force participation rate'],
];

/** Best-effort mapping of a calendar event to a chartable (country, indicator). */
export function matchIndicator(code: string, eventName: string): { country: TeCountry; indicator: TeIndicator } | null {
  const country = TE_COUNTRIES.find((c) => c.code === code);
  if (!country) return null;
  const list = indicatorsFor(country);
  let key = '';
  for (const [re, k] of EVENT_SYNONYMS) if (re.test(eventName)) { key = k; break; }
  const tokens = norm(key || eventName.replace(/\b(m\/m|y\/y|q\/q|mom|yoy|qoq|final|flash|prelim|prel|adv|advance|s\.?a\.?|n\.?s\.?a\.?)\b/gi, '')).split(' ').filter((t) => t.length > 1);
  if (!tokens.length) return null;
  let best: TeIndicator | null = null;
  let bestScore = 0;
  for (const i of list) {
    const h = norm(`${i.name} ${i.slug.replace(/-/g, ' ')}`);
    let score = 0;
    for (const t of tokens) if (h.includes(t)) score += t.length;
    if (score > 0) score -= h.length / 200; // prefer the shortest (headline) series
    if (score > bestScore) { bestScore = score; best = i; }
  }
  // Require most of the key to match, otherwise don't pretend.
  const need = tokens.join('').length * 0.6;
  return best && bestScore >= need ? { country, indicator: best } : null;
}

export default function ReleaseTape({ onPick }: { onPick: (c: TeCountry, i: TeIndicator) => void }) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/live-calendar', { cache: 'no-store', signal: AbortSignal.timeout(30000) });
        const j = await r.json();
        if (alive && j?.ok && Array.isArray(j.events)) setEvents(j.events);
      } catch { /* keep previous */ }
    };
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 3 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const items = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => e.actual && e.importance !== 'Low' && Date.parse(e.ts) <= now)
      .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))
      .map((e) => ({ e, m: matchIndicator(e.code, e.event) }))
      .filter((x): x is { e: CalEvent; m: NonNullable<ReturnType<typeof matchIndicator>> } => !!x.m)
      .slice(0, 14);
  }, [events]);

  if (!items.length) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 bg-slate-950/60 px-3 py-1.5 [scrollbar-width:thin]">
      <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest text-amber-400">Latest prints</span>
      <span className="shrink-0 font-mono text-[9px] text-gray-600">click → chart</span>
      {items.map(({ e, m }) => {
        const a = num(e.actual), f = num(e.forecast) ?? num(e.previous);
        const tone = a != null && f != null && a !== f ? (a > f ? 'text-emerald-300' : 'text-red-300') : 'text-gray-200';
        const ago = Math.max(0, Math.round((Date.now() - Date.parse(e.ts)) / 3600000));
        return (
          <button
            key={e.id}
            onClick={() => onPick(m.country, m.indicator)}
            title={`${e.region} — ${e.event}\nactual ${e.actual}${e.forecast ? ` · consensus ${e.forecast}` : ''}${e.previous ? ` · previous ${e.previous}` : ''}\nopen ${m.indicator.name} chart`}
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] transition-colors hover:border-amber-500/50 hover:bg-slate-800"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${e.importance === 'High' ? 'bg-red-400' : 'bg-amber-400'}`} />
            <span className="font-mono text-[10px] font-bold text-amber-400/80">{e.code}</span>
            <span className="max-w-[180px] truncate text-gray-300 group-hover:text-gray-100">{e.event}</span>
            <span className={`font-mono font-bold ${tone}`}>{e.actual}</span>
            {e.forecast && <span className="font-mono text-[10px] text-gray-500">vs {e.forecast}</span>}
            <span className="font-mono text-[9px] text-gray-600">{ago < 1 ? 'now' : ago < 24 ? `${ago}h` : `${Math.round(ago / 24)}d`}</span>
          </button>
        );
      })}
    </div>
  );
}
