import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

/**
 * IMPORTANT:
 * - price / yearlyPrice are ONLY fallback display values (e.g. during local dev without Stripe API). Real values are fetched live
 *   in /api/stripe/plans using the priceId & yearlyPriceId.
 * - Do NOT prepend currency symbols here; formatting handled in UI.
 * - The product has a single paid tier: Premium. ('pro'/'corporate' were removed — they never matched the free/premium data model.)
 */
export const SUBSCRIPTION_PLANS = {
  premium: {
    name: 'EconoPulse Premium AI',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM || '',
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_YEARLY || '',
    price: 79, // fallback only
    yearlyPrice: 790, // fallback only
    features: [
      'Real-time market dashboard',
      'AI Portfolio Builder',
      'Advanced market analysis',
      'Priority support',
      'Custom alerts'
    ]
  }
} as const;
