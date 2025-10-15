'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DocumentationPage() {
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
                <h1 className="text-2xl font-bold text-white">Documentation</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-lg border border-gray-700 p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-6">EconoPulse Documentation</h2>
              
              <div className="prose prose-invert max-w-none">
                <h3 className="text-xl font-semibold text-blue-400 mb-4">Getting Started</h3>
                <p className="text-gray-300 mb-6">
                  Welcome to EconoPulse, the advanced financial analysis platform powered by AI. 
                  This documentation will help you navigate and make the most of our tools.
                </p>

                <h3 className="text-xl font-semibold text-blue-400 mb-4">Platform Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">Dashboard</h4>
                    <p className="text-gray-300 text-sm">Real-time market data and analysis</p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">AI Portfolio</h4>
                    <p className="text-gray-300 text-sm">AI-powered portfolio generation</p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">Market DNA</h4>
                    <p className="text-gray-300 text-sm">Advanced market pattern analysis</p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">AI Pulse</h4>
                    <p className="text-gray-300 text-sm">Market sentiment and trends</p>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-blue-400 mb-4">API Reference</h3>
                <p className="text-gray-300 mb-4">
                  EconoPulse provides REST API endpoints for programmatic access to our data and analysis tools.
                </p>
                <div className="bg-slate-700/50 p-4 rounded-lg mb-6">
                  <code className="text-green-400">
                    GET /api/dashboard-data<br/>
                    GET /api/market-dna<br/>
                    GET /api/vix<br/>
                    POST /api/ai-portfolio
                  </code>
                </div>

                <h3 className="text-xl font-semibold text-blue-400 mb-4">Support</h3>
                <p className="text-gray-300">
                  Need help? Contact our support team at{' '}
                  <a href="mailto:support@econopulse.ai" className="text-blue-400 hover:text-blue-300">
                    support@econopulse.ai
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
