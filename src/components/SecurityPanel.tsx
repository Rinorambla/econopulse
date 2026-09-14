'use client';

// Reusable quote panel: chart + key stats + earnings + news for one symbol.
// Used by the /security/[symbol] page and inline drawers (e.g. dashboard).
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const AdvancedChart = dynamic(() => import('@/components/analytics/AdvancedChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] bg-slate-900/40 border border-white/10 rounded-lg flex items-center justify-center text-xs text-gray-400">
      Loading chart…
    </div>
  ),
});

interface Analysis {
  ok: boolean;
  price?: number;
  composite?: number;
  verdict?: string;
  trend?: Record<string, string>;
  technicals?: {
    rsi14: number | null; macdHist: number | null; sma20: number | null; sma50: number | null;
    sma200: number | null; goldenCross: boolean | null; atrPct: number | null;
    volumeVsAvg: number | null; from52High: number | null; from52Low: number | null;
  };
  levels?: { support: number[]; resistance: number[] };
}

interface NewsItem { title: string; publisher?: string; link: string; publishedAt?: string; thumbnail?: string }
interface EarningRow { date: string; eps: number | null; estimate: number | null; surprisePct: number | null }

export default function SecurityPanel({ symbol, chartHeight = 520, stacked = false }: { symbol: string; chartHeight?: number; stacked?: boolean }) {
  const [quote, setQuote] = useState<{ price?: number; change?: number; changePercent?: number; name?: string } | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [earnings, setEarnings] = useState<EarningRow[]>([]);

  useEffect(() => {
    let stop = false;
    setQuote(null);
    const load = async () => {
      try {
        const r = await fetch(`/api/yahoo-quotes?symbols=${encodeURIComponent(symbol)}`, { cache: 'no-store' });
        if (r.ok) { const js = await r.json(); if (!stop) setQuote(js?.data?.[0] || null); }
      } catch {}
    };
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 30000);
    return () => { stop = true; clearInterval(id); };
  }, [symbol]);

  useEffect(() => {
    let stop = false;
    setAnalysis(null); setNews([]); setEarnings([]);
    (async () => {
      try {
        const r = await fetch(`/api/symbol-analysis?symbol=${encodeURIComponent(symbol)}`, { cache: 'no-store' });
        if (r.ok) { const js = await r.json(); if (!stop) setAnalysis(js); }
      } catch {}
      try {
        const r = await fetch(`/api/symbol-news?symbol=${encodeURIComponent(symbol)}`, { cache: 'no-store' });
        if (r.ok) { const js = await r.json(); if (!stop) setNews((js?.data || []).slice(0, 8)); }
      } catch {}
      try {
        const r = await fetch(`/api/symbol-earnings?symbol=${encodeURIComponent(symbol)}`, { cache: 'no-store' });
        if (r.ok) { const js = await r.json(); if (!stop) setEarnings((js?.data || []).slice(0, 6)); }
      } catch {}
    })();
    return () => { stop = true; };
  }, [symbol]);

  const pct = quote?.changePercent;
  const pctCls = pct == null ? 'text-slate-400' : pct > 0 ? 'text-emerald-400' : pct < 0 ? 'text-red-400' : 'text-slate-300';
  const t = analysis?.technicals;
  const verdictCls = (v?: string) =>
    v === 'Strong Buy' ? 'bg-emerald-600/25 text-emerald-300 border-emerald-500/40' :
    v === 'Buy' ? 'bg-emerald-600/15 text-emerald-300 border-emerald-500/25' :
    v === 'Sell' ? 'bg-orange-600/20 text-orange-300 border-orange-500/30' :
    v === 'Strong Sell' ? 'bg-red-700/25 text-red-300 border-red-600/40' :
    'bg-slate-600/25 text-slate-300 border-slate-500/30';

  const Stat = ({ label, value, cls }: { label: string; value: React.ReactNode; cls?: string }) => (
    <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#1d232e] last:border-0">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={`text-[11px] font-semibold tabular-nums ${cls || 'text-slate-200'}`}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-3 text-white">
      {/* Quote header */}
      <div className="flex flex-wrap items-center gap-3">
        <img
          src={`https://assets.parqet.com/logos/symbol/${symbol}?format=jpg`}
          alt=""
          className="w-9 h-9 rounded-full bg-slate-800 object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold tracking-tight">{symbol}</h2>
            {analysis?.verdict && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${verdictCls(analysis.verdict)}`}>
                {analysis.verdict}{analysis.composite != null ? ` · ${analysis.composite}` : ''}
              </span>
            )}
          </div>
          {quote?.name && <div className="text-[11px] text-slate-400">{quote.name}</div>}
        </div>
        <div className="ml-auto text-right">
          <div className="text-xl font-bold tabular-nums">{quote?.price != null ? `$${quote.price >= 1000 ? quote.price.toFixed(0) : quote.price.toFixed(2)}` : '—'}</div>
          <div className={`text-[12px] font-semibold tabular-nums ${pctCls}`}>
            {quote?.change != null ? `${quote.change > 0 ? '+' : ''}${quote.change.toFixed(2)}` : ''}
            {pct != null ? ` (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)` : ''}
          </div>
        </div>
      </div>

      {/* Chart + stats */}
      <div className={`grid grid-cols-1 gap-3 ${stacked ? '' : 'xl:grid-cols-[1fr_290px]'}`}>
        <div className="min-w-0">
          <AdvancedChart symbol={symbol} height={chartHeight} />
        </div>
        <div className={stacked ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}>
          <div className="bg-[#0d1017] border border-[#1d232e] rounded-lg overflow-hidden">
            <div className="px-2.5 py-1.5 border-b border-[#1d232e] text-[10px] font-semibold uppercase tracking-widest text-slate-500">Key technicals</div>
            <Stat label="RSI (14)" value={t?.rsi14 ?? '—'} cls={t?.rsi14 != null ? (t.rsi14 >= 70 ? 'text-red-400' : t.rsi14 <= 30 ? 'text-emerald-400' : 'text-slate-200') : undefined} />
            <Stat label="MACD hist" value={t?.macdHist ?? '—'} cls={t?.macdHist != null ? (t.macdHist > 0 ? 'text-emerald-400' : 'text-red-400') : undefined} />
            <Stat label="SMA 20 / 50 / 200" value={t ? `${t.sma20 ?? '—'} / ${t.sma50 ?? '—'} / ${t.sma200 ?? '—'}` : '—'} />
            <Stat label="Golden cross" value={t?.goldenCross == null ? '—' : t.goldenCross ? 'Yes' : 'No'} cls={t?.goldenCross ? 'text-emerald-400' : undefined} />
            <Stat label="ATR %" value={t?.atrPct != null ? `${t.atrPct}%` : '—'} />
            <Stat label="Volume vs 20d" value={t?.volumeVsAvg != null ? `${t.volumeVsAvg}×` : '—'} />
            <Stat label="From 52w high" value={t?.from52High != null ? `${t.from52High}%` : '—'} cls="text-red-400" />
            <Stat label="From 52w low" value={t?.from52Low != null ? `+${t.from52Low}%` : '—'} cls="text-emerald-400" />
          </div>

          {(analysis?.levels?.resistance?.length || analysis?.levels?.support?.length) ? (
            <div className="bg-[#0d1017] border border-[#1d232e] rounded-lg overflow-hidden">
              <div className="px-2.5 py-1.5 border-b border-[#1d232e] text-[10px] font-semibold uppercase tracking-widest text-slate-500">Key levels</div>
              {[...(analysis?.levels?.resistance || [])].reverse().map((v, i) => (
                <Stat key={`r${i}`} label="Resistance" value={v} cls="text-red-300" />
              ))}
              {quote?.price != null && <Stat label="Last" value={quote.price.toFixed(2)} cls="text-white" />}
              {(analysis?.levels?.support || []).map((v, i) => (
                <Stat key={`s${i}`} label="Support" value={v} cls="text-emerald-300" />
              ))}
            </div>
          ) : null}

          {earnings.length > 0 && (
            <div className="bg-[#0d1017] border border-[#1d232e] rounded-lg overflow-hidden">
              <div className="px-2.5 py-1.5 border-b border-[#1d232e] text-[10px] font-semibold uppercase tracking-widest text-slate-500">Earnings</div>
              {earnings.map((e, i) => {
                const beat = e.surprisePct != null ? e.surprisePct >= 0 : null;
                return (
                  <div key={i} className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#1d232e] last:border-0 text-[11px]">
                    <span className="text-slate-400">{e.date}</span>
                    <span className="tabular-nums text-slate-200">{e.eps ?? '—'} vs {e.estimate ?? '—'}</span>
                    <span className={`tabular-nums font-semibold ${beat == null ? 'text-slate-500' : beat ? 'text-emerald-400' : 'text-red-400'}`}>
                      {e.surprisePct != null ? `${e.surprisePct > 0 ? '+' : ''}${e.surprisePct}%` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* News */}
      {news.length > 0 && (
        <div className="bg-[#0d1017] border border-[#1d232e] rounded-lg overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-[#1d232e] text-[10px] font-semibold uppercase tracking-widest text-slate-500">News · {symbol}</div>
          <div className="divide-y divide-[#1d232e]">
            {news.map((n, i) => (
              <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="flex gap-3 px-2.5 py-2 hover:bg-white/5">
                {n.thumbnail && <img src={n.thumbnail} alt="" className="w-14 h-10 rounded object-cover shrink-0" loading="lazy" />}
                <div className="min-w-0">
                  <div className="text-[12px] text-slate-200 leading-snug line-clamp-2">{n.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {n.publisher}{n.publishedAt ? ` · ${new Date(n.publishedAt).toLocaleString()}` : ''}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
