// Test per verificare la struttura dei portafogli economici

const ECONOMIC_PORTFOLIOS = {
  'GOLDILOCKS_ECONOMY': {
    name: 'Goldilocks Economy',
    description: 'Moderate growth, low inflation scenario',
    etfs: [
      { ticker: 'QQQ', name: 'Invesco QQQ Trust, Series 1' },
      { ticker: 'XLK', name: 'Technology Select Sector SPDR Fund' },
      { ticker: 'XLY', name: 'Consumer Discretionary Select Sector SPDR Fund' },
      { ticker: 'IEF', name: 'iShares 7-10 Year Treasury Bond ETF' },
      { ticker: 'SMH', name: 'VanEck Semiconductor ETF' }
    ]
  },
  'RECESSION': {
    name: 'Recession',
    description: 'Economic contraction, flight to safety',
    etfs: [
      { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF' },
      { ticker: 'SHY', name: 'iShares 1-3 Year Treasury Bond ETF' },
      { ticker: 'XLU', name: 'Utilities Select Sector SPDR Fund' },
      { ticker: 'XLP', name: 'Consumer Staples Select Sector SPDR Fund' },
      { ticker: 'GLD', name: 'SPDR Gold Trust' }
    ]
  }
};

// Mock market data for testing
const mockMarketData = [
  { ticker: 'QQQ', performance: '1.50%', price: '574.55', change: '8.10' },
  { ticker: 'XLK', performance: '0.62%', price: '265.92', change: '1.64' },
  { ticker: 'XLY', performance: '0.11%', price: '223.78', change: '0.25' },
  { ticker: 'IEF', performance: '0.21%', price: '104.50', change: '0.22' },
  { ticker: 'SMH', performance: '-1.35%', price: '254.59', change: '-3.57' },
  { ticker: 'TLT', performance: '0.45%', price: '100.25', change: '0.45' },
  { ticker: 'SHY', performance: '0.05%', price: '84.12', change: '0.04' },
  { ticker: 'XLU', performance: '-0.70%', price: '86.18', change: '-0.61' },
  { ticker: 'XLP', performance: '0.21%', price: '82.48', change: '0.17' },
  { ticker: 'GLD', performance: '0.22%', price: '313.05', change: '0.70' }
];

function getPortfolioPerformance(portfolioKey, marketData) {
  const portfolio = ECONOMIC_PORTFOLIOS[portfolioKey];
  if (!portfolio) return null;

  const portfolioData = portfolio.etfs.map(etf => {
    const data = marketData.find(item => item.ticker === etf.ticker);
    return data ? {
      ...etf,
      performance: parseFloat(data.performance),
      price: data.price,
      change: data.change
    } : null;
  }).filter(Boolean);

  if (portfolioData.length === 0) return null;

  const avgPerformance = portfolioData.reduce((sum, item) => sum + (item?.performance || 0), 0) / portfolioData.length;
  
  return {
    ...portfolio,
    avgPerformance: avgPerformance.toFixed(2) + '%',
    etfData: portfolioData
  };
}

// Test
console.log('Testing Economic Portfolios...\n');

Object.keys(ECONOMIC_PORTFOLIOS).forEach(key => {
  console.log(`Testing portfolio: ${key}`);
  const result = getPortfolioPerformance(key, mockMarketData);
  if (result) {
    console.log(`  Name: ${result.name}`);
    console.log(`  Average Performance: ${result.avgPerformance}`);
    console.log(`  ETFs found: ${result.etfData.length}/${result.etfs.length}`);
    result.etfData.forEach(etf => {
      console.log(`    ${etf.ticker}: ${etf.performance.toFixed(2)}%`);
    });
  } else {
    console.log('  ERROR: No result returned');
  }
  console.log('');
});

console.log('Test completed!');
