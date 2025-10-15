// API Fallback Verification Script
// Test that APIs gracefully handle missing environment variables in production

const PRODUCTION_URL = 'https://econopulse-7nk6kou6s-arlinds-projects-96b70787.vercel.app';

const endpoints = [
  '/api/status',
  '/api/sector-performance', 
  '/api/ai-signals',
  '/api/dashboard-data',
  '/api/market-sentiment',
  '/api/vix',
  '/api/ai-economic-analysis',
  '/api/etf-comparison',
  '/api/country-data'
];

async function testEndpoint(endpoint) {
  const url = `${PRODUCTION_URL}${endpoint}`;
  try {
    console.log(`\n🔍 Testing: ${endpoint}`);
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'API-Fallback-Test/1.0'
      }
    });
    
    const status = response.status;
    const ok = response.ok;
    
    if (ok) {
      const data = await response.json();
      console.log(`✅ ${status} - Success`);
      
      // Check for fallback indicators
      if (data.demo) console.log('   📋 Demo mode detected');
      if (data.fallback) console.log('   🔄 Fallback data used');
      if (data.error) console.log(`   ⚠️ Error: ${data.error}`);
      
      return { endpoint, status, ok: true, hasData: !!data };
    } else if (status === 503) {
      console.log(`🟡 ${status} - Service unavailable (expected for missing keys)`);
      const text = await response.text();
      if (text.includes('demo')) console.log('   📋 Demo fallback active');
      return { endpoint, status, ok: false, expectedFallback: true };
    } else {
      console.log(`❌ ${status} - Unexpected error`);
      return { endpoint, status, ok: false, expectedFallback: false };
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
    return { endpoint, status: 0, ok: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting API Fallback Verification');
  console.log(`Target: ${PRODUCTION_URL}`);
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 SUMMARY');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.ok).length;
  const fallbacks = results.filter(r => r.expectedFallback).length;
  const errors = results.filter(r => !r.ok && !r.expectedFallback).length;
  
  console.log(`✅ Successful: ${successful}/${endpoints.length}`);
  console.log(`🟡 Expected fallbacks: ${fallbacks}/${endpoints.length}`);
  console.log(`❌ Unexpected errors: ${errors}/${endpoints.length}`);
  
  if (errors === 0) {
    console.log('\n🎉 All API endpoints handle missing keys gracefully!');
  } else {
    console.log('\n⚠️ Some endpoints may need fallback improvements');
  }
  
  return results;
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests, testEndpoint };
} else if (typeof window !== 'undefined') {
  window.apiTestSuite = { runTests, testEndpoint };
}

// Auto-run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests().catch(console.error);
}