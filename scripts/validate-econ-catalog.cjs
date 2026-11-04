// One-off: validate every FRED id in src/lib/econ-catalog.ts via the public CSV export.
const fs = require('fs');
const src = fs.readFileSync('src/lib/econ-catalog.ts', 'utf8');
const ids = [...new Set([...src.matchAll(/S\('[A-Z0-9]+', '([A-Z0-9]+)(?:@[A-Z0-9]+)?'/g)].map(m => m[1]))];
console.log('ids', ids.length);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const bad = [];
  const info = {};
  let i = 0;
  const worker = async () => {
    while (i < ids.length) {
      const id = ids[i++];
      try {
        const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=2015-01-01`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconoPulse/1.0)' }, signal: AbortSignal.timeout(20000) });
        const t = await r.text();
        const lines = t.trim().split(/\r?\n/);
        if (!r.ok || lines.length < 3 || !/^observation_date/i.test(lines[0])) { bad.push(id); continue; }
        const last = lines.filter(l => !/,\.?$/.test(l)).at(-1);
        info[id] = last;
      } catch (e) { bad.push(id + ' ERR'); }
      await sleep(150);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  console.log('BAD:', bad.join(', ') || 'none');
  const stale = Object.entries(info).filter(([, l]) => l && l < '2024-').map(([id, l]) => `${id}=${l}`);
  console.log('STALE (<2024):', stale.join(', ') || 'none');
})();
