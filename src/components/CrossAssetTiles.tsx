'use client';

import { useEffect, useMemo, useState } from 'react';

interface Asset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number; // 1D
}

interface PerfMap { [symbol: string]: number | null }

const CATEGORIES: Array<{ key: string; label: string; icon: string }> = [
  { key: 'commodities', label: 'Commodities', icon: '🛢️' },
  { key: 'bonds', label: 'Bonds', icon: '📜' },
  { key: 'crypto', label: 'Crypto', icon: '₿' },
  { key: 'forex', label: 'Forex', icon: '💱' },
];

type TF = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y';

const TF_TO_RANGE: Record<TF, { range: string; interval: string }> = {
  '1D': { range: '5d', interval: '1d' },
  '1W': { range: '1mo', interval: '1d' },
  '1M': { range: '3mo', interval: '1d' },
  '3M': { range: '6mo', interval: '1d' },
  'YTD': { range: '1y', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
};

function fmtPrice(p: number, category: string) {
  if (!isFinite(p)) return '—';
  if (category === 'forex') return p.toFixed(4);
  if (category === 'crypto' && p < 10) return p.toFixed(4);
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return p.toFixed(2);
}

function startOfYearTs(): number {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1).getTime();
}

function pickReferenceClose(bars: Array<{ time: number; close: number }>, tf: TF): number | null {
  if (!bars || bars.length === 0) return null;
  if (tf === '1D') {
    return bars.length >= 2 ? bars[bars.length - 2].close : null;
  }
  if (tf === 'YTD') {
    const soy = startOfYearTs();
    const ref = bars.find(b => b.time >= soy);
    return ref ? ref.close : bars[0].close;
  }
  const daysBack: Record<TF, number> = { '1D': 1, '1W': 5, '1M': 21, '3M': 63, 'YTD': 0, '1Y': 252 };
  const idx = Math.max(0, bars.length - 1 - daysBack[tf]);
  return bars[idx]?.close ?? bars[0].close;
}

function CategoryTile({ category, label, icon, tf }: { category: string; label: string; icon: string; tf: TF }) {
  const [data, setData] = useState<Asset[]>([]);
  const [perf, setPerf] = useState<PerfMap>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/yahoo-unified?category=${category}&limit=8`, { cache: 'no-store', signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setData(json.data.slice(0, 8));
          setErr(null);
        } else {
          throw new Error(json.error || 'Bad payload');
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') setErr(e.message || 'Error');
      } finally {
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { ctrl.abort(); clearInterval(id); };
  }, [category]);

  useEffect(() => {
    if (tf === '1D' || data.length === 0) { setPerf({}); return; }
    const ctrl = new AbortController();
    const symbols = data.map(d => d.symbol).join(',');
    const { range, interval } = TF_TO_RANGE[tf];
    (async () => {
      try {
        const res = await fetch(`/api/yahoo-history?symbols=${encodeURIComponent(symbols)}&range=${range}&interval=${interval}`, { cache: 'no-store', signal: ctrl.signal });
        if (!res.ok) return;
        const json = await res.json();
        if (!json.ok || !Array.isArray(json.data)) return;
        const map: PerfMap = {};
        json.data.forEach((h: any) => {
          if (!h?.bars?.length) { map[h.symbol] = null; return; }
          const last = h.bars[h.bars.length - 1].close;
          const ref = pickReferenceClose(h.bars, tf);
          map[h.symbol.toUpperCase()] = ref && isFinite(ref) && ref > 0 ? ((last - ref) / ref) * 100 : null;
        });
        setPerf(map);
      } catch { /* ignore */ }
    })();
    return () => ctrl.abort();
  }, [tf, data]);

  return (
    <div className="bg-white/[0.02] border border-[#1e293b] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{icon}</span>
          <h4 className="text-xs font-bold text-white">{label}</h4>
        </div>
        {loading ? (
          <span className="text-[9px] text-gray-500">…</span>
        ) : err ? (
          <span className="text-[9px] text-red-400">err</span>
        ) : (
          <span className="text-[9px] text-emerald-400">LIVE</span>
        )}
      </div>
      {err && !data.length ? (
        <div className="text-[10px] text-gray-500 italic">Data unavailable</div>
      ) : (
        <div className="space-y-1">
          {(loading && !data.length ? Array.from({ length: 5 }) : data).map((a: any, i: number) => {
            if (!a) return <div key={i} className="h-4 bg-slate-800/50 rounded animate-pulse" />;
            const tfPerf = tf === '1D' ? Number(a.changePercent) : perf[a.symbol.toUpperCase()];
            const cp = typeof tfPerf === 'number' && isFinite(tfPerf) ? tfPerf : null;
            const positive = cp != null && cp >= 0;
            return (
              <div key={a.symbol} className="flex items-center justify-between text-[10px] border-b border-slate-800/40 last:border-0 py-0.5">
                <div className="min-w-0 flex-1">
                  <div className="text-white font-semibold truncate">{a.symbol.replace('=X', '').replace('=F', '').replace('-USD', '')}</div>
                  <div className="text-[9px] text-gray-500 truncate">{a.name}</div>
                </div>
                <div className="text-right ml-2">
                  <div className="text-gray-200 tabular-nums">{fmtPrice(a.price, category)}</div>
                  <div className={`tabular-nums font-semibold ${cp == null ? 'text-gray-500' : positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {cp == null ? '—' : `${positive ? '+' : ''}${cp.toFixed(2)}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CrossAssetTiles() {
  const [tf, setTf] = useState<TF>('1D');
  const tfs = useMemo<TF[]>(() => ['1D', '1W', '1M', '3M', 'YTD', '1Y'], []);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-gray-400">Performance: <span className="text-white font-semibold">{tf}</span></div>
        <div className="inline-flex rounded-md bg-slate-900/60 border border-slate-800 p-0.5 gap-0.5">
          {tfs.map(t => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors ${tf === t ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white hover:bg-slate-800'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CATEGORIES.map(c => (
          <CategoryTile key={c.key} category={c.key} label={c.label} icon={c.icon} tf={tf} />
        ))}
      </div>
    </div>
  );
}
