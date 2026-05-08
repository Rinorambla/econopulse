# 🔒 Privacy Nutrition Label — App Store Connect (EconoPulse iOS)

Compila esattamente questi campi in **App Store Connect → App Privacy**.

> **Account → Tracking?** → **NO** (non facciamo cross-app tracking né IDFA).
> Google Analytics è disabilitato di default e attivato solo dopo consenso esplicito (cookie banner) sul **sito web**, NON nell'app iOS. Quindi nell'app non c'è tracking ai sensi ATT.

---

## 📋 STEP 1 — "Data Types" da dichiarare

Per ognuno indica: **Collected? Yes/No** → se Yes → **Linked to user? Y/N**, **Used for tracking? N**, **Purposes**.

### ✅ 1. Contact Info → **Email Address**
- **Collected**: Yes
- **Linked to user**: Yes
- **Used for tracking**: No
- **Purposes**: 
  - ☑️ App Functionality (login/account)
  - ☑️ Product Personalization (preferences)
  - ☐ Analytics ☐ Advertising ☐ Other

### ✅ 2. Contact Info → **Name** (opzionale, solo se l'utente lo inserisce nel profilo)
- **Collected**: Yes
- **Linked to user**: Yes
- **Used for tracking**: No
- **Purposes**: ☑️ App Functionality

### ✅ 3. Financial Info → **Other Financial Info** (portafoglio dell'utente)
- **Collected**: Yes
- **Linked to user**: Yes
- **Used for tracking**: No
- **Purposes**: ☑️ App Functionality
- **Nota**: Il portafoglio dell'utente (simboli, quantità, prezzi medi) viene salvato per fornire la funzione di tracking investimenti. Nessun dato di carta di credito è gestito in-app.

> ⚠️ **Payment Info**: NON dichiarare. Tutti i pagamenti passano per **Stripe** (web) o **Apple StoreKit** — Apple sa già di gestirlo.

### ✅ 4. Identifiers → **User ID**
- **Collected**: Yes
- **Linked to user**: Yes
- **Used for tracking**: No
- **Purposes**: ☑️ App Functionality (autenticazione Supabase)

### ✅ 5. Usage Data → **Product Interaction**
- **Collected**: Yes
- **Linked to user**: Yes
- **Used for tracking**: No
- **Purposes**: 
  - ☑️ App Functionality (watchlist, preferenze salvate)
  - ☑️ Analytics (solo log server lato Vercel, aggregati)

### ✅ 6. Diagnostics → **Crash Data** + **Performance Data**
- **Collected**: Yes
- **Linked to user**: No (anonimo)
- **Used for tracking**: No
- **Purposes**: ☑️ App Functionality, ☑️ Analytics

---

## ❌ NON dichiarare (perché non li raccogliamo nell'app iOS)

| Categoria | Motivo |
|---|---|
| Health & Fitness | Non raccolto |
| Sensitive Info (razza, religione, ecc.) | Non raccolto |
| Contacts | Non accediamo alla rubrica |
| User Content (foto, audio, ecc.) | Non raccolto |
| Browsing History | Non raccolto |
| Search History | Non lo associamo all'utente |
| Location | Non richiediamo permessi GPS |
| Physical Address | Non raccolto |
| Phone Number | Non raccolto |
| Other Contact Info | Non raccolto |
| Credit Info / Payment Info | Gestito da Stripe/StoreKit, non da noi |
| Precise/Coarse Location | Nessuna geolocalizzazione |
| Sensitive Health/Fitness | Non raccolto |
| Audio Data / Photos / Videos | Non raccolto |
| Gameplay Content | N/A |
| Customer Support | Email a support@econopulse.ai (separato) |
| Other Diagnostic Data | Non raccolto |
| Other Data Types | Non raccolto |
| **Advertising Data** | Nessuna pubblicità in-app |
| **Device ID / IDFA** | Non usato |

---

## 📋 STEP 2 — Risposte alle domande Apple

### "Do you or your third-party partners collect data from this app?"
✅ **Yes**

### "Is the data collected from this app linked to the user's identity?"
✅ **Yes** (email, user ID, portafoglio, watchlist sono associati all'account)

### "Do you or your third-party partners use data for tracking purposes?"
❌ **No**

### "Do you or your third-party partners use data for any of the following advertising purposes?"
❌ **No** (nessuna pubblicità)

---

## 🤝 Terze parti che ricevono dati (da menzionare in Privacy Policy)

| Servizio | Cosa riceve | Finalità |
|---|---|---|
| **Supabase** (database/auth) | Email, password hash, user ID, portafoglio | Autenticazione, storage account |
| **Stripe** (pagamenti web) | Email, dati di pagamento | Gestione abbonamenti |
| **Apple StoreKit** (in-app) | Apple ID transaction | Acquisti in-app iOS |
| **OpenAI** (GPT-4) | Solo simboli/query di analisi (no PII) | Generazione insights AI |
| **Vercel** (hosting) | IP, log richieste | Hosting backend |
| **MongoDB Atlas** (snapshot) | Dati di mercato (non utente) | Cache market data |

---

## 📝 STEP 3 — Aggiornare la Privacy Policy

Vai su [src/app/[locale]/legal/privacy/page.tsx](src/app/%5Blocale%5D/legal/privacy/page.tsx) e assicurati che includa:

1. ✅ Elenco dati raccolti (esattamente come sopra)
2. ✅ Finalità di ogni raccolta
3. ✅ Lista delle terze parti (Supabase, Stripe, Apple, OpenAI, Vercel, MongoDB)
4. ✅ Diritti GDPR (accesso, cancellazione, portabilità) — email a `support@econopulse.ai`
5. ✅ Data conservazione (es: account fino a cancellazione)
6. ✅ Sezione minori (16+ anni)
7. ✅ Contatti DPO / titolare
8. ✅ Data ultimo aggiornamento

URL pubblico richiesto da Apple: `https://www.econopulse.ai/legal/privacy`

---

## ✅ Checklist finale

- [ ] App Privacy compilato in App Store Connect (tutti gli step sopra)
- [ ] Privacy Policy aggiornata con elenco terze parti e tipi di dato
- [ ] URL Privacy Policy pubblico raggiungibile
- [ ] App NON usa IDFA (verificato — niente AdSupport.framework)
- [ ] App NON richiede ATT prompt (non serve)
- [ ] Sezione "Account Deletion" presente nella privacy + endpoint funzionante (Apple lo richiede da Giugno 2022)
