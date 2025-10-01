# 🚨 STRIPE LIVE SETUP REQUIRED

## Problema attuale
- Chiavi LIVE configurate ✅ 
- Price IDs sono ancora TEST ❌
- Errore: "resource missing" perché i price IDs test non esistono in live mode

## Soluzione 1: Crea Price IDs LIVE (RACCOMANDATO)

### Passo 1: Stripe Dashboard
1. Vai su: https://dashboard.stripe.com/products
2. **IMPORTANTE**: Assicurati che il toggle sia su "Live" (non "Test")
3. Crea nuovo prodotto: "EconoPulse Premium AI"

### Passo 2: Crea i prezzi
**Monthly Price:**
- Name: EconoPulse Premium AI - Monthly
- Price: €29.99 EUR
- Billing: Monthly
- Copia il Price ID (es: price_1XxxxLIVE)

**Yearly Price:**
- Name: EconoPulse Premium AI - Yearly  
- Price: €299.99 EUR
- Billing: Yearly
- Copia il Price ID (es: price_1YyyyLIVE)

### Passo 3: Aggiorna Vercel
Vai su Vercel → econopulse → Settings → Environment Variables

Aggiorna questi:
```
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_1XxxxLIVE_MONTHLY
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_1YyyyLIVE_YEARLY
```

### Passo 4: Test
Dopo il redeploy:
- https://www.econopulse.ai/api/stripe/status
- Dovrebbe mostrare mode: "live", apiReachable: true
- Test checkout su /pricing

## Soluzione 2: Tornare in TEST mode (veloce)

Se vuoi solo testare subito, usa le chiavi test:

**Su Vercel, cambia:**
```
STRIPE_SECRET_KEY=sk_test_51QIlmSK3u8LWkkIk...
STRIPE_PUBLISHABLE_KEY=pk_test_51QIlmSK3u8LWkkIk...
```

**E mantieni gli attuali Price IDs** (che sono test).

## Cosa fare ora?

**Per PRODUZIONE LIVE**: Scegli Soluzione 1
**Per test rapido**: Scegli Soluzione 2

Il checkout funzionerà appena i Price IDs corrispondono al mode (live/test) delle chiavi.