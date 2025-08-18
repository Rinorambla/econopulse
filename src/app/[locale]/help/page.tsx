'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function HelpPage() {
  const faqItems = [
    {
      question: "How do I get started with EconoPulse?",
      answer: "Simply sign up for an account and choose your subscription plan. You'll have immediate access to our dashboard, AI portfolio tools, and market analysis features."
    },
    {
      question: "What data sources does EconoPulse use?",
      answer: "We integrate data from multiple premium sources including Tiingo, Yahoo Finance, and other financial data providers to ensure comprehensive market coverage."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we use industry-standard encryption and security protocols. Your personal and financial data is protected with bank-level security measures."
    },
    {
      question: "Can I export my portfolio data?",
      answer: "Yes, all portfolio data and analysis reports can be exported in various formats including CSV, PDF, and JSON."
    },
    {
      question: "How accurate are the AI predictions?",
      answer: "Our AI models are trained on historical data and provide probabilistic forecasts. While highly sophisticated, all investments carry risk and past performance doesn't guarantee future results."
    }
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur-sm border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <NavigationLink href="/">
                  <ArrowLeftIcon className="h-6 w-6 text-gray-400 hover:text-white" />
                </NavigationLink>
                <h1 className="text-2xl font-bold text-white">Help Center</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-lg border border-gray-700 p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-6">Help Center</h2>
              
              <div className="mb-8">
                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-400 mb-3">Need immediate assistance?</h3>
                  <p className="text-gray-300 mb-4">
                    Our support team is here to help. Contact us for personalized assistance.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <a 
                      href="mailto:support@econopulse.ai"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Email Support
                    </a>
                    <a 
                      href="/contact"
                      className="border border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Contact Form
                    </a>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-blue-400 mb-6">Frequently Asked Questions</h3>
              
              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <div key={index} className="bg-slate-700/50 rounded-lg border border-gray-600">
                    <button className="w-full text-left p-4 focus:outline-none">
                      <h4 className="font-semibold text-white mb-2">{item.question}</h4>
                      <p className="text-gray-300 text-sm">{item.answer}</p>
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-700/50 p-6 rounded-lg">
                  <h4 className="font-semibold text-white mb-3">📚 Documentation</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    Comprehensive guides and API documentation
                  </p>
                  <a href="/docs" className="text-blue-400 hover:text-blue-300">
                    View Documentation →
                  </a>
                </div>
                <div className="bg-slate-700/50 p-6 rounded-lg">
                  <h4 className="font-semibold text-white mb-3">🎓 Tutorials</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    Step-by-step tutorials and video guides
                  </p>
                  <a href="/webinars" className="text-blue-400 hover:text-blue-300">
                    Watch Tutorials →
                  </a>
                </div>
              </div>

              <div className="mt-8 p-6 bg-slate-700/30 rounded-lg">
                <h4 className="font-semibold text-white mb-3">System Status</h4>
                <p className="text-gray-300 text-sm mb-3">
                  Check the current status of all EconoPulse services
                </p>
                <a href="/status" className="text-blue-400 hover:text-blue-300">
                  View System Status →
                </a>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
