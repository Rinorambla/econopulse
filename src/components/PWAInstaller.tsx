'use client';

import { useEffect } from 'react';

export default function PWAInstaller() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker. updateViaCache:'none' + explicit update() force
      // clients stuck on an old caching SW to fetch the current (disabled) one.
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => {
          console.log('💾 PWA: Service Worker registered successfully', registration.scope)
          registration.update().catch(() => {})
          // Attempt background sync registration
          try {
            // @ts-expect-error: sync may be experimental
            if (registration && registration.sync && typeof registration.sync.register === 'function') {
              // @ts-expect-error: experimental background sync API
              registration.sync.register('market-data-sync').catch(()=>{});
            }
          } catch {}
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            console.log('💾 PWA: New service worker available');
          });
        })
        .catch((error) => {
          console.error('💾 PWA: Service Worker registration failed', error);
        });

      // Handle install prompt
      let deferredPrompt: any;
      
      window.addEventListener('beforeinstallprompt', (e) => {
        console.log('💾 PWA: Install prompt available');
        e.preventDefault();
        deferredPrompt = e;
        
        // Show custom install button or banner
        showInstallPrompt(deferredPrompt);
      });

      // Track if app was installed
      window.addEventListener('appinstalled', () => {
        console.log('💾 PWA: App was installed successfully');
        deferredPrompt = null;
      });
    }
  }, []);

  const showInstallPrompt = (deferredPrompt: any) => {
    // You can customize this to show a nice install banner
    console.log('💾 PWA: Ready for installation');
    
    // Optional: Show install button in UI
    // For now, just log that it's available
  };

  return null; // This component doesn't render anything
}

// Helper function to trigger install (can be called from a button)
export const triggerPWAInstall = () => {
  if (typeof window !== 'undefined') {
    const deferredPrompt = (window as any).deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('💾 PWA: User accepted the install prompt');
        } else {
          console.log('💾 PWA: User dismissed the install prompt');
        }
        (window as any).deferredPrompt = null;
      });
    }
  }
};