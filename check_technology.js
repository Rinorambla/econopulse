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

// Count Technology symbols specifically
const technologySymbols = [];
symbols.forEach(symbol => {
  const sector = sectorMappings[symbol];
  if (sector === 'Technology') {
    technologySymbols.push(symbol);
  }
});

console.log('🔍 ANALISI DETTAGLIATA TECHNOLOGY:');
console.log('==================================');
console.log(`Simboli nell'array TIINGO_SYMBOLS: ${symbols.length}`);
console.log(`Simboli mappati nel sectors object: ${Object.keys(sectorMappings).length}`);
console.log(`Simboli Technology trovati: ${technologySymbols.length}`);
console.log('');

if (technologySymbols.length > 0) {
  console.log('📋 SIMBOLI TECHNOLOGY (primi 20):');
  technologySymbols.slice(0, 20).forEach((symbol, index) => {
    console.log(`${(index + 1).toString().padStart(2)}: ${symbol}`);
  });
  
  if (technologySymbols.length > 20) {
    console.log(`... e altri ${technologySymbols.length - 20} simboli`);
  }
} else {
  console.log('❌ Nessun simbolo Technology trovato!');
}

console.log('');
console.log('🔍 VERIFICA ALCUNI SIMBOLI TECH COMUNI:');
const commonTechSymbols = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'TSLA'];
commonTechSymbols.forEach(symbol => {
  const inArray = symbols.includes(symbol);
  const sector = sectorMappings[symbol];
  console.log(`${symbol}: Array=${inArray}, Settore=${sector || 'NON MAPPATO'}`);
});
