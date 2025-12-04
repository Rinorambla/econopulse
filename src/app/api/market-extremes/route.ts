import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Pair = { label:string; value:number|null }
type Extremes = {
  flameScore: number; // euphoria
  bottomScore: number; // panic
  pairs: Pair[];
  move?: number|null;
  skew?: number|null;
  asOf: string;
}

// Build ratios using yahoo-history endpoint already present
async function fetchRatios(): Promise<Record<string, number>> {
  const symbols = ['^VVIX','^VIX','SPHB','SPLV','XLY','XLP','IWD','IWF','HYG','IEF','^MOVE','^SKEW']
  const qs = new URLSearchParams({ symbols: symbols.join(','), range:'6mo', interval:'1d' })
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL||''}/api/yahoo-history?${qs.toString()}`, { cache:'no-store', signal: AbortSignal.timeout(9000) })
  if (!res.ok) return {}
  const js = await res.json()
  const arr: Array<{ symbol:string; bars:Array<{time:number; close:number}> }> = js.data || []
  const map: Record<string, Array<{time:number; close:number}>> = {}
  for (const h of arr) map[h.symbol] = (h.bars||[])
  const latest = (sym:string)=> {
    const s = map[sym]||[]
    return s.length ? s[s.length-1].close : NaN
  }
  const vvix = latest('^VVIX'); const vix = latest('^VIX')
  const spHB = latest('SPHB'); const spLV = latest('SPLV')
  const xly = latest('XLY'); const xlp = latest('XLP')
  const iwd = latest('IWD'); const iwf = latest('IWF')
  const hyg = latest('HYG'); const ief = latest('IEF')
  const move = latest('^MOVE'); const skew = latest('^SKEW')
  const ratios: Record<string, number> = {}
  const safe = (a:number,b:number)=> (Number.isFinite(a)&&Number.isFinite(b)&&b!==0) ? a/b : NaN
  ratios['VVIX/VIX'] = safe(vvix,vix)
  ratios['SPHB/SPLV'] = safe(spHB,spLV)
  ratios['XLY/XLP'] = safe(xly,xlp)
  ratios['IWD/IWF'] = safe(iwd,iwf)
  ratios['HYG/IEF'] = safe(hyg,ief)
  if (Number.isFinite(move)) ratios['MOVE'] = move
  if (Number.isFinite(skew)) ratios['SKEW'] = skew
  return ratios
}

function scoreExtremes(r: Record<string, number>): Extremes {
  // Heuristics: higher SPHB/SPLV, XLY/XLP, IWD/IWF => euphoria; low values => panic
  // High MOVE/SKEW => panic tilt
  const pairs: Pair[] = []
  const get = (k:string)=> (Number.isFinite(r[k]) ? r[k] : null)
  const add = (k:string)=> pairs.push({ label:k, value: get(k) })
  add('VVIX/VIX'); add('SPHB/SPLV'); add('XLY/XLP'); add('IWD/IWF'); add('HYG/IEF')
  const move = get('MOVE'); const skew = get('SKEW')
  const norm = (v:number|null, lo:number, hi:number)=> v==null?0: Math.max(0, Math.min(1, (v-lo)/(hi-lo)))
  const eup = (
    norm(get('SPHB/SPLV'), 0.8, 1.2) +
    norm(get('XLY/XLP'), 0.9, 1.3) +
    norm(get('IWD/IWF'), 0.8, 1.2) +
    norm(get('HYG/IEF'), 0.6, 1.1)
  )
  const panic = (
    norm(get('SPHB/SPLV'), 1.2, 0.8) +
    norm(get('XLY/XLP'), 1.3, 0.9) +
    norm(get('IWD/IWF'), 1.2, 0.8) +
    norm(get('HYG/IEF'), 1.1, 0.6) +
    (move!=null ? (move>120?1: move>90?0.5:0) : 0) +
    (skew!=null ? (skew>135?1: skew>120?0.5:0) : 0)
  )
  return {
    flameScore: Number(eup.toFixed(2)),
    bottomScore: Number(panic.toFixed(2)),
    pairs,
    move: move,
    skew: skew,
    asOf: new Date().toISOString()
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request)
  const rl = rateLimit(`market-extremes:${ip}`, 60, 60_000)
  if (!rl.ok) {
    return new NextResponse(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { ...rateLimitHeaders(rl) } })
  }
  try {
    const ratios = await fetchRatios()
    const out = scoreExtremes(ratios)
    const res = NextResponse.json({ success:true, data: out })
    const headers = rateLimitHeaders(rl)
    Object.entries(headers).forEach(([k,v])=> res.headers.set(k,v))
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (e:any) {
    return NextResponse.json({ success:false, error: e?.message||'unknown_error' }, { status: 500, headers: rateLimitHeaders(rl) })
  }
}
