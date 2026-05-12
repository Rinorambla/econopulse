# 🧑‍⚖️ EconoPulse — App Review Notes & Demo Account

This file contains everything Apple reviewers need to test your app. Copy these texts into App Store Connect → App Information → **App Review Information**.

---

## 👤 DEMO ACCOUNT (REQUIRED)

Apple reviewers will use this to test Premium features. Create this user in your Supabase database **before submitting**.

### Recommended demo credentials

| Field | Value |
|---|---|
| **Email** | `apple.review@econopulse.ai` |
| **Password** | `AppleReview2026!` |
| **Plan** | `premium` (manually set in Supabase) |
| **Subscription status** | `active` |
| **Subscription expires** | Set to `2027-12-31` (far future) |

### How to create the demo user

**Option 1 — Via your signup flow (easiest):**
1. Go to https://www.econopulse.ai/en/signup
2. Sign up with email `apple.review@econopulse.ai` and password `AppleReview2026!`
3. Verify email if required (use a mailbox you control or temporarily disable email confirmation in Supabase Auth settings)
4. Run the SQL below in Supabase to upgrade the account to Premium

**Option 2 — SQL one-liner** (run in Supabase SQL editor after signup):
```sql
-- Upgrade Apple reviewer account to Premium (no expiry concern, trial_end_date far future)
UPDATE public.users
SET subscription_status = 'premium',
    trial_end_date = '2027-12-31T23:59:59Z',
    updated_at = now()
WHERE email = 'apple.review@econopulse.ai';

-- Verify
SELECT id, email, subscription_status, trial_end_date
FROM public.users
WHERE email = 'apple.review@econopulse.ai';
```

The expected result: one row with `subscription_status = 'premium'`.

**⚠️ IMPORTANT**: Test the login yourself from a fresh browser BEFORE submitting. If reviewers can't log in, app gets rejected (guideline 2.1).

---

## 📝 APP REVIEW INFORMATION — Copy/Paste Texts

### Contact Information

| Field | Value (edit with your real info) |
|---|---|
| **First Name** | *(your first name)* |
| **Last Name** | *(your last name)* |
| **Phone Number** | *(your phone with country code, e.g. +39 XXX XXX XXXX)* |
| **Email** | `support@econopulse.ai` |

### Sign-In Required: **YES**

### Demo Account (paste in the "User name" and "Password" fields)

```
Username: apple.review@econopulse.ai
Password: AppleReview2026!
```

### Notes (paste in the "Notes" textarea — 4000 char limit)

```
Welcome, and thank you for reviewing EconoPulse.

ABOUT THE APP
EconoPulse is a finance and market intelligence app powered by AI. It provides real-time quotes, sector heatmaps, AI-generated market analysis, portfolio tracking and macro calendar — across stocks, ETFs, crypto, forex and commodities.

The app is a Capacitor-wrapped iOS client of our production web platform (www.econopulse.ai). All data is fetched live from our APIs.

DEMO ACCOUNT
Email: apple.review@econopulse.ai
Password: AppleReview2026!

This account has Premium pre-activated so you can test every feature without limitation.

HOW TO TEST KEY FEATURES

1. AI Pulse (free)
   - Launch the app → bottom of dashboard
   - You'll see today's AI-generated market summary (regenerated daily at 06:00 UTC)

2. Real-time quotes (free)
   - Tap any ticker on the dashboard to see live price, change %, volume

3. Sector Heatmap (free)
   - Navigate to "Heatmap" — shows S&P 500 sectors with live % changes

4. AI Portfolio Builder (Premium)
   - Navigate to "Portfolio Builder"
   - Choose a risk profile (Conservative / Balanced / Aggressive)
   - Tap "Generate" — AI builds an optimized portfolio in 5-10 seconds

5. Real-time alerts (Premium)
   - Settings → Notifications → enable alerts
   - Demo data will show pre-configured triggers

NO IN-APP PURCHASES
EconoPulse iOS is 100% free. There are no in-app purchases. Premium subscriptions exist but are sold exclusively on our website (www.econopulse.ai), in full compliance with App Store guideline 3.1.3(b) — Multiplatform Services. The app contains no upgrade buttons or external payment links. Free users who try to access Premium features see a non-actionable informational message.

ACCOUNT DELETION
Per guideline 5.1.1(v): users can delete their account from Settings → Account → Delete Account (red button at the bottom). The deletion:
- Cancels any active Stripe subscription
- Deletes all user data from Supabase (profiles, portfolios, watchlists, preferences, alerts)
- Removes the auth record via admin.auth.admin.deleteUser()
The endpoint is /api/user/delete, authenticated via session cookie or Bearer token.

PRIVACY
- No IDFA, no ATT prompt (we don't track across apps)
- No third-party advertising
- Encryption: standard HTTPS only (ITSAppUsesNonExemptEncryption = false in Info.plist)
- Full privacy policy: https://www.econopulse.ai/privacy
- Sub-processors disclosed: Supabase (auth + DB), Stripe (web payments only), OpenAI (AI generation), Vercel (hosting), MongoDB (analytics cache)

CONTACT
For any question during review: support@econopulse.ai
We typically respond within 4 hours during European business hours.

Thank you for your time. We hope you enjoy reviewing EconoPulse.
```

---

## 🌐 ATTACHMENT (optional)

You can attach a short PDF or screenshots demonstrating how to delete the account if reviewers struggle to find it. Most apps don't need this — the UI is clear enough.

---

## ✅ PRE-SUBMISSION TEST PLAN (DO THIS YOURSELF)

Before submitting, run through this in the actual iOS Simulator or on a TestFlight device:

- [ ] App launches without crash
- [ ] Login with `apple.review@econopulse.ai` works
- [ ] Dashboard loads with real data (no infinite spinners)
- [ ] Tap a ticker — detail page opens
- [ ] Heatmap loads with colors
- [ ] Portfolio Builder generates a result
- [ ] Settings → Account → Delete Account button is visible
- [ ] Delete confirmation modal appears (requires typing "DELETE")
- [ ] No /pricing page link visible anywhere in nav
- [ ] No "Upgrade to Premium" button visible
- [ ] If you tap a Premium-only feature as a Free user, you see an informational message (not a paywall with external link)
- [ ] Privacy Policy link in footer/settings opens https://www.econopulse.ai/privacy
- [ ] App rotates correctly on iPad (if iPad supported)
- [ ] Dark mode looks good
- [ ] No console errors in Safari Web Inspector when connected

If all checked → you're ready to submit.

---

## 🚨 IF APPLE REJECTS

Common iOS rejections and quick fixes:

| Rejection reason | Fix |
|---|---|
| "Couldn't log in with demo account" | Verify credentials work in a fresh browser. Recreate user if needed. |
| "App displayed external payment links" | Search code for `/pricing` links not wrapped in `useIsIOSApp()` guard. |
| "Account deletion path unclear" | Add the deletion path screenshot to App Review attachments. |
| "App crashes on launch" | Test offline behavior, add network error fallback in WebView. |
| "Privacy nutrition label incomplete" | Re-fill from `IOS_PRIVACY_NUTRITION_LABEL.md`. |
| "Metadata rejected — keywords irrelevant" | Use only finance keywords (already done). |

For any rejection: reply to the review message in App Store Connect with details + screenshots, and Apple usually approves on the second pass within 24h.
