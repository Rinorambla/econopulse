# Vercel Environment Variables Setup Guide

## 🚀 Quick Setup Instructions

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `econopulse` project
3. Navigate to **Settings** → **Environment Variables**
4. Add variables below for **Production** environment
5. Click **Save** after each variable
6. Go to **Deployments** tab → Click **Redeploy** on latest deployment

---

## 📋 Required Variables (Core Functionality)

### Authentication (Essential for login/pages)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Market Data (Essential for Dashboard/AI features)
```
TIINGO_API_KEY=your_tiingo_api_key
```

---

## 🔧 Optional Variables (Enhanced Features)

### AI Analysis
```
OPENAI_API_KEY=your_openai_api_key
```

### Email & Newsletter
```
RESEND_API_KEY=your_resend_api_key
```

### Payments
```
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### Database (Newsletter storage)
```
MONGODB_URI=your_mongodb_connection_string
```

### Additional Services
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FMP_API_KEY=your_fmp_api_key
TRADINGECONOMICS_API_KEY=your_tradingeconomics_key
```

---

## 🎯 Priority Setup Order

### Step 1: Basic Authentication
Add these first to enable login and page access:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 2: Market Data
Add this to populate Dashboard, AI Pulse, Visual AI with real data:
- `TIINGO_API_KEY`

### Step 3: AI Features
Add this for AI Economic Analysis and intelligent insights:
- `OPENAI_API_KEY`

### Step 4: Business Features (Optional)
Add these for complete functionality:
- `STRIPE_SECRET_KEY` (payments)
- `RESEND_API_KEY` (email)
- `MONGODB_URI` (newsletter)

---

## 🔍 Verification Steps

After adding variables and redeploying:

1. **Check Status**: Visit `https://your-vercel-url.vercel.app/en/api/status`
   - Should show `supabaseEnabled: true` and provider flags

2. **Test Authentication**: Visit `https://your-vercel-url.vercel.app/en/login`
   - Should show login form without "Auth unavailable" message

3. **Test Features**: Visit these pages after login:
   - `/en/dashboard` - Should show market data and charts
   - `/en/ai-pulse` - Should show sector performance and AI analysis
   - `/en/visual-ai` - Should show comprehensive market visualization
   - `/en/market-dna` - Should show market DNA analysis

---

## 🚨 Common Issues

### Navigation Links Missing
**Symptom**: Can't see Dashboard, AI Portfolio, etc. links
**Solution**: Redeploy after adding Supabase variables

### Empty Pages/Charts
**Symptom**: Pages load but show no data or empty charts
**Solution**: Add `TIINGO_API_KEY` for market data

### "Auth unavailable" Error
**Symptom**: Login page shows auth unavailable message
**Solution**: Verify Supabase URL and anon key are correct and saved

### API Errors (503/500)
**Symptom**: Network tab shows API failures
**Solution**: Check which API is failing and add corresponding key

---

## 📝 Environment Variable Format Examples

```bash
# Supabase (from your Supabase project settings)
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Tiingo (from tiingo.com API settings)
TIINGO_API_KEY=abc123def456ghi789...

# OpenAI (from platform.openai.com)
OPENAI_API_KEY=sk-proj-abc123...

# Stripe (from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (from resend.com)
RESEND_API_KEY=re_...

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
```

---

## ✅ Quick Verification Checklist

After setup, these should work:
- [ ] `/en/api/status` returns provider status
- [ ] `/en/login` shows proper login form
- [ ] Navigation shows all feature links
- [ ] Login works and redirects to dashboard
- [ ] Dashboard shows market data and charts
- [ ] AI features show analysis and insights

---

## 🆘 Need Help?

If issues persist:
1. Check Vercel deployment logs for build errors
2. Use browser DevTools → Network tab to see API failures
3. Verify environment variables are in **Production** (not Preview/Development)
4. Ensure you clicked "Redeploy" after adding variables

## Service-Specific Setup Guides

For detailed setup of individual services:
- **Supabase**: See `SUPABASE_SETUP.md`
- **Stripe**: See Stripe Dashboard → Developers → API Keys
- **Tiingo**: Register at tiingo.com → Account → API Key
- **OpenAI**: Visit platform.openai.com → API Keys