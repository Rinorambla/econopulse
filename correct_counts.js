import fs from 'fs';

// Read the route file
const content = fs.readFileSync('src/app/api/dashboard-data/route.ts', 'utf8');

// Extract the symbols array
const symbolsMatch = content.match(/const TIINGO_SYMBOLS\s*=\s*\[([\s\S]*?)\];/);
if (!symbolsMatch) {
  console.log('❌ Impossibile trovare TIINGO_SYMBOLS');
  process.exit(1);
}

const symbolsStr = symbolsMatch[1];
const symbols = symbolsStr.match(/'([^']+)'/g)?.map(s => s.replace(/'/g, '')) || [];

// Extract the sector mapping
const sectorMatch = content.match(/const sectors: \{ \[key: string\]: string \} = \{([\s\S]*?)\};/);
if (!sectorMatch) {
  console.log('❌ Impossibile trovare sectors mapping');
  process.exit(1);
}

const sectorsStr = sectorMatch[1];
const sectorMappings = {};
const mappingMatches = sectorsStr.matchAll(/'([^']+)':\s*'([^']+)'/g);

for (const match of mappingMatches) {
  const [, symbol, sector] = match;
  sectorMappings[symbol] = sector;
}

// Count symbols by sector
const sectorCounts = {};
symbols.forEach(symbol => {
  const sector = sectorMappings[symbol];
  if (sector) {
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
  }
});

// Sort by count
const sortedSectors = Object.entries(sectorCounts)
  .sort(([,a], [,b]) => b - a);

console.log('📊 CONTEGGIO REALE SIMBOLI PER SETTORE:');
console.log('==========================================');
sortedSectors.forEach(([sector, count]) => {
  console.log(`${sector.padEnd(30)}: ${count.toString().padStart(3)} simboli`);
});

console.log('==========================================');
const totalMapped = Object.values(sectorCounts).reduce((a, b) => a + b, 0);
console.log(`TOTALE SIMBOLI MAPPATI: ${totalMapped}`);
console.log(`TOTALE SIMBOLI NELL'ARRAY: ${symbols.length}`);
console.log(`SIMBOLI NON MAPPATI: ${symbols.length - totalMapped}`);
