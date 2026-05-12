# 📸 EconoPulse — Screenshot Guide for App Store

You'll capture screenshots from your **production website** (https://www.econopulse.ai) using **Chrome DevTools Device Mode** in iPhone resolution, then upload them to App Store Connect.

This is fully compliant with App Store guidelines: screenshots must represent the actual app experience, and since EconoPulse iOS is a Capacitor wrapper around the production website, screenshots taken from the site **are** the app.

---

## 📐 REQUIRED DEVICE SIZES

| Device | Resolution (portrait) | Status | Count |
|---|---|---|---|
| **iPhone 6.9"** (iPhone 16 Pro Max) | `1290 × 2796` | ✅ REQUIRED | 5–8 |
| **iPhone 6.7"** (iPhone 15 Pro Max) | `1290 × 2796` | ✅ REQUIRED | 5–8 (reuse 6.9") |
| iPhone 6.5" (iPhone 14 Plus) | `1284 × 2778` | optional | — |
| iPad 13" | `2064 × 2752` | optional | — |

**Pro tip**: capture once at `1290 × 2796` and use the SAME images for both 6.9" and 6.7" — Apple accepts identical screenshots across these two sizes.

---

## 🎯 PAGES TO CAPTURE (in order of importance)

Take screenshots of these pages **logged in with the demo Premium account** (so charts show real data, no upgrade modals):

### 1️⃣ AI Pulse / Dashboard Home  ⭐ HERO SHOT
**URL**: https://www.econopulse.ai/en/dashboard
**Caption suggestion**: *"AI-powered market intelligence at a glance"*

### 2️⃣ Sector Heatmap
**URL**: https://www.econopulse.ai/en/heatmap (or whichever route hosts the S&P 500 heatmap)
**Caption**: *"S&P 500 sector heatmap — spot rotations in seconds"*

### 3️⃣ AI Portfolio / Portfolio Builder
**URL**: https://www.econopulse.ai/en/portfolio-builder
**Caption**: *"AI portfolio builder — optimize for your risk profile"*

### 4️⃣ Visual AI / Charts
**URL**: https://www.econopulse.ai/en/visual-ai
**Caption**: *"Visual AI — understand markets at a glance"*

### 5️⃣ Market Data / Quotes Page
**URL**: https://www.econopulse.ai/en/markets (or your tickers page)
**Caption**: *"Real-time quotes across global markets"*

### 6️⃣ FedWatch / Macro
**URL**: https://www.econopulse.ai/en/fedwatch
**Caption**: *"Track Fed rate probabilities and macro events"*

### 7️⃣ (Optional) AI Chat / Insights
**URL**: any AI chat or analysis page
**Caption**: *"Ask AI anything about markets"*

### 8️⃣ (Optional) Options / Gamma Exposure
**URL**: https://www.econopulse.ai/en/options (if exists)
**Caption**: *"Institutional options analytics"*

---

## 🛠️ HOW TO CAPTURE (Chrome DevTools — easiest method)

### Step 1 — Open Chrome
1. Go to https://www.econopulse.ai/en/login
2. Log in with your **demo Premium account** (see `IOS_REVIEW_NOTES.md` for credentials)

### Step 2 — Open DevTools
- Press **F12** (or `Ctrl+Shift+I` / `Cmd+Opt+I`)
- Click the **device toolbar icon** (top-left of DevTools, or press `Ctrl+Shift+M` / `Cmd+Shift+M`)

### Step 3 — Set device resolution
- In the device dropdown at the top, choose **Responsive**
- Set width: **`430`**, height: **`932`** (this is iPhone 16 Pro Max CSS pixels)
- Set DPR (device pixel ratio): **`3`** (gives you native `1290 × 2796`)
- Make sure orientation is **portrait**

### Step 4 — Capture each page
For each URL above:
1. Navigate to the page
2. Wait for data to fully load (charts rendered, no spinners)
3. Open DevTools command menu: `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
4. Type: **`Capture full size screenshot`** OR **`Capture screenshot`** (for visible area only — recommended)
5. Save the PNG to `c:\Users\HP\Desktop\mysite\ios-screenshots\`

> ⚠️ Use **"Capture screenshot"** (visible area), NOT "full size". Apple wants viewport-sized images, not tall scrolling pages.

### Step 5 — Verify dimensions
Each PNG should be exactly **1290 × 2796** pixels. If they come out at `430 × 932`, your DPR was 1 instead of 3.

To verify on Windows: right-click PNG → Properties → Details → Dimensions.

---

## 🎨 ALTERNATIVE — Xcode iOS Simulator (if you have a Mac)

If you have access to a Mac:

```bash
# Open Xcode → Open Developer Tool → Simulator
# Select iPhone 16 Pro Max
# Open Safari in the simulator
# Navigate to https://www.econopulse.ai
# Press Cmd+S to save screenshot
```

Files save to Desktop at exact required resolution.

---

## ✨ OPTIONAL — POLISH WITH FRAMES (recommended)

For higher conversion, add **device frames** around your raw screenshots (iPhone bezel + status bar). Free tools:

- **screenshots.pro** — drag-drop, exports App Store sizes
- **previewed.app** — templates for App Store
- **fastlane frameit** — CLI tool if you want automation

Or skip framing — Apple accepts raw viewport screenshots and many top apps use them.

---

## 📁 FILE NAMING CONVENTION

Save as:
```
01_dashboard.png
02_heatmap.png
03_portfolio_builder.png
04_visual_ai.png
05_markets.png
06_fedwatch.png
07_ai_chat.png      (optional)
08_options.png      (optional)
```

App Store Connect uses the **order** you upload them as the display order.

---

## 📤 UPLOAD TO APP STORE CONNECT

Once enrollment is active:

1. Go to App Store Connect → My Apps → EconoPulse → version 1.0.0
2. Scroll to **iPhone Screenshots** section
3. Click **iPhone 6.9" Display** → drag all 5–8 PNG files
4. Repeat for **iPhone 6.7" Display** (upload the same images)
5. Save

Screenshots are reviewed alongside the binary — make sure they match what Apple sees when launching the app.

---

## ⚠️ COMMON SCREENSHOT REJECTIONS

| Reason | How to avoid |
|---|---|
| Status bar shows "Carrier" or wrong time | Use a clean simulator/devtools, or photoshop the bar |
| Placeholder data / lorem ipsum | Log in with demo account, use real data |
| Pricing visible mentioning external payment | NEVER show /pricing page in screenshots (Apple guideline 3.1.1) |
| Screenshot doesn't match the app | All pages MUST be accessible from inside the app |
| Wrong resolution | Verify `1290 × 2796` exactly |
| Text in a language other than store locale | English screenshots for US store, Italian for IT store (optional) |

---

## 🎯 RECOMMENDED FINAL SET (8 screenshots)

For maximum App Store conversion:

1. **Dashboard with AI summary** (hero)
2. **Sector heatmap** (visual wow)
3. **Portfolio builder result page** (value prop)
4. **Visual AI chart** (differentiator)
5. **Real-time quotes table** (substance)
6. **FedWatch / macro calendar** (institutional feel)
7. **AI insight detail page** (depth)
8. **Mobile navigation showing all features** (breadth)

That gives reviewers and users a complete tour of the app's value in 8 frames.
