'use client';

import { useEffect, useState } from 'react';

interface Asset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

const CATEGORIES: Array<{ key: string; label: string; icon: string }> = [
  { key: 'commodities', label: 'Commodities', icon: '🛢️' },
  { key: 'bonds', label: 'Bonds', icon: '📜' },
  { key: 'crypto', label: 'Crypto', icon: '₿' },
  { key: 'forex', label: 'Forex', icon: '💱' },
];

function fmtPrice(p: number, category: string) {
  if (!isFinite(p)) return '—';
  if (category === 'forex') return p.toFixed(4);
  if (category === 'crypto' && p < 10) return p.toFixed(4);
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return p.toFixed(2);
}

function CategoryTile({ category, label, icon }: { category: string; label: string; icon: string }) {
  const [data, setData] = useState<Asset[]>([]);
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
            const cp = Number(a.changePercent) || 0;
            const positive = cp >= 0;
            return (
              <div key={a.symbol} className="flex items-center justify-between text-[10px] border-b border-slate-800/40 last:border-0 py-0.5">
                <div className="min-w-0 flex-1">
                  <div className="text-white font-semibold truncate">{a.symbol.replace('=X', '').replace('=F', '').replace('-USD', '')}</div>
                  <div className="text-[9px] text-gray-500 truncate">{a.name}</div>
                </div>
                <div className="text-right ml-2">
                  <div className="text-gray-200 tabular-nums">{fmtPrice(a.price, category)}</div>
                  <div className={`tabular-nums font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {positive ? '+' : ''}{cp.toFixed(2)}%
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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {CATEGORIES.map(c => (
        <CategoryTile key={c.key} category={c.key} label={c.label} icon={c.icon} />
      ))}
    </div>
  );
}
