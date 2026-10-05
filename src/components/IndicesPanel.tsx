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
  'YTD': { range: '2y', interval: '1d' },
  '1Y': { range: '2y', interval: '1d' },
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
    key: 'major',
    label: 'Majors',
    icon: '⭐',
    items: [
      { symbol: '^GSPC', short: 'SPX',  name: 'S&P 500',       flag: '🇺🇸' },
      { symbol: '^NDX',  short: 'NDX',  name: 'Nasdaq 100',    flag: '🇺🇸' },
      { symbol: '^DJI',  short: 'DJIA', name: 'Dow Jones',     flag: '🇺🇸' },
      { symbol: '^RUT',  short: 'RUT',  name: 'Russell 2000',  flag: '🇺🇸' },
      { symbol: '^VIX',  short: 'VIX',  name: 'CBOE Volatility', flag: '⚡' },
      { symbol: 'DX-Y.NYB', short: 'DXY', name: 'Dollar Index', flag: '💵' },
    ],
  },
  {
    key: 'futures',
    label: 'Index Futures',
    icon: '📈',
    items: [
      { symbol: 'ES=F',  short: 'ES',   name: 'S&P 500 Fut',    flag: '🇺🇸' },
      { symbol: 'NQ=F',  short: 'NQ',   name: 'Nasdaq 100 Fut', flag: '🇺🇸' },
      { symbol: 'YM=F',  short: 'YM',   name: 'Dow Fut',        flag: '🇺🇸' },
      { symbol: 'RTY=F', short: 'RTY',  name: 'Russell Fut',    flag: '🇺🇸' },
      { symbol: 'NKD=F', short: 'NKD',  name: 'Nikkei 225 Fut', flag: '🇯🇵' },
      { symbol: 'GC=F',  short: 'GOLD', name: 'Gold Fut',       flag: '🥇' },
      { symbol: 'CL=F',  short: 'WTI',  name: 'Crude Oil Fut',  flag: '🛢️' },
    ],
  },
  {
    key: 'americas',
    label: 'Americas',
    icon: '🌎',
    items: [
      { symbol: '^GSPTSE', short: 'TSX',    name: 'S&P/TSX (Canada)', flag: '🇨🇦' },
      { symbol: '^BVSP',   short: 'IBOV',   name: 'Bovespa (Brazil)', flag: '🇧🇷' },
      { symbol: '^MXX',    short: 'IPC',    name: 'IPC (Mexico)',     flag: '🇲🇽' },
      { symbol: '^MERV',   short: 'MERVAL', name: 'Merval (Argentina)', flag: '🇦🇷' },
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
      { symbol: '^AEX',       short: 'AEX',  name: 'AEX (Netherlands)', flag: '🇳🇱' },
      { symbol: '^SSMI',      short: 'SMI',  name: 'SMI (Switzerland)', flag: '🇨🇭' },
      { symbol: '^OMX',       short: 'OMX',  name: 'OMX 30 (Sweden)', flag: '🇸🇪' },
    ],
  },
  {
    key: 'asia',
    label: 'Asia/Pacific',
    icon: '🌏',
    items: [
      { symbol: '^N225',     short: 'N225',   name: 'Nikkei 225', flag: '🇯🇵' },
      { symbol: '^HSI',      short: 'HSI',    name: 'Hang Seng',  flag: '🇭🇰', fallback: 'EWH' },
      { symbol: '000001.SS', short: 'SSE',    name: 'Shanghai',   flag: '🇨🇳', fallback: '^SSEC' },
      { symbol: '^AXJO',     short: 'ASX',    name: 'ASX 200',    flag: '🇦🇺' },
      { symbol: '^KS11',     short: 'KOSPI',  name: 'KOSPI',      flag: '🇰🇷' },
      { symbol: '^BSESN',    short: 'SENSEX', name: 'BSE Sensex', flag: '🇮🇳' },
      { symbol: '^NSEI',     short: 'NIFTY',  name: 'Nifty 50',   flag: '🇮🇳' },
      { symbol: '^TWII',     short: 'TAIEX',  name: 'Taiwan Weighted', flag: '🇹🇼' },
      { symbol: '^STI',      short: 'STI',    name: 'Straits Times', flag: '🇸🇬' },
      { symbol: '^JKSE',     short: 'JCI',    name: 'Jakarta Comp.', flag: '🇮🇩' },
    ],
  },
  {
    key: 'mideast',
    label: 'Middle East',
    icon: '🕌',
    items: [
      { symbol: '^TA125.TA', short: 'TA-125', name: 'Tel Aviv 125',  flag: '🇮🇱', fallback: 'EIS' },
      { symbol: '^TASI.SR',  short: 'TASI',   name: 'Tadawul (Saudi)', flag: '🇸🇦', fallback: 'KSA' },
      { symbol: 'XU100.IS',  short: 'BIST',   name: 'BIST 100 (Turkey)', flag: '🇹🇷', fallback: 'TUR' },
      { symbol: 'QAT',       short: 'QAT',    name: 'Qatar (ETF)',   flag: '🇶🇦' },
      { symbol: 'UAE',       short: 'UAE',    name: 'UAE (ETF)',     flag: '🇦🇪' },
    ],
  },
  {
    key: 'africa',
    label: 'Africa',
    icon: '🌍',
    items: [
      { symbol: 'EZA',  short: 'EZA',  name: 'South Africa (ETF)', flag: '🇿🇦' },
      { symbol: 'NGE',  short: 'NGE',  name: 'Nigeria (ETF)',      flag: '🇳🇬' },
      { symbol: 'EGPT', short: 'EGPT', name: 'Egypt (ETF)',        flag: '🇪🇬' },
      { symbol: 'AFK',  short: 'AFK',  name: 'Africa (ETF)',       flag: '🌍' },
    ],
  },
];

function fmtPrice(p: number) {
  if (!isFinite(p)) return '—';
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return p.toFixed(2);
}

// ── Government bonds · world 10Y yields (FRED: US daily, others OECD monthly) ─
const BOND_SERIES: { id: string; short: string; name: string; flag: string }[] = [
  { id: 'DGS10', short: 'US 10Y', name: 'US Treasury', flag: '🇺🇸' },
  { id: 'IRLTLT01DEM156N', short: 'DE 10Y', name: 'Bund', flag: '🇩🇪' },
  { id: 'IRLTLT01ITM156N', short: 'IT 10Y', name: 'BTP', flag: '🇮🇹' },
  { id: 'IRLTLT01FRM156N', short: 'FR 10Y', name: 'OAT', flag: '🇫🇷' },
  { id: 'IRLTLT01GBM156N', short: 'UK 10Y', name: 'Gilt', flag: '🇬🇧' },
  { id: 'IRLTLT01JPM156N', short: 'JP 10Y', name: 'JGB', flag: '🇯🇵' },
  { id: 'IRLTLT01CAM156N', short: 'CA 10Y', name: 'Canada', flag: '🇨🇦' },
  { id: 'IRLTLT01AUM156N', short: 'AU 10Y', name: 'Australia', flag: '🇦🇺' },
];

function GovBondsCard() {
  const [rows, setRows] = useState<Record<string, { yield: number; deltaBp: number | null }>>({});
  useEffect(() => {
    let alive = true;
    const fetchOne = async (b: { id: string }) => {
      try {
        const r = await fetch(`/api/fred-history?series=${b.id}&range=1y`, { cache: 'no-store', signal: AbortSignal.timeout(9000) });
        if (!r.ok) return null;
        const j = await r.json();
        const bars = j?.data?.bars;
        if (!Array.isArray(bars) || !bars.length) return null;
        const last = bars[bars.length - 1].close;
        const prev = bars.length > 1 ? bars[bars.length - 2].close : null;
        return { id: b.id, yield: last, deltaBp: prev != null ? (last - prev) * 100 : null };
      } catch { return null; }
    };
    const load = async () => {
      let results = await Promise.all(BOND_SERIES.map(fetchOne));
      // retry once for rows that raced/rate-limited on first load
      const missing = BOND_SERIES.filter((_, i) => !results[i]);
      if (missing.length && alive) {
        await new Promise(r => setTimeout(r, 1500));
        const retry = await Promise.all(missing.map(fetchOne));
        results = results.map(r => r ?? retry.shift() ?? null);
      }
      if (!alive) return;
      setRows(prevRows => {
        const map = { ...prevRows };
        for (const r of results) if (r) map[r.id] = { yield: r.yield, deltaBp: r.deltaBp };
        return map;
      });
    };
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 10 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[#1e293b]">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🏛️</span>
          <h4 className="text-xs font-bold text-white uppercase tracking-wide">Govt Bonds · 10Y</h4>
        </div>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
      </div>
      <div className="space-y-1">
        {BOND_SERIES.map((b) => {
          const r = rows[b.id];
          const up = r?.deltaBp != null && r.deltaBp >= 0;
          return (
            <div key={b.id} className="flex items-center justify-between text-[10px] border-b border-slate-800/40 last:border-0 py-0.5">
              <div className="min-w-0 flex-1 flex items-center gap-1.5">
                <span className="text-[11px]" aria-hidden>{b.flag}</span>
                <div className="min-w-0">
                  <div className="text-white font-semibold truncate">{b.short}</div>
                  <div className="text-[9px] text-gray-500 truncate">{b.name}</div>
                </div>
              </div>
              <div className="text-right ml-2">
                <div className="text-gray-200 tabular-nums">{r ? `${r.yield.toFixed(2)}%` : '—'}</div>
                <div className={`tabular-nums font-semibold ${r?.deltaBp == null ? 'text-gray-500' : up ? 'text-red-400' : 'text-emerald-400'}`}>
                  {r?.deltaBp == null ? '—' : `${up ? '+' : ''}${r.deltaBp.toFixed(0)} bp`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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
  // Resolve quote + timeframe % for each row first so bars can share one scale.
  const rows = region.items.map(meta => {
    const primary = quotes[meta.symbol.toUpperCase()];
    const fb = meta.fallback ? quotes[meta.fallback.toUpperCase()] : undefined;
    const q = primary && isFinite(primary.price) && primary.price > 0 ? primary : fb;
    let cp: number | null;
    if (tf === '1D') {
      cp = q && isFinite(q.changePercent) ? q.changePercent : null;
    } else {
      const keys = [q?.symbol?.toUpperCase(), meta.symbol.toUpperCase(), meta.fallback?.toUpperCase()].filter(Boolean) as string[];
      let v: number | null | undefined;
      for (const k of keys) { if (perf[k] != null) { v = perf[k]; break; } }
      cp = typeof v === 'number' && isFinite(v) ? v : null;
    }
    return { meta, q, cp };
  });
  const maxAbs = Math.max(...rows.map(r => Math.abs(r.cp ?? 0)), 0.01);
  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[#1e293b]">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{region.icon}</span>
          <h4 className="text-xs font-bold text-white uppercase tracking-wide">{region.label}</h4>
        </div>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
      </div>
      <div className="space-y-1">
        {rows.map(({ meta, q, cp }) => {
          const isVix = ['VIX', 'VVIX', 'V2X', 'MOVE'].includes(meta.short);
          const positive = cp != null && cp >= 0;
          const good = isVix ? !positive : positive;
          const colorClass = cp == null ? 'text-gray-500' : good ? 'text-emerald-400' : 'text-red-400';
          const barW = cp == null ? 0 : Math.max(3, (Math.abs(cp) / maxAbs) * 100);
          return (
            <div key={meta.symbol} className="flex items-center gap-1.5 text-[10px] border-b border-slate-800/40 last:border-0 py-1">
              <span className="text-[11px] shrink-0" aria-hidden>{meta.flag}</span>
              <div className="w-16 shrink-0 min-w-0">
                <div className="text-white font-semibold truncate">{meta.short}</div>
                <div className="text-[8.5px] text-gray-500 truncate">{meta.name}</div>
              </div>
              <div className="flex-1 h-3 bg-white/[0.03] rounded-sm overflow-hidden">
                <div
                  className={`h-full rounded-sm transition-all ${cp == null ? '' : good ? 'bg-emerald-500/50' : 'bg-red-500/50'}`}
                  style={{ width: `${barW}%` }}
                />
              </div>
              <div className="text-right ml-1 w-[74px] shrink-0">
                <div className="text-gray-200 tabular-nums leading-tight">{q ? fmtPrice(q.price) : '—'}</div>
                <div className={`tabular-nums font-semibold leading-tight ${colorClass}`}>
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
        // yahoo-history caps at 15 symbols per call — fetch in parallel chunks.
        const chunks: string[][] = [];
        for (let i = 0; i < allSymbols.length; i += 15) chunks.push(allSymbols.slice(i, i + 15));
        const payloads = await Promise.all(chunks.map(async (chunk) => {
          const res = await fetch(`/api/yahoo-history?symbols=${encodeURIComponent(chunk.join(','))}&range=${range}&interval=${interval}`, { cache: 'no-store', signal: ctrl.signal });
          if (!res.ok) return [];
          const json = await res.json();
          return json.ok && Array.isArray(json.data) ? json.data : [];
        }));
        const map: Record<string, number | null> = {};
        payloads.flat().forEach((h: any) => {
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
      {/* One unified list: all region groups flow inside a single card. */}
      <div className="bg-white/[0.02] border border-[#1e293b] rounded-lg">
        <div className="columns-1 md:columns-2 xl:columns-3 gap-0 [column-fill:_balance]">
          {REGIONS.map(region => (
            <div key={region.key} className="break-inside-avoid">
              <RegionCard region={region} quotes={quotes} perf={perf} tf={tf} />
            </div>
          ))}
          <div className="break-inside-avoid px-3 py-2">
            <GovBondsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
