import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { normalizePlan } from '@/lib/plan-access';

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
          const customerId = subscription.customer as string;
          const priceId = subscription.items.data[0].price.id;
          const tier = mapPriceToTier(priceId);
          const metaUser = (subscription.metadata as any)?.supabase_user_id || (session.metadata as any)?.supabase_user_id || null;
          // Try to locate user row by stripe_customer_id OR by id from metadata
          let targetUserId: string | null = null;
          if (metaUser) targetUserId = metaUser;
          if (!targetUserId) {
            const { data: byCustomer } = await supabase
              .from('users')
              .select('id')
              .eq('stripe_customer_id', customerId)
              .maybeSingle();
            targetUserId = byCustomer?.id || null;
          }
          if (targetUserId) {
            const { error } = await supabase.from('users').upsert({
              id: targetUserId,
              stripe_customer_id: customerId,
              email: session.customer_email || undefined,
              subscription_status: tier,
              subscription_id: subscription.id,
              updated_at: new Date().toISOString(),
            });
            if (error) console.error('Webhook upsert error (checkout.completed):', error);
          } else {
            console.warn('No matching user row for checkout.session.completed', { customerId, metaUser });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0].price.id;
        const tier = mapPriceToTier(priceId);
        const customerId = subscription.customer as string;
        const metaUser = (subscription.metadata as any)?.supabase_user_id || null;
        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .or(`id.eq.${metaUser || '___'},stripe_customer_id.eq.${customerId}`)
          .limit(1)
          .maybeSingle();
        if (userRow?.id) {
          const { error } = await supabase.from('users').update({
            subscription_status: tier,
            updated_at: new Date().toISOString(),
          }).eq('id', userRow.id);
          if (error) console.error('Error updating subscription (updated):', error);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();
        if (userRow?.id) {
          const { error } = await supabase.from('users').update({
            subscription_status: 'free',
            subscription_id: null,
            updated_at: new Date().toISOString(),
          }).eq('id', userRow.id);
          if (error) console.error('Error canceling subscription (deleted):', error);
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

function mapPriceToTier(priceId: string): 'pro' | 'premium' | 'corporate' | 'free' {
  for (const [tier, meta] of Object.entries(SUBSCRIPTION_PLANS)) {
    if ((meta as any).priceId === priceId || (meta as any).yearlyPriceId === priceId) {
      return normalizePlan(tier) as any;
    }
  }
  return 'free';
}
