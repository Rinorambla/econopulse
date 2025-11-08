import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  try {
    // Read locale param (useful for diagnostics)
    console.log('[LocaleLayout] Resolved locale:', params.locale);
    const messages = await getMessages();
    return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
  } catch (error) {
    console.error('[LocaleLayout] Error loading locale layout:', error);
    // Fallback: render children without i18n provider to avoid full crash
    return <>{children}</>;
  }
}
