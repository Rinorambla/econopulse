'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Footer from '@/components/Footer';
import { AlertTriangle, TrendingUp, BookOpen, Shield } from 'lucide-react';

export default function Disclaimer() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <h1 className="text-4xl font-bold text-gray-900">
                Financial Disclaimer
              </h1>
            </div>
            <p className="text-gray-600">
              Last updated: August 23, 2025
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            {/* Main Warning */}
            <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-8">
              <div className="flex items-center mb-3">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
                <h2 className="text-xl font-bold text-red-800 m-0">Important Risk Warning</h2>
              </div>
              <p className="text-red-700 mb-3 font-medium">
                Trading and investing in financial markets involves substantial risk of loss and is not suitable for all investors. 
                You may lose some or all of your invested capital.
              </p>
              <ul className="list-disc pl-6 text-red-700 space-y-1">
                <li>Past performance is not indicative of future results</li>
                <li>Market conditions can change rapidly and unpredictably</li>
                <li>All investment decisions should be made independently</li>
                <li>Seek professional advice before making investment decisions</li>
              </ul>
            </div>

            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Nature of Our Service</h2>
              </div>
              <p className="text-gray-700 mb-4">
                EconoPulse.ai is an educational and analytical platform that provides:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Market Analysis:</strong> Statistical analysis and data visualization tools</li>
                <li><strong>Educational Content:</strong> Information about financial markets and economic indicators</li>
                <li><strong>Research Tools:</strong> Analytical tools to help you conduct your own research</li>
                <li><strong>Data Aggregation:</strong> Collection and presentation of publicly available market data</li>
              </ul>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 font-medium">
                  <strong>We are NOT:</strong> Investment advisors, financial planners, brokers, or registered investment advisors.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Investment Risks</h2>
              </div>
              <p className="text-gray-700 mb-4">
                All forms of investment carry risk, including but not limited to:
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Market Risk</h3>
                  <p className="text-gray-700 text-sm">
                    The risk that investments will decline in value due to market conditions, 
                    economic factors, or geopolitical events.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Liquidity Risk</h3>
                  <p className="text-gray-700 text-sm">
                    The risk that you may not be able to sell your investments quickly 
                    or at fair market value when needed.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Currency Risk</h3>
                  <p className="text-gray-700 text-sm">
                    For international investments, changes in exchange rates can 
                    affect the value of your investments.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Volatility Risk</h3>
                  <p className="text-gray-700 text-sm">
                    Investment values can fluctuate significantly over short periods, 
                    potentially resulting in substantial losses.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Investment Advice</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-4">
                <p className="text-yellow-800 mb-3">
                  <strong>The information provided on EconoPulse.ai is for educational and informational purposes only.</strong>
                </p>
                <ul className="list-disc pl-6 text-yellow-700 space-y-1">
                  <li>We do not provide personalized investment advice</li>
                  <li>Our content should not be considered as recommendations to buy or sell securities</li>
                  <li>Any analysis or commentary is general in nature and not tailored to individual circumstances</li>
                  <li>You should always conduct your own research and due diligence</li>
                </ul>
              </div>
              
              <p className="text-gray-700 mb-4">
                Before making any investment decisions, you should:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Consult with qualified financial professionals</li>
                <li>Consider your individual financial situation and risk tolerance</li>
                <li>Read all relevant prospectuses and offering documents</li>
                <li>Understand the costs and fees associated with any investment</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Accuracy and Timeliness</h2>
              <p className="text-gray-700 mb-4">
                While we strive to provide accurate and timely information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Market data may be delayed or contain errors</li>
                <li>Third-party data sources may be inaccurate or incomplete</li>
                <li>Technical issues may affect data delivery or accuracy</li>
                <li>We do not guarantee the accuracy, completeness, or timeliness of any information</li>
                <li>You should verify all information independently before making decisions</li>
              </ul>
            </section>

            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Limitation of Liability</h2>
              </div>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by law:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>EconoPulse.ai and its affiliates shall not be liable for any investment losses</li>
                <li>We disclaim all warranties, express or implied, regarding our services</li>
                <li>Our total liability shall not exceed the amount you paid for our services</li>
                <li>We shall not be liable for indirect, consequential, or punitive damages</li>
              </ul>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 font-medium">
                  You acknowledge that you use our services at your own risk and that any investment 
                  decisions are made independently based on your own judgment and research.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Regulatory Compliance</h2>
              <p className="text-gray-700 mb-4">
                EconoPulse.ai operates as an educational technology platform and is not:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Registered as an investment advisor with any regulatory authority</li>
                <li>Licensed to provide investment advice or financial planning services</li>
                <li>Authorized to execute trades or hold client funds</li>
                <li>Subject to regulatory oversight as a financial services provider</li>
              </ul>
              
              <p className="text-gray-700 mb-4">
                If you require regulated financial advice, please consult with:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Licensed financial advisors</li>
                <li>Registered investment advisors</li>
                <li>Certified financial planners</li>
                <li>Other qualified financial professionals</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Content</h2>
              <p className="text-gray-700 mb-4">
                Our platform may include content, data, or links from third-party sources:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>We do not endorse or verify third-party content</li>
                <li>Third-party opinions do not represent our views</li>
                <li>External links are provided for convenience only</li>
                <li>We are not responsible for third-party content or services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Updates to This Disclaimer</h2>
              <p className="text-gray-700 mb-4">
                We may update this disclaimer periodically to reflect changes in our services, 
                applicable laws, or market conditions. Please review this page regularly to stay 
                informed of any changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about this disclaimer or our services, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> econopulse.info@econopulse.ai<br />
                  <strong>Address:</strong> Viale Tassoni 1, Sassuolo (MO), Italy<br />
                  <strong>Phone:</strong> +393519509674
                </p>
              </div>
            </section>

            <div className="border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-600 italic">
                By using EconoPulse.ai, you acknowledge that you have read, understood, and agreed 
                to this disclaimer. You confirm that you are using our services for educational 
                and research purposes and that you will make all investment decisions independently.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
