# 🚀 Setup Completo Vercel - EconoPulse

## PASSO 1: Vai su Vercel Dashboard
👉 **Link diretto**: https://vercel.com/dashboard

## PASSO 2: Vai al progetto
1. Clicca su **"econopulse"** (o il nome del tuo progetto)
2. Clicca su **"Settings"** (in alto)
3. Clicca su **"Environment Variables"** (menu a sinistra)

## PASSO 3: Aggiungi TUTTE queste variabili
**Clicca "Add New" per ogni riga e copia-incolla:**

### 🔧 Variabili Base (OBBLIGATORIE)
```
Nome: NEXT_PUBLIC_SITE_URL
Valore: https://econopulse.ai
Environment: Production ✅
```

```
Nome: TIINGO_API_KEY
Valore: [LA_TUA_CHIAVE_TIINGO]
Environment: Production ✅
```

### 🔐 Supabase (per login/database)
```
Nome: NEXT_PUBLIC_SUPABASE_URL
Valore: [IL_TUO_URL_SUPABASE]
Environment: Production ✅
```

```
Nome: NEXT_PUBLIC_SUPABASE_ANON_KEY
Valore: [LA_TUA_CHIAVE_SUPABASE_ANON]
Environment: Production ✅
```

```
Nome: SUPABASE_SERVICE_ROLE_KEY
Valore: [LA_TUA_SERVICE_ROLE_KEY]
Environment: Production ✅
```

### 🤖 OpenAI (per AI features)
```
Nome: OPENAI_API_KEY
Valore: [LA_TUA_CHIAVE_OPENAI]
Environment: Production ✅
```

### 📊 MongoDB (per database)
```
Nome: MONGODB_URI
Valore: [IL_TUO_CONNECTION_STRING_MONGODB]
Environment: Production ✅
```

### 💳 Stripe (per pagamenti)
```
Nome: STRIPE_SECRET_KEY
Valore: [LA_TUA_CHIAVE_STRIPE_SECRET]
Environment: Production ✅
```

```
Nome: STRIPE_WEBHOOK_SECRET
Valore: [IL_TUO_WEBHOOK_SECRET]
Environment: Production ✅
```

### 📧 Resend (per email)
```
Nome: RESEND_API_KEY
Valore: [LA_TUA_CHIAVE_RESEND]
Environment: Production ✅
```

### 🔒 Sicurezza
```
Nome: NEWSLETTER_CRON_SECRET
Valore: econopulse_secure_2025_cron_secret
Environment: Production ✅
```

## PASSO 4: Aggiungi il dominio custom
1. Vai su **"Domains"** (sempre nel menu Settings)
2. Clicca **"Add"**
3. Scrivi: `econopulse.ai`
4. Clicca **"Add"**

## PASSO 5: Triggera il redeploy
Dopo aver aggiunto TUTTE le variabili:
1. Vai su **"Deployments"** 
2. Clicca sui **3 puntini** dell'ultimo deployment
3. Clicca **"Redeploy"**

## ✅ RISULTATO FINALE:
- ✅ Sito funzionante su: https://econopulse.ai
- ✅ Tutte le API configurate
- ✅ Database collegato
- ✅ Pagamenti attivi
- ✅ AI features funzionanti

---

## 🆘 Se hai problemi:
1. Controlla che TUTTE le variabili siano aggiunte
2. Verifica che Environment sia impostato su "Production"
3. Aspetta 2-3 minuti dopo il redeploy
4. Se non funziona, manda screenshot dell'errore

## 📞 Test rapido:
Dopo il deploy, vai su https://econopulse.ai - dovrebbe caricare!