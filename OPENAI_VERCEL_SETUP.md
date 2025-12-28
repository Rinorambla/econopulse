# OpenAI Setup for Vercel - EconoAI Fix

## Il Problema
La pagina `/econoai` mostra "Limited mode • AI offline" perché `OPENAI_API_KEY` non è configurata nelle variabili d'ambiente di Vercel.

## Soluzione Rapida

### Opzione 1: Vercel Dashboard (CONSIGLIATA - 2 minuti)

1. **Vai su Vercel Dashboard**: https://vercel.com/rinorambla/econopulse
2. **Settings** → **Environment Variables**
3. **Add New**:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: `sk-proj-YOUR_OPENAI_API_KEY_HERE` (get from .env.local or OpenAI dashboard)
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
4. **Save**
5. **Redeploy** (Vercel → Deployments → Latest → ... → Redeploy)

### Opzione 2: Vercel CLI

```powershell
# Login a Vercel
vercel login

# Aggiungi la variabile
vercel env add OPENAI_API_KEY production
# Incolla la tua chiave da .env.local quando richiesto

# Aggiungi anche per preview e development
vercel env add OPENAI_API_KEY preview
vercel env add OPENAI_API_KEY development

# Triggera un nuovo deploy
git commit --allow-empty -m "trigger: enable OpenAI"
git push
```

## Verifica

Dopo aver aggiunto la variabile e fatto redeploy:

1. **Test Health API**: https://www.econopulse.ai/api/health
   - Cerca `"openai": { "configured": true }`

2. **Test EconoAI**: https://www.econopulse.ai/econoai
   - Dovrebbe mostrare "Online • Real-time data" invece di "Limited mode"
   - Prova a fare una domanda: "What's the outlook for AAPL?"

3. **Controlla logs Vercel**:
   ```
   vercel logs https://www.econopulse.ai
   ```
   - Cerca "✅ OpenAI client initialized"

## Alternative se la chiave non funziona

Se la chiave OpenAI è scaduta o revocata:

1. Vai su https://platform.openai.com/api-keys
2. Crea una nuova chiave
3. Aggiungi credito (minimo $5)
4. Aggiorna su Vercel e in `.env.local`

## Test Locale

Per testare localmente prima di deployare:

```powershell
# Avvia il dev server
npm run dev

# In un altro terminale, testa l'API
curl http://localhost:3000/api/health
curl http://localhost:3000/api/econoai/chat -X POST -H "Content-Type: application/json" -d '{"question":"Test OpenAI","userId":"test"}'
```

## Troubleshooting

### "Limited mode • AI offline"
- ✅ Verifica che OPENAI_API_KEY sia in Vercel env vars
- ✅ Controlla che la chiave inizi con `sk-proj-` o `sk-`
- ✅ Verifica credito OpenAI: https://platform.openai.com/usage
- ✅ Redeploy dopo aver aggiunto la variabile

### Errori API 401
- La chiave è invalida o revocata
- Crea una nuova chiave su OpenAI dashboard

### Errori API 429
- Rate limit superato
- Aggiungi credito su OpenAI billing

### Timeout
- Il modello `gpt-4o` potrebbe non essere disponibile
- Il fallback automatico a `gpt-4o-mini` dovrebbe attivarsi

---

**Status**: ⚠️ Da completare - Aggiungi OPENAI_API_KEY su Vercel Dashboard
**Priority**: 🔴 HIGH - Blocca funzionalità EconoAI
**ETA**: 2 minuti con Vercel Dashboard
