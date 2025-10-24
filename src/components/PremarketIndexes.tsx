"use client";

import React from 'react';

type ExtQ = {
  symbol: string;
  marketState?: string;
  regularMarketPrice?: number | null;
  regularMarketChangePercent?: number | null;
  preMarketPrice?: number | null;
  preMarketChangePercent?: number | null;
  postMarketPrice?: number | null;
  postMarketChangePercent?: number | null;
  shortName?: string | null;
};

const INDEXES = ['^GSPC','^NDX','^DJI','^RUT'];
const LABELS: Record<string,string> = { '^GSPC':'S&P 500', '^NDX':'Nasdaq 100', '^DJI':'Dow Jones', '^RUT':'Russell 2000' };

function pickDisplay(q?: ExtQ): { price?: number | null; pct?: number | null; stateLabel: string } {
  if (!q) return { price: undefined, pct: undefined, stateLabel: '—' };
  const st = (q.marketState || '').toUpperCase();
  // Normalize state buckets
  const isPre = st.includes('PRE');
  const isPost = st.includes('POST') && !isPre;
  const isRegular = st.includes('REGULAR');

  if (isPre && (q.preMarketPrice ?? null) !== null) {
    return { price: q.preMarketPrice!, pct: q.preMarketChangePercent ?? null, stateLabel: 'Premarket' };
  }
  if (isRegular) {
    return { price: q.regularMarketPrice ?? null, pct: q.regularMarketChangePercent ?? null, stateLabel: 'Live' };
  }
  if (isPost && (q.postMarketPrice ?? null) !== null) {
    return { price: q.postMarketPrice!, pct: q.postMarketChangePercent ?? null, stateLabel: 'After hours' };
  }
  // Fallbacks
  if ((q.preMarketPrice ?? null) !== null) return { price: q.preMarketPrice!, pct: q.preMarketChangePercent ?? null, stateLabel: 'Premarket' };
  if ((q.postMarketPrice ?? null) !== null) return { price: q.postMarketPrice!, pct: q.postMarketChangePercent ?? null, stateLabel: 'After hours' };
  return { price: q.regularMarketPrice ?? null, pct: q.regularMarketChangePercent ?? null, stateLabel: 'Close' };
}

export default function PremarketIndexes() {
  const [rows, setRows] = React.useState<ExtQ[]>([]);

  React.useEffect(()=>{
    let alive = true;
    let timer: any;
    const load = async ()=>{
      try {
        const qs = new URLSearchParams({ symbols: INDEXES.join(',') });
        const r = await fetch(`/api/yahoo-extended-quotes?${qs.toString()}`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        const arr: ExtQ[] = (j?.data||[]) as ExtQ[];
        if (alive) setRows(arr);
      } catch {}
    };
    load();
    timer = setInterval(load, 20_000);
    return ()=>{ alive=false; if (timer) clearInterval(timer); };
  }, []);

  // Determine overall state label from the first index
  const overall = pickDisplay(rows.find(r=> r.symbol===INDEXES[0]));

  return (
    <div className="bg-[var(--color-panel)]/70 backdrop-blur-sm border-y border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-white/60">Stock Indexes</div>
          <div className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 bg-white/5 text-white/70">{overall.stateLabel}</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {INDEXES.map((sym)=>{
            const q = rows.find(r=> r.symbol===sym);
            const d = pickDisplay(q);
            const pct = d.pct ?? 0;
            const up = (pct||0) >= 0;
            return (
              <div key={sym} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/70">{LABELS[sym]}</div>
                  <div className="text-[10px] text-white/50">{d.stateLabel}</div>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-white font-semibold text-sm">{d.price != null ? d.price.toFixed(2) : '—'}</div>
                  <div className={`text-[11px] font-medium ${up?'text-emerald-400':'text-red-400'}`}>{d.pct != null ? `${up?'+':''}${pct.toFixed(2)}%`:'—'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
