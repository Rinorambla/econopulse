import { NextResponse } from 'next/server';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    const stripe = secret ? new Stripe(secret, { apiVersion: '2025-06-30.basil' }) : null;

    async function resolvePriceAmount(priceId?: string | null, planName?: string) {
      if (!priceId) {
        console.log(`[${planName}] No priceId provided`);
        return { amount: null, currency: null };
      }
      if (!stripe) {
        console.log(`[${planName}] No Stripe client - using fallback`);
        return { amount: null, currency: null };
      }
      try {
        const price = await stripe.prices.retrieve(priceId);
        const amount = (price.unit_amount ?? null);
        const finalAmount = amount !== null ? +(amount / 100).toFixed(2) : null;
        console.log(`[${planName}] Stripe price ${priceId}: unit_amount=${amount} cents, final=${finalAmount} ${price.currency}, interval=${price.recurring?.interval}`);
        return {
          amount: finalAmount,
          currency: price.currency || null
        };
      } catch (e) {
        console.warn(`[${planName}] Cannot retrieve price ${priceId}:`, e);
        return { amount: null, currency: null };
      }
    }

    const plansEntries = await Promise.all(
      Object.entries(SUBSCRIPTION_PLANS).map(async ([key, meta]) => {
        const monthlyInfo = await resolvePriceAmount(meta.priceId, `${key}-monthly`);
        const yearlyInfo = await resolvePriceAmount(meta.yearlyPriceId, `${key}-yearly`);
        const finalMonthly = monthlyInfo.amount !== null ? monthlyInfo.amount : meta.price;
        const finalYearly = yearlyInfo.amount !== null ? yearlyInfo.amount : meta.yearlyPrice;
        console.log(`[${key}] Final prices: monthly=${finalMonthly} (${monthlyInfo.amount !== null ? 'live' : 'fallback'}), yearly=${finalYearly} (${yearlyInfo.amount !== null ? 'live' : 'fallback'})`);
        return [
          key,
          {
            name: meta.name,
            monthly: meta.priceId || null, // priceId
            yearly: meta.yearlyPriceId || null, // yearly priceId
            price: finalMonthly, // fallback to static if API not available
            yearlyPrice: finalYearly,
            currency: monthlyInfo.currency || yearlyInfo.currency || 'usd',
            features: meta.features
          }
        ];
      })
    );

    const plans = Object.fromEntries(plansEntries);
    return NextResponse.json({ ok: true, plans });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message || 'failed' }, { status: 500 });
  }
}