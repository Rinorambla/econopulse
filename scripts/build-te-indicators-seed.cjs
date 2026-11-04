// One-off: build src/data/te-indicators-seed.json = { [countrySlug]: { slug: name } }
// from Trading Economics per-country indicator pages. Polite: sequential, 1.2s apart.
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'te-catalog.ts'), 'utf8');
const countries = [...src.matchAll(/slug: '([a-z-]+)', aliases|slug: '([a-z-]+)' \}/g)].map(m => m[1] || m[2]);
const uniq = [...new Set(countries)];
console.log('countries', uniq.length);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const out = {};
  for (const c of uniq) {
    try {
      const r = await fetch(`https://tradingeconomics.com/${c}/indicators`, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(25000) });
      const t = await r.text();
      const re = new RegExp(`href='/${c}/([a-z0-9-]+)'>\\s*([^<]{2,80}?)\\s*<`, 'g');
      const map = {};
      for (const m of t.matchAll(re)) {
        const slug = m[1];
        if (/^(indicators|calendar|forecast|news|stock-market|currency)$/.test(slug) && map[slug]) continue;
        if (!map[slug]) map[slug] = m[2].replace(/\s+/g, ' ').trim();
      }
      out[c] = map;
      console.log(c, r.status, Object.keys(map).length);
    } catch (e) {
      console.log(c, 'ERR', e.message);
    }
    await sleep(1200);
  }
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'te-indicators-seed.json'), JSON.stringify({ fetchedAt: new Date().toISOString(), countries: out }));
  console.log('written');
})();
