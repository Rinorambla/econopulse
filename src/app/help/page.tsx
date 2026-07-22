"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

interface Faq { q: string; a: string }
interface FaqSection { category: string; items: Faq[] }

export default function HelpPage() {
	const email = "econopulse.info@econopulse.ai";
	const [query, setQuery] = useState("");
	const [openCat, setOpenCat] = useState<string | null>(null);

	const sections = useMemo<FaqSection[]>(
		() => [
			{
				category: "Getting Started",
				items: [
					{ q: "How do I get started?", a: "Create a free account with your email, verify it, then choose a plan (or start with the free tier). You will land on the dashboard and can immediately explore AI Pulse, Market Data and the other tools." },
					{ q: "Which browsers and devices are supported?", a: "EconoPulse works on all modern browsers (Chrome, Safari, Edge, Firefox) on desktop, tablet and mobile. The platform is fully responsive, and native iOS / Android apps are also available." },
					{ q: "Is there a mobile app?", a: "Yes — EconoPulse is available on the App Store (iOS) and Google Play (Android), with the same account and subscription working across web and mobile." },
					{ q: "I just subscribed but pages still look locked. What do I do?", a: "Sign out and sign back in to refresh your plan, or wait a few seconds and reload. If the problem persists, contact us and we will fix it right away." },
				],
			},
			{
				category: "Plans, Billing & Payments",
				items: [
					{ q: "What plans are available?", a: "Free (core market overview), Pro (real-time dashboard and full analytics) and Premium (everything in Pro plus AI Portfolio Builder, Market DNA, Visual AI and advanced AI analysis)." },
					{ q: "What is the difference between Pro and Premium?", a: "Pro includes the real-time dashboard and core features. Premium adds AI Portfolio Builder, Market DNA pattern analysis, Visual AI and the most advanced AI-driven tools." },
					{ q: "Do I need a credit card for the trial?", a: "Depending on the promotion, some trials may require a payment method. You can cancel anytime before renewal and you won't be charged." },
					{ q: "How do I upgrade or downgrade my plan?", a: "Go to the Pricing page or Account → Subscription and pick the new plan. Upgrades apply immediately; downgrades apply at the end of the current billing period." },
					{ q: "How do I cancel my subscription?", a: "Account → Subscription → Manage → Cancel. Access continues until the end of the paid period. You can also cancel via the Stripe customer portal linked in your account." },
					{ q: "Can I get a refund?", a: "If something went wrong with a charge, email us within 14 days and we will review it case by case in line with our Terms of Service." },
					{ q: "Which payment methods are accepted?", a: "All major credit and debit cards through Stripe. Payments are processed securely by Stripe — we never store your card details." },
					{ q: "Where can I find my invoices?", a: "Account → Subscription → Manage opens the Stripe customer portal where all invoices can be viewed and downloaded." },
				],
			},
			{
				category: "AI Pulse",
				items: [
					{ q: "What is AI Pulse?", a: "A real-time market terminal: S&P 500 heatmap with multiple timeframes, sector performance, stock screener, market breadth, AI insight (sentiment, regime, overheating), global indices, cross-asset tiles, economic calendar, earnings calendar with beats & misses, RRG sector rotation and live news." },
					{ q: "How fresh is the data?", a: "Quotes and movers refresh every few minutes automatically while the tab is open; the heatmap supports 1D to 1Y periods with instant switching; earnings and news refresh themselves — no manual refresh needed." },
					{ q: "What do the Earnings Calendar panels show?", a: "Upcoming earnings for the next 14 days (date, pre-market/after-close, consensus EPS) plus who beat or missed estimates in the last 7 days with surprise % and a sector beat-rate comparison." },
					{ q: "What is the Relative Rotation Graph (RRG)?", a: "A four-quadrant map (Leading, Weakening, Lagging, Improving) showing each S&P 500 sector's relative strength vs momentum across selectable timeframes, with a readable sector table below." },
					{ q: "What is the World Economic Cycle map?", a: "A world map classifying 60 economies into Reflation, Inflation, Stagflation or Recession using IMF nowcasts, World Bank data and live country-ETF market momentum with a confidence score." },
				],
			},
			{
				category: "Market Data Terminal",
				items: [
					{ q: "What can the chart do?", a: "Professional charting: candles/line/area, 40+ indicators (customizable), drawing tools saved per symbol, compare overlays, ratio charts (SPY/QQQ), FRED macro series, premarket/after-hours data, live updating candles and a 2×2 multi-chart grid." },
					{ q: "How do I search for any instrument?", a: "Use the search bar: stocks, ETFs, indices, forex, crypto, futures across global exchanges, plus FRED macro series (CPI, Fed Funds, unemployment…). Type a name or ticker and pick from the live suggestions." },
					{ q: "What is in the side panel?", a: "Three tabs: Watchlist (multiple lists, live quotes, alerts), News (live headlines for the active symbol) and Analysis (technical rating gauge, trend matrix, RSI/MACD/SMA posture and automatic support/resistance levels)." },
					{ q: "How do price alerts work?", a: "Open a symbol, set an alert level from the chart menu and you'll get an in-app notification when the price crosses it." },
					{ q: "Can I share or download a chart?", a: "Yes — from the chart actions menu you can download a PNG, copy the image to the clipboard or open it in a new tab, complete with the EconoPulse watermark and ticker." },
					{ q: "Are the charts real-time?", a: "Intraday charts poll live prices every ~15 seconds while the tab is visible (30s for daily), including premarket and after-hours sessions." },
				],
			},
			{
				category: "AI Tools",
				items: [
					{ q: "How does the AI Portfolio Builder work?", a: "It analyzes market conditions and your preferences (risk tolerance, horizon, goals) and generates a suggested allocation with reasoning. It is a research tool, not personalized financial advice." },
					{ q: "What is EconoAI?", a: "An AI chat assistant with live market data: ask about the economy, rates, inflation, valuations, sectors or single names and it answers using current data feeds." },
					{ q: "What is Market DNA?", a: "A pattern-recognition engine comparing today's cross-asset structure with historical regimes (2000, 2007, 2020…) including similarity scores, sector vulnerabilities, correlation anomalies and peak signals." },
					{ q: "What is Visual AI?", a: "A visual macro intelligence suite: global risk map with conflicts, shipping chokepoints and central banks, plus AI-generated visual insights across yields, real estate, PMI, trade and more." },
				],
			},
			{
				category: "Data & Sources",
				items: [
					{ q: "Where does the market data come from?", a: "We aggregate multiple institutional-grade sources: Yahoo Finance and Tiingo for prices, Nasdaq for earnings, FRED (St. Louis Fed) for macro series, IMF and World Bank for global economics — merged with automatic failover so data keeps flowing." },
					{ q: "Is the data delayed?", a: "Most equity quotes are real-time or near real-time (seconds). Macro series follow their official release schedule (FRED/IMF). Each panel refreshes automatically at the optimal frequency." },
					{ q: "Why does a symbol show no data?", a: "Very illiquid or recently listed instruments may lack history. Try the full ticker with exchange suffix (e.g. FTSEMIB.MI). If it still fails, tell us and we'll add coverage." },
				],
			},
			{
				category: "Account & Security",
				items: [
					{ q: "How do I reset my password?", a: "Use 'Forgot password' on the login page — you'll receive a secure reset link by email. Links expire for security, so request a new one if needed." },
					{ q: "How do I change my email address?", a: "Contact us from your registered address and we'll update it after verification." },
					{ q: "How do I delete my account?", a: "Account → Delete Account removes your account and all associated data permanently, or email us and we'll do it for you (GDPR compliant)." },
					{ q: "Is my data secure?", a: "Yes — connections are encrypted (TLS), payments handled by Stripe, authentication by Supabase with industry-standard hashing, and we never sell personal data. See the Privacy Policy for details." },
				],
			},
			{
				category: "Troubleshooting",
				items: [
					{ q: "A page is stuck on loading. What can I do?", a: "Reload the page first. If it persists: clear the browser cache, disable aggressive ad-blockers for econopulse.ai (they can block market data), or try another browser. Still stuck? Email us with the page URL." },
					{ q: "Why is a page protected or asking me to upgrade?", a: "Some sections require Pro or Premium. Sign in and check your plan under Account. If you believe your plan should grant access, sign out/in to refresh it." },
					{ q: "The chart looks cut off or empty.", a: "Resize the window or rotate the device once — the chart auto-fits. If a specific symbol stays empty, its data source may be temporarily down; try again in a minute." },
					{ q: "I found a bug — how do I report it?", a: "Email us with the page URL, what you expected, what happened and a screenshot if possible. We usually reply within one business day." },
				],
			},
			{
				category: "Legal",
				items: [
					{ q: "Is this financial advice?", a: "No. EconoPulse provides analytical tools, data and educational information only. Nothing on the platform is investment, legal or tax advice. Always do your own research." },
					{ q: "Where are the Terms and Privacy Policy?", a: "Links to Terms of Service, Privacy Policy, Cookie Policy and Disclaimer are in the footer of every page." },
				],
			},
		],
		[]
	);

	const filtered = useMemo(() => {
		const ql = query.trim().toLowerCase();
		if (!ql) return sections;
		return sections
			.map((s) => ({
				...s,
				items: s.items.filter(({ q, a }) => q.toLowerCase().includes(ql) || a.toLowerCase().includes(ql)),
			}))
			.filter((s) => s.items.length > 0);
	}, [sections, query]);

	const totalShown = filtered.reduce((n, s) => n + s.items.length, 0);

	return (
		<div className="min-h-screen bg-white">
			<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				{/* Back to home */}
				<div className="mb-6">
					<Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700">
						<span className="mr-2">←</span>
						<span>Home</span>
					</Link>
				</div>

				<div className="prose prose-lg max-w-none">
					<h1 className="text-4xl font-bold text-gray-900 mb-2">Help Center</h1>
					<p className="text-gray-700 mb-6">
						Everything about plans, features, data and your account. Search below or browse by topic.
					</p>
				</div>

				{/* Search */}
				<div className="mb-4">
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search help topics (e.g. cancel, alerts, earnings, refund)…"
						className="w-full max-w-2xl px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-white"
						aria-label="Search help topics"
						autoFocus
					/>
					{query.trim() && (
						<p className="mt-2 text-sm text-gray-500">{totalShown} result{totalShown === 1 ? "" : "s"}</p>
					)}
				</div>

				{/* Quick category chips */}
				{!query.trim() && (
					<div className="mb-8 flex flex-wrap gap-2">
						{sections.map((s) => (
							<button
								key={s.category}
								onClick={() => setOpenCat(openCat === s.category ? null : s.category)}
								className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
									openCat === s.category
										? "bg-blue-600 border-blue-600 text-white"
										: "border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600"
								}`}
							>
								{s.category}
							</button>
						))}
					</div>
				)}

				{/* FAQ sections */}
				<div className="space-y-8">
					{filtered.length === 0 && (
						<div className="text-gray-600">No results. Try a different keyword, or email us below.</div>
					)}
					{filtered
						.filter((s) => query.trim() || !openCat || s.category === openCat)
						.map((s) => (
							<section key={s.category}>
								<h2 className="text-xl font-bold text-gray-900 mb-3">{s.category}</h2>
								<div className="space-y-3">
									{s.items.map((item, idx) => (
										<details key={idx} className="border border-gray-200 rounded-lg bg-white group" open={!!query.trim()}>
											<summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
												<span className="text-base font-semibold text-gray-900">{item.q}</span>
												<span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
											</summary>
											<p className="px-4 pb-4 text-gray-700">{item.a}</p>
										</details>
									))}
								</div>
							</section>
						))}
				</div>

				{/* Contact at bottom (email only) */}
				<div className="prose prose-lg max-w-none mt-12">
					<h2 className="text-2xl font-bold text-gray-900 mb-4">Still need help?</h2>
					<div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
						<p className="text-sm uppercase tracking-wide text-gray-600 mb-1">Contact us</p>
						<a href={`mailto:${email}`} className="text-blue-600 hover:text-blue-700 break-all text-lg font-medium">
							{email}
						</a>
						<p className="text-sm text-gray-500 mt-2">We usually reply within one business day.</p>
					</div>
				</div>
			</main>

			<Footer />
		</div>
	);
}
