# 🚀 EconoPulse iOS — Submission Ready Checklist

**Status: ✅ READY FOR SUBMISSION** (after Apple Developer activation)

Generated: May 8, 2026

---

## ✅ COMPLETED (all done from Windows)

### 1. Native iOS configuration
- ✅ Bundle ID consistent everywhere: **`ai.econopulse.app`**
  - [capacitor.config.ts](capacitor.config.ts)
  - [ios/App/App.xcodeproj/project.pbxproj](ios/App/App.xcodeproj/project.pbxproj) (Debug + Release)
  - [ios/App/App/Info.plist](ios/App/App/Info.plist)
- ✅ App version: **MARKETING_VERSION = 1.0.0**, **CURRENT_PROJECT_VERSION = 1**
- ✅ `ITSAppUsesNonExemptEncryption = false` added to Info.plist (skip export compliance prompt)
- ✅ Removed obsolete `armv7` device capability → now `arm64`
- ✅ Deployment target: iOS 15.0
- ✅ Orientations: portrait + landscape on iPhone, all on iPad
- ✅ Status bar: dark style, `#05070d` background
- ✅ Splash screen storyboard: [ios/App/App/Base.lproj/LaunchScreen.storyboard](ios/App/App/Base.lproj/LaunchScreen.storyboard)
- ✅ Splash images present: `Splash.imageset/` (1x/2x/3x + dark)

### 2. Icons (all 13 sizes)
- ✅ [ios/App/App/Assets.xcassets/AppIcon.appiconset/](ios/App/App/Assets.xcassets/AppIcon.appiconset/) populated + `Contents.json` written
- ✅ Backup on Desktop: `C:\Users\HP\Desktop\EconoPulse-iOS-Assets\icons\`

### 3. Screenshots (App Store Connect uploads)
- ✅ `iphone-6.9/` — 1320×2868 ×6 (REQUIRED)
- ✅ `iphone-6.7/` — 1290×2796 ×6
- ✅ `ipad-13/` — 2064×2752 ×6
- 📂 Location: `C:\Users\HP\Desktop\EconoPulse-iOS-Assets\screenshots\`

### 4. App Store metadata
- ✅ Listing texts (IT + EN): [IOS_APP_STORE_LISTING.md](IOS_APP_STORE_LISTING.md)
- ✅ Privacy Nutrition Label: [IOS_PRIVACY_NUTRITION_LABEL.md](IOS_PRIVACY_NUTRITION_LABEL.md)

### 5. Account deletion (Apple guideline 5.1.1(v) — **REQUIRED since June 2022**)
- ✅ API endpoint: [src/app/api/user/delete/route.ts](src/app/api/user/delete/route.ts)
  - Authenticates via cookie or Bearer token
  - Cancels Stripe subscription
  - Deletes portfolios, watchlists, preferences, alerts
  - Deletes profile row (`users` table)
  - Deletes auth identity (`supabase.auth.admin.deleteUser`)
  - Clears session cookies
- ✅ UI: "Delete my account" button + confirmation modal in [src/components/UserAccountDashboard.tsx](src/components/UserAccountDashboard.tsx)
  - Visible at `/dashboard/account`
  - Requires typing `DELETE` to confirm
  - Redirects to `/?accountDeleted=1` after success

### 6. Privacy Policy updated for iOS compliance
- ✅ [src/app/privacy/page.tsx](src/app/privacy/page.tsx) — last updated May 8, 2026
- ✅ Lists every sub-processor: Supabase, Stripe, Apple StoreKit, OpenAI, Vercel, MongoDB, Google Analytics
- ✅ Explicit account deletion procedure documented
- ✅ States: no IDFA, no ATT prompt, no cross-app tracking
- ✅ Children's privacy (16+) section
- ✅ Data retention policy (30 days post-deletion)
- 🌐 Public URL: https://www.econopulse.ai/privacy

### 7. Terms & Support
- ✅ Terms: [src/app/terms/page.tsx](src/app/terms/page.tsx) → https://www.econopulse.ai/terms
- ✅ Help/FAQ: [src/app/help/page.tsx](src/app/help/page.tsx) → https://www.econopulse.ai/help
- ✅ Contact email: `support@econopulse.ai`

---

## 🟡 PENDING (waiting on you)

### A) Apple Developer activation (24–48h)
- Order #W1403885020 — confirmation email expected at `e•••••••••••••o@econopulse.ai`
- Once activated, login to https://appstoreconnect.apple.com

### B) Deploy the website updates
The new privacy policy + delete-account flow must be **live on www.econopulse.ai** before submission, because the iOS app loads the remote URL.

```powershell
cd C:\Users\HP\Desktop\mysite
git add -A
git commit -m "feat(ios): account deletion endpoint + UI, updated privacy policy for App Store compliance"
git push
# Vercel auto-deploys
```

Verify after deploy:
- https://www.econopulse.ai/privacy → should show "Last updated: May 8, 2026"
- https://www.econopulse.ai/dashboard/account → "Delete Account" section visible
- `POST https://www.econopulse.ai/api/user/delete` → 401 without auth (correct)

### C) Required Vercel env vars (if not already set)
- `SUPABASE_SERVICE_ROLE_KEY` — needed for account deletion
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `OPENAI_API_KEY`

### D) Create a demo account for Apple reviewers
After deploy, create one user manually:
```
Email: review@econopulse.ai
Password: AppleReview2026!
```
- In Supabase, set `subscription_status = 'premium'` for that user
- Save credentials in App Store Connect → App Review Information

---

## 🍎 ON THE MAC (final 30-minute step)

The friend's Mac needs: macOS 13+, Xcode 15+, CocoaPods, Node 20+.

```bash
# 1. Clone repo
git clone https://github.com/<your-org>/mysite.git
cd mysite

# 2. Install web dependencies
npm install

# 3. Sync iOS project (copies plugins, regenerates Pods)
npx cap sync ios

# 4. Open Xcode
npx cap open ios
```

In **Xcode**:

1. Click the **App** project in the navigator → target **App**
2. **Signing & Capabilities** tab:
   - ☑️ Automatically manage signing
   - **Team**: select your Apple Developer team
   - **Bundle Identifier**: `ai.econopulse.app` (already set)
3. **General** tab — verify:
   - Display Name: `EconoPulse`
   - Version: `1.0.0`
   - Build: `1`
   - Minimum Deployments: iOS 15.0
4. Top bar: select destination = **Any iOS Device (arm64)**
5. Menu **Product → Archive**
6. When archive completes → **Window → Organizer**
7. Select the archive → **Distribute App** → **App Store Connect** → **Upload**
8. Follow the wizard (let Xcode sign automatically)

The build appears in App Store Connect → TestFlight after ~10–30 minutes of processing.

---

## 📝 ON APP STORE CONNECT (after activation)

1. https://appstoreconnect.apple.com → **My Apps** → **+** → **New App**
2. Fill from [IOS_APP_STORE_LISTING.md](IOS_APP_STORE_LISTING.md):
   - Platform: iOS
   - Name: `EconoPulse`
   - Primary Language: Italian (Italy)
   - Bundle ID: `ai.econopulse.app`
   - SKU: `ECONOPULSE-IOS-001`
3. **App Information** → fill all fields (categories, age rating, content rights)
4. **Pricing & Availability** → Free, available worldwide (or limit to EU+US to start)
5. **App Privacy** → fill using [IOS_PRIVACY_NUTRITION_LABEL.md](IOS_PRIVACY_NUTRITION_LABEL.md)
6. **iOS App** version 1.0.0:
   - Upload screenshots (iphone-6.9 minimum, iphone-6.7 + ipad-13 if accepted)
   - Promotional text + Description + Keywords (IT and EN)
   - Support URL: `https://www.econopulse.ai/help`
   - Privacy Policy URL: `https://www.econopulse.ai/privacy`
   - Build: select the upload from Xcode
7. **App Review Information**:
   - Demo account: `review@econopulse.ai` / `AppleReview2026!`
   - Notes: copy from [IOS_APP_STORE_LISTING.md](IOS_APP_STORE_LISTING.md) "Notes for Review"
8. **Submit for Review**

Apple typical review time: 24–48 hours.

---

## ⚠️ KNOWN RISK — In-App Purchase

The app currently uses **Stripe web checkout** (no Apple StoreKit IAP).

Apple guideline 3.1.1: digital subscriptions consumed inside the iOS app **must** use IAP. Possible outcomes:

| Scenario | Outcome |
|---|---|
| App lets users browse data freely, payment only on web (with no in-app upgrade button) | ✅ Approved (reader app loophole, but External Link Account Entitlement may be needed) |
| App has a "Subscribe / Upgrade to Pro" button that opens Stripe in-app | ❌ Likely rejected → must add StoreKit |
| App shows ONLY the free tier and hides upgrade UI on iOS | ✅ Approved (then upgrade via website only) |

**Recommended for v1.0**: hide the "Upgrade" CTA when running inside the iOS WebView. Detect via `Capacitor.getPlatform() === 'ios'` and conditionally render. This lets us ship fast; we can add StoreKit in v1.1.

If you want, I can add this iOS detection guard now.

---

## 📁 FILE INVENTORY (everything created in this session)

| File | Purpose |
|---|---|
| [src/app/api/user/delete/route.ts](src/app/api/user/delete/route.ts) | Account deletion endpoint |
| [src/components/UserAccountDashboard.tsx](src/components/UserAccountDashboard.tsx) | UI: Delete Account button + modal |
| [src/app/privacy/page.tsx](src/app/privacy/page.tsx) | Updated privacy policy |
| [ios/App/App/Info.plist](ios/App/App/Info.plist) | Encryption flag, arm64, etc. |
| [ios/App/App.xcodeproj/project.pbxproj](ios/App/App.xcodeproj/project.pbxproj) | MARKETING_VERSION 1.0.0 |
| [scripts/generate-ios-assets.cjs](scripts/generate-ios-assets.cjs) | Icon + screenshot generator |
| [ios/App/App/Assets.xcassets/AppIcon.appiconset/](ios/App/App/Assets.xcassets/AppIcon.appiconset/) | 13 icons + Contents.json |
| [IOS_APP_STORE_LISTING.md](IOS_APP_STORE_LISTING.md) | All listing texts |
| [IOS_PRIVACY_NUTRITION_LABEL.md](IOS_PRIVACY_NUTRITION_LABEL.md) | Privacy questionnaire answers |
| [IOS_SUBMISSION_READY.md](IOS_SUBMISSION_READY.md) | This document |
| `C:\Users\HP\Desktop\EconoPulse-iOS-Assets\` | Backup of all generated assets |

---

## ⏱ WHAT TO DO NOW

1. ✅ **Commit + push** the code changes (so the website goes live with the new privacy + delete flow)
2. ⏳ **Wait** for Apple Developer activation email (24–48h)
3. ⏳ **Setup App Store Connect** scaffolding while waiting (you can already create the app entry once active)
4. 🍎 **Borrow the Mac** → Archive → Upload (30 min)
5. 📤 **Submit for Review** (1–2 days)

🎉 **Then you wait for the green light and EconoPulse is on the App Store.**
