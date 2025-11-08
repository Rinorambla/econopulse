import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { notFound } from 'next/navigation';

// Explicit static params generation (helps Next identify valid locales & avoid unexpected runtime errors)
export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'it' }];
}

type LayoutProps = {
  children: React.ReactNode;
  // Match Next.js generated types which expect params as a Promise
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;

  if (!locale || !['en', 'it'].includes(locale)) {
    console.warn('[LocaleLayout] Invalid locale -> notFound()');
    notFound();
  }

  // Replace dynamic variable path import (which can sometimes confuse the bundler in production) with
  // a static conditional mapping to ensure both JSON files are explicitly included in the bundle.
  let messages: any;
  try {
    if (locale === 'en') {
      messages = (await import('../../../messages/en.json')).default;
    } else if (locale === 'it') {
      messages = (await import('../../../messages/it.json')).default;
    } else {
      notFound();
    }
  } catch (e) {
    console.error(`[LocaleLayout] Failed loading messages for "${locale}"`, e);
    notFound();
  }

  try {
    return (
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    );
  } catch (e) {
    // Final fallback: render children without provider to avoid hard crash (should not normally happen)
    console.error('[LocaleLayout] Fatal render error; falling back without provider', e);
    return <>{children}</>;
  }
}
