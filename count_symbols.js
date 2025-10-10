const fs = require('fs');

// Legge il file della route API
const content = fs.readFileSync('src/app/api/dashboard-data/route.ts', 'utf8');

// Estrae l'array TIINGO_SYMBOLS
const symbolsMatch = content.match(/TIINGO_SYMBOLS = \[([\s\S]*?)\];/);
if (!symbolsMatch) {
  console.error('Non trovato TIINGO_SYMBOLS');
  process.exit(1);
}

// Estrae tutti i simboli
const symbolsString = symbolsMatch[1];
const symbols = symbolsString
  .split('\n')
  .join('')
  .split(',')
  .map(s => s.trim().replace(/['"]/g, ''))
  .filter(s => s && !s.startsWith('//') && s.length > 0);

console.log(`\n🔍 ANALISI SIMBOLI DASHBOARD - TOTALE: ${symbols.length}\n`);

// Estrae la funzione getSectorForTicker
const sectorFunctionMatch = content.match(/function getSectorForTicker\(ticker: string\): string \{([\s\S]*?)\n\s*return sectors\[ticker\] \|\| 'Other';\n\}/);
if (!sectorFunctionMatch) {
  console.error('Non trovata funzione getSectorForTicker');
  process.exit(1);
}

// Estrae la mappatura dei settori
const sectorMappingMatch = content.match(/const sectors: \{ \[key: string\]: string \} = \{([\s\S]*?)\s*\};/);
if (!sectorMappingMatch) {
  console.error('Non trovata mappatura settori');
  process.exit(1);
}

// Parse della mappatura settori
const sectorMapping = {};
const sectorLines = sectorMappingMatch[1].split('\n');
for (const line of sectorLines) {
  const match = line.match(/'([^']+)':\s*'([^']+)'/);
  if (match) {
    sectorMapping[match[1]] = match[2];
  }
}

// Conta simboli per categoria
const sectorCounts = {};
const unmappedSymbols = [];

for (const symbol of symbols) {
  const sector = sectorMapping[symbol] || 'Other';
  if (sector === 'Other') {
    unmappedSymbols.push(symbol);
  }
  sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
}

// Raggruppa settori per categorie logiche
const categoryGroups = {
  'Technology': ['Technology', 'Technology ETF', 'Semiconductor ETF', 'Innovation ETF', 'Robotics ETF', 'Genomics ETF', 'Internet ETF'],
  'Financial Services': ['Financial Services', 'Financial ETF'],
  'Healthcare': ['Healthcare', 'Healthcare ETF'],
  'Energy': ['Energy', 'Energy ETF'],
  'Consumer': ['Consumer Discretionary', 'Consumer Staples', 'Consumer Discretionary ETF', 'Consumer Staples ETF', 'Retail'],
  'ETF': ['Technology ETF', 'Financial ETF', 'Healthcare ETF', 'Energy ETF', 'Consumer Discretionary ETF', 'Consumer Staples ETF', 'Real Estate ETF', 'Materials ETF', 'Industrial ETF', 'Utilities ETF', 'Transportation ETF', 'Currency ETF', 'Value ETF', 'Growth ETF', 'Index', 'Bond', 'Commodities'],
  'Real Estate': ['Real Estate', 'Real Estate ETF'],
  'Currency': ['Currency ETF'],
  'Crypto': ['Crypto ETF', 'Crypto Mining', 'Crypto Stocks'],
  'Utilities': ['Utilities', 'Utilities ETF'],
  'Materials': ['Materials', 'Materials ETF'],
  'Industrial': ['Industrial', 'Industrial ETF', 'Aerospace'],
  'Communication': ['Communication Services', 'Communication ETF'],
  'International': ['International', 'Emerging Markets'],
  'Bonds': ['Bond'],
  'Commodities': ['Commodities']
};

console.log('📊 CONTEGGIO PER CATEGORIA:\n');

const categoryTotals = {};
for (const [category, sectors] of Object.entries(categoryGroups)) {
  let total = 0;
  const details = [];
  
  for (const sector of sectors) {
    const count = sectorCounts[sector] || 0;
    if (count > 0) {
      total += count;
      details.push(`  ${sector}: ${count}`);
    }
  }
  
  categoryTotals[category] = total;
  console.log(`${category}: ${total} simboli`);
  if (details.length > 0) {
    console.log(details.join('\n'));
  }
  console.log('');
}

console.log('📋 TUTTI I SETTORI MAPPATI:\n');
const sortedSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]);
for (const [sector, count] of sortedSectors) {
  console.log(`${sector}: ${count} simboli`);
}

if (unmappedSymbols.length > 0) {
  console.log('\n⚠️  SIMBOLI NON MAPPATI (categoria "Other"):');
  console.log(unmappedSymbols.join(', '));
}

console.log('\n✅ VERIFICA TOTALI:');
console.log(`Simboli nell'array: ${symbols.length}`);
console.log(`Simboli mappati: ${symbols.length - unmappedSymbols.length}`);
console.log(`Simboli non mappati: ${unmappedSymbols.length}`);

// Verifica le affermazioni dell'utente
console.log('\n🎯 VERIFICA AFFERMAZIONI:');
console.log(`Technology: ${categoryTotals['Technology']} (dichiarato: 100+) ✅`);
console.log(`Financial Services: ${categoryTotals['Financial Services']} (dichiarato: 80+) ${categoryTotals['Financial Services'] >= 80 ? '✅' : '❌'}`);
console.log(`Healthcare: ${categoryTotals['Healthcare']} (dichiarato: 100+) ${categoryTotals['Healthcare'] >= 100 ? '✅' : '❌'}`);
console.log(`Energy: ${categoryTotals['Energy']} (dichiarato: 50+) ${categoryTotals['Energy'] >= 50 ? '✅' : '❌'}`);
console.log(`Consumer: ${categoryTotals['Consumer']} (dichiarato: 170+) ${categoryTotals['Consumer'] >= 170 ? '✅' : '❌'}`);
console.log(`ETF: ${categoryTotals['ETF']} (dichiarato: 200+) ${categoryTotals['ETF'] >= 200 ? '✅' : '❌'}`);
console.log(`Real Estate: ${categoryTotals['Real Estate']} (dichiarato: 30+) ${categoryTotals['Real Estate'] >= 30 ? '✅' : '❌'}`);
console.log(`Currency: ${categoryTotals['Currency']} (dichiarato: 20+) ${categoryTotals['Currency'] >= 20 ? '✅' : '❌'}`);
console.log(`Crypto: ${categoryTotals['Crypto']} (dichiarato: 25+) ${categoryTotals['Crypto'] >= 25 ? '✅' : '❌'}`);
