import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { NavigationLink } from './Navigation';
import NewsWidget from './NewsWidget';

const Footer = () => {
  const t = useTranslations();
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');

  const currentYear = new Date().getFullYear();

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError(t('footer.newsletter.error'));
      return;
    }

    try {
      // Here you would integrate with your newsletter service (e.g., Mailchimp, ConvertKit)
      // For now, we'll just simulate success
      setSubscribed(true);
      setEmail('');
    } catch (error) {
      setError(t('footer.newsletter.error'));
    }
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Company Info & Newsletter */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-bold text-blue-400 mb-4">
              {t('footer.company')}
            </h3>
            <p className="text-gray-400 mb-4">
              {t('footer.tagline')}
            </p>
            <p className="text-gray-400 mb-6 text-sm">
              {t('footer.description')}
            </p>

            {/* Newsletter Signup */}
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3">
                {t('footer.newsletter.title')}
              </h4>
              <p className="text-gray-400 text-sm mb-4">
                {t('footer.newsletter.description')}
              </p>
              
              {subscribed ? (
                <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
                  <p className="text-green-400 text-sm">
                    {t('footer.newsletter.success')}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubscribe} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('footer.newsletter.placeholder')}
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                  >
                    {t('footer.newsletter.subscribe')}
                  </button>
                </form>
              )}
              {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
              )}
            </div>

            {/* Contact Info */}
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3">Contact</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <p>
                  <span className="font-medium">Email:</span>{' '}
                  <a 
                    href={`mailto:${t('footer.contact_info.email')}`}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {t('footer.contact_info.email')}
                  </a>
                </p>
                <p>
                  <span className="font-medium">Phone:</span> {t('footer.contact_info.phone')}
                </p>
                <p>
                  <span className="font-medium">Address:</span> {t('footer.contact_info.address')}
                </p>
              </div>
            </div>
            
            {/* Social Icons */}
            <div className="flex space-x-4">
              {/* X (Twitter) */}
              <a 
                href="https://x.com/econopulse" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="X (Twitter)"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              
              {/* Instagram */}
              <a 
                href="https://instagram.com/econopulse" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-pink-400 transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.621 5.367 11.988 11.988 11.988s11.987-5.367 11.987-11.988C24.004 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.228 14.794 3.738 13.643 3.738 12.346s.49-2.448 1.388-3.323c.875-.907 2.026-1.388 3.323-1.388s2.448.481 3.323 1.388c.907.875 1.388 2.026 1.388 3.323s-.481 2.448-1.388 3.345c-.875.807-2.026 1.297-3.323 1.297zm8.1-.098c-.098.098-.196.196-.327.294-.131.098-.294.196-.458.294-.196.098-.392.163-.621.229-.229.065-.49.098-.752.098s-.523-.033-.752-.098c-.229-.065-.425-.131-.621-.229-.163-.098-.327-.196-.458-.294-.131-.098-.229-.196-.327-.294-.098-.098-.196-.196-.294-.327-.098-.131-.196-.294-.294-.458-.098-.196-.163-.392-.229-.621-.065-.229-.098-.49-.098-.752s.033-.523.098-.752c.065-.229.131-.425.229-.621.098-.163.196-.327.294-.458.098-.131.196-.229.294-.327.098-.098.196-.196.327-.294.131-.098.294-.196.458-.294.196-.098.392-.163.621-.229.229-.065.49-.098.752-.098s.523.033.752.098c.229.065.425.131.621.229.163.098.327.196.458.294.131.098.229.196.327.294.098.098.196.196.294.327.098.131.196.294.294.458.098.196.163.392.229.621.065.229.098.49.098.752s-.033.523-.098.752c-.065.229-.131.425-.229.621-.098.163-.196.327-.294.458-.098.131-.196.229-.294.327zm4.114-4.642c0 1.297-.49 2.448-1.297 3.323-.807.907-1.958 1.388-3.255 1.388s-2.448-.481-3.255-1.388c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.807-.875 1.958-1.297 3.255-1.297s2.448.422 3.255 1.297c.807.875 1.297 2.026 1.297 3.323z"/>
                </svg>
              </a>
              
              {/* YouTube */}
              <a 
                href="https://youtube.com/@econopulse" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-red-400 transition-colors"
                aria-label="YouTube"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              
              {/* Telegram */}
              <a 
                href="https://t.me/econopulse" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
                aria-label="Telegram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Latest News */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Latest News</h4>
            <NewsWidget />
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">
              {t('footer.product')}
            </h4>
            <ul className="space-y-2">
              <li>
                <NavigationLink 
                  href="/dashboard" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('nav.dashboard')}
                </NavigationLink>
              </li>
              <li>
                <NavigationLink 
                  href="/ai-portfolio" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('nav.ai_portfolio')}
                </NavigationLink>
              </li>
              <li>
                <NavigationLink 
                  href="/ai-pulse" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('nav.ai_pulse')}
                </NavigationLink>
              </li>
              <li>
                <NavigationLink 
                  href="/market-dna" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Market DNA
                </NavigationLink>
              </li>
              <li>
                <NavigationLink 
                  href="/pricing" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.pricing')}
                </NavigationLink>
              </li>
              <li>
                <a 
                  href="/api/docs" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.api')}
                </a>
              </li>
              <li>
                <a 
                  href="/docs" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.documentation')}
                </a>
              </li>
              <li>
                <a 
                  href="/status" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.status')}
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">
              {t('footer.company_section')}
            </h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href="/about" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.about')}
                </a>
              </li>
              <li>
                <a 
                  href="/careers" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.careers')}
                </a>
              </li>
              <li>
                <a 
                  href="/blog" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.blog')}
                </a>
              </li>
              <li>
                <NavigationLink 
                  href="/news" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  News
                </NavigationLink>
              </li>
              <li>
                <a 
                  href="/press" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.press')}
                </a>
              </li>
              <li>
                <a 
                  href="/investors" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.investors')}
                </a>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">
              {t('footer.support')}
            </h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href="/help" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.help')}
                </a>
              </li>
              <li>
                <a 
                  href={`mailto:${t('footer.contact_info.email')}`}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.contact')}
                </a>
              </li>
              <li>
                <a 
                  href="/community" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.community')}
                </a>
              </li>
              <li>
                <a 
                  href="/webinars" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.webinars')}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">
              {t('footer.legal')}
            </h4>
            <ul className="space-y-2">
              <li>
                <NavigationLink 
                  href="/privacy" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.privacy')}
                </NavigationLink>
              </li>
              <li>
                <NavigationLink 
                  href="/terms" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.terms')}
                </NavigationLink>
              </li>
              <li>
                <a 
                  href="/security" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.security')}
                </a>
              </li>
              <li>
                <a 
                  href="/compliance" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.compliance')}
                </a>
              </li>
              <li>
                <a 
                  href="/cookies" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.links.cookies')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Risk Disclaimer */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-6">
            <h5 className="font-semibold text-yellow-400 mb-2">
              {t('legal.risk_disclaimer')}
            </h5>
            <p className="text-sm text-gray-300">
              {t('legal.risk_warning')}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {t('legal.not_financial_advice')}
            </p>
          </div>

          {/* Copyright */}
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              {t('legal.copyright')}
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <span className="text-gray-400 text-sm">{t('footer.social')}</span>
              <div className="flex space-x-2">
                <a 
                  href="https://x.com/econopulse" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <span className="sr-only">X</span>
                  X
                </a>
                <span className="text-gray-600">•</span>
                <a 
                  href="https://instagram.com/econopulse" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-pink-400 transition-colors"
                >
                  Instagram
                </a>
                <span className="text-gray-600">•</span>
                <a 
                  href="https://youtube.com/@econopulse" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  YouTube
                </a>
                <span className="text-gray-600">•</span>
                <a 
                  href="https://t.me/econopulse" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                >
                  Telegram
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
