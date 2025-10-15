# Vercel Environment Variables Setup Script for EconoPulse (PowerShell)
# Run this script after installing Vercel CLI and logging in

Write-Host "🚀 Setting up EconoPulse environment variables on Vercel..." -ForegroundColor Green

# Check if vercel CLI is installed
try {
    $null = Get-Command vercel -ErrorAction Stop
} catch {
    Write-Host "❌ Vercel CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

# Function to add environment variable
function Add-EnvVar {
    param(
        [string]$Name,
        [string]$Environment
    )
    Write-Host "📝 Adding $Name for $Environment..." -ForegroundColor Cyan
    $value = Read-Host "Enter value for $Name"
    $value | vercel env add $Name $Environment
}

# Function to add environment variable with default
function Add-EnvVarWithDefault {
    param(
        [string]$Name,
        [string]$Default,
        [string]$Environment
    )
    Write-Host "📝 Adding $Name for $Environment (default: $Default)..." -ForegroundColor Cyan
    $input = Read-Host "Enter value for $Name [$Default]"
    $value = if ([string]::IsNullOrWhiteSpace($input)) { $Default } else { $input }
    $value | vercel env add $Name $Environment
}

Write-Host "🔗 Make sure you're in the correct project directory and linked to Vercel" -ForegroundColor Yellow
Read-Host "Press Enter to continue"

# Core application variables
Write-Host "`n🏗️ Setting up core application variables..." -ForegroundColor Blue
Add-EnvVar "NEXT_PUBLIC_SUPABASE_URL" "production"
Add-EnvVar "NEXT_PUBLIC_SUPABASE_ANON_KEY" "production"
Add-EnvVar "SUPABASE_SERVICE_ROLE_KEY" "production"

# Enable Supabase
Write-Host "✅ Enabling Supabase..." -ForegroundColor Green
"true" | vercel env add "SUPABASE_ENABLED" "production"

# Stripe configuration
Write-Host "`n💳 Setting up Stripe configuration..." -ForegroundColor Blue
Add-EnvVar "STRIPE_SECRET_KEY" "production"
Add-EnvVar "STRIPE_PUBLISHABLE_KEY" "production"
Add-EnvVar "STRIPE_WEBHOOK_SECRET" "production"

# Stripe Price IDs
Write-Host "`n💰 Setting up Stripe Price IDs..." -ForegroundColor Blue
Write-Host "⚠️  Make sure you have created products and prices in Stripe Dashboard first!" -ForegroundColor Yellow
Add-EnvVar "STRIPE_STARTER_MONTHLY_PRICE_ID" "production"
Add-EnvVar "STRIPE_STARTER_YEARLY_PRICE_ID" "production"
Add-EnvVar "STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID" "production"
Add-EnvVar "STRIPE_PROFESSIONAL_YEARLY_PRICE_ID" "production"
Add-EnvVar "STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID" "production"
Add-EnvVar "STRIPE_INSTITUTIONAL_YEARLY_PRICE_ID" "production"

# Optional services
Write-Host "`n🔧 Setting up optional services..." -ForegroundColor Blue
$enableOpenAI = Read-Host "Do you want to enable OpenAI integration? (y/N)"
if ($enableOpenAI -match "^[Yy]$") {
    Add-EnvVar "OPENAI_API_KEY" "production"
    "true" | vercel env add "OPENAI_ENABLED" "production"
} else {
    "false" | vercel env add "OPENAI_ENABLED" "production"
}

$enableMongoDB = Read-Host "Do you want to enable MongoDB integration? (y/N)"
if ($enableMongoDB -match "^[Yy]$") {
    Add-EnvVar "MONGODB_URI" "production"
    "true" | vercel env add "MONGODB_ENABLED" "production"
} else {
    "false" | vercel env add "MONGODB_ENABLED" "production"
}

# Market data APIs (optional)
Write-Host "`n📊 Setting up market data APIs (optional)..." -ForegroundColor Blue
$enableAPIs = Read-Host "Do you want to configure market data APIs? (y/N)"
if ($enableAPIs -match "^[Yy]$") {
    Write-Host "Enter API keys (press Enter to skip any):" -ForegroundColor Yellow
    
    $avKey = Read-Host "Alpha Vantage API Key"
    if (![string]::IsNullOrWhiteSpace($avKey)) {
        $avKey | vercel env add "ALPHA_VANTAGE_API_KEY" "production"
    }
    
    $fmpKey = Read-Host "Financial Modeling Prep API Key"
    if (![string]::IsNullOrWhiteSpace($fmpKey)) {
        $fmpKey | vercel env add "FMP_API_KEY" "production"
    }
    
    $tiingoKey = Read-Host "Tiingo API Key"
    if (![string]::IsNullOrWhiteSpace($tiingoKey)) {
        $tiingoKey | vercel env add "TIINGO_API_KEY" "production"
    }
    
    $iexKey = Read-Host "IEX Cloud API Key"
    if (![string]::IsNullOrWhiteSpace($iexKey)) {
        $iexKey | vercel env add "IEX_API_KEY" "production"
    }
    
    $fredKey = Read-Host "FRED API Key"
    if (![string]::IsNullOrWhiteSpace($fredKey)) {
        $fredKey | vercel env add "FRED_API_KEY" "production"
    }
}

Write-Host "`n✅ Environment variables setup complete!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Blue
Write-Host "1. 🔗 Configure your custom domain in Vercel Dashboard" -ForegroundColor White
Write-Host "2. 🎯 Set up Stripe webhook endpoint: https://your-domain.com/api/stripe/webhook" -ForegroundColor White
Write-Host "3. 🗄️  Execute the SQL schema in your Supabase dashboard" -ForegroundColor White
Write-Host "4. 🚀 Deploy with: vercel --prod" -ForegroundColor White
Write-Host "5. 🧪 Test the subscription flow end-to-end" -ForegroundColor White

Write-Host "`n🔧 Useful commands:" -ForegroundColor Blue
Write-Host "• View all env vars: vercel env ls" -ForegroundColor White
Write-Host "• Pull env vars locally: vercel env pull .env.local" -ForegroundColor White
Write-Host "• Deploy to production: vercel --prod" -ForegroundColor White
Write-Host "• Check deployment logs: vercel logs" -ForegroundColor White