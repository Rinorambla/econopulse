"use client";

import React from 'react';
// Removed next-intl usage (temporary de-i18n)
// Removed unused NavigationLink and NewsWidget
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Logo from './Logo';

const Footer = () => {
  const router = useRouter();
  const { user, isDevUser } = useAuth();

  const currentYear = new Date().getFullYear();

  // Handle protected links
  const handleProtectedLink = (e: React.MouseEvent, href: string, requiredPlan?: string) => {
    // Dev users bypass all gating
    if (isDevUser) {
      e.preventDefault();
      router.push(href);
      return;
    }
    if (!user) {
      e.preventDefault();
      // Redirect to login with return URL
      router.push(`/login?redirect=${encodeURIComponent(href)}`);
      return;
    }
    
    // Check subscription level if required
    const userPlan = user.user_metadata?.subscription_plan || 'pro';
    if (requiredPlan && userPlan !== requiredPlan) {
      e.preventDefault();
      // Redirect to pricing/upgrade page
      router.push(`/pricing?plan=${requiredPlan}`);
      return;
    }
    
    // Allow navigation
    router.push(href);
  };

  // Newsletter removed per request: no subscription UI and no API calls

  type FooterLink = {
    key: string;
    href: string;
    requiresPlan?: string;
  };

  const linkSections = [
    {
      title: 'Services',
      links: [
        { key: 'dashboard', href: '/dashboard', requiresPlan: 'pro' },
        { key: 'ai_portfolio', href: '/ai-portfolio', requiresPlan: 'premium' },
        { key: 'ai_pulse', href: '/ai-pulse', requiresPlan: 'premium' },
        { key: 'visual_ai', href: '/visual-ai', requiresPlan: 'premium' },
        { key: 'market_dna', href: '/market-dna', requiresPlan: 'premium' },
        { key: 'econoai', href: '/econoai' }
      ] as FooterLink[]
    },
    {
      title: 'Company',
      links: [
        { key: 'about', href: '/about' },
        { key: 'news', href: '/news' },
        { key: 'pricing', href: '/pricing' },
        { key: 'help', href: '/help' },
        { key: 'work_with_us', href: '/work-with-us' }
      ] as FooterLink[]
    },
    {
      title: 'Legal',
      links: [
        { key: 'privacy', href: '/privacy' },
        { key: 'terms', href: '/terms' },
        { key: 'disclaimer', href: '/disclaimer' },
        { key: 'cookies', href: '/cookies' }
      ] as FooterLink[]
    }
  ];

  const userPlan = (user?.user_metadata?.subscription_plan || 'pro').toLowerCase();
  // Removed upsell CTA per user request
  const showUpgradeCta = false;

  return (
  <footer className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white mt-20">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Company Info */}
          <div className="lg:col-span-2 space-y-6">
            <Logo size={40} showText={true} className="text-white" />
            
            <p className="text-white/80 text-lg leading-relaxed max-w-md">
              AI-powered market analytics and portfolio intelligence. Actionable signals distilled from macro, sentiment and price structure.
            </p>

            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-white">Contact us</h4>
              <div className="space-y-2 text-white/70">
                <a 
                  href="mailto:info@econopulse.ai" 
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                  </svg>
                  info@econopulse.ai
                </a>
                <a 
                  href="mailto:support@econopulse.ai" 
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.997 3.997 0 00.078-2.183l1.562-1.562C15.802 8.249 16 9.1 16 10zm-5.165 3.913l1.58 1.58A5.98 5.98 0 0110 16a5.976 5.976 0 01-2.516-.552l1.562-1.562a4.006 4.006 0 001.789.027zm-4.677-2.796a4.002 4.002 0 01-.041-2.08l-.08.08-1.53-1.533A5.98 5.98 0 004 10c0 .954.223 1.856.619 2.657l1.54-1.54zm1.088-6.45A5.974 5.974 0 0110 4c.954 0 1.856.223 2.657.619l-1.54 1.54a4.002 4.002 0 00-2.346.033L7.246 4.668zM12 10a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd"/>
                  </svg>
                  support@econopulse.ai
                </a>
              </div>
            </div>

            {/* Newsletter removed */}
          </div>

          {/* Navigation Links */}
          {linkSections.map((section, index) => (
            <div key={index}>
        <h4 className="font-semibold text-lg mb-6 text-white">{section.title}</h4>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.key}>
                    <a
                      href={link.href}
                      onClick={(e) => handleProtectedLink(e, link.href, link.requiresPlan)}
                      className="text-white/90 hover:text-white transition-colors duration-200 flex items-center space-x-2 group"
                    >
                      <span>{
                        link.key === 'dashboard' ? 'Dashboard' :
                        link.key === 'ai_portfolio' ? 'AI Portfolio' :
                        link.key === 'ai_pulse' ? 'AI Pulse' :
                        link.key === 'visual_ai' ? 'Visual AI' :
                        link.key === 'market_dna' ? 'Market DNA' :
                        link.key === 'econoai' ? 'EconoAI' :
                        link.key === 'about' ? 'About' :
                        link.key === 'news' ? 'News' :
                        link.key === 'pricing' ? 'Pricing' :
                        link.key === 'help' ? 'Help' :
                        link.key === 'work_with_us' ? 'Work with us' :
                        link.key === 'privacy' ? 'Privacy Policy' :
                        link.key === 'terms' ? 'Terms of Service' :
                        link.key === 'disclaimer' ? 'Disclaimer' :
                        link.key === 'cookies' ? 'Cookies' : link.key
                      }</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Upsell CTA removed */}

          
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-700 mt-16 pt-8">
      <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
        <p className="text-white/70">© {currentYear} EconoPulse.ai. All rights reserved.</p>
        <p className="text-sm text-white/60 mt-1">EconoPulse is not a financial advisor. All information is provided for educational purposes only.</p>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              <a
                href="https://www.instagram.com/econopulse_?igsh=MWprd3VpN2hxNm9pZA%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors duration-200 ring-1 ring-inset ring-slate-700/60"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://youtube.com/@rinorambla1365?si=H6C1KT82zA7Q1_A8"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors duration-200 ring-1 ring-inset ring-slate-700/60"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href="https://x.com/rinorambla?s=21"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors duration-200 ring-1 ring-inset ring-slate-700/60"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="https://t.me/econopulsee"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors duration-200 ring-1 ring-inset ring-slate-700/60"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Cookie/Privacy Quick Links Bar */}
        <div className="border-t border-slate-600 mt-8 pt-4">
          <div className="flex flex-wrap justify-center items-center gap-4 text-sm">
            <a
              href={`/privacy`}
              onClick={(e) => handleProtectedLink(e, '/privacy')}
              className="text-white/70 hover:text-white transition-colors duration-200"
            >
              Privacy
            </a>
            <span className="text-white/40">•</span>
            <a
              href={`/cookies`}
              onClick={(e) => handleProtectedLink(e, '/cookies')}
              className="text-white/70 hover:text-white transition-colors duration-200"
            >
              Cookies
            </a>
            <span className="text-white/40">•</span>
            <a
              href={`/terms`}
              onClick={(e) => handleProtectedLink(e, '/terms')}
              className="text-white/70 hover:text-white transition-colors duration-200"
            >
              Terms
            </a>
            <span className="text-white/40">•</span>
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).resetCookieConsent) {
                  (window as any).resetCookieConsent();
                }
              }}
              className="text-white/70 hover:text-white transition-colors duration-200 underline cursor-pointer"
            >
              Cookie settings
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;