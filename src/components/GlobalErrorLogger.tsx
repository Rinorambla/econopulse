'use client';

import { useEffect } from 'react';

/**
 * GlobalErrorLogger attaches window listeners for runtime errors and unhandled promise rejections.
 * It only logs to console (no network calls) and has zero UI footprint.
 */
export default function GlobalErrorLogger() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Avoid noisy third-party noise; keep minimal useful context
      console.error('[GlobalError]', {
        message: event?.error?.message || event?.message,
        source: event?.filename,
        lineno: event?.lineno,
        colno: event?.colno,
      });
    };
    const onUnhandled = (event: PromiseRejectionEvent) => {
      console.error('[UnhandledRejection]', {
        reason: (event?.reason && (event.reason.message || event.reason)) || 'unknown',
      });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, []);
  return null;
}
