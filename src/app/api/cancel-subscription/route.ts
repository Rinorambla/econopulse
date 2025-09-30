import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

let stripe: Stripe | null = null;
function getStripe() {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null; // build-safe: no throw at import
  stripe = new Stripe(key, { apiVersion: '2025-06-30.basil' });
  return stripe;
}

export async function POST(request: NextRequest) {
  try {
    const client = getStripe();
    if (!client) {
      return NextResponse.json(
        { error: 'Stripe not configured', demo: true },
        { status: 503 }
      );
    }

    const { subscriptionId } = await request.json();
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    const subscription = await client.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: (subscription as any).current_period_end,
      },
    });
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
