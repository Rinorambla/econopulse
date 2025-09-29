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
- Economic quadrant analysis (Reflation, Expansion, Stagflation, Deflation)
- Key economic indicators tracking
- Market cycle predictions

### 💳 Subscription Management
- Three-tier pricing structure (Pro, Premium AI, Corporate)
- Stripe integration for secure payments
- 14-day free trial for all plans
- Flexible monthly/yearly billing

### 🌍 Multi-language Support
- Full internationalization support (English/Italian)
- Locale-based routing with Next.js App Router
- Dynamic content translation

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **AI**: OpenAI GPT-4
- **Market Data**: Polygon.io API
- **UI Components**: Headless UI, Heroicons
- **Charts**: Recharts, Plotly.js

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js 18+ installed
- NPM or Yarn package manager
- Supabase account and project
- Stripe account with test/live keys
- Polygon.io API key
- OpenAI API key

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd econopulse
   ```

2. **Install dependencies**
   ```bash
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

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

### Manual Deployment
1. Build the application:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
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

For support, email support@econopulse.com or join our Discord community.

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

