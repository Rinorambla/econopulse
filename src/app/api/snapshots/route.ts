import { NextResponse } from 'next/server'
import { createSnapshot, listSnapshots, loadSnapshot } from '@/lib/snapshot-store'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'list'
  const category = searchParams.get('category') || 'all'
  const file = searchParams.get('file')
  try {
    if (action === 'create') {
      const meta = await createSnapshot(category)
      return NextResponse.json({ ok:true, created: meta })
    }
    if (action === 'get' && file) {
      const snap = loadSnapshot(file)
      if (!snap) return NextResponse.json({ ok:false, error:'not found' }, { status:404 })
      return NextResponse.json({ ok:true, snapshot: snap })
    }
    const list = listSnapshots(category==='all'?undefined:category)
    return NextResponse.json({ ok:true, snapshots: list })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message||'error' }, { status:500 })
  }
}
