#!/bin/bash
# Complete deployment script for EconoPulse to Vercel
# This script handles the entire deployment pipeline

set -e  # Exit on any error

echo "🚀 EconoPulse Deployment Pipeline Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the project root?"
    exit 1
fi

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Working directory is not clean. Committing changes..."
    git add .
    read -p "Enter commit message: " commit_message
    git commit -m "$commit_message"
fi

# Run tests and linting
print_status "Running pre-deployment checks..."

# Install dependencies
print_status "Installing dependencies..."
npm install

# Type checking
print_status "Running TypeScript checks..."
if npm run type-check 2>/dev/null || npx tsc --noEmit; then
    print_success "TypeScript checks passed"
else
    print_error "TypeScript checks failed"
    exit 1
fi

# Linting
print_status "Running ESLint..."
if npm run lint 2>/dev/null || npx eslint . --ext .ts,.tsx --max-warnings 0; then
    print_success "Linting passed"
else
    print_warning "Linting issues found, continuing anyway..."
fi

# Build the project
print_status "Building the project..."
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Check environment variables
print_status "Checking environment variables..."
required_env_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
)

missing_vars=()
for var in "${required_env_vars[@]}"; do
    if ! vercel env ls | grep -q "$var"; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    print_warning "Run the setup script first: ./scripts/setup-vercel-env.sh"
    read -p "Do you want to continue anyway? (y/N): " continue_deploy
    if [[ ! $continue_deploy =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Deploy to preview first (optional)
read -p "Deploy to preview first? (y/N): " deploy_preview
if [[ $deploy_preview =~ ^[Yy]$ ]]; then
    print_status "Deploying to preview..."
    vercel
    
    print_success "Preview deployment completed"
    print_status "Please test the preview deployment before proceeding to production"
    read -p "Continue with production deployment? (y/N): " continue_prod
    if [[ ! $continue_prod =~ ^[Yy]$ ]]; then
        print_status "Deployment stopped at preview stage"
        exit 0
    fi
fi

# Deploy to production
print_status "Deploying to production..."
if vercel --prod; then
    print_success "Production deployment completed!"
else
    print_error "Production deployment failed"
    exit 1
fi

# Post-deployment checks
print_status "Running post-deployment checks..."

# Get the deployment URL
deployment_url=$(vercel ls | head -n 2 | tail -n 1 | awk '{print $2}')
if [ -z "$deployment_url" ]; then
    deployment_url="your-domain.vercel.app"
fi

# Wait a moment for deployment to be live
sleep 10

# Health check
print_status "Checking deployment health..."
if curl -sf "https://$deployment_url/api/health" > /dev/null; then
    print_success "Health check passed"
else
    print_warning "Health check failed - the API might still be starting up"
fi

# Git tag for this deployment
current_date=$(date +%Y%m%d-%H%M%S)
git_tag="deploy-$current_date"
print_status "Creating git tag: $git_tag"
git tag "$git_tag"
git push origin "$git_tag"

# Final summary
print_success "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "  • Production URL: https://$deployment_url"
echo "  • Git tag: $git_tag"
echo "  • Deployment time: $(date)"
echo ""
echo "🔗 Important links:"
echo "  • Vercel Dashboard: https://vercel.com/dashboard"
echo "  • Health Check: https://$deployment_url/api/health"
echo "  • Subscription Flow: https://$deployment_url/pricing"
echo ""
echo "✅ Next steps:"
echo "  1. Test the subscription flow end-to-end"
echo "  2. Verify Stripe webhooks are working"
echo "  3. Check Supabase database connectivity"
echo "  4. Monitor logs for any issues"
echo ""
print_success "Deployment pipeline completed! 🚀"