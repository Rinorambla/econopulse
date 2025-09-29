import { NextRequest, NextResponse } from 'next/server';

interface WorldBankIndicator {
  indicator: {
    id: string;
    value: string;
  };
  country: {
    id: string;
    value: string;
  };
  countryiso3code: string;
  date: string;
  value: number | null;
}

interface PopulationData {
  country: string;
  countryCode: string;
  population: number;
  growthRate: number;
  urbanization: number;
  density: number;
  medianAge: number;
}

// Cache per evitare troppe richieste API
let cachedData: PopulationData[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 ora

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
  const force = req.nextUrl.searchParams.get('forceRefresh') === '1';
    
    // Restituisci dati cache se ancora validi
  if (!force && cachedData && (now - lastFetchTime < CACHE_DURATION)) {
      return NextResponse.json({
        data: cachedData,
        source: 'World Bank API (cached)',
        lastUpdated: new Date(lastFetchTime).toISOString()
      });
    }

    console.log('🌍 Fetching REAL population data from World Bank API...');

    // Paesi target per i dati demografici
    const targetCountries = ['CN', 'IN', 'US', 'ID', 'PK', 'BR', 'NG', 'BD', 'RU', 'MX'];
    const countryNames: Record<string, string> = {
      'CN': 'China',
      'IN': 'India', 
      'US': 'United States',
      'ID': 'Indonesia',
      'PK': 'Pakistan',
      'BR': 'Brazil',
      'NG': 'Nigeria',
      'BD': 'Bangladesh',
      'RU': 'Russia',
      'MX': 'Mexico'
    };

    // Fetch dati di popolazione (indicatore SP.POP.TOTL) con range di anni
    const populationUrl = `https://api.worldbank.org/v2/country/${targetCountries.join(';')}/indicator/SP.POP.TOTL?format=json&date=2022:2023&per_page=100`;
    
    console.log('📊 World Bank URL:', populationUrl);
    
    const populationResponse = await fetch(populationUrl, {
      headers: {
        'User-Agent': 'EconoPulse-Dashboard/1.0',
      }
    });

    if (!populationResponse.ok) {
      throw new Error(`World Bank API error: ${populationResponse.status}`);
    }

    const populationJson = await populationResponse.json();
    
    // La World Bank API restituisce un array con metadati al primo elemento
    const populationData: WorldBankIndicator[] = Array.isArray(populationJson[1]) ? populationJson[1] : [];

    console.log('📈 Population data received:', populationData.length, 'records');

    // Fetch dati di crescita demografica (SP.POP.GROW) con range di anni
    const growthUrl = `https://api.worldbank.org/v2/country/${targetCountries.join(';')}/indicator/SP.POP.GROW?format=json&date=2022:2023&per_page=100`;
    
    const growthResponse = await fetch(growthUrl, {
      headers: {
        'User-Agent': 'EconoPulse-Dashboard/1.0',
      }
    });

    let growthData: WorldBankIndicator[] = [];
    if (growthResponse.ok) {
      const growthJson = await growthResponse.json();
      growthData = Array.isArray(growthJson[1]) ? growthJson[1] : [];
    }

    // Fetch dati di urbanizzazione (SP.URB.TOTL.IN.ZS) con range di anni
    const urbanUrl = `https://api.worldbank.org/v2/country/${targetCountries.join(';')}/indicator/SP.URB.TOTL.IN.ZS?format=json&date=2022:2023&per_page=100`;
    
    const urbanResponse = await fetch(urbanUrl, {
      headers: {
        'User-Agent': 'EconoPulse-Dashboard/1.0',
      }
    });

    let urbanData: WorldBankIndicator[] = [];
    if (urbanResponse.ok) {
      const urbanJson = await urbanResponse.json();
      urbanData = Array.isArray(urbanJson[1]) ? urbanJson[1] : [];
    }

    // Combina i dati - prende il record più recente disponibile
    const processedData: PopulationData[] = [];
    
    for (const country of targetCountries) {
      const countryName = countryNames[country];
      if (!countryName) continue;

      // Trova il record più recente con dati non-null
      const popRecord = populationData
        .filter(d => d.countryiso3code === country && d.value !== null)
        .sort((a, b) => parseInt(b.date) - parseInt(a.date))[0];
        
      const growthRecord = growthData
        .filter(d => d.countryiso3code === country && d.value !== null)
        .sort((a, b) => parseInt(b.date) - parseInt(a.date))[0];
        
      const urbanRecord = urbanData
        .filter(d => d.countryiso3code === country && d.value !== null)
        .sort((a, b) => parseInt(b.date) - parseInt(a.date))[0];

      if (popRecord?.value) {
        processedData.push({
          country: countryName,
          countryCode: country,
          population: popRecord.value,
          growthRate: growthRecord?.value || 0,
          urbanization: urbanRecord?.value || 50,
          density: getDensityEstimate(country), // Stima basata su dati storici
          medianAge: getMedianAgeEstimate(country) // Stima basata su dati storici
        });
      }
    }

    // Ordina per popolazione decrescente
    processedData.sort((a, b) => b.population - a.population);

    console.log('✅ Processed population data:', processedData.length, 'countries');

    // Se non abbiamo dati, usa fallback
    if (processedData.length === 0) {
      console.log('⚠️ No World Bank data available, using fallback data');
      
      const fallbackData: PopulationData[] = [
        { country: 'China', countryCode: 'CN', population: 1412000000, growthRate: 0.34, urbanization: 64.7, density: 153, medianAge: 38.4 },
        { country: 'India', countryCode: 'IN', population: 1380000000, growthRate: 0.99, urbanization: 35.4, density: 464, medianAge: 28.4 },
        { country: 'United States', countryCode: 'US', population: 331900000, growthRate: 0.59, urbanization: 82.7, density: 36, medianAge: 38.5 },
        { country: 'Indonesia', countryCode: 'ID', population: 273500000, growthRate: 1.07, urbanization: 56.6, density: 151, medianAge: 30.2 },
        { country: 'Pakistan', countryCode: 'PK', population: 225200000, growthRate: 2.00, urbanization: 37.2, density: 287, medianAge: 22.8 },
        { country: 'Brazil', countryCode: 'BR', population: 215300000, growthRate: 0.65, urbanization: 87.6, density: 25, medianAge: 33.2 },
        { country: 'Nigeria', countryCode: 'NG', population: 218500000, growthRate: 2.58, urbanization: 52.7, density: 226, medianAge: 18.1 },
        { country: 'Bangladesh', countryCode: 'BD', population: 166300000, growthRate: 1.01, urbanization: 39.0, density: 1265, medianAge: 27.6 }
      ];

      // Aggiorna cache con fallback
      cachedData = fallbackData;
      lastFetchTime = now;

      return NextResponse.json({
        data: fallbackData,
        source: 'Fallback data (no World Bank data)',
        lastUpdated: new Date().toISOString(),
        count: fallbackData.length
      });
    }

    // Aggiorna cache
    cachedData = processedData;
    lastFetchTime = now;

    return NextResponse.json({
      data: processedData,
      source: 'World Bank API',
      lastUpdated: new Date().toISOString(),
      count: processedData.length
    });

  } catch (error) {
    console.error('❌ Error fetching population data:', error);
    
    // Fallback a dati mock se API fallisce
    const fallbackData: PopulationData[] = [
      { country: 'China', countryCode: 'CN', population: 1412000000, growthRate: 0.34, urbanization: 64.7, density: 153, medianAge: 38.4 },
      { country: 'India', countryCode: 'IN', population: 1380000000, growthRate: 0.99, urbanization: 35.4, density: 464, medianAge: 28.4 },
      { country: 'United States', countryCode: 'US', population: 331900000, growthRate: 0.59, urbanization: 82.7, density: 36, medianAge: 38.5 },
      { country: 'Indonesia', countryCode: 'ID', population: 273500000, growthRate: 1.07, urbanization: 56.6, density: 151, medianAge: 30.2 },
      { country: 'Pakistan', countryCode: 'PK', population: 225200000, growthRate: 2.00, urbanization: 37.2, density: 287, medianAge: 22.8 },
      { country: 'Brazil', countryCode: 'BR', population: 215300000, growthRate: 0.65, urbanization: 87.6, density: 25, medianAge: 33.2 },
      { country: 'Nigeria', countryCode: 'NG', population: 218500000, growthRate: 2.58, urbanization: 52.7, density: 226, medianAge: 18.1 },
      { country: 'Bangladesh', countryCode: 'BD', population: 166300000, growthRate: 1.01, urbanization: 39.0, density: 1265, medianAge: 27.6 }
    ];

    return NextResponse.json({
      data: fallbackData,
      source: 'Fallback data (API error)',
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Funzioni helper per stime quando i dati non sono disponibili
function getDensityEstimate(countryCode: string): number {
  const estimates: Record<string, number> = {
    'CN': 153, 'IN': 464, 'US': 36, 'ID': 151, 'PK': 287,
    'BR': 25, 'NG': 226, 'BD': 1265, 'RU': 9, 'MX': 66
  };
  return estimates[countryCode] || 100;
}

function getMedianAgeEstimate(countryCode: string): number {
  const estimates: Record<string, number> = {
    'CN': 38.4, 'IN': 28.4, 'US': 38.5, 'ID': 30.2, 'PK': 22.8,
    'BR': 33.2, 'NG': 18.1, 'BD': 27.6, 'RU': 39.6, 'MX': 29.3
  };
  return estimates[countryCode] || 30;
}
