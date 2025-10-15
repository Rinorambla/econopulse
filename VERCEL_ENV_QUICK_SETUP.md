# Guida Rapida: Configurazione Environment Variables su Vercel

## 🚨 VARIABILI OBBLIGATORIE (Minimo per far funzionare il sito)

Vai su **Vercel Dashboard** → **econopulse** → **Settings** → **Environment Variables**

### 1. STRIPE (Pagamenti - OBBLIGATORIO)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Dove trovarle:**
- Vai su https://dashboard.stripe.com/apikeys
- Secret Key: clicca "Reveal live key token"
- Publishable Key: copia direttamente
- Webhook Secret: vai su Developers → Webhooks → endpoint → "Signing secret"

### 2. STRIPE PRICE IDs (Piani abbonamento)
```
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_CORPORATE=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_YEARLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_CORPORATE_YEARLY=price_...
```

**Dove trovarle:**
- Vai su https://dashboard.stripe.com/products
- Clicca su ogni prodotto → copia il Price ID (formato: `price_xxxxx`)

### 3. SUPABASE (Auth - OBBLIGATORIO)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

**Dove trovarle:**
- Vai su https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
- Project URL → copia
- anon public key → copia

### 4. SITE URL (Routing - OBBLIGATORIO)
```
NEXT_PUBLIC_SITE_URL=https://econopulse.ai
BASE_URL=https://econopulse.ai
```

---

## ✅ VARIABILI CONSIGLIATE (Funzionalità complete)

### 5. TIINGO (Market Data)
```
TIINGO_API_KEY=your-key
```
- Registrati su https://www.tiingo.com/
- Vai su Account → API → copia la key

### 6. OPENAI (AI Features)
```
OPENAI_API_KEY=sk-proj-...
OPENAI_ENABLED=true
```
- Vai su https://platform.openai.com/api-keys
- Crea una nuova key

---

## 📋 PROCEDURA RAPIDA SU VERCEL

### Metodo 1: Interfaccia Web
1. Vai su https://vercel.com/dashboard
2. Seleziona progetto **econopulse**
3. **Settings** → **Environment Variables**
4. Per ogni variabile:
   - **Key**: nome variabile (es. `STRIPE_SECRET_KEY`)
   - **Value**: valore segreto
   - **Environments**: seleziona "Production", "Preview", "Development"
   - Clicca **Save**

### Metodo 2: Da File .env (più veloce)
1. Crea un file `.env.local` nella root del progetto
2. Copia e incolla tutte le variabili con i valori reali
3. Su Vercel, clicca **"Import .env"** o **"Paste .env contents"**
4. Incolla tutto il contenuto del file
5. Clicca **Save**

---

## 🔄 DOPO AVER AGGIUNTO LE VARIABILI

**IMPORTANTE:** Le variabili vengono applicate solo ai nuovi deployment!

Devi fare:
```bash
git commit --allow-empty -m "chore: apply env variables"
git push
```

Oppure su Vercel:
- Vai su **Deployments**
- Clicca sui 3 puntini dell'ultimo deployment
- Clicca **Redeploy**

---

## 🎯 VARIABILI PER AMBIENTE

### Production (econopulse.ai)
- Usa le chiavi LIVE di Stripe (`sk_live_...`, `pk_live_...`)
- Usa URL produzione per NEXT_PUBLIC_SITE_URL
- OPENAI_ENABLED=true
- DEV_BYPASS_PLANS=false

### Preview/Development
- Puoi usare le chiavi TEST di Stripe (`sk_test_...`, `pk_test_...`)
- NEXT_PUBLIC_SITE_URL può essere il dominio Vercel preview
- DEV_BYPASS_PLANS=true (opzionale, per test senza pagare)

---

## ❌ ERRORI COMUNI

### "STRIPE_SECRET_KEY is required"
→ Manca la variabile STRIPE_SECRET_KEY in Production

### "Invalid API key provided"
→ La chiave è scaduta o non valida. Rigenerala su Stripe/Supabase/ecc.

### "Cannot read property of undefined"
→ Mancano le variabili NEXT_PUBLIC_* (devono avere il prefisso!)

### Modifiche non applicate
→ Fai un nuovo deployment dopo aver salvato le variabili

---

## 📞 SUPPORTO

Se hai problemi:
1. Controlla i log su Vercel → Deployments → ultimo deployment → Function Logs
2. Verifica che ogni variabile sia salvata in "Production" environment
3. Fai un redeploy manuale dopo aver aggiunto le variabili
