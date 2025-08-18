import fs from 'fs';

// Read the route file
const content = fs.readFileSync('src/app/api/dashboard-data/route.ts', 'utf8');

// Find the function boundaries
const getSectorStart = content.indexOf('function getSectorForTicker');
const getSectorEnd = content.indexOf('}', getSectorStart + content.substring(getSectorStart).indexOf('{'));

// Extract the sector mapping section
const beforeSector = content.substring(0, getSectorStart);
const sectorFunction = content.substring(getSectorStart, getSectorEnd + 1);
const afterSector = content.substring(getSectorEnd + 1);

// Find the sectors object
const sectorsStart = sectorFunction.indexOf('const sectors: { [key: string]: string } = {');
const sectorsEnd = sectorFunction.lastIndexOf('};');

const beforeSectors = sectorFunction.substring(0, sectorsStart);
const sectorsContent = sectorFunction.substring(sectorsStart, sectorsEnd + 2);
const afterSectors = sectorFunction.substring(sectorsEnd + 2);

// Parse all mappings in the sectors object
const mappingRegex = /['"]([A-Z\.]+)['"]:\s*['"]([^'"]+)['"],?/g;
const uniqueMappings = new Map();
const duplicates = [];

let match;
while ((match = mappingRegex.exec(sectorsContent)) !== null) {
  const [fullMatch, symbol, sector] = match;
  
  if (uniqueMappings.has(symbol)) {
    // Keep the first occurrence, mark later ones as duplicates
    duplicates.push(fullMatch);
  } else {
    uniqueMappings.set(symbol, sector);
  }
}

console.log(`Found ${duplicates.length} duplicate entries to remove`);

// Remove duplicates
let cleanedSectorsContent = sectorsContent;
duplicates.forEach(duplicate => {
  // Find the exact line and remove it
  const lines = cleanedSectorsContent.split('\n');
  const filteredLines = lines.filter(line => !line.trim().includes(duplicate));
  cleanedSectorsContent = filteredLines.join('\n');
});

// Reconstruct the file
const newContent = beforeSector + beforeSectors + cleanedSectorsContent + afterSectors + afterSector;

// Write the cleaned file
fs.writeFileSync('src/app/api/dashboard-data/route.ts', newContent);

console.log('File cleaned successfully!');
console.log(`Removed ${duplicates.length} duplicate entries`);
console.log(`Kept ${uniqueMappings.size} unique symbol mappings`);
