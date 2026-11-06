'use client';

import { useEffect, useMemo, useState } from 'react';
import { matchIndicator } from '@/components/ReleaseTape';
import type { TeCountry, TeIndicator } from '@/lib/te-catalog';

// In-house macro news stream (/api/macro-news). Plain DOM text — unlike an
// embedded widget it is searchable, filterable and translatable by the browser.
// Headlines that name a known release get a one-click "chart" link.

type Kind = 'central-bank' | 'data' | 'markets';
type Item = { id: string; title: string; url: string; source: string; kind: Kind; region: string; publishedAt: string; summary?: string };

const KIND_LABEL: Record<Kind, string> = { 'central-bank': 'CENTRAL BANKS', data: 'DATA', markets: 'MARKETS' };
const KIND_TONE: Record<Kind, string> = {
  'central-bank': 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  data: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  markets: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export default function MacroNewsPanel({ onChart, className = '' }: { onChart?: (c: TeCountry, i: TeIndicator) => void; className?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [q, setQ] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/macro-news', { cache: 'no-store', signal: AbortSignal.timeout(25000) });
        const j = await r.json();
        if (!alive) return;
        if (Array.isArray(j?.items) && j.items.length) { setItems(j.items); setStatus('ok'); }
        else setStatus((s) => (s === 'ok' ? 'ok' : 'error'));
      } catch { if (alive) setStatus((s) => (s === 'ok' ? 'ok' : 'error')); }
    };
    load();
    const poll = setInterval(() => { if (!document.hidden) load(); }, 3 * 60 * 1000);
    const tick = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => { alive = false; clearInterval(poll); clearInterval(tick); };
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => (kind === 'all' || it.kind === kind) && (!needle || `${it.title} ${it.source} ${it.summary || ''}`.toLowerCase().includes(needle)));
  }, [items, kind, q]);

  const chartFor = (it: Item) => {
    if (!onChart) return null;
    const code = it.region === 'WORLD' ? 'US' : it.region;
    return matchIndicator(code, it.title);
  };

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border-b border-[#1e293b] bg-[#0b1220]">
        {(['all', 'central-bank', 'data', 'markets'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border transition-colors ${kind === k ? 'bg-blue-600/30 border-blue-500/60 text-white' : 'border-[#1e293b] text-gray-400 hover:text-gray-200'}`}
          >
            {k === 'all' ? 'ALL' : KIND_LABEL[k]}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter headlines…"
          className="ml-auto w-40 sm:w-56 bg-[#0f172a] border border-[#1e293b] rounded px-2 py-0.5 text-[11px] text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/60"
        />
        <span className="text-[9px] text-gray-500 tabular-nums">{shown.length}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {status === 'loading' && !items.length && <div className="p-4 text-xs text-gray-500">Loading news…</div>}
        {status === 'error' && !items.length && <div className="p-4 text-xs text-amber-300">News feed unavailable right now. Retrying automatically.</div>}
        <ul className="divide-y divide-slate-800/60">
          {shown.map((it) => {
            const m = chartFor(it);
            return (
              <li key={it.id} className="px-2 py-1.5 hover:bg-[#111a2e] transition-colors">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-8 text-[10px] text-gray-500 tabular-nums pt-0.5">{ago(it.publishedAt, now)}</span>
                  <div className="min-w-0 flex-1">
                    <a href={it.url || '#'} target="_blank" rel="noopener noreferrer" className="block text-[12px] leading-snug text-gray-100 hover:text-white hover:underline">
                      {it.title}
                    </a>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className={`px-1 py-px rounded border text-[9px] font-semibold tracking-wide ${KIND_TONE[it.kind]}`}>{it.source}</span>
                      {it.region !== 'WORLD' && <span className="text-[9px] text-gray-500">{it.region}</span>}
                      {m && (
                        <button
                          type="button"
                          onClick={() => onChart?.(m.country, m.indicator)}
                          title={`Open ${m.country.name} · ${m.indicator.name} chart`}
                          className="px-1 py-px rounded border border-emerald-500/40 text-emerald-300 text-[9px] font-semibold tracking-wide hover:bg-emerald-500/10"
                        >
                          chart · {m.indicator.name}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
