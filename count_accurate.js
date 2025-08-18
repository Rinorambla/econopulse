const fs = require('fs');

// Legge il file della route API
const content = fs.readFileSync('src/app/api/dashboard-data/route.ts', 'utf8');

// Estrae la mappatura dei settori
const sectorMatch = content.match(/const sectors: \{ \[key: string\]: string \} = \{([\s\S]*?)\s*\};/);
if (!sectorMatch) {
  console.error('❌ Non trovata mappatura settori');
  process.exit(1);
}

// Parse della mappatura settori
const sectorMapping = {};
const sectorLines = sectorMatch[1].split('\n');
for (const line of sectorLines) {
  const match = line.match(/'([^']+)':\s*'([^']+)'/);
  if (match) {
    sectorMapping[match[1]] = match[2];
  }
}

// Conta simboli per settore
const sectorCounts = {};
const allSymbols = Object.keys(sectorMapping);

console.log('🔍 ANALISI ACCURATA SIMBOLI PER SETTORE\n');

for (const [symbol, sector] of Object.entries(sectorMapping)) {
  if (!sectorCounts[sector]) {
    sectorCounts[sector] = [];
  }
  sectorCounts[sector].push(symbol);
}

// Ordina settori per numero di simboli
const sortedSectors = Object.entries(sectorCounts)
  .map(([sector, symbols]) => ({ sector, count: symbols.length, symbols }))
  .sort((a, b) => b.count - a.count);

console.log('📊 CONTEGGIO DETTAGLIATO PER SETTORE:\n');

for (const { sector, count, symbols } of sortedSectors) {
  console.log(`${sector}: ${count} simboli`);
  if (count <= 10) {
    console.log(`  → ${symbols.join(', ')}`);
  } else {
    console.log(`  → ${symbols.slice(0, 5).join(', ')} ... e altri ${count - 5}`);
  }
  console.log('');
}

// Raggruppa per categorie logiche come nel dashboard
const categoryGroups = {
  'Technology': ['Technology'],
  'Technology ETFs': ['Technology ETF', 'Semiconductor ETF', 'Innovation ETF', 'Robotics ETF', 'Genomics ETF', 'Internet ETF'],
  'Financial Services': ['Financial Services'],
  'Financial ETFs': ['Financial ETF'],
  'Healthcare': ['Healthcare'],
  'Healthcare ETFs': ['Healthcare ETF'],
  'Energy': ['Energy'],
  'Energy ETFs': ['Energy ETF'],
  'Consumer Discretionary': ['Consumer Discretionary'],
  'Consumer Staples': ['Consumer Staples'],
  'Consumer ETFs': ['Consumer Discretionary ETF', 'Consumer Staples ETF'],
  'Real Estate': ['Real Estate'],
  'Real Estate ETFs': ['Real Estate ETF'],
  'Currency ETFs': ['Currency ETF'],
  'Crypto': ['Crypto ETF', 'Crypto Mining', 'Crypto Stocks'],
  'ETFs Generali': ['Index', 'Bond', 'Value ETF', 'Growth ETF'],
  'Altri ETFs': ['Materials ETF', 'Industrial ETF', 'Utilities ETF', 'Transportation ETF', 'Commodities'],
  'International': ['International', 'Emerging Markets'],
  'Retail': ['Retail'],
  'Utilities': ['Utilities'],
  'Materials': ['Materials'],
  'Industrial': ['Industrial'],
  'Communication': ['Communication Services', 'Communication ETF'],
  'Aerospace': ['Aerospace']
};

console.log('🎯 CONTEGGIO PER CATEGORIA DASHBOARD:\n');

const categoryTotals = {};
for (const [category, sectors] of Object.entries(categoryGroups)) {
  let total = 0;
  let allCategorySymbols = [];
  
  for (const sector of sectors) {
    if (sectorCounts[sector]) {
      total += sectorCounts[sector].length;
      allCategorySymbols = allCategorySymbols.concat(sectorCounts[sector]);
    }
  }
  
  categoryTotals[category] = { count: total, symbols: allCategorySymbols };
  console.log(`${category}: ${total} simboli`);
}

// Calcola totali combinati per i filtri del dashboard
console.log('\n🚀 TOTALI COMBINATI PER FILTRI DASHBOARD:\n');

const filterTotals = {
  'Technology (totale)': categoryTotals['Technology'].count + categoryTotals['Technology ETFs'].count,
  'Financial (totale)': categoryTotals['Financial Services'].count + categoryTotals['Financial ETFs'].count,
  'Healthcare (totale)': categoryTotals['Healthcare'].count + categoryTotals['Healthcare ETFs'].count,
  'Energy (totale)': categoryTotals['Energy'].count + categoryTotals['Energy ETFs'].count,
  'Consumer (totale)': categoryTotals['Consumer Discretionary'].count + categoryTotals['Consumer Staples'].count + categoryTotals['Consumer ETFs'].count + categoryTotals['Retail'].count,
  'Real Estate (totale)': categoryTotals['Real Estate'].count + categoryTotals['Real Estate ETFs'].count,
  'Currency': categoryTotals['Currency ETFs'].count,
  'Crypto': categoryTotals['Crypto'].count,
  'ETF (totale)': categoryTotals['Technology ETFs'].count + categoryTotals['Financial ETFs'].count + categoryTotals['Healthcare ETFs'].count + categoryTotals['Energy ETFs'].count + categoryTotals['Consumer ETFs'].count + categoryTotals['Real Estate ETFs'].count + categoryTotals['Currency ETFs'].count + categoryTotals['ETFs Generali'].count + categoryTotals['Altri ETFs'].count
};

for (const [filter, count] of Object.entries(filterTotals)) {
  console.log(`${filter}: ${count} simboli`);
}

console.log('\n✅ VERIFICA DELLE TUE DICHIARAZIONI ORIGINALI:\n');
console.log(`Technology: ${filterTotals['Technology (totale)']} (dichiarato: 100+) ${filterTotals['Technology (totale)'] >= 100 ? '✅' : '❌'}`);
console.log(`Financial: ${filterTotals['Financial (totale)']} (dichiarato: 80+) ${filterTotals['Financial (totale)'] >= 80 ? '✅' : '❌'}`);
console.log(`Healthcare: ${filterTotals['Healthcare (totale)']} (dichiarato: 100+) ${filterTotals['Healthcare (totale)'] >= 100 ? '✅' : '❌'}`);
console.log(`Energy: ${filterTotals['Energy (totale)']} (dichiarato: 50+) ${filterTotals['Energy (totale)'] >= 50 ? '✅' : '❌'}`);
console.log(`Consumer: ${filterTotals['Consumer (totale)']} (dichiarato: 170+) ${filterTotals['Consumer (totale)'] >= 170 ? '✅' : '❌'}`);
console.log(`ETF: ${filterTotals['ETF (totale)']} (dichiarato: 200+) ${filterTotals['ETF (totale)'] >= 200 ? '✅' : '❌'}`);
console.log(`Real Estate: ${filterTotals['Real Estate (totale)']} (dichiarato: 30+) ${filterTotals['Real Estate (totale)'] >= 30 ? '✅' : '❌'}`);
console.log(`Currency: ${filterTotals['Currency']} (dichiarato: 20+) ${filterTotals['Currency'] >= 20 ? '✅' : '❌'}`);
console.log(`Crypto: ${filterTotals['Crypto']} (dichiarato: 25+) ${filterTotals['Crypto'] >= 25 ? '✅' : '❌'}`);

console.log(`\n📈 TOTALE SIMBOLI MAPPATI: ${allSymbols.length}`);
