'use client';

import Link from 'next/link';
import React, { startTransition } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Logo from './Logo';

interface NavigationLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

export function NavigationLink({ href, className, children }: NavigationLinkProps) {
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
  
  const handleSignOut = async () => {
    await signOut();
  };
  
  return (
  <div className={`flex flex-nowrap items-center gap-1 sm:gap-2 ${className||''} w-full overflow-hidden`}> 
      {/* Left: Logo */}
      <div className="shrink-0">
        <NavigationLink href="/" className="flex items-center">
          <Logo size={48} showText textVariant="domain" layout="stacked" />
        </NavigationLink>
      </div>

    {/* Center: Links */}
  <nav className="flex-1 min-w-0 flex items-center flex-nowrap gap-1 xs:gap-2 sm:gap-2 mx-1 sm:mx-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Always show feature links; if user not logged in add a subtle lock indicator */}
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

      {/* Right: Auth */}
    {user ? (
      <div className="flex items-center gap-3 sm:gap-4 ml-auto shrink-0">
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
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <NavigationLink href="/signup" className="group relative text-white/90 hover:text-white px-3 py-2 rounded-lg text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:bg-white/10">
            <span className="relative z-10">Sign Up</span>
          </NavigationLink>
          <NavigationLink href="/login" className="group relative bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 sm:px-5 py-2 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-blue-700/30 hover:scale-105 active:scale-95">
            <span className="relative z-10">Login</span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </NavigationLink>
        </div>
      )}
    </div>
  );
}
