"use client";

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
// Removed unused NavigationLink and NewsWidget
import { useAuth } from '@/hooks/useAuth';
import { hasAccess, planRank } from '@/lib/plan-access';
import { useRouter } from 'next/navigation';
import Logo from './Logo';

const Footer = () => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');

  const currentYear = new Date().getFullYear();

  // Handle protected links
  const handleProtectedLink = (e: React.MouseEvent, href: string, requiredPlan?: string) => {
    if (!user) {
      e.preventDefault();
      // Redirect to login with return URL
      router.push(`/${locale}/login?redirect=${encodeURIComponent(href)}`);
      return;
    }
    
    // Check subscription level if required
    const userPlan = user.user_metadata?.subscription_plan || 'pro';
    if (requiredPlan && userPlan !== requiredPlan) {
      e.preventDefault();
      // Redirect to pricing/upgrade page
      router.push(`/${locale}/pricing?plan=${requiredPlan}`);
      return;
    }
    
    // Allow navigation
    router.push(`/${locale}${href}`);
  };

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError(t('footer.newsletter.error'));
      return;
    }

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSubscribed(true);
        setEmail('');
      } else {
        setError(t('footer.newsletter.error'));
      }
    } catch (error) {
      setError(t('footer.newsletter.error'));
    }
  };

  type FooterLink = {
    key: string;
    href: string;
    requiresPlan?: string;
  };

  const linkSections = [
    {
      title: 'footer.services_section',
      links: [
        { key: 'dashboard', href: '/dashboard', requiresPlan: 'pro' },
        { key: 'ai_portfolio', href: '/ai-portfolio', requiresPlan: 'premium' },
        { key: 'ai_pulse', href: '/ai-pulse', requiresPlan: 'premium' },
        { key: 'visual_ai', href: '/visual-ai', requiresPlan: 'premium' },
        { key: 'market_dna', href: '/market-dna', requiresPlan: 'premium' }
      ] as FooterLink[]
    },
    {
      title: 'footer.company_section',
      links: [
        { key: 'about', href: '/about' },
        { key: 'blog', href: '/blog' },
        { key: 'pricing', href: '/pricing' },
  { key: 'help', href: '/help' },
        { key: 'work_with_us', href: '/work-with-us' }
      ] as FooterLink[]
    },
    {
      title: 'footer.legal_section',
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
              {t('footer.description')}
            </p>

            {/* Contact Info intentionally removed: shown only on Contact page per request */}

            {/* Newsletter Subscription */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">
                {t('footer.newsletter.title')}
              </h4>
              
              {!subscribed ? (
                <form onSubmit={handleNewsletterSubscribe} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('footer.newsletter.placeholder')}
                      className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
                    >
                      {t('footer.newsletter.subscribe')}
                    </button>
                  </div>
                  {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                  )}
                </form>
              ) : (
                <div className="flex items-center space-x-2 text-green-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{t('footer.newsletter.success')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          {linkSections.map((section, index) => (
            <div key={index}>
        <h4 className="font-semibold text-lg mb-6 text-white">
                {t(section.title)}
              </h4>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.key}>
                    <a
                      href={`/${locale}${link.href}`}
                      onClick={(e) => handleProtectedLink(e, link.href, link.requiresPlan)}
                      className="text-white/90 hover:text-white transition-colors duration-200 flex items-center space-x-2 group"
                    >
                      <span>{t(`footer.${link.key}`)}</span>
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
        <p className="text-white/70">
                © {currentYear} EconoPulse.ai. {t('footer.all_rights_reserved')}
              </p>
        <p className="text-sm text-white/60 mt-1">
                {t('footer.financial_disclaimer')}
              </p>
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
              href={`/${locale}/privacy`}
              onClick={(e) => handleProtectedLink(e, '/privacy')}
              className="text-white/70 hover:text-white transition-colors duration-200"
            >
              {t('footer.privacy')}
            </a>
            <span className="text-white/40">•</span>
            <a
              href={`/${locale}/cookies`}
              onClick={(e) => handleProtectedLink(e, '/cookies')}
              className="text-white/70 hover:text-white transition-colors duration-200"
            >
              {t('footer.cookies')}
            </a>
            <span className="text-white/40">•</span>
            <a
              href={`/${locale}/terms`}
              onClick={(e) => handleProtectedLink(e, '/terms')}
              className="text-white/70 hover:text-white transition-colors duration-200"
            >
              {t('footer.terms')}
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
              {t('footer.cookie_settings')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;