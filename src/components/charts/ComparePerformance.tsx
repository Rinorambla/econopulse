'use client';

// Compare Stocks — total-return (%) comparison chart with gradient areas, popular
// pre-set comparisons and branded PNG export (save to phone/PC).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { saveNodeAsPng } from '@/lib/save-image';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

type RangeKey = '1M' | '6M' | 'YTD' | '1Y' | '5Y' | '10Y' | 'MAX';

interface SeriesPoint {
  ts: number;
  pct: number;
}

interface SymbolSeries {
  symbol: string;
  points: SeriesPoint[];
}

const RANGES: RangeKey[] = ['1M', '6M', 'YTD', '1Y', '5Y', '10Y', 'MAX'];
const SERIES_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444',
  '#84cc16', '#f97316', '#14b8a6', '#e879f9', '#eab308', '#60a5fa',
];

const POPULAR_COMPARISONS: Array<[string, string]> = [
  ['AAPL', 'NVDA'],
  ['AAPL', 'MSFT'],
  ['PLTR', 'NVDA'],
  ['NVDA', 'AMD'],
  ['NVDA', 'AVGO'],
  ['KO', 'PEP'],
  ['TSLA', 'NVDA'],
  ['LLY', 'NVO'],
  ['GOOGL', 'META'],
  ['MSFT', 'CRM'],
  ['AAPL', 'BRK-B'],
  ['V', 'MA'],
  ['XOM', 'CVX'],
  ['AMZN', 'TSLA'],
  ['AMD', 'INTC'],
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtTick(ts: number, rangeKey: RangeKey): string {
  const d = new Date(ts);
  if (rangeKey === '5Y' || rangeKey === '10Y' || rangeKey === 'MAX') return String(d.getUTCFullYear());
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function PerfTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; color?: string; value?: number | null; payload: { ts: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p) => p.value != null);
  if (!items.length) return null;
  const d = new Date(items[0].payload.ts);
  return (
    <div className="rounded-lg border border-white/15 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-semibold text-white">{d.toISOString().slice(0, 10)}</div>
      {items
        .slice()
        .sort((a, b) => (b.value as number) - (a.value as number))
        .map((it) => (
          <div key={String(it.dataKey)} style={{ color: it.color }}>
            {String(it.dataKey)}:{' '}
            <span className="font-semibold">
              {(it.value as number) >= 0 ? '+' : ''}
              {(it.value as number).toFixed(1)}%
            </span>
          </div>
        ))}
    </div>
  );
}

export default function ComparePerformance({
  symbols,
  onSymbolsChange,
}: {
  symbols: string[];
  onSymbolsChange?: (symbols: string[]) => void;
}) {
  const [range, setRange] = useState<RangeKey>('1Y');
  const [series, setSeries] = useState<SymbolSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const gradientId = useRef(`cmp-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    if (!symbols.length) {
      setSeries([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/price-history?symbols=${encodeURIComponent(symbols.join(','))}&range=${range}`,
          { cache: 'no-store', signal: AbortSignal.timeout(20000) }
        );
        const js = await res.json();
        if (cancelled) return;
        if (!res.ok || !js.ok) {
          setSeries([]);
          setError(js.error === 'rate_limited' ? 'Too many requests — retry in a minute.' : 'Failed to load price data.');
        } else {
          setSeries(js.series || []);
        }
      } catch {
        if (!cancelled) {
          setSeries([]);
          setError('Network error while loading price data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbols, range]);

  // Merge per-symbol series into shared rows keyed by timestamp.
  const rows = useMemo(() => {
    const merged = new Map<number, Record<string, number | null> & { ts: number }>();
    for (const s of series) {
      for (const p of s.points) {
        const row = merged.get(p.ts) || { ts: p.ts };
        row[s.symbol] = p.pct;
        merged.set(p.ts, row);
      }
    }
    return Array.from(merged.values()).sort((a, b) => a.ts - b.ts);
  }, [series]);

  // Latest total return per symbol for the stat chips.
  const latest = useMemo(
    () =>
      series.map((s) => ({
        symbol: s.symbol,
        pct: s.points.length ? s.points[s.points.length - 1].pct : null,
      })),
    [series]
  );

  // Color by position in the page's symbol list so chips and lines always match.
  const colorOf = (symbol: string) => {
    const idx = symbols.indexOf(symbol);
    return SERIES_COLORS[(idx >= 0 ? idx : 0) % SERIES_COLORS.length];
  };

  // Download the chart card as a branded PNG (works on desktop and mobile).
  const exportImage = async () => {
    const node = cardRef.current;
    if (!node || exporting) return;
    setExporting(true);
    try {
      // Let the export-only header render and the chart redraw without animation.
      await new Promise((r) => setTimeout(r, 300));
      await saveNodeAsPng(node, `econopulse-compare-${symbols.join('-')}-${range}.png`);
    } catch {
      /* canvas capture unavailable */
    } finally {
      setExporting(false);
    }
  };

  const btn = (active: boolean) =>
    `px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
      active ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div ref={cardRef} className="rounded-xl border border-white/10 bg-slate-900/60 p-3 sm:p-4">
      {/* Export-only branded header */}
      {exporting && (
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-lg font-black tracking-tight text-white">
              ECONOPULSE<span className="text-blue-400">.AI</span>
            </div>
            <div className="text-xs font-semibold text-white/70">
              {symbols.join(' vs ')} · Total Return · {range}
            </div>
          </div>
          <div className="text-[11px] font-bold text-blue-300">econopulse.ai/compare</div>
        </div>
      )}

      {/* Header + range + export */}
      <div className="mb-3 flex flex-wrap items-center gap-2" data-export-hide="1">
        <h2 className="text-sm font-bold text-white">
          Total Return <span className="font-semibold text-white/50">(%)</span>
        </h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
            {RANGES.map((r) => (
              <button key={r} type="button" className={btn(range === r)} onClick={() => setRange(r)}>
                {r}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`${btn(false)} border border-blue-500/40 bg-blue-600/20 text-blue-200`}
            onClick={exportImage}
            disabled={exporting}
            title="Download this chart as a PNG image (save to phone or PC)"
          >
            {exporting ? 'Saving…' : '⬇ Save Image'}
          </button>
        </div>
      </div>

      {/* Return chips */}
      {!loading && latest.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {latest.map((l) => (
            <div
              key={l.symbol}
              className="rounded-lg border border-white/5 bg-white/5 px-3 py-1.5 text-xs"
              style={{ borderColor: `${colorOf(l.symbol)}40` }}
            >
              <span className="font-bold" style={{ color: colorOf(l.symbol) }}>
                {l.symbol}
              </span>{' '}
              <span className={`font-bold ${(l.pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {l.pct != null ? `${l.pct >= 0 ? '+' : ''}${l.pct.toFixed(1)}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="h-[360px] sm:h-[420px]">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-white/50">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            Loading prices…
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-rose-300">{error}</div>
        ) : !rows.length ? (
          <div className="flex h-full items-center justify-center text-sm text-white/50">
            Add a symbol to get started.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
              <defs>
                {series.map((s, i) => (
                  <linearGradient key={s.symbol} id={`${gradientId}-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colorOf(s.symbol)} stopOpacity={series.length > 4 ? 0.12 : 0.28} />
                    <stop offset="100%" stopColor={colorOf(s.symbol)} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                tickLine={false}
                tickFormatter={(ts: number) => fmtTick(ts, range)}
                minTickGap={50}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                width={56}
              />
              <Tooltip content={<PerfTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(v: string) => <span style={{ color: 'rgba(255,255,255,0.7)' }}>{v}</span>}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
              {series.map((s, i) => (
                <Area
                  key={s.symbol}
                  type="monotone"
                  dataKey={s.symbol}
                  name={s.symbol}
                  stroke={colorOf(s.symbol)}
                  strokeWidth={2.5}
                  fill={`url(#${gradientId}-${i})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls
                  isAnimationActive={!exporting}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Popular comparisons */}
      <div className="mt-3 border-t border-white/5 pt-3" data-export-hide="1">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
          Popular Stock Comparisons
        </div>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_COMPARISONS.map(([a, b]) => {
            const active = symbols.length === 2 && symbols.includes(a) && symbols.includes(b);
            return (
              <button
                key={`${a}-${b}`}
                type="button"
                onClick={() => onSymbolsChange?.([a, b])}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  active ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {a} vs. {b}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-right text-[10px] text-white/30">Powered by EconoPulse.ai · dividend-adjusted</p>
    </div>
  );
}
