"use client";

// Inline the EconoAI page instead of re-export to avoid prerender boundary errors with usePathname in submodules.
import React, { useState, useEffect } from 'react';
import Footer from '@/components/Footer';
import RequirePlan from '@/components/RequirePlan';
import { useAuth } from '@/hooks/useAuth';
import {
	SparklesIcon,
	ChartBarIcon,
	NewspaperIcon,
	MagnifyingGlassIcon,
	ArrowTrendingUpIcon,
	CurrencyDollarIcon,
	ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

export default function EconoAIPage() {
	const { user } = useAuth();
	const [currentQuestion, setCurrentQuestion] = useState(0);
	const [typing, setTyping] = useState(false);
	const [userQuestion, setUserQuestion] = useState('');
	const [userAnswer, setUserAnswer] = useState('');
	const [isAsking, setIsAsking] = useState(false);
	const [error, setError] = useState('');
	const [online, setOnline] = useState(true);

	const demoQuestions = [
		"What's the outlook for AAPL next quarter?",
		"Should I buy NVDA at current levels?",
		"Which sectors are rotating into strength?",
		"Analyze my portfolio: MSFT 30%, GOOGL 25%, AMZN 20%, META 15%, TSLA 10%",
		"What are the best dividend stocks in Europe?",
		"Compare BABA vs JD fundamentals"
	];

	const demoAnswers = [
		'Based on recent earnings momentum and Services growth trajectory... (demo)',
		'NVDA trades at premium valuation; watch $495 breakout vs $450 support... (demo)',
		'Rotation favors Financials and Energy; Technology soft relative strength... (demo)',
		'Portfolio concentrated in tech; diversify into defensives and international ETFs... (demo)',
		'Top European dividend plays include TTE, SHEL, ULVR, plus growth names ASML, NVO... (demo)',
		'BABA vs JD: valuation discount vs operational efficiency; consider 60/40 JD/BABA... (demo)'
	];

	useEffect(() => {
		if (userQuestion || userAnswer) return;
		const id = setInterval(() => {
			setTyping(true);
			setTimeout(() => {
				setCurrentQuestion(q => (q + 1) % demoQuestions.length);
				setTyping(false);
			}, 600);
		}, 8000);
		return () => clearInterval(id);
	}, [userQuestion, userAnswer, demoQuestions.length]);

	const handleAsk = async () => {
		if (!userQuestion.trim() || isAsking) return;
		setIsAsking(true);
		setError('');
		setUserAnswer('');
		setTyping(true);
		try {
			const ctrl = new AbortController();
			const t = setTimeout(() => ctrl.abort(), 12000);
			const res = await fetch('/api/econoai/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question: userQuestion, userId: user?.id || 'anon' }),
				signal: ctrl.signal,
			}).catch(() => null);
			clearTimeout(t);
			let data: any = null;
			try { data = res && await res.json(); } catch {}
			if (data?.answer) {
				setUserAnswer(data.answer);
				setOnline(!data?.fallback);
			} else {
				setUserAnswer('Temporary issue retrieving full AI answer. Use price trend + earnings momentum + macro context. Try again soon.');
				setOnline(false);
			}
		} catch (e) {
			setUserAnswer('Network busy. Quick framework: identify regime, support/resistance, catalysts. Retry for full analysis.');
			setOnline(false);
		} finally {
			setTyping(false);
			setIsAsking(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleAsk();
		}
	};

	const capabilities = [
		{ icon: ChartBarIcon, title: 'Stock Picks & Analysis', description: 'AI screening, multi-factor scoring, timing signals.', examples: ['Best breakout stocks', 'Undervalued tech', 'Dividend momentum'] },
		{ icon: ArrowTrendingUpIcon, title: 'Market Trends & Flows', description: 'Rotation, options flow, momentum regime shifts.', examples: ['Sector rotation', 'Options flow unusual', 'Momentum leaders'] },
		{ icon: CurrencyDollarIcon, title: 'Earnings & Fundamentals', description: 'Quality, valuation, growth trajectory, peer compare.', examples: ['AAPL earnings view', 'Valuation compression', 'Quality screen'] },
		{ icon: MagnifyingGlassIcon, title: 'Technical Suggestions', description: 'Patterns, support/resistance, risk levels, setups.', examples: ['TSLA support', 'Breakout patterns', 'Oversold bounce'] },
		{ icon: NewspaperIcon, title: 'News & Catalysts', description: 'Headlines sentiment scoring & impact analysis.', examples: ['Fed impact', 'NVDA headlines', 'Macro catalysts'] },
		{ icon: SparklesIcon, title: 'Portfolio Review', description: 'Diversification, concentration, rebalancing, risk.', examples: ['Analyze my portfolio', 'Reduce risk', 'Add defensives'] },
	];

	const stats = [
		{ value: '5,000+', label: 'Stocks Covered' },
		{ value: '24/7', label: 'Real-Time Data' },
		{ value: '<2s', label: 'Response Time' },
		{ value: '95%', label: 'Accuracy Rate' },
	];

	return (
		<RequirePlan min="premium">
			<div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
				<section className="relative overflow-hidden pt-20 pb-24 px-6">
					<div className="max-w-7xl mx-auto relative z-10">
						<div className="text-center max-w-3xl mx-auto mb-16">
							<h1 className="text-5xl font-extrabold text-white mb-6 leading-tight">
								Your Personal Market Analyst,<br />
								<span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Powered by AI</span>
							</h1>
							<p className="text-xl text-white/70">Ask anything about stocks, sectors, earnings, technicals, or your portfolio.</p>
						</div>
						<div className="max-w-4xl mx-auto">
							<div className="rounded-2xl bg-slate-900/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden shadow-2xl">
								<div className="bg-slate-800/50 px-6 py-4 border-b border-white/10 flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
											<SparklesIcon className="w-5 h-5 text-white" />
										</div>
										<div>
											<h3 className="text-white font-semibold">EconoAI Assistant</h3>
											{online ? (
												<p className="text-xs text-emerald-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Online • Real-time</p>
											) : (
												<p className="text-xs text-amber-300 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Limited mode</p>
											)}
										</div>
									</div>
									<div className="text-xs text-white/50">Try it now ↓</div>
								</div>
								<div className="p-6 space-y-4 min-h-[320px] max-h-[400px] overflow-y-auto">
									{!userQuestion && !userAnswer && !error && (
										<div className="text-center py-8">
											<div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
												<SparklesIcon className="w-8 h-8 text-white" />
											</div>
											<h3 className="text-xl font-bold text-white mb-2">Ask me anything about markets!</h3>
											<p className="text-white/60 text-sm max-w-md mx-auto">Get instant AI-powered analysis.</p>
										</div>
									)}
									{error && (
										<div className="bg-red-900/30 border border-red-500/50 rounded-xl px-4 py-3 text-sm text-red-200">Error: {error}</div>
									)}
									{(userQuestion || (!error && !userAnswer)) && (
										<div className="flex justify-end">
											<div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-white text-sm">
												{userQuestion || demoQuestions[currentQuestion]}
											</div>
										</div>
									)}
									{!typing && (userAnswer || !userQuestion) && (
										<div className="flex gap-3">
											<div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
												<SparklesIcon className="w-4 h-4 text-white" />
											</div>
											<div className="flex-1 rounded-2xl rounded-tl-sm bg-slate-800/80 px-4 py-3 ring-1 ring-white/5">
												<p className="text-white/90 text-sm whitespace-pre-wrap">{userAnswer || demoAnswers[currentQuestion]}</p>
											</div>
										</div>
									)}
									{typing && (
										<div className="flex gap-3">
											<div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
												<SparklesIcon className="w-4 h-4 text-white" />
											</div>
											<div className="flex-1 rounded-2xl rounded-tl-sm bg-slate-800/80 px-4 py-3 ring-1 ring-white/5">
												<div className="flex gap-1">
													<span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
													<span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
													<span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
												</div>
											</div>
										</div>
									)}
								</div>
								<div className="bg-slate-800/30 px-6 py-4 border-t border-white/10">
									<div className="flex gap-3">
										<input
											type="text"
											value={userQuestion}
											onChange={e => setUserQuestion(e.target.value)}
											onKeyPress={handleKeyPress}
											placeholder="Ask about any stock, sector, trend..."
											className="flex-1 bg-slate-800 text-white placeholder:text-white/40 px-4 py-3 rounded-xl ring-1 ring-white/10 focus:ring-2 focus:ring-blue-500 outline-none"
											disabled={isAsking}
										/>
										<button
											onClick={handleAsk}
											disabled={isAsking || !userQuestion.trim()}
											className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 disabled:opacity-50"
										>
											<ChatBubbleLeftRightIcon className="w-5 h-5" />
											{isAsking ? 'Asking...' : 'Ask'}
										</button>
									</div>
									<div className="mt-2 text-xs text-white/50">
										{isAsking ? 'Analyzing...' : 'Press Enter to send'} {user && <span className="text-green-400 ml-2">Logged in</span>}
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>
				<section className="py-12 border-y border-white/5">
					<div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
						{stats.map(s => (
							<div key={s.label} className="text-center">
								<div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">{s.value}</div>
								<div className="text-sm text-white/60">{s.label}</div>
							</div>
						))}
					</div>
				</section>
				<section className="py-20 px-6">
					<div className="max-w-7xl mx-auto">
						<div className="text-center mb-16">
							<h2 className="text-4xl font-bold text-white mb-4">Everything you need for smarter investing</h2>
							<p className="text-lg text-white/60">From screening to portfolio analysis.</p>
						</div>
						<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
							{capabilities.map(c => (
								<div key={c.title} className="group rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-6 ring-1 ring-white/5 hover:ring-white/10 transition-all hover:scale-[1.02]">
									<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
										<c.icon className="w-6 h-6 text-white" />
									</div>
									<h3 className="text-white text-lg font-semibold mb-2">{c.title}</h3>
									<p className="text-white/60 text-sm mb-4 leading-relaxed">{c.description}</p>
									<div className="space-y-2">
										<p className="text-xs text-white/40 font-medium">Try asking:</p>
										{c.examples.map(ex => (
											<div key={ex} className="text-xs text-blue-400 bg-blue-500/5 px-3 py-1.5 rounded-lg ring-1 ring-blue-500/10">"{ex}"</div>
										))}
									</div>
								</div>
							))}
						</div>
					</div>
				</section>
				<Footer />
			</div>
		</RequirePlan>
	);
}
