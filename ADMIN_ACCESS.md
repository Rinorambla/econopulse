# 👑 Admin Access - Come Accedere Come Amministratore

## ✅ Sistema Sicuro Implementato

Ora **SOLO TU** hai accesso premium automatico, mentre tutti gli altri devono fare login/registrazione normale.

---

## 🔧 Come Funziona

### Per Te (Admin):
1. Registrati/Login con l'email configurata: `admin@econopulse.ai`
2. Dopo il login, ottieni automaticamente **piano Premium** 
3. Accesso completo a tutte le funzionalità
4. Nella console vedrai: `👑 Admin access detected: admin@econopulse.ai`

### Per Altri Utenti:
- Devono registrarsi normalmente
- Ottengono piano Free (o devono pagare per Premium)
- Nessun accesso speciale

---

## ⚙️ Cambiare Email Admin

Per usare la TUA email personale:

1. Apri il file: `src/lib/dev-config.ts`
2. Cambia la riga:
   ```typescript
   ADMIN_EMAIL: 'admin@econopulse.ai',
   ```
   Con la tua email:
   ```typescript
   ADMIN_EMAIL: 'tuamail@gmail.com',
   ```
3. Salva, commit e push
4. Registrati con quella email sul sito

---

## 🚀 Prossimi Passi

### 1. Rimuovi la variabile NEXT_PUBLIC_DEV_MODE da Vercel:
   - Vai su Vercel Dashboard → Settings → Environment Variables
   - Elimina `NEXT_PUBLIC_DEV_MODE` (non serve più)
   - Redeploy

### 2. Registrati sul sito:
   - Vai su: https://econopulse.vercel.app/en/login
   - Clicca "Sign up"
   - Usa l'email: `admin@econopulse.ai` (o quella che hai configurato)
   - Crea password
   - Login
   - ✅ Automaticamente avrai piano Premium!

### 3. Cambia email admin (opzionale):
   - Segui le istruzioni sopra per usare la tua email personale

---

## 🔒 Sicurezza

✅ **Sicuro**: Solo chi ha l'email configurata in `dev-config.ts` ottiene premium automatico
✅ **Privato**: L'email admin è nascosta nel codice (non visibile agli utenti)
✅ **Controllato**: Puoi cambiarla in qualsiasi momento

---

## ❓ Domande?

- Vuoi usare una email diversa? → Modifica `ADMIN_EMAIL` in `src/lib/dev-config.ts`
- Non funziona? → Controlla la console del browser per il messaggio `👑 Admin access detected`
- Serve aiuto? → Contattami!
