'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Footer from '@/components/Footer';

export default function TermsOfService() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Terms of Service
          </h1>
          
          <p className="text-gray-600 mb-8">
            Last updated: January 1, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Acceptance of Terms
            </h2>
            <p className="text-gray-700 mb-4">
              By accessing and using EconoPulse ("the Service"), you accept and agree to be bound 
              by the terms and provision of this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Description of Service
            </h2>
            <p className="text-gray-700 mb-4">
              EconoPulse is a financial analysis platform that provides:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Real-time market data and analysis</li>
              <li>AI-powered portfolio generation tools</li>
              <li>Economic cycle analysis and insights</li>
              <li>Educational content and market intelligence</li>
            </ul>
            <p className="text-gray-700 mb-4">
              <strong>Important:</strong> EconoPulse is an analysis and educational platform. 
              We do not provide investment advice or execute trades.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Investment Risk Disclaimer
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-4">
              <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Important Risk Warning</h3>
              <ul className="list-disc pl-6 text-yellow-700 space-y-2">
                <li>All investments carry risk of loss</li>
                <li>Past performance does not predict future results</li>
                <li>You may lose some or all of your invested capital</li>
                <li>Market conditions can change rapidly</li>
                <li>Always conduct your own research before investing</li>
                <li>Consider seeking advice from qualified financial professionals</li>
              </ul>
            </div>
            <p className="text-gray-700 mb-4">
              EconoPulse provides analytical tools and educational content only. We are not 
              responsible for any investment decisions you make based on information from our platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              User Accounts and Subscriptions
            </h2>
            <p className="text-gray-700 mb-4">
              To access certain features, you must create an account and may need to subscribe to a paid plan:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>You are responsible for maintaining account security</li>
              <li>Subscriptions are billed according to your chosen plan</li>
              <li>You can cancel your subscription at any time</li>
              <li>Refunds are provided according to our refund policy</li>
              <li>We reserve the right to suspend accounts that violate our terms</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Acceptable Use Policy
            </h2>
            <p className="text-gray-700 mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Use the service for any illegal purposes</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Share your account credentials with others</li>
              <li>Reverse engineer or copy our proprietary algorithms</li>
              <li>Use automated systems to scrape our data</li>
              <li>Distribute malware or harmful content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Intellectual Property
            </h2>
            <p className="text-gray-700 mb-4">
              All content, features, and functionality of EconoPulse are owned by us and protected 
              by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Data and Privacy
            </h2>
            <p className="text-gray-700 mb-4">
              Your privacy is important to us. Please review our Privacy Policy to understand 
              how we collect, use, and protect your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Limitation of Liability
            </h2>
            <p className="text-gray-700 mb-4">
              To the maximum extent permitted by law, EconoPulse shall not be liable for any 
              indirect, incidental, special, consequential, or punitive damages, including but 
              not limited to investment losses.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Service Availability
            </h2>
            <p className="text-gray-700 mb-4">
              We strive to maintain high availability but cannot guarantee uninterrupted service. 
              We may perform maintenance, updates, or experience technical issues that temporarily 
              affect service availability.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Changes to Terms
            </h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify these terms at any time. Changes will be effective 
              immediately upon posting. Continued use of the service constitutes acceptance of 
              modified terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Contact Information
            </h2>
            <p className="text-gray-700 mb-4">
              For questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                Email: legal@econopulse.com<br />
                Address: EconoPulse Legal Department<br />
                [Your Company Address]
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
