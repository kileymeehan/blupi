#!/bin/bash

# Blupi Staging Environment Setup Script
# This script helps configure the staging environment with proper environment variables

echo "🔧 Blupi Staging Environment Setup"
echo "=================================="

# Check if we're in a Replit environment
if [ -z "$REPL_ID" ]; then
    echo "⚠️  Warning: This script is designed for Replit environments"
fi

# Function to check if environment variable exists
check_env_var() {
    if [ -z "${!1}" ]; then
        echo "❌ Missing required environment variable: $1"
        return 1
    else
        echo "✅ Found: $1"
        return 0
    fi
}

echo ""
echo "📋 Checking required environment variables..."

# Required variables for staging
REQUIRED_VARS=(
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
for var in "${REQUIRED_VARS[@]}"; do
    if ! check_env_var "$var"; then
        missing_vars+=("$var")
    fi
done

echo ""
if [ ${#missing_vars[@]} -eq 0 ]; then
    echo "✅ All required environment variables are configured!"
else
    echo "❌ Missing ${#missing_vars[@]} environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please add these variables in your Replit project settings:"
    echo "1. Click on 'Secrets' tab in the left sidebar"
    echo "2. Add each missing variable with the appropriate value"
    echo "3. Run this script again to verify"
    exit 1
fi

echo ""
echo "🗄️  Setting up staging database..."

# Run database push to ensure schema is up to date
if command -v npm &> /dev/null; then
    echo "Running database schema update..."
    npm run db:push
    if [ $? -eq 0 ]; then
        echo "✅ Database schema updated successfully"
    else
        echo "❌ Database schema update failed"
        echo "Please check your DATABASE_URL and database connectivity"
        exit 1
    fi
else
    echo "❌ npm not found. Please ensure Node.js is installed"
    exit 1
fi

echo ""
echo "🔥 Testing Firebase configuration..."

# Test Firebase connection by attempting to initialize
node -e "
const admin = require('firebase-admin');
try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                type: 'service_account',
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\\n'),
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                client_id: process.env.FIREBASE_CLIENT_ID,
                auth_uri: 'https://accounts.google.com/o/oauth2/auth',
                token_uri: 'https://oauth2.googleapis.com/token',
                auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
            }),
            projectId: process.env.FIREBASE_PROJECT_ID
        });
    }
    console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
    console.log('❌ Firebase initialization failed:', error.message);
    process.exit(1);
}
"

if [ $? -eq 0 ]; then
    echo "✅ Firebase configuration is valid"
else
    echo "❌ Firebase configuration test failed"
    echo "Please verify your Firebase environment variables"
    exit 1
fi

echo ""
echo "🚀 Starting staging application..."

# Set staging-specific environment
export NODE_ENV=staging
export ENVIRONMENT=staging

# Start the application
npm run dev &
APP_PID=$!

# Wait a moment for the server to start
sleep 5

# Check if the server is running
if kill -0 $APP_PID 2>/dev/null; then
    echo "✅ Staging application started successfully!"
    echo ""
    echo "🌐 Your staging environment is ready!"
    echo "   - Environment: staging"
    echo "   - Database: Connected"
    echo "   - Firebase: Configured"
    echo "   - Server: Running (PID: $APP_PID)"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Test authentication with your staging Firebase project"
    echo "   2. Create test data and verify functionality"
    echo "   3. Deploy when ready using Replit's deployment feature"
    echo ""
    echo "🔗 Access your application at the Replit webview URL"
    
    # Keep the script running to maintain the server
    wait $APP_PID
else
    echo "❌ Failed to start staging application"
    echo "Please check the console logs for errors"
    exit 1
fi