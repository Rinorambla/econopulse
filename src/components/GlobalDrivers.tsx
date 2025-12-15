'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Target } from 'lucide-react';

type EconomicCycle = 'Expansion' | 'Slowdown' | 'Contraction' | 'Recovery' | 'Overheating' | 'Stagflation' | 'Neutral';
type RiskLevel = 'Low' | 'Moderate' | 'Elevated' | 'High';
type InvestmentStance = 'Bullish' | 'Cautious Bullish' | 'Neutral' | 'Cautious' | 'Defensive';

type CountryDriver = {
  id: string;
  name: string;
  flag: string;
  ticker: string;
  price: number | null;
  changePercent: number;
  mtdReturn: number | null;
  ytdReturn: number | null;
  gdpGrowth: number | null;
  inflation: number | null;
  unemployment: number | null;
  policyRate: number | null;
  cycle: EconomicCycle;
  cycleScore: number;
  riskLevel: RiskLevel;
  outlook3M: string;
  investmentStance: InvestmentStance;
  thesis: string;
  keyDrivers: string[];
  risks: string[];
  lastUpdated: string;
};

export default function GlobalDrivers() {
  const [regions, setRegions] = useState<CountryDriver[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch('/api/global-drivers', { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && Array.isArray(json.regions)) {
        setRegions(json.regions);
        setUpdatedAt(json.updatedAt || new Date().toISOString());
      } else {
        setRegions([]);
      }
    } catch (e: any) {
      setError('Failed to load global economic data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15 * 60 * 1000); // refresh every 15 minutes
    return () => clearInterval(id);
  }, []);

  const cycleColor = (c: EconomicCycle) => {
    switch (c) {
      case 'Expansion': return 'bg-green-700/30 border-green-500/40 text-green-200';
      case 'Overheating': return 'bg-orange-700/30 border-orange-500/40 text-orange-200';
      case 'Slowdown': return 'bg-yellow-700/30 border-yellow-500/40 text-yellow-200';
      case 'Contraction': return 'bg-red-700/30 border-red-500/40 text-red-200';
      case 'Recovery': return 'bg-blue-700/30 border-blue-500/40 text-blue-200';
      case 'Stagflation': return 'bg-purple-700/30 border-purple-500/40 text-purple-200';
      default: return 'bg-slate-700/30 border-slate-500/40 text-slate-200';
    }
  };

  const riskColor = (r: RiskLevel) => {
    switch (r) {
      case 'Low': return 'text-green-400';
      case 'Moderate': return 'text-yellow-400';
      case 'Elevated': return 'text-orange-400';
      case 'High': return 'text-red-400';
    }
  };

  const stanceColor = (s: InvestmentStance) => {
    switch (s) {
      case 'Bullish': return 'text-green-300 font-bold';
      case 'Cautious Bullish': return 'text-blue-300';
      case 'Neutral': return 'text-gray-300';
      case 'Cautious': return 'text-yellow-300';
      case 'Defensive': return 'text-red-300 font-bold';
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-3 py-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-white">Global Economic Drivers</h2>
          <p className="text-[10px] text-gray-400">Comprehensive country analysis with cycle positioning and investment thesis</p>
        </div>
        <div className="text-[10px] text-gray-400">
          Updated {updatedAt ? new Date(updatedAt).toLocaleTimeString() : '—'}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-4 animate-pulse h-[380px]" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-3 text-sm text-red-300 mb-3">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {regions.map((country) => {
            const isExpanded = expandedId === country.id;
            return (
              <article
                key={country.id}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-all"
              >
                {/* Header: Country + Price */}
                <header className="flex items-start justify-between mb-3 pb-3 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden>{country.flag}</span>
                    <div>
                      <h3 className="text-sm font-bold text-white">{country.name}</h3>
                      <p className="text-[10px] text-gray-400">{country.ticker}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-white">
                      {country.price ? `$${country.price.toFixed(2)}` : '—'}
                    </div>
                    <div className={`text-[11px] font-semibold ${country.changePercent > 0 ? 'text-green-400' : country.changePercent < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {country.changePercent > 0 ? '+' : ''}{country.changePercent.toFixed(2)}% Today
                    </div>
                  </div>
                </header>

                {/* Performance Summary */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-slate-900/50 rounded p-2">
                    <div className="text-[9px] text-gray-400 uppercase">MTD Return</div>
                    <div className={`text-xs font-semibold ${(country.mtdReturn ?? 0) > 0 ? 'text-green-400' : (country.mtdReturn ?? 0) < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                      {country.mtdReturn !== null ? `${country.mtdReturn > 0 ? '+' : ''}${country.mtdReturn.toFixed(2)}%` : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded p-2">
                    <div className="text-[9px] text-gray-400 uppercase">YTD Return</div>
                    <div className={`text-xs font-semibold ${(country.ytdReturn ?? 0) > 0 ? 'text-green-400' : (country.ytdReturn ?? 0) < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                      {country.ytdReturn !== null ? `${country.ytdReturn > 0 ? '+' : ''}${country.ytdReturn.toFixed(2)}%` : '—'}
                    </div>
                  </div>
                </div>

                {/* Economic Indicators */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">GDP Growth</span>
                    <span className={`font-semibold ${(country.gdpGrowth ?? 0) > 2 ? 'text-green-400' : (country.gdpGrowth ?? 0) < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                      {country.gdpGrowth !== null ? `${country.gdpGrowth.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Inflation (CPI)</span>
                    <span className={`font-semibold ${(country.inflation ?? 0) > 3 ? 'text-orange-400' : 'text-gray-300'}`}>
                      {country.inflation !== null ? `${country.inflation.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Unemployment</span>
                    <span className="font-semibold text-gray-300">
                      {country.unemployment !== null ? `${country.unemployment.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Policy Rate</span>
                    <span className="font-semibold text-gray-300">
                      {country.policyRate !== null ? `${country.policyRate.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                </div>

                {/* Cycle & Risk */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] px-2 py-1 rounded border font-semibold ${cycleColor(country.cycle)}`}>
                    {country.cycle}
                  </span>
                  <span className={`text-[10px] font-semibold ${riskColor(country.riskLevel)}`}>
                    Risk: {country.riskLevel}
                  </span>
                  <div className="ml-auto text-[10px] text-gray-400">
                    Score: <span className="font-mono font-semibold text-white">{country.cycleScore}</span>/100
                  </div>
                </div>

                {/* Investment Stance */}
                <div className="mb-3 p-2 bg-slate-900/50 rounded">
                  <div className="flex items-center gap-1 mb-1">
                    <Target className="w-3 h-3 text-blue-400" />
                    <span className="text-[9px] text-gray-400 uppercase font-semibold">Investment Stance</span>
                  </div>
                  <div className={`text-xs ${stanceColor(country.investmentStance)}`}>
                    {country.investmentStance}
                  </div>
                </div>

                {/* 3M Outlook */}
                <div className="mb-3">
                  <div className="flex items-center gap-1 mb-1">
                    {country.outlook3M.includes('growth') || country.outlook3M.includes('outperform') ? (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    ) : country.outlook3M.includes('persist') || country.outlook3M.includes('weak') ? (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-yellow-400" />
                    )}
                    <span className="text-[9px] text-gray-400 uppercase font-semibold">3-Month Outlook</span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">{country.outlook3M}</p>
                </div>

                {/* Expandable Investment Thesis */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : country.id)}
                  className="w-full text-left text-[10px] text-blue-400 hover:text-blue-300 font-semibold mb-2 flex items-center justify-between"
                >
                  <span>{isExpanded ? '▼' : '▶'} Investment Thesis & Analysis</span>
                </button>

                {isExpanded && (
                  <div className="space-y-3 pt-2 border-t border-slate-700">
                    {/* Thesis */}
                    <div>
                      <h4 className="text-[9px] text-gray-400 uppercase font-semibold mb-1">Thesis</h4>
                      <p className="text-[11px] text-gray-200 leading-relaxed">{country.thesis}</p>
                    </div>

                    {/* Key Drivers */}
                    <div>
                      <h4 className="text-[9px] text-gray-400 uppercase font-semibold mb-1">Key Drivers</h4>
                      <ul className="space-y-1">
                        {country.keyDrivers.map((driver, idx) => (
                          <li key={idx} className="text-[11px] text-green-300 flex items-start gap-1">
                            <span className="text-green-500">•</span>
                            <span>{driver}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Risks */}
                    <div>
                      <h4 className="text-[9px] text-gray-400 uppercase font-semibold mb-1">Risks to Watch</h4>
                      <ul className="space-y-1">
                        {country.risks.map((risk, idx) => (
                          <li key={idx} className="text-[11px] text-red-300 flex items-start gap-1">
                            <span className="text-red-500">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
