# EconoPulse - Advanced Financial Analysis Platform

EconoPulse is a modern, AI-powered financial analysis platform built with Next.js 15, TypeScript, and Tailwind CSS. The platform provides real-time market analysis, AI-driven portfolio generation, and comprehensive economic intelligence for investors and financial professionals.

## 🚀 Features

### 📊 Real-Time Market Dashboard
- Advanced heatmap visualization with ETF/stock performance
- Options sentiment analysis and gamma risk assessment
- Unusual options flow detection (ATM/OTM)
- Put/Call ratio monitoring
- Intraday flow analysis

### 🤖 AI Portfolio Builder
- Dynamic portfolio generation powered by OpenAI GPT
- Economic cycle-aware asset allocation
- Risk-adjusted returns optimization
- Multiple portfolio strategies (Conservative, Balanced, Aggressive, AI Smart Pick)
- Real-time performance projections

### 📈 AI Pulse Analytics
- Best/worst performers identification
- Three-tier pricing structure (Pro, Premium AI, Corporate)
- Stripe integration for secure payments
- 14-day free trial for all plans
- Flexible monthly/yearly billing
- Dynamic content translation

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **AI**: OpenAI GPT-4
- **Market Data**: Polygon.io API
- **UI Components**: Headless UI, Heroicons
- **Charts**: Recharts, Plotly.js

## 📋 Prerequisites

- Node.js 18+ installed
- NPM or Yarn package manager
## 🔧 Installation

1. **Clone the repository**
   ```bash
2. **Install dependencies**
   ```bash
## 📊 API Endpoints

```
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Stripe Configuration
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   
   # Stripe Price IDs
   NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_YEARLY=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_ID_CORPORATE=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_ID_CORPORATE_YEARLY=price_xxx

   # API Keys
   POLYGON_API_KEY=your_polygon_api_key
   OPENAI_API_KEY=your_openai_api_key
   WEBHOOK_SECRET=your_stripe_webhook_secret

   # Site Configuration
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Database Setup**
   Set up your Supabase database with the required tables:
   ```sql
   -- Users table
   CREATE TABLE users (
     id UUID PRIMARY KEY,
     email TEXT UNIQUE NOT NULL,
     full_name TEXT,
     subscription_status TEXT DEFAULT 'free',
     subscription_id TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Portfolios table
   CREATE TABLE portfolios (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id),
     name TEXT NOT NULL,
     type TEXT NOT NULL,
     allocation JSONB NOT NULL,
     performance_data JSONB,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🚀 Quick Deployment to Vercel

### Prerequisites
- GitHub repository with this code
- Vercel account
- Service API keys (see Environment Variables below)

### Deploy Steps
1. **Connect to Vercel**
   ```bash
   # Push to GitHub if not already done
   git push origin main
   ```
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project" → Import from GitHub
   - Select your `econopulse` repository

2. **Configure Environment Variables**
   - In Vercel: Project → Settings → Environment Variables
   - Add for **Production** environment:

   **Essential (Required for full functionality):**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   TIINGO_API_KEY=your_tiingo_api_key
   ```

   **AI Features:**
   ```
   OPENAI_API_KEY=sk-proj-your-openai-key
   ```

   **Payments & Email:**
   ```
   STRIPE_SECRET_KEY=sk_live_or_test_key
   STRIPE_WEBHOOK_SECRET=whsec_webhook_secret
   RESEND_API_KEY=re_your_resend_key
   ```

   **Optional Services:**
   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster/db
   SUPABASE_SERVICE_ROLE_KEY=service_role_key
   ```

3. **Deploy & Verify**
   - Click "Deploy" or "Redeploy" after adding variables
   - Wait for build completion (~2-3 minutes)
   - Visit your Vercel URL + `/en/api/status` to verify service connections
   - Test login at `/en/login`

4. **Custom Domain (Optional)**
   - Project → Settings → Domains
   - Add `econopulse.ai` and `www.econopulse.ai`
   - Configure DNS according to Vercel instructions

### Environment Setup Guide
For detailed environment variable setup, see:
- 📋 **[Complete Setup Guide](VERCEL_ENV_SETUP.md)** - Step-by-step Vercel configuration
- 🔐 **[Supabase Setup](SUPABASE_SETUP.md)** - Authentication provider setup
- 📄 **[.env.example](.env.example)** - All available environment variables

### Troubleshooting
| Issue | Solution |
|-------|----------|
| Pages appear empty | Add `TIINGO_API_KEY` for market data |
| Can't login | Verify Supabase URL and anon key |
| Missing navigation links | Ensure latest deploy includes navigation fixes |
| API errors (503) | Check which provider is missing in `/api/status` |

### Build Verification
The project includes automatic fallbacks for missing services:
- **Missing auth**: Shows login prompts with setup guidance
- **Missing market data**: Shows demo/placeholder content
- **Missing AI**: Disables AI-powered features gracefully

## � Local Development

### Installation
## 🔧 Local Development

### Installation
1. **Clone and install**
   ```bash
   git clone https://github.com/Rinorambla/econopulse.git
   cd econopulse
   npm install
   ```

2. **Environment Setup**
   ```bash
   # Copy example environment file
   cp .env.example .env.local
   
   # Edit .env.local with your API keys
   # See VERCEL_ENV_SETUP.md for detailed setup guide
   ```

3. **Run development server**
   ```bash
   npm run dev
   # Or specify port: npm run dev:3000
   ```

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## 📊 API Endpoints

### Market Data
- `GET /api/market-data` - Fetch real-time market data
- `GET /api/market-data?tickers=SPY,QQQ` - Fetch specific tickers

### AI Portfolio
- `POST /api/ai-portfolio` - Generate AI-powered portfolio
  ```json
  {
    "riskTolerance": "balanced",
    "timeHorizon": "3 months"
  }
  ```

### Payments
- `POST /api/create-checkout-session` - Create Stripe checkout session
- `POST /api/webhooks/stripe` - Handle Stripe webhooks

## 🔒 Security Features

- Environment variables for sensitive data
- Stripe webhook signature verification
- Supabase Row Level Security (RLS)
- TypeScript for type safety
- Input validation and sanitization

## 📱 Responsive Design

EconoPulse is fully responsive and optimized for:
- Desktop (1920px+)
- Laptop (1024px - 1919px)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🌟 Key Features Implementation

### Dashboard Heatmap
The dashboard displays financial instruments in a trading desk style heatmap with:
- Real-time price updates
- Color-coded performance indicators
- Options flow analysis
- Market sentiment indicators

### AI Portfolio Generation
Using OpenAI GPT-4, the platform generates portfolios based on:
- Current market conditions
- Economic cycle analysis
- Risk tolerance assessment
- Sector rotation strategies

### Economic Quadrant Analysis
The AI Pulse feature provides economic cycle analysis:
- Growth vs. Inflation matrix
- Current cycle identification
- 3-month projections
- Asset allocation recommendations

## 📊 Subscription Plans

### Pro ($29/month)
- Real-time market dashboard
- Basic portfolio insights
- Email support
- Mobile access

### Premium AI ($79/month)
- Everything in Pro
- AI Portfolio Builder
- Advanced market analysis
- Priority support
- Custom alerts

### Corporate ($199/month)
- Everything in Premium
- Multi-user access (up to 10 users)
- API access
- Custom integrations
- Dedicated support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@econopulse.ai or join our Discord community.

For general inquiries, contact info@econopulse.ai.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Stripe](https://stripe.com/) for payment processing
- [OpenAI](https://openai.com/) for AI capabilities
- [Polygon.io](https://polygon.io/) for market data

---

Built with ❤️ by the EconoPulse Team
## 🧪 Experimental: Q-CTA Position Indicator

## 📦 Progressive Web App (PWA)

EconoPulse include una PWA avanzata pronta per l'installazione su desktop e mobile.

### Componenti Principali
- `public/manifest.json` (icône, shortcuts, screenshots, categorie)
- `public/sw.js` (cache static/dynamic versionato, offline fallback, background sync stub, push handler placeholder)
- `public/offline.html` (pagina offline UX)
- `src/components/PWAInstaller.tsx` (registrazione SW + background sync)
- `src/components/PWAUpdateAndInstall.tsx` (banner install evidente + notifica aggiornamento versione)
- Meta iOS aggiunte in `src/app/[locale]/layout.tsx` (apple web app, status bar, touch icon)

### Strategia Cache
- Static assets: stale‑while‑revalidate (icone, manifest, root)
- Navigazioni HTML: network first → fallback a cache → `/offline.html`
- API (se whitelisted nel fetch): network first con put in cache se OK
- Dynamic content: cache-first fallback per risorse residuali con limitazione numero entry

### Aggiornamenti
Quando un nuovo service worker è pronto, appare un banner “Aggiornamento disponibile” con pulsante Aggiorna (esegue `SKIP_WAITING` + reload).

### Install Banner
Comparsa automatica quando il browser emette `beforeinstallprompt`. Stile evidente (gradient + shadow) posizionato in basso.

### Da Implementare (Opzionale)
1. Backend push (VAPID key + endpoint iscrizione) per notifiche reali.
2. Telemetria offline / install rate.
3. Localizzazione dinamica dello `start_url` del manifest.

### Note Locale
`start_url` attuale è `/` e il middleware rerouterà al locale corretto. Mantiene un’unica install entry (semplifica distribuzione).

## 🔐 Sicurezza & Headers
Sono impostati header di sicurezza globali (in `next.config.js`):
- Content-Security-Policy (baseline con Stripe, Supabase, OpenAI)
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: disabilita camera/microphone/geolocation
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security: 2 anni + preload

Per aggiungere altre origini ai servizi (es. analytics) modificare `csp` in `next.config.js`.

## 📨 Push Notification (Scaffold)
- Endpoint subscribe: `POST /api/push/subscribe` con JSON Web Push subscription.
- Storage: file JSON locale `data-snapshots/push-subscriptions.json` (mock). In produzione migrare su DB (es. Supabase) con encryption at rest.
- Libreria `web-push` già installata: usare VAPID keys (generare una volta) e inviare notifiche iterando le subscriptions.

Esempio invio (script manuale):
```ts
import webpush from 'web-push';
import { listSubscriptions } from './src/lib/push';
webpush.setVapidDetails('mailto:you@example.com', process.env.VAPID_PUBLIC!, process.env.VAPID_PRIVATE!);
for (const s of listSubscriptions()) {
   await webpush.sendNotification(s as any, JSON.stringify({ title: 'Test', body: 'Hello' }));
}
```

## 🛡️ Checklist Hardening Produzione
- [x] CSP baseline
- [x] HSTS + preload
- [x] Disabilitato poweredByHeader
- [x] PWA offline + update
- [x] Background sync scaffold
- [ ] Rate limiting avanzato per endpoint ad alto rischio (estendere `rate-limit.ts`)
- [ ] Logging centralizzato (es. Logtail / Axiom) 
- [ ] Integrazione error monitoring (Sentry / OpenTelemetry)
- [ ] Cifratura subscription push (EC) + revoca


