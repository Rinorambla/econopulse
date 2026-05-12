/**
 * Capture App Store screenshots from production site using Playwright.
 * - One login, reused storageState across all device contexts.
 * - Warmup /api/me from the browser before navigating, so useAuth populates plan.
 */
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'https://www.econopulse.ai';
const EMAIL = process.env.APPLE_REVIEW_EMAIL || 'apple.review@econopulse.ai';
const PASSWORD = process.env.APPLE_REVIEW_PASSWORD || 'AppleReview2026!';

const PAGES = [
  { slug: '01-dashboard',     path: '/dashboard',    waitMs: 12000 },
  { slug: '02-ai-portfolio',  path: '/ai-portfolio', waitMs: 12000 },
  { slug: '03-visual-ai',     path: '/visual-ai',    waitMs: 12000 },
  { slug: '04-market-dna',    path: '/market-dna',   waitMs: 12000 },
  { slug: '05-ai-pulse',      path: '/ai-pulse',     waitMs: 12000 },
  { slug: '06-home',          path: '/',             waitMs: 6000 },
];

const DEVICES = [
  { dir: 'iphone-6.9', width: 1320, height: 2868, dsf: 3, isMobile: true,  ua: devices['iPhone 14 Pro Max'].userAgent },
  { dir: 'iphone-6.7', width: 1290, height: 2796, dsf: 3, isMobile: true,  ua: devices['iPhone 14 Pro Max'].userAgent },
  { dir: 'ipad-13',    width: 2064, height: 2752, dsf: 2, isMobile: false, ua: devices['iPad Pro 11'].userAgent },
];

const OUT_ROOT = path.resolve(process.cwd(), 'ios-screenshots');
const STATE_FILE = path.resolve(process.cwd(), '.playwright-state.json');

async function dismissCookieBanner(page) {
  const tries = [
    'button:has-text("Accept All")',
    'button:has-text("Accept")',
    'button:has-text("Accetta tutti")',
    'button:has-text("Accetta")',
  ];
  for (const sel of tries) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.click({ timeout: 2000 });
        await page.waitForTimeout(600);
        return true;
      }
    } catch {}
  }
  return false;
}

async function doLoginAndSaveState(browser) {
  console.log(`Logging in once as ${EMAIL}, saving storageState...`);
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'en-US',
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissCookieBanner(page);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(7000);
  const me = await page.evaluate(async () => {
    try { const r = await fetch('/api/me', { credentials: 'include' }); return await r.json(); }
    catch (e) { return { error: String(e) }; }
  });
  console.log('  /api/me (browser fetch):', JSON.stringify(me));
  if (!me.authenticated) throw new Error('Login failed -- aborting');
  await ctx.storageState({ path: STATE_FILE });
  console.log('  saved', STATE_FILE);
  await ctx.close();
}

async function captureForDevice(browser, device) {
  const outDir = path.join(OUT_ROOT, device.dir);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`\n=== ${device.dir} (${device.width}x${device.height}) ===`);

  const viewport = {
    width: Math.round(device.width / device.dsf),
    height: Math.round(device.height / device.dsf),
  };

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: device.dsf,
    userAgent: device.ua,
    isMobile: device.isMobile,
    hasTouch: device.isMobile,
    locale: 'en-US',
    colorScheme: 'dark',
    storageState: STATE_FILE,
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissCookieBanner(page);
  const warm = await page.evaluate(async () => {
    try { const r = await fetch('/api/me', { credentials: 'include' }); return await r.json(); }
    catch { return null; }
  });
  console.log('  warmup /api/me:', warm && warm.authenticated ? `OK plan=${warm.plan}` : 'NOT AUTH');

  // Pre-seed sessionStorage plan cache so useAuth/PlanGate doesn't render
  // "Upgrade Required" while it fetches /api/me. Matches cacheKey pattern in useAuth.tsx.
  if (warm && warm.authenticated && warm.id) {
    const cacheKey = `plan_cache_${warm.id}`;
    const cacheValue = JSON.stringify({ plan: warm.plan, isAdmin: warm.isAdmin || false, timestamp: Date.now() });
    await page.addInitScript(({ key, value }) => {
      try { sessionStorage.setItem(key, value); } catch {}
    }, { key: cacheKey, value: cacheValue });
    await page.evaluate(({ key, value }) => {
      try { sessionStorage.setItem(key, value); } catch {}
    }, { key: cacheKey, value: cacheValue });
    console.log('  injected plan cache for', warm.id);
  }

  for (const p of PAGES) {
    const url = `${BASE}${p.path}`;
    const file = path.join(outDir, `${p.slug}.png`);
    console.log(`  -> ${p.path}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch {}
    await dismissCookieBanner(page);
    await page.waitForTimeout(p.waitMs);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`    saved ${path.relative(process.cwd(), file)}`);
  }

  await context.close();
}

(async () => {
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    if (!fs.existsSync(STATE_FILE) || process.env.RELOGIN === '1') {
      await doLoginAndSaveState(browser);
    } else {
      console.log('Reusing existing', STATE_FILE);
    }
    for (const d of DEVICES) {
      await captureForDevice(browser, d);
    }
  } finally {
    await browser.close();
  }
  console.log('\nDone. Screenshots in ./ios-screenshots/');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
