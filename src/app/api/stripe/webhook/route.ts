// API Route: /api/stripe/webhook
// Handles Stripe webhook events for subscription management

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import StripeSubscriptionManager, { stripe } from '@/lib/stripe-enhanced';
import Stripe from 'stripe';

// Disable body parser for webhooks
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !endpointSecret) {
    console.error('Missing stripe signature or webhook secret');
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    // Verify webhook signature
    const event = await StripeSubscriptionManager.handleWebhook({
      body,
      signature,
      endpointSecret,
    });

    console.log(`Processing webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('Checkout session completed:', session.id);

    if (session.mode === 'subscription' && session.subscription) {
      // Get subscription details via manager (handles null stripe internally)
      const { subscription } = await StripeSubscriptionManager.getSubscriptionDetails(
        session.subscription as string
      );

      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer?.id || '';
      const tier = subscription.metadata?.tier || 'starter';
      const billingCycle = subscription.metadata?.billingCycle || 'monthly';

      // Find user by customer ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('stripe_customer_id', customerId)
        .single();

      if (userError || !user) {
        console.error('User not found for customer:', customerId);
        return;
      }

      // Update user subscription status
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_tier: tier,
          billing_cycle: billingCycle,
          subscription_status: 'active',
          stripe_subscription_id: subscription.id,
          last_billing_date: new Date().toISOString(),
          next_billing_date: new Date((subscription as any).current_period_end * 1000).toISOString(),
          trial_end_date: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to update user subscription:', updateError);
      } else {
        console.log(`User ${user.email} subscription updated to ${tier}`);
      }
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    console.log('Subscription created:', subscription.id);

    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer?.id || '';
    const tier = subscription.metadata?.tier || 'starter';
    const billingCycle = subscription.metadata?.billingCycle || 'monthly';

    // Find user by customer ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('stripe_customer_id', customerId)
      .single();

    if (userError || !user) {
      console.error('User not found for customer:', customerId);
      return;
    }

    // Update user subscription
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        billing_cycle: billingCycle,
        subscription_status: subscription.status,
        stripe_subscription_id: subscription.id,
        trial_end_date: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000).toISOString() : null,
        next_billing_date: new Date((subscription as any).current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update user subscription:', updateError);
    } else {
      console.log(`Subscription created for user ${user.email}`);
    }
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log('Subscription updated:', subscription.id);

    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer?.id || '';
    const tier = subscription.metadata?.tier || 'starter';
    const billingCycle = subscription.metadata?.billingCycle || 'monthly';

    // Find user by subscription ID or customer ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .or(`stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${customerId}`)
      .single();

    if (userError || !user) {
      console.error('User not found for subscription:', subscription.id);
      return;
    }

    // Update user subscription status
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        billing_cycle: billingCycle,
        subscription_status: subscription.status,
        trial_end_date: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000).toISOString() : null,
        next_billing_date: new Date((subscription as any).current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update user subscription:', updateError);
    } else {
      console.log(`Subscription updated for user ${user.email}`);
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log('Subscription deleted:', subscription.id);

    // Find user by subscription ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (userError || !user) {
      console.error('User not found for subscription:', subscription.id);
      return;
    }

    // Revert user to free tier
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_tier: 'free',
        subscription_status: 'cancelled',
        stripe_subscription_id: null,
        trial_end_date: null,
        next_billing_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update user to free tier:', updateError);
    } else {
      console.log(`User ${user.email} reverted to free tier`);
    }
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log('Payment succeeded for invoice:', invoice.id);

    const subscriptionId = (invoice as any).subscription;

    if (subscriptionId) {
      // Get subscription details via manager (handles null stripe internally)
      const { subscription } = await StripeSubscriptionManager.getSubscriptionDetails(
        typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id
      );

      // Find user by subscription ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (userError || !user) {
        console.error('User not found for subscription:', subscription.id);
        return;
      }

      // Update billing information
      const { error: updateError } = await supabase
        .from('users')
        .update({
          last_billing_date: new Date().toISOString(),
          next_billing_date: new Date((subscription as any).current_period_end * 1000).toISOString(),
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to update billing info:', updateError);
      } else {
        console.log(`Payment processed for user ${user.email}`);
      }
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log('Payment failed for invoice:', invoice.id);

    const subscriptionId = (invoice as any).subscription;

    if (subscriptionId) {
      const subscriptionIdString = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
      
      // Find user by subscription ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('stripe_subscription_id', subscriptionIdString)
        .single();

      if (userError || !user) {
        console.error('User not found for subscription:', subscriptionIdString);
        return;
      }

      // Update subscription status to indicate payment issues
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to update payment status:', updateError);
      } else {
        console.log(`Payment failed for user ${user.email}`);
        // TODO: Send email notification about failed payment
      }
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  try {
    console.log('Trial will end for subscription:', subscription.id);

    // Find user by subscription ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (userError || !user) {
      console.error('User not found for subscription:', subscription.id);
      return;
    }

    console.log(`Trial ending soon for user ${user.email}`);
    // TODO: Send email notification about trial ending
    
  } catch (error) {
    console.error('Error handling trial will end:', error);
  }
}