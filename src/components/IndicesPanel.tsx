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

// Curated index metadata: short label, full name, region, accent color, flag
interface IndexMeta {
  symbol: string;
  short: string;       // ticker-like display (logo text)
  name: string;        // friendly name
  region: 'US' | 'EU' | 'UK' | 'DE' | 'FR' | 'JP' | 'HK' | 'CN' | 'GLOBAL';
  flag: string;        // emoji flag
  accent: string;      // tailwind gradient classes
}

const US_INDICES: IndexMeta[] = [
  { symbol: '^GSPC',  short: 'SPX',    name: 'S&P 500',         region: 'US', flag: '🇺🇸', accent: 'from-blue-500 to-indigo-600' },
  { symbol: '^NDX',   short: 'NDX',    name: 'Nasdaq 100',      region: 'US', flag: '🇺🇸', accent: 'from-emerald-500 to-teal-600' },
  { symbol: '^DJI',   short: 'DJIA',   name: 'Dow Jones',       region: 'US', flag: '🇺🇸', accent: 'from-amber-500 to-orange-600' },
  { symbol: '^RUT',   short: 'RUT',    name: 'Russell 2000',    region: 'US', flag: '🇺🇸', accent: 'from-rose-500 to-pink-600' },
  { symbol: '^VIX',   short: 'VIX',    name: 'Volatility',      region: 'US', flag: '🇺🇸', accent: 'from-fuchsia-500 to-purple-600' },
];

const INTL_INDICES: IndexMeta[] = [
  { symbol: '^FTSE',     short: 'FTSE',  name: 'FTSE 100',     region: 'UK',     flag: '🇬🇧', accent: 'from-red-600 to-blue-700' },
  { symbol: '^GDAXI',    short: 'DAX',   name: 'DAX 40',       region: 'DE',     flag: '🇩🇪', accent: 'from-yellow-500 to-red-600' },
  { symbol: '^FCHI',     short: 'CAC',   name: 'CAC 40',       region: 'FR',     flag: '🇫🇷', accent: 'from-blue-600 to-red-500' },
  { symbol: '^STOXX50E', short: 'SX5E',  name: 'Euro Stoxx 50', region: 'EU',    flag: '🇪🇺', accent: 'from-blue-500 to-yellow-500' },
  { symbol: '^N225',     short: 'N225',  name: 'Nikkei 225',   region: 'JP',     flag: '🇯🇵', accent: 'from-rose-500 to-red-600' },
  { symbol: '^HSI',      short: 'HSI',   name: 'Hang Seng',    region: 'HK',     flag: '🇭🇰', accent: 'from-red-500 to-amber-600' },
  { symbol: '^SSEC',     short: 'SSE',   name: 'Shanghai',     region: 'CN',     flag: '🇨🇳', accent: 'from-red-600 to-yellow-500' },
];

function fmtPrice(p: number, isVix: boolean) {
  if (!isFinite(p)) return '—';
  if (isVix) return p.toFixed(2);
  return p >= 1000 ? p.toLocaleString('en-US', { maximumFractionDigits: 2 }) : p.toFixed(2);
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

function IndexTile({ meta, quote, perf, tf }: { meta: IndexMeta; quote?: IndexQuote; perf: number | null | undefined; tf: TF }) {
  const isVix = meta.symbol === '^VIX';
  const cp = tf === '1D'
    ? (quote && isFinite(quote.changePercent) ? quote.changePercent : null)
    : (typeof perf === 'number' && isFinite(perf) ? perf : null);
  const positive = cp != null && cp >= 0;
  // VIX inversion: rising VIX = risk-off (red). Keep raw color but flip semantic via subtle hint.
  const colorClass = cp == null
    ? 'text-gray-500'
    : isVix
      ? (positive ? 'text-red-400' : 'text-emerald-400')
      : (positive ? 'text-emerald-400' : 'text-red-400');

  return (
    <div className="relative bg-white/[0.02] border border-[#1e293b] hover:border-slate-600 rounded-lg p-3 transition-colors overflow-hidden">
      {/* accent stripe */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${meta.accent} opacity-80`} />
      <div className="flex items-center gap-2 mb-2">
        {/* Logo badge */}
        <div className={`w-9 h-9 rounded-md bg-gradient-to-br ${meta.accent} flex items-center justify-center shadow-md shrink-0`}>
          <span className="text-[10px] font-black text-white tracking-tight">{meta.short}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-sm" aria-hidden>{meta.flag}</span>
            <h4 className="text-[11px] font-bold text-white truncate">{meta.name}</h4>
          </div>
          <p className="text-[9px] text-gray-500 uppercase tracking-wider">{meta.region}</p>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="min-w-0">
          <p className="text-[8px] text-gray-500 uppercase tracking-wider">Price</p>
          <p className="text-base font-bold text-gray-100 tabular-nums truncate">{quote ? fmtPrice(quote.price, isVix) : '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-gray-500 uppercase tracking-wider">{tf}</p>
          <p className={`text-sm font-bold tabular-nums ${colorClass}`}>
            {cp == null ? '—' : `${positive ? '+' : ''}${cp.toFixed(2)}%`}
          </p>
        </div>
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

  const allSymbols = useMemo(() => [...US_INDICES, ...INTL_INDICES].map(i => i.symbol), []);

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
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
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

      {/* US Indices */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">🇺🇸</span>
          <h3 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">United States</h3>
          <div className="flex-1 h-px bg-slate-800" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {US_INDICES.map(meta => (
            <IndexTile
              key={meta.symbol}
              meta={meta}
              quote={quotes[meta.symbol.toUpperCase()]}
              perf={perf[meta.symbol.toUpperCase()]}
              tf={tf}
            />
          ))}
        </div>
      </div>

      {/* International Indices */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">🌍</span>
          <h3 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">International</h3>
          <div className="flex-1 h-px bg-slate-800" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {INTL_INDICES.map(meta => (
            <IndexTile
              key={meta.symbol}
              meta={meta}
              quote={quotes[meta.symbol.toUpperCase()]}
              perf={perf[meta.symbol.toUpperCase()]}
              tf={tf}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
