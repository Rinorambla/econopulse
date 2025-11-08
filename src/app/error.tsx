'use client';

import Link from 'next/link';
import { ExclamationTriangleIcon, HomeIcon } from '@heroicons/react/24/outline';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  // Best-effort client log to help diagnose intermittent issues
  if (typeof window !== 'undefined') {
    try {
      console.error('Global Error Boundary:', { message: error?.message, digest: error?.digest, at: new Date().toISOString() });
      // Fire and forget send to diagnostics endpoint (production only)
      if (process.env.NODE_ENV === 'production') {
        fetch('/api/client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            scope: 'global-error-page',
            message: error?.message?.slice(0,400) || 'n/a',
            digest: error?.digest,
            url: window.location.href,
            ts: Date.now()
          })
        }).catch(()=>{});
      }
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-white">
                EconoPulse
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Error Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <ExclamationTriangleIcon className="mx-auto h-24 w-24 text-red-500 mb-4" />
            <h1 className="text-4xl font-bold text-white mb-2">Oops!</h1>
            <h2 className="text-xl font-semibold text-gray-300 mb-4">Something went wrong</h2>
            <p className="text-gray-400 mb-8">We encountered an unexpected error. Please try again or contact support if the problem persists.</p>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-left">
              <h3 className="text-red-400 font-semibold mb-2">Error Details (Development)</h3>
              <p className="text-red-300 text-sm font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-red-300 text-xs mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => {
                // Try a soft reset first
                try { reset(); } catch {}
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Try Again
            </button>
            
            <Link
              href="/"
              className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              <HomeIcon className="h-5 w-5 mr-2" />
              Back to Home
            </Link>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Need help?{' '}
              <a 
                href="mailto:support@econopulse.ai" 
                className="text-blue-400 hover:text-blue-300"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
