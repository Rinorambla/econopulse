'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur-sm border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <NavigationLink href="/">
                  <ArrowLeftIcon className="h-6 w-6 text-gray-400 hover:text-white" />
                </NavigationLink>
                <h1 className="text-2xl font-bold text-white">About Us</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-lg border border-gray-700 p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-6">About EconoPulse</h2>
              
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 text-lg mb-6">
                  EconoPulse is a cutting-edge financial analysis platform that leverages artificial intelligence 
                  to provide real-time market insights, portfolio optimization, and advanced economic analysis.
                </p>

                <h3 className="text-xl font-semibold text-blue-400 mb-4">Our Mission</h3>
                <p className="text-gray-300 mb-6">
                  To democratize advanced financial analysis by making sophisticated AI-powered tools accessible 
                  to investors, analysts, and financial professionals worldwide.
                </p>

                <h3 className="text-xl font-semibold text-blue-400 mb-4">What We Do</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-700/50 p-6 rounded-lg">
                    <h4 className="font-semibold text-white mb-3">Real-Time Market Analysis</h4>
                    <p className="text-gray-300 text-sm">
                      Advanced algorithms analyze market data in real-time to provide actionable insights 
                      and identify emerging trends before they become obvious.
                    </p>
                  </div>
                  <div className="bg-slate-700/50 p-6 rounded-lg">
                    <h4 className="font-semibold text-white mb-3">AI-Powered Portfolio Optimization</h4>
                    <p className="text-gray-300 text-sm">
                      Our AI engine creates optimized portfolios based on your risk tolerance, 
                      investment goals, and current market conditions.
                    </p>
                  </div>
                  <div className="bg-slate-700/50 p-6 rounded-lg">
                    <h4 className="font-semibold text-white mb-3">Market DNA Technology</h4>
                    <p className="text-gray-300 text-sm">
                      Proprietary technology that identifies market patterns and correlations 
                      with historical events to predict potential market movements.
                    </p>
                  </div>
                  <div className="bg-slate-700/50 p-6 rounded-lg">
                    <h4 className="font-semibold text-white mb-3">Risk Management</h4>
                    <p className="text-gray-300 text-sm">
                      Comprehensive risk assessment tools including VIX monitoring, 
                      volatility analysis, and stress testing scenarios.
                    </p>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-blue-400 mb-4">Our Technology</h3>
                <p className="text-gray-300 mb-6">
                  Built on modern web technologies and powered by advanced machine learning algorithms, 
                  EconoPulse processes vast amounts of market data to deliver insights in real-time. 
                  Our platform integrates multiple data sources and uses proprietary AI models 
                  to provide accurate and timely financial analysis.
                </p>

                <h3 className="text-xl font-semibold text-blue-400 mb-4">Contact Us</h3>
                <div className="bg-slate-700/50 p-6 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-white mb-2">Email</h5>
                      <p className="text-gray-300">
                        <a href="mailto:info@econopulse.ai" className="text-blue-400 hover:text-blue-300">
                          info@econopulse.ai
                        </a>
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium text-white mb-2">Phone</h5>
                      <p className="text-gray-300">
                        <a href="tel:+3553519509674" className="text-blue-400 hover:text-blue-300">
                          +3553519509674
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
  );
}
