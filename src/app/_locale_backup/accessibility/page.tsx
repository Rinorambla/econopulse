import React from 'react';
import Footer from '@/components/Footer';
import { Eye, Keyboard, Monitor, Volume2, Settings, Heart } from 'lucide-react';

export default function AccessibilityStatement() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Accessibility Statement</h1>
            </div>
            <p className="text-gray-600">
              Our commitment to making EconoPulse accessible to everyone
            </p>
          </div>

          <div className="prose max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Commitment</h2>
              <p className="text-gray-700 mb-4">
                EconoPulse is committed to ensuring digital accessibility for people with disabilities. 
                We are continually improving the user experience for everyone and applying the relevant 
                accessibility standards to achieve these goals.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Conformance Status</h2>
              <p className="text-gray-700 mb-4">
                The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and 
                developers to improve accessibility for people with disabilities. It defines three levels 
                of conformance: Level A, Level AA, and Level AAA.
              </p>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-gray-900 font-semibold">
                  EconoPulse is partially conformant with WCAG 2.1 level AA.
                </p>
                <p className="text-gray-700 text-sm mt-2">
                  "Partially conformant" means that some parts of the content do not fully 
                  conform to the accessibility standard.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Accessibility Features</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Keyboard className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Keyboard Navigation</h3>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Full keyboard navigation support with visible focus indicators and logical tab order.
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Screen Reader Support</h3>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Semantic HTML, ARIA labels, and descriptive text for screen reader compatibility.
                  </p>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="w-5 h-5 text-yellow-600" />
                    <h3 className="text-lg font-semibold text-gray-900">High Contrast</h3>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Color choices meet WCAG AA contrast ratios for better readability.
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Alternative Text</h3>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Comprehensive alt text for images, charts, and graphical content.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Additional Accessibility Measures</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span><strong>Responsive Design:</strong> Our website adapts to different screen sizes and zoom levels up to 200%.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span><strong>Clear Navigation:</strong> Consistent navigation structure with skip links and breadcrumbs.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span><strong>Form Labels:</strong> All form fields have clear, descriptive labels and error messages.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span><strong>Time Limits:</strong> Extended time limits or options to turn off time limits where applicable.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span><strong>Motion Controls:</strong> Options to reduce motion and disable auto-playing content.</span>
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Known Issues</h2>
              <p className="text-gray-700 mb-4">
                We are aware of some accessibility issues and are actively working to resolve them:
              </p>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <ul className="space-y-2 text-gray-700">
                  <li>• Some interactive charts may have limited screen reader support</li>
                  <li>• Video content may not have complete captions (being addressed)</li>
                  <li>• Some third-party embedded content may not fully meet accessibility standards</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Assessment Approach</h2>
              <p className="text-gray-700 mb-4">
                EconoPulse assessed the accessibility of this website by the following approaches:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Self-evaluation:</strong> Regular internal audits by our development team</li>
                <li><strong>External evaluation:</strong> Third-party accessibility consultants</li>
                <li><strong>User testing:</strong> Testing with users who have disabilities</li>
                <li><strong>Automated testing:</strong> Using accessibility testing tools and browser extensions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Technologies Used</h2>
              <p className="text-gray-700 mb-4">
                This website relies on the following technologies to work with the particular 
                combination of web browser and any assistive technologies or plugins installed:
              </p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>HTML5</li>
                <li>WAI-ARIA</li>
                <li>CSS3</li>
                <li>JavaScript</li>
                <li>React</li>
                <li>Next.js</li>
              </ul>
            </section>

            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-6 h-6 text-red-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Feedback</h2>
              </div>
              <p className="text-gray-700 mb-4">
                We welcome your feedback on the accessibility of EconoPulse. Please let us know 
                if you encounter accessibility barriers on our website.
              </p>
              
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Email:</strong> accessibility@econopulse.com</p>
                  <p><strong>Phone:</strong> +1 (555) 123-4567</p>
                  <p><strong>Address:</strong> Accessibility Team<br />
                     EconoPulse Inc.<br />
                     1234 Financial District, Suite 567<br />
                     New York, NY 10001</p>
                </div>
                
                <p className="text-sm text-gray-600 mt-4">
                  We try to respond to feedback within 2 business days.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Formal Complaints</h2>
              <p className="text-gray-700 mb-4">
                If you are not satisfied with our response to your accessibility concern, you may 
                file a formal complaint with:
              </p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>U.S. Department of Justice (for ADA compliance)</li>
                <li>Your local disability rights organization</li>
                <li>The relevant government accessibility office in your jurisdiction</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Ongoing Efforts</h2>
              <p className="text-gray-700 mb-4">
                EconoPulse is committed to continuous improvement of accessibility. Our ongoing efforts include:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li>• Regular accessibility training for our development team</li>
                <li>• Incorporating accessibility testing into our development process</li>
                <li>• Working with accessibility consultants to identify and address issues</li>
                <li>• Gathering feedback from users with disabilities to improve our services</li>
                <li>• Staying current with accessibility best practices and guidelines</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Last Updated</h2>
              <p className="text-gray-700">
                This accessibility statement was last reviewed and updated on {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}.
              </p>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
