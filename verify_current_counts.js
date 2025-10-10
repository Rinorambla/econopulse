import fs from 'fs';

// Read the API route file
const content = fs.readFileSync('src/app/api/dashboard-data/route.ts', 'utf8');

// Extract sector mapping
const sectorMatch = content.match(/const sectors: \{ \[key: string\]: string \} = \{([\s\S]*?)\s*\};/);
if (!sectorMatch) {
  console.error('❌ Sector mapping not found');
  process.exit(1);
}

// Parse sector mapping
const sectorMapping = {};
const sectorLines = sectorMatch[1].split('\n');
for (const line of sectorLines) {
  const match = line.match(/'([^']+)':\s*'([^']+)'/);
  if (match) {
    sectorMapping[match[1]] = match[2];
  }
}

// Count symbols per sector
const sectorCounts = {};
Object.values(sectorMapping).forEach(sector => {
  sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
});

console.log('📊 CONTEGGIO SIMBOLI PER SETTORE (ATTUALI):');
console.log('='.repeat(50));

// Sort by count descending
const sortedSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]);

let totalSymbols = 0;
sortedSectors.forEach(([sector, count]) => {
  console.log(`${sector.padEnd(25)} : ${count.toString().padStart(3)} simboli`);
  totalSymbols += count;
});

console.log('='.repeat(50));
console.log(`TOTALE SIMBOLI MAPPATI: ${totalSymbols}`);

// Extract TIINGO_SYMBOLS array
const symbolsMatch = content.match(/TIINGO_SYMBOLS = \[([\s\S]*?)\];/);
if (!symbolsMatch) {
  console.error('❌ TIINGO_SYMBOLS not found');
  process.exit(1);
}

const symbolsString = symbolsMatch[1];
const symbols = symbolsString
  .split(/[,\n]/)
  .map(s => s.trim().replace(/['"]/g, '').replace(/\/\/.*$/, ''))
  .filter(s => s && s.length > 0 && !s.startsWith('//'));

console.log(`\nTOTALE SIMBOLI NELL'ARRAY: ${symbols.length}`);
console.log(`SIMBOLI NON MAPPATI: ${symbols.length - totalSymbols}`);
