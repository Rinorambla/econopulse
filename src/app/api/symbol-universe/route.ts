import { NextResponse } from 'next/server'
import { DEFAULT_UNIVERSE, flattenUniverse } from '@/lib/symbol-universe'

export async function GET() {
  return NextResponse.json({ ok:true, groups: DEFAULT_UNIVERSE, all: flattenUniverse() })
}
