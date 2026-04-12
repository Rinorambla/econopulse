// Generate all PWA icon sizes from the SVG icon
// Run: node scripts/generate-icons-from-svg.cjs

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SVG_SOURCE = path.join(__dirname, '..', 'public', 'icon.svg');
const PNG_SOURCE = path.join(__dirname, '..', 'public', 'icons', 'logo-source.png');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

const SIZES = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

async function main() {
  let sourceBuffer;

  // Try PNG first (higher quality if user provided it), otherwise use SVG
  if (fs.existsSync(PNG_SOURCE)) {
    console.log('Using PNG source:', PNG_SOURCE);
    sourceBuffer = fs.readFileSync(PNG_SOURCE);
  } else if (fs.existsSync(SVG_SOURCE)) {
    console.log('Using SVG source:', SVG_SOURCE);
    // Render SVG at high res first
    sourceBuffer = await sharp(SVG_SOURCE, { density: 300 })
      .resize(1024, 1024, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png()
      .toBuffer();
  } else {
    console.error('No source image found!');
    process.exit(1);
  }

  console.log('Generating icons...');

  for (const size of SIZES) {
    const outPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    await sharp(sourceBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png({ quality: 95 })
      .toFile(outPath);
    console.log(`  ${size}x${size}`);
  }

  // favicon.ico
  const faviconPath = path.join(__dirname, '..', 'public', 'favicon.ico');
  await sharp(sourceBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(faviconPath);
  console.log('  favicon.ico');

  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
