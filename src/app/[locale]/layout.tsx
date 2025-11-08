import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { notFound } from 'next/navigation';

// Explicit static params generation (helps Next identify valid locales & avoid unexpected runtime errors)
export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'it' }];
}

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LayoutProps) {
  try {
    const { locale } = await params;
    if (!locale || !['en', 'it'].includes(locale)) {
      console.warn('[LocaleLayout] Invalid locale -> notFound()');
      notFound();
    }

    let messages: any;
    try {
      // Load JSON messages explicitly rather than relying on next-intl auto loader (reduces ambiguity)
      messages = (await import(`../../../messages/${locale}.json`)).default;
    } catch (e) {
      console.error(`[LocaleLayout] Missing messages for locale "${locale}"`, e);
      notFound();
    }

    return (
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    );
  } catch (e) {
    console.error('[LocaleLayout] Fatal i18n initialization error; rendering children without provider', e);
    return <>{children}</>;
  }
}
