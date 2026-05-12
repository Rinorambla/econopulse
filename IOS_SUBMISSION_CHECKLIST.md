# 🚀 EconoPulse iOS — Master Submission Checklist

**Goal**: ship to App Store, worldwide, English primary, Italian localized.

Once your Apple Developer enrollment is **Active**, follow this in order. Estimated time once enrollment is live: **30–60 minutes** end-to-end.

---

## ⏳ PHASE 0 — WAITING FOR APPLE (now)

- [x] $99 Apple Developer Program payment completed (Order #W1403885020)
- [x] Invoice received
- [ ] Apple processes enrollment (24–48h typical)
- [ ] Confirmation email arrives at `rinobijou@icloud.com`
- [ ] developer.apple.com → Membership shows **Active**
- [ ] appstoreconnect.apple.com is accessible

**Verify daily**: log in to https://developer.apple.com/account → if you see Membership section with expiry date, you're active.

---

## 📦 PHASE 1 — PREPARE ASSETS (do NOW, no Apple needed)

### A. App icon ✅ DONE
- [x] 1024×1024 PNG at `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- [x] All 13 size variants generated (`scripts/generate-ios-assets.cjs`)
- [x] No transparency, no rounded corners (Apple adds them)

### B. App metadata ✅ DONE
- [x] Listing text: `IOS_APP_STORE_LISTING.md` (EN + IT, worldwide)
- [x] Privacy nutrition label: `IOS_PRIVACY_NUTRITION_LABEL.md`
- [x] Review notes + demo account spec: `IOS_REVIEW_NOTES.md`

### C. Compliance fixes ✅ DONE
- [x] Account deletion endpoint: `/api/user/delete`
- [x] Account deletion UI: `UserAccountDashboard.tsx`
- [x] iOS commerce guards: `useIsIOSApp()` hides /pricing on iOS
- [x] Privacy policy rewritten: `/privacy`
- [x] Info.plist: `ITSAppUsesNonExemptEncryption=false`, `arm64`
- [x] MARKETING_VERSION = `1.0.0`

### D. Demo account
- [ ] Create user `apple.review@econopulse.ai` on production site
- [ ] Set plan = `premium`, status = `active`, expiry = `2027-12-31`
- [ ] Test login from a fresh browser
- [ ] Verify Premium features are unlocked for this user

→ Instructions: `IOS_REVIEW_NOTES.md` section "How to create the demo user"

### E. Screenshots
- [ ] Capture 5–8 screenshots at `1290 × 2796` from production site
- [ ] Save to `c:\Users\HP\Desktop\mysite\ios-screenshots\`
- [ ] Verify dimensions and that they show real data (no spinners/placeholders)

→ Instructions: `IOS_SCREENSHOTS_GUIDE.md`

### F. (Recommended) Test build on simulator
- [ ] If you have a Mac: open `ios/App/App.xcworkspace` in Xcode
- [ ] Select iPhone 16 Pro Max simulator → Run (⌘R)
- [ ] Walk through the app, verify everything works
- [ ] No console errors, no white screens

→ If you don't have a Mac, you'll need one (or **MacInCloud** / **MacStadium** rental ~$30/month) to upload the build to App Store Connect. Xcode is **macOS-only**.

---

## 🏗️ PHASE 2 — BUILD & UPLOAD (requires Mac + active Apple Dev account)

### Pre-build verification
On the Mac:

```bash
cd /path/to/mysite
npm install
npm run build        # build Next.js (capacitor uses live URL so this is mostly for sanity)
npx cap sync ios     # sync any web changes to iOS project
cd ios/App
pod install          # install CocoaPods dependencies (first time only)
```

### Xcode steps
1. Open `ios/App/App.xcworkspace` (NOT `.xcodeproj`)
2. Select **App** target → **Signing & Capabilities** tab
   - **Team**: your Apple Developer team (appears once enrollment active)
   - **Bundle Identifier**: `ai.econopulse.app`
   - **Provisioning Profile**: Automatically managed ✅
3. Select **Any iOS Device (arm64)** as destination (NOT a simulator)
4. **Product → Archive** (takes 2–5 min)
5. Organizer window opens → select your archive
6. Click **Distribute App**
7. Choose **App Store Connect → Upload**
8. Use **Automatic signing**
9. Wait for upload (5–10 min)
10. In App Store Connect → TestFlight tab → wait 5–15 min for build to process

✅ Build appears under TestFlight → **Ready to Submit**

---

## 🎯 PHASE 3 — APP STORE CONNECT SETUP (web browser)

### 1. Create the app record
1. https://appstoreconnect.apple.com → **My Apps** → **+ → New App**
2. Fill:
   - Platform: **iOS**
   - Name: **EconoPulse**
   - Primary Language: **English (U.S.)**
   - Bundle ID: **ai.econopulse.app** (select from dropdown)
   - SKU: **ECONOPULSE-IOS-001**
   - User Access: **Full Access**

### 2. App Information
   - Subtitle: copy from `IOS_APP_STORE_LISTING.md`
   - Category Primary: **Finance**
   - Category Secondary: **News**
   - Content Rights: **Does not contain third-party content**
   - Age Rating: click **Edit** → fill questionnaire → result **4+**

### 3. Pricing and Availability
   - Price: **Free**
   - Availability: **All countries and regions** (Worldwide) ✅

### 4. App Privacy (Nutrition Label)
   - Click **Get Started** → answer using `IOS_PRIVACY_NUTRITION_LABEL.md`
   - Data Collected: Email, Crash Data, Usage Data (linked to identity but NOT used for tracking)
   - Tracking: **No, we do not track**

### 5. Prepare Version 1.0.0
   - Promotional Text: copy from listing
   - Description: copy from listing (English)
   - Keywords: copy from listing
   - Support URL: `https://www.econopulse.ai/support`
   - Marketing URL: `https://www.econopulse.ai`
   - Version: `1.0.0`
   - Copyright: `© 2026 EconoPulse`

### 6. Add localization — Italian
   - Click **Add Language** → **Italian** → paste Italian texts from listing

### 7. Screenshots
   - **iPhone 6.9" Display**: drag your 5–8 PNGs
   - **iPhone 6.7" Display**: drag the same PNGs again
   - (Optional) iPad 13": only if you want iPad support featured

### 8. Build
   - Scroll to **Build** section → click **+ Select a Build**
   - Choose the build you uploaded via Xcode → **Done**
   - Answer **Export Compliance**: No (we only use standard HTTPS) → matches `ITSAppUsesNonExemptEncryption=false`

### 9. App Review Information
   - **Sign-in required**: YES
   - **User name**: `apple.review@econopulse.ai`
   - **Password**: `AppleReview2026!`
   - **Notes**: paste the full text from `IOS_REVIEW_NOTES.md`
   - **Contact info**: your real name + phone + `support@econopulse.ai`

### 10. Version Release
   - Choose **Automatically release this version** (recommended) — goes live the moment Apple approves
   - OR **Manually release** — you click "release" after approval

---

## 📤 PHASE 4 — SUBMIT FOR REVIEW

Once everything has green checkmarks:

1. Top right → **Add for Review** → **Submit for Review**
2. Status changes to **Waiting for Review** (1–24h)
3. Then **In Review** (1–4h typically)
4. Then **Approved** ✅ or **Rejected** ❌

### If approved
- Automatic release → app appears on App Store in ~2–24h worldwide
- You'll get push notification + email

### If rejected
- Apple sends detailed reason in App Store Connect → Resolution Center
- Fix the issue, increment build number, re-archive, re-upload, reply in Resolution Center, resubmit
- Second pass usually <24h

---

## 📊 EXPECTED TIMELINE

| Step | Time |
|---|---|
| Apple processes enrollment | 24–48h (now) |
| Asset preparation (you) | 1–2h |
| Demo account creation | 10 min |
| Screenshot capture | 30 min |
| Xcode archive + upload | 30 min |
| App Store Connect setup | 30 min |
| Apple review | 24–48h |
| App live on store | +2–24h after approval |

**Total from now to live on App Store: 3–7 days realistic.**

---

## 🆘 IF YOU GET STUCK

| Problem | Solution |
|---|---|
| Can't access App Store Connect | Wait for "Welcome" email — enrollment not yet active |
| No Mac available | Rent: MacInCloud ($30/mo) or borrow a friend's Mac for 1 hour |
| Xcode signing fails | Xcode → Preferences → Accounts → Add Apple ID → wait for team to load |
| Build won't upload | Check that bundle ID `ai.econopulse.app` matches in both Xcode and App Store Connect |
| Apple rejects for guideline 3.1.1 | Verify iOS commerce guards work — open app on simulator and confirm no /pricing visible |
| Apple rejects for guideline 5.1.1 | Test account deletion in simulator before resubmit |

---

## ✅ DEFINITION OF DONE

You're truly done when:
- [ ] App appears in App Store search for "EconoPulse"
- [ ] You can install it on your iPhone from the public App Store
- [ ] Login with demo account works on a fresh install
- [ ] First user feedback received

🎉 Then you celebrate, then you start planning v1.1.
