import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://www.econopulse.ai';
const STATE_FILE = '.playwright-state.json';

const DEVICES = [
  { dir: 'iphone-6.9', width: 1320, height: 2868, dsf: 3, isMobile: true,  ua: devices['iPhone 14 Pro Max'].userAgent },
  { dir: 'iphone-6.7', width: 1290, height: 2796, dsf: 3, isMobile: true,  ua: devices['iPhone 14 Pro Max'].userAgent },
  { dir: 'ipad-13',    width: 2064, height: 2752, dsf: 2, isMobile: false, ua: devices['iPad Pro 11'].userAgent },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const d of DEVICES) {
    const ctx = await browser.newContext({
      viewport: { width: Math.round(d.width / d.dsf), height: Math.round(d.height / d.dsf) },
      deviceScaleFactor: d.dsf,
      userAgent: d.ua,
      isMobile: d.isMobile,
      hasTouch: d.isMobile,
      locale: 'en-US',
      colorScheme: 'dark',
      storageState: STATE_FILE,
    });
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem('cookie-consent', JSON.stringify({
          necessary: true, analytics: true, marketing: true, preferences: true,
          timestamp: new Date().toISOString(),
        }));
      } catch {}
    });
    const page = await ctx.newPage();
    // Warm up
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    const me = await page.evaluate(async () => {
      try { const r = await fetch('/api/me', { credentials: 'include' }); return await r.json(); } catch { return null; }
    });
    if (me?.id) {
      const key = `plan_cache_${me.id}`;
      const val = JSON.stringify({ plan: me.plan, isAdmin: !!me.isAdmin, timestamp: Date.now() });
      await page.addInitScript(({ key, val }) => { try { sessionStorage.setItem(key, val); } catch {} }, { key, val });
    }
    console.log(`\n=== ${d.dir} ===  auth=${me?.authenticated} plan=${me?.plan}`);
    await page.goto(`${BASE}/market-dna`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(35000);
    const file = path.join('ios-screenshots', d.dir, '04-market-dna.png');
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  saved ${file}`);
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
