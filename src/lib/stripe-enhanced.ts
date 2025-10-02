// Enhanced Stripe Integration for EconoPulse Subscription System
// Handles 4-tier subscription with usage-based billing and automatic trial management

import Stripe from 'stripe';
import { env } from './env';

if (!env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
  typescript: true,
});

// Product IDs in Stripe - Set these up in your Stripe Dashboard
export const STRIPE_PRODUCTS = {
  premium: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID?.trim() || 'price_premium_monthly',
    yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID?.trim() || 'price_premium_yearly',
  },
} as const;

export type SubscriptionTier = 'premium';
export type BillingCycle = 'monthly' | 'yearly';

// Enhanced Customer Management
export class StripeSubscriptionManager {
  
  /**
   * Create or retrieve Stripe customer
   */
  static async createOrGetCustomer(params: {
    userId: string;
    email: string;
    name?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    const { userId, email, name, metadata = {} } = params;
    
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });
    
    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0];
      
      // Update metadata if needed
      if (!customer.metadata?.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId, ...metadata },
        });
      }
      
      return customer;
    }
    
    // Create new customer
    return await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
        createdAt: new Date().toISOString(),
        ...metadata,
      },
    });
  }
  
  /**
   * Create subscription with trial handling
   */
  static async createSubscription(params: {
    customerId: string;
    tier: SubscriptionTier;
    billingCycle: BillingCycle;
    trialDays?: number;
    automaticTax?: boolean;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    const { customerId, tier, billingCycle, trialDays = 14, automaticTax = true, metadata = {} } = params;
    
    const priceId = STRIPE_PRODUCTS[tier][billingCycle];
    
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        tier,
        billingCycle,
        ...metadata,
      },
      expand: ['latest_invoice.payment_intent'],
    };
    
    // Add trial period if specified
    if (trialDays > 0) {
      subscriptionParams.trial_period_days = trialDays;
      subscriptionParams.trial_settings = {
        end_behavior: {
          missing_payment_method: 'cancel',
        },
      };
    }
    
    // Add automatic tax calculation
    if (automaticTax) {
      subscriptionParams.automatic_tax = { enabled: true };
    }
    
    return await stripe.subscriptions.create(subscriptionParams);
  }
  
  /**
   * Update subscription tier (upgrade/downgrade)
   */
  static async updateSubscription(params: {
    subscriptionId: string;
    newTier: SubscriptionTier;
    newBillingCycle?: BillingCycle;
    prorate?: boolean;
  }): Promise<Stripe.Subscription> {
    const { subscriptionId, newTier, newBillingCycle, prorate = true } = params;
    
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentBillingCycle = newBillingCycle || 
      (subscription.metadata?.billingCycle as BillingCycle) || 'monthly';
    
    const newPriceId = STRIPE_PRODUCTS[newTier][currentBillingCycle];
    
    return await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      metadata: {
        ...subscription.metadata,
        tier: newTier,
        billingCycle: currentBillingCycle,
        lastUpdated: new Date().toISOString(),
      },
      proration_behavior: prorate ? 'create_prorations' : 'none',
    });
  }
  
  /**
   * Cancel subscription with immediate or end-of-period timing
   */
  static async cancelSubscription(params: {
    subscriptionId: string;
    immediately?: boolean;
    reason?: string;
  }): Promise<Stripe.Subscription> {
    const { subscriptionId, immediately = false, reason } = params;
    
    if (immediately) {
      return await stripe.subscriptions.cancel(subscriptionId, {
        cancellation_details: reason ? { comment: reason } : undefined,
      });
    } else {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        cancellation_details: reason ? { comment: reason } : undefined,
      });
    }
  }
  
  /**
   * Create Stripe Checkout Session for subscription
   */
  static async createCheckoutSession(params: {
    customerId: string;
    tier: SubscriptionTier;
    billingCycle: BillingCycle;
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
    allowPromotionCodes?: boolean;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    const { 
      customerId, 
      tier, 
      billingCycle, 
      successUrl, 
      cancelUrl, 
      trialDays = 14,
      allowPromotionCodes = true,
      metadata = {} 
    } = params;
    
    const priceId = STRIPE_PRODUCTS[tier][billingCycle];
    
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      locale: 'en', // Force English locale
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: allowPromotionCodes,
      metadata: {
        tier,
        billingCycle,
        ...metadata,
      },
      subscription_data: {
        metadata: {
          tier,
          billingCycle,
          ...metadata,
        },
      },
      // Disable automatic tax for now to avoid customer address requirement
      // automatic_tax: { enabled: true },
    };
    
    // Add trial period
    if (trialDays > 0) {
      sessionParams.subscription_data!.trial_period_days = trialDays;
      sessionParams.subscription_data!.trial_settings = {
        end_behavior: {
          missing_payment_method: 'cancel',
        },
      };
    }
    
    return await stripe.checkout.sessions.create(sessionParams);
  }
  
  /**
   * Create Customer Portal session for subscription management
   */
  static async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    const { customerId, returnUrl } = params;
    
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }
  
  /**
   * Get subscription details
   */
  static async getSubscriptionDetails(subscriptionId: string): Promise<{
    subscription: Stripe.Subscription;
    upcomingInvoice: Stripe.Invoice | null;
  }> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['customer', 'latest_invoice', 'latest_invoice.payment_intent'],
    });
    
    let upcomingInvoice: Stripe.Invoice | null = null;
    // Note: retrieveUpcoming may not be available in this Stripe version
    
    return {
      subscription,
      upcomingInvoice,
    };
  }
  
  /**
   * Get customer payment methods
   */
  static async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    
    return paymentMethods.data;
  }
  
  /**
   * Process webhook events
   */
  static async handleWebhook(params: {
    body: string;
    signature: string;
    endpointSecret: string;
  }): Promise<Stripe.Event> {
    const { body, signature, endpointSecret } = params;
    
    return stripe.webhooks.constructEvent(body, signature, endpointSecret);
  }
  
  /**
   * Get revenue analytics from Stripe
   */
  static async getRevenueAnalytics(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    totalRevenue: number;
    subscriptionRevenue: number;
    refunds: number;
    disputes: number;
    netRevenue: number;
  }> {
    const { startDate, endDate } = params;
    
    // Get charges in date range
    const charges = await stripe.charges.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      limit: 100,
    });
    
    // Calculate metrics
    const totalRevenue = charges.data.reduce((sum, charge) => 
      sum + (charge.amount_captured || 0), 0) / 100;
    
    const refunds = charges.data.reduce((sum, charge) => 
      sum + charge.amount_refunded, 0) / 100;
    
    const disputes = charges.data.reduce((sum, charge) => 
      sum + (charge.disputed ? charge.amount : 0), 0) / 100;
    
    return {
      totalRevenue,
      subscriptionRevenue: totalRevenue, // Most charges should be subscription-related
      refunds,
      disputes,
      netRevenue: totalRevenue - refunds - disputes,
    };
  }
}

// Utility functions for price calculations
export function calculateAnnualDiscount(tier: SubscriptionTier): number {
  const monthlyPrices = {
    premium: 29.99,
  };
  
  const yearlyPrices = {
    premium: 299.99, // 10 months price = 2 months free
  };
  
  const monthlyTotal = monthlyPrices[tier] * 12;
  const yearlyPrice = yearlyPrices[tier];
  
  return Math.round(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
}

export function getSubscriptionPrice(tier: SubscriptionTier, cycle: BillingCycle): number {
  const prices = {
    premium: { monthly: 29.99, yearly: 299.99 },
  };
  
  return prices[tier][cycle];
}

export function formatPrice(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

// Export the main Stripe instance for direct access when needed
export { stripe };
export default StripeSubscriptionManager;