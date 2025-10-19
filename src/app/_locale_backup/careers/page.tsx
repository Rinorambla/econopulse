'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function CareersPage() {
  const positions = [
    {
      title: 'Senior Frontend Developer',
      department: 'Engineering',
      location: 'Remote / New York',
      type: 'Full-time'
    },
    {
      title: 'AI/ML Engineer',
      department: 'Data Science',
      location: 'Remote / San Francisco',
      type: 'Full-time'
    },
    {
      title: 'Financial Data Analyst',
      department: 'Research',
      location: 'Remote / London',
      type: 'Full-time'
    },
    {
      title: 'Product Designer',
      department: 'Design',
      location: 'Remote',
      type: 'Full-time'
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
                <h1 className="text-2xl font-bold text-white">Careers</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-lg border border-gray-700 p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-6">Join Our Team</h2>
              
              <div className="prose prose-invert max-w-none mb-8">
                <p className="text-gray-300 text-lg mb-6">
                  Be part of the team that's revolutionizing financial analysis with AI. 
                  We're looking for passionate individuals who want to shape the future of finance.
                </p>

                <h3 className="text-xl font-semibold text-blue-400 mb-4">Why Work at EconoPulse?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">🚀 Innovation First</h4>
                    <p className="text-gray-300 text-sm">Work with cutting-edge AI and financial technology</p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">🌍 Remote Friendly</h4>
                    <p className="text-gray-300 text-sm">Flexible work arrangements with global team</p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">📈 Growth Opportunity</h4>
                    <p className="text-gray-300 text-sm">Continuous learning and career development</p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">💡 Impactful Work</h4>
                    <p className="text-gray-300 text-sm">Build tools that shape financial decisions globally</p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-blue-400 mb-6">Open Positions</h3>
              
              <div className="space-y-4 mb-8">
                {positions.map((position, index) => (
                  <div key={index} className="bg-slate-700/50 p-6 rounded-lg border border-gray-600 hover:border-blue-500 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-lg mb-2">{position.title}</h4>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                          <span className="flex items-center">
                            <span className="mr-1">🏢</span>
                            {position.department}
                          </span>
                          <span className="flex items-center">
                            <span className="mr-1">📍</span>
                            {position.location}
                          </span>
                          <span className="flex items-center">
                            <span className="mr-1">⏰</span>
                            {position.type}
                          </span>
                        </div>
                      </div>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                        Apply Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-700/30 p-6 rounded-lg">
                <h4 className="font-semibold text-white mb-4">Don't see a perfect fit?</h4>
                <p className="text-gray-300 mb-4">
                  We're always looking for exceptional talent. Send us your resume and let us know how you'd like to contribute.
                </p>
                <a 
                  href="mailto:careers@econopulse.ai"
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  careers@econopulse.ai
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
