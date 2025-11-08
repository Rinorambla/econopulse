// Temporary diagnostic layout: remove i18n provider to isolate runtime crash.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  try {
    const resolved = await params;
    console.log('[LocaleLayout/FALLBACK] locale param:', resolved?.locale);
  } catch (e) {
    console.warn('[LocaleLayout/FALLBACK] failed to read params', e);
  }
  return <>{children}</>;
}
