import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/hooks/useAuth';
import CookieConsent from '@/components/CookieConsent';
import { Navigation } from '@/components/Navigation';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Providing all messages to the client
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.lang = '${locale}';`,
          }}
        />
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
          {/* Global Top Navigation */}
          <header className="sticky top-0 z-40 bg-[var(--background)]/80 backdrop-blur border-b border-white/10">
            <div className="w-full px-2 sm:px-4 py-2">
              <Navigation className="w-full" />
            </div>
          </header>
          {children}
        </div>
        <CookieConsent />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
