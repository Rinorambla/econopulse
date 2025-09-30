# Environment Variables (Vercel Production / Preview)

Panoramica completa delle variabili con stato (Richiesta / Opzionale) e comportamento di fallback se assente. Impostare in Vercel → Project Settings → Environment Variables.

## 🔑 Core (Consigliato impostarle subito)
```
NEXT_PUBLIC_SITE_URL=https://econopulse.ai     # URL pubblico del sito (usato per link assoluti)
TIINGO_API_KEY=tiingo_live_key                 # Abilita dati mercati Tiingo (heatmap / unified-market)
```
Se TIINGO_API_KEY manca: le rotte che la usano ritornano payload demo o array vuoti (HTTP 503 o 200 degradato) senza interrompere il build.

## 💳 Stripe (Abbonamenti)
```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_IDS=price_pro1,price_pro2
STRIPE_PREMIUM_PRICE_IDS=price_premium1,price_premium2
STRIPE_CORPORATE_PRICE_IDS=price_corp1,price_corp2
```
Fallback se STRIPE_SECRET_KEY manca:
- /api/stripe/* rotte rispondono 503 { demo: true } dove rilevante (create-checkout-session, cancel-subscription)
- pricing page mostra comunque UI ma le azioni falliranno in modo controllato.

## 🤖 AI (Opzionale)
```
OPENAI_API_KEY=sk-...
```
Fallback: funzioni AI restituiscono testo placeholder o errore controllato senza bloccare build.

## 🗄️ Database Mongo (Opzionale)
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
```
Fallback: se assente, alcune funzioni usano in‑memory / skip (newsletter storage minimo) o ritornano errore 503 specifico; build non fallisce.

## 🔐 Supabase (Auth + Profili)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon_key
SUPABASE_SERVICE_ROLE_KEY=service_role_key
```
Se mancanti: le rotte auth falliscono con 503 / 401; UI può mostrare stato ospite. Non blocca build.

## ✉️ Email (Resend) (Opzionale)
```
RESEND_API_KEY=re_xxx
```
Fallback: `EmailService` inizializza in modalità no-op; invii vengono saltati con log “Resend not configured”. Nessun throw.

## 📊 Altri Provider Dati (Opzionali)
```
FMP_API_KEY=your_fmp_key
TRADINGECONOMICS_CLIENT_KEY=your_te_key
```
Fallback: funzioni correlate ritornano dati incompleti / placeholder.

## 🕒 Sicurezza Cron
```
NEWSLETTER_CRON_SECRET=secure_random_string
```
Usato per proteggere endpoint /api/newsletter/cron. Se assente, si può disabilitare l’automazione o fallirà l’autenticazione della chiamata cron.

## 🧪 Variabili Dev / Utility
```
DEV_BYPASS_PLANS=true   # (solo sviluppo) bypass controlli di piano
```

## 🧩 Tabella Riepilogo Fallback

| Variabile | Stato | Usata da | Fallback se assente |
|-----------|-------|----------|---------------------|
| NEXT_PUBLIC_SITE_URL | Consigliata | Canonical links, email templates | Usa baseUrl calcolato (VERCEL_URL / localhost) |
| TIINGO_API_KEY | Opzionale forte | Heatmap, unified-market, snapshots | Risposte demo o vuote + 503 opzionale |
| STRIPE_SECRET_KEY | Opzionale | Checkout / Cancel subscription | 503 { demo:true } su rotte Stripe |
| STRIPE_WEBHOOK_SECRET | Opzionale | Webhook verifica firma | Webhook disabilitato / fallisce verifica ma build ok |
| STRIPE_*_PRICE_IDS | Opzionale | Pricing / checkout | Liste piani vuote o non acquistabili |
| OPENAI_API_KEY | Opzionale | AI endpoints | Risposta placeholder / degrade controllato |
| MONGODB_URI | Opzionale | User/email persistence | In-memory / skip newsletter persistence |
| NEXT_PUBLIC_SUPABASE_URL | Richiesta per auth | Auth client | Auth non funziona (guest mode) |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Richiesta per auth | Auth client | Auth non funziona |
| SUPABASE_SERVICE_ROLE_KEY | Opzionale | Server elevated ops | Operazioni avanzate disabilitate |
| RESEND_API_KEY | Opzionale | EmailService | Invii saltati (no-op) |
| FMP_API_KEY | Opzionale | Market data enrichment | Segmenti FMP assenti |
| TRADINGECONOMICS_CLIENT_KEY | Opzionale | Macro data | Dati TE saltati |
| NEWSLETTER_CRON_SECRET | Consigliata | Cron endpoint | Protezione cron assente / rifiutare mancano segreto |
| DEV_BYPASS_PLANS | Solo Dev | plan-access.ts | Ignora gating piani |

Legenda Stato: Richiesta = necessaria per feature completa; Opzionale = applicazione funziona senza (feature degradata); Consigliata = buona per URL corretti / sicurezza.

## ✅ Principi di Sicurezza & Build Stability
- Nessuna variabile mancante deve causare throw a import-time (pattern lazy init applicato a Stripe, Resend, Tiingo, OpenAI).
- Le rotte forniscono HTTP 503 con flag `demo:true` quando una feature premium non è configurata.
- Evitare di stampare valori sensibili nei log (loggare solo presenza / assenza).

## 🚀 Flusso per aggiungere un nuovo provider
1. Aggiungi getter in `src/lib/env.ts` (server-only).
2. Implementa funzione `getXClient()` lazily con guard (ritorna null se mancante).
3. Nelle API: se client null → ritorna fallback (503 + demo / payload vuoto).
4. Aggiorna questa tabella.

## Note Finali
- Usa chiavi test per ambienti Preview.
- Le variabili `NEXT_PUBLIC_*` sono inviate al client: NON metterci segreti.
- Per rotte cron su Vercel usare `NEWSLETTER_CRON_SECRET` come bearer/query secret.

_Ultimo aggiornamento: build resiliente post refactor lazy init Stripe & Resend._