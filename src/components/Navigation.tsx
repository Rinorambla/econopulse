'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface NavigationLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

export function NavigationLink({ href, className, children }: NavigationLinkProps) {
  const locale = useLocale();
  const pathname = usePathname();
  
  // Se è la homepage, usa solo il locale
  const localizedHref = href === '/' 
    ? `/${locale}` 
    : `/${locale}${href}`;
  
  return (
    <Link href={localizedHref} className={className}>
      {children}
    </Link>
  );
}

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const t = useTranslations();
  const { user, signOut } = useAuth();
  
  const handleSignOut = async () => {
    await signOut();
  };
  
  return (
    <div className={className}>
      <NavigationLink href="/" className="text-2xl font-bold text-white">
        EconoPulse
      </NavigationLink>
      <nav className="hidden md:flex space-x-8 items-center">
        {user && (
          <NavigationLink href="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
            {t('nav.dashboard')}
          </NavigationLink>
        )}
        {user && (
          <NavigationLink href="/ai-portfolio" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
            {t('nav.ai_portfolio')}
          </NavigationLink>
        )}
        {user && (
          <NavigationLink href="/ai-pulse" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
            {t('nav.ai_pulse')}
          </NavigationLink>
        )}
        {user && (
          <NavigationLink href="/market-dna" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
            Market DNA
          </NavigationLink>
        )}
        <NavigationLink href="/pricing" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
          {t('nav.pricing')}
        </NavigationLink>
        {user ? (
          <div className="flex items-center space-x-4">
            <span className="text-gray-300 text-sm">
              Welcome, {user.user_metadata?.full_name || user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <NavigationLink href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
            {t('nav.login')}
          </NavigationLink>
        )}
      </nav>
    </div>
  );
}
