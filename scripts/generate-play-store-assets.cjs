// Generates Google Play feature graphic (1024x500) and Play Store icon (512x512).
// Run: node scripts/generate-play-store-assets.cjs
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'play-store-assets');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Feature Graphic 1024×500 ─────────────────────────────────────────────
const featureSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
    <linearGradient id="eGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="50%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0"/>
      <stop offset="50%" stop-color="#22d3ee" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1024" height="500" fill="url(#bg)"/>

  <!-- Subtle grid -->
  <g stroke="#1e293b" stroke-width="1" opacity="0.4">
    <line x1="0" y1="125" x2="1024" y2="125"/>
    <line x1="0" y1="250" x2="1024" y2="250"/>
    <line x1="0" y1="375" x2="1024" y2="375"/>
    <line x1="256" y1="0" x2="256" y2="500"/>
    <line x1="512" y1="0" x2="512" y2="500"/>
    <line x1="768" y1="0" x2="768" y2="500"/>
  </g>

  <!-- Decorative chart line (right side) -->
  <polyline points="560,380 620,340 660,360 720,300 770,320 820,250 880,270 940,200 990,220"
            fill="none" stroke="url(#line)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="560,380 620,340 660,360 720,300 770,320 820,250 880,270 940,200 990,220"
            fill="none" stroke="#22d3ee" stroke-width="1.5" opacity="0.6" stroke-linecap="round"/>

  <!-- Candlestick decorations -->
  <g opacity="0.7">
    <rect x="595" y="335" width="6" height="20" fill="#10b981"/>
    <rect x="635" y="345" width="6" height="22" fill="#ef4444"/>
    <rect x="695" y="290" width="6" height="25" fill="#10b981"/>
    <rect x="745" y="305" width="6" height="22" fill="#ef4444"/>
    <rect x="795" y="240" width="6" height="20" fill="#10b981"/>
    <rect x="855" y="260" width="6" height="18" fill="#10b981"/>
    <rect x="915" y="195" width="6" height="22" fill="#10b981"/>
  </g>

  <!-- Logo "E" badge (left) -->
  <g transform="translate(60, 140)">
    <rect width="220" height="220" rx="44" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
    <path d="M60 50 h100 c5 0 5 0 5 5 v17 c0 5 0 5 -5 5 H85 v29 h60 c5 0 5 0 5 5 v17 c0 5 0 5 -5 5 H85 v29 h74 c5 0 5 0 5 5 v17 c0 5 0 5 -5 5 H60 c-5 0-5 0-5-5 V55 c0-5 0-5 5-5z"
          fill="url(#eGrad)" transform="scale(1.0)"/>
  </g>

  <!-- Brand text -->
  <text x="320" y="220"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="72" font-weight="800" fill="#ffffff" letter-spacing="-1">EconoPulse</text>

  <!-- Tagline -->
  <text x="320" y="270"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="24" font-weight="500" fill="#93c5fd" letter-spacing="0.5">AI-Powered Market Analysis</text>

  <!-- Feature pills -->
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="15" font-weight="600">
    <g transform="translate(320, 310)">
      <rect width="135" height="34" rx="17" fill="#1e40af" opacity="0.4" stroke="#3b82f6" stroke-width="1"/>
      <text x="67" y="22" fill="#dbeafe" text-anchor="middle">Real-Time Data</text>
    </g>
    <g transform="translate(465, 310)">
      <rect width="105" height="34" rx="17" fill="#0e7490" opacity="0.4" stroke="#22d3ee" stroke-width="1"/>
      <text x="52" y="22" fill="#cffafe" text-anchor="middle">AI Insights</text>
    </g>
    <g transform="translate(320, 354)">
      <rect width="135" height="34" rx="17" fill="#065f46" opacity="0.4" stroke="#10b981" stroke-width="1"/>
      <text x="67" y="22" fill="#d1fae5" text-anchor="middle">Options Analytics</text>
    </g>
    <g transform="translate(465, 354)">
      <rect width="105" height="34" rx="17" fill="#7c2d12" opacity="0.4" stroke="#fb923c" stroke-width="1"/>
      <text x="52" y="22" fill="#ffedd5" text-anchor="middle">Portfolio</text>
    </g>
  </g>

  <!-- Domain footer -->
  <text x="60" y="465"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="16" font-weight="500" fill="#64748b">www.econopulse.ai</text>
</svg>`;

(async () => {
  const featurePath = path.join(OUT_DIR, 'feature-graphic-1024x500.png');
  await sharp(Buffer.from(featureSvg))
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(featurePath);
  console.log('✅ Feature graphic:', featurePath);

  // Copy 512×512 icon (already exists in public/icons)
  const iconSrc = path.join(__dirname, '..', 'public', 'icons', 'icon-512x512.png');
  const iconDst = path.join(OUT_DIR, 'icon-512x512.png');
  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, iconDst);
    console.log('✅ Play Store icon:', iconDst);
  } else {
    console.warn('⚠️ public/icons/icon-512x512.png not found');
  }

  // ─── Bonus: phone screenshot template (1080×1920) with brand frame ──────
  // Generates a placeholder you can replace with real screenshots later.
  const phoneTemplate = `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="phoneBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#phoneBg)"/>
  <text x="540" y="200" font-family="Segoe UI, Arial" font-size="56" font-weight="800" fill="#ffffff" text-anchor="middle">EconoPulse</text>
  <text x="540" y="260" font-family="Segoe UI, Arial" font-size="28" fill="#93c5fd" text-anchor="middle">AI-Powered Market Analysis</text>
  <rect x="80" y="320" width="920" height="1450" rx="40" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
  <text x="540" y="1050" font-family="Segoe UI, Arial" font-size="40" fill="#475569" text-anchor="middle">[ Replace with real screenshot ]</text>
  <text x="540" y="1850" font-family="Segoe UI, Arial" font-size="24" fill="#64748b" text-anchor="middle">www.econopulse.ai</text>
</svg>`;
  const phonePath = path.join(OUT_DIR, 'screenshot-template-1080x1920.png');
  await sharp(Buffer.from(phoneTemplate)).png().toFile(phonePath);
  console.log('✅ Screenshot template:', phonePath);

  console.log('\n📦 All assets in:', OUT_DIR);
})().catch(err => { console.error('❌', err); process.exit(1); });
