# 🚀 GUIDA RAPIDA: Configurare Environment Variables su Vercel

## ⚠️ PROBLEMA ATTUALE
```
Error: STRIPE_SECRET_KEY is required
```
Il deployment fallisce perché mancano le variabili d'ambiente su Vercel.

---

## ✅ SOLUZIONE (3 minuti)

### PASSO 1: Apri Vercel Dashboard
1. Vai su: https://vercel.com/dashboard
2. Clicca sul progetto **econopulse**
3. Clicca su **Settings** (in alto a destra)
4. Nel menu laterale clicca su **Environment Variables**

### PASSO 2: Importa tutte le variabili
1. Clicca su **"Import .env"** oppure il pulsante **"Add New"**
2. Se vedi "Paste .env contents above", clicca quello
3. Apri il file `VERCEL_ENV_READY.txt` (nella root del progetto)
4. **Copia TUTTO il contenuto** del file
5. **Incolla** nel campo di testo su Vercel
6. Seleziona gli ambienti:
   - ✅ **Production**
   - ✅ **Preview**  
   - ✅ **Development**
7. Clicca **Save** o **Import**

### PASSO 3: ⚠️ FIX Webhook Secret
**IMPORTANTE:** Devi aggiornare questa variabile con il valore reale da Stripe!

1. Vai su https://dashboard.stripe.com/webhooks
2. Clicca sul tuo webhook endpoint
3. Copia il **Signing Secret** (inizia con `whsec_...`)
4. Torna su Vercel → Environment Variables
5. Cerca `STRIPE_WEBHOOK_SECRET`
6. Clicca sull'icona **Edit** (matita)
7. Sostituisci `whsec_YOUR_LIVE_WEBHOOK_SECRET_HERE` con il valore reale
8. Salva

### PASSO 4: Redeploy
Le variabili vengono applicate solo ai NUOVI deployment!

**Opzione A - Redeploy da Vercel UI:**
1. Vai su **Deployments** (tab in alto)
2. Clicca sui **3 puntini** dell'ultimo deployment
3. Clicca **Redeploy**
4. Conferma

**Opzione B - Push vuoto:**
```bash
git commit --allow-empty -m "chore: apply env variables"
git push
```

---

## ✅ VERIFICA CHE FUNZIONI

Dopo 2-5 minuti:
1. Vai su **Deployments**
2. L'ultimo deployment dovrebbe essere **"Ready"** (verde)
3. Clicca sul deployment → **View Function Logs**
4. NON dovresti vedere più l'errore `STRIPE_SECRET_KEY is required`

Se il deploy è OK, il sito sarà live su: https://econopulse.ai

---

## 🔍 SE HAI ANCORA PROBLEMI

### Errore: "STRIPE_WEBHOOK_SECRET is required"
→ Hai dimenticato di sostituire il placeholder nel PASSO 3

### Errore: "Invalid API key"
→ Una delle chiavi API è scaduta o non valida. Rigenerala dal provider.

### Variabili non applicate
→ Hai dimenticato il PASSO 4 (Redeploy)

### Altri errori
1. Vai su Deployments → ultimo deployment → **Function Logs**
2. Cerca l'errore specifico
3. Controlla che la variabile mancante sia stata salvata su Vercel
4. Verifica che sia selezionato l'ambiente "Production"

---

## 📝 CHECKLIST RAPIDA

- [ ] Aperto Vercel Dashboard → econopulse → Settings → Environment Variables
- [ ] Importato il file VERCEL_ENV_READY.txt (copia/incolla completo)
- [ ] Selezionato Production + Preview + Development
- [ ] Salvato
- [ ] Aggiornato STRIPE_WEBHOOK_SECRET con valore reale da Stripe
- [ ] Fatto Redeploy (Opzione A o B)
- [ ] Aspettato 2-5 minuti per build completion
- [ ] Verificato che il deployment sia "Ready" (verde)
- [ ] Testato il sito: https://econopulse.ai

---

## 🎯 FILE UTILI NEL PROGETTO

- `VERCEL_ENV_READY.txt` ← **USA QUESTO per Vercel** (completo e pronto)
- `.env.example` ← Template con spiegazioni
- `.env.local` ← Le tue variabili locali (NON commitare!)
- `VERCEL_ENV_QUICK_SETUP.md` ← Guida dettagliata completa

---

## ⏱️ TEMPO STIMATO
- Importare variabili: 1 minuto
- Fix webhook secret: 1 minuto  
- Redeploy + wait: 3-5 minuti
- **TOTALE: ~7 minuti**

Fatto! Il sito dovrebbe essere online e funzionante. 🚀
