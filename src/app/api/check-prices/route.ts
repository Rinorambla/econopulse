import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function GET() {
  try {
    const priceIds = [
      'price_1RjNIVHBOxZDD1iJ7nyJ1T41', // Pro monthly
      'price_1RjN7THBOxZDD1iJQ9UoiQvY', // Pro yearly
      'price_1RjNDXHBOxZDD1iJG9RV0EMm', // Premium monthly  
      'price_1RjNKuHBOxZDD1iJQ5hrI9fm', // Premium yearly
      'price_1RjNMfHBOxZDD1iJUoaOP2dJ', // Corporate monthly
      'price_1RjNFcHBOxZDD1iJGhA0xRGL', // Corporate yearly
    ];

    const priceInfo: Record<string, any> = {};

    for (const priceId of priceIds) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        priceInfo[priceId] = {
          amount: (price.unit_amount || 0) / 100,
          currency: price.currency.toUpperCase(),
          interval: price.recurring?.interval || 'one-time',
        };
      } catch (error) {
        priceInfo[priceId] = { error: 'Price not found' };
      }
    }

    return NextResponse.json(priceInfo);
  } catch (error) {
    console.error('Error checking prices:', error);
    return NextResponse.json({ error: 'Failed to check prices' }, { status: 500 });
  }
}
