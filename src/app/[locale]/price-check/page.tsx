'use client';

import { useEffect, useState } from 'react';
import RequirePlan from '@/components/RequirePlan';

interface PriceData {
  amount: number;
  currency: string;
  interval: string;
}

export default function PriceCheckPage() {
  const [stripePrices, setStripePrices] = useState<Record<string, PriceData | { error: string }>>({});
  const [loading, setLoading] = useState(true);

  const websitePrices = {
    'price_1RjNIVHBOxZDD1iJ7nyJ1T41': { name: 'Pro Yearly', website: '€99.99' },
    'price_1RjN7THBOxZDD1iJQ9UoiQvY': { name: 'Pro Monthly', website: '€9.99' },
    'price_1RjNDXHBOxZDD1iJG9RV0EMm': { name: 'Premium Monthly', website: '€29.99' },
    'price_1RjNKuHBOxZDD1iJQ5hrI9fm': { name: 'Premium Yearly', website: '€299.99' },
    'price_1RjNMfHBOxZDD1iJUoaOP2dJ': { name: 'Corporate Yearly', website: '€999.99' },
    'price_1RjNFcHBOxZDD1iJGhA0xRGL': { name: 'Corporate Monthly', website: '€99.99' },
  };

  useEffect(() => {
    fetch('/api/check-prices')
      .then(res => res.json())
      .then(data => {
        setStripePrices(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching prices:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8">Loading prices...</div>;
  }

  return (
    <RequirePlan min="premium">
  <div className="min-h-screen bg-[var(--background)] text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Price Comparison: Website vs Stripe</h1>
      
      <div className="grid gap-6">
        {Object.entries(websitePrices).map(([priceId, info]) => {
          const stripeData = stripePrices[priceId];
          const isError = stripeData && 'error' in stripeData;
          const priceData = stripeData && !isError ? stripeData as PriceData : null;
          
          const websiteAmount = parseInt(info.website.replace('€', ''));
          const stripeAmount = priceData?.amount || 0;
          const match = websiteAmount === stripeAmount;
          
          return (
            <div key={priceId} className="bg-slate-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">{info.name}</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-400">Website Price</p>
                  <p className="text-2xl font-bold">{info.website}</p>
                </div>
                
                <div>
                  <p className="text-gray-400">Stripe Price</p>
                  {isError ? (
                    <p className="text-red-400">Error loading</p>
                  ) : priceData ? (
                    <p className="text-2xl font-bold">
                      {priceData.currency} {priceData.amount}
                    </p>
                  ) : (
                    <p className="text-gray-500">No data</p>
                  )}
                </div>
                
                <div>
                  <p className="text-gray-400">Match</p>
                  <p className={`text-2xl font-bold ${match ? 'text-green-400' : 'text-red-400'}`}>
                    {match ? '✅ YES' : '❌ NO'}
                  </p>
                </div>
              </div>
              
              {priceData && (
                <div className="mt-4 text-sm text-gray-400">
                  <p>Stripe ID: {priceId}</p>
                  <p>Interval: {priceData.interval}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-8">
        <a href="/en/pricing" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          Back to Pricing
        </a>
      </div>
    </div>
    </RequirePlan>
  );
}
