import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { getYahooQuotes } from '@/lib/yahooFinance'

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

// Build ratios using direct Yahoo Finance API calls (avoids self-referencing API routes)
async function fetchRatios(): Promise<Record<string, number>> {
  const symbols = ['^VVIX','^VIX','SPHB','SPLV','XLY','XLP','IWD','IWF','HYG','IEF','^MOVE','^SKEW']
  
  try {
    // Fetch all quotes directly from Yahoo Finance
    const quotes = await getYahooQuotes(symbols)
    
    // Build price map from quotes
    const priceMap: Record<string, number> = {}
    for (const q of quotes) {
      if (q && Number.isFinite(q.price) && q.price > 0) {
        priceMap[q.ticker] = q.price
      }
    }
    
    // Extract prices with fallback to NaN
    const get = (sym: string) => priceMap[sym] ?? NaN
    
    const vvix = get('^VVIX')
    const vix = get('^VIX')
    const spHB = get('SPHB')
    const spLV = get('SPLV')
    const xly = get('XLY')
    const xlp = get('XLP')
    const iwd = get('IWD')
    const iwf = get('IWF')
    const hyg = get('HYG')
    const ief = get('IEF')
    const move = get('^MOVE')
    const skew = get('^SKEW')
    
    // Calculate ratios
    const ratios: Record<string, number> = {}
    const safe = (a: number, b: number) => (Number.isFinite(a) && Number.isFinite(b) && b !== 0) ? a / b : NaN
    
    ratios['VVIX/VIX'] = safe(vvix, vix)
    ratios['SPHB/SPLV'] = safe(spHB, spLV)
    ratios['XLY/XLP'] = safe(xly, xlp)
    ratios['IWD/IWF'] = safe(iwd, iwf)
    ratios['HYG/IEF'] = safe(hyg, ief)
    if (Number.isFinite(move)) ratios['MOVE'] = move
    if (Number.isFinite(skew)) ratios['SKEW'] = skew
    
    return ratios
  } catch (error) {
    console.error('Failed to fetch market ratios:', error)
    return {}
  }
}

function scoreExtremes(r: Record<string, number>): Extremes {
  // FLAME (Euphoria): High Beta outperforms, Cyclicals strong, Credit spreads tight, Low vol complacency
  // BOTTOM (Panic): Low Vol outperforms, Defensives strong, Flight to safety, High MOVE/SKEW
  const pairs: Pair[] = []
  const get = (k:string)=> (Number.isFinite(r[k]) ? r[k] : null)
  const add = (k:string)=> pairs.push({ label:k, value: get(k) })
  add('VVIX/VIX'); add('SPHB/SPLV'); add('XLY/XLP'); add('IWD/IWF'); add('HYG/IEF')
  const move = get('MOVE'); const skew = get('SKEW')
  
  // Normalize with proper direction: v goes from lo to hi => output 0 to 1
  const norm = (v:number|null, lo:number, hi:number)=> v==null?0: Math.max(0, Math.min(1, (v-lo)/(hi-lo)))
  // Inverse norm for panic indicators (higher v → higher panic)
  const normInv = (v:number|null, hi:number, lo:number)=> v==null?0: Math.max(0, Math.min(1, (hi-v)/(hi-lo)))
  
  // FLAME (Euphoria): Elevated when risk-on ratios are HIGH, vol metrics are LOW
  const sphbSplv = get('SPHB/SPLV') ?? 1.0
  const xlyXlp = get('XLY/XLP') ?? 1.0
  const iwdIwf = get('IWD/IWF') ?? 1.0
  const hygIef = get('HYG/IEF') ?? 0.85
  
  const euphoriaSignals = [
    norm(sphbSplv, 0.98, 1.15),    // SPHB/SPLV: 0.98=neutral, 1.15=euphoria
    norm(xlyXlp, 1.05, 1.25),      // XLY/XLP: 1.05=neutral, 1.25=euphoria
    norm(iwdIwf, 0.98, 1.12),      // IWD/IWF: 0.98=neutral, 1.12=euphoria
    norm(hygIef, 0.85, 1.05),      // HYG/IEF: 0.85=neutral, 1.05=euphoria (tight spreads)
    // Low MOVE/SKEW = complacency = euphoria
    move!=null ? (move<85?0.8: move<100?0.4:0) : 0,
    skew!=null ? (skew<118?0.8: skew<125?0.4:0) : 0
  ]
  
  // BOTTOM (Panic): Elevated when defensive ratios dominate (risk-off), vol metrics spike
  const panicSignals = [
    normInv(sphbSplv, 1.05, 0.82),    // SPHB/SPLV: 1.05=neutral, 0.82=panic (SPLV dominates)
    normInv(xlyXlp, 1.20, 0.88),      // XLY/XLP: 1.20=neutral, 0.88=panic (XLP dominates)
    normInv(iwdIwf, 1.05, 0.88),      // IWD/IWF: 1.05=neutral, 0.88=panic
    normInv(hygIef, 0.95, 0.65),      // HYG/IEF: 0.95=neutral, 0.65=panic (flight to safety)
    // High MOVE/SKEW = stress = panic
    move!=null ? (move>130?1.2: move>110?0.8: move>95?0.4:0) : 0,
    skew!=null ? (skew>140?1.2: skew>128?0.8: skew>120?0.4:0) : 0
  ]
  
  const flameScore = euphoriaSignals.reduce((a,b)=>a+b, 0) / euphoriaSignals.length
  const bottomScore = panicSignals.reduce((a,b)=>a+b, 0) / panicSignals.length
  
  return {
    flameScore: Number(flameScore.toFixed(2)),
    bottomScore: Number(bottomScore.toFixed(2)),
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
