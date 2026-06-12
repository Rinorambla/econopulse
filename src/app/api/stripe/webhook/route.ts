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
import { supabaseAdmin } from '@/lib/supabase-admin';
import { EmailService } from '@/services/EmailService';

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

  // Explicit downgrade path: if Stripe tells us a subscription was deleted or
  // is in a non-paying terminal state, write that directly. We don't rely on
  // syncStripeData here because list() may not include the deleted sub.
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    try {
      const db = supabaseAdmin();
      await db
        .from('users')
        .update({
          subscription_status: sub.status || 'canceled',
          subscription_tier: 'free',
          stripe_subscription_id: null,
          subscription_id: null,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId);
      console.log('[webhook] subscription.deleted -> downgraded', customerId);
    } catch (e: any) {
      console.error('[webhook] downgrade write failed:', e?.message);
    }
    return NextResponse.json({ received: true, downgraded: true });
  }

  // Confirmation email: checkout.session.completed fires exactly once per
  // checkout, so it cannot cause duplicate sends.
  if (event.type === 'checkout.session.completed') {
    try {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription') {
        let email: string | null =
          session.customer_details?.email || session.customer_email || null;
        if (!email) {
          try {
            const db = supabaseAdmin();
            const { data } = await db
              .from('users')
              .select('email')
              .eq('stripe_customer_id', customerId)
              .maybeSingle();
            email = (data?.email as string | undefined) || null;
          } catch {}
        }
        if (email) {
          let amountEur: number | undefined;
          let interval: string | null = null;
          try {
            const subId = typeof session.subscription === 'string'
              ? session.subscription
              : (session.subscription as Stripe.Subscription | null)?.id;
            if (subId) {
              const sub = await stripe().subscriptions.retrieve(subId);
              const price = sub.items.data[0]?.price;
              if (typeof price?.unit_amount === 'number') amountEur = price.unit_amount / 100;
              interval = price?.recurring?.interval || null;
            }
          } catch {}
          await EmailService.sendSubscriptionConfirmed(email, { amountEur, interval });
        } else {
          console.warn('[webhook] checkout.completed: no email for customer', customerId);
        }
      }
    } catch (e: any) {
      console.error('[webhook] confirmation email failed:', e?.message);
      // Don't fail the webhook — still continue to syncStripeData below
    }
  }

  // Send a reminder email 3 days before the trial ends. Stripe fires this
  // event once per subscription, so it cannot cause duplicate sends.
  if (event.type === 'customer.subscription.trial_will_end') {
    try {
      const sub = event.data.object as Stripe.Subscription;
      // Look up the user's email — prefer Supabase, fall back to Stripe customer
      let email: string | null = null;
      try {
        const db = supabaseAdmin();
        const { data } = await db
          .from('users')
          .select('email')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();
        email = (data?.email as string | undefined) || null;
      } catch {}
      if (!email) {
        try {
          const cust = await stripe().customers.retrieve(customerId);
          if (!('deleted' in cust) || !cust.deleted) {
            email = (cust as Stripe.Customer).email || null;
          }
        } catch {}
      }

      if (email && sub.trial_end) {
        const item = sub.items?.data?.[0];
        const amount = item?.price?.unit_amount;
        await EmailService.sendTrialEndingSoon(email, {
          trialEndDate: new Date(sub.trial_end * 1000),
          planName: 'Premium',
          amountEur: typeof amount === 'number' ? amount / 100 : undefined,
        });
      } else {
        console.warn('[webhook] trial_will_end: no email for customer', customerId);
      }
    } catch (e: any) {
      console.error('[webhook] trial_will_end email failed:', e?.message);
      // Don't fail the webhook — still continue to syncStripeData below
    }
  }

  // Dunning: payment failed → subscription goes past_due (grace period).
  // Tell the user to update their card. Stripe retries automatically.
  if (event.type === 'invoice.payment_failed') {
    try {
      const invoice = event.data.object as Stripe.Invoice;
      let email: string | null = invoice.customer_email || null;
      if (!email) {
        try {
          const db = supabaseAdmin();
          const { data } = await db
            .from('users')
            .select('email')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();
          email = (data?.email as string | undefined) || null;
        } catch {}
      }
      if (email) {
        const nextAttempt = (invoice as any).next_payment_attempt as number | null | undefined;
        await EmailService.sendPaymentFailed(email, {
          amountEur: typeof invoice.amount_due === 'number' ? invoice.amount_due / 100 : undefined,
          nextRetryDate: nextAttempt ? new Date(nextAttempt * 1000) : null,
        });
      } else {
        console.warn('[webhook] payment_failed: no email for customer', customerId);
      }
    } catch (e: any) {
      console.error('[webhook] payment_failed email failed:', e?.message);
      // Don't fail the webhook — still continue to syncStripeData below
    }
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
