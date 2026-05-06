import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor wraps the live econopulse.ai site in a native iOS/Android shell.
// Strategy: remote URL (server.url) → no rebuild required when the website ships an update.
// Splash + icons come from the public/icons assets we already generate for the PWA.
const config: CapacitorConfig = {
  appId: 'ai.econopulse.app',
  appName: 'EconoPulse',
  // webDir is required by Capacitor even when using server.url; we keep an empty
  // shell at mobile-shell/ so the build pipeline doesn't fail if offline.
  webDir: 'mobile-shell',
  server: {
    url: 'https://www.econopulse.ai',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#05070d',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#05070d',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#05070d',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#05070d',
    },
  },
};

export default config;
