# EconoPulse Vercel Deployment Configuration
# Complete setup guide for production deployment

## 1. Environment Variables for Vercel

### Core Application
```bash
# Next.js Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production

# Database & Authentication
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Enable Supabase features
SUPABASE_ENABLED=true
```

### Stripe Payment System
```bash
# Stripe Secret Keys (use live keys for production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs for Subscription Tiers
STRIPE_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_STARTER_YEARLY_PRICE_ID=price_...
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_...
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=price_...
STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID=price_...
STRIPE_INSTITUTIONAL_YEARLY_PRICE_ID=price_...
```

### External APIs (Optional)
```bash
# Market Data APIs
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
FMP_API_KEY=your-fmp-key
TIINGO_API_KEY=your-tiingo-key
IEX_API_KEY=your-iex-key
FRED_API_KEY=your-fred-key

# AI Services
OPENAI_API_KEY=sk-...
OPENAI_ENABLED=true

# MongoDB (if using)
MONGODB_URI=mongodb+srv://...
MONGODB_ENABLED=false
```

## 2. Vercel CLI Setup Commands

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project to Vercel
vercel link

# Set environment variables (run from project root)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production

# Deploy to production
vercel --prod
```

## 3. Vercel Dashboard Configuration

### Project Settings
1. **Framework Preset**: Next.js
2. **Node.js Version**: 18.x or 20.x
3. **Build Command**: `npm run build`
4. **Output Directory**: `.next`
5. **Install Command**: `npm install`

### Environment Variables (via Dashboard)
Go to Project Settings → Environment Variables and add:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Production |
| `STRIPE_SECRET_KEY` | Your Stripe secret key | Production |
| `STRIPE_WEBHOOK_SECRET` | Your Stripe webhook secret | Production |
| `STRIPE_STARTER_MONTHLY_PRICE_ID` | Stripe price ID | Production |
| `STRIPE_STARTER_YEARLY_PRICE_ID` | Stripe price ID | Production |
| `STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID` | Stripe price ID | Production |
| `STRIPE_PROFESSIONAL_YEARLY_PRICE_ID` | Stripe price ID | Production |
| `STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID` | Stripe price ID | Production |
| `STRIPE_INSTITUTIONAL_YEARLY_PRICE_ID` | Stripe price ID | Production |

## 4. Domain and SSL Configuration

### Custom Domain Setup
1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `econopulse.com`)
3. Configure DNS records as instructed by Vercel
4. Wait for SSL certificate provisioning

### Redirect Configuration
Add to `vercel.json`:
```json
{
  "redirects": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

## 5. Stripe Webhook Configuration

### Production Webhook Setup
1. Go to Stripe Dashboard → Webhooks
2. Create new webhook endpoint
3. **URL**: `https://your-domain.vercel.app/api/stripe/webhook`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`

### Webhook Testing
```bash
# Install Stripe CLI
stripe login

# Forward events to local development
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Test webhook with real events
stripe trigger checkout.session.completed
```

## 6. Database Setup (Supabase)

### SQL Schema Deployment
1. Go to Supabase Dashboard → SQL Editor
2. Execute the complete schema from `subscription-system-schema.sql`
3. Verify all tables and functions are created

### Row Level Security
Ensure RLS policies are enabled:
```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Enable if needed
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paywall_events ENABLE ROW LEVEL SECURITY;
```

## 7. Monitoring and Analytics

### Vercel Analytics
```bash
# Install Vercel Analytics
npm install @vercel/analytics

# Add to app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Performance Monitoring
```bash
# Install Vercel Speed Insights
npm install @vercel/speed-insights

# Add to app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'
```

## 8. Deployment Checklist

### Pre-deployment
- [ ] All environment variables configured
- [ ] Stripe products and prices created
- [ ] Supabase database schema deployed
- [ ] Domain DNS configured
- [ ] SSL certificates ready

### Post-deployment
- [ ] Test user registration flow
- [ ] Test subscription checkout
- [ ] Verify webhook endpoints working
- [ ] Test trial functionality
- [ ] Validate usage tracking
- [ ] Check billing portal access

### Testing Commands
```bash
# Test API endpoints
curl https://your-domain.vercel.app/api/health
curl https://your-domain.vercel.app/api/usage-tracking

# Test Stripe integration
curl -X POST https://your-domain.vercel.app/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"tier":"starter","billingCycle":"monthly"}'
```

## 9. Troubleshooting Common Issues

### Environment Variables Not Loading
```bash
# Check environment variables
vercel env ls

# Pull environment variables locally
vercel env pull .env.local
```

### Stripe Webhook Issues
- Verify webhook URL is correct
- Check webhook secret matches environment variable
- Ensure webhook events are properly configured
- Monitor webhook logs in Stripe Dashboard

### Database Connection Issues
- Verify Supabase URL and keys
- Check RLS policies
- Ensure service role key has proper permissions

## 10. Performance Optimization

### Edge Functions
Move API routes to edge for better performance:
```typescript
// Add to API routes
export const config = {
  runtime: 'edge',
}
```

### Caching Strategy
```typescript
// Add to API responses
export async function GET() {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
```

This configuration ensures your EconoPulse subscription system is production-ready on Vercel with proper security, monitoring, and scalability.