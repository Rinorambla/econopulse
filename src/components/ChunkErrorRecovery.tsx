'use client';

import { useEffect } from 'react';

/**
 * Recovers from Next.js chunk load errors that happen when the user has an
 * old HTML page cached referencing JS chunks that no longer exist on the CDN
 * (because we deployed a new version with different hashes).
 *
 * Strategy:
 *  - On window 'error' or unhandled rejection mentioning "Loading chunk" /
 *    "ChunkLoadError" / "Loading CSS chunk", do ONE hard reload to fetch
 *    the latest HTML (with current chunk hashes).
 *  - Use sessionStorage to prevent reload loops if the reload itself fails.
 */
export default function ChunkErrorRecovery() {
  useEffect(() => {
    const RELOAD_FLAG = '__chunk_reload_attempted__';
    const isChunkError = (msg: string) =>
      /Loading chunk \d+ failed|ChunkLoadError|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg);

    const attemptReload = (reason: string) => {
      // Prevent loops: only reload once per session
      if (sessionStorage.getItem(RELOAD_FLAG)) {
        console.error('[ChunkErrorRecovery] Chunk error after reload — giving up.', reason);
        return;
      }
      sessionStorage.setItem(RELOAD_FLAG, '1');
      console.warn('[ChunkErrorRecovery] Reloading to recover from chunk error:', reason);
      // Use replace to avoid back-button replay
      window.location.reload();
    };

    const onError = (e: ErrorEvent) => {
      const msg = e?.message || String(e?.error || '');
      if (isChunkError(msg)) {
        attemptReload(msg);
        return;
      }
      // Also catch resource load errors on Next.js static assets
      // (these fire on the window with target = the <script>/<link> element).
      const target = e?.target as any;
      if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        const url = (target.src || target.href || '') as string;
        if (url.includes('/_next/static/')) {
          attemptReload('static asset failed: ' + url);
        }
      }
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e?.reason;
      const msg = typeof reason === 'string'
        ? reason
        : (reason?.message || reason?.name || String(reason || ''));
      if (isChunkError(msg)) attemptReload(msg);
    };

    // Clear the flag when navigation succeeds (page loads without error)
    const onLoad = () => {
      // small delay to let lazy chunks finish first
      setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5000);
    };

    window.addEventListener('error', onError, true); // capture for resource load errors
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('load', onLoad);
    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('load', onLoad);
    };
  }, []);

  return null;
}
