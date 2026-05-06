# EconoPulse Mobile Apps (Capacitor)

Native iOS + Android shells that wrap the live `https://www.econopulse.ai` website.
The app shell is just a WebView pointing to production — no rebuild required when
the website ships updates.

## Architecture

- **Capacitor 8** wraps the site in native shells.
- **`capacitor.config.ts`** — `server.url` points to production, `webDir` is the
  offline fallback (`mobile-shell/index.html`).
- **`android/`** — Android Studio project (Gradle + Kotlin).
- **`ios/`** — Xcode project (requires macOS to build).
- **`assets/`** — source 1024×1024 icon + splash. `npm run cap:assets` regenerates
  every native size.

## App identity

| Field | Value |
|---|---|
| App name | EconoPulse |
| Bundle ID | `ai.econopulse.app` |
| Brand color | `#05070d` |

Change in `capacitor.config.ts` if you rebrand.

## Workflow

```bash
# 1. install once
npm install

# 2. regenerate icons/splash if you change /assets sources
npm run cap:assets

# 3. sync config + plugins to native projects
npm run cap:sync

# 4a. open Android Studio
npm run cap:open:android

# 4b. open Xcode (macOS only)
npm run cap:open:ios
```

## Google Play release

1. Open Android Studio: `npm run cap:open:android`.
2. **Build → Generate Signed Bundle / APK** → choose **Android App Bundle (.aab)**.
3. Create a new keystore (keep it safe — required for every future update).
4. Build with target SDK 34 (already configured by Capacitor 8).
5. In **Google Play Console** → create app → upload the `.aab` to the
   *Internal testing* track first.
6. Fill privacy policy URL (`https://www.econopulse.ai/privacy`),
   data-safety form, content rating, screenshots (use the PWA screenshots
   in `public/screenshots/`).
7. Promote internal → closed → production once approved.

Cost: $25 one-time for the Google Play Console account.

## Apple App Store release

Requires macOS + Xcode 15+.

1. Open Xcode: `npm run cap:open:ios`.
2. Select the **App** target → *Signing & Capabilities* → set your Team
   (Apple Developer account, $99/year).
3. **Product → Archive** → Distribute App → App Store Connect → Upload.
4. In App Store Connect: create new app, bundle ID `ai.econopulse.app`,
   upload screenshots (6.7" and 6.1" iPhone), privacy nutrition labels,
   submit for review.

## Updating the app

Because `server.url` points to production, **most updates require zero
mobile rebuild** — just deploy the website. You only need a new
binary release when:

- You change `capacitor.config.ts`.
- You add/remove a Capacitor plugin.
- You change icons or splash.
- Apple/Google bumps minimum target SDK.

## Offline fallback

When the device is offline, `mobile-shell/index.html` is shown instead of
the website. Customize that file for richer offline UX.

## Push notifications (future)

Not enabled yet. To add: `npm i @capacitor/push-notifications`,
configure FCM (Android) and APNs (iOS), then `npx cap sync`.
