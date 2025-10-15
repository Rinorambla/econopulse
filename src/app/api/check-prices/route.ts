import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Lazy getter so build does not crash if key missing
let stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  stripe = new Stripe(key, { apiVersion: '2025-06-30.basil' });
  return stripe;
}

const PRICE_IDS = [
  'price_1RjNIVHBOxZDD1iJ7nyJ1T41', // Pro monthly
  'price_1RjN7THBOxZDD1iJQ9UoiQvY', // Pro yearly
  'price_1RjNDXHBOxZDD1iJG9RV0EMm', // Premium monthly  
  'price_1RjNKuHBOxZDD1iJQ5hrI9fm', // Premium yearly
  'price_1RjNMfHBOxZDD1iJUoaOP2dJ', // Corporate monthly
  'price_1RjNFcHBOxZDD1iJGhA0xRGL', // Corporate yearly
];

// Simple TS interface instead of any
interface PriceInfo {
  amount?: number;
  currency?: string;
  interval?: string;
  error?: string;
  demo?: boolean;
}

export async function GET() {
  const client = getStripe();
  // Fallback demo prices if no Stripe key configured
  if (!client) {
    const demo: Record<string, PriceInfo> = {};
    PRICE_IDS.forEach((id, i) => {
      demo[id] = {
        amount: [29, 290, 79, 790, 199, 1990][i] || 0,
        currency: 'USD',
        interval: /year/i.test(id) ? 'year' : 'month',
        demo: true,
      };
    });
    return NextResponse.json({ demo: true, prices: demo }, { status: 200 });
  }

  try {
    const priceInfo: Record<string, PriceInfo> = {};
    for (const priceId of PRICE_IDS) {
      try {
        const price = await client.prices.retrieve(priceId);
        priceInfo[priceId] = {
          amount: (price.unit_amount || 0) / 100,
          currency: price.currency?.toUpperCase(),
          interval: price.recurring?.interval || 'one-time',
        };
      } catch (err) {
        priceInfo[priceId] = { error: 'Price not found' };
      }
    }
    return NextResponse.json(priceInfo);
  } catch (err) {
    console.error('Error checking prices:', err);
    return NextResponse.json({ error: 'Failed to check prices' }, { status: 500 });
  }
}
