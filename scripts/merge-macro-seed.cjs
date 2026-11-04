#!/usr/bin/env node
// Merge one or more build-macro-seed responses (saved with &out=json) into
// src/data/macro-matrix-seed.json.
//
//   node scripts/merge-macro-seed.cjs seed-US.json seed-EU.json ...
const fs = require('fs');
const path = require('path');

const SEED = path.join(__dirname, '..', 'src', 'data', 'macro-matrix-seed.json');
let seed = { builtAt: '', countries: {} };
try { seed = JSON.parse(fs.readFileSync(SEED, 'utf8')); } catch { /* fresh */ }

for (const file of process.argv.slice(2)) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const src = j.seed || j;
  for (const [code, payload] of Object.entries(src.countries || {})) {
    if (!payload || !Array.isArray(payload.rows) || !payload.rows.length) continue;
    seed.countries[code] = payload;
    console.log(`${code}: rows=${payload.rows.length}`);
  }
  if (src.builtAt && src.builtAt > seed.builtAt) seed.builtAt = src.builtAt;
}
fs.writeFileSync(SEED, JSON.stringify(seed), 'utf8');
console.log(`written ${SEED} (${Object.keys(seed.countries).length} countries)`);
