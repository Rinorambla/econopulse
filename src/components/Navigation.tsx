    'use client';

  import React, { startTransition, useEffect, useState } from 'react';
  import { Link, usePathname } from '@/i18n/routing';
  import { useAuth } from '@/hooks/useAuth';
  import Logo from './Logo';
  import type { ReactNode } from 'react';

interface NavigationLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

export function NavigationLink({ href, className, children, onClick }: NavigationLinkProps) {
  const pathname = usePathname();
  // Inject current locale prefix if missing (assuming pathname starts with /en or /it)
  let localePrefix = 'en';
  const m = pathname?.match(/^\/(en|it)(?:\/|$)/);
  if (m) localePrefix = m[1];
  const finalHref = /^\/(en|it)(\/|$)/.test(href) ? href : `/${localePrefix}${href === '/' ? '' : href}`;

  return (
    <Link
      href={finalHref}
      prefetch
      className={className}
      onClick={(e) => {
        if (pathname === finalHref) return;
        startTransition(() => {});
        if (onClick) onClick(e);
      }}
    >
      {children}
    </Link>
  );
}

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className={`relative flex flex-nowrap items-center gap-1 sm:gap-2 ${className || ''} w-full overflow-hidden`}>
      <div className="shrink-0">
        <NavigationLink href="/" className="flex items-center">
          <Logo size={48} showText textVariant="domain" layout="stacked" />
        </NavigationLink>
      </div>

      <div className="ml-auto flex items-center md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          aria-controls="mobile-nav"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(v => !v)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-white/90 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className={`${mobileOpen ? 'hidden' : 'block'} h-6 w-6`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <svg className={`${mobileOpen ? 'block' : 'hidden'} h-6 w-6`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <nav className="hidden md:flex flex-1 min-w-0 items-center flex-nowrap gap-1 xs:gap-2 sm:gap-2 mx-1 sm:mx-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
  <NavigationLink href="/dashboard" className="group relative text-white/90 hover:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105">
          <span className="relative z-10 flex items-center gap-1">Dashboard</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </NavigationLink>
  <NavigationLink href="/ai-portfolio" className="group relative text-white/90 hover:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-teal-500/20 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-105">
          <span className="relative z-10 flex items-center gap-1">AI Portfolio</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </NavigationLink>
  <NavigationLink href="/ai-pulse" className="group relative text-white/90 hover:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-rose-500/20 hover:shadow-lg hover:shadow-pink-500/25 hover:scale-105">
          <span className="relative z-10 flex items-center gap-1">AI Pulse</span>
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
  <NavigationLink href="/econoai" className="group relative text-white/90 hover:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-gradient-to-r hover:from-sky-500/20 hover:to-teal-500/20 hover:shadow-lg hover:shadow-sky-500/25 hover:scale-105">
          <span className="relative z-10">EconoAI</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </NavigationLink>
  <NavigationLink href="/news" className="group relative text-white/90 hover:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105">
          <span className="relative z-10">News</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </NavigationLink>
  <NavigationLink href="/pricing" className="group relative text-white/90 hover:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105">
          <span className="relative z-10">Pricing</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </NavigationLink>
      </nav>

      {user ? (
        <div className="hidden md:flex items-center gap-3 sm:gap-4 ml-auto shrink-0">
          <div className="relative group max-w-[35vw] truncate">
            <span className="text-sm font-medium text-white/80 truncate" title={user.user_metadata?.full_name || user.email}>
              Welcome, <span className="font-semibold text-white truncate">{user.user_metadata?.full_name || user.email}</span>
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
        <div className="ml-auto hidden md:flex items-center gap-2 shrink-0">
          <NavigationLink href="/signup" className="group relative text-white/90 hover:text-white px-3 py-2 rounded-lg text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-white/10">
            <span className="relative z-10">Sign Up</span>
          </NavigationLink>
            <NavigationLink href="/login" className="group relative bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 sm:px-5 py-2 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-blue-700/30 hover:scale-105 active:scale-95">
            <span className="relative z-10">Login</span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </NavigationLink>
        </div>
      )}

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div id="mobile-nav" className="absolute top-0 left-0 right-0 bg-slate-950 border-b border-slate-800 shadow-xl">
            <div className="px-4 py-4 space-y-1">
              <NavigationLink href="/dashboard" className="block w-full text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                Dashboard
              </NavigationLink>
              <NavigationLink href="/ai-portfolio" className="block w-full text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                AI Portfolio
              </NavigationLink>
              <NavigationLink href="/ai-pulse" className="block w-full text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                AI Pulse
              </NavigationLink>
              <NavigationLink href="/visual-ai" className="block w-full text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                Visual AI
              </NavigationLink>
              <NavigationLink href="/market-dna" className="block w-full text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                Market DNA
              </NavigationLink>
              <NavigationLink href="/econoai" className="block w-full text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                EconoAI
              </NavigationLink>
              <NavigationLink href="/news" className="block w-full text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                News
              </NavigationLink>
              <NavigationLink href="/pricing" className="block w-full text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                Pricing
              </NavigationLink>

              <div className="pt-2 mt-2 border-t border-slate-800" />

              {user ? (
                <div className="flex items-center justify-between gap-3 px-1">
                  <span className="text-sm text-white/80 truncate" title={user.user_metadata?.full_name || user.email}>
                    {user.user_metadata?.full_name || user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="bg-gradient-to-r from-rose-500 to-orange-600 text-white px-3 py-2 rounded-lg text-sm font-semibold active:scale-95"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <NavigationLink href="/signup" className="text-center text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                    Sign Up
                  </NavigationLink>
                  <NavigationLink href="/login" className="text-center bg-gradient-to-r from-blue-500 to-blue-700 text-white px-3 py-2 rounded-lg font-semibold" onClick={() => setMobileOpen(false)}>
                    Login
                  </NavigationLink>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
