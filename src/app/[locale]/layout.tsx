import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  try {
    // Ensure locale param is awaited if framework provides a promise-like
    const resolved = await params;
    console.log('[LocaleLayout] Resolved locale:', resolved?.locale);
    const messages = await getMessages();
    return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
  } catch (error) {
    console.error('[LocaleLayout] Error loading locale layout:', error);
    // Fallback: render children without i18n provider to avoid full crash
    return <>{children}</>;
  }
}
