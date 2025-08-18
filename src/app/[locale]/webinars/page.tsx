'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function WebinarsPage() {
  const webinars = [
    {
      title: "Market Analysis with AI: Getting Started",
      date: "February 15, 2025",
      time: "2:00 PM EST",
      duration: "45 minutes",
      speaker: "Dr. Sarah Johnson, Chief Data Scientist",
      status: "upcoming"
    },
    {
      title: "Portfolio Optimization Strategies",
      date: "February 8, 2025",
      time: "3:00 PM EST", 
      duration: "60 minutes",
      speaker: "Michael Chen, Portfolio Manager",
      status: "recorded"
    },
    {
      title: "Understanding Market DNA Technology",
      date: "January 25, 2025",
      time: "1:00 PM EST",
      duration: "30 minutes", 
      speaker: "Alex Rodriguez, Lead Engineer",
      status: "recorded"
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
                <h1 className="text-2xl font-bold text-white">Webinars</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-lg border border-gray-700 p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-6">Educational Webinars</h2>
              
              <div className="prose prose-invert max-w-none mb-8">
                <p className="text-gray-300 text-lg mb-6">
                  Join our expert-led webinars to master EconoPulse features and learn advanced financial analysis techniques.
                </p>
              </div>

              <div className="mb-8">
                <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-400 mb-3">🎯 Free for All Users</h3>
                  <p className="text-gray-300">
                    All webinars are free and open to EconoPulse users. Recordings are available for 30 days after each session.
                  </p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-blue-400 mb-6">Upcoming & Recorded Sessions</h3>
              
              <div className="space-y-6">
                {webinars.map((webinar, index) => (
                  <div key={index} className="bg-slate-700/50 p-6 rounded-lg border border-gray-600">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-white text-lg">{webinar.title}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            webinar.status === 'upcoming' 
                              ? 'bg-blue-900/50 text-blue-400' 
                              : 'bg-gray-700 text-gray-300'
                          }`}>
                            {webinar.status === 'upcoming' ? 'Upcoming' : 'Recorded'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400 mb-3">
                          <span className="flex items-center">
                            <span className="mr-2">📅</span>
                            {webinar.date}
                          </span>
                          <span className="flex items-center">
                            <span className="mr-2">⏰</span>
                            {webinar.time}
                          </span>
                          <span className="flex items-center">
                            <span className="mr-2">⏱️</span>
                            {webinar.duration}
                          </span>
                          <span className="flex items-center">
                            <span className="mr-2">🎤</span>
                            {webinar.speaker}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {webinar.status === 'upcoming' ? (
                        <>
                          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                            Register Now
                          </button>
                          <button className="border border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg transition-colors">
                            Add to Calendar
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                            Watch Recording
                          </button>
                          <button className="border border-green-600 text-green-400 hover:bg-green-600 hover:text-white px-4 py-2 rounded-lg transition-colors">
                            Download Slides
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-700/50 p-6 rounded-lg">
                  <h4 className="font-semibold text-white mb-3">📧 Get Notified</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    Subscribe to receive notifications about upcoming webinars
                  </p>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Subscribe to Updates
                  </button>
                </div>
                <div className="bg-slate-700/50 p-6 rounded-lg">
                  <h4 className="font-semibold text-white mb-3">💡 Suggest Topics</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    Have an idea for a webinar topic? Let us know!
                  </p>
                  <a 
                    href="mailto:webinars@econopulse.ai"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Send Suggestion →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
