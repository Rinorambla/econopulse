import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ success: false, error: 'options_screener_removed' }, { status: 410 });
}
