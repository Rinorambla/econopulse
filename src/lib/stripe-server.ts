/**
 * Server-side Stripe client. Single instance, lazy-initialized.
 *
 * NEVER throw at module load — that would crash the entire API route bundle
 * when an env var is missing and produce opaque "Failed to fetch" errors on
 * the client. We throw only when the client is actually used.
 */
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  _stripe = new Stripe(key, {
    apiVersion: '2025-06-30.basil',
    typescript: true,
    appInfo: { name: 'EconoPulse', version: '1.0.0' },
  });
  return _stripe;
}

export const STRIPE_PRICE_IDS = {
  monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID?.trim() || '',
  yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID?.trim() || '',
};

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
