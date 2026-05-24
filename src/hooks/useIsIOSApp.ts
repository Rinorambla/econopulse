/**
 * Detects if the app is running inside the iOS native WebView (Capacitor).
 *
 * Why this matters: Apple App Store guideline 3.1.1 forbids in-app purchases
 * of digital subscriptions through any payment system other than StoreKit.
 * Until we add native IAP, we hide upgrade/checkout CTAs when running in iOS.
 *
 * Detection strategy:
 *   1. `window.Capacitor.getPlatform()` returns 'ios' inside the native shell.
 *   2. Fallback: User-Agent contains "EconoPulse" (custom UA we can set later)
 *      AND platform is iOS (Mac/iPhone/iPad without "Safari" in UA).
 *
 * The hook is SSR-safe: returns `false` on the server and during the first
 * client render, then re-renders once we have access to `window`.
 */
'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Capacitor?: {
      getPlatform?: () => 'ios' | 'android' | 'web';
      isNativePlatform?: () => boolean;
    };
  }
}

export function isIOSApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const platform = window.Capacitor?.getPlatform?.();
    if (platform === 'ios') return true;
    const ua = window.navigator?.userAgent || '';
    // Reliable signal: our Capacitor config appends "EconoPulseiOSApp" to UA.
    if (/EconoPulseiOSApp/i.test(ua)) return true;
    // Fallback heuristic for legacy installs without the UA suffix
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isStandalone = (window.navigator as any)?.standalone === true;
    return isIOSDevice && isStandalone;
  } catch {
    return false;
  }
}

export function useIsIOSApp(): boolean {
  const [value, setValue] = useState(false);
  useEffect(() => {
    setValue(isIOSApp());
  }, []);
  return value;
}
