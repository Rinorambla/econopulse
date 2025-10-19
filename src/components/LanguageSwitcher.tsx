'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function LanguageSwitcher() {
  const locale = useLocale();
  // usePathname can return null in some edge cases; default to root
  const pathname = usePathname() || '/';

  // Remove current locale from pathname
  const pathWithoutLocale = (pathname ?? '/').replace(/^\/(en|it)/, '') || '/';
  
  // Construct URLs for both languages
  const enUrl = `/en${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
  const itUrl = `/it${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;

  return (
    <div className="flex items-center space-x-2">
      <Link
        href={enUrl}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          locale === 'en' 
            ? 'bg-blue-600 text-white' 
            : 'text-gray-300 hover:text-white hover:bg-white/10'
        }`}
      >
        EN
      </Link>
      <span className="text-gray-500">|</span>
      <Link
        href={itUrl}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          locale === 'it' 
            ? 'bg-blue-600 text-white' 
            : 'text-gray-300 hover:text-white hover:bg-white/10'
        }`}
      >
        IT
      </Link>
    </div>
  );
}
