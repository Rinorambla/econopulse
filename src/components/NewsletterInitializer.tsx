'use client';

import { useEffect } from 'react';

export default function NewsletterInitializer() {
  useEffect(() => {
    // Inizializza il cron service solo sul server
    if (typeof window === 'undefined') {
      // Importazione dinamica per evitare problemi client-side
      import('@/services/NewsletterCronService').then(({ newsletterCron }) => {
        // In sviluppo, avvia manualmente
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 Newsletter cron service loaded (development mode)');
        } else {
          // In produzione, si avvia automaticamente
          console.log('✅ Newsletter cron service loaded (production mode)');
        }
      }).catch((error) => {
        console.error('Failed to initialize newsletter cron service:', error);
      });
    }
  }, []);

  // Non renderizza nulla
  return null;
}
