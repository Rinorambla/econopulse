import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.NEWSLETTER_CRON_SECRET || process.env.WEBHOOK_SECRET || ''
    const provided = req.headers.get('x-admin-secret') || new URL(req.url).searchParams.get('secret') || ''
    if (!secret || provided !== secret) {
      return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 })
    }

    // Trigger both calendar endpoints to refresh and persist snapshots
    const base = process.env.BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const econ = await fetch(`${base}/api/economic-calendar?days=21`, { cache:'no-store' })
    const earn = await fetch(`${base}/api/earnings-calendar?days=30`, { cache:'no-store' })
    const ej = await econ.json().catch(()=>({}))
    const dj = await earn.json().catch(()=>({}))

    return NextResponse.json({ ok:true, economic: { status:econ.status, count: ej?.count ?? ej?.data?.length ?? 0 }, earnings: { status:earn.status, count: dj?.data?.length ?? 0 } })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'failed' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'