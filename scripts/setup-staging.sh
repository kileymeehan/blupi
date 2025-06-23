#!/bin/bash

# Blupi Staging Environment Setup Script
# This script helps configure the staging environment

set -e

echo "🚀 Setting up Blupi Staging Environment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running in Replit
if [ -z "$REPL_ID" ]; then
    print_warning "This script is designed to run in Replit environment"
fi

# Check required environment variables
echo "📋 Checking environment variables..."

required_vars=(
    "NODE_ENV"
    "ENVIRONMENT"
    "DATABASE_URL"
    "VITE_FIREBASE_API_KEY"
    "VITE_FIREBASE_AUTH_DOMAIN"
    "VITE_FIREBASE_PROJECT_ID"
    "VITE_FIREBASE_APP_ID"
    "FIREBASE_PROJECT_ID"
    "FIREBASE_CLIENT_EMAIL"
    "FIREBASE_PRIVATE_KEY"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    else
        print_status "$var is set"
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please add these variables to your Replit Secrets and restart the script."
    exit 1
fi

# Verify environment is set to staging
if [ "$ENVIRONMENT" != "staging" ]; then
    print_warning "ENVIRONMENT is set to '$ENVIRONMENT', expected 'staging'"
    print_warning "Make sure to set ENVIRONMENT=staging in your Replit Secrets"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
print_status "Dependencies installed"

# Run database migrations (if applicable)
echo "🗄️ Setting up database..."
if command -v npm run db:push &> /dev/null; then
    npm run db:push
    print_status "Database schema updated"
else
    print_warning "No database migration command found"
fi

# Build the application
echo "🔨 Building application..."
npm run build
print_status "Application built successfully"

# Test the application
echo "🧪 Running tests..."
if command -v npm test &> /dev/null; then
    npm test
    print_status "Tests passed"
else
    print_warning "No test command found"
fi

# Check if staging banner is enabled
if [ "$STAGING_BANNER_ENABLED" = "true" ]; then
    print_status "Staging banner is enabled"
else
    print_warning "Staging banner is not enabled. Set STAGING_BANNER_ENABLED=true"
fi

echo ""
echo "🎉 Staging environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Deploy your Replit project"
echo "2. Note the deployment URL (e.g., blupi-staging.username.repl.co)"
echo "3. Configure DNS in Squarespace:"
echo "   - Type: CNAME"
echo "   - Host: staging"
echo "   - Points to: username.repl.co"
echo "4. Update Firebase authorized domains to include staging.blupi.io"
echo ""
echo "For detailed instructions, see STAGING_DEPLOYMENT_SETUP.md"