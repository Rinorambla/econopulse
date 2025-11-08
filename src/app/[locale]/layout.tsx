import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import React from 'react';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  try {
    const locale = (params as any)?.locale;
    if (!locale || !['en','it'].includes(locale)) {
      console.warn('[LocaleLayout] Invalid or missing locale param -> rendering children without provider');
      return <>{children}</>;
    }
    // Force messages load for this locale
    const messages = await getMessages({ locale });
    return (
      <NextIntlClientProvider messages={messages} locale={locale} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    );
  } catch (e) {
    console.error('[LocaleLayout] i18n load failed, rendering without provider', e);
    return <>{children}</>;
  }
}
