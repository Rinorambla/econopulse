"use client";
import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, ScatterChart, Scatter, Legend, Sankey
} from 'recharts';

// DashboardCharts: dynamically imported to keep initial dashboard bundle smaller.

interface EnrichedItem {
  ticker: string;
  performance: string; // e.g. "+1.23%"
  sector?: string;
  category?: string;
  intradayFlow?: string;
  aiSignal?: {
    momentum: number;
    relativeStrength: number;
    compositeScore: number;
    label: string;
  };
}

interface Props { enrichedData: EnrichedItem[]; }

const SmallTooltip: React.FC<{ lines: string[]; className?: string; }> = ({ lines, className='' }) => (
  <div className={`pointer-events-none whitespace-pre text-[10px] leading-tight bg-slate-900/95 border border-slate-600 shadow-xl rounded px-2 py-1 text-slate-200 max-w-[220px] ${className}`}>
    {lines.map((l,i)=>(<div key={i}>{l}</div>))}
  </div>
);

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const lines = payload.map((p:any) => `${p.name||p.dataKey}: ${p.value}`);
  return <SmallTooltip lines={[label, ...lines]} />;
};

// Qualitative intraday flow → numeric score
const parseFlow = (f?: string) => {
  if(!f) return 0; const k=f.toLowerCase();
  if (k.includes('gamma bull')) return 3;
  if (k.includes('buy to open')) return 2;
  if (k.includes('call hedging')) return 1;
  if (k.includes('put selling')) return -2;
  if (k.includes('hedge flow')) return -1;
  return 0; // unusual/delta neutral treated as neutral
};

const categoryColor = (cat:string) => {
  switch(cat){
    case 'Factor': return '#6366f1';
    case 'Thematic': return '#f59e0b';
    case 'Commodity': return '#d97706';
    case 'International': return '#0ea5e9';
    case 'Crypto': return '#84cc16';
    case 'Forex': return '#14b8a6';
    case 'LargeCap': return '#22d3ee';
    default: return '#64748b';
  }
};

const aiLabelColor = (lbl:string) => {
  switch(lbl){
    case 'STRONG BUY': return '#16a34a';
    case 'BUY': return '#4ade80';
    case 'HOLD': return '#64748b';
    case 'SELL': return '#fb923c';
    case 'STRONG SELL': return '#dc2626';
    default: return '#94a3b8';
  }
};

export default function DashboardCharts({ enrichedData }: Props) {
  const [showCharts, setShowCharts] = useState(true);
  const [chartMode, setChartMode] = useState<'sectors'|'categories'|'ai'|'scatter'|'flow'>('sectors');

  const sectorPerfData = useMemo(() => {
    const m: Record<string,{sum:number;count:number}> = {};
    enrichedData.forEach(d => { if(!d.sector) return; const p = parseFloat(d.performance); if(!m[d.sector]) m[d.sector]={sum:0,count:0}; m[d.sector].sum+=p; m[d.sector].count++; });
    return Object.entries(m).map(([sector,v])=>({ sector, avg:+(v.sum/v.count).toFixed(2) }))
      .sort((a,b)=> b.avg - a.avg).slice(0,15);
  }, [enrichedData]);

  const categoryDistribution = useMemo(() => {
    const m: Record<string,number> = {};
    enrichedData.forEach(d => { if(!d.category) return; m[d.category]=(m[d.category]||0)+1; });
    return Object.entries(m).map(([category,value])=>({ category, value }));
  }, [enrichedData]);

  const topAISignals = useMemo(() => {
    return [...enrichedData]
      .filter(d=> d.aiSignal)
      .sort((a,b)=> (b.aiSignal!.compositeScore - a.aiSignal!.compositeScore))
      .slice(0,12)
      .map(d=>({ ticker:d.ticker, score:d.aiSignal!.compositeScore, label:d.aiSignal!.label }));
  }, [enrichedData]);

  const momentumVsRS = useMemo(() => {
    return enrichedData.filter(d=> d.aiSignal)
      .map(d=>({
        ticker:d.ticker,
        momentum:d.aiSignal!.momentum,
        rs:d.aiSignal!.relativeStrength,
        category:d.category||'Other',
        label:d.aiSignal!.label
      }));
  }, [enrichedData]);

  const flowDirectionData = useMemo(()=>{
    const map: Record<string,{sum:number;count:number}> = {};
    enrichedData.forEach(d=>{
      if(!d.intradayFlow) return;
      const v = parseFlow(d.intradayFlow);
      const sector = d.sector || 'Other';
      if(!map[sector]) map[sector]={sum:0,count:0};
      map[sector].sum += v;
      map[sector].count += 1;
    });
    return Object.entries(map)
      .map(([sector,val])=>({ sector, netFlow:+val.sum.toFixed(2) }))
      .sort((a,b)=> Math.abs(b.netFlow) - Math.abs(a.netFlow))
      .slice(0,12);
  }, [enrichedData]);
  const totalNetFlow = useMemo(()=> flowDirectionData.reduce((a,b)=> a + b.netFlow, 0), [flowDirectionData]);

  // Sankey-style flow data: Inflow/Outflow -> Sectors (based on intradayFlow heuristic)
  const sankeyData = useMemo(() => {
    const sectors = flowDirectionData.map(d => d.sector);
    const nodes = [
      { name: 'Inflow' },
      { name: 'Outflow' },
      ...sectors.map(s => ({ name: s }))
    ];
    const inflowIndex = 0;
    const outflowIndex = 1;
    const baseIdx = 2;
    const links: Array<{ source:number; target:number; value:number }> = [];
    flowDirectionData.forEach((d, i) => {
      const target = baseIdx + i;
      if (d.netFlow > 0) links.push({ source: inflowIndex, target, value: Math.abs(d.netFlow) });
      else if (d.netFlow < 0) links.push({ source: outflowIndex, target, value: Math.abs(d.netFlow) });
    });
    // Normalize values to avoid zeros
    const minVal = links.reduce((m,l)=> Math.min(m,l.value), Infinity);
    if (Number.isFinite(minVal) && minVal > 0 && minVal < 1) {
      const k = 1/minVal;
      links.forEach(l => { l.value = +(l.value * k).toFixed(2); });
    }
    return { nodes, links };
  }, [flowDirectionData]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded p-4">
      <div className="flex items-center gap-2 mb-3 text-xs">
        <button onClick={()=>setShowCharts(s=>!s)} className="px-2 py-1 rounded border border-slate-600 bg-slate-700 hover:bg-slate-600 font-medium">{showCharts?'Hide Charts':'Show Charts'}</button>
        {['sectors','categories','ai','scatter','flow'].map(m=> (
          <button key={m} onClick={()=>setChartMode(m as any)} className={`px-2 py-1 rounded border text-[11px] ${chartMode===m?'bg-blue-600 border-blue-500':'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>{m}</button>
        ))}
        <span className="ml-auto text-[10px] text-gray-400">Analytical charts (lazy)</span>
      </div>
      {showCharts && (
        <div className="grid gap-6 md:grid-cols-2">
          {chartMode==='sectors' && (
            <div className="h-72">
              <h3 className="text-xs font-semibold mb-2 text-gray-300">Top Sector Avg Performance (%)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorPerfData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="sector" hide={false} tick={{fontSize:10, fill:'#94a3b8'}} interval={0} angle={-35} textAnchor='end' height={70} />
                  <YAxis tick={{fontSize:10, fill:'#94a3b8'}} width={35} />
                  <RTooltip content={<ChartTooltip />} />
                  <Bar dataKey="avg" radius={[2,2,0,0]}>
                    {sectorPerfData.map((d,i)=>(<Cell key={i} fill={d.avg>=0?'#16a34a':'#dc2626'} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {chartMode==='categories' && (
            <div className="h-72">
              <h3 className="text-xs font-semibold mb-2 text-gray-300">Category Distribution (Count)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryDistribution} dataKey="value" nameKey="category" outerRadius={90} innerRadius={40} paddingAngle={2}>
                    {categoryDistribution.map((d,i)=>(<Cell key={i} fill={categoryColor(d.category)} />))}
                  </Pie>
                  <RTooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{fontSize:'9px'}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {chartMode==='ai' && (
            <div className="h-72">
              <h3 className="text-xs font-semibold mb-2 text-gray-300">Top AI Composite Scores</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAISignals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="ticker" tick={{fontSize:10, fill:'#94a3b8'}} interval={0} angle={-25} textAnchor='end' height={60} />
                  <YAxis tick={{fontSize:10, fill:'#94a3b8'}} width={30} domain={[0,100]} />
                  <RTooltip content={<ChartTooltip />} />
                  <Bar dataKey="score" radius={[2,2,0,0]}>
                    {topAISignals.map((d,i)=>(<Cell key={i} fill={aiLabelColor(d.label)} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {chartMode==='scatter' && (
            <>
              <div className="h-72 md:col-span-2">
                <h3 className="text-xs font-semibold mb-2 text-gray-300">Momentum vs Relative Strength</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid stroke="#334155" />
                    <XAxis type="number" dataKey="momentum" name="Momentum" domain={[0,100]} tick={{fontSize:10, fill:'#94a3b8'}} label={{ value:'Momentum', position:'insideBottomRight', offset:-2, fill:'#94a3b8', fontSize:10 }} />
                    <YAxis type="number" dataKey="rs" name="RS" domain={[0,100]} tick={{fontSize:10, fill:'#94a3b8'}} label={{ value:'RS', angle:-90, position:'insideLeft', fill:'#94a3b8', fontSize:10 }}/>
                    <RTooltip content={<ChartTooltip />} cursor={{stroke:'#475569'}}/>
                    <Scatter data={momentumVsRS} fill="#3b82f6" shape="circle">
                      {momentumVsRS.map((d,i)=>(<Cell key={i} fill={categoryColor(d.category)} />))}
                    </Scatter>
                    <Legend wrapperStyle={{fontSize:'9px'}}/>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="h-72 md:col-span-2">
                <h3 className="text-xs font-semibold mb-2 text-gray-300">Flow Direction (Intraday Net Flow by Sector)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowDirectionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="sector" tick={{fontSize:10, fill:'#94a3b8'}} interval={0} angle={-35} textAnchor='end' height={70} />
                    <YAxis tick={{fontSize:10, fill:'#94a3b8'}} width={40} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="netFlow" radius={[2,2,0,0]}>
                      {flowDirectionData.map((d,i)=>(<Cell key={i} fill={d.netFlow>=0?'#16a34a':'#dc2626'} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-1 text-[10px] text-gray-400">Total Net Flow: <span className={totalNetFlow>=0?'text-green-400':'text-red-400'}>{totalNetFlow.toFixed(2)}</span></div>
              </div>
            </>
          )}
          {chartMode==='flow' && (
            <div className="h-80 md:col-span-2">
              <h3 className="text-xs font-semibold mb-2 text-gray-300">Money Flow by Sector (Sankey)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <Sankey
                  data={sankeyData as any}
                  nodePadding={18}
                  nodeWidth={10}
                  margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                  linkCurvature={0.5}
                >
                  <RTooltip content={<ChartTooltip />} />
                </Sankey>
              </ResponsiveContainer>
              <div className="mt-1 text-[10px] text-gray-400">Heuristic net intraday flow per sector. Left: Inflow/Outflow sources. Right: sector sinks. Total Net Flow: <span className={totalNetFlow>=0?'text-green-400':'text-red-400'}>{totalNetFlow.toFixed(2)}</span></div>
            </div>
          )}
        </div>
      )}
      <div className="mt-3 text-[10px] text-gray-500">
        <span>Methodology: Sector avg = mean of % changes. AI Top = composite (momentum/RS). Scatter axes 0-100. Net flow derived from qualitative labels.</span>
      </div>
    </div>
  );
}
