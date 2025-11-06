"use client";

import { useEffect, useMemo, useState } from 'react';

type Row = {
  symbol: string;
  option: string;
  type: 'Call'|'Put';
  last: number | null;
  changePct: number | null;
  volume: number;
  oi: number;
  ivPct: number | null;
  strike: number;
  expiry: number; // epoch seconds
  delta?: number | null;
  gamma?: number | null;
};

type ApiResponse = {
  success: boolean;
  asOf: string;
  counts: { total: number };
  universe: string[];
  mostActive: Row[];
  topGainers: Row[];
  topLosers: Row[];
  highestIV: Row[];
  highestOI: Row[];
};

const tabs = [
  { key: 'mostActive', label: 'Most Active', defaultSort: { key: 'volume', dir: 'desc' as const } },
  { key: 'topGainers', label: 'Top Gainers', defaultSort: { key: 'changePct', dir: 'desc' as const } },
  { key: 'topLosers', label: 'Top Losers', defaultSort: { key: 'changePct', dir: 'asc' as const } },
  { key: 'highestIV', label: 'Highest IV', defaultSort: { key: 'ivPct', dir: 'desc' as const } },
  { key: 'highestOI', label: 'Highest OI', defaultSort: { key: 'oi', dir: 'desc' as const } },
];

function formatNum(n: number | null | undefined, opts: Intl.NumberFormatOptions = {}) {
  if (n == null || !isFinite(n)) return '—';
  return new Intl.NumberFormat(undefined, opts).format(n);
}

function expiryToStr(ts: number) {
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0,10);
}

export default function OptionsScreener() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [active, setActive] = useState<(typeof tabs)[number]['key']>('mostActive');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<'symbol'|'option'|'type'|'last'|'changePct'|'volume'|'oi'|'ivPct'>('volume');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(), 15000);
      const res = await fetch('/api/options-screener?limit=50', { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const js: ApiResponse = await res.json();
      setData(js);
      const tab = tabs.find(t=> t.key===active) || tabs[0];
      setSortKey(tab.defaultSort.key as any);
      setSortDir(tab.defaultSort.dir);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); const id = setInterval(fetchData, 5*60*1000); return ()=>clearInterval(id); /* 5 min */ }, []);

  const rows = useMemo(() => {
    if (!data) return [] as Row[];
    const all = (data as any)[active] as Row[];
    const f = filter.trim().toLowerCase();
    const filtered = !f ? all : all.filter(r => r.symbol.toLowerCase().includes(f) || r.option.toLowerCase().includes(f) || expiryToStr(r.expiry).includes(f));
    const sorted = [...filtered].sort((a,b)=>{
      const dir = sortDir==='asc'?1:-1;
      const av: any = (a as any)[sortKey];
      const bv: any = (b as any)[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv)*dir;
      return String(av).localeCompare(String(bv))*dir;
    });
    return sorted;
  }, [data, active, sortKey, sortDir, filter]);

  const onTab = (k: typeof tabs[number]['key']) => {
    setActive(k);
    const tab = tabs.find(t=> t.key===k)!;
    setSortKey(tab.defaultSort.key as any);
    setSortDir(tab.defaultSort.dir);
  };

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey===k) setSortDir(d=> d==='asc'?'desc':'asc'); else { setSortKey(k); setSortDir('desc'); }
  };

  if (loading) return <div className="bg-slate-800 border border-slate-700 rounded p-3 text-[11px] text-gray-300">Loading options screener…</div>;
  if (error || !data) return <div className="bg-slate-800 border border-slate-700 rounded p-3 text-[11px] text-red-300">{error || 'Failed to load'}</div>;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded">
      <div className="px-3 pt-3 flex items-center gap-2">
        <div className="flex items-center gap-2 text-[12px]">
          {tabs.map(t => (
            <button key={t.key} onClick={()=>onTab(t.key)} className={`px-2 py-1 rounded border ${active===t.key ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-700 text-gray-200 border-slate-600 hover:bg-slate-600'}`}>{t.label}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-[11px]">
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter symbol / option / expiry" className="px-2 py-1 bg-slate-700 border border-slate-600 rounded outline-none focus:ring-1 focus:ring-blue-500" />
          <span className="text-gray-400">{rows.length} / {data.counts.total}</span>
        </div>
      </div>
      <div className="mt-2 overflow-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-700 sticky top-0 z-10 shadow">
            <tr>
              {[
                {k:'symbol', l:'Symbol'},
                {k:'option', l:'Option'},
                {k:'type', l:'Type'},
                {k:'last', l:'Last'},
                {k:'changePct', l:'Chg %'},
                {k:'volume', l:'Volume'},
                {k:'oi', l:'OI'},
                {k:'ivPct', l:'IV'},
              ].map(col => (
                <th key={col.k} onClick={()=>toggleSort(col.k as any)} className="px-2 py-1 text-left font-semibold text-gray-200 cursor-pointer select-none whitespace-nowrap">{col.l}{sortKey===col.k && (sortDir==='asc'?' ▲':' ▼')}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {rows.map((r) => (
              <tr key={r.option} className="hover:bg-slate-700/40">
                <td className="px-2 py-1 font-medium text-white">{r.symbol}</td>
                <td className="px-2 py-1">
                  <span className="relative group inline-flex items-center gap-1 text-blue-300">
                    {r.option}
                    <span className="text-[9px] text-gray-400">{r.strike} · {expiryToStr(r.expiry)}</span>
                    <div className="absolute z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 -bottom-1 left-1/2 -translate-x-1/2 translate-y-full">
                      <div className="pointer-events-none whitespace-pre text-[10px] leading-tight bg-slate-900/95 border border-slate-600 shadow-xl rounded px-2 py-1 text-slate-200 max-w-[240px]">
                        <div>Strike: {r.strike}</div>
                        <div>Expiry: {expiryToStr(r.expiry)}</div>
                        <div>Delta: {r.delta==null?'—':formatNum(r.delta, { maximumFractionDigits: 3 })}</div>
                        <div>Gamma: {r.gamma==null?'—':formatNum(r.gamma, { maximumFractionDigits: 6 })}</div>
                      </div>
                    </div>
                  </span>
                </td>
                <td className="px-2 py-1">{r.type}</td>
                <td className="px-2 py-1 tabular-nums">{r.last==null?'—':`$${formatNum(r.last, { maximumFractionDigits: 2 })}`}</td>
                <td className={`px-2 py-1 tabular-nums ${r.changePct==null?'text-gray-300': r.changePct>0? 'text-green-500':'text-red-500'}`}>{r.changePct==null?'—':`${formatNum(r.changePct, { maximumFractionDigits: 2 })}%`}</td>
                <td className="px-2 py-1 tabular-nums">{formatNum(r.volume, { maximumFractionDigits: 0 })}</td>
                <td className="px-2 py-1 tabular-nums">{formatNum(r.oi, { maximumFractionDigits: 0 })}</td>
                <td className="px-2 py-1 tabular-nums">{r.ivPct==null?'—':`${formatNum(r.ivPct, { maximumFractionDigits: 1 })}%`}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 text-[10px] text-gray-400 border-t border-slate-700 flex items-center justify-between">
        <span>As of {new Date(data.asOf).toLocaleTimeString()}</span>
        <span>Universe: {data.universe.join(', ')}</span>
      </div>
    </div>
  );
}
