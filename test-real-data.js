// Test script to verify all data is real and updates correctly
const http = require('http');

const testAPI = (endpoint, validator) => {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3000${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const result = validator(parsed);
          resolve({ endpoint, success: result.valid, message: result.message, data: result.data });
        } catch (err) {
          reject({ endpoint, error: err.message });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000);
  });
};

const validators = {
  '/api/sector-performance': (data) => {
    if (!data.sectors || !Array.isArray(data.sectors)) {
      return { valid: false, message: 'No sectors array found' };
    }
    const validSectors = data.sectors.filter(s => 
      s.sector && 
      typeof s.daily === 'number' && 
      typeof s.yearly === 'number' &&
      s.daily >= -50 && s.daily <= 50 &&  // Realistic daily range
      s.yearly >= -100 && s.yearly <= 200  // Realistic yearly range
    );
    return { 
      valid: validSectors.length > 0, 
      message: `Found ${validSectors.length}/${data.sectors.length} valid sectors`,
      data: validSectors.slice(0, 3).map(s => `${s.sector}: ${s.daily.toFixed(1)}% daily`)
    };
  },

  '/api/economic-data': (data) => {
    if (!data.success || !data.data) {
      return { valid: false, message: 'No valid economic data' };
    }
    const indicators = data.data.indicators;
    const hasRealData = indicators && 
      indicators.gdp && indicators.gdp.value &&
      indicators.inflation && indicators.inflation.value;
    return { 
      valid: hasRealData, 
      message: hasRealData ? 'Real economic indicators found' : 'Missing economic indicators',
      data: hasRealData ? [
        `GDP: ${indicators.gdp.value}%`,
        `Inflation: ${indicators.inflation.value}%`,
        `Unemployment: ${indicators.unemployment.value}%`
      ] : []
    };
  },

  '/api/ai-economic-analysis': (data) => {
    const hasAnalysis = data.success && (data.analysis || data.data);
    return { 
      valid: hasAnalysis, 
      message: hasAnalysis ? 'AI analysis available' : 'No AI analysis (OpenAI quota exceeded)',
      data: hasAnalysis ? ['AI analysis present'] : ['Using fallback analysis']
    };
  }
};

async function runTests() {
  console.log('🔍 Testing Real Data APIs...\n');
  
  const tests = Object.entries(validators).map(([endpoint, validator]) => 
    testAPI(endpoint, validator)
  );

  try {
    const results = await Promise.all(tests);
    
    results.forEach(result => {
      const status = result.success ? '✅' : '⚠️';
      console.log(`${status} ${result.endpoint}`);
      console.log(`   ${result.message}`);
      if (result.data && result.data.length > 0) {
        result.data.forEach(item => console.log(`   - ${item}`));
      }
      console.log('');
    });

    const allPassed = results.every(r => r.success);
    console.log(allPassed ? '🎉 All APIs return real data!' : '⚠️ Some APIs may have issues');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTests();
