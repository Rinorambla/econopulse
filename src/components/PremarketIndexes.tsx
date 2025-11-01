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

type IndexCfg = { id: string; label: string; fetch: string };
// Minimal table view with direct index tickers as requested
const INDEXES: IndexCfg[] = [
  { id: '^GSPC', label: 'S&P 500', fetch: '^GSPC' },
  { id: '^DJI', label: 'Dow Jones', fetch: '^DJI' },
  { id: '^RUT', label: '^RUT', fetch: '^RUT' },
  { id: '^NDX', label: '^NDX', fetch: '^NDX' },
  { id: '^VIX', label: 'VIX', fetch: '^VIX' },
  { id: '^N225', label: 'Nikkei 225', fetch: '^N225' },
];

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
        const qs = new URLSearchParams({ symbols: INDEXES.map(i=> i.fetch).join(',') });
        const r = await fetch(`/api/yahoo-extended-quotes?${qs.toString()}`, { cache: 'no-store' });
        if (!r.ok) throw new Error(`api_status_${r.status}`);
        const ct = r.headers.get('content-type') || '';
        if (ct.includes('text/html')) {
          // Likely Vercel protection page — try direct Yahoo as a best-effort fallback from the browser
          try {
            const y = await fetch(`https://query2.finance.yahoo.com/v7/finance/quote?${qs.toString()}`, { cache: 'no-store' });
            const yct = y.headers.get('content-type') || '';
            if (!y.ok || !yct.includes('application/json')) throw new Error('yahoo_cors_or_blocked');
            const yj = await y.json();
            const arr: ExtQ[] = ((yj?.quoteResponse?.result) || []).map((r: any)=> ({
              symbol: r.symbol,
              marketState: r.marketState,
              regularMarketPrice: r.regularMarketPrice ?? null,
              regularMarketChangePercent: r.regularMarketChangePercent ?? null,
              preMarketPrice: r.preMarketPrice ?? null,
              preMarketChangePercent: r.preMarketChangePercent ?? null,
              postMarketPrice: r.postMarketPrice ?? null,
              postMarketChangePercent: r.postMarketChangePercent ?? null,
              shortName: r.shortName ?? r.longName ?? null,
            }));
            if (alive) {
              setRows(arr);
            }
          } catch (e) {
            // ignore; we’ll keep placeholders
          }
          return;
        }
        const j = await r.json();
        const arr: ExtQ[] = (j?.data||[]) as ExtQ[];
        if (alive) {
          setRows(arr);
        }
      } catch (e: any) {
        // ignore; we’ll keep placeholders
      }
    };
    load();
    timer = setInterval(load, 20_000);
    return ()=>{ alive=false; if (timer) clearInterval(timer); };
  }, []);

  const dataMap = (id: string)=> pickDisplay(rows.find(r=> r.symbol===id));

  return (
    <div className="bg-[var(--color-panel)]/70 backdrop-blur-sm border-y border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.04]">
          <div className="px-3 py-2 grid grid-cols-[1fr_auto] gap-2 text-xs text-white/60">
            <div>Indices</div>
            <div className="text-right">Chg</div>
          </div>
          <div className="divide-y divide-white/10">
            {INDEXES.map((cfg)=>{
              const d = dataMap(cfg.fetch);
              const pct = d.pct ?? null;
              const up = (pct ?? 0) >= 0;
              return (
                <div key={cfg.id} className="px-3 py-1.5 grid grid-cols-[1fr_auto] gap-2 items-baseline">
                  <div className="text-white/90">
                    <span className="font-medium">{cfg.label}</span>
                    <span className="ml-2 text-white/60">{d.price != null ? d.price.toFixed(2) : '—'}</span>
                  </div>
                  <div className={`text-right text-[13px] font-medium ${pct==null ? 'text-white/50' : up ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pct != null ? `${up?'+':''}${pct.toFixed(2)}%` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
