# 🔐 Configurazione Supabase per Autenticazione

## Problema Attuale
Il sito mostra "Autenticazione non disponibile" perché mancano le variabili d'ambiente Supabase.

## ✅ Soluzione: Setup Supabase (5 minuti)

### Step 1: Crea Account Supabase
1. Vai su https://supabase.com
2. Clicca "Start your project" 
3. Accedi con GitHub o Google

### Step 2: Crea Nuovo Progetto
1. Clicca "New Project"
2. Compila:
   - **Name**: `econopulse-auth`
   - **Database Password**: (scegli una password sicura, es: `EconoPulse2025!`)
   - **Region**: `West EU (Ireland)` 
3. Clicca "Create new project"
4. Aspetta 2-3 minuti che si attivi

### Step 3: Ottieni le Chiavi API
1. Nel tuo progetto Supabase, vai su **Settings** (ingranaggio) → **API**
2. Copia questi valori:

```
Project URL: https://[your-project-id].supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (secret!)
```

### Step 4: Configura su Vercel
1. Vai su **Vercel Dashboard** → il tuo progetto → **Settings** → **Environment Variables**
2. Aggiungi queste 3 variabili:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-public-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

3. Clicca "Save" per ogni variabile

### Step 5: Redeploy
1. Vai su **Vercel Dashboard** → **Deployments**
2. Clicca sui 3 punti dell'ultimo deployment → **Redeploy**

### Step 6: Configura Auth Provider (Opzionale)
Per il login Google:
1. Su Supabase: **Authentication** → **Providers** → **Google**
2. Inserisci Client ID e Secret da Google Console

## 🔧 Schema Database (Auto-creato)
Supabase creerà automaticamente le tabelle necessarie al primo accesso.

## ⚡ Test Rapido
Dopo la configurazione, vai su `/en/login` e dovresti vedere il form funzionante invece di "Autenticazione non disponibile".

## 🆘 Alternative Temporanee
Se vuoi testare il sito senza auth:
- Modifica `useAuth.tsx` per simulare un utente "demo"
- Oppure usa le API direttamente bypassando l'auth