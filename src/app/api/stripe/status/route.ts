import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-enhanced';

// Lightweight diagnostic endpoint (no secrets) to verify Stripe configuration.
// Returns: mode inference (live/test), ability to list a basic resource, and which price IDs are loaded.
// IMPORTANT: Do NOT expose this endpoint publicly in production without protection.
// Consider adding a simple shared secret header check if needed.

export async function GET(_req: NextRequest) {
  try {
    // Infer mode from key prefix
    const key = process.env.STRIPE_SECRET_KEY || '';
    const mode = key.startsWith('sk_live_') ? 'live' : key.startsWith('sk_test_') ? 'test' : 'unknown';

    // Check ability to access Stripe API (minimal call: list prices 1 item)
    let apiReachable = false;
    let priceSample: string | null = null;
    try {
      const prices = await stripe.prices.list({ limit: 1 });
      apiReachable = true;
      if (prices.data.length > 0) priceSample = prices.data[0].id;
    } catch (e) {
      // swallow; will report unreachable
    }

    return NextResponse.json({
      ok: true,
      mode,
      apiReachable,
      priceSample,
      configuredPrices: {
        premiumMonthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID?.trim() || null,
        premiumYearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID?.trim() || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: 'Stripe status check failed' }, { status: 500 });
  }
}
