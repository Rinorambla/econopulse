'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Logo from './Logo';

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
  <div className={`flex flex-wrap items-center gap-2 sm:gap-3 ${className||''} w-full`}> 
      {/* Left: Logo */}
      <div className="shrink-0">
        <NavigationLink href="/" className="flex items-center">
          <Logo size={48} showText textVariant="domain" layout="stacked" />
        </NavigationLink>
      </div>

      {/* Center: Links */}
  <nav className="flex-1 min-w-0 flex items-center flex-wrap gap-1 xs:gap-2 sm:gap-3 mx-1 sm:mx-4 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Always show feature links; if user not logged in add a subtle lock indicator */}
  <NavigationLink href="/dashboard" className="group relative text-white/90 hover:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105">
          <span className="relative z-10 flex items-center gap-1">{t('nav.dashboard')}</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </NavigationLink>
  <NavigationLink href="/ai-portfolio" className="group relative text-white/90 hover:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-teal-500/20 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-105">
          <span className="relative z-10 flex items-center gap-1">{t('nav.ai_portfolio')}</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </NavigationLink>
  <NavigationLink href="/ai-pulse" className="group relative text-white/90 hover:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-rose-500/20 hover:shadow-lg hover:shadow-pink-500/25 hover:scale-105">
          <span className="relative z-10 flex items-center gap-1">{t('nav.ai_pulse')}</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </NavigationLink>
  <NavigationLink href="/visual-ai" className="group relative text-white/90 hover:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-gradient-to-r hover:from-violet-500/20 hover:to-indigo-500/20 hover:shadow-lg hover:shadow-violet-500/25 hover:scale-105">
          <span className="relative z-10 flex items-center gap-1"><span className="text-white">Visual AI</span></span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </NavigationLink>
  <NavigationLink href="/market-dna" className="group relative text-white/90 hover:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-gradient-to-r hover:from-amber-500/20 hover:to-orange-500/20 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-105">
          <span className="relative z-10 flex items-center gap-1"><span className="text-white">Market DNA</span></span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </NavigationLink>
  <NavigationLink href="/news" className="group relative text-white/90 hover:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105">
          <span className="relative z-10">News</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </NavigationLink>
  <NavigationLink href="/pricing" className="group relative text-white/90 hover:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105">
          <span className="relative z-10">{t('nav.pricing')}</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </NavigationLink>
      </nav>

      {/* Right: Auth */}
    {user ? (
      <div className="flex items-center gap-3 sm:gap-4 ml-auto shrink-0">
            <div className="relative group">
              <span className="text-sm font-medium text-white/80">
                Welcome, <span className="font-semibold text-white">{user.user_metadata?.full_name || user.email}</span>
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="group relative bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-105 active:scale-95"
            >
              <span className="relative z-10">Sign Out</span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
      ) : (
  <NavigationLink href="/login" className="group relative ml-auto shrink-0 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 sm:px-5 py-2 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-blue-700/30 hover:scale-105 active:scale-95">
          <span className="relative z-10">{t('nav.login')}</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </NavigationLink>
      )}
    </div>
  );
}
