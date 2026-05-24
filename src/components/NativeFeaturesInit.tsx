'use client';

/**
 * NativeFeaturesInit
 *
 * Bootstraps native-only iOS behaviour to satisfy Apple guideline 4.2
 * (Minimum Functionality): the app must offer experiences that go beyond
 * just rendering a website. We initialize and expose:
 *
 *   - Status bar style (dark) tuned for the brand background
 *   - In-app browser (Capacitor Browser) for any external `target="_blank"`
 *     link the user taps — keeps users inside the app shell
 *   - Haptic feedback on every primary button / link interaction
 *   - Native share sheet (window.__econoShareNative)
 *   - Push notification permission request and registration
 *   - Native local preferences (window.__econoPrefs)
 *
 * The component renders nothing. It mounts once at the root layout and
 * remains idle on web; all logic short-circuits when not running inside
 * a Capacitor native shell.
 */

import { useEffect } from 'react';

export default function NativeFeaturesInit() {
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const platform = (window as any)?.Capacitor?.getPlatform?.();
        const isNative = platform === 'ios' || platform === 'android';
        if (!isNative) return;

        // Lazy-load all plugins so the web bundle stays light.
        const [
          { Browser },
          { Haptics, ImpactStyle, NotificationType },
          { Share },
          { PushNotifications },
          { Preferences },
          { StatusBar, Style },
        ] = await Promise.all([
          import('@capacitor/browser'),
          import('@capacitor/haptics'),
          import('@capacitor/share'),
          import('@capacitor/push-notifications'),
          import('@capacitor/preferences'),
          import('@capacitor/status-bar'),
        ]);

        if (!mounted) return;

        // ----- Status bar -----
        try {
          await StatusBar.setStyle({ style: Style.Dark });
        } catch {}

        // ----- Expose helpers to the rest of the (web) app -----
        (window as any).__econoShareNative = async (opts: { title?: string; text?: string; url?: string }) => {
          try { await Share.share(opts); return true; } catch { return false; }
        };
        (window as any).__econoOpenInApp = async (url: string) => {
          try { await Browser.open({ url, presentationStyle: 'popover' }); return true; } catch { return false; }
        };
        (window as any).__econoPrefs = {
          get: async (key: string) => (await Preferences.get({ key })).value,
          set: async (key: string, value: string) => Preferences.set({ key, value }),
          remove: async (key: string) => Preferences.remove({ key }),
        };
        (window as any).__econoHaptic = async (kind: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
          try {
            if (kind === 'success' || kind === 'warning' || kind === 'error') {
              await Haptics.notification({
                type: kind === 'success' ? NotificationType.Success
                  : kind === 'warning' ? NotificationType.Warning
                  : NotificationType.Error,
              });
            } else {
              await Haptics.impact({
                style: kind === 'light' ? ImpactStyle.Light
                  : kind === 'medium' ? ImpactStyle.Medium
                  : ImpactStyle.Heavy,
              });
            }
          } catch {}
        };

        // ----- Intercept external links so they open in the in-app browser
        // instead of bouncing the user out to Safari. Apple flagged the
        // OAuth jump under guideline 4 — generalising the fix here. -----
        const clickHandler = (e: MouseEvent) => {
          const target = (e.target as HTMLElement | null)?.closest?.('a');
          if (!target) return;
          const href = target.getAttribute('href') || '';
          // Trigger a haptic tap on every link/button press (native feel)
          (window as any).__econoHaptic?.('light');
          if (!href) return;
          // Only intercept absolute http(s) URLs that point off-host
          if (!/^https?:\/\//i.test(href)) return;
          try {
            const url = new URL(href);
            if (url.host === window.location.host) return; // internal navigation
            e.preventDefault();
            Browser.open({ url: href, presentationStyle: 'popover' }).catch(() => {});
          } catch {}
        };
        document.addEventListener('click', clickHandler, { passive: false });

        // ----- Haptic feedback on every button press -----
        const buttonHandler = (e: MouseEvent) => {
          const target = (e.target as HTMLElement | null)?.closest?.('button');
          if (!target) return;
          (window as any).__econoHaptic?.('light');
        };
        document.addEventListener('click', buttonHandler, { passive: true });

        // ----- Push notifications (iOS only — Android also fine) -----
        if (platform === 'ios') {
          try {
            const perm = await PushNotifications.checkPermissions();
            if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
              const req = await PushNotifications.requestPermissions();
              if (req.receive === 'granted') {
                await PushNotifications.register();
              }
            } else if (perm.receive === 'granted') {
              await PushNotifications.register();
            }
          } catch {}
        }

        return () => {
          document.removeEventListener('click', clickHandler);
          document.removeEventListener('click', buttonHandler);
        };
      } catch (err) {
        // Plugins not available (e.g. running on the web). Silent fallback.
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}
