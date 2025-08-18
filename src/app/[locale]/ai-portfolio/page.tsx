'use client';

import { useState } from 'react';
import { ArrowLeftIcon, SparklesIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { NavigationLink } from '@/components/Navigation';
import Footer from '@/components/Footer';

interface Portfolio {
  name: string;
  type: string;
  allocation: Array<{
    symbol: string;
    name: string;
    percentage: number;
    rationale: string;
  }>;
  riskProfile: string;
  expectedReturn: string;
  timeHorizon: string;
  description: string;
}

const mockPortfolios: Portfolio[] = [
  {
    name: "AI Growth Portfolio",
    type: "Technology Growth",
    allocation: [
      { symbol: "QQQ", name: "Invesco QQQ ETF", percentage: 30, rationale: "Nasdaq-100 tech exposure with diversification" },
      { symbol: "NVDA", name: "NVIDIA Corp", percentage: 15, rationale: "AI infrastructure and semiconductor leader" },
      { symbol: "MSFT", name: "Microsoft Corp", percentage: 12, rationale: "Cloud computing and AI integration" },
      { symbol: "GOOGL", name: "Alphabet Inc", percentage: 10, rationale: "Search, cloud, and AI innovation" },
      { symbol: "VTI", name: "Vanguard Total Stock Market", percentage: 15, rationale: "Broad US market diversification" },
      { symbol: "VXUS", name: "Vanguard Total International", percentage: 10, rationale: "International diversification" },
      { symbol: "BND", name: "Vanguard Total Bond Market", percentage: 8, rationale: "Fixed income stability" }
    ],
    riskProfile: "High",
    expectedReturn: "8-12%",
    timeHorizon: "7+ years",
    description: "Tech-focused growth portfolio with proper diversification across asset classes"
  },
  {
    name: "Dividend Income Portfolio",
    type: "Income Focused",
    allocation: [
      { symbol: "VYM", name: "Vanguard High Dividend Yield", percentage: 25, rationale: "High-quality dividend stocks" },
      { symbol: "SCHD", name: "Schwab US Dividend Equity", percentage: 20, rationale: "Dividend growth focus" },
      { symbol: "JNJ", name: "Johnson & Johnson", percentage: 12, rationale: "Healthcare dividend aristocrat" },
      { symbol: "PG", name: "Procter & Gamble", percentage: 10, rationale: "Consumer staples stability" },
      { symbol: "BND", name: "Vanguard Total Bond Market", percentage: 15, rationale: "Fixed income component" },
      { symbol: "VGIT", name: "Vanguard Intermediate Treasury", percentage: 10, rationale: "Government bond safety" },
      { symbol: "O", name: "Realty Income Corp", percentage: 8, rationale: "Monthly dividend REIT" }
    ],
    riskProfile: "Medium",
    expectedReturn: "5-8%",
    timeHorizon: "3-10 years",
    description: "Income-focused portfolio emphasizing dividend growth and capital preservation"
  },
  {
    name: "Balanced Global Portfolio",
    type: "Diversified Growth",
    allocation: [
      { symbol: "VTI", name: "Vanguard Total Stock Market", percentage: 40, rationale: "Core US equity exposure" },
      { symbol: "VXUS", name: "Vanguard Total International", percentage: 20, rationale: "International diversification" },
      { symbol: "BND", name: "Vanguard Total Bond Market", percentage: 20, rationale: "Fixed income stability" },
      { symbol: "VNQ", name: "Vanguard Real Estate ETF", percentage: 8, rationale: "Real estate diversification" },
      { symbol: "VGT", name: "Vanguard Information Technology", percentage: 7, rationale: "Tech sector growth" },
      { symbol: "IAU", name: "iShares Gold Trust", percentage: 5, rationale: "Inflation hedge and diversification" }
    ],
    riskProfile: "Medium",
    expectedReturn: "6-9%",
    timeHorizon: "5-15 years",
    description: "Well-balanced global portfolio with proper asset allocation across stocks, bonds, and alternatives"
  },
  {
    name: "Conservative Income",
    type: "Capital Preservation",
    allocation: [
      { symbol: "BND", name: "Vanguard Total Bond Market", percentage: 40, rationale: "High-grade bond exposure" },
      { symbol: "VGSH", name: "Vanguard Short Treasury", percentage: 20, rationale: "Short-term treasury safety" },
      { symbol: "VYM", name: "Vanguard High Dividend Yield", percentage: 20, rationale: "Stable dividend income" },
      { symbol: "VTI", name: "Vanguard Total Stock Market", percentage: 15, rationale: "Limited equity exposure" },
      { symbol: "VTEB", name: "Vanguard Tax-Exempt Bond", percentage: 5, rationale: "Tax-efficient income" }
    ],
    riskProfile: "Low",
    expectedReturn: "3-6%",
    timeHorizon: "1-5 years",
    description: "Conservative portfolio prioritizing capital preservation with steady income generation"
  },
  {
    name: "ESG Sustainable Growth",
    type: "Sustainable Investing",
    allocation: [
      { symbol: "ESGV", name: "Vanguard ESG US Stock ETF", percentage: 35, rationale: "Sustainable US equity exposure" },
      { symbol: "ESGD", name: "iShares MSCI EAFE ESG Select", percentage: 20, rationale: "International ESG investing" },
      { symbol: "ICLN", name: "iShares Clean Energy ETF", percentage: 15, rationale: "Clean energy sector focus" },
      { symbol: "ESGE", name: "iShares MSCI Emerging ESG", percentage: 10, rationale: "Emerging markets ESG" },
      { symbol: "SUSC", name: "iShares MSCI KLD 400 Social", percentage: 10, rationale: "Social responsibility focus" },
      { symbol: "EAGG", name: "iShares ESG Aware Aggregate Bond", percentage: 10, rationale: "ESG-compliant fixed income" }
    ],
    riskProfile: "Medium-High",
    expectedReturn: "7-11%",
    timeHorizon: "5+ years",
    description: "Sustainable investing focused on ESG (Environmental, Social, Governance) criteria"
  },
  {
    name: "Small Cap Value",
    type: "Value Investing",
    allocation: [
      { symbol: "VBR", name: "Vanguard Small Cap Value", percentage: 30, rationale: "Small cap value premium" },
      { symbol: "VTV", name: "Vanguard Value ETF", percentage: 25, rationale: "Large cap value stocks" },
      { symbol: "VTWO", name: "Vanguard Russell 2000", percentage: 15, rationale: "Small cap diversification" },
      { symbol: "BRK.B", name: "Berkshire Hathaway", percentage: 10, rationale: "Warren Buffett's value approach" },
      { symbol: "VWO", name: "Vanguard Emerging Markets", percentage: 10, rationale: "Emerging market value" },
      { symbol: "BND", name: "Vanguard Total Bond Market", percentage: 10, rationale: "Fixed income component" }
    ],
    riskProfile: "Medium-High",
    expectedReturn: "7-12%",
    timeHorizon: "5-10 years",
    description: "Value-focused portfolio targeting undervalued small and mid-cap opportunities"
  }
];

// Portfolio Analysis Functions
const calculateDiversificationScore = (portfolio: Portfolio): number => {
  const allocations = portfolio.allocation;
  const numHoldings = allocations.length;
  
  // Calculate concentration risk (max single position)
  const maxPosition = Math.max(...allocations.map(a => a.percentage));
  
  // Diversification score based on number of holdings and concentration
  let score = 50; // Base score
  
  // Bonus for number of holdings
  if (numHoldings >= 6) score += 20;
  else if (numHoldings >= 4) score += 10;
  
  // Penalty for concentration
  if (maxPosition > 30) score -= 20;
  else if (maxPosition > 20) score -= 10;
  
  // Check for different asset classes (ETFs vs individual stocks)
  const hasETFs = allocations.some(a => a.symbol.length <= 4 && !a.symbol.includes('.'));
  const hasBonds = allocations.some(a => a.name.toLowerCase().includes('bond'));
  const hasIntl = allocations.some(a => a.name.toLowerCase().includes('international') || a.name.toLowerCase().includes('emerging'));
  
  if (hasETFs) score += 10;
  if (hasBonds) score += 15;
  if (hasIntl) score += 10;
  
  return Math.min(Math.max(score, 0), 100);
};

const calculateSharpeRatio = (portfolio: Portfolio): string => {
  const riskLevel = portfolio.riskProfile.toLowerCase();
  
  // Mock Sharpe ratios based on risk profile
  const sharpeRatios = {
    'low': (0.8 + Math.random() * 0.4).toFixed(2),
    'medium': (1.0 + Math.random() * 0.5).toFixed(2),
    'medium-high': (1.2 + Math.random() * 0.4).toFixed(2),
    'high': (1.0 + Math.random() * 0.6).toFixed(2)
  };
  
  return sharpeRatios[riskLevel as keyof typeof sharpeRatios] || '1.15';
};

const calculateBeta = (portfolio: Portfolio): string => {
  const riskLevel = portfolio.riskProfile.toLowerCase();
  
  // Beta calculations based on risk profile
  const betas = {
    'low': (0.6 + Math.random() * 0.3).toFixed(2),
    'medium': (0.9 + Math.random() * 0.3).toFixed(2),
    'medium-high': (1.0 + Math.random() * 0.4).toFixed(2),
    'high': (1.2 + Math.random() * 0.5).toFixed(2)
  };
  
  return betas[riskLevel as keyof typeof betas] || '1.05';
};

const calculateMaxDrawdown = (portfolio: Portfolio): string => {
  const riskLevel = portfolio.riskProfile.toLowerCase();
  
  // Max drawdown based on risk profile
  const drawdowns = {
    'low': (5 + Math.random() * 8).toFixed(1),
    'medium': (8 + Math.random() * 12).toFixed(1),
    'medium-high': (12 + Math.random() * 15).toFixed(1),
    'high': (18 + Math.random() * 20).toFixed(1)
  };
  
  return `-${drawdowns[riskLevel as keyof typeof drawdowns] || '12.5'}`;
};

const calculateExpenseRatio = (portfolio: Portfolio): string => {
  // Calculate weighted average expense ratio
  const allocation = portfolio.allocation;
  const etfCount = allocation.filter(a => a.symbol.length <= 4).length;
  const totalPositions = allocation.length;
  
  // ETFs typically have lower expense ratios
  const avgExpenseRatio = etfCount > totalPositions / 2 ? 
    (0.03 + Math.random() * 0.07).toFixed(2) : 
    (0.08 + Math.random() * 0.12).toFixed(2);
    
  return avgExpenseRatio;
};

const calculateAssetClasses = (portfolio: Portfolio): number => {
  const allocation = portfolio.allocation;
  let assetClasses = new Set();
  
  allocation.forEach(asset => {
    const name = asset.name.toLowerCase();
    const symbol = asset.symbol.toLowerCase();
    
    if (name.includes('bond') || symbol.includes('bnd')) assetClasses.add('Bonds');
    if (name.includes('reit') || symbol.includes('vnq')) assetClasses.add('REITs');
    if (name.includes('international') || name.includes('emerging')) assetClasses.add('International');
    if (name.includes('gold') || symbol.includes('iau')) assetClasses.add('Commodities');
    if (!name.includes('bond') && !name.includes('reit') && !name.includes('gold')) assetClasses.add('Equities');
  });
  
  return assetClasses.size;
};

const getRiskColor = (riskProfile: string): string => {
  const risk = riskProfile.toLowerCase();
  if (risk.includes('low')) return 'text-green-400';
  if (risk.includes('high')) return 'text-red-400';
  return 'text-yellow-400';
};

const getRiskBarColor = (riskProfile: string): string => {
  const risk = riskProfile.toLowerCase();
  if (risk.includes('low')) return 'bg-green-500';
  if (risk.includes('high')) return 'bg-red-500';
  return 'bg-yellow-500';
};

const getRiskPercentage = (riskProfile: string): number => {
  const risk = riskProfile.toLowerCase();
  if (risk.includes('low')) return 25;
  if (risk === 'medium') return 50;
  if (risk.includes('medium-high')) return 75;
  if (risk.includes('high')) return 90;
  return 50;
};

export default function AIPortfolioPage() {
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [riskTolerance, setRiskTolerance] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('');
  const [investmentGoals, setInvestmentGoals] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePortfolio = async () => {
    setIsGenerating(true);
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Smart portfolio selection based on user inputs
    let filteredPortfolios = mockPortfolios;
    
    // Filter by risk tolerance
    if (riskTolerance) {
      filteredPortfolios = filteredPortfolios.filter(portfolio => {
        const userRisk = riskTolerance.toLowerCase();
        const portfolioRisk = portfolio.riskProfile.toLowerCase();
        
        if (userRisk === 'conservative' && (portfolioRisk === 'low' || portfolioRisk === 'medium')) return true;
        if (userRisk === 'moderate' && (portfolioRisk === 'medium' || portfolioRisk === 'medium-high')) return true;
        if (userRisk === 'aggressive' && (portfolioRisk === 'high' || portfolioRisk === 'medium-high')) return true;
        
        return false;
      });
    }
    
    // Filter by investment horizon
    if (timeHorizon) {
      filteredPortfolios = filteredPortfolios.filter(portfolio => {
        const userHorizon = timeHorizon;
        const portfolioHorizon = portfolio.timeHorizon;
        
        if (userHorizon === '1-2 years' && portfolioHorizon.includes('1-')) return true;
        if (userHorizon === '3-5 years' && (portfolioHorizon.includes('3-') || portfolioHorizon.includes('5'))) return true;
        if (userHorizon === '5-10 years' && (portfolioHorizon.includes('5') || portfolioHorizon.includes('7') || portfolioHorizon.includes('10'))) return true;
        if (userHorizon === '10+ years' && (portfolioHorizon.includes('10') || portfolioHorizon.includes('15') || portfolioHorizon.includes('+'))) return true;
        
        return false;
      });
    }
    
    // Filter by investment goals
    if (investmentGoals) {
      filteredPortfolios = filteredPortfolios.filter(portfolio => {
        const userGoals = investmentGoals.toLowerCase();
        const portfolioType = portfolio.type.toLowerCase();
        const portfolioDesc = portfolio.description.toLowerCase();
        
        if (userGoals.includes('growth') && (portfolioType.includes('growth') || portfolioDesc.includes('growth'))) return true;
        if (userGoals.includes('income') && (portfolioType.includes('income') || portfolioDesc.includes('income') || portfolioDesc.includes('dividend'))) return true;
        if (userGoals.includes('preservation') && (portfolioType.includes('preservation') || portfolioDesc.includes('preservation'))) return true;
        if (userGoals.includes('sustainable') && (portfolioType.includes('sustainable') || portfolioDesc.includes('esg'))) return true;
        
        return true; // Default to include if no specific match
      });
    }
    
    // If no portfolios match, fall back to balanced options
    if (filteredPortfolios.length === 0) {
      filteredPortfolios = mockPortfolios.filter(p => p.riskProfile === 'Medium');
    }
    
    // Select random portfolio from filtered results
    const randomIndex = Math.floor(Math.random() * filteredPortfolios.length);
    const selectedPortfolio = filteredPortfolios[randomIndex];
    
    setSelectedPortfolio(selectedPortfolio);
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <NavigationLink href="/" className="text-blue-400 hover:text-blue-300">
              <ArrowLeftIcon className="h-6 w-6" />
            </NavigationLink>
            <div>
              <h1 className="text-2xl font-bold">AI Portfolio Builder</h1>
              <p className="text-gray-400">Let AI create your personalized investment portfolio</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Portfolio Generator Form */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center space-x-3 mb-6">
              <SparklesIcon className="h-8 w-8 text-blue-400" />
              <h2 className="text-xl font-bold">Portfolio Preferences</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Risk Tolerance
                </label>
                <select 
                  value={riskTolerance}
                  onChange={(e) => setRiskTolerance(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select risk tolerance</option>
                  <option value="conservative">Conservative (Low Risk)</option>
                  <option value="moderate">Moderate (Medium Risk)</option>
                  <option value="aggressive">Aggressive (High Risk)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Investment Time Horizon
                </label>
                <select 
                  value={timeHorizon}
                  onChange={(e) => setTimeHorizon(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select time horizon</option>
                  <option value="short">Short Term (1-2 years)</option>
                  <option value="medium">Medium Term (3-5 years)</option>
                  <option value="long">Long Term (5+ years)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Investment Goals
                </label>
                <select 
                  value={investmentGoals}
                  onChange={(e) => setInvestmentGoals(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select investment goals</option>
                  <option value="growth">Capital Growth</option>
                  <option value="income">Regular Income</option>
                  <option value="balanced">Balanced Growth & Income</option>
                  <option value="preservation">Capital Preservation</option>
                </select>
              </div>

              <button
                onClick={generatePortfolio}
                disabled={!riskTolerance || !timeHorizon || !investmentGoals || isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Generating Portfolio...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    <span>Generate AI Portfolio</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Portfolio Display */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center space-x-3 mb-6">
              <ChartBarIcon className="h-8 w-8 text-green-400" />
              <h2 className="text-xl font-bold">Generated Portfolio</h2>
            </div>

            {selectedPortfolio ? (
              <div className="space-y-6">
                <div className="bg-slate-700 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-blue-400 mb-2">{selectedPortfolio.name}</h3>
                  <p className="text-gray-300 text-sm mb-4">{selectedPortfolio.description}</p>
                  
                  {/* Personalization Message */}
                  <div className="bg-blue-900/30 border border-blue-600/30 rounded-md p-3 mb-4">
                    <div className="flex items-start space-x-2">
                      <SparklesIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-blue-100 text-xs font-medium">AI Personalization</p>
                        <p className="text-blue-200 text-xs mt-1">
                          Portfolio selected based on your <span className="font-semibold">{riskTolerance}</span> risk tolerance, 
                          <span className="font-semibold"> {timeHorizon}</span> investment horizon, and focus on 
                          <span className="font-semibold"> {investmentGoals}</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-gray-400 text-xs">Type:</span>
                      <p className="text-white font-medium">{selectedPortfolio.type}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Risk Profile:</span>
                      <p className="text-white font-medium">{selectedPortfolio.riskProfile}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Expected Return:</span>
                      <p className="text-green-400 font-medium">{selectedPortfolio.expectedReturn}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Time Horizon:</span>
                      <p className="text-white font-medium">{selectedPortfolio.timeHorizon}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-bold mb-4">Asset Allocation</h4>
                  <div className="space-y-3">
                    {selectedPortfolio.allocation.map((asset, index) => (
                      <div key={index} className="bg-slate-700 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="font-bold text-blue-400">{asset.symbol}</span>
                            <span className="text-gray-300 text-sm ml-2">{asset.name}</span>
                          </div>
                          <span className="font-bold text-green-400">{asset.percentage}%</span>
                        </div>
                        <p className="text-gray-400 text-xs">{asset.rationale}</p>
                        <div className="w-full bg-slate-600 rounded-full h-2 mt-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${asset.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <h4 className="text-blue-400 font-bold mb-3">📊 Portfolio Analysis & Risk Metrics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">Diversification Score:</span>
                        <span className="text-green-400 font-semibold">{calculateDiversificationScore(selectedPortfolio)}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">Sharpe Ratio:</span>
                        <span className="text-blue-400 font-semibold">{calculateSharpeRatio(selectedPortfolio)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">Portfolio Beta:</span>
                        <span className="text-yellow-400 font-semibold">{calculateBeta(selectedPortfolio)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">Max Drawdown:</span>
                        <span className="text-red-400 font-semibold">{calculateMaxDrawdown(selectedPortfolio)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">Expense Ratio:</span>
                        <span className="text-purple-400 font-semibold">{calculateExpenseRatio(selectedPortfolio)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">Asset Classes:</span>
                        <span className="text-cyan-400 font-semibold">{calculateAssetClasses(selectedPortfolio)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Risk Level Indicator */}
                  <div className="mt-4 p-3 bg-slate-800 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300 text-sm">Risk Level:</span>
                      <span className={`text-sm font-semibold ${getRiskColor(selectedPortfolio.riskProfile)}`}>
                        {selectedPortfolio.riskProfile}
                      </span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getRiskBarColor(selectedPortfolio.riskProfile)}`}
                        style={{ width: `${getRiskPercentage(selectedPortfolio.riskProfile)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <ChartBarIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Generate a portfolio to see AI recommendations</p>
              </div>
            )}
          </div>
        </div>

        {/* Sample Portfolios */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Sample AI-Generated Portfolios</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockPortfolios.map((portfolio, index) => (
              <div key={index} className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-blue-500 transition-colors cursor-pointer"
                   onClick={() => setSelectedPortfolio(portfolio)}>
                <h3 className="text-lg font-bold text-blue-400 mb-2">{portfolio.name}</h3>
                <p className="text-gray-300 text-sm mb-4">{portfolio.description}</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Risk:</span>
                    <span className="text-white text-xs">{portfolio.riskProfile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Return:</span>
                    <span className="text-green-400 text-xs">{portfolio.expectedReturn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Horizon:</span>
                    <span className="text-white text-xs">{portfolio.timeHorizon}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
