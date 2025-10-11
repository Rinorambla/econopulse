import React from 'react';
import Footer from '@/components/Footer';
import { Cookie, Settings, AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Cookie className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Cookie Policy</h1>
            </div>
            <p className="text-gray-600">
              Last updated: August 22, 2025
            </p>
          </div>

          <div className="prose max-w-none">
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-900">What Are Cookies?</h2>
              </div>
              <p className="text-gray-700 mb-4">
                Cookies are small text files that are stored on your computer or mobile device when you 
                visit a website. They help websites remember information about your visit, making it 
                easier to visit the site again and make the site more useful to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Cookies</h2>
              <p className="text-gray-700 mb-4">
                We use cookies and similar technologies for several purposes:
              </p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>To enable certain functions of the service</li>
                <li>To provide analytics and improve our services</li>
                <li>To store your preferences and settings</li>
                <li>To personalize content and advertisements</li>
                <li>To enhance security and prevent fraud</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Types of Cookies We Use</h2>
              
              <div className="space-y-6">
                {/* Necessary Cookies */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h3 className="text-xl font-semibold text-gray-900">Necessary Cookies</h3>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      Always Active
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">
                    These cookies are essential for the website to function properly and cannot be disabled.
                  </p>
                  <div className="text-sm text-gray-600">
                    <p><strong>Purpose:</strong> Authentication, security, session management</p>
                    <p><strong>Duration:</strong> Session or up to 1 year</p>
                    <p><strong>Examples:</strong> Login status, CSRF protection, load balancing</p>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-semibold text-gray-900">Analytics Cookies</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      Optional
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">
                    These cookies help us understand how visitors interact with our website.
                  </p>
                  <div className="text-sm text-gray-600">
                    <p><strong>Purpose:</strong> Website analytics, performance monitoring</p>
                    <p><strong>Duration:</strong> Up to 2 years</p>
                    <p><strong>Examples:</strong> Google Analytics, page views, user behavior</p>
                    <p><strong>Third parties:</strong> Google Analytics, Hotjar</p>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="w-6 h-6 text-purple-600" />
                    <h3 className="text-xl font-semibold text-gray-900">Marketing Cookies</h3>
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                      Optional
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">
                    These cookies are used to deliver personalized advertisements and track their effectiveness.
                  </p>
                  <div className="text-sm text-gray-600">
                    <p><strong>Purpose:</strong> Targeted advertising, conversion tracking</p>
                    <p><strong>Duration:</strong> Up to 1 year</p>
                    <p><strong>Examples:</strong> Ad preferences, campaign tracking, remarketing</p>
                    <p><strong>Third parties:</strong> Google Ads, Facebook Pixel, LinkedIn</p>
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                    <h3 className="text-xl font-semibold text-gray-900">Functional Cookies</h3>
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                      Optional
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">
                    These cookies enable enhanced functionality and personalization features.
                  </p>
                  <div className="text-sm text-gray-600">
                    <p><strong>Purpose:</strong> Enhanced features, personalization</p>
                    <p><strong>Duration:</strong> Up to 1 year</p>
                    <p><strong>Examples:</strong> Language preferences, theme settings, chat widgets</p>
                    <p><strong>Third parties:</strong> Intercom, Zendesk, social media widgets</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Managing Your Cookie Preferences</h2>
              </div>
              <p className="text-gray-700 mb-4">
                You can manage your cookie preferences in several ways:
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Cookie Banner</h3>
                <p className="text-gray-700 mb-3">
                  When you first visit our website, you'll see a cookie banner where you can:
                </p>
                <ul className="list-disc pl-6 text-gray-700">
                  <li>Accept all cookies</li>
                  <li>Decline optional cookies</li>
                  <li>Customize your preferences by cookie type</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Cookie Settings Link</h3>
                <p className="text-gray-700 mb-3">
                  You can change your preferences at any time by clicking the "Cookie Settings" 
                  link in our website footer.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Browser Settings</h3>
                <p className="text-gray-700 mb-3">
                  Most web browsers allow you to control cookies through their settings:
                </p>
                <ul className="list-disc pl-6 text-gray-700">
                  <li>Block all cookies</li>
                  <li>Block third-party cookies</li>
                  <li>Delete existing cookies</li>
                  <li>Get notified when cookies are set</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Cookies</h2>
              <p className="text-gray-700 mb-4">
                Some cookies on our site are set by third-party services we use:
              </p>
              <ul className="list-disc pl-6 text-gray-700">
                <li><strong>Google Analytics:</strong> Web analytics service</li>
                <li><strong>Google Ads:</strong> Advertising platform</li>
                <li><strong>Facebook Pixel:</strong> Social media advertising</li>
                <li><strong>Intercom:</strong> Customer support chat</li>
                <li><strong>Stripe:</strong> Payment processing</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Do Not Track</h2>
              <p className="text-gray-700">
                Our website respects Do Not Track (DNT) signals. When DNT is enabled in your browser, 
                we will not set optional cookies or load third-party tracking services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Updates to This Policy</h2>
              <p className="text-gray-700">
                We may update this Cookie Policy from time to time to reflect changes in our practices 
                or applicable laws. We will post any updates on this page and update the effective date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about our use of cookies or this Cookie Policy, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> info@econopulse.ai<br />
                  <strong>Address:</strong> Viale Tassoni 1, Sassuolo (MO)<br />
                  <strong>Phone:</strong> +393519509674
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
