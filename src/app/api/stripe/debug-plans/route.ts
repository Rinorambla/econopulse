import { NextResponse } from 'next/server';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🔍 Debug Plans API called');
    
    const secret = process.env.STRIPE_SECRET_KEY;
    console.log(`🔍 Stripe secret present: ${!!secret}`);
    
    const stripe = secret ? new Stripe(secret, { apiVersion: '2025-06-30.basil' }) : null;
    console.log(`🔍 Stripe client created: ${!!stripe}`);

    // Test each plan's price IDs
    const debugInfo = await Promise.all(
      Object.entries(SUBSCRIPTION_PLANS).map(async ([key, meta]) => {
        console.log(`\n🔍 Testing plan: ${key}`);
        console.log(`📋 Monthly priceId: ${meta.priceId}`);
        console.log(`📋 Yearly priceId: ${meta.yearlyPriceId}`);
        
        let monthlyPrice = null;
        let yearlyPrice = null;
        let monthlyError = null;
        let yearlyError = null;
        
        if (stripe && meta.priceId) {
          try {
            const price = await stripe.prices.retrieve(meta.priceId);
            monthlyPrice = {
              amount: price.unit_amount ? price.unit_amount / 100 : null,
              currency: price.currency,
              interval: price.recurring?.interval,
              active: price.active
            };
            console.log(`✅ Monthly price retrieved: ${JSON.stringify(monthlyPrice)}`);
          } catch (e: any) {
            monthlyError = e.message;
            console.log(`❌ Monthly price error: ${e.message}`);
          }
        }
        
        if (stripe && meta.yearlyPriceId) {
          try {
            const price = await stripe.prices.retrieve(meta.yearlyPriceId);
            yearlyPrice = {
              amount: price.unit_amount ? price.unit_amount / 100 : null,
              currency: price.currency,
              interval: price.recurring?.interval,
              active: price.active
            };
            console.log(`✅ Yearly price retrieved: ${JSON.stringify(yearlyPrice)}`);
          } catch (e: any) {
            yearlyError = e.message;
            console.log(`❌ Yearly price error: ${e.message}`);
          }
        }
        
        return {
          planId: key,
          planName: meta.name,
          fallbackMonthly: meta.price,
          fallbackYearly: meta.yearlyPrice,
          priceIds: {
            monthly: meta.priceId,
            yearly: meta.yearlyPriceId
          },
          stripeData: {
            monthly: monthlyPrice,
            yearly: yearlyPrice
          },
          errors: {
            monthly: monthlyError,
            yearly: yearlyError
          }
        };
      })
    );

    return NextResponse.json({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      stripeConfigured: !!stripe,
      debug: debugInfo 
    });
  } catch (e: any) {
    console.error('❌ Debug API error:', e);
    return NextResponse.json({ 
      ok: false, 
      error: e.message || 'failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}