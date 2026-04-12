// Generate all icon sizes from logo-source.png
// Run: node scripts/generate-icons.cjs

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, '..', 'public', 'icons', 'logo-source.png');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

const SIZES = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('❌ Source image not found at:', SOURCE);
    console.log('Please save the logo as public/icons/logo-source.png first');
    process.exit(1);
  }

  console.log('🎨 Generating icons from:', SOURCE);

  for (const size of SIZES) {
    const outPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } }) // #0f172a background
      .png({ quality: 95 })
      .toFile(outPath);
    console.log(`✅ ${size}x${size} → ${outPath}`);
  }

  // Also generate favicon.ico (32x32 PNG renamed as ico)
  const faviconPath = path.join(__dirname, '..', 'public', 'favicon.ico');
  await sharp(SOURCE)
    .resize(32, 32, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(faviconPath);
  console.log(`✅ favicon.ico → ${faviconPath}`);

  // Copy 512x512 as the main app icon
  const icon512 = path.join(OUTPUT_DIR, 'icon-512x512.png');
  const iconBasePath = path.join(OUTPUT_DIR, 'icon-base.png');
  if (fs.existsSync(icon512)) {
    fs.copyFileSync(icon512, iconBasePath);
    console.log(`✅ icon-base.png copied`);
  }

  console.log('\n🎉 All icons generated successfully!');
  console.log('Now commit and push to update the favicon on Google and Vercel.');
}

main().catch(e => { console.error(e); process.exit(1); });
