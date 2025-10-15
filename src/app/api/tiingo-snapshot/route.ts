import { NextRequest, NextResponse } from 'next/server'
import { ensureSnapshot, getSnapshot, getSnapshotMeta } from '@/lib/tiingo-snapshot'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'
    const force = searchParams.get('force') === 'true'
    const summary = searchParams.get('summary') === 'true'

    await ensureSnapshot(force)
    const data = getSnapshot(category)
    const meta = getSnapshotMeta()

    if (summary) {
      return NextResponse.json({
        status: 'success',
        summary: {
          total: data.length,
          categories: meta.categories,
          lastUpdate: meta.lastUpdate,
          refreshing: meta.refreshing
        }
      })
    }

    return NextResponse.json({
      status: 'success',
      category,
      count: data.length,
      lastUpdate: meta.lastUpdate,
      refreshing: meta.refreshing,
      data
    })
  } catch (e:any) {
    return NextResponse.json({ status: 'error', error: e.message || 'snapshot error' }, { status: 500 })
  }
}
