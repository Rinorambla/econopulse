'use client';

import { useEffect, useMemo, useState } from 'react';

interface IndexQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

type TF = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y';

const TF_TO_RANGE: Record<TF, { range: string; interval: string }> = {
  '1D': { range: '5d', interval: '1d' },
  '1W': { range: '1mo', interval: '1d' },
  '1M': { range: '3mo', interval: '1d' },
  '3M': { range: '6mo', interval: '1d' },
  'YTD': { range: '1y', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
};

interface IndexMeta {
  symbol: string;
  short: string;
  name: string;
  flag: string;
  fallback?: string;
}

interface RegionGroup {
  key: string;
  label: string;
  icon: string;
  items: IndexMeta[];
}

const REGIONS: RegionGroup[] = [
  {
    key: 'americas',
    label: 'Americas',
    icon: '🇺🇸',
    items: [
      { symbol: '^GSPC', short: 'SPX',  name: 'S&P 500',      flag: '🇺🇸' },
      { symbol: '^NDX',  short: 'NDX',  name: 'Nasdaq 100',   flag: '🇺🇸' },
      { symbol: '^DJI',  short: 'DJIA', name: 'Dow Jones',    flag: '🇺🇸' },
      { symbol: '^RUT',  short: 'RUT',  name: 'Russell 2000', flag: '🇺🇸' },
    ],
  },
  {
    key: 'europe',
    label: 'Europe',
    icon: '🇪🇺',
    items: [
      { symbol: '^FTSE',      short: 'FTSE', name: 'FTSE 100',      flag: '🇬🇧' },
      { symbol: '^GDAXI',     short: 'DAX',  name: 'DAX 40',        flag: '🇩🇪' },
      { symbol: '^FCHI',      short: 'CAC',  name: 'CAC 40',        flag: '🇫🇷' },
      { symbol: 'FTSEMIB.MI', short: 'MIB',  name: 'FTSE MIB',      flag: '🇮🇹', fallback: 'EWI' },
      { symbol: '^STOXX50E',  short: 'SX5E', name: 'Euro Stoxx 50', flag: '🇪🇺' },
      { symbol: '^IBEX',      short: 'IBEX', name: 'IBEX 35',       flag: '🇪🇸' },
    ],
  },
  {
    key: 'asia',
    label: 'Asia-Pacific',
    icon: '🌏',
    items: [
      { symbol: '^N225',     short: 'N225',   name: 'Nikkei 225', flag: '🇯🇵' },
      { symbol: '^HSI',      short: 'HSI',    name: 'Hang Seng',  flag: '🇭🇰', fallback: 'EWH' },
      { symbol: '000001.SS', short: 'SSE',    name: 'Shanghai',   flag: '🇨🇳', fallback: '^SSEC' },
      { symbol: '^AXJO',     short: 'ASX',    name: 'ASX 200',    flag: '🇦🇺' },
      { symbol: '^KS11',     short: 'KOSPI',  name: 'KOSPI',      flag: '🇰🇷' },
      { symbol: '^BSESN',    short: 'SENSEX', name: 'BSE Sensex', flag: '🇮🇳' },
    ],
  },
  {
    key: 'volatility',
    label: 'Volatility & USD',
    icon: '⚡',
    items: [
      { symbol: '^VIX',     short: 'VIX',  name: 'CBOE Volatility', flag: '🇺🇸' },
      { symbol: '^VVIX',    short: 'VVIX', name: 'VIX of VIX',      flag: '🇺🇸' },
      { symbol: '^MOVE',    short: 'MOVE', name: 'Bond Volatility', flag: '🇺🇸', fallback: 'TLT' },
      { symbol: '^V2TX',    short: 'V2X',  name: 'Euro VSTOXX',     flag: '🇪🇺' },
      { symbol: 'DX-Y.NYB', short: 'DXY',  name: 'Dollar Index',    flag: '💵' },
    ],
  },
];

function fmtPrice(p: number) {
  if (!isFinite(p)) return '—';
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return p.toFixed(2);
}

function startOfYearTs(): number {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1).getTime();
}

function pickReferenceClose(bars: Array<{ time: number; close: number }>, tf: TF): number | null {
  if (!bars || bars.length === 0) return null;
  if (tf === '1D') return bars.length >= 2 ? bars[bars.length - 2].close : null;
  if (tf === 'YTD') {
    const soy = startOfYearTs();
    const ref = bars.find(b => b.time >= soy);
    return ref ? ref.close : bars[0].close;
  }
  const daysBack: Record<TF, number> = { '1D': 1, '1W': 5, '1M': 21, '3M': 63, 'YTD': 0, '1Y': 252 };
  const idx = Math.max(0, bars.length - 1 - daysBack[tf]);
  return bars[idx]?.close ?? bars[0].close;
}

function RegionCard({ region, quotes, perf, tf }: {
  region: RegionGroup;
  quotes: Record<string, IndexQuote>;
  perf: Record<string, number | null>;
  tf: TF;
}) {
  return (
    <div className="bg-white/[0.02] border border-[#1e293b] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{region.icon}</span>
          <h4 className="text-xs font-bold text-white">{region.label}</h4>
        </div>
        <span className="text-[9px] text-emerald-400">LIVE</span>
      </div>
      <div className="space-y-1">
        {region.items.map(meta => {
          const primary = quotes[meta.symbol.toUpperCase()];
          const fb = meta.fallback ? quotes[meta.fallback.toUpperCase()] : undefined;
          const q = primary && isFinite(primary.price) && primary.price > 0 ? primary : fb;
          const isVix = ['VIX', 'VVIX', 'V2X', 'MOVE'].includes(meta.short);

          let cp: number | null;
          if (tf === '1D') {
            cp = q && isFinite(q.changePercent) ? q.changePercent : null;
          } else {
            const usedSym = q?.symbol?.toUpperCase() || meta.symbol.toUpperCase();
            const v = perf[usedSym];
            cp = typeof v === 'number' && isFinite(v) ? v : null;
          }
          const positive = cp != null && cp >= 0;
          const colorClass = cp == null
            ? 'text-gray-500'
            : isVix
              ? (positive ? 'text-red-400' : 'text-emerald-400')
              : (positive ? 'text-emerald-400' : 'text-red-400');

          return (
            <div key={meta.symbol} className="flex items-center justify-between text-[10px] border-b border-slate-800/40 last:border-0 py-0.5">
              <div className="min-w-0 flex-1 flex items-center gap-1.5">
                <span className="text-[11px]" aria-hidden>{meta.flag}</span>
                <div className="min-w-0">
                  <div className="text-white font-semibold truncate">{meta.short}</div>
                  <div className="text-[9px] text-gray-500 truncate">{meta.name}</div>
                </div>
              </div>
              <div className="text-right ml-2">
                <div className="text-gray-200 tabular-nums">{q ? fmtPrice(q.price) : '—'}</div>
                <div className={`tabular-nums font-semibold ${colorClass}`}>
                  {cp == null ? '—' : `${positive ? '+' : ''}${cp.toFixed(2)}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function IndicesPanel() {
  const [quotes, setQuotes] = useState<Record<string, IndexQuote>>({});
  const [perf, setPerf] = useState<Record<string, number | null>>({});
  const [tf, setTf] = useState<TF>('1D');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const allSymbols = useMemo(() => {
    const s: string[] = [];
    REGIONS.forEach(r => r.items.forEach(i => {
      s.push(i.symbol);
      if (i.fallback) s.push(i.fallback);
    }));
    return Array.from(new Set(s));
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/yahoo-unified?symbols=${encodeURIComponent(allSymbols.join(','))}`, { cache: 'no-store', signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          const map: Record<string, IndexQuote> = {};
          json.data.forEach((q: any) => {
            if (q?.symbol) map[String(q.symbol).toUpperCase()] = {
              symbol: q.symbol,
              name: q.name,
              price: Number(q.price),
              change: Number(q.change),
              changePercent: Number(q.changePercent),
            };
          });
          setQuotes(map);
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
  }, [allSymbols]);

  useEffect(() => {
    if (tf === '1D') { setPerf({}); return; }
    const ctrl = new AbortController();
    const { range, interval } = TF_TO_RANGE[tf];
    (async () => {
      try {
        const res = await fetch(`/api/yahoo-history?symbols=${encodeURIComponent(allSymbols.join(','))}&range=${range}&interval=${interval}`, { cache: 'no-store', signal: ctrl.signal });
        if (!res.ok) return;
        const json = await res.json();
        if (!json.ok || !Array.isArray(json.data)) return;
        const map: Record<string, number | null> = {};
        json.data.forEach((h: any) => {
          if (!h?.bars?.length) { map[String(h.symbol).toUpperCase()] = null; return; }
          const last = h.bars[h.bars.length - 1].close;
          const ref = pickReferenceClose(h.bars, tf);
          map[String(h.symbol).toUpperCase()] = ref && isFinite(ref) && ref > 0 ? ((last - ref) / ref) * 100 : null;
        });
        setPerf(map);
      } catch { /* ignore */ }
    })();
    return () => ctrl.abort();
  }, [tf, allSymbols]);

  const tfs: TF[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y'];

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="text-[10px] text-gray-400">
          Performance: <span className="text-white font-semibold">{tf}</span>
          {loading && <span className="ml-2 text-gray-600">loading…</span>}
          {err && <span className="ml-2 text-red-400">err</span>}
        </div>
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
        {REGIONS.map(region => (
          <RegionCard key={region.key} region={region} quotes={quotes} perf={perf} tf={tf} />
        ))}
      </div>
    </div>
  );
}
