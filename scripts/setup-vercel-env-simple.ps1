#!/usr/bin/env pwsh

# Simple Vercel Environment Variables Setup Script
# This script helps configure all necessary environment variables for the Econopulse app

Write-Host "Vercel Environment Variables Setup" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# Function to add environment variable
function Add-EnvVar {
    param(
        [string]$Name,
        [string]$Environment = "production"
    )
    
    Write-Host "Setting $Name for $Environment..." -ForegroundColor Cyan
    $value = Read-Host "Enter value for $Name"
    
    if ($value) {
        try {
            vercel env add $Name $Environment
            Write-Host $value | vercel env add $Name $Environment --stdin
            Write-Host "Added $Name successfully" -ForegroundColor Green
        }
        catch {
            Write-Host "Failed to add $Name`: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Skipped $Name (empty value)" -ForegroundColor Yellow
    }
}

Write-Host "`nConfiguring essential environment variables..." -ForegroundColor Blue

# Essential NextAuth variables
Write-Host "`nNextAuth Configuration:" -ForegroundColor Blue
Add-EnvVar "NEXTAUTH_SECRET" "production"
Add-EnvVar "NEXTAUTH_URL" "production"

# Stripe Configuration
Write-Host "`nStripe Configuration:" -ForegroundColor Blue
Add-EnvVar "STRIPE_SECRET_KEY" "production"
Add-EnvVar "STRIPE_PUBLISHABLE_KEY" "production"
Add-EnvVar "STRIPE_WEBHOOK_SECRET" "production"

# Stripe Price IDs
Write-Host "`nStripe Price IDs:" -ForegroundColor Blue
Write-Host "Make sure you have created products and prices in Stripe Dashboard first!" -ForegroundColor Yellow
Add-EnvVar "STRIPE_STARTER_MONTHLY_PRICE_ID" "production"
Add-EnvVar "STRIPE_STARTER_YEARLY_PRICE_ID" "production"
Add-EnvVar "STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID" "production"
Add-EnvVar "STRIPE_PROFESSIONAL_YEARLY_PRICE_ID" "production"
Add-EnvVar "STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID" "production"
Add-EnvVar "STRIPE_INSTITUTIONAL_YEARLY_PRICE_ID" "production"

# Supabase Configuration
Write-Host "`nSupabase Configuration:" -ForegroundColor Blue
Add-EnvVar "SUPABASE_URL" "production"
Add-EnvVar "SUPABASE_ANON_KEY" "production"
Add-EnvVar "SUPABASE_SERVICE_ROLE_KEY" "production"

# Optional services
Write-Host "`nOptional Services (press Enter to skip):" -ForegroundColor Blue
Add-EnvVar "OPENAI_API_KEY" "production"
Add-EnvVar "MONGODB_URI" "production"
Add-EnvVar "FMP_API_KEY" "production"
Add-EnvVar "TIINGO_API_KEY" "production"

Write-Host "`nEnvironment setup completed!" -ForegroundColor Green
Write-Host "You can now deploy with: vercel --prod" -ForegroundColor Cyan