# Environment Variables per Vercel Production

Queste sono le variabili da impostare su Vercel → Project Settings → Environment Variables:

## Essenziali (richieste)
```
NEXT_PUBLIC_SITE_URL=https://econopulse.ai
TIINGO_API_KEY=your_tiingo_api_key_here
```

## Stripe (per abbonamenti)
```
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRO_PRICE_IDS=price_pro1,price_pro2
STRIPE_PREMIUM_PRICE_IDS=price_premium1,price_premium2  
STRIPE_CORPORATE_PRICE_IDS=price_corp1,price_corp2
```

## AI Features (opzionale)
```
OPENAI_API_KEY=sk-your-openai-api-key
```

## Database (opzionale)
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
```

## Supabase (per auth e database)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Email (opzionale) 
```
RESEND_API_KEY=re_your_resend_key
```

## Altri provider dati (opzionali)
```
FMP_API_KEY=your_fmp_key
TRADINGECONOMICS_CLIENT_KEY=your_te_key
```

## Sicurezza cron
```
NEWSLETTER_CRON_SECRET=your_random_secure_string
```

## Note:
- Usa valori "live" per Production
- Per Preview/Development puoi usare chiavi test
- Le variabili NEXT_PUBLIC_ sono esposte al client
- Non loggare mai valori sensibili