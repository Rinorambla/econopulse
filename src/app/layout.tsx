import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/Navigation';
import { AuthProvider } from '@/hooks/useAuth';
import CookieConsent from '@/components/CookieConsent';
import SafeBoundary from '@/components/SafeBoundary';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export const metadata: Metadata = {
  metadataBase: new URL('https://econopulse.ai'),
  title: 'EconoPulse - Advanced Financial Analysis Platform',
  description:
    'Discover the power of AI-driven financial insights with real-time market analysis, dynamic portfolio generation, and comprehensive economic intelligence.',
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://econopulse.ai/',
  },
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
    images: [
      { url: '/icons/icon-512x512.png', width: 512, height: 512, alt: 'EconoPulse' },
    ],
  },
  icons: {
    // Explicit favicon for Google SERP favicon discovery
    icon: [
      { url: '/favicon.ico', rel: 'icon', sizes: 'any' },
      { url: '/icons/icon-192x192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icons/icon-192x192.png',
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

// Force dynamic rendering globally to bypass static export evaluating client hooks on pages like /about
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Load i18n messages for default locale (en) – non-locale routes use 'as-needed' prefix policy.
  // Prevent runtime crash if navigation helpers expect context.
  let messages: any = {};
  try { messages = await getMessages(); } catch { messages = {}; }
  // Minimal server-side boot diagnostics to help identify production-only crashes
  // Logged once per render in server logs; safe to keep in production.
  try {
    if (typeof window === 'undefined') {
      // Avoid leaking secrets: only log presence flags
      const boot = {
        env: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
        vercelUrl: process.env.VERCEL_URL || undefined,
        supabaseEnabled: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        openaiEnabled: !!process.env.OPENAI_API_KEY,
        stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
      };
      // eslint-disable-next-line no-console
      console.log('[Boot] RootLayout', boot);
    }
  } catch {}
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {/* Organization JSON-LD to help Google associate the correct logo */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'EconoPulse',
              url: 'https://econopulse.ai',
              logo: 'https://econopulse.ai/icons/icon-512x512.png',
              sameAs: [],
            }),
          }}
        />
        {/* Top-level safety net to prevent full-app crash and show a minimal fallback instead of global error page */}
        <NextIntlClientProvider messages={messages} locale="en">
          <SafeBoundary fallback={<div className="min-h-screen flex items-center justify-center text-white/70 text-sm">Temporary issue loading the application. Please refresh.</div>}>
            <AuthProvider>
            <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur border-b border-white/10">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2">
                <SafeBoundary fallback={<div className="text-white/60 text-sm">EconoPulse</div>}>
                  <Navigation />
                </SafeBoundary>
              </div>
            </header>
            <main>{children}</main>
            {/* Site-wide cookie consent banner */}
            <SafeBoundary>
              <CookieConsent />
            </SafeBoundary>
            </AuthProvider>
          </SafeBoundary>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
