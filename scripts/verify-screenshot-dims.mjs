import fs from 'node:fs';
import path from 'node:path';

const expected = {
  'iphone-6.9': [1320, 2868],
  'iphone-6.7': [1290, 2796],
  'ipad-13': [2064, 2752],
};

let bad = 0;
for (const d of Object.keys(expected)) {
  const dir = path.join('ios-screenshots', d);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f));
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    const [ew, eh] = expected[d];
    const ok = w === ew && h === eh;
    if (!ok) bad++;
    console.log(`${ok ? 'OK ' : 'BAD'}  ${d}/${f}  ${w}x${h}  (${(buf.length / 1024).toFixed(1)} KB)`);
  }
}
console.log(bad === 0 ? '\nAll screenshots match required dimensions.' : `\n${bad} files have wrong dimensions.`);
