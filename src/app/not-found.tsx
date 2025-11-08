import Link from 'next/link';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { MagnifyingGlassIcon, HomeIcon } from '@heroicons/react/24/outline';

// Disable static prerender for not-found to avoid router context issues triggering usePathname
// inside nested client components (Navigation) during export.
export const dynamic = 'force-dynamic';

function NotFoundInner() {
  const t = useTranslations('not_found');
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/it" className="text-2xl font-bold text-white">EconoPulse</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 404 Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="text-8xl font-bold text-blue-400 mb-4">{t('code')}</div>
            <MagnifyingGlassIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
            <p className="text-gray-400 mb-8">{t('description')}</p>
          </div>

          <div className="space-y-4">
            <Link
              href="/it"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              <HomeIcon className="h-5 w-5 mr-2" />
              {t('back_home')}
            </Link>

            <div className="flex space-x-4">
              <Link
                href="/it/dashboard"
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
              >
                {t('dashboard')}
              </Link>
              <Link
                href="/it/pricing"
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
              >
                {t('pricing')}
              </Link>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-gray-400 text-sm">
              {t('popular_pages')}{' '}
              <Link href="/it/ai-portfolio" className="text-blue-400 hover:text-blue-300">{t('ai_portfolio')}</Link>
              {' • '}
              <Link href="/it/ai-pulse" className="text-blue-400 hover:text-blue-300">{t('ai_pulse')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function NotFound() {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      <NotFoundInner />
    </NextIntlClientProvider>
  );
}
