import React from 'react';
import Footer from '@/components/Footer';
import { Shield, Users, Lock, FileText, Mail, Download } from 'lucide-react';

export default function GDPRCompliance() {
  return (
    <div className="min-h-screen bg-gray-50">
  {/* Navigation is provided globally by [locale]/layout.tsx */}
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">GDPR Compliance</h1>
            </div>
            <p className="text-gray-600">
              General Data Protection Regulation - Your Rights and Our Commitments
            </p>
          </div>

          <div className="prose max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Commitment to GDPR</h2>
              <p className="text-gray-700 mb-4">
                EconoPulse is committed to protecting your personal data and respecting your privacy rights 
                in accordance with the General Data Protection Regulation (GDPR) and other applicable data 
                protection laws.
              </p>
            </section>

            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Your Rights Under GDPR</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Access</h3>
                  <p className="text-gray-700 text-sm">
                    You have the right to request a copy of the personal data we hold about you.
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Rectification</h3>
                  <p className="text-gray-700 text-sm">
                    You can request that we correct any inaccurate personal data about you.
                  </p>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Erasure</h3>
                  <p className="text-gray-700 text-sm">
                    You can request that we delete your personal data in certain circumstances.
                  </p>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Restriction</h3>
                  <p className="text-gray-700 text-sm">
                    You can request that we restrict the processing of your personal data.
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Portability</h3>
                  <p className="text-gray-700 text-sm">
                    You can request to receive your data in a structured, machine-readable format.
                  </p>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Object</h3>
                  <p className="text-gray-700 text-sm">
                    You can object to processing of your data based on legitimate interests.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Legal Basis for Processing</h2>
              </div>
              <p className="text-gray-700 mb-4">
                We process your personal data based on the following legal bases:
              </p>
              <ul className="list-disc pl-6 text-gray-700">
                <li><strong>Contract:</strong> To provide our services and fulfill our contractual obligations</li>
                <li><strong>Consent:</strong> For marketing communications and optional features</li>
                <li><strong>Legitimate Interest:</strong> For analytics, security, and service improvement</li>
                <li><strong>Legal Obligation:</strong> To comply with applicable laws and regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Protection Measures</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Encryption</h3>
                    <p className="text-gray-700 text-sm">All data is encrypted in transit and at rest using industry-standard protocols.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Access Controls</h3>
                    <p className="text-gray-700 text-sm">Strict access controls ensure only authorized personnel can access personal data.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Regular Audits</h3>
                    <p className="text-gray-700 text-sm">We conduct regular security audits and compliance assessments.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain personal data only for as long as necessary to fulfill the purposes for which 
                it was collected, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Account data: Retained while account is active plus 3 years</li>
                <li>Transaction data: Retained for 7 years for tax and legal purposes</li>
                <li>Analytics data: Aggregated and anonymized after 26 months</li>
                <li>Marketing data: Deleted immediately upon withdrawal of consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">International Transfers</h2>
              <p className="text-gray-700 mb-4">
                When we transfer your data outside the EU, we ensure appropriate safeguards are in place:
              </p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Standard Contractual Clauses (SCCs)</li>
                <li>Adequacy decisions by the European Commission</li>
                <li>Binding Corporate Rules (BCRs)</li>
                <li>Certification schemes and codes of conduct</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Breach Notification</h2>
              <p className="text-gray-700">
                In the event of a data breach that poses a risk to your rights and freedoms, 
                we will notify the relevant supervisory authority within 72 hours and inform 
                affected individuals without undue delay.
              </p>
            </section>

            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-900">How to Exercise Your Rights</h2>
              </div>
              <p className="text-gray-700 mb-4">
                To exercise any of your GDPR rights, please contact us using the information below. 
                We will respond to your request within 30 days.
              </p>
              
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Our Data Protection Officer</h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Email:</strong> dpo@econopulse.com</p>
                  <p><strong>Address:</strong> Data Protection Officer<br />
                     EconoPulse Inc.<br />
                     1234 Financial District, Suite 567<br />
                     New York, NY 10001</p>
                  <p><strong>Phone:</strong> +1 (555) 123-4567</p>
                </div>
                
                <div className="mt-4">
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download Data Request Form
                  </button>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Supervisory Authority</h2>
              <p className="text-gray-700 mb-4">
                If you believe we have not handled your personal data in accordance with GDPR, 
                you have the right to lodge a complaint with your local supervisory authority.
              </p>
              <p className="text-gray-700">
                For EU residents, you can find your local authority at: 
                <a href="https://edpb.europa.eu/about-edpb/about-edpb/members_en" 
                   className="text-blue-600 hover:text-blue-700 underline ml-1">
                  European Data Protection Board
                </a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Updates to This Page</h2>
              <p className="text-gray-700">
                This GDPR compliance page is reviewed regularly and updated as needed to 
                reflect changes in our data processing practices or applicable regulations.
              </p>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
