/**
 * Stripe webhook — single entry point for all Stripe events.
 *
 * Strategy: for any event that has a customer ID (or that we can resolve to
 * one), we run `syncStripeData(customerId)`. This pulls fresh state from
 * Stripe and updates the DB. We never trust the event payload directly.
 *
 * This keeps the handler idempotent, simple, and impossible to drift from
 * Stripe's actual state.
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe-server';
import { syncStripeData } from '@/lib/subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'invoice.paid',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.upcoming',
  'invoice.marked_uncollectible',
  'invoice.payment_action_required',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
]);

function extractCustomerId(event: Stripe.Event): string | null {
  const obj: any = (event.data?.object as any) || {};
  if (typeof obj.customer === 'string') return obj.customer;
  if (obj.customer?.id) return obj.customer.id;
  // checkout.session has customer; subscription has customer; invoice has customer
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] missing signature or secret');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[webhook] signature verification failed:', err?.message);
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
  }

  // Acknowledge events we don't care about. Stripe will not retry on 200.
  if (!ALLOWED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const customerId = extractCustomerId(event);
  if (!customerId) {
    console.warn('[webhook] no customer on event', event.type, event.id);
    return NextResponse.json({ received: true, no_customer: true });
  }

  try {
    const snapshot = await syncStripeData(customerId);
    console.log('[webhook]', event.type, 'synced', customerId, '->', snapshot.status, snapshot.plan);
    return NextResponse.json({ received: true, plan: snapshot.plan, status: snapshot.status });
  } catch (e: any) {
    console.error('[webhook] sync failed for', customerId, e?.message);
    // Return 500 so Stripe retries.
    return NextResponse.json({ error: 'sync failed' }, { status: 500 });
  }
}
