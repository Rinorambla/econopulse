#!/bin/bash
# Vercel Environment Variables Setup Script for EconoPulse
# Run this script after installing Vercel CLI and logging in

echo "🚀 Setting up EconoPulse environment variables on Vercel..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "npm install -g vercel"
    exit 1
fi

# Function to add environment variable
add_env_var() {
    local name=$1
    local environment=$2
    echo "📝 Adding $name for $environment..."
    read -p "Enter value for $name: " value
    vercel env add "$name" "$environment" <<< "$value"
}

# Function to add environment variable with default
add_env_var_with_default() {
    local name=$1
    local default=$2
    local environment=$3
    echo "📝 Adding $name for $environment (default: $default)..."
    read -p "Enter value for $name [$default]: " value
    value=${value:-$default}
    vercel env add "$name" "$environment" <<< "$value"
}

echo "🔗 Make sure you're in the correct project directory and linked to Vercel"
read -p "Press Enter to continue..."

# Core application variables
echo "\n🏗️ Setting up core application variables..."
add_env_var "NEXT_PUBLIC_SUPABASE_URL" "production"
add_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "production"
add_env_var "SUPABASE_SERVICE_ROLE_KEY" "production"

# Enable Supabase
echo "✅ Enabling Supabase..."
vercel env add "SUPABASE_ENABLED" "production" <<< "true"

# Stripe configuration
echo "\n💳 Setting up Stripe configuration..."
add_env_var "STRIPE_SECRET_KEY" "production"
add_env_var "STRIPE_PUBLISHABLE_KEY" "production"
add_env_var "STRIPE_WEBHOOK_SECRET" "production"

# Stripe Price IDs
echo "\n💰 Setting up Stripe Price IDs..."
echo "⚠️  Make sure you have created products and prices in Stripe Dashboard first!"
add_env_var "STRIPE_STARTER_MONTHLY_PRICE_ID" "production"
add_env_var "STRIPE_STARTER_YEARLY_PRICE_ID" "production"
add_env_var "STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID" "production"
add_env_var "STRIPE_PROFESSIONAL_YEARLY_PRICE_ID" "production"
add_env_var "STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID" "production"
add_env_var "STRIPE_INSTITUTIONAL_YEARLY_PRICE_ID" "production"

# Optional services
echo "\n🔧 Setting up optional services..."
read -p "Do you want to enable OpenAI integration? (y/N): " enable_openai
if [[ $enable_openai =~ ^[Yy]$ ]]; then
    add_env_var "OPENAI_API_KEY" "production"
    vercel env add "OPENAI_ENABLED" "production" <<< "true"
else
    vercel env add "OPENAI_ENABLED" "production" <<< "false"
fi

read -p "Do you want to enable MongoDB integration? (y/N): " enable_mongodb
if [[ $enable_mongodb =~ ^[Yy]$ ]]; then
    add_env_var "MONGODB_URI" "production"
    vercel env add "MONGODB_ENABLED" "production" <<< "true"
else
    vercel env add "MONGODB_ENABLED" "production" <<< "false"
fi

# Market data APIs (optional)
echo "\n📊 Setting up market data APIs (optional)..."
read -p "Do you want to configure market data APIs? (y/N): " enable_apis
if [[ $enable_apis =~ ^[Yy]$ ]]; then
    echo "Enter API keys (press Enter to skip any):"
    read -p "Alpha Vantage API Key: " av_key
    if [[ -n "$av_key" ]]; then
        vercel env add "ALPHA_VANTAGE_API_KEY" "production" <<< "$av_key"
    fi
    
    read -p "Financial Modeling Prep API Key: " fmp_key
    if [[ -n "$fmp_key" ]]; then
        vercel env add "FMP_API_KEY" "production" <<< "$fmp_key"
    fi
    
    read -p "Tiingo API Key: " tiingo_key
    if [[ -n "$tiingo_key" ]]; then
        vercel env add "TIINGO_API_KEY" "production" <<< "$tiingo_key"
    fi
    
    read -p "IEX Cloud API Key: " iex_key
    if [[ -n "$iex_key" ]]; then
        vercel env add "IEX_API_KEY" "production" <<< "$iex_key"
    fi
    
    read -p "FRED API Key: " fred_key
    if [[ -n "$fred_key" ]]; then
        vercel env add "FRED_API_KEY" "production" <<< "$fred_key"
    fi
fi

echo "\n✅ Environment variables setup complete!"
echo "\n📋 Next steps:"
echo "1. 🔗 Configure your custom domain in Vercel Dashboard"
echo "2. 🎯 Set up Stripe webhook endpoint: https://your-domain.com/api/stripe/webhook"
echo "3. 🗄️  Execute the SQL schema in your Supabase dashboard"
echo "4. 🚀 Deploy with: vercel --prod"
echo "5. 🧪 Test the subscription flow end-to-end"

echo "\n🔧 Useful commands:"
echo "• View all env vars: vercel env ls"
echo "• Pull env vars locally: vercel env pull .env.local"
echo "• Deploy to production: vercel --prod"
echo "• Check deployment logs: vercel logs"