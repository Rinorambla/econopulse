const path = require('path');
const fs = require('fs');

// Read the route.ts file
const routePath = path.join(__dirname, 'src', 'app', 'api', 'dashboard-data', 'route.ts');

if (!fs.existsSync(routePath)) {
  console.error('❌ File route.ts non trovato');
  process.exit(1);
}

const content = fs.readFileSync(routePath, 'utf8');

// Extract TIINGO_SYMBOLS array
const symbolsMatch = content.match(/const TIINGO_SYMBOLS = \[([\s\S]*?)\];/);
if (!symbolsMatch) {
  console.error('❌ TIINGO_SYMBOLS non trovato');
  process.exit(1);
}

const symbolsString = symbolsMatch[1];
const symbols = symbolsString
  .split(',')
  .map(s => s.trim().replace(/['"]/g, ''))
  .filter(s => s.length > 0);

// Extract sector mapping
const sectorMapMatch = content.match(/const sectors: \{ \[key: string\]: string \} = \{([\s\S]*?)\};/);
if (!sectorMapMatch) {
  console.error('❌ Mappatura settori non trovata');
  process.exit(1);
}

const sectorMapString = sectorMapMatch[1];
const sectorEntries = sectorMapString
  .split('\n')
  .filter(line => line.includes(':'))
  .map(line => {
    const match = line.match(/['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/);
    return match ? [match[1], match[2]] : null;
  })
  .filter(entry => entry !== null);

const sectorMap = Object.fromEntries(sectorEntries);

console.log('\n🔍 VERIFICA MAPPATURA SETTORI');
console.log('='.repeat(50));

// Count symbols per sector
const sectorCounts = {};
const unmappedSymbols = [];

symbols.forEach(symbol => {
  const sector = sectorMap[symbol] || 'Other';
  if (!sectorMap[symbol]) {
    unmappedSymbols.push(symbol);
  }
  sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
});

console.log('\n📊 CONTEGGIO PER SETTORE:');
Object.entries(sectorCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([sector, count]) => {
    console.log(`${sector.padEnd(25)} ${count.toString().padStart(3)} simboli`);
  });

console.log(`\nTotale simboli: ${symbols.length}`);
console.log(`Simboli mappati: ${symbols.length - unmappedSymbols.length}`);
console.log(`Simboli non mappati: ${unmappedSymbols.length}`);

if (unmappedSymbols.length > 0) {
  console.log('\n⚠️ Simboli non mappati (andranno in "Other"):');
  unmappedSymbols.forEach(symbol => console.log(`  - ${symbol}`));
}

// Check frontend sector filters
console.log('\n🎯 SETTORI DISPONIBILI PER I FILTRI:');
const uniqueSectors = Object.keys(sectorCounts).sort();
uniqueSectors.forEach(sector => {
  console.log(`  ✓ ${sector}`);
});

console.log('\n✅ Verifica completata!');
console.log(`Settori con simboli: ${uniqueSectors.length}`);
console.log('Tutti i filtri del frontend dovrebbero mostrare risultati.');
