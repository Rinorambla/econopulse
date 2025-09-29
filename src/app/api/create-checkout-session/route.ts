// Deprecated: use /api/stripe/create-checkout-session instead.
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  return NextResponse.json({
    ok: false,
    deprecated: true,
    message: 'Use /api/stripe/create-checkout-session',
  }, { status: 410 });
}
