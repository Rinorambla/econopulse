'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function SystemStatusPage() {
  const services = [
    { name: 'Dashboard API', status: 'operational', uptime: '99.9%' },
    { name: 'Market Data Feed', status: 'operational', uptime: '99.8%' },
    { name: 'AI Portfolio Engine', status: 'operational', uptime: '99.7%' },
    { name: 'VIX Data Provider', status: 'operational', uptime: '99.5%' },
    { name: 'User Authentication', status: 'operational', uptime: '99.9%' },
    { name: 'Database', status: 'operational', uptime: '99.8%' }
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
                <h1 className="text-2xl font-bold text-white">System Status</h1>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-400 font-medium">All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-lg border border-gray-700 p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-6">EconoPulse System Status</h2>
              
              <div className="mb-8">
                <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <h3 className="font-semibold text-green-400">All Systems Operational</h3>
                      <p className="text-green-300 text-sm">All services are running normally</p>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-blue-400 mb-6">Service Status</h3>
              
              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.name} className="bg-slate-700/50 p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <div>
                        <h4 className="font-medium text-white">{service.name}</h4>
                        <p className="text-gray-400 text-sm capitalize">{service.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-medium">{service.uptime}</div>
                      <div className="text-gray-400 text-sm">30-day uptime</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">99.8%</div>
                  <div className="text-gray-400 text-sm">Overall Uptime</div>
                </div>
                <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-400">45ms</div>
                  <div className="text-gray-400 text-sm">Avg Response Time</div>
                </div>
                <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-400">0</div>
                  <div className="text-gray-400 text-sm">Active Incidents</div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-slate-700/30 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Last Updated</h4>
                <p className="text-gray-400">{new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
