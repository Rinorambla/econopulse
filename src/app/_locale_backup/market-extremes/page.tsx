'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';

/* ─────────────────────────────────────────────
   Market Extremes — FLAME (euphoria) vs BOTTOM (panic)
   A Bloomberg-style market-temperature checklist.
   Toggle the signals you currently observe; the
   thermometer reads the net excess/depression score.
   ───────────────────────────────────────────── */

interface SignalRow {
  category: string;
  icon: string;
  flame: string[];   // signs of excess / euphoria
  bottom: string[];  // signs of depression / panic
}

const SIGNALS: SignalRow[] = [
  {
    category: 'Equity Market',
    icon: '📈',
    flame: ['Wave of new IPOs', 'Prices rising rapidly', 'High financial leverage', 'Elevated trading volumes'],
    bottom: ['No IPOs', 'Very depressed prices', 'Very low EV/EBITDA & P/S multiples', 'Many firms below book value'],
  },
  {
    category: 'Investor Sentiment',
    icon: '🧠',
    flame: ['Euphoric optimism', 'Retail piling into the market', '“This time is different”'],
    bottom: ['Pessimism and fear', 'Retail capitulating / out of the market', 'Negative magazine & newspaper covers'],
  },
  {
    category: 'Credit & Liquidity',
    icon: '💧',
    flame: ['Easy, abundant credit', 'Active Venture Capital & M&A'],
    bottom: ['Credit only for top-quality borrowers', 'No M&A, no capital for startups'],
  },
  {
    category: 'Valuation Multiples',
    icon: '🧮',
    flame: ['P/E & EV/EBITDA historically high'],
    bottom: ['P/E very low'],
  },
  {
    category: 'Luxury & Art',
    icon: '🎨',
    flame: ['Art & luxury markets booming'],
    bottom: ['Art markets in crisis'],
  },
  {
    category: 'Financial Media',
    icon: '📺',
    flame: ['Finance TV & press heavily followed'],
    bottom: ['Little interest in finance'],
  },
  {
    category: 'Central Banks',
    icon: '🏛️',
    flame: ['Tightening / rate hikes'],
    bottom: ['Easing for 6–12 months'],
  },
  {
    category: 'Macro Conditions',
    icon: '🌐',
    flame: ['Growth perceived as strong'],
    bottom: ['Official recession, but already priced in'],
  },
];

const TOTAL_FLAME = SIGNALS.reduce((n, r) => n + r.flame.length, 0);
const TOTAL_BOTTOM = SIGNALS.reduce((n, r) => n + r.bottom.length, 0);
const MAX_SIDE = Math.max(TOTAL_FLAME, TOTAL_BOTTOM);

function keyOf(cat: string, side: 'F' | 'B', i: number) {
  return `${cat}|${side}|${i}`;
}

export default function MarketExtremesInner() {
  const [active, setActive] = useState<Set<string>>(new Set());

  const toggle = (k: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const { flameCount, bottomCount, net, marker, zone } = useMemo(() => {
    let f = 0, b = 0;
    active.forEach((k) => {
      if (k.includes('|F|')) f++;
      else if (k.includes('|B|')) b++;
    });
    const n = f - b;
    // marker position 0..100 (0 = deep bottom, 100 = peak euphoria)
    const pos = ((n + MAX_SIDE) / (2 * MAX_SIDE)) * 100;
    let z: { label: string; tone: string; chip: string; desc: string };
    if (n >= MAX_SIDE * 0.5) {
      z = { label: 'EUPHORIA — TOP RISK', tone: 'text-red-400', chip: 'bg-red-500/15 border-red-500/30 text-red-300', desc: 'Excess signals dominate. Historically a high-risk zone for forward returns — consider de-risking and hedging.' };
    } else if (n >= MAX_SIDE * 0.2) {
      z = { label: 'LATE-CYCLE — CAUTION', tone: 'text-amber-400', chip: 'bg-amber-500/15 border-amber-500/30 text-amber-300', desc: 'Froth is building. Stay invested but tighten risk management and watch for confirmation of a turn.' };
    } else if (n > -MAX_SIDE * 0.2) {
      z = { label: 'NEUTRAL — MID-CYCLE', tone: 'text-gray-300', chip: 'bg-white/10 border-white/20 text-gray-300', desc: 'No strong extreme reading. Balanced conditions — let trend and fundamentals lead.' };
    } else if (n > -MAX_SIDE * 0.5) {
      z = { label: 'FEAR — VALUE EMERGING', tone: 'text-sky-400', chip: 'bg-sky-500/15 border-sky-500/30 text-sky-300', desc: 'Depression signals building. Quality is getting cheap — start building watchlists.' };
    } else {
      z = { label: 'CAPITULATION — BOTTOMING', tone: 'text-emerald-400', chip: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300', desc: 'Panic dominates. Historically among the best long-term entry zones — accumulate quality.' };
    }
    return { flameCount: f, bottomCount: b, net: n, marker: pos, zone: z };
  }, [active]);

  const reset = () => setActive(new Set());

  return (
    <div className="min-h-screen bg-[#060a13] text-white">
      {/* ═══════ HEADER ═══════ */}
      <header className="sticky top-0 z-30 bg-[#060a13]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NavigationLink href="/market-dna" className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              <ArrowLeftIcon className="h-4 w-4" />
            </NavigationLink>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 via-rose-500 to-sky-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                <span className="text-lg">🔥</span>
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight">Market Extremes</h1>
                <p className="text-[10px] text-gray-500 hidden sm:block">FLAME (Euphoria) vs BOTTOM (Panic) — Market Temperature</p>
              </div>
            </div>
          </div>
          <button onClick={reset}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-gray-400 hover:text-white transition-all">
            Reset
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ═══════ THERMOMETER ═══════ */}
        <section className="relative overflow-hidden bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_0_40px_-12px_rgba(0,0,0,0.5)] p-6">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.04] via-transparent to-red-500/[0.05] pointer-events-none" />
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">Market Temperature</div>
                <div className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 ${zone.tone}`}>{zone.label}</div>
              </div>
              <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-[11px] font-bold border ${zone.chip}`}>
                Net reading: {net > 0 ? '+' : ''}{net}
              </span>
            </div>

            {/* gauge track */}
            <div className="relative h-4 rounded-full bg-gradient-to-r from-emerald-500/70 via-gray-500/40 to-red-500/70 border border-white/10">
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500"
                style={{ left: `${marker}%` }}
              >
                <div className="w-5 h-5 rounded-full bg-white border-2 border-[#060a13] shadow-lg shadow-black/50" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] font-semibold uppercase tracking-wider">
              <span className="text-emerald-400">◄ Bottom · Panic</span>
              <span className="text-gray-500">Neutral</span>
              <span className="text-red-400">Flame · Euphoria ►</span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed mt-4 max-w-3xl">{zone.desc}</p>

            {/* tallies */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="rounded-xl bg-red-500/[0.06] border border-red-500/15 px-4 py-3">
                <div className="text-[9px] uppercase tracking-widest text-red-300/70 font-medium">Flame signals</div>
                <div className="text-xl font-black text-red-400 tabular-nums mt-0.5">{flameCount}<span className="text-xs text-gray-600 font-medium"> / {TOTAL_FLAME}</span></div>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3">
                <div className="text-[9px] uppercase tracking-widest text-gray-500 font-medium">Net</div>
                <div className={`text-xl font-black tabular-nums mt-0.5 ${net > 0 ? 'text-red-400' : net < 0 ? 'text-emerald-400' : 'text-gray-300'}`}>{net > 0 ? '+' : ''}{net}</div>
              </div>
              <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 px-4 py-3">
                <div className="text-[9px] uppercase tracking-widest text-emerald-300/70 font-medium">Bottom signals</div>
                <div className="text-xl font-black text-emerald-400 tabular-nums mt-0.5">{bottomCount}<span className="text-xs text-gray-600 font-medium"> / {TOTAL_BOTTOM}</span></div>
              </div>
            </div>
            <p className="text-[10px] text-gray-600 mt-3">Tap a signal below to mark it as currently observed. The thermometer updates live.</p>
          </div>
        </section>

        {/* ═══════ SIGNAL MATRIX ═══════ */}
        <section className="bg-[#0c1222]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-[0_0_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="grid grid-cols-12 gap-px bg-white/[0.05] border-b border-white/[0.06]">
            <div className="col-span-3 bg-[#0c1222] px-5 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Category</div>
            <div className="col-span-4 sm:col-span-4 bg-[#150b0d] px-5 py-3 text-[10px] uppercase tracking-widest text-red-300/80 font-semibold flex items-center gap-1.5">
              <span>🔥</span> Flame — Signs of Excess
            </div>
            <div className="col-span-5 sm:col-span-5 bg-[#08130f] px-5 py-3 text-[10px] uppercase tracking-widest text-emerald-300/80 font-semibold flex items-center gap-1.5">
              <span>🧊</span> Bottom — Signs of Depression
            </div>
          </div>

          {SIGNALS.map((row) => (
            <div key={row.category} className="grid grid-cols-12 gap-px bg-white/[0.04] border-b border-white/[0.04] last:border-b-0">
              {/* category */}
              <div className="col-span-12 sm:col-span-3 bg-[#0c1222] px-5 py-4 flex items-center gap-2.5">
                <span className="text-lg">{row.icon}</span>
                <span className="text-sm font-semibold text-gray-200">{row.category}</span>
              </div>
              {/* flame */}
              <div className="col-span-6 sm:col-span-4 bg-[#0c1222] px-4 py-4 space-y-1.5">
                {row.flame.map((s, i) => {
                  const k = keyOf(row.category, 'F', i);
                  const on = active.has(k);
                  return (
                    <button
                      key={k}
                      onClick={() => toggle(k)}
                      className={`w-full text-left flex items-start gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${on
                        ? 'bg-red-500/15 border-red-500/40 text-red-200 shadow-[0_0_18px_-6px_rgba(239,68,68,0.5)]'
                        : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:border-red-500/25 hover:text-gray-200'}`}
                    >
                      <span className={`mt-0.5 w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 ${on ? 'bg-red-500 border-red-500' : 'border-white/20'}`}>
                        {on && <span className="text-[8px] text-white leading-none">✓</span>}
                      </span>
                      <span className="leading-snug">{s}</span>
                    </button>
                  );
                })}
              </div>
              {/* bottom */}
              <div className="col-span-6 sm:col-span-5 bg-[#0c1222] px-4 py-4 space-y-1.5">
                {row.bottom.map((s, i) => {
                  const k = keyOf(row.category, 'B', i);
                  const on = active.has(k);
                  return (
                    <button
                      key={k}
                      onClick={() => toggle(k)}
                      className={`w-full text-left flex items-start gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${on
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 shadow-[0_0_18px_-6px_rgba(16,185,129,0.5)]'
                        : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:border-emerald-500/25 hover:text-gray-200'}`}
                    >
                      <span className={`mt-0.5 w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 ${on ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}>
                        {on && <span className="text-[8px] text-white leading-none">✓</span>}
                      </span>
                      <span className="leading-snug">{s}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* ═══════ FOOTER NOTE ═══════ */}
        <div className="bg-[#0c1222]/40 backdrop-blur rounded-xl border border-white/[0.04] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-xs text-gray-600">Qualitative market-extremes framework · {TOTAL_FLAME + TOTAL_BOTTOM} signals across {SIGNALS.length} categories</span>
          <span className="text-[10px] text-gray-700">EconoPulse Market Extremes · Informational only · Not investment advice</span>
        </div>
      </main>

      <Footer />
    </div>
  );
}
