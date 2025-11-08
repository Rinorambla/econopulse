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
    // Ensure locale is read so Next sets the segment param
    const resolvedParams = await params;
    console.log('[LocaleLayout] Resolved locale:', resolvedParams.locale);
    const messages = await getMessages();
    return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
  } catch (error) {
    console.error('[LocaleLayout] Error loading locale layout:', error);
    // Fallback: render children without i18n provider to avoid full crash
    return <>{children}</>;
  }
}
