"use client";
import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Placeholder interface; real data should come from /api/etf-comparison (already used elsewhere)
interface ETFRow {
  symbol: string;
  name: string;
  price: number;
  changePct: number; // daily change %
  spreadPct?: number; // relative spread vs baseline (first row) in %
  spreadAbs?: number; // absolute spread vs baseline in $ (price difference)
}

interface ComparisonPoint {
  time: number; // epoch ms
  [symbol: string]: number; // each symbol price
}

interface ETFComparisonToolProps {
  symbols?: string[]; // optional override; if omitted will use a default basket
  range?: '1mo'|'3mo'|'6mo'|'1y'|'2y'|'5y'|'10y'|'max';
  className?: string;
}

// Utility formatting helpers
const fmtPct = (v: number | undefined | null) => (v==null || !Number.isFinite(v) ? '—' : `${v>=0?'+':''}${v.toFixed(2)}%`);
const fmtPrice = (v: number | undefined | null) => (v==null || !Number.isFinite(v) ? '—' : `$${v.toFixed(2)}`);

// Simulated fetch for historical series (placeholder). Replace with real yahoo-history endpoint usage if desired.
async function mockFetchHistory(symbols: string[], range: string): Promise<ComparisonPoint[]> {
  // Generate simple synthetic price drift series for demonstration; ~30 points
  const points = 60; // arbitrary granularity
  const now = Date.now();
  const spanDays = range==='1mo'?22: range==='3mo'?66: range==='6mo'?132: range==='1y'?252: range==='2y'?504: range==='5y'?1260: range==='10y'?2520: 3000;
  const step = Math.max(1, Math.floor(spanDays / points));
  const out: ComparisonPoint[] = [];
  const basePrices: Record<string, number> = {};
  symbols.forEach(s => { basePrices[s] = 100 + Math.random()*50; });
  for (let i=points-1;i>=0;i--) {
    const t = now - i * 24*3600*1000 * step;
    const row: ComparisonPoint = { time: t };
    symbols.forEach(sym => {
      // small random walk
      const drift = (Math.sin(i/5)+ Math.cos(i/7)) * 0.5; // deterministic pattern
      const noise = Math.sin(i/3 + sym.length) * 0.3;
      const price = basePrices[sym] * (1 + (drift+noise)/100 + (i/points)*0.05);
      row[sym] = price;
    });
    out.push(row);
  }
  return out;
}

// Use a module-level constant so the reference is stable across renders (prevents effect loops)
const DEFAULT_SYMBOLS = ['SPY','QQQ','VTI','IWM'];

export const ETFComparisonTool: React.FC<ETFComparisonToolProps> = ({ symbols, range='3mo', className }) => {
  // Resolve symbol list with stable reference
  const symList = symbols && symbols.length ? symbols : DEFAULT_SYMBOLS;
  // Create a stable key for dependency tracking (content-based, not reference-based)
  const symbolsKey = symList.join('|');
  const [currentRange, setCurrentRange] = useState<typeof range>(range);
  const [mode, setMode] = useState<'value'|'spreadPct'|'spreadAbs'>('value');
  const [rows, setRows] = useState<ETFRow[]>([]);
  const [series, setSeries] = useState<ComparisonPoint[]>([]);
  const [loading, setLoading] = useState(false);
  // Track last fetched key to avoid redundant fetch churn
  const lastFetchKeyRef = useRef<string>('');

  useEffect(() => {
    const fetchKey = symbolsKey + '::' + currentRange;
    if (fetchKey === lastFetchKeyRef.current) return; // no need to refetch
    lastFetchKeyRef.current = fetchKey;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const hist = await mockFetchHistory(symList, currentRange);
        if (cancelled) return;
        setSeries(hist);
        const last = hist[hist.length-1];
        const first = hist[0];
        const baselineSym = symList[0];
        const baselinePrice = last[baselineSym];
        const out: ETFRow[] = symList.map(sym => {
          const p = last[sym];
          const pFirst = first[sym];
          const changePct = pFirst ? ((p - pFirst)/pFirst)*100 : 0;
          const spreadPct = baselinePrice ? ((p / baselinePrice) - 1) * 100 : 0;
          const spreadAbs = p - baselinePrice;
          return { symbol: sym, name: sym, price: p, changePct, spreadPct, spreadAbs };
        });
        setRows(out);
      } catch (e) {
        if (!cancelled) {
          console.error('ETFComparisonTool fetch error', e);
          setSeries([]);
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [symbolsKey, currentRange]);

  const headers = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'price', label: 'Value' },
    { key: 'changePct', label: 'Change %' },
    { key: 'spreadPct', label: '% Spread' },
    { key: 'spreadAbs', label: '$ Spread' }
  ];

  return (
    <div className={`rounded-xl bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-black/60 border border-white/10 p-6 ${className||''}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">ETF Comparison Tool</h2>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-md border border-white/10">
            {(['1mo','3mo','6mo','1y','2y','5y','10y','max'] as const).map(r => (
              <button key={r} onClick={()=> setCurrentRange(r)} className={`px-2 py-1 rounded ${currentRange===r? 'bg-blue-600 text-white':'text-gray-300 hover:text-white'}`}>{r.toUpperCase()}</button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-md border border-white/10">
            <button onClick={()=> setMode('value')} className={`px-2 py-1 rounded ${mode==='value'?'bg-blue-600 text-white':'text-gray-300 hover:text-white'}`}>Value</button>
            <button onClick={()=> setMode('spreadPct')} className={`px-2 py-1 rounded ${mode==='spreadPct'?'bg-blue-600 text-white':'text-gray-300 hover:text-white'}`}>% Spread</button>
            <button onClick={()=> setMode('spreadAbs')} className={`px-2 py-1 rounded ${mode==='spreadAbs'?'bg-blue-600 text-white':'text-gray-300 hover:text-white'}`}>$ Spread</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3 text-sm">Historical {mode==='value' ? 'Values' : mode==='spreadPct' ? 'Relative % Spread' : 'Absolute $ Spread'}</h3>
          <div className="h-72">
            {loading ? (
              <div className="w-full h-full animate-pulse bg-white/5 rounded" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" type="number" domain={["dataMin","dataMax"]} tick={{fontSize:11, fill:'#f1f5f9'}} tickFormatter={t=> new Date(Number(t)).toLocaleDateString()} />
                  <YAxis tick={{fontSize:11, fill:'#f1f5f9'}} />
                  <Tooltip contentStyle={{backgroundColor:'rgba(15,23,42,0.95)',border:'1px solid rgba(148,163,184,0.3)',borderRadius:'8px',color:'#fff'}} formatter={(val: any, name: string) => {
                    if (mode==='value') return [fmtPrice(val), name];
                    if (mode==='spreadPct') return [fmtPct(val), name];
                    return [Number(val).toFixed(2), name];
                  }} labelFormatter={l=> new Date(Number(l)).toLocaleString()} />
                  {symList.map((sym, idx) => {
                    // derive line value depending on mode
                    const colorPalette = ['#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#f472b6'];
                    const stroke = colorPalette[idx % colorPalette.length];
                    let dataKey: string | ((d: any)=> number | null) = sym;
                    if (mode==='spreadPct') {
                      const base = symList[0];
                      dataKey = (d:any) => (d[sym] && d[base]) ? ((d[sym]/d[base])-1)*100 : null;
                    } else if (mode==='spreadAbs') {
                      const base = symList[0];
                      dataKey = (d:any) => (d[sym] && d[base]) ? (d[sym]-d[base]) : null;
                    }
                    return <Line key={sym} type="monotone" dataKey={dataKey as any} stroke={stroke} strokeWidth={2} dot={false} name={sym} />
                  })}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="mt-2 text-[10px] text-gray-500">Baseline: first symbol ({symList[0]}). % Spread = 100 × (A/B − 1). $ Spread = A − B.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 overflow-auto">
          <h3 className="text-white font-semibold mb-3 text-sm">Snapshot ({currentRange.toUpperCase()})</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-gray-400">
                {headers.map(h => (
                  <th key={h.key} className={`text-left py-2 ${h.key!=='symbol'? 'text-right':''}`}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map(r => (
                <tr key={r.symbol} className="hover:bg-white/5">
                  <td className="py-2 font-semibold">{r.symbol}</td>
                  <td className="py-2 text-right font-mono">{fmtPrice(r.price)}</td>
                  <td className={`py-2 text-right font-mono ${r.changePct>=0?'text-emerald-400':'text-red-400'}`}>{fmtPct(r.changePct)}</td>
                  <td className={`py-2 text-right font-mono ${r.spreadPct!=null && r.spreadPct>=0?'text-emerald-300':'text-red-300'}`}>{fmtPct(r.spreadPct)}</td>
                  <td className={`py-2 text-right font-mono ${r.spreadAbs!=null && r.spreadAbs>=0?'text-emerald-300':'text-red-300'}`}>{r.spreadAbs==null? '—' : r.spreadAbs.toFixed(2)}</td>
                </tr>
              ))}
              {rows.length===0 && !loading && (
                <tr><td colSpan={headers.length} className="py-6 text-center text-gray-400">No data</td></tr>
              )}
              {loading && (
                <tr><td colSpan={headers.length} className="py-6 text-center text-gray-400 animate-pulse">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ETFComparisonTool;
