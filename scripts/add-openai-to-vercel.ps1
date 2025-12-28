#!/usr/bin/env pwsh
# Add OPENAI_API_KEY to Vercel Environment Variables
# Usage: .\add-openai-to-vercel.ps1

param(
    [string]$VercelToken = $env:VERCEL_TOKEN,
    [string]$ProjectName = "econopulse",
    [string]$TeamId = $env:VERCEL_TEAM_ID,
    [string]$OpenAIKey = $env:OPENAI_API_KEY
)

if (-not $OpenAIKey) {
    Write-Host "❌ OPENAI_API_KEY not set. Get it from .env.local and run:" -ForegroundColor Red
    Write-Host "   `$env:OPENAI_API_KEY = 'your_key_here'" -ForegroundColor Yellow
    Write-Host "   .\scripts\add-openai-to-vercel.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 Adding OPENAI_API_KEY to Vercel..." -ForegroundColor Cyan

if (-not $VercelToken) {
    Write-Host "❌ VERCEL_TOKEN not set. Please:" -ForegroundColor Red
    Write-Host ""
    Write-Host "1. Get your token from: https://vercel.com/account/tokens" -ForegroundColor Yellow
    Write-Host "2. Run: `$env:VERCEL_TOKEN = 'your_token_here'" -ForegroundColor Yellow
    Write-Host "3. Or use Vercel Dashboard manually (faster): https://vercel.com/rinorambla/econopulse/settings/environment-variables" -ForegroundColor Green
    Write-Host ""
    exit 1
}

# Build API endpoint
$baseUrl = "https://api.vercel.com/v10/projects/$ProjectName/env"
if ($TeamId) {
    $baseUrl += "?teamId=$TeamId"
}

$headers = @{
    "Authorization" = "Bearer $VercelToken"
    "Content-Type" = "application/json"
}

# Add to each environment
$environments = @("production", "preview", "development")

foreach ($env in $environments) {
    Write-Host "📝 Adding to $env..." -ForegroundColor Yellow
    
    $body = @{
        "key" = "OPENAI_API_KEY"
        "value" = $OpenAIKey
        "type" = "encrypted"
        "target" = @($env)
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "✅ Added to $env" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            Write-Host "⚠️  Already exists in $env (updating...)" -ForegroundColor Yellow
            # Try to update instead (requires getting the env var ID first)
            try {
                $existing = Invoke-RestMethod -Uri $baseUrl -Method Get -Headers $headers
                $envVar = $existing.envs | Where-Object { $_.key -eq "OPENAI_API_KEY" -and $_.target -contains $env } | Select-Object -First 1
                
                if ($envVar) {
                    $updateUrl = "$baseUrl/$($envVar.id)"
                    if ($TeamId) {
                        $updateUrl += "?teamId=$TeamId"
                    }
                    $updateBody = @{
                        "value" = $OpenAIKey
                    } | ConvertTo-Json
                    
                    Invoke-RestMethod -Uri $updateUrl -Method Patch -Headers $headers -Body $updateBody | Out-Null
                    Write-Host "✅ Updated in $env" -ForegroundColor Green
                }
            } catch {
                Write-Host "⚠️  Could not update in $env" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ Error adding to $env : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "✅ Done! Now redeploy your app:" -ForegroundColor Green
Write-Host "   1. Go to: https://vercel.com/rinorambla/econopulse/deployments" -ForegroundColor Cyan
Write-Host "   2. Click on the latest deployment" -ForegroundColor Cyan
Write-Host "   3. Click '...' → 'Redeploy'" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or push a new commit:" -ForegroundColor Yellow
Write-Host "   git commit --allow-empty -m 'trigger: enable OpenAI'" -ForegroundColor Cyan
Write-Host "   git push" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verify at: https://www.econopulse.ai/api/health" -ForegroundColor Green
