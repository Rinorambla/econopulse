'use client';

// Fundamental Chart — stockanalysis.com-style: 50+ indicators (income statement, cash
// flow, balance sheet, margins, per-share, ratios), annual/quarterly/TTM, YoY growth,
// data labels, normalized comparison and saved charts. Data from /api/fundamental-history.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
  LabelList,
} from 'recharts';

type PeriodKey = 'annual' | 'quarterly' | 'ttm';
type RangeKey = '1Y' | '3Y' | '5Y' | '10Y' | '20Y' | 'MAX';
type Kind = 'currency' | 'currency2' | 'percent' | 'ratio' | 'shares';

interface FundamentalPoint {
  date: string;
  [field: string]: string | number | null;
}

interface ApiResponse {
  ok: boolean;
  error?: string;
  symbol?: string;
  currency?: string;
  source?: string;
  annual?: FundamentalPoint[];
  quarterly?: FundamentalPoint[];
  ttm?: FundamentalPoint[];
}

// ── Metric definitions ────────────────────────────────────────────────────────

const n = (p: FundamentalPoint, k: string): number | null => {
  const v = p[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};
const div = (a: number | null, b: number | null): number | null =>
  a != null && b != null && b !== 0 ? a / b : null;
const pct = (a: number | null, b: number | null): number | null => {
  const r = div(a, b);
  return r == null ? null : r * 100;
};
const fcfOf = (p: FundamentalPoint): number | null => {
  const direct = n(p, 'freeCashFlow');
  if (direct != null) return direct;
  const ocf = n(p, 'operatingCashFlow');
  const capex = n(p, 'capex');
  return ocf != null && capex != null ? ocf - capex : null;
};

interface MetricDef {
  key: string;
  label: string;
  group: string;
  kind: Kind;
  compute: (p: FundamentalPoint) => number | null;
}

const METRICS: MetricDef[] = [
  // Income statement
  { key: 'revenue', label: 'Revenue', group: 'Income Statement', kind: 'currency', compute: (p) => n(p, 'revenue') },
  { key: 'grossProfit', label: 'Gross Profit', group: 'Income Statement', kind: 'currency', compute: (p) => n(p, 'grossProfit') },
  { key: 'operatingIncome', label: 'Operating Income', group: 'Income Statement', kind: 'currency', compute: (p) => n(p, 'operatingIncome') },
  { key: 'netIncome', label: 'Net Income', group: 'Income Statement', kind: 'currency', compute: (p) => n(p, 'netIncome') },
  { key: 'ebitda', label: 'EBITDA', group: 'Income Statement', kind: 'currency', compute: (p) => n(p, 'ebitda') },
  { key: 'ebit', label: 'EBIT', group: 'Income Statement', kind: 'currency', compute: (p) => n(p, 'ebit') },
  { key: 'eps', label: 'EPS', group: 'Income Statement', kind: 'currency2', compute: (p) => n(p, 'eps') },
  { key: 'pretaxIncome', label: 'Pretax Income', group: 'Income Statement', kind: 'currency', compute: (p) => n(p, 'pretaxIncome') },
  { key: 'costOfRevenue', label: 'Cost of Revenue', group: 'Income Statement', kind: 'currency', compute: (p) => n(p, 'costOfRevenue') },
  { key: 'operatingExpenses', label: 'Operating Expenses', group: 'Income Statement', kind: 'currency', compute: (p) => n(p, 'operatingExpenses') },
  { key: 'researchAndDevelopment', label: 'R&D Expense', group: 'Income Statement', kind: 'currency', compute: (p) => n(p, 'researchAndDevelopment') },
  { key: 'sga', label: 'SG&A Expense', group: 'Income Statement', kind: 'currency', compute: (p) => n(p, 'sga') },
  { key: 'interestExpense', label: 'Interest Expense', group: 'Income Statement', kind: 'currency', compute: (p) => n(p, 'interestExpense') },
  { key: 'incomeTax', label: 'Income Tax', group: 'Income Statement', kind: 'currency', compute: (p) => n(p, 'incomeTax') },
  // Margins
  { key: 'grossMargin', label: 'Gross Margin', group: 'Margins', kind: 'percent', compute: (p) => pct(n(p, 'grossProfit'), n(p, 'revenue')) },
  { key: 'operatingMargin', label: 'Operating Margin', group: 'Margins', kind: 'percent', compute: (p) => pct(n(p, 'operatingIncome'), n(p, 'revenue')) },
  { key: 'profitMargin', label: 'Profit Margin', group: 'Margins', kind: 'percent', compute: (p) => pct(n(p, 'netIncome'), n(p, 'revenue')) },
  { key: 'ebitdaMargin', label: 'EBITDA Margin', group: 'Margins', kind: 'percent', compute: (p) => pct(n(p, 'ebitda'), n(p, 'revenue')) },
  { key: 'ebitMargin', label: 'EBIT Margin', group: 'Margins', kind: 'percent', compute: (p) => pct(n(p, 'ebit'), n(p, 'revenue')) },
  { key: 'pretaxMargin', label: 'Pretax Margin', group: 'Margins', kind: 'percent', compute: (p) => pct(n(p, 'pretaxIncome'), n(p, 'revenue')) },
  { key: 'fcfMargin', label: 'FCF Margin', group: 'Margins', kind: 'percent', compute: (p) => pct(fcfOf(p), n(p, 'revenue')) },
  // Cash flow
  { key: 'operatingCashFlow', label: 'Operating Cash Flow', group: 'Cash Flow', kind: 'currency', compute: (p) => n(p, 'operatingCashFlow') },
  { key: 'freeCashFlow', label: 'Free Cash Flow', group: 'Cash Flow', kind: 'currency', compute: fcfOf },
  { key: 'capex', label: 'Capital Expenditures', group: 'Cash Flow', kind: 'currency', compute: (p) => n(p, 'capex') },
  { key: 'dividendsPaid', label: 'Dividends Paid', group: 'Cash Flow', kind: 'currency', compute: (p) => n(p, 'dividendsPaid') },
  { key: 'buybacks', label: 'Share Buybacks', group: 'Cash Flow', kind: 'currency', compute: (p) => n(p, 'buybacks') },
  { key: 'shareholderReturns', label: 'Shareholder Returns', group: 'Cash Flow', kind: 'currency', compute: (p) => { const d = n(p, 'dividendsPaid'); const b = n(p, 'buybacks'); return d == null && b == null ? null : (d ?? 0) + (b ?? 0); } },
  // Balance sheet
  { key: 'totalAssets', label: 'Total Assets', group: 'Balance Sheet', kind: 'currency', compute: (p) => n(p, 'totalAssets') },
  { key: 'totalLiabilities', label: 'Total Liabilities', group: 'Balance Sheet', kind: 'currency', compute: (p) => n(p, 'totalLiabilities') },
  { key: 'equity', label: "Shareholders' Equity", group: 'Balance Sheet', kind: 'currency', compute: (p) => n(p, 'equity') },
  { key: 'cash', label: 'Cash & ST Investments', group: 'Balance Sheet', kind: 'currency', compute: (p) => n(p, 'cash') },
  { key: 'totalDebt', label: 'Total Debt', group: 'Balance Sheet', kind: 'currency', compute: (p) => n(p, 'totalDebt') },
  { key: 'netDebt', label: 'Net Debt', group: 'Balance Sheet', kind: 'currency', compute: (p) => { const d = n(p, 'totalDebt'); const c = n(p, 'cash'); return d != null && c != null ? d - c : null; } },
  { key: 'workingCapitalProxy', label: 'Net Cash Position', group: 'Balance Sheet', kind: 'currency', compute: (p) => { const d = n(p, 'totalDebt'); const c = n(p, 'cash'); return d != null && c != null ? c - d : null; } },
  { key: 'inventory', label: 'Inventory', group: 'Balance Sheet', kind: 'currency', compute: (p) => n(p, 'inventory') },
  { key: 'sharesOutstanding', label: 'Shares Outstanding', group: 'Balance Sheet', kind: 'shares', compute: (p) => n(p, 'sharesOutstanding') },
  // Per share
  { key: 'revenuePerShare', label: 'Revenue / Share', group: 'Per Share', kind: 'currency2', compute: (p) => div(n(p, 'revenue'), n(p, 'sharesOutstanding')) },
  { key: 'fcfPerShare', label: 'FCF / Share', group: 'Per Share', kind: 'currency2', compute: (p) => div(fcfOf(p), n(p, 'sharesOutstanding')) },
  { key: 'ocfPerShare', label: 'Operating CF / Share', group: 'Per Share', kind: 'currency2', compute: (p) => div(n(p, 'operatingCashFlow'), n(p, 'sharesOutstanding')) },
  { key: 'bookValuePerShare', label: 'Book Value / Share', group: 'Per Share', kind: 'currency2', compute: (p) => div(n(p, 'equity'), n(p, 'sharesOutstanding')) },
  { key: 'cashPerShare', label: 'Cash / Share', group: 'Per Share', kind: 'currency2', compute: (p) => div(n(p, 'cash'), n(p, 'sharesOutstanding')) },
  { key: 'dividendsPerShare', label: 'Dividends / Share', group: 'Per Share', kind: 'currency2', compute: (p) => div(n(p, 'dividendsPaid'), n(p, 'sharesOutstanding')) },
  // Ratios
  { key: 'roe', label: 'Return on Equity', group: 'Ratios', kind: 'percent', compute: (p) => pct(n(p, 'netIncome'), n(p, 'equity')) },
  { key: 'roa', label: 'Return on Assets', group: 'Ratios', kind: 'percent', compute: (p) => pct(n(p, 'netIncome'), n(p, 'totalAssets')) },
  { key: 'debtToEquity', label: 'Debt / Equity', group: 'Ratios', kind: 'ratio', compute: (p) => div(n(p, 'totalDebt'), n(p, 'equity')) },
  { key: 'liabilitiesToAssets', label: 'Liabilities / Assets', group: 'Ratios', kind: 'ratio', compute: (p) => div(n(p, 'totalLiabilities'), n(p, 'totalAssets')) },
  { key: 'equityRatio', label: 'Equity / Assets', group: 'Ratios', kind: 'percent', compute: (p) => pct(n(p, 'equity'), n(p, 'totalAssets')) },
  { key: 'payoutRatio', label: 'Payout Ratio', group: 'Ratios', kind: 'percent', compute: (p) => pct(n(p, 'dividendsPaid'), n(p, 'netIncome')) },
  { key: 'effectiveTaxRate', label: 'Effective Tax Rate', group: 'Ratios', kind: 'percent', compute: (p) => pct(n(p, 'incomeTax'), n(p, 'pretaxIncome')) },
  { key: 'rdToRevenue', label: 'R&D % of Revenue', group: 'Ratios', kind: 'percent', compute: (p) => pct(n(p, 'researchAndDevelopment'), n(p, 'revenue')) },
  { key: 'sgaToRevenue', label: 'SG&A % of Revenue', group: 'Ratios', kind: 'percent', compute: (p) => pct(n(p, 'sga'), n(p, 'revenue')) },
  { key: 'capexToRevenue', label: 'CapEx % of Revenue', group: 'Ratios', kind: 'percent', compute: (p) => pct(n(p, 'capex'), n(p, 'revenue')) },
  { key: 'interestCoverage', label: 'Interest Coverage', group: 'Ratios', kind: 'ratio', compute: (p) => div(n(p, 'ebit'), n(p, 'interestExpense')) },
  { key: 'netDebtToEbitda', label: 'Net Debt / EBITDA', group: 'Ratios', kind: 'ratio', compute: (p) => { const d = n(p, 'totalDebt'); const c = n(p, 'cash'); return d != null && c != null ? div(d - c, n(p, 'ebitda')) : null; } },
];

const METRIC_GROUPS = ['Income Statement', 'Margins', 'Cash Flow', 'Balance Sheet', 'Per Share', 'Ratios'];
const QUICK_METRICS = ['revenue', 'netIncome', 'eps', 'freeCashFlow', 'grossMargin', 'profitMargin'];

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'annual', label: 'Annual' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'ttm', label: 'TTM' },
];

const RANGES: RangeKey[] = ['1Y', '3Y', '5Y', '10Y', '20Y', 'MAX'];
const SERIES_COLORS = ['#3b82f6', '#f59e0b', '#10b981'];

// ── Formatting ────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

function fmtCompact(v: number, digits = 2): string {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(digits)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(digits)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(digits)}K`;
  return `${sign}${abs.toFixed(digits)}`;
}

function fmtValue(v: number, kind: Kind, currency: string, digits = 2): string {
  const sym = CURRENCY_SYMBOLS[currency] || `${currency} `;
  switch (kind) {
    case 'currency': {
      const sign = v < 0 ? '-' : '';
      return `${sign}${sym}${fmtCompact(Math.abs(v), digits)}`;
    }
    case 'currency2':
      return `${v < 0 ? '-' : ''}${sym}${Math.abs(v).toFixed(2)}`;
    case 'percent':
      return `${v.toFixed(1)}%`;
    case 'ratio':
      return `${v.toFixed(2)}×`;
    case 'shares':
      return fmtCompact(v, digits);
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtPeriodLabel(date: string, period: PeriodKey): string {
  const [y, m] = date.split('-');
  if (period === 'annual') return `FY${y.slice(2)}`;
  const month = MONTHS[Math.max(0, Math.min(11, Number(m) - 1))];
  return `${month} '${y.slice(2)}`;
}

// ── Chart row building ────────────────────────────────────────────────────────

interface SeriesRow {
  date: string;
  ts: number;
  label: string;
  value: number | null;
  growth: number | null;
}

function buildSeries(
  data: ApiResponse | undefined,
  metric: MetricDef,
  period: PeriodKey,
  range: RangeKey
): SeriesRow[] {
  const series: FundamentalPoint[] = (data?.[period] as FundamentalPoint[]) || [];
  const offset = period === 'annual' ? 1 : 4; // YoY comparison distance
  const all: SeriesRow[] = series.map((p, i) => {
    const value = metric.compute(p);
    const prevPoint = i >= offset ? series[i - offset] : null;
    const prev = prevPoint ? metric.compute(prevPoint) : null;
    let growth: number | null = null;
    if (value != null && prev != null && prev !== 0) {
      growth = ((value - prev) / Math.abs(prev)) * 100;
    }
    return {
      date: p.date,
      ts: new Date(p.date).getTime(),
      label: fmtPeriodLabel(p.date, period),
      value,
      growth,
    };
  });
  const filtered = all.filter((r) => r.value != null);
  if (range === 'MAX' || !filtered.length) return filtered;
  const years = Number(range.replace('Y', ''));
  const last = new Date(filtered[filtered.length - 1].date);
  const cutoff = new Date(last);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return filtered.filter((r) => r.date > cutoffStr);
}

// ── Tooltips ──────────────────────────────────────────────────────────────────

function SingleTooltip({
  active,
  payload,
  currency,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ payload: SeriesRow }>;
  currency: string;
  metric: MetricDef;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/15 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-semibold text-white">
        {row.label} <span className="text-white/40">({row.date})</span>
      </div>
      {row.value != null && (
        <div className="text-blue-300">
          {metric.label}: <span className="font-semibold">{fmtValue(row.value, metric.kind, currency)}</span>
        </div>
      )}
      {row.growth != null && (
        <div className={row.growth >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
          YoY Growth: <span className="font-semibold">{row.growth >= 0 ? '+' : ''}{row.growth.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

function CompareTooltip({
  active,
  payload,
  currency,
  metric,
  showGrowth,
  normalize,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; color?: string; value?: number | null; payload: { ts: number } }>;
  currency: string;
  metric: MetricDef;
  showGrowth: boolean;
  normalize?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p) => p.value != null);
  if (!items.length) return null;
  const d = new Date(items[0].payload.ts);
  return (
    <div className="rounded-lg border border-white/15 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-semibold text-white">{d.toISOString().slice(0, 10)}</div>
      {items.map((it) => (
        <div key={String(it.dataKey)} style={{ color: it.color }}>
          {String(it.dataKey)}:{' '}
          <span className="font-semibold">
            {showGrowth
              ? `${(it.value as number) >= 0 ? '+' : ''}${(it.value as number).toFixed(1)}%`
              : normalize
                ? (it.value as number).toFixed(1)
                : fmtValue(it.value as number, metric.kind, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Saved charts (localStorage) ───────────────────────────────────────────────

interface SavedChart {
  id: string;
  name: string;
  symbols: string[];
  metric: string;
  period: PeriodKey;
  range: RangeKey;
  growth: boolean;
}

const SAVED_KEY = 'ep-fundamental-saved-charts';

function readSavedCharts(): SavedChart[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeSavedCharts(list: SavedChart[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* storage full / unavailable */
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FundamentalChart({
  symbols,
  onSymbolsChange,
}: {
  symbols: string[];
  onSymbolsChange?: (symbols: string[]) => void;
}) {
  const [dataMap, setDataMap] = useState<Record<string, ApiResponse>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [metricKey, setMetricKey] = useState('revenue');
  const [period, setPeriod] = useState<PeriodKey>('annual');
  const [range, setRange] = useState<RangeKey>('MAX');
  const [showGrowth, setShowGrowth] = useState(true);
  const [dataLabels, setDataLabels] = useState(false);
  const [normalize, setNormalize] = useState(false);
  const [saved, setSaved] = useState<SavedChart[]>([]);
  const dataRef = useRef(dataMap);
  dataRef.current = dataMap;

  useEffect(() => {
    setSaved(readSavedCharts());
  }, []);

  const metric = METRICS.find((m) => m.key === metricKey) || METRICS[0];

  const saveCurrentChart = () => {
    const name = `${symbols.join(' + ')} · ${metric.label} (${period === 'annual' ? 'Ann' : period === 'quarterly' ? 'Qtr' : 'TTM'})`;
    const chart: SavedChart = {
      id: `${Date.now()}`,
      name,
      symbols: [...symbols],
      metric: metricKey,
      period,
      range,
      growth: showGrowth,
    };
    const next = [chart, ...saved.filter((s) => s.name !== name)].slice(0, 20);
    setSaved(next);
    writeSavedCharts(next);
  };

  const loadSavedChart = (chart: SavedChart) => {
    setMetricKey(chart.metric);
    setPeriod(chart.period);
    setRange(chart.range);
    setShowGrowth(chart.growth);
    onSymbolsChange?.(chart.symbols);
  };

  const deleteSavedChart = (id: string) => {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    writeSavedCharts(next);
  };

  const load = useCallback(async (syms: string[], force = false) => {
    const wanted = syms.filter((s) => force || !dataRef.current[s]);
    if (!wanted.length) return;
    setLoading(true);
    await Promise.all(
      wanted.map(async (sym) => {
        try {
          const res = await fetch(`/api/fundamental-history?symbol=${encodeURIComponent(sym)}`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(30000),
          });
          const js: ApiResponse = await res.json();
          if (!res.ok || !js.ok) {
            setErrors((e) => ({
              ...e,
              [sym]:
                js.error === 'no_data'
                  ? `No fundamental data for "${sym}" (stocks only — not ETFs, forex or crypto).`
                  : js.error === 'rate_limited'
                    ? 'Too many requests — wait a minute and retry.'
                    : `Failed to load ${sym}.`,
            }));
          } else {
            setErrors((e) => {
              const out = { ...e };
              delete out[sym];
              return out;
            });
            setDataMap((m) => ({ ...m, [sym]: js }));
          }
        } catch {
          setErrors((e) => ({ ...e, [sym]: `Network error while loading ${sym}.` }));
        }
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (symbols.length) load(symbols);
  }, [symbols, load]);

  const activeSymbols = symbols.filter((s) => dataMap[s]);
  const compareMode = symbols.length > 1;
  const currency = dataMap[symbols[0]]?.currency || 'USD';

  // Single-symbol rows (bars + growth line).
  const rows = useMemo<SeriesRow[]>(() => {
    if (compareMode) return [];
    return buildSeries(dataMap[symbols[0]], metric, period, range);
  }, [dataMap, symbols, metric, period, range, compareMode]);

  // Compare rows: merged on timestamps, one column per symbol (value, YoY growth, or
  // normalized to 100 at the start of the visible range).
  const compareRows = useMemo(() => {
    if (!compareMode) return [];
    const merged = new Map<number, Record<string, number | null> & { ts: number }>();
    for (const sym of activeSymbols) {
      const series = buildSeries(dataMap[sym], metric, period, range);
      let base: number | null = null;
      for (const r of series) {
        let v = showGrowth ? r.growth : r.value;
        if (v == null) continue;
        if (normalize && !showGrowth) {
          if (base == null) base = v;
          if (base === 0) continue;
          v = (v / base) * 100;
        }
        const row = merged.get(r.ts) || { ts: r.ts };
        row[sym] = v;
        merged.set(r.ts, row);
      }
    }
    return Array.from(merged.values()).sort((a, b) => a.ts - b.ts);
  }, [compareMode, activeSymbols, dataMap, metric, period, range, showGrowth, normalize]);

  // Summary stats (single mode): latest, YoY and CAGRs from annual data.
  const stats = useMemo(() => {
    if (compareMode) return null;
    const latest = rows.length ? rows[rows.length - 1] : null;
    const canCagr = metric.kind === 'currency' || metric.kind === 'currency2' || metric.kind === 'shares';
    const annualRows = canCagr ? buildSeries(dataMap[symbols[0]], metric, 'annual', 'MAX') : [];
    const cagr = (years: number): number | null => {
      if (annualRows.length < years + 1) return null;
      const end = annualRows[annualRows.length - 1].value;
      const start = annualRows[annualRows.length - 1 - years].value;
      if (end == null || start == null || start <= 0 || end <= 0) return null;
      return (Math.pow(end / start, 1 / years) - 1) * 100;
    };
    return { latest, cagr5: cagr(5), cagr10: cagr(10) };
  }, [compareMode, rows, dataMap, symbols, metric]);

  const firstError = symbols.map((s) => errors[s]).find(Boolean);
  const hasNegativeGrowth = rows.some((r) => (r.growth ?? 0) < 0);
  const hasNegativeValue = rows.some((r) => (r.value ?? 0) < 0);

  const btn = (active: boolean) =>
    `px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
      active ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
    }`;

  const compareTickFmt = (ts: number) => {
    const d = new Date(ts);
    return period === 'annual'
      ? String(d.getUTCFullYear())
      : `${MONTHS[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`;
  };

  const yTickFmt = (v: number) =>
    metric.kind === 'percent' ? `${v.toFixed(0)}%`
      : metric.kind === 'ratio' ? `${v.toFixed(1)}×`
        : fmtValue(v, metric.kind === 'currency2' ? 'currency2' : metric.kind, currency, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 sm:p-4">
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Metric dropdown (all indicators) */}
        <select
          value={metricKey}
          onChange={(e) => setMetricKey(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white outline-none focus:border-blue-500"
          aria-label="Indicator"
        >
          {METRIC_GROUPS.map((g) => (
            <optgroup key={g} label={g}>
              {METRICS.filter((m) => m.group === g).map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {/* Quick picks */}
        <div className="hidden lg:flex items-center gap-1 rounded-lg bg-white/5 p-1">
          {QUICK_METRICS.map((k) => {
            const m = METRICS.find((x) => x.key === k)!;
            return (
              <button key={k} type="button" className={btn(metricKey === k)} onClick={() => setMetricKey(k)}>
                {m.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
          {PERIODS.map((p) => (
            <button key={p.key} type="button" className={btn(period === p.key)} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
          {RANGES.map((r) => (
            <button key={r} type="button" className={btn(range === r)} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`${btn(showGrowth)} border border-white/10`}
          onClick={() => setShowGrowth((v) => !v)}
          title={compareMode ? 'Compare YoY growth instead of values' : 'Toggle YoY growth line'}
        >
          % Growth
        </button>
        <button
          type="button"
          className={`${btn(dataLabels)} border border-white/10`}
          onClick={() => setDataLabels((v) => !v)}
          title="Show values on bars"
        >
          Data Labels
        </button>
        {compareMode && (
          <button
            type="button"
            className={`${btn(normalize)} border border-white/10`}
            onClick={() => setNormalize((v) => !v)}
            title="Rebase each series to 100 at the start of the visible range"
          >
            Normalize
          </button>
        )}
        <button
          type="button"
          className={`${btn(false)} border border-white/10`}
          onClick={saveCurrentChart}
          title="Save current chart configuration"
        >
          ★ Save Chart
        </button>
      </div>

      {/* Saved charts */}
      {saved.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Saved:</span>
          {saved.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70"
            >
              <button type="button" className="hover:text-white" onClick={() => loadSavedChart(c)} title="Load chart">
                {c.name}
              </button>
              <button
                type="button"
                className="text-white/40 hover:text-rose-300"
                onClick={() => deleteSavedChart(c.id)}
                aria-label={`Delete ${c.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Stats (single mode) */}
      {!loading && stats?.latest && (
        <div className="mb-3 flex flex-wrap gap-2">
          <div className="rounded-lg bg-white/5 px-3 py-1.5 text-xs">
            <span className="text-white/50">{metric.label} ({stats.latest.label}): </span>
            <span className="font-bold text-white">
              {stats.latest.value != null ? fmtValue(stats.latest.value, metric.kind, currency) : '—'}
            </span>
          </div>
          {stats.latest.growth != null && (
            <div className="rounded-lg bg-white/5 px-3 py-1.5 text-xs">
              <span className="text-white/50">YoY: </span>
              <span className={`font-bold ${stats.latest.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.latest.growth >= 0 ? '+' : ''}{stats.latest.growth.toFixed(1)}%
              </span>
            </div>
          )}
          {stats.cagr5 != null && (
            <div className="rounded-lg bg-white/5 px-3 py-1.5 text-xs">
              <span className="text-white/50">5Y CAGR: </span>
              <span className={`font-bold ${stats.cagr5 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.cagr5 >= 0 ? '+' : ''}{stats.cagr5.toFixed(1)}%
              </span>
            </div>
          )}
          {stats.cagr10 != null && (
            <div className="rounded-lg bg-white/5 px-3 py-1.5 text-xs">
              <span className="text-white/50">10Y CAGR: </span>
              <span className={`font-bold ${stats.cagr10 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.cagr10 >= 0 ? '+' : ''}{stats.cagr10.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Per-symbol errors in compare mode */}
      {firstError && activeSymbols.length > 0 && (
        <p className="mb-2 text-xs text-rose-300">{firstError}</p>
      )}

      {/* Chart */}
      <div className="h-[380px] sm:h-[440px]">
        {loading && !activeSymbols.length ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-white/50">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            Loading fundamentals…
          </div>
        ) : !activeSymbols.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm text-rose-300">{firstError || 'No data.'}</p>
            <button
              type="button"
              onClick={() => load(symbols, true)}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Retry
            </button>
          </div>
        ) : compareMode ? (
          !compareRows.length ? (
            <div className="flex h-full items-center justify-center text-sm text-white/50">
              No {metric.label} data for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={compareRows} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                  tickLine={false}
                  tickFormatter={compareTickFmt}
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={
                    showGrowth
                      ? (v: number) => `${v.toFixed(0)}%`
                      : normalize
                        ? (v: number) => v.toFixed(0)
                        : yTickFmt
                  }
                  width={64}
                />
                <Tooltip
                  content={<CompareTooltip currency={currency} metric={metric} showGrowth={showGrowth} normalize={normalize} />}
                  cursor={{ stroke: 'rgba(255,255,255,0.2)' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(v: string) => <span style={{ color: 'rgba(255,255,255,0.7)' }}>{v}</span>}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                {activeSymbols.map((sym, i) => (
                  <Line
                    key={sym}
                    type="monotone"
                    dataKey={sym}
                    name={sym}
                    stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          )
        ) : !rows.length ? (
          <div className="flex h-full items-center justify-center text-sm text-white/50">
            No {metric.label} data available for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                yAxisId="value"
                tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yTickFmt}
                width={64}
              />
              {showGrowth && (
                <YAxis
                  yAxisId="growth"
                  orientation="right"
                  tick={{ fill: 'rgba(245,158,11,0.8)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                  width={46}
                />
              )}
              <Tooltip
                content={<SingleTooltip currency={currency} metric={metric} />}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(v: string) => <span style={{ color: 'rgba(255,255,255,0.7)' }}>{v}</span>}
              />
              {hasNegativeValue && (
                <ReferenceLine yAxisId="value" y={0} stroke="rgba(255,255,255,0.15)" />
              )}
              {showGrowth && hasNegativeGrowth && (
                <ReferenceLine yAxisId="growth" y={0} stroke="rgba(245,158,11,0.35)" strokeDasharray="4 4" />
              )}
              <Bar yAxisId="value" dataKey="value" name={metric.label} radius={[3, 3, 0, 0]} maxBarSize={44}>
                {rows.map((r) => (
                  <Cell key={r.date} fill={(r.value ?? 0) >= 0 ? '#3b82f6' : '#ef4444'} />
                ))}
                {dataLabels && rows.length <= 40 && (
                  <LabelList
                    dataKey="value"
                    position="top"
                    fill="rgba(255,255,255,0.7)"
                    fontSize={10}
                    formatter={(v) => (typeof v === 'number' ? fmtValue(v, metric.kind, currency, 1) : '')}
                  />
                )}
              </Bar>
              {showGrowth && (
                <Line
                  yAxisId="growth"
                  type="monotone"
                  dataKey="growth"
                  name="YoY Growth %"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={rows.length <= 24 ? { r: 3, fill: '#f59e0b', strokeWidth: 0 } : false}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && activeSymbols.length > 0 && (
        <p className="mt-2 text-right text-[10px] text-white/30">
          Powered by EconoPulse.ai · fiscal periods · {currency}
        </p>
      )}
    </div>
  );
}
