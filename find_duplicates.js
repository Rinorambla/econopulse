import fs from 'fs';

// Read the route file
const content = fs.readFileSync('src/app/api/dashboard-data/route.ts', 'utf8');

// Extract all sector mappings
const mappingRegex = /['"]([A-Z\.]+)['"]:\s*['"]([^'"]+)['"],?/g;
const mappings = new Map();
const duplicates = new Map();
const lines = content.split('\n');

let match;
while ((match = mappingRegex.exec(content)) !== null) {
  const [fullMatch, symbol, sector] = match;
  
  // Find the line number
  const lineIndex = content.substring(0, match.index).split('\n').length;
  
  if (mappings.has(symbol)) {
    if (!duplicates.has(symbol)) {
      duplicates.set(symbol, [mappings.get(symbol)]);
    }
    duplicates.get(symbol).push({ sector, line: lineIndex });
  } else {
    mappings.set(symbol, { sector, line: lineIndex });
  }
}

console.log('=== DUPLICATE SYMBOLS ===');
for (const [symbol, entries] of duplicates) {
  console.log(`\n${symbol}:`);
  entries.forEach(entry => {
    console.log(`  Line ${entry.line}: '${symbol}': '${entry.sector}'`);
  });
}

console.log(`\nTotal unique symbols: ${mappings.size}`);
console.log(`Symbols with duplicates: ${duplicates.size}`);
