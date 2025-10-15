'use client';

import React, { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { redirect } from '@/i18n/routing';
import Footer from '@/components/Footer';
import { Link } from '@/i18n/routing';

export default function HelpPage() {
  const locale = useLocale();
  if (locale !== 'en') {
    redirect({ href: '/help', locale: 'en' });
  }

  const t = useTranslations();
  const email = 'support@econopulse.ai';

  const [query, setQuery] = useState('');
  const faqs = useMemo(
    () => [
      {
        q: 'How do I get started? ',
        a: 'Create an account and choose a plan. You can access the dashboard and start exploring features immediately.'
      },
      {
        q: 'What is the difference between Pro and Premium?',
        a: 'Pro includes the real-time dashboard and core features. Premium adds AI Portfolio Builder and advanced market analysis.'
      },
      {
        q: 'Do I need a credit card for the trial?',
        a: 'Depending on the promotion, some trials may require a payment method. You can cancel anytime before renewal.'
      },
      {
        q: 'How does the AI Portfolio Builder work?',
        a: 'It analyzes market conditions and your preferences (risk, horizon, goals) to generate a suggested allocation.'
      },
      {
        q: 'Where does the market data come from?',
        a: 'We aggregate data from multiple sources including Yahoo Finance and other providers with short timeouts and batching.'
      },
      {
        q: 'Can I cancel my subscription?',
        a: 'Yes. You can manage or cancel your subscription from your account settings; access continues until the end of the billing period.'
      },
      {
        q: 'Is this financial advice?',
        a: 'No. The platform provides analytical tools and educational information. It is not financial advice.'
      },
      {
        q: 'How do I change my plan?',
        a: 'Visit the pricing page or your account settings to upgrade or downgrade your plan.'
      },
      {
        q: 'Why is a page protected?',
        a: 'Some sections require a specific plan. You may need to sign in or upgrade to access premium features.'
      }
    ],
    []
  );

  const filteredFaqs = useMemo(() => {
    const ql = query.trim().toLowerCase();
    if (!ql) return faqs;
    return faqs.filter(({ q, a }) => q.toLowerCase().includes(ql) || a.toLowerCase().includes(ql));
  }, [faqs, query]);

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back to home */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700">
            <span className="mr-2">←</span>
            <span>Home</span>
          </Link>
        </div>
        <div className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Help</h1>
          <p className="text-gray-700 mb-6">Search common questions and answers about the platform.</p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help topics..."
            className="w-full max-w-2xl px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-white"
            aria-label="Search help topics"
            autoFocus
          />
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFaqs.length === 0 && (
            <div className="text-gray-600">No results. Try a different keyword.</div>
          )}
          {filteredFaqs.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.q}</h3>
              <p className="text-gray-700">{item.a}</p>
            </div>
          ))}
        </div>

        {/* Contact at bottom (email only) */}
        <div className="prose prose-lg max-w-none mt-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Still need help?</h2>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm uppercase tracking-wide text-gray-600">Email</p>
            <a href={`mailto:${email}`} className="text-blue-600 hover:text-blue-700 break-all">
              {email}
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
