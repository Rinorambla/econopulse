"use client";

import React from "react";
import Footer from "@/components/Footer";

export default function PrivacyPolicy() {
	return (
		<div className="min-h-screen bg-white">
			<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="prose prose-lg max-w-none">
					<h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
					<p className="text-gray-600 mb-8">Last updated: May 8, 2026</p>

					<section className="mb-8">
						<h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
						<p className="text-gray-700 mb-4">
							We collect information you provide directly to us, such as when you create an account,
							subscribe to our services, or contact us for support.
						</p>
						<ul className="list-disc pl-6 text-gray-700 mb-4">
							<li><strong>Account information</strong>: name (optional), email address, password (hashed)</li>
							<li><strong>Financial inputs</strong>: portfolios, watchlists, holdings you add to track investments</li>
							<li><strong>Payment information</strong>: processed exclusively by Stripe (web) or Apple StoreKit (iOS in-app); we never store card numbers</li>
							<li><strong>Usage data</strong>: product interactions (features used, watchlist items) to operate the service</li>
							<li><strong>Diagnostics</strong>: anonymous crash and performance reports</li>
							<li><strong>Communications</strong>: messages you send to econopulse.info@econopulse.ai</li>
						</ul>
						<p className="text-gray-700 mb-4">
							We do <strong>not</strong> collect: precise location, contacts, photos, health data, browsing history, or
							advertising identifiers (IDFA). The mobile app does <strong>not</strong> use cross-app tracking.
						</p>
					</section>

					<section className="mb-8">
						<h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
						<ul className="list-disc pl-6 text-gray-700 mb-4">
							<li>To provide, maintain, and improve our services</li>
							<li>To process transactions and send related information</li>
							<li>To send technical notices and support messages</li>
							<li>To communicate with you about products, services, and events (only with consent)</li>
							<li>To monitor and analyze aggregate, non-identifying usage patterns</li>
						</ul>
					</section>

					<section className="mb-8">
						<h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Services (Sub-processors)</h2>
						<p className="text-gray-700 mb-4">
							We do not sell your personal information. We share limited data with the following
							sub-processors strictly to operate the service:
						</p>
						<ul className="list-disc pl-6 text-gray-700 mb-4">
							<li><strong>Supabase</strong> (database & authentication) — stores your account, profile and portfolio data</li>
							<li><strong>Stripe</strong> (payments) — processes subscriptions on the web; receives email and payment details</li>
							<li><strong>Apple StoreKit</strong> (in-app purchases) — handles iOS subscriptions per Apple's terms</li>
							<li><strong>OpenAI</strong> (AI analysis) — receives anonymized market queries (symbols, time ranges); never receives your name, email, password or portfolio holdings</li>
							<li><strong>Vercel</strong> (hosting & CDN) — receives standard request logs (IP, user-agent) for security and reliability</li>
							<li><strong>MongoDB Atlas</strong> (market data cache) — stores public market data only (no user data)</li>
							<li><strong>Google Analytics</strong> (web only, opt-in) — activated only after you accept analytics cookies on the website; not active in the mobile apps</li>
						</ul>
						<p className="text-gray-700 mb-4">
							We may also disclose information to comply with legal obligations, to protect our rights,
							or to prevent fraud.
						</p>
					</section>

					<section className="mb-8">
						<h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Security</h2>
						<p className="text-gray-700 mb-4">
							We implement appropriate security measures to protect your personal information against
							unauthorized access, alteration, disclosure, or destruction. This includes:
						</p>
						<ul className="list-disc pl-6 text-gray-700 mb-4">
							<li>Encryption of data in transit (TLS) and at rest</li>
							<li>Regular security assessments</li>
							<li>Access controls and authentication</li>
							<li>Secure payment processing through Stripe and Apple</li>
						</ul>
					</section>

					<section className="mb-8">
						<h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retention</h2>
						<p className="text-gray-700 mb-4">
							We retain your account data for as long as your account is active. When you delete your
							account, all personal data, portfolios and preferences are erased within 30 days, except
							where we are legally required to retain some records (e.g. invoices, anti-fraud logs).
						</p>
					</section>

					<section className="mb-8">
						<h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights</h2>
						<p className="text-gray-700 mb-4">Under GDPR and similar laws, you have the right to:</p>
						<ul className="list-disc pl-6 text-gray-700 mb-4">
							<li>Access and update your personal information</li>
							<li><strong>Delete your account and all associated data</strong> directly from your account settings (Account &rarr; Delete Account) or by emailing <a href="mailto:econopulse.info@econopulse.ai" className="text-blue-600 underline">econopulse.info@econopulse.ai</a></li>
							<li>Opt out of marketing communications</li>
							<li>Request a copy of your data (data portability)</li>
							<li>Object to or restrict processing of your data</li>
							<li>Lodge a complaint with your local data protection authority</li>
						</ul>
					</section>

					<section className="mb-8">
						<h2 className="text-2xl font-semibold text-gray-900 mb-4">Children's Privacy</h2>
						<p className="text-gray-700 mb-4">
							EconoPulse is not directed to children under 16. We do not knowingly collect personal
							information from children. If you believe a child has provided us data, please contact us
							and we will delete it.
						</p>
					</section>

					<section className="mb-8">
						<h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookies and Tracking</h2>
						<p className="text-gray-700 mb-4">
							On the website, we use essential cookies (always on) and optional analytics cookies
							(opt-in via the cookie banner). The mobile apps do <strong>not</strong> use third-party
							tracking SDKs and do <strong>not</strong> request the App Tracking Transparency prompt.
						</p>
					</section>

					<section className="mb-8">
						<h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Policy</h2>
						<p className="text-gray-700 mb-4">
							We may update this Privacy Policy from time to time. We will notify you of any material
							changes by posting the new policy on this page and updating the "Last updated" date.
						</p>
					</section>

					<section className="mb-8">
						<h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
						<p className="text-gray-700 mb-4">If you have any questions about this Privacy Policy, please contact us at:</p>
						<div className="bg-gray-50 p-4 rounded-lg">
							<p className="text-gray-700">
								Email: <a href="mailto:econopulse.info@econopulse.ai" className="text-blue-600 underline">econopulse.info@econopulse.ai</a>
								<br />EconoPulse
								<br />Via Tassoni 1
								<br />41049 Sassuolo (MO), Italy
							</p>
						</div>
					</section>
				</div>
			</main>

			<Footer />
		</div>
	);
}
