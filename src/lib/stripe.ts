import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

export const SUBSCRIPTION_PLANS = {
  pro: {
    name: 'EconoPulse Pro',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO!,
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY!,
    price: 29,
    yearlyPrice: 290,
    features: [
      'Real-time market dashboard',
      'Basic portfolio insights',
      'Email support',
      'Mobile access'
    ]
  },
  premium: {
    name: 'EconoPulse Premium AI',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM!,
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_YEARLY!,
    price: 79,
    yearlyPrice: 790,
    features: [
      'Everything in Pro',
      'AI Portfolio Builder',
      'Advanced market analysis',
      'Priority support',
      'Custom alerts'
    ]
  },
  corporate: {
    name: 'EconoPulse Corporate',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_CORPORATE!,
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_CORPORATE_YEARLY!,
    price: 199,
    yearlyPrice: 1990,
    features: [
      'Everything in Premium',
      'Multi-user access',
      'API access',
      'Custom integrations',
      'Dedicated support'
    ]
  }
} as const
