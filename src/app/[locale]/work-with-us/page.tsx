import React from 'react';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Work with us | EconoPulse',
  description: 'Join EconoPulse: we are hiring Financial Analysts, Financial Promoters, and Python Developers in Modena, Italy.'
};

export default function WorkWithUsPage() {
  return (
    <div className="min-h-[70vh] bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Work with us
        </h1>
        <p className="mt-3 text-white/80 text-lg max-w-3xl">
          We are hiring for the following roles:
        </p>
        <ul className="mt-4 list-disc list-inside space-y-1 text-white/90">
          <li>Financial Analysts</li>
          <li>Financial Promoters</li>
          <li>Python Developers</li>
        </ul>
        <p className="mt-6 text-white/90">
          Location: Modena, Italy
        </p>
        <p className="mt-4 text-white/90">
          Send your CV and a short intro to{' '}
          <a href="mailto:info@econopulse.ai" className="underline hover:text-white">
            info@econopulse.ai
          </a>.
        </p>

        <div className="mt-10">
          <Link href="/help" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-colors font-semibold">
            Contact
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
