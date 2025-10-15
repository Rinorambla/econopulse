// Centralizzazione lettura variabili d'ambiente (server-only)
// Non loggare mai valori sensibili

export const env = {
  // Base URL risolta in modo sicuro lato server
  get baseUrl(): string {
    const explicit = process.env.BASE_URL
    const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
    return explicit || vercel || 'http://localhost:3000'
  },

  // Chiavi sensibili (server-only)
  get FMP_API_KEY(): string | undefined { return process.env.FMP_API_KEY },
  get TIINGO_API_KEY(): string | undefined { return process.env.TIINGO_API_KEY },
  get OPENAI_API_KEY(): string | undefined { return process.env.OPENAI_API_KEY },
  get STRIPE_SECRET_KEY(): string | undefined { return process.env.STRIPE_SECRET_KEY },
  get STRIPE_WEBHOOK_SECRET(): string | undefined { return process.env.STRIPE_WEBHOOK_SECRET },
  get MONGODB_URI(): string | undefined { return process.env.MONGODB_URI },
  get RESEND_API_KEY(): string | undefined { return process.env.RESEND_API_KEY },
  get NEWSLETTER_CRON_SECRET(): string | undefined { return process.env.NEWSLETTER_CRON_SECRET },
  get TRADINGECONOMICS_CLIENT_KEY(): string | undefined { return process.env.TRADINGECONOMICS_CLIENT_KEY },

  // Stripe price ids (CSV) configurabili lato server
  get STRIPE_PRO_PRICE_IDS(): string[] { return (process.env.STRIPE_PRO_PRICE_IDS||'').split(',').map(s=>s.trim()).filter(Boolean) },
  get STRIPE_PREMIUM_PRICE_IDS(): string[] { return (process.env.STRIPE_PREMIUM_PRICE_IDS||'').split(',').map(s=>s.trim()).filter(Boolean) },
  get STRIPE_CORPORATE_PRICE_IDS(): string[] { return (process.env.STRIPE_CORPORATE_PRICE_IDS||'').split(',').map(s=>s.trim()).filter(Boolean) },

  // Variabili pubbliche non sensibili (possono rimanere NEXT_PUBLIC_)
  get PUBLIC_SITE_URL(): string | undefined { return process.env.NEXT_PUBLIC_SITE_URL },
  
  // Developer bypass for plan restrictions
  get DEV_BYPASS_PLANS(): boolean { return process.env.DEV_BYPASS_PLANS === 'true' },
}

// Nota: importare questo modulo SOLO in codice server-side (API routes, servizi) per evitare bundle client.