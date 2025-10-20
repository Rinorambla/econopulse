import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/Navigation';
import { AuthProvider } from '@/hooks/useAuth';
import CookieConsent from '@/components/CookieConsent';

export const metadata: Metadata = {
  metadataBase: new URL('https://econopulse.ai'),
  title: 'EconoPulse - Advanced Financial Analysis Platform',
  description:
    'Discover the power of AI-driven financial insights with real-time market analysis, dynamic portfolio generation, and comprehensive economic intelligence.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EconoPulse',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'EconoPulse',
    title: 'EconoPulse - AI Economic Analysis',
    description: 'Professional AI-powered economic analysis and market insights platform',
  },
  icons: {
    icon: [{ url: '/icon.svg' }],
    shortcut: '/icons/icon-192x192.png',
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <AuthProvider>
          <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur border-b border-white/10">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2">
              <Navigation />
            </div>
          </header>
          <main>{children}</main>
          {/* Site-wide cookie consent banner */}
          <CookieConsent />
        </AuthProvider>
      </body>
    </html>
  );
}
