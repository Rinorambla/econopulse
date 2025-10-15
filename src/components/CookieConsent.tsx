'use client';

import React, { useState, useEffect } from 'react';
import { X, Cookie, Settings, CheckCircle, AlertCircle } from 'lucide-react';

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

interface CookieConsentProps {
  onAccept?: () => void;
  onDecline?: () => void;
  onCustomize?: () => void;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ 
  onAccept, 
  onDecline, 
  onCustomize 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    functional: false
  });

  // Add a global function to reset cookies for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).resetCookieConsent = () => {
        localStorage.removeItem('cookie-consent');
        console.log('🍪 Cookie consent reset');
        setIsVisible(true);
      };
    }
  }, []);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    console.log('🍪 Cookie consent check:', consent);
    
    if (!consent) {
      // Show banner after a short delay
      console.log('🍪 No consent found, showing banner');
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      console.log('🍪 Consent already exists:', JSON.parse(consent));
    }
  }, []);

  const handleAcceptAll = () => {
    const consentData = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    localStorage.setItem('cookie-consent', JSON.stringify(consentData));
    setIsVisible(false);
    onAccept?.();
    
    // Set analytics cookies
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted',
        'ad_storage': 'granted',
        'functionality_storage': 'granted'
      });
    }
  };

  const handleDeclineAll = () => {
    const consentData = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    localStorage.setItem('cookie-consent', JSON.stringify(consentData));
    setIsVisible(false);
    onDecline?.();
  };

  const handleCustomSave = () => {
    const consentData = {
      ...preferences,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    localStorage.setItem('cookie-consent', JSON.stringify(consentData));
    setIsVisible(false);
    onCustomize?.();
    
    // Update consent based on preferences
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': preferences.analytics ? 'granted' : 'denied',
        'ad_storage': preferences.marketing ? 'granted' : 'denied',
        'functionality_storage': preferences.functional ? 'granted' : 'denied'
      });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-4xl w-full pointer-events-auto">
        {!showDetails ? (
          // Simple Banner
          <div className="p-6">
            <div className="flex items-start gap-4">
              <Cookie className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  🍪 We use cookies to enhance your experience
                </h3>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                  We use essential cookies to make our site work. We'd also like to set analytics 
                  and marketing cookies to help us improve our website and show you personalized content. 
                  You can manage your preferences or learn more in our{' '}
                  <a href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                    Privacy Policy
                  </a> and{' '}
                  <a href="/cookies" className="text-blue-400 hover:text-blue-300 underline">
                    Cookie Policy
                  </a>.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleAcceptAll}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={handleDeclineAll}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Decline All
                  </button>
                  <button
                    onClick={() => setShowDetails(true)}
                    className="border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Customize
                  </button>
                </div>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          // Detailed Settings
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-semibold text-white">
                  Cookie Preferences
                </h3>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Necessary Cookies */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <h4 className="font-semibold text-white">Necessary Cookies</h4>
                    <span className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded">
                      Always Active
                    </span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">
                  These cookies are essential for the website to function and cannot be disabled.
                  They include session management, security features, and basic functionality.
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-400" />
                    <h4 className="font-semibold text-white">Analytics Cookies</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences(prev => ({ 
                        ...prev, 
                        analytics: e.target.checked 
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-gray-400 text-sm">
                  Help us understand how visitors interact with our website through 
                  Google Analytics and similar tools. This data helps us improve our services.
                </p>
              </div>

              {/* Marketing Cookies */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-purple-400" />
                    <h4 className="font-semibold text-white">Marketing Cookies</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences(prev => ({ 
                        ...prev, 
                        marketing: e.target.checked 
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-gray-400 text-sm">
                  Used to deliver personalized advertisements and track their effectiveness. 
                  These cookies may be set by third-party advertising partners.
                </p>
              </div>

              {/* Functional Cookies */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    <h4 className="font-semibold text-white">Functional Cookies</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={(e) => setPreferences(prev => ({ 
                        ...prev, 
                        functional: e.target.checked 
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-gray-400 text-sm">
                  Enable enhanced functionality like chat widgets, social media features, 
                  and personalized content recommendations.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={handleCustomSave}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Save Preferences
              </button>
              <button
                onClick={handleAcceptAll}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Accept All
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Back to Simple View
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-xs">
                You can change your preferences at any time by clicking the cookie settings 
                link in our footer. For more information, please read our{' '}
                <a href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="/cookies" className="text-blue-400 hover:text-blue-300 underline">
                  Cookie Policy
                </a>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CookieConsent;
