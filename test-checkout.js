// Test script per verificare il checkout Stripe
const testCheckout = async () => {
  const response = await fetch('https://www.econopulse.ai/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tier: 'premium',
      billingCycle: 'monthly',
      successUrl: 'https://www.econopulse.ai/dashboard?checkout=success',
      cancelUrl: 'https://www.econopulse.ai/pricing?checkout=cancelled',
    }),
  });

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
};

testCheckout().catch(console.error);