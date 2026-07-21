export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 45;

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getNasdaqPastEarnings } from '@/lib/nasdaq-earnings';
import { SP500_SECTORS } from '@/lib/sp500-stocks';

/**
 * Recent earnings RESULTS (beats & misses) with sector comparison.
 *
 * Pipeline (all Nasdaq.com public endpoints — no API key, consistent source):
 *   1. Calendar for the past `days` weekdays → who has just reported
 *      (real report dates, company names, market-cap tiers).
 *   2. /api/company/{symbol}/earnings-surprise → actual EPS vs consensus
 *      forecast + surprise % for the freshly reported quarter.
 *   3. Classify beat / miss / inline and aggregate per sector
 *      (beat rate, average surprise, counts). Sector from the local S&P 500 map.
 */

export interface EarningsResult {
  symbol: string;
  company: string;
  sector: string;
  date: string;        // report date
  epsActual: number;
  epsEstimate: number | null;
  surprisePct: number | null;
  outcome: 'beat' | 'miss' | 'inline';
}

interface SectorStat {
  sector: string;
  total: number;
  beats: number;
  misses: number;
  inline: number;
  beatRate: number;      // 0-100
  avgSurprise: number | null;
}

// symbol → sector lookup from the centralized S&P 500 config
const SYMBOL_SECTOR: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [sector, symbols] of Object.entries(SP500_SECTORS)) {
    for (const s of symbols) out[s.toUpperCase()] = sector;
  }
  return out;
})();

const NASDAQ_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://www.nasdaq.com',
  Referer: 'https://www.nasdaq.com/',
};

let _cache: { ts: number; days: number; payload: any } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 min — fresh results appear quickly during earnings season

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/[$,%]/g, ''));
  return isFinite(n) ? n : null;
}

/** Parse Nasdaq's `M/D/YYYY` date format. */
function parseUsDate(s: unknown): Date | null {
  if (typeof s !== 'string' || !s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])));
}

async function fetchSurprise(symbol: string, sinceMs: number): Promise<{ epsActual: number; epsEstimate: number | null; surprisePct: number | null; dateReported: string } | null> {
  try {
    const res = await fetch(`https://api.nasdaq.com/api/company/${encodeURIComponent(symbol)}/earnings-surprise`, {
      headers: NASDAQ_HEADERS,
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const rows: any[] = json?.data?.earningsSurpriseTable?.rows || [];
    for (const r of rows) {
      const d = parseUsDate(r?.dateReported);
      const eps = toNum(r?.eps);
      if (!d || eps == null) continue;
      // Only the freshly reported quarter (within the requested window).
      if (d.getTime() < sinceMs) break; // rows are newest-first
      const est = toNum(r?.consensusForecast);
      let sp = toNum(r?.percentageSurprise);
      if (sp == null && est != null && est !== 0) sp = +(((eps - est) / Math.abs(est)) * 100).toFixed(2);
      return {
        epsActual: eps,
        epsEstimate: est,
        surprisePct: sp,
        dateReported: d.toISOString().slice(0, 10),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request);
  const rl = rateLimit(`earnings-results:${ip}`, 20, 60_000);
  if (!rl.ok) return new NextResponse('rate_limited', { status: 429, headers: { ...rateLimitHeaders(rl) } });

  const url = new URL(req.url);
  const days = Math.max(1, Math.min(14, Number(url.searchParams.get('days')) || 7));

  if (_cache && _cache.days === days && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.payload, { headers: { ...rateLimitHeaders(rl), 'x-cache': 'HIT' } });
  }

  try {
    // 1. Who reported recently (real dates from the Nasdaq calendar).
    const past = await getNasdaqPastEarnings(days, 30);
    const tierRank: Record<string, number> = { Large: 0, Medium: 1, Small: 2 };
    const seen = new Set<string>();
    const candidates = past
      .filter((e) => {
        const k = e.symbol.toUpperCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => (tierRank[a.marketCap] ?? 3) - (tierRank[b.marketCap] ?? 3) || (b.numEstimates || 0) - (a.numEstimates || 0))
      .slice(0, 45);

    const sinceMs = Date.now() - (days + 2) * 86400000;

    // 2. Actual vs consensus from Nasdaq earnings-surprise, small batches.
    const results: EarningsResult[] = [];
    const BATCH = 5;
    for (let i = 0; i < candidates.length; i += BATCH) {
      const chunk = candidates.slice(i, i + BATCH);
      const out = await Promise.all(
        chunk.map(async (ev) => {
          const r = await fetchSurprise(ev.symbol, sinceMs);
          if (!r) return null;
          const outcome: EarningsResult['outcome'] =
            r.surprisePct == null ? 'inline' : r.surprisePct > 0.5 ? 'beat' : r.surprisePct < -0.5 ? 'miss' : 'inline';
          return {
            symbol: ev.symbol,
            company: ev.company,
            sector: SYMBOL_SECTOR[ev.symbol.toUpperCase()] || (ev.sector !== 'Unknown' ? ev.sector : 'Other'),
            date: r.dateReported,
            epsActual: r.epsActual,
            epsEstimate: r.epsEstimate,
            surprisePct: r.surprisePct,
            outcome,
          } as EarningsResult;
        })
      );
      for (const r of out) if (r) results.push(r);
    }

    // 3. Sector aggregation.
    const bySector = new Map<string, EarningsResult[]>();
    for (const r of results) {
      const list = bySector.get(r.sector) || [];
      list.push(r);
      bySector.set(r.sector, list);
    }
    const sectors: SectorStat[] = Array.from(bySector.entries())
      .map(([sector, list]) => {
        const beats = list.filter((r) => r.outcome === 'beat').length;
        const misses = list.filter((r) => r.outcome === 'miss').length;
        const inline = list.length - beats - misses;
        const surprises = list.map((r) => r.surprisePct).filter((v): v is number => v != null);
        return {
          sector,
          total: list.length,
          beats,
          misses,
          inline,
          beatRate: Math.round((beats / list.length) * 100),
          avgSurprise: surprises.length ? +(surprises.reduce((a, b) => a + b, 0) / surprises.length).toFixed(1) : null,
        };
      })
      .sort((a, b) => b.total - a.total);

    const payload = {
      ok: true,
      days,
      results: results.sort((a, b) => (b.surprisePct ?? 0) - (a.surprisePct ?? 0)),
      sectors,
      summary: {
        total: results.length,
        beats: results.filter((r) => r.outcome === 'beat').length,
        misses: results.filter((r) => r.outcome === 'miss').length,
        inline: results.filter((r) => r.outcome === 'inline').length,
      },
      asOf: new Date().toISOString(),
    };
    _cache = { ts: Date.now(), days, payload };
    return NextResponse.json(payload, { headers: { ...rateLimitHeaders(rl), 'x-cache': 'MISS' } });
  } catch (e: any) {
    if (_cache && _cache.days === days) {
      return NextResponse.json(_cache.payload, { headers: { ...rateLimitHeaders(rl), 'x-cache': 'STALE' } });
    }
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500, headers: rateLimitHeaders(rl) });
  }
}
