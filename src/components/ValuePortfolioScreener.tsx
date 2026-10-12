'use client';

// "Top Stocks — Medium/Long Term" value & quality portfolio: strict 12-criteria
// screen (mid-cap, cheap, profitable, dividend-paying, low leverage, growing).
// Stocks that stop meeting the criteria are flagged so users can review them.
import React, { useEffect, useState } from 'react';

interface ScreenedStock {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  country: string;
  marketCap: string;
  price: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  dividendYieldPct: number | null;
  roePct: number | null;
  operatingMarginPct: number | null;
  netMarginPct: number | null;
  firstSeen: string;
}

interface DroppedStock {
  symbol: string;
  name: string;
  sector: string;
  droppedAt: string;
  firstSeen: string;
}

interface ApiResponse {
  ok: boolean;
  error?: string;
  criteria?: Array<{ label: string; value: string }>;
  current?: ScreenedStock[];
  dropped?: DroppedStock[];
  fetchedAt?: string;
  live?: boolean;
}

const fmt = (v: number | null, digits = 1, suffix = '') =>
  v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(digits)}${suffix}`;

export default function ValuePortfolioScreener() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCriteria, setShowCriteria] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/value-screener', { cache: 'no-store', signal: AbortSignal.timeout(55000) });
        const js: ApiResponse = await res.json();
        if (alive) setData(js);
      } catch {
        if (alive) setData({ ok: false, error: 'network' });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const current = data?.current || [];
  const dropped = data?.dropped || [];

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06] bg-gradient-to-r from-emerald-500/10 to-transparent">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-white">🏛️ Top Stocks — Medium/Long Term</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold">
            Value & Quality screen
          </span>
          <button
            type="button"
            onClick={() => setShowCriteria((v) => !v)}
            className="ml-auto text-[11px] px-2.5 py-1 rounded-md bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 font-semibold transition-colors"
          >
            {showCriteria ? 'Hide criteria' : `12 criteria ${showCriteria ? '▴' : '▾'}`}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          Stocks that stop meeting the criteria are flagged below.
        </p>
        {showCriteria && data?.criteria && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {data.criteria.map((c) => (
              <div key={c.label} className="rounded-md bg-white/[0.04] border border-white/[0.05] px-2 py-1.5">
                <div className="text-[10px] text-gray-500">{c.label}</div>
                <div className="text-[11px] font-bold text-emerald-300">{c.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          Running the screen…
        </div>
      ) : !data?.ok ? (
        <div className="p-8 text-center text-sm text-gray-500">
          Screen temporarily unavailable — please try again later.
        </div>
      ) : (
        <>
          {/* Review warnings: stocks that dropped out of the screen */}
          {dropped.length > 0 && (
            <div className="m-4 mb-0 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-3">
              <div className="text-[12px] font-bold text-amber-300 mb-1.5">
                ⚠️ Review suggested — no longer meet the criteria
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dropped.map((d) => (
                  <span
                    key={d.symbol}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px]"
                    title={`${d.name} — in the list since ${d.firstSeen}, dropped out on ${d.droppedAt}`}
                  >
                    <span className="font-bold text-amber-200">{d.symbol}</span>
                    <span className="text-amber-300/60">dropped {d.droppedAt}</span>
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-amber-300/60">
                These stocks previously qualified but failed one or more criteria at the latest refresh — consider
                reviewing the position if you hold them.
              </p>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[820px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="pl-4 pr-2 py-2.5 font-semibold">Company</th>
                  <th className="px-2 py-2.5 font-semibold">Sector</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Mkt Cap</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Price</th>
                  <th className="px-2 py-2.5 text-right font-semibold">P/E</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Fwd P/E</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Div Yield</th>
                  <th className="px-2 py-2.5 text-right font-semibold">ROE</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Op Margin</th>
                  <th className="px-2 pr-4 py-2.5 text-right font-semibold">In list since</th>
                </tr>
              </thead>
              <tbody>
                {current.map((s) => (
                  <tr key={s.symbol} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                    <td className="pl-4 pr-2 py-2.5 whitespace-nowrap">
                      <a href={`/fundamentals?symbol=${encodeURIComponent(s.symbol)}`} className="group">
                        <span className="font-bold text-blue-300 group-hover:text-blue-200">{s.symbol}</span>
                        <span className="ml-2 text-gray-400 group-hover:text-gray-300">{s.name}</span>
                      </a>
                      <div className="text-[10px] text-gray-600">{s.industry} · {s.country}</div>
                    </td>
                    <td className="px-2 py-2.5 text-gray-400 whitespace-nowrap">{s.sector || '—'}</td>
                    <td className="px-2 py-2.5 text-right text-gray-200 font-semibold whitespace-nowrap">${s.marketCap}</td>
                    <td className="px-2 py-2.5 text-right text-gray-300 whitespace-nowrap">{s.price != null ? `$${s.price.toFixed(2)}` : '—'}</td>
                    <td className="px-2 py-2.5 text-right text-gray-200 whitespace-nowrap">{fmt(s.trailingPE)}</td>
                    <td className="px-2 py-2.5 text-right text-gray-300 whitespace-nowrap">{fmt(s.forwardPE)}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-emerald-400 whitespace-nowrap">{fmt(s.dividendYieldPct, 1, '%')}</td>
                    <td className="px-2 py-2.5 text-right text-gray-200 whitespace-nowrap">{fmt(s.roePct, 1, '%')}</td>
                    <td className="px-2 py-2.5 text-right text-gray-300 whitespace-nowrap">{fmt(s.operatingMarginPct, 1, '%')}</td>
                    <td className="px-2 pr-4 py-2.5 text-right text-gray-500 whitespace-nowrap">{s.firstSeen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 flex flex-wrap justify-between gap-2 text-[10px] text-gray-600 bg-white/[0.02] border-t border-white/[0.06]">
            <span>
              {current.length} stocks pass all 12 criteria · sorted by dividend yield · click a ticker for fundamentals
              {data.live === false ? ' · showing last saved screen' : ''}
            </span>
            <span>Not investment advice — do your own research · Updated {data.fetchedAt ? new Date(data.fetchedAt).toLocaleDateString() : '—'}</span>
          </div>
        </>
      )}
    </div>
  );
}
