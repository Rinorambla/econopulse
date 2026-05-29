  'use client';

import Link from 'next/link';
import React, { startTransition, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useIsIOSApp } from '@/hooks/useIsIOSApp';
import Logo from './Logo';
import { PowerIcon } from '@heroicons/react/24/outline';

interface NavigationLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

export function NavigationLink({ href, className, children, onClick }: NavigationLinkProps) {
  const pathname = usePathname();
  
  return (
    <Link
      href={href}
      prefetch
      className={className}
      onClick={(e) => {
        // If same route avoid re-navigation
        if (pathname === href) return;
        // Defer any heavy state updates
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const isIOSApp = useIsIOSApp();
  
  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
    setUserMenuOpen(false);
  };
  
  // Close on ESC
  useEffect(() => {
    if (!mobileOpen && !userMenuOpen && !toolsMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setUserMenuOpen(false);
        setToolsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, userMenuOpen, toolsMenuOpen]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-user-menu]')) setUserMenuOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [userMenuOpen]);

  // Close AI tools menu on outside click
  useEffect(() => {
    if (!toolsMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-tools-menu]')) setToolsMenuOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [toolsMenuOpen]);
  
  return (
  <div className={`relative flex flex-nowrap items-center gap-1 sm:gap-2 ${className||''} w-full min-w-0`}> 
      {/* Left: Logo */}
      <div className="shrink-0">
        <NavigationLink href="/" className="flex items-center">
          <Logo size={40} showText textVariant="domain" layout="stacked" />
        </NavigationLink>
      </div>

      {/* Mobile: Hamburger */}
      <div className="ml-auto flex items-center md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          aria-controls="mobile-nav"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
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

      {/* Center: Links (desktop) */}
  <nav className="hidden md:flex flex-1 min-w-0 items-center flex-nowrap gap-1 xs:gap-2 sm:gap-2 mx-1 sm:mx-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Always show feature links; grouped into a single dropdown menu */}
  <div className="relative shrink-0" data-tools-menu>
          <button
            type="button"
            onClick={() => setToolsMenuOpen(v => !v)}
            aria-haspopup="menu"
            aria-expanded={toolsMenuOpen}
            className="group relative text-white/90 hover:text-white px-3 sm:px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 flex items-center gap-1.5"
          >
            <span className="relative z-10">Menu</span>
            <svg className={`relative z-10 h-3.5 w-3.5 text-white/70 transition-transform ${toolsMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
          </button>
          {toolsMenuOpen && (
            <div role="menu" className="absolute left-0 top-full mt-2 w-52 rounded-xl bg-slate-900 border border-white/20 shadow-2xl overflow-hidden z-[100] py-1">
              <NavigationLink href="/dashboard" className="block px-4 py-2.5 text-[13px] font-semibold text-white/90 hover:text-white hover:bg-blue-600/30" onClick={() => setToolsMenuOpen(false)}>
                Dashboard
              </NavigationLink>
              <NavigationLink href="/ai-portfolio" className="block px-4 py-2.5 text-[13px] font-semibold text-white/90 hover:text-white hover:bg-emerald-600/30" onClick={() => setToolsMenuOpen(false)}>
                AI Portfolio
              </NavigationLink>
              <NavigationLink href="/ai-pulse" className="block px-4 py-2.5 text-[13px] font-semibold text-white/90 hover:text-white hover:bg-pink-600/30" onClick={() => setToolsMenuOpen(false)}>
                AI Pulse
              </NavigationLink>
              <NavigationLink href="/visual-ai" className="block px-4 py-2.5 text-[13px] font-semibold text-white/90 hover:text-white hover:bg-violet-600/30" onClick={() => setToolsMenuOpen(false)}>
                Visual AI
              </NavigationLink>
              <NavigationLink href="/market-dna" className="block px-4 py-2.5 text-[13px] font-semibold text-white/90 hover:text-white hover:bg-amber-600/30" onClick={() => setToolsMenuOpen(false)}>
                Market DNA
              </NavigationLink>
              <NavigationLink href="/market-data" className="block px-4 py-2.5 text-[13px] font-semibold text-white/90 hover:text-white hover:bg-fuchsia-600/30" onClick={() => setToolsMenuOpen(false)}>
                Market Data
              </NavigationLink>
              <NavigationLink href="/econoai" className="block px-4 py-2.5 text-[13px] font-semibold text-white/90 hover:text-white hover:bg-sky-600/30" onClick={() => setToolsMenuOpen(false)}>
                UpdateAI
              </NavigationLink>
              <NavigationLink href="/news" className="block px-4 py-2.5 text-[13px] font-semibold text-white/90 hover:text-white hover:bg-cyan-600/30" onClick={() => setToolsMenuOpen(false)}>
                News
              </NavigationLink>
              {!isIOSApp && (
              <NavigationLink href="/pricing" className="block px-4 py-2.5 text-[13px] font-semibold text-white/90 hover:text-white hover:bg-cyan-600/30" onClick={() => setToolsMenuOpen(false)}>
                Pricing
              </NavigationLink>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Right: Auth (desktop) */}
    {user ? (
      <div className="hidden md:flex items-center gap-2 ml-auto shrink-0 pl-2 relative" data-user-menu>
        {(() => {
          const fullName = (user.user_metadata?.full_name as string) || '';
          const email = (user.email as string) || '';
          const shortName = fullName ? fullName.split(' ')[0] : (email.split('@')[0] || 'User');
          const initial = (shortName[0] || 'U').toUpperCase();
          return (
            <button
              type="button"
              onClick={() => setUserMenuOpen(v => !v)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
                {initial}
              </div>
              <span className="text-xs sm:text-sm font-semibold text-white truncate max-w-[10ch]" title={fullName || email}>{shortName}</span>
              <svg className={`h-3 w-3 text-white/70 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
            </button>
          );
        })()}
        <button
          onClick={handleSignOut}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
          aria-label="Sign out"
          title="Sign out"
        >
          <PowerIcon className="h-5 w-5" />
        </button>

        {userMenuOpen && (
          <div
            role="menu"
            className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-full sm:mt-2 w-72 rounded-xl bg-slate-900 border border-white/20 shadow-2xl overflow-hidden z-[100] text-white"
          >
            <div className="px-4 py-3 border-b border-white/10 bg-slate-800/60">
              <p className="text-xs text-white/60">Signed in as</p>
              <p className="text-sm text-white font-semibold truncate">{user.email}</p>
            </div>
            <NavigationLink
              href="/dashboard/account"
              className="block px-4 py-3 text-sm text-white hover:bg-blue-600/30"
              onClick={() => setUserMenuOpen(false)}
            >
              Account &amp; Billing
            </NavigationLink>
            <NavigationLink
              href="/dashboard"
              className="block px-4 py-3 text-sm text-white hover:bg-blue-600/30"
              onClick={() => setUserMenuOpen(false)}
            >
              Dashboard
            </NavigationLink>
            {!isIOSApp && (
            <NavigationLink
              href="/pricing"
              className="block px-4 py-3 text-sm text-white hover:bg-blue-600/30"
              onClick={() => setUserMenuOpen(false)}
            >
              Manage Plan
            </NavigationLink>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-left px-4 py-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/20 border-t border-white/10"
            >
              Sign Out
            </button>
          </div>
        )}
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

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          {/* Panel */}
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
              <NavigationLink href="/market-data" className="block w-full text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                Market Data
              </NavigationLink>
              <NavigationLink href="/econoai" className="block w-full text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                UpdateAI
              </NavigationLink>
              <NavigationLink href="/news" className="block w-full text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                News
              </NavigationLink>
              {!isIOSApp && (
              <NavigationLink href="/pricing" className="block w-full text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                Pricing
              </NavigationLink>
              )}

              <div className="pt-2 mt-2 border-t border-slate-800" />

              {user ? (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-xs text-white/60 truncate" title={user.user_metadata?.full_name || user.email}>
                    {user.user_metadata?.full_name || user.email}
                  </div>
                  <NavigationLink href="/dashboard/account" className="block w-full text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                    Account &amp; Billing
                  </NavigationLink>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left bg-gradient-to-r from-rose-500 to-orange-600 text-white px-3 py-2 rounded-lg text-sm font-semibold active:scale-95"
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
