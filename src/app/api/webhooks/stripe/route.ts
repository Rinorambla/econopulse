import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const endpointSecret = process.env.WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription') {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          // Update user subscription status in Supabase
          const { error } = await supabase
            .from('users')
            .upsert({
              id: session.customer as string,
              email: session.customer_email!,
              subscription_status: getSubscriptionTier(subscription.items.data[0].price.id),
              subscription_id: subscription.id,
              updated_at: new Date().toISOString(),
            });

          if (error) {
            console.error('Error updating user subscription:', error);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const { error } = await supabase
          .from('users')
          .update({
            subscription_status: getSubscriptionTier(subscription.items.data[0].price.id),
            updated_at: new Date().toISOString(),
          })
          .eq('subscription_id', subscription.id);

        if (error) {
          console.error('Error updating subscription:', error);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const { error } = await supabase
          .from('users')
          .update({
            subscription_status: 'free',
            subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('subscription_id', subscription.id);

        if (error) {
          console.error('Error canceling subscription:', error);
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

function getSubscriptionTier(priceId: string): 'pro' | 'premium' | 'corporate' | 'free' {
  const proPrices = [
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY
  ];
  const premiumPrices = [
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_YEARLY
  ];
  const corporatePrices = [
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_CORPORATE,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_CORPORATE_YEARLY
  ];

  if (proPrices.includes(priceId)) return 'pro';
  if (premiumPrices.includes(priceId)) return 'premium';
  if (corporatePrices.includes(priceId)) return 'corporate';
  return 'free';
}
