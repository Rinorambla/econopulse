// Generate 6 branded Play Store screenshots (1080×1920) for EconoPulse.
// Each screenshot is a self-contained SVG → PNG with realistic UI mockup.
// Run: node scripts/generate-screenshots.cjs
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'play-store-assets', 'screenshots');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 1080;
const H = 1920;

// ─── Common pieces ────────────────────────────────────────────────────────
const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <linearGradient id="greenGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <linearGradient id="redGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f87171"/>
      <stop offset="100%" stop-color="#b91c1c"/>
    </linearGradient>
    <linearGradient id="purpleGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#6d28d9"/>
    </linearGradient>
    <linearGradient id="cyanGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#0e7490"/>
    </linearGradient>
    <linearGradient id="chartLine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
    </linearGradient>
  </defs>
`;

const FONT = 'font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif"';

// Header band: brand + tagline (top of every screenshot)
function header(title, subtitle, badge) {
  return `
    <rect x="0" y="0" width="${W}" height="280" fill="url(#blueGrad)"/>
    <text x="60" y="120" ${FONT} font-size="56" font-weight="800" fill="#ffffff">${title}</text>
    <text x="60" y="180" ${FONT} font-size="32" font-weight="500" fill="#dbeafe">${subtitle}</text>
    ${badge ? `<g transform="translate(${W - 280}, 90)">
      <rect width="220" height="60" rx="30" fill="#ffffff" opacity="0.2"/>
      <text x="110" y="40" ${FONT} font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">${badge}</text>
    </g>` : ''}
  `;
}

// Footer with brand
function footer() {
  return `
    <rect x="0" y="${H - 80}" width="${W}" height="80" fill="#0b1220"/>
    <text x="${W / 2}" y="${H - 30}" ${FONT} font-size="24" fill="#64748b" text-anchor="middle">www.econopulse.ai</text>
  `;
}

// ─── 1. DASHBOARD with quotes + chart ─────────────────────────────────────
function screen1Dashboard() {
  const tickers = [
    { sym: 'AAPL', name: 'Apple Inc.', price: '232.45', chg: '+2.34', pct: '+1.02%', up: true },
    { sym: 'MSFT', name: 'Microsoft', price: '438.21', chg: '+5.67', pct: '+1.31%', up: true },
    { sym: 'NVDA', name: 'NVIDIA', price: '142.78', chg: '-1.23', pct: '-0.85%', up: false },
    { sym: 'TSLA', name: 'Tesla', price: '328.92', chg: '+8.45', pct: '+2.64%', up: true },
    { sym: 'GOOGL', name: 'Alphabet', price: '178.34', chg: '+1.89', pct: '+1.07%', up: true },
  ];
  const rows = tickers.map((t, i) => {
    const y = 1100 + i * 130;
    const color = t.up ? '#10b981' : '#ef4444';
    return `
      <rect x="40" y="${y}" width="${W - 80}" height="110" rx="20" fill="url(#card)" stroke="#1e293b" stroke-width="1"/>
      <text x="80" y="${y + 50}" ${FONT} font-size="38" font-weight="800" fill="#ffffff">${t.sym}</text>
      <text x="80" y="${y + 88}" ${FONT} font-size="24" fill="#94a3b8">${t.name}</text>
      <text x="${W - 80}" y="${y + 50}" ${FONT} font-size="38" font-weight="700" fill="#ffffff" text-anchor="end">$${t.price}</text>
      <text x="${W - 80}" y="${y + 88}" ${FONT} font-size="26" font-weight="600" fill="${color}" text-anchor="end">${t.chg} (${t.pct})</text>
    `;
  }).join('');

  // Chart polyline (mini S&P)
  const chartPts = [
    [80, 850], [180, 820], [280, 840], [380, 780], [480, 760],
    [580, 720], [680, 740], [780, 680], [880, 660], [980, 620],
  ];
  const chartArea = `${chartPts.map(p => p.join(',')).join(' ')} 980,1000 80,1000`;
  const chartLine = chartPts.map(p => p.join(',')).join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    ${header('Dashboard', 'Your markets at a glance', 'LIVE')}

    <!-- S&P 500 chart card -->
    <rect x="40" y="320" width="${W - 80}" height="720" rx="24" fill="url(#card)" stroke="#1e293b" stroke-width="1"/>
    <text x="80" y="390" ${FONT} font-size="32" font-weight="700" fill="#ffffff">S&amp;P 500</text>
    <text x="80" y="430" ${FONT} font-size="22" fill="#94a3b8">Last 30 days</text>
    <text x="${W - 80}" y="390" ${FONT} font-size="42" font-weight="800" fill="#10b981" text-anchor="end">5,847.23</text>
    <text x="${W - 80}" y="430" ${FONT} font-size="24" font-weight="600" fill="#10b981" text-anchor="end">+62.84 (+1.09%)</text>

    <!-- Grid lines -->
    <g stroke="#1e293b" stroke-width="1" opacity="0.5">
      <line x1="80" y1="600" x2="${W - 80}" y2="600"/>
      <line x1="80" y1="800" x2="${W - 80}" y2="800"/>
      <line x1="80" y1="1000" x2="${W - 80}" y2="1000"/>
    </g>
    <polygon points="${chartArea}" fill="url(#chartLine)"/>
    <polyline points="${chartLine}" fill="none" stroke="#22d3ee" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>

    <text x="60" y="1080" ${FONT} font-size="28" font-weight="700" fill="#ffffff">Watchlist</text>
    ${rows}
    ${footer()}
  </svg>`;
}

// ─── 2. AI ANALYSIS ───────────────────────────────────────────────────────
function screen2AI() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    ${header('AI Analysis', 'Powered by GPT-4', 'AI')}

    <!-- Ticker header -->
    <rect x="40" y="320" width="${W - 80}" height="200" rx="24" fill="url(#purpleGrad)"/>
    <text x="80" y="400" ${FONT} font-size="56" font-weight="800" fill="#ffffff">AAPL</text>
    <text x="80" y="450" ${FONT} font-size="28" fill="#e9d5ff">Apple Inc. — $232.45</text>
    <g transform="translate(${W - 280}, 360)">
      <rect width="200" height="80" rx="40" fill="#ffffff" opacity="0.25"/>
      <text x="100" y="52" ${FONT} font-size="32" font-weight="800" fill="#ffffff" text-anchor="middle">BULLISH</text>
    </g>

    <!-- Regime card -->
    <rect x="40" y="560" width="${W - 80}" height="280" rx="24" fill="url(#card)" stroke="#1e293b"/>
    <circle cx="100" cy="640" r="20" fill="#10b981"/>
    <text x="140" y="650" ${FONT} font-size="32" font-weight="700" fill="#ffffff">Trending Bullish</text>
    <text x="80" y="710" ${FONT} font-size="24" fill="#cbd5e1">• 20-day return +8.4% — strong momentum</text>
    <text x="80" y="750" ${FONT} font-size="24" fill="#cbd5e1">• Price above 20d VWAP ($228.10)</text>
    <text x="80" y="790" ${FONT} font-size="24" fill="#cbd5e1">• Positive gamma reinforces stability</text>
    <text x="80" y="830" ${FONT} font-size="24" fill="#cbd5e1">• Confidence: 87/100</text>

    <!-- Suggested strategy -->
    <rect x="40" y="880" width="${W - 80}" height="320" rx="24" fill="url(#card)" stroke="#3b82f6" stroke-width="2"/>
    <text x="80" y="950" ${FONT} font-size="28" font-weight="700" fill="#3b82f6">SUGGESTED STRATEGY</text>
    <text x="80" y="1010" ${FONT} font-size="42" font-weight="800" fill="#ffffff">Bull Call Spread</text>
    <text x="80" y="1060" ${FONT} font-size="24" fill="#94a3b8">Long $230 Call / Short $245 Call</text>
    <text x="80" y="1110" ${FONT} font-size="22" fill="#cbd5e1">Max Profit: $850   Max Loss: $650</text>
    <text x="80" y="1150" ${FONT} font-size="22" fill="#cbd5e1">Breakeven: $236.50   Expiry: 2026-06-20</text>

    <!-- AI Insight box -->
    <rect x="40" y="1240" width="${W - 80}" height="560" rx="24" fill="url(#card)" stroke="#1e293b"/>
    <text x="80" y="1310" ${FONT} font-size="28" font-weight="700" fill="#22d3ee">💡 AI INSIGHT</text>
    <text x="80" y="1380" ${FONT} font-size="26" fill="#e2e8f0">Apple shows strong upward momentum</text>
    <text x="80" y="1418" ${FONT} font-size="26" fill="#e2e8f0">supported by positive earnings surprise</text>
    <text x="80" y="1456" ${FONT} font-size="26" fill="#e2e8f0">and bullish options positioning. Call</text>
    <text x="80" y="1494" ${FONT} font-size="26" fill="#e2e8f0">walls at $245 suggest near-term target.</text>
    <text x="80" y="1556" ${FONT} font-size="26" fill="#e2e8f0">Watch for dealer hedging flows above</text>
    <text x="80" y="1594" ${FONT} font-size="26" fill="#e2e8f0">$240 — gamma flip at $235.50.</text>
    <text x="80" y="1656" ${FONT} font-size="26" fill="#e2e8f0">Risk: macro headwinds from FOMC</text>
    <text x="80" y="1694" ${FONT} font-size="26" fill="#e2e8f0">decision next week. Position size</text>
    <text x="80" y="1732" ${FONT} font-size="26" fill="#e2e8f0">accordingly.</text>
    ${footer()}
  </svg>`;
}

// ─── 3. SECTOR HEATMAP ────────────────────────────────────────────────────
function screen3Heatmap() {
  const sectors = [
    { name: 'Technology', pct: '+2.34%', val: 2.34, x: 40,  y: 350, w: 500, h: 380 },
    { name: 'Energy',     pct: '+1.87%', val: 1.87, x: 560, y: 350, w: 480, h: 290 },
    { name: 'Financials', pct: '+1.12%', val: 1.12, x: 560, y: 660, w: 480, h: 240 },
    { name: 'Healthcare', pct: '-0.45%', val: -0.45, x: 40,  y: 750, w: 350, h: 240 },
    { name: 'Consumer',   pct: '+0.78%', val: 0.78, x: 410, y: 920, w: 320, h: 240 },
    { name: 'Industrials',pct: '-0.32%', val: -0.32, x: 750, y: 920, w: 290, h: 240 },
    { name: 'Materials',  pct: '+0.54%', val: 0.54, x: 40,  y: 1010, w: 350, h: 220 },
    { name: 'Utilities',  pct: '-1.23%', val: -1.23, x: 40, y: 1250, w: 500, h: 240 },
    { name: 'Real Estate',pct: '-0.89%', val: -0.89, x: 560, y: 1180, w: 480, h: 200 },
    { name: 'Comm Svcs',  pct: '+1.45%', val: 1.45, x: 560, y: 1400, w: 480, h: 220 },
    { name: 'Staples',    pct: '+0.21%', val: 0.21, x: 40,  y: 1510, w: 500, h: 200 },
  ];
  const colorFor = v => {
    if (v > 1.5) return '#059669';
    if (v > 0.5) return '#10b981';
    if (v > 0) return '#34d399';
    if (v > -0.5) return '#fca5a5';
    if (v > -1.5) return '#ef4444';
    return '#b91c1c';
  };
  const cells = sectors.map(s => {
    const fontSize = Math.min(40, Math.max(20, Math.sqrt(s.w * s.h) / 12));
    return `
      <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="12" fill="${colorFor(s.val)}" opacity="0.9"/>
      <text x="${s.x + s.w / 2}" y="${s.y + s.h / 2 - 10}" ${FONT} font-size="${fontSize}" font-weight="700" fill="#ffffff" text-anchor="middle">${s.name}</text>
      <text x="${s.x + s.w / 2}" y="${s.y + s.h / 2 + fontSize}" ${FONT} font-size="${fontSize * 0.85}" font-weight="800" fill="#ffffff" text-anchor="middle">${s.pct}</text>
    `;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    ${header('Sector Heatmap', 'S&amp;P 500 sectors today', 'LIVE')}
    ${cells}
    <text x="60" y="1780" ${FONT} font-size="22" fill="#64748b">Tap any sector for top movers and analysis</text>
    ${footer()}
  </svg>`;
}

// ─── 4. OPTIONS / GAMMA ───────────────────────────────────────────────────
function screen4Options() {
  // Gamma profile bars
  const strikes = [
    { k: 215, gex: -120, type: 'put' },
    { k: 220, gex: -180, type: 'put' },
    { k: 225, gex: -90,  type: 'put' },
    { k: 230, gex: 60,   type: 'call' },
    { k: 235, gex: 220,  type: 'call' },
    { k: 240, gex: 380,  type: 'call' },
    { k: 245, gex: 290,  type: 'call' },
    { k: 250, gex: 150,  type: 'call' },
  ];
  const baseY = 1100;
  const scale = 1.2;
  const barW = 100;
  const startX = 80;
  const bars = strikes.map((s, i) => {
    const x = startX + i * 115;
    const h = Math.abs(s.gex) * scale;
    const y = s.gex > 0 ? baseY - h : baseY;
    const color = s.gex > 0 ? '#10b981' : '#ef4444';
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="6" fill="${color}" opacity="0.85"/>
      <text x="${x + barW / 2}" y="${baseY + 50}" ${FONT} font-size="20" font-weight="600" fill="#94a3b8" text-anchor="middle">$${s.k}</text>
    `;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    ${header('Options Analytics', 'AAPL — Gamma Exposure', 'PRO')}

    <!-- Stats row -->
    <g transform="translate(40, 320)">
      <rect width="320" height="180" rx="20" fill="url(#card)" stroke="#1e293b"/>
      <text x="40" y="60" ${FONT} font-size="22" fill="#94a3b8">MAX PAIN</text>
      <text x="40" y="120" ${FONT} font-size="48" font-weight="800" fill="#ffffff">$235</text>
      <text x="40" y="155" ${FONT} font-size="22" fill="#10b981">+1.10% from spot</text>
    </g>
    <g transform="translate(380, 320)">
      <rect width="320" height="180" rx="20" fill="url(#card)" stroke="#1e293b"/>
      <text x="40" y="60" ${FONT} font-size="22" fill="#94a3b8">CALL WALL</text>
      <text x="40" y="120" ${FONT} font-size="48" font-weight="800" fill="#10b981">$240</text>
      <text x="40" y="155" ${FONT} font-size="22" fill="#94a3b8">12.4k OI</text>
    </g>
    <g transform="translate(720, 320)">
      <rect width="320" height="180" rx="20" fill="url(#card)" stroke="#1e293b"/>
      <text x="40" y="60" ${FONT} font-size="22" fill="#94a3b8">PUT WALL</text>
      <text x="40" y="120" ${FONT} font-size="48" font-weight="800" fill="#ef4444">$220</text>
      <text x="40" y="155" ${FONT} font-size="22" fill="#94a3b8">9.8k OI</text>
    </g>

    <!-- Gamma chart card -->
    <rect x="40" y="540" width="${W - 80}" height="700" rx="24" fill="url(#card)" stroke="#1e293b"/>
    <text x="80" y="610" ${FONT} font-size="32" font-weight="700" fill="#ffffff">Net GEX by Strike</text>
    <text x="80" y="650" ${FONT} font-size="22" fill="#94a3b8">Positive = stabilizing • Negative = volatile</text>

    <!-- Zero line -->
    <line x1="80" y1="${baseY}" x2="${W - 80}" y2="${baseY}" stroke="#475569" stroke-width="2" stroke-dasharray="6 6"/>
    ${bars}

    <!-- Spot marker -->
    <line x1="424" y1="700" x2="424" y2="${baseY + 30}" stroke="#22d3ee" stroke-width="3" stroke-dasharray="8 4"/>
    <text x="424" y="690" ${FONT} font-size="22" font-weight="700" fill="#22d3ee" text-anchor="middle">SPOT $232.45</text>

    <!-- Strategy summary -->
    <rect x="40" y="1290" width="${W - 80}" height="500" rx="24" fill="url(#card)" stroke="#1e293b"/>
    <text x="80" y="1360" ${FONT} font-size="30" font-weight="700" fill="#ffffff">Top Strategies</text>

    <rect x="80" y="1390" width="${W - 160}" height="100" rx="16" fill="#0f172a" stroke="#10b981" stroke-width="2"/>
    <text x="110" y="1430" ${FONT} font-size="26" font-weight="700" fill="#10b981">Bull Call Spread</text>
    <text x="110" y="1465" ${FONT} font-size="22" fill="#94a3b8">$230/$245 — Score 87/100</text>

    <rect x="80" y="1510" width="${W - 160}" height="100" rx="16" fill="#0f172a" stroke="#3b82f6" stroke-width="2"/>
    <text x="110" y="1550" ${FONT} font-size="26" font-weight="700" fill="#3b82f6">Iron Condor</text>
    <text x="110" y="1585" ${FONT} font-size="22" fill="#94a3b8">$220/$245 — Score 71/100</text>

    <rect x="80" y="1630" width="${W - 160}" height="100" rx="16" fill="#0f172a" stroke="#a78bfa" stroke-width="2"/>
    <text x="110" y="1670" ${FONT} font-size="26" font-weight="700" fill="#a78bfa">Long Straddle</text>
    <text x="110" y="1705" ${FONT} font-size="22" fill="#94a3b8">$232.50 ATM — Score 65/100</text>
    ${footer()}
  </svg>`;
}

// ─── 5. PORTFOLIO ─────────────────────────────────────────────────────────
function screen5Portfolio() {
  const positions = [
    { sym: 'AAPL', qty: 50,  avg: 198.20, last: 232.45, plPct: '+17.28%', up: true },
    { sym: 'MSFT', qty: 25,  avg: 410.50, last: 438.21, plPct: '+6.75%',  up: true },
    { sym: 'NVDA', qty: 100, avg: 156.80, last: 142.78, plPct: '-8.95%',  up: false },
    { sym: 'TSLA', qty: 30,  avg: 280.10, last: 328.92, plPct: '+17.43%', up: true },
  ];
  const rows = positions.map((p, i) => {
    const y = 1100 + i * 150;
    const color = p.up ? '#10b981' : '#ef4444';
    const value = (p.qty * p.last).toFixed(2);
    return `
      <rect x="40" y="${y}" width="${W - 80}" height="130" rx="20" fill="url(#card)" stroke="#1e293b"/>
      <text x="80" y="${y + 50}" ${FONT} font-size="36" font-weight="800" fill="#ffffff">${p.sym}</text>
      <text x="80" y="${y + 90}" ${FONT} font-size="22" fill="#94a3b8">${p.qty} sh @ $${p.avg.toFixed(2)} avg</text>
      <text x="${W - 80}" y="${y + 50}" ${FONT} font-size="32" font-weight="700" fill="#ffffff" text-anchor="end">$${value}</text>
      <text x="${W - 80}" y="${y + 90}" ${FONT} font-size="26" font-weight="700" fill="${color}" text-anchor="end">${p.plPct}</text>
    `;
  }).join('');

  // Donut chart for allocation
  const donutCx = 380, donutCy = 600, donutR = 180;
  const donutSlices = `
    <circle cx="${donutCx}" cy="${donutCy}" r="${donutR}" fill="none" stroke="#1e293b" stroke-width="60"/>
    <circle cx="${donutCx}" cy="${donutCy}" r="${donutR}" fill="none" stroke="#3b82f6" stroke-width="60"
      stroke-dasharray="${0.40 * 2 * Math.PI * donutR} ${2 * Math.PI * donutR}" transform="rotate(-90 ${donutCx} ${donutCy})"/>
    <circle cx="${donutCx}" cy="${donutCy}" r="${donutR}" fill="none" stroke="#10b981" stroke-width="60"
      stroke-dasharray="${0.25 * 2 * Math.PI * donutR} ${2 * Math.PI * donutR}"
      stroke-dashoffset="${-0.40 * 2 * Math.PI * donutR}" transform="rotate(-90 ${donutCx} ${donutCy})"/>
    <circle cx="${donutCx}" cy="${donutCy}" r="${donutR}" fill="none" stroke="#a78bfa" stroke-width="60"
      stroke-dasharray="${0.20 * 2 * Math.PI * donutR} ${2 * Math.PI * donutR}"
      stroke-dashoffset="${-0.65 * 2 * Math.PI * donutR}" transform="rotate(-90 ${donutCx} ${donutCy})"/>
    <circle cx="${donutCx}" cy="${donutCy}" r="${donutR}" fill="none" stroke="#f59e0b" stroke-width="60"
      stroke-dasharray="${0.15 * 2 * Math.PI * donutR} ${2 * Math.PI * donutR}"
      stroke-dashoffset="${-0.85 * 2 * Math.PI * donutR}" transform="rotate(-90 ${donutCx} ${donutCy})"/>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    ${header('Portfolio', 'Track your investments', '')}

    <!-- Total value card -->
    <rect x="40" y="320" width="${W - 80}" height="200" rx="24" fill="url(#greenGrad)"/>
    <text x="80" y="390" ${FONT} font-size="26" fill="#d1fae5">TOTAL VALUE</text>
    <text x="80" y="470" ${FONT} font-size="68" font-weight="800" fill="#ffffff">$48,392.50</text>
    <text x="${W - 80}" y="430" ${FONT} font-size="32" font-weight="700" fill="#ffffff" text-anchor="end">+$5,847.20</text>
    <text x="${W - 80}" y="475" ${FONT} font-size="26" fill="#d1fae5" text-anchor="end">+13.74% YTD</text>

    <!-- Donut chart -->
    <rect x="40" y="540" width="${W - 80}" height="500" rx="24" fill="url(#card)" stroke="#1e293b"/>
    <text x="80" y="610" ${FONT} font-size="30" font-weight="700" fill="#ffffff">Allocation</text>
    ${donutSlices}
    <text x="${donutCx}" y="${donutCy - 10}" ${FONT} font-size="32" font-weight="800" fill="#ffffff" text-anchor="middle">4</text>
    <text x="${donutCx}" y="${donutCy + 30}" ${FONT} font-size="22" fill="#94a3b8" text-anchor="middle">Holdings</text>

    <!-- Legend -->
    <g transform="translate(620, 620)">
      <rect width="20" height="20" rx="4" fill="#3b82f6"/>
      <text x="40" y="18" ${FONT} font-size="24" fill="#e2e8f0">AAPL — 40%</text>
    </g>
    <g transform="translate(620, 700)">
      <rect width="20" height="20" rx="4" fill="#10b981"/>
      <text x="40" y="18" ${FONT} font-size="24" fill="#e2e8f0">MSFT — 25%</text>
    </g>
    <g transform="translate(620, 780)">
      <rect width="20" height="20" rx="4" fill="#a78bfa"/>
      <text x="40" y="18" ${FONT} font-size="24" fill="#e2e8f0">NVDA — 20%</text>
    </g>
    <g transform="translate(620, 860)">
      <rect width="20" height="20" rx="4" fill="#f59e0b"/>
      <text x="40" y="18" ${FONT} font-size="24" fill="#e2e8f0">TSLA — 15%</text>
    </g>

    <text x="60" y="1080" ${FONT} font-size="28" font-weight="700" fill="#ffffff">Positions</text>
    ${rows}
    ${footer()}
  </svg>`;
}

// ─── 6. ECONOMIC CALENDAR ─────────────────────────────────────────────────
function screen6Calendar() {
  const events = [
    { date: 'Today',    time: '14:30 ET', country: '🇺🇸', name: 'Initial Jobless Claims',  imp: 'medium', forecast: '215K', prev: '218K' },
    { date: 'Today',    time: '20:00 ET', country: '🇺🇸', name: 'FOMC Rate Decision',      imp: 'high',   forecast: '5.00%', prev: '5.25%' },
    { date: 'Tomorrow', time: '08:30 ET', country: '🇺🇸', name: 'Non-Farm Payrolls',       imp: 'high',   forecast: '180K', prev: '227K' },
    { date: 'Tomorrow', time: '10:00 ET', country: '🇺🇸', name: 'ISM Services PMI',        imp: 'medium', forecast: '52.5', prev: '52.1' },
    { date: 'Fri May 8','time': '11:00 ET', country: '🇪🇺', name: 'ECB Press Conference',  imp: 'high',   forecast: '—',    prev: '—' },
    { date: 'Mon May 11','time': '04:00 ET', country: '🇨🇳', name: 'CPI YoY',              imp: 'medium', forecast: '0.3%', prev: '0.1%' },
  ];
  const impColor = (imp) => imp === 'high' ? '#ef4444' : imp === 'medium' ? '#f59e0b' : '#64748b';
  const rows = events.map((e, i) => {
    const y = 360 + i * 230;
    return `
      <rect x="40" y="${y}" width="${W - 80}" height="200" rx="20" fill="url(#card)" stroke="#1e293b"/>
      <rect x="40" y="${y}" width="10" height="200" rx="5" fill="${impColor(e.imp)}"/>
      <text x="80" y="${y + 50}" ${FONT} font-size="22" font-weight="600" fill="#94a3b8">${e.date} • ${e.time}</text>
      <text x="80" y="${y + 110}" ${FONT} font-size="34" font-weight="700" fill="#ffffff">${e.country}  ${e.name}</text>
      <text x="80" y="${y + 165}" ${FONT} font-size="24" fill="#cbd5e1">Forecast: <tspan fill="#22d3ee" font-weight="700">${e.forecast}</tspan>   Previous: <tspan fill="#94a3b8">${e.prev}</tspan></text>
      <g transform="translate(${W - 220}, ${y + 30})">
        <rect width="160" height="50" rx="25" fill="${impColor(e.imp)}" opacity="0.25"/>
        <text x="80" y="34" ${FONT} font-size="22" font-weight="700" fill="${impColor(e.imp)}" text-anchor="middle">${e.imp.toUpperCase()}</text>
      </g>
    `;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    ${header('Economic Calendar', 'Macro events that move markets', 'LIVE')}
    ${rows}
    ${footer()}
  </svg>`;
}

// ─── Render all ───────────────────────────────────────────────────────────
const screens = [
  { name: '1-dashboard.png',  svg: screen1Dashboard() },
  { name: '2-ai-analysis.png', svg: screen2AI() },
  { name: '3-sector-heatmap.png', svg: screen3Heatmap() },
  { name: '4-options-gamma.png', svg: screen4Options() },
  { name: '5-portfolio.png', svg: screen5Portfolio() },
  { name: '6-calendar.png', svg: screen6Calendar() },
];

(async () => {
  for (const s of screens) {
    const out = path.join(OUT_DIR, s.name);
    await sharp(Buffer.from(s.svg)).png({ compressionLevel: 9 }).toFile(out);
    console.log('✅', s.name);
  }
  console.log('\n📦 All screenshots in:', OUT_DIR);
})().catch(err => { console.error('❌', err); process.exit(1); });
