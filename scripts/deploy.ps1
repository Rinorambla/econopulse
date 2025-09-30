# Complete deployment script for EconoPulse to Vercel (PowerShell)
# This script handles the entire deployment pipeline

param(
    [switch]$SkipChecks,
    [switch]$PreviewOnly,
    [string]$CommitMessage = "Deploy to production"
)

Write-Host "🚀 EconoPulse Deployment Pipeline Starting..." -ForegroundColor Green

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check prerequisites
Write-Status "Checking prerequisites..."

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Error "package.json not found. Are you in the project root?"
    exit 1
}

# Check if vercel CLI is installed
try {
    $null = Get-Command vercel -ErrorAction Stop
    Write-Success "Vercel CLI found"
} catch {
    Write-Error "Vercel CLI not found. Installing..."
    npm install -g vercel
}

# Check if git is clean
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Warning "Working directory is not clean. Committing changes..."
    git add .
    if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
        $CommitMessage = Read-Host "Enter commit message"
    }
    git commit -m $CommitMessage
}

if (!$SkipChecks) {
    # Run tests and linting
    Write-Status "Running pre-deployment checks..."

    # Install dependencies
    Write-Status "Installing dependencies..."
    npm install

    # Type checking
    Write-Status "Running TypeScript checks..."
    try {
        if (Get-Command "npm run type-check" -ErrorAction SilentlyContinue) {
            npm run type-check
        } else {
            npx tsc --noEmit
        }
        Write-Success "TypeScript checks passed"
    } catch {
        Write-Error "TypeScript checks failed"
        exit 1
    }

    # Linting
    Write-Status "Running ESLint..."
    try {
        if (Get-Command "npm run lint" -ErrorAction SilentlyContinue) {
            npm run lint
        } else {
            npx eslint . --ext .ts,.tsx --max-warnings 0
        }
        Write-Success "Linting passed"
    } catch {
        Write-Warning "Linting issues found, continuing anyway..."
    }

    # Build the project
    Write-Status "Building the project..."
    try {
        npm run build
        Write-Success "Build completed successfully"
    } catch {
        Write-Error "Build failed"
        exit 1
    }
} else {
    Write-Warning "Skipping pre-deployment checks"
}

# Check environment variables
Write-Status "Checking environment variables..."
$requiredEnvVars = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY", 
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET"
)

$envList = vercel env ls
$missingVars = @()

foreach ($var in $requiredEnvVars) {
    if ($envList -notmatch $var) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Error "Missing required environment variables:"
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Red
    }
    Write-Warning "Run the setup script first: .\scripts\setup-vercel-env.ps1"
    $continue = Read-Host "Do you want to continue anyway? (y/N)"
    if ($continue -notmatch "^[Yy]$") {
        exit 1
    }
}

# Deploy to preview first (optional)
if (!$PreviewOnly) {
    $deployPreview = Read-Host "Deploy to preview first? (y/N)"
} else {
    $deployPreview = "y"
}

if ($deployPreview -match "^[Yy]$") {
    Write-Status "Deploying to preview..."
    try {
        vercel
        Write-Success "Preview deployment completed"
        
        if (!$PreviewOnly) {
            Write-Status "Please test the preview deployment before proceeding to production"
            $continueProd = Read-Host "Continue with production deployment? (y/N)"
            if ($continueProd -notmatch "^[Yy]$") {
                Write-Status "Deployment stopped at preview stage"
                exit 0
            }
        } else {
            Write-Success "Preview-only deployment completed!"
            exit 0
        }
    } catch {
        Write-Error "Preview deployment failed"
        exit 1
    }
}

# Deploy to production
Write-Status "Deploying to production..."
try {
    vercel --prod
    Write-Success "Production deployment completed!"
} catch {
    Write-Error "Production deployment failed"
    exit 1
}

# Post-deployment checks
Write-Status "Running post-deployment checks..."

# Get the deployment URL
try {
    $deploymentOutput = vercel ls | Select-Object -First 2 | Select-Object -Last 1
    $deploymentUrl = ($deploymentOutput -split '\s+')[1]
    if ([string]::IsNullOrWhiteSpace($deploymentUrl)) {
        $deploymentUrl = "your-domain.vercel.app"
    }
} catch {
    $deploymentUrl = "your-domain.vercel.app"
}

# Wait a moment for deployment to be live
Write-Status "Waiting for deployment to be live..."
Start-Sleep -Seconds 10

# Health check
Write-Status "Checking deployment health..."
try {
    $healthCheck = Invoke-WebRequest -Uri "https://$deploymentUrl/api/health" -Method GET -TimeoutSec 30
    if ($healthCheck.StatusCode -eq 200) {
        Write-Success "Health check passed"
    } else {
        Write-Warning "Health check returned status: $($healthCheck.StatusCode)"
    }
} catch {
    Write-Warning "Health check failed - the API might still be starting up"
}

# Git tag for this deployment
$currentDate = Get-Date -Format "yyyyMMdd-HHmmss"
$gitTag = "deploy-$currentDate"
Write-Status "Creating git tag: $gitTag"
git tag $gitTag
git push origin $gitTag

# Final summary
Write-Success "🎉 Deployment completed successfully!"
Write-Host ""
Write-Host "📋 Deployment Summary:" -ForegroundColor Blue
Write-Host "  • Production URL: https://$deploymentUrl" -ForegroundColor White
Write-Host "  • Git tag: $gitTag" -ForegroundColor White
Write-Host "  • Deployment time: $(Get-Date)" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Important links:" -ForegroundColor Blue
Write-Host "  • Vercel Dashboard: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "  • Health Check: https://$deploymentUrl/api/health" -ForegroundColor White
Write-Host "  • Subscription Flow: https://$deploymentUrl/pricing" -ForegroundColor White
Write-Host ""
Write-Host "✅ Next steps:" -ForegroundColor Blue
Write-Host "  1. Test the subscription flow end-to-end" -ForegroundColor White
Write-Host "  2. Verify Stripe webhooks are working" -ForegroundColor White
Write-Host "  3. Check Supabase database connectivity" -ForegroundColor White
Write-Host "  4. Monitor logs for any issues" -ForegroundColor White
Write-Host ""
Write-Success "Deployment pipeline completed! 🚀"