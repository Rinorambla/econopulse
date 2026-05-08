// Generate all iOS App Store + Xcode icon sizes from logo-source.png
// Output: ios-assets/ on Desktop and ios/App/App/Assets.xcassets/AppIcon.appiconset/
// Run: node scripts/generate-ios-assets.cjs

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const os = require('os');

const SOURCE = path.join(__dirname, '..', 'public', 'icons', 'icon-512x512.png');
const ICONSET_DIR = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const DESKTOP_OUT = path.join(os.homedir(), 'Desktop', 'EconoPulse-iOS-Assets');
const ICON_OUT = path.join(DESKTOP_OUT, 'icons');
const SCREENSHOTS_OUT = path.join(DESKTOP_OUT, 'screenshots');

// All iOS icon sizes required by Xcode + App Store
const ICON_SIZES = [
  // App Store
  { size: 1024, name: 'icon-1024.png', purpose: 'App Store marketing' },
  // iPhone
  { size: 180, name: 'icon-180.png', purpose: 'iPhone @3x (60pt)' },
  { size: 120, name: 'icon-120.png', purpose: 'iPhone @2x (60pt) / @3x (40pt)' },
  { size: 87, name: 'icon-87.png', purpose: 'iPhone Settings @3x (29pt)' },
  { size: 80, name: 'icon-80.png', purpose: 'Spotlight @2x (40pt)' },
  { size: 60, name: 'icon-60.png', purpose: 'iPhone Spotlight @3x (20pt)' },
  { size: 58, name: 'icon-58.png', purpose: 'iPhone Settings @2x (29pt)' },
  { size: 40, name: 'icon-40.png', purpose: 'Spotlight @2x (20pt)' },
  { size: 29, name: 'icon-29.png', purpose: 'Settings (29pt)' },
  { size: 20, name: 'icon-20.png', purpose: 'Notification (20pt)' },
  // iPad
  { size: 167, name: 'icon-167.png', purpose: 'iPad Pro @2x (83.5pt)' },
  { size: 152, name: 'icon-152.png', purpose: 'iPad @2x (76pt)' },
  { size: 76, name: 'icon-76.png', purpose: 'iPad (76pt)' },
];

// Screenshots: required iPhone + iPad sizes for App Store Connect
// Apple now accepts a single 6.9" set (iPhone 16 Pro Max) for all iPhones
const SCREENSHOT_SIZES = [
  { w: 1320, h: 2868, name: 'iphone-6.9' },  // iPhone 16 Pro Max (REQUIRED)
  { w: 1290, h: 2796, name: 'iphone-6.7' },  // iPhone 15 Pro Max (legacy fallback)
  { w: 2064, h: 2752, name: 'ipad-13' },     // iPad Pro 13" (optional but recommended)
];

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function generateIcons() {
  await ensureDir(ICON_OUT);
  await ensureDir(ICONSET_DIR);

  console.log('🎨 Generating iOS icons from:', SOURCE);

  for (const { size, name, purpose } of ICON_SIZES) {
    // App Store icon (1024) must be opaque, no alpha
    const isAppStore = size === 1024;
    const pipeline = sharp(SOURCE)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 5, g: 7, b: 13, alpha: 1 }, // #05070d
      });

    if (isAppStore) {
      pipeline.flatten({ background: { r: 5, g: 7, b: 13 } });
    }

    const buffer = await pipeline.png({ quality: 100 }).toBuffer();

    // Save to Desktop output folder
    fs.writeFileSync(path.join(ICON_OUT, name), buffer);
    // Save to Xcode AppIcon.appiconset
    fs.writeFileSync(path.join(ICONSET_DIR, name), buffer);

    console.log(`✅ ${size}x${size} (${purpose})`);
  }

  // Write Contents.json for Xcode
  const contents = {
    images: [
      // iPhone notification 20pt
      { idiom: 'iphone', size: '20x20', scale: '2x', filename: 'icon-40.png' },
      { idiom: 'iphone', size: '20x20', scale: '3x', filename: 'icon-60.png' },
      // iPhone settings 29pt
      { idiom: 'iphone', size: '29x29', scale: '2x', filename: 'icon-58.png' },
      { idiom: 'iphone', size: '29x29', scale: '3x', filename: 'icon-87.png' },
      // iPhone spotlight 40pt
      { idiom: 'iphone', size: '40x40', scale: '2x', filename: 'icon-80.png' },
      { idiom: 'iphone', size: '40x40', scale: '3x', filename: 'icon-120.png' },
      // iPhone app 60pt
      { idiom: 'iphone', size: '60x60', scale: '2x', filename: 'icon-120.png' },
      { idiom: 'iphone', size: '60x60', scale: '3x', filename: 'icon-180.png' },
      // iPad notification 20pt
      { idiom: 'ipad', size: '20x20', scale: '1x', filename: 'icon-20.png' },
      { idiom: 'ipad', size: '20x20', scale: '2x', filename: 'icon-40.png' },
      // iPad settings 29pt
      { idiom: 'ipad', size: '29x29', scale: '1x', filename: 'icon-29.png' },
      { idiom: 'ipad', size: '29x29', scale: '2x', filename: 'icon-58.png' },
      // iPad spotlight 40pt
      { idiom: 'ipad', size: '40x40', scale: '1x', filename: 'icon-40.png' },
      { idiom: 'ipad', size: '40x40', scale: '2x', filename: 'icon-80.png' },
      // iPad app 76pt
      { idiom: 'ipad', size: '76x76', scale: '1x', filename: 'icon-76.png' },
      { idiom: 'ipad', size: '76x76', scale: '2x', filename: 'icon-152.png' },
      // iPad Pro app 83.5pt
      { idiom: 'ipad', size: '83.5x83.5', scale: '2x', filename: 'icon-167.png' },
      // App Store
      { idiom: 'ios-marketing', size: '1024x1024', scale: '1x', filename: 'icon-1024.png' },
    ],
    info: { version: 1, author: 'xcode' },
  };
  fs.writeFileSync(
    path.join(ICONSET_DIR, 'Contents.json'),
    JSON.stringify(contents, null, 2)
  );
  console.log(`\n📝 Contents.json written to AppIcon.appiconset/`);
}

async function generateScreenshots() {
  await ensureDir(SCREENSHOTS_OUT);
  const sourceShots = path.join(__dirname, '..', 'play-store-assets', 'screenshots');
  if (!fs.existsSync(sourceShots)) {
    console.warn('⚠️  Play Store screenshots not found, skipping resize.');
    return;
  }

  const files = fs.readdirSync(sourceShots).filter(f => f.endsWith('.png'));
  console.log(`\n📱 Resizing ${files.length} screenshots for iOS...`);

  for (const { w, h, name } of SCREENSHOT_SIZES) {
    const dir = path.join(SCREENSHOTS_OUT, name);
    await ensureDir(dir);
    for (const file of files) {
      const out = path.join(dir, file);
      await sharp(path.join(sourceShots, file))
        .resize(w, h, {
          fit: 'cover',
          position: 'center',
          background: { r: 5, g: 7, b: 13, alpha: 1 },
        })
        .png({ quality: 95 })
        .toFile(out);
    }
    console.log(`✅ ${name} (${w}x${h}) — ${files.length} screenshots`);
  }
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('❌ Source image not found:', SOURCE);
    process.exit(1);
  }
  await ensureDir(DESKTOP_OUT);
  await generateIcons();
  await generateScreenshots();

  console.log('\n🎉 iOS assets ready!');
  console.log('📂 Desktop folder:', DESKTOP_OUT);
  console.log('📂 Xcode iconset:', ICONSET_DIR);
}

main().catch(e => { console.error(e); process.exit(1); });
