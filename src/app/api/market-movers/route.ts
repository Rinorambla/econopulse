export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getOptionsMetrics } from '@/lib/options-provider';

type QuoteRow = {
  symbol: string;
  name?: string;
  price?: number;
  changePercent?: number;
  volume?: number;
};

// Lightweight Yahoo Options fetch (contract-level) for IV/OI tabs
type YahooOption = {
  contractSymbol: string;
  strike: number;
  lastPrice?: number;
  change?: number;
  percentChange?: number; // e.g., +12.3
  volume?: number;
  openInterest?: number;
  impliedVolatility?: number; // decimal (0.45)
  inTheMoney?: boolean;
};

type YahooOptionChain = {
  expirationDates: number[]; // epoch seconds
  quote: { regularMarketPrice?: number };
  options: Array<{
    expirationDate: number; // epoch seconds
    calls: YahooOption[];
    puts: YahooOption[];
  }>;
};

async function fetchYahooOptions(symbol: string): Promise<YahooOptionChain | null> {
  const base = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`;
  try {
    const res = await fetch(base, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconopulseBot/1.0)' }, cache: 'no-store' });
    if (!res.ok) return null;
    const js = await res.json();
    const chain = js?.optionChain?.result?.[0];
    if (!chain) return null;
    return chain as YahooOptionChain;
  } catch {
    return null;
  }
}

async function fetchYahooScreener(scrId: string, count = 30): Promise<QuoteRow[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=${encodeURIComponent(scrId)}&count=${count}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconopulseBot/1.0)' }, cache: 'no-store', signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const js = await res.json();
    const quotes = js?.finance?.result?.[0]?.quotes || [];
    return quotes.map((q: any) => ({
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice,
      changePercent: q.regularMarketChangePercent,
      volume: typeof q.regularMarketVolume === 'object' ? q.regularMarketVolume?.raw : q.regularMarketVolume
    }));
  } catch {
    return [];
  }
}

// Simple in-memory cache to avoid heavy bursts; reset on server reloads
type CacheShape = { at: number; payload: any } | null;
let lastCache: CacheShape = null;
const CACHE_TTL_MS = 120_000; // 2 minutes

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(v => { clearTimeout(id); resolve(v); }).catch(e => { clearTimeout(id); reject(e); });
  });
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`market-movers:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return new NextResponse(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { ...rateLimitHeaders(rl) } });
  }

  try {
    // Serve from cache when fresh
    if (lastCache && (Date.now() - lastCache.at) < CACHE_TTL_MS) {
      const res = NextResponse.json(lastCache.payload);
      const headers = rateLimitHeaders(rl);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      res.headers.set('Cache-Control', 'no-store');
      res.headers.set('X-Cache', 'HIT');
      return res;
    }
    // Fetch predefined screeners for Most Active / Gainers / Losers
    const t0 = Date.now();
    const [mostActive, topGainers, topLosers] = await Promise.all([
      fetchYahooScreener('most_actives', 30),
      fetchYahooScreener('day_gainers', 30),
      fetchYahooScreener('day_losers', 30)
    ]);

    // Build a candidate universe for options metrics (unique, limited)
    const universe = Array.from(new Set([
      ...mostActive.map(x => x.symbol),
      ...topGainers.map(x => x.symbol),
      ...topLosers.map(x => x.symbol)
    ])).slice(0, 40);

    // Compute lightweight options metrics for IV/OI rankings on a small subset
    // Limit concurrency to avoid hammering Yahoo
  const concurrency = 4;
    const results: Array<{ symbol: string; iv: number | null; oi: number } > = [];
    for (let i = 0; i < universe.length; i += concurrency) {
      const chunk = universe.slice(i, i + concurrency);
      const chunkPromises = chunk.map(async (sym) => {
        try {
          const m = await withTimeout(getOptionsMetrics(sym, 1), 10_000);
          if (!m) return { symbol: sym, iv: null, oi: 0 };
          const iv = m.ivCall25d ?? m.ivPut25d ?? null; // decimal (e.g., 0.45)
          const oi = (m.totalCallOI || 0) + (m.totalPutOI || 0);
          return { symbol: sym, iv, oi };
        } catch {
          return { symbol: sym, iv: null, oi: 0 };
        }
      });
      const chunkRes = await Promise.all(chunkPromises);
      results.push(...chunkRes);
      // gentle pacing
      if (i + concurrency < universe.length) await new Promise(r => setTimeout(r, 250));
    }

  const bySymbol = new Map(results.map(r => [r.symbol, r]));

    const highIV = results
      .filter(r => r.iv != null && isFinite(r.iv as number))
      .sort((a, b) => (b.iv as number) - (a.iv as number))
      .slice(0, 20)
      .map(r => {
        const q = mostActive.concat(topGainers, topLosers).find(x => x.symbol === r.symbol);
        return {
          symbol: r.symbol,
          name: q?.name || r.symbol,
          price: q?.price ?? null,
          ivPercent: r.iv != null ? Math.round((r.iv as number) * 1000) / 10 : null,
          openInterest: r.oi
        };
      });

    const highOI = results
      .filter(r => r.oi > 0)
      .sort((a, b) => b.oi - a.oi)
      .slice(0, 20)
      .map(r => {
        const q = mostActive.concat(topGainers, topLosers).find(x => x.symbol === r.symbol);
        return {
          symbol: r.symbol,
          name: q?.name || r.symbol,
          price: q?.price ?? null,
          openInterest: r.oi,
          ivPercent: bySymbol.get(r.symbol)?.iv != null ? Math.round((bySymbol.get(r.symbol)!.iv as number) * 1000) / 10 : null
        };
      });

    const res = NextResponse.json({
      success: true,
      asOf: new Date().toISOString(),
      mostActive,
      topGainers,
      topLosers,
      highIV,
      highOI,
      // Below: option-level lists for Highest IV and Highest OI (contract rows)
      highIVContracts: await (async () => {
        const universe = Array.from(new Set([
          ...highIV.map(r => r.symbol).slice(0, 12),
          ...highOI.map(r => r.symbol).slice(0, 8)
        ])).slice(0, 20);
        const out: Array<{
          symbol: string;
          option: string;
          type: 'Call'|'Put';
          last: number|null;
          changePct: number|null;
          volume: number;
          oi: number;
          ivPct: number|null;
        }> = [];
        const now = Date.now();
  const concurrency = 2;
        for (let i=0; i<universe.length; i+=concurrency) {
          const chunk = universe.slice(i,i+concurrency);
          const chunkRes = await Promise.all(chunk.map(async (sym) => {
            const chain = await withTimeout(fetchYahooOptions(sym), 6_500).catch(()=>null);
            if (!chain) return [] as typeof out;
            const block = (chain.options || []).find(b => b.expirationDate*1000 > now) || chain.options?.[0];
            if (!block) return [] as typeof out;
            const rows: typeof out = [];
            for (const c of (block.calls||[])) {
              rows.push({ symbol: sym, option: c.contractSymbol, type: 'Call', last: c.lastPrice ?? null, changePct: c.percentChange ?? null, volume: c.volume||0, oi: c.openInterest||0, ivPct: c.impliedVolatility!=null? Math.round(c.impliedVolatility*1000)/10 : null });
            }
            for (const p of (block.puts||[])) {
              rows.push({ symbol: sym, option: p.contractSymbol, type: 'Put', last: p.lastPrice ?? null, changePct: p.percentChange ?? null, volume: p.volume||0, oi: p.openInterest||0, ivPct: p.impliedVolatility!=null? Math.round(p.impliedVolatility*1000)/10 : null });
            }
            return rows;
          }));
          out.push(...chunkRes.flat());
          if (i+concurrency<universe.length) await new Promise(r=>setTimeout(r,300));
        }
        return out
          .filter(r => r.ivPct!=null && isFinite(r.ivPct as number) && (r.volume>0 || r.oi>0))
          .sort((a,b)=> (b.ivPct as number) - (a.ivPct as number))
          .slice(0,30);
      })(),
      highOIContracts: await (async () => {
        const universe = Array.from(new Set([
          ...highOI.map(r => r.symbol).slice(0, 12),
          ...highIV.map(r => r.symbol).slice(0, 8)
        ])).slice(0, 20);
        const out: Array<{
          symbol: string;
          option: string;
          type: 'Call'|'Put';
          last: number|null;
          changePct: number|null;
          volume: number;
          oi: number;
          ivPct: number|null;
        }> = [];
        const now = Date.now();
  const concurrency = 2;
        for (let i=0; i<universe.length; i+=concurrency) {
          const chunk = universe.slice(i,i+concurrency);
          const chunkRes = await Promise.all(chunk.map(async (sym) => {
            const chain = await withTimeout(fetchYahooOptions(sym), 6_500).catch(()=>null);
            if (!chain) return [] as typeof out;
            const block = (chain.options || []).find(b => b.expirationDate*1000 > now) || chain.options?.[0];
            if (!block) return [] as typeof out;
            const rows: typeof out = [];
            for (const c of (block.calls||[])) {
              rows.push({ symbol: sym, option: c.contractSymbol, type: 'Call', last: c.lastPrice ?? null, changePct: c.percentChange ?? null, volume: c.volume||0, oi: c.openInterest||0, ivPct: c.impliedVolatility!=null? Math.round(c.impliedVolatility*1000)/10 : null });
            }
            for (const p of (block.puts||[])) {
              rows.push({ symbol: sym, option: p.contractSymbol, type: 'Put', last: p.lastPrice ?? null, changePct: p.percentChange ?? null, volume: p.volume||0, oi: p.openInterest||0, ivPct: p.impliedVolatility!=null? Math.round(p.impliedVolatility*1000)/10 : null });
            }
            return rows;
          }));
          out.push(...chunkRes.flat());
          if (i+concurrency<universe.length) await new Promise(r=>setTimeout(r,300));
        }
        return out
          .filter(r => r.oi>0)
          .sort((a,b)=> b.oi - a.oi)
          .slice(0,30);
      })()
    });
    const t1 = Date.now();
    const headers = rateLimitHeaders(rl);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Diagnostics', JSON.stringify({
      universe: universe.length,
      ms: t1 - t0
    }));
    return res;
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'unknown_error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
