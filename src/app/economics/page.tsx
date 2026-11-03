'use client';

/* ─────────────────────────────────────────────
   Economics — live macro hub powered by Trading Economics data, framed with
   EconoPulse branding:
   · World Economic Matrix (countries × GDP, growth, rates, inflation, debt…)
   · Indicator chart (full history, switchable series)
   · Live economic news stream
   ───────────────────────────────────────────── */

import { useState } from 'react';
import dynamic from 'next/dynamic';
import PlanGate from '@/components/PlanGate';
import Logo from '@/components/Logo';

const TradingEconomicsEmbed = dynamic(() => import('@/components/TradingEconomicsEmbed'), { ssr: false });

// Chart presets (Trading Economics indicator paths). First one is the default.
const CHART_SERIES: Array<{ label: string; url: string }> = [
  { label: '🇺🇸 US Inflation (CPI)', url: '/united-states/inflation-cpi' },
  { label: '🇺🇸 US Core Inflation', url: '/united-states/core-inflation-rate' },
  { label: '🇺🇸 US Fed Funds Rate', url: '/united-states/interest-rate' },
  { label: '🇺🇸 US GDP Growth', url: '/united-states/gdp-growth' },
  { label: '🇺🇸 US Unemployment', url: '/united-states/unemployment-rate' },
  { label: '🇺🇸 US Non Farm Payrolls', url: '/united-states/non-farm-payrolls' },
  { label: '🇺🇸 US 10Y Yield', url: '/united-states/government-bond-yield' },
  { label: '🇪🇺 Euro Area Inflation', url: '/euro-area/inflation-cpi' },
  { label: '🇪🇺 ECB Rate', url: '/euro-area/interest-rate' },
  { label: '🇮🇹 Italy Inflation', url: '/italy/inflation-cpi' },
  { label: '🇮🇹 Italy GDP Growth', url: '/italy/gdp-growth' },
  { label: '🇨🇳 China GDP Growth', url: '/china/gdp-growth-annual' },
];

// Masks for the chart frame's vendor affordances (measured on the rendered
// widget): the "Copy Embed" button, the linked title and the credits line.
const CHART_COVERS: React.CSSProperties[] = [
  { top: 0, right: 0, width: 56, height: 40, background: '#141414' },
  { top: 40, left: 0, width: 340, height: 26, background: '#232323' },
  { left: 0, right: 0, bottom: 0, height: 30, background: '#212529' },
];

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-2.5">
        <Logo size={26} textVariant="domain" className="[&_span]:text-base sm:[&_span]:text-lg" />
        <div className="flex items-center gap-3">
          {right}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{title}</span>
        </div>
      </div>
      {children}
      <div className="flex items-center justify-end border-t border-slate-800 bg-slate-900/80 px-4 py-1.5">
        <span className="text-[10px] text-white/30">Powered by EconoPulse.ai</span>
      </div>
    </div>
  );
}

export default function EconomicsPage() {
  const [series, setSeries] = useState(CHART_SERIES[0]);

  return (
    <PlanGate requiredPlan="free">
      <div className="min-h-full bg-slate-950 text-gray-200">
        <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-5">
          <div>
            <h1 className="text-xl font-bold text-white">Global Economics</h1>
            <p className="mt-0.5 text-[12px] text-gray-500">
              Live macro snapshot for every country — GDP, growth, interest rates, inflation, unemployment, bond yields, FX, debt — plus indicator history and breaking economic news. Updates automatically as data is released.
            </p>
          </div>

          <Card title="World Economic Matrix">
            <TradingEconomicsEmbed widget="mt-pro" height="calc(100vh - 260px)" className="min-h-[520px]" loadingLabel="Loading world economic data…" />
          </Card>

          <div className="grid gap-4 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <Card
                title="Indicator Chart"
                right={
                  <select
                    value={series.url}
                    onChange={(e) => setSeries(CHART_SERIES.find((s) => s.url === e.target.value) || CHART_SERIES[0])}
                    className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-semibold text-gray-200 outline-none focus:border-blue-500"
                    aria-label="Indicator"
                  >
                    {CHART_SERIES.map((s) => (
                      <option key={s.url} value={s.url}>{s.label}</option>
                    ))}
                  </select>
                }
              >
                <TradingEconomicsEmbed
                  widget="ec-pro"
                  attrs={{ url: series.url, chartSettings: { type: 'line', span: 'MAX' } }}
                  height={520}
                  covers={CHART_COVERS}
                  loadingLabel={`Loading ${series.label.replace(/^\S+\s/, '')}…`}
                />
              </Card>
            </div>
            <div className="xl:col-span-2">
              <Card title="Economic News">
                <TradingEconomicsEmbed widget="ns-pro" height={520} loadingLabel="Loading news…" />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PlanGate>
  );
}
