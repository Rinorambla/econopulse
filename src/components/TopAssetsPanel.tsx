'use client';

// Top Assets by Market Cap — companiesmarketcap.com style: rank, asset,
// market cap, price, today %, 30-day sparkline, country. Self-refreshing.
import { useEffect, useState } from 'react';

type AssetRow = {
  rank: number; symbol: string; name: string; icon?: string;
  marketCap: number; price: number; todayPct: number | null;
  spark: number[]; country: string; flag: string; kind: 'company' | 'metal' | 'crypto';
};

const fmtCap = (n: number) => n >= 1e12 ? `$${(n / 1e12).toFixed(3)} T` : `$${(n / 1e9).toFixed(0)} B`;
const fmtPrice = (n: number) => n >= 1000 ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${n.toFixed(2)}`;

function Spark({ data }: { data: number[] }) {
  if (!data || data.length < 2) return <span className="text-gray-600 text-[10px]">—</span>;
  const W = 96, H = 26, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <path d={path} fill="none" stroke={up ? '#34d399' : '#f87171'} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function TopAssetsPanel() {
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/top-assets', { cache: 'no-store', signal: AbortSignal.timeout(25000) });
        if (!r.ok) return;
        const j = await r.json();
        if (alive && Array.isArray(j?.data)) setRows(j.data);
      } catch { /* keep previous */ }
      finally { if (alive) setLoading(false); }
    };
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 5 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (loading && !rows.length) {
    return (
      <div className="p-3 space-y-2">
        {[...Array(8)].map((_, i) => <div key={i} className="h-8 bg-slate-800/40 rounded animate-pulse" />)}
      </div>
    );
  }
  if (!rows.length) {
    return <div className="p-4 text-center text-[11px] text-gray-500">Asset ranking unavailable right now.</div>;
  }

  return (
    <div className="p-2 overflow-x-auto">
      <table className="w-full text-[11px] min-w-[640px]">
        <thead>
          <tr className="text-[9px] uppercase tracking-wider text-gray-500 border-b border-slate-800/60">
            <th className="text-left py-1.5 pl-2 w-8">#</th>
            <th className="text-left py-1.5">Name</th>
            <th className="text-right py-1.5">Market Cap</th>
            <th className="text-right py-1.5">Price</th>
            <th className="text-right py-1.5">Today</th>
            <th className="text-center py-1.5 hidden sm:table-cell">30 Days</th>
            <th className="text-right py-1.5 pr-2 hidden md:table-cell">Country</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const up = (r.todayPct ?? 0) >= 0;
            const highlight = r.kind === 'metal' ? 'bg-amber-500/[0.06]' : r.kind === 'crypto' ? 'bg-orange-500/[0.05]' : '';
            return (
              <tr key={r.symbol} className={`border-b border-slate-800/40 last:border-0 hover:bg-white/[0.03] ${highlight}`}>
                <td className="py-1.5 pl-2 text-gray-400 tabular-nums">{r.rank}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.icon ? (
                      <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[11px] shrink-0">{r.icon}</span>
                    ) : (
                      <img
                        src={`https://assets.parqet.com/logos/symbol/${r.symbol}?format=jpg`}
                        alt=""
                        loading="lazy"
                        className="w-5 h-5 rounded-full bg-slate-800 object-cover shrink-0"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block text-white font-semibold truncate">{r.name}</span>
                      <span className="block text-[9px] text-gray-500">{r.symbol.replace(/=F$|-USD$/, '')}</span>
                    </span>
                  </div>
                </td>
                <td className="py-1.5 text-right text-gray-100 font-semibold tabular-nums">{fmtCap(r.marketCap)}</td>
                <td className="py-1.5 text-right text-gray-200 tabular-nums">{fmtPrice(r.price)}</td>
                <td className={`py-1.5 text-right font-semibold tabular-nums ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                  {r.todayPct == null ? '—' : `${up ? '+' : ''}${r.todayPct.toFixed(2)}%`}
                </td>
                <td className="py-1.5 text-center hidden sm:table-cell"><Spark data={r.spark} /></td>
                <td className="py-1.5 pr-2 text-right text-gray-400 hidden md:table-cell whitespace-nowrap">{r.flag !== '🌐' ? `${r.flag} ${r.country}` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
