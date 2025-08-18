import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Creating checkout session...');
    
    const { priceId, successUrl, cancelUrl } = await request.json();
    console.log('📝 Request data:', { priceId, successUrl, cancelUrl });

    if (!priceId) {
      console.error('❌ Missing price ID');
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    // Verify Stripe key exists
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ Missing STRIPE_SECRET_KEY');
      return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${baseUrl}/en/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/en/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      // Remove customer_creation for subscription mode
    });

    console.log('✅ Checkout session created:', session.id);
    return NextResponse.json({ sessionId: session.id, url: session.url });
    
  } catch (error: any) {
    console.error('❌ Stripe checkout error:', error);
    console.error('Error message:', error.message);
    console.error('Error type:', error.type);
    
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error.message,
        type: error.type 
      },
      { status: 500 }
    );
  }
}
